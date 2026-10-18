import { getSession } from '../core/auth/session';

export interface ShellUser {
  sub: string;
  role: string;
}

// Exposed to remotes as `shell/session`. Identity only: the user is rebuilt
// field by field on every call, so neither the token nor the live session
// object is reachable from here.
export const session = {
  user(): ShellUser | null {
    const current = getSession();
    return current ? { sub: current.sub, role: current.role } : null;
  },
};
