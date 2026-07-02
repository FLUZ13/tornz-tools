  function renderUtilityGuide(module) {
    return `
      <div class="fluz-guide-hero">
        <h3>${escapeHtml(module.title)} Manual</h3>
        <p>Read-only helper tools. FLUZ calculates, highlights, and reminds; you always make the final Torn action manually.</p>
      </div>
      <div class="fluz-guide-grid">
        ${(module.guide || []).map((line) => `<div class="fluz-guide-card"><p>${escapeHtml(line)}</p></div>`).join('')}
        ${moduleHasTargetTools(module) ? renderTargetFinderGuideCards() : ''}
        <div class="fluz-guide-card">
          <h4>Safety</h4>
          <p>No auto-buying, no auto-selling, no auto-price-changing, no attacks, no jail/hospital actions.</p>
          <p>Bulk pricing tools produce target numbers only. Copy and enter manually if you choose.</p>
        </div>
      </div>
    `;
  }

  function renderTargetFinderGuideCards() {
    return `
      <div class="fluz-guide-card wide">
        <h4>Finder setup</h4>
        <ol>
          <li>Save your Torn API key once in TORN'z Profile.</li>
          <li>Open Finder and read FFScouter's policy with the yellow Guide/policy buttons.</li>
          <li>Turn on Enable FFScouter features to allow manual register/search requests to ffscouter.com.</li>
          <li>Press Check FFScouter, then choose Leveling, Chain/Respect, War, or Custom.</li>
          <li>Press Search FFScouter to create an editable local list.</li>
          <li>Open Lists, remove bad rows, then add one target or the whole list to your Target Board.</li>
        </ol>
      </div>
      <div class="fluz-guide-card">
        <h4>Tags</h4>
        <p><span class="fluz-note-chip blue">level</span> Level/xp tags are blue.</p>
        <p><span class="fluz-note-chip green">chain</span> Chain/easy tags are green.</p>
        <p><span class="fluz-note-chip orange">war</span> War tags are orange.</p>
        <p><span class="fluz-note-chip red">enemy</span> Enemy/hard tags are red.</p>
        <p><span class="fluz-note-chip">unknown</span> Unmatched tags stay grey.</p>
      </div>
    `;
  }

  function renderMarketHiddenSettings() {
    const hidden = marketHiddenItemSet();
    const query = String(state.utility.marketSettingsSearch || '').trim().toLowerCase();
    const records = sortedAllMarketItems(getKnownItemRecords()
      .filter((item) => !query || `${item.name} ${item.id} ${item.category || ''}`.toLowerCase().includes(query)));
    const hiddenCount = records.filter((item) => hidden.has(String(item.id))).length;
    const page = getMarketDatabasePage(records);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Market item database</span><span class="fluz-muted">${hiddenCount} hidden here / ${hidden.size} total</span></div>
        <div class="fluz-form-grid">
          <label>Search item
            <input type="text" data-utility-setting="marketSettingsSearch" value="${escapeHtml(state.utility.marketSettingsSearch || '')}" placeholder="Cell Phone, Xanax, Medical, ID...">
          </label>
        </div>
        <p class="fluz-muted">Hidden items are excluded from Market Listings and all-item Bazaar scans. Showing ${escapeHtml(String(records.length))} matching items, ${escapeHtml(String(MARKET_DATABASE_PAGE_SIZE))} per page.</p>
        ${renderMarketFilterPresetControl()}
        ${renderMarketCategoryFilter()}
        ${renderMarketValueLimitControl()}
        ${renderMarketDatabasePager(page)}
        <div class="fluz-table">
          <div class="fluz-market-bazaar-row is-tight is-head">
            ${renderMarketDatabaseSortHeader('name', 'Item')}
            ${renderMarketDatabaseSortHeader('category', 'Type')}
            ${renderMarketDatabaseSortHeader('value', 'Value')}
            ${renderMarketDatabaseSortHeader('id', 'ID')}
            ${renderMarketDatabaseSortHeader('hidden', 'Status')}
          </div>
          ${page.rows.map((item) => {
            const isHidden = hidden.has(String(item.id));
            return `
            <div class="fluz-market-bazaar-row is-tight">
              <b title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</b>
              <div title="${escapeHtml(item.category || 'Other')}">${escapeHtml(item.category || 'Other')}</div>
              <div>${formatMoney(item.value)}</div>
              <div>#${escapeHtml(item.id)}</div>
              <div><button class="fluz-button ${isHidden ? 'primary' : 'danger'}" data-action="${isHidden ? 'unhide-market-item' : 'hide-market-item'}" data-item-id="${escapeHtml(item.id)}">${isHidden ? 'Unhide' : 'Hide'}</button></div>
            </div>
          `;
          }).join('') || '<div class="fluz-card compact">No item database rows matched.</div>'}
        </div>
        ${renderMarketDatabasePager(page)}
      </div>
    `;
  }

  function renderUtilitySettings(module) {
    if (!moduleHasUtilitySettings(module)) {
      return '<div class="fluz-card">No separate settings for this tool yet.</div>';
    }
    if (module.key === 'itemmarket' || module.key === 'bazaar') {
      const feeKey = module.key === 'itemmarket' ? state.utility.itemmarketFeeKey : 'bazaar';
      return `
        <div class="fluz-guide-hero">
          <h3>${escapeHtml(module.title)} Settings</h3>
          <p>Persistent market defaults for manual price planning.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Market pricing</div>
          <div class="fluz-form-grid">
            <label>Fallback profit %
              <input type="number" step="0.1" data-utility-setting="percentChange" value="${escapeHtml(state.utility.percentChange)}">
            </label>
            ${module.key === 'itemmarket' ? `
              <label>Fee mode
                <select data-utility-setting="itemmarketFeeKey">
                  ${Object.entries(MARKET_FEES).map(([key, fee]) => `<option value="${escapeHtml(key)}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(fee.label)} (${escapeHtml(String(fee.feePct))}%)</option>`).join('')}
                </select>
              </label>
            ` : `
              <label>Fee mode
                <input type="text" value="Bazaar (0%)" disabled>
              </label>
            `}
          </div>
          <p class="fluz-muted">${escapeHtml((MARKET_FEES[feeKey] || MARKET_FEES.bazaar).note)}</p>
        </div>
        ${module.key === 'itemmarket' ? renderMarketHiddenSettings() : ''}
      `;
    }
    if (moduleHasTargetTools(module) || (Array.isArray(module.tools) && module.tools.includes('timers')) || (Array.isArray(module.tabs) && module.tabs.includes('timers'))) {
      return `
        <div class="fluz-guide-hero">
          <h3>${escapeHtml(module.title)} Settings</h3>
          <p>Alert behavior for manual timers and saved target readiness.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title"><span>Manual timer alarm</span><span class="fluz-muted">always on</span></div>
          <div class="fluz-form-grid">
            <label>Tone
              <select data-utility-setting="timerAlertTone">
                <option value="soft" ${state.utility.timerAlertTone === 'soft' ? 'selected' : ''}>Soft</option>
                <option value="standard" ${(state.utility.timerAlertTone || 'standard') === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="urgent" ${state.utility.timerAlertTone === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </label>
            <label>Volume
              <input type="range" min="0" max="100" step="1" data-utility-setting="timerAlertVolume" value="${escapeHtml(state.utility.timerAlertVolume ?? 55)}">
            </label>
            <label>Volume %
              <input type="number" min="0" max="100" step="1" data-utility-setting="timerAlertVolume" value="${escapeHtml(state.utility.timerAlertVolume ?? 55)}">
            </label>
            <label>&nbsp;
              <button class="fluz-button primary" data-action="test-utility-alert">Test sound</button>
            </label>
          </div>
          <p class="fluz-muted">Manual timers always alert when they reach zero. Lower the volume or choose Soft if it is too aggressive.</p>
        </div>
        ${moduleHasTargetTools(module) ? `
        <div class="fluz-card">
          <div class="fluz-section-title"><span>Target alerts</span><span class="fluz-muted">ready status</span></div>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="targetSoundAlerts" ${state.utility.targetSoundAlerts ? 'checked' : ''}> Play sound when a saved target becomes ready.</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="targetDesktopAlerts" ${state.utility.targetDesktopAlerts ? 'checked' : ''}> Show desktop notification when a saved target becomes ready.</label>
          <p class="fluz-muted">These alerts only fire for your saved Target Board rows when status changes back to Okay. No attacks or Torn actions are clicked.</p>
        </div>
        ` : ''}
      `;
    }
    if (module.key === 'crimes') {
      return `
        <div class="fluz-guide-hero">
          <h3>Crime Settings</h3>
          <p>Read-only defaults for crime labels and helper filters.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Pickpocket labels</div>
          <div class="fluz-form-grid">
            <label>Minimum CS
              <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMinCs" value="${escapeHtml(state.utility.pickpocketMinCs)}">
            </label>
            <label>Maximum CS
              <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMaxCs" value="${escapeHtml(state.utility.pickpocketMaxCs)}">
            </label>
          </div>
          <p class="fluz-muted">Targets outside this range are only visually de-emphasized. You still choose every crime manually.</p>
        </div>
      `;
    }
    if (module.key === 'travel') {
      return `
        <div class="fluz-guide-hero">
          <h3>Travel Settings</h3>
          <p>Capacity, speed, book, and live-stock filters used by travel profit estimates.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Flight assumptions</div>
          <div class="fluz-form-grid">
            <label>Capacity
              <input type="number" min="1" data-utility-setting="travelCarry" value="${escapeHtml(state.utility.travelCarry || state.utility.travelCapacity)}">
            </label>
            <label>Flight speed
              <select data-utility-setting="travelSpeedTier">
                ${TRAVEL_SPEED_TIERS.map((tier) => `<option value="${escapeHtml(tier.key)}" ${state.utility.travelSpeedTier === tier.key ? 'selected' : ''}>${escapeHtml(tier.label)}</option>`).join('')}
              </select>
            </label>
            <label>Point price
              <input type="number" min="0" data-utility-setting="travelPointsPrice" value="${escapeHtml(state.utility.travelPointsPrice)}">
            </label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelHasBook" ${state.utility.travelHasBook ? 'checked' : ''}> Travel book</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelMuseumDay" ${state.utility.travelMuseumDay ? 'checked' : ''}> Museum Day +10%</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelTourismDay" ${state.utility.travelTourismDay ? 'checked' : ''}> Tourism carry x2</label>
          </div>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Live-stock filters</div>
          <div class="fluz-row-actions" style="justify-content:flex-start;">
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePlushies" ${state.utility.travelIncludePlushies ? 'checked' : ''}> Plushies</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeFlowers" ${state.utility.travelIncludeFlowers ? 'checked' : ''}> Flowers</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePrehistoric" ${state.utility.travelIncludePrehistoric ? 'checked' : ''}> Points</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeSpecial" ${state.utility.travelIncludeSpecial ? 'checked' : ''}> Special</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeDrugs" ${state.utility.travelIncludeDrugs ? 'checked' : ''}> Xanax</label>
          </div>
        </div>
      `;
    }
    if (module.key === 'missions') {
      return `
        <div class="fluz-guide-hero">
          <h3>Mission Settings</h3>
          <p>Persistent benchmark values for manual reward comparison.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Reward benchmark</div>
          <div class="fluz-form-grid">
            <label>Manual credit value
              <input type="number" min="0" data-utility-setting="missionTokenValue" value="${escapeHtml(state.utility.missionTokenValue)}">
            </label>
          </div>
          <p class="fluz-muted">Used when the visible reward does not give a clean implied value.</p>
        </div>
      `;
    }
    if (Array.isArray(module.tools) && module.tools.includes('addictionAdvisor')) {
      return `
        <div class="fluz-guide-hero">
          <h3>Addiction Advisor Settings</h3>
          <p>Manual thresholds for education risk and rehab planning.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Risk thresholds</div>
          <div class="fluz-form-grid">
            <label>Education risk %
              <input type="number" min="0" max="100" step="0.1" data-utility-setting="addictionEduRiskPct" value="${escapeHtml(state.utility.addictionEduRiskPct)}">
            </label>
            <label>Rehab target %
              <input type="number" min="0" max="100" step="0.1" data-utility-setting="addictionRehabTargetPct" value="${escapeHtml(state.utility.addictionRehabTargetPct)}">
            </label>
            <label>Learned drop / rehab %
              <input type="number" min="0" max="100" step="0.1" data-utility-setting="addictionLearnedDropPct" value="${escapeHtml(state.utility.addictionLearnedDropPct)}">
            </label>
            <label>Manual rehabs done
              <input type="number" min="0" step="1" data-utility-setting="addictionManualRehabsDone" value="${escapeHtml(state.utility.addictionManualRehabsDone)}">
            </label>
            <label>Xanax AP estimate
              <input type="number" min="0" step="0.01" data-utility-setting="addictionXanaxAp" value="${escapeHtml(state.utility.addictionXanaxAp)}">
            </label>
            <label>Natural decay AP/day
              <input type="number" min="0" step="0.1" data-utility-setting="addictionNaturalDecayAp" value="${escapeHtml(state.utility.addictionNaturalDecayAp)}">
            </label>
            <label>Manual company penalty
              <input type="number" step="1" data-utility-setting="addictionCompanyPenalty" value="${escapeHtml(state.utility.addictionCompanyPenalty)}">
            </label>
            <label>Hot Turkey days
              <input type="number" min="0" step="1" data-utility-setting="addictionHotTurkeyDays" value="${escapeHtml(state.utility.addictionHotTurkeyDays)}">
            </label>
            <label>Hot Turkey OD estimate
              <input type="number" min="0" step="1" data-utility-setting="addictionHotTurkeyOds" value="${escapeHtml(state.utility.addictionHotTurkeyOds)}">
            </label>
            <label>Milk Sober removal %
              <input type="number" min="0" max="100" step="1" data-utility-setting="addictionMilkSoberRate" value="${escapeHtml(state.utility.addictionMilkSoberRate)}">
            </label>
          </div>
          <p class="fluz-muted">Learned drop is optional. If you leave it at 0, the helper will show "do 1 rehab, recheck" instead of pretending it knows your exact rehab count.</p>
        </div>
      `;
    }
    return '<div class="fluz-card">No separate settings for this tool yet.</div>';
  }

  function renderUtilityLinks(module) {
    const itemLinks = ['Xanax', 'Beer', 'Ecstasy', 'Erotic DVD', 'Feathery Hotel Coupon', 'Can of Munster', 'First Aid Kit', 'Morphine', 'Lockpick', 'Laptop'];
    return `
      <div class="fluz-section-title"><span>Useful links</span><span class="fluz-muted">${escapeHtml(module.short)}</span></div>
      <div class="fluz-card">
        <div class="fluz-link-grid">
          ${UTILITY_LINKS.map((link) => `<a class="fluz-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Quick item market links</div>
        <div class="fluz-link-grid">
          ${itemLinks.map((name) => `<a class="fluz-button" href="${escapeHtml(itemMarketUrl(name))}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`).join('')}
        </div>
      </div>
    `;
  }

  function renderUtilityTimers(module) {
    const timers = getUtilityTimers(module.key);
    return `
      <div class="fluz-section-title"><span>${escapeHtml(module.short)} timers</span><span class="fluz-muted">${timers.length} saved</span></div>
      <div class="fluz-card">
        <div class="fluz-form-grid">
          <label>Label / target
            <input type="text" data-utility-setting="timerLabel" value="${escapeHtml(state.utility.timerLabel || '')}" placeholder="Player, faction, target...">
          </label>
          <label>Minutes from now
            <input type="number" min="1" data-utility-setting="timerMinutes" value="${escapeHtml(state.utility.timerMinutes || 30)}">
          </label>
          <label>Note
            <input type="text" data-utility-setting="timerNote" value="${escapeHtml(state.utility.timerNote || '')}" placeholder="Hosp exit, chain, bust, retal...">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="add-utility-timer">Add timer</button>
          </label>
        </div>
      </div>
      <div class="fluz-table">
        ${timers.map((timer) => renderUtilityTimerRow(timer)).join('') || '<div class="fluz-card">No timers saved for this page yet.</div>'}
      </div>
    `;
  }

  function renderUtilityTimerRow(timer) {
    const remainingMs = Math.max(0, timer.dueAt - nowMs());
    const mins = Math.ceil(remainingMs / 60000);
    return `
      <div class="fluz-row fluz-market-row">
        <div class="fluz-cell-main">${escapeHtml(timer.label)}</div>
        <div>${mins <= 0 ? `<span class="fluz-neg">${timer.alerted ? 'Alerted' : 'Ready'}</span>` : `${mins}m`}</div>
        <div>${escapeHtml(timer.note || '')}</div>
        <div>${new Date(timer.dueAt).toLocaleTimeString()}</div>
        <div><button class="fluz-icon-btn danger" title="Delete timer" data-action="delete-utility-timer" data-timer-id="${escapeHtml(timer.id)}">${iconSvg('trash')}</button></div>
      </div>
    `;
  }

  function scanVisibleMoneyValues() {
    const text = (document.body ? document.body.innerText : '') || '';
    const matches = text.match(/\$[\d,.]+[kmbt]?/gi) || [];
    const seen = new Set();
    return matches
      .map(parseMoneyText)
      .filter((value) => value > 0)
      .filter((value) => {
        const key = Math.round(value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b - a);
  }

  function scanVisibleMarketItemRows() {
    if (!document.body) return [];
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    const rowNodes = Array.from(new Set(Array.from(document.querySelectorAll('tr, li, div, [class*="row"], [class*="item"]'))));
    const candidates = [];
    const seen = new Set();

    rowNodes.forEach((node) => {
      if (!node || !node.isConnected || node.closest(`#${APP.id}, #${APP.id}-modal`)) return;
      const priceInput = getMarketRowPriceInput(node);
      if (!priceInput) return;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (text.length < 4 || text.length > 220) return;
      const item = findKnownItemInText(text, known);
      if (!item) return;
      const name = item.name;
      if (!looksLikeMarketItemRow(text, name, priceInput)) return;

      const visiblePrice = extractFirstMoneyFromText(text);
      const price = visiblePrice > 0 ? visiblePrice : parseNumber(item && item.value);
      if (price <= 0) return;
      const quantity = extractMarketItemQuantity(text, name);
      const key = `${name.toLowerCase()}|${quantity}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ name, price, quantity, node, priceInput });
    });

    const childNodes = new Set(candidates.map((candidate) => candidate.node));
    return candidates
      .filter((candidate) => !Array.from(childNodes).some((other) => other !== candidate.node && candidate.node.contains(other)))
      .slice(0, 28);
  }

  function findKnownItemInText(text, knownItems = getKnownItemRecords()) {
    const clean = cleanBookieText(text);
    const lower = clean.toLowerCase();
    return (knownItems || []).find((item) => item.name && lower.includes(item.name.toLowerCase())) || null;
  }

  function looksLikeMarketItemRow(text, itemName = '', priceInput = null) {
    const clean = cleanBookieText(text);
    const hasMoney = /\$[\d,.]+[kmbt]?/i.test(clean);
    const hasQty = itemName && new RegExp(`${escapeRegExp(itemName)}\\s*x\\s*[\\d,]+`, 'i').test(clean);
    if (hasMoney && (hasQty || priceInput)) return true;
    if (hasMoney && itemName && clean.toLowerCase().includes(itemName.toLowerCase())) return true;
    if (priceInput && itemName && /\b(qty|quantity|price)\b/i.test(clean)) return true;
    return false;
  }

  function getMarketRowPriceInput(row) {
    const inputs = Array.from(row.querySelectorAll('input'))
      .filter(isNativeFillInput)
      .map((input) => ({ input, rect: input.getBoundingClientRect() }))
      .filter((item) => item.rect.width > 0 && item.rect.height > 0)
      .sort((a, b) => b.rect.left - a.rect.left);
    return inputs.length ? inputs[0].input : null;
  }

  function getMarketRowContainer(input) {
    let node = input;
    for (let depth = 0; node && depth < 8; depth += 1) {
      node = node.parentElement;
      if (!node || node.closest(`#${APP.id}, #${APP.id}-modal`)) return null;
      const text = cleanBookieText(node.innerText || node.textContent || '');
      const inputs = Array.from(node.querySelectorAll('input')).filter(isNativeFillInput);
      if (/\$[\d,.]+[kmbt]?/i.test(text) && inputs.length >= 1 && text.length < 220) return node;
    }
    return null;
  }

  function extractFirstMoneyFromText(text) {
    const match = String(text || '').match(/\$[\d,.]+[kmbt]?/i);
    return match ? parseMoneyText(match[0]) : 0;
  }

  function extractMarketItemName(text) {
    let beforeMoney = String(text || '').split(/\$[\d,.]+[kmbt]?/i)[0] || '';
    beforeMoney = beforeMoney
      .replace(/\b(which items would you like to add to market|you are adding|clear all|add to market)\b/ig, ' ')
      .replace(/\b(rrp|qty|quantity|price|market value|item market|bazaar)\b/ig, ' ')
      .replace(/[^\w\s'().-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const withQty = beforeMoney.match(/([A-Za-z][A-Za-z0-9'(). -]{1,60}?)\s+x\s*[\d,]+$/i);
    if (withQty) return cleanBookieText(withQty[1]).slice(0, 56);
    const match = beforeMoney.match(/([A-Za-z][A-Za-z0-9'(). -]{1,56})$/i);
    return cleanBookieText(match ? match[1] : beforeMoney).slice(0, 56);
  }

  function extractMarketItemQuantity(text, itemName) {
    const escapedName = escapeRegExp(itemName);
    const patterns = [
      new RegExp(`${escapedName}\\s*x\\s*([\\d,]+)`, 'i'),
      /\bx\s*([\d,]+)\b/i,
      /\bqty\s*:?\s*([\d,]+)/i,
      /\bquantity\s*:?\s*([\d,]+)/i
    ];
    for (const pattern of patterns) {
      const match = String(text || '').match(pattern);
      const quantity = match ? parseNumber(match[1]) : 0;
      if (quantity > 0 && quantity < 100000000) return Math.round(quantity);
    }
    return 1;
  }

  function parseMoneyText(value) {
    const raw = String(value || '').replace(/\$/g, '').replace(/,/g, '').trim().toLowerCase();
    const multiplier = raw.endsWith('t') ? 1e12 : raw.endsWith('b') ? 1e9 : raw.endsWith('m') ? 1e6 : raw.endsWith('k') ? 1e3 : 1;
    const number = parseFloat(raw.replace(/[kmbt]$/, ''));
    return Number.isFinite(number) ? number * multiplier : 0;
  }

