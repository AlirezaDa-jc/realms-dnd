import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import {
  getSessionUser,
  login as authenticate,
  register as createAccount,
  restoreSession,
  setSessionExpiredHandler,
  signOut as endSession,
  type User,
} from '@/api/client';

type SessionContextValue = {
  user: User | null;
  loading: boolean;
  signIn(
    username: string,
    password: string,
    rememberMe: boolean,
  ): Promise<void>;
  signUp(
    input: { username: string; email: string; password: string },
    rememberMe: boolean,
  ): Promise<void>;
  signOut(): Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(getSessionUser);
  const [loading, setLoading] = useState(() => getSessionUser() === null);

  useEffect(() => {
    let mounted = true;
    setSessionExpiredHandler(() => setUser(null));

    void restoreSession()
      .then((restoredUser) => {
        if (mounted) setUser(restoredUser);
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      setSessionExpiredHandler(null);
    };
  }, []);

  async function signIn(username: string, password: string, rememberMe: boolean) {
    setUser(await authenticate(username, password, rememberMe));
  }

  async function signUp(
    input: { username: string; email: string; password: string },
    rememberMe: boolean,
  ) {
    setUser(await createAccount(input, rememberMe));
  }

  async function signOut() {
    try {
      await endSession();
    } finally {
      setUser(null);
    }
  }

  return (
    <SessionContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used inside SessionProvider.');
  }
  return context;
}
