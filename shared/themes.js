// theme.js
const switches = document.querySelectorAll('#theme-switch, #theme-switch-2');

export async function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  switches.forEach(s => s.checked = (theme === 'dark'));
}

export async function initTheme() {
  const { theme } = await chrome.storage.local.get('theme');
  if (theme) return applyTheme(theme);
  const pref = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(pref);
}

export function setupThemeToggle() {
  switches.forEach(sw => {
    sw.addEventListener('change', async () => {
      const t = sw.checked ? 'dark' : 'light';
      await chrome.storage.local.set({ theme: t });
      applyTheme(t);
    });
  });
}