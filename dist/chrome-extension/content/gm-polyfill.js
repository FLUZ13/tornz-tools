(function tornzChromePolyfill() {
  'use strict';

  const storage = {
    async getValue(key, fallback) {
      try {
        const result = await chrome.storage.local.get(String(key));
        return Object.prototype.hasOwnProperty.call(result, String(key)) ? result[String(key)] : fallback;
      } catch (error) {
        console.warn("[TORN'z Tools] chrome.storage get failed", key, error);
        return fallback;
      }
    },

    async setValue(key, value) {
      try {
        await chrome.storage.local.set({ [String(key)]: value });
      } catch (error) {
        console.warn("[TORN'z Tools] chrome.storage set failed", key, error);
      }
    }
  };

  function xmlHttpRequest(details) {
    const request = chrome.runtime.sendMessage({
      type: 'TORNZ_XHR',
      url: details && details.url,
      accept: details && details.responseType === 'json' ? 'application/json' : '*/*'
    }).then((response) => {
      if (!response || !response.ok) {
        const error = new Error(response && response.error ? response.error : 'Extension request failed.');
        if (details && typeof details.onerror === 'function') details.onerror(error);
        throw error;
      }
      const xhrLike = {
        status: response.status || 0,
        responseText: response.responseText || ''
      };
      if (details && typeof details.onload === 'function') details.onload(xhrLike);
      return xhrLike;
    }).catch((error) => {
      if (details && typeof details.onerror === 'function') details.onerror(error);
      throw error;
    });
    return request;
  }

  function registerMenuCommand(label, callback) {
    console.debug("[TORN'z Tools] menu command unavailable in Chrome extension content script:", label);
    return { label, callback };
  }

  globalThis.GM = {
    getValue: storage.getValue,
    setValue: storage.setValue,
    xmlHttpRequest,
    registerMenuCommand
  };
  globalThis.GM_getValue = (key, fallback) => storage.getValue(key, fallback);
  globalThis.GM_setValue = (key, value) => storage.setValue(key, value);
  globalThis.GM_xmlhttpRequest = xmlHttpRequest;
  globalThis.GM_registerMenuCommand = registerMenuCommand;
})();
