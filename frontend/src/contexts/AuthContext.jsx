import { useState, useEffect } from 'react';
import { authApi } from '../api/authApi';
import { userApi } from '../api/userApi';
import { normalizeRole } from '../utils/roles';
import { clearTokens, getAccessToken, setTokens } from '../utils/tokenStorage';
import { AuthContext } from './authContext';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = getAccessToken();
      if (token) {
        try {
          const res = await userApi.getMe();
          setUser(res.data);
        } catch (error) {
          console.error("Failed to restore session", error);
          clearTokens();
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = async (credentials) => {
    const res = await authApi.login(credentials);
    const { accessToken, refreshToken } = res.data;
    setTokens({ accessToken, refreshToken });
    
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
      clearTokens();
      setUser(null);
    }
  };

  const userRole = normalizeRole(user?.role);
  const isAdmin = userRole === 'ADMIN';
  const isInstructor = userRole === 'INSTRUCTOR';
  const isStudent = userRole === 'STUDENT';

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, register, logout, userRole, isAdmin, isInstructor, isStudent }}>
      {children}
    </AuthContext.Provider>
  );
}
