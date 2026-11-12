import type { RequestHandler } from 'express';

import type { DictionaryCache } from './dictionary-cache.js';

export interface RequestCounter {
  middleware: RequestHandler;
  getCount: () => number;
}

/**
 * JavaScript runs each synchronous middleware section to completion, making the
 * increment and modulo check atomic within one Node.js process.
 */
export function createRequestCounter(cache: DictionaryCache): RequestCounter {
  let count = 0;

  const middleware: RequestHandler = (_request, response, next) => {
    count += 1;
    response.locals.requestNumber = count;

    if (count % 4 === 0) {
      cache.invalidate();
    }

    next();
  };

  return { middleware, getCount: () => count };
}
