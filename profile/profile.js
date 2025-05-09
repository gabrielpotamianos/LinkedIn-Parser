// profile/profile.js
import * as themes from "../shared/themes.js";

function typeWriter(el, text, delay = 50) {
  return new Promise((resolve) => {
    if (window.skipAnimations) {
      el.value = text;
      return resolve();
    }
    let i = 0;
    el.value = "";
    const timer = setInterval(() => {
      el.value += text.charAt(i++);
      if (i >= text.length || window.skipAnimations) {
        clearInterval(timer);
        if (window.skipAnimations) el.value = text;
        resolve();
      }
    }, delay);
  });
}

function createReadOnlyInput(className = "", value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.readOnly = true;
  input.className = className;
  input.value = value;
  return input;
}

function animateInput(container, className, text, animations) {
  const input = createReadOnlyInput(className);
  container.appendChild(input);
  animations.push(typeWriter(input, text));
  return input;
}

async function renderProfile(profileData) {
  const animate = (id, val) => {
    const el = document.getElementById(id);
    return el ? typeWriter(el, val || "") : Promise.resolve();
  };

  const animations = [
    animate("url", profileData.url),
    animate("fullName", profileData.fullName),
    animate("headline", profileData.headline),
    animate("location", profileData.location),
    animate("about", profileData.about),
  ];

  const expContainer = document.getElementById("experience");
  expContainer.innerHTML = "";
  if (Array.isArray(profileData.experience) && profileData.experience.length) {
    profileData.experience.forEach(({ title, company, date }) => {
      const itemWrap = document.createElement("div");
      itemWrap.className = "experience-item";

      animateInput(
        itemWrap,
        "experience-main",
        `${title} at ${company}`,
        animations
      );

      const [periodText = "", extraText = ""] =
        (date && date.split(/·|•/).map((s) => s.trim())) || [];

      const secondaryWrap = document.createElement("div");
      secondaryWrap.className = "experience-secondary";

      animateInput(secondaryWrap, "experience-period", periodText, animations);
      animateInput(secondaryWrap, "experience-extra", extraText, animations);

      itemWrap.appendChild(secondaryWrap);
      expContainer.appendChild(itemWrap);
    });
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "experience-item";
    const noneInput = createReadOnlyInput("experience-main", "Not Found");
    placeholder.appendChild(noneInput);
    expContainer.appendChild(placeholder);
  }

  const eduContainer = document.getElementById("education");
  eduContainer.innerHTML = "";
  if (Array.isArray(profileData.education) && profileData.education.length) {
    profileData.education.forEach(({ school, degree, dateRange }) => {
      const input = createReadOnlyInput();
      eduContainer.appendChild(input);
      animations.push(
        typeWriter(
          input,
          `${school}${degree ? " – " + degree : ""}${
            dateRange ? ` (${dateRange})` : ""
          }`
        )
      );
    });
  } else {
    const input = createReadOnlyInput("", "Not Found");
    eduContainer.appendChild(input);
  }

  const skillsEl = document.getElementById("skills");
  if (skillsEl) {
    animations.push(
      typeWriter(
        skillsEl,
        Array.isArray(profileData.skills) ? profileData.skills.join(", ") : ""
      )
    );
  }

  document
    .getElementById("save-candidate-btn")
    ?.addEventListener("click", async () => {
      // Hook to send data
    });

  document
    .getElementById("discard-profile-btn")
    ?.addEventListener("click", async () => {
      window.skipAnimations = true;
      await chrome.storage.local.remove("profileData");
      window.close();
    });

  await Promise.all(animations);
}

chrome.runtime.onMessage.addListener(async(msg) => {
  if (msg.type === "SAVE_PROFILE") await renderProfile(msg.data);
});

document.addEventListener("DOMContentLoaded", async () => {
  await themes.initTheme();
  themes.setupThemeToggle();

  const { profileData } = await chrome.storage.local.get("profileData");
  if (profileData) await renderProfile(profileData);
});
