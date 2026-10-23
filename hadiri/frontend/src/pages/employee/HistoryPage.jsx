import React, { useEffect } from 'react';
import { AttendanceHistoryTable } from '../../features/attendance';
import { useAttendance } from '../../context/AttendanceContext';
import { useLanguage } from '../../context/LanguageContext';

export default function HistoryPage() {
  const { fetchAttendanceHistory } = useAttendance();
  const { t } = useLanguage();

  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t('attendance_history_title')}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          {t('attendance_history_subtitle')}
        </p>
      </div>
      <AttendanceHistoryTable />
    </div>
  );
}

