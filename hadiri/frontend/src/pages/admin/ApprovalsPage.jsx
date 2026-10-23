import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApprovalList } from '../../features/leave';
import ShiftApprovalTable from '../../features/shifts/components/ShiftApprovalTable';
import OvertimeApprovalTable from '../../features/overtime/components/OvertimeApprovalTable';
import { AttendanceCorrectionApprovalTable } from '../../features/attendance';
import { useAttendance } from '../../context/AttendanceContext';
import { useLanguage } from '../../context/LanguageContext';
import { CheckSquare, Repeat, Briefcase, FileEdit } from 'lucide-react';

export default function ApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'leaves';
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    leaveRequests,
    overtimeRequests,
    hrPendingSwitches,
    hrPendingCorrections,
    fetchLeaveRequests,
    fetchHrPendingSwitches,
    fetchOvertimeRequests,
    fetchHrPendingCorrections,
    currentUser,
  } = useAttendance();
  const { t } = useLanguage();

  useEffect(() => {
    fetchLeaveRequests({ force: true });
    fetchHrPendingSwitches({ force: true });
    fetchOvertimeRequests({ force: true });
    fetchHrPendingCorrections({ force: true });
  }, [fetchLeaveRequests, fetchHrPendingSwitches, fetchOvertimeRequests, fetchHrPendingCorrections]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['leaves', 'switches', 'overtimes', 'corrections'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  const pendingLeaveCount = (leaveRequests || []).filter(
    (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
  ).length;

  const pendingSwitchCount = (hrPendingSwitches || []).filter(
    (s) => (s.status === 'pending_hr' || (s.status === 'pending' && !s.userLeaderId)) && s.userId !== currentUser?.id
  ).length;

  const pendingOvertimeCount = (overtimeRequests || []).filter(
    (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
  ).length;

  const pendingCorrectionCount = (hrPendingCorrections || []).filter(
    (c) =>
      (c.status === 'pending_hr' || (c.status === 'pending_leader' && (!c.leaderId || c.leaderId === ''))) &&
      c.userId !== currentUser?.id
  ).length;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              {t('approval_center_badge', 'Pusat Persetujuan HR & Operasional')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              • {currentUser?.name}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {t('approval_center_title', 'Pusat Persetujuan & Verifikasi')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('approval_center_subtitle', 'Verifikasi terpusat permohonan cuti, tukar shift, lembur (SPL), dan koreksi presensi staf')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
              {t('total_pending_verification', 'Total Menunggu Verifikasi')}
            </div>
            <div className="text-lg font-black text-indigo-700 dark:text-indigo-300">
              {pendingLeaveCount + pendingSwitchCount + pendingOvertimeCount + pendingCorrectionCount}
            </div>
          </div>
        </div>
      </div>

      {/* Category Tab Selector for HR Approvals */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('leaves')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'leaves'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>{t('tab_leave_approvals', 'Persetujuan Cuti & Izin')}</span>
          {pendingLeaveCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'leaves'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {pendingLeaveCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('switches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'switches'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>{t('tab_shift_switch_approvals', 'Persetujuan Tukar Shift')}</span>
          {pendingSwitchCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'switches'
                  ? 'bg-white/20 text-white'
                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
              }`}
            >
              {pendingSwitchCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('overtimes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'overtimes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t('tab_overtime_approvals', 'Persetujuan Lembur (SPL)')}</span>
          {pendingOvertimeCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'overtimes'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {pendingOvertimeCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('corrections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'corrections'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>{t('tab_correction_approvals', 'Koreksi Presensi')}</span>
          {pendingCorrectionCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'corrections'
                  ? 'bg-white/20 text-white'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
              }`}
            >
              {pendingCorrectionCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'leaves' && <ApprovalList />}
      {activeTab === 'switches' && <ShiftApprovalTable />}
      {activeTab === 'overtimes' && <OvertimeApprovalTable />}
      {activeTab === 'corrections' && <AttendanceCorrectionApprovalTable />}
    </div>
  );
}
