  function renderTravelPlanner() {
    const live = scanTravelStatusFromPage();
    const destination = getTravelDestination();
    const itemName = String(state.utility.travelItemName || '').trim();
    const buy = parseNumber(state.utility.travelBuyCost);
    const sell = parseNumber(state.utility.travelSellPrice);
    const minutes = Math.max(1, parseNumber(state.utility.travelMinutes));
    const baseCarry = Math.max(1, parseNumber(state.utility.travelCarry || state.utility.travelCapacity));
    const cap = effectiveTravelCarry();
    const risk = Math.max(0, parseNumber(state.utility.travelRiskCost));
    const profitRows = buildTravelProfitRows();
    const destinationRows = profitRows.filter((row) => normalizeTravelCountryKey(row.country) === normalizeTravelCountryKey(destination.label)).slice(0, 6);
    const yataAge = state.travelYataData && state.travelYataData.fetchedAt
      ? `${Math.round((nowMs() - state.travelYataData.fetchedAt) / 1000)}s old`
      : 'not loaded';
    const profitEach = sell - buy;
    const gross = profitEach * cap;
    const fillCost = buy * cap;
    const total = gross - risk;
    const hourly = total / (minutes / 60);
    const daily = hourly * 24;
    const itemsPerHour = cap / (minutes / 60);
    const breakEven = buy + (risk / cap);
    const eta = new Date(nowMs() + minutes * 60000).toLocaleTimeString();
    const marketLink = itemName ? itemMarketUrl(itemName) : 'https://www.torn.com/page.php?sid=ItemMarket';
    return `
      ${live.detected ? `
        <div class="fluz-card compact">
          <div class="fluz-section-title"><span>Travel status</span><span class="fluz-muted">visible page</span></div>
          <div class="fluz-mini-metrics fluz-bootleg-metrics">
            <span><b>${escapeHtml(live.route || 'Traveling')}</b><em>route</em></span>
            <span><b>${escapeHtml(live.timer || '--')}</b><em>timer</em></span>
            <span><b>${escapeHtml(live.direction || 'manual')}</b><em>direction</em></span>
            <span><b>${escapeHtml(destination.label)}</b><em>plan</em></span>
            <span><b>${escapeHtml(itemName || 'choose item')}</b><em>item</em></span>
          </div>
        </div>
      ` : ''}
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Travel profit planner</span><span class="fluz-muted">${escapeHtml(destination.focus)}</span></div>
        <div class="fluz-form-grid">
          <label>Destination
            <select data-utility-setting="travelDestination">
              ${TRAVEL_DESTINATIONS.map((item) => `<option value="${escapeHtml(item.key)}" ${state.utility.travelDestination === item.key ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
            </select>
          </label>
          <label>Item / plan
            <input type="text" data-utility-setting="travelItemName" value="${escapeHtml(itemName)}" placeholder="Item to buy abroad">
          </label>
          <label>Abroad buy price
            <input type="number" data-utility-setting="travelBuyCost" value="${escapeHtml(state.utility.travelBuyCost)}">
          </label>
          <label>Torn sell value
            <input type="number" data-utility-setting="travelSellPrice" value="${escapeHtml(state.utility.travelSellPrice)}">
          </label>
          <label>Round trip minutes
            <input type="number" min="1" data-utility-setting="travelMinutes" value="${escapeHtml(state.utility.travelMinutes)}">
          </label>
          <label>Capacity
            <input type="number" min="1" data-utility-setting="travelCarry" value="${escapeHtml(baseCarry)}">
          </label>
          <label>Risk / fees / reserve
            <input type="number" min="0" data-utility-setting="travelRiskCost" value="${escapeHtml(state.utility.travelRiskCost)}">
          </label>
          <label>Flight speed
            <select data-utility-setting="travelSpeedTier">
              ${TRAVEL_SPEED_TIERS.map((tier) => `<option value="${escapeHtml(tier.key)}" ${state.utility.travelSpeedTier === tier.key ? 'selected' : ''}>${escapeHtml(tier.label)}</option>`).join('')}
            </select>
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelHasBook" ${state.utility.travelHasBook ? 'checked' : ''}> Travel book</label>
        </div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b class="${profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatMoney(profitEach)}</b><em>profit each</em></span>
          <span><b>${formatMoney(fillCost)}</b><em>cash to fill</em></span>
          <span><b class="${total >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatMoney(total)}</b><em>net trip</em></span>
          <span><b>${formatMoney(hourly)}</b><em>per hour</em></span>
          <span><b>${formatMoney(daily)}</b><em>per day</em></span>
        </div>
        <div class="fluz-alert">
          Break-even sell: <strong>${formatMoney(breakEven)}</strong> each. Throughput: <strong>${itemsPerHour.toFixed(1)}</strong> items/hour. Full round-trip estimate finishes around <strong>${escapeHtml(eta)}</strong>.
        </div>
        <p class="fluz-muted">Manual planner only. Confirm stock, price, and travel timers in Torn before buying abroad or listing items.</p>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Best live runs</span><span class="fluz-muted">${state.travelYataLoading ? 'loading' : escapeHtml(yataAge)}</span></div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-bottom:7px;">
          <button class="fluz-button" data-action="refresh-travel-yata">Refresh YATA stock</button>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePlushies" ${state.utility.travelIncludePlushies ? 'checked' : ''}> Plushies</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeFlowers" ${state.utility.travelIncludeFlowers ? 'checked' : ''}> Flowers</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePrehistoric" ${state.utility.travelIncludePrehistoric ? 'checked' : ''}> Points</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeSpecial" ${state.utility.travelIncludeSpecial ? 'checked' : ''}> Special</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeDrugs" ${state.utility.travelIncludeDrugs ? 'checked' : ''}> Xanax</label>
        </div>
        ${state.travelYataData && state.travelYataData.warning ? `<p class="fluz-error">${escapeHtml(state.travelYataData.warning)}</p>` : ''}
        ${renderTravelProfitRows(profitRows.slice(0, 5))}
        <p class="fluz-muted">Ranking uses YATA stock cost + Torn item market_value + your carry/speed/book settings. It is a planning estimate, not an instruction to buy.</p>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>${escapeHtml(destination.label)} live stock</span><span class="fluz-muted">${escapeHtml(formatTravelDuration(travelOneWayHours(destination.label)))} one-way @ ${escapeHtml(travelSpeedLabel())}</span></div>
        ${renderTravelProfitRows(destinationRows, true)}
      </div>
      ${renderTravelSetsPlanner()}
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Destination notes</span><span class="fluz-muted">quick item checks</span></div>
        <div class="fluz-route-grid">
          ${destination.items.map((name) => `<button class="fluz-button" data-action="use-travel-item" data-item-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}
          <a class="fluz-button primary" href="${escapeHtml(marketLink)}" target="_blank" rel="noopener noreferrer">Market check</a>
        </div>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title">Travel routes</div>
        <div class="fluz-route-grid">
          <a class="fluz-route info" href="https://www.torn.com/travelagency.php">Travel Agency</a>
          <a class="fluz-route good" href="https://www.torn.com/page.php?sid=ItemMarket">Item Market</a>
          <a class="fluz-route warn" href="https://www.torn.com/page.php?sid=stocks">Stocks</a>
          <a class="fluz-route info" href="https://www.torn.com/missions.php">Missions</a>
        </div>
      </div>
    `;
  }

  function getTravelDestination() {
    return TRAVEL_DESTINATIONS.find((item) => item.key === state.utility.travelDestination) || TRAVEL_DESTINATIONS[0];
  }

  function renderTravelProfitRows(rows, compact = false) {
    if (!rows.length) {
      const hint = state.travelYataData && state.travelYataData.fetchedAt
        ? 'No profitable live stock matched your filters yet.'
        : 'Press Refresh YATA stock after your item database has loaded.';
      return `<div class="fluz-card compact">${escapeHtml(hint)}</div>`;
    }
    return `
      <div class="fluz-table">
        ${rows.map((row) => `
          <div class="fluz-row fluz-travel-row">
            <div class="fluz-cell-main" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
            <div>${escapeHtml(row.country)}</div>
            <div>${formatMoney(row.cost)} buy</div>
            <div>${formatMoney(row.sell)} sell</div>
            <div class="${row.profitPerHour >= 0 ? 'fluz-pos' : 'fluz-neg'}">${compact ? formatMoney(row.profitEach) : `${formatMoney(row.profitPerHour)}/h`}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTravelSetsPlanner() {
    const summary = buildTravelSetSummary();
    const pointsPrice = parseNumber(state.utility.travelPointsPrice);
    const pointBonus = state.utility.travelMuseumDay ? 1.1 : 1;
    const totalPoints = Math.floor(summary.totalPoints * pointBonus);
    const totalValue = totalPoints * pointsPrice;
    const carry = effectiveTravelCarry();
    const owned = state.utility.travelOwnedItems || {};
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Museum sets planner</span><span class="fluz-muted">manual inventory</span></div>
        <div class="fluz-form-grid">
          <label>Point price
            <input type="number" min="0" data-utility-setting="travelPointsPrice" value="${escapeHtml(state.utility.travelPointsPrice)}">
          </label>
          <label>Base carry
            <input type="number" min="1" data-utility-setting="travelCarry" value="${escapeHtml(state.utility.travelCarry || state.utility.travelCapacity)}">
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelMuseumDay" ${state.utility.travelMuseumDay ? 'checked' : ''}> Museum Day +10%</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelTourismDay" ${state.utility.travelTourismDay ? 'checked' : ''}> Tourism carry x2</label>
        </div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(summary.plushieSets))}</b><em>plushie sets</em></span>
          <span><b>${escapeHtml(String(summary.flowerSets))}</b><em>flower sets</em></span>
          <span><b>${escapeHtml(String(summary.prehistoricSets))}</b><em>point sets</em></span>
          <span><b>${escapeHtml(String(totalPoints))}</b><em>points</em></span>
          <span><b>${formatMoney(totalValue)}</b><em>value</em></span>
        </div>
        <div class="fluz-alert">
          Effective carry: <strong>${escapeHtml(String(carry))}</strong>. Bottleneck: <strong>${escapeHtml(summary.bottleneck || 'Add counts')}</strong>.
          ${pointsPrice > 0 ? ` Estimated museum value: <strong>${formatMoney(totalValue)}</strong>.` : ' Add point price to value completed sets.'}
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-bottom:7px;">
          <button class="fluz-button" data-action="clear-travel-owned">Clear counts</button>
          <button class="fluz-button" data-action="fill-travel-owned-ones">Set empty to 1</button>
        </div>
        <div class="fluz-table">
          ${travelSetRows().map((row) => `
            <div class="fluz-row fluz-travel-set-row">
              <div class="fluz-cell-main" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
              <div>${escapeHtml(row.type)}</div>
              <div>${escapeHtml(row.country)}</div>
              <div><input class="fluz-row-profit-input" type="number" min="0" data-travel-owned="${escapeHtml(row.name)}" value="${escapeHtml(owned[row.name] || 0)}"></div>
              <div><a class="fluz-button" href="${escapeHtml(itemMarketUrl(row.name))}" target="_blank" rel="noopener noreferrer">Market</a></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function travelSetRows() {
    return TRAVEL_ITEM_CATALOG
      .filter((item) => ['Plushie', 'Flower', 'Prehistoric', 'Special'].includes(item.type))
      .slice()
      .sort((a, b) => a.type.localeCompare(b.type) || a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  }

  function buildTravelSetSummary() {
    const owned = state.utility.travelOwnedItems || {};
    const countFor = (item) => Math.max(0, Math.floor(parseNumber(owned[item.name])));
    const group = (type) => TRAVEL_ITEM_CATALOG.filter((item) => item.type === type);
    const setCount = (type) => {
      const items = group(type);
      if (!items.length) return 0;
      return Math.min(...items.map(countFor));
    };
    const plushieSets = setCount('Plushie');
    const flowerSets = setCount('Flower');
    const prehistoricSets = setCount('Prehistoric');
    const specialPoints = group('Special').reduce((sum, item) => sum + countFor(item) * travelMuseumPoints(item), 0);
    const totalPoints = plushieSets * 10 + flowerSets * 10 + prehistoricSets * 25 + specialPoints;
    const missing = travelSetRows()
      .map((item) => ({ item, owned: countFor(item) }))
      .filter((row) => row.item.type !== 'Special')
      .sort((a, b) => a.owned - b.owned || a.item.name.localeCompare(b.item.name))[0];
    return {
      plushieSets,
      flowerSets,
      prehistoricSets,
      totalPoints,
      bottleneck: missing ? `${missing.item.name} (${missing.owned})` : ''
    };
  }

  function travelMuseumPoints(item) {
    if (!item) return 0;
    if (item.name === 'Meteorite Fragment') return 15;
    if (item.name === 'Patagonian Fossil') return 20;
    if (item.type === 'Prehistoric') return 25;
    if (item.type === 'Plushie' || item.type === 'Flower') return 10;
    return 0;
  }

  function effectiveTravelCarry() {
    const base = Math.max(1, parseNumber(state.utility.travelCarry || state.utility.travelCapacity || 1));
    return state.utility.travelTourismDay ? base * 2 : base;
  }

  function normalizeTravelCountryKey(value) {
    return String(value || '').toLowerCase().replace(/^uk$/, 'united kingdom').replace(/[^a-z]/g, '');
  }

  async function loadTravelYataData(force = false) {
    const cacheKey = toCacheKey('travelYata');
    const cached = await readJsonStorage(cacheKey, null);
    if (!force && cached && cached.fetchedAt && nowMs() - cached.fetchedAt < 5 * 60 * 1000) {
      state.travelYataData = cached;
      state.cacheInfo.travelYata = { fetchedAt: cached.fetchedAt, fromCache: true, stale: false };
      renderPanelPreservingScroll();
      return cached;
    }
    state.travelYataLoading = true;
    renderPanelPreservingScroll();
    try {
      const json = await httpGetJson('https://yata.yt/api/v1/travel/export/');
      const stocks = normalizeTravelYataStocks(json);
      const data = { stocks, fetchedAt: nowMs(), warning: '' };
      state.travelYataData = data;
      state.cacheInfo.travelYata = { fetchedAt: data.fetchedAt, fromCache: false, stale: false };
      await writeJsonStorage(cacheKey, data);
      return data;
    } catch (error) {
      const data = cached || { stocks: [], fetchedAt: 0, warning: '' };
      data.warning = `YATA travel stock could not load: ${friendlyError(error)}`;
      state.travelYataData = data;
      state.cacheInfo.travelYata = { fetchedAt: data.fetchedAt || 0, fromCache: !!cached, stale: !!cached };
      return data;
    } finally {
      state.travelYataLoading = false;
      renderPanelPreservingScroll();
    }
  }

  function normalizeTravelYataStocks(json) {
    const output = [];
    const catalogById = new Map(TRAVEL_ITEM_CATALOG.map((item) => [String(item.id), item]));
    Object.entries((json && json.stocks) || {}).forEach(([code, country]) => {
      const fallbackCountry = YATA_CITY_CODES[String(code).toLowerCase()] || country.country_name || code;
      ((country && country.stocks) || []).forEach((row) => {
        const catalog = catalogById.get(String(row.id || row.ID || ''));
        const name = String((row && row.name) || (catalog && catalog.name) || '').trim();
        if (!name) return;
        output.push({
          id: parseNumber(row.id || row.ID),
          name,
          country: catalog ? catalog.country : fallbackCountry,
          type: catalog ? catalog.type : 'Other',
          quantity: Math.max(0, Math.floor(parseNumber(row.quantity))),
          cost: Math.max(0, Math.round(parseNumber(row.cost)))
        });
      });
    });
    return output;
  }

  function travelSpeedIndex() {
    const tier = TRAVEL_SPEED_TIERS.find((item) => item.key === state.utility.travelSpeedTier) || TRAVEL_SPEED_TIERS[0];
    return tier.index;
  }

  function travelSpeedLabel() {
    const tier = TRAVEL_SPEED_TIERS.find((item) => item.key === state.utility.travelSpeedTier) || TRAVEL_SPEED_TIERS[0];
    return tier.label;
  }

  function travelOneWayHours(country) {
    const table = state.utility.travelHasBook ? TRAVEL_TIMES.book : TRAVEL_TIMES.noBook;
    const row = table[country] || table[String(country || '').replace(/^UK$/, 'United Kingdom')];
    return row ? row[travelSpeedIndex()] || row[0] : Math.max(1, parseNumber(state.utility.travelMinutes) / 120);
  }

  function formatTravelDuration(hours) {
    const minutes = Math.max(1, Math.round(parseNumber(hours) * 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
  }

  function travelItemAllowed(row) {
    const type = String(row.type || '').toLowerCase();
    if (type === 'plushie') return !!state.utility.travelIncludePlushies;
    if (type === 'flower') return !!state.utility.travelIncludeFlowers;
    if (type === 'prehistoric') return !!state.utility.travelIncludePrehistoric;
    if (type === 'special') return !!state.utility.travelIncludeSpecial;
    if (type === 'drug') return !!state.utility.travelIncludeDrugs;
    return false;
  }

  function buildTravelProfitRows() {
    const records = new Map(getKnownItemRecords().map((item) => [item.name.toLowerCase(), item]));
    const carry = effectiveTravelCarry();
    const risk = Math.max(0, parseNumber(state.utility.travelRiskCost));
    const data = state.travelYataData || { stocks: [] };
    return (data.stocks || [])
      .filter((row) => row.cost > 0 && row.quantity > 0 && travelItemAllowed(row))
      .map((row) => {
        const market = records.get(String(row.name || '').toLowerCase());
        const sell = market ? market.value : 0;
        const profitEach = sell - row.cost;
        const oneWayHours = travelOneWayHours(row.country);
        const roundHours = Math.max(0.1, oneWayHours * 2 + (90 / 3600));
        const tripProfit = profitEach * carry - risk;
        return {
          ...row,
          sell,
          profitEach,
          tripProfit,
          profitPerHour: tripProfit / roundHours,
          oneWayHours,
          roundHours,
          carry
        };
      })
      .filter((row) => row.sell > 0 && row.profitEach > 0)
      .sort((a, b) => b.profitPerHour - a.profitPerHour);
  }

  function scanTravelStatusFromPage() {
    const text = String(document.body && document.body.innerText ? document.body.innerText : '');
    const routeMatch = text.match(/\b([A-Z][A-Za-z ]{2,40})\s+to\s+(Torn|[A-Z][A-Za-z ]{2,40})\b/);
    const timerMatch = text.match(/\b(?:\d+d\s*)?(?:\d+h\s*)?\d{1,2}m(?:\s*\d{1,2}s)?\b/) || text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
    const route = routeMatch ? `${routeMatch[1].trim()} to ${routeMatch[2].trim()}` : '';
    const lower = route.toLowerCase();
    return {
      detected: !!(route || /traveling|destination|flight/i.test(text)),
      route,
      timer: timerMatch ? timerMatch[0] : '',
      direction: lower.includes('to torn') ? 'returning' : (route ? 'outbound' : '')
    };
  }

  async function useTravelItem(itemName) {
    const name = String(itemName || '').trim();
    if (!name) return;
    state.utility.travelItemName = name;
    await saveUtilityState();
    showFlash(`Travel item set: ${name}`);
    renderPanel();
  }

  async function clearTravelOwnedItems() {
    state.utility.travelOwnedItems = {};
    await saveUtilityState();
    showFlash('Travel set counts cleared.');
    renderPanel();
  }

  async function fillTravelOwnedOnes() {
    const current = { ...(state.utility.travelOwnedItems || {}) };
    travelSetRows().forEach((item) => {
      if (!parseNumber(current[item.name])) current[item.name] = 1;
    });
    state.utility.travelOwnedItems = current;
    await saveUtilityState();
    showFlash('Empty travel set counts set to 1.');
    renderPanel();
  }

