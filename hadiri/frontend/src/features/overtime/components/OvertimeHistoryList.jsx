import React, { useState } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  XCircle,
  FileText,
  Coins,
  Plus,
  Calendar,
  Sparkles
} from 'lucide-react';
import OvertimeModal from './OvertimeModal';

export default function OvertimeHistoryList() {
  const { overtimeRequests, currentUser } = useAttendance();
  const { t, language, getDayName } = useLanguage();
  const [filterStatus, setFilterStatus] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filter for employee's own requests
  const userRequests = (overtimeRequests || []).filter(
    (req) => req.employeeId === currentUser?.id || req.userId === currentUser?.id || req.user_id === currentUser?.id
  );

  const filteredRequests = userRequests.filter((req) => {
    if (filterStatus === 'all') return true;
    return req.status === filterStatus;
  });

  const totalApprovedHours = userRequests
    .filter((r) => r.status === 'approved')
    .reduce((acc, curr) => acc + (curr.durationHours || 0), 0);

  const totalEstimatedEarnings = userRequests
    .filter((r) => r.status === 'approved')
    .reduce((acc, curr) => acc + (curr.estimatedRateIDR || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Top Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('ot_stat_approved_hours')}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white font-mono">{totalApprovedHours}</span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('ot_stat_month_hours')}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">{t('ot_stat_estimated_comp')}</p>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Rp</span>
            <span className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 font-mono">
              {totalEstimatedEarnings.toLocaleString('id-ID')}
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs transition-colors">
          <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">{t('ot_stat_pending_hr')}</p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-600 font-mono">
              {userRequests.filter((r) => r.status === 'pending' || r.status === 'pending_leader' || r.status === 'pending_hr').length}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('ot_stat_requests_count')}</span>
          </div>
        </div>
      </div>

      {/* Main Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('ot_history_title')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('ot_history_subtitle')}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Pills */}
            <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setFilterStatus('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'all'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('filter_all')}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('pending')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'pending'
                    ? 'bg-white dark:bg-slate-700 text-amber-800 dark:text-amber-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('tab_pending')}
              </button>
              <button
                type="button"
                onClick={() => setFilterStatus('approved')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  filterStatus === 'approved'
                    ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {t('tab_approved')}
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm shadow-amber-500/20 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('ot_apply_btn')}</span>
            </button>
          </div>
        </div>

        {/* List Content */}
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-slate-400 dark:text-slate-500">
            <Clock className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{t('ot_empty_title')}</p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              {t('ot_empty_desc')}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredRequests.map((req) => {
              const applicantName = req.employeeName || req.userName || currentUser?.name || 'Karyawan';
              const applicantDept = req.department || currentUser?.department || 'Staf';
              const initials = applicantName.slice(0, 2).toUpperCase();
              const dayName = getDayName(req.date || req.dayName, language);

              return (
                <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50/60 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    
                    <div className="flex items-start gap-3.5">
                      {/* Applicant Avatar & Badge */}
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-extrabold flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800 shadow-2xs mt-0.5">
                        {req.avatar ? (
                          <img src={req.avatar} alt={applicantName} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          <span className="text-xs">{initials}</span>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {applicantName}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            • {applicantDept}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {req.splNumber}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                            {req.type === 'holiday' ? t('ot_type_holiday', 'Lembur Hari Libur') : req.type === 'pre_shift' ? t('ot_type_pre', 'Lembur Pra-Shift') : t('ot_type_regular', 'Lembur Reguler')}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1 font-medium">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {dayName}, {req.date}
                          </span>
                          <span>•</span>
                          <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {req.startTime} - {req.endTime} WIB ({req.durationHours} {t('hours', 'Jam')})
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 dark:text-slate-300 italic mt-1">"{req.reason}"</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800 shrink-0">
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] text-slate-400 block">{t('ot_wage_est')}</span>
                        <span className="text-xs font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          Rp {req.estimatedRateIDR?.toLocaleString('id-ID')}
                        </span>
                      </div>

                      <div>
                        {req.status === 'pending_leader' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-indigo-600" />
                            {t('status_pending_leader', 'Menunggu Persetujuan Leader')}
                          </span>
                        )}
                        {(req.status === 'pending_hr' || req.status === 'pending') && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 text-xs font-bold">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            {t('ot_awaiting_badge')}
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {t('leave_status_approved')}
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                            {t('leave_status_rejected')}
                          </span>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      <OvertimeModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
