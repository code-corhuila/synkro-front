/* Applies the saved theme before first paint. A classic script in <head>: it
   must not be a module (modules are deferred) and must never throw. It mirrors
   src/theme/themePreference.ts; the key and the three values are the contract. */
(function () {
  var theme = 'light';
  try {
    var stored = null;
    try {
      stored = window.localStorage.getItem('synkro.theme-preference');
    } catch {}
    var preference = stored === 'light' || stored === 'dark' ? stored : 'system';
    var dark = false;
    try {
      dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {}
    theme = preference === 'system' ? (dark ? 'dark' : 'light') : preference;
    document.documentElement.dataset.themePreference = preference;
  } catch {}
  document.documentElement.dataset.theme = theme;
})();
