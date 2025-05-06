// content.js

(async () => {
    // Helper to get text or fallback
    const getText = (selector, fallback = '') => {
      const el = document.querySelector(selector);
      return el ? el.innerText.trim() : fallback;
    };
  
    // Parse LinkedIn profile fields
    const profileData = {
      fullName: getText('header .pv-text-details__left-panel h1'),
      headline: getText('header .pv-text-details__left-panel .text-body-medium'),
      location: getText('header .pv-text-details__left-panel .text-body-small.inline.t-black--light'),
      currentCompany: getText('section.pv-top-card--experience-list li a'),
      about: getText('#about-section .pv-about__summary-text'),
      // Profile image URL
      imageUrl: (() => {
        const img = document.querySelector('img.pv-top-card-profile-picture__image');
        return img ? img.src : '';
      })(),
      // LinkedIn profile URL
      profileUrl: window.location.href,
      // Connections count
      connections: getText('header .pv-text-details__left-panel .t-black--light .pv-top-card--list-bullet li')
    };
  
    // Send the parsed data back to the extension
    chrome.runtime.sendMessage({ type: 'PARSED_DATA', data: profileData });
  })();
  