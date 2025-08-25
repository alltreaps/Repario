import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  email: string;
  fullName?: string;
  role: string;
  logo_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName?: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export { AuthContext };

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Initialize user state from localStorage if available
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('repario_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [authInitialized, setAuthInitialized] = useState(false);

  const isAuthenticated = !!user;

  // Helper function to handle user profile - simplified
  const handleUserProfile = async (authUser: any) => {
    try {
      console.log('Loading profile for user:', authUser.id);
      
      // Get existing profile, explicitly select logo_url
      const { data: profile } = await supabase
        .from('profiles')
        .select('display_name, email, role, logo_url')
        .eq('id', authUser.id)
        .single();

      const userData = {
        id: authUser.id,
        email: authUser.email!,
        fullName: profile?.display_name || authUser.user_metadata?.full_name || undefined,
        role: profile?.role || 'user',
        logo_url: profile?.logo_url || undefined
      };

      setUser(userData);
      localStorage.setItem('repario_user', JSON.stringify(userData));
      console.log('User profile loaded successfully', userData);
    } catch (err) {
      console.error('Error loading profile, using fallback:', err);
      // Fallback: set basic user data
      const userData = {
        id: authUser.id,
        email: authUser.email!,
        fullName: authUser.user_metadata?.full_name || undefined,
        role: 'user'
      };
      setUser(userData);
      localStorage.setItem('repario_user', JSON.stringify(userData));
    }
  };

  // Single useEffect for all auth handling
  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...');
        
        // Get current session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          if (session?.user) {
            // Only load profile if we don't already have this user
            if (!user || user.id !== session.user.id) {
              await handleUserProfile(session.user);
            } else {
              console.log('User already loaded, skipping profile fetch');
            }
          } else {
            // No session, clear user
            setUser(null);
            localStorage.removeItem('repario_user');
          }
          
          setIsLoading(false);
          setAuthInitialized(true);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setIsLoading(false);
          setAuthInitialized(true);
        }
      }
    };

    // Set up auth state listener
    const setupAuthListener = () => {
      authSubscription = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (!mounted || !authInitialized) return;
          
          console.log('Auth event:', event, session?.user?.id || 'no-user');
          
          try {
            if (event === 'SIGNED_IN' && session?.user) {
              // Only handle if it's a different user
              if (!user || user.id !== session.user.id) {
                console.log('New sign-in detected');
                setIsLoading(true);
                await handleUserProfile(session.user);
                setIsLoading(false);
              } else {
                console.log('Same user sign-in, ignoring');
              }
            } else if (event === 'SIGNED_OUT') {
              console.log('Sign-out detected');
              setUser(null);
              localStorage.removeItem('repario_user');
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('Token refreshed, no action needed');
              // Do nothing for token refresh
            } else if (event === 'INITIAL_SESSION') {
              // Ignore INITIAL_SESSION since we handle it in initializeAuth
              console.log('Initial session event ignored');
            }
          } catch (error) {
            console.error('Auth state change error:', error);
            if (mounted) {
              setIsLoading(false);
            }
          }
        }
      );
    };

    // Initialize auth first, then set up listener
    initializeAuth().then(() => {
      if (mounted) {
        setupAuthListener();
      }
    });

    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.data?.subscription?.unsubscribe();
      }
    };
  }, []); // No dependencies - run once only

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Immediately update user state for instant redirect
      if (data.user) {
        console.log('Login successful, updating user state immediately');
        await handleUserProfile(data.user);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (email: string, password: string, fullName?: string): Promise<void> => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        throw error;
      }

      // Create profile if user was created
      if (data.user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            password_hash: 'managed_by_supabase', // Placeholder since Supabase handles auth
            display_name: fullName || null,
            role: 'user'
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw here as the user account was created successfully
        }

        // Immediately update user state for instant redirect
        console.log('Registration successful, updating user state immediately');
        await handleUserProfile(data.user);
      }
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('Signing out user...');
      await supabase.auth.signOut();
      
      // Immediately clear user state for instant logout
      setUser(null);
      localStorage.removeItem('repario_user');
      console.log('User signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Force clear user state even if signOut fails
      setUser(null);
      localStorage.removeItem('repario_user');
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    isAuthenticated,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
