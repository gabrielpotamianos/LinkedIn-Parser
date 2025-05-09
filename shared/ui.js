/**
 * Module for managing authentication UI state and interactions,
 * including form input handling, tab navigation, authentication state syncing,
 * feedback messages, and dynamic UI element visibility.
 */

 // Element References
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

 // Utility Functions

/**
 * Clears the login form inputs and error messages.
 */
export function clearLoginForm() {
  emailLogin.value = '';
  passLogin.value = '';
  loginErr.textContent = '';
}

/**
 * Clears the register form inputs, error messages, and any success messages.
 */
export function clearRegisterForm() {
  emailRegister.value = '';
  passRegister.value = '';
  passConfirm.value = '';
  registerErr.textContent = '';
  const msg = document.querySelector('.success-message');
  if (msg) msg.remove();
}

 // Tab Navigation

/**
 * Sets up event listeners for the login and register tabs to toggle visibility
 * and clear form inputs and errors when switching tabs.
 */
export function setupTabs() {
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    formLogin.classList.remove('hidden');
    formRegister.classList.add('hidden');
    clearLoginForm();
    clearRegisterForm();
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    formRegister.classList.remove('hidden');
    formLogin.classList.add('hidden');
    clearLoginForm();
    clearRegisterForm();
  });
}

 // Authentication UI Sync

/**
 * Synchronizes the authentication UI based on the presence of an authentication token.
 * Shows the app section if authenticated, otherwise shows the auth section.
 * Clears form inputs and errors when switching.
 * @returns {Promise<void>}
 */
export async function syncAuthUI() {
  const { token } = await chrome.storage.local.get('token');
  if (token) {
    clearLoginForm();
    clearRegisterForm();
    authSection.classList.add('hidden');
    appSection.classList.remove('hidden');
  } else {
    authSection.classList.remove('hidden');
    appSection.classList.add('hidden');
  }
}

 // Feedback Messages

/**
 * Displays a dynamic success message immediately after a specified button element.
 * @param {HTMLElement} button - The button element after which the message will be inserted.
 * @param {string} text - The success message text to display.
 * @returns {HTMLElement} The created success message element.
 */
export function showSuccessMessage(button, text) {
  const msg = document.createElement('div');
  msg.className = 'success-message';
  msg.textContent = text;
  button.insertAdjacentElement('afterend', msg);
  return msg;
}

 // Parse Button Visibility

/**
 * Updates the visibility of the Parse button based on whether the active tab URL
 * matches a LinkedIn profile URL pattern.
 * @param {HTMLElement} runBtn - The Parse button element to show or hide.
 * @returns {Promise<void>}
 */
export async function updateParseButtonVisibility(runBtn) {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url || '';
  let isProfile = false;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    isProfile = (host === 'www.linkedin.com' || host === 'linkedin.com') && u.pathname.startsWith('/in/');
  } catch {
    // invalid URL
  }
  runBtn.style.display = isProfile ? 'inline-block' : 'none';
}