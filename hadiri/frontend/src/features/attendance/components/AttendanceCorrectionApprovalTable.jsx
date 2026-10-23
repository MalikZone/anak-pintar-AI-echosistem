import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import {
  FileEdit,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  AlertCircle,
  Calendar,
  ArrowRight,
  ShieldCheck,
  CheckSquare,
  Eye,
} from 'lucide-react';
import AttendanceCorrectionDetailModal from './AttendanceCorrectionDetailModal';

export default function AttendanceCorrectionApprovalTable() {
  const {
    hrPendingCorrections,
    fetchHrPendingCorrections,
    hrActionCorrection,
    currentUser,
  } = useAttendance();
  const { t, language, getDayName } = useLanguage();
  const toast = useToast();

  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [trackingCorrection, setTrackingCorrection] = useState(null);

  useEffect(() => {
    fetchHrPendingCorrections({ force: true });
  }, [fetchHrPendingCorrections]);

  const correctionsList = hrPendingCorrections || [];

  const pendingHrTotal = correctionsList.filter(
    (item) => item.status === 'pending_hr' && item.userId !== currentUser?.id
  ).length;

  const filtered = correctionsList.filter((item) => {
    const isPendingHr = item.status === 'pending_hr';
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
      (item.reason || '').toLowerCase().includes(query);

    return matchStatus && matchSearch;
  });

  const handleApprove = async (item) => {
    if (isProcessing) return;
    const confirmed = await toast.confirm({
      title: t('corr_approve_hr_title', 'Sahkan Koreksi Presensi'),
      message: t('corr_approve_hr_confirm_msg', {
        name: item.userName || 'karyawan',
        date: item.date,
      }) || `Sahkan koreksi presensi ${item.userName} untuk tanggal ${item.date}? Data presensi karyawan akan otomatis diperbarui dan disinkronkan ke database.`,
      confirmText: t('btn_approve_and_sync', 'Sahkan & Sinkronkan Presensi'),
      cancelText: t('btn_cancel', 'Batal'),
      variant: 'success',
    });

    if (confirmed) {
      try {
        setIsProcessing(true);
        await hrActionCorrection(item.id, {
          action: 'approve',
          notes: 'Disahkan secara resmi oleh HR Administrator',
        });
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleReject = async (item) => {
    if (isProcessing) return;
    const reason = await toast.prompt({
      title: t('corr_reject_hr_title', 'Tolak Koreksi Presensi'),
      message: t('corr_reject_hr_prompt_msg', 'Masukkan alasan penolakan koreksi presensi:'),
      defaultValue: t('corr_reject_hr_default_reason', 'Keterangan atau bukti kehadiran tidak valid'),
      confirmText: t('btn_reject', 'Tolak Pengajuan'),
      variant: 'danger',
    });

    if (reason !== null && reason.trim()) {
      try {
        setIsProcessing(true);
        await hrActionCorrection(item.id, {
          action: 'reject',
          rejectReason: reason.trim(),
        });
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
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              {t('corr_approval_badge', 'Validasi Presensi & Koreksi')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              • {t('corr_approval_subtag', 'Tahap 2 Pengesahan HR Final')}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {t('corr_approval_title', 'Persetujuan Koreksi Presensi Karyawan')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('corr_approval_subtitle', 'Verifikasi dan finalisasi permohonan koreksi jam masuk/pulang yang telah diverifikasi atasan')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-blue-50 dark:bg-blue-950/50 px-3.5 py-2 rounded-2xl border border-blue-200/80 dark:border-blue-800 text-blue-900 dark:text-blue-200">
            <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 block tracking-wider">
              {t('corr_pending_response', 'Menunggu Pengesahan HR')}
            </span>
            <span className="text-lg font-extrabold font-mono">
              {pendingHrTotal} {t('corr_stat_requests_count', 'Pengajuan')}
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
              placeholder={t('corr_search_placeholder', 'Cari nama karyawan, divisi, atau alasan...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
              {t('filter_all', 'Semua')} ({correctionsList.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterStatus('pending_hr')}
              className={`px-3 py-1 rounded-lg transition-all ${
                filterStatus === 'pending_hr'
                  ? 'bg-white dark:bg-slate-700 text-blue-800 dark:text-blue-300 shadow-2xs'
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
              {t('corr_no_filtered', 'Tidak ada permohonan koreksi presensi yang sesuai filter')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((item) => {
              const dayName = getDayName(item.date, language);
              const isSelf = item.userId === currentUser?.id;
              const isPendingHr = item.status === 'pending_hr';

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Employee & Correction Detail */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center shrink-0">
                          {item.avatar ? (
                            <img
                              src={item.avatar}
                              alt={item.userName}
                              className="w-full h-full rounded-2xl object-cover"
                            />
                          ) : (
                            <FileEdit className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          )}
                        </div>

                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {item.userName || 'Karyawan'}
                            </span>
                            {(item.userDepartment || item.department) && (
                              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                • {item.userDepartment || item.department}
                              </span>
                            )}
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                              #{item.id}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              {item.correctionType === 'clock_in'
                                ? t('corr_type_in', 'Jam Masuk')
                                : item.correctionType === 'clock_out'
                                ? t('corr_type_out', 'Jam Pulang')
                                : t('corr_type_both', 'Masuk & Pulang')}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <Calendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span className="font-semibold text-blue-600 dark:text-blue-400 font-mono">
                              {dayName}, {item.date}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Proposed Times Box */}
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 max-w-xl">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                          {t('corr_proposed_hours', 'Jam Koreksi Yang Diajukan')}
                        </p>
                        <div className="flex items-center gap-4 text-xs font-mono">
                          <div>
                            <span className="text-slate-400 text-[11px] block">{t('clock_in', 'Jam Masuk')}:</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-sm">
                              {item.proposedClockIn ? `${item.proposedClockIn} WIB` : '-'}
                            </strong>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 mt-3" />
                          <div>
                            <span className="text-slate-400 text-[11px] block">{t('clock_out', 'Jam Pulang')}:</span>
                            <strong className="text-slate-800 dark:text-slate-200 text-sm">
                              {item.proposedClockOut ? `${item.proposedClockOut} WIB` : '-'}
                            </strong>
                          </div>
                        </div>
                      </div>

                      {/* Reason & Verification Notes */}
                      <div className="space-y-1.5 text-xs">
                        <p className="text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="font-semibold not-italic text-slate-700 dark:text-slate-200">
                            {t('label_reason', 'Alasan:')}{' '}
                          </span>
                          "{item.reason}"
                        </p>

                        {item.attachmentUrl && (
                          <a
                            href={item.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                          >
                            📎 {t('corr_view_proof', 'Lihat Bukti / Lampiran')}
                          </a>
                        )}

                        {isPendingHr && (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>
                              {item.leaderNotes
                                ? `${t('approved_by_leader_check', '✓ Disetujui Leader')}: "${item.leaderNotes}"`
                                : t('approved_by_leader_check', '✓ Disetujui Leader')}
                            </span>
                          </div>
                        )}

                        {item.status === 'rejected' && (item.rejectionReason || item.rejection_reason) && (
                          <p className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              {t('label_rejection_reason', 'Alasan Penolakan:')} {item.rejectionReason || item.rejection_reason}
                            </span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right Side: Actions or Status Badges */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
                      {isPendingHr ? (
                        isSelf ? (
                          <div className="text-left lg:text-right">
                            <span
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold"
                              title="Tidak dapat menyetujui koreksi sendiri"
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
                              onClick={() => handleReject(item)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>{t('btn_reject', 'Tolak')}</span>
                            </button>
                            <button
                              type="button"
                              disabled={isProcessing}
                              onClick={() => handleApprove(item)}
                              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{t('btn_approve_and_sync', 'Sahkan & Sinkronkan Presensi')}</span>
                            </button>
                          </div>
                        )
                      ) : (
                        <div className="flex items-center gap-2">
                          {item.status === 'approved' && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              <span>{t('status_approved_synced', 'Disahkan & Disinkronkan')}</span>
                            </span>
                          )}
                          {item.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                              <XCircle className="w-4 h-4 text-rose-600" />
                              <span>{t('status_rejected', 'Ditolak')}</span>
                            </span>
                          )}
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setTrackingCorrection(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t('btn_track_progress', 'Lacak Alur')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail / Workflow Tracking Modal */}
      <AttendanceCorrectionDetailModal
        isOpen={!!trackingCorrection}
        onClose={() => setTrackingCorrection(null)}
        correction={trackingCorrection}
      />
    </div>
  );
}

