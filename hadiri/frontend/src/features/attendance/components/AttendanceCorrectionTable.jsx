import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import AttendanceCorrectionModal from './AttendanceCorrectionModal';
import AttendanceCorrectionDetailModal from './AttendanceCorrectionDetailModal';
import {
  FileEdit,
  Plus,
  Clock,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Inbox,
  ArrowRight,
  ShieldCheck,
  User,
  Eye,
} from 'lucide-react';

export default function AttendanceCorrectionTable() {
  const { myCorrections, fetchMyCorrections } = useAttendance();
  const { t, language, getDayName } = useLanguage();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [trackingCorrection, setTrackingCorrection] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchMyCorrections();
  }, [fetchMyCorrections]);

  const filteredCorrections = (myCorrections || []).filter((item) => {
    if (filterStatus === 'all') return true;
    return item.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {t('corr_badge_stage_done', 'Disahkan & Disinkronkan')}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5" />
            {t('status_rejected', 'Ditolak')}
          </span>
        );
      case 'pending_hr':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-3.5 h-3.5" />
            {t('corr_badge_stage1_leader', 'Tahap 1: Menunggu Leader')}
          </span>
        );
    }
  };

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
    <div className="space-y-4">
      {/* Top Action & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-xs">
          {[
            { id: 'all', label: t('notif_tab_all', 'Semua') },
            { id: 'pending_leader', label: t('status_pending_leader', 'Menunggu Leader') },
            { id: 'pending_hr', label: t('status_pending_hr', 'Menunggu HR') },
            { id: 'approved', label: t('status_approved', 'Disetujui') },
            { id: 'rejected', label: t('status_rejected', 'Ditolak') },
          ].map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilterStatus(f.id)}
              className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-all ${
                filterStatus === f.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('btn_request_corr', 'Ajukan Koreksi')}</span>
        </button>
      </div>

      {/* Table / Card List */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {filteredCorrections.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-3xl bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <Inbox className="w-7 h-7 stroke-[1.5]" />
            </div>
            <p className="text-sm font-bold text-slate-800 dark:text-white">
              {t('no_corr_data', 'Belum ada pengajuan koreksi presensi')}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm mx-auto">
              {t('no_corr_data_desc', 'Jika Anda lupa absen atau jam presensi tidak sesuai, ajukan permohonan koreksi melalui tombol di atas.')}
            </p>
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase font-bold text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_date', 'Tanggal Presensi')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_type', 'Tipe Koreksi')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('corr_proposed_hours', 'Jam Yang Diajukan')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_reason', 'Alasan & Bukti')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_status', 'Status')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('corr_review_notes', 'Catatan Reviewer')}</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">{t('col_action', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredCorrections.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                    {/* Tanggal */}
                    <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-blue-500" />
                        <span>{item.date}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          ({getDayName(item.date)})
                        </span>
                      </div>
                    </td>

                    {/* Tipe Koreksi */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {getCorrectionTypeLabel(item.correctionType)}
                      </span>
                    </td>

                    {/* Jam Diajukan */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {item.proposedClockIn ? `${item.proposedClockIn} WIB` : '-'}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <span>
                          {item.proposedClockOut ? `${item.proposedClockOut} WIB` : '-'}
                        </span>
                      </div>
                    </td>

                    {/* Alasan & Bukti */}
                    <td className="py-3.5 px-4 max-w-xs truncate whitespace-nowrap">
                      <span className="text-slate-700 dark:text-slate-300 font-normal">
                        {item.reason}
                      </span>
                      {item.attachmentUrl && (
                        <a
                          href={item.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 inline-block text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          📎 {t('corr_view_proof', 'Lihat Lampiran')}
                        </a>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>

                    {/* Catatan Reviewer */}
                    <td className="py-3.5 px-4 max-w-xs truncate whitespace-nowrap">
                      {item.status === 'rejected' && item.rejectionReason && (
                        <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                          ⚠️ {item.rejectionReason}
                        </span>
                      )}
                      {item.status === 'approved' && (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ {item.hrNotes || item.leaderNotes || t('corr_approved_synced', 'Presensi disahkan')}
                        </span>
                      )}
                      {(item.status === 'pending_leader' || item.status === 'pending_hr') && (
                        <span className="text-[11px] text-slate-400 italic">
                          {item.status === 'pending_leader'
                            ? t('waiting_leader_review', 'Menunggu review atasan')
                            : t('waiting_hr_approval', 'Menunggu pengesahan HR')}
                        </span>
                      )}
                    </td>

                    {/* Aksi: Lacak Alur */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => setTrackingCorrection(item)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-500" />
                        <span>{t('btn_track_progress', 'Lacak Alur')}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Pengajuan */}
      <AttendanceCorrectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />

      {/* Modal Pelacakan Alur Detail */}
      <AttendanceCorrectionDetailModal
        isOpen={!!trackingCorrection}
        onClose={() => setTrackingCorrection(null)}
        correction={trackingCorrection}
      />
    </div>
  );
}

