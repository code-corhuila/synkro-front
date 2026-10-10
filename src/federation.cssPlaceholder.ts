// Vite 8's minifier writes string literals as template literals, and
// @originjs/vite-plugin-federation only rewrites `__v__css__…` placeholders
// wrapped in ' or ". Left alone, the remote entry passes a bare string where
// dynamicLoadingCss expects a list of stylesheets and every exposed module
// throws. The host's exposed modules carry no CSS, so an empty list is exact.
export function resolveCssPlaceholders(code: string): string {
  return code.replace(/`__v__css__[^`]*`/g, '[]');
}
