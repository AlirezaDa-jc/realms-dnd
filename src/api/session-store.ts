type DesktopSessionBridge = {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  clear(): Promise<void>;
};

declare global {
  interface Window {
    realmsSession?: DesktopSessionBridge;
  }
}

const SESSION_KEY = 'realms.auth.session';

export async function readSession(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  if (window.realmsSession) return window.realmsSession.read();

  return window.localStorage.getItem(SESSION_KEY);
}

export async function writeSession(value: string): Promise<void> {
  if (typeof window === 'undefined') return;

  if (window.realmsSession) {
    await window.realmsSession.write(value);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, value);
}

export async function removeSession(): Promise<void> {
  if (typeof window === 'undefined') return;

  if (window.realmsSession) {
    await window.realmsSession.clear();
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}
