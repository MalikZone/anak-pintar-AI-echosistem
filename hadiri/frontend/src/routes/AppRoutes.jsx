import { Routes, Route, Navigate } from 'react-router-dom';
import { ROUTES } from './routePaths';
import MainLayout from '../components/layout/MainLayout';
import ProtectedRoute from '../components/auth/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

// Pages — Auth
import LoginPage from '../pages/auth/LoginPage';

// Pages — Employee
import EmployeeDashboardPage from '../pages/employee/EmployeeDashboardPage';
import AttendancePage from '../pages/employee/AttendancePage';
import SchedulePage from '../pages/employee/SchedulePage';
import OvertimePage from '../pages/employee/OvertimePage';
import RequestsPage from '../pages/employee/RequestsPage';
import HistoryPage from '../pages/employee/HistoryPage';
import ProfilePage from '../pages/employee/ProfilePage';

// Pages — Leader
import TeamApprovalsPage from '../pages/leader/TeamApprovalsPage';

// Pages — Admin
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import ApprovalsPage from '../pages/admin/ApprovalsPage';
import OvertimeApprovalsPage from '../pages/admin/OvertimeApprovalsPage';
import ShiftApprovalsPage from '../pages/admin/ShiftApprovalsPage';
import ShiftsManagementPage from '../pages/admin/ShiftsManagementPage';
import EmployeesPage from '../pages/admin/EmployeesPage';
import RolesManagementPage from '../pages/admin/RolesManagementPage';
import TenantsManagementPage from '../pages/admin/TenantsManagementPage';
import SaasDashboardPage from '../pages/admin/SaasDashboardPage';
import DepartmentsManagementPage from '../pages/admin/DepartmentsManagementPage';
import PositionsManagementPage from '../pages/admin/PositionsManagementPage';
import LocationsManagementPage from '../pages/admin/LocationsManagementPage';
import HolidaysManagementPage from '../pages/admin/HolidaysManagementPage';
import LeavePoliciesPage from '../pages/admin/LeavePoliciesPage';
import ReportsPage from '../pages/admin/ReportsPage';
import CompanySettingsPage from '../pages/admin/CompanySettingsPage';

// Fallback
import NotFoundPage from '../pages/NotFoundPage';

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') {
    return <Navigate to={ROUTES.ADMIN.SAAS_DASHBOARD} replace />;
  }
  if (user?.role === 'hr_admin') {
    return <Navigate to={ROUTES.ADMIN.DASHBOARD} replace />;
  }
  return <Navigate to={ROUTES.EMPLOYEE.DASHBOARD} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Route: Login */}
      <Route path={ROUTES.AUTH.LOGIN} element={<LoginPage />} />

      {/* Redirect root based on user role */}
      <Route path={ROUTES.ROOT} element={<RootRedirect />} />

      {/* Protected Routes inside MainLayout */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* === Rute Karyawan (ESS) === */}
        <Route
          path={ROUTES.EMPLOYEE.DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['employee', 'leader']}>
              <EmployeeDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEE.ATTENDANCE}
          element={
            <ProtectedRoute allowedRoles={['employee', 'leader']}>
              <AttendancePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEE.SCHEDULE}
          element={
            <ProtectedRoute allowedRoles={['employee', 'leader']}>
              <SchedulePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEE.OVERTIME}
          element={
            <ProtectedRoute allowedRoles={['employee', 'leader']}>
              <OvertimePage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEE.REQUESTS}
          element={
            <ProtectedRoute allowedRoles={['employee', 'leader']}>
              <RequestsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEE.HISTORY}
          element={
            <ProtectedRoute allowedRoles={['employee', 'leader']}>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.EMPLOYEE.PROFILE}
          element={
            <ProtectedRoute allowedRoles={['employee', 'leader']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* === Rute Leader (Approval Tahap 1) === */}
        <Route
          path={ROUTES.LEADER.APPROVALS}
          element={
            <ProtectedRoute allowedRoles={['leader', 'hr_admin']}>
              <TeamApprovalsPage />
            </ProtectedRoute>
          }
        />

        {/* === Rute HR / Administrator === */}
        <Route
          path={ROUTES.ADMIN.DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['hr_admin']}>
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.APPROVALS}
          element={
            <ProtectedRoute allowedRoles={['hr_admin']}>
              <ApprovalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.OVERTIME_APPROVALS}
          element={<Navigate to={`${ROUTES.ADMIN.APPROVALS}?tab=overtimes`} replace />}
        />
        <Route
          path={ROUTES.ADMIN.SHIFT_APPROVALS}
          element={<Navigate to={`${ROUTES.ADMIN.APPROVALS}?tab=switches`} replace />}
        />
        <Route
          path={ROUTES.ADMIN.SHIFTS}
          element={
            <ProtectedRoute allowedRoles={['hr_admin']}>
              <ShiftsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.EMPLOYEES}
          element={
            <ProtectedRoute allowedRoles={['hr_admin']}>
              <EmployeesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.DEPARTMENTS}
          element={
            <ProtectedRoute requiredPermission="departments.view" allowedRoles={['hr_admin', 'super_admin']}>
              <DepartmentsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.POSITIONS}
          element={
            <ProtectedRoute requiredPermission="positions.view" allowedRoles={['hr_admin', 'super_admin']}>
              <PositionsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.LOCATIONS}
          element={
            <ProtectedRoute requiredPermission="locations.view" allowedRoles={['hr_admin', 'super_admin']}>
              <LocationsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.HOLIDAYS}
          element={
            <ProtectedRoute requiredPermission="holidays.view" allowedRoles={['hr_admin', 'super_admin']}>
              <HolidaysManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.LEAVE_TYPES}
          element={
            <ProtectedRoute requiredPermission="leaves.view_policies" allowedRoles={['hr_admin', 'super_admin']}>
              <LeavePoliciesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.ROLES}
          element={
            <ProtectedRoute requiredPermission="roles.view" allowedRoles={['hr_admin', 'super_admin']}>
              <RolesManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.SAAS_DASHBOARD}
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <SaasDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.TENANTS}
          element={
            <ProtectedRoute allowedRoles={['super_admin']}>
              <TenantsManagementPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.REPORTS}
          element={
            <ProtectedRoute allowedRoles={['hr_admin', 'super_admin']}>
              <ReportsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.SETTINGS}
          element={
            <ProtectedRoute allowedRoles={['hr_admin', 'super_admin']}>
              <CompanySettingsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path={ROUTES.ADMIN.PROFILE}
          element={
            <ProtectedRoute allowedRoles={['hr_admin', 'super_admin']}>
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* 404 Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

