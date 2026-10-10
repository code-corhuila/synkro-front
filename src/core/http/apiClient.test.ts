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

  describe('query parameters', () => {
    beforeEach(() => {
      fetchMock.mockImplementation(respondWith({ ok: true }, 200));
    });

    const requestedUrl = () => fetchMock.mock.calls[0][0];

    it('appends the query to the path, keys in insertion order', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/products', { query: { page: 1, limit: 20, name: 'mouse' } });

      expect(requestedUrl()).toBe('http://gateway/api/v1/products?page=1&limit=20&name=mouse');
    });

    it('encodes keys and values', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/products', { query: { 'a b': 'x&y=z', q: 'é' } });

      expect(requestedUrl()).toBe('http://gateway/api/v1/products?a%20b=x%26y%3Dz&q=%C3%A9');
    });

    it('skips undefined and null values', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/products', {
        query: { page: 1, name: undefined, brand: null, active: undefined },
      });

      expect(requestedUrl()).toBe('http://gateway/api/v1/products?page=1');
    });

    it('sends booleans as true and false, including false', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/products', { query: { active: true, archived: false } });

      expect(requestedUrl()).toBe('http://gateway/api/v1/products?active=true&archived=false');
    });

    it('appends with & when the path already has a query', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/products?sort=name', { query: { page: 2 } });

      expect(requestedUrl()).toBe('http://gateway/api/v1/products?sort=name&page=2');
    });

    it('adds no question mark when no query is given or every value is skipped', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/products');
      await client.request('/api/v1/products', { query: { page: undefined, name: null } });

      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        'http://gateway/api/v1/products',
        'http://gateway/api/v1/products',
      ]);
    });
  });

  describe('idempotency key', () => {
    beforeEach(() => {
      fetchMock.mockImplementation(respondWith({ ok: true }, 200));
    });

    const sentHeaders = (call = 0) => fetchMock.mock.calls[call][1]?.headers as Record<string, string>;
    const headerNames = (call = 0) => Object.keys(sentHeaders(call)).map((name) => name.toLowerCase());

    it('sends the key as the Idempotency-Key header with the exact value', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/sales', { method: 'POST', body: {}, idempotencyKey: 'sale-7f3:step-2' });

      expect(sentHeaders()['Idempotency-Key']).toBe('sale-7f3:step-2');
    });

    it('sends no Idempotency-Key header when no key is given', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/sales', { method: 'POST', body: {} });

      expect(headerNames()).not.toContain('idempotency-key');
    });

    it('never invents a key: two calls without one send none', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);

      await client.request('/api/v1/sales', { method: 'POST', body: {} });
      await client.request('/api/v1/sales', { method: 'POST', body: {} });

      expect(headerNames(0)).not.toContain('idempotency-key');
      expect(headerNames(1)).not.toContain('idempotency-key');
    });

    it('a retry with the same key sends the same header value', async () => {
      const client = createApiClient('http://gateway', getToken, onUnauthorized);
      const options = { method: 'POST', body: {}, idempotencyKey: 'sale-7f3:step-2' };

      await client.request('/api/v1/sales', options);
      await client.request('/api/v1/sales', options);

      expect(sentHeaders(0)['Idempotency-Key']).toBe('sale-7f3:step-2');
      expect(sentHeaders(1)['Idempotency-Key']).toBe('sale-7f3:step-2');
    });
  });
});
