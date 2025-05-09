/**
 * @fileoverview
 * This module listens for history state updates in web navigation,
 * specifically targeting LinkedIn profile URLs. It ensures that
 * stored profile data in local storage corresponds to the current
 * profile URL, clearing it if the user navigates away to prevent
 * stale data usage.
 */

/* Utilities */

/**
 * Checks if a given URL is a LinkedIn profile URL.
 * @param {string} url - The URL to check.
 * @returns {boolean} True if the URL matches LinkedIn profile pattern.
 */
function isLinkedInProfileUrl(url) {
  return /linkedin\.com\/in\//.test(url);
}

/**
 * Clears the stored profileData from local storage.
 */
function clearStoredProfileData() {
  chrome.storage.local.remove("profileData");
}

/* Navigation Listener */

/**
 * Listener for history state updates in web navigation.
 * Triggered whenever the URL changes via history API (e.g., SPA navigation).
 * Checks if the new URL is a LinkedIn profile URL and verifies if it matches
 * the stored profileData URL. If it doesn't match, clears the stored profileData
 * to avoid stale data usage.
 */
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  const url = details.url;

  // Check if the URL is a LinkedIn profile URL
  if (isLinkedInProfileUrl(url)) {
    // Load stored profileData from local storage
    const { profileData } = await chrome.storage.local.get("profileData");
    if (!profileData) return;

    // If current URL does not start with stored profileData URL, clear stored data
    if (!url.startsWith(profileData.url)) {
      clearStoredProfileData();
    }
  }
});
