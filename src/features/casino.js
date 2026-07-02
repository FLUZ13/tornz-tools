  function renderCasinoPlanner() {
    if (isBlackjackPage()) return renderBlackjackAdvisor();
    if (isHighLowPage()) return renderHighLowAdvisor();
    if (isHoldemPage()) return renderHoldemAdvisor();
    if (!isBookiePage()) return renderCasinoLandingPlanner();
    const stake = Math.max(0, parseNumber(state.utility.casinoStake));
    const odds = Math.max(1.01, parseNumber(state.utility.casinoOdds));
    const winPct = clamp(parseNumber(state.utility.casinoWinPct), 0, 100) / 100;
    const bankroll = Math.max(0, parseNumber(state.utility.casinoBankroll));
    const profitIfWin = stake * (odds - 1);
    const lossIfLose = stake;
    const ev = (winPct * profitIfWin) - ((1 - winPct) * lossIfLose);
    const breakEvenPct = 100 / odds;
    const edgePct = (winPct * odds - 1) * 100;
    const kellyRaw = odds > 1 ? (((odds - 1) * winPct) - (1 - winPct)) / (odds - 1) : 0;
    const cautiousStake = bankroll > 0 ? Math.max(0, Math.min(bankroll * 0.02, bankroll * Math.max(0, kellyRaw) * 0.25)) : 0;
    const outcomes = scanVisibleBookieOutcomes(stake, winPct);
    const sport = inferBookieSportFromPage();
    const sportEnabled = state.utility.bookieSports && state.utility.bookieSports[sport] !== false;
    const best = outcomes[0] || null;
    const advice = !sportEnabled
      ? `Sport disabled: ${sport}. Enable it if you want advice for this page.`
      : !outcomes.length
        ? 'No visible outcomes parsed. Expand the betting options or scroll to the odds rows, then refresh.'
        : best.edge > 0
          ? `Best local value: ${best.label} at x${best.odds.toFixed(2)}. Review manually before betting.`
          : 'NO VALUE EDGE: visible odds do not beat your current win estimate.';
    return `
      <div class="fluz-bookie-panel">
        <div class="fluz-bookie-title">
          <div>
            <strong>TORN BOOKIE ASSIST</strong>
            <span>Local odds parser - manual stake fill only</span>
          </div>
          <span class="fluz-bookie-badge">${escapeHtml(sportEnabled ? 'Active' : 'Disabled')} - ${escapeHtml(sport)}</span>
        </div>
        <div class="fluz-bookie-settings">
          <label>Budget / bankroll
            <input type="number" min="0" data-utility-setting="casinoBankroll" value="${escapeHtml(state.utility.casinoBankroll)}">
          </label>
          <label>Base stake
            <input type="number" min="0" data-utility-setting="casinoStake" value="${escapeHtml(state.utility.casinoStake)}">
          </label>
          <label>Manual odds
            <input type="number" min="1.01" step="0.01" data-utility-setting="casinoOdds" value="${escapeHtml(state.utility.casinoOdds)}">
          </label>
          <label>Your win %
            <input type="number" min="0" max="100" step="0.1" data-utility-setting="casinoWinPct" value="${escapeHtml(state.utility.casinoWinPct)}">
          </label>
        </div>
        <div class="fluz-bookie-sports">
          ${Object.entries({ football: 'Football', basketball: 'Basketball', baseball: 'Baseball', handball: 'Handball', rugby: 'Rugby' }).map(([key, label]) => `
            <button class="${state.utility.bookieSports && state.utility.bookieSports[key] !== false ? 'is-on' : ''}" data-action="toggle-bookie-sport" data-sport="${escapeHtml(key)}">${escapeHtml(label)}</button>
          `).join('')}
        </div>
        <div class="fluz-bookie-advice ${best && best.edge > 0 && sportEnabled ? 'good' : 'warn'}">
          <strong>${best && best.edge > 0 && sportEnabled ? 'BET ADVICE: VALUE CANDIDATE' : 'BET ADVICE: FALLBACK'}</strong>
          <span>${escapeHtml(advice)}</span>
        </div>
        <div class="fluz-mini-metrics">
          <span><b class="${ev >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatMoney(ev)}</b><em>manual EV</em></span>
          <span><b>${breakEvenPct.toFixed(1)}%</b><em>manual break-even</em></span>
          <span><b class="${edgePct >= 0 ? 'fluz-pos' : 'fluz-neg'}">${edgePct.toFixed(1)}%</b><em>manual edge</em></span>
          <span><b>${formatMoney(cautiousStake)}</b><em>cautious max</em></span>
        </div>
        <div class="fluz-bookie-outcomes">
          <div class="fluz-bookie-outcome-head"><span>Outcome</span><span>Odds</span><span>EV</span><span>Edge</span><span>Stake</span><span>Actions</span></div>
          ${outcomes.map((row) => `
            <div class="fluz-bookie-outcome ${row.edge > 0 ? 'good' : ''}">
              <span><strong>${escapeHtml(row.label)}</strong><em>break-even ${row.implied.toFixed(1)}%</em></span>
              <span>x${row.odds.toFixed(2)}</span>
              <span class="${row.ev >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatMoney(row.ev)}</span>
              <span class="${row.edge >= 0 ? 'fluz-pos' : 'fluz-neg'}">${row.edge.toFixed(1)}%</span>
              <span>${row.suggestedStake > 0 ? formatMoney(row.suggestedStake) : '-'}</span>
              <span class="fluz-row-actions">
                <button class="fluz-button" data-action="use-casino-odds" data-odds="${row.odds.toFixed(2)}">Use</button>
                <button class="fluz-button primary" ${row.suggestedStake > 0 ? '' : 'disabled'} data-action="fill-bookie-stake" data-label="${escapeHtml(row.label)}" data-odds="${row.odds.toFixed(3)}" data-stake="${escapeHtml(String(Math.round(row.suggestedStake)))}">Fill</button>
              </span>
            </div>
          `).join('') || '<div class="fluz-bookie-empty">No outcomes detected. Open/expand a Bookie market with x1.10 style odds, then press refresh.</div>'}
        </div>
        <p class="fluz-muted">Fill only writes a stake number into the visible Torn input. It never presses BET and never confirms YES.</p>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Casino quick notes</div>
        <p><span class="fluz-signal-tag bad">Risk</span> Predictions are not guaranteed. If your win estimate is wrong, EV is wrong.</p>
        <p><span class="fluz-signal-tag info">Break-even</span> x1.10 needs about 90.9% true chance; x6.00 needs about 16.7%.</p>
        <p><span class="fluz-signal-tag warn">Manual</span> You review the number, then you decide whether to press Torn's bet controls.</p>
      </div>
    `;
  }

  const BLACKJACK_ACTION = { HIT: 'Hit', STAND: 'Stand', DOUBLE: 'Double', SPLIT: 'Split' };
  const BLACKJACK_STRATEGY = {
    hard: {
      8: ['Hit','Hit','Hit','Hit','Hit','Hit','Hit','Hit','Hit','Hit','Hit'],
      9: ['Hit','Hit','Double','Double','Double','Double','Hit','Hit','Hit','Hit','Hit'],
      10: ['Hit','Double','Double','Double','Double','Double','Double','Double','Double','Hit','Hit'],
      11: ['Hit','Double','Double','Double','Double','Double','Double','Double','Double','Double','Hit'],
      12: ['Hit','Hit','Stand','Stand','Stand','Hit','Hit','Hit','Hit','Hit','Hit'],
      13: ['Hit','Stand','Stand','Stand','Stand','Stand','Hit','Hit','Hit','Hit','Hit'],
      14: ['Hit','Stand','Stand','Stand','Stand','Stand','Hit','Hit','Hit','Hit','Hit'],
      15: ['Hit','Stand','Stand','Stand','Stand','Stand','Hit','Hit','Hit','Hit','Hit'],
      16: ['Hit','Stand','Stand','Stand','Stand','Stand','Hit','Hit','Hit','Hit','Hit'],
      17: Array(11).fill('Stand'), 18: Array(11).fill('Stand'), 19: Array(11).fill('Stand'), 20: Array(11).fill('Stand'), 21: Array(11).fill('Stand')
    },
    soft: {
      13: ['Hit','Hit','Hit','Hit','Double','Double','Hit','Hit','Hit','Hit','Hit'],
      14: ['Hit','Hit','Hit','Hit','Double','Double','Hit','Hit','Hit','Hit','Hit'],
      15: ['Hit','Hit','Hit','Double','Double','Double','Hit','Hit','Hit','Hit','Hit'],
      16: ['Hit','Hit','Hit','Double','Double','Double','Hit','Hit','Hit','Hit','Hit'],
      17: ['Hit','Hit','Double','Double','Double','Double','Double','Hit','Hit','Hit','Hit'],
      18: ['Stand','Double','Double','Double','Double','Stand','Stand','Hit','Hit','Stand','Stand'],
      19: Array(11).fill('Stand'), 20: Array(11).fill('Stand')
    },
    pair: {
      2: ['Split','Split','Split','Split','Split','Split','Hit','Hit','Hit','Hit','Hit'],
      3: ['Split','Split','Split','Split','Split','Split','Hit','Hit','Hit','Hit','Hit'],
      4: ['Hit','Hit','Hit','Split','Split','Hit','Hit','Hit','Hit','Hit','Hit'],
      5: ['Hit','Double','Double','Double','Double','Double','Double','Double','Double','Hit','Hit'],
      6: ['Hit','Split','Split','Split','Split','Split','Hit','Hit','Hit','Hit','Hit'],
      7: ['Split','Split','Split','Split','Split','Split','Split','Hit','Hit','Hit','Hit'],
      8: Array(11).fill('Split'),
      9: ['Split','Split','Split','Split','Split','Stand','Split','Split','Stand','Stand','Stand'],
      10: Array(11).fill('Stand'),
      11: Array(11).fill('Split')
    }
  };

  function blackjackCardValue(element) {
    if (!element) return 0;
    const text = String(element.textContent || '').trim().toUpperCase();
    const cls = String(element.className || '').toUpperCase();
    const match = cls.match(/CARD-[A-Z]+-(A|K|Q|J|10|[2-9])\b/) || text.match(/\b(A|K|Q|J|10|[2-9])\b/);
    const rank = match ? match[1] : '';
    if (!rank) return 0;
    if (rank === 'A') return 11;
    if (['K', 'Q', 'J'].includes(rank)) return 10;
    return parseNumber(rank);
  }

  function blackjackHandInfo(selector) {
    const cards = Array.from(document.querySelectorAll(`${selector} div[class*="card-"], ${selector} span[class*="card-"]`))
      .map(blackjackCardValue)
      .filter(Boolean);
    let total = cards.reduce((sum, value) => sum + value, 0);
    let aces = cards.filter((value) => value === 11).length;
    let softAces = aces;
    while (total > 21 && softAces > 0) {
      total -= 10;
      softAces -= 1;
    }
    return {
      cards,
      total,
      isPair: cards.length === 2 && cards[0] === cards[1],
      isSoft: softAces > 0 && total <= 21
    };
  }

  function blackjackDecision(dealerValue, hand) {
    if (!dealerValue || !hand || !hand.cards.length) return '';
    const dealerIndex = dealerValue === 11 ? 1 : clamp(dealerValue, 2, 10);
    if (hand.isPair) {
      const pairValue = hand.cards[0] === 11 ? 11 : hand.cards[0];
      return (BLACKJACK_STRATEGY.pair[pairValue] || [])[dealerIndex] || BLACKJACK_ACTION.HIT;
    }
    if (hand.isSoft) return (BLACKJACK_STRATEGY.soft[hand.total] || [])[dealerIndex] || BLACKJACK_ACTION.STAND;
    return (BLACKJACK_STRATEGY.hard[hand.total] || [])[dealerIndex] || (hand.total >= 17 ? BLACKJACK_ACTION.STAND : BLACKJACK_ACTION.HIT);
  }

  function renderBlackjackAdvisor() {
    const dealerCard = document.querySelector('.dealer-cards div[class*="card-"], .dealer-cards span[class*="card-"]');
    const dealerValue = blackjackCardValue(dealerCard);
    const hand = blackjackHandInfo('.player-cards');
    const canAct = !!document.querySelector('#hit, #stand, button[id*="hit"], button[id*="stand"]');
    const canDouble = !!document.querySelector('#double, button[id*="double"]');
    const decision = dealerValue && hand.cards.length >= 2 && hand.total < 21 && canAct ? blackjackDecision(dealerValue, hand) : '';
    const key = decision ? decision.toLowerCase() : 'idle';
    const label = decision || 'Waiting';
    const doubleNote = decision === BLACKJACK_ACTION.DOUBLE && !canDouble ? 'Double if Torn offers it; otherwise use the closest basic-strategy fallback manually.' : 'Use the table action only when it matches the buttons Torn currently offers.';
    return `
      <div class="fluz-section-title"><span>Blackjack Assist</span><span class="fluz-muted">basic strategy / manual only</span></div>
      <div class="fluz-casino-game">
        <div class="fluz-casino-decision">
          <div class="fluz-casino-call ${escapeHtml(key)}">${escapeHtml(label)}</div>
          <div class="fluz-casino-info">
            <div class="fluz-mini-metrics">
              <span><b>${hand.total || '--'}</b><em>your total</em></span>
              <span><b>${dealerValue ? (dealerValue === 11 ? 'A' : dealerValue) : '--'}</b><em>dealer up</em></span>
              <span><b>${hand.isSoft ? 'Soft' : (hand.isPair ? 'Pair' : 'Hard')}</b><em>hand type</em></span>
              <span><b>${canAct ? 'Live' : 'Waiting'}</b><em>state</em></span>
            </div>
            <p class="fluz-muted">${escapeHtml(doubleNote)} You still choose and click Torn's buttons manually.</p>
          </div>
        </div>
      </div>
      <div class="fluz-card compact">
        <p><span class="fluz-signal-tag good">Strategy</span> Basic strategy is the best repeatable blackjack plan: avoid hunch plays, do not chase losses, and set a stop limit before you sit down.</p>
        <p><span class="fluz-signal-tag warn">Manual</span> This helper never hits, stands, doubles, splits, stakes, or confirms anything.</p>
      </div>
    `;
  }

  const HIGHLOW_VALUES = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, J: 11, Q: 12, K: 13, A: 14 };

  function highLowCardValue(text) {
    const clean = String(text || '').trim().toUpperCase();
    return HIGHLOW_VALUES[clean] || 0;
  }

  function readHighLowValue(selector) {
    const node = document.querySelector(selector);
    if (!node) return 0;
    const rating = node.querySelector('span.rating, [class*="rating"]');
    return highLowCardValue((rating || node).textContent);
  }

  function visibleHighLowCards() {
    return Array.from(document.querySelectorAll('.dealer-card span.rating, .you-card span.rating, [class*="card"] span.rating'))
      .map((node) => highLowCardValue(node.textContent))
      .filter(Boolean);
  }

  function highLowOdds(currentValue) {
    const deck = {};
    Object.values(HIGHLOW_VALUES).forEach((value) => { deck[value] = 4; });
    visibleHighLowCards().forEach((value) => {
      if (deck[value] > 0) deck[value] -= 1;
    });
    let lower = 0;
    let higher = 0;
    let equal = 0;
    Object.entries(deck).forEach(([raw, count]) => {
      const value = parseNumber(raw);
      if (value < currentValue) lower += count;
      else if (value > currentValue) higher += count;
      else equal += count;
    });
    const total = lower + higher + equal;
    const pick = higher > lower ? 'High' : (lower > higher ? 'Low' : (currentValue <= 7 ? 'High' : 'Low'));
    const best = pick === 'High' ? higher : lower;
    return { lower, higher, equal, total, pick, pct: total ? (best / total) * 100 : 0 };
  }

  function highLowPotInfo() {
    const helperText = state.elements.panel ? cleanBookieText(state.elements.panel.innerText || '') : '';
    const bodyText = document.body ? cleanBookieText(document.body.innerText || '') : '';
    const text = helperText ? bodyText.replace(helperText, ' ') : bodyText;
    const pot = parseNumber((text.match(/CURRENT\s+POT:\s*\$?([0-9,]+)/i) || [])[1]);
    const wins = parseNumber((text.match(/\((\d+)\s+wins?\s+in\s+a\s+row\)/i) || [])[1]);
    const modifier = parseNumber((text.match(/Current\s+modifier:\s*([0-9.]+)%/i) || [])[1]);
    return { pot, wins, modifier, hasCashoutValue: pot > 0 || wins > 0 };
  }

  function highLowStrategy(odds, potInfo = highLowPotInfo()) {
    if (!odds || !odds.total) return { pick: 'Waiting', pickKey: 'waiting', plan: 'Waiting', note: 'Waiting for a visible card.', risk: '--' };
    const equalPct = (odds.equal / odds.total) * 100;
    const pickKey = odds.pick.toLowerCase();
    if (!potInfo.hasCashoutValue) {
      if (odds.pct >= 52) return { pick: odds.pick, pickKey, plan: 'First pick', note: `${odds.pick} is the better first-card side. No cashout value exists yet, so this is a pick decision only.`, risk: 'Open' };
      return { pick: odds.pick, pickKey, plan: 'Neutral first pick', note: `${odds.pick} is only a tie-break pick here. Equal cards are the real danger, but there is no streak/pot to cash out yet.`, risk: 'Neutral' };
    }
    if (odds.pct >= 63) {
      return { pick: odds.pick, pickKey, plan: 'Continue', note: `Strong edge. Pick ${odds.pick} if you continue; cashout is conservative but not required by the odds.`, risk: 'Strong' };
    }
    if (odds.pct >= 57) {
      return { pick: odds.pick, pickKey, plan: 'Caution', note: `Playable but thin. Pick ${odds.pick} if you continue, or cash out if the current pot matters.`, risk: 'Thin' };
    }
    return { pick: odds.pick, pickKey, plan: 'Cash out favored', note: `Cashout is favored if you already have a pot. If you play anyway, ${odds.pick} is still the better side: ${odds.pct.toFixed(1)}%, equal-card risk ${equalPct.toFixed(1)}%.`, risk: 'Bad' };
  }

  function renderHighLowAdvisor() {
    const dealerValue = readHighLowValue('.dealer-card');
    const playerValue = readHighLowValue('.you-card');
    const odds = dealerValue ? highLowOdds(dealerValue) : null;
    const potInfo = highLowPotInfo();
    const strategy = highLowStrategy(odds, potInfo);
    const call = strategy.pick;
    const key = strategy.pickKey;
    const lowerPct = odds && odds.total ? (odds.lower / odds.total) * 100 : 0;
    const higherPct = odds && odds.total ? (odds.higher / odds.total) * 100 : 0;
    const equalPct = odds && odds.total ? (odds.equal / odds.total) * 100 : 0;
    const cashoutAlert = potInfo.hasCashoutValue && strategy.risk === 'Bad';
    return `
      <div class="fluz-section-title"><span>High-Low Helper</span><span class="fluz-muted">probability advice / manual only</span></div>
      <div class="fluz-casino-game">
        <div class="fluz-casino-decision">
          <div class="fluz-casino-call ${escapeHtml(key)}">${escapeHtml(call)}</div>
          <div class="fluz-casino-info">
            <div class="fluz-mini-metrics">
              <span><b>${dealerValue || '--'}</b><em>shown card</em></span>
              <span><b>${playerValue || '--'}</b><em>revealed card</em></span>
              <span><b>${odds ? `${odds.pct.toFixed(1)}%` : '--'}</b><em>best side</em></span>
              <span><b>${escapeHtml(strategy.plan)}</b><em>cashout plan</em></span>
            </div>
            <div>
              <div class="fluz-mini-row"><span>Lower ${odds ? `${odds.lower} (${lowerPct.toFixed(1)}%)` : '--'}</span><span>Higher ${odds ? `${odds.higher} (${higherPct.toFixed(1)}%)` : '--'}</span></div>
              <div class="fluz-casino-bar"><span style="width:${clamp(odds ? Math.max(lowerPct, higherPct) : 0, 0, 100).toFixed(1)}%"></span></div>
            </div>
            <p class="fluz-muted">${escapeHtml(strategy.note)}</p>
          </div>
        </div>
        ${cashoutAlert ? `
          <div class="fluz-cashout-alert">
            Cash out favored
            <span>Pot ${escapeHtml(formatMoney(potInfo.pot))} / ${escapeHtml(String(potInfo.wins))} wins. Best side is only ${escapeHtml(odds ? odds.pct.toFixed(1) : '--')}%.</span>
          </div>
        ` : ''}
      </div>
      <div class="fluz-card compact">
        <p><span class="fluz-signal-tag info">Best pick</span> ${odds ? `${escapeHtml(odds.pick)} - lower ${lowerPct.toFixed(1)}%, higher ${higherPct.toFixed(1)}%, equal ${equalPct.toFixed(1)}%, ${odds.total} cards tracked.` : 'Waiting for cards.'}</p>
        <p><span class="fluz-signal-tag ${potInfo.hasCashoutValue ? 'warn' : 'good'}">Streak</span> ${potInfo.hasCashoutValue ? `Current pot ${formatMoney(potInfo.pot)} / ${potInfo.wins} wins. ${escapeHtml(strategy.plan)}.` : 'No active winnings detected. Do not treat first-card neutral odds as a cashout situation.'}</p>
        <p><span class="fluz-signal-tag warn">Manual</span> Deck tracking can be imperfect if the panel loads mid-round. Use Refresh after a new game starts. The helper never presses High, Low, or Cash Out.</p>
      </div>
    `;
  }

  const POKER_RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
  const POKER_HAND_NAMES = ['High Card', 'One Pair', 'Two Pair', 'Three of a Kind', 'Straight', 'Flush', 'Full House', 'Four of a Kind', 'Straight Flush'];

  function pokerRank(raw) {
    const text = String(raw || '').trim().toUpperCase();
    const names = { ACE: 'A', KING: 'K', QUEEN: 'Q', JACK: 'J', TEN: 'T' };
    if (names[text]) return names[text];
    if (text === '10') return 'T';
    return POKER_RANKS.includes(text) ? text : '';
  }

  function parsePokerCard(node) {
    if (!node) return null;
    const label = String(node.getAttribute('aria-label') || '');
    if (/face\s*down/i.test(label)) return null;
    const cardBack = node.closest && node.closest('[class*="back"], [class*="faceDown"], [class*="face-down"]');
    const cardFront = node.closest && node.closest('[class*="front"]');
    if (cardBack && !cardFront) return null;
    const source = `${label} ${node.className || ''} ${node.textContent || ''}`;
    const classCard = source.match(/\b(clubs|spades|hearts|diamonds)-(10|[2-9TJQKA])(?=\b|[_-])/i);
    if (classCard) {
      const suitMap = { clubs: 'C', spades: 'S', hearts: 'H', diamonds: 'D' };
      const rank = pokerRank(classCard[2]);
      const suit = suitMap[classCard[1].toLowerCase()];
      return { rank, suit, key: `${rank}${suit}`, label: `${rank}${suit}` };
    }
    const labelCard = source.match(/\b(ace|king|queen|jack|ten|10|[2-9]|[TJQKA])\s*(?:of)?\s*(clubs?|spades?|hearts?|diamonds?)/i);
    if (labelCard) {
      const suitMap = { club: 'C', clubs: 'C', spade: 'S', spades: 'S', heart: 'H', hearts: 'H', diamond: 'D', diamonds: 'D' };
      const rank = pokerRank(labelCard[1]);
      const suit = suitMap[labelCard[2].toLowerCase()];
      return { rank, suit, key: `${rank}${suit}`, label: `${rank}${suit}` };
    }
    const shortCard = source.match(/\b(10|[2-9TJQKA])([CSHD])\b/i);
    if (shortCard) {
      const rank = pokerRank(shortCard[1]);
      const suit = shortCard[2].toUpperCase();
      return { rank, suit, key: `${rank}${suit}`, label: `${rank}${suit}` };
    }
    const suitMatch = source.match(/(clubs?|spades?|hearts?|diamonds?)/i);
    const suitMap = { club: 'C', clubs: 'C', spade: 'S', spades: 'S', heart: 'H', hearts: 'H', diamond: 'D', diamonds: 'D' };
    const suit = suitMatch ? suitMap[suitMatch[1].toLowerCase()] : '';
    const rankMatch = source.match(/(?:^|\b)(ace|king|queen|jack|ten|10|[2-9]|[TJQKA])(?:\b|[_-])/i) || source.match(/[_-](10|[2-9TJQKA])(?:\b|[_-])/i);
    const rank = pokerRank(rankMatch ? rankMatch[1] : '');
    if (!rank || !suit) return null;
    return { rank, suit, key: `${rank}${suit}`, label: `${rank}${suit}` };
  }

  function pokerFaceUpCardNodes(selector) {
    return $all(selector)
      .flatMap((root) => {
        if (!root || !root.querySelectorAll) return [];
        const nodes = $all('[role="img"]', root);
        return root.getAttribute && root.getAttribute('role') === 'img' ? [root, ...nodes] : nodes;
      })
      .filter((node) => {
        const label = String(node.getAttribute('aria-label') || '');
        if (/face\s*down/i.test(label)) return false;
        if (node.closest && node.closest(`#${APP.id}, #${APP.id}-modal`)) return false;
        const cardBack = node.closest && node.closest('[class*="back"], [class*="faceDown"], [class*="face-down"]');
        const cardFront = node.closest && node.closest('[class*="front"]');
        if (cardBack && !cardFront) return false;
        const source = `${label} ${node.className || ''} ${node.textContent || ''}`;
        return /\b(clubs|spades|hearts|diamonds)-(10|[2-9TJQKA])(?=\b|[_-])/i.test(source)
          || /\b(ace|king|queen|jack|ten|10|[2-9]|[TJQKA])\s*(?:of)?\s*(clubs?|spades?|hearts?|diamonds?)/i.test(source)
          || /\b(10|[2-9TJQKA])([CSHD])\b/i.test(source);
      });
  }

  function uniquePokerCards(cards) {
    const seen = new Set();
    return cards.filter((card) => {
      if (!card || seen.has(card.key)) return false;
      seen.add(card.key);
      return true;
    });
  }

  function readPokerCards(selector) {
    return uniquePokerCards(pokerFaceUpCardNodes(selector)
      .map(parsePokerCard)
      .filter(Boolean));
  }

  function readPokerHoleCards() {
    const direct = readPokerCards('[class*="hand"], [class*="playerMe"], [class*="hero"], [class*="hole"]').filter((card) => card);
    const boardKeys = new Set(readPokerBoardCards().map((card) => card.key));
    return direct.filter((card) => !boardKeys.has(card.key)).slice(0, 2);
  }

  function readPokerBoardCards() {
    const logText = pokerCurrentHandLogText();
    if (pokerLogShowsNewPreflop(logText)) return [];
    const loggedCards = readPokerBoardFromLog(logText);
    if (loggedCards.length) return loggedCards;
    const domCards = readPokerCards('[class*="communityCards"], [class*="community-cards"]');
    if (domCards.length && !pokerHiddenBoardIsVisible()) return domCards.slice(0, 5);
    return [];
  }

  function pokerCardFromLogText(value, suitText) {
    const suitMap = {
      c: 'C', club: 'C', clubs: 'C',
      s: 'S', spade: 'S', spades: 'S',
      h: 'H', heart: 'H', hearts: 'H',
      d: 'D', diamond: 'D', diamonds: 'D'
    };
    const rank = pokerRank(value);
    const suit = suitMap[String(suitText || '').toLowerCase()];
    if (!rank || !suit) return null;
    return { rank, suit, key: `${rank}${suit}`, label: `${rank}${suit}` };
  }

  function pokerCardsFromText(text) {
    const cards = [];
    const normalized = String(text || '')
      .replace(/\u2663/g, ' clubs ')
      .replace(/\u2660/g, ' spades ')
      .replace(/\u2665/g, ' hearts ')
      .replace(/\u2666/g, ' diamonds ');
    const patterns = [
      /\b(ace|king|queen|jack|ten|10|[2-9]|[TJQKA])\s*(?:of)?\s*(clubs?|spades?|hearts?|diamonds?|[CSHD])\b/gi,
      /\b(10|[2-9TJQKA])([CSHD])\b/gi
    ];
    patterns.forEach((pattern) => {
      let match;
      while ((match = pattern.exec(normalized))) {
        const card = pokerCardFromLogText(match[1], match[2]);
        if (card) cards.push(card);
      }
    });
    return uniquePokerCards(cards);
  }

  function readPokerBoardFromLog(text = pokerCurrentHandLogText()) {
    const board = [];
    const flopMatches = Array.from(text.matchAll(/The\s+flop:\s*([^\n\r]+)/gi));
    if (flopMatches.length) board.push(...pokerCardsFromText(flopMatches[flopMatches.length - 1][1]).slice(0, 3));
    const turnMatches = Array.from(text.matchAll(/The\s+turn:\s*([^\n\r]+)/gi));
    if (turnMatches.length) board.push(...pokerCardsFromText(turnMatches[turnMatches.length - 1][1]).slice(0, 1));
    const riverMatches = Array.from(text.matchAll(/The\s+river:\s*([^\n\r]+)/gi));
    if (riverMatches.length) board.push(...pokerCardsFromText(riverMatches[riverMatches.length - 1][1]).slice(0, 1));
    return uniquePokerCards(board).slice(0, 5);
  }

  function pokerLogSaysPreflop() {
    return pokerLogShowsNewPreflop(pokerCurrentHandLogText());
  }

  function lastRegexIndex(text, regex) {
    let latest = -1;
    let match;
    regex.lastIndex = 0;
    while ((match = regex.exec(text))) latest = match.index;
    return latest;
  }

  function pokerLogShowsNewPreflop(text) {
    const clean = String(text || '');
    const preflopIndex = lastRegexIndex(clean, /\b(?:Game\s+[a-f0-9]+\s+started|The\s+preflop\b|two\s+cards\s+dealt\s+to\s+each\s+player)\b/gi);
    if (preflopIndex < 0) return false;
    const boardIndex = lastRegexIndex(clean, /\bThe\s+(?:flop|turn|river):/gi);
    return preflopIndex > boardIndex;
  }

  function pokerLogText() {
    const helper = state.elements.panel;
    const nodes = $all('[class*="log"], [class*="message"], [class*="history"]')
      .filter((node) => !node.closest(`#${APP.id}`) && (!helper || !helper.contains(node)))
      .filter((node) => /preflop|flop|turn|river|game\s+[a-f0-9]+|called|checked|raised|folded/i.test(node.innerText || node.textContent || ''));
    const text = nodes.length
      ? nodes.map((node) => String(node.innerText || node.textContent || '')).join('\n')
      : String(document.body && document.body.innerText ? document.body.innerText : '');
    const helperText = helper ? String(helper.innerText || '') : '';
    return helperText ? text.replace(helperText, '\n') : text;
  }

  function pokerCurrentHandLogText() {
    const text = pokerLogText();
    if (!text) return '';
    const starts = Array.from(text.matchAll(/(?:^|\n)\s*(?:Game\s+[a-f0-9]+\s+started|The\s+preflop\b)/gi));
    const start = starts.length ? starts[starts.length - 1].index : Math.max(0, text.length - 1600);
    return text.slice(start).replace(/\r/g, '\n');
  }

  function pokerHiddenBoardIsVisible() {
    const boardText = $all('[class*="communityCards"], [class*="community-cards"], [class*="board"]')
      .filter((node) => !node.closest(`#${APP.id}`))
      .map((node) => `${node.innerText || ''} ${node.className || ''}`)
      .join(' ');
    return /face\s*down|back|hidden/i.test(boardText);
  }

  function pokerCardStrip(cards) {
    if (!cards.length) return '<span class="fluz-muted">No visible cards.</span>';
    return `<div class="fluz-card-strip">${cards.map((card) => `<span class="fluz-playing-card ${card.suit === 'H' || card.suit === 'D' ? 'red' : ''}">${escapeHtml(card.label)}</span>`).join('')}</div>`;
  }

  function pokerCombos(items, size) {
    if (size === 0) return [[]];
    if (items.length < size) return [];
    const result = [];
    items.forEach((item, index) => {
      pokerCombos(items.slice(index + 1), size - 1).forEach((combo) => result.push([item, ...combo]));
    });
    return result;
  }

  function pokerStraightHigh(indices) {
    const unique = Array.from(new Set(indices)).sort((a, b) => a - b);
    if ([12, 0, 1, 2, 3].every((value) => unique.includes(value))) return 3;
    let best = -1;
    for (let i = 0; i <= unique.length - 5; i += 1) {
      const slice = unique.slice(i, i + 5);
      if (slice[4] - slice[0] === 4) best = Math.max(best, slice[4]);
    }
    return best;
  }

  function evaluatePokerFive(cards) {
    const counts = {};
    const suits = {};
    const ranks = cards.map((card) => POKER_RANKS.indexOf(card.rank)).sort((a, b) => b - a);
    cards.forEach((card) => {
      const rank = POKER_RANKS.indexOf(card.rank);
      counts[rank] = (counts[rank] || 0) + 1;
      suits[card.suit] = (suits[card.suit] || 0) + 1;
    });
    const groups = Object.entries(counts).map(([rank, count]) => ({ rank: parseNumber(rank), count })).sort((a, b) => b.count - a.count || b.rank - a.rank);
    const isFlush = Object.values(suits).some((count) => count === 5);
    const straightHigh = pokerStraightHigh(ranks);
    if (isFlush && straightHigh >= 0) return { force: 8, name: 'Straight Flush', main: straightHigh, kickers: [] };
    if (groups[0].count === 4) return { force: 7, name: 'Four of a Kind', main: groups[0].rank, kickers: groups.filter((g) => g.count !== 4).map((g) => g.rank) };
    if (groups[0].count === 3 && groups[1] && groups[1].count === 2) return { force: 6, name: 'Full House', main: groups[0].rank, kickers: [groups[1].rank] };
    if (isFlush) return { force: 5, name: 'Flush', main: ranks[0], kickers: ranks.slice(1) };
    if (straightHigh >= 0) return { force: 4, name: 'Straight', main: straightHigh, kickers: [] };
    if (groups[0].count === 3) return { force: 3, name: 'Three of a Kind', main: groups[0].rank, kickers: groups.filter((g) => g.count === 1).map((g) => g.rank).sort((a, b) => b - a) };
    if (groups[0].count === 2 && groups[1] && groups[1].count === 2) return { force: 2, name: 'Two Pair', main: Math.max(groups[0].rank, groups[1].rank), kickers: [Math.min(groups[0].rank, groups[1].rank), ...groups.filter((g) => g.count === 1).map((g) => g.rank)] };
    if (groups[0].count === 2) return { force: 1, name: 'One Pair', main: groups[0].rank, kickers: groups.filter((g) => g.count === 1).map((g) => g.rank).sort((a, b) => b - a) };
    return { force: 0, name: 'High Card', main: ranks[0], kickers: ranks.slice(1) };
  }

  function comparePokerEval(a, b) {
    if (!a || !b) return 0;
    if (a.force !== b.force) return a.force - b.force;
    if (a.main !== b.main) return a.main - b.main;
    const length = Math.max(a.kickers.length, b.kickers.length);
    for (let i = 0; i < length; i += 1) {
      const diff = (a.kickers[i] ?? -1) - (b.kickers[i] ?? -1);
      if (diff) return diff;
    }
    return 0;
  }

  function bestPokerEval(cards) {
    if (cards.length < 5) return null;
    return pokerCombos(cards, 5).map(evaluatePokerFive).sort((a, b) => comparePokerEval(b, a))[0] || null;
  }

  function pokerDeckWithout(cards) {
    const used = new Set(cards.map((card) => card.key));
    const deck = [];
    POKER_RANKS.forEach((rank) => ['C', 'S', 'H', 'D'].forEach((suit) => {
      const key = `${rank}${suit}`;
      if (!used.has(key)) deck.push({ rank, suit, key, label: key });
    }));
    return deck;
  }

  function pokerDrawOuts(hole, board) {
    const cards = [...hole, ...board];
    if (hole.length < 2 || board.length < 3 || board.length >= 5) return { count: 0, pct: 0 };
    const current = bestPokerEval(cards) || { force: 0, main: -1, kickers: [] };
    const outs = pokerDeckWithout(cards).filter((card) => comparePokerEval(bestPokerEval([...cards, card]), current) > 0);
    const remaining = 52 - cards.length;
    const streets = 5 - board.length;
    const miss = outs.length && streets === 2 ? ((remaining - outs.length) / remaining) * ((remaining - outs.length - 1) / (remaining - 1)) : (remaining ? (remaining - outs.length) / remaining : 1);
    return { count: outs.length, pct: outs.length ? (1 - miss) * 100 : 0 };
  }

  function detectPokerBetContext() {
    const text = $all('[class*="message"] span, [class*="log"] span, [class*="chat"] span').map((node) => node.textContent || '').join(' ');
    const blind = (text.match(/posted big blind \$?([0-9,]+)/i) || [])[1];
    const raises = Array.from(text.matchAll(/raised \$?[0-9,]+ to \$?([0-9,]+)/gi)).map((match) => parseNumber(match[1]));
    const bb = parseNumber(blind);
    const maxRaise = raises.length ? Math.max(...raises) : 0;
    const level = !bb || !maxRaise ? 0 : maxRaise / bb <= 5 ? 1 : maxRaise / bb <= 15 ? 2 : 3;
    return { bb, level };
  }

  function pokerRiskLevel() {
    return clamp(parseNumber(state.utility.casinoPokerRisk ?? 50), 0, 100);
  }

  function pokerActionContext() {
    const helperText = state.elements.panel ? cleanBookieText(state.elements.panel.innerText || '') : '';
    const actionNodeText = $all('button, [role="button"], input[type="button"], input[type="submit"], a')
      .filter((node) => !node.closest(`#${APP.id}`) && !node.closest(`#${APP.id}-modal`))
      .map((node) => cleanBookieText(node.value || node.textContent || node.getAttribute('aria-label') || ''))
      .filter((text) => /\b(CHECK|CALL|RAISE|BET|FOLD|ALL IN)\b/i.test(text))
      .join(' ');
    const bodyText = document.body ? cleanBookieText(document.body.innerText || '') : '';
    const text = actionNodeText || (helperText ? bodyText.replace(helperText, ' ') : bodyText);
    const callMatch = text.match(/\bCALL(?:\s+\$?([0-9,.kmb]+))?\b/i);
    return {
      canCheck: /\bCHECK\b/i.test(text),
      canCall: !!callMatch,
      canRaise: /\bRAISE\b|\bBET\b|\bALL\s+IN\b/i.test(text),
      canFold: /\bFOLD\b/i.test(text),
      callAmount: parseCompactNumber(callMatch && callMatch[1] ? callMatch[1] : 0)
    };
  }

  function applyPokerActionContext(advice, actions) {
    if (!advice) return { action: 'Waiting', key: 'waiting', label: 'Waiting for cards' };
    if (advice.action === 'Raise' && !actions.canRaise) {
      if (actions.canCheck) return { ...advice, action: 'Check', key: 'check', label: `${advice.label}. Raise would be preferred, but Torn is only showing a free check right now.` };
      if (actions.canCall) return { ...advice, action: 'Call', key: 'call', label: `${advice.label}. Raise would be preferred, but no raise/bet button is visible; continue manually only if the price is sane.` };
      return { ...advice, action: 'Wait', key: 'waiting', label: `${advice.label}. Raise would be preferred, but no playable action button is visible yet.` };
    }
    if (advice.action === 'Fold' && actions.canCheck) {
      return { ...advice, action: 'Check', key: 'check', label: `${advice.label}. Check is free; fold only if someone bets into you.` };
    }
    if (advice.action === 'Call' && actions.canCheck && !actions.callAmount) {
      return { ...advice, action: 'Check', key: 'check', label: `${advice.label}. Take the free check if available.` };
    }
    return advice;
  }

  function pokerPreflopAdvice(hole, risk = pokerRiskLevel()) {
    if (hole.length !== 2) return { action: 'Waiting', key: 'waiting', label: 'Waiting for cards', strength: 0 };
    const context = detectPokerBetContext();
    const ranks = hole.map((card) => POKER_RANKS.indexOf(card.rank)).sort((a, b) => b - a);
    const suited = hole[0].suit === hole[1].suit;
    const pair = ranks[0] === ranks[1];
    if (pair) {
      if (ranks[0] >= 9) return { action: 'Raise', key: 'raise', label: `${hole[0].rank}${hole[1].rank} premium pair`, strength: ranks[0] >= 11 ? 8 : 6 };
      if (ranks[0] >= 5) return { action: context.level >= 2 ? 'Fold' : 'Call', key: context.level >= 2 ? 'fold' : 'call', label: 'Medium pair', strength: 4 };
      return { action: context.level >= 1 ? 'Fold' : 'Call', key: context.level >= 1 ? 'fold' : 'call', label: 'Small pair / set mine only', strength: 2 };
    }
    const high = ranks[0];
    const low = ranks[1];
    const gap = high - low;
    if (high === 12 && low >= 11) return { action: 'Raise', key: 'raise', label: low === 11 ? 'AK premium broadway' : 'AQ strong broadway', strength: low === 11 ? 7 : 5 };
    if (high === 12 && low >= 8) return { action: suited || low >= 9 ? 'Call' : 'Fold', key: suited || low >= 9 ? 'call' : 'fold', label: suited ? 'Suited ace' : 'Offsuit ace', strength: suited ? 3 : 1 };
    if (high === 12 && suited && risk >= 35) return { action: 'Call', key: 'call', label: 'Suited ace: playable if the price is cheap or check is free', strength: 2 };
    if (high === 11 && low >= 10) return { action: 'Raise', key: 'raise', label: 'KQ broadway', strength: 4 };
    if (suited && high >= 10 && low >= 3 && risk >= 45) return { action: 'Call', key: 'call', label: 'Suited face card: playable at this risk if price is cheap', strength: 2 };
    if (suited && gap <= 3 && high >= 7 && low >= 3) return { action: 'Call', key: 'call', label: 'Suited connector/gapper', strength: 2 };
    if (high >= 10 && low >= 9) return { action: risk >= 35 ? 'Call' : 'Fold', key: risk >= 35 ? 'call' : 'fold', label: 'Playable broadway', strength: 2 };
    return { action: 'Fold', key: 'fold', label: 'Weak preflop hand', strength: 0 };
  }

  function pokerActivePlayers() {
    const nodes = $all('[class*="opponent"], [id^="player-"], [class*="playerWrapper"]');
    const live = nodes.filter((node) => !/sitting out|waiting bb|folded|empty/i.test(node.textContent || '')).length;
    return clamp(live || 2, 2, 9);
  }

  function pokerWinEstimate(hole, board, players) {
    if (hole.length < 2) return 0;
    const known = [...hole, ...board];
    const deckBase = pokerDeckWithout(known);
    const sims = board.length >= 3 ? 180 : 120;
    let wins = 0;
    for (let sim = 0; sim < sims; sim += 1) {
      const deck = deckBase.slice();
      for (let i = deck.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const runout = board.slice();
      while (runout.length < 5) runout.push(deck.pop());
      const mine = bestPokerEval([...hole, ...runout]);
      let ahead = true;
      for (let p = 1; p < players; p += 1) {
        const villain = [deck.pop(), deck.pop()];
        if (comparePokerEval(bestPokerEval([...villain, ...runout]), mine) > 0) {
          ahead = false;
          break;
        }
      }
      if (ahead) wins += 1;
    }
    return (wins / sims) * 100;
  }

  function pokerPostflopAdvice(evalInfo, outs, winPct, boardCount, risk = pokerRiskLevel()) {
    if (!evalInfo) return { action: 'Waiting', key: 'waiting', label: 'Waiting for enough cards' };
    if (evalInfo.force >= 4) return { action: 'Raise', key: 'raise', label: `${evalInfo.name} is strong. Build value, but size manually.` };
    if (evalInfo.force === 3 || evalInfo.force === 2) return { action: 'Raise', key: 'raise', label: `${evalInfo.name}. Value bet or raise if action is not scary.` };
    const drawThreshold = risk >= 70 ? 6 : (risk >= 40 ? 8 : 10);
    const pairThreshold = risk >= 70 ? 25 : (risk >= 40 ? 33 : 42);
    if (outs.count >= drawThreshold && boardCount < 5) return { action: 'Call', key: 'call', label: `${outs.count} outs (${outs.pct.toFixed(1)}%). Continue if the call is cheap for your risk setting.` };
    if (evalInfo.force === 1 && winPct >= pairThreshold) return { action: 'Call', key: 'call', label: `${evalInfo.name}. Pot-control; avoid huge calls.` };
    return { action: 'Fold', key: 'fold', label: 'Weak made hand / poor draw. Check if free, fold to pressure.' };
  }

  function pokerHeroFolded(hole) {
    if (hole.length >= 2) return false;
    const text = bankPageText();
    return /\byou\s+folded\b/i.test(text);
  }

  function renderHoldemAdvisor() {
    const hole = readPokerHoleCards();
    const board = readPokerBoardCards();
    const players = pokerActivePlayers();
    const risk = pokerRiskLevel();
    const actions = pokerActionContext();
    const folded = pokerHeroFolded(hole);
    const evalInfo = board.length || hole.length + board.length >= 5 ? bestPokerEval([...hole, ...board]) : null;
    const outs = pokerDrawOuts(hole, board);
    const winPct = hole.length >= 2 ? pokerWinEstimate(hole, board, players) : 0;
    const preflop = board.length === 0 ? pokerPreflopAdvice(hole, risk) : null;
    const rawAdvice = preflop || pokerPostflopAdvice(evalInfo, outs, winPct, board.length, risk);
    const advice = applyPokerActionContext(rawAdvice, actions);
    const key = folded ? 'waiting' : advice.key;
    const action = folded ? 'Folded' : advice.action;
    const handName = evalInfo ? evalInfo.name : (preflop ? preflop.label : 'Waiting');
    const street = board.length === 0 ? 'Preflop' : (board.length === 3 ? 'Flop' : (board.length === 4 ? 'Turn' : 'River'));
    return `
      <div class="fluz-section-title"><span>Hold'em Helper</span><span class="fluz-muted">hand strength / manual only</span></div>
      <div class="fluz-casino-game">
        <div class="fluz-casino-decision">
          <div class="fluz-casino-call ${escapeHtml(key)}">${escapeHtml(action)}</div>
          <div class="fluz-casino-info">
            <div class="fluz-mini-metrics">
              <span><b>${escapeHtml(handName)}</b><em>hand</em></span>
              <span><b>${winPct ? `${winPct.toFixed(0)}%` : '--'}</b><em>sim win</em></span>
              <span><b>${outs.count || '--'}</b><em>outs</em></span>
              <span><b>${escapeHtml(street)}</b><em>${players} players</em></span>
            </div>
            <p class="fluz-muted">${escapeHtml(advice.label)}</p>
          </div>
        </div>
        <div class="fluz-casino-strategy" style="margin-top:8px;">
          <div class="fluz-mini-row"><strong>Risk</strong><span data-poker-risk-label>${risk <= 30 ? 'Safe' : (risk >= 70 ? 'Loose' : 'Balanced')} ${risk}/100</span></div>
          <input type="range" min="0" max="100" step="5" data-utility-setting="casinoPokerRisk" value="${escapeHtml(risk)}">
          <p class="fluz-muted">Lower risk folds more marginal hands. Higher risk continues more suited cards and draws.</p>
        </div>
        <div class="fluz-poker-grid">
          <div class="fluz-casino-strategy"><strong>Your cards</strong>${pokerCardStrip(hole)}</div>
          <div class="fluz-casino-strategy"><strong>Board</strong>${pokerCardStrip(board)}</div>
        </div>
      </div>
      <div class="fluz-card compact">
        <p><span class="fluz-signal-tag info">Seen actions</span> ${actions.canCheck ? 'Check available. ' : ''}${actions.callAmount ? `Call ${formatMoney(actions.callAmount)} visible. ` : ''}${actions.canRaise ? 'Raise/bet visible. ' : ''}${!actions.canCheck && !actions.callAmount && !actions.canRaise ? 'No action buttons detected yet.' : ''}</p>
        <p><span class="fluz-signal-tag info">Strategy</span> Preflop advice uses your risk slider. Postflop advice values made hands, draws, player count, free checks, and simulated equity.</p>
        <p><span class="fluz-signal-tag warn">Manual</span> This helper never folds, calls, raises, checks, bets, sits, stakes, or confirms anything.</p>
      </div>
    `;
  }

  function renderCasinoLandingPlanner() {
    return `
      <div class="fluz-section-title"><span>Casino helper</span><span class="fluz-muted">manual assist</span></div>
      <div class="fluz-card">
        <p class="fluz-muted">Bookie, Blackjack, High-Low, and Hold'em helpers appear on their game pages. They calculate advice only; they do not play or confirm actions.</p>
        <div class="fluz-route-grid">
          <a class="fluz-button primary" href="https://www.torn.com/page.php?sid=bookie#/your-bets" target="_blank" rel="noopener noreferrer">Open Bookie</a>
          <a class="fluz-button" href="https://www.torn.com/page.php?sid=blackjack" target="_blank" rel="noopener noreferrer">Blackjack</a>
          <a class="fluz-button" href="https://www.torn.com/page.php?sid=highlow" target="_blank" rel="noopener noreferrer">High-Low</a>
          <a class="fluz-button" href="https://www.torn.com/page.php?sid=holdem" target="_blank" rel="noopener noreferrer">Hold'em</a>
          <a class="fluz-button" href="https://www.torn.com/casino.php" target="_blank" rel="noopener noreferrer">Casino</a>
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Safety notes</div>
        <p><span class="fluz-signal-tag bad">Risk</span> Casino games are volatile and usually negative EV unless you have a real edge.</p>
        <p><span class="fluz-signal-tag warn">Manual</span> This helper never places bets or clicks game controls.</p>
      </div>
    `;
  }

