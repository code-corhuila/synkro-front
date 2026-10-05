import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createApiClient } from './apiClient';

describe('apiClient', () => {
  let getToken: () => string | null;
  let onUnauthorized: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getToken = () => 'test-token';
    onUnauthorized = vi.fn();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('attaches Authorization and a fresh X-Correlation-Id on every request', async () => {
    (global.fetch as any).mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    await client.request('/api/v1/products');
    await client.request('/api/v1/products');

    const [first, second] = (global.fetch as any).mock.calls;
    expect(first[1].headers['Authorization']).toBe('Bearer test-token');
    expect(first[1].headers['X-Correlation-Id']).toBeTruthy();
    expect(first[1].headers['X-Correlation-Id']).not.toBe(second[1].headers['X-Correlation-Id']);
  });

  it('clears the session when a response is 401', async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(JSON.stringify({ error: 'UNAUTHORIZED', message: 'no', traceId: 'x' }), { status: 401 })
    );
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    await expect(client.request('/api/v1/products')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('surfaces a distinct TIMEOUT error when the request takes too long', async () => {
    vi.useFakeTimers();
    (global.fetch as any).mockImplementation(
      (_url: string, opts: RequestInit) =>
        new Promise((_resolve, reject) => {
          opts.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
    );
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    const promise = client.request('/api/v1/products');
    await vi.advanceTimersByTimeAsync(10_000);

    await expect(promise).rejects.toMatchObject({ status: 0, body: { error: 'TIMEOUT' } });
    vi.useRealTimers();
  });

  it('maps every failed response through one place', async () => {
    (global.fetch as any).mockResolvedValue(
      new Response(
        JSON.stringify({ error: 'BUSINESS_RULE_VIOLATION', message: 'insufficient stock', traceId: 'x' }),
        { status: 422 }
      )
    );
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    await expect(client.request('/api/v1/sales')).rejects.toMatchObject({
      status: 422,
      body: { error: 'BUSINESS_RULE_VIOLATION', message: 'insufficient stock' },
    });
  });
});
