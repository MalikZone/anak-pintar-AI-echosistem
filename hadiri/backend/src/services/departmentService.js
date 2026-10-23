import { departmentRepository } from '../repositories/DepartmentRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { generateDepartmentId, extractTenantCode } from '../utils/idGenerator.js';

class DepartmentService {
  async getDepartments(tenantId) {
    return departmentRepository.findByTenant(tenantId);
  }

  async getDepartmentById(tenantId, id) {
    const dept = await departmentRepository.findById(tenantId, id);
    if (!dept) {
      const error = new Error('Departemen tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }
    return dept;
  }

  async createDepartment(tenantId, data) {
    if (!data.name || !data.name.trim()) {
      const error = new Error('Nama departemen wajib diisi.');
      error.statusCode = 400;
      throw error;
    }

    const cleanName = data.name.trim();
    let cleanCode = data.code ? String(data.code).toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '') : '';

    if (!cleanCode) {
      // Auto generate code from department name initials or first word
      const words = cleanName.split(/\s+/).filter(Boolean);
      cleanCode = words.length > 1
        ? words.map((w) => w[0]).join('').slice(0, 6).toUpperCase()
        : cleanName.slice(0, 6).toUpperCase();
    }

    // Check code duplication in same tenant
    const existing = await departmentRepository.findByCode(tenantId, cleanCode);
    if (existing) {
      const error = new Error(`Kode departemen '${cleanCode}' sudah digunakan di organisasi ini.`);
      error.statusCode = 400;
      throw error;
    }

    // Validate parent if provided
    if (data.parentId) {
      const parent = await departmentRepository.findById(tenantId, data.parentId);
      if (!parent) {
        const error = new Error('Departemen induk yang dipilih tidak valid.');
        error.statusCode = 400;
        throw error;
      }
    }

    // Retrieve tenant code to generate enterprise standard ID
    const tenant = await tenantRepository.findById(tenantId);
    const tenantCode = tenant?.code || extractTenantCode(tenant?.name || 'GEN');
    const departmentId = data.id || generateDepartmentId(tenantCode, cleanCode);

    return departmentRepository.create({
      id: departmentId,
      tenantId,
      code: cleanCode,
      name: cleanName,
      description: data.description?.trim() || null,
      parentId: data.parentId || null,
      managerId: data.managerId || null,
    });
  }

  async updateDepartment(tenantId, id, data) {
    const existing = await this.getDepartmentById(tenantId, id);

    // Prevent circular hierarchy
    if (data.parentId) {
      if (data.parentId === id) {
        const error = new Error('Departemen tidak dapat menjadi induk bagi dirinya sendiri.');
        error.statusCode = 400;
        throw error;
      }
      const parent = await departmentRepository.findById(tenantId, data.parentId);
      if (!parent) {
        const error = new Error('Departemen induk yang dipilih tidak valid.');
        error.statusCode = 400;
        throw error;
      }
    }

    return departmentRepository.update(tenantId, id, {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      description: data.description !== undefined ? data.description.trim() : existing.description,
      parentId: data.parentId !== undefined ? (data.parentId || null) : existing.parentId,
      managerId: data.managerId !== undefined ? (data.managerId || null) : existing.managerId,
    });
  }

  async deleteDepartment(tenantId, id) {
    const existing = await this.getDepartmentById(tenantId, id);

    // Check if sub-departments exist
    const childCount = await departmentRepository.countSubDepartments(id);
    if (childCount > 0) {
      const error = new Error(`Tidak dapat menghapus departemen '${existing.name}' karena memiliki ${childCount} sub-divisi aktif.`);
      error.statusCode = 400;
      throw error;
    }

    // Check if members are assigned to this department
    const memberCount = await departmentRepository.countMembers(id, existing.name);
    if (memberCount > 0) {
      const error = new Error(`Tidak dapat menghapus departemen '${existing.name}' karena memiliki ${memberCount} karyawan terhubung. Pindahkan karyawan terlebih dahulu.`);
      error.statusCode = 400;
      throw error;
    }

    await departmentRepository.delete(tenantId, id);
    return { id, message: `Departemen '${existing.name}' berhasil dinonaktifkan.` };
  }
}

export const departmentService = new DepartmentService();

