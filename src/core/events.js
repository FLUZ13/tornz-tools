  function bindEvents() {
    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('change', handleDocumentChange, true);
    document.addEventListener('input', handleDocumentInput, true);
    document.addEventListener('focusin', handleDocumentFocusIn, true);
    document.addEventListener('pointerdown', handleDragStart, true);
    document.addEventListener('pointermove', handleDragMove, true);
    document.addEventListener('pointerup', handleDragEnd, true);
    document.addEventListener('pointercancel', handleDragEnd, true);
    window.addEventListener('resize', handleWindowResize, { passive: true });
    bindExtensionMessages();
  }

  function bindExtensionMessages() {
    if (state.extensionMessageBound) return;
    const runtime = typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.onMessage ? chrome.runtime : null;
    if (!runtime) return;
    state.extensionMessageBound = true;
    runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || message.type !== 'TORNZ_OPEN_PROFILE') return false;
      try {
        openProfileFromExtension();
        if (typeof sendResponse === 'function') sendResponse({ ok: true });
      } catch (error) {
        if (typeof sendResponse === 'function') sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
      }
      return false;
    });
  }

  function openProfileFromExtension() {
    state.panel.collapsed = false;
    ensurePanel();
    openProfileWindow();
  }

  function handleWindowResize() {
    if (state.elements.panel) {
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    }
    applyModalSize();
  }

  function handleDocumentFocusIn(event) {
    const input = event.target && event.target.tagName === 'INPUT' ? event.target : null;
    if (input && isNativeFillInput(input) && marketPriceInputScore(input) >= 5) state.lastNativeFillInput = input;
  }

  async function handleDocumentClick(event) {
    const target = event.target.closest(`#${APP.id} [data-action], #${APP.id} [data-tab], #${APP.id} [data-gym-tab], #${APP.id} [data-utility-tab], #${APP.id} [data-open-calc], #${APP.id} [data-filter-stock], #${APP.id}-modal [data-action]`);
    if (!target) return;

    const action = target.dataset.action;
    const tab = target.dataset.tab;
    const gymTab = target.dataset.gymTab;
    const utilityTab = target.dataset.utilityTab;
    const calcId = target.dataset.openCalc;
    const filterStock = target.dataset.filterStock;

    if (tab) {
      event.preventDefault();
      state.panel.activeTab = tab;
      await savePanelState();
      renderPanel();
      return;
    }

    if (gymTab) {
      event.preventDefault();
      state.gym.activeTab = gymTab;
      await saveGymState();
      renderPanel();
      return;
    }

    if (utilityTab) {
      event.preventDefault();
      if (getUtilityModule().key === 'itemmarket') await flushVisibleMarketSettings();
      state.utility.activeTab = utilityTab;
      await saveUtilityState();
      renderPanel();
      if (utilityTab === 'bazaarListings') scheduleAllBazaarAutoScan({ immediate: true });
      return;
    }

    if (calcId && !action) {
      event.preventDefault();
      openCalculator(calcId);
      return;
    }

    if (filterStock && !action) {
      event.preventDefault();
      findStockOnPage(filterStock);
      return;
    }

    if (!action) return;
    event.preventDefault();

    if (action === 'refresh') await refreshData(true);
    if (action === 'gym-refresh') await refreshGymData(true);
    if (action === 'gym-settings') openGymSettingsWindow();
    if (action === 'gym-guide') openGymGuideWindow();
    if (action === 'utility-refresh') {
      await refreshUtilityData(true);
      const module = getUtilityModule();
      if (moduleHasTargetTools(module)) await refreshTargetStatuses(true);
      if (isItemMarketBrowseItemPage()) await loadItemMarketBazaarListings(true);
      if (module.key === 'travel') await loadTravelYataData(true);
    }
    if (action === 'refresh-travel-yata') await loadTravelYataData(true);
    if (action === 'clear-travel-owned') await clearTravelOwnedItems();
    if (action === 'fill-travel-owned-ones') await fillTravelOwnedOnes();
    if (action === 'refresh-market-bazaar') await loadItemMarketBazaarListings(true);
    if (action === 'sort-market-bazaar') await sortItemMarketBazaarListings(target.dataset.sortKey);
    if (action === 'sort-all-market') await sortAllMarketItems(target.dataset.sortKey);
    if (action === 'market-database-page') await setMarketDatabasePage(target.dataset.page);
    if (action === 'sort-market-native-listings') await sortMarketNativeListings(target.dataset.sortKey);
    if (action === 'refresh-market-native-listings') {
      refreshVisibleTornMarketRows(true);
      renderPanelPreservingScroll();
    }
    if (action === 'apply-market-highlights') {
      applyItemMarketValueHighlights();
      showFlash('Item Market highlights refreshed.');
    }
    if (action === 'sort-all-bazaar') await sortAllBazaarListings(target.dataset.sortKey);
    if (action === 'scan-all-bazaar-batch') {
      await flushVisibleMarketSettings();
      await scanAllBazaarBatch();
    }
    if (action === 'reset-all-bazaar-scan') {
      await flushVisibleMarketSettings();
      await resetAllBazaarScan();
    }
    if (action === 'toggle-all-bazaar-scan-pause') {
      await flushVisibleMarketSettings();
      await toggleAllBazaarScanPause();
    }
    if (action === 'open-bazaar-link') await openBazaarLink(target.dataset.bazaarUrl, target.dataset.bazaarVisitKey, target.dataset.bazaarSellerKey);
    if (action === 'hide-market-item') await hideMarketItem(target.dataset.itemId);
    if (action === 'unhide-market-item') await unhideMarketItem(target.dataset.itemId);
    if (action === 'apply-market-value-limit') await applyMarketValueLimit();
    if (action === 'clear-market-value-limit') {
      state.utility.marketValueLimitMin = 0;
      state.utility.marketValueLimitMax = 0;
      syncUtilitySettingInputs('marketValueLimitMin', 0);
      syncUtilitySettingInputs('marketValueLimitMax', 0);
      await applyMarketValueLimit();
    }
    if (action === 'save-market-filter-preset') await saveMarketFilterPreset();
    if (action === 'load-market-filter-preset') await loadMarketFilterPreset();
    if (action === 'delete-market-filter-preset') await deleteMarketFilterPreset();
    if (action === 'utility-settings') openUtilitySettingsWindow();
    if (action === 'utility-guide') openUtilityGuideWindow();
    if (action === 'copy-utility-result') await copyUtilityText(target.dataset.copyText);
    if (action === 'log-chain-message') await logChainMessage(target.dataset.copyText);
    if (action === 'add-chain-friendly') await addChainFriendlyMember();
    if (action === 'copy-chain-friendly-message') await copyChainFriendlyMessage(target.dataset.memberId, target.dataset.copyText);
    if (action === 'copy-current-chain-message') await copyCurrentChainMessage();
    if (action === 'set-next-chain-friendly') await setNextChainFriendlyMember(target.dataset.memberId);
    if (action === 'remove-chain-friendly') await removeChainFriendlyMember(target.dataset.memberId);
    if (action === 'clear-chain-message-log') await clearChainMessageLog();
    if (action === 'fill-market-price') {
      const filled = await fillMarketPrice(target.dataset.price, target.dataset.itemName, target.dataset.sourcePrice);
      if (filled) markMarketFillButton(target);
    }
    if (action === 'fill-all-market-prices') await fillAllMarketPrices();
    if (action === 'sort-utility-table') await sortUtilityTable(target.dataset.sortTable, target.dataset.sortKey);
    if (action === 'ignore-item') await ignoreInventoryItem(target.dataset.itemName);
    if (action === 'unignore-item') await unignoreInventoryItem(target.dataset.itemName);
    if (action === 'use-casino-odds') await useCasinoOdds(target.dataset.odds);
    if (action === 'use-visible-bank-amount') await useVisibleBankAmount();
    if (action === 'fill-bank-amount') await fillBankAmount(target.dataset.bankAmount);
    if (action === 'apply-bounty-filter') applyBountyFilterToPage();
    if (action === 'clear-bounty-filter') clearBountyFilterDisplay();
    if (action === 'check-mug-protection') await checkMugProtection();
    if (action === 'use-travel-item') await useTravelItem(target.dataset.itemName);
    if (action === 'use-mission-item') await useMissionItem(target.dataset.itemName);
    if (action === 'toggle-bookie-sport') await toggleBookieSport(target.dataset.sport);
    if (action === 'fill-bookie-stake') await fillBookieStake(target.dataset.label, target.dataset.odds, target.dataset.stake);
    if (action === 'select-bootlegging-genre') selectBootleggingGenre(target.dataset.genre);
    if (action === 'mark-bootlegging-genres') {
      if (!state.bootleggingData) await refreshBootleggingFromPageData(false);
      if (applyBootleggingButtonLabels()) showFlash('Bootlegging genre buttons labeled.');
      else showFlash('No Bootlegging genre buttons found yet.');
    }
    if (action === 'refresh-bootlegging-data') await refreshBootleggingFromPageData(true);
    if (action === 'refresh-crime-profitability') await loadCrimeProfitabilityData(true);
    if (action === 'mark-crime-profitability') {
      if (applyCrimeProfitabilityLabels()) showFlash('Crime profitability labels applied.');
      else showFlash('No matching visible crime options found yet.');
    }
    if (action === 'scan-cracking-helper') {
      if (scanCrackingCrimePage()) showFlash('Cracking suggestions applied.');
      else showFlash('No visible cracking rows found yet.');
    }
    if (action === 'load-cracking-wordlist') await loadCrackingPublicWordlist();
    if (action === 'clear-cracking-wordlist') await clearCrackingWordlist();
    if (action === 'refresh-crime-morale') await refreshCrimeMoraleFromPageData(true);
    if (action === 'mark-pickpocket-targets') {
      if (applyPickpocketFormatting()) showFlash('Pickpocket targets labeled.');
      else showFlash('No Pickpocket targets found yet.');
    }
    if (action === 'apply-racing-highlights') applyRacingUpgradeHighlights();
    if (action === 'test-utility-alert') {
      await sendUtilityAlert({
        title: `${APP.name}: Test alarm`,
        body: 'Timer alarm test.',
        tag: `${APP.id}-timer-test`,
        sound: true,
        desktop: false
      });
    }
    if (action === 'add-utility-timer') await addUtilityTimer();
    if (action === 'delete-utility-timer') await deleteUtilityTimer(target.dataset.timerId);
    if (action === 'set-hospital-alert') await setHospitalAlertTimer(target.dataset.hospitalUntil, target.dataset.offsetMinutes);
    if (action === 'check-ffscouter-key') await checkFfscouterKey();
    if (action === 'register-ffscouter-key') await registerFfscouterKey();
    if (action === 'apply-target-finder-preset') await applyTargetFinderPreset(target.dataset.preset);
    if (action === 'search-ffscouter-targets') await searchFfscouterTargets();
    if (action === 'scout-current-ffscouter-target') await scoutCurrentFfscouterTarget();
    if (action === 'scout-board-ffscouter-targets') await scoutBoardFfscouterTargets();
    if (action === 'scout-target-list-ffscouter') await scoutTargetListFfscouter(target.dataset.listId);
    if (action === 'open-ffscouter-target-finder') window.open('https://ffscouter.com/target-finder', '_blank', 'noopener,noreferrer');
    if (action === 'create-target-list-from-paste') await createTargetListFromPaste();
    if (action === 'select-target-list') await selectTargetList(target.dataset.listId);
    if (action === 'sort-target-list') await sortTargetList(target.dataset.sortKey);
    if (action === 'delete-target-list') await deleteTargetList(target.dataset.listId);
    if (action === 'copy-target-list-ids') await copyTargetListIds(target.dataset.listId);
    if (action === 'add-target-list-to-board') await addTargetListToBoard(target.dataset.listId);
    if (action === 'add-list-target-to-board') await addTargetFromListToBoard(target.dataset.listId, target.dataset.xid);
    if (action === 'remove-target-from-list') await removeTargetFromList(target.dataset.listId, target.dataset.xid);
    if (action === 'add-current-target') await addCurrentTarget();
    if (action === 'open-add-target') openTargetAddWindow();
    if (action === 'save-target-modal') await saveTargetFromModal();
    if (action === 'open-add-faction') openFactionImportWindow();
    if (action === 'import-faction-modal') await importFactionFromModal();
    if (action === 'export-targets') exportTargets();
    if (action === 'open-import-targets') openTargetsImportWindow();
    if (action === 'import-targets-modal') await importTargetsFromModal();
    if (action === 'sort-targets') await sortTargetTable(target.dataset.sortKey);
    if (action === 'toggle-note-filter-menu') await toggleTargetNoteFilterMenu();
    if (action === 'toggle-note-filter') await toggleTargetNoteFilter(target.dataset.note);
    if (action === 'clear-note-filters') await clearTargetNoteFilters();
    if (action === 'toggle-target-tree') await toggleTargetTreeNode(target.dataset.treeKey);
    if (action === 'toggle-target-star') await toggleTargetFlag(target.dataset.xid, 'starred');
    if (action === 'toggle-target-lock') await toggleTargetFlag(target.dataset.xid, 'locked');
    if (action === 'toggle-target-hide') await toggleTargetHide(target.dataset.xid);
    if (action === 'remove-target') await removeTarget(target.dataset.xid);
    if (action === 'open-item-market') openItemMarket(target.dataset.itemName);
    if (action === 'save-gym-build') await saveCurrentGymBuild();
    if (action === 'delete-gym-build') await deleteCurrentGymBuild();
    if (action === 'mark-all-gyms') await setAllGymsAvailable();
    if (action === 'clear-available-gyms') await clearAvailableGyms();
    if (action === 'open-settings') {
      openSettingsWindow();
    }
    if (action === 'open-about') {
      openGuideWindow();
    }
    if (action === 'open-profile') {
      openProfileWindow();
    }
    if (action === 'open-donate') {
      openDonateWindow();
    }
    if (action === 'apply-combo') {
      applyCombo(target.dataset.combo);
      await saveSettings();
      await refreshAnalysisOnly();
      openSettingsWindow();
    }
    if (action === 'toggle-collapse') {
      state.panel.collapsed = !state.panel.collapsed;
      await savePanelState();
      renderPanel();
    }
    if (action === 'save-api-key') await handleSaveApiKey(target);
    if (action === 'clear-api-key') await handleClearApiKey();
    if (action === 'toggle-lock') await toggleStockLock(target.dataset.stockId);
    if (action === 'find-stock') findStockOnPage(target.dataset.acronym);
    if (action === 'clear-native-filter') clearNativeStockFilter();
    if (action === 'reset-local-data') await handleResetLocalData();
    if (action === 'test-notification') await handleTestNotification();
    if (action === 'clear-notification-history') await clearNotificationHistory();
    if (action === 'close-modal') closeModal();
  }

  function handleDragStart(event) {
    const resizeHandle = event.target.closest && event.target.closest(`#${APP.id} .fluz-vertical-resize, #${APP.id}-modal .fluz-vertical-resize`);
    if (resizeHandle) {
      const scope = resizeHandle.dataset.resizeWindow || 'panel';
      const target = scope === 'modal'
        ? $(`#${APP.id}-modal .fluz-modal-box`)
        : state.elements.panel;
      if (!target || (scope === 'panel' && state.panel.collapsed)) return;
      const rect = target.getBoundingClientRect();
      state.resize = {
        active: true,
        scope,
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: rect.height,
        minHeight: scope === 'modal' ? 150 : 160,
        maxHeight: Math.max(scope === 'modal' ? 150 : 160, scope === 'modal' ? modalContentMaxHeight(target) : panelContentMaxHeight(target))
      };
      const root = scope === 'modal' ? $(`#${APP.id}-modal`) : target;
      if (root) root.classList.add('is-resizing');
      if (resizeHandle.setPointerCapture) {
        try { resizeHandle.setPointerCapture(event.pointerId); } catch (error) { /* ignore capture failures */ }
      }
      event.preventDefault();
      return;
    }

    const modalHandle = event.target.closest && event.target.closest(`#${APP.id}-modal .fluz-window-head`);
    if (modalHandle && !event.target.closest('button, input, select, textarea, a')) {
      const modal = $(`#${APP.id}-modal`);
      if (!modal) return;
      const rect = modal.getBoundingClientRect();
      state.drag = {
        active: true,
        modal: true,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      if (modalHandle.setPointerCapture) {
        try { modalHandle.setPointerCapture(event.pointerId); } catch (error) { /* ignore capture failures */ }
      }
      event.preventDefault();
      return;
    }

    const handle = event.target.closest && event.target.closest(`#${APP.id} .fluz-drag-handle`);
    if (!handle || event.target.closest('button, input, select, textarea, a')) return;
    const panel = state.elements.panel;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    state.drag = {
      active: true,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    panel.classList.add('is-dragging');
    if (handle.setPointerCapture) {
      try { handle.setPointerCapture(event.pointerId); } catch (error) { /* ignore capture failures */ }
    }
    event.preventDefault();
  }

  function handleDragMove(event) {
    if (state.resize && state.resize.active) {
      const scope = state.resize.scope;
      const target = scope === 'modal'
        ? $(`#${APP.id}-modal .fluz-modal-box`)
        : state.elements.panel;
      if (!target) return;
      const nextHeight = clamp(state.resize.startHeight + (event.clientY - state.resize.startY), state.resize.minHeight, state.resize.maxHeight);
      target.style.height = `${Math.round(nextHeight)}px`;
      if (scope === 'modal') state.panel.modalHeight = Math.round(nextHeight);
      else state.panel.height = Math.round(nextHeight);
      event.preventDefault();
      return;
    }

    if (!state.drag || !state.drag.active) return;
    if (state.drag.modal) {
      const modal = $(`#${APP.id}-modal`);
      if (!modal) return;
      const box = $('.fluz-modal-box', modal);
      const width = box ? box.offsetWidth || 520 : 520;
      const height = box ? box.offsetHeight || 120 : 120;
      const x = clamp(event.clientX - state.drag.offsetX, 4, Math.max(4, window.innerWidth - width - 4));
      const y = clamp(event.clientY - state.drag.offsetY, 4, Math.max(4, window.innerHeight - Math.min(height, window.innerHeight - 8) - 4));
      modal.style.left = `${x}px`;
      modal.style.top = `${y}px`;
      event.preventDefault();
      return;
    }
    const panel = state.elements.panel;
    if (!panel) return;
    const width = panel.offsetWidth || 490;
    const height = panel.offsetHeight || 80;
    const x = clamp(event.clientX - state.drag.offsetX, 4, Math.max(4, window.innerWidth - width - 4));
    const y = clamp(event.clientY - state.drag.offsetY, 4, Math.max(4, window.innerHeight - Math.min(height, 80) - 4));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
    state.panel.x = Math.round(x);
    state.panel.y = Math.round(y);
    event.preventDefault();
  }

  async function handleDragEnd() {
    if (state.resize && state.resize.active) {
      const scope = state.resize.scope;
      const root = scope === 'modal' ? $(`#${APP.id}-modal`) : state.elements.panel;
      if (root) root.classList.remove('is-resizing');
      state.resize.active = false;
      state.resize = null;
      await savePanelState();
      return;
    }
    if (!state.drag || !state.drag.active) return;
    state.drag.active = false;
    if (state.elements.panel) state.elements.panel.classList.remove('is-dragging');
    await savePanelState();
  }

  async function handleDocumentChange(event) {
    const setting = event.target.closest(`#${APP.id} [data-setting], #${APP.id}-modal [data-setting]`);
    const notify = event.target.closest(`#${APP.id} [data-notify-setting], #${APP.id}-modal [data-notify-setting]`);
    const gymSetting = event.target.closest(`#${APP.id} [data-gym-setting], #${APP.id}-modal [data-gym-setting]`);
    const gymAvailable = event.target.closest(`#${APP.id} [data-gym-available], #${APP.id}-modal [data-gym-available]`);
    const gymTarget = event.target.closest(`#${APP.id} [data-gym-target], #${APP.id}-modal [data-gym-target]`);
    const gymManual = event.target.closest(`#${APP.id} [data-gym-manual], #${APP.id}-modal [data-gym-manual]`);
    const utilitySetting = event.target.closest(`#${APP.id} [data-utility-setting], #${APP.id}-modal [data-utility-setting]`);
    const chainFriendlyField = event.target.closest(`#${APP.id} [data-chain-friendly-field]`);
    const travelOwned = event.target.closest(`#${APP.id} [data-travel-owned], #${APP.id}-modal [data-travel-owned]`);
    const targetNote = event.target.closest(`#${APP.id} [data-target-note]`);
    const marketScanItem = event.target.closest(`#${APP.id} [data-market-scan-item], #${APP.id}-modal [data-market-scan-item]`);
    const marketCategoryScan = event.target.closest(`#${APP.id} [data-market-category-scan], #${APP.id}-modal [data-market-category-scan]`);
    const meritLevel = event.target.closest(`#${APP.id} [data-merit-level-key], #${APP.id}-modal [data-merit-level-key]`);
    if (setting) {
      await updateSetting(setting);
      return;
    }
    if (gymSetting) {
      await updateGymSetting(gymSetting);
      return;
    }
    if (gymAvailable) {
      await updateAvailableGym(gymAvailable);
      return;
    }
    if (gymTarget || gymManual) {
      await updateGymNumberInput(gymTarget || gymManual);
      return;
    }
    if (utilitySetting) {
      const noRenderMerit = getUtilityModule().key === 'awards' && ['meritFreePoints'].includes(utilitySetting.dataset.utilitySetting || '');
      await updateUtilitySetting(utilitySetting, noRenderMerit ? { render: false } : {});
      return;
    }
    if (chainFriendlyField) {
      await updateChainFriendlyMember(chainFriendlyField);
      return;
    }
    if (travelOwned) {
      await updateTravelOwnedItem(travelOwned);
      return;
    }
    if (targetNote) {
      await updateTargetNote(targetNote);
      return;
    }
    if (meritLevel) {
      await updateMeritLevel(meritLevel, { render: false });
      return;
    }
    if (marketScanItem) {
      await setMarketItemScanEnabled(marketScanItem.dataset.marketScanItem, marketScanItem.checked);
      return;
    }
    if (marketCategoryScan) {
      await setMarketCategoryScanEnabled(marketCategoryScan.dataset.marketCategoryScan, marketCategoryScan.checked);
      return;
    }
    const itemProfit = event.target.closest(`#${APP.id} [data-item-profit]`);
    if (itemProfit) {
      await updateItemProfitPct(itemProfit);
      return;
    }
    if (notify) {
      await updateNotificationSetting(notify);
    }
  }

  async function handleDocumentInput(event) {
    const calcInput = event.target.closest(`#${APP.id}-modal [data-calc-input]`);
    if (calcInput) updateCalculator(calcInput.dataset.calcInput);
    const riskInput = event.target.closest(`#${APP.id}-modal [data-setting="riskLevel"]`);
    if (riskInput) {
      const combo = comboFromRisk(riskInput.value);
      const label = $(`#${APP.id}-modal [data-risk-preview]`);
      if (label) label.textContent = `${combo.label} - risk ${combo.risk}/100`;
    }
    const gymTarget = event.target.closest(`#${APP.id} [data-gym-target], #${APP.id}-modal [data-gym-target]`);
    const gymManual = event.target.closest(`#${APP.id} [data-gym-manual], #${APP.id}-modal [data-gym-manual]`);
    if (gymTarget || gymManual) {
      await updateGymNumberInput(gymTarget || gymManual, { render: false });
    }
    const utilitySetting = event.target.closest(`#${APP.id} [data-utility-setting], #${APP.id}-modal [data-utility-setting]`);
    if (utilitySetting) await updateUtilitySetting(utilitySetting, { render: false });
    const chainFriendlyField = event.target.closest(`#${APP.id} [data-chain-friendly-field]`);
    if (chainFriendlyField) await updateChainFriendlyMember(chainFriendlyField, { render: false });
    const travelOwned = event.target.closest(`#${APP.id} [data-travel-owned], #${APP.id}-modal [data-travel-owned]`);
    if (travelOwned) await updateTravelOwnedItem(travelOwned, { render: false });
    const targetNote = event.target.closest(`#${APP.id} [data-target-note]`);
    if (targetNote) await updateTargetNote(targetNote, { render: false });
    const meritLevel = event.target.closest(`#${APP.id} [data-merit-level-key], #${APP.id}-modal [data-merit-level-key]`);
    if (meritLevel) await updateMeritLevel(meritLevel, { render: false });
    const itemProfit = event.target.closest(`#${APP.id} [data-item-profit], #${APP.id}-modal [data-item-profit]`);
    if (itemProfit) await updateItemProfitPct(itemProfit, { render: false });
  }

  function isMarketUtilitySettingKey(key) {
    return /^market/.test(String(key || ''))
      || ['percentChange', 'itemmarketFeeKey', 'bazaarFeeKey', 'feeKey'].includes(String(key || ''));
  }

  function visibleControlValue(input) {
    if (input.type === 'checkbox') return !!input.checked;
    if (input.type === 'number' || input.type === 'range') return parseNumber(input.value);
    return input.value;
  }

  function isVisibleControl(input) {
    if (!input || !input.isConnected || input.disabled) return false;
    const rect = input.getBoundingClientRect();
    return rect.width > 0 || rect.height > 0 || input.offsetParent !== null;
  }

  function syncVisibleMarketSettingsToState() {
    const roots = [
      $(`#${APP.id}-modal .fluz-modal-box.utility-settings`),
      state.elements.panel
    ].filter(Boolean);
    const seenSettings = new Set();
    roots.forEach((root) => {
      $all('[data-utility-setting]', root).forEach((input) => {
        const key = String(input.dataset.utilitySetting || '');
        if (!key || !isMarketUtilitySettingKey(key) || seenSettings.has(key) || !isVisibleControl(input)) return;
        seenSettings.add(key);
        state.utility[key] = visibleControlValue(input);
      });
    });
    if (seenSettings.has('marketSettingsSearch')) state.utility.marketSettingsPage = 1;
    if (seenSettings.has('marketFilterPresetId')) {
      const preset = normalizeMarketFilterPresets(state.utility.marketFilterPresets)
        .find((item) => item.id === state.utility.marketFilterPresetId);
      state.utility.marketFilterPresetName = preset ? preset.name : (state.utility.marketFilterPresetName || '');
    }

    const seenProfits = new Set();
    roots.forEach((root) => {
      $all('[data-item-profit]', root).forEach((input) => {
        const key = itemProfitKey(input.dataset.itemProfit);
        if (!key || seenProfits.has(key) || !isVisibleControl(input)) return;
        seenProfits.add(key);
        state.utility.itemProfitPcts = { ...(state.utility.itemProfitPcts || {}) };
        state.utility.itemProfitPcts[key] = parseNumber(input.value);
      });
    });
  }

  async function flushVisibleMarketSettings() {
    syncVisibleMarketSettingsToState();
    await flushUtilityState();
  }

  async function updateUtilitySetting(input, options = {}) {
    const key = input.dataset.utilitySetting;
    if (!key) return;
    if (input.type === 'checkbox') state.utility[key] = input.checked;
    else if (input.type === 'number' || input.type === 'range') state.utility[key] = parseNumber(input.value);
    else state.utility[key] = input.value;
    if (key === 'marketSettingsSearch') state.utility.marketSettingsPage = 1;
    if (key === 'marketFilterPresetId') {
      const preset = normalizeMarketFilterPresets(state.utility.marketFilterPresets).find((item) => item.id === state.utility.marketFilterPresetId);
      state.utility.marketFilterPresetName = preset ? preset.name : '';
      syncUtilitySettingInputs('marketFilterPresetName', state.utility.marketFilterPresetName);
    }
    await saveUtilityState();
    if (key === 'pickpocketMinCs' || key === 'pickpocketMaxCs') schedulePickpocketFormatting();
    if (key === 'crackingMaxSuggestions') {
      state.utility[key] = clamp(Math.floor(parseNumber(state.utility[key] || 8)), 1, 20);
      syncUtilitySettingInputs(key, state.utility[key]);
      scheduleCrackingScan();
      await saveUtilityState();
    }
    if (key === 'crackingShowComplete') scheduleCrackingScan();
    if (key === 'marketBazaarMinQty' || key === 'marketBazaarMaxAgeMinutes') renderNativeItemMarketBazaarPanel();
    if (key === 'marketBazaarAutoScan' || key === 'marketBazaarScanPaused') scheduleAllBazaarAutoScan();
    if (key === 'marketHighlightEnabled' || key === 'marketHighlightThresholdPct') {
      syncUtilitySettingInputs(key, state.utility[key]);
      requestAnimationFrame(() => applyItemMarketValueHighlights());
    }
    if (key === 'targetDesktopAlerts' && state.utility.targetDesktopAlerts) await requestNotificationPermissionIfNeeded();
    if (['chainMessageAlertEnabled', 'chainTargetAlertEnabled', 'chainWarningAlertEnabled'].includes(key) && state.utility[key]) await requestNotificationPermissionIfNeeded();
    if (key === 'chainMessageAlertAt' || key === 'chainTargetAlertAt' || key === 'chainWarningAlertAt') syncChainAlertControls();
    if (key === 'timerAlertVolume') {
      state.utility[key] = clamp(parseNumber(state.utility[key]), 0, 100);
      syncUtilitySettingInputs(key, state.utility[key]);
      await saveUtilityState();
    }
    if (key === 'casinoPokerRisk') {
      state.utility[key] = clamp(Math.round(parseNumber(state.utility[key])), 0, 100);
      syncUtilitySettingInputs(key, state.utility[key]);
      const label = $(`#${APP.id} [data-poker-risk-label]`);
      if (label) label.textContent = `${state.utility[key] <= 30 ? 'Safe' : (state.utility[key] >= 70 ? 'Loose' : 'Balanced')} ${state.utility[key]}/100`;
      await saveUtilityState();
    }
    if (key === 'travelCarry') state.utility.travelCapacity = state.utility.travelCarry;
    if (options.render !== false) renderPanel();
  }

  function syncUtilitySettingInputs(key, value) {
    $all(`#${APP.id} [data-utility-setting], #${APP.id}-modal [data-utility-setting]`).filter((input) => input.dataset.utilitySetting === key).forEach((input) => {
      if (input.type === 'checkbox') input.checked = !!value;
      else if (input.type === 'range' && key === 'marketHighlightThresholdPct') input.value = String(clamp(parseNumber(value), -10, 10));
      else if (input.type === 'range' && (key === 'chainMessageAlertAt' || key === 'chainTargetAlertAt' || key === 'chainWarningAlertAt')) input.value = String(clamp(parseChainTimeSetting(value, key === 'chainMessageAlertAt' ? 290 : (key === 'chainTargetAlertAt' ? 140 : 30)), 0, 300));
      else input.value = String(value ?? '');
    });
  }

  function syncChainAlertControls() {
    const panel = state.elements.panel;
    if (!panel) return;
    const messageSeconds = parseChainTimeSetting(state.utility.chainMessageAlertAt, 290);
    const targetSeconds = parseChainTimeSetting(state.utility.chainTargetAlertAt, 140);
    const warningSeconds = parseChainTimeSetting(state.utility.chainWarningAlertAt, 30);
    const messageLabel = $('[data-chain-message-alert-label]', panel);
    const targetLabel = $('[data-chain-target-label]', panel);
    const warningLabel = $('[data-chain-warning-label]', panel);
    const messageMarker = $('[data-chain-message-alert-marker]', panel);
    const targetMarker = $('[data-chain-target-marker]', panel);
    const warningMarker = $('[data-chain-warning-marker]', panel);
    if (messageLabel) messageLabel.textContent = formatChainClock(messageSeconds * 1000);
    if (targetLabel) targetLabel.textContent = formatChainClock(targetSeconds * 1000);
    if (warningLabel) warningLabel.textContent = formatChainClock(warningSeconds * 1000);
    if (messageMarker) messageMarker.style.left = `${clamp((messageSeconds / 300) * 100, 0, 100).toFixed(1)}%`;
    if (targetMarker) targetMarker.style.left = `${clamp((targetSeconds / 300) * 100, 0, 100).toFixed(1)}%`;
    if (warningMarker) warningMarker.style.left = `${clamp((warningSeconds / 300) * 100, 0, 100).toFixed(1)}%`;
    syncUtilitySettingInputs('chainMessageAlertAt', messageSeconds);
    syncUtilitySettingInputs('chainTargetAlertAt', targetSeconds);
    syncUtilitySettingInputs('chainWarningAlertAt', warningSeconds);
  }

  async function updateTravelOwnedItem(input, options = {}) {
    const name = String(input.dataset.travelOwned || '').trim();
    if (!name) return;
    state.utility.travelOwnedItems = { ...(state.utility.travelOwnedItems || {}) };
    state.utility.travelOwnedItems[name] = Math.max(0, Math.floor(parseNumber(input.value)));
    await saveUtilityState();
    if (options.render !== false) renderPanel();
  }

  async function updateItemProfitPct(input, options = {}) {
    const key = itemProfitKey(input.dataset.itemProfit);
    if (!key) return;
    state.utility.itemProfitPcts = { ...(state.utility.itemProfitPcts || {}) };
    state.utility.itemProfitPcts[key] = parseNumber(input.value);
    await saveUtilityState();
    if (options.render !== false) renderPanelPreservingScroll();
  }

  async function copyUtilityText(value) {
    const text = String(value || '');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else window.prompt('Copy value:', text);
      showFlash('Copied helper value.');
    } catch (error) {
      window.prompt('Copy value:', text);
    }
  }

  async function addChainFriendlyMember() {
    const parsed = parseChainFriendlyInput(state.utility.chainFriendlyInput);
    if (!parsed.name && !parsed.xid) {
      showFlash('Enter a friendly member name, XID, or profile link first.');
      return;
    }
    const members = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers);
    const energy = Math.max(0, Math.floor(parseNumber(state.utility.chainFriendlyEnergy)));
    const note = String(state.utility.chainFriendlyNote || '').trim();
    const fetchedName = parsed.xid ? await fetchProfileNameByXid(parsed.xid) : '';
    const displayName = fetchedName || parsed.name || (parsed.xid ? `XID ${parsed.xid}` : '');
    const existingIndex = parsed.xid ? members.findIndex((member) => member.xid === parsed.xid) : -1;
    const member = {
      id: existingIndex >= 0 ? members[existingIndex].id : makeChainFriendlyId(parsed.xid, displayName, members.length),
      xid: parsed.xid,
      name: displayName,
      energy,
      note,
      createdAt: existingIndex >= 0 ? members[existingIndex].createdAt : nowMs(),
      updatedAt: nowMs()
    };
    if (existingIndex >= 0) members[existingIndex] = { ...members[existingIndex], ...member };
    else members.push(member);
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(members);
    state.utility.chainFriendlyInput = '';
    state.utility.chainFriendlyEnergy = 0;
    state.utility.chainFriendlyNote = '';
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(existingIndex >= 0 ? 'Friendly member updated.' : 'Friendly member added.');
  }

  async function updateChainFriendlyMember(input, options = {}) {
    const id = String(input.dataset.memberId || '').trim();
    const field = String(input.dataset.chainFriendlyField || '').trim();
    if (!id || !field) return;
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers).map((member) => {
      if (member.id !== id) return member;
      const next = { ...member, updatedAt: nowMs() };
      if (field === 'name') next.name = cleanBookieText(input.value) || (member.xid ? `XID ${member.xid}` : 'Member');
      if (field === 'energy') next.energy = Math.max(0, Math.floor(parseNumber(input.value)));
      if (field === 'note') next.note = String(input.value || '').trim();
      return next;
    });
    await saveUtilityState();
    if (options.render !== false) renderPanelKeepingScroll();
  }

  async function removeChainFriendlyMember(memberId) {
    const id = String(memberId || '').trim();
    if (!id) return;
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers).filter((member) => member.id !== id);
    const count = state.utility.chainFriendlyMembers.length;
    if (count) state.utility.chainFriendlyCursor = Math.max(0, Math.floor(parseNumber(state.utility.chainFriendlyCursor))) % count;
    else state.utility.chainFriendlyCursor = 0;
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash('Friendly member removed.');
  }

  async function setNextChainFriendlyMember(memberId) {
    const id = String(memberId || '').trim();
    if (!id) return;
    const members = sortChainFriendlyMembers(normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers));
    const index = members.findIndex((member) => member.id === id);
    if (index < 0) return;
    state.utility.chainFriendlyCursor = index;
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`${members[index].name || 'Friendly member'} set as next attacker.`);
  }

  async function copyCurrentChainMessage() {
    const text = String(state.utility.chainGeneratedMessage || '').trim();
    if (!text) return;
    await copyUtilityText(text);
  }

  async function copyChainFriendlyMessage(memberId, fallbackText = '', preferFallback = false) {
    const id = String(memberId || '').trim();
    const members = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers);
    const index = members.findIndex((member) => member.id === id);
    if (index < 0) return;
    const member = members[index];
    await resolveChainFriendlyMemberName(member);
    const text = String(preferFallback ? (fallbackText || buildFriendlyChainMessage(member)) : (buildFriendlyChainMessage(member) || fallbackText)).trim();
    if (!text) return;
    await copyUtilityText(text);
    const cost = Math.max(1, Math.floor(parseNumber(state.utility.chainAttackCost || 25)));
    members[index] = {
      ...member,
      energy: Math.max(0, Math.floor(parseNumber(member.energy)) - cost),
      updatedAt: nowMs()
    };
    state.utility.chainFriendlyMembers = members;
    state.utility.chainMessageLog = [
      { ts: nowMs(), text, memberId: member.id, memberName: member.name || (member.xid ? `XID ${member.xid}` : '') },
      ...(Array.isArray(state.utility.chainMessageLog) ? state.utility.chainMessageLog : [])
    ].slice(0, 30);
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function logChainMessage(value) {
    const text = String(value || '').trim();
    if (!text) return;
    await copyUtilityText(text);
    state.utility.chainMessageLog = [
      { ts: nowMs(), text },
      ...(Array.isArray(state.utility.chainMessageLog) ? state.utility.chainMessageLog : [])
    ].slice(0, 30);
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function clearChainMessageLog() {
    state.utility.chainMessageLog = [];
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function fillMarketPrice(value, itemName = '', sourcePrice = 0) {
    const amount = Math.max(1, Math.round(parseNumber(value)));
    const input = findMarketPriceInput(itemName, sourcePrice);
    if (!input) {
      showFlash(itemName ? `No price box found for ${itemName}. Click that item's Price field first, then press Fill.` : 'No visible price box found. Click a Torn price field first, then press Fill.');
      return false;
    }
    if (setVisibleInputValue(input, amount)) {
      try { input.focus({ preventScroll: true }); } catch (error) { input.focus(); }
      showFlash(`Filled ${formatFullMoney(amount)}. Review and confirm manually.`);
      return true;
    }
    return false;
  }

  async function fillAllMarketPrices() {
    const buttons = $all(`#${APP.id} [data-action="fill-market-price"][data-item-name][data-price]`);
    let filled = 0;
    let missed = 0;
    buttons.forEach((button) => {
      const amount = Math.max(1, Math.round(parseNumber(button.dataset.price)));
      const input = findMarketPriceInput(button.dataset.itemName, button.dataset.sourcePrice);
      if (input && setVisibleInputValue(input, amount)) {
        markMarketFillButton(button);
        filled += 1;
      } else {
        missed += 1;
      }
    });
    if (filled) showFlash(`Filled ${filled} visible price ${filled === 1 ? 'box' : 'boxes'}. Review and confirm manually.`);
    else showFlash('No visible price boxes found. Open Add Listings or click a Torn price field first.');
    if (missed) console.warn(`[TORN'z Tools] ${missed} visible item price boxes were not found for bulk fill.`);
  }

  async function sortUtilityTable(table, key) {
    if (!table || !key) return;
    const keyName = table === 'inventory' ? 'inventorySortKey' : 'citySortKey';
    const dirName = table === 'inventory' ? 'inventorySortDir' : 'citySortDir';
    if (state.utility[keyName] === key) {
      state.utility[dirName] = state.utility[dirName] === 'asc' ? 'desc' : 'asc';
    } else {
      state.utility[keyName] = key;
      state.utility[dirName] = ['name', 'store'].includes(key) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    renderPanel();
  }

  async function ignoreInventoryItem(name) {
    const itemName = String(name || '').trim();
    if (!itemName) return;
    const set = new Set(state.utility.ignoredItems || []);
    set.add(itemName);
    state.utility.ignoredItems = Array.from(set).sort((a, b) => a.localeCompare(b));
    await saveUtilityState();
    renderPanel();
    showFlash(`Ignored ${itemName}.`);
  }

  async function unignoreInventoryItem(name) {
    const itemName = String(name || '').trim();
    state.utility.ignoredItems = (state.utility.ignoredItems || []).filter((item) => item !== itemName);
    await saveUtilityState();
    renderPanel();
    showFlash(`Unignored ${itemName}.`);
  }

  async function useCasinoOdds(value) {
    const odds = Math.max(1.01, parseNumber(value));
    if (!Number.isFinite(odds) || odds <= 1) return;
    state.utility.casinoOdds = Math.round(odds * 100) / 100;
    await saveUtilityState();
    renderPanel();
    showFlash(`Loaded odds ${state.utility.casinoOdds.toFixed(2)}.`);
  }

  async function useVisibleBankAmount() {
    const amount = bankVisibleAmount();
    if (!amount) {
      showFlash('No visible bank amount found.');
      return;
    }
    state.utility.bankPlanAmount = Math.round(amount);
    await saveUtilityState();
    renderPanel();
    showFlash(`Loaded visible bank amount ${formatMoney(amount)}.`);
  }

  async function fillBankAmount(value) {
    const amount = Math.max(0, Math.floor(parseNumber(value)));
    const input = bankVisibleAmountInput();
    if (!amount || !input) {
      showFlash('No bank amount input found.');
      return;
    }
    input.focus();
    input.value = String(amount);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    state.utility.bankPlanAmount = amount;
    await saveUtilityState();
    showFlash(`Filled bank amount ${formatMoney(amount)}. Review and confirm manually in Torn.`);
  }

  async function toggleBookieSport(sport) {
    const key = String(sport || '').trim();
    if (!key) return;
    state.utility.bookieSports = { ...DEFAULT_UTILITY_STATE.bookieSports, ...(state.utility.bookieSports || {}) };
    const enabledCount = Object.values(state.utility.bookieSports).filter(Boolean).length;
    if (state.utility.bookieSports[key] && enabledCount <= 1) {
      showFlash('Keep at least one Bookie sport enabled.');
      return;
    }
    state.utility.bookieSports[key] = !state.utility.bookieSports[key];
    await saveUtilityState();
    renderPanel();
  }

  async function fillBookieStake(label, odds, stake) {
    const input = findBookieStakeInput(label, odds);
    if (!input) {
      showFlash(`Could not find stake input for ${label || 'that outcome'}. Scroll it into view, then refresh.`);
      return;
    }
    const amount = Math.max(0, Math.round(parseNumber(stake)));
    if (!amount) {
      showFlash('Stake is 0. Raise your base stake or use an outcome with positive edge.');
      return;
    }
    if (setVisibleInputValue(input, amount)) {
      try { input.focus({ preventScroll: true }); } catch (error) { input.focus(); }
      showFlash(`Filled ${formatFullMoney(amount)} for ${label}. Review before pressing BET.`);
    }
  }

  function ffscouterKey() {
    return String(state.apiKey || '').trim();
  }

  function isFfscouterKeyReasonable(key = ffscouterKey()) {
    return /^[a-z0-9]{16}$/i.test(String(key || '').trim());
  }

  function ffscouterError(data, fallback = 'FFScouter request failed') {
    if (!data || typeof data !== 'object') return fallback;
    const message = data.error || data.message || data.detail || fallback;
    return `${message}${data.code ? ` (code ${data.code})` : ''}`;
  }

  function ffscouterStatus(label, error) {
    const text = `${label}: ${friendlyError(error)}`.replace(/\s+/g, ' ').trim();
    return text.length > 54 ? `${text.slice(0, 51)}...` : text;
  }

  function ffscouterRowsFromResponse(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    if (Array.isArray(data.targets)) return data.targets;
    if (Array.isArray(data.results)) return data.results;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.players)) return data.players;
    if (data.data && typeof data.data === 'object') return ffscouterRowsFromResponse(data.data);
    if (data.result && typeof data.result === 'object') return ffscouterRowsFromResponse(data.result);
    return [];
  }

  async function checkFfscouterKey() {
    const key = ffscouterKey();
    if (!isFfscouterKeyReasonable(key)) {
      state.ffscouterStatus = 'invalid key format';
      renderPanel();
      showFlash('Add your Torn API key in Profile first.');
      return;
    }
    if (!state.utility.ffscouterEnabled) {
      showFlash('Enable FFScouter features before checking the key.');
      return;
    }
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const data = await httpGetJson(`${APP.ffscouterBaseUrl}/check-key?key=${encodeURIComponent(key)}`);
      if (data && data.error) throw new Error(data.error);
      state.ffscouterStatus = data.is_registered
        ? `registered${data.is_premium ? ' premium' : ''}`
        : 'not registered';
      showFlash(`FFScouter key ${state.ffscouterStatus}.`);
    } catch (error) {
      state.ffscouterStatus = ffscouterStatus('check', error);
      showFlash(`FFScouter check failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanel();
    }
  }

  async function registerFfscouterKey() {
    const key = ffscouterKey();
    if (!isFfscouterKeyReasonable(key)) {
      showFlash('Add your Torn API key in Profile first.');
      return;
    }
    if (!state.utility.ffscouterEnabled) {
      showFlash('Enable FFScouter before registering with FFScouter.');
      return;
    }
    const confirmed = window.confirm(
      'Register this saved Torn API key with FFScouter?\n\n' +
      'This sends the key to ffscouter.com once and confirms that you agree to FFScouter\'s data policy and terms.\n\n' +
      'Read them first at https://ffscouter.com'
    );
    if (!confirmed) return;
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const data = await httpPostJson(`${APP.ffscouterBaseUrl}/register`, {
        key,
        agree_to_data_policy: true,
        signup_source: 'TORNzTools'
      });
      if (data && data.error) throw new Error(ffscouterError(data));
      state.ffscouterStatus = 'registered';
      showFlash(data.message || 'FFScouter key registered.');
    } catch (error) {
      state.ffscouterStatus = ffscouterStatus('register', error);
      showFlash(`FFScouter register failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanel();
    }
  }

  async function searchFfscouterTargets() {
    const key = ffscouterKey();
    if (!isFfscouterKeyReasonable(key)) {
      showFlash('Add your Torn API key in Profile first.');
      return;
    }
    if (!state.utility.ffscouterEnabled) {
      showFlash('Enable FFScouter features before searching.');
      return;
    }
    const preset = String(state.utility.ffscouterPreset || 'level');
    const limit = clamp(Math.round(parseNumber(state.utility.ffscouterLimit) || 20), 1, 50);
    const params = new URLSearchParams({ key, limit: String(limit) });
    if (preset === 'level' || preset === 'respect') {
      params.set('preset', preset);
    } else {
      params.set('minlevel', String(clamp(Math.round(parseNumber(state.utility.ffscouterMinLevel) || 1), 1, 100)));
      params.set('maxlevel', String(clamp(Math.round(parseNumber(state.utility.ffscouterMaxLevel) || 100), 1, 100)));
      params.set('minff', String(Math.max(1, parseNumber(state.utility.ffscouterMinFf) || 1)));
      params.set('maxff', String(Math.max(1, parseNumber(state.utility.ffscouterMaxFf) || 3)));
      params.set('inactiveonly', state.utility.ffscouterInactiveOnly ? '1' : '0');
      params.set('factionless', state.utility.ffscouterFactionless ? '1' : '0');
    }
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const data = await httpGetJson(`${APP.ffscouterBaseUrl}/get-targets?${params.toString()}`);
      if (data && data.error) throw new Error(ffscouterError(data));
      const rows = filterFfscouterRows(normalizeTargetListRows(ffscouterRowsFromResponse(data)));
      if (!rows.length) throw new Error('No targets returned.');
      await createTargetListFromRows(rows, {
        name: state.utility.ffscouterListName || `${preset === 'respect' ? 'Chain / respect' : preset === 'level' ? 'Leveling' : preset === 'war' ? 'War ready' : 'Custom'} - ${new Date().toLocaleTimeString()}`,
        source: 'FFScouter',
        preset
      });
      state.ffscouterStatus = `${rows.length} targets loaded`;
      state.utility.ffscouterListName = '';
      await saveUtilityState();
      showFlash(`Created FFScouter list with ${rows.length} targets.`);
    } catch (error) {
      state.ffscouterStatus = ffscouterStatus('search', error);
      showFlash(`FFScouter search failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanel();
    }
  }

  async function fetchFfscouterStatsForXids(xids) {
    const key = ffscouterKey();
    if (!isFfscouterKeyReasonable(key)) throw new Error('Add your Torn API key in Profile first.');
    if (!state.utility.ffscouterEnabled) throw new Error('Enable FFScouter features first.');
    const ids = Array.from(new Set((Array.isArray(xids) ? xids : [])
      .map((xid) => String(xid || '').replace(/\D/g, ''))
      .filter(Boolean)));
    if (!ids.length) return [];
    const rows = [];
    for (let index = 0; index < ids.length; index += 50) {
      const batch = ids.slice(index, index + 50);
      const params = new URLSearchParams({ key, targets: batch.join(',') });
      const data = await httpGetJson(`${APP.ffscouterBaseUrl}/get-stats?${params.toString()}`);
      if (data && data.error) throw new Error(ffscouterError(data));
      const batchRows = ffscouterRowsFromResponse(data);
      rows.push(...normalizeTargetListRows(batchRows));
      if (index + 50 < ids.length) await sleep(350);
    }
    return rows;
  }

  function mergeFfscouterStats(target, update) {
    if (!target || !update) return target;
    return {
      ...target,
      fairFight: update.fairFight || target.fairFight,
      bssPublic: update.bssPublic || target.bssPublic,
      bsEstimate: update.bsEstimate || target.bsEstimate,
      bsEstimateHuman: update.bsEstimateHuman || target.bsEstimateHuman || '',
      ffUpdatedAt: update.ffUpdatedAt || target.ffUpdatedAt || 0,
      ffNoData: !!(update.ffNoData || target.ffNoData),
      premiumInsightsAvailable: !!(update.premiumInsightsAvailable || target.premiumInsightsAvailable),
      distributionHuman: update.distributionHuman || target.distributionHuman || '',
      distributionLastUpdated: update.distributionLastUpdated || target.distributionLastUpdated || 0,
      source: target.source || update.source || 'FFScouter',
      updatedAt: nowMs()
    };
  }

  async function scoutCurrentFfscouterTarget() {
    const current = getCurrentProfileTarget();
    if (!current || !current.xid) {
      showFlash('Open a Torn profile page first.');
      return;
    }
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const rows = await fetchFfscouterStatsForXids([current.xid]);
      const row = rows.find((item) => item.xid === current.xid);
      if (!row) throw new Error('No FFScouter combat data returned.');
      await saveTarget(mergeFfscouterStats(current, row));
      state.ffscouterStatus = `scouted XID ${current.xid}`;
      showFlash(`Updated FFScouter data for ${current.name || current.xid}.`);
    } catch (error) {
      state.ffscouterStatus = ffscouterStatus('scout', error);
      showFlash(`FFScouter scout failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanelKeepingScroll();
    }
  }

  async function scoutBoardFfscouterTargets() {
    await reloadUtilityStateFromStorage();
    const targets = normalizeTargets(state.utility.targets);
    if (!targets.length) {
      showFlash('No saved board targets to scout.');
      return;
    }
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const rows = await fetchFfscouterStatsForXids(targets.map((target) => target.xid));
      const byXid = new Map(rows.map((row) => [row.xid, row]));
      let changed = 0;
      state.utility.targets = normalizeTargets(targets.map((target) => {
        const update = byXid.get(target.xid);
        if (!update) return target;
        changed += 1;
        return mergeFfscouterStats(target, update);
      }));
      state.ffscouterStatus = `${changed} board targets scouted`;
      await saveUtilityState();
      showFlash(`Updated FFScouter data for ${changed} board targets.`);
    } catch (error) {
      state.ffscouterStatus = ffscouterStatus('scout', error);
      showFlash(`FFScouter scout failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanelKeepingScroll();
    }
  }

  async function scoutTargetListFfscouter(listId) {
    const id = String(listId || '');
    await reloadUtilityStateFromStorage();
    const lists = normalizeTargetLists(state.utility.targetLists);
    const list = lists.find((item) => item.id === id);
    if (!list) return;
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const rows = await fetchFfscouterStatsForXids(list.targets.map((target) => target.xid));
      const byXid = new Map(rows.map((row) => [row.xid, row]));
      let changed = 0;
      state.utility.targetLists = normalizeTargetLists(lists.map((item) => {
        if (item.id !== id) return item;
        const targets = item.targets.map((target) => {
          const update = byXid.get(target.xid);
          if (!update) return target;
          changed += 1;
          return mergeFfscouterStats(target, update);
        });
        return { ...item, targets, updatedAt: nowMs(), source: item.source || 'FFScouter' };
      }));
      state.ffscouterStatus = `${changed} list targets scouted`;
      await saveUtilityState();
      showFlash(`Updated FFScouter data for ${changed} list targets.`);
    } catch (error) {
      state.ffscouterStatus = ffscouterStatus('scout', error);
      showFlash(`FFScouter scout failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanelKeepingScroll();
    }
  }

  function filterFfscouterRows(rows) {
    const saved = new Set(normalizeTargets(state.utility.targets).map((target) => target.xid));
    const maxDays = Math.max(0, parseNumber(state.utility.ffscouterMaxLastActionDays));
    const maxAgeSeconds = maxDays > 0 ? maxDays * 24 * 60 * 60 : 0;
    const nowSeconds = Math.floor(nowMs() / 1000);
    const filtered = rows.filter((row) => {
      if (state.utility.ffscouterExcludeSaved && saved.has(row.xid)) return false;
      if (state.utility.ffscouterRequireStats && !row.bsEstimate && !row.bsEstimateHuman && !row.bssPublic) return false;
      if (maxAgeSeconds && row.lastAction && nowSeconds - row.lastAction > maxAgeSeconds) return false;
      return true;
    });
    const sortKey = String(state.utility.ffscouterSortKey || 'ff');
    return filtered.sort((a, b) => {
      if (sortKey === 'level') return (b.level || 0) - (a.level || 0) || (a.fairFight || 999) - (b.fairFight || 999);
      if (sortKey === 'stats') return (a.bsEstimate || a.bssPublic || Number.MAX_SAFE_INTEGER) - (b.bsEstimate || b.bssPublic || Number.MAX_SAFE_INTEGER);
      if (sortKey === 'activity') return (b.lastAction || 0) - (a.lastAction || 0);
      return (a.fairFight || 999) - (b.fairFight || 999) || (b.level || 0) - (a.level || 0);
    });
  }

  async function applyTargetFinderPreset(preset) {
    const key = String(preset || '').trim();
    if (!['level', 'respect', 'war', 'custom'].includes(key)) return;
    state.utility.ffscouterPreset = key;
    if (key === 'level') {
      state.utility.ffscouterLimit = 20;
      state.utility.ffscouterMinLevel = 1;
      state.utility.ffscouterMaxLevel = 100;
      state.utility.ffscouterMinFf = 1;
      state.utility.ffscouterMaxFf = 3;
      state.utility.ffscouterInactiveOnly = true;
      state.utility.ffscouterFactionless = false;
      state.utility.ffscouterExcludeSaved = false;
      state.utility.ffscouterRequireStats = false;
      state.utility.ffscouterMaxLastActionDays = 0;
      state.utility.ffscouterSortKey = 'level';
      state.utility.ffscouterListTag = 'level';
      state.utility.ffscouterListName = '';
    }
    if (key === 'respect') {
      state.utility.ffscouterLimit = 30;
      state.utility.ffscouterMinLevel = 1;
      state.utility.ffscouterMaxLevel = 100;
      state.utility.ffscouterMinFf = 1;
      state.utility.ffscouterMaxFf = 2.5;
      state.utility.ffscouterInactiveOnly = true;
      state.utility.ffscouterFactionless = false;
      state.utility.ffscouterExcludeSaved = true;
      state.utility.ffscouterRequireStats = false;
      state.utility.ffscouterMaxLastActionDays = 0;
      state.utility.ffscouterSortKey = 'ff';
      state.utility.ffscouterListTag = 'chain';
      state.utility.ffscouterListName = 'Chain / respect';
    }
    if (key === 'war') {
      state.utility.ffscouterLimit = 40;
      state.utility.ffscouterMinLevel = 1;
      state.utility.ffscouterMaxLevel = 100;
      state.utility.ffscouterMinFf = 1;
      state.utility.ffscouterMaxFf = 2.2;
      state.utility.ffscouterInactiveOnly = false;
      state.utility.ffscouterFactionless = false;
      state.utility.ffscouterExcludeSaved = true;
      state.utility.ffscouterRequireStats = false;
      state.utility.ffscouterMaxLastActionDays = 7;
      state.utility.ffscouterSortKey = 'ff';
      state.utility.ffscouterListTag = 'war enemy';
      state.utility.ffscouterListName = 'war enemy';
    }
    await saveUtilityState();
    renderPanel();
  }

  async function createTargetListFromPaste() {
    const rows = extractTargetRowsFromText(state.utility.ffscouterImportText);
    if (!rows.length) {
      showFlash('Paste at least one player ID or profile link.');
      return;
    }
    await createTargetListFromRows(rows, {
      name: state.utility.ffscouterListName || `Manual list - ${new Date().toLocaleTimeString()}`,
      source: 'Manual paste',
      preset: 'manual'
    });
    state.utility.ffscouterImportText = '';
    state.utility.ffscouterListName = '';
    await saveUtilityState();
    renderPanel();
    showFlash(`Created list with ${rows.length} targets.`);
  }

  function extractTargetRowsFromText(text) {
    const matches = String(text || '').match(/\b\d{3,10}\b/g) || [];
    const seen = new Set();
    return matches
      .map((xid) => String(xid).replace(/\D/g, ''))
      .filter((xid) => xid && !seen.has(xid) && seen.add(xid))
      .map((xid) => ({ xid, name: `XID ${xid}`, source: 'manual' }));
  }

  async function createTargetListFromRows(rows, options = {}) {
    const cleanRows = normalizeTargetListRows(rows);
    if (!cleanRows.length) return null;
    const list = {
      id: `list-${Date.now().toString(36)}`,
      name: String(options.name || 'Target list').trim(),
      source: String(options.source || 'local').trim(),
      preset: String(options.preset || '').trim(),
      defaultNote: String(options.defaultNote || state.utility.ffscouterListTag || '').trim(),
      createdAt: nowMs(),
      updatedAt: nowMs(),
      targets: cleanRows
    };
    const lists = normalizeTargetLists(state.utility.targetLists);
    state.utility.targetLists = normalizeTargetLists([list, ...lists]);
    state.utility.activeTargetListId = list.id;
    state.utility.activeTab = 'lists';
    await saveUtilityState();
    return list;
  }

  async function selectTargetList(listId) {
    state.utility.activeTargetListId = String(listId || '');
    await saveUtilityState();
    renderPanel();
  }

  async function sortTargetList(key) {
    const sortKey = String(key || '').trim();
    if (!['level', 'ff', 'stats'].includes(sortKey)) return;
    if (state.utility.targetListSortKey === sortKey) {
      state.utility.targetListSortDir = state.utility.targetListSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.utility.targetListSortKey = sortKey;
      state.utility.targetListSortDir = sortKey === 'level' ? 'desc' : 'asc';
    }
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function deleteTargetList(listId) {
    const id = String(listId || '');
    await reloadUtilityStateFromStorage();
    state.utility.targetLists = normalizeTargetLists(state.utility.targetLists).filter((list) => list.id !== id);
    if (state.utility.activeTargetListId === id) state.utility.activeTargetListId = '';
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash('Target list deleted.');
  }

  async function removeTargetFromList(listId, xid) {
    const id = String(listId || '');
    const cleanXid = String(xid || '').replace(/\D/g, '');
    await reloadUtilityStateFromStorage();
    state.utility.targetLists = normalizeTargetLists(state.utility.targetLists).map((list) => (
      list.id === id ? { ...list, targets: list.targets.filter((target) => target.xid !== cleanXid), updatedAt: nowMs() } : list
    )).filter((list) => list.targets.length);
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function copyTargetListIds(listId) {
    const list = normalizeTargetLists(state.utility.targetLists).find((item) => item.id === String(listId || ''));
    if (!list) return;
    await copyUtilityText(list.targets.map((target) => target.xid).join(','));
  }

  function targetFromListRow(row, note = '') {
    return {
      xid: row.xid,
      name: row.name || `XID ${row.xid}`,
      note: note || row.note || '',
      level: row.level,
      fairFight: row.fairFight,
      bssPublic: row.bssPublic,
      bsEstimate: row.bsEstimate,
      bsEstimateHuman: row.bsEstimateHuman,
      ffUpdatedAt: row.ffUpdatedAt,
      ffNoData: row.ffNoData,
      premiumInsightsAvailable: row.premiumInsightsAvailable,
      distributionHuman: row.distributionHuman,
      distributionLastUpdated: row.distributionLastUpdated,
      lastAction: row.lastAction,
      source: row.source || 'FFScouter'
    };
  }

  async function addTargetFromListToBoard(listId, xid) {
    await reloadUtilityStateFromStorage();
    const list = normalizeTargetLists(state.utility.targetLists).find((item) => item.id === String(listId || ''));
    if (!list) return;
    const row = list.targets.find((item) => item.xid === String(xid || '').replace(/\D/g, ''));
    if (!row) return;
    await saveTarget(targetFromListRow(row, targetListDefaultNote(list)));
  }

  async function addTargetListToBoard(listId) {
    await reloadUtilityStateFromStorage();
    const list = normalizeTargetLists(state.utility.targetLists).find((item) => item.id === String(listId || ''));
    if (!list) return;
    const note = targetListDefaultNote(list);
    const imported = list.targets.map((row) => targetFromListRow(row, note));
    state.utility.targets = normalizeTargets([...imported, ...normalizeTargets(state.utility.targets)]);
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Added ${imported.length} targets to board.`);
  }

  async function saveTarget(target) {
    if (!target || !target.xid) return;
    await reloadUtilityStateFromStorage();
    const targets = normalizeTargets(state.utility.targets);
    const existing = targets.find((item) => item.xid === target.xid);
    const incomingName = String(target.name || '').trim();
    const existingName = String(existing && existing.name ? existing.name : '').trim();
    const mergedName = /^XID\s+\d+$/i.test(incomingName) && existingName && !/^XID\s+\d+$/i.test(existingName)
      ? existingName
      : incomingName || existingName || `XID ${target.xid}`;
    const next = {
      xid: target.xid,
      name: mergedName,
      note: String(target.note || (existing && existing.note) || '').trim(),
      factionId: String(target.factionId || (existing && existing.factionId) || '').replace(/\D/g, ''),
      factionName: String(target.factionName || (existing && existing.factionName) || '').trim(),
      starred: existing ? existing.starred : false,
      locked: existing ? existing.locked : false,
      hidden: existing ? existing.hidden : false,
      hospitalUntil: parseNumber(target.hospitalUntil) || (existing ? existing.hospitalUntil : 0),
      statusState: String(target.statusState || (existing && existing.statusState) || '').trim(),
      statusText: String(target.statusText || (existing && existing.statusText) || '').trim(),
      statusUntil: parseNumber(target.statusUntil) || (existing ? existing.statusUntil : 0),
      statusUpdatedAt: parseNumber(target.statusUpdatedAt) || (existing ? existing.statusUpdatedAt : 0),
      level: parseNumber(target.level) || (existing ? existing.level : 0),
      fairFight: parseNumber(target.fairFight) || (existing ? existing.fairFight : 0),
      bssPublic: parseNumber(target.bssPublic) || (existing ? existing.bssPublic : 0),
      bsEstimate: parseNumber(target.bsEstimate) || (existing ? existing.bsEstimate : 0),
      bsEstimateHuman: String(target.bsEstimateHuman || (existing && existing.bsEstimateHuman) || '').trim(),
      ffUpdatedAt: parseNumber(target.ffUpdatedAt) || (existing ? existing.ffUpdatedAt : 0),
      ffNoData: !!(target.ffNoData || (existing && existing.ffNoData)),
      premiumInsightsAvailable: !!(target.premiumInsightsAvailable || (existing && existing.premiumInsightsAvailable)),
      distributionHuman: String(target.distributionHuman || (existing && existing.distributionHuman) || '').trim(),
      distributionLastUpdated: parseNumber(target.distributionLastUpdated) || (existing ? existing.distributionLastUpdated : 0),
      lastAction: parseNumber(target.lastAction) || (existing ? existing.lastAction : 0),
      source: String(target.source || (existing && existing.source) || '').trim(),
      createdAt: existing ? existing.createdAt : nowMs(),
      updatedAt: nowMs()
    };
    state.utility.targets = normalizeTargets([next, ...targets.filter((item) => item.xid !== target.xid)]);
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Saved target ${next.name}.`);
  }

  async function addCurrentTarget() {
    const target = getCurrentProfileTarget();
    if (!target) {
      showFlash('Open a Torn profile page first.');
      return;
    }
    await saveTarget(target);
  }

  async function addManualTarget() {
    const xid = parseProfileXid(state.utility.targetInput);
    if (!xid) {
      showFlash('Paste a profile URL or XID first.');
      return;
    }
    const note = String(state.utility.targetNote || '').trim();
    const name = await fetchProfileNameByXid(xid) || `XID ${xid}`;
    await saveTarget({ xid, name, note });
    state.utility.targetInput = '';
    state.utility.targetNote = '';
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function saveTargetFromModal() {
    const input = $(`#${APP.id} [data-utility-setting="targetInput"]`) || $(`#${APP.id}-modal [data-target-modal-input]`);
    const noteInput = $(`#${APP.id} [data-utility-setting="targetNote"]`) || $(`#${APP.id}-modal [data-target-modal-note]`);
    const xid = parseProfileXid(input ? input.value : state.utility.targetInput);
    if (!xid) {
      showFlash('Paste a profile URL or XID first.');
      return;
    }
    const name = await fetchProfileNameByXid(xid) || `XID ${xid}`;
    await saveTarget({ xid, name, note: noteInput ? noteInput.value : state.utility.targetNote });
    state.utility.targetInput = '';
    state.utility.targetNote = '';
    state.utility.targetAddOpen = false;
    await saveUtilityState();
    renderPanel();
  }

  function openTargetAddWindow() {
    const opening = !state.utility.targetAddOpen;
    state.utility.targetAddOpen = opening;
    if (opening) {
      state.utility.targetInput = '';
      state.utility.targetNote = '';
    }
    state.utility.factionAddOpen = false;
    state.utility.targetImportOpen = false;
    saveUtilityState();
    renderPanel();
  }

  async function toggleTargetFlag(xid, flag) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid || !['starred', 'locked'].includes(flag)) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, [flag]: !target[flag], updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function toggleTargetHide(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    const target = normalizeTargets(state.utility.targets).find((item) => item.xid === cleanXid);
    if (target && target.locked && !target.hidden) {
      showFlash('Locked target protected. Unlock it before hiding.');
      return;
    }
    state.utility.targets = normalizeTargets(state.utility.targets).map((item) => (
      item.xid === cleanXid ? { ...item, hidden: !item.hidden, updatedAt: nowMs() } : item
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function sortTargetTable(key) {
    if (!['mark', 'player', 'status', 'note', 'level', 'ff', 'cp'].includes(String(key || ''))) return;
    if (state.utility.targetSortKey === key) {
      state.utility.targetSortDir = state.utility.targetSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.utility.targetSortKey = key;
      state.utility.targetSortDir = ['player', 'note', 'ff'].includes(key) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    renderPanel();
  }

  async function toggleTargetNoteFilterMenu() {
    state.utility.targetNoteFilterOpen = !state.utility.targetNoteFilterOpen;
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function toggleTargetNoteFilter(note) {
    const cleanNote = String(note || '').trim();
    if (!cleanNote) return;
    const set = new Set(selectedTargetNoteFilters());
    if (set.has(cleanNote)) set.delete(cleanNote);
    else set.add(cleanNote);
    state.utility.targetNoteFilters = Array.from(set).sort((a, b) => a.localeCompare(b));
    state.utility.targetNoteFilter = '';
    state.utility.targetNoteFilterOpen = true;
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function clearTargetNoteFilters() {
    state.utility.targetNoteFilters = [];
    state.utility.targetNoteFilter = '';
    state.utility.targetNoteFilterOpen = true;
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function toggleTargetTreeNode(key) {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) return;
    state.utility.targetTreeOpen = { ...(state.utility.targetTreeOpen || {}) };
    state.utility.targetTreeOpen[cleanKey] = !targetTreeIsOpen(cleanKey);
    await saveUtilityState();
    renderPanel();
  }

  function targetTreeIsOpen(key) {
    const map = state.utility.targetTreeOpen || {};
    if (Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
    return /^root:(priority|factions|tags|status)$/.test(String(key || ''));
  }

  async function updateTargetNote(input, options = {}) {
    const cleanXid = String(input.dataset.targetNote || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, note: String(input.value || ''), updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    if (options.render !== false) renderPanelKeepingScroll();
  }

  async function setTargetHospitalTimer(xid, minutes) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    const mins = Math.max(1, parseNumber(minutes));
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, hospitalUntil: nowMs() + mins * 60 * 1000, updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Hospital timer set for ${mins} minutes.`);
  }

  async function clearTargetHospitalTimer(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, hospitalUntil: 0, updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  function exportTargets() {
    const payload = {
      app: APP.name,
      version: APP.version,
      exportedAt: new Date().toISOString(),
      targets: normalizeTargets(state.utility.targets)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tornz-targets-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showFlash('Exported target list.');
  }

  function openTargetsImportWindow() {
    state.utility.targetImportOpen = !state.utility.targetImportOpen;
    state.utility.targetAddOpen = false;
    state.utility.factionAddOpen = false;
    saveUtilityState();
    renderPanel();
  }

  async function importTargetsFromModal() {
    const textarea = $(`#${APP.id} [data-utility-setting="targetImportJson"]`) || $(`#${APP.id}-modal [data-target-import-json]`);
    let parsed;
    try {
      parsed = JSON.parse(textarea ? textarea.value : state.utility.targetImportJson || '');
    } catch (error) {
      showFlash('Import failed: JSON is not valid.');
      return;
    }
    const imported = normalizeTargets(Array.isArray(parsed) ? parsed : parsed.targets);
    if (!imported.length) {
      showFlash('No targets found in import.');
      return;
    }
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets([...imported, ...normalizeTargets(state.utility.targets)]);
    state.utility.targetImportJson = '';
    state.utility.targetImportOpen = false;
    await saveUtilityState();
    closeModal();
    renderPanelKeepingScroll();
    showFlash(`Imported ${imported.length} targets.`);
  }

  function openFactionImportWindow() {
    state.utility.factionAddOpen = !state.utility.factionAddOpen;
    state.utility.targetAddOpen = false;
    state.utility.targetImportOpen = false;
    saveUtilityState();
    renderPanel();
  }

  async function importFactionFromModal() {
    const input = $(`#${APP.id} [data-utility-setting="factionInput"]`) || $(`#${APP.id}-modal [data-faction-modal-input]`);
    const noteInput = $(`#${APP.id} [data-utility-setting="factionNote"]`) || $(`#${APP.id}-modal [data-faction-modal-note]`);
    const factionId = parseFactionId(input ? input.value : state.utility.factionInput);
    if (!factionId) {
      showFlash('Paste a faction ID or faction URL first.');
      return;
    }
    if (!isApiKeyReasonable(state.apiKey)) {
      showFlash('Add an API key first, then import faction members.');
      return;
    }
    try {
      const url = `${APP.apiBaseUrl}/faction/${encodeURIComponent(factionId)}?selections=basic&key=${encodeURIComponent(state.apiKey)}`;
      const data = await httpGetJson(url);
      if (data.error) throw new Error(data.error.error || 'Torn API error');
      const members = data.members || {};
      const factionName = cleanBookieText(data.name || (data.faction && data.faction.name) || `Faction ${factionId}`);
      const note = String(noteInput ? noteInput.value : state.utility.factionNote || '').trim();
      const imported = Object.entries(members).map(([xid, member]) => ({
        xid: String(xid).replace(/\D/g, ''),
        name: cleanProfileName(member && member.name ? member.name : `XID ${xid}`, xid),
        note,
        factionId: String(factionId),
        factionName,
        starred: false,
        locked: false,
        hidden: false,
        createdAt: nowMs(),
        updatedAt: nowMs()
      })).filter((target) => target.xid);
      if (!imported.length) throw new Error('No faction members returned.');
      await reloadUtilityStateFromStorage();
      state.utility.targets = normalizeTargets([...imported, ...normalizeTargets(state.utility.targets)]);
      state.utility.factionInput = '';
      state.utility.factionNote = '';
      state.utility.factionAddOpen = false;
      await saveUtilityState();
      closeModal();
      renderPanelKeepingScroll();
      showFlash(`Imported ${imported.length} faction targets.`);
    } catch (error) {
      showFlash(`Faction import failed: ${friendlyError(error)}`);
    }
  }

  function parseFactionId(value) {
    const text = String(value || '');
    const match = text.match(/[?&#](?:ID|factionID)=(\d+)/i) || text.match(/\bfaction\s*[:#]?\s*(\d+)\b/i) || text.match(/\b(\d{2,10})\b/);
    return match ? match[1] : '';
  }

  async function removeTarget(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    const target = normalizeTargets(state.utility.targets).find((item) => item.xid === cleanXid);
    if (target && target.locked) {
      showFlash('Locked target protected. Unlock it before removing.');
      return;
    }
    state.utility.targets = normalizeTargets(state.utility.targets).filter((target) => target.xid !== cleanXid);
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Removed target XID ${cleanXid}.`);
  }

  async function addUtilityTimer() {
    const module = getUtilityModule();
    const label = String(state.utility.timerLabel || module.short || 'Timer').trim() || 'Timer';
    const minutes = Math.max(1, parseNumber(state.utility.timerMinutes || 30));
    await addUtilityTimerAt(module.key, label, String(state.utility.timerNote || '').trim(), nowMs() + minutes * 60 * 1000);
    showFlash(`Timer added: ${label}`);
  }

  async function addUtilityTimerAt(moduleKey, label, note, dueAt) {
    if ('Notification' in window && Notification.permission === 'default') await requestNotificationPermissionIfNeeded();
    const timer = {
      id: `timer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      moduleKey,
      label: String(label || 'Timer').trim() || 'Timer',
      note: String(note || '').trim(),
      dueAt: Math.max(nowMs() + 1000, parseNumber(dueAt)),
      alerted: false
    };
    state.utility.timers = [...(state.utility.timers || []), timer];
    await saveUtilityState();
    renderPanelKeepingScroll();
    return timer;
  }

  async function setHospitalAlertTimer(untilValue, offsetMinutesValue) {
    const untilMs = parseNumber(untilValue);
    const offsetMinutes = Math.max(0, parseNumber(offsetMinutesValue));
    if (!untilMs || untilMs <= nowMs()) {
      showFlash('Hospital exit time is not active anymore.');
      return;
    }
    const dueAt = untilMs - offsetMinutes * 60 * 1000;
    if (dueAt <= nowMs()) {
      showFlash(`${offsetMinutes}m-before alert has already passed.`);
      return;
    }
    const label = offsetMinutes > 0 ? `Hospital exit - ${offsetMinutes}m warning` : 'Hospital exit now';
    const note = offsetMinutes > 0 ? `Hospital exit at ${new Date(untilMs).toLocaleTimeString()}` : 'Hospital timer reaches 00';
    await addUtilityTimerAt('hospital', label, note, dueAt);
    showFlash(`Hospital alert set for ${new Date(dueAt).toLocaleTimeString()}.`);
  }

  async function deleteUtilityTimer(timerId) {
    state.utility.timers = (state.utility.timers || []).filter((timer) => timer.id !== timerId);
    await saveUtilityState();
    renderPanel();
  }

  async function checkUtilityTimerAlerts() {
    const timers = Array.isArray(state.utility.timers) ? state.utility.timers : [];
    const due = timers.filter((timer) => !timer.alerted && parseNumber(timer.dueAt) <= nowMs());
    if (!due.length) return;
    state.utility.timers = timers.map((timer) => due.some((item) => item.id === timer.id) ? { ...timer, alerted: true } : timer);
    await saveUtilityState();
    for (const timer of due.slice(0, 3)) {
      await sendUtilityAlert({
        title: `${APP.name}: Timer ready`,
        body: `${timer.label}${timer.note ? ` - ${timer.note}` : ''}`,
        tag: `${APP.id}-timer-${timer.id}`,
        sound: true,
        desktop: true
      });
    }
    if (!isPanelInputFocused()) renderPanelKeepingScroll();
  }

  async function updateGymSetting(input) {
    const key = input.dataset.gymSetting;
    state.gym[key] = input.value;
    if (key === 'buildKey' && input.value !== 'custom') {
      if (String(input.value).startsWith('saved:')) {
        const id = String(input.value).slice(6);
        const saved = (state.gym.customBuilds || []).find((build) => build.id === id);
        if (saved) {
          state.gym.target = { ...normalizeGymTarget(saved.target) };
          state.gym.customBuildName = saved.name || state.gym.customBuildName;
        }
      } else if (GYM_BUILDS[input.value]) {
        state.gym.target = { ...GYM_BUILDS[input.value].target };
      }
    }
    await saveGymState();
    await refreshGymAnalysisOnly();
  }

  async function updateGymNumberInput(input, options = {}) {
    if (input.dataset.gymTarget) {
      if (!String(state.gym.buildKey || '').startsWith('saved:')) state.gym.buildKey = 'custom';
      state.gym.target[input.dataset.gymTarget] = parseNumber(input.value);
    }
    if (input.dataset.gymManual) {
      state.gym.manualStats[input.dataset.gymManual] = parseNumber(input.value);
    }
    await saveGymState();
    if (options.render !== false) await refreshGymAnalysisOnly();
  }

  function openItemMarket(itemName) {
    const name = String(itemName || '').trim();
    if (!name) return;
    window.open(itemMarketUrl(name), '_blank', 'noopener,noreferrer');
  }

  async function saveCurrentGymBuild() {
    const nameInput = $(`#${APP.id} [data-gym-setting="customBuildName"]`) || $(`#${APP.id}-modal [data-gym-setting="customBuildName"]`);
    const name = String((nameInput && nameInput.value) || state.gym.customBuildName || 'Custom build').trim();
    const target = normalizeGymTarget(state.gym.target);
    const id = String(state.gym.buildKey || '').startsWith('saved:')
      ? String(state.gym.buildKey).slice(6)
      : `build-${Date.now().toString(36)}`;
    const customBuilds = (state.gym.customBuilds || []).filter((build) => build.id !== id);
    customBuilds.push({ id, name, target });
    state.gym.customBuilds = customBuilds;
    state.gym.customBuildName = name;
    state.gym.buildKey = `saved:${id}`;
    state.gym.target = { ...target };
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash(`Saved gym build: ${name}`);
  }

  async function deleteCurrentGymBuild() {
    if (!String(state.gym.buildKey || '').startsWith('saved:')) return;
    const id = String(state.gym.buildKey).slice(6);
    const build = (state.gym.customBuilds || []).find((item) => item.id === id);
    state.gym.customBuilds = (state.gym.customBuilds || []).filter((item) => item.id !== id);
    state.gym.buildKey = 'balanced';
    state.gym.target = { ...GYM_BUILDS.balanced.target };
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash(`Deleted gym build${build && build.name ? `: ${build.name}` : ''}`);
  }

  async function updateAvailableGym(input) {
    const name = input.dataset.gymAvailable;
    const current = getAvailableGymNames();
    const set = new Set(current.length ? current : GYM_DATABASE.map((gym) => gym.name));
    if (input.checked) set.add(name);
    else set.delete(name);
    state.gym.availableGyms = Array.from(set);
    await saveGymState();
    await refreshGymAnalysisOnly();
  }

  async function setAllGymsAvailable() {
    state.gym.availableGyms = GYM_DATABASE.map((gym) => gym.name);
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash('All gyms marked available.');
  }

  async function clearAvailableGyms() {
    state.gym.availableGyms = [];
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash('Available gym list cleared. Using all gyms as possible.');
  }

  async function updateSetting(input) {
    const key = input.dataset.setting;
    if (key === 'strategyCombo') {
      applyCombo(input.value);
    } else if (key === 'riskLevel') {
      applyCombo(comboFromRisk(input.value).key);
    } else {
      if (input.type === 'checkbox') state.settings[key] = input.checked;
      else if (input.type === 'number' || input.type === 'range') state.settings[key] = parseNumber(input.value);
      else state.settings[key] = input.value;
    }
    if (key === 'stockHighlightOnlyMode' && state.settings.stockHighlightOnlyMode) clearNativeStockFilter({ silent: true });
    await saveSettings();
    await refreshAnalysisOnly();
    if ($(`#${APP.id}-modal .fluz-modal-box.stock-settings`)) openSettingsWindow();
  }

  async function updateNotificationSetting(input) {
    const key = input.dataset.notifySetting;
    if (input.type === 'checkbox') {
      state.settings.notifications[key] = input.checked;
      if (key === 'enabled' && input.checked) await requestNotificationPermissionIfNeeded();
    } else {
      state.settings.notifications[key] = parseNumber(input.value);
    }
    await saveSettings();
    renderPanel();
    if ($(`#${APP.id}-modal .fluz-modal-box.stock-settings`)) openSettingsWindow();
  }

  async function handleSaveApiKey(trigger) {
    const profileModalOpen = !!$(`#${APP.id}-modal .fluz-modal-box.profile-settings`);
    const scope = trigger && trigger.closest
      ? trigger.closest(`#${APP.id}, #${APP.id}-modal`)
      : null;
    const localInput = scope ? $('[data-input="api-key"]', scope) : null;
    const filledInput = $all('[data-input="api-key"]')
      .filter((candidate) => candidate.offsetParent !== null)
      .find((candidate) => String(candidate.value || '').trim());
    const input = localInput || filledInput || $(`#${APP.id}-modal [data-input="api-key"]`) || $(`#${APP.id} [data-input="api-key"]`);
    const key = input ? input.value.trim() : '';
    if (!isApiKeyReasonable(key)) {
      state.error = 'That API key field is empty or contains spaces. Paste the full Torn API key, preferably Limited Access.';
      renderPanel();
      return;
    }
    await saveApiKey(key);
    if (input) input.value = '';
    state.error = '';
    showFlash('API key saved locally.');
    if (state.mode === 'gym') await refreshGymData(true);
    else if (state.mode === 'stocks') await refreshData(true);
    else await refreshUtilityData(true);
    if (profileModalOpen) openProfileWindow();
  }

  async function handleClearApiKey() {
    const profileModalOpen = !!$(`#${APP.id}-modal .fluz-modal-box.profile-settings`);
    await clearApiKey();
    state.data = null;
    state.gymRaw = null;
    state.gymData = null;
    state.analyses = [];
    state.recommendations = [];
    state.error = 'API key cleared.';
    renderPanel();
    if (profileModalOpen) openProfileWindow();
  }

  async function handleResetLocalData() {
    await clearLocalData();
    state.error = '';
    showFlash('Local FLUZ data reset.');
    renderPanel();
  }

  async function handleTestNotification() {
    const stock = state.analyses[0] || {
      id: 'TEST',
      acronym: 'SYS',
      name: 'Test Stock',
      price: 1234567
    };
    const recommendation = createRecommendation({
      action: 'SELL NOW',
      stock,
      priority: 99,
      reason: 'Test notification only. FLUZ never auto-sells or performs account actions.'
    });
    if (state.settings.notifications.enabled) await requestNotificationPermissionIfNeeded();
    const sent = await sendBrowserNotification(recommendation);
    sendInPageNotification(recommendation);
    showFlash(sent ? 'Test notification sent. Also showing an in-page FLUZ alert.' : 'Browser notification was not shown. FLUZ in-page alert is active.');
  }

  // ---------------------------------------------------------------------------
  // Torn page integration
  // ---------------------------------------------------------------------------

  function removeNativeSearch() {
    const existing = $(`#${APP.id}-native-search`);
    if (existing) existing.remove();
  }

  function getKnownStockAcronyms() {
    return state.analyses
      .map((stock) => String(stock.acronym || '').trim().toUpperCase())
      .filter(Boolean);
  }

  function getKnownStockRefs() {
    const refs = new Map();
    state.analyses.forEach((stock) => {
      const acronym = String(stock.acronym || '').trim().toUpperCase();
      if (acronym) refs.set(acronym, { acronym, name: stock.name || '' });
    });
    Object.entries(BENEFIT_DATABASE || {}).forEach(([acronym, benefit]) => {
      const key = String(acronym || '').trim().toUpperCase();
      if (key && !refs.has(key)) refs.set(key, { acronym: key, name: benefit.name || '' });
    });
    return Array.from(refs.values());
  }

  function normalizeStockMatchText(text) {
    return String(text || '')
      .toUpperCase()
      .replace(/&/g, ' AND ')
      .replace(/['’]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }

  function stockRefMatchesText(stock, text) {
    const upper = String(text || '').toUpperCase();
    const acronym = String(stock?.acronym || '').trim().toUpperCase();
    if (acronym && (upper.includes(`(${acronym})`) || new RegExp(`\\b${escapeRegExp(acronym)}\\b`).test(upper))) return true;
    const name = normalizeStockMatchText(stock?.name);
    return name.length > 2 && normalizeStockMatchText(text).includes(name);
  }

  function countKnownStockRefs(text) {
    return getKnownStockRefs().filter((stock) => stockRefMatchesText(stock, text)).length;
  }

  function textHasKnownStockSignal(text) {
    const upper = String(text || '').toUpperCase();
    if (getKnownStockAcronyms().some((acronym) => upper.includes(`(${acronym})`) || new RegExp(`\\b${escapeRegExp(acronym)}\\b`).test(upper))) return true;
    return getKnownStockRefs().some((stock) => stockRefMatchesText(stock, text));
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function findLikelyStockListHost() {
    const candidates = [
      '[class*="stock"]',
      '[class*="Stock"]',
      '[class*="stocks"]',
      '#mainContainer',
      '.content-wrapper'
    ];
    for (const selector of candidates) {
      const node = $(selector);
      if (node && node.textContent && node.textContent.length > 200) return node;
    }
    return document.body;
  }

  function getNativeStockRows() {
    const root = findLikelyStockListHost();
    const seen = new Set();
    const rows = [];
    $all('li, tr, [class*="row"], [class*="Row"], [class*="stock"], [class*="Stock"]', root)
      .filter((row) => row !== state.elements.panel && !row.closest(`#${APP.id}`))
      .filter((row) => row.textContent && row.textContent.trim().length > 3)
      .forEach((node) => {
        if (!textHasKnownStockSignal(node.textContent)) return;
        const target = node.closest('tr, li, [class*="row"], [class*="Row"]') || node;
        const text = target.textContent || '';
        if (!textHasKnownStockSignal(text)) return;
        if (text.length > 1800 || countKnownStockRefs(text) > 4) return;
        if (seen.has(target)) return;
        seen.add(target);
        rows.push(target);
      });
    return rows.length ? rows : [];
  }

  function getTornStockSearchInput() {
    const inputs = $all('input')
      .filter((input) => !input.closest(`#${APP.id}`) && !input.closest(`#${APP.id}-modal`))
      .filter((input) => input.offsetParent !== null)
      .filter((input) => {
        const text = `${input.placeholder || ''} ${input.getAttribute('aria-label') || ''} ${input.value || ''}`.toLowerCase();
        if (/find stock|stock|acronym|name/.test(text) && !/user|wiki|forum|search\.\.\./.test(text)) return true;
        const parentText = input.closest('[class*="stock"], [class*="Stock"], [class*="filter"], [class*="Filter"]')?.textContent || '';
        return /stock|name/i.test(parentText) && input.type !== 'checkbox' && input.type !== 'radio';
      });
    return inputs[0] || null;
  }

  function setInputValue(input, value) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;
    ['input', 'change', 'keyup'].forEach((type) => {
      input.dispatchEvent(new Event(type, { bubbles: true }));
    });
  }

  function applyTornNativeStockSearch(value) {
    const input = getTornStockSearchInput();
    if (!input) return false;
    input.focus();
    setInputValue(input, value);
    return true;
  }

  function removeNativeFilterResetButton() {
    const button = document.getElementById(`${APP.id}-stock-reset`);
    if (button) button.remove();
  }

  function ensureNativeFilterResetButton() {
    removeNativeFilterResetButton();
    const input = getTornStockSearchInput();
    if (!input || !input.parentElement) return;
    const button = document.createElement('button');
    button.id = `${APP.id}-stock-reset`;
    button.className = 'fluz-stock-filter-reset';
    button.type = 'button';
    button.textContent = 'Reset filter';
    button.addEventListener('click', () => clearNativeStockFilter());
    input.insertAdjacentElement('afterend', button);
  }

  function clearNativeStockHighlights() {
    $all('.fluz-highlight-stock').forEach((row) => {
      row.classList.remove('fluz-highlight-stock');
    });
  }

  function nativeStockRowMatches(row, value) {
    const stock = getKnownStockRefs().find((item) => item.acronym === value) || { acronym: value, name: '' };
    return stockRefMatchesText(stock, row.textContent);
  }

  function highlightNativeStockRow(row) {
    if (!row) return false;
    clearNativeStockHighlights();
    row.classList.add('fluz-highlight-stock');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  function clearNativeStockFilter({ silent = false } = {}) {
    applyTornNativeStockSearch('');
    removeNativeFilterResetButton();
    $all('.fluz-native-hidden').forEach((row) => {
      row.classList.remove('fluz-native-hidden');
    });
    $all('[data-fluz-native-filtered="1"]').forEach((row) => {
      row.removeAttribute('data-fluz-native-filtered');
    });
    clearNativeStockHighlights();
    state.nativeFilter = '';
    if (!silent) {
      showFlash('Torn stock filter cleared.');
      renderPanel();
    }
  }

  function filterNativeStockRows(query) {
    const value = String(query || '').trim().toUpperCase();
    clearNativeStockFilter({ silent: true });
    if (!value) return [];

    const usedNativeSearch = applyTornNativeStockSearch(value.toLowerCase());

    const rows = getNativeStockRows();
    const matches = [];
    rows.forEach((row) => {
      const isMatch = nativeStockRowMatches(row, value);
      row.dataset.fluzNativeFiltered = '1';
      if (isMatch) {
        matches.push(row);
        row.classList.remove('fluz-native-hidden');
      }
      else row.classList.add('fluz-native-hidden');
    });
    state.nativeFilter = value;
    if (usedNativeSearch) {
      ensureNativeFilterResetButton();
      setTimeout(() => {
        const refreshedRows = getNativeStockRows();
        const refreshedMatch = refreshedRows.find((row) => nativeStockRowMatches(row, value));
        if (refreshedMatch) highlightNativeStockRow(refreshedMatch);
      }, 120);
    }
    return matches;
  }

  function findStockOnPage(acronym) {
    const value = String(acronym || '').trim().toUpperCase();
    if (!value) return;

    if (state.settings.stockHighlightOnlyMode) {
      clearNativeStockFilter({ silent: true });
      const row = getNativeStockRows().find((candidate) => nativeStockRowMatches(candidate, value));
      if (highlightNativeStockRow(row)) {
        showFlash(`Highlighted ${value}.`);
        renderPanel();
      } else {
        renderPanel();
        showFlash(`Could not find ${value} in Torn's current page HTML.`);
      }
      return;
    }

    const matches = filterNativeStockRows(value);
    const row = matches[0] || getNativeStockRows().find((candidate) => nativeStockRowMatches(candidate, value));
    if (highlightNativeStockRow(row)) {
      showFlash(`Filtered Torn list to ${value}.`);
      renderPanel();
    } else {
      clearNativeStockFilter({ silent: true });
      renderPanel();
      showFlash(`Could not find ${value} in Torn's current page HTML.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Calculator helper
  // ---------------------------------------------------------------------------

  function openCalculator(stockId) {
    const stock = state.analyses.find((item) => String(item.id) === String(stockId));
    if (!stock) return;
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.dataset.stockId = stock.id;
    overlay.innerHTML = `
      <div class="fluz-modal-box">
        <div class="fluz-section-title">
          <span>${escapeHtml(stock.acronym)} calculator</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <p class="fluz-muted">${escapeHtml(stock.name)} - ${formatFullMoney(stock.price)} per share</p>
        <div class="fluz-form-grid">
          <label>Money amount
            <input type="text" data-calc-input="money" placeholder="1000000">
          </label>
          <label>Shares
            <input type="text" data-calc-input="shares" placeholder="1000">
          </label>
        </div>
        <div class="fluz-card" data-calc-output>
          Enter money or shares to calculate.
        </div>
        <div class="fluz-muted">
          ${escapeHtml(calculatorBenefitHint(stock))}
        </div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function closeModal() {
    const existing = $(`#${APP.id}-modal`);
    if (existing) existing.remove();
  }

  function updateCalculator(source) {
    const modal = $(`#${APP.id}-modal`);
    if (!modal) return;
    const stock = state.analyses.find((item) => String(item.id) === String(modal.dataset.stockId));
    if (!stock) return;

    const moneyInput = $('[data-calc-input="money"]', modal);
    const sharesInput = $('[data-calc-input="shares"]', modal);
    const output = $('[data-calc-output]', modal);
    const price = stock.price || 0;

    if (source === 'money') {
      const money = parseNumber(moneyInput.value);
      const shares = price > 0 ? Math.floor(money / price) : 0;
      sharesInput.value = shares ? shares.toLocaleString() : '';
    } else {
      const shares = parseNumber(sharesInput.value);
      const cost = shares * price;
      moneyInput.value = cost ? Math.round(cost).toLocaleString() : '';
    }

    const shares = parseNumber(sharesInput.value);
    const value = shares * price;
    const missing = stock.benefit && stock.benefit.requirement
      ? Math.max(0, stock.benefit.requirement - ((stock.position ? stock.position.totalShares : 0) + shares))
      : 0;
    output.innerHTML = `
      <div>Shares: <strong>${compactNumber(shares)}</strong></div>
      <div>Approx value/cost: <strong>${formatFullMoney(value)}</strong></div>
      ${stock.benefit && stock.benefit.requirement ? `<div>Missing after this: <strong>${compactNumber(missing)}</strong> shares for next block</div>` : ''}
    `;
  }

  function calculatorBenefitHint(stock) {
    if (!stock.benefit || !stock.benefit.requirement) return 'No benefit block requirement is available for this stock.';
    const owned = stock.position ? stock.position.totalShares : 0;
    const missing = Math.max(0, stock.benefit.requirement - owned);
    return `Benefit requirement: ${compactNumber(stock.benefit.requirement)} shares. You own ${compactNumber(owned)}. Missing ${compactNumber(missing)} shares, about ${formatMoney(missing * stock.price)}.`;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  const state = {
    mode: '',
    apiKey: '',
    settings: mergeSettings(DEFAULT_SETTINGS, {}),
    panel: { ...DEFAULT_PANEL_STATE },
    gym: mergeGymState({}),
    utility: mergeUtilityState({}),
    gymRaw: null,
    gymData: null,
    utilityData: { user: {}, items: {}, warnings: [] },
    loading: false,
    error: '',
    raw: null,
    tornsy: {},
    priceMemory: {},
    data: null,
    analyses: [],
    recommendations: [],
    cacheInfo: {},
    notificationHistory: {},
    inPageAlerts: [],
    drag: null,
    resize: null,
    nativeFilter: '',
    tornApiBackoffUntil: 0,
    lastNativeFillInput: null,
    locationWatchStarted: false,
    utilityDomWatchStarted: false,
    itemMarketBazaarDomWatchStarted: false,
    extensionMessageBound: false,
    itemMarketBazaarTimer: null,
    crimesDataWatchStarted: false,
    bootleggingDomWatchStarted: false,
    crimeProfitDomWatchStarted: false,
    pickpocketDomWatchStarted: false,
    pickpocketScheduleTimer: null,
    crimeProfitLoading: false,
    utilityScanSignature: '',
    bootleggingData: null,
    crimeMorale: null,
    crimeMoraleLoading: false,
    crimeMoraleStatus: '',
    crimeMoraleRequestKey: '',
    crimeMoraleRequestAt: 0,
    pickpocketStats: { colored: 0, visible: 0, hidden: 0, skillLevel: 1, updatedAt: 0 },
    itemMarketBazaarLoading: false,
    itemMarketBazaarData: { itemId: '', listings: [], fetchedAt: 0, warning: '' },
    itemMarketBazaarTitle: '',
    itemMarketBazaarTitleItemId: '',
    marketBazaarAllLoading: false,
    marketBazaarAllRows: [],
    marketBazaarAllScan: { index: 0, total: 0 },
    marketBazaarAllAutoTimer: null,
    marketBazaarAllAutoKickAt: 0,
    marketBazaarAllLastRenderAt: 0,
    marketBazaarAllLastCacheWriteAt: 0,
    marketBazaarSourceCooldownUntil: 0,
    marketBazaarSourceErrorStreak: 0,
    marketNativeRows: [],
    marketNativeRowsUpdatedAt: 0,
    marketFilledPriceButtons: {},
    travelYataLoading: false,
    travelYataData: { stocks: [], fetchedAt: 0, warning: '' },
    crimeProfitData: { rows: [], crackingRows: [], fetchedAt: 0, warning: '' },
    crimeProfitVisible: { count: 0, bestLabel: '', bestValue: null },
    crackingDomWatchStarted: false,
    crackingScanTimer: null,
    crackingLoading: false,
    crackingStatus: '',
    crackingStats: {},
    targetTimerWatchStarted: false,
    targetStatusLoading: false,
    targetStatusLastRefresh: 0,
    casinoGameWatchTimer: null,
    chainWatchStarted: false,
    chainWatchTimer: null,
    chainStatus: null,
    chainAlertState: { count: 0, message: false, target: false, warning: false },
    chainFriendlyNameLoading: false,
    chainLastCount: 0,
    ffscouterLoading: false,
    ffscouterStatus: '',
    elements: {
      panel: null
    }
  };
