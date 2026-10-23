/**
 * Konstanta path rute aplikasi terpusat untuk menghindari typo pada URL string
 */
export const ROUTES = {
  ROOT: '/',
  
  // Rute Otentikasi
  AUTH: {
    LOGIN: '/login',
  },

  // Rute Karyawan (Employee Self-Service)
  EMPLOYEE: {
    ROOT: '/employee',
    DASHBOARD: '/employee',
    ATTENDANCE: '/employee/attendance',
    SCHEDULE: '/employee/schedule',
    OVERTIME: '/employee/overtime',
    REQUESTS: '/employee/requests',
    HISTORY: '/employee/history',
    PROFILE: '/employee/profile',
  },

  // Rute Leader (Persetujuan Tim - Tahap 1)
  LEADER: {
    ROOT: '/leader',
    APPROVALS: '/leader/approvals',
  },

  // Rute HR / Administrator
  ADMIN: {
    ROOT: '/admin',
    DASHBOARD: '/admin',
    SAAS_DASHBOARD: '/admin/saas-dashboard',
    APPROVALS: '/admin/approvals',
    OVERTIME_APPROVALS: '/admin/overtime-approvals',
    SHIFT_APPROVALS: '/admin/shift-approvals',
    SHIFTS: '/admin/shifts',
    EMPLOYEES: '/admin/employees',
    ROLES: '/admin/roles',
    TENANTS: '/admin/tenants',
    DEPARTMENTS: '/admin/departments',
    POSITIONS: '/admin/positions',
    LOCATIONS: '/admin/locations',
    HOLIDAYS: '/admin/holidays',
    LEAVE_TYPES: '/admin/leave-types',
    REPORTS: '/admin/reports',
    SETTINGS: '/admin/settings',
    PROFILE: '/admin/profile',
  },
};

