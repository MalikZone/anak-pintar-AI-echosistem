import React, { useState, useEffect, useMemo } from 'react';
import { positionApi } from '../../services/api/positionApi';
import { departmentApi } from '../../services/api/departmentApi';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  Briefcase,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  Award,
  AlertTriangle,
  X,
  Building2,
  Shield,
  Layers,
} from 'lucide-react';

export const LEVEL_BADGES = {
  intern: { label: 'Magang / Intern', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  staff: { label: 'Staf Pelaksana', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300' },
  senior: { label: 'Senior Staf', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' },
  lead: { label: 'Team Lead', bg: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300' },
  supervisor: { label: 'Supervisor', bg: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300' },
  manager: { label: 'Manajer Divisi', bg: 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300' },
  director: { label: 'Direktur', bg: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300' },
  executive: { label: 'C-Level / Eksekutif', bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300' },
};

export default function PositionsManagementPage() {
  const { t } = useLanguage();
  const toast = useToast();

  const [positions, setPositions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPos, setEditingPos] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [posToDelete, setPosToDelete] = useState(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [posRes, deptRes] = await Promise.allSettled([
        positionApi.getPositions(),
        departmentApi.getDepartments(),
      ]);

      if (posRes.status === 'fulfilled') {
        setPositions(posRes.value || []);
      }
      if (deptRes.status === 'fulfilled') {
        setDepartments(deptRes.value || []);
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data jabatan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredPositions = useMemo(() => {
    const q = search.toLowerCase().trim();
    return positions.filter((p) => {
      const matchSearch =
        !q ||
        p.title?.toLowerCase().includes(q) ||
        p.code?.toLowerCase().includes(q) ||
        p.departmentName?.toLowerCase().includes(q);
      const matchLevel = !levelFilter || p.level === levelFilter;
      return matchSearch && matchLevel;
    });
  }, [positions, search, levelFilter]);

  const stats = useMemo(() => {
    const total = positions.length;
    const managerial = positions.filter((p) => ['supervisor', 'manager', 'director', 'executive'].includes(p.level)).length;
    const staffLevel = positions.filter((p) => ['intern', 'staff', 'senior', 'lead'].includes(p.level)).length;
    const totalAssigned = positions.reduce((acc, p) => acc + (p.employeeCount || 0), 0);
    return { total, managerial, staffLevel, totalAssigned };
  }, [positions]);

  const handleOpenCreate = () => {
    setEditingPos(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (pos) => {
    setEditingPos(pos);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (pos) => {
    setPosToDelete(pos);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!posToDelete) return;
    try {
      await positionApi.deletePosition(posToDelete.id);
      toast.success(t('pos_deleted_success', `Jabatan ${posToDelete.title} berhasil dinonaktifkan.`));
      setIsDeleteModalOpen(false);
      setPosToDelete(null);
      fetchData();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus jabatan.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Award className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('positions_title', 'Master Jabatan & Level/Golongan')}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('positions_subtitle', 'Katalog jabatan resmi, pemetaan departemen, dan jenjang grading karir staf.')}
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('btn_add_position', 'Tambah Jabatan')}</span>
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('total_positions', 'Total Jabatan')}</p>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('managerial_level', 'Jenjang Manajerial')}</p>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400">{stats.managerial}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('staff_level', 'Jenjang Pelaksana')}</p>
          <p className="text-2xl font-black text-blue-600 dark:text-blue-400">{stats.staffLevel}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">{t('assigned_employees', 'Karyawan Terhubung')}</p>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalAssigned}</p>
        </div>
      </div>

      {/* Search & Level Filters */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-2 flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_positions_placeholder', 'Cari judul jabatan, kode, atau departemen...')}
            className="w-full text-xs bg-transparent border-none outline-hidden text-slate-900 dark:text-white placeholder-slate-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="p-1 text-slate-400 hover:text-slate-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="shrink-0 w-full sm:w-auto">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="w-full sm:w-auto text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 font-medium text-slate-700 dark:text-slate-300"
          >
            <option value="">{t('filter_all_levels', 'Semua Jenjang Golongan')}</option>
            {Object.entries(LEVEL_BADGES).map(([key, item]) => (
              <option key={key} value={key}>
                {t('level_' + key, item.label)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs text-slate-400">
            <div className="inline-block w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p>{t('loading_tenants', 'Memuat data jabatan...')}</p>
          </div>
        ) : filteredPositions.length === 0 ? (
          <div className="p-12 text-center">
            <Award className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
              {positions.length === 0 ? t('no_positions_found', 'Belum Ada Jabatan') : t('no_positions_found', 'Jabatan Tidak Ditemukan')}
            </h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              {positions.length === 0
                ? t('no_positions_desc', 'Tambahkan master jabatan untuk standardisasi posisi kerja karyawan.')
                : t('no_positions_desc', 'Tidak ada jabatan yang sesuai dengan filter pencarian.')}
            </p>
            {positions.length === 0 && (
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                + {t('btn_create_first_pos', 'Tambah Jabatan Pertama')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
                <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/40">
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_dept_code', 'Kode')} & ID</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_position_title', 'Judul Jabatan')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_department', 'Departemen Terkait')}</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">{t('col_career_level', 'Jenjang Golongan')}</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">{t('col_staff', 'Jumlah Pemegang')}</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">{t('col_action', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {filteredPositions.map((pos) => {
                  const badge = LEVEL_BADGES[pos.level] || LEVEL_BADGES.staff;
                  return (
                    <tr key={pos.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                        <div>{pos.code}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{pos.id}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                          <span>{pos.title}</span>
                        </div>
                        {pos.description && (
                          <p className="text-[11px] text-slate-400 max-w-sm truncate mt-0.5">{pos.description}</p>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                        {pos.departmentName ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {pos.departmentName}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">{t('form_no_parent', 'Lintas Departemen (General)')}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${badge.bg}`}>
                          {t('level_' + pos.level, badge.label)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                          <Users className="w-3 h-3" />
                          {pos.employeeCount || 0}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(pos)}
                            title={t('btn_edit', 'Edit Jabatan')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(pos)}
                            title={t('btn_delete', 'Hapus Jabatan')}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit */}
      {isModalOpen && (
        <PositionModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          position={editingPos}
          departments={departments}
          onSaved={() => {
            setIsModalOpen(false);
            fetchData();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {isDeleteModalOpen && posToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl">
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 w-fit mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('confirm_delete_pos_title', 'Hapus Jabatan?')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {t('confirm_delete_pos_desc', 'Apakah Anda yakin ingin menonaktifkan jabatan {name} ({code})?', { name: posToDelete.title, code: posToDelete.code })}
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
                {t('btn_confirm_delete_pos', 'Ya, Hapus Jabatan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PositionModal({ isOpen, onClose, position, departments, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const isEditing = Boolean(position);

  const [formData, setFormData] = useState({
    code: position?.code || '',
    title: position?.title || '',
    departmentId: position?.departmentId || '',
    level: position?.level || 'staff',
    description: position?.description || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error(t('form_pos_title', 'Nama/judul jabatan wajib diisi.'));
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: formData.title.trim(),
        code: formData.code.trim().toUpperCase(),
        departmentId: formData.departmentId || null,
        level: formData.level || 'staff',
        description: formData.description.trim() || null,
      };

      if (isEditing) {
        await positionApi.updatePosition(position.id, payload);
        toast.success(t('pos_updated_success', 'Data jabatan berhasil diperbarui.'));
      } else {
        const created = await positionApi.createPosition(payload);
        toast.success(t('pos_created_success', 'Jabatan baru berhasil ditambahkan.'));
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan jabatan.');
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
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? t('modal_edit_position', 'Edit Data Jabatan') : t('modal_add_position', 'Tambah Jabatan Baru')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('modal_pos_subtitle', 'Spesifikasi posisi kerja dan jenjang golongan karir')}
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
                {t('form_pos_code', 'Kode Singkat (Prefix ID)')} *
              </label>
              <input
                type="text"
                required
                disabled={isEditing}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="DISP"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl font-mono uppercase focus:bg-white dark:focus:bg-slate-900 disabled:opacity-60 transition-colors"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('form_pos_title', 'Nama Posisi / Jabatan')} *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Contoh: Fleet Operations Dispatcher"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('form_pos_dept', 'Departemen Terkait')}
              </label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
              >
                <option value="">{t('form_no_parent', '- Lintas Departemen (General) -')}</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('form_pos_level', 'Jenjang Golongan')} *
              </label>
              <select
                required
                value={formData.level}
                onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
              >
                {Object.entries(LEVEL_BADGES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {t('level_' + key, item.label)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('form_pos_desc', 'Deskripsi Tanggung Jawab')}
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Uraian tugas pokok dan tanggung jawab jabatan..."
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
              {isSubmitting ? t('btn_submitting', 'Menyimpan...') : isEditing ? t('btn_save_changes', 'Simpan Perubahan') : t('btn_create', 'Buat Jabatan')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


