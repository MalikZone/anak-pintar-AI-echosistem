import { positionRepository } from '../repositories/PositionRepository.js';
import { departmentRepository } from '../repositories/DepartmentRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { generatePositionId, extractTenantCode } from '../utils/idGenerator.js';

const VALID_LEVELS = ['intern', 'staff', 'senior', 'lead', 'supervisor', 'manager', 'director', 'executive'];

class PositionService {
  async getPositions(tenantId) {
    return positionRepository.findByTenant(tenantId);
  }

  async getPositionById(tenantId, id) {
    const pos = await positionRepository.findById(tenantId, id);
    if (!pos) {
      const error = new Error('Jabatan tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }
    return pos;
  }

  async createPosition(tenantId, data) {
    if (!data.title || !data.title.trim()) {
      const error = new Error('Nama/judul jabatan wajib diisi.');
      error.statusCode = 400;
      throw error;
    }

    const cleanTitle = data.title.trim();
    let cleanCode = data.code ? String(data.code).toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '') : '';

    if (!cleanCode) {
      const words = cleanTitle.split(/\s+/).filter(Boolean);
      cleanCode = words.length > 1
        ? words.map((w) => w[0]).join('').slice(0, 6).toUpperCase()
        : cleanTitle.slice(0, 6).toUpperCase();
    }

    const existing = await positionRepository.findByCode(tenantId, cleanCode);
    if (existing) {
      const error = new Error(`Kode jabatan '${cleanCode}' sudah digunakan di organisasi ini.`);
      error.statusCode = 400;
      throw error;
    }

    if (data.departmentId) {
      const dept = await departmentRepository.findById(tenantId, data.departmentId);
      if (!dept) {
        const error = new Error('Departemen yang dipilih tidak valid.');
        error.statusCode = 400;
        throw error;
      }
    }

    const level = data.level && VALID_LEVELS.includes(data.level.toLowerCase())
      ? data.level.toLowerCase()
      : 'staff';

    const tenant = await tenantRepository.findById(tenantId);
    const tenantCode = tenant?.code || extractTenantCode(tenant?.name || 'GEN');
    const positionId = data.id || generatePositionId(tenantCode, cleanCode);

    return positionRepository.create({
      id: positionId,
      tenantId,
      departmentId: data.departmentId || null,
      code: cleanCode,
      title: cleanTitle,
      level,
      description: data.description?.trim() || null,
    });
  }

  async updatePosition(tenantId, id, data) {
    const existing = await this.getPositionById(tenantId, id);

    if (data.departmentId) {
      const dept = await departmentRepository.findById(tenantId, data.departmentId);
      if (!dept) {
        const error = new Error('Departemen yang dipilih tidak valid.');
        error.statusCode = 400;
        throw error;
      }
    }

    let level = existing.level;
    if (data.level && VALID_LEVELS.includes(data.level.toLowerCase())) {
      level = data.level.toLowerCase();
    }

    return positionRepository.update(tenantId, id, {
      title: data.title !== undefined ? data.title.trim() : existing.title,
      departmentId: data.departmentId !== undefined ? (data.departmentId || null) : existing.departmentId,
      level,
      description: data.description !== undefined ? data.description.trim() : existing.description,
    });
  }

  async deletePosition(tenantId, id) {
    const existing = await this.getPositionById(tenantId, id);

    const memberCount = await positionRepository.countMembers(id, existing.title);
    if (memberCount > 0) {
      const error = new Error(`Tidak dapat menghapus jabatan '${existing.title}' karena memiliki ${memberCount} karyawan aktif dengan jabatan ini.`);
      error.statusCode = 400;
      throw error;
    }

    await positionRepository.delete(tenantId, id);
    return { id, message: `Jabatan '${existing.title}' berhasil dinonaktifkan.` };
  }
}

export const positionService = new PositionService();

