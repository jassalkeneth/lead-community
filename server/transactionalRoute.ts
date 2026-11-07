import type { Request, RequestHandler } from 'express';
import { db } from './db.ts';

interface ApiResult {
  status?: number;
  body: unknown;
}

export function transactionalRoute(handler: (request: Request) => ApiResult): RequestHandler {
  return (req, res, next) => {
    try {
      const result = db.transaction(() => handler(req));
      res.status(result.status ?? 200).json(result.body);
    } catch (error) {
      next(error);
    }
  };
}
