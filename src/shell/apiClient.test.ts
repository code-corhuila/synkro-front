import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from '../core/http/api';
import { ApiClientError } from '../core/http/apiClient';
import { apiClient } from './apiClient';

vi.mock('../core/http/api', () => ({ api: { request: vi.fn() } }));

const requestMock = vi.mocked(api.request);

describe('shell/apiClient facade', () => {
  beforeEach(() => {
    requestMock.mockReset();
  });

  it('delegates to the single client with the same path, method, body and headers', async () => {
    requestMock.mockResolvedValue({ id: 1 });
    const options = { method: 'POST', body: { name: 'pen' }, headers: { 'X-Test': '1' } };

    const result = await apiClient.request('/api/v1/products', options);

    expect(result).toEqual({ id: 1 });
    expect(requestMock).toHaveBeenCalledOnce();
    expect(requestMock).toHaveBeenCalledWith('/api/v1/products', options);
  });

  it('delegates a request without options', async () => {
    requestMock.mockResolvedValue([]);

    await apiClient.request('/api/v1/products');

    expect(requestMock).toHaveBeenCalledWith('/api/v1/products', undefined);
  });

  it('passes query, idempotencyKey and signal through unchanged', async () => {
    requestMock.mockResolvedValue({ id: 2 });
    const caller = new AbortController();
    const options = {
      method: 'POST',
      query: { notify: true, page: 1 },
      idempotencyKey: 'sale-1:step-1',
      signal: caller.signal,
    };

    await apiClient.request('/api/v1/sales', options);

    const [path, passed] = requestMock.mock.calls[0];
    expect(path).toBe('/api/v1/sales');
    expect(passed?.query).toEqual({ notify: true, page: 1 });
    expect(passed?.idempotencyKey).toBe('sale-1:step-1');
    expect(passed?.signal).toBe(caller.signal);
  });

  it('rethrows the very same error the client raised', async () => {
    const error = new ApiClientError(404, { error: 'NOT_FOUND', message: 'No such product', traceId: 't' });
    requestMock.mockRejectedValue(error);

    await expect(apiClient.request('/api/v1/products/9')).rejects.toBe(error);
  });

  it('exposes only request', () => {
    expect(Object.keys(apiClient)).toEqual(['request']);
  });
});
