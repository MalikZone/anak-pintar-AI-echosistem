# Walkthrough: Perombakan Dynamic Role & Permission Matrix (Granular RBAC) & Lokasi Menu

Sistem Hadirin telah berhasil dirombak total dari sistem hak akses statis berbasis role ENUM menjadi **Dynamic Role & Permission Matrix (Granular RBAC)**. Seluruh endpoint backend, skema database MySQL, middleware hak akses, dan antarmuka manajemen hak akses di frontend telah aktif dan teruji 100%.

---

## 📌 Lokasi Menu "Peran & Hak Akses" di Sistem

Menu **Peran & Hak Akses** terletak di **Sidebar Navigasi Portal Admin / SaaS**:

1. **Jalur Menu:**
   - Masuk sebagai akun Administrator / HR Admin.
   - Di daftar menu sebelah kiri, di bawah menu **Direktori Karyawan** dan di atas **Manajemen Tenant (SaaS)**, Anda akan melihat menu dengan ikon perisai centang:
     > 🛡️ **Peran & Hak Akses** (`/admin/roles`)
2. **Kriteria Akses Menu:**
   - Menu ini otomatis tampil untuk akun berwenang (**Super Administrator**, **HR Admin**, atau pengguna mana pun yang memiliki izin `roles.view`).
   - Route URL langsung: `http://localhost:5173/admin/roles`

---

## 1. Ringkasan Arsitektur Dynamic RBAC

| Layer | Implementasi | Keterangan |
| :--- | :--- | :--- |
| **MySQL Database** | 3 Tabel Baru (`roles`, `permissions`, `role_permissions`) & Foreign Key `users.role_id` | Menggunakan indeks unik, audit columns (`created_at`, `updated_at`, `deleted_at`), dan cascading protection. |
| **Katalog Izin (Registry)** | 35 Granular Permissions di 9 Modul | Modul: `dashboard`, `attendance`, `shifts`, `roster`, `leaves`, `overtime`, `employees`, `roles`, `tenants`. |
| **Role Sistem & Kustom** | Peran Sistem Bawaan + Peran Kustom Fleksibel | Peran sistem bawaan: `SUPER_ADMIN` (akses mutlak universal `*`), `HR_ADMIN`, `LEADER`, `EMPLOYEE`. Organisasi dapat membuat peran kustom tak terbatas (misal: `SHIFT_COORD`, `PAYROLL_OFFICER`). |
| **Backend Middleware** | `authorizePermission` & `authorizeAllPermissions` | Melindungi endpoint API berdasarkan permission code, dengan wildcard bypass untuk Super Admin. |
| **Frontend UI Matrix** | `RolesManagementPage.jsx` | Matriks interaktif dua kolom: daftar role di sisi kiri dan matriks izin per modul di sisi kanan dengan filter pencarian dan tombol simpan instan. |
| **Client Context** | `can()`, `canAny()`, `canAll()` di `AuthContext.jsx` | Pengecekan izin reaktif di seluruh komponen UI dan `ProtectedRoute`. |

---

## 2. Struktur Database RBAC (`hadirin` MySQL)

```sql
-- 9. PERMISSIONS: Katalog izin atomik granular sistem
CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(64) PRIMARY KEY,
  module VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  code VARCHAR(100) UNIQUE NOT NULL,
  name_id VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description TEXT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL DEFAULT NULL,
  INDEX idx_permissions_module (module),
  INDEX idx_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. ROLES: Definisi peran tingkat tenant atau sistem global
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  tenant_id VARCHAR(64) NOT NULL,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL,
  description TEXT NULL,
  is_system BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uk_roles_tenant_code (tenant_id, code),
  INDEX idx_roles_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. ROLE_PERMISSIONS: Hubungan many-to-many antara peran dan hak akses
CREATE TABLE IF NOT EXISTS role_permissions (
  id VARCHAR(64) PRIMARY KEY,
  role_id VARCHAR(64) NOT NULL,
  permission_id VARCHAR(64) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL DEFAULT NULL,
  UNIQUE KEY uk_role_perm (role_id, permission_id),
  CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ALTER USERS: Link user ke role dinamis
ALTER TABLE users ADD COLUMN role_id VARCHAR(64) NULL AFTER role;
ALTER TABLE users ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE SET NULL;
```

---

## 3. Fitur Halaman Manajemen Peran & Matriks Hak Akses

Buka menu **Peran & Hak Akses** (`/admin/roles`):

1. **Pemilihan Peran (Left Sidebar):**
   - Menampilkan kartu peran sistem (`SUPER_ADMIN`, `HR_ADMIN`, `LEADER`, `EMPLOYEE`) serta peran kustom tenant.
   - Dilengkapi badge **Sistem** (dilindungi dari penghapusan) atau **Kustom**.
   - Indikator jumlah izin aktif yang dimiliki peran tersebut.
2. **Matriks Hak Akses Granular (Main Panel):**
   - Dikelompokkan rapi per modul bisnis (**Dashboard**, **Presensi**, **Master Shift**, **Penjadwalan Roster**, **Cuti**, **Lembur**, **Karyawan**, **Peran & Hak Akses**, **Tenant SaaS**).
   - Fitur pencarian cepat izin (mencari kode atau nama izin secara instan).
   - Tombol **"Pilih Semua Modul"** / **"Batalkan Modul"** untuk kontrol cepat.
   - Tombol **"Simpan Perubahan Hak Akses"** untuk menyimpan matriks ke database MySQL.
3. **Modal Tambah Peran Kustom:**
   - Tombol **"+ Peran Kustom Baru"** di header atas.
   - Input nama peran, kode singkat unik (misal: `SHIFT_COORD`), dan deskripsi tugas.

---

## 4. Hasil Verifikasi Integrasi Backend & Frontend

### Automated Backend Test Suite (13 Test Suites - 100% Lulus)
Jalankan perintah:
```bash
node test-backend.js
```
Hasil eksekusi:
```
Test 1: Health Check (Bilingual ID vs EN) -> PASSED
Test 1b: Error Message Bilingual Verification -> PASSED
Test 2: Login Tenant 1 HR Admin -> PASSED
Test 3: Login Tenant 1 Staff Doni (Hierarchy) -> PASSED
Test 4: Login Tenant 1 Leader Bambang -> PASSED
Test 5: Login Tenant 2 Staff Cahyo -> PASSED
Test 6: Shift Verification (Cross-Midnight vs Non-Shift) -> PASSED
Test 7: Multi-Tenant Isolation Enforcement -> PASSED
Test 8: Cross-Midnight Clock-In & Clock-Out -> PASSED
Test 9: Multi-Tier Leave Approval Cycle -> PASSED
Test 10: Phase 1 Employee Management CRUD & Profile Settings -> PASSED
Test 11: Super Admin & Standardized IDs & Tenant Management -> PASSED
Test 12: Phase 2 Master Shift & Dynamic Roster Scheduling -> PASSED
Test 13: Dynamic Role & Permission Matrix (RBAC)
  ✓ Permissions registry loaded with 200 (35 permissions across 9 modules)
  ✓ Roles list loaded with 200 (HR_ADMIN, LEADER, EMPLOYEE, etc.)
  ✓ Custom role created with 201 (SHIFT_COORD)
  ✓ Duplicate role code rejected with 400
  ✓ Role permissions updated with 200
  ✓ Deleting system role rejected with 400
  ✓ Employee without roles.view rejected with 403
  ✓ Custom role successfully deleted & verified 404
🎉 ALL INTEGRATION TESTS PASSED 100%! Backend is fully operational & rock-solid.
```

### Production Build Frontend
Jalankan perintah:
```bash
npm run build
```
Hasil build:
```
✓ 1664 modules transformed.
dist/index.html                   1.22 kB
dist/assets/index-AESC6i5N.css   68.30 kB
dist/assets/index-Da4OQGDT.js   598.98 kB
✓ built in 2.00s with 0 errors.
```

