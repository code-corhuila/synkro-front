import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { createApiClient } from './apiClient';

// A Response body is a one-shot stream, so every fetch call gets a fresh one.
function respondWith(body: unknown, status: number) {
  return () => Promise.resolve(new Response(JSON.stringify(body), { status }));
}

describe('apiClient', () => {
  let getToken: () => string | null;
  let onUnauthorized: Mock<() => void>;
  let fetchMock: Mock<typeof fetch>;

  beforeEach(() => {
    getToken = () => 'test-token';
    onUnauthorized = vi.fn();
    fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('attaches Authorization and a fresh X-Correlation-Id on every request', async () => {
    fetchMock.mockImplementation(respondWith({ ok: true }, 200));
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    await client.request('/api/v1/products');
    await client.request('/api/v1/products');

    const [first, second] = fetchMock.mock.calls.map(
      ([, init]) => init?.headers as Record<string, string>
    );
    expect(first['Authorization']).toBe('Bearer test-token');
    expect(first['X-Correlation-Id']).toBeTruthy();
    expect(first['X-Correlation-Id']).not.toBe(second['X-Correlation-Id']);
  });

  it('clears the session when a response is 401', async () => {
    fetchMock.mockImplementation(respondWith({ error: 'UNAUTHORIZED', message: 'no', traceId: 'x' }, 401));
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    await expect(client.request('/api/v1/products')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it('surfaces a distinct TIMEOUT error when the request takes too long', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        })
    );
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    // Attach the rejection handler before advancing time; otherwise the
    // promise rejects mid-advance with no handler and Vitest flags it as
    // an unhandled rejection.
    const assertion = expect(client.request('/api/v1/products')).rejects.toMatchObject({
      status: 0,
      body: { error: 'TIMEOUT' },
    });
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;
  });

  it('maps every failed response through one place', async () => {
    fetchMock.mockImplementation(
      respondWith({ error: 'BUSINESS_RULE_VIOLATION', message: 'insufficient stock', traceId: 'x' }, 422)
    );
    const client = createApiClient('http://gateway', getToken, onUnauthorized);

    await expect(client.request('/api/v1/sales')).rejects.toMatchObject({
      status: 422,
      body: { error: 'BUSINESS_RULE_VIOLATION', message: 'insufficient stock' },
    });
  });
});
