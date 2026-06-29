const SESSION_KEY = 'sicac.session.v1';

export type SessionTokens = {
  accessToken: string;
  refreshToken: string;
  expiresAt?: number;
};

function isSessionTokens(value: unknown): value is SessionTokens {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SessionTokens>;
  return typeof candidate.accessToken === 'string'
    && typeof candidate.refreshToken === 'string'
    && (candidate.expiresAt === undefined || typeof candidate.expiresAt === 'number');
}

export function readSession(): SessionTokens | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (isSessionTokens(parsed)) return parsed;
  } catch {
    // A malformed session is treated as expired.
  }
  sessionStorage.removeItem(SESSION_KEY);
  return null;
}

export function writeSession(tokens: SessionTokens) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(tokens));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
