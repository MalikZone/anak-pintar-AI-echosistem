import React, { useState, useEffect, useMemo } from 'react';
import { roleApi } from '../../services/api/roleApi';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  X,
  Layers,
  Clock,
  Calendar,
  Briefcase,
  CalendarCheck,
  Building2,
  Sliders,
  Check,
  Save,
  FolderTree,
  Award,
  MapPin,
} from 'lucide-react';

const MODULE_ICONS = {
  dashboard: Sliders,
  attendance: Clock,
  shifts: Layers,
  roster: Calendar,
  leaves: CalendarCheck,
  overtime: Briefcase,
  employees: Users,
  roles: ShieldCheck,
  tenants: Building2,
  departments: FolderTree,
  positions: Award,
  locations: MapPin,
  holidays: Calendar,
};

const MODULE_LABELS = {
  dashboard: { id: 'Dashboard & Analitik', en: 'Dashboard & Analytics' },
  attendance: { id: 'Presensi & Kehadiran', en: 'Attendance & Clocking' },
  shifts: { id: 'Master Shift Kerja', en: 'Work Shifts Master' },
  roster: { id: 'Penjadwalan Roster Dinamis', en: 'Dynamic Roster Scheduling' },
  leaves: { id: 'Manajemen Cuti & Izin', en: 'Leave & Time Off' },
  overtime: { id: 'Lembur & SPL (Surat Perintah)', en: 'Overtime Management' },
  employees: { id: 'Direktori Staf & Karyawan', en: 'Employee Directory' },
  roles: { id: 'Peran & Hak Akses (RBAC)', en: 'Roles & Access Control' },
  tenants: { id: 'Tata Kelola Multi-Tenant (SaaS)', en: 'Multi-Tenant SaaS Governance' },
  departments: { id: 'Master Departemen & Divisi', en: 'Departments & Divisions' },
  positions: { id: 'Master Jabatan & Posisi', en: 'Positions & Job Titles' },
  locations: { id: 'Master Lokasi & Geofence', en: 'Work Locations & Geofence' },
  holidays: { id: 'Kalender Hari Libur', en: 'Holiday Calendar' },
};

export default function RolesManagementPage() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const { user, isSuperAdmin } = useAuth();

  const [roles, setRoles] = useState([]);
  const [registry, setRegistry] = useState({ grouped: {}, flat: [] });
  const [selectedRole, setSelectedRole] = useState(null);
  const [activePermissions, setActivePermissions] = useState(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [roleToDelete, setRoleToDelete] = useState(null);

  // Form State for New Custom Role
  const [newRoleForm, setNewRoleForm] = useState({
    name: '',
    code: '',
    description: '',
    initialPermissions: [],
  });

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [rolesData, registryData] = await Promise.all([
        roleApi.getRoles(),
        roleApi.getPermissionRegistry(),
      ]);

      const roleList = rolesData || [];
      setRoles(roleList);
      setRegistry(registryData || { grouped: {}, flat: [] });

      // Default select the first non-superadmin role or first role
      if (roleList.length > 0) {
        const initial = roleList.find((r) => r.code === 'HR_ADMIN') || roleList[0];
        selectRole(initial);
      }
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data peran dan hak akses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectRole = (role) => {
    setSelectedRole(role);
    const perms = new Set(role.permissions || []);
    setActivePermissions(perms);
    setHasChanges(false);
  };

  const handleTogglePermission = (code) => {
    if (selectedRole?.id === 'ROL-SYS-SUPERADMIN') {
      toast.warning('Hak akses Super Administrator bersifat mutlak dan tidak dapat diubah.');
      return;
    }

    setActivePermissions((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      setHasChanges(true);
      return next;
    });
  };

  const handleToggleModule = (moduleName, modulePermissions) => {
    if (selectedRole?.id === 'ROL-SYS-SUPERADMIN') return;

    const moduleCodes = modulePermissions.map((p) => p.code);
    const allChecked = moduleCodes.every((code) => activePermissions.has(code));

    setActivePermissions((prev) => {
      const next = new Set(prev);
      if (allChecked) {
        moduleCodes.forEach((code) => next.delete(code));
      } else {
        moduleCodes.forEach((code) => next.add(code));
      }
      setHasChanges(true);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedRole?.id === 'ROL-SYS-SUPERADMIN') return;
    const allCodes = registry.flat.map((p) => p.code);
    setActivePermissions(new Set(allCodes));
    setHasChanges(true);
  };

  const handleClearAll = () => {
    if (selectedRole?.id === 'ROL-SYS-SUPERADMIN') return;
    setActivePermissions(new Set());
    setHasChanges(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    if (selectedRole.id === 'ROL-SYS-SUPERADMIN') {
      toast.warning('Super Administrator memiliki hak akses universal permanen.');
      return;
    }

    try {
      setIsSaving(true);
      const permsArray = Array.from(activePermissions);
      const updated = await roleApi.updatePermissions(selectedRole.id, permsArray);
      
      // Update local roles state
      setRoles((prev) =>
        prev.map((r) =>
          r.id === selectedRole.id ? { ...r, permissions: permsArray } : r
        )
      );
      setSelectedRole((prev) => ({ ...prev, permissions: permsArray }));
      setHasChanges(false);
      toast.success(
        language === 'en'
          ? `Permissions for role '${selectedRole.name}' saved successfully!`
          : `Hak akses peran '${selectedRole.name}' berhasil disimpan!`
      );
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan perubahan hak akses.');
    } finally {
      setIsSaving(false);
    }
  };

  // Create Role Form Handlers
  const handleOpenCreateModal = () => {
    setNewRoleForm({
      name: '',
      code: '',
      description: '',
      initialPermissions: [],
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!newRoleForm.name.trim() || !newRoleForm.code.trim()) {
      toast.warning('Nama peran dan kode peran wajib diisi.');
      return;
    }

    try {
      setIsSaving(true);
      const created = await roleApi.createRole({
        name: newRoleForm.name.trim(),
        code: newRoleForm.code.trim(),
        description: newRoleForm.description.trim(),
        permissions: newRoleForm.initialPermissions,
      });

      toast.success(
        language === 'en'
          ? `Custom role '${created.name}' created successfully!`
          : `Peran baru '${created.name}' berhasil dibuat!`
      );

      setIsCreateModalOpen(false);
      await fetchData();
      selectRole(created);
    } catch (err) {
      toast.error(err.message || 'Gagal membuat peran kustom.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Role Handlers
  const handleOpenDelete = (role, e) => {
    e.stopPropagation();
    if (role.isSystem) {
      toast.warning('Peran sistem standar tidak dapat dihapus.');
      return;
    }
    setRoleToDelete(role);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!roleToDelete) return;
    try {
      setIsSaving(true);
      await roleApi.deleteRole(roleToDelete.id);
      toast.success(
        language === 'en'
          ? `Role '${roleToDelete.name}' has been deleted.`
          : `Peran '${roleToDelete.name}' berhasil dihapus.`
      );
      setIsDeleteModalOpen(false);
      setRoleToDelete(null);
      await fetchData();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus peran.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filter modules/permissions based on search
  const filteredModules = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return registry.grouped;

    const result = {};
    Object.entries(registry.grouped).forEach(([modName, perms]) => {
      const matchingPerms = perms.filter(
        (p) =>
          p.code.toLowerCase().includes(q) ||
          p.name_id?.toLowerCase().includes(q) ||
          p.name_en?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
      if (matchingPerms.length > 0) {
        result[modName] = matchingPerms;
      }
    });
    return result;
  }, [registry.grouped, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-8 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-colors">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-2xl text-white shadow-md shadow-indigo-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl lg:text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">
                  {t('roles_title', 'Peran & Matriks Hak Akses')}
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wide bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  RBAC Matrix
                </span>
              </div>
              <p className="text-xs lg:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {t(
                  'roles_subtitle',
                  'Konfigurasi hak akses modular dan kontrol peran dinamis untuk seluruh staf perusahaan.'
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={isLoading}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
              title="Muat ulang data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs lg:text-sm font-bold shadow-sm shadow-blue-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{t('roles_add_custom', '+ Peran Kustom Baru')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Roles List (Left) + Permission Matrix (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Role Selector */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t('roles_list_header', 'Daftar Peran ({count})', { count: roles.length })}
            </h2>
            <span className="text-[11px] text-slate-400">{t('click_to_edit', 'Pilih untuk mengedit')}</span>
          </div>

          <div className="space-y-2.5">
            {roles.map((role) => {
              const isSelected = selectedRole?.id === role.id;
              const permCount = role.id === 'ROL-SYS-SUPERADMIN' ? registry.flat.length : (role.permissions?.length || 0);

              return (
                <div
                  key={role.id}
                  onClick={() => selectRole(role)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-left relative overflow-hidden ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500/80 shadow-md ring-2 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                        {role.name}
                      </span>
                      {role.isSystem ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          Sistem
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                          Kustom
                        </span>
                      )}
                    </div>

                    {!role.isSystem && (
                      <button
                        onClick={(e) => handleOpenDelete(role, e)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition"
                        title="Hapus peran kustom"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {role.description || 'Tidak ada deskripsi peran.'}
                  </p>

                  <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
                    <span className="font-mono text-slate-400 text-[10px]">{role.code}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">
                      {permCount} {t('roles_permissions_count', 'izin aktif')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: Permission Matrix for Selected Role */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-3xl p-6 lg:p-7 shadow-xs border border-slate-200/80 dark:border-slate-800 transition-colors">
          {selectedRole ? (
            <div className="space-y-6">
              {/* Active Role Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-lg font-black text-slate-900 dark:text-slate-100">
                      {selectedRole.name}
                    </h3>
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {selectedRole.code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {selectedRole.description || 'Matriks hak akses izin modular.'}
                  </p>
                </div>

                {selectedRole.id !== 'ROL-SYS-SUPERADMIN' && (
                  <button
                    onClick={handleSavePermissions}
                    disabled={!hasChanges || isSaving}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      hasChanges
                        ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/30'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>
                      {isSaving
                        ? 'Menyimpan...'
                        : hasChanges
                        ? t('roles_save_changes', 'Simpan Perubahan Hak Akses')
                        : t('roles_saved', 'Tersimpan')}
                    </span>
                  </button>
                )}
              </div>

              {/* Super Admin Notice Banner */}
              {selectedRole.id === 'ROL-SYS-SUPERADMIN' && (
                <div className="p-3.5 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/80 flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                  <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed font-medium">
                    Peran <strong>Super Administrator</strong> memiliki hak akses wildcard absolut (<code>*</code>) ke seluruh modul platform SaaS tanpa batasan.
                  </p>
                </div>
              )}

              {/* Filter & Quick Toggle Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('roles_search_perms', 'Cari nama izin, kode, modul...')}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {selectedRole.id !== 'ROL-SYS-SUPERADMIN' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    >
                      {t('roles_select_all', 'Pilih Semua')}
                    </button>
                    <button
                      onClick={handleClearAll}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                    >
                      {t('roles_clear_all', 'Batal Semua')}
                    </button>
                  </div>
                )}
              </div>

              {/* Module Cards with Granular Permissions Checkboxes */}
              <div className="space-y-4">
                {Object.entries(filteredModules).map(([moduleKey, permissions]) => {
                  const ModuleIcon = MODULE_ICONS[moduleKey] || Layers;
                  const moduleLabel =
                    MODULE_LABELS[moduleKey]?.[language === 'en' ? 'en' : 'id'] ||
                    moduleKey.toUpperCase();

                  const isSuper = selectedRole.id === 'ROL-SYS-SUPERADMIN';
                  const activeCountInModule = permissions.filter((p) =>
                    isSuper ? true : activePermissions.has(p.code)
                  ).length;
                  const isModuleAllChecked = isSuper || activeCountInModule === permissions.length;

                  return (
                    <div
                      key={moduleKey}
                      className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 overflow-hidden"
                    >
                      {/* Module Header Bar */}
                      <div className="p-3.5 bg-slate-100/70 dark:bg-slate-800/60 border-b border-slate-200/70 dark:border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-2xs">
                            <ModuleIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                              {moduleLabel}
                            </span>
                            <span className="ml-2 text-[10px] text-slate-400">
                              ({activeCountInModule}/{permissions.length} aktif)
                            </span>
                          </div>
                        </div>

                        {!isSuper && (
                          <button
                            type="button"
                            onClick={() => handleToggleModule(moduleKey, permissions)}
                            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            {isModuleAllChecked ? 'Batalkan Modul' : 'Pilih Semua Modul'}
                          </button>
                        )}
                      </div>

                      {/* Permissions Grid */}
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {permissions.map((perm) => {
                          const isChecked = isSuper || activePermissions.has(perm.code);
                          const permName = language === 'en' ? perm.name_en : perm.name_id;

                          return (
                            <label
                              key={perm.code}
                              onClick={() => handleTogglePermission(perm.code)}
                              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                isChecked
                                  ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60'
                                  : 'bg-white dark:bg-slate-800/40 border-slate-200/60 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80'
                              } ${isSuper ? 'cursor-default' : ''}`}
                            >
                              <div className="pt-0.5">
                                <div
                                  className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                    isChecked
                                      ? 'bg-blue-600 border-blue-600 text-white'
                                      : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                  }`}
                                >
                                  {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                </div>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                                    {permName}
                                  </span>
                                  <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                    {perm.code}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                                  {perm.description}
                                </p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400">
              <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">{t('select_role_prompt', 'Pilih peran di sebelah kiri untuk melihat matriks izin.')}</p>
            </div>
          )}
        </div>
      </div>

      {/* CREATE CUSTOM ROLE MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full p-6 lg:p-7 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                    {t('roles_create_title', 'Buat Peran Kustom Baru')}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('roles_create_desc', 'Definisikan peran spesifik organisasi dengan hak akses granular.')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('roles_form_name', 'Nama Peran *')}
                </label>
                <input
                  type="text"
                  required
                  value={newRoleForm.name}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, name: e.target.value })}
                  placeholder="Contoh: Koordinator Shift Lapangan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('roles_form_code', 'Kode Peran (Singkat & Unik) *')}
                </label>
                <input
                  type="text"
                  required
                  value={newRoleForm.code}
                  onChange={(e) =>
                    setNewRoleForm({
                      ...newRoleForm,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''),
                    })
                  }
                  placeholder="Contoh: SHIFT_COORD"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
                <p className="text-[10px] text-slate-400 mt-1">{t('roles_code_hint', 'Hanya huruf kapital, angka, dan garis bawah (_).')}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('roles_form_desc', 'Deskripsi Peran')}
                </label>
                <textarea
                  rows={3}
                  value={newRoleForm.description}
                  onChange={(e) => setNewRoleForm({ ...newRoleForm, description: e.target.value })}
                  placeholder="Deskripsi ringkas kewenangan dan tugas peran ini..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  {t('btn_cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{t('roles_btn_save_role', 'Simpan Peran')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {isDeleteModalOpen && roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 mb-1">
              {t('roles_confirm_delete_title', 'Hapus Peran Kustom?')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
              {t('roles_confirm_delete_desc', 'Apakah Anda yakin ingin menghapus peran {name} ({code})? Tindakan ini tidak dapat dibatalkan.', { name: roleToDelete.name, code: roleToDelete.code })}
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                {t('btn_cancel', 'Batal')}
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSaving}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition flex items-center gap-1.5"
              >
                {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{t('roles_btn_delete_role', 'Hapus Peran')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

