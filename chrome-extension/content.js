// content.js
let interactionState = new Map();

async function initializeState() {
  const result = await chrome.storage.local.get(['tweetInteractions-v1']);
  if (result['tweetInteractions-v1']) {
    interactionState = new Map(JSON.parse(result['tweetInteractions-v1']));
  }
}

function waitForElements() {
  console.log('Waiting for elements...');
  const checkInterval = setInterval(async () => {
    const tweets = document.querySelectorAll('article');
    if (tweets.length > 0) {
      console.log('Found tweets, starting observer');
      clearInterval(checkInterval);
      await initializeState();
      startObserving();
    }
  }, 1000);

  // Clear interval after 30 seconds to prevent infinite checking
  setTimeout(() => clearInterval(checkInterval), 30000);
}

async function saveInteraction(tweetId, action, emoji, html) {
  const currentData = await chrome.storage.local.get(['tweetInteractions-v1']);
  const existingInteractions = currentData['tweetInteractions-v1'] ?
    new Map(JSON.parse(currentData['tweetInteractions-v1'])) : new Map();

  existingInteractions.set(tweetId, {
    emoji: emoji,
    timestamp: new Date().toISOString()
  });

  await chrome.storage.local.set({
    'tweetInteractions-v1': JSON.stringify([...existingInteractions])
  });

  // Update local state
  interactionState = existingInteractions;
}

function modifyTweetElements(tweet) {
  const links = tweet.getElementsByTagName('a');
  const tweetLink = Array.from(links).filter(val => val.href.includes('status'))[0]?.href;

  if (!tweetLink) return;

  // Extract just the tweet ID from the URL
  const tweetId = tweetLink.split('/status/')[1]?.split('?')[0];
  if (!tweetId) return;

  const savedState = interactionState.get(tweetId);

  const likeButton = tweet.querySelector('[data-testid="like"]');
  if (likeButton && !likeButton.hasAttribute('modified')) {
    const thumbsUp = document.createElement('button');
    thumbsUp.innerHTML = savedState?.emoji === '👍🏾' ? '👍🏾' : '👍';
    thumbsUp.className = 'custom-thumbs-up';
    thumbsUp.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      thumbsUp.innerHTML = thumbsUp.innerHTML === '👍🏾' ? '👍' : '👍🏾';
      saveInteraction(tweetId, 'thumbsUp', thumbsUp.innerHTML, tweet.outerHTML);
    };
    likeButton.parentNode.replaceChild(thumbsUp, likeButton);
  }

  const retweetButton = tweet.querySelector('[data-testid="retweet"]');
  if (retweetButton && !retweetButton.hasAttribute('modified')) {
    const thumbsDown = document.createElement('button');
    thumbsDown.innerHTML = savedState?.emoji === '👎🏾' ? '👎🏾' : '👎';
    thumbsDown.className = 'custom-thumbs-down';
    thumbsDown.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      thumbsDown.innerHTML = thumbsDown.innerHTML === '👎🏾' ? '👎' : '👎🏾';
      saveInteraction(tweetId, 'thumbsDown', thumbsDown.innerHTML, tweet.outerHTML);
    };
    retweetButton.parentNode.replaceChild(thumbsDown, retweetButton);
  }
}

function startObserving() {
  // Initial modification of existing tweets
  const tweets = document.querySelectorAll('article');
  tweets.forEach(modifyTweetElements);

  // Set up observer for new tweets
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tweets = node.querySelectorAll('article');
          tweets.forEach(modifyTweetElements);

          if (node.tagName === 'ARTICLE') {
            modifyTweetElements(node);
          }
        }
      }
    }
  });

  const timelineSelectors = [
    '[data-testid="primaryColumn"]',
    'main[role="main"]',
    '#timeline'
  ];

  let timeline = null;
  for (const selector of timelineSelectors) {
    timeline = document.querySelector(selector);
    if (timeline) break;
  }

  if (timeline) {
    observer.observe(timeline, { childList: true, subtree: true });
  }
}

// Initialize on page load
waitForElements();

// Handle navigation within Twitter's SPA
let lastUrl = location.href;
const navigationObserver = new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    waitForElements();
  }
});

navigationObserver.observe(document, {subtree: true, childList: true});

// Handle when page becomes visible again
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    waitForElements();
  }
});
