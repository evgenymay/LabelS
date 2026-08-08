let currentDomain = null;

function t(key, subs) {
  const m = chrome.i18n.getMessage(key, subs);
  return m || key;
}

document.getElementById('domain').textContent = t('popupLoading');
document.getElementById('add-btn').textContent = t('popupAddStarLabels');

function getStoredSavedDomains(cb) {
  chrome.storage.sync.get('saved_domains', ({ saved_domains }) => {
    if (saved_domains !== undefined) {
      cb(saved_domains);
      return;
    }

    chrome.storage.local.get('saved_domains', ({ saved_domains: localSavedDomains }) => {
      if (localSavedDomains === undefined) {
        cb(null);
        return;
      }

      chrome.storage.sync.set({ saved_domains: localSavedDomains }, () => {
        chrome.storage.local.remove('saved_domains', () => cb(localSavedDomains));
      });
    });
  });
}

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const tab = tabs[0];
  if (!tab || !tab.url) { showError(t('popupErrNoPage')); return; }

  try {
    const url = new URL(tab.url);
    if (!url.hostname || url.protocol === 'chrome:' || url.protocol === 'moz-extension:' || url.protocol === 'about:') {
      showError(t('popupErrSystemPage'));
      return;
    }
    currentDomain = url.hostname.replace(/^www\./, '');
    document.getElementById('domain').textContent = currentDomain;
    document.getElementById('domain').classList.remove('empty');

    getStoredSavedDomains((saved_domains) => {
      const existing = (saved_domains || []).find(d => d.domain === currentDomain);
      const btn = document.getElementById('add-btn');
      btn.disabled = false;
      if (existing && existing.visible) {
        btn.textContent = t('popupAlreadyAdded');
        btn.style.background = '#94a3b8';
        btn.disabled = true;
      }
    });
  } catch (e) {
    showError(t('popupErrBadUrl'));
  }
});

document.getElementById('add-btn').addEventListener('click', () => {
  if (!currentDomain) return;
  const btn = document.getElementById('add-btn');
  btn.disabled = true;

  chrome.storage.local.remove('pendingAddDomain', () => {
    chrome.storage.local.set({ pendingAddDomain: currentDomain }, () => {
      if (chrome.runtime.lastError) {
        btn.disabled = false;
        return;
      }

      btn.textContent = t('popupAdded');
      btn.style.background = '#16a34a';
    });
  });
});

function showError(msg) {
  document.getElementById('domain').textContent = msg;
  document.getElementById('domain').classList.add('empty');
}
