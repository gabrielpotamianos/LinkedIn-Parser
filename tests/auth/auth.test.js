import { jest, describe, test, expect, beforeAll } from '@jest/globals';
/**
 * @jest-environment jsdom
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Load and extract the <body> contents from the mockHtml.html fixture
const rawHtml = fs.readFileSync(
  path.resolve(__dirname, "../fixtures/authMock.html"),
  "utf8"
);
const bodyMatch = rawHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
const bodyHtml = bodyMatch ? bodyMatch[1] : rawHtml;

// Setup chrome mock manually for ESM
globalThis.chrome = {
  storage: {
    local: {
      get: jest.fn(() => Promise.resolve({})),
      set: jest.fn(() => Promise.resolve())
    }
  },
  runtime: {
    getURL: jest.fn((path) => `chrome-extension://some-id/${path}`)
  }
};

if (!window.matchMedia) {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false, // or true depending on what you want to simulate
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated but might be used
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

beforeAll(async () => {
  document.body.innerHTML = bodyHtml;
  const { initPopup } = await import('../../auth/auth.js'); // dynamic import
  await initPopup();
});

describe("Popup HTML elements", () => {
  test("login form and button are present", () => {
    expect(document.getElementById("form-login")).toBeTruthy();
    expect(document.getElementById("login-btn")).toBeTruthy();
  });

  test("registration form and button are present", () => {
    expect(document.getElementById("form-register")).toBeTruthy();
    expect(document.getElementById("register-btn")).toBeTruthy();
  });
});

describe("Form input presence", () => {
  test("login input fields exist", () => {
    expect(document.getElementById("email-login")).toBeTruthy();
    expect(document.getElementById("pass-login")).toBeTruthy();
    expect(document.getElementById("login-error")).toBeTruthy();
  });

  test("register input fields exist", () => {
    expect(document.getElementById("email-reg")).toBeTruthy();
    expect(document.getElementById("pass-reg")).toBeTruthy();
    expect(document.getElementById("pass-confirm")).toBeTruthy();
    expect(document.getElementById("register-error")).toBeTruthy();
  });

  test("tab buttons exist", () => {
    expect(document.getElementById("tab-login")).toBeTruthy();
    expect(document.getElementById("tab-register")).toBeTruthy();
  });

  test("theme toggle is present", () => {
    expect(document.getElementById("theme-switch")).toBeTruthy();
  });
});

describe("Keydown event handling", () => {
  test("pressing Enter on login form triggers login button click", () => {
    const loginBtn = document.getElementById("login-btn");
    const spy = jest.spyOn(loginBtn, "click");
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    document.getElementById("email-login").dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });

  test("pressing Enter on register form triggers register button click", () => {
    const regBtn = document.getElementById("register-btn");
    const spy = jest.spyOn(regBtn, "click");
    const event = new KeyboardEvent("keydown", { key: "Enter", bubbles: true });
    document.getElementById("email-reg").dispatchEvent(event);
    expect(spy).toHaveBeenCalled();
  });
});
