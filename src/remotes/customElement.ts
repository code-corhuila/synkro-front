interface CustomElementPortal {
  tagName: string;
  // Read when the portal loads, not at module load, so the environment is known.
  entryUrl: () => string;
  timeoutMs?: number;
  importEntry?: (url: string) => Promise<unknown>;
}

// The Angular portal's mounting mechanism (_stacks/frontend.md, ADR-011
// Decision 2): import its stable entry file, which defines the custom
// element, then wait for the definition. whenDefined() never rejects on its
// own, so the wait is bounded: a bundle that loads but never registers the
// element must reach RemoteBoundary as a failure, not hang forever.
export function loadCustomElement({
  tagName,
  entryUrl,
  timeoutMs = 5000,
  importEntry = (url) => import(/* @vite-ignore */ url),
}: CustomElementPortal): () => Promise<string> {
  return async () => {
    await importEntry(entryUrl());

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(`<${tagName}> was never defined after ${timeoutMs}ms`)),
        timeoutMs
      );
    });
    try {
      await Promise.race([customElements.whenDefined(tagName), timeout]);
    } finally {
      clearTimeout(timer);
    }
    return tagName;
  };
}

// Stable (unhashed) entry filename, served uncached by the portal (ADR-011).
// The default is a local placeholder until the real portal exists.
export function customersPortalEntryUrl(): string {
  return import.meta.env.VITE_CUSTOMERS_PORTAL_ENTRY || 'http://localhost:5177/remoteEntry.js';
}
