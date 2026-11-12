import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from './app.js';

describe('GET /api/v1/dictionaries/icd10', () => {
  it('serves the first request from DB, caches requests 2-3, and invalidates request 4', async () => {
    let databaseReads = 0;
    const { app, counter } = createApp({
      dbDelayMs: 20,
      onDatabaseRead: () => {
        databaseReads += 1;
      },
    });

    const first = await request(app).get('/api/v1/dictionaries/icd10').expect(200);
    const second = await request(app).get('/api/v1/dictionaries/icd10').expect(200);
    const third = await request(app).get('/api/v1/dictionaries/icd10').expect(200);
    const fourth = await request(app).get('/api/v1/dictionaries/icd10').expect(200);

    expect(first.body.source).toBe('db');
    expect(second.body.source).toBe('cache');
    expect(third.body.source).toBe('cache');
    expect(fourth.body.source).toBe('db');
    expect(first.body.data).toHaveLength(4);
    expect(databaseReads).toBe(2);
    expect(counter.getCount()).toBe(4);
  });

  it('collapses parallel cache misses into one database read', async () => {
    let databaseReads = 0;
    const { app } = createApp({
      dbDelayMs: 20,
      onDatabaseRead: () => {
        databaseReads += 1;
      },
    });

    const responses = await Promise.all(
      Array.from({ length: 3 }, () => request(app).get('/api/v1/dictionaries/icd10').expect(200)),
    );

    expect(responses.every(({ body }) => body.source === 'db')).toBe(true);
    expect(databaseReads).toBe(1);
  });
});
