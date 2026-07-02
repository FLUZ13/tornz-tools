  async function init() {
    watchCrimesData();
    await loadSettings();
    state.mode = detectToolMode();
    if (!state.mode) {
      removeAppUi();
      return;
    }
    window.__TORNZ_TOOLS_DEBUG__ = {
      version: APP.version,
      state,
      showPanel: () => {
        state.panel.collapsed = false;
        ensurePanel();
      },
      refresh: () => refreshData(true),
      refreshGym: () => refreshGymData(true),
      openProfile: () => openProfileFromExtension(),
      filterStock: (acronym) => findStockOnPage(acronym),
      clearFilter: () => clearNativeStockFilter(),
      looksLikeStocksPage,
      looksLikeGymPage
    };
    window.__TORNZ_MONEY_HELPER_DEBUG__ = window.__TORNZ_TOOLS_DEBUG__;

    if (!state.apiKey && state.mode === 'stocks') {
      state.panel.activeTab = 'signals';
      state.panel.collapsed = false;
    }

    ensurePanel();
    if (!state.apiKey && (state.mode === 'stocks' || state.mode === 'gym')) setTimeout(openProfileWindow, 100);
    bindEvents();
    watchUtilityDomChanges();
    watchItemMarketBazaarDomChanges();
    watchCrimesData();
    watchBootleggingDomChanges();
    watchPickpocketDomChanges();
    watchCrackingDomChanges();
    watchCrimeProfitDomChanges();
    watchTargetTimers();
    registerMenuCommand(`${APP.name}: Show panel`, () => {
      state.panel.collapsed = false;
      state.panel.x = null;
      state.panel.y = null;
      state.panel.activeTab = 'signals';
      ensurePanel();
      if (!state.apiKey && state.mode === 'stocks') setTimeout(openProfileWindow, 100);
      savePanelState();
    });
    registerMenuCommand(`${APP.name}: Reset panel position`, () => resetPanelPosition());
    registerMenuCommand(`${APP.name}: Profile / API key`, () => openProfileWindow());
    registerMenuCommand(`${APP.name}: Clear API key`, () => {
      clearApiKey().then(() => {
        state.error = 'API key cleared.';
        renderPanel();
      });
    });
    registerMenuCommand(`${APP.name}: Refresh`, () => refreshData(true));
    registerMenuCommand(`${APP.gymName}: Refresh`, () => refreshGymData(true));
    registerMenuCommand(`${APP.name}: Clear Torn stock filter`, () => clearNativeStockFilter());
    registerMenuCommand(`${APP.name}: Donate / FLUZ page`, () => openDonateWindow());
    watchPageLocation();
    const mode = await waitForSupportedPage();
    if (!mode) {
      removeAppUi();
      return;
    }
    state.mode = mode;
    removeNativeSearch();
    if (mode === 'stocks' && state.apiKey) await refreshData(false);
    if (mode === 'gym') await refreshGymData(false);
    if (mode === 'utility') {
      await refreshUtilityData(false);
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
        if (isBootleggingCrimePage()) scheduleBootleggingRefresh();
        if (isPickpocketCrimePage()) schedulePickpocketFormatting();
        if (isCrackingCrimePage()) {
          refreshCrackingStats().catch(() => {});
          scheduleCrackingScan();
        }
        scheduleCrimeMoraleRefresh();
      }
      await refreshTargetStatuses(true);
    }
  }

  init().catch((error) => {
    console.error('[FLUZ] init failed:', error);
    state.error = friendlyError(error);
    ensurePanel();
  });
})();
