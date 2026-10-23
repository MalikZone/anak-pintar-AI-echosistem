import { getPool } from '../database/mysql.js';
import { ensureSaasGovernanceSchema } from '../database/ensureSaasSchema.js';
import {
  SUBSCRIPTION_PLANS,
  mapSubscriptionPlanRow,
  syncPlansCache,
} from '../config/subscriptionPlans.js';

class SubscriptionPlanRepository {
  async findAll(includeInactive = false) {
    await ensureSaasGovernanceSchema();
    const pool = getPool();
    const sql = includeInactive
      ? 'SELECT * FROM subscription_plans ORDER BY sort_order ASC, created_at ASC'
      : 'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC, created_at ASC';
    const [rows] = await pool.query(sql);
    const mapped = rows.map(mapSubscriptionPlanRow);
    if (mapped.length > 0) {
      syncPlansCache(rows);
      return mapped;
    }
    return Object.values(SUBSCRIPTION_PLANS);
  }

  async findByCode(code) {
    if (!code) return null;
    await ensureSaasGovernanceSchema();
    const cleanCode = String(code).toLowerCase().trim();
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM subscription_plans WHERE LOWER(code) = ? LIMIT 1',
      [cleanCode]
    );
    if (rows.length === 0) {
      return SUBSCRIPTION_PLANS[cleanCode] || null;
    }
    const mapped = mapSubscriptionPlanRow(rows[0]);
    if (mapped) {
      SUBSCRIPTION_PLANS[mapped.code] = mapped;
    }
    return mapped;
  }

  async updateByCode(code, updates) {
    await ensureSaasGovernanceSchema();
    const cleanCode = String(code).toLowerCase().trim();
    const pool = getPool();

    const setClauses = [];
    const values = [];

    if (updates.name !== undefined) {
      setClauses.push('name = ?');
      values.push(String(updates.name).trim());
    }
    if (updates.nameId !== undefined || updates.name_id !== undefined) {
      setClauses.push('name_id = ?');
      values.push(String(updates.nameId ?? updates.name_id).trim());
    }
    if (updates.nameEn !== undefined || updates.name_en !== undefined) {
      setClauses.push('name_en = ?');
      values.push(String(updates.nameEn ?? updates.name_en).trim());
    }
    if (updates.descriptionId !== undefined || updates.description_id !== undefined) {
      setClauses.push('description_id = ?');
      values.push(String(updates.descriptionId ?? updates.description_id).trim());
    }
    if (updates.descriptionEn !== undefined || updates.description_en !== undefined) {
      setClauses.push('description_en = ?');
      values.push(String(updates.descriptionEn ?? updates.description_en).trim());
    }
    if (updates.monthlyPrice !== undefined || updates.monthly_price !== undefined) {
      setClauses.push('monthly_price = ?');
      values.push(Number(updates.monthlyPrice ?? updates.monthly_price ?? 0));
    }
    if (updates.yearlyPrice !== undefined || updates.yearly_price !== undefined) {
      setClauses.push('yearly_price = ?');
      values.push(Number(updates.yearlyPrice ?? updates.yearly_price ?? 0));
    }
    if (updates.maxEmployees !== undefined || updates.max_employees !== undefined) {
      setClauses.push('max_employees = ?');
      values.push(Number(updates.maxEmployees ?? updates.max_employees ?? 50));
    }
    if (updates.maxLocations !== undefined || updates.max_locations !== undefined) {
      setClauses.push('max_locations = ?');
      values.push(Number(updates.maxLocations ?? updates.max_locations ?? 3));
    }
    if (updates.featuresId !== undefined || updates.features_id !== undefined) {
      const fId = updates.featuresId ?? updates.features_id;
      setClauses.push('features_id = ?');
      values.push(JSON.stringify(Array.isArray(fId) ? fId : []));
    }
    if (updates.featuresEn !== undefined || updates.features_en !== undefined) {
      const fEn = updates.featuresEn ?? updates.features_en;
      setClauses.push('features_en = ?');
      values.push(JSON.stringify(Array.isArray(fEn) ? fEn : []));
    }
    if (updates.isPopular !== undefined || updates.is_popular !== undefined) {
      setClauses.push('is_popular = ?');
      values.push((updates.isPopular ?? updates.is_popular) ? 1 : 0);
    }

    if (setClauses.length > 0) {
      setClauses.push('updated_at = NOW()');
      values.push(cleanCode);
      await pool.query(
        `UPDATE subscription_plans SET ${setClauses.join(', ')} WHERE LOWER(code) = ?`,
        values
      );
    }

    await this.findAll(true);
    return this.findByCode(cleanCode);
  }
}

export const subscriptionPlanRepository = new SubscriptionPlanRepository();
export default subscriptionPlanRepository;

