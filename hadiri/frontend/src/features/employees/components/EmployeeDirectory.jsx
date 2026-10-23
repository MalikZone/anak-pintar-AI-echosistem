import React, { useState, useEffect, useMemo } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useAuth } from '../../../context/AuthContext';
import { useLanguage } from '../../../context/LanguageContext';
import EmployeeCard from './EmployeeCard';
import EmployeeModal from './EmployeeModal';
import EmployeeDetailModal from './EmployeeDetailModal';
import EmployeeBulkImportModal from './EmployeeBulkImportModal';
import { Search, Plus, Filter, Users, Shield, Briefcase, MapPin, Upload } from 'lucide-react';

export default function EmployeeDirectory() {
  const { employees, fetchEmployees, shifts } = useAttendance();
  const { isHrAdmin, isSuperAdmin, can } = useAuth();
  const canManage = isHrAdmin || isSuperAdmin || can('employees.create') || can('employees.update');
  const { t } = useLanguage();

  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');

  // Modals state
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [detailEmployee, setDetailEmployee] = useState(null);

  useEffect(() => {
    fetchEmployees({ force: true });
  }, [fetchEmployees]);

  const leaders = useMemo(() => {
    return [...employees].sort((a, b) => {
      const rank = (emp) => {
        if (emp.role === 'leader') return 1;
        if (emp.role === 'hr_admin') return 2;
        if (/lead|manager|head|supervisor|direktur|chief/i.test(emp.position || '')) return 3;
        return 4;
      };
      const diff = rank(a) - rank(b);
      if (diff !== 0) return diff;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [employees]);

  const departments = useMemo(() => {
    return Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));
  }, [employees]);

  const branches = useMemo(() => {
    const list = [];
    const seen = new Set();
    employees.forEach((e) => {
      const bName = e.branch?.name || e.locationName;
      if (bName && !seen.has(bName)) {
        seen.add(bName);
        list.push({ name: bName, businessType: e.branch?.businessType });
      }
    });
    return list;
  }, [employees]);

  const filtered = employees.filter((emp) => {
    const matchDept = deptFilter === 'all' || emp.department === deptFilter;
    const matchRole = roleFilter === 'all' || emp.role === roleFilter;
    const matchBranch =
      branchFilter === 'all' ||
      emp.branch?.name === branchFilter ||
      emp.locationName === branchFilter;
    const q = search.toLowerCase().trim();
    const matchSearch =
      !q ||
      emp.name?.toLowerCase().includes(q) ||
      emp.position?.toLowerCase().includes(q) ||
      emp.email?.toLowerCase().includes(q) ||
      emp.id?.toLowerCase().includes(q) ||
      (emp.telegramId || emp.telegram_id || '')?.toLowerCase().includes(q) ||
      emp.branch?.name?.toLowerCase().includes(q) ||
      emp.branch?.businessType?.toLowerCase().includes(q) ||
      emp.locationName?.toLowerCase().includes(q);

    return matchDept && matchRole && matchBranch && matchSearch;
  });

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setIsFormModalOpen(true);
  };

  const handleSaved = () => {
    fetchEmployees({ force: true });
  };

  const handleDeleted = () => {
    fetchEmployees({ force: true });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t('employee_directory_title', 'Direktori Karyawan & Personalia')}
            </h2>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              {employees.length} {t('total_employees', 'Karyawan')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('employee_directory_subtitle', 'Kelola informasi profil, penugasan shift, hirarki leader, dan hak cuti tahunan perusahaan')}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsBulkImportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold transition-all shadow-xs"
              title="Impor banyak karyawan sekaligus via file CSV"
            >
              <Upload className="w-4 h-4" />
              <span>{t('btn_bulk_import', 'Impor Massal (CSV)')}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{t('add_employee_btn', 'Tambah Karyawan Baru')}</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_employee_placeholder', 'Cari nama, jabatan, email, atau ID karyawan...')}
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none shadow-xs"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Dept Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <Briefcase className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none"
            >
              <option value="all">{t('all_departments', 'Semua Departemen')} ({employees.length})</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none"
            >
              <option value="all">{t('all_roles', 'Semua Peran')}</option>
              <option value="employee">{t('nav_portal_employee', 'Staff Karyawan')}</option>
              <option value="leader">{t('nav_portal_leader', 'Team Leader')}</option>
              <option value="hr_admin">{t('nav_portal_admin', 'HR Admin')}</option>
            </select>
          </div>

          {/* Branch Filter */}
          {branches.length > 0 && (
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-2xl border border-slate-300 dark:border-slate-700 shadow-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="text-xs font-medium text-slate-700 dark:text-slate-200 bg-transparent focus:outline-none"
              >
                <option value="all">{t('all_branches', 'Semua Cabang')} ({branches.length})</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name} {b.businessType ? `[${b.businessType}]` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Employee Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              isHrAdmin={canManage}
              onSelect={(e) => setDetailEmployee(e)}
              onEdit={(e) => handleOpenEdit(e)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {t('no_employees_found', 'Tidak ada karyawan yang sesuai filter')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            {t('no_employees_found_desc', 'Coba gunakan kata kunci pencarian lain atau reset filter departemen & peran.')}
          </p>
        </div>
      )}

      {/* Form Modal (Create / Edit) */}
      {isFormModalOpen && (
        <EmployeeModal
          key={editingEmployee?.id || 'new-employee'}
          isOpen={isFormModalOpen}
          onClose={() => {
            setIsFormModalOpen(false);
            setEditingEmployee(null);
          }}
          employee={editingEmployee}
          shifts={shifts || []}
          leaders={leaders}
          onSaved={handleSaved}
        />
      )}

      {/* Detail Modal */}
      {Boolean(detailEmployee) && (
        <EmployeeDetailModal
          isOpen={Boolean(detailEmployee)}
          onClose={() => setDetailEmployee(null)}
          employee={detailEmployee}
          isHrAdmin={canManage}
          onEdit={(emp) => handleOpenEdit(emp)}
          onDeleted={handleDeleted}
        />
      )}

      {/* Bulk Import Modal */}
      <EmployeeBulkImportModal
        isOpen={isBulkImportOpen}
        onClose={() => setIsBulkImportOpen(false)}
        onSuccess={() => fetchEmployees({ force: true })}
      />

    </div>
  );
}
