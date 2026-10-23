import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import {
  Clock,
  Sparkles,
  Lock,
  Mail,
  ArrowRight,
  Shield,
  Briefcase,
  Users,
  Moon,
  Sun,
  AlertCircle,
  Building2,
  CheckCircle2,
  Globe
} from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const { language, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [activeTabTenant, setActiveTabTenant] = useState('logistik'); // 'logistik' | 'tech'
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const demoAccounts = {
    logistik: [
      {
        roleBadge: 'HR Administrator',
        roleColor: 'bg-rose-100 text-rose-800 border-rose-200',
        name: 'Siti Rahma, S.Psi',
        position: 'HR & People Operations Lead',
        email: 'hr.logistik@hadirin.id',
        desc: 'Persetujuan cuti tahap final & monitoring tim',
      },
      {
        roleBadge: 'Team Leader',
        roleColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        name: 'Bambang Sugiharto',
        position: 'Supervisor Hub A',
        email: 'leader1.logistik@hadirin.id',
        desc: 'Atasan langsung Doni, Eko, Fajar & Gita (Approval Tahap 1)',
      },
      {
        roleBadge: 'Karyawan (Shift Malam)',
        roleColor: 'bg-blue-100 text-blue-800 border-blue-200',
        name: 'Doni Setiawan',
        position: 'Operator Shift Malam Lintas Hari',
        email: 'staff1.logistik@hadirin.id',
        desc: 'Shift 3 Malam (23:00 - 07:00 H+1) • Bawahan Bambang',
      },
    ],
    tech: [
      {
        roleBadge: 'HR Administrator',
        roleColor: 'bg-rose-100 text-rose-800 border-rose-200',
        name: 'Dewi Lestari, S.Psi',
        position: 'Head of People & Organization',
        email: 'hr.tech@hadirin.id',
        desc: 'Persetujuan cuti tahap final & manajemen kantor',
      },
      {
        roleBadge: 'Engineering Lead',
        roleColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
        name: 'Aris Wibowo',
        position: 'Frontend Engineering Lead',
        email: 'lead1.tech@hadirin.id',
        desc: 'Atasan langsung Cahyo, Dina, Ervan & Farah',
      },
      {
        roleBadge: 'Software Engineer',
        roleColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        name: 'Cahyo Utomo',
        position: 'Senior React Developer',
        email: 'eng1.tech@hadirin.id',
        desc: 'Non-Shift Reguler Pagi (08:30 - 17:30) • Bawahan Aris',
      },
    ],
  };

  const handleExecuteLogin = async (loginEmail, loginPassword) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const data = await login(loginEmail, loginPassword);
      toast.success(`${t('login_welcome_back')}, ${data.user.name}!`, t('login_success_title'));
      
      // Redirect based on role or location state
      const from = location.state?.from?.pathname;
      const isAdminUser = data.user.role === 'hr_admin' || data.user.role === 'super_admin';
      const isCrossRoleRedirect =
        from &&
        ((isAdminUser && from.startsWith('/employee')) || (!isAdminUser && from.startsWith('/admin')));

      if (from && from !== '/login' && !isCrossRoleRedirect) {
        navigate(from, { replace: true });
      } else if (data.user.role === 'super_admin') {
        navigate('/admin/tenants', { replace: true });
      } else if (data.user.role === 'hr_admin') {
        navigate('/admin', { replace: true });
      } else {
        navigate('/employee', { replace: true });
      }
    } catch (err) {
      const msg = err.message || t('login_failed_desc');
      setErrorMessage(msg);
      toast.error(msg, t('login_failed_title'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage(t('login_email_required'));
      return;
    }
    handleExecuteLogin(email, password);
  };

  const handleSelectPreset = (presetEmail) => {
    setEmail(presetEmail);
    setPassword('password123');
    handleExecuteLogin(presetEmail, 'password123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      
      {/* Top Controls: Language Switcher */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <button
          type="button"
          onClick={toggleLanguage}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold backdrop-blur-md transition-all shadow-sm"
          title={t('switch_language')}
        >
          <Globe className="w-3.5 h-3.5 text-blue-300" />
          <span className="uppercase text-[11px] tracking-wide">{language}</span>
        </button>
      </div>

      {/* Background Lighting Effects */}
      <div className="absolute top-0 left-1/4 -mt-20 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 -mb-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none"></div>

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-xl shadow-blue-500/25 mb-3">
          <Clock className="w-8 h-8 text-white stroke-[2.2]" />
        </div>
        
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Hadirin</h1>
        <p className="text-xs text-blue-200 mt-1 font-medium">
          Smart Attendance & Multi-Tenant HR Platform
        </p>
        <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] text-amber-300 font-medium backdrop-blur-md">
          <Sparkles className="w-3 h-3 text-amber-400" />
          <span>Ekosistem Anak-Pintar</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 relative z-10">
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-100">
          
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-900">{t('login_heading')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('login_subheading')}
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('login_email_label')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login_email_placeholder')}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                {t('login_password_label')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('login_password_placeholder')}
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 rounded-xl font-bold text-xs text-white shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                isLoading
                  ? 'bg-blue-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
              }`}
            >
              {isLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>{t('login_btn_loading')}</span>
                </>
              ) : (
                <>
                  <span>{t('login_btn_submit')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Presets Section */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {t('login_presets_title')}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Password: password123</span>
            </div>

            {/* Super Admin Quick Login */}
            <div className="mb-3">
              <button
                type="button"
                onClick={() => handleSelectPreset('superadmin@hadirin.id')}
                disabled={isLoading}
                className="w-full text-left p-2.5 rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 hover:from-purple-100/90 hover:to-indigo-100/90 hover:border-purple-400 transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-purple-950">Super Administrator</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-md border bg-purple-100 text-purple-800 border-purple-200">
                      SaaS Governance
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-700 truncate mt-0.5">
                    Akses penuh platform & manajemen multi-tenant (superadmin@hadirin.id)
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-purple-400 group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            </div>

            {/* Tenant Selector Tabs */}
            <div className="flex rounded-xl bg-slate-100 p-1 mb-3 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTabTenant('logistik')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-[11px] ${
                  activeTabTenant === 'logistik'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-indigo-600" />
                <span>{t('login_tenant_1')}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTabTenant('tech')}
                className={`flex-1 py-1.5 px-2 rounded-lg transition-all flex items-center justify-center gap-1.5 text-[11px] ${
                  activeTabTenant === 'tech'
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-blue-600" />
                <span>{t('login_tenant_2')}</span>
              </button>
            </div>

            {/* Presets List */}
            <div className="space-y-2">
              {demoAccounts[activeTabTenant].map((acc, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(acc.email)}
                  disabled={isLoading}
                  className="w-full text-left p-2.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between group"
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900 truncate">{acc.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded-md border ${acc.roleColor}`}>
                        {acc.roleBadge}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 truncate mt-0.5">{acc.desc}</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>

          </div>

        </div>
      </div>

    </div>
  );
}

