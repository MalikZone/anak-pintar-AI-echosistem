import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: process.env.PORT || 5001,
  NODE_ENV: process.env.NODE_ENV || 'development',
  JWT_SECRET: process.env.JWT_SECRET || 'hadirin_dev_fallback_secret_key_change_in_production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // Database (MySQL)
  DB_CONNECTION: process.env.DB_CONNECTION || 'mysql',
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_PORT: parseInt(process.env.DB_PORT || '3306', 10),
  DB_DATABASE: process.env.DB_DATABASE || 'hadirin',
  DB_USERNAME: process.env.DB_USERNAME || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',

  // AI Orchestration (Layer 1 RAG Gatekeeper - FastAPI)
  AI_GATEKEEPER_URL: (process.env.AI_GATEKEEPER_URL || 'http://localhost:8000/api/v1').replace(/\/+$/, ''),
  AI_GATEKEEPER_TIMEOUT_MS: parseInt(process.env.AI_GATEKEEPER_TIMEOUT_MS || '8000', 10),
  AI_INTENT_THRESHOLD: parseFloat(process.env.AI_INTENT_THRESHOLD || '0.70'),
  AI_DRAFT_TTL_MINUTES: parseInt(process.env.AI_DRAFT_TTL_MINUTES || '30', 10),

  // Telegram Bot Gateway
  TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN || '',
  TELEGRAM_WEBHOOK_SECRET: process.env.TELEGRAM_WEBHOOK_SECRET || '',
};

