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
  Sparkles,
  Shield,
  Briefcase,
  Calendar,
  Layers,
  UserCheck,
  Building2,
  ShieldCheck,
  Activity,
  Database,
  Inbox,
  FolderTree,
  MapPin,
  FileSpreadsheet,
  Repeat,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
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
  const { isHrAdmin, isLeader, isSuperAdmin, tenant, can } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  const isAdmin = isHrAdmin || isSuperAdmin;

  // HR Badges: items ready for HR review (excluding user's own request)
  const pendingLeaveCount = isAdmin
    ? (leaveRequests || []).filter(
        (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
      ).length
    : 0;

  const pendingOvertimeCount = isAdmin
    ? (overtimeRequests || []).filter(
        (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.leaderId)) && r.userId !== currentUser?.id
      ).length
    : 0;

  const pendingShiftSwitchCount = isAdmin
    ? (hrPendingSwitches || []).filter(
        (r) => (r.status === 'pending_hr' || (r.status === 'pending' && !r.userLeaderId)) && r.userId !== currentUser?.id
      ).length
    : 0;

  const pendingCorrectionCount = isAdmin
    ? (hrPendingCorrections || []).filter(
        (c) =>
          (c.status === 'pending_hr' || (c.status === 'pending_leader' && (!c.leaderId || c.leaderId === ''))) &&
          c.userId !== currentUser?.id
      ).length
    : 0;

  // Leader Badge: subordinates' requests strictly waiting for Leader review (excluding user's own request)
  const teamPendingCount = !isAdmin && isLeader
    ? (teamPendingLeaves || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length +
      (teamPendingSwitches || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length +
      (teamPendingOvertimes || []).filter((r) => r.userId !== currentUser?.id && (r.status === 'pending_leader' || r.status === 'pending')).length +
      (teamPendingCorrections || []).filter((r) => r.userId !== currentUser?.id && r.status === 'pending_leader').length
    : 0;

  // Sections configuration for Admin Portal
  const adminSections = [
    ...(isSuperAdmin
      ? [
          {
            id: 'saas_governance',
            title: t('section_saas_governance', 'Tata Kelola Platform SaaS'),
            icon: Shield,
            badgeText: t('badge_super_admin', 'Super Admin'),
            items: [
              {
                to: '/admin/saas-dashboard',
                label: t('nav_saas_dashboard', 'Command Center & Monetisasi'),
                icon: Sparkles,
                desc: t('sidebar_desc_saas_dashboard', 'Metrik MRR, kuota lisensi & audit log'),
              },
              {
                to: '/admin/tenants',
                label: t('nav_tenants', 'Manajemen Tenant (SaaS)'),
                icon: Building2,
                desc: t('sidebar_desc_tenants', 'Multi-organisasi & isolasi data'),
              },
            ],
          },
        ]
      : []),
    {
      id: 'master_data',
      title: t('section_master_data', 'Master Data Organisasi'),
      icon: Database,
      badgeText: t('badge_master', 'Master'),
      items: [
        {
          to: '/admin/departments',
          label: t('nav_departments', 'Departemen & Divisi'),
          icon: FolderTree,
          desc: t('sidebar_desc_departments', 'Struktur hierarki divisi'),
        },
        {
          to: '/admin/positions',
          label: t('nav_positions', 'Jabatan & Posisi'),
          icon: Briefcase,
          desc: t('sidebar_desc_positions', 'Struktur jabatan & level'),
        },
        {
          to: '/admin/locations',
          label: t('nav_locations', 'Cabang & Unit Usaha'),
          icon: MapPin,
          desc: t('sidebar_desc_locations', 'Multi cabang, unit bisnis & GPS'),
        },
        {
          to: '/admin/shifts',
          label: t('nav_shifts_master', 'Shift Kerja'),
          icon: Layers,
          desc: t('sidebar_desc_shifts', 'Shift reguler & ganti hari'),
        },
        {
          to: '/admin/holidays',
          label: t('nav_holidays', 'Kalender Libur'),
          icon: Calendar,
          desc: t('sidebar_desc_holidays', 'Libur nasional & perusahaan'),
        },
        {
          to: '/admin/leave-types',
          label: t('nav_leave_types', 'Kebijakan Cuti'),
          icon: FileSpreadsheet,
          desc: t('sidebar_desc_leave_types', 'Tipe & kuota hak cuti'),
        },
        {
          to: '/admin/employees',
          label: t('nav_employees', 'Karyawan & Staf'),
          icon: Users,
          desc: t('sidebar_desc_employees', 'Data shift & staf'),
        },
        ...(can('roles.view') || isHrAdmin || isSuperAdmin
          ? [
              {
                to: '/admin/roles',
                label: t('nav_roles_permissions', 'Peran & Hak Akses'),
                icon: ShieldCheck,
                desc: t('sidebar_desc_roles', 'Matriks izin & RBAC dinamis'),
              },
            ]
          : []),
      ],
    },
    {
      id: 'monitoring',
      title: t('section_monitoring', 'Pemantauan & Operasional'),
      icon: Activity,
      items: [
        {
          to: '/admin',
          label: t('nav_monitoring', 'Pemantauan Presensi'),
          icon: LayoutDashboard,
          desc: t('sidebar_desc_monitoring', 'Pemantauan absensi tim'),
          end: true,
        },
        {
          to: '/admin/reports',
          label: t('nav_reports', 'Laporan & Rekap Payroll'),
          icon: FileSpreadsheet,
          desc: t('sidebar_desc_reports', 'Rekap kehadiran bulanan & ekspor'),
        },
      ],
    },
    {
      id: 'approvals',
      title: t('section_approvals', 'Persetujuan & Verifikasi'),
      icon: Inbox,
      items: [
        {
          to: '/admin/approvals',
          label: t('nav_approvals', 'Pusat Persetujuan'),
          icon: CheckSquare,
          desc: t('sidebar_desc_approvals', 'Verifikasi cuti, lembur, shift & koreksi'),
          badge: pendingLeaveCount + pendingShiftSwitchCount + pendingOvertimeCount + pendingCorrectionCount,
        },
      ],
    },
    {
      id: 'settings',
      title: t('nav_company_settings', 'Pengaturan Perusahaan'),
      icon: Settings,
      items: [
        {
          to: '/admin/settings',
          label: t('nav_company_settings', 'Pengaturan Perusahaan'),
          icon: Settings,
          desc: t('sidebar_desc_company_settings', 'Profil, logo & preferensi tenant'),
        },
      ],
    },
  ];

  // Sections configuration for Employee Portal
  const employeeSections = [
    {
      id: 'daily_activity',
      title: t('section_daily_activity', 'Aktivitas Harian'),
      icon: Clock,
      items: [
        {
          to: '/employee',
          label: t('nav_dashboard', 'Dashboard Utama'),
          icon: LayoutDashboard,
          desc: t('sidebar_desc_emp_dash', 'Ringkasan & status'),
          end: true,
        },
        {
          to: '/employee/attendance',
          label: t('nav_attendance', 'Live Presensi'),
          icon: Clock,
          desc: t('sidebar_desc_emp_att', 'Clock-in & selfie'),
        },
        {
          to: '/employee/schedule',
          label: t('nav_schedule', 'Jadwal & Shift'),
          icon: Calendar,
          desc: t('sidebar_desc_emp_sched', 'Roster & shift mingguan'),
        },
      ],
    },
    {
      id: 'self_service',
      title: t('section_self_service', 'Pengajuan Mandiri (ESS)'),
      icon: FileText,
      items: [
        {
          to: '/employee/requests',
          label: t('nav_leave_requests', 'Pengajuan Mandiri'),
          icon: CalendarCheck,
          desc: t('sidebar_desc_emp_req', 'Cuti, tukar shift & koreksi presensi'),
        },
        {
          to: '/employee/overtime',
          label: t('nav_overtime', 'Pengajuan Lembur'),
          icon: Briefcase,
          desc: t('sidebar_desc_emp_ot', 'Form lembur (SPL)'),
        },
        {
          to: '/employee/history',
          label: t('nav_history', 'Riwayat Kehadiran'),
          icon: FileText,
          desc: t('sidebar_desc_emp_hist', 'Log bulanan & export'),
        },
      ],
    },
    ...(isLeader
      ? [
          {
            id: 'team_leadership',
            title: t('section_team_leadership', 'Wewenang & Tim Leader'),
            icon: UserCheck,
            items: [
              {
                to: '/leader/approvals',
                label: t('nav_team_approvals', 'Persetujuan Tim'),
                icon: UserCheck,
                desc: t('sidebar_desc_team_appr', 'Persetujuan cuti bawahan'),
                badge: teamPendingCount,
              },
            ],
          },
        ]
      : []),
  ];

  const sections = isAdmin ? adminSections : employeeSections;

  return (
    <aside className="hidden md:flex flex-col w-64 lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 min-h-[calc(100vh-4rem)] p-4 shrink-0 shadow-xs transition-colors duration-200">
      
      {/* Active Tenant / Role Banner */}
      <div className="mb-4 p-3 rounded-2xl bg-gradient-to-br from-slate-50 to-blue-50/40 dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
        <div className="flex items-center gap-2 mb-1">
          {isAdmin ? (
            <div className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              <Shield className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Users className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {isAdmin
                ? isSuperAdmin
                  ? t('nav_portal_super_admin', 'Portal Super Admin (SaaS)')
                  : t('nav_portal_admin')
                : isLeader
                ? t('nav_portal_leader')
                : t('nav_portal_employee')}
            </p>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
              {currentUser.department || 'Operasional'}
            </p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
          {tenant?.name || 'Ekosistem Hadirin SaaS'}
        </p>
      </div>

      {/* Grouped Navigation Sections */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-1">
        {sections.map((section, sIdx) => {
          const SectionIcon = section.icon;

          return (
            <div
              key={section.id}
              className={`space-y-1.5 ${sIdx > 0 ? 'pt-3 border-t border-slate-100 dark:border-slate-800/80' : ''}`}
            >
              {/* Section Header */}
              <div className="flex items-center justify-between px-3 py-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <SectionIcon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                    {section.title}
                  </span>
                </div>
                {section.badgeText && (
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {section.badgeText}
                  </span>
                )}
              </div>

              {/* Items in Section */}
              <div className="space-y-1">
                {section.items.map((link) => {
                  const Icon = link.icon;
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.end}
                      className={({ isActive }) =>
                        `w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-xs border border-blue-200/60 dark:border-blue-800/60'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`p-1.5 rounded-lg transition-colors shrink-0 ${
                                isActive
                                  ? 'bg-blue-600 text-white shadow-xs'
                                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                              }`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs leading-tight font-semibold truncate">{link.label}</p>
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 leading-tight truncate">
                                {link.desc}
                              </p>
                            </div>
                          </div>

                          {link.badge > 0 && (
                            <span className="ml-2 px-2 py-0.5 rounded-full bg-rose-500 text-white text-[11px] font-bold shadow-xs shrink-0">
                              {link.badge}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* System Architecture Card */}
      <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
        <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-950 via-slate-900 to-blue-900 text-white shadow-md relative overflow-hidden border border-white/10">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 w-20 h-20 bg-blue-500/20 rounded-full blur-xl"></div>
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span className="text-[11px] font-bold text-amber-200 uppercase tracking-wider">Multi-Tenant Core</span>
          </div>
          <p className="text-xs font-semibold text-white">REST API Connected</p>
          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
            {t('sidebar_banner_desc', 'Pola kerja shift 24/7 lintas hari & approval berjenjang aktif.')}
          </p>
          <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 border-t border-white/10 pt-2">
            <span>Model: {tenant?.code || 'SaaS'}</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Live Sync
            </span>
          </div>
        </div>
      </div>

    </aside>
  );
}
