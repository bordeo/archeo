(function exposeSettings(global) {
  const DEFAULT_SWITCHER_LIMIT = 10;
  const MIN_SWITCHER_LIMIT = 2;
  const MAX_SWITCHER_LIMIT = 10;

  function normalizeSwitcherLimit(value) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) return DEFAULT_SWITCHER_LIMIT;
    return Math.min(MAX_SWITCHER_LIMIT, Math.max(MIN_SWITCHER_LIMIT, parsed));
  }

  global.ArcheoSettings = {
    DEFAULT_SWITCHER_LIMIT,
    MIN_SWITCHER_LIMIT,
    MAX_SWITCHER_LIMIT,
    normalizeSwitcherLimit
  };
})(globalThis);
