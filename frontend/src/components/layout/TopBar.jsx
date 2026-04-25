import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, LogOut, UserCircle2, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function TopBar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const menuRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = useMemo(() => {
    return user?.fullName
      ?.split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  }, [user?.fullName]);

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
      <div className="flex-1" />

      <div className="app-topbar__actions relative" ref={menuRef}>
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
          <span className="app-topbar__avatar">{initials}</span>
          <ChevronDown size={14} className="text-[color:var(--app-text-soft)] hidden sm:block" />
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
      </div>
    </header>
  );
}
