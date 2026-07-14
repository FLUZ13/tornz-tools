  function renderItemMarketBrowseTools() {
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Item Market browser</div>
        <p class="fluz-muted">The price calculator is hidden here because this is the buying/browsing market. Open Add Listing when you want listing-price tools.</p>
        <div class="fluz-route-grid">
          <a class="fluz-button primary" href="https://www.torn.com/page.php?sid=ItemMarket#/addListing" target="_blank" rel="noopener noreferrer">Open Add Listing</a>
          <a class="fluz-button" href="https://www.torn.com/bazaar.php#/add" target="_blank" rel="noopener noreferrer">Open Bazaar Add</a>
        </div>
      </div>
      ${renderItemMarketBazaarPanel()}
    `;
  }

  function renderItemMarketHighlightControls() {
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Item Market highlights</span><span class="fluz-muted">visual only</span></div>
        <div class="fluz-highlight-control-grid">
          <button class="fluz-button primary" data-action="apply-market-highlights">Apply highlights</button>
          <label>Threshold % vs RRP
            <input class="fluz-percent-input" type="number" min="-100" max="100" step="0.1" data-utility-setting="marketHighlightThresholdPct" value="${escapeHtml(state.utility.marketHighlightThresholdPct ?? -0.5)}" placeholder="-3">
          </label>
          <label>Quick slider
            <input class="fluz-threshold-slider" type="range" min="-10" max="10" step="0.1" data-utility-setting="marketHighlightThresholdPct" value="${escapeHtml(clamp(parseNumber(state.utility.marketHighlightThresholdPct ?? -0.5), -10, 10))}">
            <span class="fluz-slider-scale"><span>cheap -10%</span><span>RRP</span><span>high +10%</span></span>
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="marketHighlightEnabled" ${state.utility.marketHighlightEnabled ? 'checked' : ''}> Enable highlights</label>
        </div>
        <p class="fluz-muted">Green means visible item price is at or below RRP plus your threshold. Example: -0.5 highlights at least 0.5% under RRP; 2 highlights up to 2% above RRP.</p>
      </div>
    `;
  }

  function marketManualHiddenItemSet() {
    return new Set((state.utility.marketHiddenItemIds || []).map((id) => String(id)));
  }

  function marketValueHiddenItemSet() {
    return new Set((state.utility.marketValueHiddenItemIds || []).map((id) => String(id)));
  }

  function marketHiddenItemSet() {
    return new Set([
      ...(state.utility.marketHiddenItemIds || []).map((id) => String(id)),
      ...(state.utility.marketValueHiddenItemIds || []).map((id) => String(id))
    ]);
  }

  function isCurrentItemMarketItem(itemId) {
    const currentId = String(currentItemMarketItemId() || '').trim();
    return !!(currentId && String(itemId || '').trim() === currentId);
  }

  function isMarketItemHiddenForScanning(itemId) {
    const id = String(itemId || '').trim();
    return !!(id && marketHiddenItemSet().has(id) && !isCurrentItemMarketItem(id));
  }

  function filterAllMarketItems(records = getKnownItemRecords()) {
    const query = String(state.utility.marketAllSearch || '').trim().toLowerCase();
    const minValue = Math.max(0, parseNumber(state.utility.marketAllMinValue || 0));
    return records.filter((item) => {
      if (isMarketItemHiddenForScanning(item.id)) return false;
      if (minValue && item.value < minValue) return false;
      if (query && !`${item.name} ${item.id} ${item.category || ''}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  function getAllMarketScanItems() {
    return sortedAllMarketItems(getKnownItemRecords().filter((item) => parseNumber(item.value) > 0 && !isMarketItemHiddenForScanning(item.id)));
  }

  function sortedAllMarketItems(records) {
    const key = String(state.utility.marketAllSortKey || 'name');
    const dir = state.utility.marketAllSortDir === 'desc' ? -1 : 1;
    const hidden = key === 'hidden' ? marketHiddenItemSet() : null;
    return records.slice().sort((a, b) => {
      let left = String(a.name || '').toLowerCase();
      let right = String(b.name || '').toLowerCase();
      if (key === 'category') {
        left = String(a.category || 'Other').toLowerCase();
        right = String(b.category || 'Other').toLowerCase();
      } else if (key === 'value') {
        left = parseNumber(a.value);
        right = parseNumber(b.value);
      } else if (key === 'id') {
        left = parseNumber(a.id);
        right = parseNumber(b.id);
      } else if (key === 'hidden') {
        left = hidden.has(String(a.id)) ? 1 : 0;
        right = hidden.has(String(b.id)) ? 1 : 0;
      }
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * dir || String(a.name).localeCompare(String(b.name));
      return String(left).localeCompare(String(right)) * dir;
    });
  }

  function getMarketDatabasePage(records) {
    const total = Array.isArray(records) ? records.length : 0;
    const pageSize = MARKET_DATABASE_PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const rawPage = Math.floor(parseNumber(state.utility.marketSettingsPage || 1)) || 1;
    const page = clamp(rawPage, 1, pageCount);
    const start = (page - 1) * pageSize;
    const end = Math.min(total, start + pageSize);
    if (state.utility.marketSettingsPage !== page) state.utility.marketSettingsPage = page;
    return {
      page,
      pageCount,
      pageSize,
      total,
      start,
      end,
      rows: records.slice(start, end)
    };
  }

  function renderMarketDatabasePager(info) {
    if (!info || info.total <= info.pageSize) {
      return `<div class="fluz-market-db-pager"><span class="fluz-muted">${escapeHtml(String(info ? info.total : 0))} items</span></div>`;
    }
    return `
      <div class="fluz-market-db-pager">
        <span class="fluz-muted">${escapeHtml(String(info.start + 1))}-${escapeHtml(String(info.end))} of ${escapeHtml(String(info.total))}</span>
        <button class="fluz-button" data-action="market-database-page" data-page="${escapeHtml(String(info.page - 1))}" ${info.page <= 1 ? 'disabled' : ''}>Prev</button>
        <span class="fluz-muted">Page ${escapeHtml(String(info.page))} / ${escapeHtml(String(info.pageCount))}</span>
        <button class="fluz-button" data-action="market-database-page" data-page="${escapeHtml(String(info.page + 1))}" ${info.page >= info.pageCount ? 'disabled' : ''}>Next</button>
      </div>
    `;
  }

  function getMarketCategoryRows() {
    const hidden = marketHiddenItemSet();
    const map = new Map();
    getKnownItemRecords().forEach((item) => {
      const category = item.category || 'Other';
      if (!map.has(category)) map.set(category, { category, total: 0, hidden: 0 });
      const row = map.get(category);
      row.total += 1;
      if (hidden.has(String(item.id))) row.hidden += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category));
  }

  function renderMarketCategoryFilter() {
    const rows = getMarketCategoryRows();
    if (!rows.length) return '';
    const active = rows.filter((row) => row.hidden < row.total).length;
    return `
      <details class="fluz-market-category-filter" open>
        <summary>Category scan filters <span class="fluz-muted">${escapeHtml(String(active))}/${escapeHtml(String(rows.length))} active</span></summary>
        <div class="fluz-market-category-list">
          ${rows.map((row) => {
            const included = Math.max(0, row.total - row.hidden);
            const checked = included > 0;
            const note = included === row.total ? `${row.total} on` : `${included}/${row.total} on`;
            return `
              <label title="${escapeHtml(row.category)} - ${escapeHtml(note)}">
                <input type="checkbox" data-market-category-scan="${escapeHtml(row.category)}" ${checked ? 'checked' : ''}>
                <span>${escapeHtml(row.category)}</span>
                <em class="fluz-muted">${escapeHtml(note)}</em>
              </label>
            `;
          }).join('')}
        </div>
      </details>
    `;
  }

  function renderMarketValueLimitControl() {
    const valueHidden = marketValueHiddenItemSet();
    const minLimit = Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMin || 0)));
    const maxLimit = Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMax || 0)));
    const limitParts = [
      minLimit ? `under ${formatMoney(minLimit)}` : '',
      maxLimit ? `over ${formatMoney(maxLimit)}` : ''
    ].filter(Boolean);
    return `
      <div class="fluz-form-grid" style="margin-top:7px;">
        <label>Hide item value below
          <input type="number" min="0" step="1" data-utility-setting="marketValueLimitMin" value="${escapeHtml(minLimit)}" placeholder="0">
        </label>
        <label>Hide item value above
          <input type="number" min="0" step="1" data-utility-setting="marketValueLimitMax" value="${escapeHtml(maxLimit)}" placeholder="100000">
        </label>
        <label>Value filter
          <button class="fluz-button primary" type="button" data-action="apply-market-value-limit">Apply</button>
        </label>
      </div>
      <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:6px;">
        <button class="fluz-button" type="button" data-action="clear-market-value-limit" ${minLimit || maxLimit || valueHidden.size ? '' : 'disabled'}>Clear value limit</button>
        <span class="fluz-muted">${escapeHtml(String(valueHidden.size))} hidden by value limit${limitParts.length ? ` ${escapeHtml(limitParts.join(' / '))}` : ''}</span>
      </div>
    `;
  }

  function marketValueHiddenIdsForLimits(minValue, maxValue) {
    const minLimit = Math.max(0, Math.floor(parseNumber(minValue || 0)));
    const maxLimit = Math.max(0, Math.floor(parseNumber(maxValue || 0)));
    if (!minLimit && !maxLimit) return [];
    return getKnownItemRecords()
      .filter((item) => {
        const value = parseNumber(item.value);
        if (minLimit > 0 && value < minLimit) return true;
        if (maxLimit > 0 && value > maxLimit) return true;
        return false;
      })
      .map((item) => String(item.id))
      .sort((a, b) => parseNumber(a) - parseNumber(b));
  }

  function recomputeMarketValueHiddenItems() {
    state.utility.marketValueHiddenItemIds = marketValueHiddenIdsForLimits(state.utility.marketValueLimitMin, state.utility.marketValueLimitMax);
  }

  function normalizeMarketFilterPresets(presets) {
    if (!Array.isArray(presets)) return [];
    return presets.map((preset) => ({
      id: String(preset && preset.id ? preset.id : `market-preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`),
      name: String(preset && preset.name ? preset.name : 'Market preset').trim() || 'Market preset',
      marketHiddenItemIds: Array.isArray(preset && preset.marketHiddenItemIds) ? preset.marketHiddenItemIds.map((id) => String(id).replace(/\D/g, '')).filter(Boolean) : [],
      marketValueLimitMin: Math.max(0, Math.floor(parseNumber(preset && preset.marketValueLimitMin))),
      marketValueLimitMax: Math.max(0, Math.floor(parseNumber(preset && preset.marketValueLimitMax))),
      marketValueHiddenItemIds: [],
      createdAt: parseNumber(preset && preset.createdAt) || nowMs(),
      updatedAt: parseNumber(preset && preset.updatedAt) || nowMs()
    })).filter((preset) => preset.id && preset.name).slice(0, 24);
  }

  function renderMarketFilterPresetControl() {
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const selected = presets.find((preset) => preset.id === state.utility.marketFilterPresetId);
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Filter presets</span><span class="fluz-muted">${presets.length} saved</span></div>
        <div class="fluz-form-grid">
          <label>Preset name
            <input type="text" data-utility-setting="marketFilterPresetName" value="${escapeHtml(state.utility.marketFilterPresetName || (selected && selected.name) || '')}" placeholder="Cheap scan, meds only...">
          </label>
          <label>Saved preset
            <select data-utility-setting="marketFilterPresetId">
              <option value="">Choose preset...</option>
              ${presets.map((preset) => `<option value="${escapeHtml(preset.id)}" ${state.utility.marketFilterPresetId === preset.id ? 'selected' : ''}>${escapeHtml(preset.name)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" type="button" data-action="save-market-filter-preset">Save current</button>
          <button class="fluz-button" type="button" data-action="load-market-filter-preset" ${presets.length ? '' : 'disabled'}>Load</button>
          <button class="fluz-button danger" type="button" data-action="delete-market-filter-preset" ${presets.length ? '' : 'disabled'}>Delete</button>
        </div>
      </div>
    `;
  }

  function marketResaleNumbers(row) {
    const marketValue = Math.max(0, parseNumber(row && row.marketValue));
    const price = Math.max(0, parseNumber(row && row.price));
    const quantity = Math.max(1, Math.floor(parseNumber(row && row.quantity) || 1));
    const profitEach = marketValue - price;
    const totalProfit = profitEach * quantity;
    const profitPct = price > 0 ? (profitEach / price) * 100 : 0;
    return { marketValue, netMarket: marketValue, price, quantity, profitEach, totalProfit, profitPct };
  }

  function getMarketBazaarMaxAgeMinutes() {
    const value = state.utility.marketBazaarMaxAgeMinutes;
    if (value == null || value === '') return 0;
    return Math.max(0, parseNumber(value));
  }

  function renderAllMarketListings() {
    const minEach = parseNumber(state.utility.marketAllMinProfitEach || 0);
    const minTotal = parseNumber(state.utility.marketAllMinTotalProfit || 0);
    const minDiffPct = parseNumber(state.utility.marketBazaarMinDiffPct || 0);
    const maxSeenMinutes = Math.max(0, parseNumber(state.utility.marketNativeMaxSeenMinutes || 0));
    refreshVisibleTornMarketRows();
    const rows = sortedAllMarketListingRows(state.marketNativeRows || [])
      .filter((row) => {
        const profit = marketResaleNumbers(row);
        if (maxSeenMinutes > 0 && parseNumber(row.seenAt) && nowMs() - parseNumber(row.seenAt) > maxSeenMinutes * 60 * 1000) return false;
        if (minDiffPct && profit.profitPct < minDiffPct) return false;
        return profit.profitEach >= minEach && profit.totalProfit >= minTotal;
      });
    const age = state.marketNativeRowsUpdatedAt ? `${Math.max(0, Math.round((nowMs() - state.marketNativeRowsUpdatedAt) / 1000))}s old` : 'not scanned';
    return `
      <div class="fluz-section-title"><span>Market listings</span><span class="fluz-muted">${rows.length} visible Torn rows - ${escapeHtml(age)}</span></div>
      <div class="fluz-card">
        <div class="fluz-bazaar-filter-grid">
          <label>Search item/seller
            <input type="text" data-utility-setting="marketAllSearch" value="${escapeHtml(state.utility.marketAllSearch || '')}" placeholder="Item or seller">
          </label>
          <label>Min qty
            <input type="number" min="1" data-utility-setting="marketBazaarMinQty" value="${escapeHtml(state.utility.marketBazaarMinQty || 1)}">
          </label>
          <label>Min % diff
            <input type="number" step="0.1" data-utility-setting="marketBazaarMinDiffPct" value="${escapeHtml(state.utility.marketBazaarMinDiffPct || 0)}" placeholder="0">
          </label>
          <label>Hide seen older than
            <input type="number" min="0" data-utility-setting="marketNativeMaxSeenMinutes" value="${escapeHtml(maxSeenMinutes)}" placeholder="0 = keep">
          </label>
          <label>Scan
            <button class="fluz-button primary" data-action="refresh-market-native-listings">Scan visible</button>
          </label>
        </div>
        <p class="fluz-muted">Reads Torn's currently visible Item Market listings and compares price to the Torn item database RRP/value. No TornW3B data is used in this tab.</p>
      </div>
      <div class="fluz-table">
        <div class="fluz-market-bazaar-row is-wide is-head">
          ${renderMarketNativeSortHeader('item', 'Item')}
          ${renderMarketNativeSortHeader('price', 'Price')}
          <span>RRP</span>
          ${renderMarketNativeSortHeader('deal', 'Diff %')}
          ${renderMarketNativeSortHeader('profit', 'Profit')}
          ${renderMarketNativeSortHeader('quantity', 'Qty')}
          <span>Seen</span>
          <span>Open</span>
        </div>
        ${rows.slice(0, 100).map((row) => {
          const profit = marketResaleNumbers(row);
          return `
            <div class="fluz-market-bazaar-row is-wide">
              <b title="${escapeHtml(row.itemName)}">${escapeHtml(row.itemName)}</b>
              <span>${formatFullMoney(row.price)}</span>
              <span>${formatFullMoney(profit.marketValue)}</span>
              <span class="${profit.profitPct >= 0 ? 'fluz-pos' : 'fluz-neg'}">${escapeHtml(formatPct(profit.profitPct))}</span>
              <span><strong class="${profit.profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.profitEach)}</strong><em class="${profit.totalProfit >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.totalProfit)} total</em></span>
              <span>x${escapeHtml(String(row.quantity || 0))}</span>
              <span>${escapeHtml(row.updated || 'visible')}</span>
              <a class="fluz-button primary" href="${escapeHtml(row.url || itemMarketUrl(row.itemName))}" target="_blank" rel="noopener noreferrer">Market</a>
            </div>
          `;
        }).join('') || '<div class="fluz-card">No visible Torn market rows matched. Open an item/category or press Scan visible Torn listings.</div>'}
      </div>
    `;
  }

  function renderAllMarketSortButton(key, label) {
    const active = state.utility.marketAllSortKey === key;
    const suffix = active ? (state.utility.marketAllSortDir === 'asc' ? ' up' : ' down') : '';
    return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-all-market" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderMarketDatabaseSortHeader(key, label) {
    const active = state.utility.marketAllSortKey === key;
    const suffix = active ? ` ${state.utility.marketAllSortDir === 'asc' ? 'up' : 'down'}` : '';
    return `<button class="fluz-table-sort ${active ? 'is-active' : ''}" data-action="sort-all-market" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderAllMarketListingSortButton(key, label) {
    const active = state.utility.marketNativeSortKey === key;
    const suffix = active ? (state.utility.marketNativeSortDir === 'asc' ? ' up' : ' down') : '';
    return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-market-native-listings" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderMarketNativeSortHeader(key, label) {
    const active = state.utility.marketNativeSortKey === key;
    const suffix = active ? ` ${state.utility.marketNativeSortDir === 'asc' ? 'up' : 'down'}` : '';
    return `<button class="fluz-table-sort ${active ? 'is-active' : ''}" data-action="sort-market-native-listings" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderBazaarSortHeader(key, label) {
    const active = state.utility.marketBazaarAllSortKey === key;
    const suffix = active ? ` ${state.utility.marketBazaarAllSortDir === 'asc' ? 'up' : 'down'}` : '';
    return `<button class="fluz-table-sort ${active ? 'is-active' : ''}" data-action="sort-all-bazaar" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function refreshVisibleTornMarketRows(force = false) {
    if (!force && state.marketNativeRowsUpdatedAt && nowMs() - state.marketNativeRowsUpdatedAt < 1200) return state.marketNativeRows || [];
    const rows = scanVisibleTornMarketListingRows();
    if (rows.length) {
      const current = new Map((state.marketNativeRows || []).map((row) => [`${row.itemId || row.itemName}|${row.price}|${row.playerName || ''}`, row]));
      rows.forEach((row) => {
        const key = `${row.itemId || row.itemName}|${row.price}|${row.playerName || ''}`;
        const existing = current.get(key) || {};
        current.set(key, { ...existing, ...row, seenAt: nowMs() });
      });
      state.marketNativeRows = Array.from(current.values()).slice(-220);
    }
    state.marketNativeRowsUpdatedAt = nowMs();
    return state.marketNativeRows || [];
  }

  function scanVisibleTornMarketListingRows(options = {}) {
    if (!document.body) return [];
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    const currentId = currentItemMarketItemId();
    const currentTitle = currentItemMarketItemTitle(currentId);
    const currentItem = known.find((item) => String(item.id) === String(currentId))
      || known.find((item) => item.name && item.name.toLowerCase() === String(currentTitle || '').toLowerCase());
    const nodes = Array.from(new Set([
      ...$all(tornUlCssModuleSelector('sellerList')).flatMap((list) => Array.from(list.children || [])),
      ...$all(tornCssModuleSelector('sellerListWrapper')).flatMap((wrap) => Array.from(wrap.querySelectorAll('li, [class*="seller"], [class*="row"]'))),
      ...Array.from(document.querySelectorAll('li, [class*="seller"], [class*="row"]'))
    ]));
    const seen = new Set();
    const minQty = Math.max(1, parseNumber(options.minQty == null ? state.utility.marketBazaarMinQty || 1 : options.minQty));
    return nodes.map((node) => {
      if (!node || !node.isConnected || node.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`)) return null;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.height > 120) return null;
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (!/\$[\d,.]+[kmbt]?/i.test(text) || !/\b(available|qty|buy|price|\$\d)/i.test(text)) return null;
      const item = findKnownItemInText(text, known) || currentItem;
      if (!item || isMarketItemHiddenForScanning(item.id)) return null;
      const price = extractFirstMoneyFromText(text);
      if (price <= 0 || price > item.value * 25) return null;
      const quantity = extractListingQuantity(text);
      if (quantity < minQty) return null;
      const playerName = extractListingSellerName(text, item.name);
      const key = `${item.id}|${price}|${quantity}|${playerName}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const row = {
        itemId: String(item.id),
        itemName: item.name,
        marketValue: item.value,
        price,
        quantity,
        playerName,
        updated: 'visible',
        url: itemMarketUrl(item.name),
        source: 'Torn',
        seenAt: nowMs()
      };
      if (options.includeNode) row.node = node;
      return row;
    }).filter(Boolean);
  }

  function extractListingQuantity(text) {
    const clean = cleanBookieText(text);
    const patterns = [
      /([\d,]+)\s*available/i,
      /qty\s*:?\s*([\d,]+)/i,
      /quantity\s*:?\s*([\d,]+)/i,
      /x\s*([\d,]+)/i
    ];
    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match) return Math.max(1, Math.floor(parseNumber(match[1])));
    }
    return 1;
  }

  function extractListingSellerName(text, itemName) {
    const lines = String(text || '').split(/\n| {2,}/).map((line) => line.trim()).filter(Boolean);
    const itemLower = String(itemName || '').toLowerCase();
    const line = lines.find((entry) => {
      const lower = entry.toLowerCase();
      return entry.length <= 40 && !lower.includes(itemLower) && !/\$|available|qty|quantity|buy|price|fill max/i.test(entry);
    });
    return line || 'Torn listing';
  }

  function sortedAllMarketListingRows(rows) {
    const query = String(state.utility.marketAllSearch || '').trim().toLowerCase();
    const key = state.utility.marketNativeSortKey || 'profit';
    const dir = state.utility.marketNativeSortDir === 'asc' ? 1 : -1;
    return (rows || [])
      .filter((row) => !isMarketItemHiddenForScanning(row.itemId))
      .filter((row) => !query || `${row.itemName} ${row.playerName} ${row.itemId}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (key === 'item') return String(a.itemName || '').localeCompare(String(b.itemName || '')) * (state.utility.marketNativeSortDir === 'desc' ? -1 : 1);
        let left = 0;
        let right = 0;
        if (key === 'quantity') {
          left = parseNumber(a.quantity);
          right = parseNumber(b.quantity);
        } else if (key === 'price') {
          left = parseNumber(a.price);
          right = parseNumber(b.price);
        } else if (key === 'totalProfit') {
          left = marketResaleNumbers(a).totalProfit;
          right = marketResaleNumbers(b).totalProfit;
        } else if (key === 'deal') {
          left = marketResaleNumbers(a).profitPct;
          right = marketResaleNumbers(b).profitPct;
        } else {
          left = marketResaleNumbers(a).profitEach;
          right = marketResaleNumbers(b).profitEach;
        }
        if (left === right) return parseNumber(a.price) - parseNumber(b.price);
        return (left - right) * dir;
      });
  }

  function renderAllBazaarListings() {
    const rows = sortedAllBazaarRows(state.marketBazaarAllRows || []);
    const scan = state.marketBazaarAllScan || { index: 0, total: getAllMarketScanItems().length };
    const paused = !!state.utility.marketBazaarScanPaused;
    const progressText = bazaarScanProgressText(rows, scan);
    return `
      <div class="fluz-section-title"><span>Bazaar listings</span><span class="fluz-muted" data-bazaar-scan-progress>${escapeHtml(progressText)}</span></div>
      <div class="fluz-card">
        <div class="fluz-bazaar-filter-grid">
          <label>Search item/seller
            <input type="text" data-utility-setting="marketAllSearch" value="${escapeHtml(state.utility.marketAllSearch || '')}" placeholder="Item or seller">
          </label>
          <label>Min qty
            <input type="number" min="1" data-utility-setting="marketBazaarMinQty" value="${escapeHtml(state.utility.marketBazaarMinQty || 1)}">
          </label>
          <label>Min % diff
            <input type="number" step="0.1" data-utility-setting="marketBazaarMinDiffPct" value="${escapeHtml(state.utility.marketBazaarMinDiffPct || 0)}" placeholder="0">
          </label>
          <label>Hide seen older than
            <input type="number" min="0" data-utility-setting="marketBazaarMaxAgeMinutes" value="${escapeHtml(getMarketBazaarMaxAgeMinutes())}" placeholder="0 = any">
          </label>
          <label>Batch size
            <input type="number" min="1" max="60" data-utility-setting="marketBazaarAllBatchSize" value="${escapeHtml(state.utility.marketBazaarAllBatchSize || 20)}">
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" data-action="scan-all-bazaar-batch" ${paused ? 'disabled' : ''}>Scan next batch</button>
          <button class="fluz-button" data-action="reset-all-bazaar-scan">Reset scan</button>
          <button class="fluz-button ${paused ? 'primary' : ''}" data-action="toggle-all-bazaar-scan-pause">${paused ? 'Resume scans' : 'Pause scans'}</button>
          <label class="fluz-muted" style="display:flex;align-items:center;gap:5px;"><input type="checkbox" data-utility-setting="marketBazaarAutoScan" ${state.utility.marketBazaarAutoScan ? 'checked' : ''}> Auto scan</label>
          <label class="fluz-muted" style="display:flex;align-items:center;gap:5px;"><input type="checkbox" data-utility-setting="marketBazaarMarkSellerVisited" ${state.utility.marketBazaarMarkSellerVisited !== false ? 'checked' : ''}> Mark seller</label>
        </div>
        <p class="fluz-muted">Manual batch scanner via public bazaar source + FLUZ UI. It scans known items steadily and keeps the best matching bazaar listing per item.</p>
      </div>
      <div class="fluz-table">
        <div class="fluz-market-bazaar-row is-wide is-head">
          ${renderBazaarSortHeader('item', 'Item')}
          ${renderBazaarSortHeader('price', 'Price')}
          ${renderBazaarSortHeader('deal', 'Diff %')}
          ${renderBazaarSortHeader('profit', 'Profit')}
          ${renderBazaarSortHeader('totalProfit', 'Total')}
          ${renderBazaarSortHeader('quantity', 'Qty')}
          ${renderBazaarSortHeader('updated', 'Seen')}
          <span>Open</span>
        </div>
        ${rows.slice(0, 100).map((row) => {
          const profit = marketResaleNumbers(row);
          return `
            <div class="fluz-market-bazaar-row is-wide">
              <b title="${escapeHtml(row.itemName)}">${escapeHtml(row.itemName)}</b>
              <span>${formatFullMoney(row.price)}</span>
              <span class="${row.dealPct >= 0 ? 'fluz-pos' : 'fluz-neg'}">${escapeHtml(formatPct(row.dealPct || 0))}</span>
              <span class="${profit.profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.profitEach)}</span>
              <span class="${profit.totalProfit >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.totalProfit)}</span>
              <span>x${escapeHtml(String(row.quantity || 0))}</span>
              <span>${escapeHtml(formatBazaarUpdated(row.updated))}</span>
              ${bazaarLinkButton(row)}
            </div>
          `;
        }).join('') || '<div class="fluz-card">No all-item bazaar rows yet. Leave Auto scan on, or press Scan next batch.</div>'}
      </div>
    `;
  }

  function renderAllBazaarSortButton(key, label) {
    const active = state.utility.marketBazaarAllSortKey === key;
    const suffix = active ? (state.utility.marketBazaarAllSortDir === 'asc' ? ' up' : ' down') : '';
    return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-all-bazaar" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderItemMarketBazaarPanel() {
    if (!isItemMarketBrowseItemPage()) return '';
    return renderItemMarketBazaarHtml({ native: false });
  }

  function renderItemMarketBazaarHtml(options = {}) {
    const native = !!options.native;
    const itemId = currentItemMarketItemId() || (state.itemMarketBazaarData && state.itemMarketBazaarData.itemId) || '';
    const data = state.itemMarketBazaarData && state.itemMarketBazaarData.itemId === itemId
      ? state.itemMarketBazaarData
      : { itemId, listings: [], fetchedAt: 0, warning: '' };
    const minQty = Math.max(1, parseNumber(state.utility.marketBazaarMinQty || 1));
    const maxAge = getMarketBazaarMaxAgeMinutes();
    const rows = sortedItemMarketBazaarListings(filterItemMarketBazaarRows(data.listings || [], { minQty, maxAge }));
    const age = data.fetchedAt ? `${Math.max(0, Math.round((nowMs() - data.fetchedAt) / 1000))}s old` : 'not loaded';
    const title = currentItemMarketItemTitle(itemId);
    const source = 'Public bazaar source';
    const shellClass = native ? 'fluz-market-bazaar-native' : 'fluz-card compact';
    const warningClass = data.warning && /source|cache|resting|temporarily/i.test(data.warning) ? 'fluz-muted' : 'fluz-error';
    const sortButton = (key, label) => {
      const active = state.utility.marketBazaarSortKey === key;
      const suffix = active ? (state.utility.marketBazaarSortDir === 'asc' ? ' up' : ' down') : '';
      return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-market-bazaar" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
    };
    if (native) {
      const maxRows = 100;
      const compactRows = rows.slice(0, maxRows).map((row) => `
        <div class="fluz-market-bazaar-compact-row">
          <a class="fluz-market-bazaar-seller ${isBazaarRowVisited(row) ? 'fluz-bazaar-visited' : ''}" href="${escapeHtml(itemMarketBazaarUrl(row))}" target="_blank" rel="noopener noreferrer" data-action="open-bazaar-link" data-bazaar-url="${escapeHtml(itemMarketBazaarUrl(row))}" data-bazaar-visit-key="${escapeHtml(bazaarVisitKey(row))}" data-bazaar-seller-key="${escapeHtml(bazaarSellerVisitKey(row))}">${escapeHtml(row.playerName || `Player ${row.playerId || ''}`)}</a>
          <strong>Price: ${escapeHtml(formatFullMoney(row.price))}</strong>
          <strong>Qty: ${escapeHtml(String(row.quantity || 0))}</strong>
          <span class="fluz-market-bazaar-time">${escapeHtml(formatBazaarUpdated(row.updated))}</span>
        </div>
      `).join('');
      return `
        <div class="${shellClass}" data-fluz-market-bazaar>
          <div class="fluz-market-bazaar-head">
            <strong>Bazaar Listings for ${escapeHtml(title)}${itemId ? ` (ID: ${escapeHtml(itemId)})` : ''}</strong>
            <span class="fluz-muted">${escapeHtml(state.itemMarketBazaarLoading ? 'loading' : age)}</span>
          </div>
          <div class="fluz-market-bazaar-controls">
            <button class="fluz-button" data-action="refresh-market-bazaar">Refresh</button>
            ${sortButton('price', 'Price')}
            ${sortButton('quantity', 'Qty')}
            ${sortButton('updated', 'Updated')}
            <label>Min Qty <input type="number" min="1" step="1" data-native-market-bazaar-min value="${escapeHtml(minQty)}"></label>
            <label>Max Age <input type="number" min="0" step="1" data-native-market-bazaar-age value="${escapeHtml(maxAge)}" placeholder="min"></label>
          </div>
          ${data.warning ? `<p class="${warningClass}">${escapeHtml(data.warning)}</p>` : ''}
          <div class="fluz-market-bazaar-compact-list">
            ${state.itemMarketBazaarLoading && !rows.length ? '<div class="fluz-market-bazaar-compact-row"><strong>Loading bazaar listings...</strong><span></span><span></span><span></span></div>' : ''}
            ${compactRows || (!state.itemMarketBazaarLoading ? '<div class="fluz-market-bazaar-compact-row"><strong>No bazaar listings matched.</strong><span></span><span></span><span></span></div>' : '')}
          </div>
          <div class="fluz-market-bazaar-foot">
            <span>Showing ${escapeHtml(String(Math.min(rows.length, maxRows)))} bazaars${data.listings && data.listings.length ? ` (${escapeHtml(String(data.listings.reduce((sum, row) => sum + parseNumber(row.quantity), 0)))} items total)` : ''}</span>
            <span>Powered by public bazaar data + FLUZ UI</span>
          </div>
        </div>
      `;
    }
    const rowHtml = rows.slice(0, ITEM_MARKET_BAZAAR.maxRows).map((row) => `
      <div class="fluz-market-bazaar-row">
        <b title="${escapeHtml(row.playerName)}">${escapeHtml(row.playerName || `Player ${row.playerId || ''}`)}</b>
        <span>${escapeHtml(formatFullMoney(row.price))}</span>
        <span>x${escapeHtml(String(row.quantity || 0))}</span>
        <span>${escapeHtml(formatBazaarUpdated(row.updated))}</span>
        ${bazaarLinkButton(row)}
      </div>
    `).join('');
    return `
      <div class="${shellClass}" data-fluz-market-bazaar>
        <div class="fluz-market-bazaar-head">
          <strong>Bazaar listings for ${escapeHtml(title)}</strong>
          <span class="fluz-muted">${escapeHtml(state.itemMarketBazaarLoading ? 'loading' : age)}</span>
        </div>
        <div class="fluz-market-bazaar-controls">
          <button class="fluz-button" data-action="refresh-market-bazaar">Refresh bazaar</button>
          ${sortButton('price', 'Price')}
          ${sortButton('quantity', 'Qty')}
          ${sortButton('updated', 'Updated')}
          <label>Min qty <input type="number" min="1" step="1" ${native ? 'data-native-market-bazaar-min' : 'data-utility-setting="marketBazaarMinQty"'} value="${escapeHtml(minQty)}"></label>
          <label>Max age <input type="number" min="0" step="1" ${native ? 'data-native-market-bazaar-age' : 'data-utility-setting="marketBazaarMaxAgeMinutes"'} value="${escapeHtml(maxAge)}" placeholder="min"></label>
        </div>
        <p class="fluz-muted">Read-only bazaar snapshot via ${escapeHtml(source)} + FLUZ UI. Links open seller bazaars; no buying or account action is clicked.</p>
        ${data.warning ? `<p class="${warningClass}">${escapeHtml(data.warning)}</p>` : ''}
        <div class="fluz-market-bazaar-rows">
          <div class="fluz-market-bazaar-row is-head"><span>Seller</span><span>Price</span><span>Qty</span><span>Seen</span><span>Open</span></div>
          ${state.itemMarketBazaarLoading && !rows.length ? '<div class="fluz-market-bazaar-row"><b>Loading listings...</b><span></span><span></span><span></span><span></span></div>' : ''}
          ${rowHtml || (!state.itemMarketBazaarLoading ? '<div class="fluz-market-bazaar-row"><b>No bazaar rows matched.</b><span></span><span></span><span></span><span></span></div>' : '')}
        </div>
      </div>
    `;
  }

  function renderMarketPricePlanner(module) {
    const feeKey = getModuleFeeKey(module);
    const fee = MARKET_FEES[feeKey] || MARKET_FEES.itemMarket;
    const base = parseNumber(state.utility.basePrice);
    const qty = Math.max(1, parseNumber(state.utility.quantity));
    const pct = parseNumber(state.utility.percentChange);
    const target = Math.max(1, Math.round(base * (1 + pct / 100)));
    const netEach = target * (1 - fee.feePct / 100);
    const netTotal = netEach * qty;
    const cost = parseNumber(state.utility.buyCost);
    const profitEach = cost > 0 ? netEach - cost : 0;
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Bulk price planner</div>
        <div class="fluz-form-grid">
          <label>Current price
            <input type="number" min="0" data-utility-setting="basePrice" value="${escapeHtml(state.utility.basePrice)}">
          </label>
          <label>Change %
            <input type="number" step="0.1" data-utility-setting="percentChange" value="${escapeHtml(state.utility.percentChange)}">
          </label>
          <label>Quantity
            <input type="number" min="1" data-utility-setting="quantity" value="${escapeHtml(state.utility.quantity)}">
          </label>
          <label>Buy/cost each
            <input type="number" min="0" data-utility-setting="buyCost" value="${escapeHtml(state.utility.buyCost)}">
          </label>
          <label>Fee mode
            <select data-utility-setting="feeKey">
              ${Object.entries(MARKET_FEES).map(([key, item]) => `<option value="${key}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(item.label)} (${escapeHtml(item.feePct)}%)</option>`).join('')}
            </select>
          </label>
          <label>&nbsp;
            <button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(String(target))}">Copy target</button>
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="fill-market-price" data-price="${escapeHtml(String(target))}">Fill price box</button>
          </label>
        </div>
        <div class="fluz-alert">
          New list price: <strong>${formatFullMoney(target)}</strong> each. Net after ${escapeHtml(fee.feePct)}% fee: <strong>${formatFullMoney(netEach)}</strong> each / <strong>${formatFullMoney(netTotal)}</strong> total.
          ${cost > 0 ? ` Profit after fee: <strong class="${profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profitEach)}</strong> each.` : ''}
        </div>
        <p class="fluz-muted">${escapeHtml(fee.note)} Fill only writes the number into a focused or visible price field. You still manually set/update/confirm.</p>
      </div>
    `;
  }

  function marketFillButtonKey(itemName, sourcePrice, targetPrice) {
    return [
      itemProfitKey(itemName),
      Math.round(parseNumber(sourcePrice)),
      Math.round(parseNumber(targetPrice))
    ].join('|');
  }

  function isMarketFillButtonUsed(key) {
    return !!(key && state.marketFilledPriceButtons && state.marketFilledPriceButtons[key]);
  }

  function hasItemProfitOverride(itemName) {
    const key = itemProfitKey(itemName);
    return !!(key && state.utility.itemProfitPcts && Object.prototype.hasOwnProperty.call(state.utility.itemProfitPcts, key));
  }

  function markMarketFillButton(button) {
    if (!button) return;
    const key = String(button.dataset.fillKey || '').trim();
    if (!key) return;
    state.marketFilledPriceButtons = { ...(state.marketFilledPriceButtons || {}), [key]: nowMs() };
    button.classList.add('fluz-fill-used');
  }

  function renderVisiblePriceScanner(module) {
    const feeKey = getModuleFeeKey(module);
    const fee = MARKET_FEES[feeKey] || MARKET_FEES.itemMarket;
    const pct = parseNumber(state.utility.percentChange);
    const rows = scanVisibleMarketItemRows();
    const fallbackPrices = [];
    return `
      <div class="fluz-section-title"><span>Visible item scan</span><span class="fluz-muted">${rows.length} item rows</span></div>
      <div class="fluz-card">
        <p class="fluz-muted">Price is always per 1 item. Each row uses fee % + your profit %. Fill writes only to that item's price field, never quantity.</p>
        <div class="fluz-form-grid">
          <label>Fallback profit %
            <input type="number" step="0.1" data-utility-setting="percentChange" value="${escapeHtml(state.utility.percentChange)}">
          </label>
          <label>Fee mode
            ${renderMarketFeeModeControl(module, feeKey)}
          </label>
        </div>
      </div>
      ${rows.length ? `
        <div class="fluz-market-head fluz-item-scan-head">
          <div>Item</div><div>Qty</div><div>RRP</div><div><button class="fluz-button" data-action="reset-item-profit-overrides" title="Clear item-specific profit percentages and sync all rows to the fallback profit again.">Reset %</button></div><div>Target</div><div>Net</div><div><button class="fluz-button primary" data-action="fill-all-market-prices">Fill all</button></div>
        </div>
      ` : ''}
      <div class="fluz-table">
        ${rows.length ? rows.map((row) => {
          const hasOverride = hasItemProfitOverride(row.name);
          const profitPct = hasOverride ? getItemProfitPct(row.name, pct) : pct;
          const adjusted = Math.max(1, Math.round(row.price * (1 + (fee.feePct + profitPct) / 100)));
          const net = adjusted * (1 - fee.feePct / 100);
          const fillKey = marketFillButtonKey(row.name, row.price, adjusted);
          const fillClass = isMarketFillButtonUsed(fillKey) ? ' fluz-fill-used' : '';
          return `<div class="fluz-row fluz-market-row fluz-item-scan-row"><div class="fluz-cell-main" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div><div>x${escapeHtml(row.quantity)}</div><div>${formatMoney(row.price)}</div><div class="fluz-profit-cell"><input class="fluz-row-profit-input" type="number" step="0.1" data-item-profit="${escapeHtml(row.name)}" data-item-profit-mode="${hasOverride ? 'manual' : 'global'}" value="${escapeHtml(profitPct)}" ${hasOverride ? '' : 'disabled'}><button class="fluz-profit-mode ${hasOverride ? 'manual' : 'global'}" data-action="toggle-item-profit-override" data-item-name="${escapeHtml(row.name)}" data-current-profit="${escapeHtml(String(profitPct))}" title="${hasOverride ? 'Manual item profit. Click to sync this item with the global fallback %.' : 'Using global fallback %. Click to unlock this item for its own profit %.'}">${hasOverride ? iconSvg('lock') : iconSvg('globe')}</button></div><div>${formatMoney(adjusted)}</div><div>${formatMoney(net)}</div><div class="fluz-row-actions"><button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(String(adjusted))}">Copy</button><button class="fluz-button primary${fillClass}" data-action="fill-market-price" data-price="${escapeHtml(String(adjusted))}" data-item-name="${escapeHtml(row.name)}" data-source-price="${escapeHtml(String(Math.round(row.price)))}" data-fill-key="${escapeHtml(fillKey)}">Fill</button></div></div>`;
        }).join('') : fallbackPrices.map((price) => {
          const adjusted = Math.max(1, Math.round(price * (1 + (fee.feePct + pct) / 100)));
          const net = adjusted * (1 - fee.feePct / 100);
          return `<div class="fluz-row fluz-market-row"><div class="fluz-cell-main">${formatMoney(price)}</div><div>Target ${formatMoney(adjusted)}</div><div>Net ${formatMoney(net)}</div><div>${escapeHtml(fee.feePct)}%</div><div class="fluz-row-actions"><button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(String(adjusted))}">Copy</button><button class="fluz-button primary" data-action="fill-market-price" data-price="${escapeHtml(String(adjusted))}">Fill</button></div></div>`;
        }).join('') || '<div class="fluz-card">No visible item rows or prices detected yet.</div>'}
      </div>
    `;
  }

  function renderItemDatabaseTab(module) {
    const hidden = marketHiddenItemSet();
    const query = String(state.utility.marketSettingsSearch || '').trim().toLowerCase();
    const records = sortedAllMarketItems(getKnownItemRecords()
      .filter((item) => !query || `${item.name} ${item.id} ${item.category || ''}`.toLowerCase().includes(query)));
    const itemCache = state.cacheInfo && state.cacheInfo.gymItems;
    const age = itemCache && itemCache.fetchedAt ? `${Math.round((nowMs() - itemCache.fetchedAt) / 1000)}s old` : 'not loaded';
    const title = module && module.key === 'bazaar' ? 'Bazaar reference database' : 'Item market reference database';
    const hiddenCount = getKnownItemRecords().filter((item) => hidden.has(String(item.id))).length;
    const includedCount = Math.max(0, getKnownItemRecords().length - hiddenCount);
    const page = getMarketDatabasePage(records);
    return `
      <div class="fluz-section-title"><span>${escapeHtml(title)}</span><span class="fluz-muted">${includedCount} scanning / ${hiddenCount} skipped - ${escapeHtml(age)}</span></div>
      <div class="fluz-card">
        <div class="fluz-form-grid">
          <label>Search item
            <input type="text" data-utility-setting="marketSettingsSearch" value="${escapeHtml(state.utility.marketSettingsSearch || '')}" placeholder="Cell Phone, Xanax, Medical, ID...">
          </label>
        </div>
        <p class="fluz-muted">Checked items are included in Market Listings recognition and all-item Bazaar scanning. Uncheck items you do not care about to make scans faster and save scan slots.</p>
      </div>
      ${records.length ? `
        <div class="fluz-market-head fluz-item-db-head">
          ${renderMarketDatabaseSortHeader('name', 'Item')}
          ${renderMarketDatabaseSortHeader('category', 'Type')}
          ${renderMarketDatabaseSortHeader('value', 'Value')}
          ${renderMarketDatabaseSortHeader('id', 'ID')}
          ${renderMarketDatabaseSortHeader('hidden', 'Scan')}
        </div>
        ${renderMarketDatabasePager(page)}
        <div class="fluz-table">
          ${page.rows.map((item) => {
            const included = !hidden.has(String(item.id));
            return `
            <div class="fluz-row fluz-market-row fluz-item-db-row">
              <div class="fluz-cell-main" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
              <div title="${escapeHtml(item.category || 'Other')}">${escapeHtml(item.category || 'Other')}</div>
              <div>${formatMoney(item.value)}</div>
              <div>#${escapeHtml(item.id)}</div>
              <label class="fluz-check" title="${included ? 'Included in scans' : 'Skipped by scans'}"><input type="checkbox" data-market-scan-item="${escapeHtml(item.id)}" ${included ? 'checked' : ''}> ${included ? 'On' : 'Off'}</label>
            </div>
          `;
          }).join('')}
        </div>
        ${renderMarketDatabasePager(page)}
      ` : '<div class="fluz-card">No item database rows matched. Add a Limited API key, press refresh, or clear the search.</div>'}
    `;
  }

  function renderMarketFeeModeControl(module, feeKey) {
    if (module && module.key === 'bazaar') {
      return '<select disabled><option>Bazaar (0%) - locked</option></select>';
    }
    if (module && module.key === 'itemmarket') {
      return `
        <select data-utility-setting="itemmarketFeeKey">
          ${['retail', 'itemMarket', 'itemMarketAnon'].map((key) => {
            const item = MARKET_FEES[key];
            return `<option value="${key}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(item.label)} (${escapeHtml(item.feePct)}%)</option>`;
          }).join('')}
        </select>
      `;
    }
    return `
      <select data-utility-setting="feeKey">
        ${Object.entries(MARKET_FEES).map(([key, item]) => `<option value="${key}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(item.label)} (${escapeHtml(item.feePct)}%)</option>`).join('')}
      </select>
    `;
  }

  function currentItemMarketItemTitle(itemId = currentItemMarketItemId()) {
    if (state.itemMarketBazaarTitle && (!itemId || state.itemMarketBazaarTitleItemId === itemId)) return state.itemMarketBazaarTitle;
    const placement = findItemMarketBazaarPlacement(false);
    if (placement && placement.itemName && (!itemId || placement.itemId === itemId)) return placement.itemName;
    const selectors = [
      '[class^="itemsHeader"] [class^="title"]',
      '[class*=" itemsHeader"] [class*=" title"]',
      '[class^="itemInfo"] [class^="name"]',
      '[class*=" itemInfo"] [class*=" name"]',
      'h1'
    ];
    for (const selector of selectors) {
      const element = $(selector);
      const text = element ? String(element.textContent || '').trim() : '';
      if (text && !/item market/i.test(text)) return text.replace(/\s+/g, ' ');
    }
    const category = currentItemMarketCategoryName();
    return itemId ? `Item #${itemId}${category ? ` (${category})` : ''}` : 'selected item';
  }

  function normalizeItemMarketBazaarListing(raw, fallbackItemId) {
    const playerId = String(raw && (raw.player_id || raw.playerId || raw.user_id || raw.userId) || '').trim();
    return {
      itemId: String(raw && (raw.item_id || raw.itemId) || fallbackItemId || '').trim(),
      playerId,
      playerName: String(raw && (raw.player_name || raw.playerName || raw.name) || (playerId ? `Player ${playerId}` : 'Unknown seller')).trim(),
      quantity: Math.max(0, Math.floor(parseNumber(raw && raw.quantity))),
      price: Math.max(0, Math.round(parseNumber(raw && raw.price))),
      updated: raw && (raw.last_checked || raw.updated || raw.updatedAt || raw.lastChecked || '')
    };
  }

  function filterItemMarketBazaarRows(listings, options = {}) {
    const minQty = Math.max(1, parseNumber(options.minQty || state.utility.marketBazaarMinQty || 1));
    const maxAgeMinutes = options.maxAge == null ? getMarketBazaarMaxAgeMinutes() : Math.max(0, parseNumber(options.maxAge));
    const maxAgeMs = maxAgeMinutes > 0 ? maxAgeMinutes * 60 * 1000 : 0;
    return (listings || []).filter((row) => {
      if (parseNumber(row.quantity) < minQty) return false;
      if (maxAgeMs > 0) {
        const updatedMs = parseBazaarUpdatedMs(row.updated);
        if (!Number.isFinite(updatedMs) || nowMs() - updatedMs > maxAgeMs) return false;
      }
      return true;
    });
  }

  function sortedItemMarketBazaarListings(listings) {
    const key = state.utility.marketBazaarSortKey || 'price';
    const dir = state.utility.marketBazaarSortDir === 'desc' ? -1 : 1;
    return [...(listings || [])].sort((a, b) => {
      let left = 0;
      let right = 0;
      if (key === 'quantity') {
        left = parseNumber(a.quantity);
        right = parseNumber(b.quantity);
      } else if (key === 'updated') {
        left = parseBazaarUpdatedMs(a.updated);
        right = parseBazaarUpdatedMs(b.updated);
      } else {
        left = parseNumber(a.price);
        right = parseNumber(b.price);
      }
      if (left === right) return parseNumber(a.price) - parseNumber(b.price);
      return (left - right) * dir;
    });
  }

  function sortedAllBazaarRows(rows) {
    const query = String(state.utility.marketAllSearch || '').trim().toLowerCase();
    const minDiffPct = parseNumber(state.utility.marketBazaarMinDiffPct || 0);
    const key = state.utility.marketBazaarAllSortKey || 'totalProfit';
    const dir = state.utility.marketBazaarAllSortDir === 'asc' ? 1 : -1;
    return filterItemMarketBazaarRows(rows || [])
      .filter((row) => !isMarketItemHiddenForScanning(row.itemId))
      .filter((row) => !query || `${row.itemName} ${row.playerName} ${row.itemId}`.toLowerCase().includes(query))
      .filter((row) => !minDiffPct || parseNumber(row.dealPct) >= minDiffPct)
      .sort((a, b) => {
        let left = 0;
        let right = 0;
        if (key === 'item') {
          return String(a.itemName || '').localeCompare(String(b.itemName || '')) * (state.utility.marketBazaarAllSortDir === 'desc' ? -1 : 1);
        }
        if (key === 'quantity') {
          left = parseNumber(a.quantity);
          right = parseNumber(b.quantity);
        } else if (key === 'updated') {
          left = parseBazaarUpdatedMs(a.updated);
          right = parseBazaarUpdatedMs(b.updated);
        } else if (key === 'price') {
          left = parseNumber(a.price);
          right = parseNumber(b.price);
        } else if (key === 'profit') {
          left = marketResaleNumbers(a).profitEach;
          right = marketResaleNumbers(b).profitEach;
        } else if (key === 'totalProfit') {
          left = marketResaleNumbers(a).totalProfit;
          right = marketResaleNumbers(b).totalProfit;
        } else if (key === 'value') {
          left = parseNumber(a.marketValue);
          right = parseNumber(b.marketValue);
        } else {
          left = parseNumber(a.dealPct);
          right = parseNumber(b.dealPct);
        }
        if (left === right) return parseNumber(a.price) - parseNumber(b.price);
        return (left - right) * dir;
      });
  }

  async function scanAllBazaarBatch(options = {}) {
    if (!options.auto) await flushVisibleMarketSettings();
    if (state.utility.marketBazaarScanPaused) {
      if (!options.silent) showFlash('Bazaar scanning is paused. Press Resume scans first.');
      return;
    }
    const records = getAllMarketScanItems();
    if (!records.length) {
      if (!options.silent) showFlash('No item database records matched the filters.');
      return;
    }
    const recovering = options.auto && isBazaarSourceRecovering();
    const batchSize = options.auto
      ? clamp(Math.round(parseNumber(options.batchSize || (recovering ? ITEM_MARKET_BAZAAR.recoveryBatchSize : ITEM_MARKET_BAZAAR.autoBatchSize)) || ITEM_MARKET_BAZAAR.autoBatchSize), 1, 10)
      : clamp(Math.round(parseNumber(options.batchSize || state.utility.marketBazaarAllBatchSize) || 20), 1, 60);
    const scan = state.marketBazaarAllScan || { index: 0, total: records.length };
    let start = Math.min(scan.index || 0, records.length);
    if (start >= records.length && options.auto) start = 0;
    const batch = records.slice(start, start + batchSize);
    if (!batch.length) {
      if (!options.silent) showFlash('All filtered items scanned. Press Reset scan to start over.');
      return;
    }
    let progressed = false;
    let successfulRequests = 0;
    let temporaryErrors = 0;
    state.marketBazaarAllLoading = true;
    state.marketBazaarAllScan = { index: start, total: records.length };
    renderBazaarScanProgress(options);
    const currentRows = new Map((state.marketBazaarAllRows || []).map((row) => [String(row.itemId), row]));
    const applyBest = (item, best) => {
      if (!best) return;
      const dealPct = best.price > 0 ? ((item.value - best.price) / best.price) * 100 : 0;
      currentRows.set(String(item.id), { ...best, itemName: item.name, marketValue: item.value, dealPct, scannedAt: nowMs() });
    };
    const concurrency = options.auto
      ? clamp(Math.round(parseNumber(recovering ? ITEM_MARKET_BAZAAR.recoveryConcurrency : ITEM_MARKET_BAZAAR.autoConcurrency) || 2), 1, 4)
      : clamp(Math.round(parseNumber(ITEM_MARKET_BAZAAR.manualConcurrency) || 3), 1, 4);
    const requestGapMs = options.auto
      ? Math.max(0, Math.round(parseNumber(recovering ? ITEM_MARKET_BAZAAR.recoveryRequestGapMs : ITEM_MARKET_BAZAAR.autoRequestGapMs) || 0))
      : Math.max(0, Math.round(parseNumber(ITEM_MARKET_BAZAAR.manualRequestGapMs) || 0));
    let nextBatchIndex = 0;
    const scanWorker = async () => {
      while (nextBatchIndex < batch.length) {
        const batchIndex = nextBatchIndex;
        nextBatchIndex += 1;
        const item = batch[batchIndex];
        if (requestGapMs > 0) await sleep(requestGapMs * batchIndex);
        try {
          applyBest(item, await fetchBestBazaarListingForItem(item));
          successfulRequests += 1;
          progressed = true;
        } catch (error) {
          if (isBazaarSourceTemporaryError(error)) temporaryErrors += 1;
          console.debug(`${APP.name}: all bazaar scan failed for ${item.name}`, error);
        }
      }
    };
    try {
      await Promise.all(Array.from({ length: Math.min(concurrency, batch.length) }, () => scanWorker()));
      if (successfulRequests > 0) {
        state.marketBazaarSourceErrorStreak = temporaryErrors > successfulRequests ? 1 : 0;
        state.marketBazaarSourceCooldownUntil = 0;
        state.marketBazaarSourceRecoveryUntil = temporaryErrors > 0 ? nowMs() + Math.round(ITEM_MARKET_BAZAAR.sourceRecoveryMs / 2) : 0;
      } else if (temporaryErrors > 0) {
        state.marketBazaarSourceErrorStreak = Math.min(5, (state.marketBazaarSourceErrorStreak || 0) + 1);
        state.marketBazaarSourceRecoveryUntil = nowMs() + ITEM_MARKET_BAZAAR.sourceRecoveryMs;
        if (state.marketBazaarSourceErrorStreak >= ITEM_MARKET_BAZAAR.sourceHardCooldownAfter) {
          const cooldownStep = state.marketBazaarSourceErrorStreak - ITEM_MARKET_BAZAAR.sourceHardCooldownAfter + 1;
          const cooldownMs = Math.min(ITEM_MARKET_BAZAAR.sourceMaxCooldownMs, ITEM_MARKET_BAZAAR.sourceCooldownMs * cooldownStep);
          state.marketBazaarSourceCooldownUntil = nowMs() + cooldownMs;
        } else {
          state.marketBazaarSourceCooldownUntil = 0;
        }
      }
    } finally {
      state.marketBazaarAllRows = Array.from(currentRows.values());
      state.marketBazaarAllScan = { index: start + batch.length >= records.length ? records.length : start + batch.length, total: records.length };
      state.marketBazaarAllLoading = false;
    }
    await saveMarketBazaarScanCache(!options.silent || progressed);
    renderBazaarScanProgress(options, true);
    if (!options.silent) showFlash(`Scanned ${batch.length} items for bazaar listings.`);
  }

  async function fetchBestBazaarListingForItem(item) {
    const json = await httpGetJson(`${ITEM_MARKET_BAZAAR.endpoint}${encodeURIComponent(item.id)}`);
    const rows = Array.isArray(json && json.listings)
      ? json.listings.map((row) => ({ ...normalizeItemMarketBazaarListing(row, item.id), itemName: item.name, marketValue: item.value }))
      : [];
    const listings = rows.map((row) => normalizeItemMarketBazaarListing(row, item.id)).filter((row) => row.playerId && row.price > 0);
    if (listings.length) {
      await writeJsonStorage(itemMarketBazaarCacheKey(item.id), {
        itemId: String(item.id),
        listings,
        fetchedAt: nowMs(),
        warning: ''
      });
    }
    return sortedItemMarketBazaarListings(filterItemMarketBazaarRows(rows))[0] || null;
  }

  function isBazaarSourceRecovering() {
    return Math.max(0, parseNumber(state.marketBazaarSourceRecoveryUntil || 0) - nowMs()) > 0;
  }

  function bazaarAutoDelayMs() {
    return isBazaarSourceRecovering() ? ITEM_MARKET_BAZAAR.recoveryDelayMs : ITEM_MARKET_BAZAAR.autoDelayMs;
  }

  function isBazaarSourceTemporaryError(error) {
    const message = error && error.message ? error.message : String(error || '');
    return /non-json|parse json|<!doctype|unexpected token|http 429|http 403|http 502|http 503|http 504/i.test(message);
  }

  function renderBazaarScanProgress(options = {}, finished = false) {
    if (!options.silent) {
      renderPanelPreservingScroll();
      return;
    }
    updateBazaarScanProgressText();
    const now = nowMs();
    if (finished
      && state.utility.activeTab === 'bazaarListings'
      && !isUserEditingText()
      && now - (state.marketBazaarAllLastRenderAt || 0) > ITEM_MARKET_BAZAAR.autoRenderThrottleMs) {
      state.marketBazaarAllLastRenderAt = now;
      renderPanelPreservingScroll();
    }
  }

  function updateBazaarScanProgressText() {
    const label = $(`#${APP.id} [data-bazaar-scan-progress]`);
    if (!label) return;
    const rows = state.marketBazaarAllRows || [];
    const scan = state.marketBazaarAllScan || { index: 0, total: getAllMarketScanItems().length };
    label.textContent = bazaarScanProgressText(rows, scan);
  }

  function bazaarScanProgressText(rows, scan) {
    const rowCount = Array.isArray(rows) ? rows.length : 0;
    const progress = `${rowCount} rows - ${scan.index || 0}/${scan.total || 0} scanned`;
    if (state.utility.marketBazaarScanPaused) return `${progress} - paused`;
    if (state.marketBazaarAllLoading) return `${progress} - ${isBazaarSourceRecovering() ? 'recovery scan' : 'scanning batch'}`;
    const restingMs = Math.max(0, parseNumber(state.marketBazaarSourceCooldownUntil || 0) - nowMs());
    if (restingMs > 0) return `${progress} - source cooling ${Math.ceil(restingMs / 1000)}s`;
    if (isBazaarSourceRecovering()) return `${progress} - recovery mode`;
    return progress;
  }

  function isUserEditingText() {
    const active = document.activeElement;
    if (!active) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/i.test(active.tagName || '') || active.isContentEditable;
  }

  function scheduleAllBazaarAutoScan(options = {}) {
    clearTimeout(state.marketBazaarAllAutoTimer);
    const module = state.mode === 'utility' ? getUtilityModule() : null;
    if (!module || module.key !== 'itemmarket' || !state.utility.marketBazaarAutoScan || state.utility.marketBazaarScanPaused) return;
    const now = nowMs();
    const canKickstart = !!options.immediate
      && state.utility.activeTab === 'bazaarListings'
      && !state.marketBazaarAllLoading
      && now - (state.marketBazaarAllAutoKickAt || 0) > 1200;
    const delayMs = canKickstart ? 60 : bazaarAutoDelayMs();
    if (canKickstart) state.marketBazaarAllAutoKickAt = now;
    state.marketBazaarAllAutoTimer = setTimeout(async () => {
      if (state.marketBazaarSourceCooldownUntil && nowMs() < state.marketBazaarSourceCooldownUntil) {
        updateBazaarScanProgressText();
        scheduleAllBazaarAutoScan({ cooldown: true });
        return;
      }
      if (!state.utility.marketBazaarAutoScan || state.utility.marketBazaarScanPaused || state.marketBazaarAllLoading) {
        scheduleAllBazaarAutoScan();
        return;
      }
      await scanAllBazaarBatch({ auto: true, silent: true });
      scheduleAllBazaarAutoScan();
    }, delayMs);
  }

  async function resetAllBazaarScan() {
    state.marketBazaarAllRows = [];
    state.marketBazaarAllScan = { index: 0, total: getAllMarketScanItems().length };
    state.marketBazaarSourceCooldownUntil = 0;
    state.marketBazaarSourceRecoveryUntil = 0;
    state.marketBazaarSourceErrorStreak = 0;
    await saveMarketBazaarScanCache(true);
    renderPanelPreservingScroll();
    showFlash('All-item bazaar scan reset.');
  }

  async function toggleAllBazaarScanPause() {
    state.utility.marketBazaarScanPaused = !state.utility.marketBazaarScanPaused;
    await saveUtilityState();
    scheduleAllBazaarAutoScan();
    renderPanelPreservingScroll();
    showFlash(state.utility.marketBazaarScanPaused ? 'Bazaar scans paused.' : 'Bazaar scans resumed.');
  }

  function formatBazaarUpdated(value) {
    if (!value) return '--';
    const parsed = parseBazaarUpdatedMs(value);
    if (!Number.isFinite(parsed)) return String(value).replace(/[TZ]/g, ' ').trim().slice(0, 12) || '--';
    const seconds = Math.max(0, Math.round((nowMs() - parsed) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  function parseBazaarUpdatedMs(value) {
    if (value == null || value === '') return NaN;
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
      const number = Number(value);
      if (!Number.isFinite(number)) return NaN;
      return number > 100000000000 ? number : number * 1000;
    }
    return Date.parse(value);
  }

  function itemMarketBazaarUrl(row) {
    const playerId = encodeURIComponent(row && row.playerId ? row.playerId : '');
    const itemId = encodeURIComponent(row && row.itemId ? row.itemId : currentItemMarketItemId());
    return `https://www.torn.com/bazaar.php?userId=${playerId}&itemId=${itemId}&highlight=1#/`;
  }

  function bazaarVisitKey(row) {
    if (!row) return '';
    const updated = parseBazaarUpdatedMs(row.updated);
    const updatedKey = Number.isFinite(updated) ? String(updated) : String(row.updated || '');
    return [
      row.itemId || row.itemName || '',
      row.playerId || row.playerName || '',
      Math.round(parseNumber(row.price)),
      Math.max(0, Math.floor(parseNumber(row.quantity))),
      updatedKey
    ].map((part) => String(part).trim()).join('|');
  }

  function bazaarSellerVisitKey(row) {
    if (!row) return '';
    const seller = String(row.playerId || row.playerName || '').trim();
    return seller ? `seller|${seller}` : '';
  }

  function isBazaarRowVisited(row) {
    const visited = state.utility.marketVisitedBazaarLinks || {};
    const exact = bazaarVisitKey(row);
    const seller = bazaarSellerVisitKey(row);
    return !!(exact && visited[exact]) || !!(state.utility.marketBazaarMarkSellerVisited !== false && seller && visited[seller]);
  }

  function bazaarLinkButton(row, label = 'Bazaar') {
    const url = itemMarketBazaarUrl(row);
    const key = bazaarVisitKey(row);
    const sellerKey = bazaarSellerVisitKey(row);
    const visited = isBazaarRowVisited(row);
    return `<a class="fluz-button primary ${visited ? 'fluz-bazaar-visited' : ''}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-action="open-bazaar-link" data-bazaar-url="${escapeHtml(url)}" data-bazaar-visit-key="${escapeHtml(key)}" data-bazaar-seller-key="${escapeHtml(sellerKey)}">${escapeHtml(label)}</a>`;
  }

  async function openBazaarLink(url, key, sellerKey = '') {
    const cleanUrl = String(url || 'https://www.torn.com/bazaar.php');
    const cleanKey = String(key || '').trim();
    const cleanSellerKey = String(sellerKey || '').trim();
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (cleanKey || cleanSellerKey) {
      const current = state.utility.marketVisitedBazaarLinks && typeof state.utility.marketVisitedBazaarLinks === 'object'
        ? state.utility.marketVisitedBazaarLinks
        : {};
      const next = { ...current };
      if (cleanKey) next[cleanKey] = nowMs();
      if (state.utility.marketBazaarMarkSellerVisited !== false && cleanSellerKey) next[cleanSellerKey] = nowMs();
      state.utility.marketVisitedBazaarLinks = next;
      await saveUtilityState();
      renderPanelPreservingScroll();
    }
  }

  function itemMarketBazaarCacheKey(itemId) {
    return toCacheKey(`itemMarketBazaar.${itemId}`);
  }

  async function loadItemMarketBazaarListings(force = false) {
    const itemId = currentItemMarketItemId();
    if (!itemId) {
      state.itemMarketBazaarData = { itemId: '', listings: [], fetchedAt: 0, warning: '' };
      renderNativeItemMarketBazaarPanel();
      return false;
    }
    const cacheKey = itemMarketBazaarCacheKey(itemId);
    const cached = await readJsonStorage(cacheKey, null);
    const fresh = cached && cached.fetchedAt && nowMs() - cached.fetchedAt < ITEM_MARKET_BAZAAR.cacheTtlMs;
    if (!force && fresh) {
      state.itemMarketBazaarData = { itemId, listings: Array.isArray(cached.listings) ? cached.listings : [], fetchedAt: cached.fetchedAt, warning: '' };
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
      return true;
    }
    if (state.marketBazaarSourceCooldownUntil && nowMs() < state.marketBazaarSourceCooldownUntil) {
      const cachedListings = cached && Array.isArray(cached.listings) ? cached.listings : [];
      state.itemMarketBazaarData = {
        itemId,
        listings: cachedListings,
        fetchedAt: cached && cached.fetchedAt ? cached.fetchedAt : 0,
        warning: cachedListings.length
          ? 'Bazaar source is resting. Showing cached rows.'
          : 'Bazaar source is resting. No cached rows for this item yet.'
      };
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
      return false;
    }
    state.itemMarketBazaarLoading = true;
    state.itemMarketBazaarData = {
      itemId,
      listings: cached && Array.isArray(cached.listings) ? cached.listings : [],
      fetchedAt: cached && cached.fetchedAt ? cached.fetchedAt : 0,
      warning: ''
    };
    renderPanelPreservingScroll();
    renderNativeItemMarketBazaarPanel();
    try {
      const json = await httpGetJson(`${ITEM_MARKET_BAZAAR.endpoint}${encodeURIComponent(itemId)}`);
      const listings = Array.isArray(json && json.listings)
        ? json.listings.map((row) => normalizeItemMarketBazaarListing(row, itemId)).filter((row) => row.playerId && row.price > 0)
        : [];
      state.itemMarketBazaarData = { itemId, listings, fetchedAt: nowMs(), warning: '' };
      await writeJsonStorage(cacheKey, state.itemMarketBazaarData);
      return true;
    } catch (error) {
      const hasCachedRows = !!(cached && Array.isArray(cached.listings) && cached.listings.length);
      const warning = isBazaarSourceTemporaryError(error) && hasCachedRows
        ? 'Bazaar source temporarily unavailable. Showing cached rows.'
        : (isBazaarSourceTemporaryError(error)
          ? 'Bazaar source temporarily unavailable. No cached rows for this item yet.'
          : `Bazaar source unavailable: ${friendlyError(error)}`);
      if (isBazaarSourceTemporaryError(error)) state.marketBazaarSourceCooldownUntil = nowMs() + ITEM_MARKET_BAZAAR.sourceCooldownMs;
      state.itemMarketBazaarData = {
        itemId,
        listings: cached && Array.isArray(cached.listings) ? cached.listings : [],
        fetchedAt: cached && cached.fetchedAt ? cached.fetchedAt : 0,
        warning
      };
      return false;
    } finally {
      state.itemMarketBazaarLoading = false;
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
    }
  }

  function renderPanelPreservingScroll() {
    if (!state.elements.panel) return;
    const scrollTop = getPanelContentScrollTop();
    renderPanel();
    restorePanelContentScrollTop(scrollTop);
  }

  async function sortItemMarketBazaarListings(key) {
    const current = state.utility.marketBazaarSortKey || 'price';
    if (current === key) state.utility.marketBazaarSortDir = state.utility.marketBazaarSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketBazaarSortKey = key;
      state.utility.marketBazaarSortDir = key === 'updated' ? 'desc' : 'asc';
    }
    await saveUtilityState();
    renderPanelPreservingScroll();
    renderNativeItemMarketBazaarPanel();
  }

  async function sortAllMarketItems(key) {
    const cleanKey = String(key || '').trim();
    if (!['name', 'category', 'value', 'id', 'hidden'].includes(cleanKey)) return;
    if (state.utility.marketAllSortKey === cleanKey) state.utility.marketAllSortDir = state.utility.marketAllSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketAllSortKey = cleanKey;
      state.utility.marketAllSortDir = ['name', 'category', 'hidden'].includes(cleanKey) ? 'asc' : 'desc';
    }
    state.utility.marketSettingsPage = 1;
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function setMarketDatabasePage(page) {
    state.utility.marketSettingsPage = Math.max(1, Math.floor(parseNumber(page) || 1));
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function sortMarketNativeListings(key) {
    const cleanKey = String(key || '').trim();
    if (!['profit', 'totalProfit', 'deal', 'price', 'quantity', 'item'].includes(cleanKey)) return;
    if (state.utility.marketNativeSortKey === cleanKey) state.utility.marketNativeSortDir = state.utility.marketNativeSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketNativeSortKey = cleanKey;
      state.utility.marketNativeSortDir = ['price', 'item'].includes(cleanKey) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    refreshVisibleTornMarketRows(true);
    renderPanelPreservingScroll();
  }

  async function sortAllBazaarListings(key) {
    const cleanKey = String(key || '').trim();
    if (!['deal', 'profit', 'totalProfit', 'price', 'quantity', 'updated', 'item', 'value'].includes(cleanKey)) return;
    if (state.utility.marketBazaarAllSortKey === cleanKey) state.utility.marketBazaarAllSortDir = state.utility.marketBazaarAllSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketBazaarAllSortKey = cleanKey;
      state.utility.marketBazaarAllSortDir = ['price', 'updated', 'item'].includes(cleanKey) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    renderPanelPreservingScroll();
  }

  async function hideMarketItem(itemId) {
    const id = String(itemId || '').replace(/\D/g, '');
    if (!id) return;
    const set = marketManualHiddenItemSet();
    set.add(id);
    state.utility.marketHiddenItemIds = Array.from(set).sort((a, b) => parseNumber(a) - parseNumber(b));
    state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => String(row.itemId) !== id || isCurrentItemMarketItem(row.itemId));
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function unhideMarketItem(itemId) {
    const id = String(itemId || '').replace(/\D/g, '');
    state.utility.marketHiddenItemIds = (state.utility.marketHiddenItemIds || []).filter((item) => String(item) !== id);
    state.utility.marketValueHiddenItemIds = (state.utility.marketValueHiddenItemIds || []).filter((item) => String(item) !== id);
    await saveUtilityState();
    openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function setMarketItemScanEnabled(itemId, enabled) {
    const id = String(itemId || '').replace(/\D/g, '');
    if (!id) return;
    const set = marketManualHiddenItemSet();
    const valueSet = marketValueHiddenItemSet();
    if (enabled) set.delete(id);
    else set.add(id);
    if (enabled) valueSet.delete(id);
    state.utility.marketHiddenItemIds = Array.from(set).sort((a, b) => parseNumber(a) - parseNumber(b));
    state.utility.marketValueHiddenItemIds = Array.from(valueSet).sort((a, b) => parseNumber(a) - parseNumber(b));
    if (!enabled) {
      state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => String(row.itemId) !== id || isCurrentItemMarketItem(row.itemId));
      state.marketNativeRows = (state.marketNativeRows || []).filter((row) => String(row.itemId) !== id || isCurrentItemMarketItem(row.itemId));
    }
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    renderPanelPreservingScroll();
  }

  async function setMarketCategoryScanEnabled(category, enabled) {
    const cleanCategory = String(category || '').trim();
    if (!cleanCategory) return;
    const records = getKnownItemRecords().filter((item) => String(item.category || 'Other') === cleanCategory);
    if (!records.length) return;
    const ids = new Set(records.map((item) => String(item.id)));
    const hidden = marketManualHiddenItemSet();
    const valueHidden = marketValueHiddenItemSet();
    ids.forEach((id) => {
      if (enabled) hidden.delete(id);
      else hidden.add(id);
      if (enabled) valueHidden.delete(id);
    });
    state.utility.marketHiddenItemIds = Array.from(hidden).sort((a, b) => parseNumber(a) - parseNumber(b));
    state.utility.marketValueHiddenItemIds = Array.from(valueHidden).sort((a, b) => parseNumber(a) - parseNumber(b));
    if (!enabled) {
      state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => !ids.has(String(row.itemId)) || isCurrentItemMarketItem(row.itemId));
      state.marketNativeRows = (state.marketNativeRows || []).filter((row) => !ids.has(String(row.itemId)) || isCurrentItemMarketItem(row.itemId));
    }
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function applyMarketValueLimit() {
    await flushVisibleMarketSettings();
    const minValue = Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMin || 0)));
    const maxValue = Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMax || 0)));
    state.utility.marketValueLimitMin = minValue;
    state.utility.marketValueLimitMax = maxValue;
    recomputeMarketValueHiddenItems();
    state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => !isMarketItemHiddenForScanning(row.itemId));
    state.marketNativeRows = (state.marketNativeRows || []).filter((row) => !isMarketItemHiddenForScanning(row.itemId));
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
    const summary = [
      minValue > 0 ? `${formatMoney(minValue)} min` : '',
      maxValue > 0 ? `${formatMoney(maxValue)} max` : ''
    ].filter(Boolean).join(' / ');
    showFlash(summary ? `Market value limit applied: ${summary}.` : 'Market value limit cleared.');
  }

  async function refreshMarketFilterDisplays(options = {}) {
    if (!options.skipFlush) await flushVisibleMarketSettings();
    state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => !isMarketItemHiddenForScanning(row.itemId));
    state.marketNativeRows = (state.marketNativeRows || []).filter((row) => !isMarketItemHiddenForScanning(row.itemId));
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function saveMarketFilterPreset() {
    await flushVisibleMarketSettings();
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const selectedId = String(state.utility.marketFilterPresetId || '');
    const existing = presets.find((preset) => preset.id === selectedId);
    const name = cleanBookieText(state.utility.marketFilterPresetName || (existing && existing.name) || `Preset ${presets.length + 1}`);
    const now = nowMs();
    const next = {
      id: existing ? existing.id : `market-preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name || `Preset ${presets.length + 1}`,
      marketHiddenItemIds: (state.utility.marketHiddenItemIds || []).map(String),
      marketValueLimitMin: Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMin || 0))),
      marketValueLimitMax: Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMax || 0))),
      marketValueHiddenItemIds: [],
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    const index = presets.findIndex((preset) => preset.id === next.id);
    if (index >= 0) presets[index] = next;
    else presets.unshift(next);
    state.utility.marketFilterPresets = normalizeMarketFilterPresets(presets);
    state.utility.marketFilterPresetId = next.id;
    state.utility.marketFilterPresetName = next.name;
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    showFlash(`Saved market filter preset: ${next.name}`);
  }

  async function loadMarketFilterPreset() {
    await flushVisibleMarketSettings();
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const preset = presets.find((item) => item.id === state.utility.marketFilterPresetId);
    if (!preset) {
      showFlash('Choose a market filter preset first.');
      return;
    }
    state.utility.marketHiddenItemIds = preset.marketHiddenItemIds.map(String);
    state.utility.marketValueLimitMin = Math.max(0, Math.floor(parseNumber(preset.marketValueLimitMin || 0)));
    state.utility.marketValueLimitMax = Math.max(0, Math.floor(parseNumber(preset.marketValueLimitMax || 0)));
    recomputeMarketValueHiddenItems();
    state.utility.marketFilterPresetName = preset.name;
    await refreshMarketFilterDisplays({ skipFlush: true });
    showFlash(`Loaded market filter preset: ${preset.name}`);
  }

  async function deleteMarketFilterPreset() {
    await flushVisibleMarketSettings();
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const preset = presets.find((item) => item.id === state.utility.marketFilterPresetId);
    if (!preset) {
      showFlash('Choose a market filter preset first.');
      return;
    }
    state.utility.marketFilterPresets = presets.filter((item) => item.id !== preset.id);
    state.utility.marketFilterPresetId = '';
    state.utility.marketFilterPresetName = '';
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    showFlash(`Deleted market filter preset: ${preset.name}`);
  }
