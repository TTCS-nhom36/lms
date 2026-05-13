import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { normalizeRole } from '../../utils/roles';

const ROLE_HOME = {
  ADMIN: '/admin/dashboard',
  INSTRUCTOR: '/instructor/courses',
  STUDENT: '/student/my-courses',
};

export default function RoleRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[normalizeRole(user.role)] || '/login'} replace />;
}
