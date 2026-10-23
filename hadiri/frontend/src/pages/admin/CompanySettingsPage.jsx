import React, { useState, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { tenantApi } from '../../services/api/tenantApi';
import {
  Building2,
  MapPin,
  Save,
  Compass,
  RefreshCw,
  Clock,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

export default function CompanySettingsPage() {
  const { t } = useLanguage();
  const toast = useToast();
  const { tenant, refreshUser } = useAuth();

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isFetchingGps, setIsFetchingGps] = useState(false);

  const [formData, setFormData] = useState(() => ({
    name: tenant?.name || '',
    tagline: tenant?.tagline || '',
    industry: tenant?.industry || 'Technology & Services',
    workModel: tenant?.workModel || tenant?.work_model || 'Corporate Standard (08:30 - 17:30)',
    timezoneLabel: tenant?.timezoneLabel || tenant?.timezone_label || 'WIB (UTC+7)',
    headquarters: {
      name: tenant?.headquarters?.name || tenant?.hq_name || 'Kantor Pusat',
      address: tenant?.headquarters?.address || tenant?.hq_address || '',
      latitude: tenant?.headquarters?.latitude ?? tenant?.hq_latitude ?? -6.2088,
      longitude: tenant?.headquarters?.longitude ?? tenant?.hq_longitude ?? 106.8456,
      radiusMeters: tenant?.headquarters?.radiusMeters ?? tenant?.hq_radius_meters ?? 100,
    },
  }));

  // Sync if tenant context updates
  useEffect(() => {
    if (tenant) {
      setFormData((prev) => ({
        ...prev,
        name: prev.name || tenant.name || '',
        tagline: prev.tagline || tenant.tagline || '',
        industry: prev.industry !== 'Technology & Services' ? prev.industry : (tenant.industry || 'Technology & Services'),
        workModel: prev.workModel !== 'Corporate Standard (08:30 - 17:30)' ? prev.workModel : (tenant.workModel || tenant.work_model || 'Corporate Standard (08:30 - 17:30)'),
        timezoneLabel: prev.timezoneLabel !== 'WIB (UTC+7)' ? prev.timezoneLabel : (tenant.timezoneLabel || tenant.timezone_label || 'WIB (UTC+7)'),
        headquarters: {
          name: prev.headquarters.name !== 'Kantor Pusat' ? prev.headquarters.name : (tenant.headquarters?.name || tenant.hq_name || 'Kantor Pusat'),
          address: prev.headquarters.address || tenant.headquarters?.address || tenant.hq_address || '',
          latitude: tenant.headquarters?.latitude ?? tenant.hq_latitude ?? prev.headquarters.latitude,
          longitude: tenant.headquarters?.longitude ?? tenant.hq_longitude ?? prev.headquarters.longitude,
          radiusMeters: tenant.headquarters?.radiusMeters ?? tenant.hq_radius_meters ?? prev.headquarters.radiusMeters,
        },
      }));
    }
  }, [tenant]);

  // Load latest tenant details from backend
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    tenantApi
      .getCurrentTenant()
      .then((res) => {
        if (!isMounted) return;
        const data = res?.data !== undefined ? res.data : res;
        if (data && typeof data === 'object') {
          setFormData({
            name: data.name || '',
            tagline: data.tagline || '',
            industry: data.industry || 'Technology & Services',
            workModel: data.workModel || data.work_model || 'Corporate Standard (08:30 - 17:30)',
            timezoneLabel: data.timezoneLabel || data.timezone_label || 'WIB (UTC+7)',
            headquarters: {
              name: data.headquarters?.name || data.hq_name || 'Kantor Pusat',
              address: data.headquarters?.address || data.hq_address || '',
              latitude: data.headquarters?.latitude ?? data.hq_latitude ?? -6.2088,
              longitude: data.headquarters?.longitude ?? data.hq_longitude ?? 106.8456,
              radiusMeters: data.headquarters?.radiusMeters ?? data.hq_radius_meters ?? 100,
            },
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to load current tenant:', err);
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Current Device GPS for HQ
  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      toast.warning('Browser tidak mendukung pendeteksian GPS.');
      return;
    }
    setIsFetchingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          headquarters: {
            ...prev.headquarters,
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6)),
          },
        }));
        toast.success('Koordinat GPS berhasil disematkan dari perangkat!');
        setIsFetchingGps(false);
      },
      (err) => {
        setIsFetchingGps(false);
        toast.error(err.message || 'Gagal membaca GPS perangkat.');
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.warning('Nama perusahaan wajib diisi.');
      return;
    }

    try {
      setIsSaving(true);
      await tenantApi.updateCurrentTenant(formData);
      if (refreshUser) {
        await refreshUser();
      }
      toast.success(t('settings_saved_success', 'Profil perusahaan berhasil diperbarui!'));
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan pengaturan perusahaan.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500 mb-2" />
        <p className="text-xs text-slate-400">Memuat profil perusahaan...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
          <Building2 className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {t('settings_title')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {t('settings_subtitle')}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Section 1: Profil Organisasi */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-soft space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Identitas & Karakteristik Organisasi
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Company Name */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('company_name')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Contoh: PT Anak Pintar Solusindo"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Tagline */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('company_tagline')}
              </label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                placeholder="Contoh: AI-Powered Enterprise Solutions & Ecosystem"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Industry */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('company_industry')}
              </label>
              <select
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Technology & Services">Teknologi & Layanan Digital</option>
                <option value="Food & Beverage (F&B)">Food & Beverage (Resto & Kuliner)</option>
                <option value="Retail & Fashion">Retail, Toko & Fashion</option>
                <option value="Media & Percetakan">Media, Kreatif & Percetakan</option>
                <option value="Manufacturing & Logistik">Manufaktur & Logistik</option>
                <option value="Healthcare & Farmasi">Kesehatan & Farmasi</option>
                <option value="Pendidikan & Yayasan">Pendidikan & Yayasan</option>
                <option value="Konsultan & Korporat">Konsultan & Korporat</option>
              </select>
            </div>

            {/* Work Model */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('company_work_model')}
              </label>
              <select
                value={formData.workModel}
                onChange={(e) => setFormData({ ...formData, workModel: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="Corporate Standard (08:30 - 17:30)">Reguler Non-Shift (08:30 - 17:30)</option>
                <option value="3-Shift 24/7 Operations">Operasional 3-Shift 24 Jam</option>
                <option value="Flexible Remote / Hybrid">Hybrid / Fleksibel WFH & WFO</option>
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('company_timezone')}
              </label>
              <select
                value={formData.timezoneLabel}
                onChange={(e) => setFormData({ ...formData, timezoneLabel: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="WIB (UTC+7)">WIB (Waktu Indonesia Barat - UTC+7)</option>
                <option value="WITA (UTC+8)">WITA (Waktu Indonesia Tengah - UTC+8)</option>
                <option value="WIT (UTC+9)">WIT (Waktu Indonesia Timur - UTC+9)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Kantor Pusat & Geofence Default */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-soft space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                {t('hq_section_title')}
              </h3>
            </div>
            
            <button
              type="button"
              onClick={handleGetCurrentGps}
              disabled={isFetchingGps}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition-colors"
            >
              <Compass className={`w-3.5 h-3.5 ${isFetchingGps ? 'animate-spin' : ''}`} />
              <span>{isFetchingGps ? 'Mencari...' : 'Ambil GPS Saat Ini'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* HQ Name */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('hq_name')}
              </label>
              <input
                type="text"
                value={formData.headquarters.name}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    headquarters: { ...formData.headquarters, name: e.target.value },
                  })
                }
                placeholder="Contoh: Gedung Hadirin Tower Lt. 18"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Default Radius */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('hq_radius')}
              </label>
              <input
                type="number"
                min="10"
                max="5000"
                value={formData.headquarters.radiusMeters}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    headquarters: {
                      ...formData.headquarters,
                      radiusMeters: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* HQ Address */}
            <div className="md:col-span-2">
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('hq_address')}
              </label>
              <textarea
                rows={2}
                value={formData.headquarters.address}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    headquarters: { ...formData.headquarters, address: e.target.value },
                  })
                }
                placeholder="Alamat jalan lengkap kantor pusat..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* Latitude */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('hq_latitude')}
              </label>
              <input
                type="number"
                step="any"
                value={formData.headquarters.latitude}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    headquarters: {
                      ...formData.headquarters,
                      latitude: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Longitude */}
            <div>
              <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                {t('hq_longitude')}
              </label>
              <input
                type="number"
                step="any"
                value={formData.headquarters.longitude}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    headquarters: {
                      ...formData.headquarters,
                      longitude: Number(e.target.value),
                    },
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>{isSaving ? 'Menyimpan...' : t('btn_save_settings')}</span>
          </button>
        </div>

      </form>

    </div>
  );
}
