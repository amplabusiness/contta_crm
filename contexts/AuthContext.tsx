import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../services/supabaseClient.ts';

type SignInResult = { error: AuthError | null };

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithPassword: (params: { email: string; password: string }) => Promise<SignInResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!isMounted) {
          return;
        }

        setSession(initialSession);
        setUser(initialSession?.user ?? null);
      } catch (error) {
        console.error('Failed to resolve initial auth session', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPassword = useCallback(
    async ({ email, password }: { email: string; password: string }): Promise<SignInResult> => {
      const { error, data } = await supabase.auth.signInWithPassword({ email, password });

      if (!error) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }

      return { error };
    },
  []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Supabase sign-out failed', error);
      return;
    }
    setSession(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ session, user, loading, signInWithPassword, signOut }),
    [session, user, loading, signInWithPassword, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
