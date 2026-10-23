import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../context/AttendanceContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Briefcase,
  Clock,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Plus,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  SlidersHorizontal,
  Edit2,
  Trash2,
  Layers,
  CalendarDays,
  AlertTriangle,
} from 'lucide-react';
import ShiftSwitcherModal from '../../features/shifts/components/ShiftSwitcherModal';
import ShiftModal from '../../features/shifts/components/ShiftModal';
import RosterSchedulerMatrix from '../../features/shifts/components/RosterSchedulerMatrix';

export default function ShiftsManagementPage() {
  const { shifts, companyProfile, activeShift, createShift, updateShift, deleteShift, fetchShifts } = useAttendance();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState('catalog'); // 'catalog' | 'roster'
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [deleteConfirmShift, setDeleteConfirmShift] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchShifts?.();
  }, [fetchShifts]);

  const handleOpenAddShift = () => {
    setEditingShift(null);
    setIsShiftModalOpen(true);
  };

  const handleOpenEditShift = (shift) => {
    setEditingShift(shift);
    setIsShiftModalOpen(true);
  };

  const handleSaveShift = async (payload) => {
    if (editingShift) {
      await updateShift(editingShift.id, payload);
    } else {
      await createShift(payload);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmShift) return;
    setIsDeleting(true);
    try {
      await deleteShift(deleteConfirmShift.id);
      setDeleteConfirmShift(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              {t('shifts_header_tag', 'Master Operasional')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">• {companyProfile?.name || 'Organisasi'}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {t('shifts_master_title', 'Master Shift & Penjadwalan Roster')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('shifts_master_subtitle', 'Konfigurasi shift kerja perusahaan, rotasi dinamis, dan toleransi presensi')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsSwitcherOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>{t('simulate_active_shift', 'Simulasi Shift Demo')}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddShift}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>{t('add_new_shift', 'Tambah Shift Baru')}</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('catalog')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'catalog'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('tab_shift_catalog', 'Katalog Master Shift')}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-white/20 text-white font-mono">
            {shifts?.length || 0}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'roster'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>{t('tab_roster_scheduler', 'Penjadwalan Roster Tim')}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500 text-white font-bold uppercase tracking-wider">
            Live
          </span>
        </button>
      </div>

      {/* Tab 1: Shift Catalog */}
      {activeTab === 'catalog' && (
        <div className="space-y-6">
          {/* Policy Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('primary_work_model', 'Model Jam Kerja')}
              </p>
              <p className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {companyProfile?.workModel || 'Reguler Non-Shift'}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {t('timezone_label', 'Zona Waktu')} {companyProfile?.timezoneLabel || 'WIB (UTC+7)'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('ot_regulation_title', 'Perhitungan Lembur')}
              </p>
              <p className="text-base font-bold text-emerald-700 dark:text-emerald-400 mt-1">
                {t('ot_regulation_rate', '1.5x / 2.0x Sesuai Depnaker')}
              </p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {t('ot_regulation_max', 'Maksimal 4 Jam/Hari atau 18 Jam/Minggu')}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
              <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {t('cross_day_shift_title', 'Shift Lintas Hari')}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <p className="text-base font-bold text-indigo-700 dark:text-indigo-300">
                  {t('cross_day_supported', 'Mendukung Shift Malam')}
                </p>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                {t('cross_day_automatch', 'Auto-match sesi check-out H+1 tanpa bentrok tanggal')}
              </p>
            </div>
          </div>

          {/* Shifts Cards Grid or Empty State */}
          {(!shifts || shifts.length === 0) ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center mb-4 border border-indigo-100 dark:border-indigo-900">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                {t('no_shifts_title', 'Belum Ada Master Shift')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
                {t('no_shifts_desc', 'Tenant ini belum memiliki konfigurasi shift kerja. Silakan klik tombol "Tambah Shift Baru" untuk menambahkan jam kerja operasional pertama.')}
              </p>
              <button
                type="button"
                onClick={handleOpenAddShift}
                className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('add_new_shift', 'Tambah Shift Baru')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {shifts.filter(Boolean).map((shift) => (
                <div
                  key={shift.id}
                  className={`p-5 rounded-3xl border transition-all bg-white dark:bg-slate-900 flex flex-col justify-between ${
                    shift.isCrossDay
                      ? 'border-indigo-200 dark:border-indigo-800 ring-1 ring-indigo-500/20 shadow-soft'
                      : 'border-slate-200/80 dark:border-slate-800 shadow-2xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`p-2.5 rounded-2xl shrink-0 ${
                            shift.isCrossDay
                              ? 'bg-indigo-600 text-white'
                              : shift.code === 'S1'
                              ? 'bg-emerald-600 text-white'
                              : shift.code === 'S2'
                              ? 'bg-amber-600 text-white'
                              : 'bg-blue-600 text-white'
                          }`}
                        >
                          {shift.isCrossDay ? (
                            <Moon className="w-5 h-5" />
                          ) : shift.code === 'S1' ? (
                            <Sunrise className="w-5 h-5" />
                          ) : shift.code === 'S2' ? (
                            <Sunset className="w-5 h-5" />
                          ) : (
                            <Sun className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 dark:text-white text-sm">{shift?.name || 'Shift'}</h3>
                          <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                            {t('shift_code_prefix', 'Kode:')} {shift?.code || '-'}
                          </span>
                        </div>
                      </div>

                      {shift.isCrossDay && (
                        <span className="inline-flex items-center gap-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                          <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                          {t('cross_midnight_badge', 'Lintas Hari (H+1)')}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2">
                      {shift?.description || t('no_description', 'Shift operasional kerja regular')}
                    </p>

                    {/* Time windows specification */}
                    <div className="space-y-2 text-xs bg-slate-50 dark:bg-slate-800/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-500 dark:text-slate-400">{t('work_hours_label', 'Jam Kerja')}</span>
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          {shift?.startTime} - {shift?.endTime} WIB
                          {shift?.isCrossDay && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-1">(H+1)</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-500 dark:text-slate-400">{t('window_checkin', 'Jendela Masuk')}</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {shift?.checkInWindow?.start} - {shift?.checkInWindow?.end} WIB
                        </span>
                      </div>

                      <div className="flex items-center justify-between font-medium">
                        <span className="text-slate-500 dark:text-slate-400">{t('window_checkout', 'Jendela Keluar')}</span>
                        <span className="font-mono text-slate-700 dark:text-slate-300">
                          {shift?.checkOutWindow?.start} - {shift?.checkOutWindow?.end} WIB
                          {shift?.isCrossDay && (
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-1">(H+1)</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center justify-between font-medium pt-1 border-t border-slate-200 dark:border-slate-700">
                        <span className="text-slate-500 dark:text-slate-400">{t('late_tolerance', 'Toleransi Telat')}</span>
                        <span className="font-semibold text-amber-700 dark:text-amber-400">
                          {shift?.gracePeriodMinutes ?? 15} {t('minutes', 'Menit')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {activeShift?.id === shift?.id && (
                        <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{t('active_session_badge', 'Aktif')}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditShift(shift)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        title={t('edit_shift', 'Edit Shift')}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmShift(shift)}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition-colors"
                        title={t('delete_shift', 'Hapus Shift')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Dynamic Team Roster Scheduler */}
      {activeTab === 'roster' && <RosterSchedulerMatrix />}

      {/* Shift Switcher Modal (Simulation) */}
      <ShiftSwitcherModal isOpen={isSwitcherOpen} onClose={() => setIsSwitcherOpen(false)} />

      {/* Add / Edit Shift Modal */}
      <ShiftModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onSave={handleSaveShift}
        editingShift={editingShift}
      />

      {/* Delete Shift Confirmation Modal */}
      {deleteConfirmShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
              {t('confirm_delete_shift', 'Hapus Master Shift?')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {t('confirm_delete_shift_desc', 'Apakah Anda yakin ingin menonaktifkan shift:')}{' '}
              <strong className="text-slate-900 dark:text-white font-mono">
                {deleteConfirmShift?.name || '-'} ({deleteConfirmShift?.code || '-'})
              </strong>
              ?
            </p>
            <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-2 bg-amber-50 dark:bg-amber-950/40 p-2.5 rounded-xl border border-amber-200 dark:border-amber-900">
              {t('delete_shift_protection_hint', 'Shift yang sedang aktif ditugaskan ke karyawan atau jadwal roster tidak dapat dihapus.')}
            </p>
            <div className="flex items-center justify-center gap-3 mt-5">
              <button
                type="button"
                onClick={() => setDeleteConfirmShift(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                {t('cancel', 'Batal')}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-500/20 disabled:opacity-60"
              >
                {isDeleting ? t('deleting', 'Menghapus...') : t('delete', 'Ya, Hapus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
