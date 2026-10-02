import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  UserProfileResponse,
  UserRole,
} from '../types';
import { loginApi, logoutApi, getMeApi, LoginParams } from '../api/auth';
import {
  getStoredToken,
  setStoredToken,
  onUnauthorized,
  ApiClientError,
} from '../api/client';

interface AuthContextType {
  user: UserProfileResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (params: LoginParams) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  selectedFacilityId: string | null;
  setSelectedFacilityId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(getStoredToken());
  const [user, setUser] = useState<UserProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const profile = await getMeApi();
      setUser(profile);
      if (profile.facility_id) {
        setSelectedFacilityId(profile.facility_id);
      }
    } catch (err) {
      console.warn('Failed to fetch user profile:', err);
      // If profile fetch fails with 401, token is invalidated
      if (err instanceof ApiClientError && err.status === 401) {
        setStoredToken(null);
        setTokenState(null);
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onUnauthorized(() => {
      setTokenState(null);
      setUser(null);
    });

    if (token) {
      fetchProfile();
    } else {
      setIsLoading(false);
    }

    return () => {
      unsub();
    };
  }, [token, fetchProfile]);

  const login = async (params: LoginParams) => {
    setIsLoading(true);
    try {
      const res = await loginApi(params);
      setStoredToken(res.access_token);
      setTokenState(res.access_token);

      // Call GET /auth/me as authoritative user profile
      const profile = await getMeApi();
      setUser(profile);
      if (profile.facility_id) {
        setSelectedFacilityId(profile.facility_id);
      } else {
        setSelectedFacilityId(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await logoutApi().catch(() => {});
      }
    } finally {
      setStoredToken(null);
      setTokenState(null);
      setUser(null);
      setSelectedFacilityId(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshProfile: fetchProfile,
        selectedFacilityId,
        setSelectedFacilityId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
