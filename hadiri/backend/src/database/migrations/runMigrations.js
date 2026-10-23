import { ensureDatabase, getPool } from '../mysql.js';
import { ensureSaasGovernanceSchema } from '../ensureSaasSchema.js';

export async function runMigrations() {
  console.log('🚀 Running Hadirin MySQL Migrations...');
  
  await ensureDatabase();
  const pool = getPool();

  const tables = [
    // 1. Tenants Table
    `CREATE TABLE IF NOT EXISTS tenants (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      code VARCHAR(50) UNIQUE NOT NULL,
      tagline VARCHAR(255) NULL,
      industry VARCHAR(100) NULL,
      work_model VARCHAR(100) NULL,
      timezone VARCHAR(50) DEFAULT 'Asia/Jakarta',
      timezone_label VARCHAR(50) DEFAULT 'WIB (UTC+7)',
      hq_name VARCHAR(255) NULL,
      hq_address TEXT NULL,
      hq_latitude DECIMAL(10, 7) NULL,
      hq_longitude DECIMAL(10, 7) NULL,
      hq_radius_meters INT DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 2. Shifts Table
    `CREATE TABLE IF NOT EXISTS shifts (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(100) NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      is_cross_day BOOLEAN DEFAULT FALSE,
      grace_period_minutes INT DEFAULT 15,
      check_in_window_start VARCHAR(10) NULL,
      check_in_window_end VARCHAR(10) NULL,
      check_out_window_start VARCHAR(10) NULL,
      check_out_window_end VARCHAR(10) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_shifts_tenant (tenant_id),
      CONSTRAINT fk_shifts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 3. Users Table
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      telegram_id VARCHAR(100) NULL DEFAULT NULL,
      password VARCHAR(255) NOT NULL,
      role ENUM('super_admin', 'employee', 'leader', 'hr_admin') NOT NULL DEFAULT 'employee',
      position VARCHAR(100) NULL,
      department VARCHAR(100) NULL,
      leader_id VARCHAR(50) NULL,
      manager_id VARCHAR(50) NULL,
      shift_id VARCHAR(50) NULL,
      leave_annual INT DEFAULT 12,
      leave_sick INT DEFAULT 14,
      leave_remaining_annual INT DEFAULT 12,
      avatar TEXT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_users_tenant (tenant_id),
      INDEX idx_users_email (email),
      INDEX idx_users_telegram (telegram_id),
      INDEX idx_users_leader (leader_id),
      CONSTRAINT fk_users_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_users_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 4. Attendances Table
    `CREATE TABLE IF NOT EXISTS attendances (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      date DATE NOT NULL,
      shift_id VARCHAR(50) NULL,
      clock_in_time VARCHAR(20) NULL,
      clock_out_time VARCHAR(20) NULL,
      status VARCHAR(50) NOT NULL,
      is_cross_day BOOLEAN DEFAULT FALSE,
      location VARCHAR(255) NULL,
      latitude DECIMAL(10, 7) NULL,
      longitude DECIMAL(10, 7) NULL,
      selfie_url TEXT NULL,
      notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_att_tenant (tenant_id),
      INDEX idx_att_user_date (user_id, date),
      CONSTRAINT fk_att_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 5. Leaves Table
    `CREATE TABLE IF NOT EXISTS leaves (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      total_days INT NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending_leader',
      medical_doc_url TEXT NULL,
      approved_by_leader_id VARCHAR(50) NULL,
      leader_approved_at DATETIME NULL,
      leader_notes TEXT NULL,
      approved_by_hr_id VARCHAR(50) NULL,
      hr_approved_at DATETIME NULL,
      hr_notes TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_leaves_tenant (tenant_id),
      INDEX idx_leaves_user (user_id),
      INDEX idx_leaves_status (status),
      CONSTRAINT fk_leaves_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_leaves_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 6. Overtimes Table
    `CREATE TABLE IF NOT EXISTS overtimes (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL,
      spl_number VARCHAR(100) NOT NULL,
      date DATE NOT NULL,
      start_time VARCHAR(10) NOT NULL,
      end_time VARCHAR(10) NOT NULL,
      duration_hours DECIMAL(4, 2) NOT NULL,
      reason TEXT NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      approved_by_id VARCHAR(50) NULL,
      approved_at DATETIME NULL,
      rejection_reason TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_ot_tenant (tenant_id),
      INDEX idx_ot_user (user_id),
      CONSTRAINT fk_ot_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_ot_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 7. Rosters Table (Dynamic Shift Scheduling)
    `CREATE TABLE IF NOT EXISTS rosters (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      shift_id VARCHAR(50) NULL,
      date DATE NOT NULL,
      is_off_day BOOLEAN DEFAULT FALSE,
      notes VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_roster_tenant_date (tenant_id, date),
      INDEX idx_roster_user_date (user_id, date),
      UNIQUE KEY uq_roster_user_date (tenant_id, user_id, date),
      CONSTRAINT fk_roster_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_roster_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_roster_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 8. Shift Switches Table (Employee Shift Exchange / Change Requests)
    `CREATE TABLE IF NOT EXISTS shift_switches (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      target_date DATE NOT NULL,
      original_shift_id VARCHAR(50) NULL,
      requested_shift_id VARCHAR(50) NOT NULL,
      reason TEXT NOT NULL,
      status ENUM('pending_leader', 'approved', 'rejected') NOT NULL DEFAULT 'pending_leader',
      approved_by_id VARCHAR(50) NULL,
      approved_at DATETIME NULL,
      rejection_reason TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_switches_tenant (tenant_id),
      INDEX idx_switches_user (user_id),
      INDEX idx_switches_status (status),
      CONSTRAINT fk_switches_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_switches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_switches_req_shift FOREIGN KEY (requested_shift_id) REFERENCES shifts(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 9. Roles Table (Dynamic RBAC Per Tenant)
    `CREATE TABLE IF NOT EXISTS roles (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      name VARCHAR(100) NOT NULL,
      code VARCHAR(50) NOT NULL,
      description VARCHAR(255) NULL,
      is_system BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_roles_tenant (tenant_id),
      INDEX idx_roles_code (code),
      UNIQUE KEY uk_tenant_role_code (tenant_id, code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 10. Permissions Table (Global Platform Permission Registry)
    `CREATE TABLE IF NOT EXISTS permissions (
      id VARCHAR(64) PRIMARY KEY,
      module VARCHAR(50) NOT NULL,
      action VARCHAR(50) NOT NULL,
      code VARCHAR(100) UNIQUE NOT NULL,
      name_id VARCHAR(100) NOT NULL,
      name_en VARCHAR(100) NOT NULL,
      description VARCHAR(255) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_perm_module (module),
      INDEX idx_perm_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 11. Role Permissions Pivot Table
    `CREATE TABLE IF NOT EXISTS role_permissions (
      id VARCHAR(64) PRIMARY KEY,
      role_id VARCHAR(64) NOT NULL,
      permission_id VARCHAR(64) NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      UNIQUE KEY uk_role_perm (role_id, permission_id),
      INDEX idx_rp_role (role_id),
      INDEX idx_rp_perm (permission_id),
      CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
      CONSTRAINT fk_rp_perm FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 12. Departments Table (Master Departemen & Divisi)
    `CREATE TABLE IF NOT EXISTS departments (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(150) NOT NULL,
      description TEXT NULL,
      parent_id VARCHAR(64) NULL,
      manager_id VARCHAR(50) NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_dept_tenant (tenant_id),
      INDEX idx_dept_code (code),
      INDEX idx_dept_parent (parent_id),
      UNIQUE KEY uk_dept_tenant_code (tenant_id, code),
      CONSTRAINT fk_dept_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_dept_parent FOREIGN KEY (parent_id) REFERENCES departments(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 13. Positions Table (Master Jabatan & Level/Golongan)
    `CREATE TABLE IF NOT EXISTS positions (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      department_id VARCHAR(64) NULL,
      code VARCHAR(50) NOT NULL,
      title VARCHAR(150) NOT NULL,
      level ENUM('intern', 'staff', 'senior', 'lead', 'supervisor', 'manager', 'director', 'executive') NOT NULL DEFAULT 'staff',
      description TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_pos_tenant (tenant_id),
      INDEX idx_pos_dept (department_id),
      INDEX idx_pos_code (code),
      UNIQUE KEY uk_pos_tenant_code (tenant_id, code),
      CONSTRAINT fk_pos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_pos_dept FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 14. Locations Table (Master Lokasi Kerja & Geofencing Hub)
    `CREATE TABLE IF NOT EXISTS locations (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL,
      code VARCHAR(50) NOT NULL,
      name VARCHAR(150) NOT NULL,
      business_type VARCHAR(100) NOT NULL DEFAULT 'Kantor Pusat / Korporat',
      phone VARCHAR(50) NULL DEFAULT NULL,
      address TEXT NULL,
      latitude DECIMAL(10, 7) NOT NULL,
      longitude DECIMAL(10, 7) NOT NULL,
      radius_meters INT NOT NULL DEFAULT 100,
      is_headquarters BOOLEAN DEFAULT FALSE,
      is_active BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_loc_tenant (tenant_id),
      INDEX idx_loc_code (code),
      UNIQUE KEY uk_loc_tenant_code (tenant_id, code),
      CONSTRAINT fk_loc_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 15. Holidays Table (Master Hari Libur Nasional & Internal Perusahaan)
    `CREATE TABLE IF NOT EXISTS holidays (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL DEFAULT 'GLOBAL',
      name VARCHAR(150) NOT NULL,
      date DATE NOT NULL,
      type ENUM('national', 'company', 'collective_leave') NOT NULL DEFAULT 'national',
      description TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_holidays_tenant (tenant_id),
      INDEX idx_holidays_date (date),
      UNIQUE KEY uk_holiday_tenant_date_name (tenant_id, date, name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 16. Leave Types Table (Master Kebijakan Jenis Cuti)
    `CREATE TABLE IF NOT EXISTS leave_types (
      id VARCHAR(64) PRIMARY KEY,
      tenant_id VARCHAR(64) NOT NULL DEFAULT 'GLOBAL',
      code VARCHAR(50) NOT NULL,
      name VARCHAR(150) NOT NULL,
      default_quota INT NOT NULL DEFAULT 0,
      deduct_annual BOOLEAN DEFAULT FALSE,
      requires_attachment BOOLEAN DEFAULT FALSE,
      is_paid BOOLEAN DEFAULT TRUE,
      is_system BOOLEAN DEFAULT FALSE,
      description TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_lt_tenant (tenant_id),
      INDEX idx_lt_code (code),
      UNIQUE KEY uk_lt_tenant_code (tenant_id, code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 17. Attendance Corrections Table (Pengajuan Koreksi Presensi / Lupa Absen)
    `CREATE TABLE IF NOT EXISTS attendance_corrections (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      attendance_id VARCHAR(50) NULL,
      date DATE NOT NULL,
      correction_type ENUM('clock_in', 'clock_out', 'both') NOT NULL DEFAULT 'both',
      proposed_clock_in VARCHAR(20) NULL,
      proposed_clock_out VARCHAR(20) NULL,
      reason TEXT NOT NULL,
      attachment_url TEXT NULL,
      status ENUM('pending_leader', 'pending_hr', 'approved', 'rejected') NOT NULL DEFAULT 'pending_leader',
      approved_by_leader_id VARCHAR(50) NULL,
      leader_approved_at DATETIME NULL,
      leader_notes TEXT NULL,
      approved_by_hr_id VARCHAR(50) NULL,
      hr_approved_at DATETIME NULL,
      hr_notes TEXT NULL,
      rejection_reason TEXT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_att_corr_tenant (tenant_id),
      INDEX idx_att_corr_user_date (user_id, date),
      INDEX idx_att_corr_status (status),
      CONSTRAINT fk_att_corr_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_att_corr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,

    // 18. Notifications Table (In-App Interactive Notifications)
    `CREATE TABLE IF NOT EXISTS notifications (
      id VARCHAR(50) PRIMARY KEY,
      tenant_id VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'system',
      title VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      link VARCHAR(255) NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      read_at DATETIME NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      deleted_at DATETIME NULL DEFAULT NULL,
      INDEX idx_notif_tenant (tenant_id),
      INDEX idx_notif_user_read (user_id, is_read),
      INDEX idx_notif_user_created (user_id, created_at),
      CONSTRAINT fk_notif_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
      CONSTRAINT fk_notif_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
  ];

  for (const query of tables) {
    await pool.query(query);
  }

  // Ensure role column includes super_admin in case users table already existed
  try {
    await pool.query(
      `ALTER TABLE users MODIFY COLUMN role ENUM('super_admin', 'employee', 'leader', 'hr_admin') NOT NULL DEFAULT 'employee'`
    );
  } catch (err) {
    // Ignore if already applied or restricted
  }

  // Ensure users table has role_id column
  try {
    const [cols] = await pool.query(`SHOW COLUMNS FROM users LIKE 'role_id'`);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE users ADD COLUMN role_id VARCHAR(64) NULL AFTER role`);
      await pool.query(`ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL`);
      console.log('✓ Added role_id column with foreign key to users table');
    }
  } catch (err) {
    // Ignore if already present
  }

  // Ensure users table has department_id, position_id, location_id columns
  const userMasterColumns = [
    { name: 'department_id', type: 'VARCHAR(64) NULL', refTable: 'departments(id)' },
    { name: 'position_id', type: 'VARCHAR(64) NULL', refTable: 'positions(id)' },
    { name: 'location_id', type: 'VARCHAR(64) NULL', refTable: 'locations(id)' },
  ];
  for (const col of userMasterColumns) {
    try {
      const [cols] = await pool.query(`SHOW COLUMNS FROM users LIKE '${col.name}'`);
      if (cols.length === 0) {
        await pool.query(`ALTER TABLE users ADD COLUMN ${col.name} ${col.type}`);
        await pool.query(`ALTER TABLE users ADD CONSTRAINT fk_users_${col.name} FOREIGN KEY (${col.name}) REFERENCES ${col.refTable} ON DELETE SET NULL`);
        console.log(`✓ Added ${col.name} column with foreign key to users table`);
      }
    } catch (err) {
      // Ignore if already present
    }
  }

  // Ensure users table has telegram_id column for AI Telegram Group Leave Orchestration
  try {
    const [cols] = await pool.query(`SHOW COLUMNS FROM users LIKE 'telegram_id'`);
    if (cols.length === 0) {
      await pool.query(`ALTER TABLE users ADD COLUMN telegram_id VARCHAR(100) NULL DEFAULT NULL AFTER email`);
      await pool.query(`ALTER TABLE users ADD INDEX idx_users_telegram (telegram_id)`);
      console.log('✓ Added telegram_id column and index to users table');
    }
  } catch (err) {
    // Ignore if already present
  }

  // Ensure locations table has business_type, phone, is_active columns
  const locationMasterColumns = [
    { name: 'business_type', type: "VARCHAR(100) NOT NULL DEFAULT 'Kantor Pusat / Korporat'" },
    { name: 'phone', type: "VARCHAR(50) NULL DEFAULT NULL" },
    { name: 'is_active', type: "BOOLEAN NOT NULL DEFAULT TRUE" },
  ];
  for (const col of locationMasterColumns) {
    try {
      const [cols] = await pool.query(`SHOW COLUMNS FROM locations LIKE '${col.name}'`);
      if (cols.length === 0) {
        await pool.query(`ALTER TABLE locations ADD COLUMN ${col.name} ${col.type}`);
        console.log(`✓ Added ${col.name} column to locations table`);
      }
    } catch (err) {
      // Ignore if already present
    }
  }

  await ensureSaasGovernanceSchema();

  console.log('✅ All tables and SaaS governance columns successfully migrated!');
}

// Auto-run if executed directly via CLI
if (process.argv[1]?.endsWith('runMigrations.js')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}

