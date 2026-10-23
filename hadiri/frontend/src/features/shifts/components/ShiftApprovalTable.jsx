import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import {
  Repeat,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';

export default function ShiftApprovalTable() {
  const {
    hrPendingSwitches,
    fetchHrPendingSwitches,
    hrReviewShiftSwitch,
    currentUser,
  } = useAttendance();
  const { t, language, getDayName } = useLanguage();
  const toast = useToast();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    fetchHrPendingSwitches({ force: true });
  }, [fetchHrPendingSwitches]);

  const switchesList = hrPendingSwitches || [];

  const pendingHrTotal = switchesList.filter(
    (s) => s.status === 'pending_hr' || (s.status === 'pending' && !s.userLeaderId)
  ).length;

  const filtered = switchesList.filter((item) => {
    const isPendingHr = item.status === 'pending_hr' || (item.status === 'pending' && !item.userLeaderId);
    const matchStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending_hr'
        ? isPendingHr
        : item.status === filterStatus;

    const query = searchTerm.toLowerCase();
    const matchSearch =
      (item.userName || item.name || '').toLowerCase().includes(query) ||
      (item.userDepartment || item.department || '').toLowerCase().includes(query) ||
      (item.id || '').toLowerCase().includes(query) ||
      (item.requestedShiftName || '').toLowerCase().includes(query) ||
      (item.originalShiftName || '').toLowerCase().includes(query);

    return matchStatus && matchSearch;
  });

  const handleApprove = async (req) => {
    if (isProcessing) return;
    const confirmed = await toast.confirm({
      title: t('shift_approve_title', 'Setujui Tukar Shift'),
      message: t('shift_approve_confirm_msg', {
        name: req.userName || req.name || 'karyawan',
        date: req.targetDate,
      }),
      confirmText: t('btn_approve_final', 'Setujui Final (ACC)'),
      variant: 'success',
    });

    if (confirmed) {
      try {
        setIsProcessing(true);
        await hrReviewShiftSwitch(req.id, 'approved');
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async (req) => {
    if (isProcessing) return;
    const reason = await toast.prompt({
      title: t('shift_reject_title', 'Tolak Tukar Shift'),
      message: t('shift_reject_prompt_msg', 'Alasan penolakan permohonan tukar shift:'),
      defaultValue: t('shift_reject_default_reason', 'Kebutuhan operasional belum memungkinkan'),
      confirmText: t('btn_reject_shift', 'Tolak Permohonan'),
      variant: 'danger',
    });

    if (reason !== null && reason.trim()) {
      try {
        setIsProcessing(true);
        await hrReviewShiftSwitch(req.id, 'rejected', reason.trim());
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              {t('shift_approval_badge', 'Validasi Jadwal Dinamis')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              • {t('shift_approval_subtag', 'Tahap 2 Persetujuan HR')}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {t('shift_approval_title', 'Persetujuan Tukar Shift Karyawan')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('shift_approval_subtitle', 'Verifikasi dan finalisasi permohonan pergantian shift kerja yang telah disetujui Leader tim')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 dark:bg-indigo-950/50 px-3.5 py-2 rounded-2xl border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
            <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block tracking-wider">
              {t('shift_pending_response', 'Menunggu Finalisasi HR')}
            </span>
            <span className="text-lg font-extrabold font-mono">
              {pendingHrTotal} {t('shift_stat_requests_count', 'Permohonan')}
            </span>
          </div>
        </div>
      </div>

      {/* Main List & Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
        {/* Search & Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={t('shift_search_placeholder', 'Cari nama karyawan, departemen, atau shift...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterStatus('all')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('filter_all', 'Semua')} ({switchesList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending_hr')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'pending_hr'
                  ? 'bg-white dark:bg-slate-700 text-indigo-800 dark:text-indigo-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('shift_filter_needs_review', 'Perlu ACC Final HR')} ({pendingHrTotal})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('approved')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'approved'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('tab_approved', 'Disetujui')}
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('rejected')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'rejected'
                  ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('tab_rejected', 'Ditolak')}
            </button>
          </div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <CheckSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              {t('shift_no_filtered', 'Tidak ada permohonan tukar shift yang sesuai filter')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((req) => {
              const dayName = getDayName(req.targetDate, language);
              const isSelf = req.userId === currentUser?.id;
              const isPendingHr = req.status === 'pending_hr' || (req.status === 'pending' && !req.userLeaderId);

              const origStart = req.originalStartTime?.slice(0, 5) || '--:--';
              const origEnd = req.originalEndTime?.slice(0, 5) || '--:--';
              const reqStart = req.requestedStartTime?.slice(0, 5) || '--:--';
              const reqEnd = req.requestedEndTime?.slice(0, 5) || '--:--';

              return (
                <div
                  key={req.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Employee & Switch Detail */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center shrink-0">
                          <Repeat className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {req.userName || req.name || 'Karyawan'}
                            </span>
                            {(req.userDepartment || req.department) && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                • {req.userDepartment || req.department}
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              #{req.id}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                              {dayName}, {req.targetDate}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Shift Comparison Box */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-w-2xl">
                        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                            {t('shift_scheduled_orig', 'Shift Terjadwal Semula')}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              [{req.originalShiftCode || 'REG'}] {req.originalShiftName || 'Regular'}
                            </span>
                            <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                              {origStart} - {origEnd}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/60">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 mb-1">
                            {t('shift_requested_new', 'Shift Baru Yang Diminta')}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-900 dark:text-indigo-200">
                              [{req.requestedShiftCode || 'NEW'}] {req.requestedShiftName}
                            </span>
                            <span className="text-xs font-mono font-bold text-indigo-700 dark:text-indigo-300">
                              {reqStart} - {reqEnd}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Reason & Leader Status Note */}
                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-semibold not-italic text-slate-700 dark:text-slate-200">
                            {t('label_reason', 'Alasan:')}{' '}
                          </span>
                          "{req.reason}"
                        </p>

                        {isPendingHr && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>
                              {t('ready_hr_stage2', 'Siap Di-approve HR (Tahap 2)')} • {t('approved_by_leader_check', '✓ Disetujui Leader')}
                            </span>
                          </div>
                        )}

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

                    {/* Right Side: Actions or Status Badges */}
                    <div className="flex flex-wrap items-center justify-start lg:justify-end gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      {req.status === 'pending_leader' ? (
                        <div className="text-left lg:text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>{t('status_pending_leader', 'Menunggu Persetujuan Leader')}</span>
                          </span>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                            {t('need_leader_acc', 'Perlu persetujuan Atasan Langsung (Tahap 1)')}
                          </p>
                        </div>
                      ) : isPendingHr ? (
                        isSelf ? (
                          <div className="text-left lg:text-right">
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold"
                              title="Tidak dapat menyetujui request sendiri"
                            >
                              <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                              <span>{t('self_request_waiting_other', 'Permohonan Anda (Menunggu HR Lain / Atasan)')}</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleReject(req)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>{t('btn_reject', 'Tolak')}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleApprove(req)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{t('btn_approve_final', 'Setujui Final (ACC)')}</span>
                            </button>
                          </div>
                        )
                      ) : (
                        <div>
                          {req.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>{t('status_approved', 'Disetujui')}</span>
                            </span>
                          )}
                          {req.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>{t('status_rejected', 'Ditolak')}</span>
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
