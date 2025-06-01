import * as themes from "../shared/themes.js";
import * as ui from "../shared/ui.js";

const parseButton = document.getElementById("run-btn");
const logoutButton = document.getElementById("logout-btn");

logoutButton.addEventListener("click", async () => {
  await ui.updateParseButtonVisibility(parseButton);
  await chrome.storage.local.remove(["token", "userId"]);
  window.location.href = chrome.runtime.getURL("../auth/auth.html");
});

parseButton.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});


chrome.runtime.onMessage.addListener(async (msg) => {
  if (msg.type === "SAVE_PROFILE") {
    window.location.href = chrome.runtime.getURL("../profile/profile.html");
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await themes.initTheme();
  themes.setupThemeToggle();
  await ui.updateParseButtonVisibility(parseButton);
});
