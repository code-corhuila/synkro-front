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
  let failures = 0;
  return async () => {
    const url = entryUrl();
    const attemptUrl = failures ? `${url}${url.includes('?') ? '&' : '?'}synkroRetry=${failures}` : url;
    let phase = 'entry import';
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error(phase === 'entry import' ? `<${tagName}> entry import timed out after ${timeoutMs}ms` : `<${tagName}> was never defined after ${timeoutMs}ms`)),
        timeoutMs
      );
    });
    try {
      await Promise.race([
        importEntry(attemptUrl).then(async () => {phase = 'registration'; await customElements.whenDefined(tagName);}),
        timeout,
      ]);
    } catch (error) {
      failures++;
      throw error;
    } finally {
      clearTimeout(timer);
    }
    return tagName;
  };
}

// Stable (unhashed) entry filename, served uncached by the portal (ADR-011).
// Coordinated same-origin delivery, including local Compose.
export function customersPortalEntryUrl(): string {
  return import.meta.env.VITE_CUSTOMERS_PORTAL_ENTRY || '/remotes/customers/remoteEntry.js';
}
