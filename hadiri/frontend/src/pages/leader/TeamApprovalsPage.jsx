import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAttendance } from '../../context/AttendanceContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useToast } from '../../context/ToastContext';
import { LeaveDetailModal } from '../../features/leave';
import { AttendanceCorrectionDetailModal } from '../../features/attendance';
import {
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  User,
  AlertCircle,
  ShieldCheck,
  CheckSquare,
  Eye,
  ArrowRight,
  Layers,
  RefreshCw,
  Briefcase,
  Coins,
  FileEdit,
} from 'lucide-react';

export default function TeamApprovalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'leaves';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [selectedCorrection, setSelectedCorrection] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [leaveFilter, setLeaveFilter] = useState('all'); // 'all' | 'pending_leader' | 'pending_hr' | 'approved' | 'rejected'
  const [switchFilter, setSwitchFilter] = useState('all'); // 'all' | 'pending_leader' | 'pending_hr' | 'approved' | 'rejected'
  const [overtimeFilter, setOvertimeFilter] = useState('all'); // 'all' | 'pending_leader' | 'pending_hr' | 'approved' | 'rejected'
  const [correctionFilter, setCorrectionFilter] = useState('all'); // 'all' | 'pending_leader' | 'pending_hr' | 'approved' | 'rejected'

  const {
    teamPendingLeaves,
    teamPendingSwitches,
    teamPendingOvertimes,
    teamPendingCorrections,
    leaderApproveLeave,
    leaderRejectLeave,
    leaderReviewShiftSwitch,
    leaderApproveOvertime,
    leaderRejectOvertime,
    leaderActionCorrection,
    fetchTeamPendingLeaves,
    fetchTeamPendingSwitches,
    fetchTeamPendingOvertimes,
    fetchTeamPendingCorrections,
  } = useAttendance();
  const { user } = useAuth();
  const { t, language, getDayName } = useLanguage();
  const toast = useToast();

  useEffect(() => {
    fetchTeamPendingLeaves({ force: true });
    fetchTeamPendingSwitches({ force: true });
    fetchTeamPendingOvertimes({ force: true });
    fetchTeamPendingCorrections({ force: true });
  }, [
    fetchTeamPendingLeaves,
    fetchTeamPendingSwitches,
    fetchTeamPendingOvertimes,
    fetchTeamPendingCorrections,
  ]);

  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['leaves', 'switches', 'overtimes', 'corrections'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setSearchParams({ tab: tabKey });
  };

  // Double check defense-in-depth: Ensure displayed data strictly belongs to leader's subordinates & Anti Self-Approval
  const displayedLeaves = (teamPendingLeaves || []).filter((req) => {
    if (req.userId === user?.id) return false; // Anti self-approval
    if (user?.role === 'leader') {
      return !req.leaderId || req.leaderId === user?.id;
    }
    return true;
  });

  const displayedSwitches = (teamPendingSwitches || []).filter((sw) => {
    if (sw.userId === user?.id) return false; // Anti self-approval
    if (user?.role === 'leader') {
      return !sw.userLeaderId || sw.userLeaderId === user?.id;
    }
    return true;
  });

  const displayedOvertimes = (teamPendingOvertimes || []).filter((ot) => {
    if (ot.userId === user?.id) return false; // Anti self-approval
    return true;
  });

  const displayedCorrections = (teamPendingCorrections || []).filter((item) => {
    if (item.userId === user?.id) return false; // Anti self-approval
    return true;
  });

  const pendingLeaderLeavesCount = displayedLeaves.filter(
    (l) => l.status === 'pending_leader'
  ).length;

  const pendingLeaderSwitchesCount = displayedSwitches.filter(
    (s) => s.status === 'pending_leader'
  ).length;

  const pendingLeaderOvertimesCount = displayedOvertimes.filter(
    (o) => o.status === 'pending_leader' || o.status === 'pending'
  ).length;

  const pendingLeaderCorrectionCount = displayedCorrections.filter(
    (c) => c.status === 'pending_leader'
  ).length;

  // Auto-switch to next active tab if current tab has no pending and no explicit query param
  useEffect(() => {
    if (!searchParams.get('tab') && pendingLeaderLeavesCount === 0) {
      if (pendingLeaderSwitchesCount > 0) {
        setActiveTab('switches');
      } else if (pendingLeaderOvertimesCount > 0) {
        setActiveTab('overtimes');
      } else if (pendingLeaderCorrectionCount > 0) {
        setActiveTab('corrections');
      }
    }
  }, [
    pendingLeaderLeavesCount,
    pendingLeaderSwitchesCount,
    pendingLeaderOvertimesCount,
    pendingLeaderCorrectionCount,
    searchParams,
  ]);

  const totalPending =
    pendingLeaderLeavesCount +
    pendingLeaderSwitchesCount +
    pendingLeaderOvertimesCount +
    pendingLeaderCorrectionCount;

  const handleApproveLeave = async (id, notes = 'Disetujui oleh Leader/Atasan Langsung') => {
    setIsProcessing(true);
    try {
      await leaderApproveLeave(id, notes);
      toast.success('Permohonan cuti bawahan berhasil disetujui');
    } catch {
      // Handled inside leaderApproveLeave
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectLeave = async (id, reason = 'Kebutuhan mendesak operasional tim') => {
    setIsProcessing(true);
    try {
      await leaderRejectLeave(id, reason);
      toast.info('Permohonan cuti bawahan telah ditolak');
    } catch {
      // Handled inside leaderRejectLeave
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveSwitch = async (id) => {
    const confirmed = await toast.confirm({
      title: 'Persetujuan Tukar Shift (Tahap 1)',
      message: 'Setujui permohonan tukar shift ini dan teruskan ke HR Administrator untuk pengesahan final?',
      confirmText: 'Setujui & Teruskan ke HR',
      cancelText: 'Batal',
      variant: 'success',
    });
    if (!confirmed) return;
    setIsProcessing(true);
    try {
      await leaderReviewShiftSwitch(id, 'approved');
      toast.success('Permohonan tukar shift berhasil disetujui');
    } catch {
      // Handled inside
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectSwitch = async (id) => {
    const reason = await toast.prompt({
      title: 'Tolak Permohonan Tukar Shift',
      message: 'Masukkan alasan penolakan permohonan tukar shift:',
      defaultValue: 'Kebutuhan mendesak operasional tim',
      confirmText: 'Tolak Permohonan',
      variant: 'danger',
    });
    if (reason === null) return;
    setIsProcessing(true);
    try {
      await leaderReviewShiftSwitch(id, 'rejected', reason.trim() || 'Ditolak oleh Leader');
      toast.info('Permohonan tukar shift telah ditolak');
    } catch {
      // Handled inside
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveOvertime = async (id) => {
    const confirmed = await toast.confirm({
      title: 'Persetujuan Lembur Tim (Tahap 1)',
      message: 'Setujui pengajuan lembur ini dan teruskan ke HR Administrator untuk persetujuan final?',
      confirmText: 'Setujui & Teruskan ke HR',
      cancelText: 'Batal',
      variant: 'success',
    });
    if (!confirmed) return;
    setIsProcessing(true);
    try {
      await leaderApproveOvertime(id);
    } catch {
      // Handled inside
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectOvertime = async (id) => {
    const reason = await toast.prompt({
      title: 'Tolak Pengajuan Lembur',
      message: 'Masukkan alasan penolakan pengajuan lembur:',
      defaultValue: 'Kebutuhan mendesak operasional tim',
      confirmText: 'Tolak Permohonan',
      variant: 'danger',
    });
    if (reason === null) return;
    setIsProcessing(true);
    try {
      await leaderRejectOvertime(id, reason.trim() || 'Ditolak oleh Leader');
    } catch {
      // Handled inside
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveCorrection = async (id) => {
    const notes = await toast.prompt({
      title: t('corr_approve_leader_title', 'Setujui Koreksi Presensi (Tahap 1)'),
      message: t('corr_approve_leader_prompt', 'Catatan persetujuan leader (opsional):'),
      defaultValue: t('corr_approve_default_notes', 'Disetujui oleh Leader/Atasan Langsung'),
      confirmText: t('btn_approve_and_forward', 'Setujui & Teruskan ke HR'),
      variant: 'success',
    });
    if (notes === null) return;
    setIsProcessing(true);
    try {
      await leaderActionCorrection(id, {
        action: 'approve',
        notes: notes.trim() || undefined,
      });
    } catch {
      // Handled inside
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRejectCorrection = async (id) => {
    const reason = await toast.prompt({
      title: t('corr_reject_leader_title', 'Tolak Koreksi Presensi'),
      message: t('corr_reject_leader_prompt', 'Masukkan alasan penolakan koreksi presensi:'),
      defaultValue: t('corr_reject_default_reason', 'Alasan/bukti kehadiran belum mencukupi'),
      confirmText: t('btn_reject', 'Tolak Pengajuan'),
      variant: 'danger',
    });
    if (reason === null) return;
    setIsProcessing(true);
    try {
      await leaderActionCorrection(id, {
        action: 'reject',
        rejectReason: reason.trim() || 'Ditolak oleh Leader',
      });
    } catch {
      // Handled inside
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2.5 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
              {t('leader_stage1_center', 'Pusat Persetujuan Tim (Leader Portal)')}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
              • {t('leader_team_of', 'Koordinator Tim:')} {user?.name}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mt-1">
            {t('leader_page_title', 'Persetujuan & Verifikasi Tim')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('leader_page_subtitle', 'Tinjau permohonan cuti, izin, lembur, serta penyesuaian jadwal tukar shift bawahan langsung Anda')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              fetchTeamPendingLeaves({ force: true });
              fetchTeamPendingSwitches({ force: true });
              fetchTeamPendingOvertimes({ force: true });
              fetchTeamPendingCorrections({ force: true });
            }}
            className="p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <div className="bg-indigo-50 dark:bg-indigo-950/50 px-4 py-2 rounded-2xl border border-indigo-200/80 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200">
            <span className="text-[10px] uppercase font-bold text-indigo-700 dark:text-indigo-300 block tracking-wider">
              {t('leader_pending_count', 'Total Menunggu Persetujuan')}
            </span>
            <span className="text-lg font-extrabold font-mono">
              {totalPending} {t('ot_stat_requests_count', 'Pengajuan')}
            </span>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => handleTabChange('leaves')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'leaves'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <CheckSquare className="w-4 h-4" />
          <span>{t('tab_leave_approvals', 'Persetujuan Cuti & Izin')}</span>
          {pendingLeaderLeavesCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'leaves'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {pendingLeaderLeavesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('switches')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'switches'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('tab_shift_switch_approvals', 'Persetujuan Tukar Shift')}</span>
          {pendingLeaderSwitchesCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'switches'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {pendingLeaderSwitchesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('overtimes')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'overtimes'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Briefcase className="w-4 h-4" />
          <span>{t('tab_overtime_approvals', 'Persetujuan Lembur (SPL)')}</span>
          {pendingLeaderOvertimesCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'overtimes'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {pendingLeaderOvertimesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => handleTabChange('corrections')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            activeTab === 'corrections'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileEdit className="w-4 h-4" />
          <span>{t('tab_correction_approvals', 'Koreksi Presensi')}</span>
          {pendingLeaderCorrectionCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'corrections'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
              }`}
            >
              {pendingLeaderCorrectionCount}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-soft overflow-hidden transition-colors">
        
        {/* === TAB 1: PERMOHONAN CUTI === */}
        {activeTab === 'leaves' && (
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('leader_leave_list_title', 'Daftar Pengajuan Cuti & Izin Tim')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('leader_leave_list_subtitle', 'Verifikasi tahap 1 serta riwayat persetujuan cuti bawahan langsung Anda')}
                </p>
              </div>

              {/* Filter Pills Toolbar */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setLeaveFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    leaveFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('filter_all', 'Semua')} ({displayedLeaves.length})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('pending_leader')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    leaveFilter === 'pending_leader'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_needs_review', 'Menunggu Review')} ({pendingLeaderLeavesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('pending_hr')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    leaveFilter === 'pending_hr'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_forwarded_hr', 'Diteruskan ke HR')} (
                  {displayedLeaves.filter((l) => l.status === 'pending_hr').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    leaveFilter === 'approved'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_endorsed_hr', 'Disahkan Final HR')} (
                  {displayedLeaves.filter((l) => l.status === 'approved').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setLeaveFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    leaveFilter === 'rejected'
                      ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('tab_rejected', 'Ditolak')} (
                  {displayedLeaves.filter((l) => l.status === 'rejected').length}
                  )
                </button>
              </div>
            </div>

            {(() => {
              const filteredLeaves = displayedLeaves.filter((req) => {
                if (leaveFilter === 'all') return true;
                return req.status === leaveFilter;
              });

              if (filteredLeaves.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                    <CheckSquare className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {leaveFilter === 'pending_leader'
                        ? t('no_leader_pending', 'Tidak Ada Permohonan Cuti Menunggu')
                        : t('no_leave_matching_filter', 'Tidak ada riwayat permohonan cuti yang sesuai filter')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {leaveFilter === 'pending_leader'
                        ? t('no_team_leave_pending', 'Semua permohonan cuti bawahan Anda telah diproses.')
                        : ''}
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLeaves.map((req) => {
                    const isPendingAction = req.status === 'pending_leader';
                    const isForwardedToHr = req.status === 'pending_hr';
                    const isFullyApproved = req.status === 'approved';
                    const isRejectedStatus = req.status === 'rejected';

                    return (
                      <div key={req.id} className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          
                          {/* Left: Info */}
                          <div className="flex items-start gap-3.5 flex-1">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-2xs mt-0.5">
                              {req.avatar ? (
                                <img src={req.avatar} alt={req.userName} className="w-full h-full rounded-2xl object-cover" />
                              ) : (
                                <span className="text-xs">{(req.userName || 'K').slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>

                            <div className="space-y-1 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  {t('applicant', 'Pemohon')}:
                                </span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{req.userName}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">• {req.position}</span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  {req.typeLabel} ({req.totalDays} {t('days', 'Hari')})
                                </span>
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <span>{t('remaining_quota', 'Sisa Cuti')}:</span>
                                  <strong className="font-extrabold font-mono">
                                    {req.userRemainingLeave ?? req.userLeaveBalance?.remainingAnnual ?? 12} {t('days', 'Hari')}
                                  </strong>
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {t('period', 'Periode')}: <strong className="text-slate-800 dark:text-slate-200 font-mono">{req.startDate}</strong> {t('date_range_to', 's/d')} <strong className="text-slate-800 dark:text-slate-200 font-mono">{req.endDate}</strong>
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 mt-2">
                                "{req.reason}"
                              </p>

                              {/* History notes for already processed items */}
                              {isForwardedToHr && (
                                <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs space-y-1 mt-2">
                                  <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>{t('leave_forwarded_hr_info', 'Telah disetujui oleh Leader dan diteruskan ke HR untuk pengesahan final.')}</span>
                                  </div>
                                  {req.leaderNotes && (
                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] italic pl-5">
                                      "{req.leaderNotes}"
                                    </p>
                                  )}
                                </div>
                              )}

                              {isFullyApproved && (
                                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs space-y-1 mt-2">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{t('leave_fully_approved_info', 'Telah disahkan secara final oleh HR Administrator.')}</span>
                                  </div>
                                  {req.hrNotes && (
                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] italic pl-5">
                                      "{req.hrNotes}"
                                    </p>
                                  )}
                                </div>
                              )}

                              {isRejectedStatus && (req.rejectedReason || req.rejectReason) && (
                                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 text-xs mt-2">
                                  <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>{t('label_rejection_reason', 'Alasan Penolakan:')} {req.rejectedReason || req.rejectReason}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions or History Badge */}
                          <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2 shrink-0 self-start md:self-center pt-2 md:pt-0">
                            {isPendingAction ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={async () => {
                                    const reason = await toast.prompt({
                                      title: 'Tolak Permohonan Cuti',
                                      message: 'Alasan penolakan permohonan cuti:',
                                      defaultValue: 'Kebutuhan mendesak operasional tim',
                                      confirmText: 'Tolak Permohonan',
                                      variant: 'danger',
                                    });
                                    if (reason !== null) handleRejectLeave(req.id, reason);
                                  }}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-colors"
                                >
                                  <XCircle className="w-4 h-4" />
                                  <span>{t('btn_reject', 'Tolak')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={async () => {
                                    const notes = await toast.prompt({
                                      title: 'Setujui Permohonan Cuti',
                                      message: 'Catatan persetujuan leader (opsional):',
                                      defaultValue: 'Disetujui oleh Leader/Atasan Langsung',
                                      confirmText: 'Setujui Cuti',
                                      variant: 'success',
                                    });
                                    if (notes !== null) handleApproveLeave(req.id, notes);
                                  }}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{t('btn_approve_leader', 'Setujui (Leader)')}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {isForwardedToHr && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                    <span>{t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}</span>
                                  </span>
                                )}
                                {isFullyApproved && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>{t('status_approved_synced', 'Disahkan & Disetujui')}</span>
                                  </span>
                                )}
                                {isRejectedStatus && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                                    <XCircle className="w-4 h-4 text-rose-600" />
                                    <span>{t('status_rejected', 'Ditolak')}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedLeave(req)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors mt-1"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>{t('view_detail', 'Detail')}</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* === TAB 2: PERMOHONAN TUKAR SHIFT === */}
        {activeTab === 'switches' && (
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('switch_approvals_title', 'Permohonan Pergantian Shift Bawahan')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('switch_approvals_subtitle', 'Verifikasi penyesuaian jadwal dinamis yang diajukan oleh staf di bawah koordinasi Anda')}
                </p>
              </div>

              {/* Filter Pills Toolbar */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setSwitchFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    switchFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('filter_all', 'Semua')} ({displayedSwitches.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSwitchFilter('pending_leader')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    switchFilter === 'pending_leader'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_needs_review', 'Menunggu Review')} ({pendingLeaderSwitchesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setSwitchFilter('pending_hr')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    switchFilter === 'pending_hr'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_forwarded_hr', 'Diteruskan ke HR')} (
                  {displayedSwitches.filter((s) => s.status === 'pending_hr').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setSwitchFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    switchFilter === 'approved'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_endorsed_hr', 'Disahkan Final HR')} (
                  {displayedSwitches.filter((s) => s.status === 'approved').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setSwitchFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    switchFilter === 'rejected'
                      ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_rejected', 'Ditolak')} (
                  {displayedSwitches.filter((s) => s.status === 'rejected').length}
                  )
                </button>
              </div>
            </div>

            {(() => {
              const filteredSwitches = displayedSwitches.filter((sw) => {
                if (switchFilter === 'all') return true;
                return sw.status === switchFilter;
              });

              if (filteredSwitches.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                    <Clock className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {switchFilter === 'all'
                        ? t('no_switch_pending', 'Tidak Ada Permohonan Tukar Shift')
                        : t('no_switch_in_filter', 'Tidak ada data tukar shift pada status ini')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {switchFilter === 'all'
                        ? t('no_switch_desc', 'Semua permohonan pergantian shift staf telah disetujui atau belum ada pengajuan baru.')
                        : t('no_switch_filter_desc', 'Gunakan filter lain di atas untuk melihat riwayat atau permohonan lainnya.')}
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredSwitches.map((sw) => {
                    const isPendingAction = sw.status === 'pending_leader';
                    const isForwardedToHr = sw.status === 'pending_hr';
                    const isFullyApproved = sw.status === 'approved';
                    const isRejectedStatus = sw.status === 'rejected';

                    return (
                      <div key={sw.id} className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Left: Info */}
                          <div className="flex items-start gap-3.5 flex-1">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-extrabold flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800 shadow-2xs mt-0.5">
                              {sw.avatar ? (
                                <img src={sw.avatar} alt={sw.userName || sw.userId} className="w-full h-full rounded-2xl object-cover" />
                              ) : (
                                <span className="text-xs">{(sw.userName || sw.userId || 'K').slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>

                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  {t('applicant', 'Pemohon')}:
                                </span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{sw.userName || sw.userId}</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">• {sw.userPosition || 'Staf'}</span>
                                {sw.userDepartment && (
                                  <span className="text-xs text-slate-400 dark:text-slate-500">({sw.userDepartment})</span>
                                )}
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                  ID: {sw.id}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                                  <span>{t('target_date', 'Tanggal Penugasan Shift')}:</span>
                                  <strong className="text-indigo-600 dark:text-indigo-400 font-mono font-bold text-xs bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                    {getDayName(sw.targetDate, language)}, {sw.targetDate}
                                  </strong>
                                </span>
                              </div>

                              {/* Shift comparison block */}
                              <div className="flex flex-wrap items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                                <div className="flex-1 min-w-[140px]">
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                    {t('shift_scheduled_orig', 'Shift Semula')}
                                  </span>
                                  <span className="font-bold text-slate-800 dark:text-slate-200 block">{sw.originalShiftName || 'Default'}</span>
                                  <span className="font-mono text-[11px] text-slate-500">
                                    {sw.originalStartTime && sw.originalEndTime ? `${sw.originalStartTime} - ${sw.originalEndTime}` : t('sameday_shift', 'Jadwal Reguler')}
                                  </span>
                                </div>

                                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 shrink-0">
                                  <ArrowRight className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-[140px]">
                                  <span className="text-[10px] uppercase font-bold text-indigo-500 block mb-0.5">
                                    {t('shift_requested_new', 'Shift Baru Yang Diminta')}
                                  </span>
                                  <span className="font-bold text-indigo-600 dark:text-indigo-400 block">{sw.requestedShiftName}</span>
                                  <span className="font-mono text-[11px] text-indigo-500/80">
                                    {sw.requestedStartTime && sw.requestedEndTime ? `${sw.requestedStartTime} - ${sw.requestedEndTime}` : 'Jam Operasional'}
                                  </span>
                                </div>
                              </div>

                              {/* Reason */}
                              <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                                <strong className="not-italic text-amber-900 dark:text-amber-300 font-semibold mr-1.5">
                                  {t('label_reason', 'Alasan:')}
                                </strong>
                                "{sw.reason}"
                              </p>

                              {/* History notes for processed items */}
                              {isForwardedToHr && (
                                <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>{t('switch_forwarded_hr_info', 'Telah disetujui oleh Leader dan diteruskan ke HR untuk verifikasi jadwal final.')}</span>
                                  </div>
                                </div>
                              )}

                              {isFullyApproved && (
                                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{t('switch_fully_approved_info', 'Telah disahkan secara final oleh HR Administrator dan jadwal baru telah diterapkan di sistem.')}</span>
                                  </div>
                                </div>
                              )}

                              {isRejectedStatus && (sw.rejectionReason || sw.rejection_reason) && (
                                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 text-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>{t('label_rejection_reason', 'Alasan Penolakan:')} {sw.rejectionReason || sw.rejection_reason}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions or Status Badge */}
                          <div className="flex items-center gap-2 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
                            {isPendingAction ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRejectSwitch(sw.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
                                >
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                  <span>{t('btn_reject', 'Tolak')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApproveSwitch(sw.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{t('btn_approve_switch', 'Setujui Tukar Shift')}</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {isForwardedToHr && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                    <span>{t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}</span>
                                  </span>
                                )}
                                {isFullyApproved && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>{t('status_approved_synced', 'Disahkan & Diterapkan')}</span>
                                  </span>
                                )}
                                {isRejectedStatus && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                                    <XCircle className="w-4 h-4 text-rose-600" />
                                    <span>{t('status_rejected', 'Ditolak')}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* TAB 3: PERSETUJUAN LEMBUR (SPL) */}
        {activeTab === 'overtimes' && (
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('overtime_approvals_title', 'Persetujuan Lembur Tim (Surat Perintah Lembur)')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('overtime_approvals_subtitle', 'Verifikasi surat perintah lembur (SPL) yang diajukan oleh staf di bawah koordinasi Anda')}
                </p>
              </div>

              {/* Filter Pills Toolbar */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setOvertimeFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    overtimeFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('filter_all', 'Semua')} ({displayedOvertimes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setOvertimeFilter('pending_leader')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    overtimeFilter === 'pending_leader'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_needs_review', 'Menunggu Review')} ({pendingLeaderOvertimesCount})
                </button>
                <button
                  type="button"
                  onClick={() => setOvertimeFilter('pending_hr')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    overtimeFilter === 'pending_hr'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_forwarded_hr', 'Diteruskan ke HR')} (
                  {displayedOvertimes.filter((o) => o.status === 'pending_hr').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setOvertimeFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    overtimeFilter === 'approved'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_endorsed_hr', 'Disahkan Final HR')} (
                  {displayedOvertimes.filter((o) => o.status === 'approved').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setOvertimeFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    overtimeFilter === 'rejected'
                      ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_rejected', 'Ditolak')} (
                  {displayedOvertimes.filter((o) => o.status === 'rejected').length}
                  )
                </button>
              </div>
            </div>

            {(() => {
              const filteredOvertimes = displayedOvertimes.filter((ot) => {
                if (overtimeFilter === 'all') return true;
                if (overtimeFilter === 'pending_leader') {
                  return ot.status === 'pending_leader' || ot.status === 'pending';
                }
                return ot.status === overtimeFilter;
              });

              if (filteredOvertimes.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                    <CheckCircle2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-base font-bold text-slate-700 dark:text-slate-300">
                      {overtimeFilter === 'all'
                        ? t('no_overtimes_in_tab', 'Tidak Ada Pengajuan Lembur Tim')
                        : t('no_overtimes_in_filter', 'Tidak ada data lembur pada status ini')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {overtimeFilter === 'all'
                        ? t('all_overtimes_processed', 'Semua permohonan lembur bawahan langsung Anda telah selesai diproses.')
                        : t('all_overtimes_filter_desc', 'Gunakan filter lain di atas untuk melihat riwayat atau pengajuan lainnya.')}
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOvertimes.map((ot) => {
                    const isPendingAction = ot.status === 'pending_leader' || ot.status === 'pending';
                    const isForwardedToHr = ot.status === 'pending_hr';
                    const isFullyApproved = ot.status === 'approved';
                    const isRejectedStatus = ot.status === 'rejected';

                    return (
                      <div
                        key={ot.id}
                        className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Left: Employee Info & Lembur Details */}
                          <div className="space-y-3 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <img
                                src={ot.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'}
                                alt={ot.employeeName}
                                className="w-10 h-10 rounded-2xl object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                              />
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                    {t('applicant', 'Pemohon')}:
                                  </span>
                                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                                    {ot.employeeName || ot.userName}
                                  </span>
                                  <span className="text-[11px] text-slate-400">• {ot.department || '-'}</span>
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                    {ot.splNumber}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800">
                                    {ot.type === 'holiday' ? t('ot_type_holiday', 'Lembur Hari Libur') : ot.type === 'pre_shift' ? t('ot_type_pre', 'Lembur Pra-Shift') : t('ot_type_regular', 'Lembur Reguler')}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    {getDayName(ot.date || ot.dayName, language)}, {ot.date}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Overtime Schedule & Hours */}
                            <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                  {t('ot_execution_hours', 'Jam Pelaksanaan')}
                                </span>
                                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                  {ot.startTime} - {ot.endTime} WIB
                                </span>
                              </div>
                              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                  {t('total_duration', 'Total Durasi')}
                                </span>
                                <span className="font-bold text-indigo-600 dark:text-indigo-400 text-xs">
                                  {ot.durationHours} {t('hours', 'Jam')}
                                </span>
                              </div>
                              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                  {t('ot_wage_burden', 'Estimasi Beban Upah')}
                                </span>
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                                  Rp {(ot.estimatedRateIDR || Math.round((ot.durationHours || 0) * 95000)).toLocaleString('id-ID')}
                                </span>
                              </div>
                            </div>

                            {/* Reason */}
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                              <strong className="not-italic text-amber-900 dark:text-amber-300 font-semibold mr-1.5">
                                {t('label_reason', 'Alasan:')}
                              </strong>
                              "{ot.reason}"
                            </p>

                            {/* History notes for processed items */}
                            {isForwardedToHr && (
                              <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  <span>{t('ot_forwarded_hr_info', 'Telah disetujui oleh Leader dan diteruskan ke HR untuk pengesahan final.')}</span>
                                </div>
                                {ot.leaderNotes && (
                                  <p className="text-slate-600 dark:text-slate-300 text-[11px] italic pl-5">
                                    "{ot.leaderNotes}"
                                  </p>
                                )}
                              </div>
                            )}

                            {isFullyApproved && (
                              <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>{t('ot_fully_approved_info', 'Telah disahkan secara final oleh HR Administrator.')}</span>
                                </div>
                              </div>
                            )}

                            {isRejectedStatus && (ot.rejectionReason || ot.rejection_reason) && (
                              <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 text-xs">
                                <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>{t('label_rejection_reason', 'Alasan Penolakan:')} {ot.rejectionReason || ot.rejection_reason}</span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Right: Actions or Status Badges */}
                          <div className="flex items-center gap-2 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
                            {isPendingAction ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleRejectOvertime(ot.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all"
                                >
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                  <span>{t('btn_reject', 'Tolak')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApproveOvertime(ot.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{t('btn_approve_leader_ot', 'Setujui Lembur (Tahap 1)')}</span>
                                </button>
                              </>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {isForwardedToHr && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                    <span>{t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}</span>
                                  </span>
                                )}
                                {isFullyApproved && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>{t('status_approved_synced', 'Disahkan & Disetujui')}</span>
                                  </span>
                                )}
                                {isRejectedStatus && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                                    <XCircle className="w-4 h-4 text-rose-600" />
                                    <span>{t('status_rejected', 'Ditolak')}</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* === TAB 4: PERSETUJUAN KOREKSI PRESENSI === */}
        {activeTab === 'corrections' && (
          <div>
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t('leader_corr_list_title', 'Daftar Pengajuan Koreksi Presensi Tim')}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('leader_corr_list_subtitle', 'Tinjau permohonan koreksi jam masuk/pulang bawahan sebelum diverifikasi HR')}
                </p>
              </div>

              {/* Filter Pills Toolbar */}
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold overflow-x-auto max-w-full">
                <button
                  type="button"
                  onClick={() => setCorrectionFilter('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    correctionFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('filter_all', 'Semua')} ({displayedCorrections.length})
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionFilter('pending_leader')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    correctionFilter === 'pending_leader'
                      ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_needs_review', 'Menunggu Review')} ({pendingLeaderCorrectionCount})
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionFilter('pending_hr')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    correctionFilter === 'pending_hr'
                      ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_forwarded_hr', 'Diteruskan ke HR')} (
                  {displayedCorrections.filter((c) => c.status === 'pending_hr').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionFilter('approved')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    correctionFilter === 'approved'
                      ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('corr_filter_endorsed_hr', 'Disahkan Final HR')} (
                  {displayedCorrections.filter((c) => c.status === 'approved').length}
                  )
                </button>
                <button
                  type="button"
                  onClick={() => setCorrectionFilter('rejected')}
                  className={`px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                    correctionFilter === 'rejected'
                      ? 'bg-white dark:bg-slate-700 text-rose-700 dark:text-rose-300 shadow-2xs font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {t('tab_rejected', 'Ditolak')} (
                  {displayedCorrections.filter((c) => c.status === 'rejected').length}
                  )
                </button>
              </div>
            </div>

            {(() => {
              const filteredList = displayedCorrections.filter((item) => {
                if (correctionFilter === 'all') return true;
                return item.status === correctionFilter;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="p-12 text-center text-slate-400 dark:text-slate-500">
                    <FileEdit className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                      {correctionFilter === 'pending_leader'
                        ? t('no_corr_leader_pending', 'Tidak Ada Koreksi Presensi Menunggu')
                        : t('corr_no_filtered', 'Tidak ada riwayat koreksi presensi yang sesuai filter')}
                    </p>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      {correctionFilter === 'pending_leader'
                        ? t('all_team_corrections_processed', 'Semua permohonan koreksi presensi bawahan langsung Anda telah diproses.')
                        : ''}
                    </p>
                  </div>
                );
              }

              return (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredList.map((item) => {
                    const isPendingAction = item.status === 'pending_leader';
                    const isForwardedToHr = item.status === 'pending_hr';
                    const isFullyApproved = item.status === 'approved';
                    const isRejectedStatus = item.status === 'rejected';

                    return (
                      <div key={item.id} className="p-4 sm:p-5 hover:bg-slate-50/70 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                          
                          {/* Left: Info */}
                          <div className="flex items-start gap-3.5 flex-1">
                            <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-extrabold flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-800 shadow-2xs mt-0.5">
                              {item.avatar ? (
                                <img src={item.avatar} alt={item.userName} className="w-full h-full rounded-2xl object-cover" />
                              ) : (
                                <span className="text-xs">{(item.userName || 'K').slice(0, 2).toUpperCase()}</span>
                              )}
                            </div>

                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                                  {t('applicant', 'Pemohon')}:
                                </span>
                                <span className="font-bold text-sm text-slate-900 dark:text-white">{item.userName}</span>
                                {item.position && (
                                  <span className="text-xs text-slate-500 dark:text-slate-400">• {item.position}</span>
                                )}
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                                  #{item.id}
                                </span>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                  {item.correctionType === 'clock_in'
                                    ? t('corr_type_in', 'Jam Masuk')
                                    : item.correctionType === 'clock_out'
                                    ? t('corr_type_out', 'Jam Pulang')
                                    : t('corr_type_both', 'Masuk & Pulang')}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                                <span className="flex items-center gap-1.5 font-medium">
                                  <Calendar className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span>{t('attendance_date', 'Tanggal Presensi')}:</span>
                                  <strong className="text-blue-600 dark:text-blue-400 font-mono font-bold text-xs bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-lg border border-blue-200 dark:border-blue-800">
                                    {getDayName(item.date, language)}, {item.date}
                                  </strong>
                                </span>
                              </div>

                              {/* Proposed hours block */}
                              <div className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs max-w-xl">
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                    {t('corr_proposed_in', 'Jam Masuk Diajukan')}
                                  </span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {item.proposedClockIn ? `${item.proposedClockIn} WIB` : '-'}
                                  </span>
                                </div>
                                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1 hidden sm:block" />
                                <div>
                                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                                    {t('corr_proposed_out', 'Jam Pulang Diajukan')}
                                  </span>
                                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {item.proposedClockOut ? `${item.proposedClockOut} WIB` : '-'}
                                  </span>
                                </div>
                              </div>

                              {/* Reason & Attachment */}
                              <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-amber-50/50 dark:bg-amber-950/30 p-2.5 rounded-xl border border-amber-200/60 dark:border-amber-800/60">
                                <strong className="not-italic text-amber-900 dark:text-amber-300 font-semibold mr-1.5">
                                  {t('label_reason', 'Alasan:')}
                                </strong>
                                "{item.reason}"
                              </p>

                              {item.attachmentUrl && (
                                <a
                                  href={item.attachmentUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-0.5"
                                >
                                  📎 {t('corr_view_proof', 'Lihat Bukti / Lampiran')}
                                </a>
                              )}

                              {/* History Notes for already processed items */}
                              {isForwardedToHr && (
                                <div className="p-2.5 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/60 dark:border-indigo-800/60 text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-indigo-700 dark:text-indigo-300 text-[11px]">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span>{t('corr_action_forwarded_info', 'Telah disetujui oleh Anda dan diteruskan ke HR untuk pengesahan final.')}</span>
                                  </div>
                                  {item.leaderNotes && (
                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] italic pl-5">
                                      "{item.leaderNotes}"
                                    </p>
                                  )}
                                </div>
                              )}

                              {isFullyApproved && (
                                <div className="p-2.5 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60 text-xs space-y-1">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>{t('corr_action_approved_info', 'Telah disahkan oleh HR Administrator dan data presensi telah diperbarui.')}</span>
                                  </div>
                                  {item.hrNotes && (
                                    <p className="text-slate-600 dark:text-slate-300 text-[11px] italic pl-5">
                                      "{item.hrNotes}"
                                    </p>
                                  )}
                                </div>
                              )}

                              {isRejectedStatus && item.rejectionReason && (
                                <div className="p-2.5 rounded-xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/60 dark:border-rose-800/60 text-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-rose-700 dark:text-rose-300 text-[11px]">
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>{t('label_rejection_reason', 'Alasan Penolakan:')} {item.rejectionReason}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Actions or Status Tracking */}
                          <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-2 shrink-0 self-start lg:self-center pt-2 lg:pt-0">
                            {isPendingAction ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleRejectCorrection(item.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold transition-all disabled:opacity-50"
                                >
                                  <XCircle className="w-4 h-4 text-rose-500" />
                                  <span>{t('btn_reject', 'Tolak')}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleApproveCorrection(item.id)}
                                  disabled={isProcessing}
                                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>{t('btn_approve_leader_corr', 'Setujui (Tahap 1)')}</span>
                                </button>
                              </div>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                {isForwardedToHr && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold">
                                    <ShieldCheck className="w-4 h-4 text-indigo-600" />
                                    <span>{t('corr_badge_stage2_hr', 'Tahap 2: Menunggu HR')}</span>
                                  </span>
                                )}
                                {isFullyApproved && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    <span>{t('status_approved_synced', 'Disahkan & Disinkronkan')}</span>
                                  </span>
                                )}
                                {isRejectedStatus && (
                                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold">
                                    <XCircle className="w-4 h-4 text-rose-600" />
                                    <span>{t('status_rejected', 'Ditolak')}</span>
                                  </span>
                                )}
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => setSelectedCorrection(item)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors mt-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-blue-500" />
                              <span>{t('btn_track_progress', 'Lacak Alur')}</span>
                            </button>
                          </div>

                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

      </div>

      {/* Leave Detail Modal */}
      <LeaveDetailModal
        leave={
          selectedLeave
            ? displayedLeaves.find((l) => l.id === selectedLeave.id) || selectedLeave
            : null
        }
        isOpen={!!selectedLeave}
        onClose={() => setSelectedLeave(null)}
        onApproveLeader={(id, notes) => handleApproveLeave(id, notes)}
        onRejectLeader={(id, reason) => handleRejectLeave(id, reason)}
      />

      {/* Attendance Correction Detail / Workflow Modal */}
      <AttendanceCorrectionDetailModal
        correction={selectedCorrection}
        isOpen={!!selectedCorrection}
        onClose={() => setSelectedCorrection(null)}
      />

    </div>
  );
}
