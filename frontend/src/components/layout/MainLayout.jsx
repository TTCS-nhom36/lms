import { Outlet, Navigate } from 'react-router-dom';
import TopBar from './TopBar';
import ChatWidget from '../chat/ChatWidget';
import { useAuth } from '../../hooks/useAuth';

export default function MainLayout() {
  const { user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-shell">
      <TopBar />

      <main className="app-main">
        <div className="app-main__inner">
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </div>
      </main>

      <ChatWidget />
    </div>
  );
}
