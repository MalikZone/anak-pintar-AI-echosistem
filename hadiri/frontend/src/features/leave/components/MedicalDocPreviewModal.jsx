import React from 'react';
import { useLanguage } from '../../../context/LanguageContext';
import { Sparkles, ShieldCheck, X } from 'lucide-react';

export default function MedicalDocPreviewModal({ doc, onClose, onApprove }) {
  const { t } = useLanguage();

  if (!doc) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div>
            <h4 className="font-bold text-slate-900 dark:text-white text-base">{t('medical_preview_title')}</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">{doc.employeeName} • {doc.typeLabel}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 aspect-4/3 flex items-center justify-center relative">
          <img
            src={doc.attachmentUrl}
            alt="Medical Certificate"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-lg text-[11px] text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{t('ocr_simulation_badge')}</span>
          </div>
        </div>

        {doc.aiOcrData && (
          <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200/80 dark:border-indigo-800 text-xs space-y-1.5">
            <p className="font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              {t('ocr_rag_results')}
            </p>
            <p className="text-indigo-900 dark:text-indigo-300">
              • {t('ocr_doctor_issued')} <strong>{doc.aiOcrData.doctorName}</strong>
            </p>
            <p className="text-indigo-900 dark:text-indigo-300">
              • {t('ocr_diagnosis_label')} <strong>{doc.aiOcrData.diagnosis}</strong>
            </p>
            <p className="text-indigo-900 dark:text-indigo-300">
              • {t('ocr_valid_until')} <strong>{doc.aiOcrData.validUntil}</strong>
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300"
          >
            {t('btn_close')}
          </button>
          {doc.status === 'pending' && onApprove && (
            <button
              type="button"
              onClick={() => {
                onApprove(doc.id);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
            >
              {t('approve_direct_btn')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
