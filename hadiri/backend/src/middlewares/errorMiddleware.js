import { ENV } from '../config/env.js';

export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  
  let rawMessage = err.message || 'system.internal_error';
  if (err.name === 'JsonWebTokenError') rawMessage = 'auth.token_invalid';
  if (err.name === 'TokenExpiredError') rawMessage = 'auth.token_expired';

  const message = req.t ? req.t(rawMessage, err.params || {}) : rawMessage;

  const response = {
    success: false,
    message,
  };

  if (err.errors) {
    response.errors = err.errors;
  }

  if (ENV.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

