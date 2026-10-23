import { holidayRepository } from '../repositories/HolidayRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { generateHolidayId, extractTenantCode } from '../utils/idGenerator.js';

class HolidayService {
  async getHolidays(tenantId, year = null) {
    return holidayRepository.findByTenant(tenantId, year);
  }

  async getHolidayById(id) {
    const holiday = await holidayRepository.findById(id);
    if (!holiday) {
      const error = new Error('Hari libur tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }
    return holiday;
  }

  async createHoliday(user, tenantId, data) {
    if (!data.name || !data.name.trim()) {
      const error = new Error('Nama hari libur wajib diisi.');
      error.statusCode = 400;
      throw error;
    }

    if (!data.date || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.date).slice(0, 10))) {
      const error = new Error('Format tanggal harus YYYY-MM-DD yang valid.');
      error.statusCode = 400;
      throw error;
    }

    const cleanDate = String(data.date).slice(0, 10);
    const year = cleanDate.split('-')[0];
    const isGlobalRequest = data.isGlobal || data.scope === 'GLOBAL' || user.role === 'super_admin' && data.isGlobal !== false;

    let targetTenantId = tenantId;
    let type = data.type || 'company';

    if (isGlobalRequest) {
      if (user.role !== 'super_admin' && !user.permissions?.includes('holidays.manage_global')) {
        const error = new Error('Hanya Super Administrator yang berwenang menambahkan hari libur nasional global.');
        error.statusCode = 403;
        throw error;
      }
      targetTenantId = 'GLOBAL';
      type = data.type || 'national';
    }

    // Check duplicate on same date & name for target tenant
    const existing = await holidayRepository.findByTenantAndDate(targetTenantId, cleanDate);
    if (existing && existing.name.toLowerCase() === data.name.trim().toLowerCase()) {
      const error = new Error(`Hari libur '${data.name}' pada tanggal ${cleanDate} sudah terdaftar.`);
      error.statusCode = 400;
      throw error;
    }

    let scopePrefix = 'GLOBAL';
    if (targetTenantId !== 'GLOBAL') {
      const tenant = await tenantRepository.findById(targetTenantId);
      scopePrefix = tenant?.code || extractTenantCode(tenant?.name || 'GEN');
    }

    const words = data.name.trim().split(/\s+/).filter(Boolean);
    const code = words.length > 1
      ? words.map((w) => w[0]).join('').slice(0, 8).toUpperCase()
      : data.name.trim().slice(0, 8).toUpperCase();

    const holidayId = data.id || generateHolidayId(scopePrefix, year, code);

    return holidayRepository.create({
      id: holidayId,
      tenantId: targetTenantId,
      name: data.name.trim(),
      date: cleanDate,
      type,
      description: data.description?.trim() || null,
    });
  }

  async updateHoliday(user, tenantId, id, data) {
    const existing = await this.getHolidayById(id);

    if (existing.isGlobal) {
      if (user.role !== 'super_admin' && !user.permissions?.includes('holidays.manage_global')) {
        const error = new Error('Hari libur nasional global hanya dapat diubah oleh Super Administrator platform.');
        error.statusCode = 403;
        throw error;
      }
    } else {
      if (existing.tenantId !== tenantId && user.role !== 'super_admin') {
        const error = new Error('Anda tidak memiliki wewenang untuk mengubah hari libur organisasi lain.');
        error.statusCode = 403;
        throw error;
      }
    }

    let cleanDate = existing.date;
    if (data.date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(data.date).slice(0, 10))) {
        const error = new Error('Format tanggal harus YYYY-MM-DD yang valid.');
        error.statusCode = 400;
        throw error;
      }
      cleanDate = String(data.date).slice(0, 10);
    }

    return holidayRepository.update(id, {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      date: cleanDate,
      type: data.type !== undefined ? data.type : existing.type,
      description: data.description !== undefined ? data.description.trim() : existing.description,
    });
  }

  async deleteHoliday(user, tenantId, id) {
    const existing = await this.getHolidayById(id);

    if (existing.isGlobal) {
      if (user.role !== 'super_admin' && !user.permissions?.includes('holidays.manage_global')) {
        const error = new Error('Hari libur nasional global hanya dapat dihapus oleh Super Administrator platform.');
        error.statusCode = 403;
        throw error;
      }
    } else {
      if (existing.tenantId !== tenantId && user.role !== 'super_admin') {
        const error = new Error('Anda tidak memiliki wewenang untuk menghapus hari libur organisasi lain.');
        error.statusCode = 403;
        throw error;
      }
    }

    await holidayRepository.delete(id);
    return { id, message: `Hari libur '${existing.name}' berhasil dinonaktifkan.` };
  }
}

export const holidayService = new HolidayService();

