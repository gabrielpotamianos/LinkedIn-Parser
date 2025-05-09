// ui.js

// form selectors (adjust IDs if necessary)
const emailLogin    = document.getElementById('email-login');
const passLogin     = document.getElementById('pass-login');
const loginErr      = document.getElementById('login-error');
const emailRegister = document.getElementById('email-reg');
const passRegister  = document.getElementById('pass-reg');
const passConfirm   = document.getElementById('pass-confirm');
const registerErr   = document.getElementById('register-error');

const tabLogin      = document.getElementById('tab-login');
const tabRegister   = document.getElementById('tab-register');
const formLogin     = document.getElementById('form-login');
const formRegister  = document.getElementById('form-register');

const authSection   = document.getElementById('auth-section');
const appSection    = document.getElementById('app-section');

/** Clear login inputs & errors */
export function clearLoginForm() {
  emailLogin.value = '';
  passLogin.value  = '';
  loginErr.textContent = '';
}

/** Clear register inputs, errors & messages */
export function clearRegisterForm() {
  emailRegister.value = '';
  passRegister.value  = '';
  passConfirm.value   = '';
  registerErr.textContent = '';
  const msg = document.querySelector('.success-message');
  if (msg) msg.remove();
}

/** Show/hide sign-in vs register tabs */
export function setupTabs() {
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');   tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden'); formRegister.classList.add('hidden');
    clearLoginForm(); clearRegisterForm();
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');   tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden'); formLogin.classList.add('hidden');
    clearLoginForm(); clearRegisterForm();
  });
}

/** Toggle auth/app sections based on token existence */
export async function syncAuthUI() {
  const { token } = await chrome.storage.local.get('token');
  if (token) {
    clearLoginForm(); clearRegisterForm();
    authSection.classList.add('hidden'); appSection.classList.remove('hidden');
  } else {
    authSection.classList.remove('hidden'); appSection.classList.add('hidden');
  }
}

/** Show a dynamic success message under a button */
export function showSuccessMessage(button, text) {
  const msg = document.createElement('div');
  msg.className = 'success-message';
  msg.textContent = text;
  button.insertAdjacentElement('afterend', msg);
  return msg;
}

/**
 * Toggle Parse button visibility based on active tab URL
 */
export async function updateParseVisibility(runBtn) {
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