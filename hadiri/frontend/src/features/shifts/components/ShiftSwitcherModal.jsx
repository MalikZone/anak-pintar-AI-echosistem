import React from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Briefcase,
  X,
  CheckCircle2,
  Clock,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Sparkles,
  Info
} from 'lucide-react';

export default function ShiftSwitcherModal({ isOpen, onClose }) {
  const { shifts, activeShift, changeShift } = useAttendance();
  const { t } = useLanguage();

  if (!isOpen) return null;

  const getShiftIcon = (shift) => {
    if (!shift) return <Sun className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    if (shift.isCrossDay) return <Moon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    if (shift.id === 'SHIFT-S1' || shift.code === 'S1') return <Sunrise className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    if (shift.id === 'SHIFT-S2' || shift.code === 'S2') return <Sunset className="w-5 h-5 text-amber-600 dark:text-amber-400" />;
    return <Sun className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
  };

  const handleSelect = (shiftId) => {
    changeShift(shiftId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-900/70 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[90vh] rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col my-auto transition-all overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base leading-tight">{t('modal_shift_title')}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('modal_shift_subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          
          {/* Informative Callout */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200 flex items-start gap-2.5 text-xs leading-relaxed">
            <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
            <p>
              {t('modal_shift_callout_pre')} <strong>{t('modal_shift_callout_shift3')}</strong> {t('modal_shift_callout_mid')} <strong>{t('modal_shift_callout_cross')}</strong> {t('modal_shift_callout_post')}
            </p>
          </div>

          {/* Shift Options List */}
          <div className="space-y-2.5">
            {(!shifts || shifts.length === 0) ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <Clock className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Belum ada master shift terdaftar</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Admin tenant belum menambahkan jadwal shift untuk organisasi ini.</p>
              </div>
            ) : (
              shifts.filter(Boolean).map((s) => {
                const isSelected = activeShift?.id === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelect(s.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'border-blue-600 dark:border-blue-500 bg-blue-50/60 dark:bg-blue-950/50 shadow-sm ring-1 ring-blue-500'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50/70 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-2xs border border-slate-100 dark:border-slate-700 shrink-0">
                          {getShiftIcon(s)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{s?.name || 'Shift'}</h4>
                            {s?.isCrossDay && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-800 dark:text-indigo-300 text-[10px] font-extrabold">
                                <Sparkles className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                                {t('cross_midnight_badge')}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s?.description || ''}</p>
                          
                          {/* Windows & times */}
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {t('work_hours_label')} <strong className="text-slate-800 dark:text-slate-200">{s?.startTime || '-'} - {s?.endTime || '-'} WIB</strong>
                            </span>
                            <span className="text-slate-400">•</span>
                            <span>{t('grace_period_label')} {s?.gracePeriodMinutes || 0} {t('minutes')}</span>
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="text-blue-600 dark:text-blue-400 p-1">
                          <CheckCircle2 className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {t('btn_close')}
          </button>
        </div>

      </div>
    </div>
  );
}
