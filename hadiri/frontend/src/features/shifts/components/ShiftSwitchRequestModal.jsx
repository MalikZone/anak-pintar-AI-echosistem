import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { Repeat, X, AlertCircle } from 'lucide-react';

export default function ShiftSwitchRequestModal({ isOpen, onClose, initialDate = null }) {
  const { shifts, requestShiftSwitch } = useAttendance();
  const { t } = useLanguage();

  const [targetDate, setTargetDate] = useState(() => initialDate || new Date().toISOString().slice(0, 10));
  const [requestedShiftId, setRequestedShiftId] = useState('');
  const [switchReason, setSwitchReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setTargetDate(initialDate || new Date().toISOString().slice(0, 10));
      setRequestedShiftId(shifts[0]?.id || '');
      setSwitchReason('');
      setModalError(null);
    }
  }, [isOpen, initialDate, shifts]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError(null);

    if (!requestedShiftId) {
      setModalError(t('select_shift_error', 'Silakan pilih shift yang diinginkan'));
      return;
    }

    if (!switchReason.trim()) {
      setModalError(t('reason_switch_required', 'Mohon isi alasan permohonan tukar shift'));
      return;
    }

    setIsSubmitting(true);
    try {
      await requestShiftSwitch({
        targetDate,
        requestedShiftId,
        reason: switchReason.trim(),
      });
      onClose();
    } catch (err) {
      setModalError(err.message || t('switch_request_failed', 'Gagal mengajukan tukar shift'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Repeat className="w-4 h-4 text-amber-600" />
              <span>{t('request_shift_switch', 'Permohonan Tukar Shift')}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('switch_modal_subtitle', 'Pengajuan penyesuaian jadwal dinamis kepada Leader')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {modalError && (
          <div className="mt-3 p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{modalError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('target_date', 'Tanggal Penugasan Shift')}
            </label>
            <input
              type="date"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-3 py-2 text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('requested_shift', 'Shift Yang Diinginkan')}
            </label>
            <select
              value={requestedShiftId}
              onChange={(e) => setRequestedShiftId(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            >
              {(shifts || []).filter(Boolean).map((s) => (
                <option key={s.id} value={s.id}>
                  [{s?.code || '-'}] {s?.name || 'Shift'} ({s?.startTime || '-'} - {s?.endTime || '-'} {s?.isCrossDay ? '+1' : ''})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('reason_switch', 'Alasan Tukar Shift')} *
            </label>
            <textarea
              rows="3"
              value={switchReason}
              onChange={(e) => setSwitchReason(e.target.value)}
              placeholder={t('switch_reason_placeholder', 'Jelaskan alasan keperluan tukar shift kepada Leader...')}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
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
              className="px-5 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl shadow-md shadow-amber-500/20 disabled:opacity-60 transition-all"
            >
              {isSubmitting ? t('submitting', 'Mengirim...') : t('send_switch_req', 'Kirim Pengajuan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
