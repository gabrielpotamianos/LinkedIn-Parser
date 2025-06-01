/**
 * Handles theme application, persistence, and toggle setup for light/dark modes.
 */

// DOM References
// Selects all theme toggle input elements by their IDs.
const switches = document.querySelectorAll('#theme-switch, #theme-switch-2');

// Theme Application

/**
 * Applies the specified theme to the document and updates toggle states.
 * @param {string} theme - The theme to apply ('light' or 'dark').
 */
export async function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  switches.forEach(s => s.checked = (theme === 'dark'));
}

/**
 * Initializes the theme by retrieving the stored preference or falling back to system preference.
 * Applies the resolved theme.
 */
export async function initTheme() {
  const { theme } = await chrome.storage.local.get('theme');
  if (theme) return applyTheme(theme);
  const pref = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  applyTheme(pref);
}

// Theme Toggle Event Setup

/**
 * Sets up event listeners on theme toggle inputs to handle user theme changes.
 * Saves the selected theme to storage and applies it.
 */
export function setupThemeToggle() {
  console.log("inside themes.js")
  switches.forEach(sw => {
    sw.addEventListener('change', async () => {
      const t = sw.checked ? 'dark' : 'light';
      await chrome.storage.local.set({ theme: t });
      applyTheme(t);
    });
  });
}