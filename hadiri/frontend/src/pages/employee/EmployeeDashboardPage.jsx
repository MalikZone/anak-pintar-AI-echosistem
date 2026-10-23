import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAttendance } from '../../context/AttendanceContext';
import { useLanguage } from '../../context/LanguageContext';
import { ClockCard } from '../../features/attendance';
import { TimeOffModal, LeaveDetailModal } from '../../features/leave';
import { ROUTES } from '../../routes/routePaths';
import {
  CalendarCheck,
  Clock,
  ArrowUpRight,
  ShieldCheck,
  Plus,
  Eye,
} from 'lucide-react';

export default function EmployeeDashboardPage() {
  const {
    currentUser,
    leaveRequests,
    fetchLeaveRequests,
    overtimeRequests,
    fetchOvertimeRequests,
    refreshUser,
  } = useAttendance();
  const { t } = useLanguage();
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  React.useEffect(() => {
    fetchLeaveRequests({ force: true });
    if (fetchOvertimeRequests) fetchOvertimeRequests();
  }, []);

  const userLeaveRequests = leaveRequests.filter(
    (r) => r.employeeId === currentUser.id || r.userId === currentUser.id
  );

  const userOvertimes = (overtimeRequests || []).filter(
    (r) => r.employeeId === currentUser?.id || r.userId === currentUser?.id || r.user_id === currentUser?.id
  );
  const approvedOvertimes = userOvertimes.filter((r) => r.status === 'approved');
  const liveTotalOvertimeHours = approvedOvertimes.reduce((acc, curr) => acc + (curr.durationHours || 0), 0);
  const liveEstimatedEarnings = approvedOvertimes.reduce((acc, curr) => acc + (curr.estimatedRateIDR || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-900 via-slate-900 to-indigo-950 p-6 rounded-3xl text-white shadow-soft relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 bg-blue-500/20 rounded-full blur-2xl"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-500/30 text-blue-200 border border-blue-400/30">
              Employee Portal
            </span>
            <span className="text-xs text-slate-300">• {currentUser.department}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {t('greeting_hello')}, {currentUser.name}! 👋
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            {t('dashboard_subtitle')}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setIsTimeOffModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-500/30 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>{t('create_new_leave')}</span>
          </button>
        </div>
      </div>

      {/* Main Clock-in Area */}
      <ClockCard />

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Leave Balance Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <Link
              to={ROUTES.EMPLOYEE.REQUESTS}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-0.5"
            >
              {t('apply_leave_link')}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('annual_leave_remaining')}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                {currentUser.leaveBalance?.annual?.remaining ?? currentUser.leaveBalance?.remainingAnnual ?? 12}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('days')}</span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              {t('quota_of')} {currentUser.leaveBalance?.annual?.total ?? currentUser.leaveBalance?.annualTotal ?? 12} {t('quota_used_suffix')} {currentUser.leaveBalance?.annual?.used ?? currentUser.leaveBalance?.annualUsed ?? 0} {t('days')}
            </p>
          </div>
        </div>

        {/* Shift Details Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Clock className="w-5 h-5" />
            </div>
            <Link
              to={ROUTES.EMPLOYEE.SCHEDULE}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold flex items-center gap-0.5"
            >
              {t('view_roster')}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('today_shift_pattern')}</p>
            <div className="mt-1">
              <p className="text-base font-bold text-slate-900 dark:text-white">
                {currentUser.shift?.name || t('shift_regular', 'Shift Reguler')}
              </p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold mt-0.5">
                {currentUser.shift?.startTime} - {currentUser.shift?.endTime} WIB{currentUser.shift?.isCrossDay ? ' (+1)' : ''}
              </p>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
              {t('tolerance_label')} {currentUser.shift?.gracePeriodMinutes || 15} {t('minutes')}
            </p>
          </div>
        </div>

        {/* Overtime Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between transition-colors">
          <div className="flex items-center justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <Link
              to={ROUTES.EMPLOYEE.OVERTIME}
              className="text-xs text-amber-600 dark:text-amber-400 hover:underline font-semibold flex items-center gap-0.5"
            >
              {t('compensation')}
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="mt-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('approved_overtime_month')}</p>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-extrabold text-amber-700 dark:text-amber-400 font-mono">
                {liveTotalOvertimeHours}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('hours')}</span>
            </div>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-2">
              {t('estimate')} Rp {liveEstimatedEarnings.toLocaleString('id-ID')}
            </p>
          </div>
        </div>

      </div>

      {/* Recent Leave Requests Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-5 transition-colors">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('recent_leave_title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('recent_leave_subtitle')}</p>
          </div>
          <Link
            to={ROUTES.EMPLOYEE.REQUESTS}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold"
          >
            {t('view_all')} →
          </Link>
        </div>

        {userLeaveRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-xs">
            {t('no_active_leave')}
          </div>
        ) : (
          <div className="space-y-2.5">
            {userLeaveRequests.slice(0, 3).map((req) => (
              <div
                key={req.id}
                className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800 text-[10px]">
                    {(req.employeeName || req.userName || currentUser?.name || 'U').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {req.employeeName || req.userName || currentUser?.name}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {req.typeLabel}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        • {req.totalDays} {t('days')} ({req.startDate} {t('date_range_to', 's/d')} {req.endDate})
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 line-clamp-1 italic">"{req.reason}"</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  {req.status === 'pending_leader' && (
                    <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-bold">
                      {t('awaiting_leader_badge')}
                    </span>
                  )}
                  {req.status === 'pending_hr' && (
                    <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                      {t('awaiting_hr_badge')}
                    </span>
                  )}
                  {req.status === 'pending' && (
                    <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                      {t('awaiting_hr_badge')}
                    </span>
                  )}
                  {req.status === 'approved' && (
                    <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                      {t('approved')} ({req.approvedByHr?.hrName || req.approvedBy || 'HR'})
                    </span>
                  )}
                  {req.status === 'rejected' && (
                    <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold">
                      {t('rejected_hr_badge')}
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => setSelectedLeave(req)}
                    className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{t('detail_btn')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <TimeOffModal
        isOpen={isTimeOffModalOpen}
        onClose={() => setIsTimeOffModalOpen(false)}
      />

      <LeaveDetailModal
        leave={selectedLeave}
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
      />

    </div>
  );
}
