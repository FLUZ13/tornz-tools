  function renderFactionWarTools(module) {
    const targets = normalizeTargets(state.utility.targets).filter((target) => !target.hidden);
    const ready = targets.filter((target) => targetStatusTreeLabel(target) === 'Okay');
    const down = targets.filter((target) => ['Hospital', 'Jail', 'Federal'].includes(targetStatusTreeLabel(target)));
    const soon = down
      .filter((target) => target.hospitalUntil > nowMs())
      .sort((a, b) => a.hospitalUntil - b.hospitalUntil)
      .slice(0, 6);
    return `
      <div class="fluz-section-title"><span>Faction war</span><span class="fluz-muted">manual control</span></div>
      <div class="fluz-card">
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(targets.length))}</b><em>saved</em></span>
          <span><b class="fluz-pos">${escapeHtml(String(ready.length))}</b><em>ready</em></span>
          <span><b class="fluz-neg">${escapeHtml(String(down.length))}</b><em>down</em></span>
          <span><b>${escapeHtml(String(normalizeTargetLists(state.utility.targetLists).length))}</b><em>lists</em></span>
        </div>
        <p class="fluz-muted">Save enemies, generate chain lists in Finder, then use this page as a manual ready/hospital queue. No attacks are clicked automatically.</p>
        <div class="fluz-route-grid">
          <button class="fluz-button primary" data-utility-tab="targets">Open targets</button>
          <button class="fluz-button" data-utility-tab="finder">Finder</button>
          <button class="fluz-button" data-utility-tab="lists">Lists</button>
          <button class="fluz-button" data-utility-tab="overview">Open overview</button>
          <a class="fluz-button" href="https://www.torn.com/factions.php" target="_blank" rel="noopener noreferrer">Faction page</a>
        </div>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Ready targets</span><span class="fluz-muted">${ready.length} available</span></div>
        ${ready.slice(0, 6).map((target) => renderWarTargetMiniRow(target)).join('') || '<p class="fluz-muted">No ready saved targets right now.</p>'}
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Hospital exits</span><span class="fluz-muted">${soon.length} tracked</span></div>
        ${soon.map((target) => renderWarTargetMiniRow(target)).join('') || '<p class="fluz-muted">No hospital exit timers yet.</p>'}
      </div>
    `;
  }

  function renderTargetChains(module) {
    const targets = normalizeTargets(state.utility.targets).filter((target) => !target.hidden);
    const chainTargets = targets.filter(isChainTarget);
    const source = filterChainTargets(chainTargets.length ? chainTargets : targets);
    const ready = source
      .filter((target) => targetStatusTreeLabel(target) === 'Okay')
      .sort(chainTargetSort);
    const down = source
      .filter((target) => ['Hospital', 'Jail', 'Federal'].includes(targetStatusTreeLabel(target)))
      .sort(chainTargetSort);
    const soon = down.filter((target) => target.hospitalUntil > nowMs()).slice(0, 8);
    const copyIds = ready.map((target) => target.xid).filter(Boolean).join(',');
    const filterOptions = chainFilterOptions(chainTargets);
    return `
      <div class="fluz-section-title"><span>Chain queue</span><span class="fluz-muted">${ready.length} ready / ${soon.length} down soon</span></div>
      <div class="fluz-card">
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(chainTargets.length))}</b><em>tagged chain</em></span>
          <span><b class="fluz-pos">${escapeHtml(String(ready.length))}</b><em>ready</em></span>
          <span><b class="fluz-neg">${escapeHtml(String(down.length))}</b><em>down</em></span>
          <span><b>${escapeHtml(String(targets.length))}</b><em>saved</em></span>
        </div>
        <p class="fluz-muted">${chainTargets.length ? 'Showing saved targets tagged chain, chains, link, links, or respect.' : 'No chain-tagged targets yet, so this queue shows all saved targets. Add note "chain" to focus it.'}</p>
        <div class="fluz-route-grid">
          <button class="fluz-button primary" data-utility-tab="targets">Open targets</button>
          <button class="fluz-button" data-utility-tab="finder">Finder</button>
          <button class="fluz-button" data-utility-tab="lists">Lists</button>
          <button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(copyIds)}" ${copyIds ? '' : 'disabled'}>Copy ready IDs</button>
        </div>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-form-grid">
          <label>Search chain
            <input type="text" data-utility-setting="chainSearch" value="${escapeHtml(state.utility.chainSearch || '')}" placeholder="Name, XID, note...">
          </label>
          <label>Chain tag
            <select data-utility-setting="chainFilter">
              <option value="">All chain tags</option>
              ${filterOptions.map((label) => `<option value="${escapeHtml(label)}" ${state.utility.chainFilter === label ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
            </select>
          </label>
          <label>Sort
            <select data-utility-setting="chainSortKey">
              <option value="ff" ${(state.utility.chainSortKey || 'ff') === 'ff' ? 'selected' : ''}>FF</option>
              <option value="level" ${state.utility.chainSortKey === 'level' ? 'selected' : ''}>Level</option>
              <option value="stats" ${state.utility.chainSortKey === 'stats' ? 'selected' : ''}>Battle stats</option>
              <option value="status" ${state.utility.chainSortKey === 'status' ? 'selected' : ''}>Status</option>
              <option value="name" ${state.utility.chainSortKey === 'name' ? 'selected' : ''}>Name</option>
              <option value="note" ${state.utility.chainSortKey === 'note' ? 'selected' : ''}>Note</option>
            </select>
          </label>
          <label>Dir
            <select data-utility-setting="chainSortDir">
              <option value="asc" ${(state.utility.chainSortDir || 'asc') === 'asc' ? 'selected' : ''}>Up</option>
              <option value="desc" ${state.utility.chainSortDir === 'desc' ? 'selected' : ''}>Down</option>
            </select>
          </label>
        </div>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Ready chain targets</span><span class="fluz-muted">${ready.length} available</span></div>
        ${ready.slice(0, 12).map((target) => renderChainTargetRow(target)).join('') || '<p class="fluz-muted">No ready chain targets right now.</p>'}
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Hospital exits</span><span class="fluz-muted">${soon.length} tracked</span></div>
        ${soon.map((target) => renderChainTargetRow(target)).join('') || '<p class="fluz-muted">No chain hospital exits tracked yet.</p>'}
      </div>
    `;
  }

  function renderFactionChainTracker(module) {
    scheduleChainFriendlyNameRefresh();
    const targets = normalizeTargets(state.utility.targets).filter((target) => !target.hidden);
    const chainTargets = targets.filter(isChainTarget);
    const source = filterChainTargets(chainTargets.length ? chainTargets : targets);
    const ready = source
      .filter((target) => targetStatusTreeLabel(target) === 'Okay')
      .sort(chainTargetSort);
    return `
      <div class="fluz-section-title"><span>Faction chains</span><span class="fluz-muted">live timer / manual assist</span></div>
      ${renderChainTrackerCard(ready)}
      ${renderChainFriendlyMembers()}
      ${renderChainMessageLog()}
    `;
  }

  function renderChainTrackerCard(readyTargets = []) {
    const status = getVisibleChainStatus();
    state.chainStatus = status || state.chainStatus;
    const displayStatus = status || state.chainStatus || { count: 0, goal: '', remainingMs: 0, detected: false };
    const messageSeconds = parseChainTimeSetting(state.utility.chainMessageAlertAt, 290);
    const targetSeconds = parseChainTimeSetting(state.utility.chainTargetAlertAt, 140);
    const warningSeconds = parseChainTimeSetting(state.utility.chainWarningAlertAt, 30);
    const remainingSeconds = Math.max(0, Math.ceil(parseNumber(displayStatus.remainingMs) / 1000));
    const timerPct = clamp((remainingSeconds / 300) * 100, 0, 100);
    const messagePct = clamp((messageSeconds / 300) * 100, 0, 100);
    const targetPct = clamp((targetSeconds / 300) * 100, 0, 100);
    const warningPct = clamp((warningSeconds / 300) * 100, 0, 100);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Live chain tracker</span><span class="fluz-muted">${displayStatus.detected ? 'detected from Torn sidebar' : 'waiting for chain timer'}</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b data-chain-count>${escapeHtml(formatChainCount(displayStatus))}</b><em>chain</em></span>
          <span><b data-chain-countdown data-chain-remaining="${escapeHtml(String(displayStatus.remainingMs || 0))}">${escapeHtml(displayStatus.remainingMs ? formatDurationShort(displayStatus.remainingMs) : '--')}</b><em>timer</em></span>
          <span><b>${escapeHtml(formatDurationShort(messageSeconds * 1000))}</b><em>message alert</em></span>
          <span><b>${escapeHtml(formatDurationShort(targetSeconds * 1000))}</b><em>target alert</em></span>
          <span><b>${escapeHtml(formatDurationShort(warningSeconds * 1000))}</b><em>warning</em></span>
        </div>
        <div class="fluz-chain-timer-bar" title="Chain timer">
          <span data-chain-timer-bar-fill style="width:${timerPct.toFixed(1)}%"></span>
          <i class="message" data-chain-message-alert-marker style="left:${messagePct.toFixed(1)}%" title="Message alert ${escapeHtml(formatChainClock(messageSeconds * 1000))}"></i>
          <i class="target" data-chain-target-marker style="left:${targetPct.toFixed(1)}%" title="Target alert ${escapeHtml(formatChainClock(targetSeconds * 1000))}"></i>
          <i class="warning" data-chain-warning-marker style="left:${warningPct.toFixed(1)}%" title="Warning alert ${escapeHtml(formatChainClock(warningSeconds * 1000))}"></i>
        </div>
        <div class="fluz-chain-slider-grid">
          <label>Message alert <strong data-chain-message-alert-label>${escapeHtml(formatChainClock(messageSeconds * 1000))}</strong>
            <input type="range" min="0" max="300" step="5" data-utility-setting="chainMessageAlertAt" value="${escapeHtml(String(messageSeconds))}">
          </label>
          <label>Target alert <strong data-chain-target-label>${escapeHtml(formatChainClock(targetSeconds * 1000))}</strong>
            <input type="range" min="0" max="300" step="5" data-utility-setting="chainTargetAlertAt" value="${escapeHtml(String(targetSeconds))}">
          </label>
          <label>Warning alert <strong data-chain-warning-label>${escapeHtml(formatChainClock(warningSeconds * 1000))}</strong>
            <input type="range" min="0" max="300" step="5" data-utility-setting="chainWarningAlertAt" value="${escapeHtml(String(warningSeconds))}">
          </label>
        </div>
        <div class="fluz-form-grid" style="margin-top:7px;">
          <label>Cost / hit
            <input type="number" min="1" data-utility-setting="chainAttackCost" value="${escapeHtml(state.utility.chainAttackCost || 25)}">
          </label>
        </div>
        <div class="fluz-target-checks" style="margin-top:7px;">
          <label><input type="checkbox" data-utility-setting="chainMessageAlertEnabled" ${state.utility.chainMessageAlertEnabled ? 'checked' : ''}> Message notify</label>
          <label><input type="checkbox" data-utility-setting="chainTargetAlertEnabled" ${state.utility.chainTargetAlertEnabled ? 'checked' : ''}> Target notify</label>
          <label><input type="checkbox" data-utility-setting="chainWarningAlertEnabled" ${state.utility.chainWarningAlertEnabled ? 'checked' : ''}> Warning notify</label>
          <label><input type="checkbox" data-utility-setting="chainShuffle" ${state.utility.chainShuffle ? 'checked' : ''}> Shuffle</label>
        </div>
        ${renderGeneratedFriendlyMessage()}
      </div>
    `;
  }

  function renderGeneratedFriendlyMessage() {
    const text = String(state.utility.chainGeneratedMessage || '').trim();
    const member = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers)
      .find((item) => item.id === state.utility.chainGeneratedMemberId);
    const label = text
      ? `${member && member.note ? `${member.note}: ` : ''}${text}`
      : 'No friendly message generated yet.';
    return `
      <div class="fluz-chain-generated">
        <span class="fluz-muted" data-chain-generated-message>${escapeHtml(label)}</span>
        <button class="fluz-button primary" data-action="copy-current-chain-message" ${text ? '' : 'disabled'}>Copy current message</button>
      </div>
    `;
  }

  function renderChainFriendlyMembers() {
    const members = sortChainFriendlyMembers(normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers));
    const cost = Math.max(1, parseNumber(state.utility.chainAttackCost || 25));
    const nextMember = getNextChainFriendlyMember(members);
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Friendly chain members</span><span class="fluz-muted">${members.length} saved</span></div>
        <div class="fluz-form-grid">
          <label>Member
            <input type="text" data-utility-setting="chainFriendlyInput" value="${escapeHtml(state.utility.chainFriendlyInput || '')}" placeholder="Name, XID, profile link...">
          </label>
          <label>Energy
            <input type="number" min="0" data-utility-setting="chainFriendlyEnergy" value="${escapeHtml(state.utility.chainFriendlyEnergy || 0)}">
          </label>
          <label>Order tag
            <input type="text" data-utility-setting="chainFriendlyNote" value="${escapeHtml(state.utility.chainFriendlyNote || '')}" placeholder="attack1, attack2...">
          </label>
          <div class="fluz-form-actions">
            <button class="fluz-button primary" data-action="add-chain-friendly">Add</button>
          </div>
        </div>
        <div class="fluz-chain-friendly-list">
          ${members.length ? members.map((member) => renderChainFriendlyMemberRow(member, cost, nextMember && nextMember.id === member.id)).join('') : '<p class="fluz-muted">No friendly chain members yet.</p>'}
        </div>
      </div>
    `;
  }

  function renderChainFriendlyMemberRow(member, cost, isNext = false) {
    const message = buildFriendlyChainMessage(member);
    const xid = String(member.xid || '').replace(/\D/g, '');
    return `
      <div class="fluz-chain-friendly-row ${isNext ? 'is-next-attacker' : ''}">
        <label>Name
          <input type="text" data-chain-friendly-field="name" data-member-id="${escapeHtml(member.id)}" value="${escapeHtml(member.name || '')}" placeholder="Player name">
        </label>
        <div class="fluz-chain-friendly-xid">
          <span class="fluz-muted">XID</span>
          ${xid ? `<a href="${escapeHtml(profileUrlFromXid(xid))}" target="_blank" rel="noopener noreferrer">${escapeHtml(xid)}</a>` : '<span class="fluz-muted">--</span>'}
        </div>
        <label>Energy
          <input type="number" min="0" data-chain-friendly-field="energy" data-member-id="${escapeHtml(member.id)}" value="${escapeHtml(member.energy || 0)}" title="Subtracts Cost / hit only when this row is copied.">
        </label>
        <label>Tag
          <input type="text" data-chain-friendly-field="note" data-member-id="${escapeHtml(member.id)}" value="${escapeHtml(member.note || '')}" placeholder="attack1">
        </label>
        <div class="fluz-row-actions">
          <button class="fluz-button primary" data-action="copy-chain-friendly-message" data-member-id="${escapeHtml(member.id)}" data-copy-text="${escapeHtml(message)}" title="Copy message and subtract ${escapeHtml(cost)} energy from this member.">Copy</button>
          <button class="fluz-button" data-action="set-next-chain-friendly" data-member-id="${escapeHtml(member.id)}" title="Make this member the next generated chain message.">Next</button>
          <button class="fluz-button danger" data-action="remove-chain-friendly" data-member-id="${escapeHtml(member.id)}">Remove</button>
        </div>
      </div>
    `;
  }

  function renderChainMessageLog() {
    const log = Array.isArray(state.utility.chainMessageLog) ? state.utility.chainMessageLog.slice(0, 16) : [];
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Message log</span><span class="fluz-muted">${log.length} copied</span></div>
        ${log.length ? `<div class="fluz-chain-log">
          ${log.map((entry) => `
            <div class="fluz-chain-log-row">
              <span class="fluz-muted">${escapeHtml(formatLogTime(entry.ts))}</span>
              <span>${escapeHtml(entry.text || '')}</span>
            </div>
          `).join('')}
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;"><button class="fluz-button danger" data-action="clear-chain-message-log">Clear log</button></div>` : '<p class="fluz-muted">No copied chain messages yet.</p>'}
      </div>
    `;
  }

  function formatLogTime(timestamp) {
    const date = new Date(parseNumber(timestamp) || nowMs());
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function getVisibleChainStatus() {
    const text = (document.body && document.body.innerText ? document.body.innerText : '').replace(/\s+/g, ' ');
    const match = text.match(/\bChain:\s*([\d,]+)\s*\/\s*([0-9.,]+[kmb]?|\d+)\s+(\d{1,2}:\d{2}(?::\d{2})?)/i);
    if (!match) return null;
    return {
      detected: true,
      count: parseNumber(match[1].replace(/,/g, '')),
      goal: match[2],
      remainingMs: parseClockToMs(match[3]),
      rawTime: match[3],
      updatedAt: nowMs()
    };
  }

  function parseClockToMs(value) {
    const parts = String(value || '').split(':').map((part) => Math.max(0, Math.floor(parseNumber(part))));
    if (parts.length === 3) return ((parts[0] * 3600) + (parts[1] * 60) + parts[2]) * 1000;
    if (parts.length === 2) return ((parts[0] * 60) + parts[1]) * 1000;
    return 0;
  }

  function parseChainTimeSetting(value, fallbackSeconds) {
    if (typeof value === 'number') return Math.max(0, Math.round(value));
    const text = String(value || '').trim();
    if (!text) return fallbackSeconds;
    if (text.includes(':')) return Math.max(0, Math.round(parseClockToMs(text) / 1000));
    const number = parseNumber(text);
    if (!number) return fallbackSeconds;
    return number > 20 ? Math.round(number) : Math.round(number * 60);
  }

  function formatChainClock(ms) {
    const total = Math.max(0, Math.ceil(parseNumber(ms) / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  function formatChainCount(status) {
    if (!status || !status.detected) return '--';
    return `${compactNumber(status.count || 0)}${status.goal ? `/${status.goal}` : ''}`;
  }

  function normalizeChainFriendlyMembers(members) {
    const seen = new Set();
    return (Array.isArray(members) ? members : [])
      .map((member, index) => {
        const xid = String(member && member.xid ? member.xid : '').replace(/\D/g, '');
        const rawName = String(member && member.name ? member.name : '').trim();
        const name = rawName ? cleanBookieText(rawName) : (xid ? `XID ${xid}` : '');
        const id = String(member && member.id ? member.id : makeChainFriendlyId(xid, name, index)).trim();
        return {
          id,
          xid,
          name,
          energy: Math.max(0, Math.floor(parseNumber(member && member.energy))),
          note: String(member && member.note ? member.note : '').trim(),
          createdAt: parseNumber(member && member.createdAt) || nowMs(),
          updatedAt: parseNumber(member && member.updatedAt) || nowMs()
        };
      })
      .filter((member) => {
        const key = member.xid ? `xid:${member.xid}` : `id:${member.id}`;
        return (member.name || member.xid) && member.id && !seen.has(key) && seen.add(key);
      });
  }

  function makeChainFriendlyId(xid = '', name = '', index = 0) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (cleanXid) return `chain-friend-${cleanXid}`;
    const slug = String(name || 'member').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'member';
    return `chain-friend-${slug}-${index}-${nowMs().toString(36)}`;
  }

  function parseChainFriendlyInput(value) {
    const raw = String(value || '').trim();
    if (!raw) return { xid: '', name: '' };
    const xid = parseProfileXid(raw);
    if (!xid) return { xid: '', name: cleanBookieText(raw) };
    const nameText = raw
      .replace(/https?:\/\/\S+/ig, ' ')
      .replace(/[?&#]XID=\d+/ig, ' ')
      .replace(/\bXID\s*[:=]?\s*\d+\b/ig, ' ')
      .replace(new RegExp(`\\[?${escapeRegExp(xid)}\\]?`, 'g'), ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { xid, name: cleanProfileName(nameText, xid) };
  }

  function chainFriendlyNeedsName(member) {
    const xid = String(member && member.xid ? member.xid : '').replace(/\D/g, '');
    const name = String(member && member.name ? member.name : '').trim();
    return !!xid && (!name || name === `XID ${xid}` || /^XID\s+\d+$/i.test(name));
  }

  function scheduleChainFriendlyNameRefresh() {
    if (state.chainFriendlyNameLoading) return;
    const members = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers);
    if (!members.some(chainFriendlyNeedsName)) return;
    state.chainFriendlyNameLoading = true;
    setTimeout(() => {
      refreshChainFriendlyNames().catch((error) => {
        console.debug(`${APP.name}: friendly chain name refresh failed`, error);
      }).finally(() => {
        state.chainFriendlyNameLoading = false;
      });
    }, 0);
  }

  async function refreshChainFriendlyNames() {
    const members = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers);
    let changed = false;
    for (const member of members) {
      if (!chainFriendlyNeedsName(member)) continue;
      const name = await fetchProfileNameByXid(member.xid);
      if (name && name !== member.name) {
        member.name = name;
        member.updatedAt = nowMs();
        changed = true;
      }
    }
    if (!changed) return;
    state.utility.chainFriendlyMembers = members;
    await saveUtilityState();
    if (state.utility.activeTab === 'factionChains' && !isPanelInputFocused()) renderPanelKeepingScroll();
  }

  function buildFriendlyChainMessage(member, status = state.chainStatus) {
    const name = member && member.name ? member.name : (member && member.xid ? `XID ${member.xid}` : 'Member');
    const targetSeconds = parseChainTimeSetting(state.utility.chainTargetAlertAt, 140);
    const time = targetSeconds ? `${formatChainClock(targetSeconds * 1000)}min` : 'target time';
    return `${name} attack at ${time}`;
  }

  function nextChainFriendlyMember(status = state.chainStatus) {
    const members = sortChainFriendlyMembers(normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers));
    if (!members.length) return null;
    const cursor = Math.max(0, Math.floor(parseNumber(state.utility.chainFriendlyCursor))) % members.length;
    const member = members[cursor];
    state.utility.chainFriendlyCursor = (cursor + 1) % members.length;
    return { member, message: buildFriendlyChainMessage(member, status), next: members[state.utility.chainFriendlyCursor] };
  }

  function sortChainFriendlyMembers(members) {
    return (Array.isArray(members) ? members : []).slice().sort((a, b) => chainFriendlyOrderValue(a) - chainFriendlyOrderValue(b)
      || a.createdAt - b.createdAt);
  }

  function getNextChainFriendlyMember(members = null) {
    const sorted = sortChainFriendlyMembers(members || normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers));
    if (!sorted.length) return null;
    const cursor = Math.max(0, Math.floor(parseNumber(state.utility.chainFriendlyCursor))) % sorted.length;
    return sorted[cursor];
  }

  function chainFriendlyOrderValue(member) {
    const match = String(member && member.note ? member.note : '').match(/\d+/);
    return match ? parseNumber(match[0]) : 999999;
  }

  async function generateNextFriendlyChainMessage(status = state.chainStatus) {
    const next = nextChainFriendlyMember(status);
    if (!next || !next.member || !next.message) return null;
    await resolveChainFriendlyMemberName(next.member);
    next.message = buildFriendlyChainMessage(next.member, status);
    state.utility.chainGeneratedMessage = next.message;
    state.utility.chainGeneratedMemberId = next.member.id;
    state.utility.chainGeneratedAt = nowMs();
    const cost = Math.max(1, Math.floor(parseNumber(state.utility.chainAttackCost || 25)));
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers).map((member) => (
      member.id === next.member.id
        ? { ...member, name: next.member.name, energy: Math.max(0, Math.floor(parseNumber(member.energy)) - cost), updatedAt: nowMs() }
        : member
    ));
    appendChainMessageLog(next.message, next.member);
    await saveUtilityState();
    return next;
  }

  function appendChainMessageLog(text, member = null) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return;
    state.utility.chainMessageLog = [
      { ts: nowMs(), text: cleanText, memberId: member && member.id ? member.id : '', memberName: member && member.name ? member.name : '' },
      ...(Array.isArray(state.utility.chainMessageLog) ? state.utility.chainMessageLog : [])
    ].slice(0, 30);
  }

  async function resolveChainFriendlyMemberName(member) {
    if (!member || !chainFriendlyNeedsName(member)) return member;
    const name = await fetchProfileNameByXid(member.xid);
    if (!name) return member;
    member.name = name;
    member.updatedAt = nowMs();
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers).map((item) => (
      item.id === member.id ? { ...item, name, updatedAt: member.updatedAt } : item
    ));
    return member;
  }

  function scheduleChainWatch() {
    if (state.chainWatchStarted && state.chainWatchTimer) return;
    state.chainWatchStarted = true;
    tickChainWatch();
    state.chainWatchTimer = setInterval(() => {
      tickChainWatch();
    }, 1000);
  }

  async function tickChainWatch() {
    const status = getVisibleChainStatus();
    if (!status) return;
    state.chainStatus = status;
    await maybeSendChainAlerts(status);
    patchChainTrackerDom(status);
  }

  async function maybeSendChainAlerts(status) {
    if (!status || !status.detected) return;
    const remaining = Math.max(0, Math.ceil(parseNumber(status.remainingMs) / 1000));
    if (!remaining) return;
    const messageAt = parseChainTimeSetting(state.utility.chainMessageAlertAt, 290);
    const targetAt = parseChainTimeSetting(state.utility.chainTargetAlertAt, 140);
    const warningAt = parseChainTimeSetting(state.utility.chainWarningAlertAt, 30);
    const resetAbove = Math.max(messageAt, targetAt, warningAt) + 8;
    if (state.chainAlertState.count !== status.count || remaining > resetAbove) {
      state.chainAlertState = { count: status.count, message: false, target: false, warning: false };
    }
    if (messageAt && remaining <= messageAt && !state.chainAlertState.message) {
      state.chainAlertState.message = true;
      const generated = await generateNextFriendlyChainMessage(status);
      if (generated && state.utility.chainMessageAlertEnabled) {
        await sendUtilityAlert({
          title: `${APP.name}: Chain message alert`,
          body: generated.message,
          tag: `${APP.id}-chain-message-${status.count}-${messageAt}`,
          sound: true,
          desktop: true
        });
      }
      if (generated && state.utility.activeTab === 'factionChains' && !isPanelInputFocused()) renderPanelKeepingScroll();
    }
    if (state.utility.chainTargetAlertEnabled && targetAt && remaining <= targetAt && !state.chainAlertState.target) {
      state.chainAlertState.target = true;
      await sendUtilityAlert({
        title: `${APP.name}: Chain target alert`,
        body: `Chain timer is at ${formatChainClock(status.remainingMs)}.`,
        tag: `${APP.id}-chain-target-${status.count}-${targetAt}`,
        sound: true,
        desktop: true
      });
    }
    if (state.utility.chainWarningAlertEnabled && warningAt && remaining <= warningAt && !state.chainAlertState.warning) {
      state.chainAlertState.warning = true;
      await sendUtilityAlert({
        title: `${APP.name}: Chain warning`,
        body: `Chain timer is at ${formatChainClock(status.remainingMs)}.`,
        tag: `${APP.id}-chain-warning-${status.count}-${warningAt}`,
        sound: true,
        desktop: true
      });
    }
  }

  function patchChainTrackerDom(status = state.chainStatus) {
    const panel = state.elements.panel;
    if (!panel || !status) return;
    const count = $('[data-chain-count]', panel);
    if (count) count.textContent = formatChainCount(status);
    const countdown = $('[data-chain-countdown]', panel);
    if (countdown) {
      countdown.textContent = status.remainingMs ? formatDurationShort(status.remainingMs) : '--';
      countdown.dataset.chainRemaining = String(status.remainingMs || 0);
    }
    const fill = $('[data-chain-timer-bar-fill]', panel);
    if (fill) fill.style.width = `${clamp((Math.max(0, Math.ceil(parseNumber(status.remainingMs) / 1000)) / 300) * 100, 0, 100).toFixed(1)}%`;
  }

  function isChainTarget(target) {
    const text = `${target && target.note ? target.note : ''} ${target && target.tags ? target.tags : ''}`.toLowerCase();
    return /\bchain[a-z0-9_-]*\b|\b(links?|respect|hits?)\b/.test(text);
  }

  function chainFilterLabel(target) {
    const tokens = targetNoteTokens(target && target.note);
    const chainToken = tokens.find((token) => /\bchain[a-z0-9_-]*\b/i.test(token));
    if (chainToken) return chainToken;
    const supportToken = tokens.find((token) => /\b(links?|respect|hits?)\b/i.test(token));
    return supportToken || 'chain';
  }

  function chainFilterOptions(targets) {
    return Array.from(new Set((targets || []).map(chainFilterLabel).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function filterChainTargets(targets) {
    const query = String(state.utility.chainSearch || '').trim().toLowerCase();
    const filter = String(state.utility.chainFilter || '').trim().toLowerCase();
    return (targets || []).filter((target) => {
      if (filter && chainFilterLabel(target).toLowerCase() !== filter) return false;
      if (!query) return true;
      return `${target.name} ${target.xid} ${target.note} ${target.factionName || ''}`.toLowerCase().includes(query);
    });
  }

  function chainTargetSort(a, b) {
    const key = String(state.utility.chainSortKey || 'ff');
    const dir = state.utility.chainSortDir === 'desc' ? -1 : 1;
    const statValue = (target) => parseNumber(target && target.bsEstimate) || parseCompactNumber(target && target.bsEstimateHuman) || Number.MAX_SAFE_INTEGER;
    const valueFor = (target) => {
      if (key === 'level') return parseNumber(target && target.level) || 0;
      if (key === 'stats') return statValue(target);
      if (key === 'status') return targetStatusRank(target);
      if (key === 'name') return String(target && target.name || '').toLowerCase();
      if (key === 'note') return String(target && target.note || '').toLowerCase();
      return parseNumber(target && target.fairFight) || 999;
    };
    const av = valueFor(a);
    const bv = valueFor(b);
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir || String(a && a.name || '').localeCompare(String(b && b.name || ''));
    return String(av).localeCompare(String(bv)) * dir || String(a && a.name || '').localeCompare(String(b && b.name || ''));
  }

  function renderChainTargetRow(target) {
    return `
      <div class="fluz-war-target-row fluz-chain-target-row">
        <div class="fluz-war-target-main">
          <strong title="${escapeHtml(target.name || `XID ${target.xid}`)}">${escapeHtml(target.name || `XID ${target.xid}`)}</strong>
          <span class="fluz-muted">XID ${escapeHtml(target.xid)}${target.factionName ? ` - ${escapeHtml(target.factionName)}` : ''}</span>
        </div>
        ${renderWarTargetStatBlock(target)}
        <div><input type="text" data-target-note="${escapeHtml(target.xid)}" value="${escapeHtml(target.note || '')}" placeholder="chain easy, chain hard..."></div>
        <div>${renderTargetStatus(target)}</div>
        <span class="fluz-row-actions">
          <a class="fluz-button" href="${escapeHtml(profileUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Profile</a>
          <a class="fluz-button danger" href="${escapeHtml(attackUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Attack</a>
        </span>
      </div>
    `;
  }

  function renderWarTargetMiniRow(target) {
    return `
      <div class="fluz-war-target-row">
        <div class="fluz-war-target-main">
          <strong title="${escapeHtml(target.name || `XID ${target.xid}`)}">${escapeHtml(target.name || `XID ${target.xid}`)}</strong>
          <span class="fluz-muted">XID ${escapeHtml(target.xid)}${target.factionName ? ` - ${escapeHtml(target.factionName)}` : ''}</span>
        </div>
        ${renderWarTargetStatBlock(target)}
        <div>
          ${renderTargetNoteChips(target.note)}
        </div>
        <div>
          ${renderTargetStatus(target)}
        </div>
        <span class="fluz-row-actions">
          <a class="fluz-button" href="${escapeHtml(profileUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Profile</a>
          <a class="fluz-button danger" href="${escapeHtml(attackUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Attack</a>
        </span>
      </div>
    `;
  }

  function renderWarTargetStatBlock(target) {
    const level = target && target.level ? `<span class="fluz-signal-tag info">L${escapeHtml(target.level)}</span>` : '';
    const ff = target && target.fairFight ? `<span class="fluz-signal-tag fee">FF ${escapeHtml(Number(target.fairFight).toFixed(2))}</span>` : '';
    const stats = target && (target.bsEstimateHuman || target.bsEstimate)
      ? `<span class="fluz-signal-tag warn">${escapeHtml(target.bsEstimateHuman || compactNumber(target.bsEstimate))}</span>`
      : '';
    if (!level && !ff && !stats) return '<div class="fluz-war-target-stats"></div>';
    return `
      <div class="fluz-war-target-stats">
        ${(level || ff) ? `<span class="fluz-war-target-stat-line">${level}${ff}</span>` : ''}
        ${stats ? `<span class="fluz-war-target-stat-line">${stats}</span>` : ''}
      </div>
    `;
  }

