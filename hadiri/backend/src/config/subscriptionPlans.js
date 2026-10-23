/**
 * Standar Paket Langganan SaaS Hadirin (Subscription Tiers)
 * Nilai di bawah adalah fallback awal dan otomatis disinkronkan dengan tabel `subscription_plans` di database MySQL.
 */
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'PLAN-FREE',
    code: 'free',
    name: 'Free Trial',
    nameId: 'Uji Coba Gratis (Free)',
    nameEn: 'Free Trial',
    descriptionId: 'Paket evaluasi untuk tim mikro dan uji coba awal',
    descriptionEn: 'Evaluation tier for micro teams and initial onboarding',
    maxEmployees: 15,
    maxLocations: 1,
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: 'IDR',
    isPopular: false,
    isActive: true,
    sortOrder: 1,
    featuresId: [
      'Maksimal 15 Karyawan Aktif',
      '1 Lokasi Kantor Pusat (Geofence)',
      'Presensi Selfie & GPS Dasar',
      'Pengajuan Cuti & Koreksi Presensi',
    ],
    featuresEn: [
      'Up to 15 Active Employees',
      '1 Headquarters Location (Geofence)',
      'Basic Selfie & GPS Attendance',
      'Leave & Attendance Correction Requests',
    ],
  },
  starter: {
    id: 'PLAN-STARTER',
    code: 'starter',
    name: 'Starter Business',
    nameId: 'Starter Bisnis',
    nameEn: 'Starter Business',
    descriptionId: 'Paket esensial untuk bisnis berkembang multi-cabang',
    descriptionEn: 'Essential plan for growing multi-branch businesses',
    maxEmployees: 50,
    maxLocations: 3,
    monthlyPrice: 499000,
    yearlyPrice: 4990000,
    currency: 'IDR',
    isPopular: false,
    isActive: true,
    sortOrder: 2,
    featuresId: [
      'Maksimal 50 Karyawan Aktif',
      'Hingga 3 Cabang / Lokasi Geofence',
      'Manajemen Shift & Roster Mingguan',
      'Persetujuan Berjenjang (Leader & HR)',
      'Laporan Bulanan & Ekspor CSV',
    ],
    featuresEn: [
      'Up to 50 Active Employees',
      'Up to 3 Branches / Geofence Locations',
      'Shift & Weekly Roster Management',
      'Multi-Stage Approvals (Leader & HR)',
      'Monthly Reports & CSV Export',
    ],
  },
  pro: {
    id: 'PLAN-PRO',
    code: 'pro',
    name: 'Pro Corporate',
    nameId: 'Pro Korporat',
    nameEn: 'Pro Corporate',
    descriptionId: 'Paket korporat lengkap dengan shift 24/7, SPL & RBAC',
    descriptionEn: 'Complete corporate tier with 24/7 shifts, overtime & RBAC',
    maxEmployees: 250,
    maxLocations: 10,
    monthlyPrice: 1499000,
    yearlyPrice: 14990000,
    currency: 'IDR',
    isPopular: true,
    isActive: true,
    sortOrder: 3,
    featuresId: [
      'Maksimal 250 Karyawan Aktif',
      'Hingga 10 Cabang / Hub Operasional',
      'Shift Lintas Hari (24/7) & Tukar Shift',
      'Manajemen Lembur (SPL) & Kesiapan Payroll',
      'RBAC Dinamis & Matriks Hak Akses',
    ],
    featuresEn: [
      'Up to 250 Active Employees',
      'Up to 10 Branches / Operational Hubs',
      'Cross-Day Shifts (24/7) & Shift Swapping',
      'Overtime (SPL) & Payroll Readiness',
      'Dynamic RBAC & Permission Matrix',
    ],
  },
  enterprise: {
    id: 'PLAN-ENTERPRISE',
    code: 'enterprise',
    name: 'Enterprise Unlimited',
    nameId: 'Enterprise Tanpa Batas',
    nameEn: 'Enterprise Unlimited',
    descriptionId: 'Kapasitas tanpa batas dengan audit keamanan & SLA prioritas',
    descriptionEn: 'Unlimited capacity with security audit logs & priority SLA',
    maxEmployees: 9999,
    maxLocations: 999,
    monthlyPrice: 4999000,
    yearlyPrice: 49990000,
    currency: 'IDR',
    isPopular: false,
    isActive: true,
    sortOrder: 4,
    featuresId: [
      'Karyawan Tanpa Batas (Hingga 9.999+)',
      'Multi-Cabang & Hub Tanpa Batas',
      'Audit Log Keamanan & SLA Prioritas',
      'Dukungan Teknis Impersonasi & Dedicated Support',
      'Kustomisasi Kebijakan Cuti & Libur Nasional',
    ],
    featuresEn: [
      'Unlimited Employees (Up to 9,999+)',
      'Unlimited Multi-Branch & Hubs',
      'Security Audit Logs & Priority SLA',
      'Technical Impersonation & Dedicated Support',
      'Custom Leave Policies & National Holidays',
    ],
  },
};

function parseJsonArray(val, fallback = []) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string' && val.trim()) {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch {
      return val.split('\n').map((s) => s.trim()).filter(Boolean);
    }
  }
  return fallback;
}

export function mapSubscriptionPlanRow(row) {
  if (!row) return null;
  const code = String(row.code || 'starter').toLowerCase().trim();
  const fallback = SUBSCRIPTION_PLANS[code] || SUBSCRIPTION_PLANS.starter;

  return {
    id: row.id || fallback.id || `PLAN-${code.toUpperCase()}`,
    code,
    name: row.name || fallback.name,
    nameId: row.name_id || row.nameId || row.name || fallback.nameId,
    nameEn: row.name_en || row.nameEn || row.name || fallback.nameEn,
    descriptionId: row.description_id ?? row.descriptionId ?? fallback.descriptionId ?? '',
    descriptionEn: row.description_en ?? row.descriptionEn ?? fallback.descriptionEn ?? '',
    monthlyPrice: Number(row.monthly_price ?? row.monthlyPrice ?? fallback.monthlyPrice ?? 0),
    yearlyPrice: Number(row.yearly_price ?? row.yearlyPrice ?? fallback.yearlyPrice ?? 0),
    currency: row.currency || 'IDR',
    maxEmployees: Number(row.max_employees ?? row.maxEmployees ?? fallback.maxEmployees ?? 50),
    maxLocations: Number(row.max_locations ?? row.maxLocations ?? fallback.maxLocations ?? 3),
    featuresId: parseJsonArray(row.features_id ?? row.featuresId, fallback.featuresId),
    featuresEn: parseJsonArray(row.features_en ?? row.featuresEn, fallback.featuresEn),
    isPopular: Boolean(row.is_popular ?? row.isPopular ?? fallback.isPopular),
    isActive: row.is_active !== undefined ? Boolean(row.is_active) : true,
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? fallback.sortOrder ?? 1),
    updatedAt: row.updated_at || row.updatedAt || null,
  };
}

export function syncPlansCache(rows = []) {
  if (!Array.isArray(rows)) return;
  for (const r of rows) {
    const mapped = mapSubscriptionPlanRow(r);
    if (mapped && mapped.code) {
      SUBSCRIPTION_PLANS[mapped.code] = mapped;
    }
  }
}

export function getPlanConfig(planCodeOrId) {
  const raw = String(planCodeOrId || 'starter').trim();
  const key = raw.toLowerCase();
  if (SUBSCRIPTION_PLANS[key]) {
    return SUBSCRIPTION_PLANS[key];
  }
  const byId = Object.values(SUBSCRIPTION_PLANS).find(
    (p) => String(p.id || '').toLowerCase() === key
  );
  return byId || SUBSCRIPTION_PLANS.starter;
}
