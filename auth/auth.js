// auth.js
import * as val from "../shared/validation.js";
import * as api from "../shared/api.js";
import * as themes from "../shared/themes.js";
import * as ui from "../shared/ui.js";

const loginButton = document.getElementById("login-btn");
const emailInput = document.getElementById("email-login");
const passwordInput = document.getElementById("pass-login");
const loginError = document.getElementById("login-error");

export async function initPopup() {
  try {
    const { token } = await chrome.storage.local.get("token");
    const { profileData } = await chrome.storage.local.get("profileData");
    if (profileData) {
      window.location.href = chrome.runtime.getURL("../profile/profile.html");
      return;
    }
    else if (token){
      window.location.href = chrome.runtime.getURL("../parse/parse.html");
      return;
    }
    
  } catch (e) {
    console.error("Failed to load stored profileData", e);
  }

  await themes.initTheme();
  themes.setupThemeToggle();
  ui.clearLoginForm();

  document.getElementById("form-login").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      loginButton.click();
    }
  });

  loginButton.addEventListener("click", async () => {
    loginError.textContent = "";
    const email = emailInput.value.trim();
    const pwd = passwordInput.value;

    if (!val.isValidEmail(email)) {
      loginError.textContent = "Invalid email format";
      return;
    }

    const domain = email.split("@")[1]?.toLowerCase() || "";
    if (!domain.includes(".")) {
      loginError.textContent = "Invalid email domain";
      return;
    }

    loginButton.disabled = true;
    try {
      const { token, userId } = await api.login(email, pwd);
      await chrome.storage.local.set({ token, userId });
      ui.clearLoginForm();
      window.location.href = chrome.runtime.getURL("../parse/parse.html");
    } catch (err) {
      loginError.textContent = 'Could not connect to server';
    } finally {
      loginButton.disabled = false;
    }
  });
}

document.addEventListener("DOMContentLoaded", initPopup);
