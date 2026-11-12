import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_DB_DELAY_MS,
  DictionaryCache,
  NoActiveClientsError,
} from './dictionary-cache.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('DictionaryCache', () => {
  it('uses the required 1000 ms delay by default', async () => {
    vi.useFakeTimers();
    const cache = new DictionaryCache();
    let settled = false;
    const result = cache
      .get({ destroyed: false }, { writableEnded: false })
      .finally(() => {
        settled = true;
      });

    await vi.advanceTimersByTimeAsync(DEFAULT_DB_DELAY_MS - 1);
    expect(settled).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await expect(result).resolves.toMatchObject({ source: 'db' });
    expect(settled).toBe(true);
  });

  it('checks connection state in the timer and skips the DB read when all clients left', async () => {
    vi.useFakeTimers();
    let databaseReads = 0;
    const cache = new DictionaryCache({
      onDatabaseRead: () => {
        databaseReads += 1;
      },
    });
    const request = { destroyed: false };
    const response = { writableEnded: false };
    const result = cache.get(request, response);
    const rejection = expect(result).rejects.toBeInstanceOf(NoActiveClientsError);

    request.destroyed = true;
    await vi.advanceTimersByTimeAsync(DEFAULT_DB_DELAY_MS);

    await rejection;
    expect(databaseReads).toBe(0);
  });
});
