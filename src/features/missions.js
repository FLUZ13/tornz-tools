  function renderMissionPlanner() {
    const visible = scanMissionPageText();
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Mission snapshot</span><span class="fluz-muted">visible page</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(visible.credits || '--')}</b><em>credits seen</em></span>
          <span><b>${escapeHtml(visible.timers || '--')}</b><em>timer seen</em></span>
          <span><b>${escapeHtml(visible.status || 'manual')}</b><em>status</em></span>
        </div>
        <p class="fluz-muted">Visible scan is only a helper. Torn mission layouts vary, so always confirm credits, targets, restrictions, and timers in Torn.</p>
      </div>
      ${renderMissionHints()}
      <div class="fluz-card compact">
        <div class="fluz-section-title">Mission routes</div>
        <div class="fluz-route-grid">
          <a class="fluz-route info" href="https://www.torn.com/missions.php">Missions</a>
          <a class="fluz-route warn" href="https://www.torn.com/page.php?sid=ItemMarket">Market</a>
          <a class="fluz-route good" href="https://www.torn.com/items.php">Items</a>
          <a class="fluz-route info" href="https://www.torn.com/page.php?sid=stocks">Stocks</a>
        </div>
      </div>
    `;
  }

  function scanMissionPageText() {
    const text = String(document.body && document.body.innerText ? document.body.innerText : '');
    const creditMatch = text.match(/(?:mission\s*)?(?:credits?|tokens?)\D{0,12}([\d,]+)/i);
    const timerMatch = text.match(/\b(?:\d+d\s*)?(?:\d+h\s*)?\d{1,2}m(?:\s*\d{1,2}s)?\b/) || text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
    const status = /complete|claim/i.test(text) ? 'claim/check' : (/cooldown|new mission|available/i.test(text) ? 'available' : 'manual');
    return {
      credits: creditMatch ? creditMatch[1] : '',
      timers: timerMatch ? timerMatch[0] : '',
      status
    };
  }

  function renderMissionHints() {
    const visible = scanMissionHintsFromPage();
    const query = String(state.utility.missionHintSearch || '').trim().toLowerCase();
    const hints = visible.length ? visible : missionHintsForText(bankPageText());
    const filtered = hints
      .filter((hint) => !query || `${hint.title} ${hint.task} ${hint.tip}`.toLowerCase().includes(query))
      .slice(0, 8);
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Mission hints</span><span class="fluz-muted">${filtered.length || 0} shown</span></div>
        <div class="fluz-form-grid">
          <label>Search hint
            <input type="text" data-utility-setting="missionHintSearch" value="${escapeHtml(state.utility.missionHintSearch || '')}" placeholder="Mug, bounty, melee, Duke...">
          </label>
        </div>
        ${filtered.length ? filtered.map(renderMissionHintCard).join('') : '<p class="fluz-muted">No matching mission hint detected yet. Open a mission card or search a task keyword.</p>'}
        <p class="fluz-muted">Hints are shown as manual reminders. Confirm the exact mission text in Torn before acting.</p>
      </div>
    `;
  }

  function renderMissionHintCard(hint) {
    return `
      <div class="fluz-mini-card">
        <div class="fluz-mini-row"><strong>${escapeHtml(hint.title || 'Mission')}</strong><span>${escapeHtml(hint.tag || 'hint')}</span></div>
        <p><span class="fluz-signal-tag info">Task</span> ${escapeHtml(hint.task)}</p>
        ${hint.tip ? `<p><span class="fluz-signal-tag warn">Tip</span> ${escapeHtml(hint.tip)}</p>` : ''}
      </div>
    `;
  }

  function scanMissionHintsFromPage() {
    const cards = $all('.giver-cont-wrap > div[id^="mission"], [class*="mission"], [id*="mission"]')
      .filter((node) => !node.closest(`#${APP.id}`))
      .map((node) => cleanBookieText(node.innerText || node.textContent || ''))
      .filter((text) => text.length > 15)
      .slice(0, 8);
    const seen = new Set();
    const output = [];
    cards.forEach((text) => {
      missionHintsForText(text).forEach((hint) => {
        const key = `${hint.title}|${hint.task}`;
        if (!seen.has(key)) {
          seen.add(key);
          output.push(hint);
        }
      });
    });
    return output;
  }

  function missionHintsForText(text) {
    const raw = cleanBookieText(text || '');
    if (!raw) return [];
    const lower = raw.toLowerCase();
    const title = (raw.match(/^[^\n.]{4,60}/) || ['Mission'])[0].replace(/\baccept\b|\bdecline\b/ig, '').trim() || 'Mission';
    const hints = [];
    const add = (tag, task, tip = '') => hints.push({ title, tag, task, tip });
    if (/mug|mugging/.test(lower)) add('mug', 'Plan for a successful mug result.', 'If the target is protected or cash looks low, skip manually. This helper never attacks or mugs.');
    if (/bount/.test(lower)) add('bounty', 'Claim or place bounty-related progress.', 'Use the Bounty Helper to filter visible targets by level, reward, and availability.');
    if (/hospital|hospitalize/.test(lower)) add('hospital', 'Hospitalize the required target(s).', 'Confirm they are not already unavailable and watch cooldown/timer wording.');
    if (/melee|fist|kick|bare|weaponless|no weapons/.test(lower)) add('loadout', 'Use a restricted weapon/loadout.', 'Unequip or avoid disallowed weapons manually before starting the fight.');
    if (/gun|rifle|pistol|shotgun|smg|machine gun/.test(lower)) add('weapon', 'Use the required weapon type.', 'Other equipped weapons can confuse mission progress, so confirm the exact allowed type.');
    if (/grenade|brick|pepper|tear gas|temporary|trout|hammer|bat|knife/.test(lower)) add('item', 'Bring the required temporary/item/weapon.', 'Open Items first and confirm you have the required piece before attacking.');
    if (/spouse|wife|husband|married/.test(lower)) add('target', 'Target relationship matters.', 'Open the profile and verify spouse or linked target before spending energy.');
    if (/casino|win \$|wager/.test(lower)) add('casino', 'Casino progress required.', 'Keep stakes small relative to bankroll; the helper never bets.');
    if (/gym|energy/.test(lower)) add('energy', 'Spend energy as requested.', 'Use Gym helper to plan training, then train manually in Torn.');
    if (/send|parcel|message|gift/.test(lower)) add('manual', 'Send the requested item/message manually.', 'Copy/fill only with explicit buttons elsewhere; always confirm in Torn.');
    if (!hints.length && /(defeat|attack|duke|contract|mission)/.test(lower)) add('attack', 'Defeat or attack the listed target(s).', 'Check target status and restrictions before starting manually.');
    return hints;
  }

