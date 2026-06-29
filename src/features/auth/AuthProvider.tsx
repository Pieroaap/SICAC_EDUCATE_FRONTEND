import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { AuthProfile } from '../../api/types';
import { clearSession, readSession, writeSession } from '../../lib/session';
import { getCurrentProfile, loginWithDocument } from './api/authApi';

type AuthState = 'loading' | 'authenticated' | 'anonymous';

type AuthContextValue = {
  status: AuthState;
  profile: AuthProfile | null;
  login: (input: { dni: string; password: string }) => Promise<AuthProfile>;
  logout: () => void;
  reloadProfile: () => Promise<AuthProfile>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState>(
    () => readSession() ? 'loading' : 'anonymous',
  );
  const [profile, setProfile] = useState<AuthProfile | null>(null);

  const logout = useCallback(() => {
    clearSession();
    setProfile(null);
    setStatus('anonymous');
  }, []);

  const reloadProfile = useCallback(async () => {
    const nextProfile = await getCurrentProfile();
    setProfile(nextProfile);
    setStatus('authenticated');
    return nextProfile;
  }, []);

  const login = useCallback(async (input: { dni: string; password: string }) => {
    const session = await loginWithDocument(input);
    writeSession(session);
    try {
      return await reloadProfile();
    } catch (error) {
      clearSession();
      throw error;
    }
  }, [reloadProfile]);

  useEffect(() => {
    const handleUnauthorized = () => logout();
    window.addEventListener('sicac:unauthorized', handleUnauthorized);

    const bootstrapTimer = readSession()
      ? window.setTimeout(() => void reloadProfile().catch(logout), 0)
      : null;

    return () => {
      window.removeEventListener('sicac:unauthorized', handleUnauthorized);
      if (bootstrapTimer !== null) window.clearTimeout(bootstrapTimer);
    };
  }, [logout, reloadProfile]);

  const value = useMemo<AuthContextValue>(() => ({
    status,
    profile,
    login,
    logout,
    reloadProfile,
  }), [status, profile, login, logout, reloadProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}
