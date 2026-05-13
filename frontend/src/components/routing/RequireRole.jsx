import { Navigate } from 'react-router-dom';
import MainLayout from '../layout/MainLayout';
import { useAuth } from '../../hooks/useAuth';
import { hasRole } from '../../utils/roles';
import RoleRedirect from './RoleRedirect';

export default function RequireRole({ roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!hasRole(user.role, roles)) return <RoleRedirect />;
  return <MainLayout />;
}
