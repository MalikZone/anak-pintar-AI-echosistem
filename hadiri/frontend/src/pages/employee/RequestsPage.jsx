import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAttendance } from '../../context/AttendanceContext';
import { useLanguage } from '../../context/LanguageContext';
import { TimeOffModal, LeaveDetailModal } from '../../features/leave';
import { ShiftSwitchRequestModal } from '../../features/shifts';
import { AttendanceCorrectionTable } from '../../features/attendance';
import {
  Plus,
  CalendarCheck,
  Eye,
  Repeat,
  FileEdit,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  ArrowRight,
} from 'lucide-react';

export default function RequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromQuery = searchParams.get('tab');
  const initialTab = ['switches', 'corrections'].includes(tabFromQuery) ? tabFromQuery : 'leaves';
  const [activeTab, setActiveTab] = useState(initialTab);

  const {
    leaveRequests,
    myShiftSwitches,
    myCorrections,
    currentUser,
    fetchLeaveRequests,
    fetchMyShiftSwitches,
    fetchMyCorrections,
    refreshUser,
  } = useAttendance();
  const { t, language, getDayName } = useLanguage();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  useEffect(() => {
    fetchLeaveRequests({ force: true });
    fetchMyShiftSwitches({ force: true });
    fetchMyCorrections();
  }, []);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  // Filter requests for current employee
  const userLeaveRequests = leaveRequests.filter(
    (r) => r.employeeId === currentUser?.id || r.userId === currentUser?.id
  );

  const userShiftSwitches = (myShiftSwitches || []).filter(
    (s) => s.userId === currentUser?.id || s.user_id === currentUser?.id
  );

  const pendingSwitchesCount = userShiftSwitches.filter(
    (s) => s.status === 'pending_leader'
  ).length;

  const pendingCorrectionsCount = (myCorrections || []).filter(
    (c) => c.status === 'pending_leader' || c.status === 'pending_hr'
  ).length;

  // Real-time calculation: Approved annual leaves directly reduce remaining quota and increase used quota
  const approvedAnnualDays = userLeaveRequests
    .filter(
      (r) =>
        (String(r.type || '').toLowerCase() === 'annual' ||
          String(r.type || '').toLowerCase() === 'cuti_tahunan' ||
          String(r.typeLabel || '').toLowerCase().includes('tahunan')) &&
        r.status === 'approved'
    )
    .reduce((sum, r) => sum + Number(r.totalDays || 1), 0);

  const annualTotal = currentUser?.leaveBalance?.annual?.total ?? currentUser?.leaveBalance?.annualTotal ?? 12;
  const dbRemaining = currentUser?.leaveBalance?.annual?.remaining ?? currentUser?.leaveBalance?.remainingAnnual ?? annualTotal;
  const dbUsed = currentUser?.leaveBalance?.annual?.used ?? currentUser?.leaveBalance?.annualUsed ?? Math.max(0, annualTotal - dbRemaining);
  const annualUsed = Math.max(approvedAnnualDays, dbUsed);
  const annualRemaining = Math.min(dbRemaining, Math.max(0, annualTotal - annualUsed));

  const sickTotal = currentUser?.leaveBalance?.sick?.total ?? currentUser?.leaveBalance?.sickTotal ?? 14;
  const sickRemaining = currentUser?.leaveBalance?.sick?.remaining ?? 14;
  const specialTotal = 5;
  const specialRemaining = currentUser?.leaveBalance?.special?.remaining ?? 5;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              {t('ess_portal_badge', 'Employee Self-Service (ESS)')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              • {currentUser?.name}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {t('self_service_requests_title', 'Pengajuan Mandiri')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('self_service_requests_subtitle', 'Pusat permohonan cuti tahunan, izin sakit, tukar shift, dan koreksi presensi')}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-700/80">
        <button
          type="button"
          onClick={() => handleTabChange('leaves')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'leaves'
              ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          <span>{t('tab_leaves', 'Cuti & Izin')}</span>
          {userLeaveRequests.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'leaves'
                  ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {userLeaveRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('switches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'switches'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Repeat className="w-4 h-4" />
          <span>{t('tab_shift_switches', 'Tukar Shift')}</span>
          {userShiftSwitches?.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'switches'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {pendingSwitchesCount > 0 ? `${pendingSwitchesCount} ${t('tab_pending', 'Menunggu')}` : userShiftSwitches.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('corrections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'corrections'
              ? 'bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>{t('tab_attendance_corrections', 'Koreksi Presensi')}</span>
          {myCorrections?.length > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === 'corrections'
                  ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {pendingCorrectionsCount > 0 ? `${pendingCorrectionsCount} ${t('tab_pending', 'Menunggu')}` : myCorrections.length}
            </span>
          )}
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: LEAVE REQUESTS */}
      {/* ==================================================================== */}
      {activeTab === 'leaves' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft transition-colors">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('leave_requests_title')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('leave_requests_subtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 self-start sm:self-center transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t('create_new_leave')}</span>
            </button>
          </div>

          {/* Quota Summary Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Card 1: Sisa Kuota Cuti Tahunan */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col justify-between transition-colors relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('annual_leave_remaining', 'Sisa Kuota Cuti Tahunan')}
                </span>
                <div className="p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60">
                  <CalendarCheck className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {annualRemaining}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('days', 'Hari')}</span>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                    <span>{t('quota_of', 'Dari kuota')} {annualTotal} {t('days', 'hari')}</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {Math.round((annualRemaining / Math.max(1, annualTotal)) * 100)}% {t('remaining_short', 'tersisa')}
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(0, (annualRemaining / Math.max(1, annualTotal)) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Cuti Tahunan Terpakai */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col justify-between transition-colors group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('annual_leave_used', 'Cuti Tahunan Terpakai')}
                </span>
                <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white font-mono">
                    {annualUsed}
                  </span>
                  <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{t('days', 'Hari')}</span>
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  {t('leave_used_desc', 'Telah disetujui & disahkan secara resmi oleh HR Administrator')}
                </p>
              </div>
            </div>

            {/* Card 3: Izin Sakit & Izin Khusus */}
            <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col justify-between transition-colors sm:col-span-2 lg:col-span-1 group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  {t('sick_special_quota', 'Izin Sakit & Khusus')}
                </span>
                <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/60">
                  <Calendar className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{t('quota_sick_short', 'Izin Sakit')}</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {sickRemaining} / {sickTotal} {t('days', 'Hari')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600 dark:text-slate-400">{t('timeoff_special_label', 'Izin Khusus')}</span>
                  <span className="font-bold text-slate-900 dark:text-white font-mono">
                    {specialRemaining} / {specialTotal} {t('days', 'Hari')}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 pt-0.5 border-t border-slate-100 dark:border-slate-800">
                  {t('medical_letter_note', 'Memerlukan surat keterangan dokter atau dokumen pendukung')}
                </p>
              </div>
            </div>
          </div>

          {/* Requests List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-5 sm:p-6 transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-4">
              {t('my_requests_title')}
            </h3>
            {userLeaveRequests.length === 0 ? (
              <div className="text-center py-10 text-slate-400 dark:text-slate-500 text-xs">
                <CalendarCheck className="w-10 h-10 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p>{t('no_leaves_found')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userLeaveRequests.map((req) => {
                  const applicantName = req.employeeName || req.userName || req.user?.name || currentUser?.name || 'Karyawan';
                  const applicantDept = req.department || currentUser?.department || 'Staf';
                  const initials = applicantName.slice(0, 2).toUpperCase();

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Applicant Avatar & Badge */}
                        <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800 shadow-2xs mt-0.5">
                          {req.avatar ? (
                            <img src={req.avatar} alt={applicantName} className="w-full h-full rounded-2xl object-cover" />
                          ) : (
                            <span className="text-xs">{initials}</span>
                          )}
                        </div>

                        <div className="space-y-1">
                          {/* Applicant Name & Leave Type */}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {applicantName}
                            </span>
                            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                              • {applicantDept}
                            </span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {req.typeLabel}
                            </span>
                          </div>

                          {/* Date Range & Total Days */}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium font-mono">
                              {req.startDate} {t('date_range_to', 's/d')} {req.endDate}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {req.totalDays} {t('days', 'Hari')}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 italic">
                            "{req.reason}"
                          </p>
                          {req.attachmentName && (
                            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                              📎 {t('attachment', 'Lampiran')}: {req.attachmentName}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        {/* Status Badge */}
                        <div>
                          {req.status === 'pending_leader' && (
                            <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                              {t('leave_status_pending_leader')}
                            </span>
                          )}
                          {req.status === 'pending_hr' && (
                            <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold">
                              {t('leave_status_pending_hr')}
                            </span>
                          )}
                          {req.status === 'pending' && (
                            <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                              {t('tab_pending')}
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                              {t('leave_status_approved')} ({req.approvedByHr?.hrName || req.approvedBy || 'HR'})
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                              {t('leave_status_rejected')} ({req.rejectedReason || t('requirements_not_met', 'Persyaratan tidak sesuai')})
                            </span>
                          )}
                        </div>

                        {/* Detail Button */}
                        <button
                          type="button"
                          onClick={() => setSelectedLeave(req)}
                          className="p-1.5 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title={t('view_detail')}
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline">{t('view_detail')}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: SHIFT SWITCH REQUESTS */}
      {/* ==================================================================== */}
      {activeTab === 'switches' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Top Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft transition-colors">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {t('my_switch_requests_title', 'Permohonan Tukar Shift')}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('my_switch_requests_subtitle', 'Pantau status permohonan ganti jadwal kerja yang telah diajukan ke Leader')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSwitchModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 self-start sm:self-center transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t('request_shift_switch', 'Ajukan Tukar Shift')}</span>
            </button>
          </div>

          {/* Switch Requests List */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-5 sm:p-6 transition-colors">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-4">
              {t('my_shift_requests_list', 'Daftar Pengajuan Tukar Shift Saya')}
            </h3>

            {(!userShiftSwitches || userShiftSwitches.length === 0) ? (
              <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/80">
                <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('no_switch_requests', 'Belum Ada Permohonan Tukar Shift')}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-sm mx-auto">
                  {t('no_switch_requests_desc', 'Anda belum mengajukan permohonan ganti jadwal. Jika berhalangan pada jadwal saat ini, klik tombol "Ajukan Tukar Shift".')}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {userShiftSwitches.map((req) => {
                  const applicantName = req.userName || req.user_name || req.user?.name || currentUser?.name || 'Karyawan';
                  const applicantDept = req.userDepartment || currentUser?.department || 'Staf';
                  const initials = applicantName.slice(0, 2).toUpperCase();

                  const origShiftName = req.originalShift?.name || req.originalShiftName || t('original_shift', 'Shift Asal');
                  const origShiftCode = req.originalShift?.code || req.originalShiftCode || 'REG';
                  const origStart = req.originalShift?.startTime || req.originalStartTime || '-';
                  const origEnd = req.originalShift?.endTime || req.originalEndTime || '-';

                  const reqShiftName = req.requestedShift?.name || req.requestedShiftName || t('shift_requested_new', 'Shift Baru');
                  const reqShiftCode = req.requestedShift?.code || req.requestedShiftCode || 'NEW';
                  const reqStart = req.requestedShift?.startTime || req.requestedStartTime || '-';
                  const reqEnd = req.requestedShift?.endTime || req.requestedEndTime || '-';

                  const targetDateStr = req.targetDate || req.target_date;
                  const dayName = getDayName(targetDateStr, language);

                  return (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          {/* Applicant Avatar & Badge */}
                          <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-extrabold flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800 shadow-2xs mt-0.5">
                            {req.avatar ? (
                              <img src={req.avatar} alt={applicantName} className="w-full h-full rounded-2xl object-cover" />
                            ) : (
                              <span className="text-xs">{initials}</span>
                            )}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {applicantName}
                              </span>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                • {applicantDept}
                              </span>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                #{req.id}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                                {dayName}, {targetDateStr}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="self-start sm:self-center shrink-0">
                          {req.status === 'pending_leader' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>{t('status_pending_leader', 'Menunggu Persetujuan Leader')}</span>
                            </span>
                          )}
                          {(req.status === 'pending_hr' || (req.status === 'pending' && !req.userLeaderId)) && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <span>{t('status_pending_hr', 'Menunggu Persetujuan Final HR')}</span>
                            </span>
                          )}
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{t('status_approved', 'Disetujui')}</span>
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>{t('status_rejected', 'Ditolak')}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Shift Comparison */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                            {t('shift_scheduled_orig', 'Shift Terjadwal Semula')}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              [{origShiftCode}] {origShiftName}
                            </span>
                            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                              {origStart} - {origEnd}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                            {t('shift_requested_new', 'Shift Baru Yang Diminta')}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                              [{reqShiftCode}] {reqShiftName}
                            </span>
                            <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                              {reqStart} - {reqEnd}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reason & Rejection Reason */}
                      <div className="text-xs space-y-1 pt-1">
                        <p className="text-slate-600 dark:text-slate-300 italic">
                          <span className="font-semibold not-italic text-slate-700 dark:text-slate-200">
                            {t('label_reason', 'Alasan:')}{' '}
                          </span>
                          "{req.reason}"
                        </p>
                        {req.status === 'rejected' && (req.rejectionReason || req.rejection_reason) && (
                          <p className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {t('label_rejection_reason', 'Alasan Penolakan:')} {req.rejectionReason || req.rejection_reason}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: ATTENDANCE CORRECTIONS */}
      {/* ==================================================================== */}
      {activeTab === 'corrections' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft transition-colors">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('attendance_corrections_title', 'Pengajuan Koreksi Presensi')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('attendance_corrections_subtitle', 'Ajukan permohonan koreksi jam masuk atau pulang jika lupa absen atau terjadi kendala sistem.')}
            </p>
          </div>
          <AttendanceCorrectionTable />
        </div>
      )}

      {/* Leave Creation Modal */}
      <TimeOffModal isOpen={isLeaveModalOpen} onClose={() => setIsLeaveModalOpen(false)} />

      {/* Leave Detail Modal */}
      <LeaveDetailModal
        leave={
          selectedLeave
            ? userLeaveRequests.find((l) => l.id === selectedLeave.id) || selectedLeave
            : null
        }
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
      />

      {/* Shift Switch Creation Modal */}
      <ShiftSwitchRequestModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
      />
    </div>
  );
}
