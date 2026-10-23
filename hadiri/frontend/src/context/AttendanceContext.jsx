import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import { useLanguage } from './LanguageContext';
import {
  shiftApi,
  rosterApi,
  attendanceApi,
  leaveApi,
  overtimeApi,
  userApi,
  notificationApi,
  attendanceCorrectionApi,
} from '../services/api';
import {
  COMPANY_PROFILE,
  COMPANY_SHIFTS,
  DEFAULT_WEEKLY_ROSTER,
} from '../services/mockData';

const AttendanceContext = createContext();

const DAY_NAMES = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Helper to calculate seconds between clockIn and now/clockOut
 */
function calculateSecondsElapsed(clockInStr, clockOutStr) {
  if (!clockInStr) return 0;
  try {
    const [inH, inM] = clockInStr.split(':').map(Number);
    const now = new Date();
    let endH = now.getHours();
    let endM = now.getMinutes();
    let endS = now.getSeconds();

    if (clockOutStr) {
      const [outH, outM] = clockOutStr.split(':').map(Number);
      endH = outH;
      endM = outM;
      endS = 0;
    }

    const inSec = inH * 3600 + inM * 60;
    let endSec = endH * 3600 + endM * 60 + endS;
    if (endSec < inSec) {
      // Cross-midnight shift
      endSec += 24 * 3600;
    }
    return Math.max(0, endSec - inSec);
  } catch {
    return 0;
  }
}

/**
 * Generate weekly roster based on tenant shift pattern
 */
function generateTenantRoster(tenantCode, shifts = []) {
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 is Sunday
  const mondayOffset = currentDayOfWeek === 0 ? -6 : 1 - currentDayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);

  const roster = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dayIndex = d.getDay();
    const dayName = DAY_NAMES[dayIndex];
    const dateStr = d.toISOString().split('T')[0];
    const isToday = dateStr === today.toISOString().split('T')[0];

    if (tenantCode === 'LOGISTIK') {
      const isOffDay = dayIndex === 0; // Sunday off
      let shiftCode = 'S1';
      let shiftName = 'Shift 1 Pagi';
      let hours = '07:00 - 15:00 WIB';
      let isCrossDay = false;

      if (dayIndex === 3 || dayIndex === 4) {
        shiftCode = 'S2';
        shiftName = 'Shift 2 Siang';
        hours = '15:00 - 23:00 WIB';
      } else if (dayIndex === 5 || dayIndex === 6) {
        shiftCode = 'S3';
        shiftName = 'Shift 3 Malam';
        hours = '23:00 - 07:00 (+1) WIB';
        isCrossDay = true;
      }

      roster.push({
        date: dateStr,
        dayName,
        shiftCode: isOffDay ? 'OFF' : shiftCode,
        shiftName: isOffDay ? 'Hari Libur Operasional' : shiftName,
        hours: isOffDay ? 'Libur' : hours,
        isCrossDay,
        isOffDay,
        isToday,
        location: 'Hub Cakung',
      });
    } else {
      // Corporate Non-Shift (KONSULTAN)
      const isOffDay = dayIndex === 0 || dayIndex === 6; // Weekend off
      roster.push({
        date: dateStr,
        dayName,
        shiftCode: isOffDay ? 'OFF' : 'REG',
        shiftName: isOffDay ? 'Hari Libur Akhir Pekan' : 'Non-Shift Reguler Pagi',
        hours: isOffDay ? 'Libur' : '08:30 - 17:30 WIB',
        isCrossDay: false,
        isOffDay,
        isToday,
        location: 'Menara Batavia Lt. 18',
      });
    }
  }
  return roster;
}

export function AttendanceProvider({ children }) {
  const { user, tenant, isAuthenticated, isHrAdmin, isLeader, refreshUser } = useAuth();
  const toast = useToast();
  const { t } = useLanguage();

  // Tenant shifts & active shift (empty by default until loaded for tenant)
  const [shifts, setShifts] = useState([]);
  const [activeShift, setActiveShift] = useState(null);

  // Today attendance state (Essential for ClockCard / Live Session)
  const [todayAttendance, setTodayAttendance] = useState({
    isClockedIn: false,
    clockInTime: null,
    clockOutTime: null,
    status: 'not_yet',
    locationName: 'Kantor Pusat',
    isWithinRadius: true,
    selfiePreview: null,
    workDurationSeconds: 0,
    shiftId: null,
    isCrossDay: false,
    sessionDate: new Date().toISOString().split('T')[0],
  });

  // Weekly roster
  const [weeklyRoster, setWeeklyRoster] = useState(DEFAULT_WEEKLY_ROSTER);

  // Route-Specific Data States
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [teamPendingLeaves, setTeamPendingLeaves] = useState([]);
  const [teamPendingSwitches, setTeamPendingSwitches] = useState([]);
  const [teamPendingOvertimes, setTeamPendingOvertimes] = useState([]);
  const [myShiftSwitches, setMyShiftSwitches] = useState([]);
  const [hrPendingLeaves, setHrPendingLeaves] = useState([]);
  const [hrPendingOvertimes, setHrPendingOvertimes] = useState([]);
  const [hrPendingSwitches, setHrPendingSwitches] = useState([]);
  const [overtimeRequests, setOvertimeRequests] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [myCorrections, setMyCorrections] = useState([]);
  const [teamPendingCorrections, setTeamPendingCorrections] = useState([]);
  const [hrPendingCorrections, setHrPendingCorrections] = useState([]);

  // Cache loading tracking flags
  const loadedFlags = useRef({
    history: false,
    leaves: false,
    teamLeaves: false,
    teamSwitches: false,
    teamOvertimes: false,
    mySwitches: false,
    overtimes: false,
    hrOvertimes: false,
    hrSwitches: false,
    employees: false,
  });

  const loginNotifiedUserRef = useRef(null);
  const lastEmployeesDateRef = useRef(null);
  const leaveRequestsRef = useRef(leaveRequests);
  useEffect(() => {
    leaveRequestsRef.current = leaveRequests;
  }, [leaveRequests]);
  const [isLoadingSession, setIsLoadingSession] = useState(false);

  // Compatibility helper: proxy showNotification to toast
  const showNotification = useCallback(
    (message, type = 'success') => {
      if (type === 'success') toast.success(message);
      else if (type === 'warning') toast.warning(message);
      else if (type === 'error') toast.error(message);
      else toast.info(message);
    },
    [toast]
  );

  // Compute active company profile from Auth tenant
  const companyProfile = {
    ...COMPANY_PROFILE,
    ...(tenant || {}),
    name: tenant?.name || COMPANY_PROFILE?.name || 'Hadirin Cloud Platform',
    workModel: tenant?.workModel || COMPANY_PROFILE?.workModel || 'Reguler Non-Shift',
    timezoneLabel: tenant?.timezoneLabel || COMPANY_PROFILE?.timezoneLabel || 'WIB (UTC+7)',
    headquarters: tenant?.headquarters || COMPANY_PROFILE?.headquarters || {
      name: 'Kantor Pusat',
      address: '',
      latitude: -6.2088,
      longitude: 106.8456,
      radiusMeters: 100,
    },
  };

  // Compute normalized currentUser with real-time leave quota balance
  const currentUser = useMemo(() => {
    if (!user) {
      return {
        id: 'GUEST',
        name: 'Tamu',
        position: 'Karyawan',
        department: 'Operations',
        avatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        leaveBalance: {
          annualTotal: 12,
          sickTotal: 14,
          remainingAnnual: 12,
          annualUsed: 0,
          annual: { total: 12, used: 0, remaining: 12 },
          sick: { total: 14, used: 0, remaining: 14 },
          special: { total: 5, used: 0, remaining: 5 },
        },
      };
    }

    // Hitung akumulasi hari cuti tahunan yang telah disetujui resmi oleh HR (status === 'approved')
    const approvedAnnualDays = Array.isArray(leaveRequests)
      ? leaveRequests
          .filter(
            (r) =>
              (r.userId === user.id || r.employeeId === user.id) &&
              (String(r.type || '').toLowerCase() === 'annual' ||
                String(r.type || '').toLowerCase() === 'cuti_tahunan' ||
                String(r.typeLabel || '').toLowerCase().includes('tahunan')) &&
              r.status === 'approved'
          )
          .reduce((sum, r) => sum + Number(r.totalDays || 1), 0)
      : 0;

    const baseAnnualTotal = Number(user.leaveBalance?.annualTotal ?? user.leaveBalance?.annual ?? 12);
    const dbRemaining = Number(user.leaveBalance?.remainingAnnual ?? user.leaveBalance?.annual?.remaining ?? baseAnnualTotal);
    const dbUsed = Number(user.leaveBalance?.annualUsed ?? user.leaveBalance?.annual?.used ?? Math.max(0, baseAnnualTotal - dbRemaining));
    const annualUsed = Math.max(approvedAnnualDays, dbUsed);
    const remainingAnnual = Math.min(dbRemaining, Math.max(0, baseAnnualTotal - annualUsed));

    return {
      ...user,
      shift: activeShift,
      avatar:
        user.avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      leaveBalance: {
        ...user.leaveBalance,
        annualTotal: baseAnnualTotal,
        sickTotal: Number(user.leaveBalance?.sickTotal ?? user.leaveBalance?.sick ?? 14),
        remainingAnnual,
        annualUsed,
        annual: {
          total: baseAnnualTotal,
          used: annualUsed,
          remaining: remainingAnnual,
        },
        sick: {
          total: Number(user.leaveBalance?.sickTotal ?? user.leaveBalance?.sick?.total ?? 14),
          used: Number(user.leaveBalance?.sickUsed ?? user.leaveBalance?.sick?.used ?? 0),
          remaining: Math.max(0, Number(user.leaveBalance?.sickTotal ?? 14) - Number(user.leaveBalance?.sickUsed ?? 0)),
        },
        special: {
          total: 5,
          used: Number(user.leaveBalance?.specialUsed ?? 0),
          remaining: Math.max(0, 5 - Number(user.leaveBalance?.specialUsed ?? 0)),
        },
      },
    };
  }, [user, activeShift, leaveRequests]);

  // Reset cached states and flags when user changes
  useEffect(() => {
    loadedFlags.current = {
      history: false,
      leaves: false,
      teamLeaves: false,
      teamSwitches: false,
      teamOvertimes: false,
      mySwitches: false,
      overtimes: false,
      hrOvertimes: false,
      hrSwitches: false,
      employees: false,
    };
    setTodayAttendance({
      isClockedIn: false,
      clockInTime: null,
      clockOutTime: null,
      status: 'not_yet',
      locationName: 'Kantor Pusat',
      isWithinRadius: true,
      selfiePreview: null,
      workDurationSeconds: 0,
      shiftId: null,
      isCrossDay: false,
      sessionDate: new Date().toISOString().split('T')[0],
    });
    setMyShiftSwitches([]);
    setLeaveRequests([]);
    setTeamPendingLeaves([]);
    setTeamPendingSwitches([]);
    setTeamPendingOvertimes([]);
    setHrPendingOvertimes([]);
    setHrPendingSwitches([]);
    setMyCorrections([]);
    setTeamPendingCorrections([]);
    setHrPendingCorrections([]);
    setNotifications([]);
    setUnreadNotificationCount(0);
  }, [user?.id, user?.role, tenant?.id]);

  // =========================================================================
  // 1. GLOBAL INITIALIZATION: Fetch ONLY Session Status & Shifts (2 requests)
  // =========================================================================
  const initSession = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingSession(true);

    try {
      // 1. Fetch Shifts for Active Tenant
      const loadedShifts = await shiftApi.getShifts().catch(() => []);
      if (Array.isArray(loadedShifts)) {
        setShifts(loadedShifts);
        const userShift = loadedShifts.find((s) => s.id === user?.shiftId) || loadedShifts[0] || null;
        setActiveShift(userShift);
      }

      // If user is HR Admin or Super Admin, they do not participate in employee clock-in or personal roster
      if (isHrAdmin || user?.role === 'super_admin') {
        setIsLoadingSession(false);
        return;
      }

      // 1b. Fetch Dynamic Roster (fallback to generateTenantRoster)
      try {
        const dynamicRoster = await rosterApi.getMyRoster();
        if (Array.isArray(dynamicRoster) && dynamicRoster.length > 0) {
          setWeeklyRoster(dynamicRoster);
          const todayRoster = dynamicRoster.find((r) => r.isToday);
          if (todayRoster && !todayRoster.isOffDay && todayRoster.shiftId) {
            const todayShift = loadedShifts.find((s) => s.id === todayRoster.shiftId);
            if (todayShift) {
              setActiveShift(todayShift);
            }
          }
        } else {
          setWeeklyRoster(generateTenantRoster(tenant?.code, loadedShifts));
        }
      } catch {
        setWeeklyRoster(generateTenantRoster(tenant?.code, loadedShifts));
      }

      // 2. Fetch Today's Attendance Status
      const todayRecord = await attendanceApi.getTodayStatus().catch(() => null);
      if (todayRecord) {
        const attRecord = todayRecord.attendance || todayRecord;
        const clockInTime = attRecord?.clockInTime || todayRecord.clockInTime || null;
        const clockOutTime = attRecord?.clockOutTime ?? todayRecord.clockOutTime ?? null;
        const status = clockOutTime
          ? 'clocked_out'
          : (attRecord?.status || todayRecord.status || 'not_yet');

        const isClocked = todayRecord.isClockedIn !== undefined
          ? (!!todayRecord.isClockedIn && !clockOutTime)
          : (!!clockInTime && !clockOutTime);

        setTodayAttendance({
          isClockedIn: isClocked,
          clockInTime: clockInTime,
          clockOutTime: clockOutTime,
          status: status,
          locationName: attRecord?.location || todayRecord.location || companyProfile.headquarters?.name || 'Kantor',
          isWithinRadius: true,
          selfiePreview:
            attRecord?.selfieUrl ||
            todayRecord.selfieUrl ||
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
          workDurationSeconds: calculateSecondsElapsed(clockInTime, clockOutTime),
          shiftId: attRecord?.shiftId || todayRecord.shiftId,
          isCrossDay: attRecord?.isCrossDay ?? todayRecord.isCrossDay ?? false,
          sessionDate: attRecord?.date || todayRecord.date || todayRecord.sessionDate || new Date().toISOString().split('T')[0],
        });
      } else {
        setTodayAttendance((prev) => ({
          ...prev,
          isClockedIn: false,
          clockInTime: null,
          clockOutTime: null,
          status: 'not_yet',
          workDurationSeconds: 0,
          sessionDate: new Date().toISOString().split('T')[0],
        }));
      }
    } catch (err) {
      console.warn('Error initializing attendance session:', err.message);
    } finally {
      setIsLoadingSession(false);
    }
  }, [user?.id, isAuthenticated, isHrAdmin, user?.role, user?.shiftId, tenant?.code]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // Live timer for work duration when clocked in
  useEffect(() => {
    let timer;
    if (!isHrAdmin && user?.role !== 'super_admin' && todayAttendance.isClockedIn && !todayAttendance.clockOutTime) {
      timer = setInterval(() => {
        setTodayAttendance((prev) => ({
          ...prev,
          workDurationSeconds: prev.workDurationSeconds + 1,
        }));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isHrAdmin, user?.role, todayAttendance.isClockedIn, todayAttendance.clockOutTime]);

  // =========================================================================
  // 2. ROUTE-BASED ON-DEMAND FETCHERS (Called ONLY when route opens)
  // =========================================================================

  // Fetch Attendance History (Route: /employee/history)
  const fetchAttendanceHistory = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated || user?.role === 'super_admin') return;
    if (loadedFlags.current.history && !force) return;

    try {
      const historyData = await attendanceApi.getHistory().catch(() => []);
      if (Array.isArray(historyData)) {
        const mappedHistory = historyData.map((h) => {
          const d = new Date(h.date);
          const dayName = DAY_NAMES[d.getDay()] || 'Hari';

          let punctualityStatus = (h.status || 'present').toLowerCase();
          if (punctualityStatus === 'clocked_out' || !['present', 'late', 'sick', 'leave'].includes(punctualityStatus)) {
            if (h.clockInTime) {
              const [inH, inM] = h.clockInTime.split(':').map(Number);
              // Default office regular shift starts at 08:30 + 15m grace period = 08:45
              punctualityStatus = (inH * 60 + inM > 8 * 60 + 45) ? 'late' : 'present';
            } else {
              punctualityStatus = 'present';
            }
          }

          let statusLabel = 'Tepat Waktu';
          if (punctualityStatus === 'late') {
            statusLabel = 'Terlambat';
          } else if (punctualityStatus === 'sick') {
            statusLabel = 'Sakit';
          } else if (punctualityStatus === 'leave') {
            statusLabel = 'Cuti';
          }

          return {
            id: h.id,
            date: h.date,
            dayName,
            clockIn: h.clockInTime || h.clockIn,
            clockOut: h.clockOutTime || h.clockOut,
            clockInTime: h.clockInTime || h.clockIn,
            clockOutTime: h.clockOutTime || h.clockOut,
            status: punctualityStatus,
            rawStatus: h.rawStatus || h.status,
            statusLabel,
            shiftName: h.notes?.includes('Shift') ? h.notes : 'Shift Kerja',
            isCrossDay: h.isCrossDay,
            location: h.location || `WFO (${companyProfile.headquarters?.name || 'Kantor'})`,
            notes: h.notes,
            selfieUrl: h.selfieUrl,
          };
        });
        setAttendanceHistory(mappedHistory);
        loadedFlags.current.history = true;
      }
    } catch (err) {
      console.warn('Error fetching attendance history:', err.message);
    }
  }, [isAuthenticated, user?.role, companyProfile.headquarters?.name]);

  // Fetch Leaves (Route: /employee/requests, /admin/approvals, /employee)
  const fetchLeaveRequests = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated) return;
    if (loadedFlags.current.leaves && !force) return;

    try {
      if (isHrAdmin) {
        const [allLeaves, hrPending] = await Promise.all([
          leaveApi.getAllLeaves().catch(() => []),
          leaveApi.getHrPendingLeaves().catch(() => []),
        ]);
        setLeaveRequests(allLeaves);
        setHrPendingLeaves(hrPending);
      } else {
        const myLeaves = await leaveApi.getMyLeaves().catch(() => []);
        setLeaveRequests(myLeaves);
      }
      loadedFlags.current.leaves = true;
    } catch (err) {
      console.warn('Error fetching leave requests:', err.message);
    }
  }, [isAuthenticated, isHrAdmin]);

  // Fetch Team Pending Leaves (Route: /leader/approvals)
  const fetchTeamPendingLeaves = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated || (!isLeader && !isHrAdmin)) return;
    if (loadedFlags.current.teamLeaves && !force) return;

    try {
      const teamPending = await leaveApi.getTeamPendingLeaves().catch(() => []);
      setTeamPendingLeaves(teamPending);
      loadedFlags.current.teamLeaves = true;
    } catch (err) {
      console.warn('Error fetching team pending leaves:', err.message);
    }
  }, [isAuthenticated, isLeader, isHrAdmin]);

  // Fetch Team Pending Shift Switches (Route: /leader/approvals)
  const fetchTeamPendingSwitches = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated || (!isLeader && !isHrAdmin)) return;
    if (loadedFlags.current.teamSwitches && !force) return;

    try {
      const switches = await rosterApi.getShiftSwitches({ includeResolved: 'true' }).catch(() => []);
      setTeamPendingSwitches(switches || []);
      loadedFlags.current.teamSwitches = true;
    } catch (err) {
      console.warn('Error fetching team pending switches:', err.message);
    }
  }, [isAuthenticated, isLeader, isHrAdmin]);

  // Fetch Personal Shift Switch Requests (Route: /employee/schedule, /employee/requests)
  const fetchMyShiftSwitches = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated || isHrAdmin || user?.role === 'super_admin') return;
    if (loadedFlags.current.mySwitches && !force) return;

    try {
      const switches = await rosterApi.getMyShiftSwitches().catch(() => []);
      setMyShiftSwitches(switches || []);
      loadedFlags.current.mySwitches = true;
    } catch (err) {
      console.warn('Error fetching my shift switches:', err.message);
    }
  }, [isAuthenticated, isHrAdmin, user?.role]);

  // Fetch Overtime Requests (Route: /employee/overtime, /admin/overtime-approvals)
  const fetchOvertimeRequests = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated) return;
    if (loadedFlags.current.overtimes && !force) return;

    try {
      if (isHrAdmin) {
        const tenantOvertimes = await overtimeApi.getTenantOvertimes().catch(() => []);
        setOvertimeRequests(tenantOvertimes);
      } else {
        const myOvertimes = await overtimeApi.getMyOvertimes().catch(() => []);
        setOvertimeRequests(myOvertimes);
      }
      loadedFlags.current.overtimes = true;
    } catch (err) {
      console.warn('Error fetching overtime requests:', err.message);
    }
  }, [isAuthenticated, isHrAdmin]);

  // Fetch Team Pending Overtimes (Route: /leader/approvals)
  const fetchTeamPendingOvertimes = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated || (!isLeader && !isHrAdmin)) return;
    if (loadedFlags.current.teamOvertimes && !force) return;

    try {
      const teamOt = await overtimeApi.getTeamPendingOvertimes().catch(() => []);
      setTeamPendingOvertimes(Array.isArray(teamOt) ? teamOt : []);
      loadedFlags.current.teamOvertimes = true;
    } catch (err) {
      console.warn('Error fetching team pending overtimes:', err.message);
    }
  }, [isAuthenticated, isLeader, isHrAdmin]);

  // Fetch HR Pending Overtimes (Route: /admin/overtime-approvals)
  const fetchHrPendingOvertimes = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated || !isHrAdmin) return;
    if (loadedFlags.current.hrOvertimes && !force) return;

    try {
      const hrOt = await overtimeApi.getHrPendingOvertimes().catch(() => []);
      setHrPendingOvertimes(Array.isArray(hrOt) ? hrOt : []);
      loadedFlags.current.hrOvertimes = true;
    } catch (err) {
      console.warn('Error fetching hr pending overtimes:', err.message);
    }
  }, [isAuthenticated, isHrAdmin]);

  // Fetch HR Shift Switches (Route: /admin/shift-approvals, /admin/approvals)
  const fetchHrPendingSwitches = useCallback(async ({ force = false } = {}) => {
    if (!isAuthenticated || (!isHrAdmin && user?.role !== 'super_admin')) return;
    if (loadedFlags.current.hrSwitches && !force) return;

    try {
      const switches = await rosterApi.getShiftSwitches({ includeResolved: 'true' }).catch(() => []);
      setHrPendingSwitches(Array.isArray(switches) ? switches : []);
      loadedFlags.current.hrSwitches = true;
    } catch (err) {
      console.warn('Error fetching hr shift switches:', err.message);
    }
  }, [isAuthenticated, isHrAdmin, user?.role]);

  // Attendance Corrections Fetchers (Route: /employee/requests, /leader/approvals, /admin/approvals)
  const fetchMyCorrections = useCallback(async () => {
    try {
      const data = await attendanceCorrectionApi.getMyCorrections();
      if (Array.isArray(data)) {
        setMyCorrections(data);
      }
      return data;
    } catch (err) {
      console.warn('Error fetching my corrections:', err.message);
      return [];
    }
  }, []);

  const fetchTeamPendingCorrections = useCallback(async () => {
    try {
      const data = await attendanceCorrectionApi.getTeamPending();
      if (Array.isArray(data)) {
        setTeamPendingCorrections(data);
      }
      return data;
    } catch (err) {
      console.warn('Error fetching team pending corrections:', err.message);
      return [];
    }
  }, []);

  const fetchHrPendingCorrections = useCallback(async () => {
    try {
      const data = await attendanceCorrectionApi.getHrPending();
      if (Array.isArray(data)) {
        setHrPendingCorrections(data);
      }
      return data;
    } catch (err) {
      console.warn('Error fetching HR pending corrections:', err.message);
      return [];
    }
  }, []);

  // Fetch Employees Directory & Live Status (Route: /admin/employees, /admin)
  const fetchEmployees = useCallback(async ({ force = false, date = null } = {}) => {
    if (!isAuthenticated) return;
    const targetDate = date || new Date().toLocaleDateString('en-CA');
    const dateChanged = lastEmployeesDateRef.current !== targetDate;
    if (loadedFlags.current.employees && !force && !dateChanged) return;

    try {
      lastEmployeesDateRef.current = targetDate;
      const [directoryUsers, allShifts] = await Promise.all([
        userApi.getDirectory({ date: targetDate }).catch(() => []),
        shifts.length > 0 ? Promise.resolve(shifts) : shiftApi.getShifts().catch(() => []),
      ]);
      if (shifts.length === 0 && Array.isArray(allShifts) && allShifts.length > 0) {
        setShifts(allShifts);
      }
      const activeShifts = (allShifts && allShifts.length > 0) ? allShifts : shifts;

      let tenantTodayLogs = [];
      if (isHrAdmin) {
        tenantTodayLogs = await attendanceApi.getTenantToday({ date: targetDate }).catch(() => []);
      }

      const currentLeaves = leaveRequestsRef.current || [];

      if (Array.isArray(directoryUsers) && directoryUsers.length > 0) {
        const mappedEmployees = directoryUsers.map((u) => {
          const empAttendance = tenantTodayLogs.find((l) => l.userId === u.id);
          let todayStatus = 'absent';
          let clockIn = '-';
          let clockOut = '-';

          // Determine the effective shift for this user on targetDate
          const activeShiftId = empAttendance?.shiftId || u.shiftId;
          const empShift = activeShifts.find((s) => s.id === activeShiftId) || (u.shiftStartTime ? {
            id: u.shiftId,
            name: u.shiftName,
            startTime: u.shiftStartTime,
            endTime: u.shiftEndTime,
            isCrossDay: u.isCrossDay,
          } : null);

          if (empAttendance) {
            clockIn = empAttendance.clockInTime || empAttendance.clockIn || '-';
            clockOut = empAttendance.clockOutTime || empAttendance.clockOut || '-';
            const rawStatus = (empAttendance.status || '').toLowerCase();
            if (rawStatus === 'sick' || rawStatus === 'leave') {
              todayStatus = rawStatus;
            } else if (clockIn && clockIn !== '-') {
              if (empShift && empShift.startTime) {
                const [startH, startM] = empShift.startTime.split(':').map(Number);
                const [inH, inM] = clockIn.split(':').map(Number);
                const grace = empShift.gracePeriodMinutes || 15;
                todayStatus = (inH * 60 + inM > startH * 60 + startM + grace) ? 'late' : 'present';
              } else {
                const [inH, inM] = clockIn.split(':').map(Number);
                todayStatus = (inH * 60 + inM > 8 * 60 + 45) ? 'late' : 'present';
              }
            } else {
              todayStatus = rawStatus || 'present';
            }
          } else {
            // Check if user has an approved leave request covering targetDate
            const userLeave = currentLeaves.find((l) => {
              if (l.userId !== u.id) return false;
              if (l.status !== 'approved') return false;
              const start = l.startDate ? l.startDate.slice(0, 10) : null;
              const end = l.endDate ? l.endDate.slice(0, 10) : start;
              if (!start) return false;
              return targetDate >= start && targetDate <= (end || start);
            });

            if (userLeave) {
              todayStatus = userLeave.type === 'sick' ? 'sick' : 'leave';
            } else {
              todayStatus = 'absent';
            }
          }

          let shiftStr = u.shift;
          if (!shiftStr) {
            if (u.isOffDay) {
              shiftStr = 'Libur (Day Off)';
            } else if (empShift) {
              shiftStr = `${empShift.name ? empShift.name + ' (' : ''}${empShift.startTime} - ${empShift.endTime}${empShift.isCrossDay ? ' +1' : ''}${empShift.name ? ')' : ''}`;
            } else {
              shiftStr = '08:00 - 17:00';
            }
          }

          return {
            ...u,
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role || 'employee',
            roleId: u.roleId || u.role_id || null,
            position: u.position || '',
            positionId: u.positionId || u.position_id || null,
            department: u.department || '',
            departmentId: u.departmentId || u.department_id || null,
            locationId: u.locationId || u.location_id || null,
            locationName: u.locationName || u.branch?.name || null,
            branch: u.branch || null,
            shiftId: activeShiftId || null,
            shiftName: u.shiftName || empShift?.name || 'Standard',
            leaderId: u.leaderId || u.leader_id || null,
            managerId: u.managerId || u.manager_id || null,
            leaveBalance: u.leaveBalance,
            avatar:
              u.avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name || 'User')}&background=2563eb&color=fff&bold=true`,
            todayStatus,
            clockIn,
            clockOut,
            clockInTime: empAttendance?.clockInTime || null,
            clockOutTime: empAttendance?.clockOutTime || null,
            shift: shiftStr,
            locationType: u.branch?.name ? `${u.branch.name} (${u.branch.businessType || 'Cabang'})` : (empAttendance?.location || 'Kantor Pusat'),
            leaderName: u.leader?.name || u.leaderName || '-',
          };
        });
        setEmployees(mappedEmployees);
        loadedFlags.current.employees = true;
      }
    } catch (err) {
      console.warn('Error fetching employees directory:', err.message);
    }
  }, [isAuthenticated, isHrAdmin, shifts]);

  // Optional Full Refresh (Used only if explicitly requested, partitioned by role)
  const refreshData = useCallback(async () => {
    if (isHrAdmin) {
      await Promise.all([
        initSession(),
        fetchLeaveRequests({ force: true }),
        fetchOvertimeRequests({ force: true }),
        fetchTeamPendingSwitches({ force: true }),
        fetchHrPendingOvertimes({ force: true }),
        fetchHrPendingSwitches({ force: true }),
        fetchHrPendingCorrections({ force: true }),
        fetchEmployees({ force: true }),
      ]);
    } else if (user?.role === 'leader' || isLeader) {
      await Promise.all([
        initSession(),
        fetchLeaveRequests({ force: true }),
        fetchTeamPendingLeaves({ force: true }),
        fetchTeamPendingSwitches({ force: true }),
        fetchTeamPendingOvertimes({ force: true }),
        fetchTeamPendingCorrections({ force: true }),
        fetchMyShiftSwitches({ force: true }),
        fetchOvertimeRequests({ force: true }),
        fetchAttendanceHistory({ force: true }),
      ]);
    } else if (user?.role !== 'super_admin') {
      await Promise.all([
        initSession(),
        fetchLeaveRequests({ force: true }),
        fetchMyShiftSwitches({ force: true }),
        fetchOvertimeRequests({ force: true }),
        fetchAttendanceHistory({ force: true }),
      ]);
    } else {
      await initSession();
    }
  }, [
    isHrAdmin,
    isLeader,
    user?.role,
    initSession,
    fetchLeaveRequests,
    fetchTeamPendingLeaves,
    fetchTeamPendingSwitches,
    fetchTeamPendingOvertimes,
    fetchTeamPendingCorrections,
    fetchMyShiftSwitches,
    fetchOvertimeRequests,
    fetchHrPendingOvertimes,
    fetchHrPendingSwitches,
    fetchHrPendingCorrections,
    fetchEmployees,
    fetchAttendanceHistory,
  ]);

  // Auto-fetch approval queues and pending requests on login
  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      loginNotifiedUserRef.current = null;
      return;
    }

    const initApprovalsOnLogin = async () => {
      if (user.role === 'leader' || isLeader) {
        await Promise.all([
          fetchTeamPendingLeaves({ force: true }),
          fetchTeamPendingSwitches({ force: true }),
          fetchTeamPendingOvertimes({ force: true }),
          fetchTeamPendingCorrections({ force: true }),
        ]);
      } else if (user.role === 'hr_admin' || isHrAdmin) {
        await Promise.all([
          fetchLeaveRequests({ force: true }),
          fetchOvertimeRequests({ force: true }),
          fetchTeamPendingSwitches({ force: true }),
          fetchHrPendingOvertimes({ force: true }),
          fetchHrPendingSwitches({ force: true }),
          fetchHrPendingCorrections({ force: true }),
        ]);
      }
    };

    initApprovalsOnLogin();
  }, [
    isAuthenticated,
    user?.id,
    user?.role,
    isLeader,
    isHrAdmin,
    fetchTeamPendingLeaves,
    fetchTeamPendingSwitches,
    fetchTeamPendingOvertimes,
    fetchTeamPendingCorrections,
    fetchLeaveRequests,
    fetchOvertimeRequests,
    fetchHrPendingOvertimes,
    fetchHrPendingSwitches,
    fetchHrPendingCorrections,
  ]);

  // Prompt toast notification when pending requests wait for Leader or HR on login
  useEffect(() => {
    if (!isAuthenticated || !user?.id || loginNotifiedUserRef.current === user.id) return;

    if (user.role === 'leader' || isLeader) {
      if (loadedFlags.current.teamLeaves && loadedFlags.current.teamSwitches && loadedFlags.current.teamOvertimes) {
        const leaderPending =
          (teamPendingLeaves || []).filter((l) => l.userId !== user.id && l.status === 'pending_leader').length +
          (teamPendingSwitches || []).filter((s) => s.userId !== user.id && s.status === 'pending_leader').length +
          (teamPendingOvertimes || []).filter((o) => o.userId !== user.id && (o.status === 'pending_leader' || o.status === 'pending')).length +
          (teamPendingCorrections || []).filter((c) => c.userId !== user.id && c.status === 'pending_leader').length;

        if (leaderPending > 0) {
          toast.warning(
            `Terdapat ${leaderPending} permohonan tim (Cuti/Shift/Lembur/Koreksi) yang memerlukan persetujuan Anda sebagai Leader.`,
            'Pemberitahuan Persetujuan Tim',
            { duration: 6000 }
          );
        }
        loginNotifiedUserRef.current = user.id;
      }
    } else if (user.role === 'hr_admin' || isHrAdmin) {
      if (loadedFlags.current.leaves && loadedFlags.current.overtimes && loadedFlags.current.hrSwitches) {
        const hrPending =
          (hrPendingLeaves || []).filter((l) => l.userId !== user.id).length +
          (overtimeRequests || []).filter((o) => (o.status === 'pending_hr' || (o.status === 'pending' && !o.leaderId)) && o.userId !== user.id).length +
          (hrPendingSwitches || []).filter((s) => s.status === 'pending_hr' && s.userId !== user.id).length +
          (hrPendingCorrections || []).filter((c) => (c.status === 'pending_hr' || (c.status === 'pending_leader' && (!c.leaderId || c.leaderId === ''))) && c.userId !== user.id).length;

        if (hrPending > 0) {
          toast.warning(
            `Terdapat ${hrPending} permohonan (Cuti/Lembur/Shift/Koreksi) yang siap untuk persetujuan final HR.`,
            'Pemberitahuan Persetujuan HR',
            { duration: 6000 }
          );
        }
        loginNotifiedUserRef.current = user.id;
      }
    }
  }, [
    isAuthenticated,
    user?.id,
    user?.role,
    isLeader,
    isHrAdmin,
    teamPendingLeaves,
    teamPendingSwitches,
    teamPendingOvertimes,
    teamPendingCorrections,
    hrPendingLeaves,
    overtimeRequests,
    hrPendingSwitches,
    hrPendingCorrections,
    toast,
  ]);

  // =========================================================================
  // 3. TARGETED MUTATIONS (Only invalidate their specific domain)
  // =========================================================================

  // Action: Switch / Select Active Shift
  const handleChangeShift = (shiftId) => {
    const selected = shifts.find((s) => s.id === shiftId);
    if (!selected) return;

    setActiveShift(selected);
    setTodayAttendance((prev) => ({
      ...prev,
      shiftId: selected.id,
      isCrossDay: selected.isCrossDay,
    }));

    toast.success(
      t('toast_shift_changed_desc', {
        name: selected.name,
        time: `${selected.startTime} - ${selected.endTime}`,
        cross: selected.isCrossDay ? ` • ${t('cross_midnight_badge')}` : '',
      }),
      t('toast_shift_changed_title')
    );
  };

  // Action: Clock In
  const handleClockIn = async ({ selfieUrl, customNotes = '', latitude, longitude }) => {
    try {
      const targetLocation = user?.branch?.name || companyProfile.headquarters?.name || 'Kantor Pusat';
      const response = await attendanceApi.clockIn({
        shiftId: activeShift?.id || null,
        notes: customNotes || (activeShift ? `Presensi ${activeShift.name}` : 'Presensi Masuk'),
        selfieUrl:
          selfieUrl ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
        location: targetLocation,
        locationName: targetLocation,
        latitude: latitude != null ? Number(latitude) : null,
        longitude: longitude != null ? Number(longitude) : null,
      });

      const record = response.data || response;
      const isLate = record.status === 'late';

      setTodayAttendance({
        isClockedIn: true,
        clockInTime: record.clockInTime,
        clockOutTime: null,
        status: record.status,
        locationName: record.location,
        isWithinRadius: true,
        selfiePreview: record.selfieUrl,
        workDurationSeconds: 0,
        shiftId: record.shiftId,
        isCrossDay: record.isCrossDay,
        sessionDate: record.date,
      });

      const msg = t('toast_clockin_msg', {
        time: record.clockInTime,
        shift: activeShift?.name || 'Reguler',
        cross: record.isCrossDay ? ` (${t('cross_midnight_badge')})` : '',
      });

      if (isLate) {
        toast.warning(msg, t('toast_clockin_late_title'));
      } else {
        toast.success(msg, t('toast_clockin_success_title'));
      }

      // Invalidate attendance history cache
      if (loadedFlags.current.history) {
        fetchAttendanceHistory({ force: true });
      }
    } catch (err) {
      toast.error(err.message || t('toast_clockin_failed_desc'), t('toast_clockin_failed_title'));
      throw err;
    }
  };

  // Action: Clock Out
  const handleClockOut = async (customNotes = '') => {
    try {
      const safeNotes = typeof customNotes === 'string' && customNotes.trim() ? customNotes.trim() : 'Selesai bertugas';
      const response = await attendanceApi.clockOut({
        notes: safeNotes,
      });

      const record = response.data || response;

      setTodayAttendance((prev) => ({
        ...prev,
        isClockedIn: false,
        clockOutTime: record.clockOutTime,
        status: 'clocked_out',
      }));

      const hours = Math.floor((record.workDurationSeconds || 0) / 3600);
      const mins = Math.floor(((record.workDurationSeconds || 0) % 3600) / 60);
      const durationStr = `${hours}j ${mins}m`;

      toast.success(
        t('toast_clockout_msg', {
          time: record.clockOutTime,
          duration: durationStr,
        }),
        t('toast_clockout_success_title')
      );

      // Invalidate history cache
      if (loadedFlags.current.history) {
        fetchAttendanceHistory({ force: true });
      }
    } catch (err) {
      toast.error(err.message || t('toast_clockout_failed_desc'), t('toast_clockout_failed_title'));
      throw err;
    }
  };

  // Action: Submit Leave Request
  const handleSubmitLeave = async (formData) => {
    try {
      await leaveApi.submitLeave({
        type: formData.type,
        typeLabel: formData.typeLabel || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        totalDays: Number(formData.totalDays),
        reason: formData.reason,
        attachmentName: formData.attachmentName || null,
        attachmentUrl: formData.attachmentUrl || null,
      });

      toast.success(
        t('toast_leave_submitted_desc', { days: Number(formData.totalDays) }),
        t('toast_leave_submitted_title')
      );

      // Only refresh leave requests
      fetchLeaveRequests({ force: true });
      if (typeof refreshUser === 'function') {
        refreshUser().catch(console.warn);
      }
    } catch (err) {
      toast.error(err.message || t('toast_leave_failed_desc'), t('toast_leave_failed_title'));
      throw err;
    }
  };

  // Action: Leader Approve Leave (Tahap 1)
  const handleLeaderApproveLeave = async (leaveId, notes = 'Disetujui oleh Leader/Atasan Langsung') => {
    try {
      await leaveApi.leaderAction(leaveId, {
        action: 'approve',
        notes,
      });

      toast.success(
        t('toast_leader_approve_desc', { id: leaveId }),
        t('toast_leader_approve_title')
      );

      const approvedByLeaderObj = {
        leaderId: user?.id,
        leaderName: user?.name || 'Leader / Atasan',
        leaderPosition: user?.position || 'Atasan Langsung',
        approvedAt: new Date().toISOString().slice(0, 19).replace('T', ' '),
        notes,
      };

      setTeamPendingLeaves((prev) =>
        prev.map((req) => (req.id === leaveId ? { ...req, status: 'pending_hr', leaderNotes: notes, approvedByLeader: approvedByLeaderObj } : req))
      );
      setLeaveRequests((prev) =>
        prev.map((req) => (req.id === leaveId ? { ...req, status: 'pending_hr', leaderNotes: notes, approvedByLeader: approvedByLeaderObj } : req))
      );
      await Promise.all([
        fetchTeamPendingLeaves({ force: true }),
        fetchLeaveRequests({ force: true }),
        fetchNotifications(),
      ]);
    } catch (err) {
      toast.error(err.message || t('toast_leader_approve_failed_desc'), t('toast_leader_approve_failed_title'));
      throw err;
    }
  };

  // Action: Leader Reject Leave (Tahap 1)
  const handleLeaderRejectLeave = async (leaveId, reason = 'Kebutuhan mendesak operasional tim') => {
    try {
      await leaveApi.leaderAction(leaveId, {
        action: 'reject',
        rejectReason: reason,
      });

      toast.warning(
        t('toast_leader_reject_desc', { id: leaveId }),
        t('toast_leader_reject_title')
      );
      setTeamPendingLeaves((prev) =>
        prev.map((req) => (req.id === leaveId ? { ...req, status: 'rejected', rejectReason: reason, rejectedByLeader: true, rejectedReason: reason } : req))
      );
      setLeaveRequests((prev) =>
        prev.map((req) => (req.id === leaveId ? { ...req, status: 'rejected', rejectReason: reason, rejectedByLeader: true, rejectedReason: reason } : req))
      );
      await Promise.all([
        fetchTeamPendingLeaves({ force: true }),
        fetchLeaveRequests({ force: true }),
        fetchNotifications(),
      ]);
    } catch (err) {
      toast.error(err.message || t('toast_leader_reject_failed_desc'), t('toast_leader_reject_failed_title'));
      throw err;
    }
  };

  // Action: Leader Review Shift Switch Request
  const handleLeaderReviewShiftSwitch = async (switchId, action, rejectionReason = null) => {
    try {
      await rosterApi.reviewShiftSwitch(switchId, { action, rejectionReason });
      toast.success(
        action === 'approved'
          ? t('switch_approved', 'Pengajuan tukar shift berhasil disetujui!')
          : t('switch_rejected', 'Pengajuan tukar shift ditolak.'),
        t('success', 'Berhasil')
      );
      setTeamPendingSwitches((prev) =>
        prev.map((sw) => (sw.id === switchId ? { ...sw, status: action === 'approved' ? 'pending_hr' : 'rejected', rejectionReason } : sw))
      );
      await fetchTeamPendingSwitches({ force: true });
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message || 'Gagal memproses permohonan tukar shift', t('error', 'Error'));
      throw err;
    }
  };

  // Action: HR Review Shift Switch Request (Tahap 2 Final Approval)
  const handleHrReviewShiftSwitch = async (switchId, action, rejectionReason = null) => {
    try {
      await rosterApi.reviewShiftSwitch(switchId, { action, rejectionReason });
      toast.success(
        action === 'approved'
          ? t('toast_shift_switch_approved_desc', 'Pengajuan ganti shift disetujui final dan jadwal roster otomatis diterapkan.')
          : t('toast_shift_switch_rejected_desc', 'Pengajuan ganti shift ditolak oleh HR.'),
        action === 'approved' ? t('success', 'Berhasil Disetujui') : t('rejected', 'Ditolak')
      );
      setHrPendingSwitches((prev) => prev.filter((sw) => sw.id !== switchId));
      await Promise.all([
        fetchHrPendingSwitches({ force: true }),
        fetchTeamPendingSwitches({ force: true }),
        fetchNotifications(),
      ]);
    } catch (err) {
      toast.error(err.message || 'Gagal memproses persetujuan tukar shift', t('error', 'Error'));
      throw err;
    }
  };

  // Action: Leader Approve Overtime (Tahap 1)
  const handleLeaderApproveOvertime = async (otId, notes = 'Disetujui oleh Leader/Atasan Langsung') => {
    try {
      await overtimeApi.leaderAction(otId, { action: 'approve', notes });
      toast.success(
        t('toast_leader_ot_approved', 'Pengajuan lembur bawahan berhasil disetujui dan diteruskan ke HR'),
        t('success', 'Berhasil')
      );
      setTeamPendingOvertimes((prev) =>
        prev.map((ot) => (ot.id === otId ? { ...ot, status: 'pending_hr', leaderNotes: notes } : ot))
      );
      await fetchTeamPendingOvertimes({ force: true });
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message || 'Gagal menyetujui pengajuan lembur', t('error', 'Error'));
      throw err;
    }
  };

  // Action: Leader Reject Overtime (Tahap 1)
  const handleLeaderRejectOvertime = async (otId, rejectReason = 'Kebutuhan mendesak operasional tim') => {
    try {
      await overtimeApi.leaderAction(otId, { action: 'reject', rejectReason });
      toast.warning(
        t('toast_leader_ot_rejected', 'Pengajuan lembur bawahan telah ditolak'),
        t('info', 'Ditolak')
      );
      setTeamPendingOvertimes((prev) =>
        prev.map((ot) => (ot.id === otId ? { ...ot, status: 'rejected', rejectReason } : ot))
      );
      await fetchTeamPendingOvertimes({ force: true });
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message || 'Gagal menolak pengajuan lembur', t('error', 'Error'));
      throw err;
    }
  };

  // Action: Employee Submit Shift Switch Request
  const handleRequestShiftSwitch = async (data) => {
    try {
      const result = await rosterApi.requestShiftSwitch(data);
      toast.success(
        t('switch_requested_success', 'Permohonan tukar shift berhasil diajukan dan menunggu persetujuan Leader!'),
        t('success', 'Berhasil')
      );
      await fetchMyShiftSwitches({ force: true });
      await fetchMyRoster({ force: true });
      await fetchNotifications();
      return result;
    } catch (err) {
      toast.error(err.message || t('switch_request_failed', 'Gagal mengajukan tukar shift'), t('error', 'Error'));
      throw err;
    }
  };

  // Action: HR Approve Leave (Tahap Final)
  const handleApproveLeave = async (leaveId, notes = '') => {
    try {
      await leaveApi.hrAction(leaveId, {
        action: 'approve',
        notes,
      });

      toast.success(
        t('toast_hr_approve_desc', { id: leaveId }),
        t('toast_hr_approve_title')
      );
      setHrPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      await fetchLeaveRequests({ force: true });
      await fetchNotifications();
      if (typeof refreshUser === 'function') {
        await refreshUser();
      }
    } catch (err) {
      toast.error(err.message || t('toast_hr_approve_failed_desc'), t('toast_hr_approve_failed_title'));
      throw err;
    }
  };

  // Action: HR Reject Leave (Tahap Final)
  const handleRejectLeave = async (leaveId, rejectReason = 'Tidak memenuhi persyaratan operasional') => {
    try {
      await leaveApi.hrAction(leaveId, {
        action: 'reject',
        rejectReason,
      });

      toast.warning(
        t('toast_hr_reject_desc', { id: leaveId }),
        t('toast_hr_reject_title')
      );
      setHrPendingLeaves((prev) => prev.filter((l) => l.id !== leaveId));
      await fetchLeaveRequests({ force: true });
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message || t('toast_hr_reject_failed_desc'), t('toast_hr_reject_failed_title'));
      throw err;
    }
  };

  // Action: Submit Overtime Request (SPL)
  const handleSubmitOvertime = async (otData) => {
    try {
      await overtimeApi.submitOvertime({
        type: otData.type,
        date: otData.date,
        startTime: otData.startTime,
        endTime: otData.endTime,
        durationHours: Number(otData.durationHours),
        reason: otData.reason,
      });

      toast.success(
        t('toast_overtime_submitted_desc', { spl: `${otData.durationHours} ${t('hours', 'Jam')}` }),
        t('toast_overtime_submitted_title')
      );

      await fetchOvertimeRequests({ force: true });
      await fetchNotifications();
    } catch (err) {
      toast.error(err.message || t('toast_overtime_failed_desc'), t('toast_overtime_failed_title'));
      throw err;
    }
  };

  // Action: HR Approve Overtime
  const handleApproveOvertime = async (otId) => {
    try {
      await overtimeApi.hrAction(otId, { action: 'approve' });
      toast.success(
        t('toast_overtime_approved_desc', { id: otId }),
        t('toast_overtime_approved_title')
      );
      setHrPendingOvertimes((prev) => prev.filter((o) => o.id !== otId));
      await Promise.all([
        fetchHrPendingOvertimes({ force: true }),
        fetchOvertimeRequests({ force: true }),
        fetchNotifications(),
      ]);
    } catch (err) {
      toast.error(err.message || t('toast_overtime_approved_failed_desc'), t('toast_overtime_approved_failed_title'));
      throw err;
    }
  };

  // Action: HR Reject Overtime
  const handleRejectOvertime = async (otId, rejectReason = 'Kebutuhan lembur belum mendesak') => {
    try {
      await overtimeApi.hrAction(otId, { action: 'reject', rejectReason });
      toast.warning(
        t('toast_overtime_rejected_desc', { id: otId }),
        t('toast_overtime_rejected_title')
      );
      setHrPendingOvertimes((prev) => prev.filter((o) => o.id !== otId));
      await Promise.all([
        fetchHrPendingOvertimes({ force: true }),
        fetchOvertimeRequests({ force: true }),
        fetchNotifications(),
      ]);
    } catch (err) {
      toast.error(err.message || t('toast_overtime_rejected_failed_desc'), t('toast_overtime_rejected_failed_title'));
      throw err;
    }
  };

  // Shift & Roster Actions
  const fetchShifts = useCallback(async () => {
    try {
      const data = await shiftApi.getShifts();
      if (Array.isArray(data)) {
        setShifts(data);
        setActiveShift((prev) => {
          if (!prev) return data[0] || null;
          return data.find((s) => s.id === prev.id) || data[0] || null;
        });
      }
      return data;
    } catch (err) {
      console.warn('Error fetching shifts:', err.message);
      return [];
    }
  }, []);

  const fetchMyRoster = useCallback(async (params = {}) => {
    try {
      const data = await rosterApi.getMyRoster(params);
      if (Array.isArray(data)) {
        setWeeklyRoster(data);
      }
      return data;
    } catch (err) {
      console.warn('Error fetching my roster:', err.message);
    }
  }, []);

  const handleCreateShift = async (shiftData) => {
    try {
      const created = await shiftApi.createShift(shiftData);
      toast.success(
        t('toast_shift_created_desc', 'Shift baru berhasil dibuat'),
        t('toast_shift_created_title', 'Shift Berhasil Dibuat')
      );
      await fetchShifts();
      return created;
    } catch (err) {
      toast.error(err.message || t('toast_shift_create_failed', 'Gagal membuat shift'), t('error', 'Error'));
      throw err;
    }
  };

  const handleUpdateShift = async (shiftId, shiftData) => {
    try {
      const updated = await shiftApi.updateShift(shiftId, shiftData);
      toast.success(
        t('toast_shift_updated_desc', 'Shift berhasil diperbarui'),
        t('toast_shift_updated_title', 'Shift Diperbarui')
      );
      await fetchShifts();
      return updated;
    } catch (err) {
      toast.error(err.message || t('toast_shift_update_failed', 'Gagal memperbarui shift'), t('error', 'Error'));
      throw err;
    }
  };

  const handleDeleteShift = async (shiftId) => {
    try {
      await shiftApi.deleteShift(shiftId);
      toast.success(
        t('toast_shift_deleted_desc', 'Shift berhasil dinonaktifkan'),
        t('toast_shift_deleted_title', 'Shift Dihapus')
      );
      await fetchShifts();
    } catch (err) {
      toast.error(err.message || t('toast_shift_delete_failed', 'Gagal menghapus shift'), t('error', 'Error'));
      throw err;
    }
  };

  // =========================================================================
  // NOTIFICATIONS (Interactive Notification Center)
  // =========================================================================
  const fetchNotifications = useCallback(async () => {
    try {
      const res = await notificationApi.getNotifications({ limit: 30 });
      if (res && typeof res === 'object') {
        setNotifications(res.notifications || []);
        setUnreadNotificationCount(res.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Error fetching notifications:', err.message);
    }
  }, []);

  const markNotificationRead = useCallback(async (id) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n))
      );
      setUnreadNotificationCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.warn('Error marking notification as read:', err.message);
    }
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, readAt: new Date().toISOString() }))
      );
      setUnreadNotificationCount(0);
    } catch (err) {
      console.warn('Error marking all notifications as read:', err.message);
    }
  }, []);

  // Poll notifications every 30 seconds when user is authenticated
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user?.id, fetchNotifications]);

  // =========================================================================
  // ATTENDANCE CORRECTIONS (Alur Koreksi Presensi & Lupa Absen)
  // =========================================================================

  const handleSubmitAttendanceCorrection = async (correctionData) => {
    try {
      const created = await attendanceCorrectionApi.submitCorrection(correctionData);
      toast.success(
        t('toast_correction_submitted_desc', 'Pengajuan koreksi presensi berhasil dikirim dan menunggu persetujuan.'),
        t('toast_correction_submitted_title', 'Koreksi Diajukan')
      );
      await fetchMyCorrections();
      await fetchNotifications();
      return created;
    } catch (err) {
      toast.error(err.message || t('toast_correction_failed', 'Gagal mengajukan koreksi presensi'), t('error', 'Error'));
      throw err;
    }
  };

  const handleLeaderActionCorrection = async (id, payload) => {
    try {
      const updated = await attendanceCorrectionApi.leaderAction(id, payload);
      toast.success(
        payload.action === 'approve'
          ? t('toast_correction_approved', 'Koreksi presensi disetujui Leader dan diteruskan ke HR')
          : t('toast_correction_rejected', 'Koreksi presensi ditolak oleh Leader'),
        t('success', 'Berhasil')
      );
      setTeamPendingCorrections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...(updated || {}),
                status: payload.action === 'approve' ? 'pending_hr' : 'rejected',
                leaderNotes: payload.notes || c.leaderNotes,
                leaderApprovedAt: new Date().toISOString(),
              }
            : c
        )
      );
      await fetchTeamPendingCorrections({ force: true });
      await fetchNotifications();
      return updated;
    } catch (err) {
      toast.error(err.message || t('action_failed', 'Aksi gagal'), t('error', 'Error'));
      throw err;
    }
  };

  const handleHrActionCorrection = async (id, payload) => {
    try {
      const updated = await attendanceCorrectionApi.hrAction(id, payload);
      toast.success(
        payload.action === 'approve'
          ? t('toast_correction_hr_approved', 'Koreksi presensi resmi disahkan dan data presensi telah diperbarui')
          : t('toast_correction_hr_rejected', 'Koreksi presensi ditolak oleh HR'),
        t('success', 'Berhasil')
      );
      setHrPendingCorrections((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                ...(updated || {}),
                status: payload.action === 'approve' ? 'approved' : 'rejected',
                hrNotes: payload.notes || c.hrNotes,
                hrApprovedAt: new Date().toISOString(),
              }
            : c
        )
      );
      await fetchHrPendingCorrections({ force: true });
      await fetchEmployees({ force: true });
      await fetchAttendanceHistory({ force: true });
      await initSession();
      await fetchNotifications();
      return updated;
    } catch (err) {
      toast.error(err.message || t('action_failed', 'Aksi gagal'), t('error', 'Error'));
      throw err;
    }
  };

  return (
    <AttendanceContext.Provider
      value={{
        currentUser,
        companyProfile,
        shifts,
        availableShifts: shifts,
        activeShift,
        setActiveShift,
        changeShift: handleChangeShift,
        weeklyRoster,
        todayAttendance,
        attendanceHistory,
        leaveRequests,
        teamPendingLeaves,
        teamPendingSwitches,
        teamPendingOvertimes,
        myShiftSwitches,
        hrPendingLeaves,
        hrPendingOvertimes,
        hrPendingSwitches,
        overtimeRequests,
        employees,
        isLoadingSession,
        // Notifications
        notifications,
        unreadNotificationCount,
        fetchNotifications,
        markNotificationRead,
        markAllNotificationsRead,
        // Attendance Corrections
        myCorrections,
        teamPendingCorrections,
        hrPendingCorrections,
        fetchMyCorrections,
        fetchTeamPendingCorrections,
        fetchHrPendingCorrections,
        submitAttendanceCorrection: handleSubmitAttendanceCorrection,
        leaderActionCorrection: handleLeaderActionCorrection,
        hrActionCorrection: handleHrActionCorrection,
        // On-demand fetchers
        fetchAttendanceHistory,
        fetchLeaveRequests,
        fetchTeamPendingLeaves,
        fetchTeamPendingSwitches,
        fetchTeamPendingOvertimes,
        fetchMyShiftSwitches,
        fetchOvertimeRequests,
        fetchHrPendingOvertimes,
        fetchHrPendingSwitches,
        fetchEmployees,
        fetchShifts,
        fetchMyRoster,
        refreshData,
        // Action mutations
        clockIn: handleClockIn,
        clockOut: handleClockOut,
        submitLeave: handleSubmitLeave,
        leaderApproveLeave: handleLeaderApproveLeave,
        leaderRejectLeave: handleLeaderRejectLeave,
        leaderReviewShiftSwitch: handleLeaderReviewShiftSwitch,
        hrReviewShiftSwitch: handleHrReviewShiftSwitch,
        reviewShiftSwitch: handleHrReviewShiftSwitch,
        leaderApproveOvertime: handleLeaderApproveOvertime,
        leaderRejectOvertime: handleLeaderRejectOvertime,
        requestShiftSwitch: handleRequestShiftSwitch,
        approveLeave: handleApproveLeave,
        rejectLeave: handleRejectLeave,
        submitOvertime: handleSubmitOvertime,
        approveOvertime: handleApproveOvertime,
        rejectOvertime: handleRejectOvertime,
        createShift: handleCreateShift,
        updateShift: handleUpdateShift,
        deleteShift: handleDeleteShift,
        showNotification,
        refreshUser,
      }}
    >
      {children}
    </AttendanceContext.Provider>
  );
}

export function useAttendance() {
  const context = useContext(AttendanceContext);
  if (!context) {
    throw new Error('useAttendance must be used within an AttendanceProvider');
  }
  return context;
}
