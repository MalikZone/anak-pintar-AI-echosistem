import { leaveTypeRepository } from '../repositories/LeaveTypeRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { generateLeaveTypeId, extractTenantCode } from '../utils/idGenerator.js';

class LeaveTypeService {
  async getLeaveTypes(tenantId) {
    return leaveTypeRepository.findByTenant(tenantId);
  }

  async getLeaveTypeById(id) {
    const item = await leaveTypeRepository.findById(id);
    if (!item) {
      const error = new Error('Kebijakan cuti tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }
    return item;
  }

  async createLeaveType(user, tenantId, data) {
    if (!data.name || !data.name.trim()) {
      const error = new Error('Nama jenis cuti wajib diisi.');
      error.statusCode = 400;
      throw error;
    }

    const cleanName = data.name.trim();
    let cleanCode = data.code ? String(data.code).toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '') : '';

    if (!cleanCode) {
      const words = cleanName.split(/\s+/).filter(Boolean);
      cleanCode = words.length > 1
        ? words.map((w) => w[0]).join('').slice(0, 6).toUpperCase()
        : cleanName.slice(0, 6).toUpperCase();
    }

    const isGlobalRequest = data.isGlobal || data.scope === 'GLOBAL' || (user.role === 'super_admin' && data.isGlobal === true);
    let targetTenantId = tenantId;

    if (isGlobalRequest) {
      if (user.role !== 'super_admin' && !user.permissions?.includes('leaves.manage_global_policies')) {
        const error = new Error('Hanya Super Administrator yang berwenang menambahkan template cuti global sistem.');
        error.statusCode = 403;
        throw error;
      }
      targetTenantId = 'GLOBAL';
    }

    const existing = await leaveTypeRepository.findByCode(targetTenantId, cleanCode);
    if (existing) {
      const error = new Error(`Kode jenis cuti '${cleanCode}' sudah digunakan.`);
      error.statusCode = 400;
      throw error;
    }

    let tenantCode = 'GLOBAL';
    if (targetTenantId !== 'GLOBAL') {
      const tenant = await tenantRepository.findById(targetTenantId);
      tenantCode = tenant?.code || extractTenantCode(tenant?.name || 'GEN');
    }

    const leaveTypeId = data.id || generateLeaveTypeId(tenantCode, cleanCode);

    return leaveTypeRepository.create({
      id: leaveTypeId,
      tenantId: targetTenantId,
      code: cleanCode,
      name: cleanName,
      defaultQuota: Math.max(0, Number(data.defaultQuota || 0)),
      deductAnnual: !!data.deductAnnual,
      requiresAttachment: !!data.requiresAttachment,
      isPaid: data.isPaid !== false,
      isSystem: !!(isGlobalRequest && data.isSystem),
      description: data.description?.trim() || null,
    });
  }

  async updateLeaveType(user, tenantId, id, data) {
    const existing = await this.getLeaveTypeById(id);

    if (existing.isSystem || existing.isGlobal) {
      if (user.role !== 'super_admin' && !user.permissions?.includes('leaves.manage_global_policies')) {
        const error = new Error('Template cuti standar sistem hanya dapat dikonfigurasi oleh Super Administrator.');
        error.statusCode = 403;
        throw error;
      }
    } else {
      if (existing.tenantId !== tenantId && user.role !== 'super_admin') {
        const error = new Error('Anda tidak memiliki wewenang untuk mengubah kebijakan cuti organisasi lain.');
        error.statusCode = 403;
        throw error;
      }
    }

    return leaveTypeRepository.update(id, {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      defaultQuota: data.defaultQuota !== undefined ? Math.max(0, Number(data.defaultQuota)) : existing.defaultQuota,
      deductAnnual: data.deductAnnual !== undefined ? !!data.deductAnnual : existing.deductAnnual,
      requiresAttachment: data.requiresAttachment !== undefined ? !!data.requiresAttachment : existing.requiresAttachment,
      isPaid: data.isPaid !== undefined ? !!data.isPaid : existing.isPaid,
      description: data.description !== undefined ? data.description.trim() : existing.description,
    });
  }

  async deleteLeaveType(user, tenantId, id) {
    const existing = await this.getLeaveTypeById(id);

    if (existing.isSystem) {
      const error = new Error('Jenis cuti standar sistem tidak dapat dihapus.');
      error.statusCode = 400;
      throw error;
    }

    if (existing.isGlobal) {
      if (user.role !== 'super_admin' && !user.permissions?.includes('leaves.manage_global_policies')) {
        const error = new Error('Template cuti global hanya dapat dihapus oleh Super Administrator.');
        error.statusCode = 403;
        throw error;
      }
    } else {
      if (existing.tenantId !== tenantId && user.role !== 'super_admin') {
        const error = new Error('Anda tidak memiliki wewenang untuk menghapus kebijakan cuti organisasi lain.');
        error.statusCode = 403;
        throw error;
      }
    }

    await leaveTypeRepository.delete(id);
    return { id, message: `Jenis cuti '${existing.name}' berhasil dinonaktifkan.` };
  }
}

export const leaveTypeService = new LeaveTypeService();

