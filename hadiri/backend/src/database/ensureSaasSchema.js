import { getPool } from './mysql.js';
import { SUBSCRIPTION_PLANS, syncPlansCache } from '../config/subscriptionPlans.js';

let isSchemaEnsured = false;
let ensurePromise = null;

/**
 * Ensures SaaS Governance tables (`subscription_plans`, `audit_logs`) and columns on `tenants` exist.
 * Non-destructive DDL only: never deletes data.
 */
export async function ensureSaasGovernanceSchema() {
  if (isSchemaEnsured) return;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    try {
      const pool = getPool();

      // 1. Ensure subscription_plans master table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS subscription_plans (
          id VARCHAR(50) PRIMARY KEY,
          code VARCHAR(50) NOT NULL UNIQUE,
          name VARCHAR(100) NOT NULL,
          name_id VARCHAR(100) NOT NULL,
          name_en VARCHAR(100) NOT NULL,
          description_id VARCHAR(255) NULL,
          description_en VARCHAR(255) NULL,
          monthly_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
          yearly_price DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
          currency VARCHAR(10) NOT NULL DEFAULT 'IDR',
          max_employees INT NOT NULL DEFAULT 50,
          max_locations INT NOT NULL DEFAULT 3,
          features_id JSON NULL,
          features_en JSON NULL,
          is_popular TINYINT(1) NOT NULL DEFAULT 0,
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          sort_order INT NOT NULL DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_sub_plan_code (code),
          INDEX idx_sub_plan_sort (sort_order)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // Populate default master plans only if not yet present (INSERT IGNORE preserves any DB edits)
      const defaultPlans = [
        {
          id: 'PLAN-FREE',
          ...SUBSCRIPTION_PLANS.free,
          descriptionId: 'Paket evaluasi untuk tim mikro dan uji coba awal',
          descriptionEn: 'Evaluation tier for micro teams and initial onboarding',
          isPopular: 0,
          sortOrder: 1,
        },
        {
          id: 'PLAN-STARTER',
          ...SUBSCRIPTION_PLANS.starter,
          descriptionId: 'Paket esensial untuk bisnis berkembang multi-cabang',
          descriptionEn: 'Essential plan for growing multi-branch businesses',
          isPopular: 0,
          sortOrder: 2,
        },
        {
          id: 'PLAN-PRO',
          ...SUBSCRIPTION_PLANS.pro,
          descriptionId: 'Paket korporat lengkap dengan shift 24/7, SPL & RBAC',
          descriptionEn: 'Complete corporate tier with 24/7 shifts, overtime & RBAC',
          isPopular: 1,
          sortOrder: 3,
        },
        {
          id: 'PLAN-ENTERPRISE',
          ...SUBSCRIPTION_PLANS.enterprise,
          descriptionId: 'Kapasitas tanpa batas dengan audit keamanan & SLA prioritas',
          descriptionEn: 'Unlimited capacity with security audit logs & priority SLA',
          isPopular: 0,
          sortOrder: 4,
        },
      ];

      for (const p of defaultPlans) {
        await pool.query(
          `INSERT IGNORE INTO subscription_plans (
            id, code, name, name_id, name_en, description_id, description_en,
            monthly_price, yearly_price, currency, max_employees, max_locations,
            features_id, features_en, is_popular, is_active, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'IDR', ?, ?, ?, ?, ?, 1, ?)`,
          [
            p.id,
            p.code,
            p.name,
            p.nameId,
            p.nameEn,
            p.descriptionId,
            p.descriptionEn,
            p.monthlyPrice,
            p.yearlyPrice,
            p.maxEmployees,
            p.maxLocations,
            JSON.stringify(p.featuresId || []),
            JSON.stringify(p.featuresEn || []),
            p.isPopular,
            p.sortOrder,
          ]
        );
      }

      // Sync in-memory cache with live DB rows
      try {
        const [planRows] = await pool.query(
          'SELECT * FROM subscription_plans WHERE is_active = 1 ORDER BY sort_order ASC'
        );
        if (planRows && planRows.length > 0) {
          syncPlansCache(planRows);
        }
      } catch (syncErr) {
        // Ignore cache sync warning
      }

      // 2. Ensure audit_logs table exists
      await pool.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id VARCHAR(64) PRIMARY KEY,
          tenant_id VARCHAR(50) NULL,
          actor_id VARCHAR(50) NULL,
          actor_name VARCHAR(255) NULL,
          actor_email VARCHAR(255) NULL,
          actor_role VARCHAR(50) NULL,
          action VARCHAR(100) NOT NULL,
          category VARCHAR(50) NOT NULL DEFAULT 'system',
          target_type VARCHAR(50) NULL,
          target_id VARCHAR(64) NULL,
          target_name VARCHAR(255) NULL,
          description TEXT NULL,
          metadata JSON NULL,
          ip_address VARCHAR(64) NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_audit_tenant (tenant_id),
          INDEX idx_audit_actor (actor_id),
          INDEX idx_audit_action (action),
          INDEX idx_audit_category (category),
          INDEX idx_audit_created (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);

      // 3. Ensure subscription columns on tenants table
      const tenantSubscriptionColumns = [
        { name: 'id_subscription_plan', type: "VARCHAR(50) NOT NULL DEFAULT 'PLAN-STARTER'" },
        { name: 'subscription_plan', type: "VARCHAR(50) NOT NULL DEFAULT 'starter'" },
        { name: 'subscription_status', type: "VARCHAR(50) NOT NULL DEFAULT 'active'" },
        { name: 'max_employees', type: 'INT NOT NULL DEFAULT 50' },
        { name: 'max_locations', type: 'INT NOT NULL DEFAULT 3' },
        { name: 'billing_cycle', type: "VARCHAR(30) NOT NULL DEFAULT 'monthly'" },
        { name: 'subscription_expires_at', type: 'DATE NULL DEFAULT NULL' },
      ];

      for (const col of tenantSubscriptionColumns) {
        try {
          const [cols] = await pool.query(`SHOW COLUMNS FROM tenants LIKE '${col.name}'`);
          if (cols.length === 0) {
            await pool.query(`ALTER TABLE tenants ADD COLUMN ${col.name} ${col.type}`);
          }
        } catch (colErr) {
          // Ignore if column already exists or concurrent alter
        }
      }

      // Sync id_subscription_plan on tenants with subscription_plans.id
      try {
        await pool.query(`
          UPDATE tenants t
          INNER JOIN subscription_plans sp ON LOWER(t.subscription_plan) = LOWER(sp.code)
          SET t.id_subscription_plan = sp.id
          WHERE t.id_subscription_plan IS NULL
             OR t.id_subscription_plan = ''
             OR t.id_subscription_plan != sp.id
        `);
      } catch (fkSyncErr) {
        // Ignore non-critical sync warning
      }

      // 4. Ensure telegram_id column on users table for AI Telegram Leave Orchestration
      try {
        const [tgCols] = await pool.query(`SHOW COLUMNS FROM users LIKE 'telegram_id'`);
        if (tgCols.length === 0) {
          await pool.query(`ALTER TABLE users ADD COLUMN telegram_id VARCHAR(100) NULL DEFAULT NULL AFTER email`);
          await pool.query(`ALTER TABLE users ADD INDEX idx_users_telegram (telegram_id)`);
        }
      } catch (tgColErr) {
        // Ignore if column/index already exists
      }

      isSchemaEnsured = true;
    } catch (err) {
      console.warn('[SaaS Schema] Non-critical warning ensuring SaaS schema:', err.message);
    } finally {
      ensurePromise = null;
    }
  })();

  return ensurePromise;
}
