chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'TORNZ_XHR') return false;

  const url = String(message.url || '');
  if (!isAllowedUrl(url)) {
    sendResponse({ ok: false, error: 'URL is not allowed by TORNz Tools extension.' });
    return false;
  }
  const method = String(message.method || 'GET').toUpperCase();
  if (!['GET', 'POST'].includes(method)) {
    sendResponse({ ok: false, error: 'Request method is not allowed by TORNz Tools extension.' });
    return false;
  }
  const headers = { accept: message.accept || '*/*' };
  const extraHeaders = message.headers && typeof message.headers === 'object' ? message.headers : {};
  Object.keys(extraHeaders).forEach((key) => {
    headers[key] = String(extraHeaders[key]);
  });
  const options = {
    method,
    credentials: 'omit',
    headers
  };
  if (method === 'POST' && message.data !== null && message.data !== undefined) {
    options.body = String(message.data);
  }

  fetch(url, options)
    .then(async (response) => {
      sendResponse({
        ok: true,
        status: response.status,
        responseText: await response.text()
      });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
    });

  return true;
});

chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: 'TORNZ_OPEN_PROFILE' });
  } catch (error) {
    console.warn("[TORN'z Tools] Could not open Profile from toolbar icon.", error);
  }
});

function isAllowedUrl(value) {
  try {
    const url = new URL(value);
    return [
      'www.torn.com',
      'torn.com',
      'api.torn.com',
      'tornsy.com',
      'docs.google.com',
      'gitlab.com',
      'weav3r.dev',
      'yata.yt',
      'ffscouter.com'
    ].includes(url.hostname);
  } catch (error) {
    return false;
  }
}
