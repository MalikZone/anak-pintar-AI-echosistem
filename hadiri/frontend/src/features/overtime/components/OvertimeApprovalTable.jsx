import React, { useState } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Coins,
  Search,
  User,
  AlertCircle,
  FileText
} from 'lucide-react';

export default function OvertimeApprovalTable() {
  const { overtimeRequests, approveOvertime, rejectOvertime, fetchOvertimeRequests, currentUser } = useAttendance();
  const { t, language, getDayName } = useLanguage();
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  const getTypeBadgeLabel = (type, typeLabel) => {
    if (type === 'holiday') return t('ot_type_holiday', 'Hari Libur / Tanggal Merah');
    if (type === 'pre') return t('ot_type_pre', 'Sebelum Jam Kerja (Pre-Shift)');
    if (type === 'regular' || type === 'after') return t('ot_type_regular', 'Setelah Jam Kerja (Regular)');
    return typeLabel || t('ot_type_regular', 'Lembur');
  };

  React.useEffect(() => {
    fetchOvertimeRequests();
  }, [fetchOvertimeRequests]);

  const filtered = overtimeRequests.filter((item) => {
    const matchStatus =
      filterStatus === 'all'
        ? true
        : filterStatus === 'pending'
        ? item.status === 'pending' || item.status === 'pending_hr' || item.status === 'pending_leader'
        : item.status === filterStatus;
    const matchSearch =
      (item.employeeName || item.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.splNumber || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  const pendingTotal = overtimeRequests.filter(
    (r) => r.status === 'pending' || r.status === 'pending_hr' || r.status === 'pending_leader'
  ).length;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-full border border-amber-200 dark:border-amber-800">
              {t('ot_approval_badge')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">• {t('ot_approval_subtag')}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{t('ot_approval_title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('ot_approval_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-amber-50 dark:bg-amber-950/50 px-3.5 py-2 rounded-2xl border border-amber-200/80 dark:border-amber-800 text-amber-900 dark:text-amber-200">
            <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-300 block tracking-wider">{t('ot_pending_response')}</span>
            <span className="text-lg font-extrabold font-mono">{pendingTotal} {t('ot_stat_requests_count')}</span>
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
              placeholder={t('ot_search_placeholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 focus:outline-none"
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
              {t('filter_all')} ({overtimeRequests.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('ot_filter_needs_review')} ({pendingTotal})
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
              {t('tab_approved')}
            </button>
          </div>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-400 dark:text-slate-500">
            <CheckSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('ot_no_filtered')}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((req) => (
              <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  
                  {/* Employee & Overtime Info */}
                  <div className="flex items-start gap-3.5">
                    <img
                      src={req.avatar}
                      alt={req.employeeName}
                      className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0 mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">{req.employeeName}</span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">• {req.department}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {req.splNumber}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                        <span className="text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200/60 dark:border-amber-800 font-semibold">
                          {getTypeBadgeLabel(req.type, req.typeLabel)}
                        </span>
                        <span>•</span>
                        <span>{t('period')}: {getDayName(req.date || req.dayName, language)}, {req.date}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {req.startTime} - {req.endTime} WIB ({req.durationHours} {t('hours')})
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 italic bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                        "{req.reason}"
                      </p>
                    </div>
                  </div>

                  {/* Right Side: Estimated Rate & Actions */}
                  <div className="flex flex-wrap items-center justify-between lg:justify-end gap-4 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="text-left lg:text-right">
                      <span className="text-[10px] text-slate-400 block font-medium">{t('ot_wage_burden')}</span>
                      <span className="text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
                        Rp {req.estimatedRateIDR?.toLocaleString('id-ID')}
                      </span>
                    </div>

                    {req.status === 'pending_leader' ? (
                      <div className="text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          <span>{t('ot_pending_leader', 'Menunggu Persetujuan Leader')}</span>
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t('need_leader_acc', 'Perlu persetujuan Atasan Langsung (Tahap 1)')}</p>
                      </div>
                    ) : (req.status === 'pending_hr' || req.status === 'pending') ? (
                      req.userId === currentUser?.id ? (
                        <div className="text-right">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold" title="Tidak dapat menyetujui lembur sendiri">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>{t('self_request_waiting_other', 'Permohonan Anda (Menunggu HR Lain / Atasan)')}</span>
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const reason = await toast.prompt({
                                title: t('ot_reject_title', 'Tolak Pengajuan Lembur'),
                                message: t('ot_reject_prompt_msg', 'Alasan penolakan pengajuan lembur:'),
                                defaultValue: t('ot_reject_default_reason', 'Beban tugas belum mendesak'),
                                confirmText: t('btn_reject_ot', 'Tolak Lembur'),
                                variant: 'danger',
                              });
                              if (reason !== null) {
                                await rejectOvertime(req.id, reason);
                                toast.info(t('ot_rejected_toast', 'Pengajuan lembur telah ditolak'));
                              }
                            }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>{t('btn_reject')}</span>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const confirmed = await toast.confirm({
                                title: t('ot_approve_title', 'Setujui Lembur'),
                                message: t('ot_approve_confirm_msg', { name: req.userName || req.employeeName || 'karyawan', hours: req.durationHours || 0 }),
                                confirmText: t('ot_btn_approve', 'Setujui Lembur'),
                                variant: 'success',
                              });
                              if (confirmed) {
                                await approveOvertime(req.id);
                                toast.success(t('ot_approved_toast', 'Pengajuan lembur berhasil disetujui'));
                              }
                            }}
                            className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{t('ot_btn_approve')}</span>
                          </button>
                        </div>
                      )
                    ) : (
                      <div>
                        {req.status === 'approved' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            {t('leave_status_approved')} ({req.approvedBy || 'HR'})
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                            <XCircle className="w-4 h-4 text-rose-600" />
                            {t('leave_status_rejected')} ({req.rejectionReason || req.rejectedReason || 'HR'})
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
