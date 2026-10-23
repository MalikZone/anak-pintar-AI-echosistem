import { tenantRepository } from '../repositories/TenantRepository.js';
import { userRepository } from '../repositories/UserRepository.js';
import { shiftRepository } from '../repositories/ShiftRepository.js';
import { locationRepository } from '../repositories/LocationRepository.js';
import { subscriptionPlanRepository } from '../repositories/SubscriptionPlanRepository.js';
import { getPool } from '../database/mysql.js';
import { SUBSCRIPTION_PLANS, getPlanConfig } from '../config/subscriptionPlans.js';
import { auditLogService } from './auditLogService.js';
import { AppError } from '../utils/appError.js';
import { generateTenantId, generateLocationId, extractTenantCode } from '../utils/idGenerator.js';

class TenantService {
  async getSubscriptionPlans() {
    return subscriptionPlanRepository.findAll(false);
  }

  async updateSubscriptionPlanCatalog(code, data, actor = null) {
    const existing = await subscriptionPlanRepository.findByCode(code);
    if (!existing) {
      throw new AppError('Paket langganan tidak ditemukan.', 404);
    }

    const updatedPlan = await subscriptionPlanRepository.updateByCode(code, {
      name: data.name,
      nameId: data.nameId,
      nameEn: data.nameEn,
      descriptionId: data.descriptionId,
      descriptionEn: data.descriptionEn,
      monthlyPrice: data.monthlyPrice,
      yearlyPrice: data.yearlyPrice,
      maxEmployees: data.maxEmployees,
      maxLocations: data.maxLocations,
      featuresId: data.featuresId,
      featuresEn: data.featuresEn,
      isPopular: data.isPopular,
    });

    await auditLogService.log({
      tenantId: 'TNT-ROOT-000001',
      actor,
      action: 'PLAN_CATALOG_UPDATE',
      category: 'subscription',
      targetType: 'subscription_plan',
      targetId: updatedPlan.id,
      targetName: updatedPlan.nameId || updatedPlan.name,
      description: `Memperbarui spesifikasi master paket "${updatedPlan.nameId}" (${updatedPlan.code.toUpperCase()}): Rp ${Number(updatedPlan.monthlyPrice).toLocaleString('id-ID')}/bln, Maks ${updatedPlan.maxEmployees} Staf, Maks ${updatedPlan.maxLocations} Cabang.`,
      metadata: updatedPlan,
    });

    return updatedPlan;
  }

  async getAllTenants({ includeDeleted = false } = {}) {
    await subscriptionPlanRepository.findAll(false);
    const [tenants, users, shifts, locations] = await Promise.all([
      tenantRepository.getAll(includeDeleted),
      userRepository.getAll(false),
      shiftRepository.getAll(false),
      locationRepository.findAllActive(),
    ]);

    const userCountMap = new Map();
    const adminMap = new Map();
    users.forEach((u) => {
      const current = userCountMap.get(u.tenantId) || 0;
      userCountMap.set(u.tenantId, current + 1);
      if (u.role === 'hr_admin') {
        const list = adminMap.get(u.tenantId) || [];
        list.push({ id: u.id, name: u.name, email: u.email, position: u.position });
        adminMap.set(u.tenantId, list);
      }
    });

    const shiftCountMap = new Map();
    shifts.forEach((s) => {
      const current = shiftCountMap.get(s.tenantId) || 0;
      shiftCountMap.set(s.tenantId, current + 1);
    });

    const locationCountMap = new Map();
    locations.forEach((loc) => {
      const current = locationCountMap.get(loc.tenantId) || 0;
      locationCountMap.set(loc.tenantId, current + 1);
    });

    return tenants.map((tenant) => {
      const employeeCount = userCountMap.get(tenant.id) || 0;
      const shiftCount = shiftCountMap.get(tenant.id) || 0;
      const locationCount = locationCountMap.get(tenant.id) || 0;
      const planDetails = getPlanConfig(tenant.subscriptionPlan);
      const maxEmp = tenant.maxEmployees || planDetails.maxEmployees || 50;
      const maxLoc = tenant.maxLocations || planDetails.maxLocations || 3;

      return {
        ...tenant,
        employeeCount,
        shiftCount,
        locationCount,
        planDetails,
        hrAdmins: adminMap.get(tenant.id) || [],
        employeeQuotaPercent: Math.min(100, Math.round((employeeCount / Math.max(1, maxEmp)) * 100)),
        locationQuotaPercent: Math.min(100, Math.round((locationCount / Math.max(1, maxLoc)) * 100)),
      };
    });
  }

  async getTenantById(id) {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      throw new AppError('tenant.not_found_or_inactive', 404);
    }

    const [employees, shifts, locations] = await Promise.all([
      userRepository.findByTenant(id, false),
      shiftRepository.findByTenant(id),
      locationRepository.findByTenant(id),
    ]);

    const planDetails = getPlanConfig(tenant.subscriptionPlan);

    return {
      ...tenant,
      employeeCount: employees.length,
      shiftCount: shifts.length,
      locationCount: locations.length,
      planDetails,
      shifts,
    };
  }

  async createTenant(data, actor = null) {
    const {
      name,
      code,
      tagline = '',
      industry = 'Technology & Services',
      workModel = 'Corporate Standard (08:30 - 17:30)',
      timezone = 'Asia/Jakarta',
      timezoneLabel = 'WIB (UTC+7)',
      subscriptionPlan = 'starter',
      subscriptionStatus = 'active',
      maxEmployees,
      maxLocations,
      billingCycle = 'monthly',
      subscriptionExpiresAt = null,
      headquarters,
    } = data;

    if (!name || !name.trim()) {
      throw new AppError('tenant.required_fields', 400);
    }

    const allTenants = await tenantRepository.getAll(true);
    const existingCodes = allTenants.map((t) => t.code?.toUpperCase()).filter(Boolean);

    let cleanCode = code ? String(code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) : '';
    if (!cleanCode) {
      cleanCode = extractTenantCode(name, existingCodes);
    }

    const existing = await tenantRepository.findByCode(cleanCode);
    if (existing) {
      throw new AppError('tenant.code_exists', 400, { code: cleanCode });
    }

    const generatedId = generateTenantId(cleanCode);
    const planConfig = getPlanConfig(subscriptionPlan);

    const defaultHq = {
      name: headquarters?.name || 'Kantor Pusat',
      address: headquarters?.address || 'Jakarta, Indonesia',
      latitude: headquarters?.latitude || -6.2088,
      longitude: headquarters?.longitude || 106.8456,
      radiusMeters: headquarters?.radiusMeters || 100,
    };

    const newTenant = await tenantRepository.create({
      id: generatedId,
      name: name.trim(),
      code: cleanCode,
      tagline: tagline.trim(),
      industry: industry.trim(),
      workModel: workModel.trim(),
      timezone: timezone.trim(),
      timezoneLabel: timezoneLabel.trim(),
      subscriptionPlan: planConfig.code,
      subscriptionStatus,
      maxEmployees: maxEmployees != null ? Number(maxEmployees) : planConfig.maxEmployees,
      maxLocations: maxLocations != null ? Number(maxLocations) : planConfig.maxLocations,
      billingCycle,
      subscriptionExpiresAt: subscriptionExpiresAt || null,
      headquarters: defaultHq,
      hq_name: defaultHq.name,
      hq_address: defaultHq.address,
      hq_latitude: defaultHq.latitude,
      hq_longitude: defaultHq.longitude,
      hq_radius_meters: defaultHq.radiusMeters,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Automatically create initial Headquarters branch for this tenant
    try {
      const locId = generateLocationId(cleanCode, 'HQ');
      await locationRepository.create({
        id: locId,
        tenantId: generatedId,
        code: 'HQ',
        name: defaultHq.name,
        businessType: 'Kantor Pusat / Korporat',
        phone: null,
        address: defaultHq.address,
        latitude: defaultHq.latitude,
        longitude: defaultHq.longitude,
        radiusMeters: defaultHq.radiusMeters,
        isHeadquarters: true,
        isActive: true,
      });
    } catch (locErr) {
      console.warn('[TenantService] Failed to auto-create HQ branch:', locErr.message);
    }

    await auditLogService.log({
      tenantId: generatedId,
      actor,
      action: 'TENANT_CREATE',
      category: 'tenant',
      targetType: 'tenant',
      targetId: generatedId,
      targetName: newTenant.name,
      description: `Mendaftarkan organisasi tenant baru "${newTenant.name}" (${generatedId}) dengan paket ${planConfig.name}.`,
      metadata: { plan: planConfig.code, code: cleanCode },
    });

    return newTenant;
  }

  async updateTenant(id, data, actor = null) {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      throw new AppError('tenant.not_found_or_inactive', 404);
    }

    const updates = {};
    if (data.name !== undefined) updates.name = data.name.trim();
    if (data.tagline !== undefined) updates.tagline = data.tagline.trim();
    if (data.industry !== undefined) updates.industry = data.industry.trim();
    if (data.workModel !== undefined) updates.workModel = data.workModel.trim();
    if (data.timezone !== undefined) updates.timezone = data.timezone.trim();
    if (data.timezoneLabel !== undefined) updates.timezoneLabel = data.timezoneLabel.trim();

    if (data.subscriptionPlan !== undefined) updates.subscriptionPlan = data.subscriptionPlan;
    if (data.subscriptionStatus !== undefined) updates.subscriptionStatus = data.subscriptionStatus;
    if (data.maxEmployees !== undefined) updates.maxEmployees = Number(data.maxEmployees);
    if (data.maxLocations !== undefined) updates.maxLocations = Number(data.maxLocations);
    if (data.billingCycle !== undefined) updates.billingCycle = data.billingCycle;
    if (data.subscriptionExpiresAt !== undefined) updates.subscriptionExpiresAt = data.subscriptionExpiresAt || null;

    if (data.headquarters) {
      updates.headquarters = {
        ...tenant.headquarters,
        ...data.headquarters,
      };
      if (data.headquarters.name) updates.hq_name = data.headquarters.name;
      if (data.headquarters.address) updates.hq_address = data.headquarters.address;
      if (data.headquarters.latitude !== undefined) updates.hq_latitude = data.headquarters.latitude;
      if (data.headquarters.longitude !== undefined) updates.hq_longitude = data.headquarters.longitude;
      if (data.headquarters.radiusMeters !== undefined) updates.hq_radius_meters = data.headquarters.radiusMeters;

      try {
        const locations = await locationRepository.findByTenant(id);
        const hqLoc = locations.find((l) => l.isHeadquarters);
        if (hqLoc) {
          await locationRepository.update(id, hqLoc.id, {
            name: data.headquarters.name || hqLoc.name,
            address: data.headquarters.address || hqLoc.address,
            latitude: data.headquarters.latitude !== undefined ? Number(data.headquarters.latitude) : hqLoc.latitude,
            longitude: data.headquarters.longitude !== undefined ? Number(data.headquarters.longitude) : hqLoc.longitude,
            radiusMeters: data.headquarters.radiusMeters !== undefined ? Number(data.headquarters.radiusMeters) : hqLoc.radiusMeters,
          });
        }
      } catch (locErr) {
        console.warn('[TenantService] Failed to sync HQ location on tenant update:', locErr.message);
      }
    }

    const updated = await tenantRepository.update(id, updates);

    await auditLogService.log({
      tenantId: id,
      actor,
      action: 'TENANT_UPDATE',
      category: 'tenant',
      targetType: 'tenant',
      targetId: id,
      targetName: updated.name,
      description: `Memperbarui profil dan konfigurasi organisasi "${updated.name}".`,
    });

    return updated;
  }

  async updateTenantSubscription(id, data, actor = null) {
    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      throw new AppError('tenant.not_found_or_inactive', 404);
    }

    const planCode =
      data.subscriptionPlan ||
      data.idSubscriptionPlan ||
      data.id_subscription_plan ||
      tenant.subscriptionPlan ||
      'starter';
    const planConfig = getPlanConfig(planCode);

    const updates = {
      idSubscriptionPlan: planConfig.id || `PLAN-${planConfig.code.toUpperCase()}`,
      subscriptionPlan: planConfig.code,
      subscriptionStatus: data.subscriptionStatus || tenant.subscriptionStatus || 'active',
      maxEmployees:
        data.maxEmployees !== undefined ? Number(data.maxEmployees) : planConfig.maxEmployees,
      maxLocations:
        data.maxLocations !== undefined ? Number(data.maxLocations) : planConfig.maxLocations,
      billingCycle: data.billingCycle || tenant.billingCycle || 'monthly',
      subscriptionExpiresAt:
        data.subscriptionExpiresAt !== undefined
          ? data.subscriptionExpiresAt || null
          : tenant.subscriptionExpiresAt,
    };

    const updated = await tenantRepository.update(id, updates);

    await auditLogService.log({
      tenantId: id,
      actor,
      action: 'TENANT_SUBSCRIPTION_UPDATE',
      category: 'subscription',
      targetType: 'tenant',
      targetId: id,
      targetName: updated.name,
      description: `Memperbarui paket langganan "${updated.name}" menjadi ${planConfig.name.toUpperCase()} (Maks: ${updates.maxEmployees} Staf, ${updates.maxLocations} Cabang, Status: ${updates.subscriptionStatus}).`,
      metadata: updates,
    });

    return updated;
  }

  async softDeleteTenant(id, actor = null) {
    if (id === 'TNT-ROOT-000001') {
      throw new AppError('tenant.cannot_delete_root', 400);
    }

    const tenant = await tenantRepository.findById(id);
    if (!tenant) {
      throw new AppError('tenant.not_found_or_inactive', 404);
    }

    await tenantRepository.delete(id);

    await auditLogService.log({
      tenantId: id,
      actor,
      action: 'TENANT_DEACTIVATE',
      category: 'tenant',
      targetType: 'tenant',
      targetId: id,
      targetName: tenant.name,
      description: `Menonaktifkan organisasi tenant "${tenant.name}" (${id}).`,
    });

    return tenant;
  }

  async getPlatformOverview() {
    const startPing = Date.now();
    const pool = getPool();
    await pool.query('SELECT 1');
    const dbLatencyMs = Date.now() - startPing;

    const todayWib = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });

    const [dbPlans, tenantsWithMeta, allUsers, [todayAttRows], [allTimeAttCountRows]] = await Promise.all([
      subscriptionPlanRepository.findAll(false),
      this.getAllTenants({ includeDeleted: false }),
      userRepository.getAll(false),
      pool.query(
        `SELECT status, clock_in_time, clock_out_time, tenant_id FROM attendances WHERE (date = ? OR (clock_out_time IS NULL AND clock_in_time IS NOT NULL)) AND deleted_at IS NULL`,
        [todayWib]
      ),
      pool.query(`SELECT COUNT(*) AS total FROM attendances WHERE deleted_at IS NULL`),
    ]);

    const totalAttendanceRecords = Number(allTimeAttCountRows?.[0]?.total || 0);
    const plansByCode = {};
    (dbPlans || []).forEach((p) => {
      plansByCode[p.code] = p;
    });

    // Calculate revenue & plan breakdown directly from subscription_plans table
    let estimatedMrrIdr = 0;
    const planStats = {};
    (dbPlans || Object.values(SUBSCRIPTION_PLANS)).forEach((p) => {
      planStats[p.code] = { ...p, count: 0, mrr: 0 };
    });

    const enrichedTenants = tenantsWithMeta.map((t) => {
      const pCode = String(t.subscriptionPlan || t.subscription_plan || 'starter')
        .toLowerCase()
        .trim();
      const sStatus = String(t.subscriptionStatus || t.subscription_status || 'active')
        .toLowerCase()
        .trim();
      const pConf = plansByCode[pCode] || getPlanConfig(pCode);
      const isActiveSub = sStatus === 'active' || sStatus === 'trial';
      const monthlyContribution = isActiveSub
        ? (t.billingCycle === 'yearly' ? Math.round(pConf.yearlyPrice / 12) : pConf.monthlyPrice)
        : 0;

      if (planStats[pConf.code]) {
        planStats[pConf.code].count += 1;
        planStats[pConf.code].mrr += monthlyContribution;
      }
      estimatedMrrIdr += monthlyContribution;

      const todayTenantAtt = (todayAttRows || []).filter((a) => a.tenant_id === t.id).length;

      return {
        ...t,
        subscriptionPlan: pConf.code,
        subscriptionStatus: sStatus,
        planDetails: pConf,
        mrrContribution: monthlyContribution,
        todayAttendanceCount: todayTenantAtt,
      };
    });

    const activeTenants = enrichedTenants.filter(
      (t) => t.subscriptionStatus === 'active' || t.subscriptionStatus === 'trial'
    ).length;
    const commercialTenants = enrichedTenants.filter((t) => t.id !== 'TNT-ROOT-000001').length;
    const suspendedTenants = enrichedTenants.length - activeTenants;

    const hrAdminCount = allUsers.filter((u) => u.role === 'hr_admin').length;
    const leaderCount = allUsers.filter((u) => u.role === 'leader').length;
    const employeeCount = allUsers.filter((u) => u.role === 'employee').length;
    const superAdminCount = allUsers.filter((u) => u.role === 'super_admin').length;

    const totalLocations = enrichedTenants.reduce((acc, t) => acc + (t.locationCount || 0), 0);
    const totalShifts = enrichedTenants.reduce((acc, t) => acc + (t.shiftCount || 0), 0);

    const todayAttendances = (todayAttRows || []).length;
    const todayLate = (todayAttRows || []).filter((a) => a.status === 'late').length;
    const todayClockedOut = (todayAttRows || []).filter((a) => a.status === 'clocked_out' || a.clock_out_time).length;
    const todayPresent = Math.max(0, todayAttendances - todayLate);
    const rssMb = Math.round(process.memoryUsage().rss / 1024 / 1024);
    const heapUsedMb = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);

    const metricsPayload = {
      totalTenants: enrichedTenants.length,
      activeTenants,
      commercialTenants,
      suspendedTenants,
      totalUsers: allUsers.length,
      totalActiveEmployees: allUsers.length,
      hrAdminCount,
      leaderCount,
      employeeCount,
      superAdminCount,
      totalLocations,
      totalShifts,
      todayAttendances,
      todayAttendanceTotal: todayAttendances,
      todayPresent,
      todayPresentCount: todayPresent,
      todayLate,
      todayLateCount: todayLate,
      todayClockedOut,
      totalAttendanceRecords,
      estimatedMrr: estimatedMrrIdr,
      estimatedArr: estimatedMrrIdr * 12,
      estimatedMrrIdr,
      estimatedArrIdr: estimatedMrrIdr * 12,
    };

    return {
      metrics: metricsPayload,
      summary: metricsPayload,
      planDistribution: Object.values(planStats),
      catalog: plansByCode,
      plansCatalog: dbPlans,
      tenants: enrichedTenants,
      systemHealth: {
        status: 'healthy',
        dbLatencyMs,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryMb: rssMb,
        memory: {
          rssMb,
          heapUsedMb,
        },
        nodeVersion: process.version,
        timestamp: new Date().toISOString(),
      },
    };
  }
}

export const tenantService = new TenantService();
