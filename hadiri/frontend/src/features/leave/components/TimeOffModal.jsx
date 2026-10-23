import React, { useState, useEffect, useMemo } from 'react';
import { useAttendance } from '../../../context/AttendanceContext';
import { useLanguage } from '../../../context/LanguageContext';
import { useToast } from '../../../context/ToastContext';
import { calculateDayDifference } from '../../../utils/formatters';
import { leaveTypeApi } from '../../../services/api/leaveTypeApi';
import {
  CalendarCheck,
  UploadCloud,
  FileText,
  Sparkles,
  CheckCircle2,
  X,
  Layers
} from 'lucide-react';

export default function TimeOffModal({ isOpen, onClose }) {
  const { submitLeave, currentUser } = useAttendance();
  const { t } = useLanguage();
  const toast = useToast();

  const [type, setType] = useState('sick');
  const [dbLeaveTypes, setDbLeaveTypes] = useState([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState(null);
  const [isSimulatingOcr, setIsSimulatingOcr] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoadingTypes(true);
    leaveTypeApi
      .getLeaveTypes()
      .then((res) => {
        if (Array.isArray(res) && res.length > 0) {
          setDbLeaveTypes(res);
        }
      })
      .catch((err) => {
        console.warn('Fallback to standard leave types:', err.message);
      })
      .finally(() => {
        setIsLoadingTypes(false);
      });
  }, [isOpen]);

  const typeOptions = useMemo(() => {
    if (!dbLeaveTypes || dbLeaveTypes.length === 0) {
      return [
        {
          id: 'sick',
          code: 'sick',
          label: t('timeoff_sick_label', 'Izin Sakit'),
          desc: t('timeoff_sick_desc', 'Surat keterangan dokter untuk sakit'),
          badge: `${t('quota_remaining', 'Sisa kuota')} ${currentUser?.leaveBalance?.sick?.remaining ?? 14} ${t('days', 'Hari')}`,
          requiresAttachment: true,
        },
        {
          id: 'annual',
          code: 'annual',
          label: t('timeoff_annual_label', 'Cuti Tahunan'),
          desc: t('timeoff_annual_desc', 'Hak cuti kerja resmi tahunan'),
          badge: `${t('quota_remaining', 'Sisa kuota')} ${currentUser?.leaveBalance?.annual?.remaining ?? 12} ${t('days', 'Hari')}`,
          requiresAttachment: false,
        },
        {
          id: 'special',
          code: 'special',
          label: t('timeoff_special_label', 'Izin Khusus / Penting'),
          desc: t('timeoff_special_desc', 'Pernikahan, duka cita, atau keperluan mendesak'),
          badge: `${t('quota_remaining', 'Sisa kuota')} ${currentUser?.leaveBalance?.special?.remaining ?? 5} ${t('days', 'Hari')}`,
          requiresAttachment: false,
        },
      ];
    }

    return dbLeaveTypes.map((lt) => {
      let badge = '';
      if (lt.code === 'annual' || lt.deductAnnual) {
        badge = `${t('quota_remaining', 'Sisa kuota')} ${currentUser?.leaveBalance?.annual?.remaining ?? 12} ${t('days', 'Hari')}`;
      } else if (lt.code === 'sick') {
        badge = `${t('quota_remaining', 'Sisa kuota')} ${currentUser?.leaveBalance?.sick?.remaining ?? 14} ${t('days', 'Hari')}`;
      } else if (lt.defaultQuota > 0) {
        badge = `${t('quota_label', 'Kuota')} ${lt.defaultQuota} ${t('days', 'Hari')}`;
      } else {
        badge = lt.isPaid ? t('paid_leave', 'Cuti Berbayar') : t('unpaid_leave', 'Cuti Non-Berbayar');
      }

      return {
        id: lt.code,
        code: lt.code,
        label: lt.name,
        desc: lt.description || (lt.isPaid ? 'Cuti resmi berbayar' : 'Izin tidak berbayar'),
        badge,
        requiresAttachment: Boolean(lt.requiresAttachment),
      };
    });
  }, [dbLeaveTypes, currentUser, t]);

  useEffect(() => {
    if (typeOptions.length > 0 && !typeOptions.some((o) => o.id === type)) {
      setType(typeOptions[0].id);
    }
  }, [typeOptions, type]);

  if (!isOpen) return null;

  const totalDays = calculateDayDifference(startDate, endDate);

  const handleSimulateUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsSimulatingOcr(true);
      setTimeout(() => {
        setAttachment({
          name: file.name,
          url: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?auto=format&fit=crop&q=80&w=600',
        });
        setIsSimulatingOcr(false);
      }, 800);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.warning(t('timeoff_reason_placeholder'), t('toast_reason_required_title'));
      return;
    }

    const selectedType = typeOptions.find((t) => t.id === type) || typeOptions[0];

    submitLeave({
      type: selectedType.code || selectedType.id,
      typeLabel: selectedType.label,
      startDate,
      endDate,
      totalDays,
      reason,
      attachmentUrl: attachment?.url || null,
      attachmentName: attachment?.name || null,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn overflow-hidden">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh] overflow-hidden my-auto">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 p-5 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-lg leading-tight">
                {t('timeoff_modal_title')}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('timeoff_modal_subtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form with scrollable body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          
          <div className="overflow-y-auto flex-1 p-5 space-y-4 custom-scrollbar">
            
            {/* Leave Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                {t('timeoff_select_type')}
              </label>
              <div className="space-y-2">
                {typeOptions.map((opt) => (
                  <label
                    key={opt.id}
                    className={`flex items-start justify-between p-3 rounded-2xl border cursor-pointer transition-all ${
                      type === opt.id
                        ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 dark:border-blue-500 shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="leaveType"
                        value={opt.id}
                        checked={type === opt.id}
                        onChange={() => setType(opt.id)}
                        className="text-blue-600 focus:ring-blue-500 mt-0.5"
                      />
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{opt.label}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">{opt.desc}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                      {opt.badge}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Date Picker Range */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('timeoff_start_date')}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('timeoff_end_date')}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 flex items-center justify-between">
              <span>{t('timeoff_total_duration')}</span>
              <span className="font-bold text-blue-700 dark:text-blue-400 font-mono">{totalDays} {t('days')}</span>
            </div>

            {/* Reason Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('timeoff_reason_label')} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                required
                placeholder={t('timeoff_reason_placeholder')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* File Upload Attachment (OCR Ready) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {t('timeoff_doc_label')} {type === 'sick' ? t('timeoff_doc_sick_hint') : t('timeoff_doc_optional_hint')}
                </label>
                <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-indigo-500 dark:text-indigo-400" />
                  AI OCR Parser Ready
                </span>
              </div>

              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-4 text-center cursor-pointer relative bg-slate-50/50 dark:bg-slate-800/30 transition-colors">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={handleSimulateUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
                
                {isSimulatingOcr ? (
                  <div className="py-2 flex flex-col items-center gap-2 text-indigo-600 dark:text-indigo-400">
                    <Sparkles className="w-6 h-6 animate-spin" />
                    <p className="text-xs font-semibold">{t('timeoff_doc_scanning')}</p>
                  </div>
                ) : attachment ? (
                  <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded-xl border border-emerald-300 dark:border-emerald-700 text-left">
                    <div className="flex items-center gap-2 truncate">
                      <FileText className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <div className="truncate">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{attachment.name}</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">{t('timeoff_doc_ready')}</p>
                      </div>
                    </div>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-slate-400">
                    <UploadCloud className="w-6 h-6 text-slate-400 dark:text-slate-500" />
                    <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                      {t('timeoff_doc_upload_title')}
                    </p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      {t('timeoff_doc_upload_desc')}
                    </p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Sticky Modal Action Buttons Footer */}
          <div className="flex gap-2.5 p-5 border-t border-slate-100 dark:border-slate-800 shrink-0 bg-slate-50/50 dark:bg-slate-900/50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {t('modal_cancel')}
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-colors"
            >
              {t('timeoff_btn_submit')}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

