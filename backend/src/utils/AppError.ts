/**
 * Represents an expected, "operational" failure (bad input, not found, not
 * authorized, conflict, etc.) as opposed to a programming bug. The global
 * error handler uses `isOperational` to decide whether to expose the message
 * to the client or hide it behind a generic 500.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational = true;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, details);
  }
  static unauthorized(message = 'Unauthorized') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'Forbidden') {
    return new AppError(message, 403);
  }
  static notFound(message = 'Not found') {
    return new AppError(message, 404);
  }
  static conflict(message: string) {
    return new AppError(message, 409);
  }
  static tooManyRequests(message = 'Too many requests') {
    return new AppError(message, 429);
  }
  static internal(message = 'Something went wrong') {
    return new AppError(message, 500);
  }
}
