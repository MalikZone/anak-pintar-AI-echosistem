import React, { useState, useEffect, useMemo } from 'react';
import { holidayApi } from '../../services/api/holidayApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  CalendarDays,
  Search,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Globe,
  Building,
  AlertTriangle,
  X,
  Filter,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

const HOLIDAY_TYPES = {
  national: { label: 'Libur Nasional', badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border-rose-200 dark:border-rose-900' },
  joint_leave: { label: 'Cuti Bersama', badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-900' },
  company: { label: 'Libur Perusahaan', badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900' },
};

export default function HolidaysManagementPage() {
  const { t, isEn } = useLanguage();
  const toast = useToast();
  const { isSuperAdmin } = useAuth();

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [holidays, setHolidays] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHoliday, setEditingHoliday] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [holidayToDelete, setHolidayToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    type: 'company',
    description: '',
    isGlobal: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHolidays = async () => {
    try {
      setIsLoading(true);
      const data = await holidayApi.getHolidays(selectedYear);
      setHolidays(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat daftar hari libur.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const filteredHolidays = useMemo(() => {
    const q = search.toLowerCase().trim();
    return holidays.filter((h) => {
      const matchSearch =
        !q ||
        h.name?.toLowerCase().includes(q) ||
        h.description?.toLowerCase().includes(q) ||
        h.date?.includes(q);
      const matchType = !typeFilter || h.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [holidays, search, typeFilter]);

  const stats = useMemo(() => {
    const total = holidays.length;
    const globalCount = holidays.filter((h) => h.isGlobal).length;
    const companyCount = holidays.filter((h) => !h.isGlobal).length;
    const jointCount = holidays.filter((h) => h.type === 'joint_leave').length;
    return { total, globalCount, companyCount, jointCount };
  }, [holidays]);

  const handleOpenCreate = () => {
    setEditingHoliday(null);
    setFormData({
      name: '',
      date: new Date().toISOString().slice(0, 10),
      type: isSuperAdmin ? 'national' : 'company',
      description: '',
      isGlobal: isSuperAdmin,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (h) => {
    if (h.isGlobal && !isSuperAdmin) {
      toast.error('Hari libur nasional global hanya dapat dikelola oleh Super Administrator.');
      return;
    }
    setEditingHoliday(h);
    setFormData({
      name: h.name || '',
      date: h.date || '',
      type: h.type || 'company',
      description: h.description || '',
      isGlobal: !!h.isGlobal,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.date) {
      toast.error('Nama hari libur dan tanggal wajib diisi.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      date: formData.date,
      type: formData.type,
      description: formData.description.trim(),
      isGlobal: isSuperAdmin ? formData.isGlobal : false,
    };

    try {
      setIsSubmitting(true);
      if (editingHoliday) {
        await holidayApi.updateHoliday(editingHoliday.id, payload);
        toast.success(t('holiday_updated_success', 'Hari libur berhasil diperbarui.'));
      } else {
        await holidayApi.createHoliday(payload);
        toast.success(t('holiday_created_success', 'Hari libur berhasil ditambahkan ke kalender.'));
      }
      setIsModalOpen(false);
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan hari libur.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (h) => {
    if (h.isGlobal && !isSuperAdmin) {
      toast.error('Hari libur nasional global hanya dapat dihapus oleh Super Administrator.');
      return;
    }
    setHolidayToDelete(h);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!holidayToDelete) return;
    try {
      await holidayApi.deleteHoliday(holidayToDelete.id);
      toast.success(t('holiday_deleted_success', `Hari libur ${holidayToDelete.name} berhasil dihapus.`));
      setIsDeleteModalOpen(false);
      setHolidayToDelete(null);
      fetchHolidays();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus hari libur.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat(isEn ? 'en-US' : 'id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('holidays_title', 'Kalender Hari Libur & Cuti Bersama')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('holidays_desc', 'Kelola kalender libur nasional dan hari libur internal perusahaan untuk perhitungan roster shift & absensi.')}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3.5 py-2 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            {[currentYear - 1, currentYear, currentYear + 1, currentYear + 2].map((y) => (
              <option key={y} value={y}>
                {t('calendar_year', `Tahun ${y}`, { year: y })}
              </option>
            ))}
          </select>
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-medium hover:bg-rose-700 active:scale-95 transition shadow-sm shadow-rose-500/20 text-sm"
          >
            <Plus className="w-4 h-4" />
            {t('add_holiday', 'Tambah Hari Libur')}
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('total_holidays', 'Total Hari Libur')}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-1">{t('calendar_year', `Kalender tahun ${selectedYear}`, { year: selectedYear })}</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('national_holidays', 'Libur Nasional (Sistem)')}</p>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-1">{stats.globalCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Dikelola global oleh sistem</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('company_holidays', 'Libur Internal Perusahaan')}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.companyCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Khusus organisasi tenant</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('joint_leaves', 'Cuti Bersama')}</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.jointCount}</p>
          <p className="text-[11px] text-slate-400 mt-1">Ketentuan cuti bersama</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_holidays_placeholder', 'Cari nama hari libur atau keterangan...')}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
          >
            <option value="">{t('filter_all_holidays', 'Semua Kategori Libur')}</option>
            <option value="national">{t('holiday_type_national', 'Hari Libur Nasional')}</option>
            <option value="company">{t('holiday_type_company', 'Hari Libur Perusahaan')}</option>
            <option value="joint_leave">{t('holiday_type_joint', 'Cuti Bersama')}</option>
          </select>
        </div>
      </div>

      {/* Holidays List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading_tenants', `Memuat kalender libur ${selectedYear}...`)}</p>
          </div>
        ) : filteredHolidays.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarDays className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              {search || typeFilter ? t('no_holidays_found', 'Tidak ada hari libur yang cocok') : t('no_holidays_found', `Tidak ada hari libur di tahun ${selectedYear}`, { year: selectedYear })}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              {search || typeFilter
                ? t('no_holidays_desc', 'Coba ganti filter atau kata kunci pencarian Anda.')
                : t('no_holidays_desc', 'Belum ada hari libur terdaftar pada kalender tahun ini. Tambahkan hari libur perusahaan Anda.')}
            </p>
            {!search && !typeFilter && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition"
              >
                <Plus className="w-4 h-4" />
                {t('btn_create_first_holiday', 'Tambah Libur Baru')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_holiday_date', 'Tanggal')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_holiday_name', 'Nama Hari Libur')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_holiday_category', 'Kategori & Lingkup')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_holiday_notes', 'Keterangan')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('col_action', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredHolidays.map((h) => {
                  const typeBadge = HOLIDAY_TYPES[h.type] || HOLIDAY_TYPES.company;
                  const isManagedGlobal = h.isGlobal;
                  const canManage = isSuperAdmin || !isManagedGlobal;

                  return (
                    <tr key={h.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        <div className="text-xs font-semibold">{formatDate(h.date)}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{h.date}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                          {h.name}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${typeBadge.badge}`}>
                            {h.type === 'national' ? t('holiday_type_national', 'Libur Nasional') : h.type === 'joint_leave' ? t('holiday_type_joint', 'Cuti Bersama') : t('holiday_type_company', 'Libur Perusahaan')}
                          </span>
                          {isManagedGlobal ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                              <Globe className="w-3 h-3" />
                              {t('badge_global_national', 'Global / Nasional')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900">
                              <Building className="w-3 h-3" />
                              {t('badge_internal_tenant', 'Internal Tenant')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-sm truncate whitespace-nowrap">
                        {h.description || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {canManage ? (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleOpenEdit(h)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title={t('btn_edit', 'Edit Hari Libur')}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleOpenDelete(h)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                              title={t('btn_delete', 'Hapus Hari Libur')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md cursor-not-allowed"
                            title="Dikelola otomatis oleh platform sistem SaaS"
                          >
                            <Lock className="w-3 h-3" />
                            {t('badge_system_managed', 'Sistem')}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800 my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {editingHoliday ? t('modal_edit_holiday', 'Edit Hari Libur') : t('modal_add_holiday', 'Tambah Hari Libur Baru')}
                  </h3>
                  <p className="text-xs text-slate-400">{t('modal_holiday_subtitle', 'Atur kalender libur operasional dan absensi')}</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('form_holiday_name', 'Nama Hari Libur')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Libur Ulang Tahun Perusahaan, Hari Raya Nyepi"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('form_holiday_date', 'Tanggal Libur')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('form_holiday_category', 'Kategori Libur')} <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                  >
                    <option value="company">{t('holiday_type_company', 'Hari Libur Perusahaan')}</option>
                    <option value="joint_leave">{t('holiday_type_joint', 'Cuti Bersama')}</option>
                    {isSuperAdmin && <option value="national">{t('holiday_type_national', 'Hari Libur Nasional')}</option>}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('form_holiday_desc', 'Keterangan / Catatan')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan terkait ketentuan operasional..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>

              {/* Super Admin Global Toggle */}
              {isSuperAdmin && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
                  <div className="flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-blue-900 dark:text-blue-200 block">
                        {t('form_holiday_global_toggle', 'Terapkan sebagai Libur Global')}
                      </span>
                      <span className="text-[11px] text-blue-700 dark:text-blue-400">
                        {t('form_holiday_global_desc', 'Otomatis berlaku untuk seluruh tenant dan organisasi di platform.')}
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isGlobal}
                    onChange={(e) => setFormData({ ...formData, isGlobal: e.target.checked })}
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
                >
                  {t('btn_cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? t('btn_submitting', 'Menyimpan...') : editingHoliday ? t('btn_save_changes', 'Simpan Perubahan') : t('btn_create', 'Tambahkan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && holidayToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('confirm_delete_holiday_title', 'Hapus Hari Libur?')}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t('confirm_delete_holiday_desc', 'Apakah Anda yakin ingin menghapus hari libur {name} ({date}) dari kalender?', { name: holidayToDelete.name, date: holidayToDelete.date })}
            </p>
            {holidayToDelete.isGlobal && (
              <div className="p-3 mb-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-xs text-blue-800 dark:text-blue-200 flex items-center gap-2">
                <Globe className="w-4 h-4 shrink-0 text-blue-600" />
                <span>
                  Perhatian: Hari libur ini bersifat Global dan penghapusannya akan berdampak pada seluruh tenant.
                </span>
              </div>
            )}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
              >
                {t('btn_cancel', 'Batal')}
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition"
              >
                {t('btn_confirm_delete_holiday', 'Ya, Hapus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

