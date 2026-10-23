import React, { useState, useEffect, useMemo } from 'react';
import { departmentApi } from '../../services/api/departmentApi';
import { userApi } from '../../services/api/userApi';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  Building2,
  FolderTree,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  Network,
  AlertTriangle,
  X,
  UserCheck,
  ChevronRight,
} from 'lucide-react';

export default function DepartmentsManagementPage() {
  const { t } = useLanguage();
  const toast = useToast();

  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deptToDelete, setDeptToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [deptRes, empRes] = await Promise.allSettled([
        departmentApi.getDepartments(),
        userApi.getDirectory(),
      ]);

      if (deptRes.status === 'fulfilled') {
        setDepartments(deptRes.value || []);
      }
      if (empRes.status === 'fulfilled') {
        setEmployees(empRes.value || []);
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data departemen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredDepartments = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return departments;
    return departments.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.code?.toLowerCase().includes(q) ||
        d.parentName?.toLowerCase().includes(q) ||
        d.managerName?.toLowerCase().includes(q)
    );
  }, [departments, search]);

  const stats = useMemo(() => {
    const total = departments.length;
    const parentDepts = departments.filter((d) => !d.parentId).length;
    const subDepts = departments.filter((d) => !!d.parentId).length;
    const totalEmps = departments.reduce((acc, d) => acc + (d.employeeCount || 0), 0);
    return { total, parentDepts, subDepts, totalEmps };
  }, [departments]);

  const handleOpenCreate = () => {
    setEditingDept(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (dept) => {
    setDeptToDelete(dept);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deptToDelete) return;
    try {
      await departmentApi.deleteDepartment(deptToDelete.id);
      toast.success(t('dept_deleted_success', `Departemen ${deptToDelete.name} berhasil dinonaktifkan.`));
      setIsDeleteModalOpen(false);
      setDeptToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus departemen.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('departments_title', 'Master Departemen & Divisi')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('departments_subtitle', 'Kelola hierarki organisasi perusahaan, sub-divisi, dan penunjukan Kepala Departemen (HOD).')}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('btn_add_department', 'Tambah Departemen')}</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('total_departments', 'Total Departemen')}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('main_divisions', 'Divisi Utama')}</p>
          <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.parentDepts}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('sub_divisions', 'Sub-Divisi')}</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.subDepts}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('total_employees', 'Total Karyawan')}</p>
          <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.totalEmps}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search_departments_placeholder', 'Cari berdasarkan nama departemen, kode, atau kepala divisi...')}
          className="w-full text-xs bg-transparent border-none outline-hidden text-slate-900 dark:text-white placeholder-slate-400"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>{t('loading_tenants', 'Memuat data departemen...')}</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {departments.length === 0 ? t('no_departments_found', 'Belum Ada Departemen') : t('no_departments_found', 'Departemen Tidak Ditemukan')}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {departments.length === 0
                ? t('no_departments_desc', 'Tambahkan struktur departemen pertama untuk mengelompokkan karyawan perusahaan Anda.')
                : t('no_departments_desc', 'Tidak ada departemen yang sesuai dengan kata kunci pencarian Anda.')}
            </p>
            {departments.length === 0 && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                + {t('btn_create_first_dept', 'Tambah Departemen Pertama')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_dept_code', 'Kode')} & ID</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_dept_name', 'Nama Departemen')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_parent_dept', 'Departemen Induk')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_manager', 'Kepala Departemen (HOD)')}</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">{t('col_staff', 'Anggota Staf')}</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">{t('col_action', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                      <div>{dept.code}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{dept.id}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>{dept.name}</span>
                      </div>
                      {dept.description && (
                        <p className="text-[11px] text-slate-400 max-w-sm truncate mt-0.5">{dept.description}</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                      {dept.parentName ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                          <FolderTree className="w-3 h-3 text-slate-400" />
                          {dept.parentName}
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">{t('form_no_parent', 'Divisi Utama (Root)')}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {dept.managerName ? (
                        <div className="flex items-center gap-1.5 font-medium">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{dept.managerName}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">{t('form_no_manager', '- Belum ditentukan -')}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        <Users className="w-3 h-3" />
                        {dept.employeeCount || 0}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(dept)}
                          title={t('btn_edit', 'Edit Departemen')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenDelete(dept)}
                          title={t('btn_delete', 'Hapus Departemen')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <DepartmentModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          department={editingDept}
          existingDepartments={departments}
          employees={employees}
          onSaved={() => {
            setIsModalOpen(false);
            fetchData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && deptToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl">
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 w-fit mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('confirm_delete_dept_title', 'Hapus Departemen?')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {t('confirm_delete_dept_desc', 'Apakah Anda yakin ingin menonaktifkan departemen {name} ({code})?', { name: deptToDelete.name, code: deptToDelete.code })}
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                {t('btn_cancel', 'Batal')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition-colors cursor-pointer"
              >
                {t('btn_confirm_delete_dept', 'Ya, Hapus Departemen')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DepartmentModal({ isOpen, onClose, department, existingDepartments, employees, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const isEditing = Boolean(department);

  const [formData, setFormData] = useState({
    code: department?.code || '',
    name: department?.name || '',
    description: department?.description || '',
    parentId: department?.parentId || '',
    managerId: department?.managerId || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter out self as parent option to prevent circular tree
  const parentOptions = existingDepartments.filter((d) => !department || d.id !== department.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t('form_dept_name', 'Nama departemen wajib diisi.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        parentId: formData.parentId || null,
        managerId: formData.managerId || null,
      };

      if (isEditing) {
        await departmentApi.updateDepartment(department.id, payload);
        toast.success(t('dept_updated_success', 'Data departemen berhasil diperbarui.'));
      } else {
        const created = await departmentApi.createDepartment(payload);
        toast.success(t('dept_created_success', 'Departemen baru berhasil ditambahkan.'));
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan departemen.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? t('modal_edit_dept', 'Edit Departemen') : t('modal_add_dept', 'Tambah Departemen Baru')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('modal_dept_subtitle', 'Konfigurasi hierarki divisi dan penunjukan HOD')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('form_dept_code', 'Kode Singkat (Prefix ID)')} *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="OPS"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase focus:bg-white dark:focus:bg-slate-900 disabled:opacity-60 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('form_dept_name', 'Nama Departemen / Divisi')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: Operasional & Logistik"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('form_parent_dept', 'Induk Departemen (Opsional)')}
            </label>
            <select
              value={formData.parentId}
              onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
            >
              <option value="">{t('form_no_parent', '-- Divisi Utama (Tanpa Induk) --')}</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('form_manager', 'Kepala Departemen / HOD (Opsional)')}
            </label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
            >
              <option value="">{t('form_no_manager', '-- Belum Ditugaskan --')}</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} - {emp.position || 'Staf'} ({emp.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('form_dept_desc', 'Deskripsi / Ruang Lingkup Divisi')}
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tanggung jawab dan fungsi operasional departemen..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              {t('btn_cancel', 'Batal')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting ? t('btn_submitting', 'Menyimpan...') : isEditing ? t('btn_save_changes', 'Simpan Perubahan') : t('btn_create', 'Buat Departemen')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

