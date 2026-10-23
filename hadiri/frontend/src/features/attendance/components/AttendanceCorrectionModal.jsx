import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import {
  X,
  Calendar,
  Clock,
  FileEdit,
  AlertCircle,
  HelpCircle,
  Send,
  Loader2,
} from 'lucide-react';

export default function AttendanceCorrectionModal({ isOpen, onClose, initialData = null }) {
  const { submitAttendanceCorrection } = useAttendance();
  const { t } = useLanguage();
  const toast = useToast();

  const [date, setDate] = useState('');
  const [correctionType, setCorrectionType] = useState('both'); // 'clock_in' | 'clock_out' | 'both'
  const [proposedClockIn, setProposedClockIn] = useState('08:00');
  const [proposedClockOut, setProposedClockOut] = useState('17:00');
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setDate(initialData.date || new Date().toISOString().slice(0, 10));
        setCorrectionType(initialData.correctionType || 'both');
        setProposedClockIn(initialData.clockIn || '08:00');
        setProposedClockOut(initialData.clockOut || '17:00');
        setReason(initialData.reason || '');
        setAttachmentUrl(initialData.attachmentUrl || '');
      } else {
        setDate(new Date().toISOString().slice(0, 10));
        setCorrectionType('both');
        setProposedClockIn('08:00');
        setProposedClockOut('17:00');
        setReason('');
        setAttachmentUrl('');
      }
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!date) {
      toast.warning(t('corr_date_required', 'Pilih tanggal presensi yang ingin dikoreksi.'));
      return;
    }

    if (!reason.trim()) {
      toast.warning(t('corr_reason_required', 'Mohon isi alasan pengajuan koreksi presensi.'));
      return;
    }

    if (correctionType === 'clock_in' && !proposedClockIn) {
      toast.warning(t('corr_clockin_required', 'Jam masuk yang diajukan wajib diisi.'));
      return;
    }

    if (correctionType === 'clock_out' && !proposedClockOut) {
      toast.warning(t('corr_clockout_required', 'Jam pulang yang diajukan wajib diisi.'));
      return;
    }

    if (correctionType === 'both' && !proposedClockIn && !proposedClockOut) {
      toast.warning(t('corr_time_required', 'Jam masuk atau jam pulang wajib diisi.'));
      return;
    }

    setIsSubmitting(true);
    try {
      await submitAttendanceCorrection({
        date,
        correctionType,
        proposedClockIn: correctionType === 'clock_out' ? null : proposedClockIn,
        proposedClockOut: correctionType === 'clock_in' ? null : proposedClockOut,
        reason: reason.trim(),
        attachmentUrl: attachmentUrl.trim() || null,
      });
      onClose();
    } catch {
      // Error toast already displayed in context
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-5 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <FileEdit className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {t('modal_corr_title', 'Ajukan Koreksi Presensi')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('modal_corr_subtitle', 'Lupa absen atau koreksi jam masuk/pulang kerja')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Tanggal Presensi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('col_date', 'Tanggal Presensi')} <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={date}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
                required
              />
            </div>
          </div>

          {/* Jenis Koreksi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('corr_type_label', 'Bagian Yang Ingin Dikoreksi')} <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'both', label: t('corr_type_both', 'Masuk & Pulang') },
                { id: 'clock_in', label: t('corr_type_in', 'Jam Masuk') },
                { id: 'clock_out', label: t('corr_type_out', 'Jam Pulang') },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setCorrectionType(opt.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    correctionType === opt.id
                      ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-400 dark:border-rose-700 text-rose-700 dark:text-rose-300 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Jam Masuk / Jam Pulang Yang Diajukan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(correctionType === 'both' || correctionType === 'clock_in') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('corr_prop_clock_in', 'Jam Masuk Sebenarnya')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={proposedClockIn}
                    onChange={(e) => setProposedClockIn(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
                    required={correctionType === 'both' || correctionType === 'clock_in'}
                  />
                </div>
              </div>
            )}

            {(correctionType === 'both' || correctionType === 'clock_out') && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('corr_prop_clock_out', 'Jam Pulang Sebenarnya')} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="time"
                    value={proposedClockOut}
                    onChange={(e) => setProposedClockOut(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
                    required={correctionType === 'both' || correctionType === 'clock_out'}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Alasan Koreksi */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('col_reason', 'Alasan Pengajuan Koreksi')} <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('corr_reason_placeholder', 'Jelaskan mengapa Anda lupa absen atau memerlukan koreksi (cth: Baterai habis, tugas dinas luar kantor, dsb.)...')}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all resize-none"
              required
            />
          </div>

          {/* Bukti Lampiran / Catatan Pendukung (Opsional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('corr_attachment_label', 'Tautan Bukti / Lampiran (Opsional)')}
            </label>
            <input
              type="text"
              value={attachmentUrl}
              onChange={(e) => setAttachmentUrl(e.target.value)}
              placeholder="https://... atau catatan referensi tugas"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden transition-all"
            />
          </div>

          {/* Informational Callout */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex items-start gap-2.5 text-xs text-blue-800 dark:text-blue-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              {t('corr_flow_note', 'Permohonan koreksi ini akan ditinjau oleh Leader Anda terlebih dahulu, kemudian diteruskan ke HR Admin untuk pengesahan resmi.')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('btn_cancel', 'Batal')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t('submitting', 'Mengirim...')}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>{t('btn_submit_corr', 'Kirim Pengajuan')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

