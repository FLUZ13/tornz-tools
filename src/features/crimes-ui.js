  function renderCrimePlanner() {
    return `
      ${renderCrimeRouteBoard()}
      ${renderCrimeProfitabilityPanel()}
      ${renderCrimeMoraleCard()}
      ${renderCrackingHelper()}
      ${renderPickpocketPlanner()}
      ${renderBootleggingPlanner()}
    `;
  }

  function renderCrimeRouteBoard() {
    if (!isCrimesHubPage()) return '';
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Crime routes</span><span class="fluz-muted">quick links</span></div>
        <div class="fluz-crime-route-grid">
          ${CRIME_ROUTE_LABELS.map(([slug, label, hint]) => `
            <a class="fluz-crime-route" href="https://www.torn.com/page.php?sid=crimes#/${escapeHtml(slug)}">
              <b>${escapeHtml(label)}</b>
              <span>${escapeHtml(hint)}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderPickpocketPlanner() {
    if (!isPickpocketCrimePage()) return '';
    const stats = state.pickpocketStats || { colored: 0, visible: 0, hidden: 0, skillLevel: 1, updatedAt: 0 };
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Pickpocket helper</span><span class="fluz-muted">manual assist</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(stats.colored || 0))}</b><em>labeled</em></span>
          <span><b>${escapeHtml(String(stats.visible || 0))}</b><em>visible</em></span>
          <span><b>${escapeHtml(String(stats.hidden || 0))}</b><em>hidden</em></span>
          <span><b>${escapeHtml(String(Math.floor(parseNumber(stats.skillLevel || 1))))}</b><em>skill</em></span>
          <span><b>${stats.updatedAt ? escapeHtml(new Date(stats.updatedAt).toLocaleTimeString()) : '--'}</b><em>updated</em></span>
        </div>
        <div class="fluz-form-grid">
          <label>Min CS
            <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMinCs" value="${escapeHtml(state.utility.pickpocketMinCs)}">
          </label>
          <label>Max CS
            <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMaxCs" value="${escapeHtml(state.utility.pickpocketMaxCs)}">
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button" data-action="mark-pickpocket-targets">Relabel targets</button>
        </div>
        <p class="fluz-muted">Colors target type, build, activity, and the button area by estimated difficulty. It can hide targets outside your CS range, but it never clicks or starts the crime.</p>
      </div>
    `;
  }

  function renderCrimeMoraleCard() {
    if (!state.crimeMorale) {
      const hub = isCrimesHubPage();
      const status = state.crimeMoraleStatus || (hub ? 'open crime' : 'waiting');
      return `
        <div class="fluz-card compact">
          <div class="fluz-section-title"><span>Crime morale</span><span class="fluz-muted">${escapeHtml(status)}</span></div>
          <div class="fluz-mini-metrics fluz-bootleg-metrics">
            <span><b>--</b><em>morale</em></span>
            <span><b>--</b><em>demoralized</em></span>
            <span><b>${hub ? 'specific crime' : 'crimesData'}</b><em>source</em></span>
          </div>
          ${hub ? '' : '<div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;"><button class="fluz-button" data-action="refresh-crime-morale">Refresh morale</button></div>'}
          <p class="fluz-muted">${hub ? 'The Crimes hub usually does not load morale data. Open Search for Cash, Bootlegging, or another specific crime so Torn sends crimesData, then this card will remember the last value.' : 'Morale is read from Torn\'s demoralization value after the crime page loads. Lower morale means higher demoralization pressure, so treat it as a caution signal.'}</p>
        </div>
      `;
    }
    const morale = clamp(parseNumber(state.crimeMorale.morale), 0, 100);
    const tone = morale >= 80 ? 'good' : morale >= 50 ? 'warn' : 'bad';
    const note = morale >= 80
      ? 'Healthy morale. No obvious demoralization warning from the loaded crime data.'
      : morale >= 50
        ? 'Moderate morale. Be more selective if crime results start feeling worse.'
        : 'Low morale. Consider safer crime choices until it recovers.';
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Crime morale</span><span class="fluz-muted">${escapeHtml(state.crimeMorale.updatedText || 'live')}</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b class="${tone === 'bad' ? 'fluz-neg' : 'fluz-pos'}">${escapeHtml(`${Math.round(morale)}%`)}</b><em>morale</em></span>
          <span><b>${escapeHtml(`${Math.round(100 - morale)}%`)}</b><em>demoralized</em></span>
          <span><b>${escapeHtml(state.crimeMorale.label || 'Crime 2.0')}</b><em>source</em></span>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button" data-action="refresh-crime-morale">Refresh morale</button>
        </div>
        <p class="fluz-muted">${escapeHtml(note)}</p>
      </div>
    `;
  }

  function renderCrimeProfitabilityPanel() {
    const rows = state.crimeProfitData && Array.isArray(state.crimeProfitData.rows) ? state.crimeProfitData.rows : [];
    const visible = state.crimeProfitVisible || {};
    const hub = isCrimesHubPage();
    const age = state.crimeProfitData && state.crimeProfitData.fetchedAt
      ? `${Math.round((nowMs() - state.crimeProfitData.fetchedAt) / 60000)}m old`
      : 'not loaded';
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Crime profitability</span><span class="fluz-muted">${escapeHtml(age)}</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(rows.length))}</b><em>targets</em></span>
          <span><b>${state.crimeProfitLoading ? 'Loading' : 'Ready'}</b><em>sheet</em></span>
          <span><b>${escapeHtml(String(visible.count || 0))}</b><em>visible</em></span>
          <span><b>${visible.bestValue == null ? '--' : escapeHtml(formatMoney(visible.bestValue))}</b><em>best $/N</em></span>
          <span><b>${escapeHtml(visible.bestLabel || '--')}</b><em>best option</em></span>
        </div>
        ${state.crimeProfitData && state.crimeProfitData.warning ? `<p class="fluz-muted">${escapeHtml(state.crimeProfitData.warning)}</p>` : `<p class="fluz-muted">${hub ? 'Open a specific crime to show visible $/N chips. The Crimes hub only lists crime categories, so there are no target rows to label here.' : 'Adds read-only $/N chips to visible crime options using the public Crime Profitability Index. No crime actions are clicked.'}</p>`}
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button" data-action="refresh-crime-profitability">Refresh $/N data</button>
          <button class="fluz-button" data-action="mark-crime-profitability" ${hub ? 'disabled' : ''}>Relabel visible crimes</button>
        </div>
      </div>
    `;
  }

  function renderCrackingHelper() {
    if (!isCrackingCrimePage()) return '';
    const stats = state.crackingStats || {};
    const loadedWords = Object.values(stats).reduce((sum, value) => sum + parseNumber(value), 0);
    const status = state.crackingLoading ? 'loading' : (state.crackingStatus || 'local');
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Cracking helper</span><span class="fluz-muted">manual suggestions</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(Math.round(loadedWords)))}</b><em>local words</em></span>
          <span><b>${escapeHtml(String(state.utility.crackingMaxSuggestions || 8))}</b><em>shown</em></span>
          <span><b>${escapeHtml(status)}</b><em>status</em></span>
        </div>
        <div class="fluz-form-grid">
          <label>Suggestions
            <input type="number" min="1" max="20" step="1" data-utility-setting="crackingMaxSuggestions" value="${escapeHtml(state.utility.crackingMaxSuggestions || 8)}">
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="crackingShowComplete" ${state.utility.crackingShowComplete ? 'checked' : ''}> Show completed rows</label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" data-action="scan-cracking-helper">Apply suggestions</button>
          <button class="fluz-button" data-action="load-cracking-wordlist" ${state.crackingLoading ? 'disabled' : ''}>Load public wordlist</button>
          <button class="fluz-button danger" data-action="clear-cracking-wordlist">Clear local words</button>
        </div>
        <p class="fluz-muted">Reads visible cracking patterns and shows copy-only word suggestions. The public wordlist is downloaded only when you press Load, and no cracked words are uploaded anywhere.</p>
      </div>
    `;
  }

  function renderBootleggingPlanner() {
    if (!isBootleggingCrimePage()) return '';

    if (!state.bootleggingData) ensureBootleggingDataFromVisiblePage();
    const rows = buildBootleggingRows(state.bootleggingData);
    if (!rows.length) {
      return `
        <div class="fluz-card">
          <div class="fluz-section-title"><span>Bootlegging balance</span><span class="fluz-muted">waiting for Torn data</span></div>
          <div class="fluz-row-actions" style="justify-content:flex-start;margin:7px 0;">
            <button class="fluz-button primary" data-action="refresh-bootlegging-data">Refresh bootlegging</button>
            <button class="fluz-button" data-action="mark-bootlegging-genres">Relabel buttons</button>
          </div>
          <p class="fluz-muted">Stay on the Bootlegging crime page until Torn loads the crimesData response, then press Refresh if needed. This helper only reads page data and never auto-selects or starts a crime.</p>
        </div>
      `;
    }

    const best = rows[0];
    const totalHave = rows.reduce((sum, row) => sum + row.have, 0);
    const totalSold = rows.reduce((sum, row) => sum + row.sold, 0);
    const queued = parseNumber(state.bootleggingData && state.bootleggingData.queued);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Bootlegging balance</span><span class="fluz-muted">manual assist</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(best.name)}</b><em>suggested genre</em></span>
          <span><b>${escapeHtml(String(Math.max(0, best.diff)))}</b><em>copies short</em></span>
          <span><b>${escapeHtml(String(totalHave))}</b><em>held+queue</em></span>
          <span><b>${escapeHtml(String(totalSold))}</b><em>sold</em></span>
          <span><b>${escapeHtml(String(queued))}</b><em>queued</em></span>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" data-action="select-bootlegging-genre" data-genre="${escapeHtml(best.name)}">Select suggested</button>
          <button class="fluz-button" data-action="mark-bootlegging-genres">Relabel buttons</button>
          <button class="fluz-button" data-action="refresh-bootlegging-data">Refresh data</button>
          <a class="fluz-button" href="https://www.torn.com/page.php?sid=crimes#/bootlegging">Open bootlegging</a>
        </div>
        <p class="fluz-muted">Suggestion balances your CD stock against your sold genre mix${state.bootleggingData && state.bootleggingData.visibleOnly ? ', or visible stock counts when Torn data is unavailable' : ''}. Button labels are visual only; Select suggested only chooses the genre, and you still manually start/confirm the crime.</p>
      </div>
      <div class="fluz-market-head fluz-bootleg-head">
        <div>Genre</div><div>Have</div><div>Sold</div><div>Target</div><div>Need</div>
      </div>
      <div class="fluz-table">
        ${rows.map((row) => `
          <div class="fluz-row fluz-market-row fluz-bootleg-row ${row.name === best.name ? 'is-best' : ''}">
            <div class="fluz-cell-main">${escapeHtml(row.name)}</div>
            <div>${escapeHtml(String(row.have))}</div>
            <div>${escapeHtml(String(row.sold))}</div>
            <div>${escapeHtml(String(row.target))}</div>
            <div class="${row.diff > 0 ? 'fluz-neg' : 'fluz-pos'}">${escapeHtml(row.diff > 0 ? `+${row.diff}` : 'ok')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function isBootleggingCrimePage() {
    const url = currentUrl();
    return /sid=crimes/i.test(url.search || url.href) && /bootlegging/i.test(url.hash || url.href);
  }

  function isPickpocketCrimePage() {
    const url = currentUrl();
    return /sid=crimes/i.test(url.search || url.href) && /pickpocketing/i.test(url.hash || url.href);
  }

  function isCrimesHubPage() {
    const url = currentUrl();
    const hash = String(url.hash || '');
    return /sid=crimes/i.test(url.search || url.href) && (!hash || hash === '#' || hash === '#/');
  }

  function buildBootleggingRows(data) {
    if (!data || !data.have || !data.sold) return [];
    const totalHave = BOOTLEGGING_GENRES.reduce((sum, genre) => sum + parseNumber(data.have[genre.id]), 0);
    const totalSold = BOOTLEGGING_GENRES.reduce((sum, genre) => sum + parseNumber(data.sold[genre.id]), 0);
    if (totalHave <= 0) return [];
    return BOOTLEGGING_GENRES.map((genre) => {
      const have = parseNumber(data.have[genre.id]);
      const sold = parseNumber(data.sold[genre.id]);
      const target = totalSold > 0
        ? Math.floor((sold / totalSold) * totalHave)
        : Math.floor(totalHave / BOOTLEGGING_GENRES.length);
      return {
        ...genre,
        have,
        sold,
        target,
        diff: target - have
      };
    }).sort((a, b) => b.diff - a.diff || a.have - b.have || a.name.localeCompare(b.name));
  }

  function normalizeBootleggingCrimesData(payload) {
    const db = payload && payload.DB ? payload.DB : null;
    if (!db) return null;
    const crimeType = String((db.currentUserStatistics && db.currentUserStatistics[1] && db.currentUserStatistics[1].value) || db.currentCrime || '').trim();
    const rawHave = (db.generalInfo && db.generalInfo.CDs) || findBootleggingStockObject(payload) || {};
    const currentUserStats = db.currentUserStats || findBootleggingSoldObject(payload) || {};
    const looksLikeBootlegging = /counterfeit|bootleg/i.test(crimeType)
      || hasBootleggingStockKeys(rawHave)
      || Object.keys(currentUserStats).some((key) => /^CDType\d+Sold$/i.test(key));
    if (!looksLikeBootlegging) return null;

    const have = {};
    const sold = {};
    BOOTLEGGING_GENRES.forEach((genre) => {
      have[genre.id] = parseNumber(rawHave[genre.id] ?? rawHave[genre.name] ?? 0);
      sold[genre.id] = parseNumber(currentUserStats[`CDType${genre.id}Sold`] ?? currentUserStats[`cdType${genre.id}Sold`] ?? 0);
    });

    const queue = db.crimesByType && db.crimesByType['0'] && db.crimesByType['0'].additionalInfo
      ? db.crimesByType['0'].additionalInfo.currentQueue || []
      : [];
    (Array.isArray(queue) ? queue : []).forEach((id) => {
      const key = String(id);
      if (Object.prototype.hasOwnProperty.call(have, key)) have[key] += 1;
    });

    return {
      have,
      sold,
      queued: Array.isArray(queue) ? queue.length : 0,
      updatedAt: nowMs()
    };
  }

  function hasBootleggingStockKeys(value) {
    if (!value || typeof value !== 'object') return false;
    let matches = 0;
    BOOTLEGGING_GENRES.forEach((genre) => {
      if (value[genre.id] != null || value[genre.name] != null) matches += 1;
    });
    return matches >= 3;
  }

  function findBootleggingStockObject(value, depth = 0) {
    if (!value || depth > 7 || typeof value !== 'object') return null;
    if (hasBootleggingStockKeys(value)) return value;
    const direct = value.CDs || value.cds || value.cdStock || value.cdstock;
    if (hasBootleggingStockKeys(direct)) return direct;
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const found = findBootleggingStockObject(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function findBootleggingSoldObject(value, depth = 0) {
    if (!value || depth > 7 || typeof value !== 'object') return null;
    const keys = Object.keys(value);
    if (keys.some((key) => /^CDType\d+Sold$/i.test(key))) return value;
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const found = findBootleggingSoldObject(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function getBootleggingGenreFromText(text) {
    const clean = cleanBookieText(text || '');
    const matches = BOOTLEGGING_GENRES.filter((item) => new RegExp(`\\b${escapeRegExp(item.name)}\\b`, 'i').test(clean));
    return matches.length === 1 ? matches[0] : null;
  }

  function extractBootleggingVisibleCount(node, genre) {
    const text = cleanBookieText(node ? node.textContent : '');
    const afterName = text.split(new RegExp(`\\b${escapeRegExp(genre.name)}\\b`, 'i')).pop() || text;
    const numbers = (afterName.match(/\b\d{1,6}\b/g) || []).map(parseNumber).filter((value) => value >= 0);
    return numbers.length ? numbers[numbers.length - 1] : 0;
  }

  function findBootleggingGenreHost(node, genre) {
    let host = node.closest('button, [role="button"], [class^="genreStock"], [class*=" genreStock"], [class*="genre"], [class*="Genre"]') || node;
    let cursor = node;
    for (let depth = 0; depth < 4 && cursor && cursor.parentElement && cursor.parentElement !== document.body; depth += 1) {
      const parent = cursor.parentElement;
      if (parent.closest(`#${APP.id}, #${APP.id}-modal`)) break;
      const text = cleanBookieText(parent.textContent || '');
      if (new RegExp(`\\b${escapeRegExp(genre.name)}\\b`, 'i').test(text) && /\d/.test(text) && text.length < 220) {
        host = parent;
      }
      cursor = parent;
    }
    return host;
  }

  function ensureBootleggingDataFromVisiblePage() {
    if (!isBootleggingCrimePage()) return false;
    const buttons = getBootleggingGenreButtons();
    if (buttons.length < 3) return false;
    const have = {};
    const sold = {};
    BOOTLEGGING_GENRES.forEach((genre) => {
      const match = buttons.find((item) => item.genre.id === genre.id);
      have[genre.id] = match ? extractBootleggingVisibleCount(match.button, genre) : 0;
      sold[genre.id] = 0;
    });
    if (BOOTLEGGING_GENRES.reduce((sum, genre) => sum + have[genre.id], 0) <= 0) return false;
    state.bootleggingData = {
      have,
      sold,
      queued: 0,
      visibleOnly: true,
      updatedAt: nowMs()
    };
    return true;
  }

  function getBootleggingGenreButtons() {
    const seen = new Set();
    return Array.from(document.querySelectorAll('button, [role="button"], [class*="genre"], [class*="Genre"], [class*="stock"], [class*="Stock"], [class*="option"], [class*="Option"], div, span'))
      .filter((node) => node && !node.closest(`#${APP.id}, #${APP.id}-modal`) && node.offsetParent !== null)
      .map((node) => {
        const label = String(node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || '');
        if (!label || label.length > 260) return null;
        const genre = getBootleggingGenreFromText(label);
        if (!genre) return null;
        const host = findBootleggingGenreHost(node, genre);
        if (seen.has(host)) return null;
        seen.add(host);
        return { button: host, genre };
      })
      .filter(Boolean);
  }

  function applyBootleggingButtonLabels() {
    if (!state.bootleggingData) ensureBootleggingDataFromVisiblePage();
    const rows = buildBootleggingRows(state.bootleggingData);
    if (!rows.length || !isBootleggingCrimePage()) return false;
    const rowMap = new Map(rows.map((row, index) => [row.name, { ...row, index }]));
    const maxShortage = Math.max(0, ...rows.map((row) => row.diff));
    let touched = false;
    getBootleggingGenreButtons().forEach(({ button, genre }) => {
      const row = rowMap.get(genre.name);
      if (!row) return;
      button.classList.add('fluz-bootleg-native');
      button.classList.toggle('fluz-bootleg-best', row.index === 0);
      button.style.setProperty('--fluz-bootleg-strength', String(clamp(row.diff, 0, Math.max(1, rows[0].diff))));
      if (row.index === 0) {
        button.style.background = 'linear-gradient(180deg, #72f0aa, #27a962)';
        button.style.borderColor = '#8dffc2';
        button.style.color = '#06140d';
      } else if (row.diff > 0 && maxShortage > 0) {
        const hue = Math.round(48 + (row.diff / maxShortage) * 28);
        button.style.background = `linear-gradient(180deg, hsl(${hue}, 94%, 76%), hsl(${hue}, 78%, 39%))`;
        button.style.borderColor = `hsl(${hue}, 92%, 70%)`;
        button.style.color = '#171307';
      } else {
        button.style.background = 'rgba(18, 18, 18, .88)';
        button.style.borderColor = 'rgba(98, 230, 164, .32)';
        button.style.color = '#dce8df';
      }
      const text = row.diff > 0 ? `${row.diff} more needed` : 'balanced/excess';
      let label = button.querySelector('.fluz-bootleg-diff');
      if (!label) {
        label = document.createElement('div');
        label.className = 'fluz-bootleg-diff';
        button.appendChild(label);
      }
      if (label.textContent !== text) label.textContent = text;
      touched = true;
    });
    return touched;
  }

  function scheduleBootleggingButtonLabels() {
    [50, 150, 300, 700, 1300, 2500].forEach((delayMs) => {
      setTimeout(() => applyBootleggingButtonLabels(), delayMs);
    });
  }

  function pickpocketSkillLevel() {
    const panel = document.getElementById('crime-stats-panel');
    const text = cleanBookieText(panel ? panel.textContent : '');
    const direct = text.match(/skill\s*level\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i)
      || text.match(/level\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (direct) return parseNumber(direct[1]) || 1;
    try {
      const legacy = panel.children[0].children[1].children[0].children[0].children[0].children[0].children[2].textContent;
      return parseNumber(legacy) || 1;
    } catch (error) {
      return state.pickpocketStats && state.pickpocketStats.skillLevel ? state.pickpocketStats.skillLevel : 1;
    }
  }

  function pickpocketSafeCategories(skillLevel) {
    let index = 0;
    PICKPOCKET_SKILL_STARTS.forEach((start, currentIndex) => {
      if (Math.floor(parseNumber(skillLevel)) >= start) index = currentIndex;
    });
    return PICKPOCKET_SKILL_CATS.slice(0, index + 1);
  }

  function pickpocketMarkDifficulty(mark, skillLevel) {
    const safeCats = pickpocketSafeCategories(skillLevel);
    for (let index = 0; index < safeCats.length; index += 1) {
      const category = safeCats[index];
      if ((PICKPOCKET_MARK_GROUPS[category] || []).includes(mark)) {
        if (index === safeCats.length - 1) return 'ideal';
        if (index === safeCats.length - 2) return 'easy';
        return 'tooEasy';
      }
    }
    return 'tooHard';
  }

  function pickpocketDifficulties(markType, build, activity, skillLevel) {
    const difficulties = {
      csSemantic: pickpocketMarkDifficulty(markType, skillLevel),
      activitySemantic: '',
      buildSemantic: '',
      finalSemantic: 'uncategorized'
    };
    difficulties.finalSemantic = difficulties.csSemantic;
    if ((PICKPOCKET_BUILDS_TO_AVOID[markType] || []).includes(build)) {
      difficulties.finalSemantic = 'tooHard';
      difficulties.buildSemantic = 'tooHard';
    }
    if ((PICKPOCKET_ACTIVITIES_TO_AVOID[markType] || []).includes(activity)) {
      difficulties.finalSemantic = 'tooHard';
      difficulties.activitySemantic = 'tooHard';
    }
    return difficulties;
  }

  function findChildByClassPrefix(parent, prefix) {
    if (!parent || !parent.children) return null;
    for (const child of parent.children) {
      if (Array.from(child.classList || []).some((className) => className && className.startsWith(prefix))) return child;
      const nested = findChildByClassPrefix(child, prefix);
      if (nested) return nested;
    }
    return null;
  }

  function getPickpocketContainer() {
    const current = document.querySelector('[class^="currentCrime"], [class*=" currentCrime"]');
    if (!current) return null;
    const children = Array.from(current.children || []);
    return children[3] || children.find((child) => child && child.children && child.children.length > 2) || null;
  }

  function getPickpocketTargetNodes() {
    const container = getPickpocketContainer();
    if (!container) return [];
    return Array.from(container.children || []).filter((node, index) => {
      const classes = String(node.className || '');
      if (index === 0 || /virtualItemsBackdrop/i.test(classes)) return false;
      return node && node.nodeType === 1;
    });
  }

  function extractPickpocketRow(node) {
    const row = node && node.children && node.children[0] && node.children[0].children
      ? node.children[0].children[0]
      : node;
    const sections = findChildByClassPrefix(row, 'sections');
    const main = findChildByClassPrefix(sections, 'mainSection') || row;
    const titleProps = findChildByClassPrefix(main, 'titleAndProps');
    const titleNode = titleProps && titleProps.children ? titleProps.children[0] : null;
    const propsNode = titleProps && titleProps.children ? titleProps.children[1] : null;
    const activityNode = findChildByClassPrefix(main, 'activity');
    const commitNode = findChildByClassPrefix(sections, 'commitButtonSection') || findChildByClassPrefix(row, 'commitButtonSection');
    if (!row || !titleNode || !propsNode || !activityNode || !commitNode) return null;
    const titleText = cleanBookieText(titleNode.textContent).replace(/\s+\([0-9]+%\)\s*$/, '');
    const mark = Object.keys(PICKPOCKET_MARK_CS_LEVELS).find((type) => titleText.startsWith(type));
    if (!mark) return null;
    const propsText = cleanBookieText(propsNode.textContent);
    const build = propsText.split(/\s+/)[0] || '';
    const activityText = cleanBookieText(activityNode.textContent);
    const activityMatch = activityText.match(/^\D+/);
    const activity = activityMatch ? cleanBookieText(activityMatch[0]) : '';
    return { outer: row, titleNode, propsNode, activityNode, commitNode, mark, build, activity };
  }

  function ensurePickpocketHeaderControls() {
    if (!isPickpocketCrimePage()) return;
    const header = document.querySelector('.crimes-app h4[class^="heading"], [class^="appHeader"], [class*=" appHeader"]');
    if (!header || document.getElementById('fluz-pickpocket-controls')) return;
    const controls = document.createElement('span');
    controls.id = 'fluz-pickpocket-controls';
    controls.className = 'fluz-pickpocket-native-controls';
    controls.innerHTML = `
      <span>CS</span>
      <input type="number" min="100" max="350" step="50" value="${escapeHtml(state.utility.pickpocketMinCs)}" title="Minimum target CS">
      <span>-</span>
      <input type="number" min="100" max="350" step="50" value="${escapeHtml(state.utility.pickpocketMaxCs)}" title="Maximum target CS">
    `;
    const inputs = controls.querySelectorAll('input');
    inputs[0].addEventListener('input', async (event) => {
      state.utility.pickpocketMinCs = parseNumber(event.target.value);
      await saveUtilityState();
      schedulePickpocketFormatting();
    });
    inputs[1].addEventListener('input', async (event) => {
      state.utility.pickpocketMaxCs = parseNumber(event.target.value);
      await saveUtilityState();
      schedulePickpocketFormatting();
    });
    header.appendChild(controls);
  }

  function clearPickpocketFormatting() {
    document.querySelectorAll('.fluz-pickpocket-label').forEach((node) => node.remove());
    document.querySelectorAll('[data-fluz-pickpocket-colored="1"]').forEach((node) => {
      node.style.removeProperty('color');
      node.style.removeProperty('background-color');
      node.removeAttribute('data-fluz-pickpocket-colored');
    });
    document.querySelectorAll('[data-fluz-pickpocket-row="1"]').forEach((node) => {
      node.style.removeProperty('display');
      node.removeAttribute('data-fluz-pickpocket-row');
    });
    const controls = document.getElementById('fluz-pickpocket-controls');
    if (controls) controls.remove();
  }

  function applyPickpocketFormatting() {
    if (!isPickpocketCrimePage()) {
      clearPickpocketFormatting();
      return false;
    }
    ensurePickpocketHeaderControls();
    const minCs = parseNumber(state.utility.pickpocketMinCs) || 100;
    const maxCs = parseNumber(state.utility.pickpocketMaxCs) || 350;
    const skillLevel = pickpocketSkillLevel();
    const stats = { colored: 0, visible: 0, hidden: 0, skillLevel, updatedAt: nowMs() };
    getPickpocketTargetNodes().forEach((node) => {
      const row = extractPickpocketRow(node);
      if (!row) return;
      const targetCs = PICKPOCKET_MARK_CS_LEVELS[row.mark] || 0;
      const hidden = targetCs < minCs || targetCs > maxCs;
      row.outer.setAttribute('data-fluz-pickpocket-row', '1');
      row.outer.style.display = hidden ? 'none' : '';
      if (hidden) stats.hidden += 1;
      else stats.visible += 1;
      const difficulties = pickpocketDifficulties(row.mark, row.build, row.activity, skillLevel);
      row.propsNode.style.removeProperty('color');
      row.activityNode.style.removeProperty('color');
      if (difficulties.buildSemantic) row.propsNode.style.color = PICKPOCKET_COLORS[difficulties.buildSemantic];
      if (difficulties.activitySemantic) row.activityNode.style.color = PICKPOCKET_COLORS[difficulties.activitySemantic];
      row.titleNode.style.color = PICKPOCKET_COLORS[difficulties.csSemantic] || PICKPOCKET_COLORS.uncategorized;
      row.commitNode.style.backgroundColor = PICKPOCKET_COLORS[difficulties.finalSemantic] || PICKPOCKET_COLORS.uncategorized;
      [row.titleNode, row.propsNode, row.activityNode, row.commitNode].forEach((item) => item.setAttribute('data-fluz-pickpocket-colored', '1'));
      let label = row.titleNode.querySelector('.fluz-pickpocket-label');
      if (!label) {
        label = document.createElement('span');
        label.className = 'fluz-pickpocket-label';
        row.titleNode.appendChild(label);
      }
      label.textContent = `${targetCs}%`;
      label.style.backgroundColor = PICKPOCKET_COLORS[difficulties.csSemantic] || PICKPOCKET_COLORS.uncategorized;
      stats.colored += 1;
    });
    state.pickpocketStats = stats;
    return stats.colored > 0;
  }

  function schedulePickpocketFormatting() {
    if (state.pickpocketScheduleTimer) clearTimeout(state.pickpocketScheduleTimer);
    state.pickpocketScheduleTimer = setTimeout(() => {
      applyPickpocketFormatting();
      if (state.mode === 'utility' && getUtilityModule().key === 'crimes' && isPickpocketCrimePage() && !isPanelInputFocused()) {
        renderPanelKeepingScroll();
      }
    }, 140);
    [450, 1000, 2200].forEach((delayMs) => setTimeout(() => applyPickpocketFormatting(), delayMs));
  }

  function selectBootleggingGenre(genreName) {
    const cleanName = cleanBookieText(genreName || '');
    if (!cleanName) return;
    const match = getBootleggingGenreButtons().find((item) => item.genre.name === cleanName);
    if (!match) {
      showFlash(`Could not find ${cleanName} genre button on the page.`);
      return;
    }
    match.button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    match.button.click();
    showFlash(`Selected ${cleanName}. Start/confirm the crime manually.`);
  }

  function parseCrimeProfitCsv(text) {
    const rows = parseCsvRows(text).filter((row) => row.length);
    if (rows.length < 2) return [];
    const headers = rows.shift().map((header, index) => {
      if (header === '7BFS' && rows.some((row) => row[index])) return index === 2 ? '7BFS attempts' : header;
      return header;
    });
    return rows.map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter((item) => item.crime || item.target || item['Targeted service ']);
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const input = String(text || '');
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell);
    rows.push(row);
    return rows.map((items) => items.map((item) => item.trim()));
  }

  async function loadCrimeProfitabilityData(force = false) {
    if (state.crimeProfitLoading) return;
    state.crimeProfitLoading = true;
    try {
      const cached = await readJsonStorage(CRIME_PROFIT.cacheKey, null);
      if (cached && cached.fetchedAt) {
        const fresh = nowMs() - cached.fetchedAt < CRIME_PROFIT.cacheTtlMs;
        state.crimeProfitData = {
          ...cached,
          warning: fresh ? '' : 'Using cached $/N data while refreshing in the background.'
        };
        applyCrimeProfitabilityLabels();
        scheduleCrimeProfitabilityLabels();
        const module = getUtilityModule();
        if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
        if (!force && fresh) return;
      }
      const [allText, crackingText] = await Promise.all([
        httpGetText(CRIME_PROFIT.allUrl),
        httpGetText(CRIME_PROFIT.crackingUrl)
      ]);
      const data = {
        rows: parseCrimeProfitCsv(allText),
        crackingRows: parseCrimeProfitCsv(crackingText),
        fetchedAt: nowMs(),
        warning: ''
      };
      state.crimeProfitData = data;
      await writeJsonStorage(CRIME_PROFIT.cacheKey, data);
      applyCrimeProfitabilityLabels();
      scheduleCrimeProfitabilityLabels();
    } catch (error) {
      const cached = await readJsonStorage(CRIME_PROFIT.cacheKey, null);
      state.crimeProfitData = cached
        ? { ...cached, warning: `Using cached $/N data. Refresh failed: ${friendlyError(error)}` }
        : { rows: [], crackingRows: [], fetchedAt: 0, warning: `Could not load $/N data: ${friendlyError(error)}` };
    } finally {
      state.crimeProfitLoading = false;
      const module = getUtilityModule();
      if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
    }
  }

  function crimeProfitRowsForCurrentPage() {
    const data = state.crimeProfitData || {};
    if (/cracking/i.test(window.location.href)) return Array.isArray(data.crackingRows) ? data.crackingRows : [];
    return Array.isArray(data.rows) ? data.rows : [];
  }

  function normalizeCrimeProfitKey(value) {
    return cleanBookieText(value || '')
      .toLowerCase()
      .replace(/\bcity centre\b/g, 'city center')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseProfitValue(value) {
    const text = String(value || '').replace(/[$,\s]/g, '');
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function buildCrimeProfitMap(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const target = normalizeCrimeProfitKey(row.target || row['Targeted service '] || '');
      if (!target) return;
      const value = parseProfitValue(row['$/N'] || row['Estimated profit per nerve 6BFS'] || row['7BFS'] || row['6BFS']);
      if (value == null) return;
      map.set(target, { row, value });
      if (target === 'city centre') map.set('city center', { row, value });
    });
    return map;
  }

  function visibleCrimeOptionLabel(option) {
    const selectors = [
      '[class*="titleAndProps__"] div',
      '[class*="titleAndIcon__"]',
      '[class*="tabletTitleAndTagCount__"]',
      '[class*="tabletShopTitle__"]',
      '[class*="tabletProjectTitle__"]',
      '[class*="type__"]',
      '[class*="service__"]',
      '[class*="title__"]'
    ];
    for (const selector of selectors) {
      const node = option.querySelector(selector);
      const text = cleanBookieText(node && node.textContent);
      if (text) return text;
    }
    const textNode = Array.from(option.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && cleanBookieText(node.textContent));
    return cleanBookieText(textNode && textNode.textContent);
  }

  function applyCrimeProfitabilityLabels() {
    if (!/sid=crimes/i.test(window.location.href)) return false;
    const rows = crimeProfitRowsForCurrentPage();
    if (!rows.length) return false;
    const map = buildCrimeProfitMap(rows);
    let touched = false;
    let bestValue = -Infinity;
    let bestLabel = '';
    let bestWrapper = null;
    let visibleCount = 0;

    document.querySelectorAll('.fluz-crime-profit-best').forEach((node) => node.classList.remove('fluz-crime-profit-best'));

    if (isBootleggingCrimePage()) {
      const boot = applyBootleggingProfitability(map);
      if (boot.count) {
        visibleCount += boot.count;
        if (boot.bestValue > bestValue) {
          bestValue = boot.bestValue;
          bestLabel = boot.bestLabel;
        }
      }
      touched = boot.touched || touched;
    }

    const options = Array.from(document.querySelectorAll('[class*="crimeOptionSection__"]'));
    options.forEach((option) => {
      const label = normalizeCrimeProfitKey(visibleCrimeOptionLabel(option));
      if (!label) return;
      const match = map.get(label) || map.get(label.replace(/\s+unit$/, ''));
      if (!match) return;
      const chip = option.querySelector('.fluz-crime-profit-chip') || createCrimeProfitChip(match.value);
      updateCrimeProfitChip(chip, match.value);
      option.appendChild(chip);
      option.style.display = 'flex';
      option.style.justifyContent = 'space-between';
      option.style.alignItems = 'center';
      const wrapper = option.closest('[class*="crimeOptionWrapper__"], .virtual-item') || option.parentElement;
      if (match.value > bestValue) {
        bestValue = match.value;
        bestLabel = visibleCrimeOptionLabel(option);
        bestWrapper = wrapper;
      }
      visibleCount += 1;
      touched = true;
    });

    if (bestWrapper && bestValue > CRIME_PROFIT.threshold) bestWrapper.classList.add('fluz-crime-profit-best');
    state.crimeProfitVisible = {
      count: visibleCount,
      bestLabel: bestLabel || '',
      bestValue: bestValue === -Infinity ? null : bestValue
    };
    return touched;
  }

  function scheduleCrimeProfitabilityLabels() {
    [100, 350, 900, 1600].forEach((delayMs) => {
      setTimeout(() => applyCrimeProfitabilityLabels(), delayMs);
    });
  }

  function applyBootleggingProfitability(map) {
    const labelToTarget = new Map([
      ['sell counterfeit dvds', 'sell counterfeit dvds'],
      ['online store', 'collect from online store'],
      ['collect from online store', 'collect from online store']
    ]);
    let touched = false;
    let count = 0;
    let bestValue = -Infinity;
    let bestLabel = '';
    document.querySelectorAll('[class*="crimeOptionWrapper__"], [class*="crimeOptionSection__"]').forEach((node) => {
      const text = normalizeCrimeProfitKey(node.textContent);
      const target = Array.from(labelToTarget.entries()).find(([label]) => text.includes(label));
      if (!target) return;
      const match = map.get(target[1]);
      if (!match) return;
      const host = node.matches('[class*="crimeOptionSection__"]') ? node : node.querySelector('[class*="crimeOptionSection__"]') || node;
      const chip = host.querySelector('.fluz-crime-profit-chip') || createCrimeProfitChip(match.value);
      updateCrimeProfitChip(chip, match.value);
      host.appendChild(chip);
      count += 1;
      if (match.value > bestValue) {
        bestValue = match.value;
        bestLabel = target[0];
      }
      touched = true;
    });
    return { touched, count, bestValue, bestLabel };
  }

  function createCrimeProfitChip(value) {
    const chip = document.createElement('span');
    chip.className = 'fluz-crime-profit-chip';
    updateCrimeProfitChip(chip, value);
    return chip;
  }

  function updateCrimeProfitChip(chip, value) {
    chip.textContent = `${value < 0 ? '-' : ''}${formatMoney(Math.abs(value))} / N`;
    chip.classList.remove('good', 'warn', 'bad');
    if (value < 0) chip.classList.add('bad');
    else if (value < CRIME_PROFIT.threshold) chip.classList.add('warn');
    else chip.classList.add('good');
  }
