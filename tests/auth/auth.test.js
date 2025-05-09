/**
 * @jest-environment jsdom
 */

const jestChrome = require('jest-chrome');
global.chrome = {
  storage: { local: { set: jest.fn((obj, cb) => cb && cb()), remove: jest.fn() } },
  runtime: { sendMessage: jest.fn() },
  tabs: { query: jest.fn((opts, cb) => cb([{ id: 42 }])) },
  scripting: { executeScript: jest.fn() },
  runtime: { getURL: jest.fn((path) => `chrome-extension://extension-id/${path}`), sendMessage: jest.fn() },
};

const val = require('../../shared/validation.js');
const api = require('../../shared/api.js');
const ui = require('../../shared/ui.js');
const themes = require('../../shared/themes.js');
const {
  extractDomain,
  disableButton,
  enableButton,
  saveCredentials,
  handleRegistrationSuccess,
  setupEventHandlers,
} = require('../auth/auth.js');

jest.useFakeTimers();
const flushPromises = () => new Promise(setImmediate);

describe('Auth Helpers', () => {
  test('extractDomain returns lowercase domain', () => {
    expect(extractDomain('USER@Example.COM')).toBe('example.com');
    expect(extractDomain('no-at-sign')).toBe('');
    expect(extractDomain('')).toBe('');
  });

  test('disableButton and enableButton toggle disabled', () => {
    const btn = document.createElement('button');
    btn.disabled = false;
    disableButton(btn);
    expect(btn.disabled).toBe(true);
    enableButton(btn);
    expect(btn.disabled).toBe(false);
  });

  test('saveCredentials calls chrome.storage.local.set', async () => {
    await saveCredentials('tok', 'id');
    expect(global.chrome.storage.local.set).toHaveBeenCalledWith(
      { token: 'tok', userId: 'id' },
      expect.any(Function)
    );
  });
});

describe('Login Validation', () => {
  let loginButton, emailInput, passInput, loginError;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="form-login"><input id="email-login"/><input id="pass-login"/><button id="login-btn"></button><div id="login-error"></div></form>
    `;
    loginButton = document.getElementById('login-btn');
    emailInput = document.getElementById('email-login');
    passInput = document.getElementById('pass-login');
    loginError = document.getElementById('login-error');
    setupEventHandlers();
  });

  test('shows error for invalid email format', async () => {
    jest.spyOn(val, 'isValidEmail').mockReturnValue(false);
    emailInput.value = 'bad';
    passInput.value = 'pwd';
    loginButton.click();
    await flushPromises();
    expect(loginError.textContent).toBe('Invalid email format');
  });

  test('shows error for invalid email domain', async () => {
    jest.spyOn(val, 'isValidEmail').mockReturnValue(true);
    jest.spyOn(val, 'isDisposableTLD').mockReturnValue(true);
    emailInput.value = 'user@bad';
    passInput.value = 'pwd';
    loginButton.click();
    await flushPromises();
    expect(loginError.textContent).toBe('Invalid email domain');
  });
});

describe('Registration Validation', () => {
  let regBtn, emailReg, passReg, passConfirm, regError;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="form-register"><input id="email-reg"/><input id="pass-reg"/><input id="pass-confirm"/><button id="register-btn"></button><div id="register-error"></div></form>
    `;
    regBtn = document.getElementById('register-btn');
    emailReg = document.getElementById('email-reg');
    passReg = document.getElementById('pass-reg');
    passConfirm = document.getElementById('pass-confirm');
    regError = document.getElementById('register-error');
    setupEventHandlers();
  });

  test('shows error for invalid email format', async () => {
    jest.spyOn(val, 'isValidEmail').mockReturnValue(false);
    emailReg.value = 'bad';
    passReg.value = 'Pwd1!';
    passConfirm.value = 'Pwd1!';
    regBtn.click();
    await flushPromises();
    expect(regError.textContent).toBe('Invalid email format');
  });

  test('shows error for invalid email domain', async () => {
    jest.spyOn(val, 'isValidEmail').mockReturnValue(true);
    jest.spyOn(val, 'isDisposableTLD').mockReturnValue(true);
    emailReg.value = 'user@bad';
    passReg.value = 'Pwd1!';
    passConfirm.value = 'Pwd1!';
    regBtn.click();
    await flushPromises();
    expect(regError.textContent).toBe('Invalid email domain');
  });

  test('shows error when domain has no MX record', async () => {
    jest.spyOn(val, 'isValidEmail').mockReturnValue(true);
    jest.spyOn(val, 'isDisposableTLD').mockReturnValue(false);
    jest.spyOn(val, 'hasMXRecord').mockResolvedValue(false);
    emailReg.value = 'user@example.com';
    passReg.value = 'Pwd1!';
    passConfirm.value = 'Pwd1!';
    regBtn.click();
    await flushPromises();
    expect(regError.textContent).toBe('Email domain not accepting mail');
  });

  test('shows error for weak password', async () => {
    jest.spyOn(val, 'isValidEmail').mockReturnValue(true);
    jest.spyOn(val, 'isDisposableTLD').mockReturnValue(false);
    jest.spyOn(val, 'hasMXRecord').mockResolvedValue(true);
    jest.spyOn(val, 'isStrongPassword').mockReturnValue(false);
    emailReg.value = 'user@example.com';
    passReg.value = 'weak';
    passConfirm.value = 'weak';
    regBtn.click();
    await flushPromises();
    expect(regError.textContent).toBe('Weak password');
  });

  test('shows error when passwords do not match', async () => {
    jest.spyOn(val, 'isValidEmail').mockReturnValue(true);
    jest.spyOn(val, 'isDisposableTLD').mockReturnValue(false);
    jest.spyOn(val, 'hasMXRecord').mockResolvedValue(true);
    jest.spyOn(val, 'isStrongPassword').mockReturnValue(true);
    emailReg.value = 'user@example.com';
    passReg.value = 'Pwd1!';
    passConfirm.value = 'Other1!';
    regBtn.click();
    await flushPromises();
    expect(regError.textContent).toBe('Passwords do not match');
  });
});
