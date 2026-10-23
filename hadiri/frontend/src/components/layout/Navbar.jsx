import React from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAttendance } from '../../context/AttendanceContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../context/LanguageContext';
import { useCurrentTime } from '../../hooks/useCurrentTime';
import {
  Users,
  ShieldCheck,
  Clock,
  Calendar,
  Sparkles,
  Bell,
  LogOut,
  CheckSquare,
  Building2,
  Sun,
  Moon,
  Globe,
} from 'lucide-react';

import { useToast } from '../../context/ToastContext';
import NotificationDropdown from './NotificationDropdown';

export default function Navbar() {
  const {
    currentUser,
    leaveRequests,
    overtimeRequests,
    teamPendingLeaves,
    teamPendingSwitches,
    teamPendingOvertimes,
    teamPendingCorrections,
    hrPendingSwitches,
    hrPendingCorrections,
  } = useAttendance();
  const { tenant, logout, isHrAdmin, isLeader, isSuperAdmin, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const { formattedTime, formattedDate } = useCurrentTime();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = isHrAdmin || isSuperAdmin;
  const isAdminRoute = location.pathname.startsWith('/admin');

  // Pending for HR: leaves + overtimes + switches + corrections waiting for HR (excluding own requests)
  const hrPendingCount = isAdmin
    ? (leaveRequests || []).filter(
        (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
      ).length +
      (overtimeRequests || []).filter(
        (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
      ).length +
      ((hrPendingSwitches && hrPendingSwitches.length > 0 ? hrPendingSwitches : teamPendingSwitches) || []).filter(
        (s) => s.status === 'pending_hr' && s.userId !== currentUser?.id
      ).length +
      (hrPendingCorrections || []).filter(
        (c) =>
          (c.status === 'pending_hr' || (c.status === 'pending_leader' && (!c.leaderId || c.leaderId === ''))) &&
          c.userId !== currentUser?.id
      ).length
    : 0;

  // Pending for Leader: subordinates' leaves + switches + overtimes + corrections waiting for leader (excluding own requests)
  const leaderPendingCount = !isAdmin && isLeader
    ? (teamPendingLeaves || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length +
      (teamPendingSwitches || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length +
      (teamPendingOvertimes || []).filter((r) => r.userId !== currentUser?.id && (r.status === 'pending_leader' || r.status === 'pending')).length +
      (teamPendingCorrections || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length
    : 0;

  const notificationCount = isAdmin ? hrPendingCount : isLeader ? leaderPendingCount : 0;

  const handleLogout = async () => {
    const confirmed = await toast.confirm({
      title: t('logout_title', 'Konfirmasi Keluar'),
      message: t('logout_confirm', 'Apakah Anda yakin ingin keluar dari sistem?'),
      confirmText: t('btn_logout', 'Keluar'),
      cancelText: t('btn_cancel', 'Batal'),
      variant: 'danger',
    });
    if (confirmed) {
      logout();
      toast.info(t('toast_logout_desc'), t('toast_logout_title'));
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full glass-nav border-b border-slate-200/80 dark:border-slate-800 shadow-xs transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left: Logo & Active Tenant Info */}
          <Link
            to={isSuperAdmin ? '/admin/tenants' : isHrAdmin ? '/admin' : '/employee'}
            className="flex items-center gap-3 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="font-extrabold text-lg tracking-tight">H</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">Hadirin</span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 border border-blue-200/60 dark:border-blue-700/60">
                  {tenant?.code || 'SaaS'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block truncate max-w-[260px]">
                {tenant?.name || 'Ekosistem Anak-Pintar'}
              </p>
            </div>
          </Link>

          {/* Center: Live Digital Clock & Date */}
          <div className="hidden md:flex items-center gap-4 bg-slate-100/90 dark:bg-slate-800/80 py-1.5 px-4 rounded-full border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium">
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="h-3 w-px bg-slate-300 dark:bg-slate-700"></div>
            <div className="flex items-center gap-1.5 font-mono text-slate-800 dark:text-slate-100 font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-pulse" />
              <span>{formattedTime} {t('clock_wib')}</span>
            </div>
          </div>

          {/* Right Section: Role Context, Language, Theme, Notifications, User Profile & Logout */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            
            {/* Quick Leader Approvals Link (if user is leader) */}
            {isLeader && (
              <Link
                to="/leader/approvals"
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all relative ${
                  location.pathname === '/leader/approvals'
                    ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                    : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/50'
                }`}
                title={t('nav_team_approvals')}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{t('nav_team_approvals')}</span>
                {leaderPendingCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                    {leaderPendingCount}
                  </span>
                )}
              </Link>
            )}

            {/* Language Switcher Button (ID / EN) */}
            <button
              type="button"
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
              title={t('switch_language')}
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span className="uppercase text-[11px]">{language}</span>
            </button>

            {/* Theme Toggle Button (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-amber-300 transition-colors"
              title={isDark ? t('theme_light') : t('theme_dark')}
            >
              {isDark ? (
                <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Interactive Notification Center */}
            <div className="relative hidden xs:block">
              <NotificationDropdown />
            </div>

            {/* AI Copilot Quick Launch Button */}
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('toggle-ai-copilot'))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer shrink-0"
              title="Hadirin AI Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-200 animate-pulse" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>

            {/* User Profile Mini Badge */}
            <Link
              to={isHrAdmin || isSuperAdmin ? '/admin/profile' : '/employee/profile'}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 hover:opacity-80 transition-opacity group"
              title={t('nav_profile', 'Profil & Pengaturan Akun')}
            >
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-9 h-9 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-xs group-hover:ring-2 group-hover:ring-blue-500 transition-all"
              />
              <div className="hidden lg:block text-left">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[120px] group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {currentUser.name}
                  </p>
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md ${
                      isSuperAdmin
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                        : isHrAdmin
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        : isLeader
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300'
                        : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {isSuperAdmin ? 'Super Admin' : isHrAdmin ? 'HR' : isLeader ? 'Leader' : 'Staff'}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-tight truncate max-w-[120px]">
                  {currentUser.position}
                </p>
              </div>
            </Link>

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-all"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>

          </div>

        </div>
      </div>
    </header>
  );
}
