import { api } from '../core/http/api';
import type { RequestOptions } from '../core/http/apiClient';

// Exposed to remotes as `shell/apiClient`. A facade over the app's single
// client: it adds nothing, so the 401 handling, timeout and error shape stay
// where they are. The token never crosses this boundary — the client attaches it.
export const apiClient = {
  request<T>(path: string, options?: RequestOptions): Promise<T> {
    return api.request<T>(path, options);
  },
};
