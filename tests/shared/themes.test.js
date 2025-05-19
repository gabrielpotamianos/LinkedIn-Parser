import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Reusable HTML for the theme toggle component
const THEME_TOGGLE_HTML = `
  <div class="theme-toggle">
    <span>🌙</span>
    <input type="checkbox" id="theme-switch" />
  </div>
`;

describe('shared/themes.js', () => {
  describe('applyTheme()', () => {
    let applyTheme, toggle;

    beforeEach(async () => {
      jest.resetModules();
      document.body.innerHTML = THEME_TOGGLE_HTML;
      const themes = await import('../../shared/themes.js');
      applyTheme = themes.applyTheme;
      toggle = document.getElementById('theme-switch');
    });

    test('sets data-theme and checks toggle for dark', () => {
      applyTheme('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
      expect(toggle.checked).toBe(true);
    });

    test('sets data-theme and unchecks toggle for light', () => {
      applyTheme('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
      expect(toggle.checked).toBe(false);
    });
  });

  describe('initTheme()', () => {
    let initTheme;

    beforeEach(async () => {
      jest.resetModules();
      document.body.innerHTML = THEME_TOGGLE_HTML;
      global.chrome = {
        storage: { local: { get: jest.fn() } }
      };
      window.matchMedia = jest.fn();
      const themes = await import('../../shared/themes.js');
      initTheme = themes.initTheme;
    });

    test('uses stored theme when present', async () => {
      global.chrome.storage.local.get.mockResolvedValue({ theme: 'dark' });
      await initTheme();
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    test('falls back to system preference when no stored theme', async () => {
      global.chrome.storage.local.get.mockResolvedValue({ theme: undefined });
      window.matchMedia.mockReturnValue({ matches: true });
      await initTheme();
      expect(window.matchMedia).toHaveBeenCalledWith('(prefers-color-scheme: light)');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });
  });

  describe('setupThemeToggle()', () => {
    let setupThemeToggle, toggle;

    beforeEach(async () => {
      jest.resetModules();
      document.body.innerHTML = THEME_TOGGLE_HTML;
      toggle = document.getElementById('theme-switch');
      global.chrome = {
        storage: { local: { set: jest.fn() } }
      };
      const themes = await import('../../shared/themes.js');
      setupThemeToggle = themes.setupThemeToggle;
    });

    test('change event saves theme and applies it', async () => {
      setupThemeToggle();
      toggle.checked = true;
      toggle.dispatchEvent(new Event('change'));
      await Promise.resolve();
      expect(global.chrome.storage.local.set).toHaveBeenCalledWith({ theme: 'dark' });
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });
  });
});
