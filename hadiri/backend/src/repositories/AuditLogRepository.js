import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';
import { ensureSaasGovernanceSchema } from '../database/ensureSaasSchema.js';

function mapAuditRow(row) {
  if (!row) return null;
  let parsedMeta = null;
  if (row.metadata) {
    try {
      parsedMeta = typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata;
    } catch {
      parsedMeta = row.metadata;
    }
  }
  return {
    id: row.id,
    tenantId: row.tenant_id || null,
    tenantName: row.tenant_name || null,
    actorId: row.actor_id || null,
    actorName: row.actor_name || 'Sistem',
    actorEmail: row.actor_email || null,
    actorRole: row.actor_role || 'system',
    action: row.action,
    category: row.category || 'system',
    targetType: row.target_type || null,
    targetId: row.target_id || null,
    targetName: row.target_name || null,
    description: row.description || '',
    metadata: parsedMeta,
    ipAddress: row.ip_address || null,
    createdAt: row.created_at || row.createdAt,
  };
}

class AuditLogRepository extends BaseRepository {
  constructor() {
    super('audit_logs');
  }

  async create(data) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    const id = data.id || `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    const metaJson = data.metadata ? JSON.stringify(data.metadata) : null;

    await pool.query(
      `INSERT INTO audit_logs (
        id, tenant_id, actor_id, actor_name, actor_email, actor_role,
        action, category, target_type, target_id, target_name,
        description, metadata, ip_address, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        id,
        data.tenantId || null,
        data.actorId || null,
        data.actorName || null,
        data.actorEmail || null,
        data.actorRole || null,
        data.action,
        data.category || 'system',
        data.targetType || null,
        data.targetId || null,
        data.targetName || null,
        data.description || null,
        metaJson,
        data.ipAddress || null,
      ]
    );
    return { id, ...data };
  }

  async findAll({ tenantId, category, search, limit = 100 } = {}) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    let sql = `
      SELECT a.*, t.name as tenant_name
      FROM audit_logs a
      LEFT JOIN tenants t ON a.tenant_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (tenantId && tenantId !== 'all') {
      sql += ` AND a.tenant_id = ?`;
      params.push(tenantId);
    }

    if (category && category !== 'all') {
      sql += ` AND a.category = ?`;
      params.push(category);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      sql += ` AND (a.actor_name LIKE ? OR a.actor_email LIKE ? OR a.action LIKE ? OR a.target_name LIKE ? OR a.description LIKE ?)`;
      params.push(q, q, q, q, q);
    }

    sql += ` ORDER BY a.created_at DESC LIMIT ?`;
    params.push(Math.min(Number(limit) || 100, 500));

    const [rows] = await pool.query(sql, params);
    return rows.map(mapAuditRow);
  }
}

export const auditLogRepository = new AuditLogRepository();
export default auditLogRepository;

