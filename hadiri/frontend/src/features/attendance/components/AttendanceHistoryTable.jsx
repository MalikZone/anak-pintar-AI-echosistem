import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import {
  Calendar,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  FileEdit,
  Plus,
  Eye,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import AttendanceCorrectionModal from './AttendanceCorrectionModal';
import AttendanceCorrectionDetailModal from './AttendanceCorrectionDetailModal';

export default function AttendanceHistoryTable() {
  const { attendanceHistory, myCorrections, fetchMyCorrections } = useAttendance();
  const { t, language, getDayName } = useLanguage();
  const toast = useToast();
  const [filterStatus, setFilterStatus] = useState('all');
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [selectedCorrectionItem, setSelectedCorrectionItem] = useState(null);
  const [trackingCorrection, setTrackingCorrection] = useState(null);

  useEffect(() => {
    fetchMyCorrections();
  }, [fetchMyCorrections]);

  const handleOpenCorrection = (item = null) => {
    setSelectedCorrectionItem(item);
    setIsCorrectionModalOpen(true);
  };

  const filteredHistory = attendanceHistory.filter((item) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'leave_sick') return item.status === 'sick' || item.status === 'leave';
    return item.status === filterStatus;
  });

  const handleExportCsv = () => {
    if (!filteredHistory || filteredHistory.length === 0) {
      toast.warning(t('no_data_to_export', 'Tidak ada data kehadiran untuk diekspor.'));
      return;
    }

    try {
      const headers = [
        t('col_date'),
        t('col_day'),
        t('col_clock_in'),
        t('col_clock_out'),
        t('col_status'),
        t('col_location'),
        t('col_notes'),
      ];
      const rows = filteredHistory.map((item) => [
        `"${item.date || ''}"`,
        `"${getDayName(item.date || item.dayName) || ''}"`,
        `"${item.clockIn ? `${item.clockIn} WIB` : '-'}"`,
        `"${item.clockOut ? `${item.clockOut} WIB` : '-'}"`,
        `"${item.statusLabel || item.status || ''}"`,
        `"${(item.location || '').replace(/"/g, '""')}"`,
        `"${(item.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `riwayat_kehadiran_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success(t('export_success', 'Data riwayat presensi berhasil diekspor ke file CSV.'), 'Ekspor Berhasil');
    } catch {
      toast.error(t('export_failed', 'Gagal mengekspor data riwayat kehadiran.'));
    }
  };

  // Calculate monthly stats
  const totalPresent = attendanceHistory.filter((i) => i.status === 'present').length;
  const totalLate = attendanceHistory.filter((i) => i.status === 'late').length;
  const totalLeave = attendanceHistory.filter((i) => i.status === 'sick' || i.status === 'leave').length;

  const currentMonthName = new Date().toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
    month: 'long',
    year: 'numeric',
  });

  const complianceRate = attendanceHistory.length > 0
    ? Math.round((totalPresent / attendanceHistory.length) * 100)
    : 100;

  return (
    <div className="space-y-6">
      
      {/* Top Monthly Metrics Card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('stat_total_workdays')}</p>
          <p className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">{attendanceHistory.length}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{currentMonthName}</p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('stat_on_time')}</p>
          <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1">{totalPresent}</p>
          <p className="text-[11px] text-emerald-500 dark:text-emerald-500 mt-0.5">
            {t('stat_compliance_rate', { rate: complianceRate })}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{t('stat_late')}</p>
          <p className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-1">{totalLate}</p>
          <p className="text-[11px] text-amber-500 dark:text-amber-500 mt-0.5">
            {totalLate > 0 
              ? t('stat_late_count', { count: totalLate })
              : t('stat_no_late')}
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors">
          <p className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{t('stat_leave_sick')}</p>
          <p className="text-2xl font-extrabold text-blue-700 dark:text-blue-400 mt-1">{totalLeave}</p>
          <p className="text-[11px] text-blue-500 dark:text-blue-400 mt-0.5">{t('stat_recorded_hris')}</p>
        </div>
      </div>

      {/* Main Table & List Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
        
        {/* Header with Filter & Export Button */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('personal_history_title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('personal_history_subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('filter_all')}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('present')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'present'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('filter_on_time')}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('late')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'late'
                    ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('filter_late')}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('leave_sick')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'leave_sick'
                    ? 'bg-white dark:bg-slate-700 text-blue-700 dark:text-blue-300 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('stat_leave_sick', 'Cuti / Sakit')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => handleOpenCorrection(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('btn_request_corr', 'Ajukan Koreksi')}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{t('export')}</span>
            </button>
          </div>
        </div>

        {/* Mobile View: Cards */}
        <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800 max-h-[600px] overflow-y-auto">
          {filteredHistory.length === 0 ? (
            <div className="p-8 text-center text-slate-400 dark:text-slate-500">
              <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium">{t('no_attendance_records', 'Belum ada riwayat kehadiran.')}</p>
            </div>
          ) : (
            filteredHistory.map((item) => {
              const dayCorrection = (myCorrections || []).find((c) => c.date === item.date);

              return (
                <div key={item.id} className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-sm text-slate-900 dark:text-white">
                        {getDayName(item.date || item.dayName)}, {item.date}
                      </span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{item.location}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div>
                        {item.status === 'present' && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            {t('stat_on_time', 'Tepat Waktu')}
                          </span>
                        )}
                        {item.status === 'late' && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                            {t('stat_late', 'Terlambat')}
                          </span>
                        )}
                        {item.status === 'sick' && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {t('timeoff_sick_label', 'Sakit')}
                          </span>
                        )}
                        {item.status === 'leave' && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            {t('col_leave', 'Cuti')}
                          </span>
                        )}
                        {!['present', 'late', 'sick', 'leave'].includes(item.status) && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {item.statusLabel || item.status || t('status_present_fallback', 'Hadir')}
                          </span>
                        )}
                      </div>

                      {dayCorrection && (
                        <div>
                          {dayCorrection.status === 'pending_leader' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                              ⏳ {t('corr_badge_stage1_leader', 'Tahap 1: Menunggu Leader')}
                            </span>
                          )}
                          {dayCorrection.status === 'pending_hr' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                              🛡️ {t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}
                            </span>
                          )}
                          {dayCorrection.status === 'approved' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                              ✓ {t('corr_on_date_synced', 'Koreksi Disahkan')}
                            </span>
                          )}
                          {dayCorrection.status === 'rejected' && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              ✕ {t('status_rejected', 'Ditolak')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                    <div>
                      <span className="text-slate-400 text-[10px] block">{t('col_clock_in')}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{item.clockIn ? `${item.clockIn} WIB` : '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">{t('col_clock_out')}</span>
                      <span className="font-mono font-bold text-slate-800 dark:text-slate-100">{item.clockOut ? `${item.clockOut} WIB` : '—'}</span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      "{item.notes}"
                    </p>
                  )}

                  <div className="pt-1 flex items-center justify-end gap-2">
                    {dayCorrection && (
                      <button
                        type="button"
                        onClick={() => setTrackingCorrection(dayCorrection)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[11px] font-semibold text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-blue-500" />
                        <span>{t('btn_track_progress', 'Lacak Alur')}</span>
                      </button>
                    )}
                    {(!dayCorrection || dayCorrection.status === 'rejected') && (
                      <button
                        type="button"
                        onClick={() => handleOpenCorrection(item)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <FileEdit className="w-3 h-3" />
                        <span>{dayCorrection ? t('btn_reapply', 'Ajukan Ulang') : t('btn_correct', 'Koreksi Kehadiran')}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Table with Vertical & Horizontal Scroll */}
        <div className="hidden sm:block overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
              <tr className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_date_day')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_clock_in')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_clock_out')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_location')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_status')}</th>
                <th className="py-3.5 px-5 whitespace-nowrap">{t('col_notes')}</th>
                <th className="py-3.5 px-5 text-right whitespace-nowrap">{t('col_action', 'Aksi')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="text-sm font-medium">{t('no_attendance_records', 'Belum ada riwayat kehadiran.')}</p>
                  </td>
                </tr>
              ) : (
                filteredHistory.map((item) => {
                  const dayCorrection = (myCorrections || []).find((c) => c.date === item.date);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3.5 px-5 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{getDayName(item.date || item.dayName)}, {item.date}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {item.clockIn ? `${item.clockIn} WIB` : '—'}
                      </td>
                      <td className="py-3.5 px-5 font-mono font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">
                        {item.clockOut ? `${item.clockOut} WIB` : '—'}
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {item.location}
                      </td>
                      <td className="py-3.5 px-5 whitespace-nowrap">
                        <div className="space-y-1">
                          <div>
                            {item.status === 'present' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                {t('stat_on_time', 'Tepat Waktu')}
                              </span>
                            )}
                            {item.status === 'late' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[11px] font-bold">
                                <AlertCircle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                                {t('stat_late', 'Terlambat')}
                              </span>
                            )}
                            {item.status === 'sick' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-bold">
                                {t('timeoff_sick_label', 'Sakit')}
                              </span>
                            )}
                            {item.status === 'leave' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[11px] font-bold">
                                {t('col_leave', 'Cuti')}
                              </span>
                            )}
                            {!['present', 'late', 'sick', 'leave'].includes(item.status) && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-bold">
                                {item.statusLabel || item.status || t('status_present_fallback', 'Hadir')}
                              </span>
                            )}
                          </div>

                          {dayCorrection && (
                            <div>
                              {dayCorrection.status === 'pending_leader' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-[10px] font-bold">
                                  ⏳ {t('corr_badge_stage1_leader', 'Tahap 1: Menunggu Leader')}
                                </span>
                              )}
                              {dayCorrection.status === 'pending_hr' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold">
                                  🛡️ {t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}
                                </span>
                              )}
                              {dayCorrection.status === 'approved' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
                                  ✓ {t('corr_on_date_synced', 'Koreksi Disahkan')}
                                </span>
                              )}
                              {dayCorrection.status === 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[10px] font-bold">
                                  ✕ {t('status_rejected', 'Ditolak')}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-slate-500 dark:text-slate-400 max-w-xs truncate whitespace-nowrap">
                        {item.notes || '—'}
                      </td>
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5 justify-end">
                          {dayCorrection && (
                            <button
                              type="button"
                              onClick={() => setTrackingCorrection(dayCorrection)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/40 text-[11px] font-semibold text-blue-600 dark:text-blue-400 transition-colors"
                              title={t('corr_tracking_title', 'Pelacakan Alur Koreksi Presensi')}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('btn_track_progress', 'Lacak Alur')}</span>
                            </button>
                          )}
                          {(!dayCorrection || dayCorrection.status === 'rejected') && (
                            <button
                              type="button"
                              onClick={() => handleOpenCorrection(item)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              title={t('corr_this_day', 'Koreksi Kehadiran')}
                            >
                              <FileEdit className="w-3.5 h-3.5" />
                              <span>{dayCorrection ? t('btn_reapply', 'Ajukan Ulang') : t('btn_correct', 'Koreksi')}</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* Attendance Correction Submission Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        initialData={selectedCorrectionItem}
      />

      {/* Attendance Correction Tracking Modal */}
      <AttendanceCorrectionDetailModal
        isOpen={!!trackingCorrection}
        onClose={() => setTrackingCorrection(null)}
        correction={trackingCorrection}
      />
    </div>
  );
}
