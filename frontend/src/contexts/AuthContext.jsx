import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('lms_user');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('lms_user', JSON.stringify(user));
      localStorage.setItem('lms_user_id', user.id);
    } else {
      localStorage.removeItem('lms_user');
      localStorage.removeItem('lms_user_id');
    }
  }, [user]);

  const login = (userData) => {
    setUser(userData);
  };

  const logout = () => {
    setUser(null);
  };

  const isAdmin = user?.role === 'ADMIN';
  const isInstructor = user?.role === 'INSTRUCTOR';
  const isStudent = user?.role === 'STUDENT';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin, isInstructor, isStudent }}>
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
