  function renderBountyFilter() {
    const rows = scanVisibleBountyRows();
    const filtered = filterBountyRows(rows);
    return `
      <div class="fluz-section-title"><span>Bounty filter</span><span class="fluz-muted">${filtered.length}/${rows.length} visible</span></div>
      <div class="fluz-card">
        <div class="fluz-form-grid">
          <label>Search
            <input type="text" data-utility-setting="bountySearch" value="${escapeHtml(state.utility.bountySearch || '')}" placeholder="Name, reason, faction...">
          </label>
          <label>Min reward
            <input type="number" min="0" data-utility-setting="bountyMinReward" value="${escapeHtml(state.utility.bountyMinReward || 0)}">
          </label>
          <label>Max level
            <input type="number" min="0" data-utility-setting="bountyMaxLevel" value="${escapeHtml(state.utility.bountyMaxLevel || 0)}">
          </label>
        </div>
        <div class="fluz-target-checks" style="margin-top:7px;">
          <label><input type="checkbox" data-utility-setting="bountyHideUnavailable" ${state.utility.bountyHideUnavailable !== false ? 'checked' : ''}> Filter hospital/jail/travel</label>
          <label><input type="checkbox" data-utility-setting="bountyHideNonMatches" ${state.utility.bountyHideNonMatches ? 'checked' : ''}> Hide non-matches on page</label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:8px;">
          <button class="fluz-button primary" data-action="apply-bounty-filter">Apply to visible list</button>
          <button class="fluz-button" data-action="clear-bounty-filter">Clear page marks</button>
        </div>
        <p class="fluz-muted">Local display filter only. It never opens a bounty, claims, attacks, or clicks Torn buttons.</p>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Matched visible bounties</span><span class="fluz-muted">${filtered.length} rows</span></div>
        ${filtered.slice(0, 10).map((row) => `
          <div class="fluz-mini-row">
            <strong>${escapeHtml(row.name || 'Unknown')}</strong>
            <span>${formatMoney(row.reward)} - L${escapeHtml(String(row.level || '?'))}${row.unavailable ? ' - unavailable' : ''}</span>
          </div>
        `).join('') || '<p class="fluz-muted">No visible bounty rows match yet.</p>'}
      </div>
    `;
  }

  function scanVisibleBountyRows() {
    const tableRows = $all('table tr, [class*="bount"] tr, [class*="bount"] [class*="row"]');
    const listRows = $all('li[data-id], [class*="bounty"] li');
    const rawCandidates = Array.from(new Set([...tableRows, ...listRows]))
      .filter(isVisibleBountyCandidate);
    const candidates = rawCandidates.filter((node) => !rawCandidates.some((other) => other !== node && node.contains(other)));
    const rows = [];
    candidates.forEach((node, index) => {
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (!/\$[\d,.]+/.test(text) || !/\b(claim|okay|hospital|abroad|travel|jail|target|bounty)\b/i.test(text)) return;
      const cells = Array.from(node.children || []).map((child) => cleanBookieText(child.innerText || child.textContent || '')).filter(Boolean);
      const level = extractBountyLevel(node, cells, text);
      const rewards = Array.from(text.matchAll(/\$([0-9,.]+[kmb]?)/gi)).map((match) => parseCompactNumber(match[1]));
      const anchor = node.querySelector('a[href*="profiles.php"], a[href*="XID="]');
      const targetCell = cells[1] || '';
      const reasonCell = cells[4] || cells[3] || '';
      const statusCell = cells.find((cell) => /okay|hospital|abroad|travel|jail|federal/i.test(cell)) || '';
      rows.push({
        node,
        index,
        text,
        name: cleanBookieText(anchor ? anchor.textContent : (targetCell || text.split(/\s{2,}|\n/)[0] || '')),
        level,
        reward: rewards.length ? Math.max(...rewards) : 0,
        reason: reasonCell,
        unavailable: /hospital|jail|travel|abroad|federal|inactive|unavailable|user-red-status|user-blue-status/i.test(`${statusCell} ${node.className || ''}`)
      });
    });
    return rows.filter((row, index, list) => row.reward && (row.name || row.level) && list.findIndex((other) => other.node === row.node) === index);
  }

  function isVisibleBountyCandidate(node) {
    if (!node || !node.isConnected || node.closest(`#${APP.id}, #${APP.id}-modal`)) return false;
    const text = cleanBookieText(node.innerText || node.textContent || '');
    if (text.length <= 10 || /reward\s+target\s+lvl/i.test(text)) return false;
    if (!/\$[\d,.]+[kmb]?/i.test(text)) return false;
    const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : { width: 0, height: 0 };
    if (rect.width <= 0 || rect.height <= 0) return false;
    const style = window.getComputedStyle ? window.getComputedStyle(node) : null;
    return !(style && (style.display === 'none' || style.visibility === 'hidden'));
  }

  function extractBountyLevel(node, cells, text) {
    const levelNode = node.querySelector('.level, [class*="level"]');
    const candidates = [
      levelNode ? cleanBookieText(levelNode.textContent || '') : '',
      ...cells,
      text
    ].filter(Boolean);
    for (const value of candidates) {
      const labelled = value.match(/\b(?:level|lvl|lv)\s*:?\s*([0-9]{1,3})\b/i);
      if (labelled) return parseNumber(labelled[1]);
    }
    for (const value of candidates.slice(0, Math.max(3, cells.length))) {
      const simple = value.match(/^\s*L?\s*([0-9]{1,3})\s*$/i);
      if (simple) return parseNumber(simple[1]);
    }
    return 0;
  }

  function filterBountyRows(rows) {
    const query = String(state.utility.bountySearch || '').trim().toLowerCase();
    const minReward = parseNumber(state.utility.bountyMinReward);
    const maxLevel = parseNumber(state.utility.bountyMaxLevel);
    const hideUnavailable = state.utility.bountyHideUnavailable !== false;
    return rows.filter((row) => {
      if (query && !`${row.name} ${row.reason || ''} ${row.text}`.toLowerCase().includes(query)) return false;
      if (minReward > 0 && row.reward < minReward) return false;
      if (maxLevel > 0 && row.level > maxLevel) return false;
      if (hideUnavailable && row.unavailable) return false;
      return true;
    });
  }

  function applyBountyFilterToPage() {
    const rows = scanVisibleBountyRows();
    const allowed = new Set(filterBountyRows(rows).map((row) => row.node));
    rows.forEach((row) => {
      row.node.style.outline = allowed.has(row.node) ? '1px solid rgba(98, 255, 176, .75)' : '';
      row.node.style.boxShadow = allowed.has(row.node) ? 'inset 3px 0 0 rgba(98, 255, 176, .9)' : '';
      row.node.style.display = !allowed.has(row.node) && state.utility.bountyHideNonMatches ? 'none' : '';
    });
    showFlash(`Bounty filter matched ${allowed.size}/${rows.length} visible rows.`);
  }

  function clearBountyFilterDisplay() {
    scanVisibleBountyRows().forEach((row) => {
      row.node.style.outline = '';
      row.node.style.boxShadow = '';
      row.node.style.display = '';
    });
    showFlash('Bounty page marks cleared.');
  }

  const MERIT_UPGRADES = [
    { key: 'education', name: 'Education Length', effect: '-2% course time per level', routes: ['balanced', 'growth'] },
    { key: 'bank', name: 'Bank Interest', effect: '+5% bank interest per level', routes: ['balanced', 'money'] },
    { key: 'crime', name: 'Crime Progression', effect: '+1% crimes 2.0 experience/skill gain per level', routes: ['balanced', 'growth'] },
    { key: 'life', name: 'Life Points', effect: '+5% max life per level', routes: ['balanced', 'combat'] },
    { key: 'critical', name: 'Critical Hit Rate', effect: '+0.5% crit chance per level', routes: ['combat'] },
    { key: 'stat', name: 'Main Battle Stat', effect: '+3% passive bonus to one battle stat per level', routes: ['combat'] },
    { key: 'weapon', name: 'Main Weapon Mastery', effect: '+1% damage and +0.2 accuracy per level', routes: ['combat'] },
    { key: 'addiction', name: 'Addiction Mitigation', effect: '-2% addiction penalty impact per level', routes: ['growth'] },
    { key: 'employee', name: 'Employee Effectiveness', effect: '+1 employee effectiveness per level', routes: ['money'] },
    { key: 'looting', name: 'Masterful Looting', effect: '+5% mug money per level', routes: ['money'] }
  ];

