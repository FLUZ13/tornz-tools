  function renderPanel() {
    const panel = state.elements.panel;
    if (!panel) return;
    panel.className = state.panel.collapsed ? 'is-collapsed' : '';
    applyPanelSize(panel);
    applyPanelPosition(panel);
    if (state.mode === 'gym') {
      renderGymPanel(panel);
      return;
    }
    if (state.mode === 'utility') {
      renderUtilityPanel(panel);
      return;
    }
    panel.innerHTML = `
      <div class="fluz-header fluz-drag-handle" title="Drag to move">
        <button class="fluz-mark" title="FLUZ supporter page" data-action="open-donate">Tz</button>
        <div class="fluz-title">
          <strong>${APP.stockName}</strong>
          <span>${headerSubtitle()}</span>
        </div>
        <button class="fluz-icon-btn" title="Refresh" data-action="refresh">${iconSvg('refresh')}</button>
        <button class="fluz-icon-btn" title="Settings" data-action="open-settings">${iconSvg('settings')}</button>
        <button class="fluz-icon-btn" title="Guide" data-action="open-about">${iconSvg('book')}</button>
        <button class="fluz-icon-btn" title="Profile / API" data-action="open-profile">${iconSvg('profile')}</button>
        <div class="fluz-mini-drag-strip" title="Drag to move"></div>
        <button class="fluz-icon-btn" title="Minimize" data-action="toggle-collapse">${iconSvg(state.panel.collapsed ? 'plus' : 'minus')}</button>
      </div>
      <div class="fluz-body">
        <div class="fluz-tabs">
          ${renderTabButton('signals', 'Signals')}
          ${renderTabButton('portfolio', 'Portfolio')}
          ${renderTabButton('market', 'Market Scan')}
        </div>
        <div class="fluz-content">
          ${renderInPageAlerts()}
          ${state.error ? `<div class="fluz-error">${escapeHtml(state.error)}</div>` : ''}
          ${renderActiveTab()}
        </div>
        ${renderPanelFooter()}
      </div>
      ${renderVerticalResizeHandle('panel')}
    `;
    requestAnimationFrame(() => {
      if (!state.elements.panel) return;
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    });
  }

  function getPanelContentScrollTop() {
    const content = $(`#${APP.id} .fluz-content`);
    return content ? content.scrollTop : 0;
  }

  function restorePanelContentScrollTop(scrollTop) {
    requestAnimationFrame(() => {
      const content = $(`#${APP.id} .fluz-content`);
      if (content) content.scrollTop = scrollTop;
    });
  }

  function renderPanelKeepingScroll() {
    const scrollTop = getPanelContentScrollTop();
    renderPanel();
    restorePanelContentScrollTop(scrollTop);
  }

  function renderGymPanel(panel) {
    panel.innerHTML = `
      <div class="fluz-header fluz-drag-handle" title="Drag to move">
        <button class="fluz-mark" title="FLUZ supporter page" data-action="open-donate">Tz</button>
        <div class="fluz-title">
          <strong>${APP.gymName}</strong>
          <span>${gymHeaderSubtitle()}</span>
        </div>
        <button class="fluz-icon-btn" title="Refresh" data-action="gym-refresh">${iconSvg('refresh')}</button>
        <button class="fluz-icon-btn" title="Settings" data-action="gym-settings">${iconSvg('settings')}</button>
        <button class="fluz-icon-btn" title="Guide" data-action="gym-guide">${iconSvg('book')}</button>
        <button class="fluz-icon-btn" title="Profile / API" data-action="open-profile">${iconSvg('profile')}</button>
        <div class="fluz-mini-drag-strip" title="Drag to move"></div>
        <button class="fluz-icon-btn" title="Minimize" data-action="toggle-collapse">${iconSvg(state.panel.collapsed ? 'plus' : 'minus')}</button>
      </div>
      <div class="fluz-body">
        <div class="fluz-tabs">
          ${renderGymTabButton('train', 'Train')}
          ${renderGymTabButton('gyms', 'Gyms')}
          ${renderGymTabButton('boosts', 'Boosts')}
        </div>
        <div class="fluz-content">
          ${state.error ? `<div class="fluz-error">${escapeHtml(state.error)}</div>` : ''}
          ${renderGymActiveTab()}
        </div>
        <div class="fluz-footer">Updated ${escapeHtml(gymUpdatedText())} - ${escapeHtml(getGymBuild().label)} - Made by <a href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(APP.authorLabel)}</a></div>
      </div>
      ${renderVerticalResizeHandle('panel')}
    `;
    requestAnimationFrame(() => {
      if (!state.elements.panel) return;
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    });
  }

  function renderUtilityPanel(panel) {
    const module = getUtilityModule();
    const tabs = utilityTabsForModule(module);
    if (!tabs.includes(state.utility.activeTab)) state.utility.activeTab = tabs[0];
    const hasGuide = moduleHasUtilityGuide(module);
    const hasSettings = moduleHasUtilitySettings(module);
    panel.innerHTML = `
      <div class="fluz-header fluz-drag-handle" title="Drag to move">
        <button class="fluz-mark" title="FLUZ supporter page" data-action="open-donate">Tz</button>
        <div class="fluz-title">
          <strong>${escapeHtml(module.title)}</strong>
          <span>${escapeHtml(module.short)} tools - read-only manual assist</span>
        </div>
        <button class="fluz-icon-btn" title="Refresh scan" data-action="utility-refresh">${iconSvg('refresh')}</button>
        ${hasSettings ? `<button class="fluz-icon-btn" title="Settings" data-action="utility-settings">${iconSvg('settings')}</button>` : ''}
        ${hasGuide ? `<button class="fluz-icon-btn" title="Guide" data-action="utility-guide">${iconSvg('book')}</button>` : ''}
        <button class="fluz-icon-btn" title="Profile / API" data-action="open-profile">${iconSvg('profile')}</button>
        <div class="fluz-mini-drag-strip" title="Drag to move"></div>
        <button class="fluz-icon-btn" title="Minimize" data-action="toggle-collapse">${iconSvg(state.panel.collapsed ? 'plus' : 'minus')}</button>
      </div>
      <div class="fluz-body">
        <div class="fluz-tabs">${tabs.map((tab) => renderUtilityTabButton(tab, module)).join('')}</div>
        <div class="fluz-content">${renderUtilityActiveTab(module)}</div>
        <div class="fluz-footer">Manual helper - ${escapeHtml(module.short)} - no auto-clicks/actions - Made by <a href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(APP.authorLabel)}</a></div>
      </div>
      ${renderVerticalResizeHandle('panel')}
    `;
    if (module.key === 'itemmarket') scheduleAllBazaarAutoScan({ immediate: state.utility.activeTab === 'bazaarListings' });
    else clearTimeout(state.marketBazaarAllAutoTimer);
    if (module.key === 'itemmarket') requestAnimationFrame(() => applyItemMarketValueHighlights());
    if (module.key === 'items') requestAnimationFrame(() => scheduleInventoryPanelScan());
    if (module.key === 'hospital') scheduleHospitalCountdown();
    else clearInterval(state.hospitalCountdownTimer);
    if (module.key === 'casino' && (isBlackjackPage() || isHighLowPage() || isHoldemPage())) scheduleCasinoGameWatch();
    else clearInterval(state.casinoGameWatchTimer);
    if (moduleHasTargetTools(module)) scheduleChainWatch();
    else {
      clearInterval(state.chainWatchTimer);
      state.chainWatchTimer = null;
      state.chainWatchStarted = false;
    }
    requestAnimationFrame(() => {
      if (!state.elements.panel) return;
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    });
  }

  function renderVerticalResizeHandle(scope) {
    return `<div class="fluz-vertical-resize" data-resize-window="${escapeHtml(scope)}" title="Drag vertically to resize"></div>`;
  }

  function scheduleCasinoGameWatch() {
    clearInterval(state.casinoGameWatchTimer);
    state.casinoGameWatchTimer = setInterval(() => {
      if (state.mode !== 'utility') return;
      const module = getUtilityModule();
      if (!module || module.key !== 'casino' || (!isBlackjackPage() && !isHighLowPage() && !isHoldemPage())) return;
      renderPanelPreservingScroll();
    }, 1200);
  }

  function utilityTabsForModule(module) {
    const cleanTabs = (tabs) => {
      let workTabs = (tabs || ['tools']).filter((tab) => tab !== 'guide');
      if (!module || module.key !== 'city') workTabs = workTabs.filter((tab) => tab !== 'links');
      if (moduleHasTargetTools(module)) workTabs = workTabs.filter((tab) => tab !== 'timers');
      if (moduleHasTargetTools(module) && !workTabs.includes('chains')) {
        const targetIndex = workTabs.indexOf('targets');
        const insertAt = targetIndex >= 0 ? targetIndex + 1 : Math.max(0, workTabs.indexOf('finder'));
        workTabs.splice(insertAt, 0, 'chains');
      }
      if (moduleHasTargetTools(module) && !workTabs.includes('factionChains')) {
        const chainsIndex = workTabs.indexOf('chains');
        const insertAt = chainsIndex >= 0 ? chainsIndex + 1 : Math.max(0, workTabs.indexOf('finder'));
        workTabs.splice(insertAt, 0, 'factionChains');
      }
      return workTabs.length ? workTabs : ['tools'];
    };
    if (module && module.key === 'itemmarket') {
      return ['tools', 'bazaarListings'];
    }
    return cleanTabs(module && module.tabs ? module.tabs : ['tools']);
  }

  function moduleHasUtilityGuide(module) {
    return !!(module && Array.isArray(module.guide) && module.guide.length);
  }

  function moduleHasUtilitySettings(module) {
    return !!(module && (['bazaar', 'itemmarket', 'crimes', 'travel', 'missions', 'bounties', 'awards', 'attack'].includes(module.key) || (Array.isArray(module.tools) && module.tools.includes('addictionAdvisor')) || moduleHasTargetTools(module) || (Array.isArray(module.tools) && module.tools.includes('timers')) || (Array.isArray(module.tabs) && module.tabs.includes('timers'))));
  }

  function renderUtilityTabButton(tab, module = null) {
    const labels = {
      tools: 'Tools',
      home: 'Home',
      targets: 'Targets',
      chains: 'Chains',
      factionChains: 'Faction Chains',
      finder: 'Finder',
      lists: 'Lists',
      bazaarListings: 'Bazaar Listings',
      raceLoadout: 'Loadout',
      raceMeta: 'Track Meta',
      war: 'War',
      scan: 'Scan',
      guide: 'Guide',
      database: 'Database',
      links: 'Links',
      addictionAdvisor: 'Addiction Advisor',
      timers: 'Timers',
      mugCheck: 'Mug Check',
      overview: 'Overview'
    };
    if (tab === 'scan' && module && module.key === 'itemmarket') labels.scan = 'Item Market Price Calculator';
    if (tab === 'scan' && module && module.key === 'bazaar') labels.scan = 'Bazaar Price Calculator';
    const active = state.utility.activeTab === tab ? 'is-active' : '';
    return `<button class="fluz-tab ${active}" data-utility-tab="${escapeHtml(tab)}">${escapeHtml(labels[tab] || tab)}</button>`;
  }

  function getUtilityModule() {
    return detectUtilityModule() || UTILITY_MODULES.itemmarket;
  }

  function moduleHasTargetTools(module) {
    return !!(module && Array.isArray(module.tools) && module.tools.includes('targetBoard'));
  }

  function getModuleFeeKey(module) {
    if (module && module.key === 'bazaar') return 'bazaar';
    if (module && module.key === 'itemmarket') {
      return MARKET_FEES[state.utility.itemmarketFeeKey] ? state.utility.itemmarketFeeKey : 'itemMarket';
    }
    return state.utility.feeKey || (module && module.feeKey) || 'itemMarket';
  }

  function gymHeaderSubtitle() {
    if (state.loading) return 'Loading gym data...';
    const build = getGymBuild();
    const rec = state.gymData && state.gymData.recommendation;
    return rec ? `${build.label} - train ${statLabel(rec.stat)} next - read-only` : `${build.label} planner - read-only`;
  }

  function gymUpdatedText() {
    const item = state.cacheInfo && state.cacheInfo.gymUser;
    return item && item.fetchedAt ? new Date(item.fetchedAt).toLocaleTimeString() : 'local';
  }

  function renderGymTabButton(tab, label) {
    const active = state.gym.activeTab === tab ? 'is-active' : '';
    return `<button class="fluz-tab ${active}" data-gym-tab="${tab}">${label}</button>`;
  }

  function headerSubtitle() {
    if (state.loading) return 'Loading Torn data...';
    if (!state.apiKey) return 'Add a Limited Access API key to begin';
    const count = visibleSignalRecommendations().length;
    const profile = getProfile().label;
    return `${count} signals - ${getStrategy().label} - ${profile}`;
  }

  function renderTabButton(tab, label) {
    const active = state.panel.activeTab === tab ? 'is-active' : '';
    return `<button class="fluz-tab ${active}" data-tab="${tab}">${label}</button>`;
  }

  function renderPanelFooter() {
    const updated = state.cacheInfo && state.cacheInfo.market && state.cacheInfo.market.fetchedAt
      ? new Date(state.cacheInfo.market.fetchedAt).toLocaleTimeString()
      : 'not loaded';
    const filterStatus = state.nativeFilter
      ? `<div class="fluz-native-filter-status"><span>Filtered: <strong>${escapeHtml(state.nativeFilter)}</strong></span><button class="fluz-footer-mini-btn" data-action="clear-native-filter">Reset filter</button></div>`
      : '';
    return `
      <div class="fluz-footer">
        ${filterStatus}<span>Updated ${escapeHtml(updated)} - ${escapeHtml(getStrategy().label)} - ${state.analyses.length || 0} stocks - ${state.analyses.filter((stock) => stock.position).length} held - Made by <a href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(APP.authorLabel)}</a></span>
      </div>
    `;
  }

  function iconSvg(name) {
    const icons = {
      refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/></svg>',
      settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 3.4-.2-.1a1.8 1.8 0 0 0-2 .1 8 8 0 0 1-1.3.7 1.8 1.8 0 0 0-1.1 1.6v.2h-4v-.2a1.8 1.8 0 0 0-1.1-1.6 8 8 0 0 1-1.3-.7 1.8 1.8 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.8 1.8 0 0 0 .4-2 8 8 0 0 1 0-1.4 1.8 1.8 0 0 0-.4-2l-.1-.1 2-3.4.2.1a1.8 1.8 0 0 0 2-.1 8 8 0 0 1 1.3-.7A1.8 1.8 0 0 0 9.3 5.8v-.2h4v.2a1.8 1.8 0 0 0 1.1 1.6 8 8 0 0 1 1.3.7 1.8 1.8 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.8 1.8 0 0 0-.4 2 8 8 0 0 1 0 1.4Z"/></svg>',
      book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H7a3 3 0 0 0-3 3V5.5Z"/><path d="M4 20a3 3 0 0 1 3-3h13"/><path d="M8 7h8M8 11h6"/></svg>',
      profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>',
      globe: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13 13 0 0 1 0 18"/><path d="M12 3a13 13 0 0 0 0 18"/></svg>',
      lock: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
      minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
      trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>'
    };
    return icons[name] || '';
  }

  function renderActiveTab() {
    if (!state.apiKey && state.panel.activeTab !== 'settings' && state.panel.activeTab !== 'about') {
      return renderSetupPrompt();
    }
    if (state.loading) {
      return '<div class="fluz-card">Loading market, portfolio, bank, and optional Tornsy data...</div>';
    }

    switch (state.panel.activeTab) {
      case 'portfolio': return renderPortfolioTab();
      case 'market': return renderMarketTab();
      case 'settings': return renderSettingsTab();
      case 'about': return renderAboutTab();
      case 'signals':
      default: return renderSignalsTab();
    }
  }

  function renderGymActiveTab() {
    if (state.loading) return '<div class="fluz-card">Loading gym stats, bars, and item values...</div>';
    if (!state.gymData) return renderGymSetupCard();
    if (state.gym.activeTab === 'gyms') return renderGymsTab();
    if (state.gym.activeTab === 'boosts') return renderGymBoostsTab();
    return renderGymTrainTab();
  }

  function renderUtilityActiveTab(module) {
    if (state.utility.activeTab === 'scan') return renderVisiblePriceScanner(module);
    if (state.utility.activeTab === 'home') return renderHomeDashboard();
    if (state.utility.activeTab === 'targets') return renderTargetBoard();
    if (state.utility.activeTab === 'chains') return renderTargetChains(module);
    if (state.utility.activeTab === 'factionChains') return renderFactionChainTracker(module);
    if (state.utility.activeTab === 'finder') return renderTargetFinder();
    if (state.utility.activeTab === 'lists') return renderTargetLists();
    if (state.utility.activeTab === 'war') return renderFactionWarTools(module);
    if (state.utility.activeTab === 'guide') return renderUtilityGuide(module);
    if (state.utility.activeTab === 'overview') return renderTargetOverviewTree();
    if (state.utility.activeTab === 'bazaarListings') return renderAllBazaarListings();
    if (state.utility.activeTab === 'raceLoadout') return renderRacingLoadout();
    if (state.utility.activeTab === 'raceMeta') return renderRacingMeta();
    if (state.utility.activeTab === 'database') return renderItemDatabaseTab(module);
    if (state.utility.activeTab === 'addictionAdvisor') return renderAddictionAdvisor({ dedicated: true });
    if (state.utility.activeTab === 'mugCheck') return renderMugProtectionHelper();
    if (state.utility.activeTab === 'links') return renderUtilityLinks(module);
    if (state.utility.activeTab === 'timers') return `${module.key === 'hospital' ? renderHospitalStatusCard() : ''}${renderUtilityTimers(module)}`;
    return renderUtilityTools(module);
  }

  function renderUtilityTools(module) {
    const tools = module.tools || [];
    return `
      <div class="fluz-section-title"><span>${escapeHtml(module.short)} tools</span><span class="fluz-muted">manual assist</span></div>
      ${tools.includes('pricePlanner') ? renderMarketPricePlanner(module) : ''}
      ${module.key === 'itemmarket' ? renderItemMarketHighlightControls() : ''}
      ${module.key === 'itemmarket' && isItemMarketListingToolPage() ? renderVisiblePriceScanner(module) : ''}
      ${module.key === 'itemmarket' && !isItemMarketListingToolPage() ? renderItemMarketBrowseTools() : ''}
      ${tools.includes('homeDashboard') ? renderHomeDashboard() : ''}
      ${tools.includes('crimePlanner') ? renderCrimePlanner() : ''}
      ${tools.includes('travelPlanner') ? renderTravelPlanner() : ''}
      ${tools.includes('missionPlanner') ? renderMissionPlanner() : ''}
      ${tools.includes('propertyPlanner') ? renderPropertyPlanner() : ''}
      ${tools.includes('educationPlanner') ? renderEducationPlanner() : ''}
      ${tools.includes('jobPlanner') ? renderJobPlanner() : ''}
      ${tools.includes('racingGuide') ? renderRacingPlanner() : ''}
      ${tools.includes('inventoryPlanner') ? renderInventoryPlanner() : ''}
      ${tools.includes('cityHub') ? renderCityHub() : ''}
      ${tools.includes('cityStoreScanner') ? renderCityStoreScanner() : ''}
      ${tools.includes('bankPlanner') ? renderBankPlanner() : ''}
      ${tools.includes('casinoPlanner') ? renderCasinoPlanner() : ''}
      ${tools.includes('bountyFilter') ? renderBountyFilter() : ''}
      ${tools.includes('meritTracker') ? renderMeritTracker() : ''}
      ${tools.includes('mugProtection') ? renderMugProtectionHelper() : ''}
      ${tools.includes('hospitalStatus') ? renderHospitalStatusCard() : ''}
      ${tools.includes('addictionAdvisor') && !(module.tabs || []).includes('addictionAdvisor') ? renderAddictionAdvisor() : ''}
      ${tools.includes('targetBoard') ? renderTargetBoard() : ''}
      ${!tools.length ? '<div class="fluz-card">Guide-only module for now.</div>' : ''}
    `;
  }
