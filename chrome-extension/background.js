console.log('Background script loaded');

chrome.storage.local.onChanged.addListener((changes) => {
  console.log('Storage changed:', changes);
});