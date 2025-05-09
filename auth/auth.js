// auth.js
import * as val    from '../shared/validation.js';
import * as api    from '../shared/api.js';
import * as themes from '../shared/themes.js';
import * as ui     from '../shared/ui.js';

const loginButton    = document.getElementById('login-btn');
const registerButton = document.getElementById('register-btn');
const logoutButton   = document.getElementById('logout-btn');
const parseButton    = document.getElementById('run-btn');
const emailInput     = document.getElementById('email-login');
const passwordInput  = document.getElementById('pass-login');
const loginError     = document.getElementById('login-error');
const regEmailInput  = document.getElementById('email-reg');
const regPassword    = document.getElementById('pass-reg');
const regConfirm     = document.getElementById('pass-confirm');
const registerError  = document.getElementById('register-error');

async function initPopup() {
  try {
    const { profileData } = await chrome.storage.local.get('profileData');
    if (profileData) {
      window.location.href = chrome.runtime.getURL('../profile/profile.html');
      return;
    }
  } catch (e) {
    console.error('Failed to load stored profileData', e);
  }

  await themes.initTheme();
  themes.setupThemeToggle();
  ui.setupTabs();
  await ui.syncAuthUI();
  await ui.updateParseVisibility(parseButton);

  document.getElementById('form-login').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      loginButton.click();
    }
  });

  document.getElementById('form-register').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      e.preventDefault();
      registerButton.click();
    }
  });

  loginButton.addEventListener('click', async () => {
    loginError.textContent = '';
    const email = emailInput.value.trim();
    const pwd   = passwordInput.value;

    if (!val.isValidEmail(email)) {
      loginError.textContent = 'Invalid email format';
      return;
    }

    const domain = email.split('@')[1]?.toLowerCase() || '';
    if (!domain.includes('.') || val.isDisposableTLD(domain)) {
      loginError.textContent = 'Invalid email domain';
      return;
    }

    loginButton.disabled = true;
    try {
      const { token, userId } = await api.login(email, pwd);
      await chrome.storage.local.set({ token, userId });
      await ui.syncAuthUI();
      await ui.updateParseButtonVisibility(parseButton);
    } catch (err) {
      loginError.textContent = err.message;
    } finally {
      loginButton.disabled = false;
    }
  });

  registerButton.addEventListener('click', async () => {
    registerError.textContent = '';
    const email = regEmailInput.value.trim();
    const pwd   = regPassword.value;
    const cf    = regConfirm.value;

    if (!val.isValidEmail(email)) {
      registerError.textContent = 'Invalid email format';
      return;
    }

    const domain = email.split('@')[1]?.toLowerCase() || '';
    if (!domain.includes('.') || val.isDisposableTLD(domain)) {
      registerError.textContent = 'Invalid email domain';
      return;
    }

    registerButton.disabled = true;
    try {
      if (!await val.hasMXRecord(domain)) throw new Error('Email domain not accepting mail');
      if (!val.isStrongPassword(pwd)) throw new Error('Weak password');
      if (pwd !== cf) throw new Error('Passwords do not match');

      await api.register(email, pwd);
      const msg = ui.showSuccessMessage(registerButton, 'Registered! Redirecting…');
      setTimeout(async () => {
        msg.remove();
        ui.clearRegisterForm();
        document.getElementById('tab-login').click();
        emailInput.value = email;
        await ui.syncAuthUI();
        await ui.updateParseButtonVisibility(parseButton);
      }, 1500);
    } catch (err) {
      registerError.textContent = err.message;
    } finally {
      registerButton.disabled = false;
    }
  });

  logoutButton.addEventListener('click', async () => {
    await chrome.storage.local.remove(['token', 'userId']);
    ui.clearLoginForm();
    ui.clearRegisterForm();
    await ui.syncAuthUI();
    await ui.updateParseButtonVisibility(parseButton);
  });

  parseButton.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] });
      window.location.href = chrome.runtime.getURL('../profile/profile.html');
    });
  });

  chrome.runtime.onMessage.addListener(async msg => {
    if (msg.type === 'PARSED_DATA') {
      const profile = msg.data;
      console.log('Parsed profile received:', profile);
    }
  });
}

document.addEventListener('DOMContentLoaded', initPopup);
