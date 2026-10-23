import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import {
  X,
  Calendar,
  Clock,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldCheck,
  User,
  FileEdit,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

export default function AttendanceCorrectionDetailModal({ isOpen, onClose, correction }) {
  const { t, language, getDayName, formatDate } = useLanguage();

  if (!isOpen || !correction) return null;

  const isPendingLeader = correction.status === 'pending_leader';
  const isPendingHr = correction.status === 'pending_hr';
  const isApproved = correction.status === 'approved';
  const isRejected = correction.status === 'rejected';

  // Determine which step rejected if status is rejected
  const rejectedAtStage = isRejected
    ? correction.approvedByLeaderId
      ? 3 // HR rejected after leader approval
      : 2 // Leader rejected at stage 2
    : null;

  const getCorrectionTypeLabel = (type) => {
    switch (type) {
      case 'clock_in':
        return t('corr_type_in', 'Jam Masuk');
      case 'clock_out':
        return t('corr_type_out', 'Jam Pulang');
      default:
        return t('corr_type_both', 'Masuk & Pulang');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-bold">
                #{correction.id}
              </span>
              <span className="text-xs text-slate-400 font-medium">
                • {t('corr_tracking_title', 'Pelacakan Alur Koreksi Presensi')}
              </span>
            </div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {t('attendance_corrections_title', 'Detail Koreksi Presensi')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('corr_tracking_subtitle', 'Pantau histori dan tahapan persetujuan koreksi jam masuk/pulang secara transparan')}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Overview Card */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-500" />
              <span className="font-bold text-sm text-slate-900 dark:text-white">
                {getDayName(correction.date, language)}, {correction.date}
              </span>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {getCorrectionTypeLabel(correction.correctionType)}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {t('corr_proposed_hours', 'Jam Yang Diajukan')}
              </span>
              <div className="flex items-center gap-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>{correction.proposedClockIn ? `${correction.proposedClockIn} WIB` : '—'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                <span>{correction.proposedClockOut ? `${correction.proposedClockOut} WIB` : '—'}</span>
              </div>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/60 dark:border-slate-800 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                {t('col_status', 'Status Keseluruhan')}
              </span>
              <div>
                {isApproved && (
                  <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('corr_badge_stage_done', 'Disahkan & Disinkronkan')}</span>
                  </span>
                )}
                {isRejected && (
                  <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                    <XCircle className="w-4 h-4" />
                    <span>{t('corr_badge_stage_rejected', 'Ditolak')}</span>
                  </span>
                )}
                {isPendingHr && (
                  <span className="inline-flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}</span>
                  </span>
                )}
                {isPendingLeader && (
                  <span className="inline-flex items-center gap-1 font-bold text-amber-600 dark:text-amber-400">
                    <AlertCircle className="w-4 h-4" />
                    <span>{t('corr_badge_stage1_leader', 'Tahap 1: Menunggu Leader')}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1 text-xs pt-1">
            <p className="text-slate-600 dark:text-slate-300 italic">
              <strong className="not-italic text-slate-700 dark:text-slate-200 font-semibold mr-1">
                {t('label_reason', 'Alasan:')}
              </strong>
              "{correction.reason}"
            </p>
            {correction.attachmentUrl && (
              <a
                href={correction.attachmentUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline pt-1"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{t('corr_view_proof', 'Lihat Bukti / Lampiran Dokumen')}</span>
              </a>
            )}
          </div>
        </div>

        {/* Stepper / Timeline Workflow */}
        <div className="space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('workflow_timeline', 'Alur Persetujuan Berjenjang')}
          </h4>

          <div className="space-y-4 relative before:absolute before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            
            {/* STAGE 1: SUBMISSION */}
            <div className="flex items-start gap-4 relative">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500 flex items-center justify-center shrink-0 z-10 shadow-xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="flex-1 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {t('corr_timeline_stage1', 'Tahap 1: Pengajuan Karyawan')}
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    ✓ {t('status_submitted', 'Terkirim')}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t('corr_timeline_stage1_desc', 'Permohonan berhasil dikirim oleh karyawan')}
                </p>
                {correction.createdAt && (
                  <p className="text-[10px] text-slate-400 font-mono pt-0.5">
                    {new Date(correction.createdAt).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* STAGE 2: LEADER REVIEW */}
            <div className="flex items-start gap-4 relative">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-xs ${
                  rejectedAtStage === 2
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-2 border-rose-500'
                    : isPendingLeader
                    ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-2 border-amber-500 animate-pulse'
                    : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500'
                }`}
              >
                {rejectedAtStage === 2 ? (
                  <XCircle className="w-5 h-5" />
                ) : isPendingLeader ? (
                  <AlertCircle className="w-5 h-5" />
                ) : (
                  <CheckCircle2 className="w-5 h-5" />
                )}
              </div>

              <div className="flex-1 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {t('corr_timeline_stage2', 'Tahap 2: Review Leader / Atasan Langsung')}
                  </span>
                  <div>
                    {rejectedAtStage === 2 && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        ✕ {t('status_rejected', 'Ditolak')}
                      </span>
                    )}
                    {isPendingLeader && (
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
                        ⏳ {t('status_in_review', 'Menunggu Review')}
                      </span>
                    )}
                    {(isPendingHr || isApproved || rejectedAtStage === 3) && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ {t('status_approved', 'Disetujui')}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {rejectedAtStage === 2
                    ? t('corr_timeline_stage2_rejected', 'Ditolak oleh Leader')
                    : isPendingLeader
                    ? t('corr_timeline_stage2_pending', 'Menunggu peninjauan dan persetujuan Leader')
                    : t('corr_timeline_stage2_approved', 'Disetujui oleh Leader dan diteruskan ke HR Admin')}
                </p>

                {correction.leaderName && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{correction.leaderName}</span>
                  </div>
                )}

                {correction.leaderNotes && (
                  <p className="text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-slate-600 dark:text-slate-300 italic border border-slate-200/60 dark:border-slate-700/60">
                    "{correction.leaderNotes}"
                  </p>
                )}

                {rejectedAtStage === 2 && correction.rejectionReason && (
                  <p className="text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-700 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-800">
                    ⚠️ {correction.rejectionReason}
                  </p>
                )}

                {correction.leaderApprovedAt && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    {new Date(correction.leaderApprovedAt).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}
              </div>
            </div>

            {/* STAGE 3: HR ENDORSEMENT & DB SYNC */}
            <div className="flex items-start gap-4 relative">
              <div
                className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 z-10 shadow-xs ${
                  rejectedAtStage === 3
                    ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-2 border-rose-500'
                    : isApproved
                    ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-2 border-emerald-500'
                    : isPendingHr
                    ? 'bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border-2 border-blue-500 animate-pulse'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border-2 border-slate-300 dark:border-slate-700'
                }`}
              >
                {rejectedAtStage === 3 ? (
                  <XCircle className="w-5 h-5" />
                ) : isApproved ? (
                  <ShieldCheck className="w-5 h-5" />
                ) : isPendingHr ? (
                  <Clock className="w-5 h-5" />
                ) : (
                  <Clock className="w-5 h-5 opacity-40" />
                )}
              </div>

              <div className="flex-1 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {t('corr_timeline_stage3', 'Tahap 3: Pengesahan HR & Sinkronisasi DB')}
                  </span>
                  <div>
                    {rejectedAtStage === 3 && (
                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                        ✕ {t('status_rejected', 'Ditolak HR')}
                      </span>
                    )}
                    {isPendingHr && (
                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                        ⏳ {t('status_waiting_hr', 'Menunggu HR')}
                      </span>
                    )}
                    {isApproved && (
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        ✓ {t('status_approved_synced', 'Disahkan & Disinkronkan')}
                      </span>
                    )}
                    {isPendingLeader && (
                      <span className="text-[10px] text-slate-400 font-medium">
                        {t('corr_stage_waiting_previous', 'Menunggu tahap sebelumnya')}
                      </span>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {rejectedAtStage === 3
                    ? t('corr_timeline_stage3_rejected', 'Ditolak oleh HR Administrator')
                    : isApproved
                    ? t('corr_timeline_stage3_approved', 'Telah disahkan oleh HR & database presensi otomatis disinkronkan')
                    : isPendingHr
                    ? t('corr_timeline_stage3_pending', 'Menunggu pengesahan final dan update data oleh HR')
                    : t('corr_stage_waiting_previous', 'Menunggu persetujuan Leader terlebih dahulu')}
                </p>

                {correction.hrName && (
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 dark:text-slate-300 pt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                    <span>{correction.hrName}</span>
                  </div>
                )}

                {correction.hrNotes && (
                  <p className="text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl text-slate-600 dark:text-slate-300 italic border border-slate-200/60 dark:border-slate-700/60">
                    "{correction.hrNotes}"
                  </p>
                )}

                {rejectedAtStage === 3 && correction.rejectionReason && (
                  <p className="text-[11px] bg-rose-50 dark:bg-rose-950/40 p-2 rounded-xl text-rose-700 dark:text-rose-300 font-medium border border-rose-200 dark:border-rose-800">
                    ⚠️ {correction.rejectionReason}
                  </p>
                )}

                {correction.hrApprovedAt && (
                  <p className="text-[10px] text-slate-400 font-mono">
                    {new Date(correction.hrApprovedAt).toLocaleString(language === 'id' ? 'id-ID' : 'en-US', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </p>
                )}

                {isApproved && (
                  <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                    <span>{t('attendance_updated_in_db', 'Data presensi karyawan pada database telah disinkronkan.')}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
          >
            {t('btn_close', 'Tutup')}
          </button>
        </div>

      </div>
    </div>
  );
}

