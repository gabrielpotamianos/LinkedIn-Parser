// popup.js
import * as val    from './validation.js';
import * as api    from './api.js';
import * as themes from './themes.js';
import * as ui     from './ui.js';

// Cached element refs
const loginBtn    = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn   = document.getElementById('logout-btn');
const runBtn      = document.getElementById('run-btn');
const emailLogin  = document.getElementById('email-login');
const passLogin   = document.getElementById('pass-login');
const loginErr    = document.getElementById('login-error');
const emailReg    = document.getElementById('email-reg');
const passReg     = document.getElementById('pass-reg');
const passConf    = document.getElementById('pass-confirm');
const registerErr = document.getElementById('register-error');

/**
 * Toggle Parse button visibility based on active tab URL
 */
async function updateParseVisibility() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  let isProfile = false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    isProfile = (host === 'www.linkedin.com' || host === 'linkedin.com')
                && u.pathname.startsWith('/in/');
  } catch {
    // invalid URL
  }
  runBtn.style.display = isProfile ? 'inline-block' : 'none';
}

/**
 * Set up all event handlers and initial UI state
 */
async function initPopup() {
  // Theme and tabs
  await themes.initTheme();
  themes.setupThemeToggle();
  ui.setupTabs();
  await ui.syncAuthUI();
  updateParseVisibility();

  // Enter key binding
  document.getElementById('form-login')
    .addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); loginBtn.click(); }});
  document.getElementById('form-register')
    .addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); registerBtn.click(); }});

  // LOGIN handler
  loginBtn.addEventListener('click', async () => {
    loginErr.textContent = '';
    const email = emailLogin.value.trim();
    const pwd   = passLogin.value;

    if (!val.isValidEmail(email)) {
      loginErr.textContent = 'Invalid email format';
      return;
    }
    const domain = email.split('@')[1]?.toLowerCase() || '';
    if (!domain.includes('.') || val.isDisposableTLD(domain)) {
      loginErr.textContent = 'Invalid email domain';
      return;
    }

    loginBtn.disabled = true;
    try {
      const { token, userId } = await api.login(email, pwd);
      await chrome.storage.local.set({ token, userId });
      await ui.syncAuthUI();
      updateParseVisibility();
    } catch (err) {
      loginErr.textContent = err.message;
    } finally {
      loginBtn.disabled = false;
    }
  });

  // REGISTER handler
  registerBtn.addEventListener('click', async () => {
    registerErr.textContent = '';
    const email = emailReg.value.trim();
    const pwd   = passReg.value;
    const cf    = passConf.value;

    if (!val.isValidEmail(email)) {
      registerErr.textContent = 'Invalid email format';
      return;
    }
    const domain = email.split('@')[1]?.toLowerCase() || '';
    if (!domain.includes('.') || val.isDisposableTLD(domain)) {
      registerErr.textContent = 'Invalid email domain';
      return;
    }

    registerBtn.disabled = true;
    try {
      if (!await val.hasMXRecord(domain)) throw new Error('Email domain not accepting mail');
      if (!val.isStrongPassword(pwd)) throw new Error('Weak password');
      if (pwd !== cf) throw new Error('Passwords do not match');

      await api.register(email, pwd);
      const msg = ui.showSuccessMessage(registerBtn, 'Registered! Redirecting…');
      setTimeout(async () => {
        msg.remove();
        ui.clearRegisterForm();
        document.getElementById('tab-login').click();
        emailLogin.value = email;
        await ui.syncAuthUI();
        updateParseVisibility();
      }, 1500);
    } catch (err) {
      registerErr.textContent = err.message;
    } finally {
      registerBtn.disabled = false;
    }
  });

  // LOGOUT handler
  logoutBtn.addEventListener('click', async () => {
    await chrome.storage.local.remove(['token','userId']);
    ui.clearLoginForm();
    ui.clearRegisterForm();
    await ui.syncAuthUI();
    updateParseVisibility();
  });

  // PARSE handler
  runBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      chrome.scripting.executeScript({ target: { tabId: tabs[0].id }, files: ['content.js'] });
    });
  });

  // HANDLE PARSED DATA
  chrome.runtime.onMessage.addListener(async msg => {
    if (msg.type === 'PARSED_DATA') {
      const { token, userId } = await chrome.storage.local.get(['token','userId']);
      try {
        await api.saveProfile(token, userId, msg.data);
        console.log('Profile saved');
      } catch (e) {
        console.error('Error saving profile:', e);
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', initPopup);
