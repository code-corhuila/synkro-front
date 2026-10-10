export interface ApiErrorBody {
  error: string;
  message: string;
  details?: { field: string; message: string }[];
  traceId: string;
}

// Explicit fields rather than `public` constructor parameters: the latter
// are not allowed under tsconfig's `erasableSyntaxOnly`.
export class ApiClientError extends Error {
  readonly status: number;
  readonly body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = 'ApiClientError';
    this.status = status;
    this.body = body;
  }
}

const TIMEOUT_MS = 10_000;

export interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
  query?: Record<string, string | number | boolean | null | undefined>;
  idempotencyKey?: string;
  signal?: AbortSignal;
}

export function createApiClient(
  baseUrl: string,
  getToken: () => string | null,
  onUnauthorized: () => void
) {
  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const correlationId = crypto.randomUUID();
    const token = getToken();

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      if (res.status === 401) {
        onUnauthorized();
      }

      if (!res.ok) {
        const body = await res
          .json()
          .catch(() => ({ error: 'INTERNAL_ERROR', message: 'Unexpected error', traceId: correlationId }));
        throw new ApiClientError(res.status, body);
      }

      if (res.status === 204) return undefined as T;
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new ApiClientError(0, { error: 'TIMEOUT', message: 'Request timed out', traceId: correlationId });
      }
      throw new ApiClientError(0, { error: 'NETWORK_ERROR', message: 'Network error', traceId: correlationId });
    } finally {
      clearTimeout(timer);
    }
  }

  return { request };
}
