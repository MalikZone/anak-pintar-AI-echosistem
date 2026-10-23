import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { Clock, Briefcase, Eye, Edit3, MapPin, Send } from 'lucide-react';

export default function EmployeeCard({ employee, onSelect, onEdit, isHrAdmin = false }) {
  const { t } = useLanguage();

  const getRoleBadge = (role) => {
    switch (role) {
      case 'hr_admin':
        return { label: 'HR Admin', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      case 'leader':
        return { label: 'Leader', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      default:
        return { label: 'Staff', bg: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    }
  };

  const roleInfo = getRoleBadge(employee.role);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-5 hover:border-blue-300 dark:hover:border-blue-700 transition-all flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-xs shrink-0 group-hover:scale-105 transition-transform"
            />
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className="font-bold text-slate-900 dark:text-white text-sm line-clamp-1">{employee.name}</h4>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${roleInfo.bg} uppercase tracking-wider`}>
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{employee.position}</p>
              <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                {employee.department}
              </span>
            </div>
          </div>

          <div>
            {employee.todayStatus === 'present' && (
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block" title={t('stat_on_time')}></span>
            )}
            {employee.todayStatus === 'late' && (
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 block" title={t('stat_late')}></span>
            )}
            {employee.todayStatus === 'sick' && (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block" title={t('timeoff_sick_label')}></span>
            )}
            {employee.todayStatus === 'leave' && (
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 block" title={t('timeoff_annual_label')}></span>
            )}
            {employee.todayStatus === 'absent' && (
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 block" title={t('metric_absent')}></span>
            )}
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium text-slate-700 dark:text-slate-300">
              {employee.branch?.name || employee.locationName || t('branch_unassigned', 'Cabang belum ditentukan')}
            </span>
            {employee.branch?.businessType && (
              <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50 shrink-0">
                {employee.branch.businessType}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {t('shift_label', 'Shift')}: {employee.shiftName || employee.shiftCode || employee.shift || employee.shiftId}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">
              {t('reports_to_leader', 'Atasan')}: {employee.leader?.name || (employee.leaderId ? employee.leaderId : t('no_leader_assigned', 'Langsung ke HR'))}
            </span>
          </div>
          {(employee.telegramId || employee.telegram_id) && (
            <div className="flex items-center gap-2">
              <Send className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span className="truncate font-mono text-[11px] font-semibold text-sky-600 dark:text-sky-400">
                TG: {employee.telegramId || employee.telegram_id}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
        <span className="font-mono text-slate-400 text-[10px]">{employee.id}</span>
        
        <div className="flex items-center gap-2">
          {isHrAdmin && onEdit && (
            <button
              type="button"
              onClick={() => onEdit(employee)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
              title={t('edit_btn', 'Edit')}
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onSelect && onSelect(employee)}
            className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-bold px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{t('view_profile_history', 'Lihat Detail')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
