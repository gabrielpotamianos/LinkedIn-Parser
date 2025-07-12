/**
 * Content script for LinkedIn profile data parsing.
 *
 * This module scrapes profile information including About, Experience,
 * Education, and Skills sections from the DOM. It handles expanding
 * hidden content, paginating skill lists, and deduplicating skill entries.
 *
 * Dependencies:
 * - Chrome extension APIs (chrome.storage, chrome.runtime)
 * - DOM APIs for querying and mutation observation
 *
 * Execution Context:
 * Runs as an immediately invoked async function in the context of a LinkedIn
 * profile page.
 */

let profile = null;
let scrapeSkills = null;

(async () => {
  // ── UTILITIES ────────────────────────────────────────────────────────────────

  /**
   * Collapse consecutive whitespace in a string and trim ends.
   * @param {string} t - Raw text (may contain line breaks, extra spaces).
   * @returns {string} Cleaned, single-spaced text.
   */
  const clean = (t = "") => t.replace(/\s+/g, " ").trim();

  /**
   * Query the DOM for a selector and return its cleaned innerText.
   * @param {string} sel - CSS selector for target element.
   * @returns {string} Cleaned text content, or empty string if not found.
   */
  const text = (sel) => clean(document.querySelector(sel)?.innerText || "");

  /**
   * Wait until an element matching `sel` appears in the DOM or timeout elapses.
   * Used to pause execution after clicking "see more" or "load more".
   * @param {string} sel - CSS selector to wait for.
   * @param {number} ms - Maximum wait time in milliseconds.
   * @returns {Promise<void>} Resolves when element appears or timeout.
   */
  const waitFor = (sel, ms = 2000) =>
    new Promise((res) => {
      const observer = new MutationObserver((_, obs) => {
        if (document.querySelector(sel)) {
          clearTimeout(timer);
          obs.disconnect();
          res();
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        observer.disconnect();
        res();
      }, ms);
    });

  // ── SECTION PARSERS ──────────────────────────────────────────────────────────

  // Generic list section parser

  /**
   * Generic function to parse a list section of the profile.
   * - Finds the section by ID, ensures it's in a <section> block.
   * - Grabs all direct <li> items under its first <ul>.
   * - Filters out any nested sub-component items (e.g. endorsements, nested roles).
   * - Calls mapFn on each <li> to transform into data objects.
   *
   * @param {string} sectionId - e.g. '#experience' or '#education'.
   * @param {Function} mapFn - Transforms an <li> element into an array of data objects.
   * @returns {Array} Flattened array of results from mapFn.
   */
  const parseList = (sectionId, mapFn) => {
    const section = document.querySelector(sectionId)?.closest("section");
    if (!section) return [];
    return Array.from(section.querySelectorAll("ul > li"))
      .filter((li) => !li.closest(".pvs-entity__sub-components"))
      .flatMap(mapFn);
  };

  // ── ABOUT EXTRACTION ─────────────────────────────────────────────────────────

  // Extract and clean About section, with see-more expansion

  /**
   * Extract the About section text, expanding "see more" if present.
   * @returns {string} Cleaned About text or empty string if not found.
   */
  const aboutText = (() => {
    // Locate the About section anchor and its containing <section>
    const aboutSection = document.querySelector("#about")?.closest("section");
    if (!aboutSection) return "";

    // Some profiles hide long text behind "see more"
    const moreToggle = aboutSection.querySelector(
      'div[class*="inline-show-more-text"]'
    );
    // Try to get the expanded hidden span first, fallback to visible container
    const textElement =
      moreToggle?.querySelector('span[aria-hidden="true"]') ??
      aboutSection.querySelector(
        'div.display-flex.ph5.pv3 span[aria-hidden="true"]'
      );
    return clean(textElement?.innerText || "");
  })();

  // ── EXPERIENCE EXTRACTION ─────────────────────────────────────────────────────

  // Parse Experience entries

  /**
   * Build a single experience record.
   * @param {string} title - Job title.
   * @param {string} compText - Company and employment type text.
   * @param {string} date - Date range string.
   * @returns {Object|null} Experience record with fields:
   *  - title: string
   *  - company: string
   *  - employmentType: string (may be empty)
   *  - date: string
   *  Returns null if invalid or boilerplate.
   */
  const makeRecord = (title, compText, date) => {
    const [company, type = ""] = compText.includes("·")
      ? compText.split("·").map((s) => s.trim())
      : [compText];
    const combinedText = `${title} ${company} ${date}`.toLowerCase();
    // Filter out boilerplate phrases like "helped me... job"
    if (title && company && !/helped me.*job/i.test(combinedText)) {
      return { title, company, employmentType: type, date };
    }
    return null;
  };

  // ── EDUCATION EXTRACTION ──────────────────────────────────────────────────────

  // Parse Education entries

  profile = {
    url: window.location.href.split("?")[0], // Base profile URL
    fullName: text(".inline.t-24.v-align-middle.break-words"),
    headline: text(".text-body-medium.break-words"),
    location: text(".text-body-small.inline.t-black--light.break-words"),
    about: aboutText,
    experience: [],
    education: [],
    skills: [],
  };

  /**
   * Parse each top-level job entry or subgrouped roles into experience records.
   * @returns {Array<Object>} Array of experience objects.
   */
  profile.experience = parseList("#experience", (li) => {
    const roleSelector = '.mr1 span[aria-hidden="true"]';
    const companySelector = 'span.t-14.t-normal span[aria-hidden="true"]';
    const dateSelector = ".pvs-entity__caption-wrapper";

    // Nested roles live under this sub-list container
    const nestedList = li.querySelector(".pvs-entity__sub-components ul");
    const roles = li.querySelectorAll(roleSelector);

    if (nestedList && roles.length > 1) {
      // Multiple roles at the same company — first role element is company info
      const compText = clean(roles[0]?.innerText || "");
      // Map each nested role into an experience record
      return Array.from(nestedList.querySelectorAll("li"))
        .map((subLi) => {
          const title = clean(subLi.querySelector(roleSelector)?.innerText);
          const date = clean(subLi.querySelector(dateSelector)?.innerText);
          return makeRecord(title, compText, date);
        })
        .filter(Boolean);
    } else {
      // Single-role entry
      const title = clean(li.querySelector(roleSelector)?.innerText);
      const compText = clean(li.querySelector(companySelector)?.innerText);
      const date = clean(li.querySelector(dateSelector)?.innerText);
      const record = makeRecord(title, compText, date);
      return record ? [record] : [];
    }
  });

  /**
   * Extract school name, degree, date range, and optional description from education entries.
   * @returns {Array<Object>} Array of education objects.
   */
  profile.education = parseList("#education", (li) => {
    const school = clean(
      li.querySelector('.mr1 span[aria-hidden="true"]')?.innerText
    );
    const degree = clean(
      li.querySelector('.t-14.t-normal span[aria-hidden="true"]')?.innerText
    );
    const dateRange = clean(
      li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]')
        ?.innerText
    );
    let description = "";
    const descEl = li.querySelector(".pvs-entity__sub-components");
    if (descEl) description = clean(descEl.innerText);
    return [{ school, degree, dateRange, description }];
  });

  // ── SKILLS EXTRACTION ────────────────────────────────────────────────────────

  // Click through and collect all skills, deduplicating results

  /**
   * Clicks through "Show all" and "Load more" in the Skills section and
   * then collects each skill name, filters out headings/endorsement counts,
   * and deduplicates them.
   * @returns {Promise<Array<string>>} Array of unique skill names.
   */
  scrapeSkills = async function scrapeSkills() {
    // Expand "Show all" skills link if present
    const seeAll = document.querySelector(
      'a[id^="navigation-index-Show-all"][href*="details/skills"]'
    );
    let skillElements = [];
    if (seeAll) {
      // Expand and page through all skills
      seeAll.click();
      await waitFor(
        ".pv-skill-category-entity__name-text, .pv-skill-entity__skill-name",
        2000
      );
      // Paginate "Load more" buttons until none remain
      let loadMoreButton;
      do {
        loadMoreButton = document.querySelector(
          "button.scaffold-finite-scroll__load-button"
        );
        if (loadMoreButton) {
          loadMoreButton.click();
          await waitFor(
            ".pv-skill-category-entity__name-text, .pv-skill-entity__skill-name",
            2000
          );
        }
      } while (loadMoreButton);
      // Collect all list-item elements after pagination
      skillElements = Array.from(
        document.querySelectorAll("li.pvs-list__paged-list-item")
      );
    } else {
      // Fallback: wait for and parse any skills under the Skills card
      await waitFor("#skills ul > li", 2000);
      skillElements = parseList("#skills", (li) => li);
    }

    // Extract skill text, filter out headers/counts, and deduplicate
    const skills = Array.from(
      new Set(
        skillElements
          .map((li) => {
            const skillNameSpan =
              li.querySelector(
                '.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]'
              ) || li.querySelector('span[aria-hidden="true"]');
            return skillNameSpan ? clean(skillNameSpan.innerText) : "";
          })
          .filter((s) => s && !/^Skills|Endorsed|\d+$|others?$/i.test(s))
      )
    );
    return skills;
  }

  // ── MAIN EXECUTION ───────────────────────────────────────────────────────────

  /**
   * Orchestrates scraping, storage, messaging, and cleanup.
   */
  scrapeSkills()
    .then(async (skills) => {
      // Assign scraped skills to profile object
      profile.skills = skills;

      // Save profile data to Chrome local storage
      await chrome.storage.local.set({ profileData: profile });
      // Send message to background or other extension parts with profile data
      chrome.runtime.sendMessage({
        type: "SAVE_PROFILE",
        data: profile,
      });
    })
    .finally(() => {
      // Redirect back to base profile URL if URL changed during scraping
      if (window.location.href !== profile.url) {
        window.location.replace(profile.url);
      }
    });

  // Ensure test globals are set
  window.profile = profile;
  window.scrapeSkills = scrapeSkills;
})();
