  function renderMugProtectionHelper() {
    const xid = getMugTargetXid();
    const result = state.mugProtectionResult && state.mugProtectionResult.xid === xid ? state.mugProtectionResult : null;
    const statusClass = result && result.risky ? 'danger' : (result ? 'info' : '');
    return `
      <div class="fluz-section-title"><span>Mug protection check</span><span class="fluz-muted">api.torn.com only</span></div>
      <div class="fluz-card">
        <div class="fluz-form-grid">
          <label>Target XID
            <input type="text" data-utility-setting="mugTargetXid" value="${escapeHtml(xid || state.utility.mugTargetXid || '')}" placeholder="Profile XID or attack user2ID">
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:8px;">
          <button class="fluz-button primary" data-action="check-mug-protection" ${xid || state.utility.mugTargetXid ? '' : 'disabled'}>Check mug protection</button>
          ${xid ? `<a class="fluz-button" href="${escapeHtml(profileUrlFromXid(xid))}" target="_blank" rel="noopener noreferrer">Open profile</a>` : ''}
        </div>
        <div class="fluz-alert ${statusClass}" style="margin-top:8px;">
          ${renderMugProtectionResult(result)}
        </div>
      <p class="fluz-muted">Checks current Clothing Store mug protection context. It does not press attack outcomes and does not auto-refresh targets.</p>
      </div>
    `;
  }

  function renderMugProtectionResult(result) {
    if (state.mugProtectionLoading) return 'Checking Torn API...';
    if (!result) return 'No check run yet. Press the button before deciding manually.';
    if (result.error) return `Check failed: ${escapeHtml(result.error)}`;
    if (result.risky) return `<strong>High mug protection risk:</strong> ${escapeHtml(result.name)} appears to be in a Clothing Store${result.rating ? ` (${result.rating} star)` : ''}.`;
    if (result.clothingStore) return `${escapeHtml(result.name)} has Clothing Store icon data, but high rating was not confirmed. Review manually.`;
    return `${escapeHtml(result.name)}: no Clothing Store mug protection icon detected from this API check.`;
  }

  function getMugTargetXid() {
    const params = new URLSearchParams(window.location.search || '');
    return String(params.get('user2ID') || parseProfileXid(window.location.href) || state.utility.mugTargetXid || '').replace(/\D/g, '');
  }

  async function checkMugProtection() {
    const xid = getMugTargetXid();
    if (!xid) {
      showFlash('Open an attack/profile page or enter a target XID first.');
      return;
    }
    if (!isApiKeyReasonable(state.apiKey)) {
      showFlash('Add your Torn API key in Profile first.');
      return;
    }
    state.mugProtectionLoading = true;
    renderPanelPreservingScroll();
    try {
      const userUrl = `${APP.apiBaseUrl}/user/${encodeURIComponent(xid)}?selections=basic,icons&key=${encodeURIComponent(state.apiKey)}`;
      const user = await httpGetJson(userUrl);
      assertTornApiOk(user, 'Mug protection user');
      const icons = { ...(user.basicicons || {}), ...(user.icons || {}) };
      const iconText = Object.values(icons).join(' ').toLowerCase();
      const clothingStore = /company/.test(iconText) && /clothing store/.test(iconText);
      let rating = 0;
      const companyId = user.job && (user.job.company_id || user.job.companyId || user.job.id);
      if (clothingStore && companyId) {
        try {
          const company = await httpGetJson(`${APP.apiBaseUrl}/company/${encodeURIComponent(companyId)}?selections=profile&key=${encodeURIComponent(state.apiKey)}`);
          assertTornApiOk(company, 'Mug protection company');
          rating = parseNumber(company.company && company.company.rating);
        } catch (error) {
          console.debug(`${APP.name}: company mug protection rating lookup failed`, error);
        }
      }
      state.mugProtectionResult = {
        xid,
        name: cleanProfileName(user.name || `XID ${xid}`, xid),
        clothingStore,
        rating,
        risky: clothingStore && (!rating || rating >= 7),
        checkedAt: nowMs()
      };
      showFlash(state.mugProtectionResult.risky ? 'Mug protection warning found.' : 'Mug protection check complete.');
    } catch (error) {
      state.mugProtectionResult = { xid, error: friendlyError(error), checkedAt: nowMs() };
      showFlash(`Mug check failed: ${friendlyError(error)}`);
    } finally {
      state.mugProtectionLoading = false;
      renderPanelPreservingScroll();
    }
  }

  function addictionBattleStatReductionFromAp(ap) {
    const value = Math.max(0, parseNumber(ap));
    if (value <= 0) return 0;
    return Math.max(0, 12 * Math.log(value / 143));
  }

  function addictionApFromReduction(pct) {
    const value = Math.max(0, parseNumber(pct));
    if (value <= 0) return 0;
    return 143 * Math.exp(value / 12);
  }

  function extractAddictionDebuffPct(user) {
    const icons = user && user.icons;
    if (icons && typeof icons === 'object') {
      for (const value of Object.values(icons)) {
        const text = String(value || '');
        if (!/brain|addict/i.test(text)) continue;
        const match = text.match(/(-?\d+(?:\.\d+)?)\s*%/);
        if (match) return Math.abs(parseNumber(match[1]));
      }
    }
    const text = String(document.body && document.body.innerText ? document.body.innerText : '');
    const patterns = [
      /brain\s*[-:]\s*addiction\D{0,20}(-?\d+(?:\.\d+)?)\s*%/i,
      /addiction\D{0,20}(-?\d+(?:\.\d+)?)\s*%\D{0,20}brain/i,
      /brain\D{0,20}(-?\d+(?:\.\d+)?)\s*%/i
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return Math.abs(parseNumber(match[1]));
    }
    return null;
  }

  function extractAddictionPersonalStats(user) {
    const stats = (user && user.personalstats) || {};
    return {
      rehabsDone: parseNumber(stats.rehabcount ?? stats.rehabs ?? state.utility.addictionManualRehabsDone),
      xantaken: stats.xantaken == null ? null : parseNumber(stats.xantaken),
      drugsused: stats.drugsused == null ? null : parseNumber(stats.drugsused),
      overdosed: stats.overdosed == null ? null : parseNumber(stats.overdosed)
    };
  }

  function addictionRehabRemovalAp(rehabsDone) {
    const count = Math.max(0, parseNumber(rehabsDone));
    if (count >= 20000) return 1;
    return Math.max(1, 90 - count * ((90 - 1) / 20000));
  }

  function extractCompanyAddictionPenalty() {
    const manual = parseNumber(state.utility.addictionCompanyPenalty || 0);
    if (manual) return manual;
    const text = String(document.body && document.body.innerText ? document.body.innerText : '');
    const match = text.match(/company\D{0,45}addiction\D{0,18}(-?\d+(?:\.\d+)?)/i)
      || text.match(/addiction\D{0,45}company\D{0,18}(-?\d+(?:\.\d+)?)/i);
    return match ? parseNumber(match[1]) : 0;
  }

  function recordAddictionHistory(pct) {
    if (pct == null || !Number.isFinite(parseNumber(pct))) return normalizeAddictionHistory();
    const now = nowMs();
    const history = normalizeAddictionHistory();
    const last = history[history.length - 1];
    if (!last || Math.abs(parseNumber(last.v) - pct) >= 0.05 || now - parseNumber(last.t) > 5 * 60 * 1000) {
      history.push({ t: now, v: Math.round(pct * 100) / 100 });
      state.utility.addictionHistory = history.slice(-24);
      writeJsonStorage(STORAGE.utilityState, state.utility);
    }
    return state.utility.addictionHistory || [];
  }

  function normalizeAddictionHistory() {
    return (Array.isArray(state.utility.addictionHistory) ? state.utility.addictionHistory : [])
      .map((item) => ({ t: parseNumber(item && item.t), v: parseNumber(item && item.v) }))
      .filter((item) => item.t > 0 && Number.isFinite(item.v))
      .slice(-24);
  }

  function addictionTrend(history) {
    if (!Array.isArray(history) || history.length < 2) return { label: 'tracking', className: '' };
    const first = history[0].v;
    const last = history[history.length - 1].v;
    const delta = last - first;
    if (Math.abs(delta) < 0.05) return { label: 'stable', className: 'good' };
    return delta > 0
      ? { label: `up ${delta.toFixed(1)}pp`, className: 'bad' }
      : { label: `down ${Math.abs(delta).toFixed(1)}pp`, className: 'good' };
  }

  function renderAddictionHistory(history, warnPct) {
    if (!Array.isArray(history) || history.length < 2) return '<p class="fluz-muted">History starts once a debuff value is detected.</p>';
    const max = Math.max(warnPct || 8, ...history.map((item) => item.v), 5);
    return `
      <div class="fluz-addiction-history" title="Recent detected addiction debuff history">
        ${history.map((item) => {
          const height = clamp((item.v / max) * 100, 4, 100);
          const cls = item.v >= warnPct ? 'bad' : (item.v >= warnPct * .7 ? 'warn' : '');
          return `<i class="${cls}" style="height:${height.toFixed(1)}%"></i>`;
        }).join('')}
      </div>
    `;
  }

  function addictionNextDecayWindow() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 2, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 4, 0, 0));
    const tomorrow = new Date(start.getTime() + 24 * 60 * 60 * 1000);
    const ms = now.getTime();
    if (ms >= start.getTime() && ms < end.getTime()) {
      return { active: true, remainingMs: end.getTime() - ms };
    }
    return { active: false, remainingMs: (ms < start.getTime() ? start.getTime() : tomorrow.getTime()) - ms };
  }

  function estimateAddictionRehabPlan(currentPct, rehabsDone) {
    const targetPct = Math.max(0, parseNumber(state.utility.addictionRehabTargetPct || 4));
    const learnedDrop = Math.max(0, parseNumber(state.utility.addictionLearnedDropPct || 0));
    if (currentPct == null) return { text: 'No brain debuff detected yet.', status: 'ok', cost: '', rehabs: 0 };
    if (currentPct <= targetPct) return { text: `Already at or below ${targetPct}% target.`, status: 'ok', cost: '', rehabs: 0 };
    if (!learnedDrop) return { text: 'Do 1 rehab, recheck, then set learned drop / rehab in settings.', status: 'warn', cost: '', rehabs: 1 };
    const rehabs = Math.max(1, Math.ceil((currentPct - targetPct) / learnedDrop));
    const perRehab = Math.round(250000 * (1 + 0.0000125 * Math.max(0, parseNumber(rehabsDone))));
    let total = 0;
    for (let index = 0; index < rehabs; index += 1) {
      total += Math.round(250000 * (1 + 0.0000125 * (Math.max(0, parseNumber(rehabsDone)) + index)));
    }
    return {
      text: `${rehabs} rehab${rehabs === 1 ? '' : 's'} likely to target ${targetPct}%.`,
      status: currentPct >= Math.max(targetPct, parseNumber(state.utility.addictionEduRiskPct || 8)) ? 'danger' : 'warn',
      cost: `${formatMoney(total)} total / ${formatMoney(perRehab)} ea`,
      rehabs
    };
  }

  function renderAddictionAdvisor(options = {}) {
    const user = (state.utilityData && state.utilityData.user) || {};
    const pct = extractAddictionDebuffPct(user);
    const stats = extractAddictionPersonalStats(user);
    const eduRiskPct = Math.max(0, parseNumber(state.utility.addictionEduRiskPct || 8));
    const targetPct = Math.max(0, parseNumber(state.utility.addictionRehabTargetPct || 4));
    const ap = pct == null ? 0 : addictionApFromReduction(pct);
    const targetAp = addictionApFromReduction(targetPct);
    const decay = addictionNextDecayWindow();
    const naturalDecayAp = Math.max(0, parseNumber(state.utility.addictionNaturalDecayAp || 21));
    const xanaxAp = Math.max(0.01, parseNumber(state.utility.addictionXanaxAp || 9.75));
    const safeDoses = pct == null ? null : Math.max(0, Math.floor((addictionApFromReduction(eduRiskPct) - ap) / xanaxAp));
    const plan = estimateAddictionRehabPlan(pct, stats.rehabsDone);
    const source = pct == null ? 'not detected' : ((user.icons && Object.keys(user.icons).length) ? 'API icons' : 'visible page');
    const history = recordAddictionHistory(pct);
    const trend = addictionTrend(history);
    const waitDays = pct != null && ap > targetAp && naturalDecayAp > 0 ? Math.ceil((ap - targetAp) / naturalDecayAp) : 0;
    const nextDecayCanSolve = pct != null && naturalDecayAp > 0 && ap > targetAp && (ap - naturalDecayAp) <= targetAp;
    const companyPenalty = extractCompanyAddictionPenalty();
    const companyAbs = Math.abs(companyPenalty);
    const companyStatus = companyAbs >= 12 ? 'bad' : (companyAbs >= 8 ? 'warn' : 'good');
    const traveling = getUtilityModule().key === 'travel' || /travel|flight|abroad/i.test(`${window.location.href} ${document.body ? document.body.innerText.slice(0, 1200) : ''}`);
    const rehabRemoval = addictionRehabRemovalAp(stats.rehabsDone);
    const hotTurkeyAp = Math.max(0, parseNumber(state.utility.addictionNaturalDecayAp || 21)) * Math.max(0, parseNumber(state.utility.addictionHotTurkeyDays || 31))
      + rehabRemoval * Math.max(0, parseNumber(state.utility.addictionHotTurkeyOds || 3));
    const milkRate = clamp(parseNumber(state.utility.addictionMilkSoberRate || 95), 0, 100) / 100;
    const milkRemoved = ap * milkRate;
    const milkAfterPct = addictionBattleStatReductionFromAp(Math.max(0, ap - milkRemoved));
    const riskClass = pct != null && pct >= eduRiskPct ? 'is-risk' : '';
    const trackMax = Math.max(eduRiskPct * 1.5, pct || 0, targetPct, 5);
    const pctWidth = pct == null ? 0 : clamp((pct / trackMax) * 100, 0, 100);
    const eduMarker = clamp((eduRiskPct / trackMax) * 100, 0, 100);
    const targetMarker = clamp((targetPct / trackMax) * 100, 0, 100);
    const waitText = pct == null
      ? 'No current debuff detected.'
      : (pct <= targetPct
        ? 'You are already at/under target.'
        : (nextDecayCanSolve
          ? `Next natural decay may reach target in ${formatDurationShort(decay.remainingMs)}.`
          : `Natural decay estimate: about ${waitDays} day${waitDays === 1 ? '' : 's'} to target.`));
    return `
      <div class="fluz-section-title"><span>Addiction Advisor</span><span class="fluz-muted">${escapeHtml(source)}${options.dedicated ? ' / dedicated tab' : ''}</span></div>
      <div class="fluz-addiction-hero">
        <div class="fluz-addiction-card ${riskClass}">
          <div class="fluz-addiction-score">
            <b>${pct == null ? '--' : `${escapeHtml(pct.toFixed(1))}%`}</b>
            <span>brain debuff / addiction reduction</span>
          </div>
          <div class="fluz-addiction-track" title="Target marker and education-risk marker">
            <span style="width:${pctWidth.toFixed(1)}%"></span>
            <i style="left:${targetMarker.toFixed(1)}%" title="Rehab target ${escapeHtml(targetPct)}%"></i>
            <i style="left:${eduMarker.toFixed(1)}%;background:#ffd166;" title="Education risk ${escapeHtml(eduRiskPct)}%"></i>
          </div>
          <div class="fluz-signal-tags">
            <span class="fluz-signal-tag ${pct != null && pct >= eduRiskPct ? 'bad' : 'good'}">${pct != null && pct >= eduRiskPct ? 'Education risk' : 'Education OK'}</span>
            <span class="fluz-signal-tag ${trend.className || 'info'}">Trend ${escapeHtml(trend.label)}</span>
            <span class="fluz-signal-tag ${traveling ? 'warn' : 'info'}">${traveling ? 'Travel check' : 'Local check'}</span>
          </div>
          ${renderAddictionHistory(history, eduRiskPct)}
        </div>
        <div class="fluz-addiction-card">
          <div class="fluz-mini-metrics fluz-bootleg-metrics">
            <span><b>${pct == null ? '--' : escapeHtml(compactNumber(Math.round(ap)))}</b><em>AP est.</em></span>
            <span><b>${escapeHtml(compactNumber(stats.rehabsDone || 0))}</b><em>rehabs</em></span>
            <span><b>${safeDoses == null ? '--' : escapeHtml(String(safeDoses))}</b><em>safe Xanax</em></span>
            <span><b class="${companyStatus === 'bad' ? 'fluz-neg' : (companyStatus === 'warn' ? '' : 'fluz-pos')}">${companyPenalty ? escapeHtml(String(companyPenalty)) : '0'}</b><em>company</em></span>
          </div>
          <p class="fluz-muted">Two markers: white = rehab target, yellow = education-risk threshold.</p>
        </div>
      </div>
      <div class="fluz-addiction-grid">
        <div class="fluz-addiction-note ${plan.status === 'danger' ? 'bad' : (plan.status === 'warn' ? 'warn' : '')}">
          <strong>Rehab plan</strong><br>
          ${escapeHtml(plan.text)}
          ${plan.cost ? `<br>${escapeHtml(plan.cost)}` : ''}
        </div>
        <div class="fluz-addiction-note ${nextDecayCanSolve ? '' : 'warn'}">
          <strong>Wait vs rehab</strong><br>
          ${escapeHtml(waitText)}<br>
          Decay window: ${decay.active ? 'active, ends in' : 'starts in'} ${escapeHtml(formatDurationShort(decay.remainingMs))}.
        </div>
        <div class="fluz-addiction-note">
          <strong>Book prep</strong><br>
          Hot Turkey prep: about ${escapeHtml(compactNumber(Math.round(hotTurkeyAp)))} AP buffer.<br>
          Milk Yourself Sober: removes about ${escapeHtml(compactNumber(Math.round(milkRemoved)))} AP → ${escapeHtml(milkAfterPct.toFixed(1))}% est.
        </div>
        <div class="fluz-addiction-note ${companyStatus === 'bad' ? 'bad' : (companyStatus === 'warn' ? 'warn' : '')}">
          <strong>Company / travel</strong><br>
          ${companyPenalty ? `Company addiction penalty: ${escapeHtml(String(companyPenalty))}.` : 'No company penalty detected or entered.'}<br>
          ${traveling ? 'If abroad, confirm rehab travel timing before planning actions.' : 'Use City/Travel tab for quick addiction checks before flying.'}
        </div>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Stats and routes</span><span class="fluz-muted">manual links</span></div>
        <div class="fluz-table">
          <div class="fluz-row fluz-market-row"><div class="fluz-cell-main">Drug stats</div><div>Xan ${stats.xantaken == null ? '--' : escapeHtml(compactNumber(stats.xantaken))}</div><div>Used ${stats.drugsused == null ? '--' : escapeHtml(compactNumber(stats.drugsused))}</div><div>OD ${stats.overdosed == null ? '--' : escapeHtml(compactNumber(stats.overdosed))}</div><div></div></div>
          <div class="fluz-row fluz-market-row"><div class="fluz-cell-main">Thresholds</div><div>Edu ${escapeHtml(eduRiskPct)}%</div><div>Target ${escapeHtml(targetPct)}%</div><div>Xan AP ${escapeHtml(xanaxAp)}</div><div></div></div>
        </div>
        <div class="fluz-route-grid" style="margin-top:8px;">
          <a class="fluz-route good" href="https://www.torn.com/rehab.php" target="_blank" rel="noopener noreferrer">Rehab</a>
          <a class="fluz-route info" href="https://www.torn.com/education.php" target="_blank" rel="noopener noreferrer">Education</a>
          <a class="fluz-route warn" href="https://www.torn.com/travelagency.php" target="_blank" rel="noopener noreferrer">Travel</a>
          <button class="fluz-button" data-action="utility-settings">Advisor settings</button>
        </div>
        <p class="fluz-muted">Read-only estimate. It never travels, rehabs, uses drugs, or clicks Torn actions. API icon/personalstats availability depends on your Torn key access.</p>
      </div>
    `;
  }

  async function useMissionItem(itemName) {
    const name = String(itemName || '').trim();
    if (!name) return;
    state.utility.missionItemName = name;
    await saveUtilityState();
    showFlash(`Mission reward set: ${name}`);
    renderPanel();
  }

