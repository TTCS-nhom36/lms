import { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('lms_access_token');
      if (token) {
        try {
          const res = await userApi.getMe();
          setUser(res.data);
        } catch (error) {
          console.error("Failed to restore session", error);
          localStorage.removeItem('lms_access_token');
          localStorage.removeItem('lms_refresh_token');
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const { accessToken, refreshToken } = res.data;
    localStorage.setItem('lms_access_token', accessToken);
    localStorage.setItem('lms_refresh_token', refreshToken);
    
    // Fetch profile
    const profileRes = await userApi.getMe();
    setUser(profileRes.data);
  };

  const register = async (data) => {
    await authApi.register(data);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error(e);
    } finally {
      localStorage.removeItem('lms_access_token');
      localStorage.removeItem('lms_refresh_token');
      setUser(null);
    }
  };

  const isAdmin = user?.role === 'ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR';
  const isStudent = user?.role === 'STUDENT';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, isAdmin, isInstructor, isStudent }}>
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
