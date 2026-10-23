import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Home } from 'lucide-react';

export default function NotFoundPage() {
  const { t } = useLanguage();
  const { user, isHrAdmin, isSuperAdmin } = useAuth();

  const homePath = isSuperAdmin ? '/admin/tenants' : isHrAdmin ? '/admin' : '/employee';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="w-16 h-16 rounded-3xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t('not_found_title')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-sm">
        {t('not_found_desc')}
      </p>
      <Link
        to={homePath}
        className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all"
      >
        <Home className="w-4 h-4" />
        <span>{isHrAdmin || isSuperAdmin ? t('back_to_admin_home', 'Kembali ke Dashboard Admin') : t('back_to_employee_home')}</span>
      </Link>
    </div>
  );
}
