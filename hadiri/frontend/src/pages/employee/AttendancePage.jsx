import React from 'react';
import { ClockCard } from '../../features/attendance';
import { useLanguage } from '../../context/LanguageContext';

export default function AttendancePage() {
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('live_attendance_title')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t('live_attendance_subtitle')}
        </p>
      </div>
      <ClockCard />
    </div>
  );
}
