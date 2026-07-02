  function renderMeritTracker() {
    const style = state.utility.meritRouteStyle || 'balanced';
    const freePoints = Math.max(0, parseNumber(state.utility.meritFreePoints));
    const visibleLevels = scanVisibleMeritLevels();
    const rows = meritRouteRows(style, visibleLevels);
    const next = rows.find((row) => row.level < 10);
    return `
      <div class="fluz-section-title"><span>Merit spend route</span><span class="fluz-muted">manual tracker</span></div>
      <div class="fluz-card">
        <div class="fluz-form-grid">
          <label>Route
            <select data-utility-setting="meritRouteStyle">
              <option value="balanced" ${style === 'balanced' ? 'selected' : ''}>Balanced account</option>
              <option value="combat" ${style === 'combat' ? 'selected' : ''}>Combat / chaining</option>
              <option value="money" ${style === 'money' ? 'selected' : ''}>Money / trader</option>
              <option value="growth" ${style === 'growth' ? 'selected' : ''}>Long-term growth</option>
            </select>
          </label>
          <label>Unspent merits
            <input type="number" min="0" data-utility-setting="meritFreePoints" value="${escapeHtml(freePoints)}">
          </label>
        </div>
        <div class="fluz-alert ${next ? 'info' : ''}">
          ${next ? `Next best manual spend: <strong>${escapeHtml(next.name)}</strong> (${escapeHtml(next.level)}/10) - ${escapeHtml(next.reason)}.` : 'All tracked route items are 10/10.'}
        </div>
        <p class="fluz-muted">${Object.keys(visibleLevels).length ? `Detected ${Object.keys(visibleLevels).length} visible merit levels from the page.` : 'No visible merit levels detected yet; use the local inputs below.'} Official Torn wiki says merit upgrades go to 10/10 and cost 55 merits total per upgrade path.</p>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Route checklist</span><span class="fluz-muted">${escapeHtml(style)}</span></div>
        ${rows.map(renderMeritRouteRow).join('')}
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Easy merit hunting ideas</span><span class="fluz-muted">manual</span></div>
        ${[
          ['Awards page', 'Sort honors/medals by close progress and finish low-effort one-offs first.'],
          ['City finds', 'Keep Awareness optional; it increases find quantity but does not guarantee daily finds.'],
          ['Bank/growth', 'If you invest often, Bank Interest pays back over time and is easy to value.'],
          ['Combat', 'Life, crit, main stat, and weapon mastery are the core fighting stack.'],
          ['Reset caution', 'Merit resets cost points unless you have a free reset, so test route changes slowly.']
        ].map(([name, text]) => `<div class="fluz-mini-row"><strong>${escapeHtml(name)}</strong><span>${escapeHtml(text)}</span></div>`).join('')}
      </div>
    `;
  }

  function scanVisibleMeritLevels() {
    const text = bankPageText();
    const aliases = {
      education: ['Education Length'],
      bank: ['Bank Interest'],
      crime: ['Crime Progression'],
      life: ['Life Points'],
      critical: ['Critical Hit Rate'],
      addiction: ['Addiction Mitigation'],
      employee: ['Employee Effectiveness'],
      looting: ['Masterful Looting'],
      stat: ['Strength', 'Defense', 'Speed', 'Dexterity'],
      weapon: ['Rifle Mastery', 'SMG Mastery', 'Shotgun Mastery', 'Pistol Mastery', 'Club Mastery', 'Piercing Mastery', 'Slashing Mastery', 'Mechanical Mastery', 'Temporary Mastery', 'Heavy Artillery Mastery']
    };
    const output = {};
    Object.entries(aliases).forEach(([key, names]) => {
      const values = names.map((name) => {
        const match = text.match(new RegExp(`${escapeRegExp(name)}\\s+(\\d{1,2})\\s*\\/\\s*10`, 'i'));
        return match ? clamp(Math.floor(parseNumber(match[1])), 0, 10) : null;
      }).filter((value) => value != null);
      if (values.length) output[key] = Math.max(...values);
    });
    return output;
  }

  function meritRouteRows(style, visibleLevels = {}) {
    const levels = state.utility.meritLevels || {};
    const reasonByKey = {
      education: 'permanent time saved while you still have courses left',
      bank: 'best when you regularly lock large investments',
      crime: 'long-term crimes 2.0 progression',
      life: 'survivability in wars, chains, and missions',
      critical: 'more fight swing after your basics are stable',
      stat: 'push your main battle-stat build',
      weapon: 'best after you know your main weapon class',
      addiction: 'helps training/education/company penalties from drug use',
      employee: 'only useful if employee effectiveness matters to your job/company',
      looting: 'money route for manual mugging play'
    };
    const priority = {
      balanced: ['education', 'bank', 'crime', 'life', 'stat', 'weapon', 'critical', 'addiction', 'employee', 'looting'],
      combat: ['life', 'stat', 'weapon', 'critical', 'education', 'crime', 'addiction', 'bank', 'looting', 'employee'],
      money: ['bank', 'education', 'employee', 'looting', 'crime', 'life', 'stat', 'weapon', 'critical', 'addiction'],
      growth: ['education', 'crime', 'addiction', 'bank', 'life', 'stat', 'weapon', 'critical', 'employee', 'looting']
    }[style] || [];
    return priority.map((key, index) => {
      const item = MERIT_UPGRADES.find((upgrade) => upgrade.key === key);
      return {
        ...item,
        priority: index + 1,
        level: visibleLevels[key] != null ? visibleLevels[key] : clamp(Math.floor(parseNumber(levels[key])), 0, 10),
        reason: reasonByKey[key] || item.effect
      };
    }).filter(Boolean);
  }

  function renderMeritRouteRow(row) {
    const pct = clamp((row.level / 10) * 100, 0, 100);
    return `
      <div class="fluz-stat-row">
        <div class="fluz-mini-row"><strong>${escapeHtml(row.priority)}. ${escapeHtml(row.name)}</strong><span>${escapeHtml(row.level)}/10</span></div>
        <div class="fluz-stat-track"><span style="width:${pct}%"></span></div>
        <div class="fluz-form-grid" style="margin-top:6px;">
          <label>Level
            <input type="number" min="0" max="10" data-merit-level-key="${escapeHtml(row.key)}" value="${escapeHtml(row.level)}">
          </label>
          <label>Effect
            <input type="text" value="${escapeHtml(row.effect)}" readonly>
          </label>
        </div>
        <p class="fluz-muted">${escapeHtml(row.reason)}</p>
      </div>
    `;
  }

  async function updateMeritLevel(input, options = {}) {
    const key = input.dataset.meritLevelKey;
    if (!key) return;
    state.utility.meritLevels = { ...(state.utility.meritLevels || {}), [key]: clamp(Math.floor(parseNumber(input.value)), 0, 10) };
    await saveUtilityState();
    if (options.render !== false) renderPanel();
  }

