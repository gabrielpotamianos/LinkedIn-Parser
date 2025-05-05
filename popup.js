// popup.js
import * as val   from './validation.js';
import * as api   from './api.js';
import * as theme from './themes.js';
import * as ui    from './ui.js';

// Buttons & forms
const loginBtn    = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn   = document.getElementById('logout-btn');
const runBtn      = document.getElementById('run-btn');
const emailLogin  = document.getElementById('email-login');
const emailReg    = document.getElementById('email-reg');
const passLogin   = document.getElementById('pass-login');
const passReg     = document.getElementById('pass-reg');
const passConf    = document.getElementById('pass-confirm');
const loginErr    = document.getElementById('login-error');
const regErr      = document.getElementById('register-error');

// Initialize submodules
theme.initTheme();
theme.setupThemeToggle();
ui.setupTabs();
ui.syncAuthUI();

// Enter key binding for forms
document.getElementById('form-login')   
  .addEventListener('keydown', e => e.key==='Enter' && (e.preventDefault(), loginBtn.click()));
document.getElementById('form-register')
  .addEventListener('keydown', e => e.key==='Enter' && (e.preventDefault(), registerBtn.click()));

// LOGIN flow
loginBtn.addEventListener('click', async () => {
  loginErr.textContent = '';
  const email = emailLogin.value.trim();
  const pwd   = passLogin.value;

  // Validation chain
  if (!val.isValidEmail(email)) return loginErr.textContent = 'Invalid email format';
  const dom = email.split('@')[1].toLowerCase();
  if (!dom.includes('.') || val.isDisposableTLD(dom)) return loginErr.textContent = 'Invalid domain';
  loginBtn.disabled = true;

  // API call
  try {
    const { token, userId } = await api.login(email, pwd);
    await chrome.storage.local.set({ token, userId });
    ui.syncAuthUI();
  } catch (err) {
    loginErr.textContent = err.message;
  } finally {
    loginBtn.disabled = false;
  }
});

// REGISTER flow
registerBtn.addEventListener('click', async () => {
  regErr.textContent = '';
  const email = emailReg.value.trim();
  const pwd   = passReg.value;
  const cf    = passConf.value;

  if (!val.isValidEmail(email)) return regErr.textContent = 'Invalid email format';
  const dom = email.split('@')[1].toLowerCase();
  if (!dom.includes('.') || val.isDisposableTLD(dom)) return regErr.textContent = 'Invalid domain';

  registerBtn.disabled = true;
  if (!await val.hasMXRecord(dom)) {
    registerBtn.disabled = false;
    return regErr.textContent = 'Domain not accepting mail';
  }
  if (!val.isStrongPassword(pwd)) {
    registerBtn.disabled = false;
    return regErr.textContent = 'Password must be 8–64 chars, upper/lower, digit & special';
  }
  if (pwd !== cf) {
    registerBtn.disabled = false;
    return regErr.textContent = 'Passwords do not match';
  }

  try {
    await api.register(email, pwd);
    const msg = ui.showSuccessMessage(registerBtn, 'Registered! Redirecting…');
    setTimeout(() => {
      msg.remove(); ui.clearRegisterForm(); ui.setupTabs();
      document.getElementById('tab-login').click();
      emailLogin.value = email;
      ui.syncAuthUI();
    }, 1500);
  } catch (err) {
    regErr.textContent = err.message;
  } finally {
    registerBtn.disabled = false;
  }
});

// LOGOUT
logoutBtn.addEventListener('click', async () => {
  await chrome.storage.local.remove(['token','userId']);
  ui.clearLoginForm(); ui.clearRegisterForm(); ui.syncAuthUI();
});

// RUN & SCRAPE
runBtn.addEventListener('click', () =>
  chrome.tabs.query({ active:true,currentWindow:true }, tabs =>
    chrome.scripting.executeScript({ target:{ tabId: tabs[0].id }, files:['content.js'] })
  )
);

// HANDLE PARSED DATA
chrome.runtime.onMessage.addListener(async msg => {
  if (msg.type === 'PARSED_DATA') {
    const { token, userId } = await chrome.storage.local.get(['token','userId']);
    try {
      await api.saveProfile(token, userId, msg.data);
      console.log('Profile saved');
    } catch (e) {
      console.error(e);
    }
  }
});