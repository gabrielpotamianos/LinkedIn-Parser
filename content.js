// content.js - LinkedIn Profile Parser with skills navigation
(async () => {
  const cleanText = text => text ? text.replace(/\s+/g, ' ').trim() : '';

  const profile = {
    url: window.location.href.split('?')[0],
    fullName: cleanText(document.querySelector('.inline.t-24.v-align-middle.break-words')?.innerText || ''),
    headline: cleanText(document.querySelector('.text-body-medium.break-words')?.innerText || ''),
    location: cleanText(document.querySelector('.text-body-small.inline.t-black--light.break-words')?.innerText || ''),
    about: '',
    current: cleanText(document.querySelector('div.text-body-medium.break-words')?.innerText || ''),
    education: [],
    experience: [],
    skills: []
  };


  // 1. Locate the About anchor and its enclosing section
  const aboutAnchor = document.querySelector('#about');
  if (!aboutAnchor) {
    console.warn('No About section found');
  }
  else { 
    const aboutSection = aboutAnchor.closest('section');
    if (!aboutSection) {
      console.warn('About anchor not within a section');
      return;
    }

    // 2. Expand the text if a "see more" button exists
    const collapseDiv = aboutSection.querySelector('div[class*="inline-show-more-text"]');

    // 3. Extract the full About text
    // First, try the expanded span within the collapsed container
    let descEl = collapseDiv?.querySelector('span[aria-hidden="true"]');
    if (!descEl) {
      // Fallback: generic visible span under the content area
      descEl = aboutSection.querySelector('div.display-flex.ph5.pv3 span[aria-hidden="true"]');
    }
    profile.about = cleanText(descEl?.innerText || '');
  }

// Experience parsing
const expSection = document.querySelector('#experience')?.closest('section');
if (!expSection) {
  console.warn('No experience section found');
} else {
  // Grab all <li> under the main list...
  const allLis = Array.from(expSection.querySelectorAll('ul > li'));
  // …then filter out any that are inside a `.pvs-entity__sub-components`
  const topLevelLis = allLis.filter(li => !li.closest('.pvs-entity__sub-components'));

  topLevelLis.forEach(li => {
    // Common selectors
    const roleSel = '.mr1 span[aria-hidden="true"]';
    const compSel = 'span.t-14.t-normal span[aria-hidden="true"]';
    const dateSel = '.pvs-entity__caption-wrapper';

    // Detect nested roles: sub-components list
    const subComp   = li.querySelector('.pvs-entity__sub-components ul');
    const roleElems = li.querySelectorAll(roleSel);

    if (subComp && roleElems.length > 1) {
      // Multi-role: first roleSel is the company name
      const compText = cleanText(roleElems[0]?.innerText || '');
        const [companyName, employmentType] = compText.includes('·')
          ? compText.split('·').map(s => s.trim())
          : [compText, ''];
      subComp.querySelectorAll('li').forEach(roleLi => {
        const title = cleanText(roleLi.querySelector(roleSel)?.innerText || '');
        const date  = cleanText(roleLi.querySelector(dateSel)?.innerText || '');
        const combined = `${title} ${companyName} ${date}`.toLowerCase();
        if (title && companyName && !/helped me.*job/i.test(combined)) {
          profile.experience.push({ title, company: companyName, employmentType, date });
        }
      });
    } else {
      // Single-role
      const title   = cleanText(li.querySelector(roleSel)?.innerText || '');
      const compText = cleanText(li.querySelector(compSel)?.innerText || '');
      const [company, employmentType] = compText.includes('·')
        ? compText.split('·').map(s => s.trim())
        : [compText, ''];
      const date    = cleanText(li.querySelector(dateSel)?.innerText || '');
      const combined = `${title} ${company} ${date}`.toLowerCase();
      if (title && company && !/helped me.*job/i.test(combined)) {
        profile.experience.push({ title, company, employmentType, date });
      }
    }
  });
}


// Education parsing
const eduSection = document.querySelector('#education')?.closest('section');
if (eduSection) {
  // grab all <li>s under the main education list…
  const allLis = Array.from(
    eduSection.closest('section').querySelectorAll('ul > li')
  );
  // …then filter out any that live inside a nested sub-components block
  const topLevelLis = allLis.filter(li => !li.closest('.pvs-entity__sub-components'));

  topLevelLis.forEach(li => {
    const school    = cleanText(li.querySelector('.mr1 span[aria-hidden="true"]')?.innerText || '');
    const degree    = cleanText(li.querySelector('.t-14.t-normal span[aria-hidden="true"]')?.innerText || '');
    const dateRange = cleanText(li.querySelector('.t-14.t-normal.t-black--light span[aria-hidden="true"]')?.innerText || '');

    // Pull any descriptive text under this school block
    let description = '';
    const descContainer = li.querySelector('.pvs-entity__sub-components');
    if (descContainer) {
      description = cleanText(descContainer.innerText);
    }

    profile.education.push({ school, degree, dateRange, description });
  });
}

async function scrapeSkills(cleanText) {
  // 1. Expand “Show all skills”
  const seeMoreAnchor = document.querySelector(
    'a[id^="navigation-index-Show-all"][href*="details/skills"]'
  );
  if (seeMoreAnchor) {
    seeMoreAnchor.click();
  }

  // 2. Wait for any skill chip to appear
  await waitForSelector(
    '.pv-skill-category-entity__name-text, .pv-skill-entity__skill-name, .pv-skill-entity__name-text',
    2000
  );

  // 3. Load more results if present
  const loadMoreBtn = document.querySelector('button.scaffold-finite-scroll__load-button');
  if (loadMoreBtn) {
    loadMoreBtn.click();
    await waitForSelector(
      '.pv-skill-category-entity__name-text, .pv-skill-entity__skill-name, .pv-skill-entity__name-text',
      2000
    );
  }

  const skillLis = Array.from(
    document.querySelectorAll('li.pvs-list__paged-list-item')
  );
  
  const skills = skillLis
    .map(li => {
      const span = li.querySelector(
        '.mr1.hoverable-link-text.t-bold span[aria-hidden="true"]'
      );
      return span ? cleanText(span.innerText) : '';
    })
    .filter(s => s && !/^Skills|Endorsed|\d+$|others?$/i.test(s));
  
  const uniqueSkills = Array.from(new Set(skills));

  return uniqueSkills;
}

// Utility: wait until `selector` matches at least one element, or `timeout` ms elapses
function waitForSelector(selector, timeout = 2000) {
  return new Promise(resolve => {
    const observer = new MutationObserver((_, obs) => {
      if (document.querySelector(selector)) {
        clearTimeout(timer);
        obs.disconnect();
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    const timer = setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeout);
  });
}

  profile.skills = await scrapeSkills(cleanText)

  chrome.runtime.sendMessage({ type: 'PARSED_DATA', data: profile });
  sessionStorage.setItem('profileData', JSON.stringify(profile));
  window.history.back()
})();
