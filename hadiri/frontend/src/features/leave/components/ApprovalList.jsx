import React, { useState } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import MedicalDocPreviewModal from './MedicalDocPreviewModal';
import LeaveDetailModal from './LeaveDetailModal';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Eye,
  FileText,
  ChevronRight,
  AlertCircle,
  Search,
} from 'lucide-react';

export default function ApprovalList() {
  const { leaveRequests, approveLeave, rejectLeave, fetchLeaveRequests, currentUser } = useAttendance();
  const { t } = useLanguage();
  const toast = useToast();
  const [tabFilter, setTabFilter] = useState('all'); // Default to 'all' for historical visibility
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [selectedLeave, setSelectedLeave] = useState(null);

  React.useEffect(() => {
    fetchLeaveRequests();
  }, [fetchLeaveRequests]);

  const allCount = (leaveRequests || []).length;
  const pendingCount = (leaveRequests || []).filter(
    (r) => (r.status === 'pending' || r.status === 'pending_hr' || r.status === 'pending_leader') && r.userId !== currentUser?.id
  ).length;
  const approvedCount = (leaveRequests || []).filter((r) => r.status === 'approved').length;
  const rejectedCount = (leaveRequests || []).filter((r) => r.status === 'rejected').length;

  const filteredRequests = (leaveRequests || []).filter((req) => {
    const isPending = req.status === 'pending' || req.status === 'pending_hr' || req.status === 'pending_leader';
    const matchStatus =
      tabFilter === 'all'
        ? true
        : tabFilter === 'pending'
        ? isPending
        : req.status === tabFilter;

    const query = searchTerm.toLowerCase().trim();
    const matchSearch =
      !query ||
      (req.employeeName || req.userName || '').toLowerCase().includes(query) ||
      (req.department || '').toLowerCase().includes(query) ||
      (req.id || '').toLowerCase().includes(query) ||
      (req.typeLabel || '').toLowerCase().includes(query) ||
      (req.reason || '').toLowerCase().includes(query);

    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Filter Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col gap-4 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                {t('leave_approval_list_title', 'Daftar Pengajuan Cuti & Izin')}
              </h2>
              {pendingCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                  {pendingCount} {t('tab_pending', 'Menunggu')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('leave_approval_list_subtitle', 'Tinjau dan proses permohonan cuti, izin sakit, dan verifikasi dokumen medis karyawan.')}
            </p>
          </div>
        </div>

        {/* Search Bar & Tab Filters */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('search_leave_approvals_placeholder', 'Cari nama karyawan, departemen, tipe cuti...')}
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Tab Filter Pills */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold self-start md:self-center overflow-x-auto">
            <button
              type="button"
              onClick={() => setTabFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tabFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('tab_all', 'Semua')} ({allCount})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('pending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                tabFilter === 'pending'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span>{t('tab_pending', 'Menunggu')}</span>
              {pendingCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {pendingCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('approved')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tabFilter === 'approved'
                  ? 'bg-white dark:bg-slate-700 text-emerald-800 dark:text-emerald-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('tab_approved', 'Disetujui')} ({approvedCount})
            </button>
            <button
              type="button"
              onClick={() => setTabFilter('rejected')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                tabFilter === 'rejected'
                  ? 'bg-white dark:bg-slate-700 text-rose-800 dark:text-rose-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {t('tab_rejected', 'Ditolak')} ({rejectedCount})
            </button>
          </div>
        </div>
      </div>

      {/* List of Requests */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-12 text-center transition-colors">
            <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-base font-bold text-slate-700 dark:text-slate-300">
              {searchTerm ? t('no_leaves_found_search', 'Tidak ada permohonan yang cocok dengan pencarian.') : t('no_leaves_in_tab')}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {searchTerm ? 'Coba gunakan kata kunci pencarian yang lain atau reset filter.' : t('all_leaves_processed')}
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-5 sm:p-6 transition-all hover:border-slate-300 dark:hover:border-slate-700"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                
                {/* Employee Info & Reason */}
                <div className="flex items-start gap-4">
                  <img
                    src={req.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                    alt={req.employeeName}
                    className="w-12 h-12 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-bold text-slate-900 dark:text-white text-base">{req.employeeName}</h4>
                      <span className="text-xs text-slate-500 dark:text-slate-400">• {req.department}</span>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {req.typeLabel}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <span>{t('remaining_quota', 'Sisa Cuti')}:</span>
                        <strong className="font-extrabold font-mono">
                          {req.userRemainingLeave ?? req.userLeaveBalance?.remainingAnnual ?? 12} {t('days', 'Hari')}
                        </strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1">
                      <span>{t('period')}: <strong className="text-slate-800 dark:text-slate-200 font-mono">{req.startDate} {t('date_range_to', 's/d')} {req.endDate}</strong> ({req.totalDays} {t('days')})</span>
                      <span>•</span>
                      <span>{t('submitted_at')}: {req.submittedAt}</span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-slate-300 mt-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-100 dark:border-slate-800 italic">
                      "{req.reason}"
                    </p>

                    {/* AI OCR Verification Snippet for Sick Leaves */}
                    {req.attachmentUrl && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 p-3 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-900/60">
                        <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-300 font-bold text-xs">
                          <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 animate-pulse" />
                          <span>{t('ai_ocr_analysis')}</span>
                        </div>
                        {req.aiOcrData ? (
                          <div className="text-xs text-indigo-800 dark:text-indigo-300">
                            {t('ocr_verified_by_doctor')} <strong>{req.aiOcrData.doctorName}</strong> ({req.aiOcrData.diagnosis})
                          </div>
                        ) : (
                          <div className="text-xs text-indigo-700 dark:text-indigo-300">{t('attachment_available')}</div>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedDoc(req)}
                          className="ml-auto text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{t('see_doctor_letter')}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Status & Action Buttons */}
                <div className="flex flex-row lg:flex-col items-end justify-between lg:justify-center gap-3 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-slate-800 shrink-0">
                  
                  {/* Status Badge */}
                  <div>
                    {req.status === 'pending_leader' && (
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          {t('leave_status_pending_leader')}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t('need_leader_acc')}</p>
                      </div>
                    )}
                    {(req.status === 'pending' || req.status === 'pending_hr') && (
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                          {t('ready_hr_stage2')}
                        </span>
                        {req.approvedByLeader && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                            {t('approved_by_leader_check')} {req.approvedByLeader.leaderName}
                          </p>
                        )}
                      </div>
                    )}
                    {req.status === 'approved' && (
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          {t('leave_status_approved', 'Disetujui')}
                        </span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          {t('approved_by_hr_label', 'Disahkan oleh')}: <strong className="text-slate-700 dark:text-slate-300">{req.approvedByHr?.hrName || req.approvedBy || 'HR Admin'}</strong>
                          {req.approvedByHr?.approvedAt ? ` • ${String(req.approvedByHr.approvedAt).slice(0, 10)}` : ''}
                        </p>
                        {req.approvedByLeader && (
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                            {t('approved_by_leader_check', '✓ Disetujui Leader')}: {req.approvedByLeader.leaderName}
                          </p>
                        )}
                      </div>
                    )}
                    {req.status === 'rejected' && (
                      <div className="text-right">
                        <span className="px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold inline-flex items-center gap-1.5">
                          <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                          {t('leave_status_rejected')}
                        </span>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">{t('reason')}: {req.rejectedReason || req.rejectReason || '-'}</p>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {/* View Detail Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedLeave(req)}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{t('view_detail')}</span>
                    </button>

                    {(req.status === 'pending' || req.status === 'pending_hr') && (
                      req.userId === currentUser?.id ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold" title="Tidak dapat menyetujui permohonan cuti sendiri">
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('self_request_waiting_other', 'Permohonan Anda (Menunggu HR Lain / Atasan)')}</span>
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              const reason = await toast.prompt({
                                title: 'Tolak Permohonan Cuti',
                                message: 'Alasan penolakan permohonan cuti:',
                                defaultValue: 'Tidak memenuhi persyaratan operasional',
                                confirmText: 'Tolak Permohonan',
                                variant: 'danger',
                              });
                              if (reason !== null) {
                                await rejectLeave(req.id, reason);
                                toast.info('Permohonan cuti telah ditolak');
                              }
                            }}
                            className="px-3 py-1.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
                          >
                            {t('btn_reject')}
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const notes = await toast.prompt({
                                title: 'Persetujuan Final HR',
                                message: 'Catatan persetujuan (opsional):',
                                defaultValue: 'Disetujui oleh HR',
                                confirmText: 'Setujui Cuti',
                                variant: 'success',
                              });
                              if (notes !== null) {
                                await approveLeave(req.id, notes);
                                toast.success('Permohonan cuti berhasil disetujui');
                              }
                            }}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                          >
                            {t('btn_approve_hr')}
                          </button>
                        </>
                      )
                    )}
                  </div>

                </div>

              </div>
            </div>
          ))
        )}
      </div>

      {/* Leave Detail Modal */}
      <LeaveDetailModal
        leave={
          selectedLeave
            ? leaveRequests.find((l) => l.id === selectedLeave.id) || selectedLeave
            : null
        }
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        onApproveHr={approveLeave}
        onRejectHr={rejectLeave}
      />

      {/* Document View Modal */}
      <MedicalDocPreviewModal
        doc={selectedDoc}
        onClose={() => setSelectedDoc(null)}
        onApprove={approveLeave}
      />

    </div>
  );
}
