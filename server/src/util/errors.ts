import type { NextFunction, Request, Response } from 'express';
import { tReq, type MsgParams } from '../i18n';

// message: kaynak metin (Türkçe). İstemciye isteğin dilinde çevrilerek gönderilir.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code: string,
    public params?: MsgParams,
    public translateParams?: string[],
    public extra?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export function sendError(
  res: Response,
  status: number,
  message: string,
  code: string,
  params?: MsgParams,
  extra?: Record<string, unknown>
): void {
  res.status(status).json({ error: tReq(res.req, message, params), code, ...(extra ?? {}) });
}

// Express için merkezi hata yakalayıcı
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError) {
    res
      .status(err.status)
      .json({ error: tReq(req, err.message, err.params, err.translateParams), code: err.code, ...(err.extra ?? {}) });
    return;
  }
  console.error('[server] unexpected error:', err);
  res.status(500).json({ error: tReq(req, 'Sunucu hatası'), code: 'INTERNAL' });
}
