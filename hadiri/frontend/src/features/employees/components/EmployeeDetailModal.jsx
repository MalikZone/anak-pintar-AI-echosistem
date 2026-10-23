import React, { useState } from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { userApi } from '../../../services/api/userApi';
import {
  X,
  User,
  Mail,
  Shield,
  Briefcase,
  Clock,
  Network,
  Calendar,
  Key,
  Trash2,
  Edit,
  CheckCircle2,
  MapPin,
  Send,
} from 'lucide-react';

export default function EmployeeDetailModal({
  isOpen,
  onClose,
  employee,
  onEdit,
  onDeleted,
  isHrAdmin = false,
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen || !employee) return null;

  const handleResetPassword = async () => {
    const confirmed = await toast.confirm({
      title: t('reset_password', 'Reset Kata Sandi'),
      message: t('confirm_reset_password', `Reset kata sandi ${employee.name} ke default (password123)?`),
      confirmText: 'Ya, Reset Sandi',
      cancelText: 'Batal',
      variant: 'warning',
    });
    if (!confirmed) return;

    setIsResetting(true);
    try {
      await userApi.resetPassword(employee.id, 'password123');
      toast.success(
        t('toast_password_reset_desc', 'Kata sandi berhasil direset ke: password123', { name: employee.name }),
        t('toast_success_title', 'Reset Kata Sandi')
      );
    } catch (err) {
      toast.error(err.message || t('toast_error_title', 'Gagal mereset kata sandi.'), t('toast_error_title', 'Kesalahan'));
    } finally {
      setIsResetting(false);
    }
  };

  const handleDelete = async () => {
    const confirmed = await toast.confirm({
      title: t('deactivate_employee', 'Nonaktifkan Akun Karyawan'),
      message: t('confirm_delete_employee', `Apakah Anda yakin ingin menonaktifkan akun karyawan ${employee.name}?`),
      confirmText: 'Ya, Nonaktifkan',
      cancelText: 'Batal',
      variant: 'danger',
    });
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await userApi.deleteEmployee(employee.id);
      toast.success(
        t('toast_emp_deactivated_desc', 'Akun karyawan telah dinonaktifkan dari sistem.', { name: employee.name }),
        t('toast_success_title', 'Karyawan Dinonaktifkan')
      );
      if (onDeleted) onDeleted(employee.id);
      onClose();
    } catch (err) {
      toast.error(err.message || t('toast_error_title', 'Gagal menonaktifkan karyawan.'), t('toast_error_title', 'Kesalahan'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto transition-colors">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 shrink-0">
          <div className="flex items-center gap-3">
            <img
              src={employee.avatar}
              alt={employee.name}
              className="w-12 h-12 rounded-2xl object-cover border-2 border-white dark:border-slate-700 shadow-xs"
            />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{employee.name}</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase tracking-wide">
                  {employee.role || 'employee'}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">{employee.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Key Info Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('col_position', 'Jabatan & Divisi')}</span>
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">{employee.position}</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{employee.department}</p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
              <span className="text-[11px] text-slate-400 block mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                <span>{t('shift_label', 'Pola Shift')}</span>
              </span>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {employee.shiftName || employee.shift || employee.shiftId}
              </p>
              {employee.isCrossDay && (
                <span className="inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  {t('cross_day_shift_tag', 'Lintas Hari (+1)')}
                </span>
              )}
            </div>
          </div>

          {/* Branch & Work Location */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0">
                <MapPin className="w-4 h-4" />
              </span>
              <div>
                <span className="text-[11px] text-slate-400 block mb-0.5">{t('branch_label', 'Cabang & Unit Usaha')}</span>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {employee.branch?.name || employee.locationName || t('branch_unassigned', 'Cabang belum ditentukan')}
                  </span>
                  {employee.branch?.isHeadquarters && (
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      HQ
                    </span>
                  )}
                  {employee.branch?.businessType && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/50">
                      {employee.branch.businessType}
                    </span>
                  )}
                </div>
                {employee.branch?.address && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                    {employee.branch.address}
                  </p>
                )}
              </div>
            </div>
            {employee.branch?.radiusMeters && (
              <span className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200/60 dark:border-slate-800 shrink-0">
                Radius {employee.branch.radiusMeters}m
              </span>
            )}
          </div>

          {/* Email & Contact */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Mail className="w-4 h-4 text-slate-400" />
                <span>{t('email_label', 'Email Resmi')}</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">{employee.email}</span>
            </div>

            <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Send className="w-4 h-4 text-sky-500" />
                <span>{t('telegram_id_label', 'ID Telegram (telegram_id)')}</span>
              </span>
              {employee.telegramId || employee.telegram_id ? (
                <span className="font-mono font-bold text-[11px] px-2.5 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800">
                  {employee.telegramId || employee.telegram_id}
                </span>
              ) : (
                <span className="text-slate-400 dark:text-slate-500 italic">
                  {t('telegram_not_linked', 'Belum ditautkan')}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-100 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Network className="w-4 h-4 text-slate-400" />
                <span>{t('reports_to_leader', 'Atasan Langsung')}</span>
              </span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {employee.leader?.name || (employee.leaderId ? employee.leaderId : t('no_leader_assigned', 'Langsung ke HR'))}
              </span>
            </div>
          </div>

          {/* Leave Quota Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800/60 dark:to-slate-800/40 border border-blue-100 dark:border-slate-700">
            <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{t('leave_balance_title', 'Hak & Saldo Cuti')}</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block">{t('quota_annual_short', 'Cuti Tahunan')}</span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400">
                  {employee.leaveBalance?.annual || 12} {t('days_unit', 'Hari')}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block">{t('quota_sick_short', 'Izin Sakit')}</span>
                <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                  {employee.leaveBalance?.sick || 14} {t('days_unit', 'Hari')}
                </span>
              </div>
              <div className="bg-white/80 dark:bg-slate-900/60 p-2.5 rounded-xl">
                <span className="text-[10px] text-slate-500 block">{t('quota_remaining_short', 'Sisa Hak Cuti')}</span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                  {employee.leaveBalance?.remainingAnnual || 10} {t('days_unit', 'Hari')}
                </span>
              </div>
            </div>
          </div>

          {/* Audit Timestamps */}
          <div className="text-[11px] text-slate-400 space-y-1">
            <p>• {t('created_at_label', 'Terdaftar pada')}: {employee.created_at || employee.createdAt || '-'}</p>
            <p>• {t('updated_at_label', 'Pembaruan terakhir')}: {employee.updated_at || employee.updatedAt || '-'}</p>
          </div>

        </div>

        {/* Footer Actions */}
        {isHrAdmin && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{t('deactivate_btn', 'Nonaktifkan')}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={isResetting}
                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('reset_password_btn', 'Reset Password')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onEdit) onEdit(employee);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{t('edit_btn', 'Edit Data')}</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

