import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSession, type UserProfile, type BusinessInfo } from '../hooks/useSession';

interface UserContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

interface BusinessContextType {
  business: BusinessInfo | null;
  isLoading: boolean;
  error: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);
const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

interface SessionProviderProps {
  children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { user, profile, business, isLoading, error } = useSession();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Don't redirect if we're still loading
    if (isLoading) return;

    // Don't redirect if we're already on auth pages
    if (location.pathname.startsWith('/auth') || location.pathname === '/login') return;

    // If user is authenticated but has no profile, redirect to complete profile
    if (user && error === 'PROFILE_NOT_FOUND') {
      console.log('User has no profile, redirecting to complete profile...');
      navigate('/auth/complete-profile', { replace: true });
      return;
    }

    // If user is not authenticated and not on login page, redirect to login
    if (!user && location.pathname !== '/login') {
      console.log('User not authenticated, redirecting to login...');
      navigate('/login', { replace: true });
      return;
    }

  }, [user, profile, isLoading, error, navigate, location.pathname]);

  const userContextValue: UserContextType = {
    profile,
    isLoading,
    error: error && error !== 'PROFILE_NOT_FOUND' ? error : null,
  };

  const businessContextValue: BusinessContextType = {
    business,
    isLoading,
    error: error && error !== 'PROFILE_NOT_FOUND' ? error : null,
  };

  return (
    <UserContext.Provider value={userContextValue}>
      <BusinessContext.Provider value={businessContextValue}>
        {children}
      </BusinessContext.Provider>
    </UserContext.Provider>
  );
}

export function useCurrentUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useCurrentUser must be used within a SessionProvider');
  }
  return context;
}

export function useCurrentBusiness(): BusinessContextType {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useCurrentBusiness must be used within a SessionProvider');
  }
  return context;
}
