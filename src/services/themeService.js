const themes = new Set(['light', 'dark', 'system']);

export function createThemeService(storage = globalThis.localStorage) {
  let theme = 'system';
  try {
    const saved = storage?.getItem('mkbot-theme');
    if (themes.has(saved)) theme = saved;
  } catch {
    // System theme is the default when storage cannot be read.
  }

  return {
    get theme() {
      return theme;
    },
    setTheme(value) {
      if (!themes.has(value)) return false;
      theme = value;
      try {
        storage?.setItem('mkbot-theme', theme);
      } catch {
        // Keep the selected appearance until this page closes.
      }
      return true;
    },
  };
}