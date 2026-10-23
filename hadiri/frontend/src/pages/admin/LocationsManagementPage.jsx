import React, { useState, useEffect, useMemo } from 'react';
import { locationApi } from '../../services/api/locationApi';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import {
  MapPin,
  Search,
  Plus,
  Edit2,
  Trash2,
  Users,
  Navigation,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
  Compass,
  Phone,
  Building2,
  UtensilsCrossed,
  Printer,
  ShoppingBag,
  Briefcase,
  Truck,
  Stethoscope,
  Factory,
  Sparkles,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

const BUSINESS_TYPE_PRESETS = [
  { value: 'Kantor Pusat / Korporat', labelKey: 'business_type_hq', color: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800' },
  { value: 'Food & Beverage (F&B / Resto & Kafe)', labelKey: 'business_type_fnb', color: 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  { value: 'Media & Percetakan', labelKey: 'business_type_media', color: 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800' },
  { value: 'Retail & Toko Baju', labelKey: 'business_type_retail', color: 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' },
  { value: 'Jasa & Teknologi Informasi', labelKey: 'business_type_services', color: 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
  { value: 'Logistik & Pergudangan', labelKey: 'business_type_logistics', color: 'bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800' },
  { value: 'Kesehatan & Klinik', labelKey: 'business_type_healthcare', color: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  { value: 'Pabrik & Manufaktur', labelKey: 'business_type_manufacturing', color: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700' },
  { value: 'Lainnya (Kustom)', labelKey: 'business_type_other', color: 'bg-pink-50 dark:bg-pink-950/60 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800' },
];

function getBusinessTypeBadge(type) {
  const match = BUSINESS_TYPE_PRESETS.find(
    (b) => b.value.toLowerCase() === type?.toLowerCase()
  );
  if (match) return match.color;
  return 'bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
}

function getBusinessTypeIcon(type = '') {
  const t = type.toLowerCase();
  if (t.includes('f&b') || t.includes('food') || t.includes('resto') || t.includes('kafe')) {
    return UtensilsCrossed;
  }
  if (t.includes('media') || t.includes('cetak') || t.includes('print')) {
    return Printer;
  }
  if (t.includes('baju') || t.includes('retail') || t.includes('butik') || t.includes('toko')) {
    return ShoppingBag;
  }
  if (t.includes('logistik') || t.includes('gudang')) {
    return Truck;
  }
  if (t.includes('klinik') || t.includes('sehat')) {
    return Stethoscope;
  }
  if (t.includes('pabrik') || t.includes('manufaktur')) {
    return Factory;
  }
  return Building2;
}

export default function LocationsManagementPage() {
  const { t } = useLanguage();
  const toast = useToast();

  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [locToDelete, setLocToDelete] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    businessTypePreset: 'Kantor Pusat / Korporat',
    customBusinessType: '',
    phone: '',
    address: '',
    latitude: '',
    longitude: '',
    radiusMeters: 100,
    isHeadquarters: false,
    isActive: true,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);

  const fetchLocations = async () => {
    try {
      setIsLoading(true);
      const data = await locationApi.getLocations();
      setLocations(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat daftar cabang.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLocations();
  }, []);

  const filteredLocations = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return locations;
    return locations.filter(
      (l) =>
        l.name?.toLowerCase().includes(q) ||
        l.code?.toLowerCase().includes(q) ||
        l.businessType?.toLowerCase().includes(q) ||
        l.address?.toLowerCase().includes(q) ||
        l.phone?.toLowerCase().includes(q)
    );
  }, [locations, search]);

  const stats = useMemo(() => {
    const total = locations.length;
    const hq = locations.filter((l) => l.isHeadquarters).length;
    const totalEmps = locations.reduce((acc, l) => acc + (l.employeeCount || 0), 0);
    const avgRadius =
      total > 0
        ? Math.round(
            locations.reduce((acc, l) => acc + (l.radiusMeters || 100), 0) / total
          )
        : 0;
    return { total, hq, totalEmps, avgRadius };
  }, [locations]);

  const handleOpenCreate = () => {
    setEditingLoc(null);
    const isFirst = locations.length === 0;
    setFormData({
      code: '',
      name: '',
      businessTypePreset: isFirst ? 'Kantor Pusat / Korporat' : 'Food & Beverage (F&B / Resto & Kafe)',
      customBusinessType: '',
      phone: '',
      address: '',
      latitude: '',
      longitude: '',
      radiusMeters: 100,
      isHeadquarters: isFirst,
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (loc) => {
    setEditingLoc(loc);
    const matchingPreset = BUSINESS_TYPE_PRESETS.find(
      (b) => b.value.toLowerCase() === loc.businessType?.toLowerCase()
    );

    setFormData({
      code: loc.code || '',
      name: loc.name || '',
      businessTypePreset: matchingPreset ? matchingPreset.value : 'Lainnya (Kustom)',
      customBusinessType: matchingPreset ? '' : (loc.businessType || ''),
      phone: loc.phone || '',
      address: loc.address || '',
      latitude: loc.latitude ?? '',
      longitude: loc.longitude ?? '',
      radiusMeters: loc.radiusMeters ?? 100,
      isHeadquarters: !!loc.isHeadquarters,
      isActive: loc.isActive !== undefined ? !!loc.isActive : true,
    });
    setIsModalOpen(true);
  };

  const handleGetCurrentGps = () => {
    if (!navigator.geolocation) {
      toast.error('Perangkat/browser Anda tidak mendukung geolokasi GPS.');
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        toast.success('Koordinat GPS berhasil diperoleh dari perangkat!');
        setIsGettingGps(false);
      },
      (err) => {
        toast.error(`Gagal mendapatkan GPS: ${err.message}`);
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Nama cabang / unit usaha wajib diisi.');
      return;
    }
    if (formData.latitude === '' || formData.longitude === '') {
      toast.error('Koordinat Latitude & Longitude wajib diisi.');
      return;
    }

    const finalBusinessType =
      formData.businessTypePreset === 'Lainnya (Kustom)'
        ? formData.customBusinessType?.trim() || 'Lainnya'
        : formData.businessTypePreset;

    const payload = {
      code: formData.code.trim() || undefined,
      name: formData.name.trim(),
      businessType: finalBusinessType,
      phone: formData.phone?.trim() || null,
      address: formData.address.trim(),
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      radiusMeters: parseInt(formData.radiusMeters, 10) || 100,
      isHeadquarters: formData.isHeadquarters,
      isActive: formData.isActive,
    };

    if (isNaN(payload.latitude) || isNaN(payload.longitude)) {
      toast.error('Format koordinat tidak valid.');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingLoc) {
        await locationApi.updateLocation(editingLoc.id, payload);
        toast.success(t('loc_updated_success', 'Cabang / unit usaha berhasil diperbarui.'));
      } else {
        await locationApi.createLocation(payload);
        toast.success(t('loc_created_success', 'Cabang / unit usaha baru berhasil ditambahkan.'));
      }
      setIsModalOpen(false);
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan cabang / unit usaha.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenDelete = (loc) => {
    setLocToDelete(loc);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!locToDelete) return;
    try {
      await locationApi.deleteLocation(locToDelete.id);
      toast.success(t('loc_deleted_success', `Cabang ${locToDelete.name} berhasil dinonaktifkan.`));
      setIsDeleteModalOpen(false);
      setLocToDelete(null);
      fetchLocations();
    } catch (err) {
      toast.error(err.message || 'Gagal menghapus cabang.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
              <MapPin className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {t('locations_title', 'Master Cabang & Unit Usaha')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t(
              'locations_desc',
              'Kelola kantor pusat, cabang, serta unit usaha dengan geolokasi dan radius presensi berbeda.'
            )}
          </p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 active:scale-95 transition shadow-sm shadow-emerald-500/20 text-sm"
        >
          <Plus className="w-4 h-4" />
          {t('add_location', 'Tambah Cabang / Unit Usaha')}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('total_locations', 'Total Cabang & Unit')}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.total}</p>
          <p className="text-[11px] text-slate-400 mt-1">Multi-lokasi & unit bisnis</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('hq_location', 'Kantor Pusat (HQ)')}
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.hq}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Pusat korporat tenant</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('registered_staff', 'Karyawan Terdaftar')}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            {stats.totalEmps}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Staf dalam penempatan cabang</p>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t('avg_radius', 'Rata-rata Radius')}
          </p>
          <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
            {stats.avgRadius} m
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Toleransi radius geofence</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t(
              'search_locations_placeholder',
              'Cari nama cabang, jenis usaha, kode, atau alamat...'
            )}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          />
        </div>
      </div>

      {/* Locations List */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('loading_tenants', 'Memuat data cabang & unit usaha...')}
            </p>
          </div>
        ) : filteredLocations.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-1">
              {search
                ? t('no_locations_found', 'Tidak ada cabang yang cocok')
                : t('no_locations_found', 'Belum Ada Cabang atau Unit Usaha')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-4">
              {search
                ? t('no_locations_desc', 'Coba gunakan kata kunci pencarian yang berbeda.')
                : t(
                    'no_locations_desc',
                    'Daftarkan cabang atau unit usaha (F&B, percetakan, retail, kantor) dengan titik GPS masing-masing.'
                  )}
            </p>
            {!search && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
              >
                <Plus className="w-4 h-4" />
                {t('btn_create_first_loc', 'Tambah Cabang Pertama')}
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-auto max-h-[600px]">
            <table className="w-full text-left border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-800 shadow-xs border-b border-slate-200/80 dark:border-slate-800">
                <tr className="border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_loc_name_code', 'Nama Cabang & Kode')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_business_type', 'Jenis Unit Usaha')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_loc_address', 'Alamat & Kontak')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_loc_coords', 'Koordinat GPS')}</th>
                  <th className="py-3 px-4 whitespace-nowrap">{t('col_loc_radius', 'Radius Geofence')}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">{t('staff', 'Karyawan')}</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">{t('col_action', 'Aksi')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredLocations.map((loc) => {
                  const TypeIcon = getBusinessTypeIcon(loc.businessType);
                  return (
                    <tr
                      key={loc.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-start gap-3">
                          <span
                            className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                              loc.isHeadquarters
                                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            <TypeIcon className="w-4 h-4" />
                          </span>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {loc.name}
                              </span>
                              {loc.isHeadquarters && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  {t('badge_hq', 'Kantor Pusat')}
                                </span>
                              )}
                            </div>
                            <span className="inline-block mt-0.5 text-xs font-mono font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {loc.code}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${getBusinessTypeBadge(
                            loc.businessType
                          )}`}
                        >
                          <TypeIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>{loc.businessType || 'Kantor Pusat'}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 max-w-xs text-xs whitespace-nowrap">
                        <div className="text-slate-600 dark:text-slate-300 truncate">
                          {loc.address || (
                            <span className="text-slate-400 italic">
                              Tidak ada alamat tertulis
                            </span>
                          )}
                        </div>
                        {loc.phone && (
                          <div className="flex items-center gap-1 mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{loc.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="text-xs font-mono text-slate-700 dark:text-slate-300">
                          {loc.latitude}, {loc.longitude}
                        </div>
                        <a
                          href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline mt-0.5"
                        >
                          {t('open_google_maps', 'Buka di Google Maps')}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
                          <Compass className="w-3.5 h-3.5" />
                          {loc.radiusMeters} meter
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Users className="w-3.5 h-3.5 text-slate-400" />
                          {loc.employeeCount || 0}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {loc.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            <CheckCircle2 className="w-3 h-3" />
                            {t('badge_active', 'Aktif')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                            <XCircle className="w-3 h-3" />
                            {t('badge_inactive', 'Nonaktif')}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEdit(loc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            title={t('btn_edit', 'Edit Cabang')}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDelete(loc)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                            title={t('btn_delete', 'Hapus Cabang')}
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

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {editingLoc
                      ? t('modal_edit_loc', 'Edit Cabang / Unit Usaha')
                      : t('modal_add_loc', 'Tambah Cabang / Unit Usaha Baru')}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {t(
                      'modal_loc_subtitle',
                      'Konfigurasi unit bisnis, telepon, dan koordinat geofencing presensi'
                    )}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden min-h-0">
              <div className="p-5 overflow-y-auto space-y-3.5 flex-1 text-xs">
                {/* Row 1: Nama Cabang & Kode */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-8">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('form_loc_name', 'Nama Cabang / Tempat Usaha')}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Misal: Kantor Pusat Sudirman, Kafe Blok M"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div className="sm:col-span-4">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('form_loc_code', 'Kode (Opsional)')}
                    </label>
                    <input
                      type="text"
                      placeholder="HQ / FNB-01"
                      value={formData.code}
                      onChange={(e) =>
                        setFormData({ ...formData, code: e.target.value.toUpperCase() })
                      }
                      className="w-full px-3 py-1.5 text-xs font-mono uppercase rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 2: Jenis Unit Usaha & Telepon */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('form_loc_business_type', 'Jenis Unit Usaha')}{' '}
                      <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formData.businessTypePreset}
                      onChange={(e) =>
                        setFormData({ ...formData, businessTypePreset: e.target.value })
                      }
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 cursor-pointer"
                    >
                      {BUSINESS_TYPE_PRESETS.map((preset) => (
                        <option key={preset.value} value={preset.value}>
                          {t(preset.labelKey, preset.value)}
                        </option>
                      ))}
                    </select>

                    {formData.businessTypePreset === 'Lainnya (Kustom)' && (
                      <input
                        type="text"
                        required
                        placeholder="Tuliskan jenis usaha kustom..."
                        value={formData.customBusinessType}
                        onChange={(e) =>
                          setFormData({ ...formData, customBusinessType: e.target.value })
                        }
                        className="w-full mt-2 px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    )}
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      {t('form_loc_phone', 'Nomor Telepon Cabang')}
                    </label>
                    <input
                      type="text"
                      placeholder="021-xxxxxx / 0812xxxx"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Row 3: Alamat Lengkap */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {t('form_loc_address', 'Alamat Lengkap Cabang')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Jl. Jend. Sudirman Kav. 52-53, Jakarta Selatan"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Row 4: Geofence & GPS Coordinates Card */}
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Navigation className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      {t('form_loc_coords_title', 'Titik Koordinat Presensi Cabang')}
                    </span>
                    <button
                      type="button"
                      onClick={handleGetCurrentGps}
                      disabled={isGettingGps}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-lg transition cursor-pointer"
                    >
                      {isGettingGps
                        ? t('btn_getting_gps', 'Mendeteksi...')
                        : t('btn_get_gps', 'Ambil GPS Saat Ini')}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Latitude *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="-6.2088"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">Longitude *</label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="106.8456"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-500 mb-0.5">
                        {t('form_loc_radius', 'Radius Geofence')} (m) *
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={5000}
                        required
                        value={formData.radiusMeters}
                        onChange={(e) => setFormData({ ...formData, radiusMeters: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 5: Settings Switches Side-by-Side */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {/* Headquarters Switch */}
                  <label className="flex items-start justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                    <div className="pr-2">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                        {t('form_loc_hq_toggle', 'Kantor Pusat (HQ)')}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                        {t('form_loc_hq_desc', 'Kantor pusat utama tenant')}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isHeadquarters}
                      onChange={(e) =>
                        setFormData({ ...formData, isHeadquarters: e.target.checked })
                      }
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 cursor-pointer"
                    />
                  </label>

                  {/* Active Status Switch */}
                  <label className="flex items-start justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition cursor-pointer">
                    <div className="pr-2">
                      <span className="text-[11px] font-bold text-slate-800 dark:text-slate-200 block">
                        {t('form_loc_status_toggle', 'Status Cabang Aktif')}
                      </span>
                      <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                        {t('form_loc_status_desc', 'Dapat dipilih untuk presensi')}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 mt-0.5 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              {/* Modal Footer (Sticky / Fixed) */}
              <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 shrink-0 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  {t('btn_cancel', 'Batal')}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition shadow-md shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting
                    ? t('btn_submitting', 'Menyimpan...')
                    : editingLoc
                    ? t('btn_save_changes', 'Simpan Perubahan')
                    : t('btn_create', 'Buat Cabang')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && locToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50">
                <AlertTriangle className="w-6 h-6" />
              </span>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t('confirm_delete_loc_title', 'Hapus Cabang / Unit Usaha?')}
              </h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              {t(
                'confirm_delete_loc_desc',
                'Apakah Anda yakin ingin menonaktifkan cabang {name} ({code})?',
                { name: locToDelete.name, code: locToDelete.code }
              )}
            </p>
            {locToDelete.employeeCount > 0 && (
              <div className="p-3 mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <Users className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  Perhatian: Ada <strong>{locToDelete.employeeCount} karyawan</strong> yang saat ini
                  ditugaskan ke cabang ini.
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
                {t('btn_confirm_delete_loc', 'Ya, Hapus Cabang')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
