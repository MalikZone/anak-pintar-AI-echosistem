export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  EMPLOYEE: 'employee',
  LEADER: 'leader',
  HR_ADMIN: 'hr_admin',
};

export const LEAVE_STATUSES = {
  PENDING_LEADER: 'pending_leader',
  PENDING_HR: 'pending_hr',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  LATE: 'late',
  CLOCKED_OUT: 'clocked_out',
  ABSENT: 'absent',
};

export const OVERTIME_STATUSES = {
  PENDING_LEADER: 'pending_leader',
  PENDING_HR: 'pending_hr',
  PENDING: 'pending', // fallback for legacy records
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const OVERTIME_TYPES = {
  PRE_SHIFT: 'pre_shift',
  POST_SHIFT: 'post_shift',
  HOLIDAY_OFFDAY: 'holiday_offday',
};

export const LEAVE_TYPES = {
  ANNUAL: 'annual',
  SICK: 'sick',
  SPECIAL: 'special',
};

