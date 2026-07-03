  function httpGetJson(url) {
    return new Promise((resolve, reject) => {
      const finish = (text, status) => {
        try {
          const json = JSON.parse(text || '{}');
          if (status && status >= 400) {
            const message = json && json.error ? `${json.error}${json.code ? ` (code ${json.code})` : ''}` : `HTTP ${status}`;
            reject(new Error(message));
          }
          else resolve(json);
        } catch (error) {
          reject(new Error(`Could not parse JSON from ${safeUrlForLog(url)}: ${error.message}`));
        }
      };

      if (isTornPda() && typeof PDA_httpGet === 'function') {
        try {
          PDA_httpGet(url).then((response) => finish(response, 200)).catch(reject);
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }

      if (GM_API.xhr) {
        try {
          const result = GM_API.xhr({
            method: 'GET',
            url,
            timeout: 30000,
            onload: (response) => finish(response.responseText, response.status),
            onerror: () => reject(new Error(`Request failed for ${safeUrlForLog(url)}`)),
            ontimeout: () => reject(new Error(`Request timed out for ${safeUrlForLog(url)}`))
          });
          if (result && typeof result.then === 'function') {
            result.then((response) => {
              if (response && response.responseText !== undefined) finish(response.responseText, response.status);
            }).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
        return;
      }

      fetch(url, { credentials: 'omit' })
        .then((response) => response.text().then((text) => finish(text, response.status)))
        .catch(reject);
    });
  }

  function httpPostJson(url, body = {}) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body || {});
      const finish = (text, status) => {
        const rawText = String(text || '').trim();
        if (rawText && /^[<]/.test(rawText)) {
          reject(new Error(`Non-JSON response from ${safeUrlForLog(url)}`));
          return;
        }
        try {
          const json = JSON.parse(rawText || '{}');
          if (status && status >= 400) {
            const message = json && json.error ? `${json.error}${json.code ? ` (code ${json.code})` : ''}` : `HTTP ${status}`;
            reject(new Error(message));
          }
          else resolve(json);
        } catch (error) {
          reject(new Error(`Could not parse JSON from ${safeUrlForLog(url)}: ${error.message}`));
        }
      };

      if (GM_API.xhr) {
        try {
          const result = GM_API.xhr({
            method: 'POST',
            url,
            headers: { 'Content-Type': 'application/json' },
            data: payload,
            timeout: 30000,
            onload: (response) => finish(response.responseText, response.status),
            onerror: () => reject(new Error(`Request failed for ${safeUrlForLog(url)}`)),
            ontimeout: () => reject(new Error(`Request timed out for ${safeUrlForLog(url)}`))
          });
          if (result && typeof result.then === 'function') {
            result.then((response) => {
              if (response && response.responseText !== undefined) finish(response.responseText, response.status);
            }).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
        return;
      }

      fetch(url, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).then((response) => response.text().then((text) => finish(text, response.status))).catch(reject);
    });
  }

  function httpGetText(url) {
    return new Promise((resolve, reject) => {
      const finish = (text, status) => {
        if (status && status >= 400) reject(new Error(`HTTP ${status}`));
        else resolve(String(text || ''));
      };

      if (isTornPda() && typeof PDA_httpGet === 'function') {
        try {
          PDA_httpGet(url).then((response) => finish(response, 200)).catch(reject);
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }

      if (GM_API.xhr) {
        try {
          const result = GM_API.xhr({
            method: 'GET',
            url,
            timeout: 30000,
            onload: (response) => finish(response.responseText, response.status),
            onerror: () => reject(new Error(`Request failed for ${safeUrlForLog(url)}`)),
            ontimeout: () => reject(new Error(`Request timed out for ${safeUrlForLog(url)}`))
          });
          if (result && typeof result.then === 'function') {
            result.then((response) => {
              if (response && response.responseText !== undefined) finish(response.responseText, response.status);
            }).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
        return;
      }

      fetch(url, { credentials: 'omit' })
        .then((response) => response.text().then((text) => finish(text, response.status)))
        .catch(reject);
    });
  }

  async function httpGetTornPageText(path) {
    const response = await fetch(path, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

