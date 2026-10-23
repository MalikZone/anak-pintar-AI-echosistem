import React, { useState, useEffect, useMemo } from 'react';
import { leaveTypeApi } from '../../services/api/leaveTypeApi';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  FileSpreadsheet,
  CalendarCheck,
  Search,
  Plus,
  Edit2,
  Trash2,
  Lock,
  Globe,
  CheckCircle2,
  XCircle,
  FileText,
  AlertTriangle,
  X,
  Shield,
  Layers,
  HelpCircle,
} from 'lucide-react';

export default function LeavePoliciesPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { isSuperAdmin } = useAuth();

  const [leaveTypes, setLeaveTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [typeToDelete, setTypeToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    defaultQuota: 0,
    deductAnnual: false,
    requiresAttachment: false,
    isPaid: true,
    description: '',
    isGlobal: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchLeaveTypes = async () => {
    try {
      setIsLoading(true);
      const data = await leaveTypeApi.getLeaveTypes();
      setLeaveTypes(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat daftar kebijakan cuti.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaveTypes();
  }, []);

  const filteredLeaveTypes = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leaveTypes;
    return leaveTypes.filter(
      (lt) =>
        lt.name?.toLowerCase().includes(q) ||
        lt.code?.toLowerCase().includes(q) ||
        lt.description?.toLowerCase().includes(q)
    );
  }, [leaveTypes, search]);

  const stats = useMemo(() => {
    const total = leaveTypes.length;
    const systemTypes = leaveTypes.filter((lt) => lt.isSystem).length;
    const paidTypes = leaveTypes.filter((lt) => lt.isPaid).length;
    const attachmentRequired = leaveTypes.filter((lt) => lt.requiresAttachment).length;
    return { total, systemTypes, paidTypes, attachmentRequired };
  }, [leaveTypes]);

  const handleOpenCreate = () => {
    setEditingType(null);
    setFormData({
      code: '',
      name: '',
      defaultQuota: 3,
      deductAnnual: false,
      requiresAttachment: false,
      isPaid: true,
      description: '',
      isGlobal: isSuperAdmin,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (lt) => {
    if (lt.isGlobal && !isSuperAdmin) {
      toast.error('Kebijakan cuti global hanya dapat diubah oleh Super Administrator.');
      return;
    }
    setEditingType(lt);
    setFormData({
      code: lt.code || '',
      name: lt.name || '',
      defaultQuota: lt.defaultQuota ?? 0,
      deductAnnual: !!lt.deductAnnual,
      requiresAttachment: !!lt.requiresAttachment,
      isPaid: lt.isPaid !== undefined ? !!lt.isPaid : true,
      description: lt.description || '',
      isGlobal: !!lt.isGlobal,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama jenis cuti wajib diisi.');
      return;
    }

    const payload = {
      code: formData.code.trim() || undefined,
      name: formData.name.trim(),
      defaultQuota: parseInt(formData.defaultQuota, 10) || 0,
      deductAnnual: !!formData.deductAnnual,
      requiresAttachment: !!formData.requiresAttachment,
      isPaid: !!formData.isPaid,
      description: formData.description.trim(),
      isGlobal: isSuperAdmin ? formData.isGlobal : false,
    };

    try {
      setIsSubmitting(true);
      if (editingType) {
        await leaveTypeApi.updateLeaveType(editingType.id, payload);
        toast.success(t('leave_type_updated_success', 'Kebijakan cuti berhasil diperbarui.'));
      } else {
        await leaveTypeApi.createLeaveType(payload);
        toast.success(t('leave_type_created_success', 'Jenis cuti baru berhasil ditambahkan.'));
      }
      setIsModalOpen(false);
      fetchLeaveTypes();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan kebijakan cuti.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (lt) => {
    if (lt.isSystem) {
      toast.error('Kebijakan cuti bawaan sistem tidak dapat dihapus.');
      return;
    }
    if (lt.isGlobal && !isSuperAdmin) {
      toast.error('Hanya Super Administrator yang dapat menghapus kebijakan global.');
      return;
    }
    setTypeToDelete(lt);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!typeToDelete) return;
    try {
      await leaveTypeApi.deleteLeaveType(typeToDelete.id);
      toast.success(t('leave_type_deleted_success', `Kebijakan cuti ${typeToDelete.name} berhasil dihapus.`));
      setIsDeleteModalOpen(false);
      setTypeToDelete(null);
      fetchLeaveTypes();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus jenis cuti.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('leave_types_title', 'Master Kebijakan & Tipe Cuti')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('leave_types_desc', 'Atur hak kuota cuti tahunan, cuti sakit, cuti berbayar, dan syarat lampiran persetujuan.')}
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 text-white font-medium hover:bg-cyan-700 active:scale-95 transition shadow-sm shadow-cyan-500/20 text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('add_leave_type', 'Tambah Tipe Cuti')}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('total_leave_policies', 'Total Kebijakan')}</p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-1">Jenis cuti terdaftar</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('system_leave_templates', 'Cuti Bawaan Sistem')}</p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{stats.systemTypes}</p>
          <p className="text-[11px] text-slate-400 mt-1">Standar Undang-Undang</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('paid_leave_count', 'Cuti Berbayar (Paid)')}</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.paidTypes}</p>
          <p className="text-[11px] text-slate-400 mt-1">Gaji tetap dibayarkan</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('attachment_required_count', 'Wajib Lampiran')}</p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{stats.attachmentRequired}</p>
          <p className="text-[11px] text-slate-400 mt-1">Surat dokter / bukti wajib</p>
        </div>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('search_leave_types_placeholder', 'Cari jenis cuti, kode, atau keterangan...')}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 transition"
          />
        </div>
      </div>

      {/* Leave Types List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('loading_tenants', 'Memuat kebijakan cuti...')}</p>
          </div>
        ) : filteredLeaveTypes.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              {search ? t('no_leave_types_found', 'Tidak ada kebijakan cuti yang cocok') : t('no_leave_types_found', 'Belum Ada Jenis Cuti')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              {search
                ? t('no_leave_types_desc', 'Coba gunakan kata kunci pencarian yang berbeda.')
                : t('no_leave_types_desc', 'Buat aturan tipe cuti khusus organisasi Anda (misal cuti melahirkan, cuti menikah, dll).')}
            </p>
            {!search && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600 text-white text-sm font-medium hover:bg-cyan-700 transition"
              >
                <Plus className="w-4 h-4" />
                {t('btn_create_first_leave', 'Tambah Tipe Cuti Pertama')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_leave_name_code', 'Nama & Kode')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_leave_quota', 'Kuota Standar')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_leave_pay', 'Sifat & Gaji')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_leave_rules', 'Aturan Pengajuan')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_leave_desc', 'Deskripsi')}</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('col_action', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLeaveTypes.map((lt) => (
                  <tr key={lt.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-start gap-3">
                        <span className={`p-2 rounded-xl mt-0.5 shrink-0 ${lt.isSystem ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 'bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400'}`}>
                          <FileText className="w-4 h-4" />
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {lt.name}
                            </span>
                            {lt.isSystem && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900">
                                {t('badge_system_policy', 'Sistem')}
                              </span>
                            )}
                            {lt.isGlobal && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-900">
                                {t('badge_global_policy', 'Global')}
                              </span>
                            )}
                          </div>
                          <span className="inline-block mt-0.5 text-xs font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {lt.code}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {lt.defaultQuota > 0 ? `${lt.defaultQuota} hari` : 'Fleksibel / Sesuai Ajuan'}
                      </span>
                      {lt.defaultQuota > 0 && (
                        <div className="text-[11px] text-slate-400">per tahun / kasus</div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {lt.isPaid ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          {t('badge_paid', 'Berbayar (Paid)')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                          <XCircle className="w-3.5 h-3.5" />
                          {t('badge_unpaid', 'Unpaid Leave')}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className={`w-2 h-2 rounded-full ${lt.deductAnnual ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <span>{lt.deductAnnual ? t('badge_deduct_annual', 'Potong Kuota Tahunan') : t('badge_no_deduct', 'Tidak Potong Tahunan')}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <span className={`w-2 h-2 rounded-full ${lt.requiresAttachment ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          <span>{lt.requiresAttachment ? t('badge_doc_required', 'Wajib Bukti / Dokumen') : t('badge_doc_optional', 'Lampiran Opsional')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-500 dark:text-slate-400 max-w-xs truncate whitespace-nowrap">
                      {lt.description || '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleOpenEdit(lt)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title={t('btn_edit', 'Edit Kebijakan')}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {lt.isSystem ? (
                          <span
                            className="p-1.5 rounded-lg text-slate-300 dark:text-slate-600 cursor-not-allowed"
                            title="Tipe cuti sistem dilindungi dan tidak dapat dihapus"
                          >
                            <Lock className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => handleOpenDelete(lt)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title={t('btn_delete', 'Hapus Kebijakan')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
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
                <span className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400">
                  <FileSpreadsheet className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white">
                    {editingType ? t('modal_edit_leave', 'Edit Kebijakan Cuti') : t('modal_add_leave', 'Tambah Jenis Cuti Baru')}
                  </h3>
                  <p className="text-xs text-slate-400">{t('modal_leave_subtitle', 'Atur parameter dan ketentuan pengajuan cuti')}</p>
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
                  {t('form_leave_name', 'Nama Jenis Cuti')} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Cuti Menikah, Cuti Ibadah Keagamaan, Cuti Berduka"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('form_leave_code', 'Kode Singkat (Prefix)')}
                  </label>
                  <input
                    type="text"
                    disabled={editingType?.isSystem}
                    placeholder="Auto (misal: MARRIAGE)"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 uppercase disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('form_leave_quota', 'Kuota Standar (Hari)')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={365}
                    required
                    value={formData.defaultQuota}
                    onChange={(e) => setFormData({ ...formData, defaultQuota: e.target.value })}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Switches Configuration */}
              <div className="space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {t('form_leave_paid_toggle', 'Cuti Berbayar (Paid Leave)')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t('form_leave_paid_desc', 'Gaji pokok dan tunjangan tetap dihitung saat karyawan mengambil cuti ini.')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {t('form_leave_deduct_toggle', 'Potong Kuota Cuti Tahunan')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t('form_leave_deduct_desc', 'Mengurangi saldo sisa hak cuti tahunan utama karyawan saat disetujui.')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.deductAnnual}
                    onChange={(e) => setFormData({ ...formData, deductAnnual: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {t('form_leave_attachment_toggle', 'Wajib Melampirkan Dokumen Bukti')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {t('form_leave_attachment_desc', 'Karyawan harus mengunggah surat dokter / bukti pendukung saat mengajukan.')}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.requiresAttachment}
                    onChange={(e) => setFormData({ ...formData, requiresAttachment: e.target.checked })}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('col_leave_desc', 'Keterangan / Panduan Pengajuan')}
                </label>
                <textarea
                  rows={2}
                  placeholder="Misal: Diberikan maksimal 3 hari untuk pernikahan karyawan yang sah."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500"
                />
              </div>

              {/* Super Admin Global Toggle */}
              {isSuperAdmin && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/30">
                  <div className="flex items-start gap-2.5">
                    <Globe className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-blue-900 dark:text-blue-200 block">
                        {t('form_leave_global_toggle', 'Template Kebijakan Global')}
                      </span>
                      <span className="text-[11px] text-blue-700 dark:text-blue-400">
                        {t('form_leave_global_desc', 'Otomatis dapat diakses dan digunakan oleh seluruh tenant di platform.')}
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
                  className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-700 rounded-xl transition disabled:opacity-50"
                >
                  {isSubmitting ? t('btn_submitting', 'Menyimpan...') : editingType ? t('btn_save_changes', 'Simpan Perubahan') : t('btn_create', 'Buat Kebijakan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && typeToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('confirm_delete_leave_title', 'Hapus Jenis Cuti?')}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t('confirm_delete_leave_desc', 'Apakah Anda yakin ingin menghapus kebijakan cuti {name} ({code})?').replace('{name}', typeToDelete.name).replace('{code}', typeToDelete.code)}
            </p>
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
                {t('btn_confirm_delete_leave', 'Ya, Hapus')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

