import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Sparkles } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles, requiredPermission }) {
  const { isAuthenticated, isLoading, user, can } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-6 h-6 text-amber-300 animate-spin" />
          <h2 className="text-xl font-extrabold tracking-tight">Hadirin</h2>
        </div>
        <p className="text-xs text-slate-400 animate-pulse">Memverifikasi sesi otentikasi...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const getRoleHome = () => {
    if (user?.role === 'super_admin') return '/admin/tenants';
    if (user?.role === 'hr_admin') return '/admin';
    return '/employee';
  };

  // Check required dynamic permission if specified
  if (requiredPermission && !can(requiredPermission)) {
    return <Navigate to={getRoleHome()} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={getRoleHome()} replace />;
  }

  return children;
}

