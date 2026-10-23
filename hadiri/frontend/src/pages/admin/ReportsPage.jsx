import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { attendanceApi } from '../../services/api/attendanceApi';
import { locationApi } from '../../services/api/locationApi';
import { departmentApi } from '../../services/api/departmentApi';
import { exportToCsv } from '../../utils/csvExport';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Calendar,
  Building2,
  FolderTree,
  Search,
  TrendingUp,
  Clock,
  AlertTriangle,
  CalendarCheck,
  RefreshCw,
  CheckCircle2,
  Users,
} from 'lucide-react';

export default function ReportsPage() {
  const { t } = useLanguage();
  const toast = useToast();

  // Current year-month (e.g. "2026-10")
  const defaultMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Fetch Branches & Departments for dropdown filters
  useEffect(() => {
    locationApi
      .getLocations()
      .then((data) => setBranches(Array.isArray(data) ? data : []))
      .catch(() => {});

    departmentApi
      .getDepartments()
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // Fetch Monthly Report Data
  const fetchReport = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await attendanceApi.getMonthlyReport({
        month: selectedMonth,
        branchId: selectedBranch || undefined,
        departmentId: selectedDept || undefined,
      });
      setReportData(res.data || res);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data laporan kehadiran.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedBranch, selectedDept, toast]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const records = reportData?.records || [];
  const period = reportData?.period || {
    month: selectedMonth,
    workDaysCount: 22,
  };

  // Filter records by branch, department, and search query (instant client-side + backend grounded)
  const filteredRecords = useMemo(() => {
    let result = records;
    if (selectedBranch) {
      const selectedBranchObj = branches.find((b) => b.id === selectedBranch);
      const targetBranchName = selectedBranchObj?.name?.toLowerCase().trim();
      result = result.filter((r) => {
        if (r.branchId === selectedBranch) return true;
        if (r.branch === selectedBranch) return true;
        const recordBranch = (r.branch || '').toLowerCase().trim();
        if (targetBranchName && (recordBranch === targetBranchName || recordBranch.includes(targetBranchName))) return true;
        return false;
      });
    }
    if (selectedDept) {
      const selectedDeptObj = departments.find((d) => d.id === selectedDept);
      const targetDeptName = selectedDeptObj?.name?.toLowerCase().trim();
      result = result.filter((r) => {
        if (r.departmentId === selectedDept) return true;
        if (r.department === selectedDept) return true;
        const recordDept = (r.department || '').toLowerCase().trim();
        if (targetDeptName && (recordDept === targetDeptName || recordDept.includes(targetDeptName) || targetDeptName.includes(recordDept))) return true;
        return false;
      });
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.email?.toLowerCase().includes(q) ||
          r.department?.toLowerCase().includes(q) ||
          r.position?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [records, selectedBranch, selectedDept, departments, searchQuery]);

  // Dynamically compute summary for KPI cards based on filtered records
  const summary = useMemo(() => {
    if (!filteredRecords.length) {
      return {
        totalEmployees: 0,
        totalPresent: 0,
        totalLate: 0,
        totalLateMinutes: 0,
        totalOvertimeHours: 0,
        totalOvertimeEarnings: 0,
        totalLeaves: 0,
        averageAttendanceRate: 100,
      };
    }
    const totalEmployees = filteredRecords.length;
    const totalPresent = filteredRecords.reduce((acc, r) => acc + (r.presentDays || 0), 0);
    const totalLate = filteredRecords.reduce((acc, r) => acc + (r.lateDays || 0), 0);
    const totalLateMinutes = filteredRecords.reduce((acc, r) => acc + (r.lateMinutes || 0), 0);
    const totalOvertimeHours = Number(
      filteredRecords.reduce((acc, r) => acc + (r.overtimeHours || 0), 0).toFixed(1)
    );
    const totalOvertimeEarnings = filteredRecords.reduce(
      (acc, r) => acc + (r.overtimeEarnings || 0),
      0
    );
    const totalLeaves = filteredRecords.reduce(
      (acc, r) => acc + ((r.sickDays || 0) + (r.leaveDays || 0)),
      0
    );
    const averageAttendanceRate =
      totalEmployees > 0
        ? Math.round(
            filteredRecords.reduce((acc, r) => acc + (r.attendanceRate || 0), 0) / totalEmployees
          )
        : 100;

    return {
      totalEmployees,
      totalPresent,
      totalLate,
      totalLateMinutes,
      totalOvertimeHours,
      totalOvertimeEarnings,
      totalLeaves,
      averageAttendanceRate,
    };
  }, [filteredRecords]);

  // Export Full Attendance & Payroll CSV
  const handleExportAttendanceCsv = () => {
    if (filteredRecords.length === 0) {
      toast.warning('Tidak ada data untuk diekspor.');
      return;
    }

    const columns = [
      { key: 'name', label: 'Nama Karyawan' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Departemen' },
      { key: 'position', label: 'Jabatan' },
      { key: 'branch', label: 'Cabang' },
      { key: 'branchBusinessType', label: 'Jenis Usaha' },
      { key: 'presentDays', label: 'Hadir Tepat Waktu (Hari)' },
      { key: 'lateDays', label: 'Terlambat (Hari)' },
      { key: 'totalAttended', label: 'Total Kehadiran (Hari)' },
      { key: 'totalWorkHours', label: 'Total Jam Kerja (Jam)' },
      { key: 'lateMinutes', label: 'Total Keterlambatan (Menit)' },
      { key: 'leaveDays', label: 'Cuti (Hari)' },
      { key: 'sickDays', label: 'Sakit (Hari)' },
      { key: 'unexcusedDays', label: 'Alpa (Hari)' },
      { key: 'overtimeHours', label: 'Jam Lembur (Jam)' },
      { key: 'overtimeEarnings', label: 'Estimasi Upah Lembur (Rp)' },
      { key: 'attendanceRate', label: 'Persentase Kehadiran (%)' },
    ];

    exportToCsv(`rekap-kehadiran-payroll-${selectedMonth}`, columns, filteredRecords);
    toast.success('File Rekap Kehadiran Excel/CSV berhasil diunduh!');
  };

  // Export Overtime (SPL) CSV
  const handleExportOvertimeCsv = () => {
    const overtimeRows = filteredRecords.filter((r) => r.overtimeHours > 0);
    if (overtimeRows.length === 0) {
      toast.info('Tidak ada catatan lembur karyawan pada periode ini.');
      return;
    }

    const columns = [
      { key: 'name', label: 'Nama Karyawan' },
      { key: 'email', label: 'Email' },
      { key: 'department', label: 'Departemen' },
      { key: 'position', label: 'Jabatan' },
      { key: 'branch', label: 'Cabang' },
      { key: 'overtimeHours', label: 'Total Jam Lembur (Jam)' },
      { key: 'overtimeEarnings', label: 'Total Kompensasi Lembur (Rp)' },
    ];

    exportToCsv(`rekap-lembur-spl-${selectedMonth}`, columns, overtimeRows);
    toast.success('File Rekap Lembur (SPL) berhasil diunduh!');
  };

  // Print PDF
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-4 print:p-2">
      
      {/* Page Header (Hidden or styled cleanly on print) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                {t('reports_title')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {t('reports_subtitle')}
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons: Export & Print */}
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleExportAttendanceCsv}
            disabled={isLoading || records.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Unduh format spreadsheet .csv"
          >
            <Download className="w-4 h-4" />
            <span>{t('btn_export_csv')}</span>
          </button>

          <button
            type="button"
            onClick={handleExportOvertimeCsv}
            disabled={isLoading || records.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 disabled:opacity-50"
            title="Unduh rekap SPL lembur"
          >
            <Download className="w-4 h-4" />
            <span>{t('btn_export_spl')}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/50 shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">{t('btn_print_pdf')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Attendance Rate */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t('kpi_avg_attendance')}</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 dark:text-white">
              {summary.averageAttendanceRate}%
            </span>
            <span className="text-[11px] text-slate-400">
              ({period.workDaysCount} {t('scheduled_work_days')})
            </span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(100, summary.averageAttendanceRate)}%` }}
            />
          </div>
        </div>

        {/* Total Overtime Hours */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t('kpi_total_overtime')}</span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 font-mono">
              {summary.totalOvertimeHours}j
            </span>
            <span className="text-[11px] text-slate-400">
              ≈ Rp {summary.totalOvertimeEarnings?.toLocaleString('id-ID')}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {records.filter((r) => r.overtimeHours > 0).length} staf lembur disetujui
          </p>
        </div>

        {/* Total Late Minutes */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t('kpi_total_late_minutes')}</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-mono">
              {summary.totalLateMinutes} m
            </span>
            <span className="text-[11px] text-slate-400">({summary.totalLate}x kejadian)</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {summary.totalPresent}x hadir tepat waktu
          </p>
        </div>

        {/* Total Leaves & Sick */}
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-soft">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs">
            <span>{t('kpi_total_leaves')}</span>
            <CalendarCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400 font-mono">
              {summary.totalLeaves} Hari
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-2 truncate">
            {summary.totalEmployees} total staf terdaftar
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-3 print:hidden">
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Month Selector */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-slate-800 dark:text-slate-100 font-semibold focus:outline-none text-xs"
            />
          </div>

          {/* Branch Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
            <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent border-none text-slate-800 dark:text-slate-100 font-medium focus:outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                {t('filter_all_branches')}
              </option>
              {branches.map((b) => (
                <option key={b.id} value={b.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                  {b.name} ({b.businessType || 'Cabang'})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs">
            <FolderTree className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              className="bg-transparent border-none text-slate-800 dark:text-slate-100 font-medium focus:outline-none text-xs cursor-pointer"
            >
              <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                {t('filter_all_departments')}
              </option>
              {departments.map((d) => (
                <option key={d.id} value={d.id} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {(selectedBranch || selectedDept || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedBranch('');
                setSelectedDept('');
                setSearchQuery('');
              }}
              className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline px-1 py-1 cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>

        {/* Search Input & Refresh Button */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_employee_placeholder')}
              className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={fetchReport}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            title="Segarkan Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

      </div>

      {/* Main Report Table Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden">
        
        {/* Print Only Letterhead */}
        <div className="hidden print:block p-4 border-b border-slate-300">
          <h2 className="text-lg font-bold text-slate-900">REKAPITULASI KEHADIRAN & PAYROLL BULANAN</h2>
          <p className="text-xs text-slate-600">
            Periode: {selectedMonth} • Dicetak pada: {new Date().toLocaleDateString('id-ID')}
          </p>
        </div>

        <div className="overflow-auto max-h-[600px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
              <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 whitespace-nowrap">{t('col_employee')}</th>
                <th className="py-3.5 px-4 whitespace-nowrap">{t('col_work_unit')}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{t('col_on_time')}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{t('col_late')}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{t('col_late_minutes')}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{t('col_leave')}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{t('col_sick')}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{t('col_unexcused')}</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">{t('col_overtime_hours')}</th>
                <th className="py-3.5 px-4 text-right whitespace-nowrap">{t('col_overtime_comp')}</th>
                <th className="py-3.5 px-4 text-center whitespace-nowrap">{t('col_attendance_rate')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-800 dark:text-slate-200 font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <p className="text-xs">Memuat rekap kehadiran...</p>
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400">
                    <Users className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <p className="text-sm font-semibold">{t('no_report_data')}</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr
                    key={r.userId}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Employee Profile */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={r.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=2563eb&color=fff&bold=true`}
                          alt={r.name}
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900 dark:text-white truncate">
                            {r.name}
                          </p>
                          <p className="text-[11px] text-slate-400 truncate">{r.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Department & Branch */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200 block truncate">
                          {r.department}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate">
                          {r.branch}
                        </span>
                      </div>
                    </td>

                    {/* On Time Days */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 font-mono font-bold text-[11px]">
                        {r.presentDays}
                      </span>
                    </td>

                    {/* Late Days */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-mono font-bold text-[11px] ${
                          r.lateDays > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                            : 'text-slate-400'
                        }`}
                      >
                        {r.lateDays}
                      </span>
                    </td>

                    {/* Late Minutes */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.lateMinutes > 0 ? `${r.lateMinutes}m` : '-'}
                    </td>

                    {/* Leave Days */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.leaveDays > 0 ? r.leaveDays : '-'}
                    </td>

                    {/* Sick Days */}
                    <td className="py-3 px-3 text-center font-mono text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {r.sickDays > 0 ? r.sickDays : '-'}
                    </td>

                    {/* Unexcused (Alpa) */}
                    <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                      {r.unexcusedDays > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 font-bold">
                          {r.unexcusedDays}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Overtime Hours */}
                    <td className="py-3 px-3 text-center font-mono whitespace-nowrap">
                      {r.overtimeHours > 0 ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 font-bold">
                          {r.overtimeHours}j
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Overtime Earnings */}
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {r.overtimeEarnings > 0
                        ? `Rp ${r.overtimeEarnings.toLocaleString('id-ID')}`
                        : '-'}
                    </td>

                    {/* Attendance Percentage */}
                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-xs ${
                            r.attendanceRate >= 90
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : r.attendanceRate >= 75
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-rose-600 dark:text-rose-400'
                          }`}
                        >
                          {r.attendanceRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Summary Count */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            Menampilkan <b>{filteredRecords.length}</b> dari total <b>{records.length}</b> karyawan terdaftar.
          </span>
          <span className="font-semibold text-slate-700 dark:text-slate-300">
            Standar Hari Kerja Bulan Ini: {period.workDaysCount} Hari
          </span>
        </div>

      </div>

    </div>
  );
}
