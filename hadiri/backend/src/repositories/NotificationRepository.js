import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';

function mapNotificationRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantId: row.tenant_id || row.tenantId,
    userId: row.user_id || row.userId,
    type: row.type || 'system',
    title: row.title,
    message: row.message,
    link: row.link || null,
    isRead: Boolean(row.is_read ?? row.isRead),
    readAt: row.read_at || row.readAt || null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class NotificationRepository extends BaseRepository {
  constructor() {
    super('notifications');
  }

  async findByUser(userId, { unreadOnly = false, limit = 20, offset = 0 } = {}) {
    const pool = getPool();
    let query = `
      SELECT * FROM notifications
      WHERE user_id = ? AND deleted_at IS NULL
    `;
    const params = [userId];

    if (unreadOnly) {
      query += ` AND is_read = FALSE`;
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));

    const [rows] = await pool.query(query, params);
    return rows.map(mapNotificationRow);
  }

  async getUnreadCount(userId) {
    const pool = getPool();
    const [rows] = await pool.query(
      `SELECT COUNT(*) as count FROM notifications
       WHERE user_id = ? AND is_read = FALSE AND deleted_at IS NULL`,
      [userId]
    );
    return Number(rows[0]?.count || 0);
  }

  async markAsRead(id, userId) {
    const pool = getPool();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = ?, updated_at = ?
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [now, now, id, userId]
    );
    return this.findById(id);
  }

  async markAllAsRead(userId) {
    const pool = getPool();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE, read_at = ?, updated_at = ?
       WHERE user_id = ? AND is_read = FALSE AND deleted_at IS NULL`,
      [now, now, userId]
    );
    return true;
  }

  async markAsReadByCriteria({ userId, tenantId, link, keyword }) {
    const pool = getPool();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const conditions = ['is_read = FALSE', 'deleted_at IS NULL'];
    const params = [now, now];

    if (userId) {
      conditions.push('user_id = ?');
      params.push(userId);
    }
    if (tenantId) {
      conditions.push('tenant_id = ?');
      params.push(tenantId);
    }
    if (link) {
      conditions.push('link LIKE ?');
      params.push(`%${link}%`);
    }

    if (keyword) {
      const specificConditions = [...conditions, '(message LIKE ? OR title LIKE ?)'];
      const specificParams = [...params, `%${keyword}%`, `%${keyword}%`];
      const sql = `UPDATE notifications SET is_read = TRUE, read_at = ?, updated_at = ? WHERE ${specificConditions.join(' AND ')}`;
      const [result] = await pool.query(sql, specificParams);
      if (result && result.affectedRows > 0) {
        return true;
      }
    }

    const fallbackSql = `UPDATE notifications SET is_read = TRUE, read_at = ?, updated_at = ? WHERE ${conditions.join(' AND ')} ORDER BY created_at ASC LIMIT 1`;
    await pool.query(fallbackSql, params);
    return true;
  }
}

export const notificationRepository = new NotificationRepository();
export default notificationRepository;

