import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAttendance } from '../../context/AttendanceContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  LayoutDashboard,
  Clock,
  CalendarCheck,
  FileText,
  Users,
  CheckSquare,
  Briefcase,
  Calendar,
  Layers,
  UserCheck
} from 'lucide-react';

export default function BottomNav() {
  const {
    leaveRequests,
    overtimeRequests,
    hrPendingSwitches,
    hrPendingCorrections,
    teamPendingLeaves,
    teamPendingSwitches,
    teamPendingOvertimes,
    teamPendingCorrections,
    currentUser,
  } = useAttendance();
  const { isHrAdmin, isLeader, isSuperAdmin } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const isAdmin = isHrAdmin || isSuperAdmin;
  const pendingShiftSwitchCount = (hrPendingSwitches || []).filter(
    (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.userLeaderId)) && r.userId !== currentUser?.id
  ).length;

  const totalAdminPending =
    (leaveRequests || []).filter(
      (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
    ).length +
    (overtimeRequests || []).filter(
      (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
    ).length +
    pendingShiftSwitchCount +
    (hrPendingCorrections || []).filter(
      (c) =>
        (c.status === 'pending_hr' || (c.status === 'pending_leader' && (!c.leaderId || c.leaderId === ''))) &&
        c.userId !== currentUser?.id
    ).length;

  const teamPendingCount = !isAdmin && isLeader
    ? (teamPendingLeaves || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length +
      (teamPendingSwitches || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length +
      (teamPendingOvertimes || []).filter((r) => r.userId !== currentUser?.id && (r.status === 'pending_leader' || r.status === 'pending')).length +
      (teamPendingCorrections || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length
    : 0;

  // Tabs Karyawan (ESS) / Leader
  const employeeTabs = [
    { to: '/employee', label: t('bnav_home'), icon: LayoutDashboard, end: true },
    { to: '/employee/attendance', label: t('bnav_attendance'), icon: Clock },
    isLeader
      ? { to: '/leader/approvals', label: t('bnav_team'), icon: UserCheck, badge: teamPendingCount }
      : { to: '/employee/schedule', label: t('bnav_schedule'), icon: Calendar },
    { to: '/employee/overtime', label: t('bnav_overtime'), icon: Briefcase },
    { to: '/employee/requests', label: t('bnav_requests', 'Pengajuan'), icon: CalendarCheck },
  ];

  // Tabs HR / Admin
  const adminTabs = [
    { to: '/admin', label: t('bnav_monitor'), icon: LayoutDashboard, end: true },
    { to: '/admin/approvals', label: t('bnav_approvals', 'Persetujuan'), icon: CheckSquare, badge: totalAdminPending },
    { to: '/admin/reports', label: t('bnav_reports', 'Laporan'), icon: FileText },
    { to: '/admin/shifts', label: t('bnav_shifts'), icon: Layers },
    { to: '/admin/employees', label: t('bnav_staff'), icon: Users },
  ];

  const currentTabs = isAdmin ? adminTabs : employeeTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden glass-nav border-t border-slate-200/80 dark:border-slate-800 shadow-lg pb-safe transition-colors duration-200">
      <div className="flex items-center justify-around px-2 py-1.5">
        {currentTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center flex-1 py-1 px-2 rounded-xl transition-all relative ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400 font-semibold scale-105'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon className={`w-5 h-5 transition-transform ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                    {tab.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight truncate max-w-[65px]">{tab.label}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 mt-0.5"></div>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
