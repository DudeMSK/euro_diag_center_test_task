import { onUnmounted, ref } from 'vue';

import type { DataSource, Icd10Diagnosis, Icd10Response } from '@/types';

interface ActiveRequest {
  id: number;
  controller: AbortController;
  promise: Promise<Icd10Response> | null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function useIcd10Dictionary() {
  const diagnoses = ref<Icd10Diagnosis[]>([]);
  const source = ref<DataSource | null>(null);
  const durationMs = ref<number | null>(null);
  const loading = ref(false);
  const errorMessage = ref<string | null>(null);

  let latestRequestId = 0;
  let activeRequest: ActiveRequest | null = null;
  let disposed = false;

  async function refresh(): Promise<void> {
    const requestId = ++latestRequestId;

    activeRequest?.controller.abort();

    const controller = new AbortController();
    const startedAt = performance.now();
    loading.value = true;
    errorMessage.value = null;

    const requestPromise = fetch('/api/v1/dictionaries/icd10', {
      signal: controller.signal,
    }).then(async (response): Promise<Icd10Response> => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response.json() as Promise<Icd10Response>;
    });

    activeRequest = { id: requestId, controller, promise: requestPromise };

    try {
      const payload = await requestPromise;

      if (disposed || requestId !== latestRequestId) {
        return;
      }

      diagnoses.value = payload.data;
      source.value = payload.source;
      durationMs.value = performance.now() - startedAt;
    } catch (error) {
      // Cancellation is an expected local control-flow branch. It is not
      // rethrown and therefore cannot reach global error handlers/interceptors.
      if (isAbortError(error)) {
        return;
      }

      if (!disposed && requestId === latestRequestId) {
        errorMessage.value = 'Не удалось загрузить справочник. Попробуйте ещё раз.';
      }
    } finally {
      if (activeRequest?.id === requestId) {
        // Drop both strong references explicitly so the controller and settled
        // Promise become eligible for garbage collection.
        activeRequest.promise = null;
        activeRequest = null;
        loading.value = false;
      }
    }
  }

  onUnmounted(() => {
    disposed = true;
    latestRequestId += 1;
    activeRequest?.controller.abort();

    if (activeRequest) {
      activeRequest.promise = null;
      activeRequest = null;
    }
  });

  return {
    diagnoses,
    source,
    durationMs,
    loading,
    errorMessage,
    refresh,
  };
}
