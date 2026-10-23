import { auditLogRepository } from '../repositories/AuditLogRepository.js';

class AuditLogService {
  /**
   * Record a platform security/governance audit log safely without blocking main flow
   */
  async log({
    tenantId = null,
    actor = null,
    actorId = null,
    actorName = null,
    actorEmail = null,
    actorRole = null,
    action,
    category = 'system',
    targetType = null,
    targetId = null,
    targetName = null,
    description = '',
    metadata = null,
    ipAddress = null,
  }) {
    try {
      return await auditLogRepository.create({
        tenantId: tenantId || actor?.tenantId || null,
        actorId: actorId || actor?.id || null,
        actorName: actorName || actor?.name || 'System',
        actorEmail: actorEmail || actor?.email || null,
        actorRole: actorRole || actor?.role || 'system',
        action,
        category,
        targetType,
        targetId,
        targetName,
        description,
        metadata,
        ipAddress,
      });
    } catch (err) {
      console.warn('[AuditLogService] Non-blocking error recording audit log:', err.message);
      return null;
    }
  }

  async getAuditLogs(filters = {}) {
    return auditLogRepository.findAll(filters);
  }
}

export const auditLogService = new AuditLogService();
export default auditLogService;
