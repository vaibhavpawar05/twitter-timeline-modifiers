document.addEventListener('DOMContentLoaded', () => {
  chrome.storage.local.get(['tweetInteractions-v1'], (result) => {
    const data = result['tweetInteractions-v1'] || '[]';
    document.getElementById('data').textContent = JSON.stringify(JSON.parse(data), null, 2);
  });

  document.getElementById('clear').onclick = () => {
    chrome.storage.local.clear(() => {
      document.getElementById('data').textContent = '[]';
    });
  };
});