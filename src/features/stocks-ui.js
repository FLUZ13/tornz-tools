  function renderGymStatBars(stats) {
    const total = totalBattleStats(stats);
    if (!total) return '<p class="fluz-muted">No battle stats detected yet. Add a Limited Access API key in Profile.</p>';
    return `
      <div class="fluz-stat-bars">
        ${GYM_STATS.map((stat) => {
          const value = parseNumber(stats && stats[stat]);
          const pct = total > 0 ? (value / total) * 100 : 0;
          return `
            <div class="fluz-stat-line">
              <span>${escapeHtml(statLabel(stat))}</span>
              <strong>${escapeHtml(compactNumber(value))}</strong>
              <em>${pct.toFixed(1)}%</em>
              <i style="width:${Math.min(100, Math.max(0, pct))}%"></i>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function getUtilityTimers(moduleKey) {
    return (state.utility.timers || [])
      .filter((timer) => timer.moduleKey === moduleKey)
      .sort((a, b) => a.dueAt - b.dueAt);
  }

  function renderGymSetupCard() {
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Gym helper</div>
        <p class="fluz-muted">Save your Torn API key in Profile for live battle stats, energy, happy, and item values.</p>
        <button class="fluz-button primary" data-action="open-profile">Open Profile</button>
      </div>
    `;
  }

  function renderGymTrainTab() {
    const data = state.gymData;
    const rec = data.recommendation;
    const build = data.build;
    const total = totalBattleStats(data.stats);
    return `
      <div class="fluz-gym-hero">
        <div>
          <div class="fluz-section-title" style="padding:0;border:0;">Next training focus</div>
          <div class="fluz-big-stat">${escapeHtml(statLabel(rec.stat))}</div>
          <div class="fluz-muted">${escapeHtml(rec.message)}</div>
          <div class="fluz-muted">Ideal gym: <strong>${escapeHtml(rec.bestGym ? rec.bestGym.name : 'n/a')}</strong>${rec.bestGym ? ` (${escapeHtml(rec.bestGym.gains[rec.stat])} dots)` : ''}</div>
          <div class="fluz-muted">Available gym: <strong>${escapeHtml(rec.bestAvailableGym ? rec.bestAvailableGym.name : 'n/a')}</strong>${rec.bestAvailableGym ? ` (${escapeHtml(rec.bestAvailableGym.gains[rec.stat])} dots)` : ''}</div>
        </div>
        <div class="fluz-muted">
          Total ${escapeHtml(compactNumber(total))}<br>
          Energy ${escapeHtml(data.bars.energy.current)}/${escapeHtml(data.bars.energy.maximum)}<br>
          Happy ${escapeHtml(data.bars.happy.current)}/${escapeHtml(data.bars.happy.maximum)}<br>
          ${escapeHtml(rec.trainsNow)} trains now
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Build</div>
        <div class="fluz-form-grid">
          <label>Saved build
            <select data-gym-setting="buildKey">
              ${Object.values(GYM_BUILDS).map((buildOption) => `<option value="${buildOption.key}" ${state.gym.buildKey === buildOption.key ? 'selected' : ''}>${buildOption.label}</option>`).join('')}
              ${(state.gym.customBuilds || []).map((buildOption) => `<option value="saved:${escapeHtml(buildOption.id)}" ${state.gym.buildKey === `saved:${buildOption.id}` ? 'selected' : ''}>${escapeHtml(buildOption.name)}</option>`).join('')}
              <option value="custom" ${state.gym.buildKey === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
          </label>
          <label>Current gym
            <select data-gym-setting="selectedGym">
              ${GYM_DATABASE.map((gym) => `<option value="${escapeHtml(gym.name)}" ${state.gym.selectedGym === gym.name ? 'selected' : ''}>${escapeHtml(gym.name)}</option>`).join('')}
            </select>
          </label>
        </div>
        <p class="fluz-muted">${escapeHtml(build.note || '')}</p>
        <div class="fluz-form-grid compact-build">
          <label>Build name
            <input type="text" data-gym-setting="customBuildName" value="${escapeHtml(state.gym.customBuildName || '')}" placeholder="Dex build, Tank, etc.">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="save-gym-build">Save build</button>
          </label>
          <label>&nbsp;
            ${String(state.gym.buildKey || '').startsWith('saved:') ? `<button class="fluz-icon-btn danger" title="Delete selected build" data-action="delete-gym-build">${iconSvg('trash')}</button>` : ''}
          </label>
        </div>
        ${renderGymTargetInputs()}
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Current balance</div>
        ${renderStatBars(data.stats, build.target)}
      </div>
      ${data.warnings.length ? `<div class="fluz-error">${escapeHtml(data.warnings.join(' | '))}</div>` : ''}
    `;
  }

  function renderGymTargetInputs() {
    const target = getGymBuild().target;
    return `
      <div class="fluz-target-grid">
        ${GYM_STATS.map((stat) => `
          <label>${escapeHtml(statLabel(stat))} %
            <input type="number" min="0" max="100" data-gym-target="${stat}" value="${escapeHtml(target[stat])}">
          </label>
        `).join('')}
      </div>
    `;
  }

  function renderGymManualCard() {
    return '';
  }

  function renderStatBars(stats, target) {
    const total = totalBattleStats(stats);
    if (!total) return '<p class="fluz-muted">No battle stats detected yet. Add a Limited Access API key in Profile.</p>';
    const rows = GYM_STATS.map((stat) => {
      const value = Math.max(0, parseNumber(stats && stats[stat]));
      const actual = total > 0 ? (value / total) * 100 : 0;
      const targetPct = Math.max(0, parseNumber(target && target[stat]));
      const gapPct = targetPct - actual;
      const ratio = targetPct / 100;
      const needed = gapPct > 0 && ratio < 1 ? Math.max(0, Math.ceil(((ratio * total) - value) / (1 - ratio))) : 0;
      return { stat, value, actual, targetPct, gapPct, needed };
    });
    const focus = rows.slice().sort((a, b) => b.gapPct - a.gapPct)[0];
    return `
      <div class="fluz-gym-balance">
        <div class="fluz-mini-row"><strong>Total battle stats</strong><span class="fluz-tag">${escapeHtml(compactNumber(total))}</span></div>
        ${rows.map((row) => {
          const status = row.gapPct > 0.15 ? 'behind' : (row.gapPct < -0.15 ? 'ahead' : 'on-target');
          const statusText = status === 'behind'
            ? `behind ${row.gapPct.toFixed(1)}pp`
            : (status === 'ahead' ? `ahead ${Math.abs(row.gapPct).toFixed(1)}pp` : 'on target');
          const needText = row.needed > 0 ? `need about ${compactNumber(row.needed)} more` : 'no catch-up needed';
          return `
            <div class="fluz-gym-balance-row is-${status} ${focus && focus.stat === row.stat && row.gapPct > 0.15 ? 'is-focus' : ''}">
              <div class="fluz-gym-balance-top">
                <strong>${escapeHtml(statLabel(row.stat))}</strong>
                <span>${escapeHtml(row.actual.toFixed(1))}% now / ${escapeHtml(row.targetPct.toFixed(0))}% target</span>
                <em>${escapeHtml(statusText)}</em>
              </div>
              <div class="fluz-gym-balance-track" title="Current ${row.actual.toFixed(1)}%, target ${row.targetPct.toFixed(1)}%">
                <span style="width:${clamp(row.actual, 0, 100).toFixed(1)}%"></span>
                <i style="left:${clamp(row.targetPct, 0, 100).toFixed(1)}%"></i>
              </div>
              <div class="fluz-gym-balance-meta">
                <span>${escapeHtml(compactNumber(row.value))} current</span>
                <span>${escapeHtml(needText)}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderGymsTab() {
    return `
      <div class="fluz-section-title"><span>Gyms</span><span class="fluz-muted">mark your unlocked gyms</span></div>
      <div class="fluz-card">
        <div class="fluz-mini-row">
          <span class="fluz-muted">${getAvailableGymNames().length ? `${getAvailableGymNames().length} gyms marked available` : 'No gyms marked: using all gyms as possible.'}</span>
          <span>
            <button class="fluz-button" data-action="mark-all-gyms">Mark all</button>
            <button class="fluz-button danger" data-action="clear-available-gyms">Clear</button>
          </span>
        </div>
      </div>
      <div class="fluz-gym-head"><div>Gym</div><div>Tier</div><div>E</div><div>STR</div><div>DEF</div><div>SPD</div><div>DEX</div></div>
      <div class="fluz-table">
        ${GYM_DATABASE.map((gym) => `
          <div class="fluz-row fluz-gym-row">
            <div><label class="fluz-check"><input type="checkbox" data-gym-available="${escapeHtml(gym.name)}" ${isGymMarkedAvailable(gym.name) ? 'checked' : ''}><span><strong>${escapeHtml(gym.name)}</strong><div class="fluz-muted">${escapeHtml(gym.note || formatMoney(gym.cost))}</div></span></label></div>
            <div>${escapeHtml(gym.tier)}</div>
            <div>${escapeHtml(gym.energy)}</div>
            <div class="${gym.gains.strength >= 8 ? 'fluz-pos' : ''}">${escapeHtml(gym.gains.strength || '-')}</div>
            <div class="${gym.gains.defense >= 8 ? 'fluz-pos' : ''}">${escapeHtml(gym.gains.defense || '-')}</div>
            <div class="${gym.gains.speed >= 8 ? 'fluz-pos' : ''}">${escapeHtml(gym.gains.speed || '-')}</div>
            <div class="${gym.gains.dexterity >= 8 ? 'fluz-pos' : ''}">${escapeHtml(gym.gains.dexterity || '-')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderGymBoostsTab() {
    const data = state.gymData || { items: [] };
    const groups = groupBoostItems(data.items || GYM_BOOST_ITEMS);
    return `
      <div class="fluz-section-title"><span>Boosts and market notes</span><span class="fluz-muted">read-only guide</span></div>
      <div class="fluz-boost-head"><div>Item</div><div>Type</div><div>Value</div><div>Use</div></div>
      <div class="fluz-table">
        ${groups.map((group) => `
          <div class="fluz-card fluz-boost-group">${escapeHtml(group.category)}</div>
          ${group.items.map((item) => `
            <div class="fluz-row fluz-boost-row" data-action="open-item-market" data-item-name="${escapeHtml(item.name)}" title="Open ${escapeHtml(item.name)} in Torn item market">
              <div class="fluz-cell-main">${escapeHtml(item.name)}</div>
              <div>${escapeHtml(item.type)}</div>
              <div>${item.value ? formatMoney(item.value) : 'n/a'}</div>
              <div class="fluz-muted">${escapeHtml(item.effect)}</div>
            </div>
          `).join('')}
        `).join('')}
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Happy and energy logic</div>
        <p class="fluz-muted">Gym gains are affected by energy, gym dots, happiness, stat size, and modifiers. Happy jumps work because high happy temporarily improves gains, but happy drops after training.</p>
        <p class="fluz-muted">This tool explains and estimates; it never consumes items or trains automatically.</p>
      </div>
    `;
  }

  function groupBoostItems(items) {
    const map = new Map();
    (items || []).forEach((item) => {
      const category = item.category || item.type || 'Other';
      if (!map.has(category)) map.set(category, []);
      map.get(category).push(item);
    });
    return Array.from(map.entries()).map(([category, groupItems]) => ({ category, items: groupItems }));
  }

  function renderSetupPrompt() {
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">API key needed</div>
        <p class="fluz-muted">Open Profile to save your Torn API key once for the whole app. Limited Access is enough for stock, gym, targets, and helper data.</p>
        <button class="fluz-button primary" data-action="open-profile">Open Profile</button>
      </div>
    `;
  }

  function renderInPageAlerts() {
    if (!state.inPageAlerts.length) return '';
    return state.inPageAlerts.map((alert) => {
      const rec = alert.recommendation;
      return `
        <div class="fluz-alert">
          <strong>${escapeHtml(rec.action)} ${escapeHtml(rec.stock.acronym)}</strong>
          <div>${escapeHtml(rec.reason)}</div>
        </div>
      `;
    }).join('');
  }

  function renderSignalsTab() {
    const visibleRecommendations = visibleSignalRecommendations();
    if (!visibleRecommendations.length) {
      return `
        <div class="fluz-card">
          <div class="fluz-section-title">Signals</div>
          <p class="fluz-muted">No recommendations yet. Refresh after saving your API key.</p>
        </div>
      `;
    }

    return `
      <div class="fluz-section-title">
        <span>Signals</span>
        <span class="fluz-muted">${visibleRecommendations.length} shown - buy ideas capped at 3</span>
      </div>
      ${visibleRecommendations.map(renderRecommendationCard).join('')}
    `;
  }

  function visibleSignalRecommendations() {
    let buyCount = 0;
    return (state.recommendations || []).filter((recommendation) => {
      if (!isBuySideSignal(recommendation)) return true;
      buyCount += 1;
      return buyCount <= 3;
    });
  }

  function isBuySideSignal(recommendation) {
    const action = String(recommendation && recommendation.action || '').toUpperCase();
    return action === 'BEST BUY' || action === 'BUY DIP';
  }

  function renderRecommendationCard(recommendation) {
    const stock = recommendation.stock;
    const actionClass = actionClassName(recommendation.action);
    const findLabel = state.settings.stockHighlightOnlyMode ? 'Find' : 'Filter';
    return `
      <div class="fluz-card fluz-rec ${recommendation.meta.className} ${actionClass}" data-filter-stock="${escapeHtml(stock.acronym)}">
        <div class="fluz-rec-top">
          <span class="fluz-action">${escapeHtml(recommendation.action)}</span>
          <span class="fluz-rec-heading">
            <span class="fluz-symbol">${escapeHtml(stock.acronym)}</span>
            <span class="fluz-muted">${escapeHtml(stock.name)}</span>
            <span class="fluz-priority">${priorityLabel(recommendation.priority)} ${recommendation.priority}</span>
          </span>
        </div>
        <div class="fluz-reason">${escapeHtml(recommendation.reason)}</div>
        ${renderSignalTags(stock)}
        ${recommendation.details ? `<div class="fluz-muted">${escapeHtml(recommendation.details)}</div>` : ''}
        <div class="fluz-mini-row">
          <span>${formatFullMoney(stock.price)} / share</span>
          <span>
            <button class="fluz-button" data-action="find-stock" data-acronym="${escapeHtml(stock.acronym)}">${escapeHtml(findLabel)}</button>
            <button class="fluz-button" data-open-calc="${escapeHtml(stock.id)}">Calc</button>
          </span>
        </div>
      </div>
    `;
  }

  function actionClassName(action) {
    return `action-${String(action || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  }

  function renderSignalTags(stock) {
    const tags = buildSignalTags(stock);
    if (!tags.length) return '';
    return `<div class="fluz-signal-tags">${tags.map((tag) => `<span class="fluz-signal-tag ${tag.kind}">${escapeHtml(tag.label)}</span>`).join('')}</div>`;
  }

  function buildSignalTags(stock) {
    const tags = [];
    const t = stock.technicals;
    const memory = stock.memory || {};
    const momentum = t ? t.momentumScore : memory.slope || 0;
    const signal = t ? t.signal : memory.samples >= 3
      ? (memory.slope > 0.25 ? 'Observed Up' : memory.slope < -0.25 ? 'Observed Down' : 'Observed Flat')
      : '';
    if (signal) {
      tags.push({
        label: signal,
        kind: momentum > 0.4 ? 'good' : momentum < -0.4 ? 'bad' : 'info'
      });
    }
    if (t && t.rsi != null) {
      if (t.rsi <= 35) tags.push({ label: 'Cheap', kind: 'good' });
      else if (t.rsi >= 70) tags.push({ label: 'Expensive', kind: 'warn' });
      else tags.push({ label: `RSI ${Math.round(t.rsi)}`, kind: 'info' });
    }
    const week = t && t.change7d != null ? t.change7d : memory.change7d;
    if (week != null) tags.push({ label: `${formatPct(week)} this week`, kind: week >= 0 ? 'good' : 'bad' });
    const month = t && t.change30d != null ? t.change30d : memory.change30d;
    if (month != null) tags.push({ label: `${formatPct(month)} 30d`, kind: month >= 0 ? 'good' : 'bad' });
    if (stock.intel && stock.intel.confidence >= 20) {
      const expected = parseNumber(stock.intel.expectedMovePct);
      tags.push({ label: `Intel ${Math.round(stock.intel.confidence)}% ${formatPct(expected)}`, kind: expected >= 0 ? 'good' : 'warn' });
      if (stock.intel.signalProof && stock.intel.signalProof.samples) {
        const proofScore = stock.intel.signalProof.qualityScore == null ? null : Math.round(parseNumber(stock.intel.signalProof.qualityScore));
        tags.push({
          label: `${stock.intel.signalProof.proven ? 'Proven' : 'Watch'} ${stock.intel.signalProof.label}${proofScore == null ? '' : ` ${proofScore}`}`,
          kind: stock.intel.signalProof.proven ? 'good' : 'info'
        });
      }
    }
    if (stock.position) {
      const net = stock.position.profitLossPct;
      tags.push({ label: `Net ${formatPct(net)}`, kind: net >= 0 ? 'good' : 'bad' });
      tags.push({ label: `${APP.sellFeePct}% sell fee`, kind: 'fee' });
    }
    if (stock.benefit && !benefitsAreIgnored()) {
      if (stock.benefit.annualRoi > 0) tags.push({ label: `${formatPct(stock.benefit.annualRoi)} benefit`, kind: stock.benefit.annualRoi >= 15 ? 'good' : 'info' });
      else if (stock.benefit.tier) tags.push({ label: `${stock.benefit.tier}-tier`, kind: stock.benefit.tier === 'S' || stock.benefit.tier === 'A' ? 'good' : 'info' });
    }
    if (memory.samples >= 3) tags.push({ label: `${memory.samples} memory pts`, kind: 'info' });
    return tags.slice(0, 5);
  }

  function renderPortfolioTab() {
    const owned = state.analyses.filter((stock) => stock.position);
    if (!owned.length) {
      return '<div class="fluz-card">No owned stocks found in the API response.</div>';
    }
    return `
      <div class="fluz-section-title">
        <span>Portfolio</span>
        <span class="fluz-muted">Cash ${formatMoney(state.data ? state.data.userCash.immediate : 0)}</span>
      </div>
      <div class="fluz-portfolio-head">
        <div>Stock</div>
        <div>Shares / Benefit</div>
        <div>Value</div>
        <div>Net P/L</div>
        <div></div>
      </div>
      <div class="fluz-table">
        ${owned.map((stock) => {
          const p = stock.position;
          const pnlClass = p.profitLoss >= 0 ? 'fluz-pos' : 'fluz-neg';
          return `
            <div class="fluz-row fluz-portfolio-row" data-open-calc="${escapeHtml(stock.id)}">
              <div class="fluz-cell-main">${escapeHtml(stock.acronym)}</div>
              <div>
                <div>${compactNumber(p.totalShares)}</div>
                <div class="fluz-muted">${escapeHtml(benefitStatusText(p, stock.benefit))}</div>
              </div>
              <div>${formatMoney(p.currentValue)}</div>
              <div class="${pnlClass}" title="After ${APP.sellFeePct}% Torn sell fee">${formatMoney(p.profitLoss)}<br>${formatPct(p.profitLossPct)}</div>
              <div>
                <button class="fluz-button" data-action="toggle-lock" data-stock-id="${escapeHtml(stock.id)}">${stock.locked ? 'Unlock' : 'Lock'}</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderMarketTab() {
    if (!state.analyses.length) return '<div class="fluz-card">No market data loaded yet.</div>';
    const rows = state.analyses.slice().sort((a, b) => {
      const ar = a.benefit ? a.benefit.annualRoi : 0;
      const br = b.benefit ? b.benefit.annualRoi : 0;
      return br - ar;
    });
    return `
      <div class="fluz-section-title">
        <span>Market Scan</span>
        <span class="fluz-muted">${rows.length} stocks</span>
      </div>
      <div class="fluz-market-head">
        <div>Stock</div>
        <div>Price</div>
        <div>Trend</div>
        <div>RSI</div>
        <div>Benefit</div>
      </div>
      <div class="fluz-table">
        ${rows.map((stock) => {
          const t = stock.technicals;
          const rsi = t && t.rsi != null ? Math.round(t.rsi) : 'n/a';
          const trendClass = t && t.momentumScore < -0.5 ? 'fluz-neg' : t && t.momentumScore > 0.5 ? 'fluz-pos' : '';
          const benefitText = stock.benefit
            ? stock.benefit.annualRoi > 0
              ? `${formatPct(stock.benefit.annualRoi)}/yr`
              : compactNumber(stock.benefit.blockCost || stock.benefit.requirement * stock.price)
            : 'n/a';
          return `
            <div class="fluz-row fluz-market-row" data-open-calc="${escapeHtml(stock.id)}">
              <div class="fluz-cell-main">${escapeHtml(stock.acronym)}</div>
              <div class="fluz-price">${formatMoney(stock.price)}</div>
              <div class="fluz-trend ${trendClass}">${t ? escapeHtml(t.signal) : 'No data'}</div>
              <div class="fluz-rsi ${rsi !== 'n/a' && rsi >= 70 ? 'fluz-neg' : rsi !== 'n/a' && rsi <= 35 ? 'fluz-pos' : ''}">${escapeHtml(rsi)}</div>
              <div class="fluz-benefit" title="${escapeHtml(stock.benefit ? stock.benefit.note || stock.benefit.description || 'Benefit tracked' : 'No benefit data')}">${escapeHtml(benefitText)}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderSettingsTab() {
    const n = state.settings.notifications;
    const cacheText = renderCacheInfo();
    const combo = getCombo();
    const ultimateUnlocked = ultimateTraderUnlocked();
    return `
      <div class="fluz-section-title">Stock settings</div>
      <div class="fluz-card fluz-combo-card">
        <div class="fluz-section-title">Combo selector</div>
        <div class="fluz-combo-grid">
          ${Object.values(STRATEGY_COMBOS).map((item) => {
            const lockedUltimate = isUltimateTraderCombo(item.key) && !ultimateUnlocked;
            return `
            <button class="fluz-combo-option ${item.color} ${state.settings.strategyCombo === item.key ? 'is-active' : ''} ${lockedUltimate ? 'is-locked' : ''}" data-action="apply-combo" data-combo="${escapeHtml(item.key)}">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(lockedUltimate ? 'Private mode. Click to unlock with your shared password.' : item.description)}</span>
              ${lockedUltimate ? '<em>locked</em>' : ''}
            </button>
          `;
          }).join('')}
        </div>
        ${state.ultimateUnlockRequested && !ultimateUnlocked ? `
          <div class="fluz-private-unlock">
            <div>
              <strong>Unlock Ultimate Trader</strong>
              <span>Private beta access for FLUZ and shared close users.</span>
              ${state.ultimateUnlockError ? `<b>${escapeHtml(state.ultimateUnlockError)}</b>` : ''}
            </div>
            <input type="password" autocomplete="off" data-private-unlock="ultimate-trader-password" placeholder="Password">
            <button class="fluz-button primary" data-action="unlock-ultimate-trader">Unlock</button>
            <button class="fluz-button" data-action="cancel-ultimate-unlock">Cancel</button>
          </div>
        ` : ''}
        <label class="fluz-risk-label">Risk slider
          <input class="fluz-risk-slider" type="range" min="0" max="100" step="1" data-setting="riskLevel" value="${escapeHtml(state.settings.riskLevel)}">
        </label>
        <div class="fluz-risk-preview" data-risk-preview>${escapeHtml(combo.label)} - risk ${escapeHtml(combo.risk)}/100</div>
        <div class="fluz-risk-scale"><span>Green: patient</span><span>Yellow: active</span><span>Red: fast</span></div>
        <p class="fluz-muted"><strong>${escapeHtml(combo.label)}:</strong> ${escapeHtml(combo.rhythm)}</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Expert tuning</div>
        <div class="fluz-form-grid">
          <label>Stock method
            <select data-setting="strategyMode">
              ${Object.values(STRATEGY_METHODS).map((strategy) => {
                const lockedUltimate = isUltimateTraderMethod(strategy.key) && !ultimateUnlocked;
                return `<option value="${strategy.key}" ${state.settings.strategyMode === strategy.key ? 'selected' : ''} ${lockedUltimate ? 'disabled' : ''}>${escapeHtml(strategy.label)}${lockedUltimate ? ' (locked)' : ''}</option>`;
              }).join('')}
            </select>
          </label>
          <label>Investor profile
            <select data-setting="investorProfile">
              ${Object.values(INVESTOR_PROFILES).map((profile) => `<option value="${profile.key}" ${state.settings.investorProfile === profile.key ? 'selected' : ''}>${profile.label}</option>`).join('')}
            </select>
          </label>
        </div>
        <p class="fluz-muted">${escapeHtml(getStrategy().description)} ${escapeHtml(getProfile().description)}</p>
        <label class="fluz-check">
          <input type="checkbox" data-setting="ignoreBenefits" ${state.settings.ignoreBenefits ? 'checked' : ''}>
          Ignore benefits/bonus advice and focus on buy/sell trading
        </label>
        <label class="fluz-check">
          <input type="checkbox" data-setting="stockHighlightOnlyMode" ${state.settings.stockHighlightOnlyMode ? 'checked' : ''}>
          Signal click highlight only; keep Torn stock list fully visible instead of filtering
        </label>
      </div>
      <div class="fluz-settings-columns">
        <div class="fluz-card">
          <div class="fluz-section-title">Data and comparison</div>
          <label>Manual bank bonus %
            <input type="number" step="0.1" min="0" data-setting="bankBonusPct" value="${escapeHtml(state.settings.bankBonusPct)}">
          </label>
          <div class="fluz-check-grid">
            <label class="fluz-check">
              <input type="checkbox" data-setting="enableTornsy" ${state.settings.enableTornsy ? 'checked' : ''}>
              Tornsy technicals
            </label>
            <label class="fluz-check">
              <input type="checkbox" data-setting="enableLocalMemory" ${state.settings.enableLocalMemory ? 'checked' : ''}>
              Local memory
            </label>
          </div>
          <div class="fluz-muted">Profile: <span class="fluz-tag">${escapeHtml(getProfile().label)}</span></div>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Notifications</div>
          <div class="fluz-notify-grid">
            <label class="fluz-check"><input type="checkbox" data-notify-setting="enabled" ${n.enabled ? 'checked' : ''}> Enable</label>
            <label class="fluz-check"><input type="checkbox" data-notify-setting="buy" ${n.buy ? 'checked' : ''}> BUY</label>
            <label class="fluz-check"><input type="checkbox" data-notify-setting="sell" ${n.sell ? 'checked' : ''}> SELL</label>
            <label class="fluz-check"><input type="checkbox" data-notify-setting="claim" ${n.claim ? 'checked' : ''}> CLAIM</label>
            <label class="fluz-check"><input type="checkbox" data-notify-setting="topup" ${n.topup ? 'checked' : ''}> TOP UP</label>
            <label class="fluz-check"><input type="checkbox" data-notify-setting="rebalance" ${n.rebalance ? 'checked' : ''}> REBALANCE</label>
          </div>
          <div class="fluz-form-grid">
            <label>Min priority
              <input type="number" min="1" max="100" data-notify-setting="minPriority" value="${escapeHtml(n.minPriority)}">
            </label>
            <label>Cooldown min
              <input type="number" min="1" max="1440" data-notify-setting="cooldownMinutes" value="${escapeHtml(n.cooldownMinutes)}">
            </label>
          </div>
          <div class="fluz-mini-row">
            <button class="fluz-button" data-action="test-notification">Test</button>
            <button class="fluz-button" data-action="clear-notification-history">Clear history</button>
          </div>
        </div>
      </div>
      ${ultimateUnlocked ? `
      <div class="fluz-card">
        <div class="fluz-section-title">Stock Intelligence</div>
        <div class="fluz-check-grid">
          <label class="fluz-check">
            <input type="checkbox" data-setting="stockIntelligenceEnabled" ${state.settings.stockIntelligenceEnabled ? 'checked' : ''}>
            Enable Tornsy Stock Intelligence
          </label>
          <label class="fluz-check">
            <input type="checkbox" data-setting="stockDriveSyncEnabled" ${state.settings.stockDriveSyncEnabled ? 'checked' : ''}>
            Use private archive model
          </label>
        </div>
        <div class="fluz-form-grid">
          <label>Private model token
            <input type="password" autocomplete="off" data-setting="stockSyncToken" value="${escapeHtml(state.settings.stockSyncToken || '')}" placeholder="Only for FLUZ/private testers">
          </label>
          <label>Model endpoint
            <input type="text" data-setting="stockSyncEndpoint" value="${escapeHtml(state.settings.stockSyncEndpoint || APP.stockSyncBaseUrl)}">
          </label>
        </div>
        <p class="fluz-muted">Default mode uses Tornsy directly. Private archive mode uses the slow R2/Tornsy candle archive when your token is saved, then falls back to Tornsy direct if the archive is not ready. No API keys, portfolio data, or user snapshots are uploaded.</p>
        <p class="fluz-muted">${escapeHtml(stockIntelStatusText())}</p>
        <div class="fluz-mini-row">
          <button class="fluz-button primary" data-action="stock-intel-sync-now" ${state.settings.stockIntelligenceEnabled ? '' : 'disabled'}>Refresh intelligence</button>
          <a class="fluz-button" href="${escapeHtml(APP.tornsyBaseUrl)}" target="_blank" rel="noopener noreferrer">Open Tornsy API</a>
          <a class="fluz-button" href="${escapeHtml(APP.stockSyncDownloadUrl)}" target="_blank" rel="noopener noreferrer">Open download page</a>
          <button class="fluz-button" data-action="stock-intel-export">Export cached model</button>
          <button class="fluz-button danger" data-action="stock-intel-reset">Reset cache</button>
        </div>
        <p class="fluz-muted">Refresh downloads one compact intelligence model and caches it locally for a few minutes.</p>
      </div>
      ` : ''}
      <div class="fluz-card">
        <div class="fluz-section-title">Cache</div>
        <div class="fluz-cache-row">
          <div class="fluz-cache-line">${cacheText}</div>
          <div class="fluz-mini-row">
            <button class="fluz-button" data-action="refresh">Refresh now</button>
            <button class="fluz-button danger" data-action="reset-local-data">Reset local data</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCacheInfo() {
    const info = state.cacheInfo || {};
    const parts = ['market', 'user', 'bank', 'tornsy'].map((key) => {
      const item = info[key];
      if (!item || !item.fetchedAt) return `${key}: not loaded`;
      const age = Math.max(0, Math.round((nowMs() - item.fetchedAt) / 1000));
      const status = item.fromCache ? (item.stale ? 'stale cache' : 'cache') : 'fresh';
      return `${key}: ${status}, ${age}s old`;
    });
    return parts.join('  /  ');
  }

  function renderAboutTab() {
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">About</div>
        <p><strong>${APP.name}</strong> v${APP.version}</p>
        <p class="fluz-muted">This helper is read-only. It displays recommendations, calculations, and alerts, but it never buys, sells, trades, claims, clicks, or performs account actions for you.</p>
        <p class="fluz-muted">Your Torn API key is stored locally by your userscript manager and is only sent to api.torn.com for official Torn API requests.</p>
        <p>Made by FLUZ</p>
        <p><a href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">Donate to FLUZ</a></p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">What this version does</div>
        <p class="fluz-muted">Portfolio P/L, benefit progress, ROI, bank comparison, optional Tornsy momentum, locks, stock finding, a shares/money calculator, and optional non-spammy notifications.</p>
      </div>
    `;
  }

  function renderProfileWindowContent() {
    const apiOk = isApiKeyReasonable(state.apiKey);
    const ffOk = !!state.utility.ffscouterEnabled;
    const notificationStatus = typeof Notification === 'undefined' ? 'not supported' : Notification.permission;
    return `
      <div class="fluz-profile-hero">
        <h3>TORN'z Profile</h3>
        <p>Global app settings, API access, and helper permissions for every TORN'z Tools window.</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Torn API key</span><span class="fluz-muted">${apiOk ? 'saved locally' : 'needed for live data'}</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b class="${apiOk ? 'fluz-pos' : 'fluz-neg'}">${apiOk ? 'YES' : 'NO'}</b><em>key saved</em></span>
          <span><b>${escapeHtml(notificationStatus)}</b><em>desktop notices</em></span>
          <span><b class="${ffOk ? 'fluz-pos' : 'fluz-neg'}">${ffOk ? 'YES' : 'NO'}</b><em>FFScouter allowed</em></span>
        </div>
        <div class="fluz-form-grid">
          <label>New API key
            <input type="password" data-input="api-key" placeholder="${apiOk ? 'Saved locally - paste to replace' : 'Paste Limited Access key'}">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="save-api-key">Save key</button>
          </label>
        </div>
        <div class="fluz-mini-row" style="margin-top:7px;">
          <span class="fluz-muted">The key is never shown after saving. Torn requests go only to api.torn.com.</span>
          <button class="fluz-button danger" data-action="clear-api-key">Clear key</button>
        </div>
      </div>
      <div class="fluz-settings-columns">
        <div class="fluz-card">
          <div class="fluz-section-title">Global alerts</div>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="targetSoundAlerts" ${state.utility.targetSoundAlerts ? 'checked' : ''}> Target ready sound</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="targetDesktopAlerts" ${state.utility.targetDesktopAlerts ? 'checked' : ''}> Target desktop notification</label>
          <div class="fluz-form-grid" style="margin-top:7px;">
            <label>Timer tone
              <select data-utility-setting="timerAlertTone">
                <option value="soft" ${state.utility.timerAlertTone === 'soft' ? 'selected' : ''}>Soft</option>
                <option value="standard" ${(state.utility.timerAlertTone || 'standard') === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="urgent" ${state.utility.timerAlertTone === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </label>
            <label>Volume
              <input type="number" min="0" max="100" step="1" data-utility-setting="timerAlertVolume" value="${escapeHtml(state.utility.timerAlertVolume ?? 55)}">
            </label>
          </div>
          <button class="fluz-button" style="margin-top:7px;" data-action="test-utility-alert">Test alarm</button>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">FFScouter permission</div>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="ffscouterEnabled" ${state.utility.ffscouterEnabled ? 'checked' : ''}> Enable FFScouter features and allow manual requests with my saved key.</label>
          <div class="fluz-mini-row" style="margin-top:7px;">
            <button class="fluz-button" data-action="check-ffscouter-key" ${apiOk && ffOk ? '' : 'disabled'}>Check FFScouter</button>
            <a class="fluz-button" href="https://ffscouter.com/" target="_blank" rel="noopener noreferrer">Policy</a>
          </div>
          <p class="fluz-muted">FFScouter receives your key only when this is enabled and you press a FFScouter button. All normal app API calls still use Torn's official API.</p>
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Small guide</div>
        <p class="fluz-muted">Use the grey Profile button in any TORN'z Tools header for API and app-wide settings. Use the blue Settings buttons for page-specific tuning, and the yellow Guide buttons for page-specific help.</p>
        <p class="fluz-muted">This helper stays read-only/manual-assist: no automatic buying, selling, attacking, betting, listing, training, or account actions.</p>
      </div>
    `;
  }

  function openProfileWindow() {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box settings profile-settings">
        <div class="fluz-window-head">
          <strong>TORN'z Profile</strong>
          <span class="fluz-muted">API, alerts, global app settings</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-window-body">${renderProfileWindowContent()}</div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function openSettingsWindow() {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box settings stock-settings">
        <div class="fluz-window-head">
          <strong>Strategy Console</strong>
          <span class="fluz-muted">Combos, risk, notifications</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-window-body">${renderSettingsTab()}</div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function openGuideWindow() {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box guide">
        <div class="fluz-window-head">
          <strong>TORN'z Guidebook</strong>
          <span class="fluz-muted">Signals, strategies, rhythm</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-window-body">${renderGuideContent()}</div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function openGymGuideWindow() {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box guide">
        <div class="fluz-window-head">
          <strong>TORN'z Gym Guidebook</strong>
          <span class="fluz-muted">Builds, gyms, happy, boosts</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-window-body">${renderGymGuideContent()}</div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function openGymSettingsWindow() {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box settings gym-settings">
        <div class="fluz-window-head">
          <strong>TORN'z Gym Settings</strong>
          <span class="fluz-muted">Build, current gym, manual stats</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-window-body">${renderGymSettingsContent()}</div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function openUtilityGuideWindow(module = getUtilityModule()) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box guide">
        <div class="fluz-window-head">
          <strong>${escapeHtml(module.title)} Guide</strong>
          <span class="fluz-muted">${escapeHtml(module.short)} manual assist</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-window-body">${renderUtilityGuide(module)}</div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function openUtilitySettingsWindow(module = getUtilityModule()) {
    const previousBody = $(`#${APP.id}-modal .fluz-modal-box.utility-settings .fluz-window-body`);
    const previousScrollTop = previousBody ? previousBody.scrollTop : 0;
    const shouldRestoreScroll = !!previousBody;
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box settings utility-settings">
        <div class="fluz-window-head">
          <strong>${escapeHtml(module.title)} Settings</strong>
          <span class="fluz-muted">${escapeHtml(module.short)} preferences</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-window-body">${renderUtilitySettings(module)}</div>
      </div>
    `;
    mountModalOverlay(overlay);
    if (shouldRestoreScroll) {
      requestAnimationFrame(() => {
        const body = $(`#${APP.id}-modal .fluz-modal-box.utility-settings .fluz-window-body`);
        if (body) body.scrollTop = previousScrollTop;
      });
    }
  }

  function openDonateWindow() {
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.innerHTML = `
      <div class="fluz-modal-box donate">
        <div class="fluz-window-head">
          <strong>FLUZ Supporter Vault</strong>
          <span class="fluz-muted">Prestige corner</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <div class="fluz-donate-hero">
          <h3>Made by FLUZ</h3>
          <p>TORN'z Tools is read-only helper software built for cleaner decisions, faster checks, and less spreadsheet pain.</p>
          <a class="fluz-donate-button" href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">Donate to FLUZ</a>
          <p class="fluz-muted" style="margin-top:10px;">Profile opens in a new tab. No automatic trades, no automatic actions.</p>
        </div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function mountModalOverlay(overlay) {
    const box = overlay && $('.fluz-modal-box', overlay);
    if (box) {
      box.classList.add('is-height-managed');
      if (!$('.fluz-window-body', box)) box.classList.add('is-plain-height-managed');
      if (!$('[data-resize-window="modal"]', box)) {
        const handle = document.createElement('div');
        handle.className = 'fluz-vertical-resize';
        handle.dataset.resizeWindow = 'modal';
        handle.title = 'Drag vertically to resize';
        box.appendChild(handle);
      }
    }
    const host = document.body || document.documentElement;
    if (host) host.appendChild(overlay);
    requestAnimationFrame(() => applyModalSize(overlay));
  }

  function applyModalSize(overlay = $(`#${APP.id}-modal`)) {
    const box = overlay && $('.fluz-modal-box', overlay);
    if (!box) return;
    const stored = parseNumber(state.panel.modalHeight);
    if (!stored) {
      box.style.height = '';
      return;
    }
    box.style.height = `${clampWindowHeight(stored, box.offsetHeight || 420, 150, modalContentMaxHeight(box))}px`;
  }

  function renderGymSettingsContent() {
    return `
      <div class="fluz-guide-hero">
        <h3>The FLUZ Gym Console</h3>
        <p>Choose your build target and current gym. Live stats come from your saved Torn API key, and training is still fully manual in Torn.</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Build settings</div>
        <div class="fluz-form-grid">
          <label>Saved build
            <select data-gym-setting="buildKey">
              ${Object.values(GYM_BUILDS).map((buildOption) => `<option value="${buildOption.key}" ${state.gym.buildKey === buildOption.key ? 'selected' : ''}>${buildOption.label}</option>`).join('')}
              ${(state.gym.customBuilds || []).map((buildOption) => `<option value="saved:${escapeHtml(buildOption.id)}" ${state.gym.buildKey === `saved:${buildOption.id}` ? 'selected' : ''}>${escapeHtml(buildOption.name)}</option>`).join('')}
              <option value="custom" ${state.gym.buildKey === 'custom' ? 'selected' : ''}>Custom</option>
            </select>
          </label>
          <label>Current gym
            <select data-gym-setting="selectedGym">
              ${GYM_DATABASE.map((gym) => `<option value="${escapeHtml(gym.name)}" ${state.gym.selectedGym === gym.name ? 'selected' : ''}>${escapeHtml(gym.name)}</option>`).join('')}
            </select>
          </label>
          <label>Build name
            <input type="text" data-gym-setting="customBuildName" value="${escapeHtml(state.gym.customBuildName || '')}" placeholder="Dex build, Tank, etc.">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="save-gym-build">Save build</button>
          </label>
        </div>
        ${renderGymTargetInputs()}
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:8px;">
          ${String(state.gym.buildKey || '').startsWith('saved:') ? `<button class="fluz-button danger" data-action="delete-gym-build">Delete selected build</button>` : ''}
          <button class="fluz-button" data-action="mark-all-gyms">Mark all gyms</button>
          <button class="fluz-button danger" data-action="clear-available-gyms">Clear gyms</button>
        </div>
      </div>
    `;
  }

  function renderHospitalStatusCard() {
    const status = getOwnHospitalStatusFromPage();
    const itemLinks = ['Small First Aid Kit', 'First Aid Kit', 'Morphine', 'Blood Bag', 'Empty Blood Bag'];
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Your hospital status</span><span class="fluz-muted">${status.inHospital ? 'hospitalized' : 'not detected'}</span></div>
        ${status.inHospital ? `
          <div class="fluz-metric-grid">
            <span><b data-hospital-countdown data-hospital-until="${escapeHtml(String(status.untilMs))}">${escapeHtml(formatDurationShort(status.remainingMs))}</b><em>remaining</em></span>
            <span><b>${escapeHtml(status.exitTime)}</b><em>exit time</em></span>
            <span><b>${escapeHtml(status.reason || 'Hospital')}</b><em>reason</em></span>
          </div>
          <div class="fluz-alert">Set a local helper timer for your hospital exit. Alerts are reminders only; you still choose what to do manually.</div>
          <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
            ${[10, 5, 2, 1].map((mins) => `<button class="fluz-button primary" data-action="set-hospital-alert" data-offset-minutes="${escapeHtml(String(mins))}" data-hospital-until="${escapeHtml(String(status.untilMs))}">${escapeHtml(String(mins))}m before</button>`).join('')}
            <button class="fluz-button warn" data-action="set-hospital-alert" data-offset-minutes="0" data-hospital-until="${escapeHtml(String(status.untilMs))}">At 00</button>
          </div>
        ` : `
          <p class="fluz-muted">I do not see your own hospital timer on this page yet. If you are hospitalized, refresh after Torn's orange hospital notice appears.</p>
        `}
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Recovery links</span><span class="fluz-muted">manual only</span></div>
        <div class="fluz-link-grid">
          <a class="fluz-button primary" href="https://www.torn.com/item.php" target="_blank" rel="noopener noreferrer">My items</a>
          <a class="fluz-button" href="https://www.torn.com/factions.php?step=your" target="_blank" rel="noopener noreferrer">Faction</a>
          <a class="fluz-button" href="https://www.torn.com/hospitalview.php" target="_blank" rel="noopener noreferrer">Hospital</a>
          ${itemLinks.map((name) => `<a class="fluz-button" href="${escapeHtml(itemMarketUrl(name))}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`).join('')}
        </div>
        <p class="fluz-muted">Links only open pages/items. The helper never uses medical items, requests revives, or performs hospital actions.</p>
      </div>
    `;
  }

  function getOwnHospitalStatusFromPage() {
    const bodyText = document.body ? cleanBookieText(document.body.innerText || '') : '';
    const helperText = state.elements.panel ? cleanBookieText(state.elements.panel.innerText || '') : '';
    const text = helperText ? bodyText.replace(helperText, ' ') : bodyText;
    const patterns = [
      /You are in hospital for another\s+(.+?)(?:!|\.|\s+You better|\s+Mugged|\s+Attacked|$)/i,
      /You are in hospital for\s+(.+?)(?:!|\.|\s+You better|\s+Mugged|\s+Attacked|$)/i,
      /In hospital for\s+(.+?)(?:!|\.|\s+Mugged|\s+Attacked|$)/i
    ];
    let durationText = '';
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        durationText = cleanBookieText(match[1]);
        break;
      }
    }
    const remainingMs = parseTornDurationToMs(durationText);
    const reasonMatch = text.match(/\b(?:Attacked|Mugged|Hospitalized|Revive failed|Overdosed)[^.!]{0,80}/i);
    const reason = reasonMatch ? cleanBookieText(reasonMatch[0]) : '';
    const untilMs = remainingMs > 0 ? nowMs() + remainingMs : 0;
    return {
      inHospital: remainingMs > 0,
      remainingMs,
      untilMs,
      exitTime: untilMs ? new Date(untilMs).toLocaleTimeString() : '--',
      reason
    };
  }

  function scheduleHospitalCountdown() {
    clearInterval(state.hospitalCountdownTimer);
    state.hospitalCountdownTimer = setInterval(() => {
      const element = $(`#${APP.id} [data-hospital-countdown]`);
      if (!element) return;
      const until = parseNumber(element.dataset.hospitalUntil);
      element.textContent = formatDurationShort(until - nowMs());
    }, 1000);
  }

  function renderGymGuideContent() {
    return `
      <div class="fluz-guide-hero">
        <h3>The FLUZ Gym Field Manual</h3>
        <p>Pick a build target, compare your current stat balance, then train the stat furthest below target in the best gym you can use.</p>
      </div>
      <div class="fluz-guide-grid">
        <div class="fluz-guide-card wide">
          <h4>Build targets</h4>
          <p><span class="fluz-guide-pill good">Balanced</span> keeps all four stats near 25% each. Good default.</p>
          <p><span class="fluz-guide-pill info">Dex Build</span> uses 20/10/20/50 in Torn order: Strength, Defense, Speed, Dexterity.</p>
          <p><span class="fluz-guide-pill warn">Striker</span> pushes Strength and Speed first for attack-focused growth.</p>
          <p><span class="fluz-guide-pill bad">Specialist</span> builds can unlock specialist gyms later, but they create uneven stats on purpose.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>How the train signal works</h4>
          <p>The helper calculates each stat as a percent of total battle stats, compares it to your build target, and picks the biggest shortfall.</p>
          <p>It also shows your selected gym dots and the best known gym for that stat. It does not press train.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Gym dots</h4>
          <p>Higher dots mean better gains for that stat. Some gyms are balanced; specialist gyms are excellent for one or two stats but useless for others.</p>
          <p>Use the Gyms tab to compare Strength, Speed, Defense, and Dexterity quickly.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Happy and energy</h4>
          <p>Training gain is influenced by energy used, gym dots, happiness, stat size, and modifiers. High happy can improve gains, but happy drops after training.</p>
          <p>Happy jumps are powerful but need timing, item costs, and cooldown awareness.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Boost items</h4>
          <p><span class="fluz-guide-pill info">Xanax</span> gives large energy but has drug cooldown and addiction risk.</p>
          <p><span class="fluz-guide-pill warn">Ecstasy</span> doubles happy and is often used in happy jump setups.</p>
          <p><span class="fluz-guide-pill good">Candy/DVD/FHC</span> raise happy. Compare item value before planning a jump.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Safe use</h4>
          <p>This gym helper is read-only. It can calculate, explain, and compare, but it never trains, uses drugs, consumes items, or clicks anything for you.</p>
        </div>
      </div>
    `;
  }

  function renderGuideContent() {
    return `
      <div class="fluz-guide-hero">
        <h3>The FLUZ Stock Field Manual</h3>
        <p>Pick a combo first. Read the colored tags second. Decide manually third. The tool never buys or sells for you.</p>
      </div>
      <div class="fluz-guide-grid">
        <div class="fluz-guide-card wide">
          <h4>Combos are the main control</h4>
          <p>Combos set both the money method and the investor speed. This is easier than guessing which two dropdowns belong together.</p>
          <div class="fluz-guide-combos">
            ${Object.values(STRATEGY_COMBOS).map((combo) => `
              <div class="fluz-guide-combo ${combo.color}">
                <strong>${escapeHtml(combo.label)}</strong>
                <span>${escapeHtml(combo.description)}</span>
                <span>${escapeHtml(combo.rhythm)}</span>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="fluz-guide-card wide">
          <h4>Decision flow</h4>
          <div class="fluz-guide-flow">
            <div class="fluz-guide-step"><b>1. Combo</b>Choose how much attention and risk you want today.</div>
            <div class="fluz-guide-step"><b>2. Tags</b>Check trend, cheap/expensive, net P/L, and benefit tags.</div>
            <div class="fluz-guide-step"><b>3. Fee</b>Sell advice uses net P/L after Torn's ${APP.sellFeePct}% sell fee.</div>
            <div class="fluz-guide-step"><b>4. Manual</b>Confirm in Torn. No auto-buy, no auto-sell, no auto-click.</div>
          </div>
        </div>
        <div class="fluz-guide-card">
          <h4>Priority colors</h4>
          <p><span class="fluz-guide-pill bad">90+</span> urgent: claim-ready, sharp sell risk, or very strong chance to act.</p>
          <p><span class="fluz-guide-pill warn">70-89</span> high: look soon, especially for BUY/SELL/TOP UP.</p>
          <p><span class="fluz-guide-pill info">45-69</span> medium: useful but not emergency.</p>
          <p><span class="fluz-guide-pill good">0-44</span> low/watch: context, planning, or save-toward ideas.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Signal tags</h4>
          <p><span class="fluz-signal-tag good">Going Up</span> trend or momentum is positive.</p>
          <p><span class="fluz-signal-tag good">Cheap</span> RSI is low; can mean oversold, not guaranteed profit.</p>
          <p><span class="fluz-signal-tag bad">-2.1% this week</span> recent price weakness.</p>
          <p><span class="fluz-signal-tag fee">0.1% sell fee</span> fee is included in net P/L.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Buy signals</h4>
          <div class="fluz-guide-signal-list">
            <p><span class="fluz-guide-action dip">BUY DIP</span><span class="fluz-guide-text">price low; momentum starts recovering.</span></p>
            <p><span class="fluz-guide-action buy">BUY</span><span class="fluz-guide-text">strong benefit/ROI or strategy match.</span></p>
            <p><span class="fluz-guide-action buy">BUY MORE</span><span class="fluz-guide-text">already held, but still a strong next-cash add.</span></p>
            <p><span class="fluz-guide-action maybe">MAYBE BUY</span><span class="fluz-guide-text">reasonable idea; confirm manually.</span></p>
            <p><span class="fluz-guide-action save">SAVE</span><span class="fluz-guide-text">good target, not affordable yet.</span></p>
          </div>
        </div>
        <div class="fluz-guide-card">
          <h4>Sell signals</h4>
          <div class="fluz-guide-signal-list">
            <p><span class="fluz-guide-action sell">SELL</span><span class="fluz-guide-text">net profit target reached after fee.</span></p>
            <p><span class="fluz-guide-action soon">SELL SOON</span><span class="fluz-guide-text">profitable, but momentum may fade.</span></p>
            <p><span class="fluz-guide-action now">SELL NOW</span><span class="fluz-guide-text">loss risk plus bad momentum.</span></p>
            <p><span class="fluz-guide-action extra">SELL EXTRA</span><span class="fluz-guide-text">extra block shares may be removable.</span></p>
          </div>
        </div>
        <div class="fluz-guide-card">
          <h4>Next cash target</h4>
          <p><span class="fluz-guide-action buy">BEST BUY</span> is the app's best new-position idea. <span class="fluz-guide-action buy">BUY MORE</span> means the best next-money idea is one you already hold.</p>
          <p>It considers momentum, RSI, local memory, marginal benefit progress, current cash, and concentration in stocks you already hold.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Benefits vs trading</h4>
          <p><span class="fluz-guide-pill info">Benefits ON</span> means blocks, claims, ROI, top-ups, and bank comparison can heavily affect signals.</p>
          <p><span class="fluz-guide-pill warn">Ignore benefits</span> means the app focuses mostly on price movement and net buy/sell profit.</p>
          <p>For pure flipping, use <strong>Profit Flip</strong> or <strong>Redline Trader</strong>. For long money planning, use <strong>Benefit Stack</strong>.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Market reality</h4>
          <p>TORN stock prices can be volatile. The helper prefers repeatable signals: cheapness, recovering momentum, net P/L after the ${APP.sellFeePct}% sell fee, and diversification.</p>
          <p>For high risk it tolerates more holdings and faster entries. For low risk it penalizes concentration harder and waits for stronger signals.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Investor speed</h4>
          <ul>
            <li><strong>Day Trader:</strong> tight profit/loss thresholds. Best only if you check often.</li>
            <li><strong>Active Investor:</strong> daily practical mode. Good middle ground.</li>
            <li><strong>Long-Term Investor:</strong> slower, calmer, better for benefit planning.</li>
          </ul>
        </div>
        <div class="fluz-guide-card">
          <h4>What to use</h4>
          <p><span class="fluz-guide-pill good">New/default</span> Daily Swing.</p>
          <p><span class="fluz-guide-pill info">Low time</span> Safe Builder or Benefit Stack.</p>
          <p><span class="fluz-guide-pill warn">Active trading</span> Profit Flip.</p>
          <p><span class="fluz-guide-pill bad">High attention</span> Redline Trader, but only when online.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Local memory</h4>
          <p>Local price memory stores prices your browser has seen for up to 45 days. It helps when Tornsy is missing and makes the helper less random over time.</p>
          <p>It stays local. Clearing local data resets it.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Bank and bonus</h4>
          <p>Manual bank bonus adjusts APR comparison for merits or benefits that are not obvious in API data. It affects benefit-vs-bank judgment, not price momentum.</p>
          <p>If the bank beats a cash benefit and your bank is locked, the guide will say it may not be actionable right now.</p>
        </div>
        <div class="fluz-guide-card">
          <h4>Why signals differ from other tools</h4>
          <p>Tools disagree because they use different RSI periods, cache timing, benefit values, sell-fee handling, thresholds, and whether they count partial blocks or bank opportunity cost.</p>
          <p>This tool intentionally changes behavior when you change combo, risk, benefits, Tornsy, or local memory.</p>
        </div>
      </div>
    `;
  }

  // ---------------------------------------------------------------------------
  // Event handling
  // ---------------------------------------------------------------------------
