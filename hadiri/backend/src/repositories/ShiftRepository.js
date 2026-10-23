import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapShiftRow(row) {
  if (!row) return null;

  let checkInStart = row.check_in_window_start || row.checkInWindowStart;
  let checkInEnd = row.check_in_window_end || row.checkInWindowEnd;
  let checkOutStart = row.check_out_window_start || row.checkOutWindowStart;
  let checkOutEnd = row.check_out_window_end || row.checkOutWindowEnd;

  if (row.checkInWindow) {
    checkInStart = row.checkInWindow.start || checkInStart;
    checkInEnd = row.checkInWindow.end || checkInEnd;
  }
  if (row.checkOutWindow) {
    checkOutStart = row.checkOutWindow.start || checkOutStart;
    checkOutEnd = row.checkOutWindow.end || checkOutEnd;
  }

  const startTime = row.start_time || row.startTime;
  const endTime = row.end_time || row.endTime;

  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    tenant_id: row.tenant_id || row.tenantId,
    code: row.code,
    name: row.name,
    startTime: startTime,
    start_time: startTime,
    endTime: endTime,
    end_time: endTime,
    isCrossDay: Boolean(row.is_cross_day ?? row.isCrossDay),
    is_cross_day: Boolean(row.is_cross_day ?? row.isCrossDay),
    gracePeriodMinutes: Number(row.grace_period_minutes ?? row.gracePeriodMinutes ?? 15),
    grace_period_minutes: Number(row.grace_period_minutes ?? row.gracePeriodMinutes ?? 15),
    checkInWindow: {
      start: checkInStart || startTime,
      end: checkInEnd || startTime,
    },
    checkOutWindow: {
      start: checkOutStart || endTime,
      end: checkOutEnd || endTime,
    },
    check_in_window_start: checkInStart,
    check_in_window_end: checkInEnd,
    check_out_window_start: checkOutStart,
    check_out_window_end: checkOutEnd,
    created_at: row.created_at || row.createdAt,
    updated_at: row.updated_at || row.updatedAt,
    deleted_at: row.deleted_at || row.deletedAt || null,
  };
}

class ShiftRepository extends BaseRepository {
  constructor() {
    super('shifts');
  }

  async findByTenant(tenantId, includeDeleted = false) {
    const pool = getPool();
    const sql = includeDeleted
      ? 'SELECT * FROM shifts WHERE tenant_id = ? ORDER BY code ASC'
      : 'SELECT * FROM shifts WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY code ASC';
    const [rows] = await pool.query(sql, [tenantId]);
    return rows.map(mapShiftRow);
  }

  async findById(id, includeDeleted = false) {
    const pool = getPool();
    const sql = includeDeleted
      ? 'SELECT * FROM shifts WHERE id = ? LIMIT 1'
      : 'SELECT * FROM shifts WHERE id = ? AND deleted_at IS NULL LIMIT 1';
    const [rows] = await pool.query(sql, [id]);
    return rows.length > 0 ? mapShiftRow(rows[0]) : null;
  }

  async findByCode(tenantId, code, includeDeleted = false) {
    const pool = getPool();
    const sql = includeDeleted
      ? 'SELECT * FROM shifts WHERE tenant_id = ? AND code = ? LIMIT 1'
      : 'SELECT * FROM shifts WHERE tenant_id = ? AND code = ? AND deleted_at IS NULL LIMIT 1';
    const [rows] = await pool.query(sql, [tenantId, code]);
    return rows.length > 0 ? mapShiftRow(rows[0]) : null;
  }

  async create(data) {
    const pool = getPool();
    const mapped = mapShiftRow(data);
    await pool.query(
      `INSERT INTO shifts (
        id, tenant_id, code, name, start_time, end_time, is_cross_day,
        grace_period_minutes, check_in_window_start, check_in_window_end,
        check_out_window_start, check_out_window_end, created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [
        mapped.id,
        mapped.tenantId,
        mapped.code,
        mapped.name,
        mapped.startTime,
        mapped.endTime,
        mapped.isCrossDay ? 1 : 0,
        mapped.gracePeriodMinutes,
        mapped.checkInWindow.start,
        mapped.checkInWindow.end,
        mapped.checkOutWindow.start,
        mapped.checkOutWindow.end,
      ]
    );

    return this.findById(mapped.id);
  }

  async update(id, updates) {
    const existing = await this.findById(id);
    if (!existing) return null;

    const merged = { ...existing, ...updates };
    const mapped = mapShiftRow(merged);
    const pool = getPool();

    await pool.query(
      `UPDATE shifts SET
        code = ?, name = ?, start_time = ?, end_time = ?, is_cross_day = ?,
        grace_period_minutes = ?, check_in_window_start = ?, check_in_window_end = ?,
        check_out_window_start = ?, check_out_window_end = ?, updated_at = NOW()
      WHERE id = ?`,
      [
        mapped.code,
        mapped.name,
        mapped.startTime,
        mapped.endTime,
        mapped.isCrossDay ? 1 : 0,
        mapped.gracePeriodMinutes,
        mapped.checkInWindow.start,
        mapped.checkInWindow.end,
        mapped.checkOutWindow.start,
        mapped.checkOutWindow.end,
        id,
      ]
    );

    return this.findById(id);
  }

  async softDelete(id) {
    const pool = getPool();
    await pool.query(
      `UPDATE shifts SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?`,
      [id]
    );
    return true;
  }

  async delete(id) {
    return this.softDelete(id);
  }
}

export const shiftRepository = new ShiftRepository();
