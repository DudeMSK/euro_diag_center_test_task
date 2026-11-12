export interface Icd10Diagnosis {
  id: number;
  code: string;
  name: string;
}

export type DataSource = 'cache' | 'db';

export interface Icd10Response {
  data: Icd10Diagnosis[];
  source: DataSource;
}
