import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { tenantApi } from '../../services/api/tenantApi';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { ROUTES } from '../../routes/routePaths';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  Layers,
  MapPin,
  Clock,
  Briefcase,
  ShieldAlert,
  ShieldCheck,
  Globe,
  Sparkles,
  X,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Lock,
  RefreshCw,
  UserPlus,
  UserCheck,
  Crown,
} from 'lucide-react';
import Select2 from '../../components/ui/Select2';
import { userApi } from '../../services/api/userApi';
import { locationApi } from '../../services/api/locationApi';

export default function TenantsManagementPage() {
  const { t, language } = useLanguage();
  const toast = useToast();
  const { user, impersonateTenant } = useAuth();
  const navigate = useNavigate();

  const [tenants, setTenants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [impersonatingId, setImpersonatingId] = useState(null);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState(null);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedTenantForAdmin, setSelectedTenantForAdmin] = useState(null);

  const handleOpenCreateAdmin = (tenant) => {
    setSelectedTenantForAdmin(tenant);
    setIsAdminModalOpen(true);
  };

  const handleImpersonate = async (tenant) => {
    if (!tenant?.id) return;
    setImpersonatingId(tenant.id);
    try {
      await impersonateTenant(tenant.id);
      navigate(ROUTES.ADMIN.DASHBOARD);
    } catch (err) {
      toast.error(err.message || t('saas_impersonate_err', 'Gagal masuk sebagai HR Admin tenant.'));
    } finally {
      setImpersonatingId(null);
    }
  };

  const fetchTenants = async () => {
    try {
      setIsLoading(true);
      const res = await tenantApi.getTenants();
      setTenants(res || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat daftar tenant.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  const filteredTenants = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return tenants;
    return tenants.filter(
      (t) =>
        t.name?.toLowerCase().includes(q) ||
        t.code?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.industry?.toLowerCase().includes(q) ||
        t.workModel?.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  const handleOpenCreate = () => {
    setEditingTenant(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tenant) => {
    setEditingTenant(tenant);
    setIsModalOpen(true);
  };

  const handleOpenDelete = (tenant) => {
    if (tenant.id === 'TNT-ROOT-000001') {
      toast.warning(t('tenant_cannot_delete_root', 'Tenant Platform Root tidak boleh dinonaktifkan.'));
      return;
    }
    setTenantToDelete(tenant);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!tenantToDelete) return;
    try {
      await tenantApi.deleteTenant(tenantToDelete.id);
      toast.success(t('tenant_deleted_success', `Tenant ${tenantToDelete.name} berhasil dinonaktifkan.`));
      setIsDeleteModalOpen(false);
      setTenantToDelete(null);
      fetchTenants();
    } catch (err) {
      toast.error(err.message || 'Gagal menonaktifkan tenant.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t('tenant_mgmt_title', 'Manajemen Tenant (SaaS Multi-Company)')}
                </h1>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {tenants.length} {t('tenant_total', 'Organisasi')}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('tenant_mgmt_desc', 'Kelola pendaftaran perusahaan, standar kode tenant, isolasi data, dan parameter geofencing pusat')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('tenant_btn_add', 'Daftarkan Tenant Baru')}</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('tenant_search_placeholder', 'Cari berdasarkan nama perusahaan, kode tenant, industri, atau Tenant ID...')}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30 text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Tenants Grid */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block p-4 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 animate-spin mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t('loading_tenants', 'Memuat daftar organisasi tenant...')}
          </p>
        </div>
      ) : filteredTenants.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 p-12 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
          <Building2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
            {t('tenant_not_found', 'Tidak ada tenant yang cocok')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            {t('tenant_not_found_desc', 'Coba gunakan kata kunci pencarian lain atau buat tenant baru')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredTenants.map((tItem) => {
            const isRoot = tItem.id === 'TNT-ROOT-000001';
            return (
              <div
                key={tItem.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-soft hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Code, ID & Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-lg border ${
                        isRoot
                          ? 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                          : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
                      }`}>
                        {tItem.id}
                      </span>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {tItem.code}
                      </span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 flex items-center gap-1">
                        <Crown className="w-3 h-3" />
                        {tItem.planDetails
                          ? language === 'en'
                            ? tItem.planDetails.nameEn
                            : tItem.planDetails.nameId
                          : (tItem.subscriptionPlan || 'starter').toUpperCase()}
                      </span>
                      <span
                        title="id_subscription_plan"
                        className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200/70 dark:border-amber-800"
                      >
                        {tItem.id_subscription_plan ||
                          tItem.idSubscriptionPlan ||
                          `PLAN-${(tItem.subscriptionPlan || 'starter').toUpperCase()}`}
                      </span>
                      {isRoot && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Platform Root
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleImpersonate(tItem)}
                        disabled={impersonatingId === tItem.id}
                        title={t('saas_btn_impersonate_tooltip', 'Masuk sebagai HR Admin organisasi ini')}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/70 dark:text-emerald-300 dark:hover:bg-emerald-900/60 border border-emerald-200/70 dark:border-emerald-800 transition-colors cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{impersonatingId === tItem.id ? '...' : t('saas_btn_impersonate', 'Masuk HR')}</span>
                      </button>
                      {!isRoot && (
                        <button
                          onClick={() => handleOpenCreateAdmin(tItem)}
                          title={t('tenant_add_admin_title', 'Tambah Akun HR Admin Tenant')}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:text-indigo-300 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer mr-1"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{t('tenant_btn_add_admin', '+ Admin')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(tItem)}
                        title={t('btn_edit', 'Edit')}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!isRoot && (
                        <button
                          onClick={() => handleOpenDelete(tItem)}
                          title={t('btn_deactivate', 'Nonaktifkan')}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Company Name & Tagline */}
                  <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
                    {tItem.name}
                  </h3>
                  {tItem.tagline && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3">
                      "{tItem.tagline}"
                    </p>
                  )}

                  {/* Badges / Meta */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{tItem.industry || 'Layanan Korporat'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{tItem.timezoneLabel || 'WIB (UTC+7)'}</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <Radio className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{tItem.workModel || 'Reguler'}</span>
                    </div>
                  </div>

                  {/* Headquarters info */}
                  <div className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400 mb-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                        {tItem.headquarters?.name || tItem.hq_name || 'Kantor Pusat'}
                      </p>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {tItem.headquarters?.address || tItem.hq_address || 'Indonesia'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer Metrics */}
                <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Users className="w-3.5 h-3.5 text-indigo-500" />
                      {tItem.employeeCount || 0} / {tItem.maxEmployees || 50} {t('staff', 'Staf')}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <MapPin className="w-3.5 h-3.5 text-blue-500" />
                      {tItem.locationCount || 1} / {tItem.maxLocations || 3} {t('saas_branch_unit', 'Cabang')}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
                      <Layers className="w-3.5 h-3.5 text-emerald-500" />
                      {tItem.shiftCount || 0} {t('shifts', 'Shift')}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400">
                    Radius: {tItem.headquarters?.radiusMeters || tItem.hq_radius_meters || 100}m
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Tenant Modal */}
      {isModalOpen && (
        <TenantModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          tenant={editingTenant}
          existingTenants={tenants}
          onSaved={() => {
            setIsModalOpen(false);
            fetchTenants();
          }}
        />
      )}

      {/* Create Tenant Admin Modal */}
      {isAdminModalOpen && selectedTenantForAdmin && (
        <TenantAdminModal
          isOpen={isAdminModalOpen}
          onClose={() => {
            setIsAdminModalOpen(false);
            setSelectedTenantForAdmin(null);
          }}
          tenant={selectedTenantForAdmin}
          onSaved={() => {
            setIsAdminModalOpen(false);
            setSelectedTenantForAdmin(null);
            fetchTenants();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && tenantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 shadow-2xl">
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/50 text-red-600 w-fit mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">
              {t('confirm_delete_tenant_title', 'Nonaktifkan Tenant Ini?')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              {t(
                'confirm_delete_tenant_desc',
                `Tenant "${tenantToDelete.name}" (${tenantToDelete.id}) akan dinonaktifkan (soft delete). Karyawan dalam tenant ini tidak akan dapat login sementara waktu.`
              )}
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
                {t('btn_confirm_deactivate', 'Ya, Nonaktifkan')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export const INDUSTRY_OPTIONS = [
  // Teknologi, AI & Digital
  { label: 'Information Technology & Software (SaaS)', value: 'Information Technology & Software (SaaS)', group: 'Teknologi & Digital', tag: 'Tech' },
  { label: 'Artificial Intelligence & Data Analytics', value: 'Artificial Intelligence & Data Analytics', group: 'Teknologi & Digital', tag: 'AI' },
  { label: 'Cybersecurity, Cloud & IT Infrastructure', value: 'Cybersecurity, Cloud & IT Infrastructure', group: 'Teknologi & Digital', tag: 'Cloud' },
  { label: 'Telekomunikasi & Jaringan Seluler', value: 'Telekomunikasi & Jaringan Seluler', group: 'Teknologi & Digital', tag: 'Telco' },

  // Keuangan, Perbankan & Asuransi
  { label: 'Perbankan (Banking Services)', value: 'Banking & Financial Services', group: 'Keuangan & Fintech', tag: 'Bank' },
  { label: 'Fintech & Digital Payments', value: 'Fintech & Digital Payments', group: 'Keuangan & Fintech', tag: 'Fintech' },
  { label: 'Asuransi & Manajemen Risiko', value: 'Insurance & Risk Management', group: 'Keuangan & Fintech', tag: 'Insurance' },
  { label: 'Sekuritas, Investasi & Manajemen Aset', value: 'Investment & Asset Management', group: 'Keuangan & Fintech', tag: 'Invest' },

  // Logistik, Transportasi & Rantai Pasok
  { label: 'Logistik, Pergudangan & Rantai Pasok', value: 'Logistics, Warehousing & Supply Chain', group: 'Logistik & Transportasi', tag: 'Supply' },
  { label: 'Ekspedisi, Kurir & Pengiriman Cepat', value: 'Express Courier & Delivery', group: 'Logistik & Transportasi', tag: 'Courier' },
  { label: 'Transportasi Darat, Laut & Udara (Freight)', value: 'Freight Forwarding & Transportation', group: 'Logistik & Transportasi', tag: 'Freight' },

  // Perdagangan, Retail & FMCG
  { label: 'E-Commerce & Digital Marketplace', value: 'E-Commerce & Digital Marketplace', group: 'Retail & Perdagangan', tag: 'E-Com' },
  { label: 'Retail Modern, Supermarket & Mall', value: 'Retail & Modern Trade', group: 'Retail & Perdagangan', tag: 'Retail' },
  { label: 'Fast-Moving Consumer Goods (FMCG)', value: 'Fast-Moving Consumer Goods (FMCG)', group: 'Retail & Perdagangan', tag: 'FMCG' },
  { label: 'Distributor, Grosir & Import/Export', value: 'Distribution & Wholesale', group: 'Retail & Perdagangan', tag: 'Trade' },

  // Manufaktur, Konstruksi & Energi
  { label: 'Manufaktur & Pabrikasi Industri', value: 'Manufacturing & Industrial Production', group: 'Manufaktur & Industri', tag: 'Factory' },
  { label: 'Otomotif & Perakitan Komponen', value: 'Automotive & Assembly', group: 'Manufaktur & Industri', tag: 'Auto' },
  { label: 'Konstruksi, Infrastruktur & Sipil', value: 'Construction & Civil Engineering', group: 'Manufaktur & Industri', tag: 'Build' },
  { label: 'Properti, Real Estate & Kawasan Industri', value: 'Property & Real Estate', group: 'Manufaktur & Industri', tag: 'Property' },
  { label: 'Minyak, Gas & Petrokimia', value: 'Oil, Gas & Petrochemical', group: 'Energi & Tambang', tag: 'Energy' },
  { label: 'Energi Terbarukan & Kelistrikan', value: 'Renewable Energy & Power Utilities', group: 'Energi & Tambang', tag: 'Power' },
  { label: 'Pertambangan Mineral, Batubara & Nikel', value: 'Mining & Mineral Extraction', group: 'Energi & Tambang', tag: 'Mining' },

  // Kesehatan & Medis
  { label: 'Rumah Sakit & Jaringan Klinik Medis', value: 'Hospital & Healthcare Services', group: 'Kesehatan & Medis', tag: 'Health' },
  { label: 'Farmasi & Alat Kesehatan', value: 'Pharmaceuticals & Medical Devices', group: 'Kesehatan & Medis', tag: 'Pharma' },
  { label: 'Laboratorium Medis & Bioteknologi', value: 'Biotechnology & Medical Diagnostics', group: 'Kesehatan & Medis', tag: 'Bio' },

  // Kuliner & Hospitality
  { label: 'Food & Beverage (F&B) & Restoran', value: 'Food & Beverage (F&B) & Restaurants', group: 'Kuliner & Hospitality', tag: 'F&B' },
  { label: 'Perhotelan, Resort & Akomodasi', value: 'Hospitality & Resorts', group: 'Kuliner & Hospitality', tag: 'Hotel' },
  { label: 'Travel, Wisata & Agen Perjalanan', value: 'Travel, Tourism & Tour Operators', group: 'Kuliner & Hospitality', tag: 'Travel' },

  // Pendidikan & Sosial
  { label: 'Pendidikan, Sekolah & Universitas', value: 'Education & Higher Learning', group: 'Pendidikan & Sosial', tag: 'Edu' },
  { label: 'EdTech & Lembaga Kursus/Pelatihan', value: 'EdTech & Professional Training', group: 'Pendidikan & Sosial', tag: 'EdTech' },
  { label: 'Pemerintahan, BUMN & Lembaga Publik', value: 'Government & Public Services', group: 'Pemerintahan & Publik', tag: 'Gov' },
  { label: 'Non-Profit, Yayasan & LSM (NGO)', value: 'Non-Profit & NGO', group: 'Pendidikan & Sosial', tag: 'NGO' },

  // Layanan Profesional & Kreatif
  { label: 'Konsultan Bisnis, Manajemen & IT', value: 'Business & Management Consulting', group: 'Layanan Profesional', tag: 'Consult' },
  { label: 'Kantor Hukum, Notaris & Legal', value: 'Legal Services & Law Firm', group: 'Layanan Profesional', tag: 'Legal' },
  { label: 'Kantor Akuntan Publik (KAP), Pajak & Audit', value: 'Accounting, Tax & Audit Services', group: 'Layanan Profesional', tag: 'Audit' },
  { label: 'Digital Agency, Iklan & Media Kreatif', value: 'Creative Agency, Advertising & Media', group: 'Kreatif & Media', tag: 'Media' },
  { label: 'Pertanian, Agribisnis & Perkebunan', value: 'Agriculture, Plantation & Agribusiness', group: 'Pertanian & Alam', tag: 'Agri' },
  { label: 'Lainnya (Industri Khusus)', value: 'Other Industry', group: 'Lainnya', tag: 'Other' },
];

export const WORK_MODEL_OPTIONS = [
  'Corporate Non-Shift (Senin - Jumat 08:30 - 17:30)',
  'Shifting 24/7 (Termasuk Shift Malam Lintas Hari)',
  'Operasional 2-Shift (Pagi 07:00-15:00 & Siang 15:00-23:00)',
  'Hybrid Work (3 Hari WFO / 2 Hari WFH Fleksibel)',
  'Flexible Working Hours (Core Hours 10:00 - 16:00, 40 Jam/Minggu)',
  'Remote-First / Work From Anywhere (WFA Penuh)',
  'Roster Rotasional (4 Hari Kerja / 2 Hari Libur - Site Operasi)',
  'Pelayanan Medis / Faskes 3-Shift 24 Jam',
  'Custom / Jadwal Jam Kerja Khusus',
];

export function generatePrefixCode(companyName, existingCodes = []) {
  if (!companyName) return '';

  const taken = new Set(
    (Array.isArray(existingCodes) ? existingCodes : Array.from(existingCodes || []))
      .map((c) => String(c).trim().toUpperCase())
      .filter(Boolean)
  );

  // 1. Strip corporate legal entity prefixes and suffixes
  const cleaned = companyName
    .replace(/\b(pt|cv|ud|tbk|ltd|inc|corp|corporation|persero|yayasan|koperasi|firma|nv|perum)\b\.?/gi, ' ')
    .trim();

  // 2. Clean words
  const words = cleaned
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim().toUpperCase())
    .filter(Boolean);

  if (words.length === 0) {
    const rawFallback = companyName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 8);
    return rawFallback && !taken.has(rawFallback) ? rawFallback : 'TNT';
  }

  const candidates = [];

  if (words.length === 1) {
    const w1 = words[0];
    candidates.push(w1.slice(0, 8));
    candidates.push(w1.slice(0, 6) + '01');
  } else if (words.length === 2) {
    const [w1, w2] = words;
    // Blend: 3 from w1 + up to 5 from w2 (e.g. NEG + AWAN -> NEGAWAN, NEG + SYAM -> NEGSYAM)
    const blend1 = (w1.slice(0, 3) + w2.slice(0, 5)).slice(0, 8);
    candidates.push(blend1);

    // Blend: 4 from w1 + 4 from w2 (e.g. NEGE + AWAN -> NEGEAWAN)
    const blend2 = (w1.slice(0, 4) + w2.slice(0, 4)).slice(0, 8);
    if (!candidates.includes(blend2)) candidates.push(blend2);

    // W1 + initial of W2 (e.g. NEGERI + A -> NEGERIA)
    const blend3 = (w1.slice(0, 7) + w2.slice(0, 1)).slice(0, 8);
    if (!candidates.includes(blend3)) candidates.push(blend3);

    // Full W1 (e.g. NEGERI)
    const w1Only = w1.slice(0, 8);
    if (!candidates.includes(w1Only)) candidates.push(w1Only);

    // Acronym if >= 3 chars
    const acronym = (w1[0] + w2[0]).slice(0, 8);
    if (acronym.length >= 3 && !candidates.includes(acronym)) candidates.push(acronym);
  } else {
    // 3 or more words
    // Acronym (e.g. BCA, NAS, SML)
    const acronym = words.map((w) => w[0]).join('').slice(0, 8);
    if (acronym.length >= 3) {
      candidates.push(acronym);
    }

    // Blend: 3 from w1 + 2 from w2 + 3 from w3 (e.g. NEGAWSEN)
    const w1 = words[0];
    const w2 = words[1];
    const w3 = words[2];
    const blendMulti = (w1.slice(0, 3) + w2.slice(0, 2) + w3.slice(0, 3)).slice(0, 8);
    if (!candidates.includes(blendMulti)) candidates.push(blendMulti);

    // 2-word blend fallback
    const blend2 = (w1.slice(0, 3) + w2.slice(0, 5)).slice(0, 8);
    if (!candidates.includes(blend2)) candidates.push(blend2);
  }

  // Find first candidate not in taken
  for (const c of candidates) {
    const clean = c.replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (clean.length >= 3 && !taken.has(clean)) {
      return clean;
    }
  }

  // Disambiguation if all natural candidates taken:
  const base = (candidates[0] || 'TNT').slice(0, 6);
  for (let i = 1; i <= 99; i++) {
    const numStr = String(i).padStart(2, '0');
    const suffixed = (base.slice(0, 8 - numStr.length) + numStr).slice(0, 8);
    if (!taken.has(suffixed)) {
      return suffixed;
    }
  }

  return ('TNT' + Math.floor(100 + Math.random() * 900)).slice(0, 8);
}

function TenantModal({ isOpen, onClose, tenant, onSaved, existingTenants = [] }) {
  const { t } = useLanguage();
  const toast = useToast();
  const isEditing = Boolean(tenant);

  const existingCodes = useMemo(() => {
    return (existingTenants || [])
      .filter((t) => !tenant || t.id !== tenant.id)
      .map((t) => t.code?.toUpperCase())
      .filter(Boolean);
  }, [existingTenants, tenant]);

  const initialCode = tenant?.code || (tenant?.name ? generatePrefixCode(tenant.name, existingCodes) : '');
  const [isCustomCode, setIsCustomCode] = useState(isEditing);

  const [formData, setFormData] = useState({
    name: tenant?.name || '',
    code: initialCode,
    tagline: tenant?.tagline || '',
    industry: tenant?.industry || 'Information Technology & Software (SaaS)',
    workModel: tenant?.workModel || 'Corporate Non-Shift (Senin - Jumat 08:30 - 17:30)',
    timezone: tenant?.timezone || 'Asia/Jakarta',
    timezoneLabel: tenant?.timezoneLabel || 'WIB (UTC+7)',
    hqName: tenant?.headquarters?.name || tenant?.hq_name || 'Kantor Pusat',
    hqAddress: tenant?.headquarters?.address || tenant?.hq_address || '',
    hqLatitude: tenant?.headquarters?.latitude || tenant?.hq_latitude || -6.2088,
    hqLongitude: tenant?.headquarters?.longitude || tenant?.hq_longitude || 106.8456,
    hqRadiusMeters: tenant?.headquarters?.radiusMeters || tenant?.hq_radius_meters || 100,
    idSubscriptionPlan:
      tenant?.id_subscription_plan ||
      tenant?.idSubscriptionPlan ||
      `PLAN-${(tenant?.subscriptionPlan || 'starter').toUpperCase()}`,
    subscriptionPlan: tenant?.subscriptionPlan || 'starter',
    subscriptionStatus: tenant?.subscriptionStatus || 'active',
    billingCycle: tenant?.billingCycle || 'monthly',
    maxEmployees: tenant?.maxEmployees || 50,
    maxLocations: tenant?.maxLocations || 3,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customWorkModel, setCustomWorkModel] = useState(
    tenant?.workModel && !WORK_MODEL_OPTIONS.includes(tenant.workModel)
      ? tenant.workModel
      : ''
  );

  const isCodeTaken = useMemo(() => {
    if (isEditing) return false;
    const clean = (formData.code || '').trim().toUpperCase();
    if (!clean) return false;
    return existingCodes.includes(clean);
  }, [formData.code, isEditing, existingCodes]);

  // Handle Company Name change with auto-code derivation
  const handleNameChange = (e) => {
    const newName = e.target.value;
    const autoCode = generatePrefixCode(newName, existingCodes);
    setFormData((prev) => ({
      ...prev,
      name: newName,
      code: isEditing || isCustomCode ? prev.code : autoCode,
    }));
  };

  const handleRegenerateCode = () => {
    const autoCode = generatePrefixCode(formData.name, existingCodes);
    setFormData((prev) => ({ ...prev, code: autoCode }));
    setIsCustomCode(false);
    toast.info(`Kode digenerate: ${autoCode || '(Masukkan nama perusahaan)'}`);
  };

  // Simulated ID preview
  const previewId = useMemo(() => {
    if (isEditing) return tenant.id;
    const clean = formData.code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) || 'CODE';
    return `TNT-${clean}-XXXXXX`;
  }, [isEditing, tenant, formData.code]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(t('tenant_req_error', 'Nama perusahaan dan kode tenant wajib diisi.'));
      return;
    }

    if (isCodeTaken) {
      toast.error(`Kode "${formData.code}" sudah digunakan oleh perusahaan lain. Gunakan kode lain atau klik Auto-Generate.`);
      return;
    }

    // Ensure code is present; if empty auto-generate
    const finalCode = (formData.code || generatePrefixCode(formData.name, existingCodes) || 'TNT')
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);

    const finalWorkModel =
      formData.workModel === 'Custom / Jadwal Jam Kerja Khusus' && customWorkModel.trim()
        ? `Custom: ${customWorkModel.trim()}`
        : formData.workModel;

    try {
      setIsSubmitting(true);
      const payload = {
        name: formData.name.trim(),
        code: finalCode,
        tagline: formData.tagline.trim(),
        industry: formData.industry.trim(),
        workModel: finalWorkModel,
        timezone: formData.timezone.trim(),
        timezoneLabel: formData.timezoneLabel.trim(),
        id_subscription_plan:
          formData.idSubscriptionPlan || `PLAN-${(formData.subscriptionPlan || 'starter').toUpperCase()}`,
        idSubscriptionPlan:
          formData.idSubscriptionPlan || `PLAN-${(formData.subscriptionPlan || 'starter').toUpperCase()}`,
        subscriptionPlan: formData.subscriptionPlan,
        subscriptionStatus: formData.subscriptionStatus,
        billingCycle: formData.billingCycle,
        maxEmployees: parseInt(formData.maxEmployees, 10) || 50,
        maxLocations: parseInt(formData.maxLocations, 10) || 3,
        headquarters: {
          name: formData.hqName.trim(),
          address: formData.hqAddress.trim(),
          latitude: parseFloat(formData.hqLatitude),
          longitude: parseFloat(formData.hqLongitude),
          radiusMeters: parseInt(formData.hqRadiusMeters, 10) || 100,
        },
      };

      if (isEditing) {
        await tenantApi.updateTenant(tenant.id, payload);
        toast.success(t('tenant_updated_success', `Tenant ${payload.name} berhasil diperbarui.`));
      } else {
        const created = await tenantApi.createTenant(payload);
        toast.success(t('tenant_created_success', `Tenant baru ${payload.name} (${created.id}) berhasil didaftarkan.`));
      }
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan data tenant.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isEditing ? t('tenant_edit_title', 'Edit Data Tenant') : t('tenant_new_title', 'Pendaftaran Tenant Baru')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('tenant_modal_subtitle', 'Format standar ID otomatis: TNT-{CODE}-{6_DIGITS}')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tenant ID Preview badge */}
          <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-900 dark:text-indigo-300">
              {t('preview_tenant_id', 'Enterprise Tenant ID Format:')}
            </span>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-600 text-white shadow-xs">
              {previewId}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Nama Perusahaan */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('tenant_name_label', 'Nama Perusahaan')} *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={handleNameChange}
                placeholder="Contoh: PT Finansial Prima Nusantara"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
              />
            </div>

            {/* Kode Singkat (Prefix ID) - Auto-generated */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t('tenant_code_label', 'Kode Singkat (Prefix ID)')} *
                </label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={handleRegenerateCode}
                    title="Generate ulang dari nama perusahaan"
                    className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    <span>Auto-Generate</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <input
                  type="text"
                  required
                  disabled={isEditing}
                  value={formData.code}
                  onChange={(e) => {
                    setIsCustomCode(true);
                    setFormData({
                      ...formData,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8),
                    });
                  }}
                  placeholder="FINANCE"
                  className={`w-full px-3 py-2 text-xs font-mono font-bold bg-slate-50 dark:bg-slate-800 border rounded-xl focus:ring-2 text-slate-900 dark:text-white ${
                    isCodeTaken
                      ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/30 bg-rose-50/20'
                      : isEditing
                      ? 'border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed'
                      : 'border-slate-200 dark:border-slate-700 focus:ring-indigo-500/30'
                  }`}
                />

                {isEditing ? (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" /> Terkunci
                  </span>
                ) : isCodeTaken ? (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 flex items-center gap-0.5">
                    <AlertTriangle className="w-3 h-3" /> Dipakai
                  </span>
                ) : !isCustomCode && formData.code ? (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                    Auto
                  </span>
                ) : null}
              </div>

              {isCodeTaken ? (
                <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Kode "{formData.code}" sudah digunakan perusahaan lain. Klik "Auto-Generate" untuk kode unik otomatis.</span>
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">
                  {isEditing
                    ? 'Kode tenant bersifat permanen untuk integritas ID.'
                    : 'Otomatis ter-generate dari nama perusahaan.'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {t('tenant_tagline_label', 'Tagline / Slogan Perusahaan')}
            </label>
            <input
              type="text"
              value={formData.tagline}
              onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
              placeholder="Fast & Reliable Supply Chain Operations"
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-white"
            />
          </div>

          {/* Industri (Select2 Searchable) & Model Jam Kerja (Select Option) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Industri with Select2 */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('tenant_industry_label', 'Industri')} *
              </label>
              <Select2
                value={formData.industry}
                onChange={(val) => setFormData({ ...formData, industry: val })}
                options={INDUSTRY_OPTIONS}
                placeholder="Pilih atau cari industri..."
                searchPlaceholder="Ketik untuk mencari industri..."
              />
            </div>

            {/* Model Jam Kerja with Select Option */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('tenant_work_model_label', 'Model Jam Kerja')} *
              </label>
              <select
                value={
                  WORK_MODEL_OPTIONS.includes(formData.workModel)
                    ? formData.workModel
                    : 'Custom / Jadwal Jam Kerja Khusus'
                }
                onChange={(e) => setFormData({ ...formData, workModel: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/30 cursor-pointer"
              >
                {WORK_MODEL_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {(formData.workModel === 'Custom / Jadwal Jam Kerja Khusus' ||
                (!WORK_MODEL_OPTIONS.includes(formData.workModel) && formData.workModel)) && (
                <input
                  type="text"
                  value={customWorkModel}
                  onChange={(e) => {
                    setCustomWorkModel(e.target.value);
                    setFormData({ ...formData, workModel: e.target.value });
                  }}
                  placeholder="Ketik detail model jam kerja..."
                  className="mt-2 w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white"
                />
              )}
            </div>
          </div>

          {/* Subscription Plan & Quota Section */}
          <div className="p-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
                {t('saas_modal_sub_title', 'Konfigurasi Paket Langganan & Kuota Lisensi')}
              </h4>
              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-600 text-white">
                id_subscription_plan: {formData.idSubscriptionPlan || `PLAN-${(formData.subscriptionPlan || 'starter').toUpperCase()}`}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('saas_field_plan', 'Paket Berlangganan (id_subscription_plan)')}
                </label>
                <select
                  value={formData.subscriptionPlan}
                  onChange={(e) => {
                    const p = e.target.value;
                    const defaults = {
                      free: { id: 'PLAN-FREE', emp: 15, loc: 1 },
                      starter: { id: 'PLAN-STARTER', emp: 50, loc: 3 },
                      pro: { id: 'PLAN-PRO', emp: 250, loc: 10 },
                      enterprise: { id: 'PLAN-ENTERPRISE', emp: 9999, loc: 999 },
                    }[p] || { id: 'PLAN-STARTER', emp: 50, loc: 3 };
                    setFormData({
                      ...formData,
                      idSubscriptionPlan: defaults.id,
                      subscriptionPlan: p,
                      maxEmployees: defaults.emp,
                      maxLocations: defaults.loc,
                    });
                  }}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="free">[PLAN-FREE] Free / Trial (15 Staf)</option>
                  <option value="starter">[PLAN-STARTER] Starter (50 Staf)</option>
                  <option value="pro">[PLAN-PRO] Professional (250 Staf)</option>
                  <option value="enterprise">[PLAN-ENTERPRISE] Enterprise (Unlimited)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('saas_field_max_emp', 'Kuota Maks Karyawan')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="99999"
                  value={formData.maxEmployees}
                  onChange={(e) => setFormData({ ...formData, maxEmployees: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  {t('saas_field_max_loc', 'Kuota Maks Cabang')}
                </label>
                <input
                  type="number"
                  min="1"
                  max="9999"
                  value={formData.maxLocations}
                  onChange={(e) => setFormData({ ...formData, maxLocations: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                />
              </div>
            </div>
          </div>

          {/* Headquarters Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-500" />
              {t('hq_geofence_title', 'Titik Geofencing Kantor Pusat (HQ)')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Nama Titik Kantor
                </label>
                <input
                  type="text"
                  value={formData.hqName}
                  onChange={(e) => setFormData({ ...formData, hqName: e.target.value })}
                  placeholder="Menara Batavia Lt. 18"
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Radius Geofence Presensi (Meter)
                </label>
                <input
                  type="number"
                  min="20"
                  max="1000"
                  value={formData.hqRadiusMeters}
                  onChange={(e) => setFormData({ ...formData, hqRadiusMeters: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Alamat Lengkap
              </label>
              <textarea
                rows="2"
                value={formData.hqAddress}
                onChange={(e) => setFormData({ ...formData, hqAddress: e.target.value })}
                placeholder="Jl. K.H. Mas Mansyur Kav. 126, Jakarta Pusat"
                className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Latitude GPS
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.hqLatitude}
                  onChange={(e) => setFormData({ ...formData, hqLatitude: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                  Longitude GPS
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={formData.hqLongitude}
                  onChange={(e) => setFormData({ ...formData, hqLongitude: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl font-mono"
                />
              </div>
            </div>
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
              disabled={isSubmitting || isCodeTaken}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md hover:shadow-indigo-500/20 transition-all disabled:opacity-60 cursor-pointer"
            >
              {isSubmitting
                ? t('saving', 'Menyimpan...')
                : isEditing
                ? t('btn_update', 'Simpan Perubahan')
                : t('btn_create_tenant', 'Daftarkan Tenant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TenantAdminModal({ isOpen, onClose, tenant, onSaved }) {
  const { t } = useLanguage();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: 'password123',
    position: 'HR & People Operations Lead',
    department: 'Human Resources',
    locationId: '',
  });
  const [branches, setBranches] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen || !tenant) return;
    locationApi.getLocations(tenant.id).then((locs) => {
      if (Array.isArray(locs) && locs.length > 0) {
        setBranches(locs);
        const hq = locs.find((l) => l.isHeadquarters) || locs[0];
        if (hq) {
          setFormData((prev) => ({ ...prev, locationId: prev.locationId || hq.id }));
        }
      }
    }).catch(() => {});
  }, [isOpen, tenant]);

  if (!isOpen || !tenant) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.email.trim()) {
      toast.error('Nama dan email admin tenant wajib diisi.');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        tenantId: tenant.id,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password || 'password123',
        role: 'hr_admin',
        position: formData.position.trim() || 'HR & People Operations Lead',
        department: formData.department.trim() || 'Human Resources',
        locationId: formData.locationId || null,
      };

      const created = await userApi.createEmployee(payload);
      toast.success(`Akun Admin Tenant ${created.name} (${created.id}) berhasil dibuat untuk ${tenant.name}!`);
      onSaved();
    } catch (err) {
      toast.error(err.message || 'Gagal mendaftarkan admin tenant.');
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
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('tenant_admin_modal_title', 'Tambah Admin Tenant Baru')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('company_label', 'Organisasi')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{tenant.name}</span> ({tenant.code})
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

        <div className="p-3 mb-4 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">{t('tenant_admin_banner_title', 'Role: HR Administrator (Admin Tenant)')}</p>
            <p className="text-[11px] text-indigo-600/80 dark:text-indigo-400/80">
              {t('tenant_admin_banner_desc', 'Pengguna ini akan memiliki hak kelola penuh atas karyawan, shift, persetujuan cuti, dan master data di tenant {name}.', { name: tenant.name })}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('tenant_admin_fullname', 'Nama Lengkap Admin *')}
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Contoh: Siti Rahma, S.Psi"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('tenant_admin_email', 'Email Login *')}
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Contoh: hr@perusahaan.id"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              {t('tenant_admin_password', 'Kata Sandi Default *')}
            </label>
            <input
              type="text"
              required
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="password123"
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl font-mono focus:bg-white dark:focus:bg-slate-900 transition-colors"
            />
            <p className="text-[11px] text-slate-400 mt-1">{t('tenant_admin_password_hint', 'Admin tenant dapat mengganti kata sandi ini setelah login.')}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('tenant_admin_position', 'Jabatan / Posisi')}
              </label>
              <input
                type="text"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('tenant_admin_department', 'Departemen')}
              </label>
              <input
                type="text"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>{t('branch_label', 'Cabang & Unit Usaha Penugasan')} *</span>
              {formData.locationId && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-normal">
                  ✓ {t('selected', 'Terpilih')}
                </span>
              )}
            </label>
            <select
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 transition-colors"
            >
              {branches.length > 0 ? (
                branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.businessType || 'Kantor'}] {b.name} {b.isHeadquarters ? '(HQ)' : ''} - Radius {b.radiusMeters}m
                  </option>
                ))
              ) : (
                <option value="">{t('auto_hq_branch', 'Kantor Pusat (Otomatis)')}</option>
              )}
            </select>
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
              {isSubmitting ? t('tenant_admin_btn_submitting', 'Mendaftarkan...') : t('tenant_admin_btn_submit', 'Buat Akun Admin Tenant')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

