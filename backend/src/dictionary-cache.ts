import type { Request, Response } from 'express';

import { ICD10_DIAGNOSES } from './icd10-data.js';
import type { DataSource, Icd10Diagnosis } from './types.js';

export const DEFAULT_DB_DELAY_MS = 1_000;

export class NoActiveClientsError extends Error {
  constructor() {
    super('All clients disconnected before the database operation completed');
    this.name = 'NoActiveClientsError';
  }
}

type ClientState = {
  request: Pick<Request, 'destroyed'>;
  response: Pick<Response, 'writableEnded'>;
};

interface DictionaryCacheOptions {
  delayMs?: number;
  onDatabaseRead?: () => void;
}

/**
 * Process-local cache with request collapsing. An in-flight Promise is shared by
 * every waiter, so one cold-cache window always produces at most one DB read.
 */
export class DictionaryCache {
  private cachedData: readonly Icd10Diagnosis[] | null = null;
  private inFlight: Promise<readonly Icd10Diagnosis[]> | null = null;
  private readonly clients = new Set<ClientState>();
  private readonly delayMs: number;
  private readonly onDatabaseRead: () => void;

  constructor(options: DictionaryCacheOptions = {}) {
    this.delayMs = options.delayMs ?? DEFAULT_DB_DELAY_MS;
    this.onDatabaseRead = options.onDatabaseRead ?? (() => undefined);
  }

  invalidate(): void {
    this.cachedData = null;
  }

  async get(
    request: Pick<Request, 'destroyed'>,
    response: Pick<Response, 'writableEnded'>,
  ): Promise<{ data: Icd10Diagnosis[]; source: DataSource }> {
    if (this.cachedData) {
      return { data: this.clone(this.cachedData), source: 'cache' };
    }

    const client: ClientState = { request, response };
    this.clients.add(client);

    if (!this.inFlight) {
      this.inFlight = this.readFromDatabase()
        .then((data) => {
          this.cachedData = data;
          return data;
        })
        .finally(() => {
          this.inFlight = null;
          this.clients.clear();
        });
    }

    try {
      const data = await this.inFlight;
      return { data: this.clone(data), source: 'db' };
    } finally {
      this.clients.delete(client);
    }
  }

  private readFromDatabase(): Promise<readonly Icd10Diagnosis[]> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // This liveness check intentionally lives inside the timeout closure.
        const hasActiveClient = [...this.clients].some(
          ({ request, response }) => !request.destroyed && !response.writableEnded,
        );

        if (!hasActiveClient) {
          reject(new NoActiveClientsError());
          return;
        }

        this.onDatabaseRead();
        resolve(ICD10_DIAGNOSES);
      }, this.delayMs);
    });
  }

  private clone(data: readonly Icd10Diagnosis[]): Icd10Diagnosis[] {
    return data.map((diagnosis) => ({ ...diagnosis }));
  }
}
