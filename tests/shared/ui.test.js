/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeAll, beforeEach, test, expect } from '@jest/globals';

let clearLoginForm, clearRegisterForm, clearForms, setupTabs, showSuccessMessage, updateParseButtonVisibility;
let loginEmail, loginPass, loginErr;
let regEmail, regPass, regConfirm, regErr;
let loginTab, regTab, loginForm, regForm, runButton, testBtn;

beforeAll(async () => {
    // Common DOM fixture
  document.body.innerHTML = `
    <input id="email-login" value="user@example.com">
    <input id="pass-login" value="secret">
    <div id="login-error">Some error</div>
    <input id="email-reg" value="reg@example.com">
    <input id="pass-reg" value="regsecret">
    <input id="pass-confirm" value="confirmsecret">
    <div id="register-error">Another error</div>
    <button id="tab-login" class="active"></button>
    <button id="tab-register"></button>
    <form id="form-login"></form>
    <form id="form-register"></form>
    <button id="run-btn" style="display:none"></button>
    <button id="test-btn"></button>
  `;

  // Cache DOM elements
  loginEmail   = document.getElementById('email-login');
  loginPass    = document.getElementById('pass-login');
  loginErr     = document.getElementById('login-error');
  regEmail     = document.getElementById('email-reg');
  regPass      = document.getElementById('pass-reg');
  regConfirm   = document.getElementById('pass-confirm');
  regErr       = document.getElementById('register-error');
  loginTab     = document.getElementById('tab-login');
  regTab       = document.getElementById('tab-register');
  loginForm    = document.getElementById('form-login');
  regForm      = document.getElementById('form-register');
  runButton    = document.getElementById('run-btn');
  testBtn      = document.getElementById('test-btn');


  jest.resetModules();
  const ui = await import('../../shared/ui.js');
  ({ clearLoginForm, clearRegisterForm, clearForms, setupTabs, showSuccessMessage, updateParseButtonVisibility } = ui);
});

describe('Form Clearing Utilities', () => {
  test('clearLoginForm resets login fields and error', () => {
    loginEmail.value = 'x@y.com';
    loginPass.value  = 'pwd';
    loginErr.textContent = 'Err';
    clearLoginForm();
    expect(loginEmail.value).toBe('');
    expect(loginPass.value).toBe('');
    expect(loginErr.textContent).toBe('');
  });

  test('clearRegisterForm resets register fields and error', () => {
    regEmail.value = 'a@b.com';
    regPass.value  = 'pwd';
    regConfirm.value = 'pwd';
    regErr.textContent = 'ErrR';
    clearRegisterForm();
    expect(regEmail.value).toBe('');
    expect(regPass.value).toBe('');
    expect(regConfirm.value).toBe('');
    expect(regErr.textContent).toBe('');
  });

  test('clearForms resets both login and register forms', () => {
    loginEmail.value = 'x@y.com';
    loginPass.value  = 'pwd';
    loginErr.textContent = 'Err';
    regEmail.value = 'a@b.com';
    regPass.value  = 'pwd';
    regConfirm.value = 'pwd2';
    regErr.textContent = 'ErrR';
    clearForms();
    expect(loginEmail.value).toBe('');
    expect(loginPass.value).toBe('');
    expect(loginErr.textContent).toBe('');
    expect(regEmail.value).toBe('');
    expect(regPass.value).toBe('');
    expect(regConfirm.value).toBe('');
    expect(regErr.textContent).toBe('');
  });
});

describe('Tab Navigation', () => {
  beforeEach(() => {
    // Ensure default state
    loginForm.classList.remove('hidden');
    regForm.classList.add('hidden');
    loginTab.classList.add('active');
    regTab.classList.remove('active');
    // Pre-populate values to see they get cleared
    loginEmail.value = 'foo';
    loginPass.value  = 'bar';
    regEmail.value   = 'baz';
    regPass.value    = 'qux';
    regConfirm.value = 'quux';
    regErr.textContent = 'Error';
    setupTabs();
  });

  test('clicking registerTab shows register form and clears login fields', () => {
    regTab.click();
    expect(regTab.classList.contains('active')).toBe(true);
    expect(loginTab.classList.contains('active')).toBe(false);
    expect(regForm.classList.contains('hidden')).toBe(false);
    expect(loginForm.classList.contains('hidden')).toBe(true);
    expect(loginEmail.value).toBe('');
    expect(loginPass.value).toBe('');
  });

  test('clicking loginTab shows login form and clears register fields', () => {
    // simulate already on register
    regTab.click();
    loginTab.click();
    expect(loginTab.classList.contains('active')).toBe(true);
    expect(regTab.classList.contains('active')).toBe(false);
    expect(loginForm.classList.contains('hidden')).toBe(false);
    expect(regForm.classList.contains('hidden')).toBe(true);
    expect(regEmail.value).toBe('');
    expect(regPass.value).toBe('');
    expect(regConfirm.value).toBe('');
    expect(regErr.textContent).toBe('');
  });

  test('toggling back and forth consistently clears fields', () => {
    regTab.click();
    loginTab.click();
    regTab.click();
    expect(loginEmail.value).toBe('');
    expect(loginPass.value).toBe('');
  });
});

describe('showSuccessMessage', () => {
  test('inserts a message element after the given button', () => {
    const text = 'Done';
    const el = showSuccessMessage(testBtn, text);
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.className).toBe('success-message');
    expect(el.textContent).toBe(text);
    expect(testBtn.nextElementSibling).toBe(el);
  });
});

describe('updateParseButtonVisibility', () => {
  const originalChrome = global.chrome;
  afterEach(() => { global.chrome = originalChrome; });

  test('shows run button for LinkedIn profile URL', async () => {
    global.chrome = { tabs: { query: jest.fn().mockResolvedValue([{ url: 'https://linkedin.com/in/you' }]) } };
    runButton.style.display = 'none';
    await updateParseButtonVisibility(runButton);
    expect(runButton.style.display).toBe('inline-block');
  });

  test('hides run button for non-LinkedIn URL', async () => {
    global.chrome = { tabs: { query: jest.fn().mockResolvedValue([{ url: 'https://google.com' }]) } };
    runButton.style.display = '';
    await updateParseButtonVisibility(runButton);
    expect(runButton.style.display).toBe('none');
  });
});