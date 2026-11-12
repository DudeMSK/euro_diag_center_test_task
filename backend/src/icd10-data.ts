import type { Icd10Diagnosis } from './types.js';

export const ICD10_DIAGNOSES: readonly Icd10Diagnosis[] = Object.freeze([
  Object.freeze({ id: 1, code: 'I10', name: 'Эссенциальная (первичная) гипертензия' }),
  Object.freeze({ id: 2, code: 'J06.9', name: 'Острая инфекция верхних дыхательных путей' }),
  Object.freeze({ id: 3, code: 'E11.9', name: 'Сахарный диабет 2 типа без осложнений' }),
  Object.freeze({ id: 4, code: 'M54.5', name: 'Боль в нижней части спины' }),
]);
