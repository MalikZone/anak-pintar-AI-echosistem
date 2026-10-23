import React, { useState } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import {
  Clock,
  Briefcase,
  X,
  FileCheck,
  Calendar,
  Sparkles,
  AlertCircle,
  Coins
} from 'lucide-react';

export default function OvertimeModal({ isOpen, onClose }) {
  const { submitOvertime, activeShift, companyProfile } = useAttendance();
  const { t } = useLanguage();
  const toast = useToast();

  const [type, setType] = useState('post_shift'); // 'post_shift' | 'pre_shift' | 'holiday_offday'
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState(activeShift?.endTime || '17:30');
  const [endTime, setEndTime] = useState('20:30');
  const [reason, setReason] = useState('');

  if (!isOpen) return null;

  // Calculate duration in hours
  const calculateDurationHours = () => {
    try {
      const [startH, startM] = startTime.split(':').map(Number);
      const [endH, endM] = endTime.split(':').map(Number);
      let diffMinutes = endH * 60 + endM - (startH * 60 + startM);
      if (diffMinutes < 0) {
        // Cross-midnight overtime
        diffMinutes += 24 * 60;
      }
      const hours = (diffMinutes / 60).toFixed(1);
      return Math.max(0.5, Number(hours));
    } catch {
      return 2.0;
    }
  };

  const durationHours = calculateDurationHours();
  const estimatedRate = Math.round(durationHours * 95000);

  const overtimeTypes = [
    {
      id: 'post_shift',
      label: t('ot_post_shift'),
      desc: t('ot_post_shift_desc'),
      defaultStart: activeShift?.endTime || '17:30',
      defaultEnd: '20:30',
    },
    {
      id: 'pre_shift',
      label: t('ot_pre_shift'),
      desc: t('ot_pre_shift_desc'),
      defaultStart: '06:30',
      defaultEnd: activeShift?.startTime || '08:30',
    },
    {
      id: 'holiday_offday',
      label: t('ot_holiday'),
      desc: t('ot_holiday_desc'),
      defaultStart: '09:00',
      defaultEnd: '15:00',
    },
  ];

  const handleTypeChange = (selectedId) => {
    setType(selectedId);
    const selected = overtimeTypes.find((t) => t.id === selectedId);
    if (selected) {
      setStartTime(selected.defaultStart);
      setEndTime(selected.defaultEnd);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.warning(t('ot_reason_placeholder'), t('toast_details_required_title'));
      return;
    }

    const selectedType = overtimeTypes.find((t) => t.id === type);

    submitOvertime({
      type,
      typeLabel: selectedType.label,
      date,
      startTime,
      endTime,
      durationHours,
      reason,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                {t('ot_modal_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('ot_modal_subtitle')}
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

        {/* Form with scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="overflow-y-auto flex-1 p-5 space-y-4 custom-scrollbar">
            
            {/* Overtime Type Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                {t('ot_category')}
              </label>
              <div className="space-y-2">
                {overtimeTypes.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      type === opt.id
                        ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/40 dark:border-amber-500 shadow-2xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="otType"
                        value={opt.id}
                        checked={type === opt.id}
                        onChange={() => handleTypeChange(opt.id)}
                        className="text-amber-600 focus:ring-amber-500 mt-1"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{opt.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{opt.desc}</p>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('ot_date')}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>

            {/* Time Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('ot_start_time')}
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('ot_end_time')}
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Duration & Compensation Summary */}
            <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block">{t('ot_total_hours')}</span>
                <span className="font-extrabold text-amber-900 dark:text-amber-200 font-mono text-sm">{durationHours} {t('days') === 'Hari' ? 'Jam' : 'Hours'}</span>
              </div>
              <div className="text-right">
                <span className="text-[11px] text-amber-700 dark:text-amber-400 block">{t('ot_est_compensation')}</span>
                <span className="font-extrabold text-emerald-700 dark:text-emerald-400 font-mono text-sm">
                  Rp {estimatedRate.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Reason / Job Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('ot_reason_label')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                placeholder={t('ot_reason_placeholder')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none resize-none"
              />
            </div>

          </div>

          {/* Sticky Action Buttons Footer */}
          <div className="flex gap-2.5 p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('modal_cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-colors"
            >
              {t('ot_btn_submit')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

