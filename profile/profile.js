// profile/profile.js
import * as themes from "../shared/themes.js";

/** 
 * =========================
 *        Utilities
 * =========================
 */

/**
 * Helper methods for DOM creation and animation.
 */

/**
 * Animates typing text into an input element with a delay between characters.
 * If window.skipAnimations is true, sets the text immediately.
 * @param {HTMLInputElement} el - The input element to animate.
 * @param {string} text - The text to type into the input.
 * @param {number} [delay=50] - Delay in milliseconds between each character.
 * @returns {Promise<void>} Resolves when animation completes.
 */
export function typeWriter(el, text, delay = 50) {
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

/**
 * Creates a read-only text input element with optional class and initial value.
 * @param {string} [className=""] - CSS class to assign to the input.
 * @param {string} [value=""] - Initial value of the input.
 * @returns {HTMLInputElement} The created read-only input element.
 */
export function createReadOnlyInput(className = "", value = "") {
  const input = document.createElement("input");
  input.type = "text";
  input.readOnly = true;
  input.className = className;
  input.value = value;
  return input;
}

/**
 * Creates a read-only input with specified text, appends it to a container,
 * and pushes its typing animation promise into the animations array.
 * Note: This both appends an input element and schedules its animation.
 * @param {HTMLElement} container - The container to append the input to.
 * @param {string} className - CSS class for the input.
 * @param {string} text - Text to animate inside the input.
 * @param {Array<Promise>} animations - Array to collect animation promises.
 * @returns {HTMLInputElement} The created input element.
 */
export function animateInput(container, className, text, animations) {
  const input = createReadOnlyInput(className);
  container.appendChild(input);
  animations.push(typeWriter(input, text));
  return input;
}

/** 
 * =========================
 *        Rendering
 * =========================
 * Builds and animates all profile sections in parallel
 */

/**
 * Renders the profile data into the DOM, animating text inputs.
 * Sets up animations for URL, full name, headline, location, about,
 * experience, education, and skills sections.
 * Also attaches event listeners for save and discard buttons before awaiting animations.
 * @param {Object} profileData - Profile data object containing various fields.
 * @returns {Promise<void>} Resolves when all animations complete.
 */
export async function renderProfile(profileData) {
  // Helper to animate element by ID if it exists
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

  // Loop through each work experience entry, create inputs, and queue their animations
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

  // Populate education entries similarly with animated inputs
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

  // Animate the skills list into the textarea
  const skillsEl = document.getElementById("skills");
  if (skillsEl) {
    animations.push(
      typeWriter(
        skillsEl,
        Array.isArray(profileData.skills) ? profileData.skills.join(", ") : ""
      )
    );
  }

  /** 
   * =========================
   *     Event Listeners
   * =========================
   * Buttons are wired early to allow interruption of animations
   */

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

/**
 * Listens for runtime messages and triggers rendering for SAVE_PROFILE type.
 */

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage?.addListener) {
  chrome.runtime.onMessage.addListener(async (msg) => {
    if (msg.type === "SAVE_PROFILE") await renderProfile(msg.data);
  });
}

/**
 * On page load, initialize theme and render stored profile
 */
document.addEventListener("DOMContentLoaded", async () => {
  await themes.initTheme();
  themes.setupThemeToggle();

  const { profileData } = await chrome.storage.local.get("profileData");
  if (profileData) await renderProfile(profileData);
});
