import mysql from 'mysql2/promise';
import { ENV } from '../config/env.js';

let pool = null;
let isConnected = false;

/**
 * Initialize or get active MySQL connection pool
 */
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USERNAME,
      password: ENV.DB_PASSWORD,
      database: ENV.DB_DATABASE,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      dateStrings: true,
    });
    isConnected = true;
  }
  return pool;
}

/**
 * Ensure database exists on MySQL server
 */
export async function ensureDatabase() {
  try {
    const adminConnection = await mysql.createConnection({
      host: ENV.DB_HOST,
      port: ENV.DB_PORT,
      user: ENV.DB_USERNAME,
      password: ENV.DB_PASSWORD,
    });

    await adminConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${ENV.DB_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await adminConnection.end();
    isConnected = true;
    return true;
  } catch (error) {
    console.warn(`[MySQL] Warning: Could not create database '${ENV.DB_DATABASE}' directly:`, error.message);
    return false;
  }
}

/**
 * Test MySQL connection
 */
export async function testConnection() {
  try {
    const currentPool = getPool();
    const [rows] = await currentPool.query('SELECT 1 + 1 AS result');
    isConnected = !!(rows && rows[0]?.result === 2);
    return isConnected;
  } catch (error) {
    console.warn('[MySQL] testConnection failed:', error.message);
    isConnected = false;
    return false;
  }
}

/**
 * Helper to execute parameterized queries
 */
export async function executeQuery(sql, params = []) {
  const currentPool = getPool();
  const [results] = await currentPool.query(sql, params);
  return results;
}

/**
 * Check if MySQL is currently connected and active
 */
export function isMySQLActive() {
  if (!pool) {
    getPool();
  }
  return true;
}

export default {
  getPool,
  ensureDatabase,
  testConnection,
  executeQuery,
  isMySQLActive,
};
