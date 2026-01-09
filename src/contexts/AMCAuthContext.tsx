import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

interface AMCAuthUser {
  id: string;
  email: string;
  full_name?: string;
  phone?: string;
  company_name?: string;
  profile_id?: string;
  email_confirmed?: boolean;
}

interface AMCAuthContextType {
  user: AMCAuthUser | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  emailNotConfirmed: boolean;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null; emailNotConfirmed?: boolean }>;
  logout: () => Promise<void>;
}

const AMCAuthContext = createContext<AMCAuthContextType | undefined>(undefined);

export const AMCAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AMCAuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);

  // Helper to create user object from session
  const createUserFromSession = (session: Session | null): AMCAuthUser | null => {
    if (!session?.user) return null;
    return {
      id: session.user.id,
      email: session.user.email || '',
      full_name: session.user.user_metadata?.full_name,
      email_confirmed: !!session.user.email_confirmed_at,
    };
  };

  // Fetch customer profile data (non-blocking, called after auth is set)
  const fetchAndUpdateProfile = async (userId: string, currentUser: AMCAuthUser) => {
    try {
      const { data: customerData } = await supabase
        .from('amc_responses')
        .select('amc_form_id, full_name, phone, company_name')
        .eq('customer_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (customerData) {
        setUser(prev => prev ? {
          ...prev,
          full_name: customerData.full_name || prev.full_name,
          phone: customerData.phone,
          company_name: customerData.company_name,
          profile_id: customerData.amc_form_id,
        } : prev);
      }
    } catch (error) {
      // Silently fail - profile fetch is optional
      console.warn('Profile fetch failed:', error);
    }
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AMCAuth] Initial session:', session ? 'exists' : 'none');
      setSession(session);
      const authUser = createUserFromSession(session);
      setUser(authUser);
      setIsLoading(false);
      
      // Fetch profile in background if user exists
      if (authUser) {
        fetchAndUpdateProfile(authUser.id, authUser);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AMCAuth] Auth state changed:', event, session ? 'has session' : 'no session');
      
      setSession(session);
      const authUser = createUserFromSession(session);
      setUser(authUser);
      setEmailNotConfirmed(false);
      setIsLoading(false);
      
      // Fetch profile in background if user exists
      if (authUser) {
        fetchAndUpdateProfile(authUser.id, authUser);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUpWithEmail = async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });
      return { error: error as Error | null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        // Check if email is not confirmed
        if (error.message?.toLowerCase().includes('email not confirmed')) {
          setEmailNotConfirmed(true);
          return { error: error as Error, emailNotConfirmed: true };
        }
        return { error: error as Error };
      }
      
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AMCAuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!user,
        emailNotConfirmed,
        signUpWithEmail,
        signInWithEmail,
        logout,
      }}
    >
      {children}
    </AMCAuthContext.Provider>
  );
};

export const useAMCAuth = () => {
  const context = useContext(AMCAuthContext);
  if (!context) {
    throw new Error('useAMCAuth must be used within AMCAuthProvider');
  }
  return context;
};
