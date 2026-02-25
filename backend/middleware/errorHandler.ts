import { Request, Response, NextFunction, RequestHandler } from 'express';

// ── Custom error classes ──────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code:       string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.name          = this.constructor.name;
    this.statusCode    = statusCode;
    this.code          = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ServiceError extends AppError {
  constructor(message: string, code = 'SERVICE_ERROR') {
    super(message, 502, code);
  }
}

// ── Async handler wrapper ─────────────────────────────────────────────────────
// Eliminates try/catch boilerplate in every route; passes thrown errors to next()

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export function asyncHandler(fn: AsyncRouteHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

// ── 404 handler ───────────────────────────────────────────────────────────────

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    code:    'NOT_FOUND',
  });
}

// ── Global error handler ──────────────────────────────────────────────────────
// Must be registered LAST: app.use(errorHandler)

export function errorHandler(
  err:  Error,
  _req: Request,
  res:  Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Operational errors: safe to surface to the client
  if (err instanceof AppError && err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code:    err.code,
    });
    return;
  }

  // Unexpected / programmer errors: log in full, return generic response
  console.error('[Error] Unhandled exception:', err);
  res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again.',
    code:    'INTERNAL_ERROR',
  });
}
