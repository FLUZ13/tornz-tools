  function renderTargetBoard() {
    const current = getCurrentProfileTarget();
    const allTargets = normalizeTargets(state.utility.targets);
    const targets = sortTargets(filterTargets(allTargets));
    const noteOptions = targetNoteOptions(allTargets);
    return `
      <div class="fluz-section-title"><span>Target board</span><span class="fluz-muted">${targets.length}/${allTargets.length} shown</span></div>
      <div class="fluz-card">
        <div class="fluz-mini-row">
          <span>${current ? `Current profile: <strong>${escapeHtml(current.name)}</strong> <span class="fluz-muted">XID ${escapeHtml(current.xid)}</span>` : '<span class="fluz-muted">Open a Torn profile to add it quickly.</span>'}</span>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" data-action="open-add-target">Add target</button>
          <button class="fluz-button primary" data-action="add-current-target" ${current ? '' : 'disabled'}>Add current</button>
          <button class="fluz-button" data-action="open-add-faction">Add faction</button>
          <button class="fluz-button" data-action="export-targets">Export</button>
          <button class="fluz-button" data-action="open-import-targets">Import</button>
        </div>
      </div>
      ${state.utility.targetAddOpen ? renderTargetAddDropdown() : ''}
      ${state.utility.factionAddOpen ? renderFactionAddDropdown() : ''}
      ${state.utility.targetImportOpen ? renderTargetImportDropdown() : ''}
      <div class="fluz-card">
        <div class="fluz-target-filter-grid">
          <label>Search targets
            <input type="text" data-utility-setting="targetSearch" value="${escapeHtml(state.utility.targetSearch || '')}" placeholder="Name, XID, note...">
          </label>
          <div>
            <div class="fluz-muted">Note filters</div>
            ${renderTargetNoteFilterDropdown(noteOptions)}
          </div>
        </div>
        <div class="fluz-target-checks">
          <label><input type="checkbox" data-utility-setting="targetOnlyStarred" ${state.utility.targetOnlyStarred ? 'checked' : ''}> Favorite</label>
          <label><input type="checkbox" data-utility-setting="targetOnlyLocked" ${state.utility.targetOnlyLocked ? 'checked' : ''}> Locked</label>
          <label><input type="checkbox" data-utility-setting="targetShowHidden" ${state.utility.targetShowHidden ? 'checked' : ''}> Show hidden</label>
          <label><input type="checkbox" data-utility-setting="targetHideChain" ${state.utility.targetHideChain ? 'checked' : ''}> Hide chain</label>
        </div>
      </div>
      <div class="fluz-target-head">
        <div><button class="fluz-target-sort" data-action="sort-targets" data-sort-key="mark">Mark</button></div>
        <div><button class="fluz-target-sort" data-action="sort-targets" data-sort-key="player">Player</button></div>
        <div><button class="fluz-target-sort" data-action="sort-targets" data-sort-key="status">Status</button></div>
        <div><button class="fluz-target-sort" data-action="sort-targets" data-sort-key="note">Note</button></div>
        <div>Links</div>
      </div>
      <div class="fluz-table">
        ${targets.map((target) => `
          <div class="fluz-row fluz-target-row ${target.starred ? 'is-starred' : ''} ${target.hidden ? 'is-hidden' : ''}">
            <div class="fluz-target-marks">
              <button class="fluz-mark-btn ${target.starred ? 'on' : ''}" title="Favorite" data-action="toggle-target-star" data-xid="${escapeHtml(target.xid)}">*</button>
              <button class="fluz-mark-btn ${target.locked ? 'on lock' : ''}" title="Lock" data-action="toggle-target-lock" data-xid="${escapeHtml(target.xid)}">L</button>
            </div>
            <div class="fluz-target-player">
              <div class="fluz-target-player-title"><strong>${escapeHtml(displayTargetName(target, current))}</strong>${renderTargetStatChips(target)}</div>
              <div class="fluz-muted">${escapeHtml(targetBoardMetaLine(target))}</div>
            </div>
            <div>${renderTargetStatus(target)}</div>
            <div><input type="text" data-target-note="${escapeHtml(target.xid)}" value="${escapeHtml(target.note || '')}" placeholder="Note"></div>
            <div class="fluz-row-actions">
              <a class="fluz-button" href="${escapeHtml(profileUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Profile</a>
              <a class="fluz-button danger" href="${escapeHtml(attackUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Attack</a>
              <button class="fluz-button" data-action="toggle-target-hide" data-xid="${escapeHtml(target.xid)}">${target.hidden ? 'Show' : 'Hide'}</button>
              <button class="fluz-button fluz-remove-x" title="Remove" aria-label="Remove target" data-action="remove-target" data-xid="${escapeHtml(target.xid)}">X</button>
            </div>
          </div>
        `).join('') || '<div class="fluz-card">No saved targets yet. Add the current profile or paste a profile URL/XID.</div>'}
      </div>
    `;
  }

  function renderTargetFinder() {
    const preset = String(state.utility.ffscouterPreset || 'level');
    const listCount = normalizeTargetLists(state.utility.targetLists).length;
    const hasKey = isApiKeyReasonable(state.apiKey);
    const canSearch = hasKey && state.utility.ffscouterEnabled;
    return `
      <div class="fluz-section-title"><span>Target finder</span><span class="fluz-muted">${listCount} saved lists</span></div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>FFScouter connection</span><span class="fluz-muted">${escapeHtml(state.ffscouterStatus || (hasKey ? 'Torn key saved locally' : 'add Torn API key first'))}</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b class="${hasKey ? 'fluz-pos' : 'fluz-neg'}">${hasKey ? 'YES' : 'NO'}</b><em>TORN'z API key</em></span>
          <span><b class="${state.utility.ffscouterEnabled ? 'fluz-pos' : 'fluz-neg'}">${state.utility.ffscouterEnabled ? 'YES' : 'NO'}</b><em>FFScouter enabled</em></span>
          <span><b>${escapeHtml(state.ffscouterStatus || 'manual')}</b><em>status</em></span>
        </div>
        <label class="fluz-check" style="margin-top:7px;"><input type="checkbox" data-utility-setting="ffscouterEnabled" ${state.utility.ffscouterEnabled ? 'checked' : ''}> Enable FFScouter features and allow manual requests/register with my saved TORN'z API key.</label>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button" data-action="open-profile">Profile</button>
          <button class="fluz-button" data-action="check-ffscouter-key" ${canSearch ? '' : 'disabled'}>Check FFScouter</button>
          <button class="fluz-button" data-action="register-ffscouter-key" ${canSearch ? '' : 'disabled'}>Register key</button>
          <a class="fluz-button" href="https://ffscouter.com/" target="_blank" rel="noopener noreferrer">FFScouter policy</a>
          <a class="fluz-button" href="https://www.torn.com/preferences.php#tab=api" target="_blank" rel="noopener noreferrer">Create Torn key</a>
        </div>
        <p class="fluz-muted">One key only: your saved TORN'z Torn API key. It is sent to ffscouter.com only when this checkbox is on and you press a FFScouter button.</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Find targets</span><span class="fluz-muted">level / chain / custom</span></div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-bottom:8px;">
          <button class="fluz-button ${preset === 'level' ? 'primary' : ''}" data-action="apply-target-finder-preset" data-preset="level">Leveling</button>
          <button class="fluz-button ${preset === 'respect' ? 'primary' : ''}" data-action="apply-target-finder-preset" data-preset="respect">Chain / respect</button>
          <button class="fluz-button ${preset === 'war' ? 'primary' : ''}" data-action="apply-target-finder-preset" data-preset="war">War ready</button>
          <button class="fluz-button ${preset === 'custom' ? 'primary' : ''}" data-action="apply-target-finder-preset" data-preset="custom">Custom</button>
        </div>
        <div class="fluz-form-grid">
          <label>Preset
            <select data-utility-setting="ffscouterPreset">
              <option value="level" ${preset === 'level' ? 'selected' : ''}>Leveling list</option>
              <option value="respect" ${preset === 'respect' ? 'selected' : ''}>Respect / chain list</option>
              <option value="war" ${preset === 'war' ? 'selected' : ''}>War ready list</option>
              <option value="custom" ${preset === 'custom' ? 'selected' : ''}>Custom filters</option>
            </select>
          </label>
          <label>Results
            <input type="number" min="1" max="50" data-utility-setting="ffscouterLimit" value="${escapeHtml(state.utility.ffscouterLimit || 20)}">
          </label>
          <label>Min level
            <input type="number" min="1" max="100" data-utility-setting="ffscouterMinLevel" value="${escapeHtml(state.utility.ffscouterMinLevel || 1)}">
          </label>
          <label>Max level
            <input type="number" min="1" max="100" data-utility-setting="ffscouterMaxLevel" value="${escapeHtml(state.utility.ffscouterMaxLevel || 100)}">
          </label>
          <label>Min FF
            <input type="number" min="1" step="0.1" data-utility-setting="ffscouterMinFf" value="${escapeHtml(state.utility.ffscouterMinFf || 1)}">
          </label>
          <label>Max FF
            <input type="number" min="1" step="0.1" data-utility-setting="ffscouterMaxFf" value="${escapeHtml(state.utility.ffscouterMaxFf || 3)}">
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="ffscouterInactiveOnly" ${state.utility.ffscouterInactiveOnly ? 'checked' : ''}> Inactive only</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="ffscouterFactionless" ${state.utility.ffscouterFactionless ? 'checked' : ''}> Factionless</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="ffscouterExcludeSaved" ${state.utility.ffscouterExcludeSaved ? 'checked' : ''}> Exclude saved board targets</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="ffscouterRequireStats" ${state.utility.ffscouterRequireStats ? 'checked' : ''}> Require stat estimate</label>
          <label>Max last action days
            <input type="number" min="0" data-utility-setting="ffscouterMaxLastActionDays" value="${escapeHtml(state.utility.ffscouterMaxLastActionDays || 0)}" placeholder="0 = any">
          </label>
          <label>Sort list by
            <select data-utility-setting="ffscouterSortKey">
              <option value="ff" ${state.utility.ffscouterSortKey === 'ff' ? 'selected' : ''}>Lowest FF first</option>
              <option value="level" ${state.utility.ffscouterSortKey === 'level' ? 'selected' : ''}>Highest level first</option>
              <option value="stats" ${state.utility.ffscouterSortKey === 'stats' ? 'selected' : ''}>Lowest stats first</option>
              <option value="activity" ${state.utility.ffscouterSortKey === 'activity' ? 'selected' : ''}>Recent activity first</option>
            </select>
          </label>
          <label>Default note/tag
            <input type="text" data-utility-setting="ffscouterListTag" value="${escapeHtml(state.utility.ffscouterListTag || '')}" placeholder="level, chain, war, enemy...">
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:8px;">
          <button class="fluz-button primary" data-action="search-ffscouter-targets" ${canSearch ? '' : 'disabled'}>Search FFScouter</button>
          <button class="fluz-button" data-action="open-ffscouter-target-finder">Open FFScouter</button>
        </div>
        ${state.ffscouterLoading ? '<p class="fluz-muted">Searching FFScouter...</p>' : ''}
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Manual import</span><span class="fluz-muted">IDs, profile links, copied FF list</span></div>
        <label>Paste player IDs / links
          <textarea data-utility-setting="ffscouterImportText" placeholder="123456, profiles.php?XID=789012, ...">${escapeHtml(state.utility.ffscouterImportText || '')}</textarea>
        </label>
        <div class="fluz-form-grid" style="margin-top:7px;">
          <label>List name
            <input type="text" data-utility-setting="ffscouterListName" value="${escapeHtml(state.utility.ffscouterListName || '')}" placeholder="Chain targets, war list, leveling...">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="create-target-list-from-paste">Create list</button>
          </label>
        </div>
      </div>
    `;
  }

  function renderTargetLists() {
    const lists = normalizeTargetLists(state.utility.targetLists);
    const active = getActiveTargetList(lists);
    return `
      <div class="fluz-section-title"><span>Target lists</span><span class="fluz-muted">${lists.length} local</span></div>
      ${lists.length ? `
        <div class="fluz-card compact">
          <div class="fluz-row-actions" style="justify-content:flex-start;">
            ${lists.map((list) => `<button class="fluz-button ${active && active.id === list.id ? 'primary' : ''}" data-action="select-target-list" data-list-id="${escapeHtml(list.id)}">${escapeHtml(list.name)} (${list.targets.length})</button>`).join('')}
          </div>
        </div>
      ` : '<div class="fluz-card">No generated lists yet. Use Finder or paste IDs to create one.</div>'}
      ${active ? renderTargetListDetail(active) : ''}
    `;
  }

  function renderTargetListDetail(list) {
    const rows = sortTargetListRows(normalizeTargetListRows(list.targets));
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>${escapeHtml(list.name)}</span><span class="fluz-muted">${rows.length} targets - ${escapeHtml(list.source || 'local')}</span></div>
        <div class="fluz-list-toolbar">
          <div class="fluz-row-actions" style="justify-content:flex-start;">
            <button class="fluz-button primary" data-action="add-target-list-to-board" data-list-id="${escapeHtml(list.id)}">Add all to board</button>
            <button class="fluz-button" data-action="copy-target-list-ids" data-list-id="${escapeHtml(list.id)}">Copy IDs</button>
            <button class="fluz-button danger" data-action="delete-target-list" data-list-id="${escapeHtml(list.id)}">Delete list</button>
          </div>
          <div class="fluz-row-actions" style="justify-content:flex-end;">
            ${renderTargetListSortButton('level', 'Level')}
            ${renderTargetListSortButton('ff', 'FF')}
            ${renderTargetListSortButton('stats', 'Battle stats')}
          </div>
        </div>
      </div>
      <div class="fluz-table">
        ${rows.map((target) => renderTargetListRow(list, target)).join('') || '<div class="fluz-card">This list is empty.</div>'}
      </div>
    `;
  }

  function renderTargetListSortButton(key, label) {
    const active = state.utility.targetListSortKey === key;
    const arrow = active ? (state.utility.targetListSortDir === 'asc' ? 'up' : 'down') : '';
    return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-target-list" data-sort-key="${escapeHtml(key)}">${escapeHtml(label)}${arrow ? ` ${escapeHtml(arrow)}` : ''}</button>`;
  }

  function renderTargetListRow(list, target) {
    const note = targetListDefaultNote(list);
    const statsValue = targetListStatValue(target);
    const statsLabel = target.bsEstimateHuman || (statsValue ? compactNumber(statsValue) : '');
    return `
      <div class="fluz-row fluz-target-list-row">
        <div class="fluz-target-list-title">
          <strong title="${escapeHtml(target.name || `XID ${target.xid}`)}">${escapeHtml(target.name || `XID ${target.xid}`)}</strong>
          ${renderTargetNoteChips(note)}
        </div>
        <div class="fluz-target-list-meta">
          <span class="fluz-muted">#${escapeHtml(target.xid)}</span>
          ${target.level ? `<span class="fluz-signal-tag info">L${escapeHtml(target.level)}</span>` : ''}
          ${target.fairFight ? `<span class="fluz-signal-tag fee">FF ${escapeHtml(Number(target.fairFight).toFixed(2))}</span>` : ''}
          ${statsLabel ? `<span class="fluz-signal-tag warn">${escapeHtml(statsLabel)}</span>` : ''}
          ${target.lastAction ? `<span class="fluz-signal-tag good">${escapeHtml(formatRelativeTime(target.lastAction * 1000))}</span>` : ''}
        </div>
        <div class="fluz-row-actions">
          <a class="fluz-button" href="${escapeHtml(profileUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Profile</a>
          <a class="fluz-button danger" href="${escapeHtml(attackUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Attack</a>
          <button class="fluz-button primary" data-action="add-list-target-to-board" data-list-id="${escapeHtml(list.id)}" data-xid="${escapeHtml(target.xid)}">Add</button>
          <button class="fluz-button fluz-remove-x" data-action="remove-target-from-list" data-list-id="${escapeHtml(list.id)}" data-xid="${escapeHtml(target.xid)}">X</button>
        </div>
      </div>
    `;
  }

  function renderTargetAddDropdown() {
    return `
      <div class="fluz-card compact fluz-target-dropdown">
        <div class="fluz-section-title">Add target</div>
        <div class="fluz-form-grid">
          <label>Profile URL or XID
            <input type="text" data-utility-setting="targetInput" value="${escapeHtml(state.utility.targetInput || '')}" placeholder="profiles.php?XID=3540979">
          </label>
          <label>Note
            <input type="text" data-utility-setting="targetNote" value="${escapeHtml(state.utility.targetNote || '')}" placeholder="easy, war chain, mug...">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="save-target-modal">Save</button>
          </label>
        </div>
      </div>
    `;
  }

  function renderTargetNoteFilterDropdown(noteOptions) {
    const selected = selectedTargetNoteFilters();
    const label = selected.length ? `${selected.length} selected` : 'All notes';
    const openClass = state.utility.targetNoteFilterOpen ? 'is-open' : '';
    return `
      <div class="fluz-filter-dropdown ${openClass}">
        <button type="button" class="fluz-filter-summary" data-action="toggle-note-filter-menu">${escapeHtml(label)}</button>
        ${state.utility.targetNoteFilterOpen ? `
          <div class="fluz-filter-menu">
          <div class="fluz-target-note-filters">
            <button class="fluz-note-filter-chip ${selected.length ? '' : 'is-active'}" data-action="clear-note-filters">All notes</button>
            ${noteOptions.length ? noteOptions.map((note) => {
              const active = selected.includes(note);
              return `<button class="fluz-note-filter-chip ${active ? 'is-active' : ''}" data-action="toggle-note-filter" data-note="${escapeHtml(note)}"><input type="checkbox" tabindex="-1" ${active ? 'checked' : ''}>${escapeHtml(note)}</button>`;
            }).join('') : '<span class="fluz-muted">No tags yet.</span>'}
          </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTargetOverviewTree() {
    const current = getCurrentProfileTarget();
    const targets = sortTargets(filterTargets(normalizeTargets(state.utility.targets)));
    if (!targets.length) {
      return '<div class="fluz-card">No saved targets match the current filters.</div>';
    }
    const summary = targetOverviewSummary(targets);
    const priorityGroups = buildTargetPriorityGroups(targets);
    const factionGroups = groupTargets(targets, (target) => target.factionName || 'No faction');
    const taggedGroups = groupTargetsByLabels(targets, targetNoteGroupLabels, 'No note');
    const statusGroups = groupTargets(targets, (target) => targetStatusTreeLabel(target));
    return `
      <div class="fluz-section-title"><span>Target overview</span><span class="fluz-muted">${targets.length} visible</span></div>
      <div class="fluz-overview-strip">
        ${renderOverviewStat('Ready', summary.ready, 'good')}
        ${renderOverviewStat('Hosp/Jail', summary.down, 'bad')}
        ${renderOverviewStat('Favorites', summary.starred, 'warn')}
        ${renderOverviewStat('Locked', summary.locked, 'info')}
        ${renderOverviewStat('Hidden', summary.hidden, 'dim')}
      </div>
      <div class="fluz-target-tree">
        ${renderTargetTreeGroup('Priority', priorityGroups, 'priority', current, '')}
        ${renderTargetTreeGroup('Factions', factionGroups, 'factions', current, '')}
        ${renderTargetTreeGroup('Tags / Notes', taggedGroups, 'tags', current, '')}
        ${renderTargetTreeGroup('Live Status', statusGroups, 'status', current, '')}
      </div>
    `;
  }

  function targetOverviewSummary(targets) {
    return targets.reduce((summary, target) => {
      const status = targetStatusTreeLabel(target);
      if (status === 'Okay') summary.ready += 1;
      if (status === 'Hospital' || status === 'Jail' || status === 'Federal') summary.down += 1;
      if (target.starred) summary.starred += 1;
      if (target.locked) summary.locked += 1;
      if (target.hidden) summary.hidden += 1;
      return summary;
    }, { ready: 0, down: 0, starred: 0, locked: 0, hidden: 0 });
  }

  function renderOverviewStat(label, value, tone) {
    return `
      <div class="fluz-overview-stat ${tone}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </div>
    `;
  }

  function buildTargetPriorityGroups(targets) {
    const ready = targets.filter((target) => targetStatusTreeLabel(target) === 'Okay' && !target.hidden);
    const down = targets.filter((target) => ['Hospital', 'Jail', 'Federal'].includes(targetStatusTreeLabel(target)));
    const favorites = targets.filter((target) => target.starred);
    const locked = targets.filter((target) => target.locked);
    const hidden = targets.filter((target) => target.hidden);
    return [
      { label: 'Ready now', items: sortTargets(ready) },
      { label: 'Hospital / jail', items: sortTargets(down) },
      { label: 'Favorites', items: sortTargets(favorites) },
      { label: 'Locked', items: sortTargets(locked) },
      { label: 'Hidden', items: sortTargets(hidden) }
    ].filter((group) => group.items.length);
  }

  function groupTargets(targets, keyFn) {
    const groups = new Map();
    targets.forEach((target) => {
      const key = cleanBookieText(keyFn(target) || 'Other') || 'Other';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(target);
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items: sortTargets(items) }));
  }

  function groupTargetsByLabels(targets, labelsFn, fallbackLabel) {
    const groups = new Map();
    targets.forEach((target) => {
      const labels = labelsFn(target);
      const cleanLabels = labels.length ? labels : [fallbackLabel];
      cleanLabels.forEach((label) => {
        const key = cleanBookieText(label || fallbackLabel) || fallbackLabel;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(target);
      });
    });
    return Array.from(groups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, items: sortTargets(items) }));
  }

  function targetNoteGroupLabels(target) {
    const note = String(target && target.note ? target.note : '').trim();
    if (!note) return [];
    return note
      .split(/[,;|\n]+/g)
      .map((part) => cleanBookieText(part).replace(/^#/, '').trim())
      .filter((part, index, list) => part && list.indexOf(part) === index);
  }

  function renderTargetTreeGroup(title, groups, keyPrefix, current, emptyText) {
    const rootKey = `root:${keyPrefix}`;
    const rootOpen = targetTreeIsOpen(rootKey);
    const count = groups.reduce((sum, group) => sum + group.items.length, 0);
    return `
      <div>
        <button class="fluz-tree-toggle" data-action="toggle-target-tree" data-tree-key="${escapeHtml(rootKey)}">${rootOpen ? '-' : '+'} ${escapeHtml(title)} <span class="fluz-tree-count">${count}</span></button>
        ${rootOpen ? `
          <div class="fluz-tree-node">
            ${groups.length ? groups.map((group) => renderTargetTreeBranch(group, `${keyPrefix}:${group.label}`, current)).join('') : `<div class="fluz-muted">${escapeHtml(emptyText)}</div>`}
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTargetTreeBranch(group, key, current) {
    const open = targetTreeIsOpen(key);
    return `
      <div>
        <button class="fluz-tree-toggle" data-action="toggle-target-tree" data-tree-key="${escapeHtml(key)}">${open ? '-' : '+'} ${escapeHtml(group.label)} <span class="fluz-tree-count">${group.items.length}</span></button>
        ${open ? `<div class="fluz-tree-node">${group.items.map((target) => renderTargetTreeLeaf(target, current)).join('')}</div>` : ''}
      </div>
    `;
  }

  function renderTargetTreeLeaf(target, current) {
    const marks = [
      target.starred ? 'Fav' : '',
      target.locked ? 'Lock' : '',
      target.hidden ? 'Hidden' : ''
    ].filter(Boolean).join(' / ');
    const meta = [
      target.factionName || '',
      target.note || '',
      marks,
      `XID ${target.xid}`
    ].filter(Boolean).join(' - ');
    return `
      <div class="fluz-tree-leaf">
        <div><strong>${escapeHtml(displayTargetName(target, current))}</strong><div class="fluz-muted">${escapeHtml(meta)}</div></div>
        <div>${renderTargetStatus(target)}</div>
        <a class="fluz-button" href="${escapeHtml(profileUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Profile</a>
        <a class="fluz-button danger" href="${escapeHtml(attackUrlFromXid(target.xid))}" target="_blank" rel="noopener noreferrer">Attack</a>
      </div>
    `;
  }

  function targetStatusTreeLabel(target) {
    const live = targetLiveStatus(target);
    if (target.hidden) return 'Hidden';
    if (live.state === 'hospital') return 'Hospital';
    if (live.state === 'jail') return 'Jail';
    if (live.state === 'travel') return 'Travel';
    if (live.state === 'federal') return 'Federal';
    if (target.hospitalUntil > nowMs()) return 'Hospital';
    return 'Okay';
  }

  function renderFactionAddDropdown() {
    return `
      <div class="fluz-card compact fluz-target-dropdown">
        <div class="fluz-section-title">Add faction</div>
        <div class="fluz-form-grid">
          <label>Faction ID or URL
            <input type="text" data-utility-setting="factionInput" value="${escapeHtml(state.utility.factionInput || '')}" placeholder="factions.php?step=profile&ID=54308">
          </label>
          <label>Note
            <input type="text" data-utility-setting="factionNote" value="${escapeHtml(state.utility.factionNote || '')}" placeholder="enemy faction, war chain...">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="import-faction-modal">Import</button>
          </label>
        </div>
      </div>
    `;
  }

  function renderTargetImportDropdown() {
    return `
      <div class="fluz-card compact fluz-target-dropdown">
        <div class="fluz-section-title">Import targets</div>
        <label>Paste exported JSON
          <textarea data-utility-setting="targetImportJson" placeholder='{"targets":[...]}'>${escapeHtml(state.utility.targetImportJson || '')}</textarea>
        </label>
        <button class="fluz-button primary" data-action="import-targets-modal">Import</button>
      </div>
    `;
  }

  function normalizeTargets(targets) {
    const seen = new Set();
    return (Array.isArray(targets) ? targets : [])
      .map((target) => ({
        xid: String(target && target.xid ? target.xid : '').replace(/\D/g, ''),
        name: String(target && target.name ? target.name : '').trim(),
        note: String(target && target.note ? target.note : '').trim(),
        factionId: String(target && target.factionId ? target.factionId : '').replace(/\D/g, ''),
        factionName: String(target && target.factionName ? target.factionName : '').trim(),
        starred: !!(target && target.starred),
        locked: !!(target && target.locked),
        hidden: !!(target && target.hidden),
        hospitalUntil: parseNumber(target && target.hospitalUntil),
        statusState: String(target && target.statusState ? target.statusState : '').trim(),
        statusText: String(target && target.statusText ? target.statusText : '').trim(),
        statusUntil: parseNumber(target && target.statusUntil),
        statusUpdatedAt: parseNumber(target && target.statusUpdatedAt),
        level: parseNumber(target && target.level),
        fairFight: parseNumber(target && (target.fairFight !== undefined ? target.fairFight : target.fair_fight)),
        bssPublic: parseNumber(target && (target.bssPublic !== undefined ? target.bssPublic : target.bss_public)),
        bsEstimate: parseNumber(target && (target.bsEstimate !== undefined ? target.bsEstimate : target.bs_estimate)),
        bsEstimateHuman: String(target && (target.bsEstimateHuman || target.bs_estimate_human) ? (target.bsEstimateHuman || target.bs_estimate_human) : '').trim(),
        lastAction: parseNumber(target && (target.lastAction !== undefined ? target.lastAction : target.last_action)),
        source: String(target && target.source ? target.source : '').trim(),
        createdAt: parseNumber(target && target.createdAt) || nowMs(),
        updatedAt: parseNumber(target && target.updatedAt) || nowMs()
      }))
      .filter((target) => target.xid && !seen.has(target.xid) && seen.add(target.xid))
      .sort((a, b) => {
        const aHosp = a.hospitalUntil > nowMs();
        const bHosp = b.hospitalUntil > nowMs();
        return Number(bHosp) - Number(aHosp)
          || Number(b.starred) - Number(a.starred)
          || Number(b.locked) - Number(a.locked)
          || b.updatedAt - a.updatedAt;
      });
  }

  function filterTargets(targets) {
    const query = String(state.utility.targetSearch || '').trim().toLowerCase();
    const noteFilters = selectedTargetNoteFilters();
    return targets.filter((target) => {
      if (state.utility.targetOnlyStarred && !target.starred) return false;
      if (state.utility.targetOnlyLocked && !target.locked) return false;
      if (!state.utility.targetShowHidden && target.hidden) return false;
      if (state.utility.targetHideChain && isChainTarget(target)) return false;
      if (noteFilters.length && !noteFilters.includes(target.note)) return false;
      if (!query) return true;
      return `${target.name} ${target.xid} ${target.note} ${target.factionName || ''}`.toLowerCase().includes(query);
    });
  }

  function selectedTargetNoteFilters() {
    const values = Array.isArray(state.utility.targetNoteFilters)
      ? state.utility.targetNoteFilters
      : (state.utility.targetNoteFilter ? [state.utility.targetNoteFilter] : []);
    const valid = new Set(targetNoteOptions(normalizeTargets(state.utility.targets)));
    return values.map((note) => String(note || '').trim()).filter((note, index, list) => note && valid.has(note) && list.indexOf(note) === index);
  }

  function sortTargets(targets) {
    const key = String(state.utility.targetSortKey || 'mark');
    const dir = state.utility.targetSortDir === 'asc' ? 1 : -1;
    const valueFor = (target) => {
      if (key === 'player') return String(target.name || '').toLowerCase();
      if (key === 'status') return target.hidden ? 3 : targetStatusRank(target);
      if (key === 'note') return String(target.note || '').toLowerCase();
      return (target.starred ? 2 : 0) + (target.locked ? 1 : 0);
    };
    return targets.slice().sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir || b.updatedAt - a.updatedAt;
      return String(av).localeCompare(String(bv)) * dir || b.updatedAt - a.updatedAt;
    });
  }

  function targetNoteOptions(targets) {
    return Array.from(new Set(targets.map((target) => target.note).filter(Boolean))).sort((a, b) => a.localeCompare(b));
  }

  function displayTargetName(target, current = null) {
    const saved = String(target && target.name ? target.name : '').trim();
    if (current && current.xid === target.xid) {
      return current.name;
    }
    return saved || `XID ${target.xid}`;
  }

  function targetMetaLine(target) {
    return [
      `XID ${target.xid}`,
      target.level ? `Lvl ${target.level}` : '',
      target.fairFight ? `FF ${Number(target.fairFight).toFixed(2)}` : '',
      target.bsEstimateHuman || '',
      target.factionName || ''
    ].filter(Boolean).join(' - ');
  }

  function targetBoardMetaLine(target) {
    return [
      `XID ${target.xid}`,
      target.factionName || ''
    ].filter(Boolean).join(' - ');
  }

  function renderTargetStatChips(target) {
    const chips = [];
    if (target && target.level) chips.push(`<span class="fluz-signal-tag info">L${escapeHtml(target.level)}</span>`);
    if (target && target.fairFight) chips.push(`<span class="fluz-signal-tag fee">FF ${escapeHtml(Number(target.fairFight).toFixed(2))}</span>`);
    if (target && (target.bsEstimateHuman || target.bsEstimate)) chips.push(`<span class="fluz-signal-tag warn">${escapeHtml(target.bsEstimateHuman || compactNumber(target.bsEstimate))}</span>`);
    return chips.length ? `<span class="fluz-note-chips">${chips.join('')}</span>` : '';
  }

  function targetNoteTokens(note) {
    const text = String(note || '').trim();
    if (!text) return [];
    return text
      .split(/[,;|\n]+/g)
      .map((part) => cleanBookieText(part).replace(/^#/, '').trim())
      .filter((part, index, list) => part && list.indexOf(part) === index)
      .slice(0, 4);
  }

  function targetNoteTone(note) {
    const lower = String(note || '').toLowerCase();
    if (/\b(enemy|gegner|target|targets|hostile|opponent|opp|kill|kos)\b/.test(lower)) return 'red';
    if (/\b(hard|strong|danger|avoid|risky|high)\b/.test(lower)) return 'red';
    if (/\b(war|rw|raid|wall|assist|assistable)\b/.test(lower)) return 'orange';
    if (/\b(level|levels|lvl|lvling|leveling|exp|xp|rank|ranking)\b/.test(lower)) return 'blue';
    if (/\b(chain|chains|chaining|link|links|respect|hit|hits|bonus)\b/.test(lower)) return 'green';
    if (/\b(easy|soft|weak|free|farm|safe|ready)\b/.test(lower)) return 'green';
    if (/\b(medium|mid|normal|okay|ok|average)\b/.test(lower)) return 'yellow';
    if (/\b(hosp|hospital|jail|down|timer|exit)\b/.test(lower)) return 'purple';
    if (/\b(retal|retaliation|revenge|mug|mugging|cash|money)\b/.test(lower)) return 'yellow';
    if (/\b(travel|travelling|abroad|flight|away)\b/.test(lower)) return 'cyan';
    if (/\b(favorite|fav|locked|watch|scout|scouted)\b/.test(lower)) return 'cyan';
    return '';
  }

  function renderTargetNoteChips(note) {
    const tokens = targetNoteTokens(note);
    if (!tokens.length) return '';
    return `<span class="fluz-note-chips">${tokens.map((token) => `<span class="fluz-note-chip ${targetNoteTone(token)}">${escapeHtml(token)}</span>`).join('')}</span>`;
  }

  function targetListDefaultNote(list) {
    const custom = String(list && list.defaultNote ? list.defaultNote : '').trim();
    if (custom) return custom;
    const preset = String(list && list.preset ? list.preset : '').toLowerCase();
    const source = `${list && list.name ? list.name : ''} ${list && list.source ? list.source : ''}`.toLowerCase();
    if (preset === 'level' || /level/.test(source)) return 'level';
    if (preset === 'war' || /war/.test(source)) return 'war';
    if (/enemy/.test(source)) return 'enemy';
    if (preset === 'respect') return 'chain';
    return preset || 'chain';
  }

  function normalizeTargetListRows(rows) {
    const seen = new Set();
    return (Array.isArray(rows) ? rows : [])
      .map((target) => ({
        xid: String(target && (target.xid || target.player_id) ? (target.xid || target.player_id) : '').replace(/\D/g, ''),
        name: String(target && target.name ? target.name : '').trim(),
        level: parseNumber(target && target.level),
        fairFight: parseNumber(target && (target.fairFight !== undefined ? target.fairFight : target.fair_fight)),
        bssPublic: parseNumber(target && (target.bssPublic !== undefined ? target.bssPublic : target.bss_public)),
        bsEstimate: parseNumber(target && (target.bsEstimate !== undefined ? target.bsEstimate : target.bs_estimate)),
        bsEstimateHuman: String(target && (target.bsEstimateHuman || target.bs_estimate_human) ? (target.bsEstimateHuman || target.bs_estimate_human) : '').trim(),
        lastAction: parseNumber(target && (target.lastAction !== undefined ? target.lastAction : target.last_action)),
        source: String(target && target.source ? target.source : '').trim(),
        note: String(target && target.note ? target.note : '').trim()
      }))
      .filter((target) => target.xid && !seen.has(target.xid) && seen.add(target.xid));
  }

  function normalizeTargetLists(lists) {
    return (Array.isArray(lists) ? lists : [])
      .map((list) => ({
        id: String(list && list.id ? list.id : `list-${Date.now().toString(36)}`).trim(),
        name: String(list && list.name ? list.name : 'Target list').trim(),
        source: String(list && list.source ? list.source : '').trim(),
        preset: String(list && list.preset ? list.preset : '').trim(),
        defaultNote: String(list && list.defaultNote ? list.defaultNote : '').trim(),
        createdAt: parseNumber(list && list.createdAt) || nowMs(),
        updatedAt: parseNumber(list && list.updatedAt) || nowMs(),
        targets: normalizeTargetListRows(list && list.targets)
      }))
      .filter((list) => list.id && list.targets.length)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function getActiveTargetList(lists = normalizeTargetLists(state.utility.targetLists)) {
    return lists.find((list) => list.id === state.utility.activeTargetListId) || lists[0] || null;
  }

  function targetListStatValue(target) {
    return parseNumber(target && target.bsEstimate)
      || parseNumber(target && target.bssPublic)
      || parseCompactNumber(target && target.bsEstimateHuman);
  }

  function sortTargetListRows(rows) {
    const key = String(state.utility.targetListSortKey || 'ff');
    const dir = state.utility.targetListSortDir === 'desc' ? -1 : 1;
    const valueFor = (target) => {
      if (key === 'level') return parseNumber(target.level);
      if (key === 'stats') return targetListStatValue(target);
      return parseNumber(target.fairFight);
    };
    return rows.slice().sort((a, b) => {
      const av = valueFor(a);
      const bv = valueFor(b);
      const missingA = av <= 0;
      const missingB = bv <= 0;
      if (missingA !== missingB) return missingA ? 1 : -1;
      return (av - bv) * dir || String(a.name || '').localeCompare(String(b.name || ''));
    });
  }

  function formatRelativeTime(timestampMs) {
    const delta = nowMs() - parseNumber(timestampMs);
    if (!timestampMs || delta < 0) return 'unknown';
    const minutes = Math.floor(delta / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 48) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function renderTargetStatus(target) {
    const xidAttr = escapeHtml(String(target && target.xid ? target.xid : ''));
    if (target.hidden) return `<span class="fluz-status-pill dim" data-target-status-xid="${xidAttr}">Hidden</span>`;
    const liveStatus = targetLiveStatus(target);
    if (liveStatus.state === 'hospital') {
      return `<span class="fluz-status-pill bad" data-target-status-xid="${xidAttr}" title="${escapeHtml(liveStatus.text)}">Hosp ${escapeHtml(liveStatus.timeText)}</span>`;
    }
    if (liveStatus.state === 'jail') {
      return `<span class="fluz-status-pill bad" data-target-status-xid="${xidAttr}" title="${escapeHtml(liveStatus.text)}">Jail ${escapeHtml(liveStatus.timeText)}</span>`;
    }
    if (liveStatus.state === 'travel') {
      return `<span class="fluz-status-pill dim" data-target-status-xid="${xidAttr}" title="${escapeHtml(liveStatus.text)}">Travel</span>`;
    }
    if (liveStatus.state === 'federal') {
      return `<span class="fluz-status-pill bad" data-target-status-xid="${xidAttr}" title="${escapeHtml(liveStatus.text)}">Federal</span>`;
    }
    if (target.hospitalUntil > nowMs()) {
      return `<span class="fluz-status-pill bad" data-target-status-xid="${xidAttr}" title="Manual hospital timer">Hosp ${escapeHtml(formatDurationShort(target.hospitalUntil - nowMs()))}</span>`;
    }
    return `<span class="fluz-status-pill" data-target-status-xid="${xidAttr}">Okay</span>`;
  }

  function patchTargetStatusDom() {
    const panel = state.elements.panel;
    if (!panel || state.mode !== 'utility') return false;
    const targets = normalizeTargets(state.utility.targets);
    if (!targets.length) return false;
    let touched = false;
    targets.forEach((target) => {
      const selector = `[data-target-status-xid="${target.xid}"]`;
      panel.querySelectorAll(selector).forEach((node) => {
        const nextHtml = renderTargetStatus(target);
        if (node.outerHTML !== nextHtml) {
          node.outerHTML = nextHtml;
          touched = true;
        }
      });
    });
    return touched;
  }

  function targetLiveStatus(target) {
    const rawState = String(target && target.statusState ? target.statusState : '').trim();
    const rawText = String(target && target.statusText ? target.statusText : rawState).trim();
    const stateKey = rawState.toLowerCase();
    const textKey = rawText.toLowerCase();
    const until = normalizeStatusUntilMs(target && target.statusUntil);
    const hasActiveUntil = until > nowMs();
    const timeText = hasActiveUntil ? formatDurationShort(until - nowMs()) : '';
    const hasUntil = until > 0;
    if (/hospital|hosp/i.test(`${stateKey} ${textKey}`) && (hasActiveUntil || !hasUntil)) {
      return { state: 'hospital', text: rawText || 'Hospital', until, timeText: timeText || 'now' };
    }
    if (/jail/i.test(`${stateKey} ${textKey}`) && (hasActiveUntil || !hasUntil)) {
      return { state: 'jail', text: rawText || 'Jail', until, timeText: timeText || 'now' };
    }
    if (/travel|abroad|flying/i.test(`${stateKey} ${textKey}`)) {
      return { state: 'travel', text: rawText || 'Traveling', until, timeText };
    }
    if (/federal/i.test(`${stateKey} ${textKey}`)) {
      return { state: 'federal', text: rawText || 'Federal jail', until, timeText };
    }
    return { state: 'okay', text: rawText || 'Okay', until: 0, timeText: '' };
  }

  function targetStatusRank(target) {
    const live = targetLiveStatus(target);
    if (live.state === 'hospital') return 4;
    if (live.state === 'jail') return 3;
    if (live.state === 'federal') return 2;
    if (target.hospitalUntil > nowMs()) return 4;
    if (live.state === 'travel') return 1;
    return 0;
  }

  function targetCountdownNeedsTick(target) {
    const live = targetLiveStatus(target);
    const statusUntilMs = normalizeStatusUntilMs(target && target.statusUntil);
    const manualUntilMs = parseNumber(target && target.hospitalUntil);
    const graceMs = 2500;
    return live.until > nowMs()
      || manualUntilMs > nowMs()
      || (statusUntilMs > 0 && statusUntilMs > nowMs() - graceMs)
      || (manualUntilMs > 0 && manualUntilMs > nowMs() - graceMs);
  }

  function formatDurationShort(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
    if (minutes > 0) return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
    return `${seconds}s`;
  }

  function parseTornDurationToMs(value) {
    const text = String(value || '').toLowerCase();
    let seconds = 0;
    const patterns = [
      [/(\d+)\s*d(?:ay)?s?/g, 86400],
      [/(\d+)\s*h(?:our)?s?/g, 3600],
      [/(\d+)\s*m(?:in(?:ute)?)?s?/g, 60],
      [/(\d+)\s*s(?:ec(?:ond)?)?s?/g, 1]
    ];
    patterns.forEach(([pattern, multiplier]) => {
      let match;
      while ((match = pattern.exec(text))) seconds += parseNumber(match[1]) * multiplier;
    });
    if (!seconds) {
      const parts = text.match(/\b(\d+)\b/g) || [];
      if (parts.length === 1) seconds = parseNumber(parts[0]);
    }
    return Math.max(0, seconds * 1000);
  }

  function normalizeStatusUntilMs(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'string' && /[-:TZ]/i.test(value)) {
      const dateMs = Date.parse(value);
      if (Number.isFinite(dateMs)) return Math.max(0, dateMs);
    }
    const numeric = parseNumber(value);
    if (!numeric) return 0;
    if (numeric > 100000000000) return numeric;
    if (numeric > 1000000000) return numeric * 1000;
    return nowMs() + numeric * 1000;
  }

  function parseProfileXid(value) {
    const text = String(value || '');
    const xidMatch = text.match(/[?&#]XID=(\d+)/i) || text.match(/\bXID\s*[:=]?\s*(\d+)\b/i);
    if (xidMatch) return xidMatch[1];
    const plain = text.match(/\b(\d{3,10})\b/);
    return plain ? plain[1] : '';
  }

  function profileUrlFromXid(xid) {
    return `https://www.torn.com/profiles.php?XID=${encodeURIComponent(String(xid || '').replace(/\D/g, ''))}`;
  }

  function attackUrlFromXid(xid) {
    return `https://www.torn.com/page.php?sid=attack&user2ID=${encodeURIComponent(String(xid || '').replace(/\D/g, ''))}`;
  }

  function profilePathFromXid(xid) {
    return `/profiles.php?XID=${encodeURIComponent(String(xid || '').replace(/\D/g, ''))}`;
  }

  function getCurrentProfileTarget() {
    if (!isProfilePage()) return null;
    const xid = parseProfileXid(window.location.href);
    if (!xid) return null;
    const titleMatch = String(document.title || '').match(/^(.+?)'s\s+Profile/i);
    const titleName = titleMatch ? titleMatch[1].trim() : '';
    const bodyText = document.body ? document.body.innerText || '' : '';
    const bodyMatch = bodyText.match(new RegExp(`(^|\\n)\\s*([^\\n\\[\\]]{2,40})\\s*\\[${escapeRegExp(xid)}\\]`, 'i'));
    const headingName = Array.from(document.querySelectorAll('h1, h2'))
      .map((node) => cleanBookieText(node.innerText || node.textContent || ''))
      .find((text) => text && text.length >= 2 && text.length <= 40 && !/profile|information|awards|friends|areas|text based rpg/i.test(text));
    return {
      xid,
      name: cleanProfileName(titleName || (bodyMatch && bodyMatch[2]) || headingName || `XID ${xid}`, xid),
      note: '',
      ...visibleProfileStatusForXid(xid)
    };
  }

  function visibleProfileStatusForXid(xid) {
    if (!isProfilePage() || parseProfileXid(window.location.href) !== String(xid || '').replace(/\D/g, '')) return {};
    const bodyText = document.body ? cleanBookieText(document.body.innerText || '') : '';
    const hospitalMatch = bodyText.match(/\bIn hospital for\s+([^.\n]+?)(?:\s+Mugged|\s+Attacked|\s+by\b|$)/i);
    if (hospitalMatch) {
      const durationMs = parseTornDurationToMs(hospitalMatch[1]);
      const untilMs = durationMs > 0 ? nowMs() + durationMs : 0;
      return {
        statusState: 'Hospital',
        statusText: `In hospital for ${cleanBookieText(hospitalMatch[1])}`,
        statusUntil: untilMs ? Math.ceil(untilMs / 1000) : 0,
        hospitalUntil: untilMs,
        statusUpdatedAt: nowMs()
      };
    }
    if (/\bOkay\b/i.test(bodyText.slice(0, 4000))) {
      return {
        statusState: 'Okay',
        statusText: 'Okay',
        statusUntil: 0,
        hospitalUntil: 0,
        statusUpdatedAt: nowMs()
      };
    }
    return {};
  }

  async function fetchProfileNameByXid(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return '';
    const knownName = findKnownProfileNameByXid(cleanXid);
    if (knownName) return knownName;
    const cacheKey = toCacheKey('profileNames');
    const cached = await readJsonStorage(cacheKey, {});
    if (cached && cached[cleanXid] && cached[cleanXid].name && !isPlaceholderProfileName(cached[cleanXid].name, cleanXid)) {
      return cached[cleanXid].name;
    }
    let name = '';
    try {
      if (isApiKeyReasonable(state.apiKey)) {
        const url = `${APP.apiBaseUrl}/user/${encodeURIComponent(cleanXid)}?selections=basic&key=${encodeURIComponent(state.apiKey)}`;
        const data = await httpGetJson(url);
        if (isTornApiRateLimitPayload(data)) state.tornApiBackoffUntil = nowMs() + 65000;
        if (data && data.name) name = cleanProfileName(data.name, cleanXid);
      }
    } catch (error) {
      console.debug(`${APP.name}: profile API name lookup failed`, error);
    }
    if (!name || isPlaceholderProfileName(name, cleanXid)) {
      try {
        name = await fetchProfileNameFromPage(cleanXid);
      } catch (error) {
        console.debug(`${APP.name}: profile page name lookup failed`, error);
      }
    }
    if (!name || isPlaceholderProfileName(name, cleanXid)) return '';
    await writeJsonStorage(cacheKey, { ...(cached || {}), [cleanXid]: { name, ts: nowMs() } });
    return name;
  }

  function findKnownProfileNameByXid(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return '';
    const friendly = normalizeChainFriendlyMembers(state.utility && state.utility.chainFriendlyMembers)
      .find((member) => member.xid === cleanXid && !isPlaceholderProfileName(member.name, cleanXid));
    if (friendly) return friendly.name;
    const target = normalizeTargets(state.utility && state.utility.targets)
      .find((item) => item.xid === cleanXid && !isPlaceholderProfileName(item.name, cleanXid));
    if (target) return target.name;
    const lists = normalizeTargetLists(state.utility && state.utility.targetLists);
    for (const list of lists) {
      const row = (list.targets || []).find((item) => item.xid === cleanXid && !isPlaceholderProfileName(item.name, cleanXid));
      if (row) return row.name;
    }
    return '';
  }

  async function fetchProfileNameFromPage(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return '';
    const html = await httpGetTornPageText(profilePathFromXid(cleanXid));
    return parseProfileNameFromHtml(html, cleanXid);
  }

  function parseProfileNameFromHtml(html, xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    const text = String(html || '');
    const candidates = [];
    const titleMatch = text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    if (titleMatch) candidates.push(titleMatch[1].replace(/'s\s+Profile[\s\S]*$/i, ''));
    const ogMatch = text.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
      || text.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
    if (ogMatch) candidates.push(ogMatch[1].replace(/'s\s+Profile[\s\S]*$/i, ''));
    const bracketMatch = text.match(new RegExp(`([^<>\\n\\r]{2,50})\\s*\\[${escapeRegExp(cleanXid)}\\]`, 'i'));
    if (bracketMatch) candidates.push(bracketMatch[1]);
    if (typeof DOMParser !== 'undefined') {
      try {
        const doc = new DOMParser().parseFromString(text, 'text/html');
        candidates.push(...Array.from(doc.querySelectorAll('h1, h2, [class*="name"], [class*="title"]'))
          .map((node) => node.textContent || '')
          .filter(Boolean));
      } catch (error) {
        /* ignore DOMParser failures */
      }
    }
    return candidates
      .map((candidate) => cleanProfileName(decodeHtmlEntities(candidate), cleanXid))
      .find((candidate) => candidate && !isPlaceholderProfileName(candidate, cleanXid) && !/profile|torn|text based rpg/i.test(candidate)) || '';
  }

  function decodeHtmlEntities(value) {
    const text = String(value || '');
    if (!text || !/[&<>]/.test(text)) return text;
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  function isPlaceholderProfileName(name, xid = '') {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    const text = cleanBookieText(name);
    return !text || /^XID\s+\d+$/i.test(text) || (!!cleanXid && text === cleanXid);
  }

  async function fetchTargetStatusByXid(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid || !isApiKeyReasonable(state.apiKey)) return null;
    const url = `${APP.apiBaseUrl}/user/${encodeURIComponent(cleanXid)}?selections=profile&key=${encodeURIComponent(state.apiKey)}`;
    const data = await httpGetJson(url);
    if (data && data.error) throw new Error(data.error.error || 'Torn API error');
    return normalizeTargetApiStatus(cleanXid, data || {});
  }

  function normalizeTargetApiStatus(xid, data) {
    const status = data.status && typeof data.status === 'object' ? data.status : {};
    const looseStatus = typeof data.status === 'string' ? data.status : '';
    const stateText = String(status.state || status.color || '').trim();
    const description = cleanBookieText(status.description || status.details || looseStatus || stateText || 'Okay');
    const detail = cleanBookieText(status.details || '');
    const joined = detail && !description.includes(detail) ? `${description} - ${detail}` : description;
    const rawUntil = status.until || status.until_time || status.end || status.ends_at || status.end_time || 0;
    let untilMs = normalizeStatusUntilMs(rawUntil);
    const lower = `${stateText} ${joined}`.toLowerCase();
    const isHospital = /hospital|hosp/.test(lower);
    if (isHospital && !untilMs) {
      const durationMatch = joined.match(/\b(?:for|left)\s+([^.\n]+)$/i);
      const parsedMs = durationMatch ? parseTornDurationToMs(durationMatch[1]) : parseTornDurationToMs(joined);
      if (parsedMs > 0) {
        untilMs = nowMs() + parsedMs;
      }
    }
    const activeHospital = isHospital && (!untilMs || untilMs > nowMs());
    return {
      xid: String(xid || '').replace(/\D/g, ''),
      name: data.name ? cleanProfileName(data.name, xid) : '',
      statusState: activeHospital ? (stateText || 'Hospital') : (isHospital ? 'Okay' : stateText || joined || 'Okay'),
      statusText: activeHospital ? (joined || stateText || 'Hospital') : (isHospital ? 'Okay' : joined || stateText || 'Okay'),
      statusUntil: activeHospital && untilMs > nowMs() ? Math.ceil(untilMs / 1000) : 0,
      hospitalUntil: activeHospital && untilMs > nowMs() ? untilMs : 0,
      statusUpdatedAt: nowMs()
    };
  }

  async function refreshTargetStatuses(force = false) {
    const module = getUtilityModule();
    if (state.mode !== 'utility' || !module || !moduleHasTargetTools(module)) return;
    if (!isApiKeyReasonable(state.apiKey)) return;
    if (state.targetStatusLoading) {
      if (force) showFlash('Target status refresh already running.');
      return;
    }
    const last = parseNumber(state.targetStatusLastRefresh);
    if (!force && nowMs() - last < 30000) return;
    const targets = normalizeTargets(state.utility.targets);
    if (!targets.length) return;
    state.targetStatusLoading = true;
    state.targetStatusLastRefresh = nowMs();
    let changed = false;
    const readyAlerts = [];
    try {
      const updates = new Map();
      const current = getCurrentProfileTarget();
      if (current && current.xid) updates.set(current.xid, current);
      for (const target of targets) {
        try {
          const update = await fetchTargetStatusByXid(target.xid);
          if (update && update.xid) updates.set(update.xid, update);
          await sleep(180);
        } catch (error) {
          console.debug(`${APP.name}: target status lookup failed for ${target.xid}`, error);
        }
      }
      if (updates.size) {
        const visibleCurrent = getCurrentProfileTarget();
        if (visibleCurrent && visibleCurrent.xid) updates.set(visibleCurrent.xid, visibleCurrent);
        state.utility.targets = normalizeTargets(state.utility.targets).map((target) => {
          const update = updates.get(target.xid);
          if (!update) return target;
          const next = {
            ...target,
            name: update.name || target.name,
            statusState: update.statusState,
            statusText: update.statusText,
            statusUntil: update.statusUntil,
            statusUpdatedAt: update.statusUpdatedAt,
            hospitalUntil: update.hospitalUntil
          };
          if (targetBecameReady(target, next)) readyAlerts.push(next);
          if (JSON.stringify(next) !== JSON.stringify(target)) changed = true;
          return next;
        });
      }
      if (changed) await saveUtilityState();
    } finally {
      state.targetStatusLoading = false;
    }
    if (changed) {
      patchTargetStatusDom();
      if (!isPanelInputFocused()) renderPanelKeepingScroll();
    }
    if (readyAlerts.length) {
      await sendTargetReadyAlerts(readyAlerts);
    }
  }

  function targetBecameReady(previous, next) {
    const before = targetStatusTreeLabel(previous);
    const after = targetStatusTreeLabel(next);
    return after === 'Okay' && ['Hospital', 'Jail', 'Federal', 'Travel'].includes(before);
  }

  async function sendTargetReadyAlerts(targets) {
    const sound = state.utility.targetSoundAlerts !== false;
    const desktop = state.utility.targetDesktopAlerts !== false;
    if (!sound && !desktop) return;
    for (const target of targets.slice(0, 3)) {
      await sendUtilityAlert({
        title: `${APP.name}: Target ready`,
        body: `${target.name || `XID ${target.xid}`} is Okay now.`,
        tag: `${APP.id}-target-ready-${target.xid}`,
        url: profileUrlFromXid(target.xid),
        sound,
        desktop
      });
    }
  }

  function cleanProfileName(value, xid = '') {
    const cleaned = cleanBookieText(value)
      .replace(new RegExp(`\\[?${escapeRegExp(String(xid))}\\]?`, 'g'), '')
      .replace(/\bText based RPG\b|\bTORN\b|\bProfile\b/ig, '')
      .replace(/'s$/i, '')
      .replace(/[-|()[\]]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return cleaned || `XID ${xid}`;
  }

