const REMOVE_LABEL_MENU_ID = 'labels-remove-from-grid';

function initContextMenus() {
  if (!chrome.contextMenus) return;

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: REMOVE_LABEL_MENU_ID,
      title: chrome.i18n.getMessage('contextMenuRemoveLabel'),
      contexts: ['link'],
      documentUrlPatterns: [chrome.runtime.getURL('newtab.html')]
    }, () => void chrome.runtime.lastError);
  });
}

function extractDomain(urlString) {
  try {
    return new URL(urlString).hostname.replace(/^www\./, '');
  } catch (err) {
    return null;
  }
}

if (chrome.contextMenus) {
  initContextMenus();
  chrome.runtime.onInstalled?.addListener(initContextMenus);
  chrome.runtime.onStartup?.addListener(initContextMenus);

  chrome.contextMenus.onClicked.addListener((info) => {
    if (info.menuItemId !== REMOVE_LABEL_MENU_ID || !info.linkUrl) return;
    const domain = extractDomain(info.linkUrl);
    if (!domain) return;
    chrome.runtime.sendMessage({ type: 'hideDomain', domain }, () => void chrome.runtime.lastError);
  });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'addDomain' && message.domain) {
    const domain = message.domain;
    chrome.storage.local.remove('pendingAddDomain', () => {
      chrome.storage.local.set({ pendingAddDomain: domain }, () => {
        sendResponse({ ok: true });
      });
    });
    return true;
  }

  if (message.type !== 'suggest') return;

  const query = message.query;
  if (!query || query.trim() === '') {
    sendResponse({ suggestions: [] });
    return true;
  }

  const engine = message.engine || 'google';
  const url = engine === 'yandex'
    ? `https://yandex.com/suggest/suggest-ff.cgi?part=${encodeURIComponent(query)}&uil=ru`
    : `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;

  fetch(url)
    .then(r => r.text())
    .then(text => {
      const data = JSON.parse(text);
      const suggestions = Array.isArray(data[1]) ? data[1].slice(0, 8) : [];
      sendResponse({ suggestions });
    })
    .catch(() => {
      sendResponse({ suggestions: [] });
    });

  return true;
});
