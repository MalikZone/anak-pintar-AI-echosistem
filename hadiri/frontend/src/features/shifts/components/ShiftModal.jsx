import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { X, Clock, Moon, Sparkles, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function ShiftModal({ isOpen, onClose, onSave, editingShift = null }) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
    description: '',
    isActive: true,
    checkInWindowStart: '07:00',
    checkInWindowEnd: '10:00',
    checkOutWindowStart: '16:30',
    checkOutWindowEnd: '20:00',
  });

  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute cross-day automatically
  const isCrossDay = formData.endTime && formData.startTime ? formData.endTime < formData.startTime : false;

  useEffect(() => {
    if (editingShift) {
      setFormData({
        code: editingShift.code || '',
        name: editingShift.name || '',
        startTime: editingShift.startTime || '08:00',
        endTime: editingShift.endTime || '17:00',
        gracePeriodMinutes: editingShift.gracePeriodMinutes ?? 15,
        description: editingShift.description || '',
        isActive: editingShift.isActive ?? true,
        checkInWindowStart: editingShift.checkInWindow?.start || '07:00',
        checkInWindowEnd: editingShift.checkInWindow?.end || '10:00',
        checkOutWindowStart: editingShift.checkOutWindow?.start || '16:30',
        checkOutWindowEnd: editingShift.checkOutWindow?.end || '20:00',
      });
    } else {
      setFormData({
        code: '',
        name: '',
        startTime: '08:00',
        endTime: '17:00',
        gracePeriodMinutes: 15,
        description: '',
        isActive: true,
        checkInWindowStart: '07:00',
        checkInWindowEnd: '10:00',
        checkOutWindowStart: '16:30',
        checkOutWindowEnd: '20:00',
      });
    }
    setError(null);
  }, [editingShift, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError(t('shift_name_required', 'Nama shift wajib diisi'));
      return;
    }

    if (!editingShift && !formData.code.trim()) {
      setError(t('shift_code_required', 'Kode shift wajib diisi'));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        startTime: formData.startTime,
        endTime: formData.endTime,
        gracePeriodMinutes: Number(formData.gracePeriodMinutes) || 0,
        description: formData.description.trim(),
        isActive: formData.isActive,
        checkInWindow: {
          start: formData.checkInWindowStart,
          end: formData.checkInWindowEnd,
        },
        checkOutWindow: {
          start: formData.checkOutWindowStart,
          end: formData.checkOutWindowEnd,
        },
      };

      if (!editingShift) {
        payload.code = formData.code.trim().toUpperCase();
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err.message || t('shift_save_failed', 'Gagal menyimpan shift'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-xl w-full p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              {editingShift ? t('edit_shift_title', 'Edit Master Shift') : t('add_shift_title', 'Tambah Shift Baru')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('shift_modal_desc', 'Atur parameter jam kerja operasional, batas toleransi, dan jendela absensi')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('shift_code_label', 'Kode Shift')} *
              </label>
              <input
                type="text"
                disabled={!!editingShift}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="misal: S1, S2, NIGHT"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                required
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                {editingShift ? t('code_cannot_change', 'Kode tidak dapat diubah') : t('code_unique_hint', 'Unik dalam tenant')}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('shift_name_label', 'Nama Shift')} *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="misal: Shift Pagi Operasional"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
          </div>

          {/* Start and End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('start_time_label', 'Jam Mulai')} (HH:mm)
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('end_time_label', 'Jam Selesai')} (HH:mm)
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {t('detection_mode', 'Deteksi Operasional:')}
              </span>
              {isCrossDay ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                  <Moon className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('cross_midnight_detected', '🌙 Lintas Hari (+1 Hari / Cross-Midnight)')}</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t('sameday_shift', 'Reguler (Hari Yang Sama)')}</span>
                </span>
              )}
            </div>
          </div>

          {/* Grace Period */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('grace_period_input_label', 'Toleransi Keterlambatan (Menit)')}
            </label>
            <input
              type="number"
              min="0"
              max="120"
              value={formData.gracePeriodMinutes}
              onChange={(e) => setFormData({ ...formData, gracePeriodMinutes: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
              {t('grace_period_hint', 'Menit sebelum absensi ditandai Terlambat (Late)')}
            </span>
          </div>

          {/* Attendance Windows */}
          <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>{t('attendance_windows_title', 'Jendela Waktu Presensi')}</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t('checkin_window_start', 'Check-In Awal')}
                </label>
                <input
                  type="time"
                  value={formData.checkInWindowStart}
                  onChange={(e) => setFormData({ ...formData, checkInWindowStart: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t('checkin_window_end', 'Check-In Akhir')}
                </label>
                <input
                  type="time"
                  value={formData.checkInWindowEnd}
                  onChange={(e) => setFormData({ ...formData, checkInWindowEnd: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t('checkout_window_start', 'Check-Out Awal')}
                </label>
                <input
                  type="time"
                  value={formData.checkOutWindowStart}
                  onChange={(e) => setFormData({ ...formData, checkOutWindowStart: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
                  {t('checkout_window_end', 'Check-Out Akhir')}
                </label>
                <input
                  type="time"
                  value={formData.checkOutWindowEnd}
                  onChange={(e) => setFormData({ ...formData, checkOutWindowEnd: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('description_label', 'Keterangan Shift')}
            </label>
            <textarea
              rows="2"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Deskripsi operasional shift..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              {t('cancel', 'Batal')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 transition-colors disabled:opacity-60"
            >
              {isSubmitting ? t('saving', 'Menyimpan...') : t('save_shift', 'Simpan Shift')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
