import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../../context/AttendanceContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROUTES } from '../../routes/routePaths';
import { locationApi } from '../../services/api/locationApi';
import { departmentApi } from '../../services/api/departmentApi';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  CalendarCheck,
  Calendar,
  Search,
  MapPin,
  Building2,
} from 'lucide-react';

export default function AdminDashboardPage() {
  const {
    employees,
    leaveRequests,
    overtimeRequests,
    companyProfile,
    fetchEmployees,
    fetchLeaveRequests,
    fetchOvertimeRequests,
  } = useAttendance();
  const { t } = useLanguage();
  const todayStr = new Date().toLocaleDateString('en-CA');
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [selectedClockOut, setSelectedClockOut] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [departmentsList, setDepartmentsList] = useState([]);

  useEffect(() => {
    fetchEmployees({ force: true, date: selectedDate });
  }, [fetchEmployees, selectedDate]);

  useEffect(() => {
    fetchLeaveRequests();
    fetchOvertimeRequests();
    locationApi.getLocations().then((res) => setLocations(res || [])).catch(() => {});
    departmentApi.getDepartments().then((res) => setDepartmentsList(res || [])).catch(() => {});
  }, [fetchLeaveRequests, fetchOvertimeRequests]);

  const filteredEmployees = employees.filter((emp) => {
    const matchDept = selectedDept === 'all' || emp.department === selectedDept || emp.departmentId === selectedDept;
    const matchBranch = selectedBranch === 'all' || emp.locationId === selectedBranch;
    const matchSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.position.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (emp.clockIn && emp.clockIn !== '-' && emp.clockIn.includes(searchQuery)) ||
      (emp.clockOut && emp.clockOut !== '-' && emp.clockOut.includes(searchQuery));

    let matchClockOut = true;
    if (selectedClockOut === 'clocked_out') {
      matchClockOut = !!emp.clockOut && emp.clockOut !== '-';
    } else if (selectedClockOut === 'active') {
      matchClockOut = (!!emp.clockIn && emp.clockIn !== '-') && (!emp.clockOut || emp.clockOut === '-');
    } else if (selectedClockOut === 'not_in') {
      matchClockOut = !emp.clockIn || emp.clockIn === '-';
    }

    return matchDept && matchBranch && matchSearch && matchClockOut;
  });

  // Metric counts
  const totalCount = employees.length;
  const presentCount = employees.filter((e) => e.todayStatus === 'present').length;
  const lateCount = employees.filter((e) => e.todayStatus === 'late').length;
  const leaveCount = employees.filter((e) => e.todayStatus === 'leave' || e.todayStatus === 'sick').length;
  const absentCount = employees.filter((e) => e.todayStatus === 'absent').length;

  // Pending approval counts for HR / Super Admin
  const pendingApprovalsCount = (leaveRequests || []).filter(
    (r) => r.status === 'pending' || r.status === 'pending_hr' || r.status === 'pending_leader'
  ).length;

  const pendingOvertimeCount = (overtimeRequests || []).filter(
    (r) => r.status === 'pending' || r.status === 'pending_hr'
  ).length;

  return (
    <div className="space-y-6">
      
      {/* Top Banner HR */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 p-6 rounded-3xl text-white shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-6 -mt-6 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              {t('live_command_center')}
            </span>
            <span className="text-xs text-slate-300">• {companyProfile?.name || 'Organisasi'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {t('admin_monitor_title')}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {t('admin_monitor_subtitle')}
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-2 self-start sm:self-center">
          {pendingApprovalsCount > 0 && (
            <Link
              to={ROUTES.ADMIN.APPROVALS}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95"
            >
              <CalendarCheck className="w-3.5 h-3.5" />
              <span>{pendingApprovalsCount} {t('leave_badge_count')}</span>
            </Link>
          )}
          {pendingOvertimeCount > 0 && (
            <Link
              to={ROUTES.ADMIN.OVERTIME_APPROVALS}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{pendingOvertimeCount} {t('ot_badge_count')}</span>
            </Link>
          )}
        </div>
      </div>

      {/* Headcount Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('metric_total_staff')}</p>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{totalCount}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{t('metric_all_depts')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('metric_on_time')}</p>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">{presentCount}</p>
          <p className="text-[10px] text-emerald-500 mt-0.5">{Math.round((presentCount / (totalCount || 1)) * 100)}% {t('metric_employees_pct')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{t('metric_late')}</p>
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">{lateCount}</p>
          <p className="text-[10px] text-amber-500 mt-0.5">{t('metric_late_tolerance')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t('metric_leave_sick')}</p>
            <CalendarCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-1">{leaveCount}</p>
          <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">{t('metric_registered_leaves')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs col-span-2 sm:col-span-1 transition-colors">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">{t('metric_absent')}</p>
            <Clock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </div>
          <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-400 mt-1">{absentCount}</p>
          <p className="text-[10px] text-rose-500 mt-0.5">{t('metric_no_notice')}</p>
        </div>
      </div>

      {/* Live Attendance Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
        
        {/* Table Filter & Search Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {selectedDate === todayStr ? t('staff_attendance_today') : t('staff_attendance_date_title')}
              </h3>
              {selectedDate === todayStr ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  {t('live_today_badge')}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                  <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                  {selectedDate}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {selectedDate === todayStr
                ? t('staff_attendance_sub')
                : `${t('staff_attendance_date_sub')} ${selectedDate}`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Date Filter */}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent border-none text-xs font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-0 p-0 cursor-pointer"
                title={t('filter_attendance_date')}
              />
              {selectedDate !== todayStr && (
                <button
                  type="button"
                  onClick={() => setSelectedDate(todayStr)}
                  className="ml-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0"
                >
                  {t('reset_to_today')}
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_staff_placeholder')}
                className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none w-44 sm:w-48"
              />
            </div>

            {/* Branch Filter */}
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800"
            >
              <option value="all">{t('all_branches', 'Semua Cabang & Unit Usaha')}</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  [{loc.businessType || 'Cabang'}] {loc.name} {loc.isHeadquarters ? '(HQ)' : ''}
                </option>
              ))}
            </select>

            {/* Department Filter */}
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800"
            >
              <option value="all">{t('all_divisions', 'Semua Divisi / Departemen')}</option>
              {departmentsList.length > 0
                ? departmentsList.map((dept) => (
                    <option key={dept.id} value={dept.name}>
                      {dept.name} ({dept.code})
                    </option>
                  ))
                : Array.from(new Set(employees.map((e) => e.department).filter(Boolean))).map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
            </select>

            {/* Clock Out Filter */}
            <select
              value={selectedClockOut}
              onChange={(e) => setSelectedClockOut(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white dark:bg-slate-800"
            >
              <option value="all">{t('all_clock_out', 'Semua Jam Pulang')}</option>
              <option value="clocked_out">{t('filter_clocked_out', 'Sudah Clock Out')}</option>
              <option value="active">{t('filter_still_working', 'Belum Clock Out (Aktif)')}</option>
              <option value="not_in">{t('filter_not_in', 'Belum Masuk Presensi')}</option>
            </select>
          </div>
        </div>

        {/* Mobile View: Employee Attendance Cards */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
          {filteredEmployees.map((emp) => (
            <div key={emp.id} className="p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={emp.avatar}
                    alt={emp.name}
                    className="w-10 h-10 rounded-xl object-cover border border-slate-200 dark:border-slate-700"
                  />
                  <div>
                    <p className="font-bold text-sm text-slate-900 dark:text-white leading-tight">{emp.name}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {emp.position} • {emp.department} • <span className="font-semibold text-slate-700 dark:text-slate-300">{emp.shift}</span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('col_clock_in_time')}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                    {emp.clockIn && emp.clockIn !== '-' ? `${emp.clockIn} WIB` : '—'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">{t('col_clock_out_time', 'Jam Pulang')}</span>
                  <span className="font-mono text-slate-800 dark:text-slate-100">
                    {emp.clockOut && emp.clockOut !== '-' ? (
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {emp.clockOut} WIB
                      </span>
                    ) : emp.clockIn && emp.clockIn !== '-' ? (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px] font-sans font-medium">
                        {t('still_active', 'Masih Aktif')}
                      </span>
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                <div className="col-span-2 pt-1 border-t border-slate-200/40 dark:border-slate-700/40 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">{t('col_branch_location', 'Cabang & Unit Usaha')}</span>
                    <span className="text-slate-800 dark:text-slate-100 font-semibold truncate max-w-[170px] block">
                      {emp.branch?.name || emp.locationName || emp.locationType || '-'}
                    </span>
                    {emp.branch?.businessType && (
                      <span className="text-[9px] text-slate-500 dark:text-slate-400 block truncate max-w-[170px]">
                        {emp.branch.businessType}
                      </span>
                    )}
                  </div>
                  <div>
                    {emp.todayStatus === 'present' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {t('stat_on_time')}
                      </span>
                    )}
                    {emp.todayStatus === 'late' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                        {t('stat_late')}
                      </span>
                    )}
                    {emp.todayStatus === 'sick' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {t('timeoff_sick_label')}
                      </span>
                    )}
                    {emp.todayStatus === 'leave' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                        {t('timeoff_annual_label')}
                      </span>
                    )}
                    {emp.todayStatus === 'absent' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                        {t('metric_absent')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop View: Full Table with Vertical & Horizontal Scroll */}
        <div className="hidden sm:block overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_employee')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_department')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_shift')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_clock_in_time')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_clock_out_time', 'Jam Pulang')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_branch_location', 'Cabang & Unit Usaha')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{selectedDate === todayStr ? t('col_today_status') : t('status', 'Status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <img
                        src={emp.avatar}
                        alt={emp.name}
                        className="w-9 h-9 rounded-xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                      />
                      <div>
                        <p className="font-bold text-slate-900 dark:text-white leading-tight">{emp.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">{emp.position}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium border border-slate-200/60 dark:border-slate-700">
                      {emp.department}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap text-slate-600 dark:text-slate-300 font-medium text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 text-[11px] font-mono">
                      {emp.shift}
                    </span>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap font-mono font-bold text-slate-900 dark:text-white">
                    {emp.clockIn && emp.clockIn !== '-' ? `${emp.clockIn} WIB` : '—'}
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap font-mono text-slate-900 dark:text-white">
                    {emp.clockOut && emp.clockOut !== '-' ? (
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">
                        {emp.clockOut} WIB
                      </span>
                    ) : emp.clockIn && emp.clockIn !== '-' ? (
                      <span className="text-amber-600 dark:text-amber-400 text-[11px] font-sans font-medium px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                        {t('still_active', 'Masih Aktif')}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      <span>{emp.branch?.name || emp.locationName || emp.locationType || '-'}</span>
                      {emp.branch?.isHeadquarters && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded-md bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 font-bold">
                          HQ
                        </span>
                      )}
                      {emp.branch?.businessType && (
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-normal">
                          ({emp.branch.businessType})
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-5 whitespace-nowrap">
                    {emp.todayStatus === 'present' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {t('stat_on_time')}
                      </span>
                    )}
                    {emp.todayStatus === 'late' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                        <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                        {t('stat_late')}
                      </span>
                    )}
                    {emp.todayStatus === 'sick' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                        {t('timeoff_sick_label')}
                      </span>
                    )}
                    {emp.todayStatus === 'leave' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold">
                        {t('timeoff_annual_label')}
                      </span>
                    )}
                    {emp.todayStatus === 'absent' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold">
                        <Clock className="w-3 h-3 text-rose-500" />
                        {t('metric_absent')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}
