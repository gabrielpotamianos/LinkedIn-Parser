// profile/profile.js
/**
 * Types text into el.value (or .textContent for a textarea) one char at a time.
 */

// popup.js
import * as themes from "../shared/themes.js";

function typeWriter(el, text, delay = 30) {
  return new Promise((resolve) => {
    let i = 0;
    el.value = "";
    const timer = setInterval(() => {
      el.value += text.charAt(i++);
      if (i >= text.length) {
        clearInterval(timer);
        resolve();
      }
    }, delay);
  });
}

function renderProfile(profileData) {
  // 2) Fill the simple fields
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };
  setVal("url", profileData.url);
  setVal("fullName", profileData.fullName);
  setVal("headline", profileData.headline);
  setVal("location", profileData.location);
  setVal("about", profileData.about);

  // 3) Populate Experience
  const expContainer = document.getElementById("experience");
  expContainer.innerHTML = ""; // clear any placeholders
  if (Array.isArray(profileData.experience) && profileData.experience.length) {
    profileData.experience.forEach(({ title, company, date }) => {
      // wrapper for each experience entry
      const itemWrap = document.createElement("div");
      itemWrap.className = "experience-item";

      // main line: Title at Company
      const mainInput = document.createElement("input");
      mainInput.type = "text";
      mainInput.readOnly = true;
      mainInput.className = "experience-main";
      mainInput.value = `${title} at ${company}`;
      itemWrap.appendChild(mainInput);

      // split date on bullet for period and extra
      let periodText = date || "";
      let extraText = "";
      if (date && (date.includes("·") || date.includes("•"))) {
        const parts = date.split(/·|•/);
        periodText = parts[0].trim();
        extraText = parts[1].trim();
      }

      // secondary wrapper for period and extra
      const secondaryWrap = document.createElement("div");
      secondaryWrap.className = "experience-secondary";

      // period input
      const periodInput = document.createElement("input");
      periodInput.type = "text";
      periodInput.readOnly = true;
      periodInput.className = "experience-period";
      periodInput.value = periodText;
      secondaryWrap.appendChild(periodInput);

      // extra input (years)
      const extraInput = document.createElement("input");
      extraInput.type = "text";
      extraInput.readOnly = true;
      extraInput.className = "experience-extra";
      extraInput.value = extraText;
      secondaryWrap.appendChild(extraInput);

      itemWrap.appendChild(secondaryWrap);
      expContainer.appendChild(itemWrap);
    });
  } else {
    // fallback placeholder
    const placeholder = document.createElement("div");
    placeholder.className = "experience-item";
    const noneInput = document.createElement("input");
    noneInput.type = "text";
    noneInput.readOnly = true;
    noneInput.value = "Not Found";
    noneInput.className = "experience-main";
    placeholder.appendChild(noneInput);
    expContainer.appendChild(placeholder);
  }

  // 4) Populate Education
  const eduContainer = document.getElementById("education");
  eduContainer.innerHTML = "";
  if (Array.isArray(profileData.education) && profileData.education.length) {
    profileData.education.forEach(({ school, degree, dateRange }) => {
      const input = document.createElement("input");
      input.type = "text";
      input.readOnly = true;
      input.value = `${school}${degree ? " – " + degree : ""}${
        dateRange ? ` (${dateRange})` : ""
      }`;
      eduContainer.appendChild(input);
    });
  } else {
    const input = document.createElement("input");
    input.type = "text";
    input.readOnly = true;
    input.value = "Not Found";
    eduContainer.appendChild(input);
  }

  // 5) Populate Skills (textarea)
  const skillsEl = document.getElementById("skills");
  if (skillsEl) {
    skillsEl.value = Array.isArray(profileData.skills)
      ? profileData.skills.join(", ")
      : "";
  }

  // 6) Wire up your Save / Cancel buttons if needed
  document.getElementById("run-btn").addEventListener("click", async () => {
    // e.g. saveProfile(profileData)
  });
  document.getElementById("logout-btn").addEventListener("click", () => {
    window.close(); // or window.history.back()
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "SAVE_PROFILE") renderProfile(msg.data);
});

// On load, initialize theme and render stored profileData
document.addEventListener("DOMContentLoaded", async () => {
  await themes.initTheme();
  themes.setupThemeToggle();

  const { profileData } = await chrome.storage.local.get("profileData");

  if (profileData) {
    renderProfile(profileData);
  }
});
