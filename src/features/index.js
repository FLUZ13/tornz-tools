  const UTILITY_MODULES = {
    home: {
      key: 'home',
      title: "TORN'z Home Helper",
      short: 'Home',
      tabs: ['war', 'targets', 'finder', 'lists', 'overview', 'timers', 'guide', 'links'],
      feeKey: 'itemMarket',
      keywords: ['effective battle stats', 'information'],
      pathPatterns: [/\/index\.php/i, /^\/$/],
      tools: ['targetBoard', 'timers'],
      guide: [
        'Home is your quick status page: cash, bars, and battle stats should be visible at a glance.',
        'Use total battle stats and stat balance to decide whether gym training should follow your saved build.',
        'This helper reads visible/API data only. It never trains, uses items, or clicks actions.'
      ]
    },
    profile: {
      key: 'profile',
      title: "TORN'z Target Board",
      short: 'Targets',
      tabs: ['war', 'targets', 'finder', 'lists', 'overview', 'mugCheck', 'timers', 'guide'],
      feeKey: 'itemMarket',
      pageCheck: isProfilePage,
      keywords: ['profile'],
      pathPatterns: [/profiles\.php/i],
      tools: ['targetBoard', 'mugProtection', 'timers'],
      guide: [
        'Profile target board is a manual watch list for players you may want to remember for attacks, notes, or faction situations.',
        'Use Add current profile on any Torn profile page, or paste a Profile URL/XID manually.',
        'This helper only saves links and notes locally. It never attacks, messages, or performs account actions.'
      ]
    },
    bazaar: {
      key: 'bazaar',
      title: "TORN'z Bazaar Helper",
      short: 'Bazaar',
      tabs: ['scan', 'guide', 'database'],
      feeKey: 'bazaar',
      keywords: ['bazaar'],
      pathPatterns: [/bazaar/i],
      tools: ['visiblePriceScan'],
      guide: [
        'Use the bulk price planner to calculate +1%, +2%, or discount changes before manually editing listings.',
        'Bazaar selling has no item market 5% tax, so your break-even price is lower than item market.',
        'Watch item market prices before repricing. Bazaar can win by being slightly cheaper while keeping more net profit.'
      ]
    },
    itemmarket: {
      key: 'itemmarket',
      title: "TORN'z Item Market Helper",
      short: 'Market',
      tabs: ['tools', 'bazaarListings', 'database', 'guide'],
      feeKey: 'itemMarket',
      pageCheck: isItemMarketPage,
      keywords: ['item market', 'add listings'],
      pathPatterns: [/imarket/i, /itemmarket/i],
      tools: ['visiblePriceScan'],
      guide: [
        'Regular item market sales use a 5% fee. Anonymous selling uses 10% unless waived by certain company specials.',
        'Use net-after-fee, not listed price, when comparing to bazaar or item cost.',
        'The helper does not edit listings automatically. It gives target prices for manual entry.'
      ]
    },
    items: {
      key: 'items',
      title: "TORN'z Items Helper",
      short: 'Items',
      tabs: ['tools', 'addictionAdvisor', 'guide', 'links'],
      feeKey: 'itemMarket',
      keywords: ['items', 'inventory'],
      pathPatterns: [/\/items/i, /items\.php/i, /item\.php/i, /inventory/i],
      tools: ['inventoryPlanner'],
      guide: [
        'Use the stack value planner to compare what an inventory stack is worth if sold through bazaar, regular item market, or anonymous item market.',
        'Boost items should be compared by effect and market price. A cheap item is not always the best training or profit choice.',
        'The helper opens item-market links for manual checks only. It does not use, sell, buy, or list items.'
      ]
    },
    city: {
      key: 'city',
      title: "TORN'z City Helper",
      short: 'City',
      tabs: ['tools', 'addictionAdvisor', 'guide', 'links'],
      feeKey: 'itemMarket',
      keywords: ['east side', 'west side', 'red-light', 'city center'],
      pathPatterns: [/\/city\.php/i, /sid=city/i],
      tools: ['cityHub', 'cityStoreScanner', 'addictionAdvisor'],
      guide: [
        'City is the navigation hub. Use this page as a quick route board for money, training, market, casino, travel, and status pages.',
        'Good Torn play is mostly rhythm: spend energy, spend nerve, check travel, compare markets, then bank or invest spare cash.',
        'The helper stays passive. It gives route links and reminders, but never clicks city actions for you.'
      ]
    },
    attack: {
      key: 'attack',
      title: "TORN'z Attack Helper",
      short: 'Attack',
      tabs: ['tools', 'guide'],
      feeKey: 'itemMarket',
      keywords: ['attacking', 'attack'],
      pathPatterns: [/sid=attack/i, /user2ID=/i],
      tools: ['mugProtection'],
      guide: [
        'Attack helper is read-only. It checks risk notes and target context, but never presses attack, continue, leave, mug, or hospitalize buttons.',
        'Use the mug protection check before deciding manually whether a mug attempt is worth the risk.',
        'API lookups use your local Torn API key only against api.torn.com.'
      ]
    },
    bank: {
      key: 'bank',
      title: "TORN'z Bank Helper",
      short: 'Bank',
      tabs: ['tools', 'guide', 'links'],
      feeKey: 'itemMarket',
      keywords: ['bank investment', 'interest', 'merits', 'tci'],
      pathPatterns: [/\/bank\.php/i, /sid=bank/i],
      tools: ['bankPlanner'],
      guide: [
        'Bank investments are locked, so the best term is not always the highest total interest. Compare daily yield and when you need cash again.',
        'The visible Torn table already reflects your merit and Torn City Investment benefit options. Use it as the source of truth when available.',
        'This helper can fill an amount only when you press Fill. It never starts, renews, or confirms a bank investment.'
      ]
    },
    casino: {
      key: 'casino',
      title: "TORN'z Casino Helper",
      short: 'Casino',
      tabs: ['tools', 'guide', 'links'],
      feeKey: 'itemMarket',
      keywords: ['casino', 'bookie', 'blackjack', 'poker', 'holdem', 'high-low', 'roulette'],
      pathPatterns: [/casino/i, /bookie/i, /blackjack/i, /highlow/i, /holdem/i, /poker/i],
      tools: ['casinoPlanner'],
      guide: [
        'Bookie decisions should be based on decimal odds, your estimated win chance, and bankroll risk. Positive EV does not guarantee a win.',
        'Casino games are risky entertainment unless you have a clear edge. Use small stakes relative to bankroll.',
        'This helper never places bets, hides buttons, or plays games. It calculates and reminds only.'
      ]
    },
    crimes: {
      key: 'crimes',
      title: "TORN'z Crimes Helper",
      short: 'Crimes',
      tabs: ['tools', 'guide', 'links'],
      keywords: ['crimes', 'nerve'],
      pathPatterns: [/crimes/i],
      tools: ['crimePlanner'],
      guide: [
        'Money per nerve matters, but crime success, skill growth, unique outcomes, and chain goals can matter more.',
        'Track your own payout averages locally: enter reward, nerve cost, and success rate to estimate expected value.',
        'Use item links for crime tools/materials, then compare market prices before buying.'
      ]
    },
    raceway: {
      key: 'raceway',
      title: "TORN'z Raceway Helper",
      short: 'Raceway',
      tabs: ['raceLoadout', 'raceMeta', 'guide', 'links'],
      keywords: ['raceway', 'race track', 'racing'],
      pathPatterns: [/race/i],
      tools: ['racingGuide'],
      guide: [
        'Track class, surface, length, and weather change car/upgrade priorities.',
        'Grip and handling tend to matter more on technical/wet tracks; speed and acceleration matter more on straights.',
        'Keep notes per track so your setups improve from your own results instead of guesswork.'
      ]
    },
    job: {
      key: 'job',
      title: "TORN'z Job Helper",
      short: 'Job',
      tabs: ['tools', 'guide'],
      keywords: ['job', 'company', 'work stats'],
      pathPatterns: [/job/i, /companies/i],
      tools: ['jobPlanner'],
      guide: [
        'Compare daily pay with specials, trains, passive perks, and stat requirements.',
        'For account growth, specials like energy, nerve, happy, education, or travel can beat raw salary.',
        'Track the perk value manually when the API cannot value it cleanly.'
      ]
    },
    travel: {
      key: 'travel',
      title: "TORN'z Travel Helper",
      short: 'Travel',
      tabs: ['tools', 'addictionAdvisor', 'guide', 'links'],
      keywords: ['travel agency', 'travel'],
      pathPatterns: [/travel/i],
      tools: ['travelPlanner', 'addictionAdvisor'],
      guide: [
        'Travel profit is item sell value minus abroad cost, flight opportunity cost, and risk.',
        'Limited abroad stock can disappear. Always confirm stock in Torn before flying.',
        'Use profit per hour and profit per item slot, not only total profit.'
      ]
    },
    missions: {
      key: 'missions',
      title: "TORN'z Missions Helper",
      short: 'Missions',
      tabs: ['tools', 'guide', 'links'],
      keywords: ['missions', 'mission credits', 'duke'],
      pathPatterns: [/missions/i],
      tools: ['missionPlanner'],
      guide: [
        'Mission helper reads visible mission wording and turns common task patterns into manual reminders.',
        'Use hints as a checklist for restrictions, targets, timers, and required items before you act in Torn.',
        'This helper never accepts missions, attacks, buys rewards, or clicks claim buttons. It only calculates and links.'
      ]
    },
    bounties: {
      key: 'bounties',
      title: "TORN'z Bounty Helper",
      short: 'Bounties',
      tabs: ['tools', 'guide', 'links'],
      feeKey: 'itemMarket',
      keywords: ['bounties', 'bounty'],
      pathPatterns: [/bounties\.php/i],
      tools: ['bountyFilter'],
      guide: [
        'Bounty helper scans the visible bounty list and lets you filter/highlight rows by level, reward, name, and unavailable status.',
        'Hide non-matches only changes the page display locally. It does not claim, attack, open profiles, or click Torn controls.',
        'Always verify target status and reward in Torn before manually choosing any action.'
      ]
    },
    awards: {
      key: 'awards',
      title: "TORN'z Merit Helper",
      short: 'Merits',
      tabs: ['tools', 'guide', 'links'],
      feeKey: 'itemMarket',
      keywords: ['awards', 'merits', 'honors', 'medals'],
      pathPatterns: [/sid=awards/i, /tab=merits/i, /awards\.php/i],
      pageCheck: () => isMeritsPage(),
      tools: ['meritTracker'],
      guide: [
        'Merit helper gives a manual route for spending upgrades based on account goals. It does not spend or reset merits.',
        'The route uses current Torn merit upgrade effects from the official wiki and lets you track your own levels locally.',
        'Use the Awards page and Torn forums for exact merit hunting; this panel focuses on spend priority and missing low-effort ideas.'
      ]
    },
    properties: {
      key: 'properties',
      title: "TORN'z Property Helper",
      short: 'Property',
      tabs: ['tools', 'guide'],
      keywords: ['properties', 'estate agents', 'rental'],
      pathPatterns: [/propert/i],
      tools: ['propertyPlanner'],
      guide: [
        'For rentals, compare upfront cost, daily rent, upkeep, and break-even days.',
        'High happy properties can indirectly improve gym gains, especially for planned happy jumps.',
        'Use the calculator to estimate how many rent days are needed to recover purchase or upgrade cost.'
      ]
    },
    hospital: {
      key: 'hospital',
      title: "TORN'z Hospital Helper",
      short: 'Hospital',
      tabs: ['tools', 'timers', 'guide'],
      keywords: ['hospital'],
      pathPatterns: [/hospital/i],
      tools: ['hospitalStatus', 'addictionAdvisor', 'timers'],
      guide: [
        'When you are hospitalized, use the Hospital tools tab to track your remaining time and create exit alerts.',
        'Alert buttons only create local helper timers. They do not use items, request revives, or click hospital actions.',
        'Use timers to watch hosp exits for manual attacks or revives.',
        'Notifications are advice only; this helper never attacks, revives, or clicks.',
        'Keep labels short: player name, reason, and exit time.'
      ]
    },
    jail: {
      key: 'jail',
      title: "TORN'z Jail Helper",
      short: 'Jail',
      tabs: ['timers', 'guide'],
      keywords: ['jail'],
      pathPatterns: [/jail/i],
      tools: ['timers'],
      guide: [
        'Track bust/bail targets manually with timer cards.',
        'Use notes for success chance, target level, or faction relevance.',
        'The helper does not bust, bail, or click actions.'
      ]
    },
    education: {
      key: 'education',
      title: "TORN'z Education Helper",
      short: 'Education',
      tabs: ['tools', 'guide'],
      keywords: ['education', 'course'],
      pathPatterns: [/education/i],
      tools: ['educationPlanner', 'addictionAdvisor'],
      guide: [
        'Pick courses based on permanent unlocks, gym/travel/company goals, and time-to-benefit.',
        'Manual bonus percentage can model education merits, job specials, or other reductions.',
        'Use the planner to compare remaining time and opportunity cost.'
      ]
    },
    addiction: {
      key: 'addiction',
      title: "TORN'z Addiction Advisor",
      short: 'Addiction',
      tabs: ['tools', 'guide'],
      keywords: ['rehab', 'addiction', 'brain debuff'],
      pathPatterns: [/rehab/i],
      tools: ['addictionAdvisor'],
      guide: [
        'Use this advisor to estimate education risk, rehab count, and natural decay timing from visible/API addiction data.',
        'Rehab estimates are planning numbers. Confirm your exact state and costs on Torn before rehabbing.',
        'This helper never travels, rehabs, uses drugs, or clicks account actions.'
      ]
    },
    faction: {
      key: 'faction',
      title: "TORN'z Faction Helper",
      short: 'Faction',
      tabs: ['war', 'targets', 'chains', 'factionChains', 'finder', 'lists', 'overview', 'timers', 'guide', 'links'],
      keywords: ['faction', 'war', 'chain'],
      pathPatterns: [/faction/i],
      tools: ['targetBoard', 'timers'],
      guide: [
        'Use target timers for hosp exits, chain windows, retal notes, or faction watch targets.',
        'Favorite players/factions locally with notes. API expansion can later enrich status where permissions allow.',
        'Notifications are optional and manual. The helper never attacks or clicks.'
      ]
    },
    log: {
      key: 'log',
      title: "TORN'z Log Helper",
      short: 'Log',
      tabs: ['war', 'targets', 'finder', 'lists', 'overview', 'timers', 'links'],
      keywords: ['log'],
      pathPatterns: [/sid=log/i, /\/page\.php\?sid=log/i],
      tools: ['targetBoard', 'timers'],
      guide: []
    },
    events: {
      key: 'events',
      title: "TORN'z Events Helper",
      short: 'Events',
      tabs: ['war', 'targets', 'finder', 'lists', 'overview', 'timers', 'links'],
      keywords: ['events'],
      pathPatterns: [/sid=events/i, /\/page\.php\?sid=events/i],
      tools: ['targetBoard', 'timers'],
      guide: []
    }
  };

