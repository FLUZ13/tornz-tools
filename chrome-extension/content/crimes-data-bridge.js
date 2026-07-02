(function tornzCrimesDataBridge() {
  'use strict';

  if (window.__TORNZ_CRIMES_DATA_BRIDGE__) return;
  window.__TORNZ_CRIMES_DATA_BRIDGE__ = true;

  const MESSAGE_SOURCE = 'TORNZ_TOOLS_CRIMES_BRIDGE';

  function requestUrlFromInput(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function isCrimesDataRequest(input, init = {}) {
    const rawUrl = requestUrlFromInput(input);
    try {
      const url = new URL(rawUrl, window.location.origin);
      if (String(url.searchParams.get('sid') || '').toLowerCase() === 'crimesdata') return true;
    } catch (error) {
      if (/sid=crimesData/i.test(String(rawUrl || ''))) return true;
    }
    const body = init && init.body;
    if (!body) return false;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return String(body.get('sid') || '').toLowerCase() === 'crimesdata';
    if (typeof FormData !== 'undefined' && body instanceof FormData) return String(body.get('sid') || '').toLowerCase() === 'crimesdata';
    return /sid=crimesData/i.test(String(body || ''));
  }

  function postCrimesData(payload) {
    if (!payload || typeof payload !== 'object') return;
    window.postMessage({
      source: MESSAGE_SOURCE,
      type: 'CRIMES_DATA',
      payload
    }, window.location.origin);
  }

  function parseCrimesDataResponse(xhr) {
    if (xhr && xhr.response && typeof xhr.response === 'object') return xhr.response;
    const text = String((xhr && xhr.responseText) || '').trim();
    if (!text) return null;
    const jsonStart = text.indexOf('{');
    if (jsonStart < 0) return null;
    return JSON.parse(text.slice(jsonStart));
  }

  function patchFetch() {
    if (typeof window.fetch !== 'function' || window.__TORNZ_CRIMES_FETCH_BRIDGED__) return;
    const originalFetch = window.fetch.bind(window);
    window.__TORNZ_CRIMES_FETCH_BRIDGED__ = true;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      try {
        if (isCrimesDataRequest(args[0], args[1] || {})) {
          response.clone().json().then(postCrimesData).catch(() => {});
        }
      } catch (error) {
        // Bridge must never interfere with Torn's own request flow.
      }
      return response;
    };
  }

  function patchXhr() {
    if (!window.XMLHttpRequest || window.__TORNZ_CRIMES_XHR_BRIDGED__) return;
    window.__TORNZ_CRIMES_XHR_BRIDGED__ = true;
    const originalOpen = window.XMLHttpRequest.prototype.open;
    const originalSend = window.XMLHttpRequest.prototype.send;
    window.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
      this.__tornzCrimesUrl = String(url || '');
      return originalOpen.call(this, method, url, ...rest);
    };
    window.XMLHttpRequest.prototype.send = function patchedSend(...args) {
      this.addEventListener('load', function onLoad() {
        try {
          if (!isCrimesDataRequest(this.__tornzCrimesUrl || '', { body: args[0] })) return;
          postCrimesData(parseCrimesDataResponse(this));
        } catch (error) {
          // Read-only observer: ignore parse failures.
        }
      });
      return originalSend.apply(this, args);
    };
  }

  async function requestCrimesData(typeId) {
    const cleanTypeId = String(typeId || '').replace(/[^0-9]/g, '');
    if (!cleanTypeId || typeof window.fetch !== 'function') return;
    const url = new URL(`/page.php?sid=crimesData&typeID=${encodeURIComponent(cleanTypeId)}`, window.location.origin).href;
    const response = await window.fetch(url, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json, text/javascript, */*; q=0.01',
        'X-Requested-With': 'XMLHttpRequest'
      }
    });
    postCrimesData(await response.json());
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== window.location.origin) return;
    const message = event.data || {};
    if (!message || message.source !== 'TORNZ_TOOLS_CONTENT' || message.type !== 'REQUEST_CRIMES_DATA') return;
    requestCrimesData(message.typeId).catch(() => {});
  });

  patchFetch();
  patchXhr();
})();
