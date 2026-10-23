import { getPool } from '../mysql.js';
import { runMigrations } from '../migrations/runMigrations.js';
import { hashPassword } from '../../utils/passwordHelper.js';
import { ROLES } from '../../config/constants.js';
import {
  PERMISSIONS,
  SYSTEM_ROLE_IDS,
  SYSTEM_ROLE_PERMISSIONS,
} from '../../config/permissions.js';

export async function runSeedMysql(forceReset = false) {
  console.log('🌱 Starting Hadirin MySQL Seeding...');
  await runMigrations();

  const pool = getPool();
  const defaultHashedPassword = await hashPassword('password123');

  if (forceReset) {
    console.log('  -> Resetting MySQL test data for clean integration test run...');
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('TRUNCATE TABLE attendances');
    await pool.query('TRUNCATE TABLE leaves');
    await pool.query('TRUNCATE TABLE overtimes');
    await pool.query('TRUNCATE TABLE rosters');
    await pool.query('TRUNCATE TABLE departments');
    await pool.query('TRUNCATE TABLE positions');
    await pool.query('TRUNCATE TABLE locations');
    await pool.query('TRUNCATE TABLE holidays');
    await pool.query('TRUNCATE TABLE leave_types');
    await pool.query('DELETE FROM users WHERE id NOT LIKE "USR-ROOT-%"');
    await pool.query('DELETE FROM shifts WHERE tenant_id != "TNT-ROOT-000001"');
    await pool.query('DELETE FROM tenants WHERE id != "TNT-ROOT-000001"');
    await pool.query('DELETE FROM role_permissions WHERE role_id NOT LIKE "ROL-SYS-%"');
    await pool.query('DELETE FROM roles WHERE is_system = 0');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  }

  // --- 0. RBAC SYSTEM ROLES & PERMISSIONS SEEDING ---
  console.log('  -> Ensuring Granular Permissions & System Roles in MySQL...');

  // 0a. Permissions
  for (const perm of PERMISSIONS) {
    await pool.query(
      `INSERT INTO permissions (id, module, action, code, name_id, name_en, description, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)
       ON DUPLICATE KEY UPDATE name_id = VALUES(name_id), name_en = VALUES(name_en), description = VALUES(description), updated_at = NOW()`,
      [perm.id, perm.module, perm.action, perm.code, perm.name_id, perm.name_en, perm.description]
    );
  }

  // 0b. System Roles
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

  // 0c. Role Permissions Mapping
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

  // 0d. Ensure existing users have role_id populated
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.SUPER_ADMIN, ROLES.SUPER_ADMIN]
  );
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.HR_ADMIN, ROLES.HR_ADMIN]
  );
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.LEADER, ROLES.LEADER]
  );
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.EMPLOYEE, ROLES.EMPLOYEE]
  );
  console.log('  ✓ Permissions, Roles, and Role-Permissions successfully seeded & linked!');

  // Ensure Root Tenant & Super Admin User exist
  const [existingRootTenant] = await pool.query('SELECT id FROM tenants WHERE id = ?', ['TNT-ROOT-000001']);
  if (existingRootTenant.length === 0) {
    await pool.query(
      `INSERT INTO tenants (id, name, code, tagline, industry, work_model, timezone, timezone_label, hq_name, hq_address, hq_latitude, hq_longitude, hq_radius_meters, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
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
    console.log('  ✓ Root Tenant (TNT-ROOT-000001) ensured in MySQL');
  }

  const [existingSuperAdmin] = await pool.query('SELECT id FROM users WHERE email = ?', ['superadmin@hadirin.id']);
  if (existingSuperAdmin.length === 0) {
    await pool.query(
      `INSERT INTO users (id, tenant_id, name, email, password, role, role_id, position, department, leader_id, manager_id, shift_id, leave_annual, leave_sick, leave_remaining_annual, avatar, is_active, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), NULL)`,
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
    console.log('  ✓ Super Admin User (USR-ROOT-000001) ensured in MySQL');
  }

  // Check if standard sample data already exists
  const [existingTenants] = await pool.query('SELECT COUNT(*) as count FROM tenants WHERE id != "TNT-ROOT-000001" AND deleted_at IS NULL');
  if (existingTenants[0].count > 0) {
    console.log('ℹ️ MySQL Database already contains tenant data.');
    return;
  }

  // 1. TENANTS
  const tenants = [
    [
      'TENANT-LOGISTIK',
      'PT Hadirin Express & Logistik Nusantara',
      'LOGISTIK',
      'Fast & Reliable Supply Chain Operations',
      'Logistics & Warehousing',
      'Shifting 24/7 (Termasuk Shift Malam Lintas Hari)',
      'Asia/Jakarta',
      'WIB (UTC+7)',
      'Hub Pusat Cakung - Jakarta Timur',
      'Kawasan Industri Pulogadung & Cakung Kav. 12, Jakarta Timur',
      -6.1855,
      106.9244,
      150,
      new Date(),
      new Date(),
      null,
    ],
    [
      'TENANT-KONSULTAN',
      'PT Anak Pintar Solusi Teknologi',
      'KONSULTAN',
      'Modern Enterprise Software & AI Consulting',
      'Information Technology & Consulting',
      'Corporate Non-Shift (Senin - Jumat 08:30 - 17:30)',
      'Asia/Jakarta',
      'WIB (UTC+7)',
      'Kantor Pusat - Menara Batavia Lt. 18',
      'Jl. K.H. Mas Mansyur Kav. 126, Jakarta Pusat',
      -6.2088,
      106.8456,
      100,
      new Date(),
      new Date(),
      null,
    ],
  ];

  await pool.query(
    `INSERT INTO tenants (id, name, code, tagline, industry, work_model, timezone, timezone_label, hq_name, hq_address, hq_latitude, hq_longitude, hq_radius_meters, created_at, updated_at, deleted_at) VALUES ?`,
    [tenants]
  );
  console.log('  ✓ 2 Tenants seeded into MySQL');

  // 2. SHIFTS
  const shifts = [
    ['SHIFT-LOG-S1', 'TENANT-LOGISTIK', 'S1', 'Shift 1 Pagi (Operasional)', '07:00', '15:00', false, 15, '06:00', '08:30', '15:00', '18:00', new Date(), new Date(), null],
    ['SHIFT-LOG-S2', 'TENANT-LOGISTIK', 'S2', 'Shift 2 Siang / Sore', '15:00', '23:00', false, 15, '14:00', '16:30', '23:00', '01:30', new Date(), new Date(), null],
    ['SHIFT-LOG-S3', 'TENANT-LOGISTIK', 'S3', 'Shift 3 Malam Lintas Hari (Cross-Midnight)', '23:00', '07:00', true, 15, '21:30', '01:00', '06:00', '09:30', new Date(), new Date(), null],
    ['SHIFT-TECH-REG', 'TENANT-KONSULTAN', 'REG', 'Reguler Non-Shift Kantor', '08:30', '17:30', false, 15, '07:30', '10:00', '17:00', '21:00', new Date(), new Date(), null],
  ];

  await pool.query(
    `INSERT INTO shifts (id, tenant_id, code, name, start_time, end_time, is_cross_day, grace_period_minutes, check_in_window_start, check_in_window_end, check_out_window_start, check_out_window_end, created_at, updated_at, deleted_at) VALUES ?`,
    [shifts]
  );
  console.log('  ✓ 4 Shifts seeded into MySQL');

  // 3. USERS
  const users = [
    // --- TENANT 1: LOGISTIK ---
    ['USR-LOG-001', 'TENANT-LOGISTIK', 'Siti Rahma, S.Psi', 'hr.logistik@hadirin.id', defaultHashedPassword, ROLES.HR_ADMIN, 'HR & People Operations Lead', 'Human Resources', null, null, 'SHIFT-LOG-S1', 12, 14, 10, 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-002', 'TENANT-LOGISTIK', 'Ahmad Fauzi', 'manager.logistik@hadirin.id', defaultHashedPassword, ROLES.LEADER, 'Operations & Hub Manager', 'Logistics Operations', null, null, 'SHIFT-LOG-S1', 12, 14, 9, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-003', 'TENANT-LOGISTIK', 'Bambang Sugiharto', 'leader1.logistik@hadirin.id', defaultHashedPassword, ROLES.LEADER, 'Team Leader Hub A', 'Logistics Operations', 'USR-LOG-002', 'USR-LOG-002', 'SHIFT-LOG-S1', 12, 14, 11, 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-004', 'TENANT-LOGISTIK', 'Rudi Hartono', 'leader2.logistik@hadirin.id', defaultHashedPassword, ROLES.LEADER, 'Team Leader Hub B', 'Logistics Operations', 'USR-LOG-002', 'USR-LOG-002', 'SHIFT-LOG-S2', 12, 14, 8, 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-005', 'TENANT-LOGISTIK', 'Doni Setiawan', 'staff1.logistik@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Operator Shift Malam Lintas Hari', 'Logistics Operations', 'USR-LOG-003', 'USR-LOG-002', 'SHIFT-LOG-S3', 12, 14, 8, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-006', 'TENANT-LOGISTIK', 'Eko Prasetyo', 'staff2.logistik@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Staff Sortir Inbound', 'Logistics Operations', 'USR-LOG-003', 'USR-LOG-002', 'SHIFT-LOG-S1', 12, 14, 9, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-007', 'TENANT-LOGISTIK', 'Fajar Ramadhan', 'staff3.logistik@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Operator Forklift Shift 1', 'Logistics Operations', 'USR-LOG-003', 'USR-LOG-002', 'SHIFT-LOG-S1', 12, 14, 12, 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-008', 'TENANT-LOGISTIK', 'Gilang Pratama', 'staff4.logistik@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Driver Truk Antar-Hub', 'Fleet Operations', 'USR-LOG-004', 'USR-LOG-002', 'SHIFT-LOG-S2', 12, 14, 7, 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-009', 'TENANT-LOGISTIK', 'Hendra Wijaya', 'staff5.logistik@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Staff Quality Checker', 'Logistics Operations', 'USR-LOG-004', 'USR-LOG-002', 'SHIFT-LOG-S2', 12, 14, 10, 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-010', 'TENANT-LOGISTIK', 'Indah Permata', 'staff6.logistik@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Admin Dispatch & Manifest', 'Fleet Operations', 'USR-LOG-004', 'USR-LOG-002', 'SHIFT-LOG-S1', 12, 14, 11, 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-LOG-011', 'TENANT-LOGISTIK', 'Joko Susilo', 'staff7.logistik@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Staff Maintenance Hub', 'Facilities & Assets', 'USR-LOG-002', 'USR-LOG-002', 'SHIFT-LOG-S1', 12, 14, 10, 'https://images.unsplash.com/photo-1463453091185-61582044d556?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],

    // --- TENANT 2: KONSULTAN ---
    ['USR-TECH-001', 'TENANT-KONSULTAN', 'Dewi Lestari, M.M', 'hr.tech@hadirin.id', defaultHashedPassword, ROLES.HR_ADMIN, 'People & Culture Manager', 'People Operations', null, null, 'SHIFT-TECH-REG', 12, 14, 12, 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-002', 'TENANT-KONSULTAN', 'Aris Wibowo', 'lead.tech@hadirin.id', defaultHashedPassword, ROLES.LEADER, 'VP of Engineering', 'Technology', null, null, 'SHIFT-TECH-REG', 12, 14, 11, 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-003', 'TENANT-KONSULTAN', 'Maya Kusuma', 'lead.prod@hadirin.id', defaultHashedPassword, ROLES.LEADER, 'Head of Product Management', 'Product', null, null, 'SHIFT-TECH-REG', 12, 14, 10, 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-004', 'TENANT-KONSULTAN', 'Cahyo Utomo', 'eng1.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Senior Fullstack Engineer', 'Technology', 'USR-TECH-002', 'USR-TECH-002', 'SHIFT-TECH-REG', 12, 14, 9, 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-005', 'TENANT-KONSULTAN', 'Dina Safitri', 'eng2.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Frontend & Mobile Developer', 'Technology', 'USR-TECH-002', 'USR-TECH-002', 'SHIFT-TECH-REG', 12, 14, 8, 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-006', 'TENANT-KONSULTAN', 'Edward Halim', 'eng3.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'DevOps & Cloud Engineer', 'Technology', 'USR-TECH-002', 'USR-TECH-002', 'SHIFT-TECH-REG', 12, 14, 12, 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-007', 'TENANT-KONSULTAN', 'Fitri Handayani', 'prod1.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Product Manager Core SaaS', 'Product', 'USR-TECH-003', 'USR-TECH-003', 'SHIFT-TECH-REG', 12, 14, 10, 'https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-008', 'TENANT-KONSULTAN', 'Gunawan Tri', 'prod2.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'UI/UX & Design Systems Lead', 'Product', 'USR-TECH-003', 'USR-TECH-003', 'SHIFT-TECH-REG', 12, 14, 11, 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-009', 'TENANT-KONSULTAN', 'Hanny Chandra', 'biz1.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Enterprise Account Executive', 'Business & Sales', 'USR-TECH-001', 'USR-TECH-001', 'SHIFT-TECH-REG', 12, 14, 7, 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-010', 'TENANT-KONSULTAN', 'Irfan Hakim', 'biz2.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Solutions Architect & Pre-Sales', 'Business & Sales', 'USR-TECH-001', 'USR-TECH-001', 'SHIFT-TECH-REG', 12, 14, 10, 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
    ['USR-TECH-011', 'TENANT-KONSULTAN', 'Jessica Tan', 'fin.tech@hadirin.id', defaultHashedPassword, ROLES.EMPLOYEE, 'Corporate Finance & Tax Specialist', 'Finance', 'USR-TECH-001', 'USR-TECH-001', 'SHIFT-TECH-REG', 12, 14, 9, 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200', true, new Date(), new Date(), null],
  ];

  await pool.query(
    `INSERT INTO users (id, tenant_id, name, email, password, role, position, department, leader_id, manager_id, shift_id, leave_annual, leave_sick, leave_remaining_annual, avatar, is_active, created_at, updated_at, deleted_at) VALUES ?`,
    [users]
  );
  console.log('  ✓ 22 Users seeded into MySQL');

  // Ensure all seeded users have role_id populated
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.SUPER_ADMIN, ROLES.SUPER_ADMIN]
  );
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.HR_ADMIN, ROLES.HR_ADMIN]
  );
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.LEADER, ROLES.LEADER]
  );
  await pool.query(
    `UPDATE users SET role_id = ? WHERE role = ? AND (role_id IS NULL OR role_id = '')`,
    [SYSTEM_ROLE_IDS.EMPLOYEE, ROLES.EMPLOYEE]
  );
  console.log('  ✓ Users linked to role_id in MySQL');

  // 4. ROSTERS
  const today = new Date();
  const sampleRosters = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(today.getTime() + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const isOff = i === 5 || i === 6;
    sampleRosters.push([
      `RST-LOG-${100000 + i}`,
      'TENANT-LOGISTIK',
      'USR-LOG-005',
      isOff ? null : 'SHIFT-LOG-S3',
      dateStr,
      isOff,
      isOff ? 'Libur Roster Mingguan' : 'Jadwal Reguler Shift 3 Malam',
      new Date(),
      new Date(),
      null,
    ]);
  }
  await pool.query(
    `INSERT INTO rosters (id, tenant_id, user_id, shift_id, date, is_off_day, notes, created_at, updated_at, deleted_at) VALUES ?`,
    [sampleRosters]
  );
  console.log('  ✓ 7 Sample Rosters seeded into MySQL');

  // 5. MASTER DATA: DEPARTMENTS, POSITIONS, LOCATIONS, HOLIDAYS, LEAVE TYPES
  console.log('  -> Seeding Master Data (Departments, Positions, Locations, Holidays, Leave Types)...');

  // 5a. Departments
  const sampleDepartments = [
    ['DPT-LOG-OPS', 'TENANT-LOGISTIK', 'OPS', 'Operasional & Armada', 'Divisi operasional pengiriman & armada armada darat', null, 'USR-LOG-002', new Date(), new Date(), null],
    ['DPT-LOG-WAREHOUSE', 'TENANT-LOGISTIK', 'WHS', 'Gudang & Logistik', 'Divisi pergudangan dan pemilahan paket', null, 'USR-LOG-002', new Date(), new Date(), null],
    ['DPT-LOG-HR', 'TENANT-LOGISTIK', 'HRD', 'Human Resources', 'Pengelolaan SDM dan kepegawaian', null, 'USR-LOG-001', new Date(), new Date(), null],
    ['DPT-KONS-TECH', 'TENANT-KONSULTAN', 'TECH', 'Teknologi & Konsultansi', 'Divisi delivery konsultansi sistem & enterprise cloud', null, 'USR-KONS-002', new Date(), new Date(), null],
  ];
  await pool.query(
    `INSERT INTO departments (id, tenant_id, code, name, description, parent_id, manager_id, created_at, updated_at, deleted_at) VALUES ?
     ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), updated_at = NOW()`,
    [sampleDepartments]
  );
  console.log('  ✓ 4 Sample Departments seeded');

  // 5b. Positions
  const samplePositions = [
    ['POS-LOG-MGR', 'TENANT-LOGISTIK', 'DPT-LOG-OPS', 'OPS_MGR', 'Operations Manager', 'manager', 'Penanggung jawab operasional harian cabang', new Date(), new Date(), null],
    ['POS-LOG-SPV', 'TENANT-LOGISTIK', 'DPT-LOG-OPS', 'FIELD_SPV', 'Field Operations Supervisor', 'supervisor', 'Koordinator armada lapangan dan shift', new Date(), new Date(), null],
    ['POS-LOG-DISP', 'TENANT-LOGISTIK', 'DPT-LOG-OPS', 'DISPATCHER', 'Fleet Dispatcher', 'staff', 'Staf penugasan jadwal armada dan rute kirim', new Date(), new Date(), null],
    ['POS-LOG-DRV', 'TENANT-LOGISTIK', 'DPT-LOG-OPS', 'DRIVER', 'Pengemudi Ekspedisi', 'staff', 'Driver armada logistik antar-kota', new Date(), new Date(), null],
    ['POS-KONS-CNS', 'TENANT-KONSULTAN', 'DPT-KONS-TECH', 'SR_CONSULTANT', 'Senior Cloud Consultant', 'senior', 'Konsultan arsitektur cloud enterprise', new Date(), new Date(), null],
  ];
  await pool.query(
    `INSERT INTO positions (id, tenant_id, department_id, code, title, level, description, created_at, updated_at, deleted_at) VALUES ?
     ON DUPLICATE KEY UPDATE title = VALUES(title), level = VALUES(level), updated_at = NOW()`,
    [samplePositions]
  );
  console.log('  ✓ 5 Sample Positions seeded');

  // 5c. Locations
  const sampleLocations = [
    ['LOC-LOG-HQ', 'TENANT-LOGISTIK', 'HQ_PRIOK', 'Headquarters Tanjung Priok', 'Jl. Pelabuhan Raya No. 12, Jakarta Utara', -6.1154000, 106.8856000, 150, 1, new Date(), new Date(), null],
    ['LOC-LOG-HUB1', 'TENANT-LOGISTIK', 'HUB_CAKUNG', 'Hub Distribusi Cakung DC', 'Kawasan Industri Pulogadung Cakung, Jakarta Timur', -6.1783000, 106.9452000, 100, 0, new Date(), new Date(), null],
    ['LOC-KONS-HQ', 'TENANT-KONSULTAN', 'HQ_SUDIRMAN', 'Sudirman Tower Office', 'Gedung Bursa Efek Indonesia Tower 2, Jakarta Selatan', -6.2146000, 106.8197000, 100, 1, new Date(), new Date(), null],
  ];
  await pool.query(
    `INSERT INTO locations (id, tenant_id, code, name, address, latitude, longitude, radius_meters, is_headquarters, created_at, updated_at, deleted_at) VALUES ?
     ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address), radius_meters = VALUES(radius_meters), updated_at = NOW()`,
    [sampleLocations]
  );
  console.log('  ✓ 3 Sample Locations seeded');

  // 5d. Holidays (Global National + Company Specific)
  const sampleHolidays = [
    ['HLD-GLOBAL-2026-NEWYEAR', 'GLOBAL', 'Tahun Baru Masehi 2026', '2026-01-01', 'national', 'Libur Nasional Tahun Baru Masehi', new Date(), new Date(), null],
    ['HLD-GLOBAL-2026-IDULFITRI', 'GLOBAL', 'Hari Raya Idul Fitri 1447 H', '2026-03-20', 'national', 'Hari Raya Idul Fitri 1447 Hijriah', new Date(), new Date(), null],
    ['HLD-GLOBAL-2026-INDEPENDENCE', 'GLOBAL', 'Hari Kemerdekaan RI Ke-81', '2026-08-17', 'national', 'HUT Proklamasi Kemerdekaan Republik Indonesia', new Date(), new Date(), null],
    ['HLD-LOG-2026-HUT', 'TENANT-LOGISTIK', 'HUT Nusantara Logistik Ke-10', '2026-05-15', 'company', 'Ulang Tahun Perusahaan Nusantara Logistik', new Date(), new Date(), null],
  ];
  await pool.query(
    `INSERT INTO holidays (id, tenant_id, name, date, type, description, created_at, updated_at, deleted_at) VALUES ?
     ON DUPLICATE KEY UPDATE name = VALUES(name), type = VALUES(type), updated_at = NOW()`,
    [sampleHolidays]
  );
  console.log('  ✓ 4 Sample Holidays seeded (3 Global + 1 Company)');

  // 5e. Leave Types (Global Standards + Company Custom)
  const sampleLeaveTypes = [
    ['LVT-GLOBAL-ANNUAL', 'GLOBAL', 'ANNUAL', 'Cuti Tahunan', 12, 0, 0, 1, 1, 'Hak cuti tahunan berbayar karyawan', new Date(), new Date(), null],
    ['LVT-GLOBAL-SICK', 'GLOBAL', 'SICK', 'Izin Sakit', 14, 0, 1, 1, 1, 'Izin sakit dengan surat keterangan dokter', new Date(), new Date(), null],
    ['LVT-LOG-MARRIAGE', 'TENANT-LOGISTIK', 'MARRIAGE', 'Cuti Menikah', 3, 0, 0, 1, 0, 'Cuti khusus pernikahan pekerja 3 hari kerja', new Date(), new Date(), null],
  ];
  await pool.query(
    `INSERT INTO leave_types (id, tenant_id, code, name, default_quota, deduct_annual, requires_attachment, is_paid, is_system, description, created_at, updated_at, deleted_at) VALUES ?
     ON DUPLICATE KEY UPDATE name = VALUES(name), default_quota = VALUES(default_quota), updated_at = NOW()`,
    [sampleLeaveTypes]
  );
  console.log('  ✓ 3 Sample Leave Types seeded (2 System + 1 Custom)');

  console.log('🎉 Seeding to MySQL completed successfully!');
}

if (process.argv[1]?.endsWith('seedMysql.js')) {
  runSeedMysql()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}

