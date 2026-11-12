import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';

import { DictionaryCache, NoActiveClientsError } from './dictionary-cache.js';
import { createRequestCounter } from './request-counter.js';

interface CreateAppOptions {
  dbDelayMs?: number;
  onDatabaseRead?: () => void;
}

export function createApp(options: CreateAppOptions = {}) {
  const app = express();
  const cache = new DictionaryCache({
    delayMs: options.dbDelayMs,
    onDatabaseRead: options.onDatabaseRead,
  });
  const counter = createRequestCounter(cache);

  app.disable('x-powered-by');
  app.use(cors());

  app.get('/api/v1/dictionaries/icd10', counter.middleware, async (request, response, next) => {
    try {
      const result = await cache.get(request, response);

      if (request.destroyed || response.writableEnded) {
        return;
      }

      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  const errorHandler: ErrorRequestHandler = (error, request, response, _next) => {
    if (error instanceof NoActiveClientsError || request.destroyed || response.writableEnded) {
      return;
    }

    console.error(error);
    response.status(500).json({ error: 'Internal server error' });
  };
  app.use(errorHandler);

  return { app, cache, counter };
}
