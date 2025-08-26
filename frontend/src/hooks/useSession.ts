import { useState, useEffect, useRef } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface UserProfile {
  id: string;
  full_name: string;
  role: 'admin' | 'manager' | 'user';
  business_id: string;
}

export interface BusinessInfo {
  id: string;
  name: string;
}

export interface SessionData {
  user: User | null;
  profile: UserProfile | null;
  business: BusinessInfo | null;
  isLoading: boolean;
  error: string | null;
}

export function useSession() {
  const [sessionData, setSessionData] = useState<SessionData>({
    user: null,
    profile: null,
    business: null,
    isLoading: true,
    error: null,
  });

  // Concurrency protection
  const loadingRef = useRef(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      // Prevent concurrent loading
      if (loadingRef.current) {
        console.log('Session loading already in progress, skipping...');
        return;
      }

      try {
        loadingRef.current = true;
        setSessionData(prev => ({ ...prev, isLoading: true, error: null }));

        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw new Error(`Session error: ${sessionError.message}`);
        }

        if (!session?.user) {
          // No authenticated user
          if (mounted) {
            setSessionData({
              user: null,
              profile: null,
              business: null,
              isLoading: false,
              error: null,
            });
          }
          return;
        }

        // Get user profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, full_name, role, business_id')
          .eq('id', session.user.id)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            // No profile found - user needs to complete profile
            if (mounted) {
              setSessionData({
                user: session.user,
                profile: null,
                business: null,
                isLoading: false,
                error: 'PROFILE_NOT_FOUND',
              });
            }
            return;
          }
          
          // Handle RLS infinite recursion error
          if (profileError.message?.includes('infinite recursion')) {
            console.warn('RLS infinite recursion detected - signing out user');
            await supabase.auth.signOut();
            if (mounted) {
              setSessionData({
                user: null,
                profile: null,
                business: null,
                isLoading: false,
                error: 'RLS_ERROR',
              });
            }
            return;
          }
          
          throw new Error(`Profile error: ${profileError.message}`);
        }

        if (!profileData) {
          if (mounted) {
            setSessionData({
              user: session.user,
              profile: null,
              business: null,
              isLoading: false,
              error: 'PROFILE_NOT_FOUND',
            });
          }
          return;
        }

        // Only try to get business information if user has a business_id
        let businessData = null;
        if (profileData.business_id) {
          const { data: business, error: businessError } = await supabase
            .from('businesses')
            .select('id, name')
            .eq('id', profileData.business_id)
            .single();

          if (businessError) {
            console.warn(`Business query error: ${businessError.message}`);
            // Don't throw error, just log warning and continue without business data
          } else {
            businessData = business;
          }
        }

        if (!businessData) {
          throw new Error('Business not found');
        }

        // All data loaded successfully
        if (mounted) {
          setSessionData({
            user: session.user,
            profile: profileData as UserProfile,
            business: businessData as BusinessInfo,
            isLoading: false,
            error: null,
          });
        }

      } catch (error) {
        console.error('Session loading error:', error);
        if (mounted) {
          setSessionData(prev => ({
            ...prev,
            isLoading: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          }));
        }
      } finally {
        loadingRef.current = false;
      }
    };

    // Debounced session loader
    const debouncedLoadSession = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        loadSession();
      }, 300);
    };

    // Load initial session with debouncing
    debouncedLoadSession();

    // Listen for auth changes with debouncing
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('Auth state change:', event);
      if (event === 'SIGNED_OUT') {
        loadingRef.current = false;
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }
        setSessionData({
          user: null,
          profile: null,
          business: null,
          isLoading: false,
          error: null,
        });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        debouncedLoadSession();
      }
    });

    return () => {
      mounted = false;
      loadingRef.current = false;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      subscription.unsubscribe();
    };
  }, []);

  return sessionData;
}
