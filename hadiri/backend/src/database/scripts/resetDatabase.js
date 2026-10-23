import { getPool, ensureDatabase, testConnection } from '../mysql.js';
import { runMigrations } from '../migrations/runMigrations.js';
import { hashPassword } from '../../utils/passwordHelper.js';
import { ROLES } from '../../config/constants.js';
import {
  PERMISSIONS,
  SYSTEM_ROLE_IDS,
  SYSTEM_ROLE_PERMISSIONS,
} from '../../config/permissions.js';

export async function resetDatabaseToSuperAdminOnly() {
  console.log('🧹 [Hadirin Reset] Memulai Hard Delete seluruh data kecuali Super Admin...\n');

  const defaultHashedPassword = await hashPassword('password123');

  const defaultGlobalHolidays = [
    ['HLD-GLOBAL-2026-NEWYEAR', 'GLOBAL', 'Tahun Baru Masehi 2026', '2026-01-01', 'national', 'Libur Nasional Tahun Baru Masehi'],
    ['HLD-GLOBAL-2026-IDULFITRI', 'GLOBAL', 'Hari Raya Idul Fitri 1447 H', '2026-03-20', 'national', 'Hari Raya Idul Fitri 1447 Hijriah'],
    ['HLD-GLOBAL-2026-INDEPENDENCE', 'GLOBAL', 'Hari Kemerdekaan RI Ke-81', '2026-08-17', 'national', 'HUT Proklamasi Kemerdekaan Republik Indonesia'],
  ];

  const defaultGlobalLeaveTypes = [
    ['LVT-GLOBAL-ANNUAL', 'GLOBAL', 'ANNUAL', 'Cuti Tahunan', 12, 0, 0, 1, 1, 'Hak cuti tahunan berbayar karyawan'],
    ['LVT-GLOBAL-SICK', 'GLOBAL', 'SICK', 'Izin Sakit', 14, 0, 1, 1, 1, 'Izin sakit dengan surat keterangan dokter'],
  ];

  let mysqlAvailable = false;
  try {
    mysqlAvailable = await testConnection();
  } catch {
    mysqlAvailable = false;
  }

  if (mysqlAvailable) {
    await ensureDatabase();
    await runMigrations();
    const pool = getPool();

    // --- 1. HARD DELETE MYSQL TABLES ---
    console.log('  1. Menghapus data transaksional dan master data operasional di MySQL...');
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');

    // Truncate Transactional & Shift Scheduling tables
    await pool.query('TRUNCATE TABLE attendances');
  await pool.query('TRUNCATE TABLE leaves');
  await pool.query('TRUNCATE TABLE overtimes');
  await pool.query('TRUNCATE TABLE rosters');
  await pool.query('TRUNCATE TABLE shift_switches');

  // Truncate Tenant-Specific Master Data tables
  await pool.query('TRUNCATE TABLE departments');
  await pool.query('TRUNCATE TABLE positions');
  await pool.query('TRUNCATE TABLE locations');

  // Shifts: remove all tenant shifts
  await pool.query('DELETE FROM shifts WHERE tenant_id != "TNT-ROOT-000001"');

  // Holidays: keep only GLOBAL national holidays, remove all company holidays
  await pool.query('DELETE FROM holidays WHERE tenant_id != "GLOBAL"');

  // Leave Types: keep only GLOBAL system templates, remove all tenant custom leaves
  await pool.query('DELETE FROM leave_types WHERE tenant_id != "GLOBAL"');

  // Custom Roles & Permissions: keep only system roles
  await pool.query('DELETE FROM role_permissions WHERE role_id NOT LIKE "ROL-SYS-%"');
  await pool.query('DELETE FROM roles WHERE is_system = 0');

  // Users: remove all users EXCEPT Super Admin (USR-ROOT-000001)
  await pool.query('DELETE FROM users WHERE id != "USR-ROOT-000001"');

  // Tenants: remove all tenants EXCEPT Root Governance Tenant (TNT-ROOT-000001)
  await pool.query('DELETE FROM tenants WHERE id != "TNT-ROOT-000001"');

  await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  console.log('  ✓ Seluruh tabel berhasil dibersihkan.');

  // --- 2. ENSURE RBAC PERMISSIONS & SYSTEM ROLES ---
  console.log('  2. Memverifikasi katalog izin dan system role standar...');
  for (const perm of PERMISSIONS) {
    await pool.query(
      `INSERT INTO permissions (id, module, action, code, name_id, name_en, description, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
       ON DUPLICATE KEY UPDATE name_id = VALUES(name_id), name_en = VALUES(name_en), description = VALUES(description), updated_at = NOW()`,
      [perm.id, perm.module, perm.action, perm.code, perm.name_id, perm.name_en, perm.description]
    );
  }

  const systemRoles = [
    [
      SYSTEM_ROLE_IDS.SUPER_ADMIN,
      'GLOBAL',
      'Super Administrator',
      'SUPER_ADMIN',
      'Universal platform administrator with unrestricted access',
      true,
    ],
    [
      SYSTEM_ROLE_IDS.HR_ADMIN,
      'GLOBAL',
      'HR Administrator',
      'HR_ADMIN',
      'Full HR and operational management access within tenant',
      true,
    ],
    [
      SYSTEM_ROLE_IDS.LEADER,
      'GLOBAL',
      'Team Leader / Supervisor',
      'LEADER',
      'Operational team management and 1st stage approval access',
      true,
    ],
    [
      SYSTEM_ROLE_IDS.EMPLOYEE,
      'GLOBAL',
      'Staff Karyawan',
      'EMPLOYEE',
      'Standard Employee Self-Service (ESS) access',
      true,
    ],
  ];

  for (const [id, tenantId, name, code, description, isSystem] of systemRoles) {
    await pool.query(
      `INSERT INTO roles (id, tenant_id, name, code, description, is_system, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
       ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
      [id, tenantId, name, code, description, isSystem]
    );
  }

  const [allPermRows] = await pool.query('SELECT id, code FROM permissions WHERE deleted_at IS NULL');
  const permCodeToId = new Map(allPermRows.map((r) => [r.code, r.id]));

  for (const [roleId, permCodes] of Object.entries(SYSTEM_ROLE_PERMISSIONS)) {
    for (const code of permCodes) {
      const permId = permCodeToId.get(code);
      if (permId) {
        await pool.query(
          `INSERT INTO role_permissions (id, role_id, permission_id, created_at, updated_at, deleted_at)
           VALUES (?, ?, ?, NOW(), NOW(), NULL)
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [`RP-${roleId}-${permId}`, roleId, permId]
        );
      }
    }
  }

  // --- 3. ENSURE ROOT TENANT & SUPER ADMIN USER ---
  console.log('  3. Memastikan entitas Root Tenant & Akun Super Admin aktif...');
  await pool.query(
    `INSERT INTO tenants (
       id, name, code, tagline, industry, work_model, timezone, timezone_label,
       hq_name, hq_address, hq_latitude, hq_longitude, hq_radius_meters, created_at, updated_at, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
     ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = NOW()`,
    [
      'TNT-ROOT-000001',
      'Hadirin Cloud Platform Governance',
      'ROOT',
      'Global SaaS Management & Platform Administration',
      'Cloud & SaaS Infrastructure',
      'Global 24/7 Monitoring',
      'Asia/Jakarta',
      'WIB (UTC+7)',
      'Hadirin HQ Data Center',
      'Jl. Sudirman Kav. 1, Jakarta Pusat',
      -6.2,
      106.8166,
      500,
    ]
  );

  await pool.query(
    `INSERT INTO users (
       id, tenant_id, name, email, password, role, role_id, position, department,
       leader_id, manager_id, shift_id, leave_annual, leave_sick, leave_remaining_annual,
       avatar, is_active, created_at, updated_at, deleted_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
     ON DUPLICATE KEY UPDATE
       password = VALUES(password),
       role = VALUES(role),
       role_id = VALUES(role_id),
       deleted_at = NULL,
       is_active = TRUE,
       updated_at = NOW()`,
    [
      'USR-ROOT-000001',
      'TNT-ROOT-000001',
      'Super Administrator',
      'superadmin@hadirin.id',
      defaultHashedPassword,
      ROLES.SUPER_ADMIN,
      SYSTEM_ROLE_IDS.SUPER_ADMIN,
      'Principal Platform Architect & Global Admin',
      'Platform Governance',
      null,
      null,
      null,
      99,
      99,
      99,
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      true,
    ]
  );

    // --- 4. ENSURE GLOBAL NATIONAL HOLIDAYS & LEAVE TEMPLATES ---
    console.log('  4. Memastikan kalender libur nasional global & template cuti sistem di MySQL...');
    for (const [id, tId, name, date, type, desc] of defaultGlobalHolidays) {
      await pool.query(
        `INSERT INTO holidays (id, tenant_id, name, date, type, description, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
         ON DUPLICATE KEY UPDATE name = VALUES(name), date = VALUES(date), updated_at = NOW()`,
        [id, tId, name, date, type, desc]
      );
    }

    for (const [id, tId, code, name, quota, deduct, attach, paid, system, desc] of defaultGlobalLeaveTypes) {
      await pool.query(
        `INSERT INTO leave_types (id, tenant_id, code, name, default_quota, deduct_annual, requires_attachment, is_paid, is_system, description, created_at, updated_at, deleted_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
         ON DUPLICATE KEY UPDATE name = VALUES(name), default_quota = VALUES(default_quota), updated_at = NOW()`,
        [id, tId, code, name, quota, deduct, attach, paid, system, desc]
      );
    }
  } else {
    console.log('  ℹ MySQL tidak terhubung / tidak aktif. Melewati pembersihan tabel MySQL.');
  }



  console.log('\n✨ [DATABASE BERHASIL DI-RESET KE STATUS BERSIH / CLEAN SLATE] ✨');
  console.log('========================================================================');
  console.log('📌 KREDENSIAL LOGIN SUPER ADMIN:');
  console.log('   Email    : superadmin@hadirin.id');
  console.log('   Password : password123');
  console.log('   Role     : super_admin');
  console.log('   Tenant   : TNT-ROOT-000001 (Hadirin Cloud Platform Governance)');
  console.log('========================================================================');
  console.log('🎯 Sekarang sistem siap diuji secara manual dari Super Admin untuk input tenant & admin tenant baru!');
}

if (process.argv[1]?.endsWith('resetDatabase.js')) {
  resetDatabaseToSuperAdminOnly()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Gagal melakukan reset database:', err);
      process.exit(1);
    });
}

