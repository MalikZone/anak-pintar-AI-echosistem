import React from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldAlert, ArrowLeftRight } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import BottomNav from './BottomNav';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

export default function MainLayout() {
  const { isImpersonating, stopImpersonating, tenant, user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Super Admin Impersonation Top Banner */}
      {isImpersonating && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 text-white px-4 py-2 text-xs font-medium shadow-md z-50">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-center sm:text-left">
              <span className="p-1 rounded-lg bg-white/20 shrink-0">
                <ShieldAlert className="w-4 h-4 text-amber-100 animate-pulse" />
              </span>
              <span>
                <strong className="font-extrabold uppercase tracking-wider mr-1.5">
                  {t('saas_impersonation_badge', 'Mode Impersonasi Super Admin:')}
                </strong>
                {t('saas_impersonation_desc', 'Anda sedang mengelola organisasi')}{' '}
                <span className="underline font-bold">{tenant?.name || user?.tenantId}</span>{' '}
                ({tenant?.code || 'TENANT'}) {t('saas_impersonation_as', 'sebagai HR Admin')}.
              </span>
            </div>
            <button
              type="button"
              onClick={stopImpersonating}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-rose-700 hover:bg-amber-50 font-bold text-xs shadow-xs transition-all cursor-pointer shrink-0"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              {t('saas_impersonation_exit_btn', 'Kembali ke Super Admin')}
            </button>
          </div>
        </div>
      )}

      {/* Top Header Navbar */}
      <Navbar />

      {/* Main Container */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        {/* Desktop / Tablet Sidebar */}
        <Sidebar />

        {/* Dynamic Route Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 overflow-y-auto max-w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <BottomNav />

    </div>
  );
}

