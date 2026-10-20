const TOKEN_KEY = 'synkro_dev_token';

export interface Session {
  token: string;
  sub: string;
  role: string;
  expiresAt?: number;
  sessionId?: string;
}

let current: Session | null = null;
let generation = 0;
export function sessionGeneration() { return generation; }
const listeners = new Set<() => void>();

export function getSession(): Session | null {
  return current;
}

// Only the development sign-in keeps a session across a reload. In a build
// without it the session lives in memory, and TOKEN_KEY is not in the bundle:
// scripts/check-production-build.mjs fails the build job if it is. The flag is
// read where it is used, so the bundler can drop what it guards.
export function setSession(session: Session | null, replace = true) {
  if (replace) generation++;
  current = session ? { ...session, sessionId: session.sessionId ??
    (!replace && current?.sub === session.sub ? current.sessionId : undefined) ?? crypto.randomUUID() } : null;
  if (import.meta.env.VITE_DEV_SIGN_IN === 'true') { try {
    if (session) {
      sessionStorage.setItem(TOKEN_KEY, JSON.stringify(current));
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
    }
  } catch { /* Development persistence cannot block notification. */ } }
  // Publish the entire snapshot first. A broken remote must not block logout
  // or prevent the remaining consumers from seeing invalidation.
  for (const listener of [...listeners]) {
    if (listeners.has(listener)) {
      try { listener(); } catch { /* Consumer failure is isolated. */ }
    }
  }
}

export function subscribeSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function restoreSession() {
  if (import.meta.env.VITE_DEV_SIGN_IN !== 'true') return;
  const raw = sessionStorage.getItem(TOKEN_KEY);
  if (!raw) return;
  try {
    current = JSON.parse(raw) as Session;
  } catch {
    current = null;
  }
}

function decodeJwtPayload(token: string): { sub?: string; role?: string } | null {
  const parts = token.split('.');
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const json = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { sub: json.sub, role: Array.isArray(json.roles) ? json.roles[0] : json.role };
  } catch {
    return null;
  }
}

// Decodes only — never verifies a signature. Real validation happens on
// every backend request; this is purely so the dev sign-in screen can
// read who the pasted token claims to be.
export function signInWithDevToken(token: string): boolean {
  const claims = decodeJwtPayload(token);
  if (!claims?.sub || !claims?.role) return false;
  setSession({ token, sub: claims.sub, role: claims.role });
  return true;
}
