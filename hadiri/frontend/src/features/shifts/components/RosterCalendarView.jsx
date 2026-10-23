import React, { useState, useEffect } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { rosterApi } from '../../../services/api';
import {
  Calendar,
  Clock,
  Sparkles,
  Moon,
  Sun,
  Sunrise,
  Sunset,
  Coffee,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Repeat,
  X,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Inbox,
} from 'lucide-react';
import ShiftSwitchRequestModal from './ShiftSwitchRequestModal';
import ShiftSwitcherModal from './ShiftSwitcherModal';

export default function RosterCalendarView() {
  const {
    weeklyRoster,
    activeShift,
    companyProfile,
    shifts,
    fetchMyRoster,
    myShiftSwitches,
    fetchMyShiftSwitches,
    currentUser,
  } = useAttendance();
  const { t, language, getDayName } = useLanguage();

  const [isSwitchModalOpen, setIsSwitchModalOpen] = useState(false);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().slice(0, 10));

  const userShiftSwitches = (myShiftSwitches || []).filter(
    (s) => s.userId === currentUser?.id || s.user_id === currentUser?.id
  );

  useEffect(() => {
    fetchMyShiftSwitches({ force: true });
  }, [fetchMyShiftSwitches]);

  const handleOpenSwitchModal = (dateStr = null) => {
    if (dateStr) {
      setTargetDate(dateStr);
    } else {
      setTargetDate(new Date().toISOString().slice(0, 10));
    }
    setIsSwitchModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-200 dark:border-blue-800">
              {companyProfile?.name || 'Organisasi'}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">• Roster & Shift Schedule</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">{t('roster_title')}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('roster_subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleOpenSwitchModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-colors"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{t('request_shift_switch', 'Ajukan Tukar Shift')}</span>
          </button>
        </div>
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {weeklyRoster.map((item, idx) => {
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border transition-all ${
                item.isToday
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 ring-2 ring-blue-500/20 shadow-sm'
                  : item.isOffDay
                  ? 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-2xs hover:shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    {getDayName(item.date || item.dayName, language)}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{item.date}</span>
                </div>
                {item.isToday ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-600 text-white shadow-2xs">
                    {t('today_badge')}
                  </span>
                ) : item.isOffDay ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    {t('off_day_badge')}
                  </span>
                ) : null}
              </div>

              {item.isOffDay ? (
                <div className="py-4 text-center">
                  <Coffee className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600 mb-1" />
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">{item.shiftName}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">{t('weekly_rest_desc')}</p>
                </div>
              ) : (
                <div className="space-y-2 mt-3 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.isCrossDay ? (
                        <Moon className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      ) : item.shiftCode === 'S2' ? (
                        <Sunset className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      ) : (
                        <Sun className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      )}
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1">{item.shiftName}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenSwitchModal(item.date)}
                      className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                      title={t('request_shift_switch', 'Tukar Shift')}
                    >
                      <Repeat className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-xs bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-100 dark:border-slate-700 font-mono">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{item.startTime}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {item.endTime}
                      {item.isCrossDay && <span className="text-indigo-600 dark:text-indigo-400 font-bold ml-1">(+1)</span>}
                    </span>
                  </div>

                  {item.isCrossDay && (
                    <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-[10px] font-bold text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      <span>{t('cross_day_shift_tag')}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Rules Information Card */}
      <div className="bg-slate-900 text-white p-5 rounded-3xl shadow-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-2xl bg-white/10 text-amber-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">{t('roster_policy_title')}</h4>
            <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
              {t('roster_policy_desc')}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsSwitcherOpen(true)}
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 shrink-0"
        >
          {t('view_shift_catalog')}
        </button>
      </div>

      {/* My Shift Switch Requests Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-5 sm:p-6 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
                <Repeat className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('my_switch_requests_title', 'Daftar Permohonan Tukar Shift Saya')}
              </h3>
              {myShiftSwitches?.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300">
                  {myShiftSwitches.length}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('my_switch_requests_subtitle', 'Pantau status permohonan ganti jadwal kerja yang telah diajukan ke Leader')}
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenSwitchModal()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md shadow-amber-500/20 transition-all active:scale-95 self-start sm:self-center"
          >
            <Repeat className="w-3.5 h-3.5" />
            <span>{t('request_shift_switch', 'Ajukan Tukar Shift')}</span>
          </button>
        </div>

        {(!userShiftSwitches || userShiftSwitches.length === 0) ? (
          <div className="text-center py-10 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-700/80">
            <Inbox className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {t('no_switch_requests', 'Belum Ada Permohonan Tukar Shift')}
            </p>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 max-w-sm mx-auto">
              {t('no_switch_requests_desc', 'Anda belum mengajukan permohonan ganti jadwal. Jika berhalangan pada jadwal saat ini, klik tombol "Ajukan Tukar Shift".')}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {userShiftSwitches.map((req) => {
              const origShiftName = req.originalShift?.name || req.originalShiftName || t('original_shift', 'Shift Asal');
              const origShiftCode = req.originalShift?.code || req.originalShiftCode || 'REG';
              const origStart = req.originalShift?.startTime || req.originalStartTime || '-';
              const origEnd = req.originalShift?.endTime || req.originalEndTime || '-';

              const applicantName = req.userName || req.user_name || req.user?.name || currentUser?.name || 'Employee';
              const applicantDept = req.userDepartment || currentUser?.department || 'Staff';
              const initials = applicantName.slice(0, 2).toUpperCase();

              const reqShiftName = req.requestedShift?.name || req.requestedShiftName || t('shift_requested_new', 'Shift Baru');
              const reqShiftCode = req.requestedShift?.code || req.requestedShiftCode || 'NEW';
              const reqStart = req.requestedShift?.startTime || req.requestedStartTime || '-';
              const reqEnd = req.requestedShift?.endTime || req.requestedEndTime || '-';

              const targetDateStr = req.targetDate || req.target_date;
              const dayName = getDayName(targetDateStr, language);

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      {/* Applicant Avatar & Badge */}
                      <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-extrabold flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800 shadow-2xs mt-0.5">
                        {req.avatar ? (
                          <img src={req.avatar} alt={applicantName} className="w-full h-full rounded-2xl object-cover" />
                        ) : (
                          <span className="text-xs">{initials}</span>
                        )}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-white">
                            {applicantName}
                          </span>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                            • {applicantDept}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            #{req.id}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-1">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="font-semibold text-indigo-600 dark:text-indigo-400 font-mono">
                            {dayName}, {targetDateStr}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="self-start sm:self-center shrink-0">
                      {req.status === 'pending_leader' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>{t('status_pending_leader', 'Menunggu Persetujuan Leader')}</span>
                        </span>
                      )}
                      {(req.status === 'pending_hr' || (req.status === 'pending' && !req.userLeaderId)) && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                          <span>{t('status_pending_hr', 'Menunggu Persetujuan Final HR')}</span>
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{t('status_approved', 'Disetujui')}</span>
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                          <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          <span>{t('status_rejected', 'Ditolak')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Shift Comparison */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                        {t('shift_scheduled_orig', 'Shift Terjadwal Semula')}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          [{origShiftCode}] {origShiftName}
                        </span>
                        <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                          {origStart} - {origEnd}
                        </span>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-900/50">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">
                        {t('shift_requested_new', 'Shift Baru Yang Diminta')}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-900 dark:text-amber-200">
                          [{reqShiftCode}] {reqShiftName}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-700 dark:text-amber-300">
                          {reqStart} - {reqEnd}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Reason & Rejection Reason */}
                  <div className="text-xs space-y-1 pt-1">
                    <p className="text-slate-600 dark:text-slate-300 italic">
                      <span className="font-semibold not-italic text-slate-700 dark:text-slate-200">
                        {t('label_reason', 'Alasan:')}{' '}
                      </span>
                      "{req.reason}"
                    </p>
                    {req.status === 'rejected' && (req.rejectionReason || req.rejection_reason) && (
                      <p className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 pt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>
                          {t('label_rejection_reason', 'Alasan Penolakan:')} {req.rejectionReason || req.rejection_reason}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Shift Switch Request Modal */}
      <ShiftSwitchRequestModal
        isOpen={isSwitchModalOpen}
        onClose={() => setIsSwitchModalOpen(false)}
        initialDate={targetDate}
      />

      {/* Shift Catalog / Switcher Modal */}
      <ShiftSwitcherModal
        isOpen={isSwitcherOpen}
        onClose={() => setIsSwitcherOpen(false)}
      />
    </div>
  );
}
