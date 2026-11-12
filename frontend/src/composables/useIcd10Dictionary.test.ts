import { createApp, defineComponent, nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIcd10Dictionary } from './useIcd10Dictionary';
import type { Icd10Response } from '@/types';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function response(payload: Icd10Response): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function mountComposable() {
  let api!: ReturnType<typeof useIcd10Dictionary>;
  const root = document.createElement('div');
  document.body.append(root);
  const app = createApp(
    defineComponent({
      setup() {
        api = useIcd10Dictionary();
        return () => null;
      },
    }),
  );
  app.mount(root);

  return {
    api,
    unmount: () => {
      app.unmount();
      root.remove();
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useIcd10Dictionary', () => {
  it('aborts the previous call and lets only the latest request update state', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const signals: AbortSignal[] = [];
    let call = 0;

    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        signals.push(init?.signal as AbortSignal);
        return call++ === 0 ? first.promise : second.promise;
      }),
    );

    const { unmount, api } = mountComposable();
    const firstRefresh = api.refresh();
    const secondRefresh = api.refresh();

    expect(signals[0]?.aborted).toBe(true);
    expect(signals[1]?.aborted).toBe(false);
    expect(api.loading.value).toBe(true);

    first.reject(new DOMException('Aborted', 'AbortError'));
    await firstRefresh;
    expect(api.loading.value).toBe(true);
    expect(api.errorMessage.value).toBeNull();

    second.resolve(
      response({
        source: 'cache',
        data: [{ id: 2, code: 'J06.9', name: 'Latest result' }],
      }),
    );
    await secondRefresh;
    await nextTick();

    expect(api.diagnoses.value[0]?.name).toBe('Latest result');
    expect(api.source.value).toBe('cache');
    expect(api.loading.value).toBe(false);
    unmount();
  });

  it('aborts the active request when the component unmounts', () => {
    const pending = deferred<Response>();
    let signal: AbortSignal | undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init?: RequestInit) => {
        signal = init?.signal as AbortSignal;
        return pending.promise;
      }),
    );

    const { unmount, api } = mountComposable();
    void api.refresh();
    unmount();

    expect(signal?.aborted).toBe(true);
    pending.reject(new DOMException('Aborted', 'AbortError'));
  });
});
