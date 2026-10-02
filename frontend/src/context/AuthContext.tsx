import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';
import { api, getToken, setToken } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  role: null,
  isAuthenticated: false,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('aquatrust.user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setTokenState] = useState<string | null>(() => getToken());

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setTokenState(newToken);
    setUser(newUser);
    localStorage.setItem('aquatrust.user', JSON.stringify(newUser));
  };

  const logout = () => {
    setToken(null);
    setTokenState(null);
    setUser(null);
    localStorage.removeItem('aquatrust.user');
  };

  useEffect(() => {
    if (token && !user) {
      api<any>('/auth/me')
        .then((res) => {
          const userObj = res?.user || (res?.user_id ? res : null);
          if (userObj) {
            setUser(userObj);
            localStorage.setItem('aquatrust.user', JSON.stringify(userObj));
          } else {
            logout();
          }
        })
        .catch(() => logout());
    }
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role: user?.role || null,
        isAuthenticated: !!token && !!user,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
