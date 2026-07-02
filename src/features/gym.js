  function renderPropertyPlanner() {
    const cost = parseNumber(state.utility.propertyCost);
    const rent = parseNumber(state.utility.rentPerDay);
    const upkeep = parseNumber(state.utility.upkeepPerDay);
    const net = rent - upkeep;
    const breakEven = net > 0 ? Math.ceil(cost / net) : 0;
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Property rent ROI</div>
        <div class="fluz-form-grid">
          <label>Property / upgrade cost
            <input type="number" data-utility-setting="propertyCost" value="${escapeHtml(state.utility.propertyCost)}">
          </label>
          <label>Rent per day
            <input type="number" data-utility-setting="rentPerDay" value="${escapeHtml(state.utility.rentPerDay)}">
          </label>
          <label>Upkeep per day
            <input type="number" data-utility-setting="upkeepPerDay" value="${escapeHtml(state.utility.upkeepPerDay)}">
          </label>
        </div>
        <div class="fluz-alert">Net rent: <strong>${formatMoney(net)}</strong>/day. Break-even: <strong>${breakEven ? `${breakEven} days` : 'n/a'}</strong>.</div>
      </div>
    `;
  }

  function renderEducationPlanner() {
    const days = parseNumber(state.utility.courseDays);
    const bonus = clamp(parseNumber(state.utility.educationBonusPct), 0, 95);
    const adjusted = days * (1 - bonus / 100);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Education time planner</div>
        <div class="fluz-form-grid">
          <label>Base course days
            <input type="number" min="0" step="0.1" data-utility-setting="courseDays" value="${escapeHtml(state.utility.courseDays)}">
          </label>
          <label>Reduction bonus %
            <input type="number" min="0" max="95" step="0.1" data-utility-setting="educationBonusPct" value="${escapeHtml(state.utility.educationBonusPct)}">
          </label>
        </div>
        <div class="fluz-alert">Estimated time: <strong>${adjusted.toFixed(1)} days</strong>. Pick courses by unlock value, not only shortest time.</div>
      </div>
    `;
  }

  function renderJobPlanner() {
    const pay = parseNumber(state.utility.jobPay);
    const perk = parseNumber(state.utility.perkValue);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Job/company value</div>
        <div class="fluz-form-grid">
          <label>Daily pay
            <input type="number" data-utility-setting="jobPay" value="${escapeHtml(state.utility.jobPay)}">
          </label>
          <label>Estimated perk value/day
            <input type="number" data-utility-setting="perkValue" value="${escapeHtml(state.utility.perkValue)}">
          </label>
        </div>
        <div class="fluz-alert">Estimated daily value: <strong>${formatMoney(pay + perk)}</strong>. Include trains, specials, energy, nerve, happy, travel, and education effects.</div>
      </div>
    `;
  }

  const RACING_GUIDE_DATA = {
    progression: [
      { className: 'E', car: 'Edomondo Locale', cost: '1 point', build: 'Strip Out.' },
      { className: 'D', car: 'Tabata RM2 or Coche Basurero', cost: '15 points', build: 'Strip Out, Fast Road Tires, Polished Throttle Body, Uprated Air Filter Element, Back Box.' },
      { className: 'C', car: 'Bavaria Z8 or Echo S3', cost: '63 points', build: 'Strip Out, Track/Rally Tires, Competition Polished Throttle Body, Full Exhaust System, Stage One Turbo Kit, brake discs, fuel pump, pistons, flywheel, spoiler, ported head.' },
      { className: 'B', car: 'Colina Tanprice or Echo S4', cost: '130 points', build: 'Core power, brake, suspension, gearbox, differential, flywheel, cooling, and weight upgrades.' },
      { className: 'A', car: 'Track-specific', cost: '266+ points', build: 'Use the track meta table and tune shorthand below.' }
    ],
    tracks: [
      { name: 'Speedway', car: 'Veloria LFA', tune: 'TL3', notes: 'Long tarmac' },
      { name: 'Commerce', car: 'Edomondo NSX', tune: 'TS2', notes: 'Short tarmac T2' },
      { name: 'Vector', car: 'Edomondo NSX', tune: 'TS3', notes: 'Short tarmac T3' },
      { name: 'Meltdown', car: 'Edomondo NSX', tune: 'TS3', notes: 'Short tarmac T3' },
      { name: 'Industrial', car: 'Edomondo NSX', tune: 'TS3', notes: 'Short tarmac T3' },
      { name: 'Sewage', car: 'Edomondo NSX', tune: 'TS2', notes: 'Short tarmac T2' },
      { name: 'Convict', car: 'Mercia SLR', tune: 'TL3', notes: 'Specialist' },
      { name: 'Underdog', car: 'Edomondo NSX', tune: 'TS2', notes: 'Short tarmac T2' },
      { name: 'Uptown', car: 'Lambrini Torobravo', tune: 'TL3', notes: 'Specialist; Veloria LFA is practical alt' },
      { name: 'Withdrawal', car: 'Veloria LFA', tune: 'TL3', notes: 'Long tarmac' },
      { name: 'Docks', car: 'Volt GT', tune: 'TL3', notes: 'Long-ratio specialist' },
      { name: 'Mudpit', car: 'Colina Tanprice', tune: 'DL3', notes: 'Class B meta pick' },
      { name: 'Hammerhead', car: 'Edomondo NSX', tune: 'DS2', notes: 'Dirt short-ratio T2' },
      { name: 'Stone Park', car: 'Echo R8', tune: 'DS3', notes: 'Specialist' },
      { name: 'Two Islands', car: 'Edomondo NSX', tune: 'DL3', notes: 'Dirt long-ratio T3' },
      { name: 'Parkland', car: 'Edomondo NSX', tune: 'DS3', notes: 'Dirt short-ratio T3' }
    ],
    parts: {
      base: ['Air Forced Engine Cooling', 'Air Cooling Ducts for Brakes', 'Adjustable Rear Spoiler', 'Front Diffuser', 'Rear Diffuser', 'Fast Road Brake Fluid', 'Braided Brake Hoses', 'Grooved and Drilled Brake Discs', 'Competition Racing Brake Pads', 'Brake Balance Bias Control', '6 Pot Uprated Brakes', 'Ported and Polished Head', 'Competition Racing Fuel Pump', 'Competition Polished Throttle Body', 'Bored Out Engine + Forged Pistons', 'Bored Out Engine & Forged Pistons', 'Front Mounted Intercooler', 'Stage Three Remap', 'Competition Racing Camshaft', 'Full Exhaust System', 'Stainless Steel 4-1 Manifold', 'Custom Forced Induction Kit', 'Super Octane Fuel Plus Nitrous', 'Quick Shift', '4 Pin Differential', 'Competition Racing Clutch', 'Ultra-Light Flywheel', 'Strip Out', 'Racing Steering Wheel', 'Lightweight Flocked Dash', 'Polycarbonate Windows', 'Carbon Fiber Roof', 'Carbon Fiber Trunk', 'Carbon Fiber Hood', 'Ultra-Lightweight Alloys'],
      D: ['Rally Tires'],
      T: ['Track Tires'],
      DS: ['Group N Rally Suspension', 'Rally Gearbox (Short Ratio)'],
      DL: ['Group N Rally Suspension', 'Rally Gearbox (Long Ratio)'],
      TS: ['Adjustable Coilover Suspension', 'Paddle Shift Gearbox (Short Ratio)'],
      TL: ['Adjustable Coilover Suspension', 'Paddle Shift Gearbox (Long Ratio)'],
      2: ['Stage Two Turbo kit', 'Stage Two Turbo Kit', 'Stage 2 Turbo Kit', 'Stage 2 Turbo kit'],
      3: ['Stage Three Turbo kit', 'Stage Three Turbo Kit', 'Stage 3 Turbo Kit', 'Stage 3 Turbo kit']
    }
  };

  function racingKnownCars() {
    const names = new Set();
    RACING_GUIDE_DATA.tracks.forEach((track) => names.add(track.car));
    RACING_GUIDE_DATA.progression.forEach((row) => {
      String(row.car || '').split(/\bor\b|,|\//i).map((name) => cleanBookieText(name)).filter(Boolean).forEach((name) => {
        if (!/^multiple|track-specific/i.test(name)) names.add(name);
      });
    });
    return Array.from(names).sort((a, b) => b.length - a.length);
  }

  function detectRacingContextFromPage() {
    const text = cleanBookieText(document.body && document.body.innerText ? document.body.innerText : '');
    const track = RACING_GUIDE_DATA.tracks.find((item) => new RegExp(`\\b${escapeRegExp(item.name)}\\b`, 'i').test(text));
    const classNode = $('.class-letter') || $('[class*="class-letter"]');
    const classMatch = classNode && classNode.textContent ? cleanBookieText(classNode.textContent).match(/\b([A-E])\b/i) : text.match(/\bClass\s*([A-E])\b/i);
    const cars = racingKnownCars().filter((name) => new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text)).slice(0, 5);
    return {
      track,
      className: classMatch ? classMatch[1].toUpperCase() : '',
      cars
    };
  }

  function racingActiveTrack() {
    const detected = detectRacingContextFromPage();
    return detected.track || RACING_GUIDE_DATA.tracks.find((item) => item.name === state.utility.racingTrack) || null;
  }

  function racingTuneId() {
    const track = racingActiveTrack();
    if (track) return track.tune;
    const surface = state.utility.racingSurface || 'T';
    const ratio = state.utility.racingRatio || 'S';
    const turbo = state.utility.racingTurbo || '3';
    return `${surface}${ratio}${turbo}`;
  }

  function racingRequiredParts(tuneId = racingTuneId()) {
    const data = RACING_GUIDE_DATA.parts;
    const parts = [...data.base];
    if (tuneId.includes('D')) parts.push(...data.D);
    if (tuneId.includes('T')) parts.push(...data.T);
    if (tuneId.includes('DS')) parts.push(...data.DS);
    if (tuneId.includes('DL')) parts.push(...data.DL);
    if (tuneId.includes('TS')) parts.push(...data.TS);
    if (tuneId.includes('TL')) parts.push(...data.TL);
    if (tuneId.includes('2')) parts.push(...data[2]);
    if (tuneId.includes('3')) parts.push(...data[3]);
    return Array.from(new Set(parts));
  }

  function racingClassGuide(className) {
    const cleanClass = String(className || '').toUpperCase();
    return RACING_GUIDE_DATA.progression.find((item) => item.className === cleanClass) || null;
  }

  function renderRacingPlanner() {
    return renderRacingLoadout();
  }

  function renderRacingLoadout() {
    const detected = detectRacingContextFromPage();
    const selectedTrack = detected.track || RACING_GUIDE_DATA.tracks.find((track) => track.name === state.utility.racingTrack);
    const classGuide = racingClassGuide(detected.className);
    const tuneId = racingTuneId();
    const parts = racingRequiredParts(tuneId);
    const guideCar = detected.className === 'A' && selectedTrack ? selectedTrack.car : (classGuide ? classGuide.car : (selectedTrack ? selectedTrack.car : 'Custom'));
    const guideBuild = classGuide ? classGuide.build : 'Choose a custom tune or pick a detected/known track.';
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Active race loadout</span><span class="fluz-muted">${escapeHtml(detected.track ? 'detected' : 'manual')}</span></div>
        <div class="fluz-mini-metrics">
          <span><b>${escapeHtml(detected.track ? detected.track.name : '--')}</b><em>detected track</em></span>
          <span><b>${escapeHtml(detected.className || '--')}</b><em>class</em></span>
          <span><b>${escapeHtml(detected.cars.length ? detected.cars[0] : '--')}</b><em>visible car</em></span>
          <span><b>${escapeHtml(guideCar)}</b><em>guide car</em></span>
          <span><b>${escapeHtml(tuneId)}</b><em>active tune</em></span>
        </div>
        <div class="fluz-alert">
          ${detected.className && detected.className !== 'A'
            ? `Class ${escapeHtml(detected.className)} guidance uses the class progression build, not the A-class track-specialist car.`
            : 'Class A uses the track-specific meta car when the track is detected or selected.'}
        </div>
        <div class="fluz-form-grid">
          <label>Track
            <select data-utility-setting="racingTrack">
              <option value="custom" ${selectedTrack ? '' : 'selected'}>Custom tune</option>
              ${RACING_GUIDE_DATA.tracks.map((track) => `<option value="${escapeHtml(track.name)}" ${selectedTrack && selectedTrack.name === track.name ? 'selected' : ''}>${escapeHtml(track.name)} - ${escapeHtml(track.tune)}</option>`).join('')}
            </select>
          </label>
          <label>Search tracks
            <input type="text" data-utility-setting="racingSearch" value="${escapeHtml(state.utility.racingSearch || '')}" placeholder="Speedway, dirt, NSX...">
          </label>
          <label>Surface
            <select data-utility-setting="racingSurface">
              <option value="T" ${(state.utility.racingSurface || 'T') === 'T' ? 'selected' : ''}>Tarmac</option>
              <option value="D" ${state.utility.racingSurface === 'D' ? 'selected' : ''}>Dirt</option>
            </select>
          </label>
          <label>Ratio
            <select data-utility-setting="racingRatio">
              <option value="S" ${(state.utility.racingRatio || 'S') === 'S' ? 'selected' : ''}>Short</option>
              <option value="L" ${state.utility.racingRatio === 'L' ? 'selected' : ''}>Long</option>
            </select>
          </label>
          <label>Turbo
            <select data-utility-setting="racingTurbo">
              <option value="2" ${state.utility.racingTurbo === '2' ? 'selected' : ''}>Turbo 2</option>
              <option value="3" ${(state.utility.racingTurbo || '3') === '3' ? 'selected' : ''}>Turbo 3</option>
            </select>
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="apply-racing-highlights">Highlight upgrades</button>
          </label>
        </div>
        <p class="fluz-muted">Manual guide only. Highlighting colors fitted required parts green, missing required parts blue, and fitted non-required parts orange on the visible upgrades page.</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Recommended loadout</span><span class="fluz-muted">${escapeHtml(detected.className || 'manual')}</span></div>
        <p><span class="fluz-signal-tag fee">Car</span> <strong>${escapeHtml(guideCar)}</strong></p>
        <p><span class="fluz-signal-tag info">Build</span> <span class="fluz-muted">${escapeHtml(guideBuild)}</span></p>
        ${selectedTrack ? `<p><span class="fluz-signal-tag warn">Track note</span> ${escapeHtml(selectedTrack.name)}: ${escapeHtml(selectedTrack.notes)}. A-class meta: ${escapeHtml(selectedTrack.car)} (${escapeHtml(selectedTrack.tune)}).</p>` : ''}
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Required parts scanner</span><span class="fluz-muted">${parts.length} parts for ${escapeHtml(tuneId)}</span></div>
        <div class="fluz-guide-flow utility">
          ${parts.slice(0, 36).map((part) => `<div class="fluz-guide-step"><b>${escapeHtml(part)}</b></div>`).join('')}
        </div>
      </div>
    `;
  }

  function renderRacingMeta() {
    const query = String(state.utility.racingSearch || '').trim().toLowerCase();
    const tracks = RACING_GUIDE_DATA.tracks.filter((track) => !query || `${track.name} ${track.car} ${track.tune} ${track.notes}`.toLowerCase().includes(query));
    const progression = Object.fromEntries(RACING_GUIDE_DATA.progression.map((row) => [row.className, row]));
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>All-class track meta</span><span class="fluz-muted">${tracks.length} tracks</span></div>
        <label>Search tracks / cars
          <input type="text" data-utility-setting="racingSearch" value="${escapeHtml(state.utility.racingSearch || '')}" placeholder="Speedway, dirt, NSX...">
        </label>
        <p class="fluz-muted">Classes E-D-C-B use the progression car/build from the racing guide. Class A uses the track-specific meta table from the attached racing guide.</p>
        <div class="fluz-market-bazaar-rows">
          <div class="fluz-market-bazaar-row is-racing-meta is-head"><span>Track</span><span>E</span><span>D</span><span>C</span><span>B</span><span>A meta</span></div>
          ${tracks.map((track) => `
            <div class="fluz-market-bazaar-row is-racing-meta">
              <b>${escapeHtml(track.name)}</b>
              <span title="${escapeHtml(progression.E.build)}">${escapeHtml(progression.E.car)}</span>
              <span title="${escapeHtml(progression.D.build)}">${escapeHtml(progression.D.car)}</span>
              <span title="${escapeHtml(progression.C.build)}">${escapeHtml(progression.C.car)}</span>
              <span title="${escapeHtml(progression.B.build)}">${escapeHtml(progression.B.car)}</span>
              <span><strong>${escapeHtml(track.car)}</strong> <em>${escapeHtml(track.tune)}</em></span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Class progression</div>
        ${RACING_GUIDE_DATA.progression.map((row) => `
          <p><span class="fluz-signal-tag fee">Class ${escapeHtml(row.className)}</span> <strong>${escapeHtml(row.car)}</strong> <span class="fluz-muted">${escapeHtml(row.cost)}</span><br><span class="fluz-muted">${escapeHtml(row.build)}</span></p>
        `).join('')}
      </div>
    `;
  }

  function applyRacingUpgradeHighlights() {
    const required = new Set(racingRequiredParts().map((part) => part.toLowerCase()));
    const titles = Array.from(document.querySelectorAll('.pm-items-wrap .title.t-overflow, .tt-race-upgrades .title.t-overflow, [class*="upgrade"] .title'))
      .filter((node) => !node.closest(`#${APP.id}, #${APP.id}-modal`));
    let colored = 0;
    titles.forEach((titleElement) => {
      const partName = cleanBookieText(titleElement.textContent || '');
      if (!partName) return;
      const bgWrap = titleElement.closest('.bg-wrap');
      const boxWrap = titleElement.closest('.box-wrap');
      const targetWrap = bgWrap || (boxWrap ? boxWrap.parentElement : null) || titleElement.closest('li, [class*="item"], [class*="upgrade"]');
      if (!targetWrap || targetWrap.closest(`#${APP.id}, #${APP.id}-modal`)) return;
      const info = cleanBookieText((targetWrap.querySelector('.info') || {}).textContent || targetWrap.textContent || '');
      const fitted = /already fitted|installed|equipped/i.test(info);
      const needed = required.has(partName.toLowerCase());
      targetWrap.style.boxShadow = 'inset 0 0 0 1px rgba(255,255,255,.12)';
      if (needed && fitted) {
        targetWrap.style.background = 'rgba(75, 183, 112, .18)';
        colored += 1;
      } else if (needed) {
        targetWrap.style.background = 'rgba(45, 142, 204, .22)';
        colored += 1;
      } else if (fitted) {
        targetWrap.style.background = 'rgba(239, 140, 48, .18)';
        colored += 1;
      } else {
        targetWrap.style.background = '';
        targetWrap.style.boxShadow = '';
      }
    });
    showFlash(colored ? `Raceway highlighted ${colored} visible upgrades.` : 'No visible racing upgrade rows found yet.');
    return colored;
  }

  function renderHomeDashboard() {
    const user = (state.utilityData && state.utilityData.user) || {};
    const stats = normalizeBattleStats(user);
    const total = totalBattleStats(stats);
    const bars = normalizeBars(user);
    const money = parseNumber(user.money || extractVisibleLabelNumber('Money'));
    const energy = bars.energy || {};
    const nerve = bars.nerve || {};
    const happy = bars.happy || {};
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Account snapshot</span><span class="fluz-muted">${state.utilityData && state.utilityData.warnings && state.utilityData.warnings.length ? 'loaded with warnings' : 'live/local'}</span></div>
        <div class="fluz-mini-metrics">
          <span><b>${formatMoney(money)}</b><em>cash</em></span>
          <span><b>${compactNumber(total)}</b><em>battle stats</em></span>
          <span><b>${escapeHtml(`${energy.current || 0}/${energy.maximum || 0}`)}</b><em>energy</em></span>
          <span><b>${escapeHtml(`${nerve.current || 0}/${nerve.maximum || 0}`)}</b><em>nerve</em></span>
          <span><b>${escapeHtml(`${happy.current || 0}/${happy.maximum || 0}`)}</b><em>happy</em></span>
        </div>
        ${renderGymStatBars(stats)}
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Bars and readiness</span><span class="fluz-muted">manual checks</span></div>
        <div class="fluz-home-bars">
          ${renderHomeBar('Energy', energy, 'Gym', 'https://www.torn.com/gym.php')}
          ${renderHomeBar('Nerve', nerve, 'Crimes', 'https://www.torn.com/page.php?sid=crimes')}
          ${renderHomeBar('Happy', happy, 'Items', 'https://www.torn.com/items.php')}
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Quick routes</div>
        <div class="fluz-route-grid">
          <a class="fluz-route good" href="https://www.torn.com/gym.php">Gym</a>
          <a class="fluz-route warn" href="https://www.torn.com/page.php?sid=crimes">Crimes</a>
          <a class="fluz-route info" href="https://www.torn.com/page.php?sid=stocks">Stocks</a>
          <a class="fluz-route good" href="https://www.torn.com/imarket.php">Market</a>
          <a class="fluz-route info" href="https://www.torn.com/travelagency.php">Travel</a>
          <a class="fluz-route warn" href="https://www.torn.com/hospitalview.php">Hospital</a>
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Suggested next checks</div>
        <div class="fluz-guide-flow utility">
          <div class="fluz-guide-step"><b>Gym</b>${energy.current > 0 ? 'Energy is available. Check your gym build focus.' : 'Energy is low; plan your next refill/training.'}</div>
          <div class="fluz-guide-step"><b>Crimes</b>${nerve.current > 0 ? 'Nerve is available. Spend it before it caps.' : 'Nerve is low; wait for regen.'}</div>
          <div class="fluz-guide-step"><b>Items</b>Scan inventory value before selling or trading stacks.</div>
          <div class="fluz-guide-step"><b>Stocks</b>Check best next buy only when you have spare cash.</div>
        </div>
      </div>
    `;
  }

  function renderHomeBar(label, bar, routeLabel, routeUrl) {
    const current = parseNumber(bar && bar.current);
    const maximum = parseNumber(bar && bar.maximum);
    const pct = maximum > 0 ? clamp((current / maximum) * 100, 0, 100) : 0;
    const tone = pct >= 90 ? 'good' : pct >= 50 ? 'warn' : 'dim';
    const advice = homeBarAdvice(label, current, maximum);
    return `
      <div class="fluz-home-bar ${tone}">
        <div class="fluz-mini-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(`${current || 0}/${maximum || 0}`)}</span></div>
        <div class="fluz-bar"><span style="width:${pct.toFixed(1)}%"></span></div>
        <div class="fluz-mini-row"><span class="fluz-muted">${escapeHtml(advice)}</span><a class="fluz-footer-mini-btn" href="${escapeHtml(routeUrl)}">${escapeHtml(routeLabel)}</a></div>
      </div>
    `;
  }

  function homeBarAdvice(label, current, maximum) {
    if (maximum <= 0) return 'Save API key for live bar data.';
    const pct = current / maximum;
    if (label === 'Energy') {
      if (pct >= 0.9) return 'Near cap. Good time to train manually.';
      if (current > 0) return 'Some energy ready.';
      return 'Waiting for energy.';
    }
    if (label === 'Nerve') {
      if (pct >= 0.9) return 'Near cap. Spend before overflow.';
      if (current > 0) return 'Some nerve ready.';
      return 'Waiting for nerve.';
    }
    if (pct >= 0.9) return 'High happy; check training plan.';
    if (current > 0) return 'Normal happy range.';
    return 'Happy data unavailable.';
  }

  function renderInventoryPlanner() {
    const allStacks = scanVisibleInventoryStacks();
    const ignoredSet = getIgnoredItemSet();
    const ignoredStacks = allStacks.filter((item) => ignoredSet.has(item.name.toLowerCase()));
    const ignoredNames = Array.from(state.utility.ignoredItems || []).sort((a, b) => a.localeCompare(b));
    const stacks = sortRows(
      allStacks.filter((item) => !ignoredSet.has(item.name.toLowerCase())),
      state.utility.inventorySortKey,
      state.utility.inventorySortDir
    );
    const scanGross = stacks.reduce((sum, item) => sum + item.total, 0);
    const scanMarketNet = scanGross * (1 - MARKET_FEES.itemMarket.feePct / 100);
    const scanAnonNet = scanGross * (1 - MARKET_FEES.itemMarketAnon.feePct / 100);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Visible inventory value</span><span class="fluz-muted">${stacks.length} matched stacks</span></div>
        <div class="fluz-mini-metrics">
          <span><b>${formatMoney(scanGross)}</b><em>gross value</em></span>
          <span><b>${formatMoney(scanMarketNet)}</b><em>market net 5%</em></span>
          <span><b>${formatMoney(scanAnonNet)}</b><em>anonymous net 10%</em></span>
          <span><b>${escapeHtml(String(ignoredNames.length))}</b><em>ignored</em></span>
        </div>
        <div class="fluz-market-head">
          <div>${sortHeader('Item', 'inventory', 'name')}</div>
          <div>${sortHeader('Qty', 'inventory', 'quantity')}</div>
          <div>${sortHeader('Each', 'inventory', 'value')}</div>
          <div>${sortHeader('Total', 'inventory', 'total')}</div>
          <div>Action</div>
        </div>
        <div class="fluz-table">
          ${stacks.slice(0, 28).map((item) => `
            <div class="fluz-row fluz-market-row">
              <div class="fluz-cell-main">${escapeHtml(item.name)}</div>
              <div>${escapeHtml(compactNumber(item.quantity))}x</div>
              <div>${formatMoney(item.value)}</div>
              <div>${formatMoney(item.total)}</div>
              <div class="fluz-row-actions"><a class="fluz-button" href="${escapeHtml(itemMarketUrl(item.name))}" target="_blank" rel="noopener noreferrer">Market</a><button class="fluz-button danger" data-action="ignore-item" data-item-name="${escapeHtml(item.name)}">Ignore</button></div>
            </div>
          `).join('') || '<div class="fluz-card">No visible inventory stacks matched yet. Open an item category/list; the helper will scan automatically as Torn loads rows.</div>'}
        </div>
        ${ignoredNames.length ? `
          <div class="fluz-card compact">
            <div class="fluz-section-title"><span>Ignored items</span><span class="fluz-muted">not counted</span></div>
            <div class="fluz-chip-row">
              ${ignoredNames.map((name) => `<button class="fluz-ignore-chip" data-action="unignore-item" data-item-name="${escapeHtml(name)}">${escapeHtml(name)} x</button>`).join('')}
            </div>
          </div>
        ` : ''}
        <p class="fluz-muted">Values use Torn item market_value when available, otherwise visible item-page prices. It scans automatically as Torn loads inventory rows.</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Common item checks</div>
        <div class="fluz-link-grid">
          ${['Xanax', 'Ecstasy', 'Beer', 'Erotic DVD', 'Feathery Hotel Coupon', 'Can of Munster', 'Morphine', 'First Aid Kit', 'Lockpick', 'Laptop'].map((name) => `<a class="fluz-button" href="${escapeHtml(itemMarketUrl(name))}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`).join('')}
        </div>
      </div>
    `;
  }

  function renderCityHub() {
    const routes = [
      { label: 'Train', url: 'https://www.torn.com/gym.php', tone: 'good' },
      { label: 'Crimes', url: 'https://www.torn.com/page.php?sid=crimes', tone: 'warn' },
      { label: 'Travel', url: 'https://www.torn.com/travelagency.php', tone: 'info' },
      { label: 'Item Market', url: 'https://www.torn.com/imarket.php', tone: 'good' },
      { label: 'Bazaar', url: 'https://www.torn.com/bazaar.php', tone: 'good' },
      { label: 'Stock Market', url: 'https://www.torn.com/page.php?sid=stocks', tone: 'info' },
      { label: 'Casino', url: 'https://www.torn.com/casino.php', tone: 'bad' },
      { label: 'Bookie', url: 'https://www.torn.com/page.php?sid=bookie', tone: 'bad' },
      { label: 'Hospital', url: 'https://www.torn.com/hospitalview.php', tone: 'warn' },
      { label: 'Jail', url: 'https://www.torn.com/jailview.php', tone: 'warn' },
      { label: 'Education', url: 'https://www.torn.com/education.php', tone: 'info' },
      { label: 'Properties', url: 'https://www.torn.com/properties.php', tone: 'info' }
    ];
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">City route board</div>
        <div class="fluz-route-grid">
          ${routes.map((route) => `<a class="fluz-route ${route.tone}" href="${escapeHtml(route.url)}">${escapeHtml(route.label)}</a>`).join('')}
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Daily rhythm</div>
        <div class="fluz-guide-flow utility">
          <div class="fluz-guide-step"><b>1. Energy</b>Train or save for a planned happy jump.</div>
          <div class="fluz-guide-step"><b>2. Nerve</b>Spend nerve on your best money/skill crime.</div>
          <div class="fluz-guide-step"><b>3. Market</b>Check item/bazaar net after fees before buying inventory.</div>
          <div class="fluz-guide-step"><b>4. Cash</b>Bank, stock, or keep liquid depending on your risk mode.</div>
        </div>
      </div>
    `;
  }

  function renderCityStoreScanner() {
    const itemMap = new Map(getKnownItemRecords().map((item) => [item.name.toLowerCase(), item]));
    const rows = sortRows(CITY_STORE_ITEMS.map((shopItem) => {
      const market = itemMap.get(shopItem.name.toLowerCase());
      const value = market ? market.value : 0;
      const marketNet = value * (1 - MARKET_FEES.itemMarket.feePct / 100);
      const profit = marketNet - shopItem.cost;
      const roi = shopItem.cost > 0 ? (profit / shopItem.cost) * 100 : 0;
      return { ...shopItem, value, marketNet, profit, roi };
    }), state.utility.citySortKey, state.utility.citySortDir);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>City store profit watch</span><span class="fluz-muted">${rows.filter((row) => row.value > 0).length}/${rows.length} priced</span></div>
        <p class="fluz-muted">Compares documented city shop prices against Torn item market_value, net of the regular 5% item-market fee. Stock and daily allowance still need manual checking.</p>
      </div>
      <div class="fluz-market-head">
        <div>${sortHeader('Item', 'city', 'name')}</div>
        <div>${sortHeader('Cost', 'city', 'cost')}</div>
        <div>${sortHeader('Net', 'city', 'profit')}</div>
        <div>${sortHeader('ROI', 'city', 'roi')}</div>
        <div>${sortHeader('Store', 'city', 'store')}</div>
      </div>
      <div class="fluz-table">
        ${rows.map((row) => `
          <div class="fluz-row fluz-market-row">
            <div class="fluz-cell-main"><a href="${escapeHtml(itemMarketUrl(row.name))}" target="_blank" rel="noopener noreferrer">${escapeHtml(row.name)}</a></div>
            <div>${formatMoney(row.cost)}</div>
            <div class="${row.profit >= 0 ? 'fluz-pos' : 'fluz-neg'}">${row.value > 0 ? formatMoney(row.profit) : 'n/a'}</div>
            <div class="${row.roi >= 0 ? 'fluz-pos' : 'fluz-neg'}">${row.value > 0 ? formatPct(row.roi, 0) : 'n/a'}</div>
            <div>${escapeHtml(row.store)}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function cleanBookieText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function parseBookieOddsFromText(text) {
    const clean = cleanBookieText(text);
    const xMatch = clean.match(/\bx\s*([0-9]{1,2}(?:\.[0-9]{1,4})?)\b/i);
    if (xMatch) {
      const odds = parseNumber(xMatch[1]);
      if (odds > 1.001 && odds < 100) return odds;
    }
    const plain = clean.match(/\b([0-9]{1,2}\.[0-9]{2,4})\b/);
    if (plain) {
      const odds = parseNumber(plain[1]);
      if (odds > 1.001 && odds < 100) return odds;
    }
    return 0;
  }

  function parseBookieOutcomeLabel(text, odds) {
    let clean = cleanBookieText(text)
      .replace(/\b\d+\s*\/\s*\d+\b/g, ' ')
      .replace(new RegExp(`\\bx\\s*${escapeRegExp(String(odds.toFixed(2)).replace(/\.?0+$/, ''))}(?:0+)?\\b`, 'i'), ' ')
      .replace(/\bx\s*[0-9]{1,2}(?:\.[0-9]{1,4})?\b/ig, ' ')
      .replace(/\$[\d,.]*/g, ' ')
      .replace(/\bBET\b.*$/i, ' ')
      .replace(/\bYES\b.*$/i, ' ')
      .replace(/\bODDS\b|\bSTAKE\b|\bPROFIT\b|\bRETURN\b/ig, ' ');
    clean = cleanBookieText(clean);
    if (!clean || clean.length > 90) return '';
    return clean;
  }

  function getBookieCandidateRows() {
    if (!document.body) return [];
    const selectors = [
      'ul[class*="bets-wrap"] li',
      'li[class*="bets"]',
      '[class*="bets"]',
      '[class*="bet-row"]',
      '[class*="betting"] li',
      'tr'
    ];
    const nodes = selectors.flatMap((selector) => Array.from(document.querySelectorAll(selector)));
    const unique = Array.from(new Set(nodes));
    return unique.filter((node) => {
      if (!node || !node.isConnected) return false;
      if (node.closest(`#${APP.id}, #${APP.id}-modal`)) return false;
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (!/\bx\s*[0-9]{1,2}(?:\.[0-9]{1,4})?\b/i.test(text)) return false;
      if (text.length < 5 || text.length > 260) return false;
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }

  function inferBookieSportFromPage() {
    const text = `${window.location.href} ${document.title || ''} ${document.body ? document.body.innerText.slice(0, 2500) : ''}`.toLowerCase();
    if (/basketball|nba|wnba|ncaab/.test(text)) return 'basketball';
    if (/baseball|mlb/.test(text)) return 'baseball';
    if (/handball/.test(text)) return 'handball';
    if (/rugby/.test(text)) return 'rugby';
    return 'football';
  }

  function scanVisibleBookieOutcomes(stake, winPct) {
    const rows = getBookieCandidateRows();
    const fromRows = rows.map((node) => {
      const text = cleanBookieText(node.innerText || node.textContent || '');
      const odds = parseBookieOddsFromText(text);
      const label = parseBookieOutcomeLabel(text, odds);
      return { label, odds, text };
    });

    let fallback = [];
    if (!fromRows.length && document.body) {
      const text = cleanBookieText((document.body.innerText || '').replace(cleanBookieText(state.elements.panel && state.elements.panel.innerText), ' '));
      const pattern = /(?:\b\d+\s*\/\s*\d+\s+)?x\s*([0-9]{1,2}(?:\.[0-9]{1,4})?)\s+(.{2,80}?)(?=\s+\d+\s*\/\s*\d+\s+x|\s+\$|\s+BET|$)/ig;
      fallback = Array.from(text.matchAll(pattern)).map((match) => ({
        odds: parseNumber(match[1]),
        label: parseBookieOutcomeLabel(`x${match[1]} ${match[2]}`, parseNumber(match[1])),
        text: match[0]
      }));
    }

    const seen = new Set();
    return fromRows.concat(fallback)
      .filter((item) => item.odds > 1.001 && item.odds < 100 && item.label)
      .filter((item) => {
        const key = `${item.label.toLowerCase()}|${item.odds.toFixed(3)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map((item) => {
        const implied = 100 / item.odds;
        const profitIfWin = stake * (item.odds - 1);
        const ev = (winPct * profitIfWin) - ((1 - winPct) * stake);
        const edge = (winPct * item.odds - 1) * 100;
        const suggestedStake = ev > 0 ? Math.max(0, Math.min(stake, ev)) : 0;
        return { ...item, implied, ev, edge, suggestedStake };
      })
      .sort((a, b) => b.edge - a.edge || b.ev - a.ev || b.odds - a.odds)
      .slice(0, 24);
  }

  function findBookieStakeInput(label, odds) {
    const targetLabel = cleanBookieText(label).toLowerCase();
    const targetOdds = Math.round(parseNumber(odds) * 1000) / 1000;
    const rows = getBookieCandidateRows();
    for (const row of rows) {
      const text = cleanBookieText(row.innerText || row.textContent || '');
      const rowOdds = Math.round(parseBookieOddsFromText(text) * 1000) / 1000;
      const rowLabel = parseBookieOutcomeLabel(text, rowOdds).toLowerCase();
      if (Math.abs(rowOdds - targetOdds) > 0.002) continue;
      if (rowLabel !== targetLabel && !rowLabel.includes(targetLabel) && !targetLabel.includes(rowLabel)) continue;
      const input = Array.from(row.querySelectorAll('input')).find((candidate) => {
        const type = String(candidate.type || '').toLowerCase();
        return !type || type === 'text' || type === 'number' || type === 'tel';
      });
      if (input) return input;
    }
    return null;
  }

  function setVisibleInputValue(input, value) {
    if (!input) return false;
    const keepX = window.scrollX;
    const keepY = window.scrollY;
    const text = String(Math.max(0, Math.round(parseNumber(value))));
    try {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      if (setter) setter.call(input, text);
      else input.value = text;
    } catch (error) {
      input.value = text;
    }
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    try { window.scrollTo(keepX, keepY); } catch (error) { /* keep page position best effort */ }
    return true;
  }

  function isNativeFillInput(input) {
    if (!input || !input.isConnected) return false;
    if (input.closest(`#${APP.id}, #${APP.id}-modal`)) return false;
    if (input.disabled || input.readOnly) return false;
    const type = String(input.type || '').toLowerCase();
    if (type && !['text', 'number', 'tel'].includes(type)) return false;
    const rect = input.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function nativeInputText(input) {
    const attrText = [
      input.name,
      input.id,
      input.className,
      input.placeholder,
      input.getAttribute('aria-label'),
      input.getAttribute('data-name')
    ].map((value) => String(value || '')).join(' ').toLowerCase();
    const box = input.closest('li, tr, [class*="row"], [class*="item"], [class*="price"], [class*="listing"], [class*="market"]');
    const context = cleanBookieText((box ? box.innerText : input.parentElement ? input.parentElement.innerText : '') || '').toLowerCase();
    return { attrText, context, box };
  }

  function isLikelyQuantityInput(input) {
    const { attrText, context } = nativeInputText(input);
    if (/\b(qty|quantity|amount-owned|owned)\b/.test(attrText)) return true;
    if (/\bqty\b/.test(context) && !/\b(price|cost|sell|list|value|money|cash)\b/.test(attrText)) {
      const priceLike = /\bprice\b/.test(context) || /\$[\d,.]+[kmbt]?.{0,80}\bqty\b/i.test(context);
      if (!priceLike) return true;
    }
    const value = parseNumber(input.value);
    if (value > 0 && value < 100000 && /\bqty\b|\bquantity\b/.test(context) && !/\b(price|cost|sell|list|value|money|cash)\b/.test(attrText)) {
      const hasMoneyBeforeQty = /\$[\d,.]+[kmbt]?.{0,80}\bqty\b/i.test(context);
      if (!hasMoneyBeforeQty) return true;
    }
    return false;
  }

  function marketPriceInputScore(input, itemName = '') {
    const { attrText, context } = nativeInputText(input);
    let score = 0;
    if (isLikelyQuantityInput(input)) score -= 40;
    if (/\b(price|cost|sell|list|listing|amount|value|money|cash)\b/.test(attrText)) score += 5;
    if (/\b(search|filter|find|query)\b/.test(attrText)) score -= 8;
    if (/\b(qty|quantity|amount-owned|owned)\b/.test(attrText)) score -= 12;
    if (/\b(price|sell|list|listing|market|bazaar|each)\b/.test(context)) score += 3;
    if (/\$[\d,.]+/.test(context)) score += 2;
    if (/\b(search|filter|find)\b/.test(context)) score -= 4;
    if (itemName && context.includes(String(itemName).toLowerCase())) score += 12;
    if (/\bprice\b/.test(attrText)) score += 12;
    if (input === document.activeElement) score += 5;
    return score;
  }

  function findMarketPriceInput(itemName = '', sourcePrice = 0) {
    if (itemName) {
      const wanted = itemProfitKey(itemName);
      const source = Math.round(parseNumber(sourcePrice));
      const rowMatch = scanVisibleMarketItemRows().find((row) => {
        const sameName = itemProfitKey(row.name) === wanted;
        const samePrice = !source || Math.abs(Math.round(row.price) - source) <= 2;
        return sameName && samePrice;
      });
      if (rowMatch) {
        const input = rowMatch.priceInput || getMarketRowPriceInput(rowMatch.node);
        if (input && isNativeFillInput(input)) return input;
      }
    }
    const active = document.activeElement;
    if (active && active.tagName === 'INPUT' && isNativeFillInput(active) && marketPriceInputScore(active, itemName) >= 5) return active;
    if (state.lastNativeFillInput && isNativeFillInput(state.lastNativeFillInput) && marketPriceInputScore(state.lastNativeFillInput, itemName) >= 5) return state.lastNativeFillInput;
    const candidates = Array.from(document.querySelectorAll('input[type="text"], input[type="number"], input[type="tel"], input:not([type])'))
      .filter(isNativeFillInput)
      .map((input) => ({ input, score: marketPriceInputScore(input, itemName) }))
      .filter((item) => item.score >= 5)
      .sort((a, b) => b.score - a.score);
    return candidates.length ? candidates[0].input : null;
  }

  const BANK_PERIODS = [
    { label: '1 Week', days: 7, pattern: /1\s*week/i },
    { label: '2 Weeks', days: 14, pattern: /2\s*weeks/i },
    { label: '1 Month', days: 31, pattern: /1\s*month/i },
    { label: '2 Months', days: 62, pattern: /2\s*months/i },
    { label: '3 Months', days: 93, pattern: /3\s*months/i }
  ];
  const BANK_COLUMNS = ['Regular', 'TCI Only', '10/10 Merits Only', '10/10 Merits + TCI'];

  function bankPageText() {
    const helperText = state.elements.panel ? cleanBookieText(state.elements.panel.innerText || '') : '';
    const bodyText = document.body ? cleanBookieText(document.body.innerText || '') : '';
    return helperText ? bodyText.replace(helperText, ' ') : bodyText;
  }

  function bankVisibleAmountInput() {
    const inputs = $all('input[type="text"], input[type="number"], input[type="tel"], input:not([type])')
      .filter((input) => !input.closest(`#${APP.id}`) && !input.closest(`#${APP.id}-modal`) && input.offsetParent !== null);
    const scored = inputs.map((input) => {
      const attr = `${input.name || ''} ${input.id || ''} ${input.className || ''} ${input.placeholder || ''}`.toLowerCase();
      const container = cleanBookieText((input.closest('form, table, div') || input.parentElement || input).textContent || '').toLowerCase();
      let score = 0;
      if (/\bamount\b/.test(attr)) score += 20;
      if (/\bamount\b/.test(container)) score += 12;
      if (/\bbank|investment|period\b/.test(container)) score += 8;
      if (parseNumber(input.value) > 0) score += 3;
      return { input, score };
    }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
    return scored.length ? scored[0].input : null;
  }

  function bankVisibleAmount() {
    const input = bankVisibleAmountInput();
    if (input && parseNumber(input.value) > 0) return parseNumber(input.value);
    const match = bankPageText().match(/\bAmount:\s*\$?([0-9,]+)/i);
    return parseNumber(match && match[1]);
  }

  function scanVisibleBankRows(amount = 0) {
    const candidates = $all('tr, li, [class*="row"], [class*="table-row"], [class*="period"]')
      .filter((node) => !node.closest(`#${APP.id}`) && !node.closest(`#${APP.id}-modal`));
    const rows = [];
    candidates.forEach((node) => {
      const text = cleanBookieText(node.innerText || node.textContent || '');
      const periodMatches = BANK_PERIODS.filter((item) => item.pattern.test(text));
      if (periodMatches.length !== 1) return;
      const period = periodMatches[0];
      const moneyValues = (text.match(/\$[0-9,.]+[kmbt]?/gi) || []).map((value) => parseCompactNumber(value.replace('$', ''))).filter((value) => value > 0);
      if (moneyValues.length < 4) return;
      const hasDailyPairs = moneyValues.length >= BANK_COLUMNS.length * 2;
      const cells = BANK_COLUMNS.map((label, index) => {
        const interest = hasDailyPairs ? moneyValues[index * 2] : moneyValues[index];
        const daily = hasDailyPairs ? moneyValues[index * 2 + 1] : (period.days ? interest / period.days : 0);
        const apr = amount > 0 && period.days > 0 ? (interest / amount) * (365 / period.days) * 100 : 0;
        return { label, interest, daily, apr };
      });
      rows.push({ ...period, cells });
    });
    const unique = [];
    rows.forEach((row) => {
      if (!unique.some((item) => item.label === row.label)) unique.push(row);
    });
    return unique.sort((a, b) => a.days - b.days);
  }

  function bestBankCell(rows) {
    let best = null;
    rows.forEach((row) => {
      row.cells.forEach((cell) => {
        const candidate = { row, cell };
        if (!best || cell.daily > best.cell.daily) best = candidate;
      });
    });
    return best;
  }

  function bankActiveInvestmentInfo() {
    const user = state.utilityData && state.utilityData.user ? state.utilityData.user : {};
    const cityBank = user.city_bank || {};
    const amount = parseNumber(cityBank.amount);
    const seconds = parseNumber(cityBank.time_left ?? cityBank.timeLeft);
    const text = bankPageText();
    const visibleAmount = amount || parseNumber((text.match(/investment[^$]{0,60}\$([0-9,]+)/i) || [])[1]);
    return {
      active: amount > 0 || /investment\s+(?:ends|matures|complete|remaining|time left)/i.test(text),
      amount: visibleAmount,
      seconds
    };
  }

  function renderBankPlanner() {
    const visibleAmount = bankVisibleAmount();
    const planAmount = Math.max(0, parseNumber(state.utility.bankPlanAmount) || visibleAmount);
    const reserve = Math.max(0, parseNumber(state.utility.bankReserveCash));
    const investable = Math.max(0, planAmount - reserve);
    const rows = scanVisibleBankRows(planAmount);
    const best = bestBankCell(rows);
    const active = bankActiveInvestmentInfo();
    const visibleCash = parseNumber((state.utilityData && state.utilityData.user && (state.utilityData.user.money_onhand ?? state.utilityData.user.money)) || 0);
    const bestInterest = best ? best.cell.interest : 0;
    const bestDaily = best ? best.cell.daily : 0;
    const bestApr = best ? best.cell.apr : 0;
    return `
      <div class="fluz-section-title"><span>Bank investment helper</span><span class="fluz-muted">visible table / manual assist</span></div>
      <div class="fluz-card">
        <div class="fluz-bank-grid">
          <label>Planned amount
            <input type="number" min="0" step="1" data-utility-setting="bankPlanAmount" value="${escapeHtml(planAmount || '')}" placeholder="read from Torn amount">
          </label>
          <label>Keep cash out
            <input type="number" min="0" step="1" data-utility-setting="bankReserveCash" value="${escapeHtml(reserve || '')}" placeholder="emergency cash">
          </label>
          <label>Investable after reserve
            <input type="text" value="${escapeHtml(formatFullMoney(investable))}" readonly>
          </label>
          <label>Wallet/API cash
            <input type="text" value="${escapeHtml(visibleCash ? formatFullMoney(visibleCash) : 'API not loaded')}" readonly>
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:8px;">
          <button class="fluz-button" data-action="use-visible-bank-amount" ${visibleAmount ? '' : 'disabled'}>Use visible amount</button>
          <button class="fluz-button primary" data-action="fill-bank-amount" data-bank-amount="${escapeHtml(String(investable || planAmount || 0))}" ${investable || planAmount ? '' : 'disabled'}>Fill amount</button>
          <button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(String(Math.round(investable || planAmount || 0)))}" ${investable || planAmount ? '' : 'disabled'}>Copy amount</button>
        </div>
        <p class="fluz-muted">Fill amount only writes the number into Torn's visible amount box. It never starts or confirms an investment.</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Best visible option</span><span class="fluz-muted">${rows.length ? `${rows.length} periods scanned` : 'table not detected'}</span></div>
        <div class="fluz-mini-metrics">
          <span><b>${best ? escapeHtml(best.row.label) : '--'}</b><em>best daily term</em></span>
          <span><b>${best ? escapeHtml(best.cell.label) : '--'}</b><em>column</em></span>
          <span><b>${best ? formatMoney(bestInterest) : '--'}</b><em>interest</em></span>
          <span><b>${best ? formatMoney(bestDaily) : '--'}</b><em>per day</em></span>
          <span><b>${bestApr ? `${bestApr.toFixed(2)}%` : '--'}</b><em>APR estimate</em></span>
          <span><b>${active.active ? (active.seconds ? formatDurationShort(active.seconds * 1000) : 'active') : 'open'}</b><em>current lock</em></span>
        </div>
        <p class="fluz-muted">${best ? `Highest daily return detected is ${formatMoney(bestDaily)} per day from ${best.row.label} / ${best.cell.label}. Pick shorter terms if you need liquidity sooner.` : 'Open the Bank Investment section or enter an amount so Torn shows the return table.'}</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Visible rate table</span><span class="fluz-muted">interest / daily</span></div>
        ${rows.length ? renderBankRateTable(rows, best) : '<p class="fluz-muted">No bank table rows detected yet. Expand Bank Investment or refresh after Torn renders the table.</p>'}
      </div>
      <div class="fluz-card compact">
        <p><span class="fluz-signal-tag info">TCI</span> The Torn City Investment stock benefit can improve bank interest. The visible Torn columns are treated as source-of-truth.</p>
        <p><span class="fluz-signal-tag warn">Liquidity</span> Bank money is locked. Keep enough wallet/vault cash for rehab, travel, chains, fees, and market chances.</p>
      </div>
    `;
  }

  function renderBankRateTable(rows, best) {
    const bestKey = best ? `${best.row.label}|${best.cell.label}` : '';
    return `
      <div class="fluz-bank-row head">
        <div>Period</div>
        ${BANK_COLUMNS.map((label) => `<div>${escapeHtml(label)}</div>`).join('')}
      </div>
      ${rows.map((row) => `
        <div class="fluz-bank-row">
          <div class="fluz-bank-cell"><b>${escapeHtml(row.label)}</b><em>${row.days} days</em></div>
          ${row.cells.map((cell) => {
            const isBest = `${row.label}|${cell.label}` === bestKey;
            return `<div class="fluz-bank-cell ${isBest ? 'best' : ''}"><b>${formatMoney(cell.interest)}</b><em>${formatMoney(cell.daily)}/day${cell.apr ? ` - ${cell.apr.toFixed(2)}% APR` : ''}</em></div>`;
          }).join('')}
        </div>
      `).join('')}
    `;
  }

