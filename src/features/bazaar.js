  function renderNativeItemMarketBazaarPanel() {
    const existing = $('#fluz-itemmarket-bazaar-native');
    if (!isItemMarketBrowseItemPage()) {
      if (existing) existing.remove();
      return false;
    }
    const placement = findItemMarketBazaarPlacement(true);
    if (!placement || !placement.target) return false;
    if (placement.itemName) {
      state.itemMarketBazaarTitle = placement.itemName;
      state.itemMarketBazaarTitleItemId = placement.itemId || currentItemMarketItemId();
    }
    const panel = existing || document.createElement('div');
    const scrollTop = getNativeMarketBazaarScrollTop(existing);
    panel.id = 'fluz-itemmarket-bazaar-native';
    panel.innerHTML = renderItemMarketBazaarHtml({ native: true });
    if (placement.mode === 'inside') {
      if (panel.parentElement !== placement.target || panel !== placement.target.firstElementChild) {
        placement.target.insertBefore(panel, placement.target.firstChild);
      }
    } else if (placement.target.parentElement && (panel.parentElement !== placement.target.parentElement || panel.nextSibling !== placement.target)) {
      placement.target.parentElement.insertBefore(panel, placement.target);
    }
    bindNativeItemMarketBazaarPanel(panel);
    restoreNativeMarketBazaarScrollTop(panel, scrollTop);
    return true;
  }

  function bindNativeItemMarketBazaarPanel(panel) {
    if (!panel || panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';
    panel.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'refresh-market-bazaar') {
        event.preventDefault();
        await loadItemMarketBazaarListings(true);
      }
      if (action === 'sort-market-bazaar') {
        event.preventDefault();
        await sortItemMarketBazaarListings(button.dataset.sortKey);
      }
      if (action === 'open-bazaar-link') {
        event.preventDefault();
        await openBazaarLink(button.dataset.bazaarUrl, button.dataset.bazaarVisitKey, button.dataset.bazaarSellerKey);
      }
    });
    panel.addEventListener('change', async (event) => {
      const minInput = event.target.closest('[data-native-market-bazaar-min]');
      const ageInput = event.target.closest('[data-native-market-bazaar-age]');
      if (!minInput && !ageInput) return;
      if (minInput) state.utility.marketBazaarMinQty = Math.max(1, parseNumber(minInput.value || 1));
      if (ageInput) state.utility.marketBazaarMaxAgeMinutes = Math.max(0, parseNumber(ageInput.value || 0));
      await saveUtilityState();
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
    });
  }

  function scheduleItemMarketBazaarPanel(load = false) {
    clearTimeout(state.itemMarketBazaarTimer);
    state.itemMarketBazaarTimer = setTimeout(() => {
      if (!isItemMarketBrowseItemPage()) {
        renderNativeItemMarketBazaarPanel();
        return;
      }
      renderNativeItemMarketBazaarPanel();
      if (load) loadItemMarketBazaarListings(false);
      for (const delay of [250, 750, 1500, 3000]) {
        setTimeout(() => {
          if (isItemMarketBrowseItemPage()) renderNativeItemMarketBazaarPanel();
        }, delay);
      }
    }, 120);
  }

  function watchItemMarketBazaarDomChanges() {
    if (state.itemMarketBazaarDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.itemMarketBazaarDomWatchStarted = true;
    let timer = null;
    const observer = new MutationObserver((mutations) => {
      if (!isItemMarketBrowseItemPage()) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`);
      });
      if (!relevant) return;
      clearTimeout(timer);
      timer = setTimeout(() => renderNativeItemMarketBazaarPanel(), 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

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

  function parseCrimesDataResponse(xhr) {
    if (xhr && xhr.response && typeof xhr.response === 'object') return xhr.response;
    const text = String((xhr && xhr.responseText) || '').trim();
    if (!text) return null;
    const jsonStart = text.indexOf('{');
    if (jsonStart < 0) return null;
    return JSON.parse(text.slice(jsonStart));
  }

  function currentCrimeSlug() {
    const hash = String(currentUrl().hash || '').replace(/^#\/?/, '').replace(/\/.*$/, '');
    return hash.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function currentCrimeTypeId() {
    const slug = currentCrimeSlug();
    return CRIME_TYPE_IDS[slug] || '';
  }

  function isCrackingCrimePage() {
    return currentCrimeSlug() === 'cracking' || /#\/cracking/i.test(String(currentUrl().hash || ''));
  }

  function normalizeCrackingWord(value) {
    const word = String(value || '').trim().toUpperCase();
    if (word.length < CRACKING_HELPER.minLength || word.length > CRACKING_HELPER.maxLength) return '';
    return /^[A-Z0-9_.]+$/.test(word) ? word : '';
  }

  function openCrackingDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available.'));
        return;
      }
      const request = indexedDB.open(CRACKING_HELPER.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CRACKING_HELPER.storeName)) db.createObjectStore(CRACKING_HELPER.storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open cracking cache.'));
    });
  }

  async function crackingDbGet(key) {
    const db = await openCrackingDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CRACKING_HELPER.storeName, 'readonly');
      const request = tx.objectStore(CRACKING_HELPER.storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function crackingDbSet(key, value) {
    const db = await openCrackingDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CRACKING_HELPER.storeName, 'readwrite');
      tx.objectStore(CRACKING_HELPER.storeName).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function crackingDbClear() {
    const db = await openCrackingDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CRACKING_HELPER.storeName, 'readwrite');
      tx.objectStore(CRACKING_HELPER.storeName).clear();
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  function seedCrackingWordsForLength(length) {
    return CRACKING_HELPER.seedWords
      .map(normalizeCrackingWord)
      .filter((word) => word.length === length);
  }

  async function getCrackingWordsForLength(length) {
    const len = Math.floor(parseNumber(length));
    if (len < CRACKING_HELPER.minLength || len > CRACKING_HELPER.maxLength) return [];
    if (Array.isArray(crackingDictCache[len])) return crackingDictCache[len];
    let words = [];
    try {
      words = await crackingDbGet(`len_${len}`) || [];
    } catch (error) {
      words = [];
    }
    if (!Array.isArray(words) || !words.length) words = seedCrackingWordsForLength(len);
    crackingDictCache[len] = words;
    return words;
  }

  async function addCrackingWordToLocalCache(value) {
    const word = normalizeCrackingWord(value);
    if (!word) return false;
    const len = word.length;
    const words = await getCrackingWordsForLength(len);
    if (words.includes(word)) return false;
    const next = [...words, word].sort();
    crackingDictCache[len] = next;
    await crackingDbSet(`len_${len}`, next);
    state.crackingStats = { ...(state.crackingStats || {}), [len]: next.length };
    return true;
  }

  async function refreshCrackingStats() {
    const stats = {};
    for (let len = CRACKING_HELPER.minLength; len <= CRACKING_HELPER.maxLength; len += 1) {
      const words = await getCrackingWordsForLength(len);
      stats[len] = words.length;
    }
    state.crackingStats = stats;
    return stats;
  }

  async function loadCrackingPublicWordlist() {
    if (state.crackingLoading) return;
    state.crackingLoading = true;
    state.crackingStatus = 'downloading';
    renderPanelKeepingScroll();
    try {
      const text = await httpGetText(CRACKING_HELPER.publicWordlistUrl);
      const buckets = {};
      String(text || '').split(/\r?\n/).forEach((line) => {
        const word = normalizeCrackingWord(line);
        if (!word) return;
        if (!buckets[word.length]) buckets[word.length] = new Set();
        buckets[word.length].add(word);
      });
      for (const [len, set] of Object.entries(buckets)) {
        const length = Math.floor(parseNumber(len));
        const existing = await getCrackingWordsForLength(length);
        const merged = Array.from(new Set([...existing, ...set])).sort();
        crackingDictCache[length] = merged;
        await crackingDbSet(`len_${length}`, merged);
      }
      await refreshCrackingStats();
      state.crackingStatus = 'ready';
      showFlash('Cracking wordlist loaded locally.');
      scheduleCrackingScan();
    } catch (error) {
      state.crackingStatus = 'load failed';
      showFlash(`Cracking wordlist failed: ${friendlyError(error)}`);
    } finally {
      state.crackingLoading = false;
      renderPanelKeepingScroll();
    }
  }

  async function clearCrackingWordlist() {
    try {
      await crackingDbClear();
      Object.keys(crackingDictCache).forEach((key) => { delete crackingDictCache[key]; });
      state.crackingStats = {};
      state.crackingStatus = 'cleared';
      showFlash('Cracking local wordlist cleared.');
      removeCrackingPanels();
      renderPanelKeepingScroll();
    } catch (error) {
      showFlash(`Could not clear cracking cache: ${friendlyError(error)}`);
    }
  }

  function crackingExclusionKey(rowKey, length) {
    return `fluz.cracking.excl.${rowKey}.${length}`;
  }

  function loadCrackingExclusions(rowKey, length) {
    let parsed = [];
    try {
      parsed = JSON.parse(sessionStorage.getItem(crackingExclusionKey(rowKey, length)) || '[]');
    } catch (error) {
      parsed = [];
    }
    return Array.from({ length }, (_, index) => new Set(Array.isArray(parsed[index]) ? parsed[index] : []));
  }

  function saveCrackingExclusions(rowKey, length, sets) {
    const payload = Array.from({ length }, (_, index) => Array.from(sets[index] || []));
    sessionStorage.setItem(crackingExclusionKey(rowKey, length), JSON.stringify(payload));
  }

  function addCrackingExclusion(rowKey, position, letter, length) {
    const clean = String(letter || '').trim().toUpperCase();
    if (!/^[A-Z0-9_.]$/.test(clean)) return;
    const sets = loadCrackingExclusions(rowKey, length);
    if (!sets[position]) sets[position] = new Set();
    const before = sets[position].size;
    sets[position].add(clean);
    if (sets[position].size !== before) saveCrackingExclusions(rowKey, length, sets);
  }

  async function suggestCrackingWords(pattern, rowKey) {
    const pat = String(pattern || '').toUpperCase();
    const len = pat.length;
    if (len < CRACKING_HELPER.minLength || len > CRACKING_HELPER.maxLength) return [];
    const words = await getCrackingWordsForLength(len);
    const regex = new RegExp(`^${pat.replace(/[*]/g, '.')}$`);
    const exclusions = loadCrackingExclusions(rowKey, len);
    const max = clamp(Math.floor(parseNumber(state.utility.crackingMaxSuggestions || 8)), 1, 20);
    const out = [];
    for (const word of words) {
      if (!regex.test(word)) continue;
      if (Array.from(word).some((char, index) => exclusions[index] && exclusions[index].has(char))) continue;
      out.push(word);
      if (out.length >= max) break;
    }
    return out;
  }

  function getCrackingRowKey(row) {
    if (!row.dataset.fluzCrackingKey) row.dataset.fluzCrackingKey = `crack-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return row.dataset.fluzCrackingKey;
  }

  function scheduleCrackingPanelUpdate(panel) {
    if (!panel) return;
    const key = panel.dataset.rowkey || '';
    if (crackingPanelTimers.has(key)) clearTimeout(crackingPanelTimers.get(key));
    crackingPanelTimers.set(key, setTimeout(() => {
      if (panel.updateSuggestions) panel.updateSuggestions();
      crackingPanelTimers.delete(key);
    }, 80));
  }

  function renderCrackingPanel(row, pattern, rowKey) {
    let panel = row.querySelector('.fluz-cracking-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'fluz-cracking-panel';
      panel.dataset.rowkey = rowKey;
      panel.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-cracking-copy]');
        if (!button) return;
        event.preventDefault();
        await copyUtilityText(button.dataset.crackingCopy || '');
      });
      panel.updateSuggestions = async () => {
        const currentPattern = panel.dataset.pattern || '';
        const suggestions = await suggestCrackingWords(currentPattern, panel.dataset.rowkey || rowKey);
        if (!suggestions.length) {
          panel.innerHTML = `<span class="is-muted">${escapeHtml(state.crackingLoading ? 'loading...' : 'no matches')}</span>`;
          return;
        }
        panel.innerHTML = suggestions.map((word) => `<button type="button" data-cracking-copy="${escapeHtml(word)}" title="Copy ${escapeHtml(word)}">${escapeHtml(word)}</button>`).join('');
      };
      row.prepend(panel);
    }
    panel.dataset.pattern = pattern;
    scheduleCrackingPanelUpdate(panel);
  }

  function removeCrackingPanels() {
    document.querySelectorAll('.fluz-cracking-panel').forEach((node) => node.remove());
    crackingPanelTimers.forEach((timer) => clearTimeout(timer));
    crackingPanelTimers.clear();
  }

  function attachCrackingSlotSensors(row, rowKey) {
    if (row.dataset.fluzCrackingDelegated === '1') return;
    row.dataset.fluzCrackingDelegated = '1';
    const slotSelector = '[class^="charSlot"]:not([class*="charSlotDummy"])';
    const onCue = (event) => {
      const slot = event.target && event.target.closest ? event.target.closest(slotSelector) : null;
      if (!slot || !row.contains(slot)) return;
      const slots = Array.from(row.querySelectorAll(slotSelector));
      const index = slots.indexOf(slot);
      if (index < 0) return;
      const shown = String(slot.textContent || '').trim();
      if (shown && /^[A-Za-z0-9._]$/.test(shown)) return;
      const previous = crackingPrevRowStates.get(rowKey) || {};
      const now = performance.now();
      const recentRow = previous.lastInput && previous.lastInput.i === index && now - previous.lastInput.time <= 1800;
      const letter = recentRow ? previous.lastInput.letter : (now - crackingLastInput.time <= 1800 ? crackingLastInput.key : '');
      if (!letter) return;
      addCrackingExclusion(rowKey, index, letter, slots.length);
      const panel = row.querySelector('.fluz-cracking-panel');
      scheduleCrackingPanelUpdate(panel);
    };
    row.addEventListener('animationstart', onCue, true);
    row.addEventListener('transitionend', onCue, true);
  }

  function scanCrackingCrimePage() {
    if (!isCrackingCrimePage()) {
      removeCrackingPanels();
      return false;
    }
    const currentCrime = $('[class^="currentCrime"]');
    const container = currentCrime ? $('[class^="virtualList"]', currentCrime) : null;
    if (!container) return false;
    const rows = $all('[class^="crimeOptionWrapper"]', container);
    if (!rows.length) return false;
    rows.forEach((row) => {
      const rowKey = getCrackingRowKey(row);
      attachCrackingSlotSensors(row, rowKey);
      const slots = $all('[class^="charSlot"]:not([class*="charSlotDummy"])', row);
      const chars = slots.map((slot) => {
        const ch = String(slot.textContent || '').trim().toUpperCase();
        return /^[A-Z0-9_.]$/.test(ch) ? ch : '*';
      });
      if (!chars.length) return;
      const now = performance.now();
      const previous = crackingPrevRowStates.get(rowKey) || { chars: Array(chars.length).fill('*') };
      chars.forEach((char, index) => {
        const was = previous.chars && previous.chars[index] ? previous.chars[index] : '*';
        if (was === '*' && char !== '*') previous.lastInput = { i: index, letter: char, time: now };
        if (was !== '*' && char === '*' && previous.lastInput && previous.lastInput.i === index && previous.lastInput.letter === was && now - previous.lastInput.time <= 1800) {
          addCrackingExclusion(rowKey, index, was, chars.length);
        }
      });
      crackingPrevRowStates.set(rowKey, { chars, lastInput: previous.lastInput, time: now });
      const pattern = chars.join('');
      const complete = pattern && !pattern.includes('*');
      if (complete) addCrackingWordToLocalCache(pattern).catch(() => {});
      if (pattern && !/^[*]+$/.test(pattern) && (!complete || state.utility.crackingShowComplete)) renderCrackingPanel(row, pattern, rowKey);
      else {
        const existing = row.querySelector('.fluz-cracking-panel');
        if (existing) existing.remove();
      }
    });
    state.crackingStatus = state.crackingStatus || 'active';
    return true;
  }

  function scheduleCrackingScan() {
    clearTimeout(state.crackingScanTimer);
    state.crackingScanTimer = setTimeout(() => scanCrackingCrimePage(), 180);
  }

  function watchCrackingDomChanges() {
    if (state.crackingDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.crackingDomWatchStarted = true;
    window.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[A-Za-z0-9._]$/.test(event.key || '')) {
        crackingLastInput.key = String(event.key).toUpperCase();
        crackingLastInput.time = performance.now();
      }
    }, true);
    const observer = new MutationObserver((mutations) => {
      if (!/sid=crimes/i.test(window.location.href) || !isCrackingCrimePage()) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal`) && !target.closest('.fluz-cracking-panel');
      });
      if (relevant) scheduleCrackingScan();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(() => {
      if (isCrackingCrimePage()) scheduleCrackingScan();
    }, 1000);
  }

  async function refreshCrimeMoraleFromPageData(force = false) {
    if (isCrimesHubPage()) {
      state.crimeMoraleStatus = 'open crime';
      if (force) showFlash('Open a specific crime first.');
      renderPanelKeepingScroll();
      return false;
    }
    const typeId = currentCrimeTypeId();
    if (!typeId) {
      state.crimeMoraleStatus = 'unknown crime';
      if (force) showFlash('Could not detect this crime type yet.');
      renderPanelKeepingScroll();
      return false;
    }
    const requestKey = `${currentCrimeSlug()}:${typeId}`;
    const now = nowMs();
    if (!force && state.crimeMoraleRequestKey === requestKey && now - state.crimeMoraleRequestAt < 30000) return false;
    if (state.crimeMoraleLoading) return false;
    state.crimeMoraleLoading = true;
    state.crimeMoraleRequestKey = requestKey;
    state.crimeMoraleRequestAt = now;
    state.crimeMoraleStatus = 'loading';
    try {
      const response = await fetch(`/page.php?sid=crimesData&typeID=${encodeURIComponent(typeId)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      const payload = await response.json();
      const before = state.crimeMorale ? state.crimeMorale.morale : null;
      handleCrimesDataPayload(payload);
      const after = state.crimeMorale ? state.crimeMorale.morale : null;
      state.crimeMoraleStatus = after == null ? 'no demMod' : 'live';
      if (force) showFlash(after == null || after === before ? 'Morale data refreshed.' : 'Morale updated.');
      return after != null;
    } catch (error) {
      state.crimeMoraleStatus = 'failed';
      if (force) showFlash(`Morale refresh failed: ${friendlyError(error)}`);
      return false;
    } finally {
      state.crimeMoraleLoading = false;
      const module = getUtilityModule();
      if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
    }
  }

  function scheduleCrimeMoraleRefresh() {
    if (isCrimesHubPage()) return;
    setTimeout(() => refreshCrimeMoraleFromPageData(false), 700);
    setTimeout(() => refreshCrimeMoraleFromPageData(false), 2200);
  }

  async function refreshBootleggingFromPageData(force = false) {
    if (!isBootleggingCrimePage()) {
      if (force) showFlash('Open Bootlegging first.');
      return false;
    }
    const typeId = currentCrimeTypeId() || CRIME_TYPE_IDS.bootlegging;
    const requestKey = `bootlegging:${typeId}`;
    const now = nowMs();
    if (!force && state.bootleggingRequestKey === requestKey && now - state.bootleggingRequestAt < 30000) {
      return applyBootleggingButtonLabels();
    }
    if (state.bootleggingLoading) return false;
    state.bootleggingLoading = true;
    state.bootleggingRequestKey = requestKey;
    state.bootleggingRequestAt = now;
    try {
      const response = await fetch(`/page.php?sid=crimesData&typeID=${encodeURIComponent(typeId)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      const payload = await response.json();
      handleCrimesDataPayload(payload);
      const hasData = !!(state.bootleggingData && buildBootleggingRows(state.bootleggingData).length);
      if (!hasData) ensureBootleggingDataFromVisiblePage();
      scheduleBootleggingButtonLabels();
      const touched = applyBootleggingButtonLabels();
      if (force) showFlash(touched ? 'Bootlegging helper refreshed.' : 'Bootlegging data not visible yet.');
      return touched;
    } catch (error) {
      const touched = ensureBootleggingDataFromVisiblePage() && applyBootleggingButtonLabels();
      if (force) showFlash(touched ? 'Bootlegging visible counts labeled.' : `Bootlegging refresh failed: ${friendlyError(error)}`);
      return touched;
    } finally {
      state.bootleggingLoading = false;
      const module = getUtilityModule();
      if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
    }
  }

  function scheduleBootleggingRefresh() {
    if (!isBootleggingCrimePage()) return;
    [500, 1500, 3500].forEach((delayMs) => {
      setTimeout(() => {
        refreshBootleggingFromPageData(false).catch(() => {});
      }, delayMs);
    });
    scheduleBootleggingButtonLabels();
  }

  function watchCrimesData() {
    if (state.crimesDataWatchStarted) return;
    state.crimesDataWatchStarted = true;
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (!pageWindow) return;
    if (typeof pageWindow.fetch === 'function' && !pageWindow.__TORNZ_CRIMES_FETCH_PATCHED__) {
      const originalFetch = pageWindow.fetch.bind(pageWindow);
      pageWindow.__TORNZ_CRIMES_FETCH_PATCHED__ = true;
      pageWindow.fetch = async (...args) => {
        const response = await originalFetch(...args);
        try {
          if (isCrimesDataRequest(args[0], args[1] || {})) {
            response.clone().json()
              .then(handleCrimesDataPayload)
              .catch(() => {});
          }
        } catch (error) {
          console.debug(`${APP.name}: crimesData fetch watch failed`, error);
        }
        return response;
      };
    }
    if (pageWindow.XMLHttpRequest && !pageWindow.__TORNZ_CRIMES_XHR_PATCHED__) {
      pageWindow.__TORNZ_CRIMES_XHR_PATCHED__ = true;
      const originalOpen = pageWindow.XMLHttpRequest.prototype.open;
      const originalSend = pageWindow.XMLHttpRequest.prototype.send;
      pageWindow.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
        this.__tornzUrl = String(url || '');
        return originalOpen.call(this, method, url, ...rest);
      };
      pageWindow.XMLHttpRequest.prototype.send = function patchedSend(...args) {
        this.addEventListener('load', function onLoad() {
          try {
            if (!isCrimesDataRequest(this.__tornzUrl || '', { body: args[0] })) return;
            const payload = parseCrimesDataResponse(this);
            if (payload) handleCrimesDataPayload(payload);
          } catch (error) {
            console.debug(`${APP.name}: crimesData xhr watch failed`, error);
          }
        });
        return originalSend.apply(this, args);
      };
    }
  }

  function handleCrimesDataPayload(payload) {
    updateCrimeMoraleFromPayload(payload);
    const bootleggingData = normalizeBootleggingCrimesData(payload);
    if (bootleggingData) {
      state.bootleggingData = bootleggingData;
      applyBootleggingButtonLabels();
      scheduleBootleggingButtonLabels();
    }
    if (isPickpocketCrimePage()) schedulePickpocketFormatting();
    applyCrimeProfitabilityLabels();
    const module = getUtilityModule();
    if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) {
      renderPanelKeepingScroll();
    }
  }

  function updateCrimeMoraleFromPayload(payload) {
    const rawDemMod = findNestedValue(payload, 'demMod');
    if (rawDemMod == null || rawDemMod === '') return;
    const demMod = parseNumber(rawDemMod);
    if (!Number.isFinite(demMod)) return;
    state.crimeMorale = {
      morale: clamp(100 - demMod, 0, 100),
      demMod,
      label: 'Crime 2.0',
      updatedText: 'live'
    };
    writeJsonStorage(STORAGE.crimeMorale, {
      morale: state.crimeMorale.morale,
      demMod,
      label: state.crimeMorale.label,
      fetchedAt: nowMs()
    });
  }

  function findNestedValue(value, key, depth = 0) {
    if (!value || depth > 5) return null;
    if (typeof value !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findNestedValue(item, key, depth + 1);
        if (found != null) return found;
      }
      return null;
    }
    for (const item of Object.values(value)) {
      const found = findNestedValue(item, key, depth + 1);
      if (found != null) return found;
    }
    return null;
  }

  function watchBootleggingDomChanges() {
    if (state.bootleggingDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.bootleggingDomWatchStarted = true;
    let labelTimer = null;
    const observer = new MutationObserver(() => {
      if (!state.bootleggingData || !isBootleggingCrimePage()) return;
      clearTimeout(labelTimer);
      labelTimer = setTimeout(() => applyBootleggingButtonLabels(), 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function watchPickpocketDomChanges() {
    if (state.pickpocketDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.pickpocketDomWatchStarted = true;
    const observer = new MutationObserver((mutations) => {
      if (!isPickpocketCrimePage()) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal, #fluz-pickpocket-controls`);
      });
      if (relevant) schedulePickpocketFormatting();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function watchCrimeProfitDomChanges() {
    if (state.crimeProfitDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.crimeProfitDomWatchStarted = true;
    let labelTimer = null;
    const observer = new MutationObserver((mutations) => {
      if (!/sid=crimes/i.test(window.location.href)) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal`) && !target.closest('.fluz-crime-profit-chip');
      });
      if (!relevant) return;
      clearTimeout(labelTimer);
      labelTimer = setTimeout(() => applyCrimeProfitabilityLabels(), 350);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function watchTargetTimers() {
    if (state.targetTimerWatchStarted) return;
    state.targetTimerWatchStarted = true;
    setInterval(() => {
      if (state.mode !== 'utility') return;
      const module = getUtilityModule();
      if (!moduleHasTargetTools(module)) return;
      if (!normalizeTargets(state.utility.targets).some((target) => targetCountdownNeedsTick(target))) return;
      patchTargetStatusDom();
    }, 1000);
    setInterval(() => {
      refreshTargetStatuses(false);
    }, 30000);
    setInterval(() => {
      checkUtilityTimerAlerts();
    }, 1000);
  }
