import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  Building2,
  Users,
  MapPin,
  CreditCard,
  Activity,
  ShieldCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Crown,
  ArrowUpRight,
  UserCheck,
  Sliders,
  FileSearch,
  Server,
  Clock,
  Layers,
  X,
  Save,
} from 'lucide-react';
import { tenantApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { ROUTES } from '../../routes/routePaths';

const PLAN_BADGE_STYLES = {
  free: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  starter: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
  pro: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
  enterprise: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
};

const STATUS_BADGE_STYLES = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
  trial: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
  past_due: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
  expired: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
};

export default function SaasDashboardPage() {
  const { t, language } = useLanguage();
  const { impersonateTenant } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('overview');
  const [overviewData, setOverviewData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  // Filters for Tenant Table
  const [tenantSearch, setTenantSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Filters for Audit Logs
  const [auditCategory, setAuditCategory] = useState('all');
  const [auditTenantId, setAuditTenantId] = useState('all');
  const [auditSearch, setAuditSearch] = useState('');

  // Subscription Modal State
  const [editingTenant, setEditingTenant] = useState(null);
  const [subForm, setSubForm] = useState({
    selectedTenantId: '',
    subscriptionPlan: 'starter',
    subscriptionStatus: 'active',
    billingCycle: 'monthly',
    maxEmployees: 50,
    maxLocations: 3,
    subscriptionExpiresAt: '',
  });
  const [isSavingSub, setIsSavingSub] = useState(false);
  const [impersonatingId, setImpersonatingId] = useState(null);

  // Master Subscription Plan Catalog Editor Modal State (table `subscription_plans`)
  const [editingPlanSpec, setEditingPlanSpec] = useState(null);
  const [planSpecForm, setPlanSpecForm] = useState({
    code: '',
    nameId: '',
    nameEn: '',
    monthlyPrice: 0,
    yearlyPrice: 0,
    maxEmployees: 50,
    maxLocations: 3,
    featuresIdText: '',
    featuresEnText: '',
  });
  const [isSavingPlanSpec, setIsSavingPlanSpec] = useState(false);

  const showToast = (type, message) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 4500);
  };

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await tenantApi.getSaasOverview();
      setOverviewData(res?.data || res);
    } catch (err) {
      showToast('error', err.message || t('saas_err_load_overview', 'Gagal memuat metrik SaaS.'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const fetchAuditLogs = useCallback(async () => {
    setIsAuditLoading(true);
    try {
      const params = { limit: 120 };
      if (auditCategory !== 'all') params.category = auditCategory;
      if (auditTenantId !== 'all') params.tenantId = auditTenantId;
      if (auditSearch.trim()) params.search = auditSearch.trim();
      const res = await tenantApi.getAuditLogs(params);
      setAuditLogs(res?.data || res || []);
    } catch (err) {
      console.warn('Failed to load audit logs:', err);
    } finally {
      setIsAuditLoading(false);
    }
  }, [auditCategory, auditTenantId, auditSearch]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  useEffect(() => {
    if (activeTab === 'audit') {
      fetchAuditLogs();
    }
  }, [activeTab, fetchAuditLogs]);

  const formatIdr = (amount) => {
    return new Intl.NumberFormat(language === 'en' ? 'en-US' : 'id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  };

  const formatDateTime = (iso) => {
    if (!iso) return '-';
    try {
      return new Date(iso).toLocaleString(language === 'en' ? 'en-US' : 'id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  const getStatusLabel = (status) => {
    const s = (status || 'active').toLowerCase();
    if (s === 'active') return t('saas_status_active', 'Aktif');
    if (s === 'trial') return t('saas_status_trial', 'Masa Percobaan');
    if (s === 'past_due') return t('saas_status_past_due', 'Menunggu Pembayaran');
    if (s === 'suspended') return t('saas_status_suspended', 'Ditangguhkan');
    if (s === 'expired') return t('saas_status_expired', 'Kedaluwarsa');
    return status;
  };

  const catalogMap = useMemo(() => {
    if (overviewData?.catalog && typeof overviewData.catalog === 'object') {
      return overviewData.catalog;
    }
    const map = {};
    const list = overviewData?.plansCatalog || overviewData?.planDistribution || [];
    list.forEach((p) => {
      if (p?.code) map[p.code] = p;
    });
    return map;
  }, [overviewData]);

  const openSubscriptionModal = (tenant, presetPlanCode = null) => {
    const targetPlan = presetPlanCode || tenant?.subscriptionPlan || 'starter';
    const planDefaults = catalogMap[targetPlan] || { maxEmployees: 50, maxLocations: 3 };

    setEditingTenant(tenant || null);
    setSubForm({
      selectedTenantId: tenant?.id || (overviewData?.tenants?.[0]?.id ?? ''),
      subscriptionPlan: targetPlan,
      subscriptionStatus: tenant?.subscriptionStatus || 'active',
      billingCycle: tenant?.billingCycle || 'monthly',
      maxEmployees: presetPlanCode ? planDefaults.maxEmployees : (tenant?.maxEmployees || planDefaults.maxEmployees),
      maxLocations: presetPlanCode ? planDefaults.maxLocations : (tenant?.maxLocations || planDefaults.maxLocations),
      subscriptionExpiresAt: tenant?.subscriptionExpiresAt
        ? String(tenant.subscriptionExpiresAt).slice(0, 10)
        : '',
    });
  };

  const handlePlanChangeInModal = (newPlanCode) => {
    const planCfg = catalogMap[newPlanCode];
    setSubForm((prev) => ({
      ...prev,
      subscriptionPlan: newPlanCode,
      maxEmployees: planCfg ? planCfg.maxEmployees : prev.maxEmployees,
      maxLocations: planCfg ? planCfg.maxLocations : prev.maxLocations,
    }));
  };

  const openEditPlanSpecModal = (plan) => {
    setEditingPlanSpec(plan);
    setPlanSpecForm({
      code: plan.code,
      nameId: plan.nameId || plan.name || '',
      nameEn: plan.nameEn || plan.name || '',
      monthlyPrice: Number(plan.monthlyPrice ?? 0),
      yearlyPrice: Number(plan.yearlyPrice ?? 0),
      maxEmployees: Number(plan.maxEmployees ?? 50),
      maxLocations: Number(plan.maxLocations ?? 3),
      featuresIdText: Array.isArray(plan.featuresId) ? plan.featuresId.join('\n') : '',
      featuresEnText: Array.isArray(plan.featuresEn) ? plan.featuresEn.join('\n') : '',
    });
  };

  const handleSavePlanSpec = async (e) => {
    e.preventDefault();
    if (!editingPlanSpec?.code) return;
    setIsSavingPlanSpec(true);
    try {
      const featuresId = planSpecForm.featuresIdText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const featuresEn = planSpecForm.featuresEnText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      await tenantApi.updateSubscriptionPlanCatalog(editingPlanSpec.code, {
        name: planSpecForm.nameEn || planSpecForm.nameId,
        nameId: planSpecForm.nameId,
        nameEn: planSpecForm.nameEn,
        monthlyPrice: Number(planSpecForm.monthlyPrice),
        yearlyPrice: Number(planSpecForm.yearlyPrice),
        maxEmployees: Number(planSpecForm.maxEmployees),
        maxLocations: Number(planSpecForm.maxLocations),
        featuresId,
        featuresEn,
      });

      showToast(
        'success',
        t(
          'saas_plan_spec_updated',
          'Spesifikasi & harga paket pada tabel subscription_plans berhasil diperbarui.'
        )
      );
      setEditingPlanSpec(null);
      await fetchOverview();
    } catch (err) {
      showToast('error', err.message || 'Gagal memperbarui spesifikasi paket.');
    } finally {
      setIsSavingPlanSpec(false);
    }
  };

  const handleSaveSubscription = async (e) => {
    e.preventDefault();
    const targetId = editingTenant?.id || subForm.selectedTenantId;
    if (!targetId) return;

    setIsSavingSub(true);
    try {
      await tenantApi.updateSubscription(targetId, {
        subscriptionPlan: subForm.subscriptionPlan,
        subscriptionStatus: subForm.subscriptionStatus,
        billingCycle: subForm.billingCycle,
        maxEmployees: Number(subForm.maxEmployees),
        maxLocations: Number(subForm.maxLocations),
        subscriptionExpiresAt: subForm.subscriptionExpiresAt || null,
      });
      showToast('success', t('saas_sub_updated_toast', 'Paket langganan & kuota lisensi berhasil diperbarui.'));
      setEditingTenant(null);
      setSubForm((prev) => ({ ...prev, selectedTenantId: '' }));
      await fetchOverview();
    } catch (err) {
      showToast('error', err.message || t('saas_sub_update_err', 'Gagal memperbarui langganan tenant.'));
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleImpersonate = async (tenant) => {
    if (!tenant?.id) return;
    setImpersonatingId(tenant.id);
    try {
      await impersonateTenant(tenant.id);
      navigate(ROUTES.ADMIN.DASHBOARD);
    } catch (err) {
      showToast('error', err.message || t('saas_impersonate_err', 'Gagal masuk sebagai HR Admin tenant.'));
    } finally {
      setImpersonatingId(null);
    }
  };

  const filteredTenants = useMemo(() => {
    const list = overviewData?.tenants || [];
    return list.filter((item) => {
      const q = tenantSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        item.name?.toLowerCase().includes(q) ||
        item.code?.toLowerCase().includes(q) ||
        item.id?.toLowerCase().includes(q) ||
        item.industry?.toLowerCase().includes(q);
      const matchPlan = planFilter === 'all' || (item.subscriptionPlan || 'starter') === planFilter;
      const matchStatus = statusFilter === 'all' || (item.subscriptionStatus || 'active') === statusFilter;
      return matchSearch && matchPlan && matchStatus;
    });
  }, [overviewData, tenantSearch, planFilter, statusFilter]);

  const metrics = useMemo(() => {
    const raw = overviewData?.metrics || overviewData?.summary || {};
    const tenantsList = overviewData?.tenants || [];

    const totalTenants = raw.totalTenants ?? tenantsList.length;
    const activeTenants =
      raw.activeTenants ??
      tenantsList.filter((tItem) => {
        const st = (tItem.subscriptionStatus || 'active').toLowerCase();
        return st === 'active' || st === 'trial';
      }).length;
    const commercialTenants =
      raw.commercialTenants ??
      tenantsList.filter((tItem) => tItem.id !== 'TNT-ROOT-000001').length;
    const suspendedTenants = raw.suspendedTenants ?? Math.max(0, totalTenants - activeTenants);

    const totalActiveEmployees =
      raw.totalActiveEmployees ??
      raw.totalUsers ??
      tenantsList.reduce((sum, tItem) => sum + (Number(tItem.employeeCount) || 0), 0);

    const totalLocations =
      raw.totalLocations ??
      tenantsList.reduce((sum, tItem) => sum + (Number(tItem.locationCount) || 0), 0);

    const estimatedMrr =
      raw.estimatedMrr ??
      raw.estimatedMrrIdr ??
      tenantsList.reduce((sum, tItem) => sum + (Number(tItem.mrrContribution) || 0), 0);

    const estimatedArr = raw.estimatedArr ?? raw.estimatedArrIdr ?? estimatedMrr * 12;

    const todayAttendanceTotal =
      raw.todayAttendanceTotal ??
      raw.todayAttendances ??
      tenantsList.reduce((sum, tItem) => sum + (Number(tItem.todayAttendanceCount) || 0), 0);

    const todayPresentCount = raw.todayPresentCount ?? raw.todayPresent ?? 0;
    const todayLateCount = raw.todayLateCount ?? raw.todayLate ?? 0;

    return {
      ...raw,
      totalTenants,
      activeTenants,
      commercialTenants,
      suspendedTenants,
      totalActiveEmployees,
      totalLocations,
      estimatedMrr,
      estimatedArr,
      todayAttendanceTotal,
      todayPresentCount,
      todayLateCount,
    };
  }, [overviewData]);

  const systemHealth = overviewData?.systemHealth || {};
  const planDistribution = overviewData?.planDistribution || [];

  return (
    <div className="space-y-6">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-200'
              : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Executive Command Center Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 shadow-lg border border-white/10">
        <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-56 h-56 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-amber-300 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{t('saas_cmd_badge', 'SaaS Governance & Monetization Engine')}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {t('saas_cmd_title', 'Pusat Komando & Monetisasi Platform SaaS')}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {t(
                'saas_cmd_subtitle',
                'Pantau pendapatan berulang (MRR/ARR), utilisasi kuota lisensi multi-tenant, kesehatan infrastruktur, log audit keamanan, serta akses impersonasi HR Admin dalam satu panel terpadu.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                fetchOverview();
                if (activeTab === 'audit') fetchAuditLogs();
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/15 transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{t('common_refresh', 'Muat Ulang')}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(ROUTES.ADMIN.TENANTS)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <Building2 className="w-4 h-4" />
              <span>{t('saas_btn_manage_tenants', 'Kelola Direktori Tenant')}</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Executive KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: MRR & ARR */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('saas_kpi_mrr_title', 'Estimasi Pendapatan (MRR)')}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {formatIdr(metrics.estimatedMrr ?? metrics.estimatedMrrIdr ?? 0)}
              </h3>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                ARR: {formatIdr(metrics.estimatedArr ?? metrics.estimatedArrIdr ?? 0)} / {t('saas_year_short', 'thn')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 2: Active Tenants */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('saas_kpi_tenants_title', 'Organisasi Tenant Aktif')}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {metrics.activeTenants ?? 0}{' '}
                <span className="text-sm font-semibold text-slate-400">
                  / {metrics.totalTenants ?? 0}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {metrics.commercialTenants ?? 0} {t('saas_kpi_commercial_tenants', 'tenant klien komersial')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Building2 className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 3: Total Users & Locations */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('saas_kpi_users_title', 'Populasi Staf & Cabang')}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {metrics.totalActiveEmployees ?? metrics.totalUsers ?? 0}{' '}
                <span className="text-xs font-semibold text-slate-500">
                  {t('saas_staff_unit', 'Staf')}
                </span>
              </h3>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold mt-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {metrics.totalLocations ?? 0} {t('saas_branches_across_platform', 'titik cabang / geofence aktif')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 4: Today's Global Attendance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('saas_kpi_today_att_title', 'Trafik Presensi Hari Ini')}
              </p>
              <h3 className="text-2xl font-extrabold text-slate-900 dark:text-white mt-1">
                {metrics.todayAttendanceTotal ?? metrics.todayAttendances ?? 0}{' '}
                <span className="text-xs font-semibold text-slate-500">Log</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  {metrics.todayPresentCount ?? metrics.todayPresent ?? 0} {t('status_present', 'Tepat Waktu')}
                </span>{' '}
                •{' '}
                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                  {metrics.todayLateCount ?? metrics.todayLate ?? 0} {t('status_late', 'Terlambat')}
                </span>
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 5: Database & API Health */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('saas_kpi_health_title', 'Kesehatan Database & API')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                <h3 className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  {systemHealth.status === 'healthy'
                    ? t('saas_health_operational', 'Normal & Sehat')
                    : t('saas_health_degraded', 'Degradasi')}
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                DB Latency: <strong className="text-slate-700 dark:text-slate-200">{systemHealth.dbLatencyMs ?? 1} ms</strong> • RAM: {systemHealth.memory?.rssMb ?? systemHealth.memoryMb ?? 0} MB
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400">
              <Server className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* KPI 6: License Compliance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('saas_kpi_compliance_title', 'Status Lisensi & Isolasi')}
              </p>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
                {(metrics.suspendedTenants || 0) === 0
                  ? t('saas_all_licenses_compliant', '100% Lisensi Aktif')
                  : `${metrics.suspendedTenants} ${t('saas_suspended_count', 'Ditangguhkan')}`}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {t('saas_rb_isolation_active', 'Row-Level Tenant Isolation & Quota Gatekeeper Aktif')}
              </p>
            </div>
            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>{t('saas_tab_overview', 'Utilisasi Kuota & Lisensi Tenant')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('plans')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'plans'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <Crown className="w-4 h-4" />
          <span>{t('saas_tab_plans', 'Katalog Paket & Harga (Tiers)')}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'audit'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          <FileSearch className="w-4 h-4" />
          <span>{t('saas_tab_audit', 'Log Audit Keamanan (Security Logs)')}</span>
        </button>
      </div>

      {/* TAB 1: TENANT QUOTA UTILIZATION & IMPERSONATION */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Plan Distribution Mini Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {planDistribution.map((plan) => (
              <div
                key={plan.code}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      PLAN_BADGE_STYLES[plan.code] || PLAN_BADGE_STYLES.starter
                    }`}
                  >
                    {language === 'en' ? plan.nameEn : plan.nameId}
                  </span>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white mt-2">
                    {plan.count}{' '}
                    <span className="text-xs font-medium text-slate-500">Tenant</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {plan.monthlyPrice === 0
                      ? t('saas_price_free', 'Gratis')
                      : `${formatIdr(plan.monthlyPrice)} / ${t('saas_month_short', 'bln')}`}
                  </p>
                </div>
                <div className="text-right text-[11px] text-slate-500 dark:text-slate-400 space-y-1">
                  <div>Max {plan.maxEmployees} Staf</div>
                  <div>Max {plan.maxLocations} Cabang</div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder={t('saas_search_tenant_placeholder', 'Cari nama perusahaan, kode tenant, atau industri...')}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">{t('saas_filter_all_plans', 'Semua Paket Langganan')}</option>
                <option value="free">Free / Trial</option>
                <option value="starter">Starter</option>
                <option value="pro">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">{t('saas_filter_all_status', 'Semua Status Lisensi')}</option>
                <option value="active">{t('saas_status_active', 'Aktif')}</option>
                <option value="trial">{t('saas_status_trial', 'Masa Percobaan')}</option>
                <option value="past_due">{t('saas_status_past_due', 'Menunggu Pembayaran')}</option>
                <option value="suspended">{t('saas_status_suspended', 'Ditangguhkan')}</option>
                <option value="expired">{t('saas_status_expired', 'Kedaluwarsa')}</option>
              </select>
            </div>
          </div>

          {/* Tenant Quota & License Table */}
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">{t('saas_col_tenant', 'Organisasi Tenant')}</th>
                    <th className="py-3.5 px-4">{t('saas_col_plan', 'Paket & Siklus')}</th>
                    <th className="py-3.5 px-4">{t('saas_col_status', 'Status Lisensi')}</th>
                    <th className="py-3.5 px-4">{t('saas_col_emp_quota', 'Kuota Karyawan')}</th>
                    <th className="py-3.5 px-4">{t('saas_col_loc_quota', 'Kuota Cabang')}</th>
                    <th className="py-3.5 px-4 text-right">{t('saas_col_actions', 'Tindakan Cepat')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-400">
                        {t('saas_no_tenants_matched', 'Tidak ada data organisasi tenant yang sesuai filter.')}
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((item) => {
                      const planCode = (item.subscriptionPlan || 'starter').toLowerCase();
                      const statusCode = (item.subscriptionStatus || 'active').toLowerCase();
                      const empPct = Math.min(100, item.employeeQuotaPercent || 0);
                      const locPct = Math.min(100, item.locationQuotaPercent || 0);

                      return (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-extrabold flex items-center justify-center shrink-0 border border-blue-200/60 dark:border-blue-800/60">
                                {item.code?.slice(0, 3) || 'TNT'}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                                  <span>{item.name}</span>
                                  {item.id === 'TNT-ROOT-000001' && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold">
                                      ROOT
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  {item.id} • {item.industry || 'General'}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                                  PLAN_BADGE_STYLES[planCode] || PLAN_BADGE_STYLES.starter
                                }`}
                              >
                                {item.planDetails
                                  ? language === 'en'
                                    ? item.planDetails.nameEn
                                    : item.planDetails.nameId
                                  : planCode}
                              </span>
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {item.id_subscription_plan ||
                                  item.idSubscriptionPlan ||
                                  `PLAN-${planCode.toUpperCase()}`}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1">
                              {item.billingCycle === 'yearly'
                                ? t('saas_billing_yearly', 'Siklus Tahunan')
                                : t('saas_billing_monthly', 'Siklus Bulanan')}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                STATUS_BADGE_STYLES[statusCode] || STATUS_BADGE_STYLES.active
                              }`}
                            >
                              {getStatusLabel(statusCode)}
                            </span>
                            {item.subscriptionExpiresAt && (
                              <div className="text-[10px] text-slate-400 mt-1">
                                Exp: {String(item.subscriptionExpiresAt).slice(0, 10)}
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4 min-w-[150px]">
                            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                              <span>
                                {item.employeeCount} / {item.maxEmployees} {t('saas_staff_unit', 'Staf')}
                              </span>
                              <span
                                className={
                                  empPct >= 90
                                    ? 'text-rose-600 font-bold'
                                    : empPct >= 75
                                    ? 'text-amber-600 font-bold'
                                    : 'text-slate-400'
                                }
                              >
                                {empPct}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  empPct >= 90
                                    ? 'bg-rose-500'
                                    : empPct >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-blue-600'
                                }`}
                                style={{ width: `${empPct}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 min-w-[140px]">
                            <div className="flex items-center justify-between text-[11px] font-semibold mb-1">
                              <span>
                                {item.locationCount} / {item.maxLocations} {t('saas_branch_unit', 'Cabang')}
                              </span>
                              <span className="text-slate-400">{locPct}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  locPct >= 90 ? 'bg-rose-500' : 'bg-indigo-600'
                                }`}
                                style={{ width: `${locPct}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="inline-flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openSubscriptionModal(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[11px] transition-all cursor-pointer"
                                title={t('saas_btn_edit_license', 'Atur Paket & Kuota')}
                              >
                                <Sliders className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                                <span>{t('saas_btn_license', 'Lisensi')}</span>
                              </button>

                              <button
                                type="button"
                                disabled={impersonatingId === item.id}
                                onClick={() => handleImpersonate(item)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/70 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200/70 dark:border-indigo-800 font-bold text-[11px] transition-all cursor-pointer disabled:opacity-50"
                                title={t('saas_btn_impersonate_tooltip', 'Masuk sebagai HR Admin organisasi ini')}
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>
                                  {impersonatingId === item.id
                                    ? '...'
                                    : t('saas_btn_impersonate', 'Masuk HR')}
                                </span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SUBSCRIPTION PLANS & MONETIZATION TIERS */}
      {activeTab === 'plans' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {planDistribution.map((plan) => {
            const features = language === 'en' ? plan.featuresEn || [] : plan.featuresId || [];
            const isPopular = plan.code === 'pro';

            return (
              <div
                key={plan.code}
                className={`rounded-3xl p-6 bg-white dark:bg-slate-900 border flex flex-col justify-between shadow-xs relative ${
                  isPopular
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 right-5 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-xs">
                    {t('saas_most_popular', 'Paling Populer')}
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase border ${
                        PLAN_BADGE_STYLES[plan.code] || PLAN_BADGE_STYLES.starter
                      }`}
                    >
                      {language === 'en' ? plan.nameEn : plan.nameId}
                    </span>
                    <span className="text-xs font-bold text-slate-400">
                      {plan.count} Tenant
                    </span>
                  </div>

                  <div className="mt-4">
                    <div className="text-2xl font-extrabold text-slate-900 dark:text-white">
                      {plan.monthlyPrice === 0
                        ? t('saas_price_free', 'Gratis')
                        : formatIdr(plan.monthlyPrice)}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {plan.monthlyPrice === 0
                        ? t('saas_free_forever_sub', 'Untuk evaluasi & tim mikro')
                        : `${t('saas_per_month_or', 'per bulan, atau')} ${formatIdr(plan.yearlyPrice)} / ${t('saas_year_short', 'thn')}`}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">
                        {t('saas_max_staff', 'Maks Karyawan')}
                      </p>
                      <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                        {plan.maxEmployees} {t('saas_staff_unit', 'Staf')}
                      </p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">
                        {t('saas_max_branches', 'Maks Cabang')}
                      </p>
                      <p className="font-extrabold text-slate-800 dark:text-slate-100 mt-0.5">
                        {plan.maxLocations} {t('saas_branch_unit', 'Cabang')}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 space-y-2">
                  <button
                    type="button"
                    onClick={() => openEditPlanSpecModal(plan)}
                    className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                    <span>{t('saas_edit_plan_spec_btn', 'Edit Harga & Spesifikasi (DB)')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => openSubscriptionModal(null, plan.code)}
                    className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white font-bold text-xs transition-all cursor-pointer"
                  >
                    {t('saas_assign_plan_btn', 'Terapkan Paket ke Tenant')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 3: PLATFORM SECURITY AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                placeholder={t('saas_audit_search_placeholder', 'Cari aktor, aksi, target, atau deskripsi aktivitas...')}
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={auditCategory}
                onChange={(e) => setAuditCategory(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">{t('saas_audit_all_categories', 'Semua Kategori')}</option>
                <option value="tenant">Tenant Provisioning</option>
                <option value="subscription">Subscription & Quota</option>
                <option value="security">Impersonation & Security</option>
                <option value="authentication">Authentication</option>
                <option value="user_management">User Management</option>
                <option value="organization">Organization / Locations</option>
              </select>

              <select
                value={auditTenantId}
                onChange={(e) => setAuditTenantId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold"
              >
                <option value="all">{t('saas_audit_all_tenants', 'Semua Tenant')}</option>
                {(overviewData?.tenants || []).map((tItem) => (
                  <option key={tItem.id} value={tItem.id}>
                    {tItem.name} ({tItem.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3.5 px-4">{t('saas_audit_col_time', 'Waktu')}</th>
                    <th className="py-3.5 px-4">{t('saas_audit_col_actor', 'Aktor Pelaksana')}</th>
                    <th className="py-3.5 px-4">{t('saas_audit_col_action', 'Aksi & Kategori')}</th>
                    <th className="py-3.5 px-4">{t('saas_audit_col_tenant', 'Tenant Terkait')}</th>
                    <th className="py-3.5 px-4">{t('saas_audit_col_desc', 'Rincian Aktivitas')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {isAuditLoading ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        {t('common_loading', 'Memuat data...')}
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        {t('saas_audit_empty', 'Belum ada catatan log audit keamanan yang sesuai filter.')}
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-4 whitespace-nowrap text-slate-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800 dark:text-slate-100">
                            {log.actorName || 'System'}
                          </div>
                          <div className="text-[10px] uppercase font-bold text-indigo-600 dark:text-indigo-400">
                            {log.actorRole}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-mono text-[11px] font-bold">
                            {log.action}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5 uppercase">
                            {log.category}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-700 dark:text-slate-200">
                            {log.tenantName || log.tenantId || '-'}
                          </div>
                          {log.tenantCode && (
                            <div className="text-[10px] text-slate-400">{log.tenantCode}</div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 max-w-md">
                          {log.description}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MASTER SUBSCRIPTION PLAN CATALOG (TABLE `subscription_plans`) */}
      {editingPlanSpec && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {t('saas_modal_plan_spec_title', 'Edit Master Paket Subscription (Database)')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-mono">
                  hadirin.subscription_plans • code: <strong>{editingPlanSpec.code}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlanSpec(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePlanSpec} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('saas_plan_name_id', 'Nama Paket (Indonesia)')}
                  </label>
                  <input
                    type="text"
                    required
                    value={planSpecForm.nameId}
                    onChange={(e) => setPlanSpecForm((p) => ({ ...p, nameId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('saas_plan_name_en', 'Nama Paket (English)')}
                  </label>
                  <input
                    type="text"
                    required
                    value={planSpecForm.nameEn}
                    onChange={(e) => setPlanSpecForm((p) => ({ ...p, nameEn: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('saas_plan_monthly_price', 'Harga Bulanan (IDR)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={planSpecForm.monthlyPrice}
                    onChange={(e) =>
                      setPlanSpecForm((p) => ({ ...p, monthlyPrice: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('saas_plan_yearly_price', 'Harga Tahunan (IDR)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={planSpecForm.yearlyPrice}
                    onChange={(e) =>
                      setPlanSpecForm((p) => ({ ...p, yearlyPrice: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('saas_field_max_emp', 'Spesifikasi Maks Karyawan')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planSpecForm.maxEmployees}
                    onChange={(e) =>
                      setPlanSpecForm((p) => ({ ...p, maxEmployees: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('saas_field_max_loc', 'Spesifikasi Maks Cabang')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={planSpecForm.maxLocations}
                    onChange={(e) =>
                      setPlanSpecForm((p) => ({ ...p, maxLocations: e.target.value }))
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('saas_plan_features_id', 'Daftar Spesifikasi Fitur (Indonesia - 1 baris per fitur)')}
                </label>
                <textarea
                  rows={4}
                  value={planSpecForm.featuresIdText}
                  onChange={(e) =>
                    setPlanSpecForm((p) => ({ ...p, featuresIdText: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {t('saas_plan_features_en', 'Daftar Spesifikasi Fitur (English - 1 baris per fitur)')}
                </label>
                <textarea
                  rows={4}
                  value={planSpecForm.featuresEnText}
                  onChange={(e) =>
                    setPlanSpecForm((p) => ({ ...p, featuresEnText: e.target.value }))
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingPlanSpec(null)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50"
                >
                  {t('common_cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlanSpec}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSavingPlanSpec
                      ? t('common_saving', 'Menyimpan...')
                      : t('saas_btn_save_plan_spec', 'Simpan ke Database')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE TENANT SUBSCRIPTION & QUOTA */}
      {(editingTenant || subForm.selectedTenantId) && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
                  {t('saas_modal_sub_title', 'Konfigurasi Paket Langganan & Kuota Lisensi')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {editingTenant
                    ? `${editingTenant.name} (${editingTenant.code})`
                    : t('saas_modal_sub_pick_tenant', 'Pilih organisasi tenant untuk menerapkan paket')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTenant(null);
                  setSubForm((prev) => ({ ...prev, selectedTenantId: '' }));
                }}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSubscription} className="space-y-4 text-xs">
              {!editingTenant && (
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('saas_col_tenant', 'Organisasi Tenant')}
                  </label>
                  <select
                    value={subForm.selectedTenantId}
                    onChange={(e) => setSubForm((prev) => ({ ...prev, selectedTenantId: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                    required
                  >
                    {(overviewData?.tenants || []).map((tItem) => (
                      <option key={tItem.id} value={tItem.id}>
                        {tItem.name} ({tItem.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('saas_field_plan', 'Paket Berlangganan (Tier)')}
                  </label>
                  <select
                    value={subForm.subscriptionPlan}
                    onChange={(e) => handlePlanChangeInModal(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="free">Free / Trial</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('saas_field_status', 'Status Lisensi')}
                  </label>
                  <select
                    value={subForm.subscriptionStatus}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, subscriptionStatus: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="active">{t('saas_status_active', 'Aktif')}</option>
                    <option value="trial">{t('saas_status_trial', 'Masa Percobaan (Trial)')}</option>
                    <option value="past_due">{t('saas_status_past_due', 'Menunggu Pembayaran')}</option>
                    <option value="suspended">{t('saas_status_suspended', 'Ditangguhkan (Suspended)')}</option>
                    <option value="expired">{t('saas_status_expired', 'Kedaluwarsa (Expired)')}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('saas_field_max_emp', 'Batas Kuota Karyawan Aktif')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99999}
                    value={subForm.maxEmployees}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, maxEmployees: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('saas_field_max_loc', 'Batas Kuota Cabang / Lokasi')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={9999}
                    value={subForm.maxLocations}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, maxLocations: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-bold"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('saas_field_billing_cycle', 'Siklus Penagihan')}
                  </label>
                  <select
                    value={subForm.billingCycle}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, billingCycle: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  >
                    <option value="monthly">{t('saas_billing_monthly', 'Bulanan (Monthly)')}</option>
                    <option value="yearly">{t('saas_billing_yearly', 'Tahunan (Yearly)')}</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('saas_field_expires_at', 'Tanggal Berakhir Lisensi')}
                  </label>
                  <input
                    type="date"
                    value={subForm.subscriptionExpiresAt}
                    onChange={(e) =>
                      setSubForm((prev) => ({ ...prev, subscriptionExpiresAt: e.target.value }))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-semibold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setEditingTenant(null);
                    setSubForm((prev) => ({ ...prev, selectedTenantId: '' }));
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-50"
                >
                  {t('common_cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingSub}
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>
                    {isSavingSub
                      ? t('common_saving', 'Menyimpan...')
                      : t('saas_btn_save_subscription', 'Simpan Lisensi & Kuota')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

