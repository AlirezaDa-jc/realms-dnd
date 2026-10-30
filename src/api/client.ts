import { readSession, removeSession, writeSession } from './session-store';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_REALMS_API_URL ??
  'https://realms-api-n6n1.onrender.com/api'
).replace(/\/$/, '');

export type User = {
  id: string;
  username: string;
  email: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number;
};

type AuthResponse = TokenPair & {
  user: User;
};

type AuthSession = AuthResponse & {
  rememberMe: boolean;
};

type ApiEnvelope<T> = {
  data: T;
};

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
  };
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let tokens: TokenPair | null = null;
let currentUser: User | null = null;
let sessionValidated = false;
let rememberSession = false;
let refreshInFlight: Promise<boolean> | null = null;
let restoreInFlight: Promise<User | null> | null = null;
let sessionExpiredHandler: (() => void) | null = null;

export function setSessionExpiredHandler(handler: (() => void) | null): void {
  sessionExpiredHandler = handler;
}

export async function login(
  username: string,
  password: string,
  rememberMe: boolean,
): Promise<User> {
  const response = await requestWithoutAuth<ApiEnvelope<AuthResponse>>(
    '/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
  );

  return saveSession(response.data, rememberMe);
}

export async function register(
  input: { username: string; email: string; password: string },
  rememberMe: boolean,
): Promise<User> {
  const response = await requestWithoutAuth<ApiEnvelope<AuthResponse>>(
    '/auth/register',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );

  return saveSession(response.data, rememberMe);
}

// A successful login remains active for the lifetime of this JavaScript runtime.
// Remember me only controls whether it can be restored after a new launch.
export function getSessionUser(): User | null {
  return tokens && sessionValidated ? currentUser : null;
}

export async function restoreSession(): Promise<User | null> {
  const activeUser = getSessionUser();
  if (activeUser) return activeUser;

  if (!restoreInFlight) {
    restoreInFlight = restoreStoredSession().finally(() => {
      restoreInFlight = null;
    });
  }

  return restoreInFlight;
}

async function restoreStoredSession(): Promise<User | null> {
  try {
    const saved = await readSession();
    if (!saved) return null;

    const session = JSON.parse(saved) as AuthSession;
    if (
      !session.rememberMe ||
      !session.accessToken ||
      !session.refreshToken ||
      !session.user?.id
    ) {
      await clearSession();
      return null;
    }

    tokens = session;
    currentUser = session.user;
    rememberSession = true;

    const response = await apiRequest<ApiEnvelope<User>>('/auth/me');
    currentUser = response.data;
    sessionValidated = true;
    return currentUser;
  } catch {
    await clearSession();
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    if (tokens) await apiRequest<void>('/auth/logout', { method: 'POST' });
  } finally {
    await clearSession();
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let response = await sendRequest(path, options);

  if (
    response.status === 401 &&
    tokens &&
    (await refreshAccessToken())
  ) {
    response = await sendRequest(path, options);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      await clearSession();
      sessionExpiredHandler?.();
    }
    throw toApiError(response.status, body);
  }

  return body as T;
}

async function sendRequest(path: string, options: RequestInit): Promise<Response> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (tokens) headers.set('Authorization', `Bearer ${tokens.accessToken}`);

  return fetch(`${API_BASE_URL}${path}`, { ...options, headers });
}

async function requestWithoutAuth<T>(path: string, options: RequestInit): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });
  const body = await response.json().catch(() => null);

  if (!response.ok) throw toApiError(response.status, body);
  return body as T;
}

async function refreshAccessToken(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  if (!tokens) return false;

  refreshInFlight = requestWithoutAuth<ApiEnvelope<TokenPair>>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken: tokens.refreshToken }),
  })
    .then(async ({ data }) => {
      tokens = data;
      await persistCurrentSession();
      return true;
    })
    .catch(async () => {
      await clearSession();
      sessionExpiredHandler?.();
      return false;
    })
    .finally(() => {
      refreshInFlight = null;
    });

  return refreshInFlight;
}

async function saveSession(
  session: AuthResponse,
  rememberMe: boolean,
): Promise<User> {
  tokens = session;
  currentUser = session.user;
  rememberSession = rememberMe;
  try {
    if (rememberMe) {
      await persistCurrentSession();
    } else {
      // Remove an older remembered login without clearing the active tokens.
      await removeSession().catch(() => {});
    }
  } catch (cause) {
    await clearSession();
    throw cause;
  }
  sessionValidated = true;
  return session.user;
}

async function persistCurrentSession(): Promise<void> {
  if (!rememberSession || !tokens || !currentUser) return;

  const session: AuthSession = {
    ...tokens,
    user: currentUser,
    rememberMe: true,
  };
  await writeSession(JSON.stringify(session));
}

async function clearSession(): Promise<void> {
  tokens = null;
  currentUser = null;
  sessionValidated = false;
  rememberSession = false;
  try {
    await removeSession();
  } catch {
    // Tokens are cleared from memory even if device storage is unavailable.
  }
}

function toApiError(status: number, value: unknown): ApiError {
  const body = value as ApiErrorPayload | null;
  return new ApiError(
    body?.error?.message ?? `Request failed (${status}).`,
    status,
    body?.error?.code,
  );
}
