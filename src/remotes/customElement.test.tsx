import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { customersPortalEntryUrl, loadCustomElement } from './customElement';
import { PortalOutlet } from './PortalOutlet';

// customElements is one registry per jsdom window, so every test defines
// its own tag.
let n = 0;
const uniqueTag = () => `fake-portal-${++n}`;
const defineTag = (tag: string) => customElements.define(tag, class extends HTMLElement {});

describe('loadCustomElement', () => {
  afterEach(() => vi.useRealTimers());

  it('imports the entry file first, then resolves with the tag once the bundle defines it', async () => {
    const tag = uniqueTag();
    const calls: string[] = [];
    const importEntry = vi.fn(async (url: string) => {
      calls.push(`import ${url}`);
      defineTag(tag); // what the Angular bundle does when it loads
    });

    const load = loadCustomElement({ tagName: tag, entryUrl: () => 'http://portal/remoteEntry.js', importEntry });

    await expect(load()).resolves.toBe(tag);
    expect(calls).toEqual(['import http://portal/remoteEntry.js']);
  });

  it('rejects when the entry file fails to load', async () => {
    const load = loadCustomElement({
      tagName: uniqueTag(),
      entryUrl: () => 'http://portal/remoteEntry.js',
      importEntry: () => Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
    });
    await expect(load()).rejects.toThrow(/failed to fetch/i);
  });

  it('rejects after 5 seconds by default when the element is never defined', async () => {
    vi.useFakeTimers();
    const tag = uniqueTag();
    const load = loadCustomElement({ tagName: tag, entryUrl: () => 'x', importEntry: async () => {} });

    let settled: 'pending' | 'rejected' = 'pending';
    const result = load().catch((error: Error) => {
      settled = 'rejected';
      return error;
    });

    await vi.advanceTimersByTimeAsync(4999);
    expect(settled).toBe('pending');
    await vi.advanceTimersByTimeAsync(1);
    expect(settled).toBe('rejected');
    expect(((await result) as Error).message).toMatch(new RegExp(`${tag}.*never defined`));
  });

  it('shows the RemoteBoundary notice instead of hanging when the element is never defined', async () => {
    render(
      <PortalOutlet
        portal={{
          name: 'customers',
          kind: 'custom-element',
          routePrefixes: ['/customers'],
          load: loadCustomElement({
            tagName: uniqueTag(),
            entryUrl: () => 'x',
            importEntry: async () => {}, // the file loads but never registers the element
            timeoutMs: 50,
          }),
        }}
      />
    );
    expect(await screen.findByText(/customers.*not available/i)).toBeInTheDocument();
  });
});

describe('customersPortalEntryUrl', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('reads the stable entry file URL from VITE_CUSTOMERS_PORTAL_ENTRY', () => {
    vi.stubEnv('VITE_CUSTOMERS_PORTAL_ENTRY', 'https://customers.example/remoteEntry.js');
    expect(customersPortalEntryUrl()).toBe('https://customers.example/remoteEntry.js');
  });

  it('falls back to a stable, unhashed local entry file', () => {
    vi.stubEnv('VITE_CUSTOMERS_PORTAL_ENTRY', '');
    expect(customersPortalEntryUrl()).toBe('http://localhost:5177/remoteEntry.js');
  });
});
