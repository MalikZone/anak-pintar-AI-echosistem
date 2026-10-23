import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useAttendance } from '../../../context/AttendanceContext';
import { useToast } from '../../../context/ToastContext';
import { rosterApi } from '../../../services/api';
import { departmentApi } from '../../../services/api/departmentApi';
import {
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Filter,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  AlertCircle,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';

export default function RosterSchedulerMatrix() {
  const { t, language, getShortDayName, getDayName } = useLanguage();
  const { shifts, companyProfile, currentUser } = useAttendance();
  const toast = useToast();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    // Start from Monday of current week
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const mon = new Date(d.setDate(diff));
    return mon.toISOString().slice(0, 10);
  });

  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const sun = new Date(d.setDate(diff + 6));
    return sun.toISOString().slice(0, 10);
  });

  const [selectedDept, setSelectedDept] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [matrixData, setMatrixData] = useState([]);
  const [dates, setDates] = useState([]);
  const [availableShifts, setAvailableShifts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Cell Edit Modal state
  const [selectedCell, setSelectedCell] = useState(null); // { user, date, currentShiftId, isOffDay }
  const [isCellModalOpen, setIsCellModalOpen] = useState(false);
  const [cellShiftId, setCellShiftId] = useState('');
  const [cellIsOff, setCellIsOff] = useState(false);
  const [cellNotes, setCellNotes] = useState('');

  // Bulk Generate Modal state
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkPattern, setBulkPattern] = useState('5-2');
  const [bulkDept, setBulkDept] = useState('all');
  const [bulkShiftId, setBulkShiftId] = useState('');
  const [bulkStartDate, setBulkStartDate] = useState(startDate);
  const [bulkEndDate, setBulkEndDate] = useState(endDate);
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  // Shift Switches State
  const [switches, setSwitches] = useState([]);
  const [isLoadingSwitches, setIsLoadingSwitches] = useState(false);

  // Load master departments dynamically
  useEffect(() => {
    departmentApi
      .getDepartments()
      .then((list) => {
        if (Array.isArray(list) && list.length > 0) {
          setDepartments(list.map((d) => d.name || d.title || d.code));
        }
      })
      .catch(() => {});
  }, []);

  const activeDepartmentOptions = useMemo(() => {
    const set = new Set(departments);
    matrixData.forEach((row) => {
      const dept = row.user?.department || row.department;
      if (dept) set.add(dept);
    });
    return Array.from(set).filter(Boolean);
  }, [departments, matrixData]);

  const fetchMatrix = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await rosterApi.getTeamMatrix({
        startDate,
        endDate,
        department: selectedDept,
      });
      setMatrixData(res.matrix || []);
      setDates(res.dates || []);
      setAvailableShifts(res.availableShifts || shifts || []);
    } catch (err) {
      toast.error(err.message || t('failed_load_matrix', 'Gagal memuat matrix roster'));
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate, selectedDept, shifts, toast]);

  const fetchSwitches = useCallback(async () => {
    setIsLoadingSwitches(true);
    try {
      const res = await rosterApi.getShiftSwitches({ includeResolved: 'false' });
      setSwitches(res || []);
    } catch (err) {
      console.warn('Error fetching switches:', err.message);
    } finally {
      setIsLoadingSwitches(false);
    }
  }, []);

  useEffect(() => {
    fetchMatrix();
    fetchSwitches();
  }, [fetchMatrix, fetchSwitches]);

  const handlePrevWeek = () => {
    const s = new Date(startDate);
    s.setDate(s.getDate() - 7);
    const e = new Date(endDate);
    e.setDate(e.getDate() - 7);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
  };

  const handleNextWeek = () => {
    const s = new Date(startDate);
    s.setDate(s.getDate() + 7);
    const e = new Date(endDate);
    e.setDate(e.getDate() + 7);
    setStartDate(s.toISOString().slice(0, 10));
    setEndDate(e.toISOString().slice(0, 10));
  };

  const handleCellClick = (user, item) => {
    const isOff = Boolean(item.isOffDay || item.shiftCode === 'OFF');
    const assignedShiftId = item.shiftId || item.shift?.id || (availableShifts[0]?.id || '');

    setSelectedCell({
      user,
      date: item.date,
      dayName: item.dayName,
      currentShiftId: assignedShiftId,
      isOffDay: isOff,
      notes: item.notes || '',
    });
    setCellShiftId(assignedShiftId);
    setCellIsOff(isOff);
    setCellNotes(item.notes || '');
    setIsCellModalOpen(true);
  };

  const handleSaveCell = async (e) => {
    e.preventDefault();
    if (!selectedCell) return;
    try {
      await rosterApi.assignRoster({
        userId: selectedCell?.user?.id || selectedCell?.user?.userId || selectedCell?.userId,
        date: selectedCell?.date,
        shiftId: cellIsOff ? null : cellShiftId,
        isOffDay: cellIsOff,
        notes: cellNotes,
      });
      toast.success(t('roster_saved', 'Jadwal berhasil diperbarui!'));
      setIsCellModalOpen(false);
      fetchMatrix();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan penugasan shift');
    }
  };

  const handleRunBulk = async (e) => {
    e.preventDefault();
    setIsBulkSubmitting(true);
    try {
      const res = await rosterApi.bulkGenerate({
        department: bulkDept,
        startDate: bulkStartDate,
        endDate: bulkEndDate,
        pattern: bulkPattern,
        defaultShiftId: bulkShiftId || null,
      });
      toast.success(
        t('bulk_roster_success', `Berhasil generate ${res.totalAssigned} entri jadwal untuk ${res.employeesCount} karyawan!`)
      );
      setIsBulkModalOpen(false);
      fetchMatrix();
    } catch (err) {
      toast.error(err.message || 'Gagal generate roster masal');
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  const handleReviewSwitch = async (switchId, action) => {
    try {
      await rosterApi.reviewShiftSwitch(switchId, { action });
      toast.success(
        action === 'approved'
          ? t('switch_approved', 'Pengajuan tukar shift berhasil disetujui!')
          : t('switch_rejected', 'Pengajuan tukar shift ditolak.')
      );
      fetchSwitches();
      fetchMatrix();
    } catch (err) {
      toast.error(err.message || 'Gagal memproses permohonan tukar shift');
    }
  };

  return (
    <div className="space-y-6">
      {/* Controls Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            <button
              type="button"
              onClick={handlePrevWeek}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
              {startDate} {t('date_range_to', 's/d')} {endDate}
            </span>
            <button
              type="button"
              onClick={handleNextWeek}
              className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent font-medium text-slate-700 dark:text-slate-200 focus:outline-none"
            >
              <option value="all">{t('all_departments', 'Semua Departemen')}</option>
              {activeDepartmentOptions.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={fetchMatrix}
            disabled={isLoading}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsBulkModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t('bulk_generate_btn', 'Generate Roster Pola Otomatis')}</span>
          </button>
        </div>
      </div>

      {/* Pending Shift Switch Requests Notification Drawer if any */}
      {switches.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-4 rounded-3xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span>{t('pending_switches_title', 'Permohonan Tukar Shift Menunggu Persetujuan')} ({switches.length})</span>
            </h4>
            <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              {t('action_required', 'Memerlukan Tinjauan Leader / HR')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {switches.map((sw) => (
              <div
                key={sw.id}
                className="bg-white dark:bg-slate-900 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/80 shadow-2xs space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 dark:text-white">{sw.userName || sw.userId}</span>
                  <span className="font-mono text-[10px] text-slate-400">{sw.targetDate}</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-xl">
                  <span>{sw.originalShiftName || 'Default'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{sw.requestedShiftName}</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                  "{sw.reason}"
                </p>
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {sw.status === 'pending_leader' ? (
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-md border border-indigo-200 dark:border-indigo-800">
                      Menunggu Persetujuan Leader (Tahap 1)
                    </span>
                  ) : sw.userId === currentUser?.id ? (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-1 rounded-md border border-amber-200 dark:border-amber-800">
                      Permohonan Anda (Menunggu Reviewer Lain)
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReviewSwitch(sw.id, 'rejected')}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-[11px] font-semibold transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>{t('reject', 'Tolak')}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReviewSwitch(sw.id, 'approved')}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t('approve', 'Setujui')}</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Interactive Matrix Table */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden">
        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
              <tr className="bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800">
                <th className="py-3 px-4 font-bold text-slate-600 dark:text-slate-300 w-60 sticky left-0 top-0 bg-slate-50 dark:bg-slate-800 z-30 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] whitespace-nowrap">
                  {t('employee', 'Karyawan')}
                </th>
                {dates.map((d) => {
                  const dateObj = new Date(d + 'T00:00:00');
                  const isSun = dateObj.getDay() === 0;
                  const isSat = dateObj.getDay() === 6;
                  const dateFormatted = dateObj.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  });
                  return (
                    <th
                      key={d}
                      className={`py-3 px-3 text-center font-bold min-w-[125px] whitespace-nowrap ${
                        isSun || isSat
                          ? 'text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-amber-950/20'
                          : 'text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="text-[10px] uppercase">{getDayName(d, language)}</div>
                      <div className="text-xs font-mono font-extrabold">{dateFormatted}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {matrixData.length === 0 ? (
                <tr>
                  <td colSpan={dates.length + 1} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                    <p className="font-medium">{t('no_roster_data', 'Tidak ada karyawan atau roster untuk filter ini')}</p>
                  </td>
                </tr>
              ) : (
                matrixData.map((row, index) => {
                  const empUser = row.user || {
                    id: row.userId,
                    name: row.userName,
                    department: row.department,
                    email: row.email,
                  };
                  return (
                      <tr key={empUser.id || row.userId || index} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                          {/* Employee Profile Cell */}
                          <td className="py-3 px-4 sticky left-0 bg-white dark:bg-slate-900 z-10 shadow-[1px_0_0_0_#e2e8f0] dark:shadow-[1px_0_0_0_#1e293b] whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                                {empUser.name?.charAt(0) || 'U'}
                              </div>
                              <div className="truncate max-w-[180px]">
                                <p className="font-bold text-slate-900 dark:text-white truncate">{empUser.name || t('employee_fallback', 'Karyawan')}</p>
                                <p className="text-[10px] text-slate-400 truncate font-mono">{empUser.id || '-'} • {empUser.department || '-'}</p>
                              </div>
                            </div>
                          </td>

                          {/* Schedule Day Cells */}
                          {(row.schedule || []).map((item) => {
                            const isOff = Boolean(item.isOffDay || item.shiftCode === 'OFF');
                            const shift = item.shift;
                            const shiftCode = shift?.code || item.shiftCode || (isOff ? 'OFF' : 'REG');
                            const startTime = shift?.startTime || item.startTime;
                            const endTime = shift?.endTime || item.endTime;
                            const isCrossDay = Boolean(shift?.isCrossDay ?? item.isCrossDay);
                            const shiftName = shift?.name || item.shiftName || 'Shift';

                            const cellDateObj = item.date ? new Date(item.date + 'T00:00:00') : new Date();
                            const cellDayName = getDayName(item.date || item.dayName, language);
                            const cellDateWithYear = cellDateObj.toLocaleDateString(language === 'id' ? 'id-ID' : 'en-US', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            });

                            return (
                              <td
                                key={item.date}
                                onClick={() => handleCellClick(empUser, item)}
                                className="py-2.5 px-1.5 text-center cursor-pointer hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 transition-colors whitespace-nowrap"
                              >
                              <div
                                className={`p-2 rounded-xl border text-[11px] font-medium transition-all ${
                                  isOff
                                    ? 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                    : isCrossDay
                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-2xs'
                                    : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                }`}
                              >
                                {/* Day, Date, and Year inside Matrix Cell */}
                                <div className="border-b border-current/15 pb-1 mb-1 text-[9.5px] leading-tight whitespace-nowrap">
                                  <span className="font-bold block">{cellDayName}</span>
                                  <span className="font-mono text-[8.5px] opacity-80 block">{cellDateWithYear}</span>
                                </div>

                                {isOff ? (
                                  <div className="font-bold text-[10px] tracking-wider uppercase py-0.5">{t('off_short', 'LIBUR')}</div>
                                ) : (
                                  <div>
                                    <div className="font-bold font-mono text-xs">{shiftCode}</div>
                                    <div className="text-[9px] opacity-80 font-mono truncate whitespace-nowrap">
                                      {startTime && endTime && startTime !== '-' ? `${startTime} - ${endTime}` : shiftName}
                                      {isCrossDay ? ' (+1)' : ''}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                  );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cell Assign Modal */}
      {isCellModalOpen && selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {t('assign_shift_title', 'Penugasan Shift Harian')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {(selectedCell.user?.name || selectedCell.user?.userName || t('employee_fallback', 'Karyawan'))} • {selectedCell.date} ({getDayName(selectedCell.date || selectedCell.dayName, language)})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCellModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCell} className="mt-4 space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700">
                <input
                  type="checkbox"
                  id="isOffToggle"
                  checked={cellIsOff}
                  onChange={(e) => setCellIsOff(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="isOffToggle" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer">
                  {t('set_as_off_day', 'Tetapkan Sebagai Hari Libur (Off Day)')}
                </label>
              </div>

              {!cellIsOff && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('select_shift', 'Pilih Shift Operasional')}
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {(availableShifts || []).filter(Boolean).map((s) => (
                      <label
                        key={s.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer text-xs transition-all ${
                          cellShiftId === s.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 text-indigo-900 dark:text-indigo-200 font-bold'
                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="cellShift"
                            value={s.id}
                            checked={cellShiftId === s.id}
                            onChange={() => setCellShiftId(s.id)}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <div>
                            <span className="font-mono font-extrabold mr-1.5">[{s?.code || '-'}]</span>
                            <span>{s?.name || 'Shift'}</span>
                          </div>
                        </div>
                        <span className="font-mono text-[11px] opacity-80">
                          {s?.startTime || '-'} - {s?.endTime || '-'}
                          {s?.isCrossDay ? ' (+1)' : ''}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('notes', 'Catatan / Alasan Penugasan (Opsional)')}
                </label>
                <input
                  type="text"
                  value={cellNotes}
                  onChange={(e) => setCellNotes(e.target.value)}
                  placeholder={t('roster_notes_placeholder', 'misal: Penugasan lembur darurat atau backup tim')}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCellModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t('cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20"
                >
                  {t('save', 'Terapkan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Generate Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>{t('bulk_generate_title', 'Generate Roster Pola Otomatis')}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {t('bulk_generate_desc', 'Terapkan pola kerja shift berulang secara masal ke seluruh departemen')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRunBulk} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('department_target', 'Departemen Target')}
                </label>
                <select
                  value={bulkDept}
                  onChange={(e) => setBulkDept(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="all">{t('all_departments', 'Semua Departemen Tenant')}</option>
                  {activeDepartmentOptions.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('start_date', 'Tanggal Mulai')}
                  </label>
                  <input
                    type="date"
                    value={bulkStartDate}
                    onChange={(e) => setBulkStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('end_date', 'Tanggal Akhir')}
                  </label>
                  <input
                    type="date"
                    value={bulkEndDate}
                    onChange={(e) => setBulkEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('roster_pattern', 'Pola Kerja Roster')}
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="bulkPattern"
                      value="5-2"
                      checked={bulkPattern === '5-2'}
                      onChange={() => setBulkPattern('5-2')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{t('pattern_5_2_title', 'Pola 5-2 (Standar Kantor)')}</p>
                      <p className="text-[11px] text-slate-500">{t('pattern_5_2_desc', '5 hari kerja Senin-Jumat, 2 hari libur Sabtu & Minggu')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="bulkPattern"
                      value="4-2"
                      checked={bulkPattern === '4-2'}
                      onChange={() => setBulkPattern('4-2')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{t('pattern_4_2_title', 'Pola 4-2 (Operasional Bergilir)')}</p>
                      <p className="text-[11px] text-slate-500">{t('pattern_4_2_desc', '4 hari kerja siaga berturut-turut, 2 hari libur pemulihan')}</p>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="bulkPattern"
                      value="6-1"
                      checked={bulkPattern === '6-1'}
                      onChange={() => setBulkPattern('6-1')}
                      className="text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{t('pattern_6_1_title', 'Pola 6-1 (Retail / Logistik)')}</p>
                      <p className="text-[11px] text-slate-500">{t('pattern_6_1_desc', '6 hari kerja operasional, 1 hari libur di akhir pekan')}</p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('default_shift', 'Shift Default Yang Diberikan (Kosongkan untuk shift masing-masing)')}
                </label>
                <select
                  value={bulkShiftId}
                  onChange={(e) => setBulkShiftId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="">{t('use_employee_default_shift', 'Gunakan Shift Default Karyawan')}</option>
                  {(availableShifts || []).filter(Boolean).map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s?.code || '-'}] {s?.name || 'Shift'} ({s?.startTime || '-'} - {s?.endTime || '-'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  {t('cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isBulkSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-60"
                >
                  {isBulkSubmitting ? t('generating', 'Memproses...') : t('execute_bulk', 'Jalankan Generate Roster')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

