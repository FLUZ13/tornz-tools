  async function refreshData(force = false) {
    state.loading = true;
    state.error = '';
    renderPanel();

    try {
      const raw = await fetchTornData(force);
      const marketStocks = normalizeMarketStocks(raw.market && raw.market.stocks);
      const tornsy = await fetchTornsyData(marketStocks, force);
      state.raw = raw;
      state.tornsy = tornsy;
      state.data = normalizeAll(raw, tornsy);
      state.analyses = state.data.analyses;
      state.recommendations = buildRecommendations(state.analyses, state.data);
      state.error = state.data.warnings.length ? `Loaded with warning: ${state.data.warnings.join(' | ')}` : '';
      renderPanel();
      await runNotificationScan();
    } catch (error) {
      state.error = friendlyError(error);
      renderPanel();
    } finally {
      state.loading = false;
      renderPanel();
    }
  }

  async function refreshAnalysisOnly() {
    if (!state.raw) {
      renderPanel();
      return;
    }
    const tornsy = state.settings.enableTornsy ? state.tornsy : {};
    state.data = normalizeAll(state.raw, tornsy);
    state.analyses = state.data.analyses;
    state.recommendations = buildRecommendations(state.analyses, state.data);
    renderPanel();
  }

  async function refreshGymData(force = false) {
    state.loading = true;
    state.error = '';
    renderPanel();

    try {
      const raw = await fetchGymData(force);
      state.gymRaw = raw;
      state.gymData = normalizeGymData(raw);
      state.error = state.gymData.warnings.length ? `Loaded with warning: ${state.gymData.warnings.join(' | ')}` : '';
    } catch (error) {
      state.error = friendlyError(error);
    } finally {
      state.loading = false;
      renderPanel();
    }
  }

  async function refreshGymAnalysisOnly() {
    const scrollTop = getPanelContentScrollTop();
    if (!state.gymData) {
      renderPanel();
      restorePanelContentScrollTop(scrollTop);
      return;
    }
    state.gymData = normalizeGymData(state.gymRaw || { user: {}, items: {}, warnings: state.gymData.warnings || [] });
    renderPanel();
    restorePanelContentScrollTop(scrollTop);
  }

  async function refreshUtilityData(force = false) {
    try {
      state.utilityData = await fetchUtilityData(force);
    } catch (error) {
      state.utilityData = {
        user: {},
        items: {},
        warnings: [friendlyError(error)]
      };
    }
    renderPanel();
    if (utilityAutoRefreshEnabled()) state.utilityScanSignature = currentUtilityScanSignature();
  }

  function friendlyError(error) {
    const message = error && error.message ? error.message : String(error);
    if (/non-json|parse json|<!doctype|unexpected token/i.test(message)) return 'Source returned a temporary web/error page instead of data. Using cached rows if available.';
    if (/api.*2|incorrect|invalid/i.test(message)) return `${message}. Check that your API key is correct and has Limited Access.`;
    if (/rate/i.test(message)) return `${message}. Torn may be rate limiting requests; wait a minute and refresh.`;
    return message;
  }

  function showFlash(message) {
    const old = $(`#${APP.id}-flash`);
    if (old) old.remove();
    const flash = document.createElement('div');
    flash.id = `${APP.id}-flash`;
    flash.textContent = message;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 3600);
  }

  function isPanelInputFocused() {
    const active = document.activeElement;
    return !!(active && active.closest && active.closest(`#${APP.id} input, #${APP.id} textarea, #${APP.id} select, #${APP.id}-modal input, #${APP.id}-modal textarea, #${APP.id}-modal select`));
  }

  function watchPageLocation() {
    if (state.locationWatchStarted) return;
    state.locationWatchStarted = true;
    let lastHref = window.location.href;
    setInterval(() => {
      if (window.location.href === lastHref) return;
      lastHref = window.location.href;
      const mode = detectToolMode();
      if (!mode) {
        removeAppUi();
        return;
      }
      state.mode = mode;
      ensurePanel();
      removeNativeSearch();
      if (mode === 'stocks' && state.apiKey) refreshData(false);
      if (mode === 'gym') refreshGymData(false);
      if (mode === 'utility') {
        refreshUtilityData(false);
        const module = getUtilityModule();
        if (module.key === 'itemmarket') {
          scheduleItemMarketBazaarPanel(isItemMarketBrowseItemPage());
        } else {
          renderNativeItemMarketBazaarPanel();
        }
        if (module.key === 'travel') loadTravelYataData(false);
        if (module.key === 'crimes') {
          loadCrimeProfitabilityData(false);
          scheduleCrimeProfitabilityLabels();
          if (isBootleggingCrimePage()) scheduleBootleggingButtonLabels();
          if (isPickpocketCrimePage()) schedulePickpocketFormatting();
          else clearPickpocketFormatting();
          if (isCrackingCrimePage()) scheduleCrackingScan();
          scheduleCrimeMoraleRefresh();
        }
        setTimeout(() => refreshTargetStatuses(true), 500);
      }
    }, 1000);
  }

  function utilityAutoRefreshEnabled() {
    if (state.mode !== 'utility') return false;
    const module = getUtilityModule();
    return module && (module.key === 'bazaar' || (module.key === 'itemmarket' && isItemMarketListingToolPage()));
  }

  function currentUtilityScanSignature() {
    if (!utilityAutoRefreshEnabled()) return '';
    const rows = scanVisibleMarketItemRows();
    if (rows.length) {
      return rows.map((row) => `${row.name}|${row.quantity}|${Math.round(row.price)}`).join('::');
    }
    return scanVisibleMoneyValues().slice(0, 8).map((value) => Math.round(value)).join('::');
  }

  function inventoryScanSignature() {
    return scanVisibleInventoryStacks()
      .slice(0, 60)
      .map((item) => `${item.name}|${item.quantity}|${Math.round(item.value)}`)
      .join('::');
  }

  function scheduleInventoryPanelScan() {
    clearTimeout(state.inventoryScanTimer);
    state.inventoryScanTimer = setTimeout(() => {
      if (state.mode !== 'utility' || getUtilityModule().key !== 'items') return;
      const nextSignature = inventoryScanSignature();
      if (!nextSignature || nextSignature === state.inventoryScanSignature) return;
      state.inventoryScanSignature = nextSignature;
      if (!isPanelInputFocused()) renderPanelKeepingScroll();
    }, 180);
  }

  function watchUtilityDomChanges() {
    if (state.utilityDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.utilityDomWatchStarted = true;
    let refreshTimer = null;
    let highlightTimer = null;
    const observer = new MutationObserver((mutations) => {
      const module = state.mode === 'utility' ? getUtilityModule() : null;
      const itemMarketBrowse = module && module.key === 'itemmarket' && isItemMarketPage() && !isItemMarketListingToolPage();
      const inventoryPage = module && module.key === 'items';
      if (!utilityAutoRefreshEnabled() && !itemMarketBrowse && !inventoryPage) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`);
      });
      if (!relevant) return;
      if (itemMarketBrowse) {
        clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => applyItemMarketValueHighlights(), 180);
        if (!utilityAutoRefreshEnabled()) return;
      }
      if (inventoryPage) {
        scheduleInventoryPanelScan();
        return;
      }
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        const nextSignature = currentUtilityScanSignature();
        if (!nextSignature || nextSignature === state.utilityScanSignature) return;
        state.utilityScanSignature = nextSignature;
        const scrollTop = getPanelContentScrollTop();
        renderPanel();
        restorePanelContentScrollTop(scrollTop);
      }, 350);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function itemMarketIdFromButton(button) {
    const controls = button ? String(button.getAttribute('aria-controls') || '') : '';
    const parts = controls.split('-').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function itemMarketNameFromTile(tile) {
    if (!tile) return '';
    const nameEl = $(tornCssModuleSelector('name'), tile)
      || $('[class^="name___"]', tile)
      || $('[class*=" name___"]', tile);
    const text = nameEl ? String(nameEl.textContent || '').trim() : '';
    return text.replace(/\s+/g, ' ');
  }

  function applyItemMarketValueHighlights() {
    if (!isItemMarketPage()) return 0;
    const highlighted = [];
    document.querySelectorAll('.fluz-market-highlight').forEach((node) => node.classList.remove('fluz-market-highlight'));
    if (!state.utility.marketHighlightEnabled) return 0;
    const thresholdRaw = state.utility.marketHighlightThresholdPct;
    if (thresholdRaw == null || thresholdRaw === '') return 0;
    const thresholdPct = parseNumber(thresholdRaw);
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    const candidates = Array.from(document.querySelectorAll('button[aria-controls^="wai-itemInfo-"]'))
      .map((node) => closestItemMarketTile(node))
      .filter(Boolean);
    const seen = new Set();
    candidates.forEach((tile) => {
      if (!tile || tile.closest(`#${APP.id}, #${APP.id}-modal`) || seen.has(tile)) return;
      seen.add(tile);
      const text = cleanBookieText(tile.innerText || tile.textContent || '');
      if (!text || !/\$[\d,.]+[kmbt]?/i.test(text)) return;
      const item = findKnownItemInText(text, known);
      if (!item) return;
      const price = extractFirstMoneyFromText(text);
      if (!price) return;
      const maxPrice = item.value * (1 + thresholdPct / 100);
      if (price <= maxPrice) {
        tile.classList.add('fluz-market-highlight');
        highlighted.push(tile);
      }
    });
    return highlighted.length;
  }

  function closestItemMarketTile(node) {
    if (!node || !node.closest) return null;
    if (node.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`)) return null;
    for (let current = node.parentElement || node; current && current !== document.body; current = current.parentElement) {
      if (current.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`)) return null;
      const rect = current.getBoundingClientRect ? current.getBoundingClientRect() : { width: 0, height: 0 };
      const text = cleanBookieText(current.innerText || current.textContent || '');
      const compactTile = rect.width >= 70 && rect.width <= 230 && rect.height >= 70 && rect.height <= 230;
      if (compactTile && /\$[\d,.]+[kmbt]?/i.test(text)) return current;
      if (rect.width > 280 || rect.height > 280) break;
    }
    return null;
  }

  function findItemMarketBazaarPlacement(preferCurrent = true) {
    const currentId = currentItemMarketItemId();
    const wrappers = $all(tornCssModuleSelector('sellerListWrapper'))
      .filter((wrapper) => !wrapper.closest(`#${APP.id}, #${APP.id}-modal`));
    const placements = wrappers.map((wrapper) => {
      const tile = wrapper.previousElementSibling;
      const button = tile ? $('button[aria-controls^="wai-itemInfo-"]', tile) : null;
      const itemId = itemMarketIdFromButton(button) || currentId;
      const itemName = itemMarketNameFromTile(tile);
      return { target: wrapper, mode: 'inside', itemId, itemName };
    }).filter((item) => item.target && item.itemId);
    const exact = preferCurrent && currentId ? placements.find((item) => item.itemId === currentId) : null;
    if (exact) return exact;
    if (placements.length) return placements[0];

    const sellerList = $(tornUlCssModuleSelector('sellerList'));
    if (sellerList && sellerList.parentElement) {
      const header = $(tornCssModuleSelector('itemsHeader'));
      const button = header ? $('button[aria-controls^="wai-itemInfo-"]', header) : null;
      const title = header ? String(($(tornCssModuleSelector('title'), header) || header).textContent || '').trim().replace(/\s+/g, ' ') : '';
      return {
        target: sellerList,
        mode: 'before',
        itemId: itemMarketIdFromButton(button) || currentId,
        itemName: title && !/item market|most popular/i.test(title) ? title : ''
      };
    }
    return null;
  }

  function getNativeMarketBazaarScrollTop(panel) {
    const list = panel ? $('.fluz-market-bazaar-compact-list', panel) : null;
    return list ? list.scrollTop : 0;
  }

  function restoreNativeMarketBazaarScrollTop(panel, scrollTop) {
    requestAnimationFrame(() => {
      const list = panel ? $('.fluz-market-bazaar-compact-list', panel) : null;
      if (list) list.scrollTop = scrollTop || 0;
    });
  }

