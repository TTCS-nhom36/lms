import { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import Avatar from '../ui/Avatar';
import {
  Bell, LogOut, UserCircle2, ChevronDown, GraduationCap,
  LayoutDashboard, BookOpen, Compass, BookMarked, User, Menu, X, BarChart3,
} from 'lucide-react';

/* ─── Menu definitions ─── */
const adminMenu = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
  { label: 'Analytics', icon: BarChart3, path: '/admin/analytics' },
  { label: 'Users', icon: User, path: '/admin/users' },
  { label: 'Courses', icon: BookOpen, path: '/admin/courses' },
];

const instructorMenu = [
  { label: 'Analytics', icon: BarChart3, path: '/instructor/analytics' },
  { label: 'My Courses', icon: BookOpen, path: '/instructor/courses' },
];

const studentMenu = [
  { label: 'Browse', icon: Compass, path: '/student/browse' },
  { label: 'My Courses', icon: BookMarked, path: '/student/my-courses' },
];

export default function TopBar() {
  const { user, logout, isAdmin, isInstructor } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const menu = isAdmin ? adminMenu : isInstructor ? instructorMenu : studentMenu;

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleProfile = () => {
    setMenuOpen(false);
    navigate('/profile');
  };

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="app-topbar">
      {/* Brand */}
      <div className="app-topbar__brand">
        <div className="app-topbar__mark">
          <GraduationCap size={18} color="white" strokeWidth={1.9} />
        </div>
        <span className="app-topbar__brand-name">LMS</span>
      </div>

      {/* Desktop Navigation */}
      <nav className="app-topbar__nav">
        {menu.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `app-topbar__nav-link${isActive ? ' active' : ''}`}
            >
              <Icon size={15} strokeWidth={1.9} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Right actions */}
      <div className="app-topbar__actions" ref={menuRef}>
        <button className="app-topbar__icon-btn" aria-label="Notifications" type="button">
          <Bell size={16} />
        </button>

        <button
          className="app-topbar__avatar-trigger"
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <Avatar name={user?.fullName} src={user?.avatarUrl} size="sm" className="app-topbar__avatar overflow-hidden" />
          <ChevronDown size={14} className="app-topbar__chevron" />
        </button>

        {menuOpen && (
          <div className="app-topbar__menu" role="menu">
            <button type="button" className="app-topbar__menu-item" onClick={handleProfile}>
              <UserCircle2 size={16} />
              Profile
            </button>
            <button type="button" className="app-topbar__menu-item danger" onClick={handleLogout}>
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}

        {/* Mobile hamburger */}
        <button
          className="app-topbar__hamburger"
          type="button"
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle navigation"
        >
          {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Navigation Dropdown */}
      {mobileNavOpen && (
        <nav className="app-topbar__mobile-nav">
          {menu.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) => `app-topbar__mobile-link${isActive ? ' active' : ''}`}
                onClick={() => setMobileNavOpen(false)}
              >
                <Icon size={16} strokeWidth={1.9} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      )}
    </header>
  );
}
