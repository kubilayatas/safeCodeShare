import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export function sendError(res: Response, status: number, message: string, code: string): void {
  res.status(status).json({ error: message, code });
}

// Express için merkezi hata yakalayıcı
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof HttpError) {
    sendError(res, err.status, err.message, err.code);
    return;
  }
  console.error('[server] beklenmeyen hata:', err);
  sendError(res, 500, 'Sunucu hatası', 'INTERNAL');
}