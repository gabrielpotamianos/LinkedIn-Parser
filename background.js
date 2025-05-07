let lastProfile = null;

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === 'PARSED_DATA') {
    console.log("got here")
    lastProfile = msg.data;
    // ack
    sendResponse({ status: 'received' });
  }
  if (msg.type === 'GO_BACK_TO_PROFILE') {
    chrome.tabs.update(sender.tab.id, { url: msg.url });
  }
  // indicate async sendResponse
  return true;
});