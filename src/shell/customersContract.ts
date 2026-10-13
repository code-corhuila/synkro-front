import { apiClient } from './apiClient';
import { session } from './session';
import type { ShellContract } from './shell-contract';

export function customersContract(navigate: (path: string) => void): ShellContract {
  return {
    contractVersion: 1,
    basePath: '/customers',
    api: {
      request(method, path, options) {
        if (!path.startsWith('/api/v1/') || path.includes('://')) {
          return Promise.reject(new Error('Expected a relative API path'));
        }
        return apiClient.request(path, { ...options, method });
      },
    },
    session: {
      user() {
        const user = session.user();
        if (!user || !['ADMIN', 'SALESPERSON', 'INVENTORY'].includes(user.role)) return null;
        return { sub: user.sub, role: user.role as 'ADMIN' | 'SALESPERSON' | 'INVENTORY' };
      },
    },
    navigate(path) {
      if (path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')) navigate(path);
    },
  };
}
