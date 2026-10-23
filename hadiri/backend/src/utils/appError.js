export class AppError extends Error {
  constructor(message, statusCode = 500, params = {}) {
    super(message);
    this.statusCode = statusCode;
    this.params = params;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

