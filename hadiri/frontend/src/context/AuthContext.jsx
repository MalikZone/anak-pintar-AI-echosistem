import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, tenantApi } from '../services/api';
import { apiClient } from '../services/api/apiClient';

const AuthContext = createContext();
const SA_BACKUP_TOKEN_KEY = 'hadirin_sa_backup_token';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [tenant, setTenant] = useState(null);
  const [token, setToken] = useState(apiClient.getToken());
  const [isLoading, setIsLoading] = useState(true);

  // Initialize and verify existing token on app mount
  useEffect(() => {
    const initAuth = async () => {
      const existingToken = apiClient.getToken();
      if (!existingToken) {
        setIsLoading(false);
        return;
      }

      try {
        const profileData = await authApi.getMe();
        setUser(profileData.user);
        setTenant(profileData.tenant);
        setToken(existingToken);
      } catch (err) {
        console.warn('Session verification failed, logging out:', err.message);
        apiClient.setToken(null);
        setUser(null);
        setTenant(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    localStorage.removeItem(SA_BACKUP_TOKEN_KEY);
    const data = await authApi.login(email, password);
    apiClient.setToken(data.token);
    setUser(data.user);
    setTenant(data.tenant);
    setToken(data.token);
    return data;
  };

  const logout = () => {
    localStorage.removeItem(SA_BACKUP_TOKEN_KEY);
    apiClient.setToken(null);
    setUser(null);
    setTenant(null);
    setToken(null);
    window.location.href = '/login';
  };

  const impersonateTenant = async (tenantId) => {
    const currentToken = apiClient.getToken();
    if (currentToken && !localStorage.getItem(SA_BACKUP_TOKEN_KEY)) {
      localStorage.setItem(SA_BACKUP_TOKEN_KEY, currentToken);
    }
    const res = await tenantApi.impersonateTenant(tenantId);
    const data = res?.data || res;
    if (data?.token) {
      apiClient.setToken(data.token);
      setUser(data.user);
      setTenant(data.tenant);
      setToken(data.token);
    }
    return data;
  };

  const stopImpersonating = async () => {
    const backupToken = localStorage.getItem(SA_BACKUP_TOKEN_KEY);
    if (!backupToken) {
      logout();
      return;
    }
    localStorage.removeItem(SA_BACKUP_TOKEN_KEY);
    apiClient.setToken(backupToken);
    setToken(backupToken);
    try {
      const profileData = await authApi.getMe();
      setUser(profileData.user);
      setTenant(profileData.tenant);
      window.location.href = '/admin/saas-dashboard';
    } catch (err) {
      console.warn('Failed to restore Super Admin session:', err);
      logout();
    }
  };

  const refreshUser = useCallback(async () => {
    try {
      const profileData = await authApi.getMe();
      if (profileData?.user) {
        setUser(profileData.user);
        setTenant(profileData.tenant);
      }
      return profileData?.user;
    } catch (err) {
      console.warn('Failed to refresh user profile:', err);
    }
  }, []);

  const permissions = user?.permissions || [];
  const isSuperAdmin = user?.role === 'super_admin';
  const isImpersonating = Boolean(user?.impersonatedBy || localStorage.getItem(SA_BACKUP_TOKEN_KEY));

  const can = (permissionCode) => {
    if (!permissionCode) return true;
    if (isSuperAdmin) return true;
    if (permissions.includes('*')) return true;
    return permissions.includes(permissionCode);
  };

  const canAny = (permissionCodes = []) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (isSuperAdmin) return true;
    return permissionCodes.some((code) => can(code));
  };

  const canAll = (permissionCodes = []) => {
    if (!permissionCodes || permissionCodes.length === 0) return true;
    if (isSuperAdmin) return true;
    return permissionCodes.every((code) => can(code));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        impersonateTenant,
        stopImpersonating,
        isImpersonating,
        refreshUser,
        permissions,
        can,
        canAny,
        canAll,
        isSuperAdmin,
        isHrAdmin: user?.role === 'hr_admin',
        isLeader: user?.role === 'leader',
        isEmployee: user?.role === 'employee' || (!isSuperAdmin && user?.role !== 'hr_admin' && user?.role !== 'leader'),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

