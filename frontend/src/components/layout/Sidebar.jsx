import { NavLink } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, BookOpen, Compass, BookMarked,
  User, GraduationCap,
} from 'lucide-react';

/* ─── Menu definitions ─── */
const adminMenu = {
  main: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
    { label: 'Users', icon: User, path: '/admin/users' },
    { label: 'Courses', icon: BookOpen, path: '/admin/courses' },
  ],
};

const instructorMenu = {
  main: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/instructor/dashboard' },
    { label: 'My Courses', icon: BookOpen, path: '/instructor/courses' },
  ],
};

const studentMenu = {
  main: [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
    { label: 'Browse Courses', icon: Compass, path: '/student/browse' },
    { label: 'My Courses', icon: BookMarked, path: '/student/my-courses' },
  ],
};

/* ─── Sub-components ─── */
function SectionLabel({ children }) {
  return <p className="app-sidebar__section">{children}</p>;
}

function NavItem({ item }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}
    >
      {({ isActive }) => (
        <>
          <Icon size={16} strokeWidth={1.9} className="app-nav-link__icon" />
          <span className="app-nav-link__label">{item.label}</span>
        </>
      )}
    </NavLink>
  );
}

/* ─── Main Component ─── */
export default function Sidebar() {
  const { isAdmin, isInstructor } = useAuth();

  const menu = isAdmin ? adminMenu : isInstructor ? instructorMenu : studentMenu;
  const roleLabel = isAdmin ? 'Admin' : isInstructor ? 'Instructor' : 'Student';

  return (
    <aside className="app-sidebar z-50 flex flex-col">
      <div className="app-sidebar__brand">
        <div className="app-sidebar__mark">
          <GraduationCap size={18} color="white" strokeWidth={1.9} />
        </div>
        <div>
          <div className="app-sidebar__title">LMS</div>
          <div className="app-sidebar__subtitle">{roleLabel}</div>
        </div>
      </div>

      <nav className="app-sidebar__nav">
        <SectionLabel>Main</SectionLabel>
        {menu.main.map((item) => (
          <NavItem key={item.path} item={item} />
        ))}
      </nav>
    </aside>
  );
}
