import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  User,
  Building2,
  Sparkles,
  Printer,
  X,
  Eye,
  ShieldCheck,
  ChevronRight,
  ArrowDown,
  Check,
} from 'lucide-react';

export default function LeaveDetailModal({
  leave,
  isOpen,
  onClose,
  onApproveLeader,
  onRejectLeader,
  onApproveHr,
  onRejectHr,
}) {
  const { isHrAdmin, isLeader, user } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !leave) return null;

  // Determine user authority on this specific request (Anti Self-Approval)
  const isSelf = Boolean(user?.id && (leave.userId === user.id || leave.employeeId === user.id));

  const canLeaderAct =
    !isSelf &&
    (isLeader || isHrAdmin) &&
    leave.status === 'pending_leader' &&
    typeof onApproveLeader === 'function';

  const canHrAct =
    !isSelf &&
    isHrAdmin &&
    (leave.status === 'pending_hr' || leave.status === 'pending') &&
    typeof onApproveHr === 'function';

  const handleLeaderApprove = async () => {
    const notes = await toast.prompt({
      title: 'Persetujuan Leader',
      message: `${t('modal_notes_label', 'Catatan persetujuan')} (opsional):`,
      defaultValue: 'Disetujui oleh Leader/Atasan Langsung',
      confirmText: 'Setujui Cuti',
      variant: 'success',
    });
    if (notes === null) return;
    setIsProcessing(true);
    try {
      await onApproveLeader(leave.id, notes);
      toast.success('Permohonan cuti berhasil disetujui');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal memproses persetujuan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLeaderReject = async () => {
    const reason = await toast.prompt({
      title: 'Tolak Permohonan Cuti',
      message: `${t('reason', 'Alasan')} penolakan:`,
      defaultValue: 'Kebutuhan mendesak operasional tim',
      confirmText: 'Tolak Permohonan',
      variant: 'danger',
    });
    if (reason === null) return;
    setIsProcessing(true);
    try {
      await onRejectLeader(leave.id, reason);
      toast.info('Permohonan cuti telah ditolak');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal memproses penolakan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHrApprove = async () => {
    const notes = await toast.prompt({
      title: 'Persetujuan Final HR Admin',
      message: `${t('modal_notes_label', 'Catatan persetujuan')} (opsional):`,
      defaultValue: 'Disetujui oleh HR Administrator',
      confirmText: 'Setujui Cuti',
      variant: 'success',
    });
    if (notes === null) return;
    setIsProcessing(true);
    try {
      await onApproveHr(leave.id, notes);
      toast.success('Permohonan cuti berhasil disetujui secara final');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal memproses persetujuan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleHrReject = async () => {
    const reason = await toast.prompt({
      title: 'Tolak Permohonan Cuti (HR)',
      message: `${t('reason', 'Alasan')} penolakan:`,
      defaultValue: 'Tidak memenuhi persyaratan operasional',
      confirmText: 'Tolak Permohonan',
      variant: 'danger',
    });
    if (reason === null) return;
    setIsProcessing(true);
    try {
      await onRejectHr(leave.id, reason);
      toast.info('Permohonan cuti telah ditolak');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Gagal memproses penolakan');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const status = leave.status;
  const isApproved = status === 'approved';
  const isRejected = status === 'rejected';
  const isPendingLeader = status === 'pending_leader';
  const isPendingHr = status === 'pending_hr' || status === 'pending';

  // Step 2: Leader Review State
  const isLeaderApproved = Boolean(
    leave.approvedByLeader ||
    leave.leaderApprovedAt ||
    leave.approvedByLeaderId ||
    isPendingHr ||
    isApproved
  );

  const isLeaderRejected = Boolean(
    isRejected && (leave.rejectedByLeader || (leave.rejectedBy && String(leave.rejectedBy).toLowerCase().includes('leader')))
  );

  const leaderName =
    leave.approvedByLeader?.leaderName ||
    leave.leaderName ||
    'Leader / Atasan Langsung';

  const leaderApprovedAt =
    leave.approvedByLeader?.approvedAt ||
    leave.leaderApprovedAt ||
    (isLeaderApproved ? (leave.updatedAt ? (typeof leave.updatedAt === 'string' ? leave.updatedAt.slice(0, 10) : new Date(leave.updatedAt).toISOString().slice(0, 10)) : 'Disetujui') : '-');

  const leaderNotes =
    leave.approvedByLeader?.notes ||
    leave.leaderNotes ||
    'Disetujui oleh Leader/Atasan Langsung';

  // Step 3: HR Sign-off State
  const isHrApproved = isApproved;
  const isHrRejected = Boolean(isRejected && !isLeaderRejected);
  const hrName =
    leave.approvedByHr?.hrName ||
    leave.hrName ||
    leave.approvedBy ||
    'HR Administrator';

  const hrApprovedAt =
    leave.approvedByHr?.approvedAt ||
    leave.hrApprovedAt ||
    leave.approvedAt ||
    (isApproved ? (leave.updatedAt ? (typeof leave.updatedAt === 'string' ? leave.updatedAt.slice(0, 10) : new Date(leave.updatedAt).toISOString().slice(0, 10)) : 'Disahkan') : '-');

  const hrNotes =
    leave.approvedByHr?.notes ||
    leave.hrNotes ||
    'Disahkan oleh HR Administrator';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col my-auto transition-all overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">
                  {t('leave_detail_title')}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold">
                  {leave.id}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('leave_detail_subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* Status Header Banner */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-1">
                {t('req_status_label', 'Status Pengajuan')}
              </span>
              <div className="flex items-center gap-2">
                {isPendingLeader && (
                  <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    {t('leave_status_pending_leader')}
                  </span>
                )}
                {isPendingHr && (
                  <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold inline-flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    {t('leave_status_pending_hr')}
                  </span>
                )}
                {isApproved && (
                  <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold inline-flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    {t('leave_status_approved')}
                  </span>
                )}
                {isRejected && (
                  <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold inline-flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                    {t('leave_status_rejected')}
                  </span>
                )}
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 block mb-0.5">
                {t('submitted_at')}
              </span>
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 font-mono">
                {leave.submittedAt || leave.createdAt || '-'}
              </span>
            </div>
          </div>

          {/* Section 1: Applicant Profile */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 mb-3 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t('applicant_info')}</span>
            </h4>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src={
                    leave.avatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
                  }
                  alt={leave.employeeName || leave.userName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-xs shrink-0"
                />
                <div>
                  <h5 className="text-sm font-bold text-slate-900 dark:text-white">
                    {leave.employeeName || leave.userName || user?.name}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {leave.position || leave.department || 'Karyawan'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {leave.department || 'Operasional'}
                    </span>
                    {leave.leaderName && (
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        • {t('direct_leader')}: <strong>{leave.leaderName}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Leave Quota Card */}
              <div className="bg-emerald-50/60 dark:bg-emerald-950/40 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-800/60 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  {t('annual_leave_quota', 'Kuota Cuti Tahunan')}
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {t('quota_remaining', 'Sisa kuota')}:{' '}
                    <strong className="font-extrabold font-mono">
                      {leave.userRemainingLeave ?? leave.userLeaveBalance?.remainingAnnual ?? (isSelf ? (user?.leaveBalance?.remainingAnnual ?? user?.leaveBalance?.annual?.remaining ?? 12) : 12)}
                    </strong>{' '}
                    {t('days', 'Hari')}
                  </span>
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    ({t('quota_of', 'dari')} {leave.userLeaveBalance?.annualTotal ?? 12} {t('days', 'hari')})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Leave Details */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('leave_period_title')}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  {t('leave_type')}
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {leave.typeLabel || (leave.type === 'annual' ? 'Cuti Tahunan' : leave.type === 'sick' ? 'Izin Sakit' : 'Izin Khusus')}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  {t('period')}
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {leave.startDate} {t('date_range_to', 's/d')} {leave.endDate}
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                <span className="text-slate-400 text-[10px] uppercase font-bold block mb-0.5">
                  {t('total_days')}
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm font-mono">
                  {leave.totalDays} {t('days')}
                </span>
              </div>
            </div>

            {/* Reason block */}
            <div className="pt-2">
              <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                {t('reason')}
              </span>
              <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 italic">
                "{leave.reason}"
              </p>
            </div>
          </div>

          {/* Section 3: Attachment & AI OCR (if present) */}
          {(leave.attachmentUrl || leave.attachmentName || leave.type === 'sick') && (
            <div className="p-4 rounded-2xl border border-indigo-200/80 dark:border-indigo-900/60 bg-indigo-50/40 dark:bg-indigo-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                  <span>{t('attachment_medical')}</span>
                </h4>
                {leave.attachmentName && (
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-300 font-mono">
                    📎 {leave.attachmentName}
                  </span>
                )}
              </div>

              {/* AI OCR Card */}
              <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-indigo-100 dark:border-slate-700 text-xs space-y-2">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                  <span>{t('ocr_verified')}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
                  <div>
                    <span className="text-slate-400 block">{t('ocr_doctor')}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {leave.aiOcrData?.doctorName || 'dr. Anugrah Pratama, Sp.A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">{t('ocr_diagnosis')}</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {leave.aiOcrData?.diagnosis || 'Kelelahan Fisik & Gejala ISPA (Istirahat 2 hari)'}
                    </span>
                  </div>
                </div>
              </div>

              {leave.attachmentUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 aspect-video max-h-48 flex items-center justify-center bg-slate-900">
                  <img
                    src={leave.attachmentUrl}
                    alt="Surat Dokter"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          )}

          {/* Section 4: Multi-Tier Approval Workflow Timeline */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{t('approval_timeline')}</span>
            </h4>

            <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-700 ml-3 py-1">
              
              {/* Step 1: Submission */}
              <div className="relative">
                <div className="absolute -left-[31px] top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <h6 className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('step_submitted')}
                  </h6>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Oleh {leave.employeeName || leave.userName || 'Karyawan'} • {leave.submittedAt || (leave.createdAt ? (typeof leave.createdAt === 'string' ? leave.createdAt.slice(0, 10) : new Date(leave.createdAt).toISOString().slice(0, 10)) : '-')}
                  </p>
                </div>
              </div>

              {/* Step 2: Leader Review */}
              <div className="relative">
                <div
                  className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isLeaderApproved
                      ? 'bg-emerald-600 text-white'
                      : isLeaderRejected
                      ? 'bg-rose-600 text-white'
                      : isPendingLeader
                      ? 'bg-indigo-600 text-white animate-pulse'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-600'
                  }`}
                >
                  {isLeaderApproved ? (
                    <Check className="w-3 h-3" />
                  ) : isLeaderRejected ? (
                    <X className="w-3 h-3" />
                  ) : (
                    '2'
                  )}
                </div>
                <div>
                  <h6 className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('step_leader_review')}
                  </h6>
                  {isLeaderApproved ? (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Disetujui oleh {leaderName} ({leaderApprovedAt})
                      {leaderNotes && (
                        <span className="block text-slate-500 dark:text-slate-400 italic">
                          "{leaderNotes}"
                        </span>
                      )}
                    </p>
                  ) : isLeaderRejected ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      ✕ Ditolak oleh Leader: {leave.rejectedReason || leave.rejectReason || '-'}
                    </p>
                  ) : isPendingLeader ? (
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400">
                      {t('waiting_leader_action')}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">Tahap ini belum diproses.</p>
                  )}
                </div>
              </div>

              {/* Step 3: HR Final Approval */}
              <div className="relative">
                <div
                  className={`absolute -left-[31px] top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    isHrApproved
                      ? 'bg-emerald-600 text-white'
                      : isHrRejected
                      ? 'bg-rose-600 text-white'
                      : isPendingHr
                      ? 'bg-amber-500 text-white animate-pulse'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-600'
                  }`}
                >
                  {isHrApproved ? (
                    <Check className="w-3 h-3" />
                  ) : isHrRejected ? (
                    <X className="w-3 h-3" />
                  ) : (
                    '3'
                  )}
                </div>
                <div>
                  <h6 className="text-xs font-bold text-slate-900 dark:text-white">
                    {t('step_hr_review')}
                  </h6>
                  {isHrApproved ? (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      ✓ Disahkan oleh {hrName} ({hrApprovedAt})
                      {hrNotes && (
                        <span className="block text-slate-500 dark:text-slate-400 italic">
                          "{hrNotes}"
                        </span>
                      )}
                    </p>
                  ) : isPendingHr ? (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                      {t('waiting_hr_action')}
                    </p>
                  ) : isPendingLeader ? (
                    <p className="text-[11px] text-slate-400">
                      Menunggu persetujuan Tahap 1 (Leader) terlebih dahulu.
                    </p>
                  ) : isHrRejected ? (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                      ✕ Permohonan ditolak oleh HR: {leave.rejectedReason || leave.rejectReason || '-'}
                    </p>
                  ) : (
                    <p className="text-[11px] text-slate-400">-</p>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer with Role-Based Contextual Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{t('btn_print')}</span>
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {isSelf && (leave.status === 'pending_leader' || leave.status === 'pending_hr' || leave.status === 'pending') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>{t('self_request_waiting_other', 'Permohonan Anda (Menunggu Persetujuan Atasan / HR Lain)')}</span>
              </span>
            )}

            {/* Context 1: Leader Action */}
            {canLeaderAct && (
              <>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleLeaderReject}
                  className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
                >
                  {t('btn_reject')}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleLeaderApprove}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                >
                  {t('btn_approve_leader')}
                </button>
              </>
            )}

            {/* Context 2: HR Final Action */}
            {canHrAct && (
              <>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleHrReject}
                  className="px-4 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
                >
                  {t('btn_reject')}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleHrApprove}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                >
                  {t('btn_approve_hr')}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-colors"
            >
              {t('btn_close')}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}

