// background.js
chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
  const url = details.url;
  if (/linkedin\.com\/in\//.test(url)) {
    const { profileData } = await chrome.storage.local.get("profileData");
    if (!profileData) return;

    if (!details.url.startsWith(profileData.url)) {
      chrome.storage.local.remove("profileData");
    }
  }
});
