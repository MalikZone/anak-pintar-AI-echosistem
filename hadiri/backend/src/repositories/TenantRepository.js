import { BaseRepository } from './BaseRepository.js';
import { getPool } from '../database/mysql.js';
import { ensureSaasGovernanceSchema } from '../database/ensureSaasSchema.js';
import { getPlanConfig } from '../config/subscriptionPlans.js';

function mapTenantRow(row) {
  if (!row) return null;
  const rawPlan = String(row.subscription_plan || row.subscriptionPlan || 'starter')
    .toLowerCase()
    .trim();
  const planConfig = getPlanConfig(rawPlan);
  const planId =
    row.id_subscription_plan ||
    row.idSubscriptionPlan ||
    planConfig.id ||
    `PLAN-${planConfig.code.toUpperCase()}`;

  const expiresStr = row.subscription_expires_at
    ? typeof row.subscription_expires_at === 'string'
      ? row.subscription_expires_at.slice(0, 10)
      : new Date(row.subscription_expires_at).toISOString().slice(0, 10)
    : null;

  return {
    id: row.id,
    name: row.name,
    code: row.code,
    tagline: row.tagline || '',
    industry: row.industry || 'Other Industry',
    workModel: row.work_model || row.workModel || 'Standard',
    work_model: row.work_model || row.workModel || 'Standard',
    timezone: row.timezone || 'Asia/Jakarta',
    timezoneLabel: row.timezone_label || row.timezoneLabel || 'WIB (UTC+7)',
    timezone_label: row.timezone_label || row.timezoneLabel || 'WIB (UTC+7)',
    idSubscriptionPlan: planId,
    id_subscription_plan: planId,
    subscriptionPlan: planConfig.code,
    subscription_plan: planConfig.code,
    subscriptionStatus: row.subscription_status || row.subscriptionStatus || 'active',
    subscription_status: row.subscription_status || row.subscriptionStatus || 'active',
    maxEmployees: Number(row.max_employees ?? row.maxEmployees ?? planConfig.maxEmployees ?? 50),
    max_employees: Number(row.max_employees ?? row.maxEmployees ?? planConfig.maxEmployees ?? 50),
    maxLocations: Number(row.max_locations ?? row.maxLocations ?? planConfig.maxLocations ?? 3),
    max_locations: Number(row.max_locations ?? row.maxLocations ?? planConfig.maxLocations ?? 3),
    billingCycle: row.billing_cycle || row.billingCycle || 'monthly',
    billing_cycle: row.billing_cycle || row.billingCycle || 'monthly',
    subscriptionExpiresAt: expiresStr,
    subscription_expires_at: expiresStr,
    headquarters: {
      name: row.hq_name || 'Kantor Pusat',
      address: row.hq_address || '',
      latitude: Number(row.hq_latitude ?? -6.2088),
      longitude: Number(row.hq_longitude ?? 106.8456),
      radiusMeters: Number(row.hq_radius_meters ?? 100),
    },
    hq_name: row.hq_name || null,
    hq_address: row.hq_address || null,
    hq_latitude: row.hq_latitude != null ? Number(row.hq_latitude) : null,
    hq_longitude: row.hq_longitude != null ? Number(row.hq_longitude) : null,
    hq_radius_meters: row.hq_radius_meters != null ? Number(row.hq_radius_meters) : null,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt,
    deletedAt: row.deleted_at || row.deletedAt || null,
  };
}

class TenantRepository extends BaseRepository {
  constructor() {
    super('tenants');
  }

  async getAll(includeDeleted = false) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    const sql = includeDeleted
      ? 'SELECT * FROM tenants ORDER BY created_at ASC'
      : 'SELECT * FROM tenants WHERE deleted_at IS NULL ORDER BY created_at ASC';
    const [rows] = await pool.query(sql);
    return rows.map(mapTenantRow);
  }

  async findById(id, includeDeleted = false) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    const sql = includeDeleted
      ? 'SELECT * FROM tenants WHERE id = ?'
      : 'SELECT * FROM tenants WHERE id = ? AND deleted_at IS NULL';
    const [rows] = await pool.query(sql, [id]);
    if (rows.length === 0) return null;
    return mapTenantRow(rows[0]);
  }

  async findByCode(code) {
    if (!code) return null;
    await ensureSaasGovernanceSchema();
    const cleanCode = code.toUpperCase().trim();
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM tenants WHERE UPPER(code) = ? AND deleted_at IS NULL',
      [cleanCode]
    );
    if (rows.length === 0) return null;
    return mapTenantRow(rows[0]);
  }

  async create(data) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    const hq = data.headquarters || {};
    const planCode = data.subscriptionPlan || data.subscription_plan || 'starter';
    const planConfig = getPlanConfig(planCode);
    const planId =
      data.idSubscriptionPlan ||
      data.id_subscription_plan ||
      planConfig.id ||
      `PLAN-${planConfig.code.toUpperCase()}`;

    await pool.query(
      `INSERT INTO tenants (
        id, name, code, tagline, industry, work_model, timezone, timezone_label,
        id_subscription_plan, subscription_plan, subscription_status, max_employees, max_locations, billing_cycle, subscription_expires_at,
        hq_name, hq_address, hq_latitude, hq_longitude, hq_radius_meters,
        created_at, updated_at, deleted_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
      [
        data.id,
        data.name,
        data.code,
        data.tagline || null,
        data.industry || null,
        data.workModel || data.work_model || null,
        data.timezone || 'Asia/Jakarta',
        data.timezoneLabel || data.timezone_label || 'WIB (UTC+7)',
        planId,
        planConfig.code,
        data.subscriptionStatus || data.subscription_status || 'active',
        data.maxEmployees ?? data.max_employees ?? planConfig.maxEmployees ?? 50,
        data.maxLocations ?? data.max_locations ?? planConfig.maxLocations ?? 3,
        data.billingCycle || data.billing_cycle || 'monthly',
        data.subscriptionExpiresAt || data.subscription_expires_at || null,
        hq.name || data.hq_name || null,
        hq.address || data.hq_address || null,
        hq.latitude ?? data.hq_latitude ?? null,
        hq.longitude ?? data.hq_longitude ?? null,
        hq.radiusMeters ?? data.hq_radius_meters ?? 100,
      ]
    );
    return this.findById(data.id);
  }

  async update(id, updates) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    const setClauses = [];
    const values = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(updates.name);
    }
    if (updates.tagline !== undefined) {
      setClauses.push('tagline = ?');
      values.push(updates.tagline);
    }
    if (updates.industry !== undefined) {
      setClauses.push('industry = ?');
      values.push(updates.industry);
    }
    if (updates.workModel !== undefined || updates.work_model !== undefined) {
      setClauses.push('work_model = ?');
      values.push(updates.workModel ?? updates.work_model);
    }
    if (updates.timezone !== undefined) {
      setClauses.push('timezone = ?');
      values.push(updates.timezone);
    }
    if (updates.timezoneLabel !== undefined || updates.timezone_label !== undefined) {
      setClauses.push('timezone_label = ?');
      values.push(updates.timezoneLabel ?? updates.timezone_label);
    }
    if (updates.subscriptionPlan !== undefined || updates.subscription_plan !== undefined) {
      const pCode = updates.subscriptionPlan ?? updates.subscription_plan;
      const pCfg = getPlanConfig(pCode);
      setClauses.push('subscription_plan = ?');
      values.push(pCfg.code);
      setClauses.push('id_subscription_plan = ?');
      values.push(
        updates.idSubscriptionPlan ||
          updates.id_subscription_plan ||
          pCfg.id ||
          `PLAN-${pCfg.code.toUpperCase()}`
      );
    } else if (
      updates.idSubscriptionPlan !== undefined ||
      updates.id_subscription_plan !== undefined
    ) {
      setClauses.push('id_subscription_plan = ?');
      values.push(updates.idSubscriptionPlan ?? updates.id_subscription_plan);
    }
    if (updates.subscriptionStatus !== undefined || updates.subscription_status !== undefined) {
      setClauses.push('subscription_status = ?');
      values.push(updates.subscriptionStatus ?? updates.subscription_status);
    }
    if (updates.maxEmployees !== undefined || updates.max_employees !== undefined) {
      setClauses.push('max_employees = ?');
      values.push(Number(updates.maxEmployees ?? updates.max_employees));
    }
    if (updates.maxLocations !== undefined || updates.max_locations !== undefined) {
      setClauses.push('max_locations = ?');
      values.push(Number(updates.maxLocations ?? updates.max_locations));
    }
    if (updates.billingCycle !== undefined || updates.billing_cycle !== undefined) {
      setClauses.push('billing_cycle = ?');
      values.push(updates.billingCycle ?? updates.billing_cycle);
    }
    if (updates.subscriptionExpiresAt !== undefined || updates.subscription_expires_at !== undefined) {
      setClauses.push('subscription_expires_at = ?');
      values.push((updates.subscriptionExpiresAt ?? updates.subscription_expires_at) || null);
    }
    if (updates.headquarters) {
      const hq = updates.headquarters;
      if (hq.name !== undefined) {
        setClauses.push('hq_name = ?');
        values.push(hq.name);
      }
      if (hq.address !== undefined) {
        setClauses.push('hq_address = ?');
        values.push(hq.address);
      }
      if (hq.latitude !== undefined) {
        setClauses.push('hq_latitude = ?');
        values.push(hq.latitude);
      }
      if (hq.longitude !== undefined) {
        setClauses.push('hq_longitude = ?');
        values.push(hq.longitude);
      }
      if (hq.radiusMeters !== undefined) {
        setClauses.push('hq_radius_meters = ?');
        values.push(hq.radiusMeters);
      }
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(id);
      await pool.query(
        `UPDATE tenants SET ${setClauses.join(', ')} WHERE id = ?`,
        values
      );
    }

    return this.findById(id);
  }

  async delete(id) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    await pool.query(
      'UPDATE tenants SET deleted_at = NOW(), updated_at = NOW() WHERE id = ?',
      [id]
    );
    return true;
  }
}

export const tenantRepository = new TenantRepository();
