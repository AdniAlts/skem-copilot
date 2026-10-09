/**
 * Error terstruktur + handler format seragam (ARCHITECTURE §9):
 *
 *   { "error": { "code": "VALIDATION_ERROR", "message": "...", "details": {} } }
 *
 * Kode dikunci di @skem/shared ERROR_CODES.
 */

import type { NextFunction, Request, Response } from 'express';

import { ERROR_CODES, type ErrorCode } from '@skem/shared';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }

  get httpStatus(): number {
    return ERROR_CODES[this.code].http;
  }
}

export function notFoundError(message = 'Tidak ditemukan.'): AppError {
  return new AppError('NOT_FOUND', message);
}

export function validationError(message: string, details?: Record<string, unknown>): AppError {
  return new AppError('VALIDATION_ERROR', message, details);
}

/** Handler terakhir di chain Express — pasang setelah semua route. */
export function errorHandler(err: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(err);
    return;
  }
  if (err instanceof AppError) {
    res.status(err.httpStatus).json({
      error: { code: err.code, message: err.message, ...(err.details ? { details: err.details } : {}) },
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL', message: 'Gangguan sistem.' },
  });
}

/** Wrapper async route — meneruskan rejection ke errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
}
