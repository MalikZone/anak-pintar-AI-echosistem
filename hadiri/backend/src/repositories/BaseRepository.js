import { getPool } from '../database/mysql.js';

function formatDateTimeForSql(val) {
  if (!val) return null;
  const d = new Date(val);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

function normalizeDbRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = { ...row };
  for (const [key, value] of Object.entries(row)) {
    if (key.includes('_')) {
      const camelKey = key.replace(/_([a-z0-9])/g, (_, ch) => ch.toUpperCase());
      if (normalized[camelKey] === undefined) {
        normalized[camelKey] = value;
      }
    }
  }
  return normalized;
}

export class BaseRepository {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.tableName = collectionName;
  }

  async getAll(includeDeleted = false) {
    const pool = getPool();
    const sql = includeDeleted
      ? `SELECT * FROM \`${this.collectionName}\` ORDER BY created_at ASC`
      : `SELECT * FROM \`${this.collectionName}\` WHERE deleted_at IS NULL ORDER BY created_at ASC`;
    const [rows] = await pool.query(sql);
    return rows.map(normalizeDbRow);
  }

  async find(filterFn = null, includeDeleted = false) {
    const items = await this.getAll(includeDeleted);
    if (!filterFn) return items;
    return items.filter(filterFn);
  }

  async findById(id, includeDeleted = false) {
    const pool = getPool();
    const sql = includeDeleted
      ? `SELECT * FROM \`${this.collectionName}\` WHERE id = ? LIMIT 1`
      : `SELECT * FROM \`${this.collectionName}\` WHERE id = ? AND deleted_at IS NULL LIMIT 1`;
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? normalizeDbRow(rows[0]) : null;
  }

  async findOne(filterFn, includeDeleted = false) {
    const items = await this.getAll(includeDeleted);
    return items.find(filterFn) || null;
  }

  async create(data) {
    const pool = getPool();
    const now = formatDateTimeForSql(new Date());
    const id = data.id || `${this.collectionName.slice(0, 3).toUpperCase()}-${Date.now()}`;

    const columns = [];
    const placeholders = [];
    const values = [];

    const record = { ...data, id };
    if (!record.created_at && !record.createdAt) record.created_at = now;
    if (!record.updated_at && !record.updatedAt) record.updated_at = now;

    const snakeRecord = {};
    for (const [k, v] of Object.entries(record)) {
      const snakeKey = k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (snakeRecord[snakeKey] === undefined) {
        snakeRecord[snakeKey] = v;
      }
    }

    for (const [col, val] of Object.entries(snakeRecord)) {
      if (typeof val === 'function') continue;
      if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        continue;
      }
      columns.push(`\`${col}\``);
      placeholders.push('?');
      if (val instanceof Date) {
        values.push(formatDateTimeForSql(val));
      } else if (typeof val === 'string' && (col.includes('_at') || col === 'date' || col.includes('_date'))) {
        values.push(col.includes('_at') ? formatDateTimeForSql(val) : val.slice(0, 10));
      } else {
        values.push(val);
      }
    }

    const sql = `INSERT INTO \`${this.collectionName}\` (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;
    await pool.query(sql, values);

    return this.findById(id);
  }

  async update(id, updates) {
    const pool = getPool();
    const now = formatDateTimeForSql(new Date());

    const setClauses = [];
    const values = [];

    const snakeUpdates = {};
    for (const [k, v] of Object.entries(updates)) {
      const snakeKey = k.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
      if (snakeUpdates[snakeKey] === undefined) {
        snakeUpdates[snakeKey] = v;
      }
    }

    if (snakeUpdates.updated_at === undefined) {
      snakeUpdates.updated_at = now;
    }

    for (const [col, val] of Object.entries(snakeUpdates)) {
      if (col === 'id') continue;
      if (typeof val === 'function') continue;
      if (typeof val === 'object' && val !== null && !(val instanceof Date)) {
        continue;
      }
      setClauses.push(`\`${col}\` = ?`);
      if (val instanceof Date) {
        values.push(formatDateTimeForSql(val));
      } else if (typeof val === 'string' && (col.includes('_at') || col === 'date' || col.includes('_date'))) {
        values.push(col.includes('_at') ? formatDateTimeForSql(val) : val.slice(0, 10));
      } else {
        values.push(val);
      }
    }

    if (setClauses.length > 0) {
      values.push(id);
      const sql = `UPDATE \`${this.collectionName}\` SET ${setClauses.join(', ')} WHERE id = ?`;
      await pool.query(sql, values);
    }

    return this.findById(id);
  }

  async delete(id) {
    const pool = getPool();
    await pool.query(
      `UPDATE \`${this.collectionName}\` SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [id]
    );
    return true;
  }

  async restore(id) {
    const pool = getPool();
    await pool.query(
      `UPDATE \`${this.collectionName}\` SET deleted_at = NULL, updated_at = NOW() WHERE id = ?`,
      [id]
    );
    return this.findById(id);
  }

  async count(filterFn = null, includeDeleted = false) {
    if (!filterFn) {
      const pool = getPool();
      const sql = includeDeleted
        ? `SELECT COUNT(*) as count FROM \`${this.collectionName}\``
        : `SELECT COUNT(*) as count FROM \`${this.collectionName}\` WHERE deleted_at IS NULL`;
      const [rows] = await pool.query(sql);
      return Number(rows[0]?.count || 0);
    }
    const items = await this.getAll(includeDeleted);
    return items.filter(filterFn).length;
  }
}
