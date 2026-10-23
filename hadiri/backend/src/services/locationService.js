import { locationRepository } from '../repositories/LocationRepository.js';
import { tenantRepository } from '../repositories/TenantRepository.js';
import { generateLocationId, extractTenantCode } from '../utils/idGenerator.js';
import { AppError } from '../utils/appError.js';
import { getPlanConfig } from '../config/subscriptionPlans.js';
import { auditLogService } from './auditLogService.js';

class LocationService {
  async getLocations(tenantId) {
    return locationRepository.findByTenant(tenantId);
  }

  async getLocationById(tenantId, id) {
    const loc = await locationRepository.findById(tenantId, id);
    if (!loc) {
      const error = new Error('Lokasi kerja tidak ditemukan.');
      error.statusCode = 404;
      throw error;
    }
    return loc;
  }

  async createLocation(tenantId, data, actor = null) {
    if (!data.name || !data.name.trim()) {
      const error = new Error('Nama lokasi kerja / hub wajib diisi.');
      error.statusCode = 400;
      throw error;
    }

    const tenant = await tenantRepository.findById(tenantId);
    // Enforce Location Quota unless internal HQ creation or Root Tenant
    if (tenant && tenant.id !== 'TNT-ROOT-000001' && !data.skipQuotaCheck) {
      const subStatus = (tenant.subscriptionStatus || 'active').toLowerCase();
      if (subStatus === 'suspended' || subStatus === 'expired') {
        throw new AppError('tenant.subscription_suspended', 403);
      }

      const maxLocations = Number(tenant.maxLocations || 2);
      const activeLocations = await locationRepository.findByTenant(tenantId);
      if (activeLocations.length >= maxLocations) {
        const planConfig = getPlanConfig(tenant.subscriptionPlan);
        throw new AppError('tenant.location_quota_reached', 403, {
          max: maxLocations,
          plan: planConfig.nameId,
        });
      }
    }

    if (data.latitude === undefined || data.latitude === null || isNaN(Number(data.latitude))) {
      const error = new Error('Titik koordinat Latitude wajib diisi dengan angka valid.');
      error.statusCode = 400;
      throw error;
    }

    if (data.longitude === undefined || data.longitude === null || isNaN(Number(data.longitude))) {
      const error = new Error('Titik koordinat Longitude wajib diisi dengan angka valid.');
      error.statusCode = 400;
      throw error;
    }

    const radiusMeters = Number(data.radiusMeters || 100);
    if (radiusMeters < 10 || radiusMeters > 5000) {
      const error = new Error('Radius geofencing harus berada antara 10 sampai 5000 meter.');
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

    const existing = await locationRepository.findByCode(tenantId, cleanCode);
    if (existing) {
      const error = new Error(`Kode lokasi '${cleanCode}' sudah digunakan di organisasi ini.`);
      error.statusCode = 400;
      throw error;
    }

    if (data.isHeadquarters) {
      await locationRepository.clearOtherHeadquarters(tenantId);
    }

    const tenantCode = tenant?.code || extractTenantCode(tenant?.name || 'GEN');
    const locationId = data.id || generateLocationId(tenantCode, cleanCode);

    const created = await locationRepository.create({
      id: locationId,
      tenantId,
      code: cleanCode,
      name: cleanName,
      businessType: data.businessType?.trim() || 'Kantor Pusat / Korporat',
      phone: data.phone?.trim() || null,
      address: data.address?.trim() || null,
      latitude: Number(data.latitude),
      longitude: Number(data.longitude),
      radiusMeters,
      isHeadquarters: !!data.isHeadquarters,
      isActive: data.isActive !== undefined ? !!data.isActive : true,
    });

    if (created?.isHeadquarters) {
      try {
        await tenantRepository.update(tenantId, {
          headquarters: {
            name: created.name,
            address: created.address,
            latitude: created.latitude,
            longitude: created.longitude,
            radiusMeters: created.radiusMeters,
          },
        });
      } catch (err) {
        console.warn('[LocationService] Failed to sync tenant headquarters on location create:', err.message);
      }
    }

    await auditLogService.log({
      tenantId,
      actorId: actor?.id || null,
      actorName: actor?.name || 'HR Admin',
      actorRole: actor?.role || 'hr_admin',
      action: 'LOCATION_CREATE',
      category: 'organization',
      targetType: 'location',
      targetId: created.id,
      targetName: created.name,
      description: `Menambahkan lokasi kerja / cabang baru '${created.name}' (${created.code}).`,
    });

    return created;
  }

  async updateLocation(tenantId, id, data) {
    const existing = await this.getLocationById(tenantId, id);

    if (data.radiusMeters !== undefined) {
      const radius = Number(data.radiusMeters);
      if (radius < 10 || radius > 5000) {
        const error = new Error('Radius geofencing harus berada antara 10 sampai 5000 meter.');
        error.statusCode = 400;
        throw error;
      }
    }

    if (data.isHeadquarters) {
      await locationRepository.clearOtherHeadquarters(tenantId, id);
    }

    const updated = await locationRepository.update(tenantId, id, {
      name: data.name !== undefined ? data.name.trim() : existing.name,
      businessType: data.businessType !== undefined ? data.businessType.trim() : existing.businessType,
      phone: data.phone !== undefined ? (data.phone ? data.phone.trim() : null) : existing.phone,
      address: data.address !== undefined ? data.address.trim() : existing.address,
      latitude: data.latitude !== undefined ? Number(data.latitude) : existing.latitude,
      longitude: data.longitude !== undefined ? Number(data.longitude) : existing.longitude,
      radiusMeters: data.radiusMeters !== undefined ? Number(data.radiusMeters) : existing.radiusMeters,
      isHeadquarters: data.isHeadquarters !== undefined ? !!data.isHeadquarters : existing.isHeadquarters,
      isActive: data.isActive !== undefined ? !!data.isActive : existing.isActive,
    });

    if (updated?.isHeadquarters) {
      try {
        await tenantRepository.update(tenantId, {
          headquarters: {
            name: updated.name,
            address: updated.address,
            latitude: updated.latitude,
            longitude: updated.longitude,
            radiusMeters: updated.radiusMeters,
          },
        });
      } catch (err) {
        console.warn('[LocationService] Failed to sync tenant headquarters on location update:', err.message);
      }
    }

    return updated;
  }

  async deleteLocation(tenantId, id) {
    const existing = await this.getLocationById(tenantId, id);

    if (existing.isHeadquarters) {
      const allBranches = await locationRepository.findByTenant(tenantId);
      if (allBranches.length <= 1) {
        const error = new Error(`Cabang Kantor Pusat (HQ) '${existing.name}' tidak dapat dihapus karena merupakan satu-satunya cabang aktif organisasi.`);
        error.statusCode = 400;
        throw error;
      }
      const error = new Error(`Cabang '${existing.name}' berstatus sebagai Kantor Pusat (HQ). Silakan tetapkan cabang lain sebagai Kantor Pusat terlebih dahulu sebelum menghapus cabang ini.`);
      error.statusCode = 400;
      throw error;
    }

    const memberCount = await locationRepository.countMembers(id);
    if (memberCount > 0) {
      const error = new Error(`Tidak dapat menghapus cabang '${existing.name}' karena masih memiliki ${memberCount} karyawan yang ditugaskan ke cabang ini.`);
      error.statusCode = 400;
      throw error;
    }

    await locationRepository.delete(tenantId, id);
    return { id, message: `Lokasi kerja '${existing.name}' berhasil dinonaktifkan.` };
  }
}

export const locationService = new LocationService();

