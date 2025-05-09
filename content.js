// content.js - LinkedIn Profile Parser with skills navigation
(async () => {
  // ── Helpers ──────────────────────────────────────────────────────────────

  function setStorage(obj) {
    return new Promise((resolve) => {
      chrome.storage.local.set(obj, resolve);
    });
  }

  /**
   * Collapse consecutive whitespace in a string and trim ends.
   * @param {string} t — raw text (may contain line breaks, extra spaces)
   * @returns {string} cleaned, single-spaced text
   */
  const clean = (t = "") => t.replace(/\s+/g, " ").trim();

  /**
   * Query the DOM for a selector and return its cleaned innerText.
   * @param {string} sel — CSS selector for target element
   * @returns {string} cleaned text content, or '' if not found
   */
  const text = (sel) => clean(document.querySelector(sel)?.innerText || "");

  /**
   * Wait until an element matching `sel` appears in the DOM or timeout elapses.
   * Used to pause execution after clicking "see more" or "load more".
   * @param {string} sel — CSS selector to wait for
   * @param {number} ms — maximum wait time in ms
   * @returns {Promise<void>}
   */
  const waitFor = (sel, ms = 2000) =>
    new Promise((res) => {
      const obs = new MutationObserver((_, o) => {
        if (document.querySelector(sel)) {
          clearTimeout(timer);
          o.disconnect();
          res();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      const timer = setTimeout(() => {
        obs.disconnect();
        res();
      }, ms);
    });

  /**
   * Generic function to parse a list section of the profile.
   * - Finds the section by ID, ensures it's in a <section> block.
   * - Grabs all direct <li> items under its first <ul>.
   * - Filters out any nested sub-component items (e.g. endorsements, nested roles).
   * - Calls mapFn on each <li> to transform into data objects.
   *
   * @param {string} sectionId — e.g. '#experience' or '#education'
   * @param {Function} mapFn — transforms an <li> element into an array of data objects
   * @returns {Array} flattened array of results from mapFn
   */
  const parseList = (sectionId, mapFn) => {
    const section = document.querySelector(sectionId)?.closest("section");
    if (!section) return [];
    return Array.from(section.querySelectorAll("ul > li"))
      .filter((li) => !li.closest(".pvs-entity__sub-components"))
      .flatMap(mapFn);
  };

  // ── Build profile object ─────────────────────────────────────────────────

  const profile = {
    url: window.location.href.split("?")[0], // Base profile URL
    fullName: text(".inline.t-24.v-align-middle.break-words"),
    headline: text(".text-body-medium.break-words"),
    location: text(".text-body-small.inline.t-black--light.break-words"),
    about: "",
    experience: [],
    education: [],
    skills: [],
  };

  // ── About ─────────────────────────────────────────────────────────────────

  profile.about = (() => {
    // Locate the About section anchor and its containing <section>
    const sec = document.querySelector("#about")?.closest("section");
    if (!sec) {
      console.warn("No About section found");
      return "";
    }
    // Some profiles hide long text behind "see more"
    const more = sec.querySelector('div[class*="inline-show-more-text"]');
    // Try the expanded hidden span first, fallback to visible container
    const el =
      more?.querySelector('span[aria-hidden="true"]') ??
      sec.querySelector('div.display-flex.ph5.pv3 span[aria-hidden="true"]');
    return clean(el?.innerText || "");
  })();

  // ── Experience ────────────────────────────────────────────────────────────

  // Parse each top-level job entry or subgrouped roles
  profile.experience = parseList("#experience", (li) => {
    const roleSel = '.mr1 span[aria-hidden="true"]';
    const compSel = 'span.t-14.t-normal span[aria-hidden="true"]';
    const dateSel = ".pvs-entity__caption-wrapper";

    // Nested roles live under this sub-list container
    const sub = li.querySelector(".pvs-entity__sub-components ul");
    const roles = li.querySelectorAll(roleSel);

    /**
     * Build a single experience record.
     * Splits "Company · Type" into two fields and ensures we don't capture boilerplate.
     */
    const makeRecord = (title, compText, date) => {
      const [company, type = ""] = compText.includes("·")
        ? compText.split("·").map((s) => s.trim())
        : [compText];
      const comb = `${title} ${company} ${date}`.toLowerCase();
      if (title && company && !/helped me.*job/i.test(comb)) {
        return { title, company, employmentType: type, date };
      }
      return null;
    };

    if (sub && roles.length > 1) {
      // Multiple roles at the same company—first role element is company info
      const compText = clean(roles[0]?.innerText || "");
      return Array.from(sub.querySelectorAll("li"))
        .map((subLi) => {
          const title = clean(subLi.querySelector(roleSel)?.innerText);
          const date = clean(subLi.querySelector(dateSel)?.innerText);
          return makeRecord(title, compText, date);
        })
        .filter(Boolean);
    } else {
      // Single-role entry
      const title = clean(li.querySelector(roleSel)?.innerText);
      const compText = clean(li.querySelector(compSel)?.innerText);
      const date = clean(li.querySelector(dateSel)?.innerText);
      const rec = makeRecord(title, compText, date);
      return rec ? [rec] : [];
    }
  });

  // ── Education ─────────────────────────────────────────────────────────────

  // Extract school name, degree, date range, and optional description
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

  // ── Skills ────────────────────────────────────────────────────────────────

  /**
   * Clicks through "Show all" and "Load more" in the Skills section and
   * then collects each skill name, filters out headings/endorsement counts,
   * and deduplicates them.
   */
  async function scrapeSkills() {
    const seeAll = document.querySelector(
      'a[id^="navigation-index-Show-all"][href*="details/skills"]'
    );
    let skillEls = [];
    if (seeAll) {
      // Expand and page through all skills
      seeAll.click();
      await waitFor(
        ".pv-skill-category-entity__name-text, .pv-skill-entity__skill-name",
        2000
      );
      let loadMore;
      do {
        loadMore = document.querySelector(
          "button.scaffold-finite-scroll__load-button"
        );
        if (loadMore) {
          loadMore.click();
          await waitFor(
            ".pv-skill-category-entity__name-text, .pv-skill-entity__skill-name",
            2000
          );
        }
      } while (loadMore);
      // Collect all list-item elements
      skillEls = Array.from(
        document.querySelectorAll("li.pvs-list__paged-list-item")
      );
    } else {
      // Fallback: wait for and parse any skills under the Skills card
      await waitFor('#skills ul > li', 2000);
      skillEls = parseList('#skills', li => li);
    }

    // Extract text, filter out headers/counts, and dedupe
    const skills = Array.from(
      new Set(
        skillEls
          .map(li => {
            const span =
              li.querySelector(
                '.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]'
              ) || li.querySelector('span[aria-hidden="true"]');
            return span ? clean(span.innerText) : '';
          })
          .filter(s => s && !/^Skills|Endorsed|\d+$|others?$/i.test(s))
      )
    );
    return skills;
  }

  // kick off your scrape
  scrapeSkills()
    .then(async(skills) => {
      profile.skills = skills;
      await chrome.storage.local.set({profileData: profile})

      chrome.runtime.sendMessage({
        type: "SAVE_PROFILE",
        data: profile,
      });
    })
    .finally(() => {
      if (window.location.href != profile.url) {
        window.location.replace(profile.url);
      }
    });
})();
