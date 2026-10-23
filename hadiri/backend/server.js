import app from './src/app.js';
import { ENV } from './src/config/env.js';
import { testConnection } from './src/database/mysql.js';

async function startServer() {
  const mysqlConnected = await testConnection();
  if (mysqlConnected) {
    console.log(`✅ Connected directly to MySQL database '${ENV.DB_DATABASE}' on port ${ENV.DB_PORT}`);
  } else {
    console.warn(`⚠️ Warning: Could not connect to MySQL database '${ENV.DB_DATABASE}'. Check your MySQL service.`);
  }

  const server = app.listen(ENV.PORT, () => {
    console.log('====================================================');
    console.log(`🚀 Hadirin Backend Server running on port ${ENV.PORT}`);
    console.log(`🌐 Environment: ${ENV.NODE_ENV}`);
    console.log(`🔗 API Base URL: http://localhost:${ENV.PORT}/api/v1`);
    console.log(`🏥 Health Check: http://localhost:${ENV.PORT}/api/v1/health`);
    console.log('====================================================');
  });

  // Graceful shutdown
  const shutdown = () => {
    console.log('🛑 Shutting down Hadirin server gracefully...');
    server.close(() => {
      console.log('⚡ Server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});
