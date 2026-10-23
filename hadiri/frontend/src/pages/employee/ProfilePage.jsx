import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useAttendance } from '../../context/AttendanceContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { userApi } from '../../services/api/userApi';
import {
  User,
  Mail,
  Shield,
  Briefcase,
  Clock,
  Network,
  Calendar,
  Key,
  Building2,
  Lock,
  Save,
  CheckCircle2,
  Eye,
  EyeOff,
  MapPin,
  Send,
} from 'lucide-react';

export default function ProfilePage() {
  const { user, tenant, refreshUser } = useAuth();
  const { activeShift } = useAttendance();
  const { t } = useLanguage();
  const toast = useToast();

  // Profile Form state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [telegramId, setTelegramId] = useState(user?.telegramId || user?.telegram_id || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (typeof refreshUser === 'function') {
      refreshUser().catch(console.warn);
    }
  }, []);

  useEffect(() => {
    if (user) {
      setProfileName(user.name || '');
      setAvatarUrl(user.avatar || '');
      setTelegramId(user.telegramId || user.telegram_id || '');
    }
  }, [user]);

  const getRoleBadge = (role) => {
    switch (role) {
      case 'hr_admin':
        return { label: 'Administrator & HR', bg: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800' };
      case 'leader':
        return { label: 'Team Leader / Supervisor', bg: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' };
      default:
        return { label: 'Karyawan (Staff ESS)', bg: 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.warning(t('name_required_msg', 'Nama lengkap wajib diisi.'), t('toast_details_required_title'));
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const cleanTg = telegramId.trim() || null;
      await userApi.updateMyProfile({
        name: profileName.trim(),
        avatar: avatarUrl.trim(),
        telegramId: cleanTg,
        telegram_id: cleanTg,
      });
      await refreshUser();
      toast.success(
        t('toast_profile_updated_desc', 'Profil Anda berhasil diperbarui.'),
        t('toast_profile_updated_title', 'Profil Diperbarui')
      );
    } catch (err) {
      toast.error(err.message || t('toast_generic_error', 'Gagal memperbarui profil.'), t('toast_error_title', 'Kesalahan'));
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.warning(t('password_empty_msg', 'Mohon isi kata sandi saat ini dan kata sandi baru.'), t('toast_details_required_title'));
      return;
    }

    if (newPassword.length < 6) {
      toast.warning(t('password_min_msg', 'Kata sandi baru minimal harus 6 karakter.'), t('toast_details_required_title'));
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.warning(t('password_mismatch_msg', 'Konfirmasi kata sandi baru tidak cocok.'), t('toast_details_required_title'));
      return;
    }

    setIsChangingPassword(true);
    try {
      await userApi.changePassword({ currentPassword, newPassword });
      toast.success(
        t('toast_password_changed_desc', 'Kata sandi berhasil diubah. Gunakan kata sandi baru untuk login selanjutnya.'),
        t('toast_password_changed_title', 'Kata Sandi Berhasil Diubah')
      );
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || t('toast_generic_error', 'Gagal mengubah kata sandi.'), t('toast_error_title', 'Kesalahan'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-6 sm:p-8 transition-colors">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 text-center sm:text-left">
          <div className="relative group">
            <img
              src={avatarUrl || user?.avatar}
              alt={user?.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border-4 border-white dark:border-slate-800 shadow-lg"
            />
            <span className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 flex items-center justify-center text-white" title="Aktif">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>

          <div className="flex-1 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  {user?.name}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {user?.position} • <span className="font-semibold text-slate-700 dark:text-slate-300">{user?.department}</span>
                </p>
              </div>

              <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full border ${roleInfo.bg} self-center sm:self-start`}>
                {roleInfo.label}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5 font-mono">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>{user?.id}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{user?.email}</span>
              </div>
              {(user?.telegramId || user?.telegram_id) && (
                <div className="flex items-center gap-1.5 font-mono text-sky-600 dark:text-sky-400 font-semibold">
                  <Send className="w-4 h-4 text-sky-500" />
                  <span>TG: {user.telegramId || user.telegram_id}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-slate-400" />
                <span>{tenant?.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-blue-500" />
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {user?.branch?.name || user?.locationName || t('main_office', 'Kantor Pusat')}
                </span>
                {user?.branch?.businessType && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 font-medium">
                    {user.branch.businessType}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Employment Details & Leave Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Left: Employment & Hierarchy */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('employment_info_title', 'Informasi Kepegawaian & Shift')}</span>
          </h3>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('company_label', 'Perusahaan')}</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{tenant?.name}</span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('branch_assignment_label', 'Cabang / Lokasi Penugasan')}</span>
              </span>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {user?.branch?.name || user?.locationName || t('main_office', 'Kantor Pusat')}
                  </span>
                  {user?.branch?.businessType && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 font-medium">
                      {user.branch.businessType}
                    </span>
                  )}
                </div>
                {user?.branch?.radiusMeters && (
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5">
                    Geofence: ≤ {user.branch.radiusMeters}m
                  </span>
                )}
              </div>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('shift_label', 'Pola Shift Kerja')}</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {activeShift?.name || user?.shiftId} ({activeShift?.startTime} - {activeShift?.endTime} WIB)
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Network className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('reports_to_leader', 'Atasan Langsung')}</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">
                {user?.leader?.name || (user?.leaderId ? user.leaderId : t('no_leader_assigned', 'Langsung ke HR'))}
              </span>
            </div>

            <div className="py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>{t('work_model_title', 'Model Kerja')}</span>
              </span>
              <span className="font-semibold text-slate-900 dark:text-white">{tenant?.workModel}</span>
            </div>
          </div>
        </div>

        {/* Right: Leave Balance Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('leave_balance_title', 'Hak & Saldo Cuti Karyawan')}</span>
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 text-center">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {t('quota_annual_short', 'Cuti Tahunan')}
              </span>
              <span className="text-xl font-black text-blue-600 dark:text-blue-400 mt-1 block">
                {user?.leaveBalance?.annualTotal ?? user?.leaveBalance?.annual ?? 12}
              </span>
              <span className="text-[10px] text-slate-400">{t('days_unit', 'Hari / Tahun')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 text-center">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {t('quota_sick_short', 'Izin Sakit')}
              </span>
              <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1 block">
                {user?.leaveBalance?.sickTotal ?? user?.leaveBalance?.sick ?? 14}
              </span>
              <span className="text-[10px] text-slate-400">{t('days_unit', 'Hari / Tahun')}</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 text-center">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                {t('quota_remaining_short', 'Sisa Kuota')}
              </span>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1 block">
                {user?.leaveBalance?.remainingAnnual ?? user?.leaveBalance?.annual?.remaining ?? 12}
              </span>
              <span className="text-[10px] text-slate-400">{t('days_unit', 'Hari Tersisa')}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pt-1">
            ℹ️ {t('leave_policy_note', 'Hak cuti tahunan terakumulasi per tahun kalender. Pengajuan cuti melalui ESS memerlukan persetujuan Leader dan pengesahan HR.')}
          </p>
        </div>

      </div>

      {/* Grid: Edit Profile Form & Change Password Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Form 1: Edit Profile */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('edit_profile_section_title', 'Perbarui Informasi Pribadi')}</span>
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('col_name', 'Nama Lengkap')}
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>{t('telegram_id_label', 'ID Telegram (telegram_id)')}</span>
              </label>
              <input
                type="text"
                value={telegramId}
                onChange={(e) => setTelegramId(e.target.value)}
                placeholder={t('telegram_id_placeholder', 'cth: 1234567890 atau @username')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs font-mono focus:ring-2 focus:ring-sky-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                🤖 {t('telegram_id_hint', 'Digunakan oleh AI Orchestration untuk mengenali pengaju otomatis saat chat pengajuan cuti/izin di grup Telegram.')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('avatar_url_label', 'URL Foto Profil / Avatar')}
              </label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isUpdatingProfile}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isUpdatingProfile ? t('saving_status', 'Menyimpan...') : t('save_changes_btn', 'Simpan Profil')}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Form 2: Change Password */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft p-6 space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>{t('change_password_section_title', 'Keamanan Akun & Ganti Kata Sandi')}</span>
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-3.5">
            {/* Current Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('current_password_label', 'Kata Sandi Saat Ini')}
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('new_password_label', 'Kata Sandi Baru (Min. 6 karakter)')}
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                {t('confirm_password_label', 'Konfirmasi Kata Sandi Baru')}
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/60 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isChangingPassword}
                className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Key className="w-4 h-4 text-amber-400" />
                <span>{isChangingPassword ? t('updating_status', 'Memproses...') : t('update_password_btn', 'Perbarui Kata Sandi')}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}

