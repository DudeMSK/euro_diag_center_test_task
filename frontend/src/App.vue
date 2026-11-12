<script setup lang="ts">
import { ReloadOutlined } from '@ant-design/icons-vue';
import type { TableColumnsType } from 'ant-design-vue';
import { computed, onMounted } from 'vue';

import { useIcd10Dictionary } from '@/composables/useIcd10Dictionary';
import type { Icd10Diagnosis } from '@/types';

const columns: TableColumnsType<Icd10Diagnosis> = [
  { title: 'Код МКБ-10', dataIndex: 'code', key: 'code', width: 180 },
  { title: 'Диагноз', dataIndex: 'name', key: 'name' },
];

const { diagnoses, source, durationMs, loading, errorMessage, refresh } = useIcd10Dictionary();

const alert = computed(() => {
  if (source.value === 'cache') {
    return {
      type: 'success' as const,
      message: 'SUCCESS: Данные получены из кэша сервера',
      description: 'Справочник уже находился в памяти сервера.',
    };
  }

  if (source.value === 'db') {
    return {
      type: 'warning' as const,
      message: 'ATTENTION: Тяжёлый запрос к БД',
      description: 'Кэш был пуст или инвалидирован — данные загружены заново.',
    };
  }

  return null;
});

const formattedDuration = computed(() =>
  durationMs.value === null ? '—' : `${durationMs.value.toFixed(2)} мс`,
);

onMounted(() => {
  void refresh();
});
</script>

<template>
  <main class="page-shell">
    <section class="dictionary-card" aria-labelledby="page-title">
      <header class="card-header">
        <div>
          <p class="eyebrow">Медицинская информационная система</p>
          <h1 id="page-title">Справочник МКБ-10</h1>
          <p class="subtitle">Диагнозы и коды Международной классификации болезней</p>
        </div>

        <a-button type="primary" size="large" :loading="loading" @click="refresh">
          <template #icon><ReloadOutlined /></template>
          Обновить данные
        </a-button>
      </header>

      <div class="status-grid">
        <div class="metric" aria-live="polite">
          <span class="metric-label">Время запроса</span>
          <strong>{{ formattedDuration }}</strong>
        </div>

        <a-alert
          v-if="alert"
          class="source-alert"
          show-icon
          :type="alert.type"
          :message="alert.message"
          :description="alert.description"
        />
        <div v-else class="source-placeholder">Определяем источник данных…</div>
      </div>

      <a-alert
        v-if="errorMessage"
        class="error-alert"
        type="error"
        show-icon
        :message="errorMessage"
      />

      <a-table
        :columns="columns"
        :data-source="diagnoses"
        :loading="loading && diagnoses.length === 0"
        :pagination="false"
        row-key="id"
        :scroll="{ x: 520 }"
      >
        <template #emptyText>
          <span>Данные ещё не загружены</span>
        </template>
      </a-table>
    </section>
  </main>
</template>
