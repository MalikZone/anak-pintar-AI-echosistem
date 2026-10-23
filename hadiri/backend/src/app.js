import express from 'express';
import cors from 'cors';
import { ENV } from './config/env.js';
import routes from './routes/index.js';
import { requestLogger } from './middlewares/requestLogger.js';
import { langMiddleware } from './middlewares/langMiddleware.js';
import { errorHandler } from './middlewares/errorMiddleware.js';
import { AppError } from './utils/appError.js';

const app = express();

// Middlewares
app.use(
  cors({
    origin: '*', // Allow frontend connection
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);
app.use(langMiddleware);

// Mount API v1
app.use('/api/v1', routes);

// 404 Fallback
app.all('*', (req, res, next) => {
  const msg = req.t
    ? req.t('system.route_not_found', { path: req.originalUrl })
    : `Rute endpoint '${req.originalUrl}' tidak ditemukan pada server ini.`;
  next(new AppError(msg, 404));
});

// Centralized error handling
app.use(errorHandler);

export default app;

