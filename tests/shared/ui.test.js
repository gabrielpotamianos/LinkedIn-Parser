/**
 * @jest-environment jsdom
 */

import { jest, describe, beforeAll, test, expect } from '@jest/globals';

let clearLoginForm, showSuccessMessage, updateParseButtonVisibility;
let loginEmail, loginPass, loginErr;
let runButton, testBtn;

beforeAll(async () => {
    // Common DOM fixture
  document.body.innerHTML = `
    <input id="email-login" value="user@example.com">
    <input id="pass-login" value="secret">
    <div id="login-error">Some error</div>
    <button id="tab-login" class="active"></button>
    <button id="tab-register"></button>
    <form id="form-login"></form>
    <button id="run-btn" style="display:none"></button>
    <button id="test-btn"></button>
  `;

  // Cache DOM elements
  loginEmail   = document.getElementById('email-login');
  loginPass    = document.getElementById('pass-login');
  loginErr     = document.getElementById('login-error');
  runButton    = document.getElementById('run-btn');
  testBtn      = document.getElementById('test-btn');


  jest.resetModules();
  const ui = await import('../../shared/ui.js');
  ({ clearLoginForm, showSuccessMessage, updateParseButtonVisibility } = ui);
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