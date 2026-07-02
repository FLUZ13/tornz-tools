// ==UserScript==
// @name         TORN'z Tools
// @namespace    https://www.torn.com/profiles.php?XID=4325064
// @version      0.12.11
// @description  Read-only TORN'z/FLUZ helper for Torn: stocks, gym builds, market calculators, travel/profit planners, timers, and gameplay guides.
// @author       FLUZ
// @match        https://www.torn.com/*
// @match        https://torn.com/*
// @include      https://www.torn.com/page.php*
// @include      https://torn.com/page.php*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @grant        GM_registerMenuCommand
// @grant        unsafeWindow
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.registerMenuCommand
// @connect      api.torn.com
// @connect      www.torn.com
// @connect      torn.com
// @connect      tornsy.com
// @connect      docs.google.com
// @connect      gitlab.com
// @connect      weav3r.dev
// @connect      yata.yt
// @connect      ffscouter.com
// @run-at       document-start
// ==/UserScript==
/*
  TORN'z Tools
  Made by FLUZ - https://www.torn.com/profiles.php?XID=4325064

  Safety promise:
  - Share build: no API key or local Tampermonkey data is included in this file.
  - Read-only advice only.
  - No automatic buying, selling, trading, clicking, or account actions.
  - API key is stored locally by the userscript manager.
  - Torn API key is only sent to https://api.torn.com, except the optional
    FFScouter integration which can send the same locally saved key only to
    https://ffscouter.com after the user enables it and presses an action.
*/

(function fluzTornTools() {
  'use strict';

  console.info("[TORN'z Tools] userscript started v0.12.11", window.location.href);

  // ---------------------------------------------------------------------------
  // Constants/config
  // ---------------------------------------------------------------------------

  const APP = {
    id: 'tornz-tools',
    name: "TORN'z Tools",
    stockName: "TORN'z Stock Tool",
    gymName: "TORN'z Gym Tool",
    utilityName: "TORN'z Tools",
    version: '0.12.11',
    profileUrl: 'https://www.torn.com/profiles.php?XID=4325064',
    authorLabel: 'FLUZ [4325064]',
    apiBaseUrl: 'https://api.torn.com',
    tornsyBaseUrl: 'https://tornsy.com/api',
    ffscouterBaseUrl: 'https://ffscouter.com/api/v1',
    apiCacheTtlMs: 60 * 1000,
    itemDbCacheTtlMs: 60 * 60 * 1000,
    tornsyCacheTtlMs: 10 * 60 * 1000,
    notificationCooldownMs: 10 * 60 * 1000,
    sellFeePct: 0.1,
    partialBenefitMinPct: 5,
    partialHighTierMinPct: 1
  };
  const MARKET_DATABASE_PAGE_SIZE = 150;
  const LOCAL_ITEM_RECORDS = [
    { id: 'local-coin-purse', name: 'Coin Purse', category: 'Collectible', value: 0 }
  ];

  const STORAGE = {
    apiKey: 'tornz.apiKey',
    settings: 'tornz.settings',
    cachePrefix: 'tornz.cache.',
    tornsyCache: 'tornz.cache.tornsy',
    priceMemory: 'tornz.priceMemory',
    notificationHistory: 'tornz.notificationHistory',
    panelState: 'tornz.panelState',
    gymState: 'tornz.gymState',
    utilityState: 'tornz.utilityState',
    crimeMorale: 'tornz.crimeMorale',
    marketBazaarScanCache: 'tornz.cache.marketBazaarScan'
  };

  const CRIME_PROFIT = {
    allUrl: 'https://docs.google.com/spreadsheets/d/13wUFhhssuPdAONI_OmRJi6l_Bs7KRZXDgVFCn7uJJNQ/gviz/tq?tqx=out:csv&gid=560321570',
    crackingUrl: 'https://docs.google.com/spreadsheets/d/13wUFhhssuPdAONI_OmRJi6l_Bs7KRZXDgVFCn7uJJNQ/gviz/tq?tqx=out:csv&gid=1626436424',
    cacheKey: 'tornz.cache.crimeProfitability',
    cacheTtlMs: 24 * 60 * 60 * 1000,
    threshold: 0
  };

  const ITEM_MARKET_BAZAAR = {
    endpoint: 'https://weav3r.dev/api/marketplace/',
    cacheTtlMs: 60 * 1000,
    maxRows: 12,
    autoBatchSize: 1,
    autoDelayMs: 220,
    autoRenderThrottleMs: 9000,
    scanCacheTtlMs: 60 * 60 * 1000,
    scanCacheWriteThrottleMs: 15000
  };

  const DEFAULT_SETTINGS = {
    investorProfile: 'long',
    strategyMode: 'dividends',
    strategyCombo: 'benefit_stack',
    riskLevel: 45,
    ignoreBenefits: false,
    enableLocalMemory: true,
    stockHighlightOnlyMode: true,
    bankBonusPct: 0,
    lockedStocks: [],
    enableTornsy: true,
    notifications: {
      enabled: false,
      buy: true,
      sell: true,
      claim: true,
      topup: true,
      rebalance: true,
      minPriority: 75,
      cooldownMinutes: 10
    }
  };

  const DEFAULT_PANEL_STATE = {
    activeTab: 'signals',
    collapsed: false,
    x: null,
    y: null,
    height: null,
    modalHeight: null
  };

  const DEFAULT_UTILITY_STATE = {
    activeTab: 'tools',
    feeKey: 'itemMarket',
    bazaarFeeKey: 'bazaar',
    itemmarketFeeKey: 'itemMarket',
    basePrice: 100000,
    quantity: 1,
    percentChange: 1,
    buyCost: 0,
    sellPrice: 0,
    nerveCost: 5,
    crimeReward: 10000,
    successRate: 90,
    travelBuyCost: 0,
    travelSellPrice: 0,
    travelMinutes: 120,
    travelCapacity: 19,
    travelDestination: 'custom',
    travelItemName: '',
    travelRiskCost: 0,
    travelCarry: 19,
    travelSpeedTier: 'standard',
    travelHasBook: false,
    travelIncludePlushies: true,
    travelIncludeFlowers: true,
    travelIncludePrehistoric: true,
    travelIncludeSpecial: true,
    travelIncludeDrugs: false,
    travelTourismDay: false,
    travelMuseumDay: false,
    travelPointsPrice: 0,
    travelOwnedItems: {},
    missionTokenValue: 0,
    missionRewardCost: 0,
    missionRewardMarket: 0,
    missionRewardTokens: 1,
    missionItemName: '',
    propertyCost: 0,
    rentPerDay: 0,
    upkeepPerDay: 0,
    courseDays: 7,
    educationBonusPct: 0,
    jobPay: 0,
    perkValue: 0,
    racingTrack: 'custom',
    racingSearch: '',
    racingSurface: 'T',
    racingRatio: 'S',
    racingTurbo: '3',
    inventoryItemValue: 0,
    inventoryQuantity: 1,
    casinoStake: 100000,
    casinoOdds: 2,
    casinoWinPct: 50,
    casinoBankroll: 1000000,
    casinoPokerRisk: 50,
    bankPlanAmount: 0,
    bankReserveCash: 0,
    bountyMaxLevel: 0,
    bountyMinReward: 0,
    bountySearch: '',
    bountyHideUnavailable: true,
    bountyHideNonMatches: false,
    meritRouteStyle: 'balanced',
    meritFreePoints: 0,
    meritLevels: {},
    missionHintSearch: '',
    mugTargetXid: '',
    pickpocketMinCs: 100,
    pickpocketMaxCs: 300,
    crackingMaxSuggestions: 8,
    crackingShowComplete: true,
    addictionEduRiskPct: 8,
    addictionRehabTargetPct: 4,
    addictionLearnedDropPct: 0,
    addictionManualRehabsDone: 0,
    addictionXanaxAp: 9.75,
    addictionNaturalDecayAp: 21,
    addictionCompanyPenalty: 0,
    addictionHotTurkeyDays: 31,
    addictionHotTurkeyOds: 3,
    addictionMilkSoberRate: 95,
    addictionHistory: [],
    marketBazaarSortKey: 'price',
    marketBazaarSortDir: 'asc',
    marketBazaarMinQty: 1,
    marketBazaarMinDiffPct: 0,
    marketBazaarMaxAgeMinutes: 0,
    marketAllSearch: '',
    marketSettingsSearch: '',
    marketAllMinValue: 0,
    marketAllMinProfitEach: 0,
    marketAllMinTotalProfit: 0,
    marketAllSortKey: 'name',
    marketAllSortDir: 'asc',
    marketSettingsPage: 1,
    marketNativeMaxSeenMinutes: 0,
    marketNativeSortKey: 'profit',
    marketNativeSortDir: 'desc',
    marketHighlightEnabled: true,
    marketHighlightThresholdPct: -0.5,
    marketHiddenItemIds: [],
    marketValueLimitMax: 0,
    marketValueHiddenItemIds: [],
    marketFilterPresetName: '',
    marketFilterPresetId: '',
    marketFilterPresets: [],
    marketVisitedBazaarLinks: {},
    marketBazaarMarkSellerVisited: true,
    marketBazaarAllSortKey: 'totalProfit',
    marketBazaarAllSortDir: 'desc',
    marketBazaarAllBatchSize: 20,
    marketBazaarAutoScan: true,
    marketBazaarScanPaused: false,
    targetSoundAlerts: true,
    targetDesktopAlerts: true,
    timerAlertVolume: 55,
    timerAlertTone: 'standard',
    bookieSports: {
      football: true,
      basketball: true,
      baseball: true,
      handball: true,
      rugby: true
    },
    inventorySortKey: 'total',
    inventorySortDir: 'desc',
    ignoredItems: [],
    itemProfitPcts: {},
    citySortKey: 'profit',
    citySortDir: 'desc',
    targetInput: '',
    targetNote: '',
    factionInput: '',
    factionNote: '',
    targetImportJson: '',
    targetAddOpen: false,
    factionAddOpen: false,
    targetImportOpen: false,
    targetSearch: '',
    targetFilter: 'all',
    targetNoteFilter: '',
    targetNoteFilters: [],
    targetNoteFilterOpen: false,
    targetTreeOpen: {},
    targetOnlyStarred: false,
    targetOnlyLocked: false,
    targetShowHidden: false,
    targetHideChain: false,
    targetSortKey: 'mark',
    targetSortDir: 'desc',
    chainSearch: '',
    chainFilter: '',
    chainSortKey: 'ff',
    chainSortDir: 'asc',
    chainAlarmEnabled: true,
    chainMessageEnabled: true,
    chainMessageAlertEnabled: true,
    chainTargetAlertEnabled: true,
    chainWarningAlertEnabled: true,
    chainShuffle: false,
    chainMessageAlertAt: '4:50',
    chainTargetAlertAt: '2:20',
    chainWarningAlertAt: '0:30',
    chainEnergy: 0,
    chainAttackCost: 25,
    chainEnergyAuto: true,
    chainFriendlyInput: '',
    chainFriendlyEnergy: 0,
    chainFriendlyNote: '',
    chainFriendlyCursor: 0,
    chainGeneratedMessage: '',
    chainGeneratedMemberId: '',
    chainGeneratedAt: 0,
    chainFriendlyMembers: [],
    chainMessageLog: [],
    targets: [],
    ffscouterEnabled: false,
    ffscouterPreset: 'level',
    ffscouterMinLevel: 1,
    ffscouterMaxLevel: 100,
    ffscouterMinFf: 1,
    ffscouterMaxFf: 3,
    ffscouterLimit: 20,
    ffscouterInactiveOnly: true,
    ffscouterFactionless: false,
    ffscouterExcludeSaved: false,
    ffscouterRequireStats: false,
    ffscouterMaxLastActionDays: 0,
    ffscouterSortKey: 'ff',
    ffscouterListTag: '',
    ffscouterImportText: '',
    ffscouterListName: '',
    activeTargetListId: '',
    targetListSortKey: 'ff',
    targetListSortDir: 'asc',
    targetLists: [],
    timers: []
  };
  const INVESTOR_PROFILES = {
    day: {
      key: 'day',
      label: 'Day Trader',
      description: 'Fast P/L decisions, dip buying, and quicker loss cuts.',
      sellProfitPct: 0.8,
      sellLossPct: -2,
      checkLossPct: -1,
      keepLossFloorPct: -3,
      rsiPeriod: 14,
      buyDip: true,
      buyDipBoost: 12,
      sellSoon: true,
      sellSoonBoost: 10,
      rebalance: true,
      rebalanceBoost: -5,
      benefitFocusBoost: -5
    },
    active: {
      key: 'active',
      label: 'Active Investor',
      description: 'Balanced benefit ROI, momentum, and portfolio P/L.',
      sellProfitPct: 2,
      sellLossPct: -5,
      checkLossPct: -3,
      keepLossFloorPct: -7,
      rsiPeriod: 72,
      buyDip: true,
      buyDipBoost: 0,
      sellSoon: true,
      sellSoonBoost: 0,
      rebalance: true,
      rebalanceBoost: 0,
      benefitFocusBoost: 0
    },
    long: {
      key: 'long',
      label: 'Long-Term Investor',
      description: 'Benefit-first, slower selling, less short-term noise.',
      sellProfitPct: 4,
      sellLossPct: -10,
      checkLossPct: -7,
      keepLossFloorPct: -12,
      rsiPeriod: 168,
      buyDip: false,
      buyDipBoost: 0,
      sellSoon: true,
      sellSoonBoost: -5,
      rebalance: true,
      rebalanceBoost: 10,
      benefitFocusBoost: 12
    }
  };

  const STRATEGY_METHODS = {
    balanced: {
      key: 'balanced',
      label: 'Balanced Money',
      description: 'Uses benefits, P/L, dips, trend, and bank comparison together.',
      benefitWeight: 1,
      technicalWeight: 1,
      profitTargetBoost: 0,
      lossCutBoost: 0,
      buyDipMinMomentum: 1.5,
      allowBenefitAdvice: true
    },
    trader: {
      key: 'trader',
      label: 'Buy/Sell Trader',
      description: 'Mostly ignores dividends and looks for price movement, profit-taking, and bad exits.',
      benefitWeight: 0,
      technicalWeight: 1.35,
      profitTargetBoost: 8,
      lossCutBoost: 10,
      buyDipMinMomentum: 1.0,
      allowBenefitAdvice: false
    },
    swing: {
      key: 'swing',
      label: 'Swing Trader',
      description: 'Looks for oversold recoveries and sells when profit meets weak momentum.',
      benefitWeight: 0.2,
      technicalWeight: 1.5,
      profitTargetBoost: 5,
      lossCutBoost: 6,
      buyDipMinMomentum: 1.0,
      allowBenefitAdvice: false
    },
    dividends: {
      key: 'dividends',
      label: 'Dividend Hunter',
      description: 'Strongly favors benefit blocks, claim-ready payouts, top-ups, and ROI vs bank.',
      benefitWeight: 1.6,
      technicalWeight: 0.65,
      profitTargetBoost: -8,
      lossCutBoost: -4,
      buyDipMinMomentum: 1.8,
      allowBenefitAdvice: true
    },
    defensive: {
      key: 'defensive',
      label: 'Defensive Cash',
      description: 'Avoids weak trends, cuts losses earlier, and treats bank APR as a serious alternative.',
      benefitWeight: 0.8,
      technicalWeight: 0.85,
      profitTargetBoost: 3,
      lossCutBoost: 12,
      buyDipMinMomentum: 1.7,
      allowBenefitAdvice: true
    }
  };

  const STRATEGY_COMBOS = {
    safe_builder: {
      key: 'safe_builder',
      label: 'Safe Builder',
      color: 'green',
      risk: 20,
      strategyMode: 'defensive',
      investorProfile: 'long',
      ignoreBenefits: false,
      description: 'Low-action mode for cash safety, bank comparison, and careful block building.',
      rhythm: 'Check once per day or when a strong alert appears.'
    },
    daily_swing: {
      key: 'daily_swing',
      label: 'Daily Swing',
      color: 'yellow',
      risk: 55,
      strategyMode: 'swing',
      investorProfile: 'day',
      ignoreBenefits: true,
      description: 'Practical default for dips, recovering momentum, and a few meaningful manual checks per day.',
      rhythm: 'Check 1-3 times per day; more if you are actively watching prices.'
    },
    benefit_stack: {
      key: 'benefit_stack',
      label: 'Benefit Stack',
      color: 'blue',
      risk: 45,
      strategyMode: 'dividends',
      investorProfile: 'long',
      ignoreBenefits: false,
      description: 'Focuses on claim-ready payouts, top-ups, high-value blocks, and ROI versus bank.',
      rhythm: 'Check a few times per week plus whenever CLAIM/TOP UP triggers.'
    },
    profit_flip: {
      key: 'profit_flip',
      label: 'Profit Flip',
      color: 'orange',
      risk: 75,
      strategyMode: 'trader',
      investorProfile: 'day',
      ignoreBenefits: true,
      description: 'Fastest buy/sell style. Uses net profit after the 0.1% sell fee and cuts weak trades faster.',
      rhythm: 'Check every 15-60 minutes while active. Not a passive mode.'
    },
    redline: {
      key: 'redline',
      label: 'Redline Trader',
      color: 'red',
      risk: 92,
      strategyMode: 'trader',
      investorProfile: 'day',
      ignoreBenefits: true,
      description: 'Most aggressive preset. It expects frequent manual decisions and tight attention.',
      rhythm: 'Only use when you are online and ready to react manually.'
    }
  };

  const ACTION_META = {
    CLAIM: { group: 'claim', className: 'claim' },
    KEEP: { group: 'hold', className: 'keep' },
    SELL: { group: 'sell', className: 'sell' },
    'SELL EXTRA': { group: 'sell', className: 'sell' },
    'SELL SOON': { group: 'sell', className: 'caution' },
    'SELL NOW': { group: 'sell', className: 'danger' },
    CHECK: { group: 'sell', className: 'caution' },
    HOLD: { group: 'hold', className: 'keep' },
    BUY: { group: 'buy', className: 'buy' },
    'BUY MORE': { group: 'buy', className: 'buy' },
    'MAYBE BUY': { group: 'buy', className: 'maybe' },
    'BUY DIP': { group: 'buy', className: 'dip' },
    'BEST BUY': { group: 'buy', className: 'buy' },
    'TOP UP': { group: 'topup', className: 'topup' },
    WAIT: { group: 'hold', className: 'wait' },
    DECIDE: { group: 'hold', className: 'caution' },
    'SAVE TOWARD': { group: 'buy', className: 'wait' },
    REBALANCE: { group: 'rebalance', className: 'rebalance' },
    WATCH: { group: 'hold', className: 'watch' }
  };

  const BANK_TERMS = [
    { days: 7, label: '1w' },
    { days: 14, label: '2w' },
    { days: 31, label: '1m' },
    { days: 62, label: '2m' },
    { days: 93, label: '3m' }
  ];

  const BENEFIT_DATABASE = {
    TCSE: { name: 'TCSE', annualValue: 0, note: 'No direct benefit tracked yet.' },
    TCI: { name: 'Torn City Investments', annualValue: 0, note: 'No direct benefit tracked yet.' },
    SYS: { name: 'Syscore MFG', annualValue: 0, note: 'Company productivity style benefit.', tier: 'B' },
    LAG: { name: 'Legal Authorities', annualValue: 0, note: 'Legal perk benefit.', tier: 'B' },
    IOU: { name: 'Insured On Us', annualValue: 0, note: 'Insurance style benefit.', tier: 'B' },
    GRN: { name: 'Grain', annualValue: 0, note: 'Food style benefit.', tier: 'B' },
    TCHS: { name: 'Torn City Health Service', annualValue: 0, note: 'Medical recovery style benefit.', tier: 'B' },
    YAZ: { name: 'Yazoo', annualValue: 0, note: 'Drug effect style benefit.', tier: 'B' },
    TCT: { name: 'Torn City Times', annualValue: 11774193, note: 'Estimated cash payout around $1m every 31 days.' },
    CNC: { name: 'Crude & Co', annualValue: 0, note: 'Energy refill style benefit.', tier: 'B' },
    MSG: { name: 'Messaging Inc.', annualValue: 0, note: 'Messaging perk benefit.', tier: 'C' },
    TMI: { name: 'TC Music Industries', annualValue: 0, note: 'Music perk benefit.', tier: 'C' },
    TCP: { name: 'TC Media Productions', annualValue: 0, note: 'Media perk benefit.', tier: 'C' },
    IIL: { name: 'I Industries Ltd.', annualValue: 0, note: 'Industry perk benefit.', tier: 'C' },
    FHG: { name: 'Feathery Hotels Group', annualValue: 52000000, note: 'Estimated weekly hotel coupon value.' },
    SYM: { name: 'Symbiotic Ltd.', annualValue: 100000000, note: 'Estimated weekly drug pack value.' },
    LSC: { name: 'Lucky Shots Casino', annualValue: 0, note: 'Lottery voucher style benefit.', tier: 'C' },
    PRN: { name: 'Performance Ribaldry', annualValue: 0, note: 'Adult entertainment perk benefit.', tier: 'C' },
    EWM: { name: 'Eaglewood Mercenary', annualValue: 0, note: 'Mercenary perk benefit.', tier: 'C' },
    TCB: { name: 'Torn City Banking', annualValue: 0, note: '+10% bank interest style benefit.', tier: 'S' },
    MUN: { name: 'Munster Beverage Corp.', annualValue: 70000000, note: 'Estimated weekly energy drink value.' },
    WSU: { name: 'West Side University', annualValue: 0, note: 'Education speed style benefit.', tier: 'S' },
    IST: { name: 'International School TC', annualValue: 0, note: 'Education perk benefit.', tier: 'B' },
    BAG: { name: 'Big Als Gun Shop', annualValue: 0, note: 'Gun shop perk benefit.', tier: 'C' },
    EVL: { name: 'Evil Ducks Candy Corp', annualValue: 0, note: 'Candy perk benefit.', tier: 'C' },
    MCS: { name: 'Mc Smoogle Corp', annualValue: 0, note: 'Food perk benefit.', tier: 'C' },
    WLT: { name: 'Wind Lines Travel', annualValue: 0, note: 'Travel perk benefit.', tier: 'A' },
    TNG: { name: 'TC National Gas', annualValue: 0, note: 'Gas perk benefit.', tier: 'C' },
    TNE: { name: 'TC National Electric', annualValue: 0, note: 'Electric perk benefit.', tier: 'C' },
    HRG: { name: 'Home Retail Group', annualValue: 200000000, note: 'Estimated weekly property reward value.' },
    TGP: { name: 'Tell Group Plc.', annualValue: 0, note: 'Phone perk benefit.', tier: 'C' },
    ASS: { name: 'Alcoholics Synonymous', annualValue: 45170684, note: 'Estimated weekly alcohol pack value.' },
    PTS: { name: 'PointLess', annualValue: 500000000, note: 'Estimated weekly points value.' }
  };

  const GYM_STATS = ['strength', 'defense', 'speed', 'dexterity'];

  const DEFAULT_GYM_STATE = {
    activeTab: 'train',
    buildKey: 'balanced',
    customBuildName: 'Custom',
    target: { strength: 25, defense: 25, speed: 25, dexterity: 25 },
    manualStats: { strength: 0, defense: 0, speed: 0, dexterity: 0 },
    customBuilds: [],
    availableGyms: [],
    selectedGym: "George's"
  };

  const GYM_BUILDS = {
    balanced: { key: 'balanced', label: 'Balanced', target: { strength: 25, defense: 25, speed: 25, dexterity: 25 }, note: 'Even growth. Simple and safe for early accounts.' },
    dex: { key: 'dex', label: 'Dex Build', target: { strength: 20, defense: 10, speed: 20, dexterity: 50 }, note: 'Dexterity-heavy build: 20% STR, 10% DEF, 20% SPD, 50% DEX.' },
    defense: { key: 'defense', label: 'Defense Tank', target: { strength: 15, defense: 60, speed: 10, dexterity: 15 }, note: 'Defense-heavy. Pairs well with Defense specialist gyms later.' },
    striker: { key: 'striker', label: 'Striker', target: { strength: 45, defense: 10, speed: 35, dexterity: 10 }, note: 'Attack-first build: strength and speed take priority.' },
    speed: { key: 'speed', label: 'Speed Control', target: { strength: 20, defense: 15, speed: 45, dexterity: 20 }, note: 'Speed-focused build for hit chance and tempo.' }
  };

  const GYM_DATABASE = [
    { name: 'Premier Fitness', tier: 'Light', energy: 5, cost: 10, gains: { strength: 2.0, speed: 2.0, defense: 2.0, dexterity: 2.0 } },
    { name: 'Average Joes', tier: 'Light', energy: 5, cost: 100, gains: { strength: 2.4, speed: 2.4, defense: 2.8, dexterity: 2.4 } },
    { name: "Woody's Workout", tier: 'Light', energy: 5, cost: 250, gains: { strength: 2.8, speed: 3.2, defense: 3.0, dexterity: 2.8 } },
    { name: 'Beach Bods', tier: 'Light', energy: 5, cost: 500, gains: { strength: 3.2, speed: 3.2, defense: 3.2, dexterity: 0 } },
    { name: 'Silver Gym', tier: 'Light', energy: 5, cost: 1000, gains: { strength: 3.4, speed: 3.6, defense: 3.4, dexterity: 3.2 } },
    { name: 'Pour Femme', tier: 'Light', energy: 5, cost: 2500, gains: { strength: 3.4, speed: 3.6, defense: 3.6, dexterity: 3.8 } },
    { name: 'Davies Den', tier: 'Light', energy: 5, cost: 5000, gains: { strength: 3.7, speed: 0, defense: 3.7, dexterity: 3.7 } },
    { name: 'Global Gym', tier: 'Light', energy: 5, cost: 10000, gains: { strength: 4.0, speed: 4.0, defense: 4.0, dexterity: 4.0 } },
    { name: 'Knuckle Heads', tier: 'Middle', energy: 10, cost: 50000, gains: { strength: 4.8, speed: 4.4, defense: 4.0, dexterity: 4.2 } },
    { name: 'Pioneer Fitness', tier: 'Middle', energy: 10, cost: 100000, gains: { strength: 4.4, speed: 4.5, defense: 4.8, dexterity: 4.4 } },
    { name: 'Anabolic Anomalies', tier: 'Middle', energy: 10, cost: 250000, gains: { strength: 5.0, speed: 4.5, defense: 5.2, dexterity: 4.5 } },
    { name: 'Core', tier: 'Middle', energy: 10, cost: 500000, gains: { strength: 5.0, speed: 5.2, defense: 5.0, dexterity: 5.0 } },
    { name: 'Racing Fitness', tier: 'Middle', energy: 10, cost: 1000000, gains: { strength: 5.0, speed: 5.4, defense: 4.8, dexterity: 5.2 } },
    { name: 'Complete Cardio', tier: 'Middle', energy: 10, cost: 2000000, gains: { strength: 5.5, speed: 5.8, defense: 5.5, dexterity: 5.2 } },
    { name: 'Legs, Bums and Tums', tier: 'Middle', energy: 10, cost: 3000000, gains: { strength: 0, speed: 5.6, defense: 5.6, dexterity: 5.8 } },
    { name: 'Deep Burn', tier: 'Middle', energy: 10, cost: 5000000, gains: { strength: 6.0, speed: 6.0, defense: 6.0, dexterity: 6.0 } },
    { name: 'Apollo Gym', tier: 'Heavy', energy: 10, cost: 7500000, gains: { strength: 6.0, speed: 6.2, defense: 6.4, dexterity: 6.2 } },
    { name: 'Gun Shop', tier: 'Heavy', energy: 10, cost: 10000000, gains: { strength: 6.6, speed: 6.4, defense: 6.2, dexterity: 6.2 } },
    { name: 'Force Training', tier: 'Heavy', energy: 10, cost: 15000000, gains: { strength: 6.4, speed: 6.6, defense: 6.4, dexterity: 6.8 } },
    { name: "Cha Cha's", tier: 'Heavy', energy: 10, cost: 20000000, gains: { strength: 6.4, speed: 6.4, defense: 6.8, dexterity: 7.0 } },
    { name: 'Atlas', tier: 'Heavy', energy: 10, cost: 30000000, gains: { strength: 7.0, speed: 6.4, defense: 6.4, dexterity: 6.6 } },
    { name: 'Last Round', tier: 'Heavy', energy: 10, cost: 50000000, gains: { strength: 6.8, speed: 6.6, defense: 7.0, dexterity: 6.6 } },
    { name: 'The Edge', tier: 'Heavy', energy: 10, cost: 75000000, gains: { strength: 6.8, speed: 7.0, defense: 7.0, dexterity: 6.8 } },
    { name: "George's", tier: 'Heavy', energy: 10, cost: 100000000, gains: { strength: 7.3, speed: 7.3, defense: 7.3, dexterity: 7.3 } },
    { name: 'Balboas Gym', tier: 'Specialist', energy: 25, cost: 50000000, gains: { strength: 0, speed: 0, defense: 7.5, dexterity: 7.5 }, note: 'Defense + Dexterity specialist.' },
    { name: 'Frontline Fitness', tier: 'Specialist', energy: 25, cost: 50000000, gains: { strength: 7.5, speed: 7.5, defense: 0, dexterity: 0 }, note: 'Strength + Speed specialist.' },
    { name: 'Gym 3000', tier: 'Specialist', energy: 50, cost: 100000000, gains: { strength: 8.0, speed: 0, defense: 0, dexterity: 0 }, note: 'Strength specialist.' },
    { name: 'Mr. Isoyamas', tier: 'Specialist', energy: 50, cost: 100000000, gains: { strength: 0, speed: 0, defense: 8.0, dexterity: 0 }, note: 'Defense specialist.' },
    { name: 'Total Rebound', tier: 'Specialist', energy: 50, cost: 100000000, gains: { strength: 0, speed: 8.0, defense: 0, dexterity: 0 }, note: 'Speed specialist.' },
    { name: 'Elites', tier: 'Specialist', energy: 50, cost: 100000000, gains: { strength: 0, speed: 0, defense: 0, dexterity: 8.0 }, note: 'Dexterity specialist.' },
    { name: 'The Sports Science Lab', tier: 'Specialist', energy: 25, cost: 500000000, gains: { strength: 9.0, speed: 9.0, defense: 9.0, dexterity: 9.0 }, note: 'Low Xanax/Ecstasy requirement.' },
    { name: 'Fight Club', tier: 'Specialist', energy: 10, cost: 2147483647, gains: { strength: 10.0, speed: 10.0, defense: 10.0, dexterity: 10.0 }, note: 'Invite only.' }
  ];

  const GYM_BOOST_ITEMS = [
    { category: 'Energy drugs', name: 'Xanax', type: 'Energy', effect: '+250 energy, but adds drug cooldown and addiction risk.' },
    { category: 'Happy drugs', name: 'Ecstasy', type: 'Happy', effect: 'Doubles happy, often used for happy jumps. Risk and cooldown apply.' },
    { category: 'Alcohol', name: 'Beer', type: 'Small happy', effect: 'Cheap small happy source. Mostly early-game or filler.' },
    { category: 'Alcohol', name: 'Bottle of Beer', type: 'Small happy', effect: 'Alternative alcohol item; compare price before using.' },
    { category: 'Candy', name: 'Lollipop', type: 'Candy', effect: 'Small happy gain. Low cost, low impact.' },
    { category: 'Candy', name: 'Bag of Bon Bons', type: 'Candy', effect: 'Candy happy source; useful when cheap.' },
    { category: 'Candy', name: 'Bag of Chocolate Truffles', type: 'Candy', effect: 'Candy happy source; compare value per happy.' },
    { category: 'Candy', name: 'Box of Chocolate Bars', type: 'Candy', effect: 'Higher happy candy option.' },
    { category: 'Large happy', name: 'Erotic DVD', type: 'Happy', effect: 'Large happy boost, commonly used in happy jump planning.' },
    { category: 'Large happy', name: 'Feathery Hotel Coupon', type: 'Happy', effect: 'Hotel stay style happy boost item.' },
    { category: 'Energy drinks', name: 'Can of Munster', type: 'Energy', effect: 'Energy drink. Compare market price before training plans.' },
    { category: 'Energy drinks', name: 'Can of Red Cow', type: 'Energy', effect: 'Energy drink. Compare market price before training plans.' },
    { category: 'Energy drinks', name: 'Can of Taurine Elite', type: 'Energy', effect: 'Energy drink. Compare market price before training plans.' },
    { category: 'Energy drinks', name: 'Can of Rockstar Rudolph', type: 'Energy', effect: 'Energy drink. Compare market price before training plans.' },
    { category: 'Energy drinks', name: 'Can of X-MASS', type: 'Energy', effect: 'Energy drink. Compare market price before training plans.' }
  ];

  const BOOTLEGGING_GENRES = [
    { id: '1', name: 'Action' },
    { id: '2', name: 'Comedy' },
    { id: '3', name: 'Drama' },
    { id: '4', name: 'Fantasy' },
    { id: '5', name: 'Horror' },
    { id: '6', name: 'Romance' },
    { id: '7', name: 'Thriller' },
    { id: '8', name: 'Sci-Fi' }
  ];

  // Pickpocket coloring values are based on the user-provided Pickpocket J.A.R.V.I.S. reference by Terekhov.
  const PICKPOCKET_COLORS = {
    ideal: '#40AB24',
    easy: '#82C370',
    tooEasy: '#A4D497',
    tooHard: '#fa8e8e',
    uncategorized: '#DA85FF'
  };

  const PICKPOCKET_MARK_CS_LEVELS = {
    'Drunk man': 100,
    'Drunk woman': 100,
    'Elderly man': 100,
    'Elderly woman': 100,
    'Homeless person': 100,
    Junkie: 100,
    'Classy lady': 150,
    Laborer: 150,
    'Postal worker': 150,
    'Young man': 150,
    'Young woman': 150,
    Student: 150,
    'Rich kid': 200,
    'Sex worker': 200,
    Thug: 200,
    Businessman: 250,
    Businesswoman: 250,
    Jogger: 250,
    'Gang member': 250,
    Mobster: 250,
    Cyclist: 300,
    'Police officer': 350
  };

  const PICKPOCKET_SKILL_CATS = ['Safe', 'Moderately Unsafe', 'Unsafe', 'Risky', 'Dangerous', 'Very Dangerous'];
  const PICKPOCKET_SKILL_STARTS = [1, 10, 35, 65, 90, 100];
  const PICKPOCKET_MARK_GROUPS = {
    Safe: ['Drunk man', 'Drunk woman', 'Homeless person', 'Junkie', 'Elderly man', 'Elderly woman'],
    'Moderately Unsafe': ['Laborer', 'Postal worker', 'Young man', 'Young woman', 'Student'],
    Unsafe: ['Classy lady', 'Rich kid', 'Sex worker'],
    Risky: ['Thug', 'Jogger', 'Businessman', 'Businesswoman', 'Gang member'],
    Dangerous: ['Cyclist'],
    'Very Dangerous': ['Mobster', 'Police officer']
  };

  const PICKPOCKET_BUILDS_TO_AVOID = {
    Businessman: ['Skinny'],
    'Drunk man': ['Muscular'],
    'Gang member': ['Muscular'],
    'Sex worker': ['Muscular'],
    Student: ['Athletic'],
    Thug: ['Muscular']
  };

  const PICKPOCKET_ACTIVITIES_TO_AVOID = {
    Businessman: ['Walking'],
    'Drunk man': ['Distracted'],
    'Drunk woman': ['Distracted'],
    'Homeless person': ['Loitering'],
    Junkie: ['Loitering'],
    Laborer: ['Distracted'],
    'Police officer': ['Walking'],
    'Sex worker': ['Distracted'],
    Thug: ['Loitering', 'Walking']
  };

  const CRACKING_HELPER = {
    dbName: 'tornz-cracking-helper',
    storeName: 'dictionary',
    minLength: 4,
    maxLength: 10,
    publicWordlistUrl: 'https://gitlab.com/kalilinux/packages/seclists/-/raw/kali/master/Passwords/Common-Credentials/Pwdb_top-1000000.txt?ref_type=heads',
    seedWords: [
      'PASSWORD', 'WELCOME', 'MONKEY', 'DRAGON', 'MASTER', 'SHADOW', 'QWERTY', 'LETMEIN',
      'TRUSTNO1', 'FOOTBALL', 'BASEBALL', 'SUNSHINE', 'ILOVEYOU', 'PRINCESS', 'ADMIN',
      'LOGIN', 'SECRET', 'ACCESS', 'SERVER', 'SYSTEM', 'NETWORK', 'SECURE', 'GATEWAY',
      'FREEDOM', 'HUNTER', 'KILLER', 'THUNDER', 'FALCON', 'MATRIX', 'PHOENIX', 'NINJA',
      'BATMAN', 'SUPERMAN', 'CHARLIE', 'JORDAN', 'MICHAEL', 'GEORGE', 'THOMAS', 'JESSICA',
      'DANIEL', 'ROBERT', 'TAYLOR', 'MARTIN', 'WINTER', 'SUMMER', 'SPRING', 'ORANGE',
      'PURPLE', 'YELLOW', 'SILVER', 'GOLDEN', 'COOKIE', 'COFFEE', 'BANANA', 'PIRATE',
      'CHEESE', 'FLOWER', 'ROCKET', 'HAMMER', 'RANGER', 'SPIDER', 'TIGER', 'WIZARD'
    ]
  };
  const crackingDictCache = {};
  const crackingPanelTimers = new Map();
  const crackingPrevRowStates = new Map();
  const crackingLastInput = { key: '', time: 0 };

  const CRIME_TYPE_IDS = {
    searchforcash: '1',
    bootlegging: '2',
    graffiti: '3',
    shoplifting: '4',
    pickpocketing: '5',
    cardskimming: '6',
    burglary: '7',
    hustling: '8',
    disposal: '9',
    cracking: '10',
    forgery: '11',
    scamming: '12',
    arson: '13'
  };

  const CRIME_ROUTE_LABELS = [
    ['searchforcash', 'Search for Cash', 'profit labels'],
    ['bootlegging', 'Bootlegging', 'DVD balance'],
    ['graffiti', 'Graffiti', 'guide'],
    ['shoplifting', 'Shoplifting', 'profit labels'],
    ['pickpocketing', 'Pickpocketing', 'difficulty colors'],
    ['cardskimming', 'Card Skimming', 'guide'],
    ['burglary', 'Burglary', 'profit labels'],
    ['hustling', 'Hustling', 'guide'],
    ['disposal', 'Disposal', 'guide'],
    ['cracking', 'Cracking', 'profit labels'],
    ['forgery', 'Forgery', 'guide'],
    ['scamming', 'Scamming', 'guide'],
    ['arson', 'Arson', 'guide']
  ];

  const MARKET_FEES = {
    retail: { label: 'Retail price', feePct: 0, note: 'Uses the visible RRP/retail value directly with no fee added. Useful for repricing against Torn retail value.' },
    bazaar: { label: 'Bazaar', feePct: 0, note: 'Bazaar sales do not charge the item market 5% sales fee.' },
    itemMarket: { label: 'Item Market', feePct: 5, note: 'Regular item market listings pay 5% sales tax at sale time.' },
    itemMarketAnon: { label: 'Anonymous Market', feePct: 10, note: 'Anonymous item market listings pay 10%, unless waived by specific company specials.' }
  };

  const CITY_STORE_ITEMS = [
    { store: "Bits 'n' Bobs", name: 'Bottle of Beer', cost: 10, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Bottle of Champagne', cost: 4500, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Box of Tissues', cost: 20, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Brick', cost: 5, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Bunch of Black Roses', cost: 500, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Bunch of Flowers', cost: 5, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Dozen Roses', cost: 300, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Fruitcake', cost: 30, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Gasoline', cost: 95, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Kitten Plushie', cost: 50, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Lead Pipe', cost: 150, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Pack of Cuban Cigars', cost: 400, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Sheep Plushie', cost: 25, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Single Red Rose', cost: 175, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Soap on a Rope', cost: 50, url: 'https://www.torn.com/city.php' },
    { store: "Bits 'n' Bobs", name: 'Teddy Bear Plushie', cost: 30, url: 'https://www.torn.com/city.php' },
    { store: "Sally's Sweet Shop", name: 'Box of Sweet Hearts', cost: 500, url: 'https://www.torn.com/city.php' },
    { store: "Sally's Sweet Shop", name: 'Bag of Chocolate Kisses', cost: 150, url: 'https://www.torn.com/city.php' },
    { store: "Sally's Sweet Shop", name: 'Lollipop', cost: 25, url: 'https://www.torn.com/city.php' }
  ];

  const TRAVEL_DESTINATIONS = [
    { key: 'custom', label: 'Custom route', focus: 'Manual prices', items: ['Best local stock', 'Plushies', 'Flowers'] },
    { key: 'switzerland', label: 'Switzerland', focus: 'Plushies / flowers / watches', items: ['Chamois Plushie', 'Edelweiss', 'Swiss Watch'] },
    { key: 'mexico', label: 'Mexico', focus: 'Plushies / flowers', items: ['Jaguar Plushie', 'Dahlia'] },
    { key: 'canada', label: 'Canada', focus: 'Plushies / flowers', items: ['Wolverine Plushie', 'Crocus'] },
    { key: 'uk', label: 'United Kingdom', focus: 'Plushies / flowers', items: ['Nessie Plushie', 'Heather'] },
    { key: 'cayman', label: 'Cayman Islands', focus: 'Flowers / plushies', items: ['Stingray Plushie', 'Banana Orchid'] },
    { key: 'argentina', label: 'Argentina', focus: 'Plushies / flowers', items: ['Monkey Plushie', 'Ceibo Flower'] },
    { key: 'japan', label: 'Japan', focus: 'Plushies / flowers', items: ['Cherry Blossom', 'Shogun Helmet'] },
    { key: 'china', label: 'China', focus: 'Plushies / flowers', items: ['Panda Plushie', 'Peony'] },
    { key: 'uae', label: 'UAE', focus: 'Flowers / luxury', items: ['Tribulus Omanense', 'Camel Plushie'] },
    { key: 'south-africa', label: 'South Africa', focus: 'Plushies / flowers', items: ['Lion Plushie', 'African Violet'] },
    { key: 'hawaii', label: 'Hawaii', focus: 'Flowers / plushies', items: ['Orchid', 'Hula Doll'] }
  ];

  const TRAVEL_SPEED_TIERS = [
    { key: 'standard', label: 'Standard', index: 0 },
    { key: 'airstrip', label: 'Airstrip', index: 1 },
    { key: 'wlt', label: 'WLT', index: 2 },
    { key: 'business', label: 'Business', index: 3 }
  ];

  const TRAVEL_TIMES = {
    noBook: {
      Mexico: [0.4333, 0.3, 0.2167, 0.1333],
      'Cayman Islands': [0.5833, 0.4167, 0.3, 0.1833],
      Canada: [0.6833, 0.4833, 0.3333, 0.2],
      Hawaii: [2.2333, 1.5667, 1.1167, 0.6667],
      'United Kingdom': [2.65, 1.85, 1.3333, 0.8],
      Argentina: [2.7833, 1.95, 1.3833, 0.8333],
      Switzerland: [2.9167, 2.05, 1.4667, 0.8833],
      Japan: [3.75, 2.6333, 1.8833, 1.1333],
      China: [4.0333, 2.8167, 2.0167, 1.2],
      UAE: [4.5167, 3.1667, 2.25, 1.35],
      'South Africa': [4.95, 3.4667, 2.4833, 1.4833]
    },
    book: {
      Mexico: [0.3167, 0.2333, 0.1667, 0.1],
      'Cayman Islands': [0.4333, 0.3, 0.2167, 0.1333],
      Canada: [0.5167, 0.3667, 0.25, 0.15],
      Hawaii: [1.6667, 1.1667, 0.8333, 0.5],
      'United Kingdom': [1.9833, 1.4, 1, 0.6],
      Argentina: [2.0833, 1.45, 1.0333, 0.6167],
      Switzerland: [2.2, 1.5333, 1.1, 0.65],
      Japan: [2.8167, 1.9667, 1.4, 0.85],
      China: [3.0167, 2.1167, 1.5167, 0.9],
      UAE: [3.3833, 2.3667, 1.7, 1.0167],
      'South Africa': [3.7167, 2.6, 1.8667, 1.1167]
    }
  };

  const YATA_CITY_CODES = {
    mex: 'Mexico',
    cay: 'Cayman Islands',
    can: 'Canada',
    haw: 'Hawaii',
    uni: 'United Kingdom',
    arg: 'Argentina',
    swi: 'Switzerland',
    jap: 'Japan',
    chi: 'China',
    uae: 'UAE',
    sou: 'South Africa'
  };

  const TRAVEL_ITEM_CATALOG = [
    { name: 'Sheep Plushie', id: 186, country: "Bits 'n' Bobs", type: 'Plushie' },
    { name: 'Teddy Bear Plushie', id: 187, country: "Bits 'n' Bobs", type: 'Plushie' },
    { name: 'Kitten Plushie', id: 215, country: "Bits 'n' Bobs", type: 'Plushie' },
    { name: 'Jaguar Plushie', id: 258, country: 'Mexico', type: 'Plushie' },
    { name: 'Dahlia', id: 260, country: 'Mexico', type: 'Flower' },
    { name: 'Obsidian Point', id: 624, country: 'Mexico', type: 'Prehistoric' },
    { name: 'Stingray Plushie', id: 618, country: 'Cayman Islands', type: 'Plushie' },
    { name: 'Banana Orchid', id: 617, country: 'Cayman Islands', type: 'Flower' },
    { name: 'Wolverine Plushie', id: 261, country: 'Canada', type: 'Plushie' },
    { name: 'Crocus', id: 263, country: 'Canada', type: 'Flower' },
    { name: 'Quartz Point', id: 619, country: 'Canada', type: 'Prehistoric' },
    { name: 'Orchid', id: 264, country: 'Hawaii', type: 'Flower' },
    { name: 'Basalt Point', id: 621, country: 'Hawaii', type: 'Prehistoric' },
    { name: 'Nessie Plushie', id: 266, country: 'United Kingdom', type: 'Plushie' },
    { name: 'Red Fox Plushie', id: 268, country: 'United Kingdom', type: 'Plushie' },
    { name: 'Heather', id: 267, country: 'United Kingdom', type: 'Flower' },
    { name: 'Chert Point', id: 623, country: 'United Kingdom', type: 'Prehistoric' },
    { name: 'Monkey Plushie', id: 269, country: 'Argentina', type: 'Plushie' },
    { name: 'Ceibo Flower', id: 271, country: 'Argentina', type: 'Flower' },
    { name: 'Chalcedony Point', id: 620, country: 'Argentina', type: 'Prehistoric' },
    { name: 'Meteorite Fragment', id: 512, country: 'Argentina', type: 'Special' },
    { name: 'Patagonian Fossil', id: 513, country: 'Argentina', type: 'Special' },
    { name: 'Chamois Plushie', id: 273, country: 'Switzerland', type: 'Plushie' },
    { name: 'Edelweiss', id: 272, country: 'Switzerland', type: 'Flower' },
    { name: 'Cherry Blossom', id: 277, country: 'Japan', type: 'Flower' },
    { name: 'Panda Plushie', id: 274, country: 'China', type: 'Plushie' },
    { name: 'Peony', id: 276, country: 'China', type: 'Flower' },
    { name: 'Camel Plushie', id: 384, country: 'UAE', type: 'Plushie' },
    { name: 'Tribulus Omanense', id: 385, country: 'UAE', type: 'Flower' },
    { name: 'Lion Plushie', id: 281, country: 'South Africa', type: 'Plushie' },
    { name: 'African Violet', id: 282, country: 'South Africa', type: 'Flower' },
    { name: 'Quartzite Point', id: 622, country: 'South Africa', type: 'Prehistoric' },
    { name: 'Xanax', id: 206, country: 'South Africa', type: 'Drug' }
  ];

  const COMMON_ITEM_IDS = {
    xanax: 206,
    ecstasy: 197,
    beer: 180,
    'erotic dvd': 366,
    'feathery hotel coupon': 367,
    'can of munster': 532,
    morphine: 205,
    'first aid kit': 67,
    lockpick: 113,
    laptop: 190
  };

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

  const UTILITY_LINKS = [
    { label: 'City', url: 'https://www.torn.com/city.php' },
    { label: 'Items', url: 'https://www.torn.com/items.php' },
    { label: 'Item Market', url: 'https://www.torn.com/imarket.php' },
    { label: 'Bazaar Directory', url: 'https://www.torn.com/bazaar.php' },
    { label: 'Travel Agency', url: 'https://www.torn.com/travelagency.php' },
    { label: 'Raceway', url: 'https://www.torn.com/page.php?sid=racing' },
    { label: 'Casino', url: 'https://www.torn.com/casino.php' },
    { label: 'Bookie', url: 'https://www.torn.com/page.php?sid=bookie' },
    { label: 'Education', url: 'https://www.torn.com/education.php' },
    { label: 'Hospital', url: 'https://www.torn.com/hospitalview.php' },
    { label: 'Jail', url: 'https://www.torn.com/jailview.php' },
    { label: 'Logs', url: 'https://www.torn.com/page.php?sid=log' },
    { label: 'Events', url: 'https://www.torn.com/page.php?sid=events' }
  ];

  // ---------------------------------------------------------------------------
  // GM compatibility helpers
  // ---------------------------------------------------------------------------

  function getGmApi() {
    const gm = typeof GM !== 'undefined' ? GM : null;
    return {
      getValue: gm && typeof gm.getValue === 'function'
        ? gm.getValue.bind(gm)
        : (typeof GM_getValue === 'function' ? (key, fallback) => Promise.resolve(GM_getValue(key, fallback)) : null),
      setValue: gm && typeof gm.setValue === 'function'
        ? gm.setValue.bind(gm)
        : (typeof GM_setValue === 'function' ? (key, value) => Promise.resolve(GM_setValue(key, value)) : null),
      xhr: gm && typeof gm.xmlHttpRequest === 'function'
        ? gm.xmlHttpRequest.bind(gm)
        : (typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null),
      menu: gm && typeof gm.registerMenuCommand === 'function'
        ? gm.registerMenuCommand.bind(gm)
        : (typeof GM_registerMenuCommand === 'function' ? GM_registerMenuCommand : null)
    };
  }

  const GM_API = getGmApi();

  async function storageGet(key, defaultValue) {
    try {
      if (!GM_API.getValue) return defaultValue;
      const value = await GM_API.getValue(key, defaultValue);
      return value === undefined ? defaultValue : value;
    } catch (error) {
      console.warn('[FLUZ] storageGet failed:', key, error);
      return defaultValue;
    }
  }

  async function storageSet(key, value) {
    try {
      if (!GM_API.setValue) return;
      await GM_API.setValue(key, value);
    } catch (error) {
      console.warn('[FLUZ] storageSet failed:', key, error);
    }
  }

  function httpGetJson(url) {
    return new Promise((resolve, reject) => {
      const finish = (text, status) => {
        try {
          const json = JSON.parse(text || '{}');
          if (status && status >= 400) reject(new Error(`HTTP ${status}`));
          else resolve(json);
        } catch (error) {
          reject(new Error(`Could not parse JSON from ${safeUrlForLog(url)}: ${error.message}`));
        }
      };

      if (isTornPda() && typeof PDA_httpGet === 'function') {
        try {
          PDA_httpGet(url).then((response) => finish(response, 200)).catch(reject);
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }

      if (GM_API.xhr) {
        try {
          const result = GM_API.xhr({
            method: 'GET',
            url,
            timeout: 30000,
            onload: (response) => finish(response.responseText, response.status),
            onerror: () => reject(new Error(`Request failed for ${safeUrlForLog(url)}`)),
            ontimeout: () => reject(new Error(`Request timed out for ${safeUrlForLog(url)}`))
          });
          if (result && typeof result.then === 'function') {
            result.then((response) => {
              if (response && response.responseText !== undefined) finish(response.responseText, response.status);
            }).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
        return;
      }

      fetch(url, { credentials: 'omit' })
        .then((response) => response.text().then((text) => finish(text, response.status)))
        .catch(reject);
    });
  }

  function httpPostJson(url, body = {}) {
    return new Promise((resolve, reject) => {
      const payload = JSON.stringify(body || {});
      const finish = (text, status) => {
        const rawText = String(text || '').trim();
        if (rawText && /^[<]/.test(rawText)) {
          reject(new Error(`Non-JSON response from ${safeUrlForLog(url)}`));
          return;
        }
        try {
          const json = JSON.parse(rawText || '{}');
          if (status && status >= 400) reject(new Error(json && json.error ? json.error : `HTTP ${status}`));
          else resolve(json);
        } catch (error) {
          reject(new Error(`Could not parse JSON from ${safeUrlForLog(url)}: ${error.message}`));
        }
      };

      if (GM_API.xhr) {
        try {
          const result = GM_API.xhr({
            method: 'POST',
            url,
            headers: { 'Content-Type': 'application/json' },
            data: payload,
            timeout: 30000,
            onload: (response) => finish(response.responseText, response.status),
            onerror: () => reject(new Error(`Request failed for ${safeUrlForLog(url)}`)),
            ontimeout: () => reject(new Error(`Request timed out for ${safeUrlForLog(url)}`))
          });
          if (result && typeof result.then === 'function') {
            result.then((response) => {
              if (response && response.responseText !== undefined) finish(response.responseText, response.status);
            }).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
        return;
      }

      fetch(url, {
        method: 'POST',
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).then((response) => response.text().then((text) => finish(text, response.status))).catch(reject);
    });
  }

  function httpGetText(url) {
    return new Promise((resolve, reject) => {
      const finish = (text, status) => {
        if (status && status >= 400) reject(new Error(`HTTP ${status}`));
        else resolve(String(text || ''));
      };

      if (isTornPda() && typeof PDA_httpGet === 'function') {
        try {
          PDA_httpGet(url).then((response) => finish(response, 200)).catch(reject);
          return;
        } catch (error) {
          reject(error);
          return;
        }
      }

      if (GM_API.xhr) {
        try {
          const result = GM_API.xhr({
            method: 'GET',
            url,
            timeout: 30000,
            onload: (response) => finish(response.responseText, response.status),
            onerror: () => reject(new Error(`Request failed for ${safeUrlForLog(url)}`)),
            ontimeout: () => reject(new Error(`Request timed out for ${safeUrlForLog(url)}`))
          });
          if (result && typeof result.then === 'function') {
            result.then((response) => {
              if (response && response.responseText !== undefined) finish(response.responseText, response.status);
            }).catch(reject);
          }
        } catch (error) {
          reject(error);
        }
        return;
      }

      fetch(url, { credentials: 'omit' })
        .then((response) => response.text().then((text) => finish(text, response.status)))
        .catch(reject);
    });
  }

  async function httpGetTornPageText(path) {
    const response = await fetch(path, { credentials: 'include' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  function registerMenuCommand(label, callback) {
    try {
      if (GM_API.menu) GM_API.menu(label, callback);
    } catch (error) {
      console.warn('[FLUZ] menu command failed:', label, error);
    }
  }

  // ---------------------------------------------------------------------------
  // Utility functions
  // ---------------------------------------------------------------------------

  function $(selector, root = document) {
    return root.querySelector(selector);
  }

  function $all(selector, root = document) {
    return Array.from(root.querySelectorAll(selector));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[char]));
  }

  function parseNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value == null) return 0;
    const cleaned = String(value).replace(/[$,\s]/g, '');
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function parseCompactNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    const text = String(value || '').trim().toLowerCase().replace(/[$,\s]/g, '');
    if (!text) return 0;
    const match = text.match(/^(-?\d+(?:\.\d+)?)([kmbt])?$/i);
    if (!match) return parseNumber(text);
    const base = Number(match[1]);
    if (!Number.isFinite(base)) return 0;
    const multipliers = { k: 1e3, m: 1e6, b: 1e9, t: 1e12 };
    return base * (multipliers[match[2]] || 1);
  }

  function compactNumber(value) {
    const number = Number(value) || 0;
    const abs = Math.abs(number);
    if (abs >= 1e12) return `${(number / 1e12).toFixed(2)}t`;
    if (abs >= 1e9) return `${(number / 1e9).toFixed(2)}b`;
    if (abs >= 1e6) return `${(number / 1e6).toFixed(2)}m`;
    if (abs >= 1e3) return `${(number / 1e3).toFixed(1)}k`;
    return Math.round(number).toLocaleString();
  }

  function formatMoney(value) {
    const number = Number(value) || 0;
    const sign = number < 0 ? '-' : '';
    return `${sign}$${compactNumber(Math.abs(number))}`;
  }

  function formatFullMoney(value) {
    const number = Math.round(Number(value) || 0);
    return `$${number.toLocaleString()}`;
  }

  function formatPct(value, digits = 1) {
    if (value == null || Number.isNaN(value)) return 'n/a';
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(digits)}%`;
  }

  function nowMs() {
    return Date.now();
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isTornPda() {
    return typeof window !== 'undefined'
      && (typeof window.PDA_httpGet === 'function' || !!window.flutter_inappwebview);
  }

  function looksLikeStocksPage() {
    try {
      const url = new URL(window.location.href);
      if ((url.searchParams.get('sid') || '').toLowerCase() === 'stocks') return true;
      if (url.pathname.endsWith('/page.php')) return false;
    } catch (error) {
      // Ignore URL parsing issues and fall back to page text detection.
    }
    const titleText = `${document.title || ''} ${document.body ? document.body.textContent.slice(0, 2500) : ''}`;
    return /stock market/i.test(titleText) && /stocks filter|stock name|dividend/i.test(titleText);
  }

  function looksLikeGymPage() {
    try {
      const url = new URL(window.location.href);
      if ((url.searchParams.get('sid') || '').toLowerCase() === 'gym') return true;
      if (/\/gym\.php$/i.test(url.pathname)) return true;
      if (/\/(?:index|profiles|factions|hospitalview|jailview|items|bazaar)\.php$/i.test(url.pathname || '')) return false;
      if (url.pathname.endsWith('/page.php')) return false;
    } catch (error) {
      // Ignore URL parsing issues and fall back to page text detection.
    }
    const titleText = `${document.title || ''} ${document.body ? document.body.textContent.slice(0, 2500) : ''}`;
    return /\bgym\b/i.test(titleText) && /strength|speed|defense|dexterity|train/i.test(titleText);
  }

  function currentUrl() {
    try {
      return new URL(window.location.href);
    } catch (error) {
      return { href: window.location.href, pathname: '', search: '', hash: '', searchParams: new URLSearchParams() };
    }
  }

  function urlSid(url = currentUrl()) {
    return String(url.searchParams && url.searchParams.get ? url.searchParams.get('sid') || '' : '').toLowerCase();
  }

  function isBookiePage() {
    const url = currentUrl();
    return urlSid(url) === 'bookie' || /sid=bookie/i.test(url.href || '');
  }

  function isBlackjackPage() {
    const url = currentUrl();
    return urlSid(url) === 'blackjack' || /sid=blackjack/i.test(url.href || '');
  }

  function isHighLowPage() {
    const url = currentUrl();
    return urlSid(url) === 'highlow' || /sid=highlow/i.test(url.href || '');
  }

  function isHoldemPage() {
    const url = currentUrl();
    return urlSid(url) === 'holdem' || /sid=holdem/i.test(url.href || '');
  }

  function isMeritsPage() {
    const url = currentUrl();
    const sid = urlSid(url);
    const tab = String(url.searchParams && url.searchParams.get ? url.searchParams.get('tab') || '' : '').toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return sid === 'awards' || tab === 'merits' || /(?:sid=awards|tab=merits|awards\.php)/i.test(href);
  }

  function isItemMarketAddListingPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const hash = String(url.hash || '').toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return (sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href)) && /addlisting/.test(hash || href);
  }

  function isItemMarketListingToolPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const hash = String(url.hash || '').toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return (sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href))
      && /(addlisting|viewlisting)/.test(hash || href);
  }

  function currentItemMarketItemId() {
    const hash = String(currentUrl().hash || '');
    const match = hash.match(/(?:[?&#/]|^)itemID=(\d+)/i) || hash.match(/(?:[?&#/]|^)itemid=(\d+)/i);
    return match ? match[1] : '';
  }

  function currentItemMarketCategoryName() {
    const hash = String(currentUrl().hash || '');
    const match = hash.match(/(?:[?&#/]|^)categoryName=([^&#]+)/i);
    if (!match) return '';
    try {
      return decodeURIComponent(match[1].replace(/\+/g, ' '));
    } catch (error) {
      return match[1].replace(/\+/g, ' ');
    }
  }

  function isItemMarketBrowseItemPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return (sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href))
      && /#\/market/i.test(String(url.hash || ''))
      && !!currentItemMarketItemId();
  }

  function tornCssModuleSelector(localName) {
    const prefix = `${localName}___`;
    return `[class^="${prefix}"], [class*=" ${prefix}"]`;
  }

  function tornUlCssModuleSelector(localName) {
    const prefix = `${localName}___`;
    return `ul[class^="${prefix}"], ul[class*=" ${prefix}"]`;
  }

  function isItemMarketPage() {
    const url = currentUrl();
    const sid = urlSid(url).toLowerCase();
    const href = String(url.href || '').toLowerCase();
    return sid === 'itemmarket' || sid === 'imarket' || /sid=itemmarket|sid=imarket/.test(href);
  }

  function isProfilePage() {
    const url = currentUrl();
    return /\/profiles\.php$/i.test(url.pathname || '') && (url.searchParams && url.searchParams.get('XID'));
  }

  function detectToolMode() {
    if (looksLikeStocksPage()) return 'stocks';
    if (looksLikeGymPage()) return 'gym';
    if (detectUtilityModule()) return 'utility';
    return '';
  }

  function detectUtilityModule() {
    let url;
    try {
      url = new URL(window.location.href);
    } catch (error) {
      url = { href: window.location.href, pathname: '', search: '' };
    }
    const haystack = `${url.pathname || ''} ${url.search || ''} ${url.hash || ''} ${document.title || ''}`.toLowerCase();
    const modules = Object.values(UTILITY_MODULES);
    const path = `${url.pathname || ''}${url.search || ''}${url.hash || ''}`;
    return modules.find((module) => typeof module.pageCheck === 'function' && module.pageCheck())
      || modules.find((module) => module.pathPatterns.some((pattern) => pattern.test(path)))
      || modules.find((module) => module.keywords.some((keyword) => haystack.includes(keyword.toLowerCase())))
      || null;
  }

  async function waitForStocksPage() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      if (looksLikeStocksPage()) return true;
      await sleep(250);
    }
    return false;
  }

  async function waitForSupportedPage() {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const mode = detectToolMode();
      if (mode) return mode;
      await sleep(250);
    }
    return '';
  }

  function removeAppUi() {
    clearNativeStockFilter({ silent: true });
    const panel = document.getElementById(APP.id);
    if (panel) panel.remove();
    const modal = document.getElementById(`${APP.id}-modal`);
    if (modal) modal.remove();
    removeNativeSearch();
    removeNativeFilterResetButton();
    state.elements.panel = null;
  }

  function safeUrlForLog(url) {
    return String(url).replace(/([?&]key=)[^&]+/i, '$1[hidden]');
  }

  function getActionMeta(action) {
    return ACTION_META[action] || { group: 'hold', className: 'watch' };
  }

  function getProfile() {
    return INVESTOR_PROFILES[state.settings.investorProfile] || INVESTOR_PROFILES.active;
  }

  function getStrategy() {
    return STRATEGY_METHODS[state.settings.strategyMode] || STRATEGY_METHODS.balanced;
  }

  function getCombo() {
    return STRATEGY_COMBOS[state.settings.strategyCombo] || STRATEGY_COMBOS.daily_swing;
  }

  function comboFromRisk(value) {
    const risk = clamp(parseNumber(value), 0, 100);
    const combos = Object.values(STRATEGY_COMBOS);
    return combos.reduce((best, combo) => (
      Math.abs(combo.risk - risk) < Math.abs(best.risk - risk) ? combo : best
    ), combos[0]);
  }

  function applyCombo(comboKey) {
    const combo = STRATEGY_COMBOS[comboKey] || STRATEGY_COMBOS.daily_swing;
    state.settings.strategyCombo = combo.key;
    state.settings.riskLevel = combo.risk;
    state.settings.strategyMode = combo.strategyMode;
    state.settings.investorProfile = combo.investorProfile;
    state.settings.ignoreBenefits = combo.ignoreBenefits;
  }

  function benefitsAreIgnored() {
    const strategy = getStrategy();
    return !!state.settings.ignoreBenefits || !strategy.allowBenefitAdvice;
  }

  function isApiKeyReasonable(key) {
    const value = String(key || '').trim();
    return value.length >= 8 && value.length <= 256 && !/\s/.test(value);
  }

  function toCacheKey(name) {
    return `${STORAGE.cachePrefix}${name}`;
  }

  async function readJsonStorage(key, fallback) {
    const raw = await storageGet(key, null);
    if (!raw) return fallback;
    try {
      return JSON.parse(raw);
    } catch (error) {
      console.warn('[FLUZ] Bad stored JSON:', key, error);
      return fallback;
    }
  }

  async function writeJsonStorage(key, value) {
    await storageSet(key, JSON.stringify(value));
  }

  // ---------------------------------------------------------------------------
  // Formatting helpers
  // ---------------------------------------------------------------------------

  function signalLabelFromMomentum(score) {
    if (score >= 1.5) return 'Going Up';
    if (score >= 0.5) return 'Slightly Up';
    if (score <= -1.5) return 'Going Down';
    if (score <= -0.5) return 'Slightly Down';
    return 'Flat';
  }

  function benefitStatusText(position, benefit) {
    if (!benefit || !benefit.requirement) return 'No tracked block';
    if (!position) return `Need ${compactNumber(benefit.requirement)} shares`;
    if (position.hasBenefit) {
      return position.blockCount > 1 ? `${position.blockCount} active blocks` : 'Benefit active';
    }
    return `${Math.floor(position.benefitProgressPct)}% to block`;
  }

  function payoutStatusText(position) {
    if (!position) return 'Not owned';
    if (position.dividendReady) return 'Ready';
    return position.dividendProgress || 'Waiting';
  }

  function priorityLabel(priority) {
    if (priority >= 90) return 'Urgent';
    if (priority >= 70) return 'High';
    if (priority >= 45) return 'Medium';
    return 'Low';
  }

  // ---------------------------------------------------------------------------
  // Storage module
  // ---------------------------------------------------------------------------

  async function loadSettings() {
    const saved = await readJsonStorage(STORAGE.settings, {});
    state.settings = mergeSettings(DEFAULT_SETTINGS, saved);
    state.apiKey = await storageGet(STORAGE.apiKey, '');
    state.panel = await readJsonStorage(STORAGE.panelState, DEFAULT_PANEL_STATE);
    state.gym = mergeGymState(await readJsonStorage(STORAGE.gymState, DEFAULT_GYM_STATE));
    state.utility = mergeUtilityState(await readJsonStorage(STORAGE.utilityState, DEFAULT_UTILITY_STATE));
    if (state.panel.activeTab === 'settings' || state.panel.activeTab === 'about') {
      state.panel.activeTab = 'signals';
    }
    state.notificationHistory = await readJsonStorage(STORAGE.notificationHistory, {});
    state.priceMemory = await readJsonStorage(STORAGE.priceMemory, {});
    await loadMarketBazaarScanCache();
    const cachedMorale = await readJsonStorage(STORAGE.crimeMorale, null);
    if (cachedMorale && Number.isFinite(parseNumber(cachedMorale.morale))) {
      state.crimeMorale = {
        morale: clamp(parseNumber(cachedMorale.morale), 0, 100),
        demMod: parseNumber(cachedMorale.demMod),
        label: cachedMorale.label || 'Crime 2.0',
        updatedText: cachedMorale.fetchedAt ? `saved ${new Date(cachedMorale.fetchedAt).toLocaleTimeString()}` : 'saved'
      };
    }
  }

  function mergeSettings(defaults, saved) {
    return {
      ...defaults,
      ...saved,
      notifications: {
        ...defaults.notifications,
        ...(saved && saved.notifications ? saved.notifications : {})
      },
      lockedStocks: Array.isArray(saved && saved.lockedStocks) ? saved.lockedStocks : []
    };
  }

  async function saveSettings() {
    await writeJsonStorage(STORAGE.settings, state.settings);
  }

  async function savePanelState() {
    await writeJsonStorage(STORAGE.panelState, state.panel);
  }

  function mergeGymState(saved) {
    const base = JSON.parse(JSON.stringify(DEFAULT_GYM_STATE));
    const merged = { ...base, ...(saved || {}) };
    merged.target = { ...base.target, ...((saved && saved.target) || {}) };
    merged.manualStats = { ...base.manualStats, ...((saved && saved.manualStats) || {}) };
    merged.customBuilds = Array.isArray(saved && saved.customBuilds) ? saved.customBuilds : [];
    merged.availableGyms = Array.isArray(saved && saved.availableGyms) ? saved.availableGyms : [];
    return merged;
  }

  async function saveGymState() {
    await writeJsonStorage(STORAGE.gymState, state.gym);
  }

  function mergeUtilityState(saved) {
    const base = JSON.parse(JSON.stringify(DEFAULT_UTILITY_STATE));
    const merged = { ...base, ...(saved || {}) };
    merged.timers = Array.isArray(saved && saved.timers) ? saved.timers : [];
    merged.ignoredItems = Array.isArray(saved && saved.ignoredItems) ? saved.ignoredItems : [];
    merged.marketHiddenItemIds = Array.isArray(saved && saved.marketHiddenItemIds) ? saved.marketHiddenItemIds : [];
    merged.marketValueHiddenItemIds = Array.isArray(saved && saved.marketValueHiddenItemIds) ? saved.marketValueHiddenItemIds : [];
    merged.marketFilterPresets = normalizeMarketFilterPresets(saved && saved.marketFilterPresets);
    merged.addictionHistory = Array.isArray(saved && saved.addictionHistory) ? saved.addictionHistory.slice(-24) : [];
    merged.bookieSports = { ...base.bookieSports, ...((saved && saved.bookieSports) || {}) };
    merged.itemProfitPcts = { ...base.itemProfitPcts, ...((saved && saved.itemProfitPcts) || {}) };
    merged.travelOwnedItems = { ...base.travelOwnedItems, ...((saved && saved.travelOwnedItems) || {}) };
    merged.targetNoteFilters = Array.isArray(saved && saved.targetNoteFilters)
      ? saved.targetNoteFilters
      : (saved && saved.targetNoteFilter ? [saved.targetNoteFilter] : []);
    merged.targetTreeOpen = { ...base.targetTreeOpen, ...((saved && saved.targetTreeOpen) || {}) };
    merged.targetLists = normalizeTargetLists(saved && saved.targetLists);
    merged.chainFriendlyMembers = normalizeChainFriendlyMembers(saved && saved.chainFriendlyMembers);
    if (saved && saved.chainAlarmEnabled === false) {
      if (saved.chainMessageAlertEnabled === undefined) merged.chainMessageAlertEnabled = false;
      if (saved.chainTargetAlertEnabled === undefined) merged.chainTargetAlertEnabled = false;
      if (saved.chainWarningAlertEnabled === undefined) merged.chainWarningAlertEnabled = false;
    }
    if (saved && saved.chainMessageEnabled === false && saved.chainMessageAlertEnabled === undefined) {
      merged.chainMessageAlertEnabled = false;
    }
    return merged;
  }

  async function saveUtilityState() {
    await writeJsonStorage(STORAGE.utilityState, state.utility);
  }

  async function reloadUtilityStateFromStorage(keepView = true) {
    const previous = state.utility || {};
    const keep = keepView ? {
      activeTab: previous.activeTab,
      activeTargetListId: previous.activeTargetListId,
      targetAddOpen: previous.targetAddOpen,
      targetImportOpen: previous.targetImportOpen,
      factionAddOpen: previous.factionAddOpen
    } : {};
    state.utility = mergeUtilityState(await readJsonStorage(STORAGE.utilityState, DEFAULT_UTILITY_STATE));
    Object.entries(keep).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') state.utility[key] = value;
    });
    return state.utility;
  }

  async function loadMarketBazaarScanCache() {
    const cached = await readJsonStorage(STORAGE.marketBazaarScanCache, null);
    const rows = Array.isArray(cached && cached.rows) ? cached.rows : [];
    const cutoff = nowMs() - ITEM_MARKET_BAZAAR.scanCacheTtlMs;
    state.marketBazaarAllRows = rows
      .filter((row) => parseNumber(row && row.scannedAt) >= cutoff)
      .slice(-1200);
    state.marketBazaarAllScan = cached && cached.scan
      ? { index: Math.max(0, parseNumber(cached.scan.index)), total: Math.max(0, parseNumber(cached.scan.total)) }
      : { index: 0, total: state.marketBazaarAllRows.length };
  }

  async function saveMarketBazaarScanCache(force = false) {
    const now = nowMs();
    if (!force && now - (state.marketBazaarAllLastCacheWriteAt || 0) < ITEM_MARKET_BAZAAR.scanCacheWriteThrottleMs) return;
    state.marketBazaarAllLastCacheWriteAt = now;
    const cutoff = now - ITEM_MARKET_BAZAAR.scanCacheTtlMs;
    const rows = (state.marketBazaarAllRows || [])
      .filter((row) => parseNumber(row && row.scannedAt) >= cutoff)
      .slice(-1200);
    await writeJsonStorage(STORAGE.marketBazaarScanCache, {
      fetchedAt: now,
      rows,
      scan: state.marketBazaarAllScan || { index: 0, total: 0 }
    });
  }

  async function saveApiKey(key) {
    state.apiKey = String(key || '').trim();
    await storageSet(STORAGE.apiKey, state.apiKey);
  }

  async function clearApiKey() {
    state.apiKey = '';
    await storageSet(STORAGE.apiKey, '');
  }

  async function clearLocalData() {
    state.raw = null;
    state.tornsy = {};
    state.data = null;
    state.gymRaw = null;
    state.gymData = null;
    state.analyses = [];
    state.recommendations = [];
    state.notificationHistory = {};
    state.priceMemory = {};
    await writeJsonStorage(STORAGE.notificationHistory, {});
    await writeJsonStorage(STORAGE.priceMemory, {});
    await writeJsonStorage(STORAGE.tornsyCache, {});
    await writeJsonStorage(toCacheKey('market'), {});
    await writeJsonStorage(toCacheKey('user'), {});
    await writeJsonStorage(toCacheKey('bank'), {});
    await writeJsonStorage(toCacheKey('gymUser'), {});
    await writeJsonStorage(toCacheKey('gymItems'), {});
    await writeJsonStorage(toCacheKey('utilityUser'), {});
  }

  // ---------------------------------------------------------------------------
  // API module
  // ---------------------------------------------------------------------------

  function buildTornApiUrl(section, selections) {
    const key = encodeURIComponent(state.apiKey);
    return `${APP.apiBaseUrl}/${section}/?selections=${encodeURIComponent(selections)}&key=${key}`;
  }

  async function cachedHttpGetJson(cacheName, url, ttlMs, force) {
    const cacheKey = toCacheKey(cacheName);
    const cached = await readJsonStorage(cacheKey, null);
    if (state.tornApiBackoffUntil && nowMs() < state.tornApiBackoffUntil) {
      if (cached && cached.data) {
        return {
          data: cached.data,
          fromCache: true,
          stale: true,
          fetchedAt: cached.ts,
          warning: 'Using cached Torn API data during brief rate-limit backoff.'
        };
      }
      throw new Error('Torn API is briefly rate limited. Trying again shortly.');
    }
    if (!force && cached && cached.ts && nowMs() - cached.ts < ttlMs && cached.data) {
      return { data: cached.data, fromCache: true, stale: false, fetchedAt: cached.ts };
    }

    try {
      const data = await httpGetJson(url);
      if (isTornApiRateLimitPayload(data)) {
        state.tornApiBackoffUntil = nowMs() + 65000;
        throw new Error('Torn API 5: Too many requests. Brief backoff active.');
      }
      await writeJsonStorage(cacheKey, { ts: nowMs(), data });
      return { data, fromCache: false, stale: false, fetchedAt: nowMs() };
    } catch (error) {
      if (cached && cached.data) {
        return {
          data: cached.data,
          fromCache: true,
          stale: true,
          fetchedAt: cached.ts,
          warning: error.message
        };
      }
      throw error;
    }
  }

  function isTornApiRateLimitPayload(payload) {
    const code = payload && payload.error && String(payload.error.code || '');
    const message = payload && payload.error && String(payload.error.error || payload.error.message || '');
    return code === '5' || /too many requests/i.test(message);
  }

  function assertTornApiOk(payload, label) {
    if (!payload) throw new Error(`${label} returned no data.`);
    if (payload.error) {
      const code = payload.error.code || '?';
      const message = payload.error.error || payload.error.message || 'Unknown Torn API error';
      if (String(code) === '5') state.tornApiBackoffUntil = nowMs() + 65000;
      throw new Error(`Torn API ${code}: ${message}`);
    }
  }

  function isBriefCacheBackoffWarning(warning) {
    return /cached Torn API data during brief rate-limit backoff/i.test(String(warning || ''));
  }

  function cleanStockWarnings(warnings) {
    const unique = [...new Set((warnings || []).map((warning) => String(warning || '').trim()).filter(Boolean))];
    return unique.filter((warning) => !isBriefCacheBackoffWarning(warning));
  }

  async function fetchTornData(force = false) {
    if (!isApiKeyReasonable(state.apiKey)) {
      throw new Error('Missing or invalid API key. Add a Limited Access Torn API key in Profile.');
    }

    const [marketResult, userResult, bankResult] = await Promise.all([
      cachedHttpGetJson('market', buildTornApiUrl('torn', 'stocks'), APP.apiCacheTtlMs, force),
      cachedHttpGetJson('user', buildTornApiUrl('user', 'stocks,money'), APP.apiCacheTtlMs, force),
      cachedHttpGetJson('bank', buildTornApiUrl('torn', 'bank'), APP.apiCacheTtlMs, force)
        .catch((error) => ({ data: null, warning: error.message, fromCache: false, stale: false }))
    ]);

    assertTornApiOk(marketResult.data, 'Market data');
    assertTornApiOk(userResult.data, 'User data');
    if (bankResult.data) assertTornApiOk(bankResult.data, 'Bank data');

    state.cacheInfo = {
      market: marketResult,
      user: userResult,
      bank: bankResult
    };

    return {
      market: marketResult.data,
      user: userResult.data,
      bank: bankResult.data,
      warnings: cleanStockWarnings([marketResult.warning, userResult.warning, bankResult.warning])
    };
  }

  async function fetchGymData(force = false) {
    if (!isApiKeyReasonable(state.apiKey)) {
      return {
        user: {},
        items: {},
        warnings: ['Add a Limited Access API key for live stats, energy, happy, and item values.']
      };
    }

    const [userResult, itemResult] = await Promise.all([
      cachedHttpGetJson('gymUser', buildTornApiUrl('user', 'battlestats,bars,money,basic'), APP.apiCacheTtlMs, force)
        .catch((error) => ({ data: {}, warning: error.message, fromCache: false, stale: false })),
      cachedHttpGetJson('gymItems', buildTornApiUrl('torn', 'items'), APP.itemDbCacheTtlMs, force)
        .catch((error) => ({ data: {}, warning: error.message, fromCache: false, stale: false }))
    ]);

    const warnings = [];
    if (userResult.warning) warnings.push(`Gym user data: ${userResult.warning}`);
    if (itemResult.warning) warnings.push(`Item values: ${itemResult.warning}`);
    if (userResult.data && userResult.data.error) warnings.push(`Gym user data: ${userResult.data.error.error || 'API error'}`);
    if (itemResult.data && itemResult.data.error) warnings.push(`Item values: ${itemResult.data.error.error || 'API error'}`);

    state.cacheInfo.gymUser = userResult;
    state.cacheInfo.gymItems = itemResult;

    return {
      user: userResult.data && !userResult.data.error ? userResult.data : {},
      items: itemResult.data && !itemResult.data.error ? itemResult.data.items || {} : {},
      warnings
    };
  }

  async function fetchUtilityData(force = false) {
    const warnings = [];
    const cachedItems = await readJsonStorage(toCacheKey('gymItems'), null);
    const output = {
      user: {},
      items: cachedItems && cachedItems.data && !cachedItems.data.error ? cachedItems.data.items || {} : {},
      warnings
    };

    if (!isApiKeyReasonable(state.apiKey)) {
      warnings.push('Add a Limited Access API key for live item values and home stats.');
      return output;
    }

    const [userResult, itemResult] = await Promise.all([
      cachedHttpGetJson('utilityUser', buildTornApiUrl('user', 'battlestats,bars,money,basic,icons,personalstats'), APP.apiCacheTtlMs, force)
        .catch((error) => ({ data: {}, warning: error.message, fromCache: false, stale: false })),
      cachedHttpGetJson('gymItems', buildTornApiUrl('torn', 'items'), APP.itemDbCacheTtlMs, force)
        .catch((error) => ({ data: cachedItems && cachedItems.data ? cachedItems.data : {}, warning: error.message, fromCache: !!cachedItems, stale: !!cachedItems }))
    ]);

    if (userResult.warning) warnings.push(`Home stats: ${userResult.warning}`);
    if (itemResult.warning) warnings.push(`Item values: ${itemResult.warning}`);
    if (userResult.data && userResult.data.error) warnings.push(`Home stats: ${userResult.data.error.error || 'API error'}`);
    if (itemResult.data && itemResult.data.error) warnings.push(`Item values: ${itemResult.data.error.error || 'API error'}`);

    state.cacheInfo.utilityUser = userResult;
    state.cacheInfo.gymItems = itemResult;

    return {
      user: userResult.data && !userResult.data.error ? userResult.data : {},
      items: itemResult.data && !itemResult.data.error ? itemResult.data.items || {} : output.items,
      warnings
    };
  }

  async function fetchTornsyData(stocks, force = false) {
    if (!state.settings.enableTornsy) return {};

    const cache = await readJsonStorage(STORAGE.tornsyCache, {});
    if (!force && cache.ts && nowMs() - cache.ts < APP.tornsyCacheTtlMs && cache.data) {
      state.cacheInfo.tornsy = { fromCache: true, stale: false, fetchedAt: cache.ts };
      return cache.data;
    }

    const output = {};
    const acronyms = stocks.map((stock) => stock.acronym).filter(Boolean);
    try {
      for (let index = 0; index < acronyms.length; index += 5) {
        const batch = acronyms.slice(index, index + 5);
        const results = await Promise.all(batch.map((acronym) => fetchTornsyForStock(acronym)));
        batch.forEach((acronym, offset) => {
          output[acronym] = results[offset];
        });
        if (index + 5 < acronyms.length) await sleep(150);
      }
      await writeJsonStorage(STORAGE.tornsyCache, { ts: nowMs(), data: output });
      state.cacheInfo.tornsy = { fromCache: false, stale: false, fetchedAt: nowMs() };
      return output;
    } catch (error) {
      if (cache && cache.data) {
        state.cacheInfo.tornsy = { fromCache: true, stale: true, fetchedAt: cache.ts, warning: error.message };
        return cache.data;
      }
      state.cacheInfo.tornsy = { fromCache: false, stale: false, warning: error.message };
      return {};
    }
  }

  async function fetchTornsyForStock(acronym) {
    const url = `${APP.tornsyBaseUrl}/${encodeURIComponent(acronym)}?interval=h1`;
    try {
      const payload = await httpGetJson(url);
      const data = payload && Array.isArray(payload.data) ? payload.data : payload;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.warn('[FLUZ] Tornsy unavailable for', acronym, error.message);
      return [];
    }
  }

  // ---------------------------------------------------------------------------
  // Data normalization module
  // ---------------------------------------------------------------------------

  function normalizeAll(raw, tornsyData) {
    const marketStocks = normalizeMarketStocks(raw.market && raw.market.stocks);
    const userStocks = normalizeUserStocks(raw.user && raw.user.stocks);
    const userCash = normalizeUserCash(raw.user || {});
    const bank = normalizeBank(raw.bank || {}, raw.user || {});
    recordPriceMemory(marketStocks);

    const analyses = marketStocks.map((stock) => analyzeStock(stock, userStocks.get(String(stock.id)), userCash, bank, tornsyData));
    analyses.sort((a, b) => a.acronym.localeCompare(b.acronym));

    return { marketStocks, userStocks, userCash, bank, analyses, warnings: raw.warnings || [] };
  }

  function recordPriceMemory(stocks) {
    if (!state.settings.enableLocalMemory || !Array.isArray(stocks)) return;
    const ts = nowMs();
    const next = { ...(state.priceMemory || {}) };
    stocks.forEach((stock) => {
      if (!stock || !stock.acronym || !stock.price) return;
      const key = stock.acronym;
      const history = Array.isArray(next[key]) ? next[key].slice() : [];
      const last = history[history.length - 1];
      if (!last || Math.abs(last.price - stock.price) > 0.0001 || ts - last.ts > 30 * 60 * 1000) {
        history.push({ ts, price: stock.price });
      }
      const cutoff = ts - 45 * 24 * 60 * 60 * 1000;
      next[key] = history.filter((point) => point.ts >= cutoff).slice(-720);
    });
    state.priceMemory = next;
    writeJsonStorage(STORAGE.priceMemory, next);
  }

  function getObservedMemory(acronym) {
    const history = state.priceMemory && state.priceMemory[acronym];
    if (!Array.isArray(history) || history.length < 2) {
      return { samples: history ? history.length : 0, change1d: null, change7d: null, change30d: null, slope: 0 };
    }
    const latest = history[history.length - 1];
    return {
      samples: history.length,
      change1d: observedChangeSince(history, latest.ts - 24 * 60 * 60 * 1000),
      change7d: observedChangeSince(history, latest.ts - 7 * 24 * 60 * 60 * 1000),
      change30d: observedChangeSince(history, latest.ts - 30 * 24 * 60 * 60 * 1000),
      slope: observedSlope(history)
    };
  }

  function observedChangeSince(history, cutoffTs) {
    const latest = history[history.length - 1];
    const point = history.find((entry) => entry.ts >= cutoffTs) || history[0];
    return point && point.price ? percentChange(point.price, latest.price) : null;
  }

  function observedSlope(history) {
    const slice = history.slice(-Math.min(20, history.length));
    if (slice.length < 2) return 0;
    let up = 0;
    let down = 0;
    for (let index = 1; index < slice.length; index += 1) {
      const diff = slice[index].price - slice[index - 1].price;
      if (diff > 0) up += 1;
      if (diff < 0) down += 1;
    }
    return (up - down) / Math.max(1, slice.length - 1);
  }

  function normalizeMarketStocks(stocks) {
    if (!stocks || typeof stocks !== 'object') return [];
    return Object.entries(stocks).map(([id, raw]) => {
      const acronym = String(raw.acronym || raw.ticker || raw.shortname || id).toUpperCase();
      const fallback = BENEFIT_DATABASE[acronym] || {};
      const price = parseNumber(raw.current_price ?? raw.price ?? raw.market_price ?? raw.value);
      const benefit = normalizeBenefit(raw.benefit, fallback, price);
      return {
        id: String(id),
        name: raw.name || fallback.name || acronym,
        acronym,
        price,
        totalShares: parseNumber(raw.total_shares),
        availableShares: parseNumber(raw.available_shares),
        forecast: raw.forecast || raw.forecast_text || '',
        demand: raw.demand || raw.demand_text || '',
        raw,
        benefit
      };
    }).filter((stock) => stock.price > 0 || stock.acronym);
  }

  function normalizeBenefit(rawBenefit, fallback, price) {
    if (!rawBenefit && !fallback) return null;
    const requirement = parseNumber(rawBenefit && (rawBenefit.requirement ?? rawBenefit.required_shares));
    const frequency = parseNumber(rawBenefit && (rawBenefit.frequency ?? rawBenefit.frequency_days)) || null;
    const annualValue = parseNumber(fallback && fallback.annualValue);
    const blockCost = requirement > 0 && price > 0 ? requirement * price : 0;
    return {
      type: (rawBenefit && rawBenefit.type) || (annualValue > 0 ? 'active' : 'passive'),
      requirement,
      frequencyDays: frequency,
      description: (rawBenefit && (rawBenefit.description || rawBenefit.name)) || '',
      annualValue,
      note: (fallback && fallback.note) || '',
      tier: (fallback && fallback.tier) || '',
      blockCost,
      annualRoi: annualValue > 0 && blockCost > 0 ? (annualValue / blockCost) * 100 : 0
    };
  }

  function normalizeUserStocks(stocks) {
    const map = new Map();
    if (!stocks || typeof stocks !== 'object') return map;
    Object.entries(stocks).forEach(([id, holding]) => {
      map.set(String(id), holding || {});
    });
    return map;
  }

  function normalizeUserCash(user) {
    const wallet = parseNumber(user.money_onhand ?? user.money);
    const vault = parseNumber(user.vault_amount ?? user.vault);
    const company = parseNumber(user.company_funds ?? user.company_balance);
    const cayman = parseNumber(user.cayman_bank);
    return {
      wallet,
      vault,
      company,
      cayman,
      immediate: Math.max(0, wallet) + Math.max(0, vault) + Math.max(0, company),
      totalIncludingCayman: Math.max(0, wallet) + Math.max(0, vault) + Math.max(0, company) + Math.max(0, cayman)
    };
  }

  function normalizeBank(bankPayload, userPayload) {
    const table = extractBankAprTable(bankPayload && bankPayload.bank);
    const bonus = parseNumber(state.settings.bankBonusPct);
    const withBonus = {};
    BANK_TERMS.forEach((term) => {
      withBonus[term.days] = table[term.days] > 0 ? table[term.days] + bonus : 0;
    });

    const cityBank = userPayload.city_bank || {};
    const amount = parseNumber(cityBank.amount);
    const timeLeft = parseNumber(cityBank.time_left ?? cityBank.timeLeft);
    return {
      aprByDays: withBonus,
      baseAprByDays: table,
      bonusPct: bonus,
      activeInvestment: amount > 0 && timeLeft > 0,
      investmentAmount: amount,
      investmentTimeLeft: timeLeft
    };
  }

  function extractBankAprTable(bank) {
    const table = { 7: 0, 14: 0, 31: 0, 62: 0, 93: 0 };
    if (!bank || typeof bank !== 'object') return table;
    BANK_TERMS.forEach((term) => {
      const candidates = [
        bank[term.days],
        bank[String(term.days)],
        bank[term.label],
        bank[`term_${term.days}`],
        bank[`${term.days}_days`]
      ];
      const match = candidates.find((value) => value !== undefined && value !== null);
      if (typeof match === 'number' || typeof match === 'string') {
        table[term.days] = parseNumber(match);
      } else if (match && typeof match === 'object') {
        table[term.days] = parseNumber(match.apr ?? match.interest ?? match.rate);
      }
    });
    return table;
  }

  // ---------------------------------------------------------------------------
  // Technical analysis module
  // ---------------------------------------------------------------------------

  function calculateSma(values, period) {
    if (!values || values.length < period) return null;
    const slice = values.slice(values.length - period);
    return slice.reduce((sum, value) => sum + value, 0) / period;
  }

  function calculateRsi(values, period) {
    if (!values || values.length < period + 1) return null;
    let gains = 0;
    let losses = 0;
    for (let index = values.length - period; index < values.length; index += 1) {
      const change = values[index] - values[index - 1];
      if (change >= 0) gains += change;
      else losses += Math.abs(change);
    }
    if (losses === 0) return 100;
    const relativeStrength = (gains / period) / (losses / period);
    return 100 - (100 / (1 + relativeStrength));
  }

  function analyzeTechnicals(candles, rsiPeriod) {
    const normalized = normalizeCandles(candles);
    if (normalized.length < 20) return null;
    const closes = normalized.map((candle) => candle.close).filter((value) => value > 0);
    if (closes.length < 20) return null;

    const current = closes[closes.length - 1];
    const sma7 = calculateSma(closes, 7);
    const sma20 = calculateSma(closes, 20);
    const sma50 = calculateSma(closes, 50);
    const rsi = calculateRsi(closes, Math.min(rsiPeriod, Math.max(2, closes.length - 1)));
    const change7d = closes.length >= 168 ? percentChange(closes[closes.length - 168], current) : null;
    const change30d = closes.length >= 720 ? percentChange(closes[closes.length - 720], current) : null;
    const rangeSlice = closes.slice(-Math.min(720, closes.length));
    const high30 = Math.max(...rangeSlice);
    const low30 = Math.min(...rangeSlice);
    const rangePosition = high30 > low30 ? ((current - low30) / (high30 - low30)) * 100 : 50;

    let momentumScore = 0;
    if (rsi != null) {
      if (rsi < 30) momentumScore += 1.5;
      else if (rsi < 40) momentumScore += 0.75;
      else if (rsi > 75) momentumScore -= 1.5;
      else if (rsi > 65) momentumScore -= 0.75;
    }
    if (sma7 && current > sma7) momentumScore += 0.4;
    if (sma20 && current > sma20) momentumScore += 0.6;
    if (change7d != null) {
      if (change7d > 4) momentumScore += 0.5;
      if (change7d < -4) momentumScore -= 0.5;
    }
    momentumScore = clamp(momentumScore, -3, 3);

    return {
      sma7,
      sma20,
      sma50,
      rsi,
      change7d,
      change30d,
      rangePosition,
      momentumScore,
      signal: signalLabelFromMomentum(momentumScore)
    };
  }

  function normalizeCandles(candles) {
    if (!Array.isArray(candles)) return [];
    return candles.map((item) => {
      if (Array.isArray(item)) {
        return {
          time: parseNumber(item[0]),
          open: parseNumber(item[1]),
          high: parseNumber(item[2]),
          low: parseNumber(item[3]),
          close: parseNumber(item[4])
        };
      }
      return {
        time: parseNumber(item.t ?? item.time ?? item.timestamp),
        open: parseNumber(item.o ?? item.open),
        high: parseNumber(item.h ?? item.high),
        low: parseNumber(item.l ?? item.low),
        close: parseNumber(item.c ?? item.close)
      };
    }).filter((candle) => candle.close > 0);
  }

  function percentChange(oldValue, newValue) {
    if (!oldValue) return null;
    return ((newValue - oldValue) / oldValue) * 100;
  }

  // ---------------------------------------------------------------------------
  // Benefit analysis module
  // ---------------------------------------------------------------------------

  function computeBenefitProgress(totalShares, benefit) {
    if (!benefit || benefit.requirement <= 0) {
      return { blockCount: 0, sharesAboveBlock: 0, sharesToNextBlock: 0, progressPct: 0 };
    }

    const requirement = benefit.requirement;
    if (benefit.type === 'active' && totalShares >= requirement) {
      const blockCount = Math.floor(Math.log2((totalShares / requirement) + 1));
      const sharesForBlocks = requirement * ((2 ** blockCount) - 1);
      const sharesAboveBlock = Math.max(0, totalShares - sharesForBlocks);
      const sharesToNextBlock = requirement * (2 ** blockCount) - sharesAboveBlock;
      return {
        blockCount,
        sharesAboveBlock,
        sharesToNextBlock,
        progressPct: 100
      };
    }

    const active = totalShares >= requirement;
    return {
      blockCount: active ? 1 : 0,
      sharesAboveBlock: active ? Math.max(0, totalShares - requirement) : 0,
      sharesToNextBlock: active ? 0 : Math.max(0, requirement - totalShares),
      progressPct: requirement > 0 ? clamp((totalShares / requirement) * 100, 0, 100) : 0
    };
  }

  function getComparableBankApr(benefit, bank) {
    if (!benefit || !bank) return null;
    const frequency = benefit.frequencyDays || 31;
    const term = BANK_TERMS.find((entry) => entry.days >= frequency) || BANK_TERMS[BANK_TERMS.length - 1];
    const apr = bank.aprByDays[term.days] || 0;
    return {
      termDays: term.days,
      termLabel: term.label,
      apr,
      beatsBenefit: benefit.annualRoi > 0 && apr > benefit.annualRoi,
      actionable: benefit.annualRoi > 0 && apr > benefit.annualRoi && !bank.activeInvestment
    };
  }

  function enrichBenefit(stock, bank) {
    if (!stock.benefit) return null;
    const benefit = { ...stock.benefit };
    benefit.blockCost = benefit.requirement > 0 && stock.price > 0 ? benefit.requirement * stock.price : 0;
    benefit.annualRoi = benefit.annualValue > 0 && benefit.blockCost > 0 ? (benefit.annualValue / benefit.blockCost) * 100 : 0;
    benefit.bankComparison = getComparableBankApr(benefit, bank);
    return benefit;
  }

  // ---------------------------------------------------------------------------
  // Portfolio analysis module
  // ---------------------------------------------------------------------------

  function analyzeStock(stock, holding, userCash, bank, tornsyData) {
    const benefit = enrichBenefit(stock, bank);
    const position = holding ? analyzePosition(stock, holding, benefit) : null;
    const technicals = analyzeTechnicals(tornsyData[stock.acronym], getProfile().rsiPeriod);
    const memory = getObservedMemory(stock.acronym);
    const topUp = analyzeTopUp(stock, position, benefit, userCash);

    return {
      ...stock,
      benefit,
      position,
      technicals,
      memory,
      topUp,
      locked: isStockLocked(stock.id),
      bank,
      userCash
    };
  }

  function analyzePosition(stock, holding, benefit) {
    const transactions = holding.transactions && typeof holding.transactions === 'object'
      ? Object.values(holding.transactions)
      : [];
    let transactionShares = 0;
    let transactionCost = 0;
    transactions.forEach((transaction) => {
      const shares = parseNumber(transaction.shares);
      const price = parseNumber(transaction.bought_price ?? transaction.price);
      transactionShares += shares;
      transactionCost += shares * price;
    });

    const apiShares = parseNumber(holding.total_shares ?? holding.shares ?? holding.quantity);
    const totalShares = apiShares > 0 ? apiShares : transactionShares;
    let costBasis = transactionCost;
    if (transactionShares > totalShares && transactionShares > 0) {
      costBasis *= totalShares / transactionShares;
    }
    if (costBasis <= 0 && parseNumber(holding.average_price) > 0) {
      costBasis = totalShares * parseNumber(holding.average_price);
    }

    const averageBuyPrice = totalShares > 0 ? costBasis / totalShares : 0;
    const currentValue = totalShares * stock.price;
    const sellFee = currentValue * (APP.sellFeePct / 100);
    const sellProceeds = Math.max(0, currentValue - sellFee);
    const grossProfitLoss = currentValue - costBasis;
    const profitLoss = sellProceeds - costBasis;
    const profitLossPct = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;
    const progress = computeBenefitProgress(totalShares, benefit);
    const dividend = holding.dividend || {};
    const dividendReady = parseNumber(dividend.ready) > 0 || dividend.ready === true;
    const dividendProgress = dividend.progress != null && dividend.frequency != null
      ? `${dividend.progress}/${dividend.frequency}d`
      : '';
    const highTier = benefit && (benefit.tier === 'S' || benefit.tier === 'A');
    const partialThreshold = highTier ? APP.partialHighTierMinPct : APP.partialBenefitMinPct;
    const isPartialBenefit = !!benefit
      && benefit.requirement > 0
      && totalShares > 0
      && totalShares < benefit.requirement
      && progress.progressPct >= partialThreshold;

    return {
      totalShares,
      averageBuyPrice,
      currentValue,
      sellFee,
      sellProceeds,
      costBasis,
      grossProfitLoss,
      profitLoss,
      profitLossPct,
      hasBenefit: progress.blockCount > 0,
      blockCount: progress.blockCount,
      sharesAboveBlock: progress.sharesAboveBlock,
      sharesToNextBlock: progress.sharesToNextBlock,
      benefitProgressPct: progress.progressPct,
      isPartialBenefit,
      dividendReady,
      dividendProgress
    };
  }

  // ---------------------------------------------------------------------------
  // Gym analysis module
  // ---------------------------------------------------------------------------

  function normalizeGymData(raw) {
    const user = raw && raw.user ? raw.user : {};
    const stats = normalizeBattleStats(user);
    const bars = normalizeBars(user);
    const items = normalizeBoostItems(raw && raw.items ? raw.items : {});
    const build = getGymBuild();
    const currentGym = getSelectedGym();
    const recommendation = buildGymRecommendation(stats, build.target, currentGym, bars);
    return {
      stats,
      bars,
      items,
      build,
      currentGym,
      recommendation,
      warnings: raw.warnings || []
    };
  }

  function normalizeBattleStats(user) {
    const manual = state.gym.manualStats || {};
    const apiStats = {
      strength: parseNumber(user.strength ?? (user.battlestats && user.battlestats.strength)),
      speed: parseNumber(user.speed ?? (user.battlestats && user.battlestats.speed)),
      defense: parseNumber(user.defense ?? (user.battlestats && user.battlestats.defense)),
      dexterity: parseNumber(user.dexterity ?? (user.battlestats && user.battlestats.dexterity))
    };
    const output = {};
    GYM_STATS.forEach((stat) => {
      output[stat] = apiStats[stat] > 0 ? apiStats[stat] : parseNumber(manual[stat]);
    });
    return output;
  }

  function normalizeBars(user) {
    const energy = user.energy || {};
    const nerve = user.nerve || {};
    const happy = user.happy || {};
    return {
      energy: {
        current: parseNumber(energy.current ?? energy.now),
        maximum: parseNumber(energy.maximum ?? energy.max)
      },
      nerve: {
        current: parseNumber(nerve.current ?? nerve.now),
        maximum: parseNumber(nerve.maximum ?? nerve.max)
      },
      happy: {
        current: parseNumber(happy.current ?? happy.now),
        maximum: parseNumber(happy.maximum ?? happy.max)
      },
      money: parseNumber(user.money_onhand ?? user.money)
    };
  }

  function normalizeBoostItems(items) {
    const allItems = Object.values(items || {});
    return GYM_BOOST_ITEMS.map((boost) => {
      const match = allItems.find((item) => String(item.name || '').toLowerCase() === boost.name.toLowerCase())
        || allItems.find((item) => String(item.name || '').toLowerCase().includes(boost.name.toLowerCase()));
      return {
        ...boost,
        name: match && match.name ? String(match.name) : boost.name,
        value: match ? parseNumber(match.market_value ?? match.value ?? match.price) : 0
      };
    });
  }

  function getGymBuild() {
    if (String(state.gym.buildKey || '').startsWith('saved:')) {
      const id = String(state.gym.buildKey).slice(6);
      const saved = (state.gym.customBuilds || []).find((build) => build.id === id);
      if (saved) {
        return {
          key: `saved:${saved.id}`,
          label: saved.name || 'Saved build',
          target: normalizeGymTarget(saved.target),
          note: 'Your saved custom build.'
        };
      }
    }
    if (state.gym.buildKey === 'custom') {
      return {
        key: 'custom',
        label: state.gym.customBuildName || 'Custom',
        target: normalizeGymTarget(state.gym.target),
        note: 'Your custom saved build target.'
      };
    }
    return GYM_BUILDS[state.gym.buildKey] || GYM_BUILDS.balanced;
  }

  function normalizeGymTarget(target) {
    const cleaned = {};
    let total = 0;
    GYM_STATS.forEach((stat) => {
      cleaned[stat] = Math.max(0, parseNumber(target && target[stat]));
      total += cleaned[stat];
    });
    if (total <= 0) return { ...DEFAULT_GYM_STATE.target };
    GYM_STATS.forEach((stat) => {
      cleaned[stat] = Math.round((cleaned[stat] / total) * 100);
    });
    return cleaned;
  }

  function getSelectedGym() {
    return GYM_DATABASE.find((gym) => gym.name === state.gym.selectedGym) || GYM_DATABASE.find((gym) => gym.name === "George's") || GYM_DATABASE[0];
  }

  function buildGymRecommendation(stats, target, gym, bars) {
    const total = GYM_STATS.reduce((sum, stat) => sum + Math.max(0, stats[stat]), 0);
    const gaps = GYM_STATS.map((stat) => {
      const actualPct = total > 0 ? (stats[stat] / total) * 100 : 0;
      const targetPct = parseNumber(target[stat]);
      const gap = targetPct - actualPct;
      const gymGain = gym && gym.gains ? gym.gains[stat] || 0 : 0;
      return { stat, actualPct, targetPct, gap, gymGain };
    }).sort((a, b) => b.gap - a.gap || b.gymGain - a.gymGain);

    const bestNeed = gaps[0];
    const bestGym = bestGymForStat(bestNeed.stat);
    const bestAvailableGym = bestAvailableGymForStat(bestNeed.stat);
    const trainsNow = gym && gym.energy > 0 ? Math.floor((bars.energy.current || 0) / gym.energy) : 0;
    return {
      stat: bestNeed.stat,
      gap: bestNeed.gap,
      actualPct: bestNeed.actualPct,
      targetPct: bestNeed.targetPct,
      currentGymGain: bestNeed.gymGain,
      bestGym,
      bestAvailableGym,
      trainsNow,
      message: `${statLabel(bestNeed.stat)} is furthest below target (${bestNeed.actualPct.toFixed(1)}% now vs ${bestNeed.targetPct.toFixed(0)}% target).`
    };
  }

  function bestGymForStat(stat) {
    return GYM_DATABASE
      .filter((gym) => gym.gains[stat] > 0)
      .slice()
      .sort((a, b) => b.gains[stat] - a.gains[stat] || a.energy - b.energy)[0];
  }

  function getAvailableGymNames() {
    return Array.isArray(state.gym.availableGyms) ? state.gym.availableGyms : [];
  }

  function isGymMarkedAvailable(gymName) {
    const names = getAvailableGymNames();
    return !names.length || names.includes(gymName);
  }

  function bestAvailableGymForStat(stat) {
    const marked = getAvailableGymNames();
    const pool = marked.length
      ? GYM_DATABASE.filter((gym) => marked.includes(gym.name))
      : GYM_DATABASE;
    return pool
      .filter((gym) => gym.gains[stat] > 0)
      .slice()
      .sort((a, b) => b.gains[stat] - a.gains[stat] || a.energy - b.energy)[0] || bestGymForStat(stat);
  }

  function statLabel(stat) {
    return {
      strength: 'Strength',
      speed: 'Speed',
      defense: 'Defense',
      dexterity: 'Dexterity'
    }[stat] || stat;
  }

  function totalBattleStats(stats) {
    return GYM_STATS.reduce((sum, stat) => sum + Math.max(0, parseNumber(stats && stats[stat])), 0);
  }

  function getKnownItemRecords() {
    const rawItems = (state.utilityData && state.utilityData.items)
      || (state.gymRaw && state.gymRaw.items)
      || {};
    const rows = Object.entries(rawItems || {}).map(([id, item]) => ({
      id,
      name: String(item && item.name ? item.name : '').trim(),
      category: String(item && (item.type || item.category || item.item_type || item.itemType || item.kind) ? (item.type || item.category || item.item_type || item.itemType || item.kind) : 'Other').trim() || 'Other',
      value: parseNumber(item && (item.market_value ?? item.marketValue ?? item.value ?? item.sell_price ?? item.buy_price))
    })).filter((item) => item.name);
    const names = new Set(rows.map((item) => item.name.toLowerCase()));
    LOCAL_ITEM_RECORDS.forEach((item) => {
      if (!names.has(item.name.toLowerCase())) rows.push({ ...item });
    });
    return rows;
  }

  function scanVisibleInventoryStacks() {
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    if (!document.body) return [];
    const rows = Array.from(document.querySelectorAll('li, tr, [class*="row"], [class*="item"], [class*="inventory"]'))
      .filter((node) => !node.closest(`#${APP.id}, #${APP.id}-modal, script, style, noscript`))
      .filter((node) => {
        const rect = node.getBoundingClientRect ? node.getBoundingClientRect() : null;
        return !rect || (rect.width > 20 && rect.height > 8);
      })
      .map((node) => normalizeInventoryRowText(node))
      .filter((text) => text.length >= 4 && text.length <= 320 && /\$|x\s*[\d,]+|[\d,]+\s*x/i.test(text));
    const uniqueRows = Array.from(new Set(rows)).slice(0, 700);
    const grouped = new Map();

    uniqueRows.forEach((text) => {
      const lower = text.toLowerCase();
      const item = known.find((candidate) => lower.includes(candidate.name.toLowerCase())) || inferInventoryItemFromRow(text);
      if (!item || !item.name) return;
      const quantity = extractQuantityNearItem(text, item.name);
      const value = parseNumber(item.value) || extractInventoryEachValue(text, quantity);
      if (!value) return;
      const current = grouped.get(item.name);
      const nextQuantity = Math.max(quantity, current ? current.quantity : 0);
      grouped.set(item.name, {
        name: item.name,
        quantity: nextQuantity || 1,
        value,
        total: (nextQuantity || 1) * value
      });
    });

    return Array.from(grouped.values())
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
  }

  function normalizeInventoryRowText(node) {
    return (node.innerText || node.textContent || '')
      .replace(/\b(send|trade|use|delete|trash|bazaar|market|favorite|equip|unequip)\b/ig, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inferInventoryItemFromRow(text) {
    if (!/\$/.test(text)) return null;
    const beforeMoney = text.split('$')[0]
      .replace(/\b\d+\s*[HhNn]\b/g, ' ')
      .replace(/\bx\s*[\d,]+/ig, ' ')
      .replace(/\b[\d,]+\s*x\b/ig, ' ')
      .replace(/\b\d+(?:\.\d+)?\b/g, ' ')
      .replace(/[|=•]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const words = beforeMoney.split(' ').filter(Boolean);
    if (!words.length || words.length > 6) return null;
    const name = words.join(' ');
    const value = extractInventoryEachValue(text, extractQuantityNearItem(text, name));
    return value ? { name, value } : null;
  }

  function extractInventoryEachValue(text, quantity = 1) {
    const prices = Array.from(String(text || '').matchAll(/\$([\d,.]+[kmbt]?)/gi)).map((match) => parseMoneyText(match[1])).filter((value) => value > 0);
    if (!prices.length) return 0;
    const qty = Math.max(1, parseNumber(quantity));
    const totalMatch = String(text || '').match(/([\d,]+)\s*x\s*=\s*\$([\d,.]+[kmbt]?)/i);
    if (totalMatch) {
      const totalQty = Math.max(1, parseNumber(totalMatch[1]));
      const total = parseMoneyText(totalMatch[2]);
      if (total > 0) return Math.round(total / totalQty);
    }
    if (prices.length > 1 && qty > 1) return Math.min(...prices);
    return prices[0];
  }

  function getIgnoredItemSet() {
    return new Set((state.utility.ignoredItems || []).map((name) => String(name).toLowerCase()));
  }

  function sortRows(rows, key, dir, fallbackKey = 'name') {
    const direction = dir === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const av = a[key];
      const bv = b[key];
      const numeric = typeof av === 'number' || typeof bv === 'number';
      if (numeric) {
        const diff = (parseNumber(av) - parseNumber(bv)) * direction;
        if (diff) return diff;
      } else {
        const diff = String(av || '').localeCompare(String(bv || '')) * direction;
        if (diff) return diff;
      }
      return String(a[fallbackKey] || '').localeCompare(String(b[fallbackKey] || ''));
    });
  }

  function sortHeader(label, table, key) {
    const currentKey = table === 'inventory' ? state.utility.inventorySortKey : state.utility.citySortKey;
    const currentDir = table === 'inventory' ? state.utility.inventorySortDir : state.utility.citySortDir;
    const marker = currentKey === key ? (currentDir === 'asc' ? ' ^' : ' v') : '';
    return `<button class="fluz-sort-head" data-action="sort-utility-table" data-sort-table="${escapeHtml(table)}" data-sort-key="${escapeHtml(key)}">${escapeHtml(label)}${marker}</button>`;
  }

  function itemProfitKey(itemName) {
    return String(itemName || '').trim().toLowerCase();
  }

  function getItemProfitPct(itemName, fallback = 0) {
    const key = itemProfitKey(itemName);
    const stored = state.utility.itemProfitPcts && Object.prototype.hasOwnProperty.call(state.utility.itemProfitPcts, key)
      ? state.utility.itemProfitPcts[key]
      : fallback;
    return parseNumber(stored);
  }

  function extractQuantityNearItem(text, itemName) {
    const itemPattern = escapeRegExp(itemName);
    const patterns = [
      new RegExp(`(?:x|qty|quantity|amount|owned)\\s*:?\\s*([\\d,]+)`, 'i'),
      new RegExp(`([\\d,]+)\\s*(?:x|pcs|units)\\b`, 'i'),
      new RegExp(`${itemPattern}.{0,80}?([\\d,]+)\\s*(?:x|pcs|units)\\b`, 'i'),
      new RegExp(`([\\d,]+)\\s*(?:x|pcs|units)?.{0,80}?${itemPattern}`, 'i')
    ];
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && parseNumber(match[1]) > 0 && parseNumber(match[1]) < 100000000) return parseNumber(match[1]);
    }
    return 1;
  }

  function extractVisibleLabelNumber(label) {
    const text = (document.body && document.body.innerText ? document.body.innerText : '').replace(/\s+/g, ' ');
    const pattern = new RegExp(`${escapeRegExp(label)}\\s*:?\\s*\\$?([\\d,.]+[kmbt]?)`, 'i');
    const match = text.match(pattern);
    return match ? parseMoneyText(match[1]) : 0;
  }

  function itemMarketUrl(itemName) {
    const name = cleanBookieText(itemName);
    const known = itemIdForName(name);
    if (known) return `https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&itemID=${encodeURIComponent(String(known))}`;
    return `https://www.torn.com/page.php?sid=ItemMarket#/market/view=search&keyword=${encodeURIComponent(name)}`;
  }

  function itemIdForName(itemName) {
    const key = cleanBookieText(itemName).toLowerCase();
    if (!key) return 0;
    if (COMMON_ITEM_IDS[key]) return COMMON_ITEM_IDS[key];
    const travel = TRAVEL_ITEM_CATALOG.find((item) => item.name.toLowerCase() === key);
    if (travel && travel.id) return travel.id;
    const known = getKnownItemRecords().find((item) => String(item.name || '').toLowerCase() === key);
    return known && known.id ? known.id : 0;
  }

  function analyzeTopUp(stock, position, benefit, userCash) {
    if (!position || !benefit || !position.isPartialBenefit) return null;
    const sharesNeeded = position.sharesToNextBlock;
    const cost = sharesNeeded * stock.price;
    return {
      sharesNeeded,
      cost,
      affordable: userCash.immediate >= cost,
      affordableWithCayman: userCash.totalIncludingCayman >= cost,
      shortfall: Math.max(0, cost - userCash.immediate)
    };
  }

  function isStockLocked(stockId) {
    return state.settings.lockedStocks.includes(String(stockId));
  }

  async function toggleStockLock(stockId) {
    const id = String(stockId);
    const set = new Set(state.settings.lockedStocks.map(String));
    if (set.has(id)) set.delete(id);
    else set.add(id);
    state.settings.lockedStocks = Array.from(set);
    await saveSettings();
    await refreshAnalysisOnly();
  }

  // ---------------------------------------------------------------------------
  // Recommendation engine
  // ---------------------------------------------------------------------------

  function buildRecommendations(analyses, data) {
    const profile = getProfile();
    const strategy = getStrategy();
    const recommendations = [];
    const ignoreBenefits = benefitsAreIgnored();
    const rebalanceTargets = ignoreBenefits ? [] : findRebalanceTargets(analyses, data.userCash, profile);

    analyses.forEach((stock) => {
      recommendations.push(...recommendHeldStockSignals(stock, profile, strategy, ignoreBenefits));
      if (!ignoreBenefits) recommendations.push(...recommendBenefitSignals(stock, data.userCash, profile, strategy, rebalanceTargets));
      recommendations.push(...recommendTechnicalSignals(stock, profile, strategy, ignoreBenefits));
    });

    recommendations.push(...rebalanceTargets.map((target) => createRecommendation({
      action: 'REBALANCE',
      stock: target.stock,
      priority: 62 + target.priorityBoost + profile.rebalanceBoost,
      reason: `Selling weaker unlocked holdings could raise ${formatMoney(target.shortfall)} and unlock ${target.stock.acronym}'s ${target.benefitLabel}. Review manually before moving money.`,
      details: target.sellIdeas.map((idea) => `${idea.acronym} ${formatMoney(idea.value)}`).join(', ')
    })));

    recommendations.push(...buildBestNextBuyRecommendation(analyses, data, profile, strategy, ignoreBenefits));
    recommendations.push(...buildHeldStockCoverageRecommendations(analyses, recommendations, ignoreBenefits));

    return dedupeRecommendations(recommendations)
      .sort((a, b) => b.priority - a.priority || actionUrgency(b.action) - actionUrgency(a.action) || a.stock.acronym.localeCompare(b.stock.acronym));
  }

  function actionUrgency(action) {
    const weights = {
      'SELL NOW': 100,
      CLAIM: 95,
      SELL: 90,
      'SELL SOON': 82,
      'SELL EXTRA': 78,
      REBALANCE: 72,
      'TOP UP': 68,
      'BEST BUY': 64,
      'BUY MORE': 62,
      BUY: 60,
      'BUY DIP': 56,
      'MAYBE BUY': 46,
      DECIDE: 42,
      CHECK: 38,
      'SAVE TOWARD': 30,
      WAIT: 22,
      HOLD: 12,
      KEEP: 10,
      WATCH: 8
    };
    return weights[action] || 0;
  }

  function buildBestNextBuyRecommendation(analyses, data, profile, strategy, ignoreBenefits) {
    if (!analyses.length) return [];
    const candidates = analyses
      .map((stock) => scoreNextBuyCandidate(stock, data, profile, strategy, ignoreBenefits))
      .filter((candidate) => candidate.score >= 34)
      .sort((a, b) => b.score - a.score || a.stock.acronym.localeCompare(b.stock.acronym));

    const best = candidates[0];
    if (!best) return [];

    const cash = data.userCash ? data.userCash.immediate : 0;
    const sharesNow = best.stock.price > 0 ? Math.floor(cash / best.stock.price) : 0;
    const alreadyHeld = !!best.stock.position;
    const action = alreadyHeld
      ? (best.score >= 68 ? 'BUY MORE' : 'MAYBE BUY')
      : (best.score >= 68 ? 'BEST BUY' : 'MAYBE BUY');
    const buyingPhrase = sharesNow > 0
      ? `Your current buying power can ${alreadyHeld ? 'add' : 'buy'} about ${compactNumber(sharesNow)} shares.`
      : `If you add cash now, this is the strongest ${alreadyHeld ? 'add-more' : 'next'} target by the current settings.`;

    return [createRecommendation({
      action,
      stock: best.stock,
      priority: Math.round(clamp(best.score, 45, 92)),
      reason: `${buyingPhrase} ${best.reason}`,
      details: best.details.join(' | ')
    })];
  }

  function scoreNextBuyCandidate(stock, data, profile, strategy, ignoreBenefits) {
    const cash = data.userCash ? data.userCash.immediate : 0;
    const portfolioValue = analysesPortfolioValue(data.analyses);
    const positionValue = stock.position ? stock.position.currentValue : 0;
    const concentration = portfolioValue > 0 ? positionValue / portfolioValue : 0;
    const technicals = stock.technicals;
    const memory = stock.memory || {};
    const momentum = technicals ? technicals.momentumScore : memory.slope || 0;
    const rsi = technicals ? technicals.rsi : null;
    const change7d = technicals && technicals.change7d != null ? technicals.change7d : memory.change7d;
    const change30d = technicals && technicals.change30d != null ? technicals.change30d : memory.change30d;
    const heldCount = data.analyses.filter((item) => item.position).length;
    const maxComfortableHoldings = strategy.key === 'trader' || state.settings.riskLevel >= 70 ? 12 : state.settings.riskLevel <= 35 ? 5 : 8;
    const reasons = [];
    const details = [];
    let score = 36;

    if (stock.price > 0 && cash >= stock.price) {
      score += 7;
      details.push(`${compactNumber(Math.floor(cash / stock.price))} shares affordable`);
    } else if (cash > 0) {
      score -= 4;
      details.push(`needs ${formatMoney(Math.max(0, stock.price - cash))} for 1 share`);
    }

    if (technicals) {
      score += momentum * 14 * strategy.technicalWeight;
      reasons.push(`momentum is ${technicals.signal}`);
      if (rsi != null) {
        if (rsi <= 30) { score += 14; details.push(`RSI ${Math.round(rsi)} cheap`); }
        else if (rsi <= 42) { score += 8; details.push(`RSI ${Math.round(rsi)}`); }
        else if (rsi >= 78) { score -= 18; details.push(`RSI ${Math.round(rsi)} hot`); }
        else if (rsi >= 68) { score -= 8; details.push(`RSI ${Math.round(rsi)} high`); }
      }
      if (change7d != null && change7d < 0 && momentum > 0.4) {
        score += 10;
        details.push('dip recovery');
      }
      if (change7d != null && change7d < -4 && momentum < -0.4) {
        score -= 12;
        details.push('falling week');
      }
      if (change30d != null && change30d > 0 && momentum >= 0) score += 4;
    } else if (memory.samples >= 3) {
      score += clamp(memory.slope || 0, -2, 2) * 8;
      reasons.push('local price memory is being used');
      details.push(`${memory.samples} memory points`);
    } else {
      score -= 10;
      reasons.push('technical data is thin');
    }

    if (!ignoreBenefits && stock.benefit) {
      const benefitStillMarginal = !stock.position
        || !stock.position.hasBenefit
        || (stock.benefit.type === 'active' && stock.position.sharesToNextBlock > 0);
      if (stock.benefit.annualRoi > 0) {
        if (benefitStillMarginal) {
          const roiBoost = Math.min(18, stock.benefit.annualRoi) * strategy.benefitWeight;
          score += roiBoost;
          details.push(`${formatPct(stock.benefit.annualRoi)} benefit ROI`);
        } else {
          details.push('benefit already active');
        }
      }
      if (benefitStillMarginal && stock.benefit.tier === 'S') { score += 8 * strategy.benefitWeight; details.push('S-tier benefit'); }
      if (benefitStillMarginal && stock.benefit.tier === 'A') { score += 5 * strategy.benefitWeight; details.push('A-tier benefit'); }
    }

    if (stock.position) {
      details.push(`held ${compactNumber(stock.position.totalShares)} shares`);
      if (stock.position.profitLossPct < -1 && momentum <= 0) score -= 12;
      if (stock.position.profitLossPct > 0 && momentum > 0.5) score += 4;
      if (concentration > 0.4) score -= state.settings.riskLevel >= 75 ? 10 : 22;
      else if (concentration > 0.25) score -= state.settings.riskLevel >= 75 ? 4 : 12;
      else if (concentration > 0.15) score -= state.settings.riskLevel >= 75 ? 0 : 4;
      else { score += 3; details.push('room to add'); }
    } else {
      score += heldCount >= maxComfortableHoldings ? -6 : 5;
      details.push('new position');
    }

    if (stock.locked) score -= 3;
    score += (state.settings.riskLevel - 50) / 10;

    if (!reasons.length) reasons.push('it has the best combined score right now');
    return {
      stock,
      score,
      reason: `Best next-money score: ${reasons.join(', ')}.`,
      details
    };
  }

  function analysesPortfolioValue(analyses) {
    return (analyses || []).reduce((sum, stock) => sum + (stock.position ? stock.position.currentValue : 0), 0);
  }

  function buildHeldStockCoverageRecommendations(analyses, recommendations, ignoreBenefits) {
    const coveredIds = new Set(recommendations.map((recommendation) => String(recommendation.stock.id)));
    return analyses
      .filter((stock) => stock.position)
      .filter((stock) => !coveredIds.has(String(stock.id)))
      .map((stock) => createRecommendation({
        action: 'HOLD',
        stock,
        priority: 18,
        reason: heldStockCoverageReason(stock, ignoreBenefits)
      }));
  }

  function heldStockCoverageReason(stock, ignoreBenefits) {
    const position = stock.position;
    const parts = [`Currently held. Net P/L after ${APP.sellFeePct}% sell fee is ${formatPct(position.profitLossPct)}.`];
    if (!ignoreBenefits && position.hasBenefit) {
      parts.push(`Benefit is active: ${payoutStatusText(position)}.`);
    } else if (!ignoreBenefits && position.isPartialBenefit) {
      parts.push(`Partial benefit progress is ${Math.floor(position.benefitProgressPct)}%.`);
    } else if (stock.technicals) {
      parts.push(`Momentum is ${stock.technicals.signal}.`);
    } else if (stock.memory && stock.memory.samples >= 3) {
      parts.push('Using local price memory until stronger technical data is available.');
    } else {
      parts.push('No urgent buy/sell trigger right now.');
    }
    if (stock.locked) parts.push('Locked stock: sell/rebalance advice is protected.');
    return parts.join(' ');
  }

  function recommendHeldStockSignals(stock, profile, strategy, ignoreBenefits) {
    const recs = [];
    const position = stock.position;
    if (!position) return recs;

    const committedToBenefit = !ignoreBenefits && (position.hasBenefit || position.isPartialBenefit);
    const locked = stock.locked;
    const momentum = stock.technicals ? stock.technicals.momentumScore : 0;

    if (!ignoreBenefits && position.dividendReady) {
      recs.push(createRecommendation({
        action: 'CLAIM',
        stock,
        priority: 100,
        reason: 'A stock benefit payout appears ready. Claim it manually on Torn.'
      }));
    }

    if (!ignoreBenefits && !locked && position.hasBenefit && position.sharesAboveBlock > 0 && position.profitLossPct > 1) {
      recs.push(createRecommendation({
        action: 'SELL EXTRA',
        stock,
        priority: 58 + Math.min(25, position.profitLossPct),
        reason: `Net after ${APP.sellFeePct}% sell fee, you are up ${formatPct(position.profitLossPct)} and hold ${compactNumber(position.sharesAboveBlock)} extra shares above the completed block.`
      }));
    }

    if (!locked && !committedToBenefit && position.profitLossPct >= profile.sellProfitPct) {
      recs.push(createRecommendation({
        action: 'SELL',
        stock,
        priority: 50 + Math.min(30, position.profitLossPct) + strategy.profitTargetBoost,
        reason: `Net after ${APP.sellFeePct}% sell fee, you are up ${formatPct(position.profitLossPct)} with no active benefit commitment. Consider taking profit manually.`
      }));
    }

    if (!locked && !committedToBenefit && position.profitLossPct <= profile.sellLossPct && momentum <= -0.5) {
      recs.push(createRecommendation({
        action: 'SELL NOW',
        stock,
        priority: 72 + Math.min(20, Math.abs(position.profitLossPct)) + strategy.lossCutBoost,
        reason: `Net after ${APP.sellFeePct}% sell fee, you are down ${formatPct(Math.abs(position.profitLossPct))} and momentum is ${stock.technicals ? stock.technicals.signal : 'weak'}. Consider cutting the loss.`
      }));
    }

    if (!locked && !committedToBenefit && position.profitLossPct <= profile.checkLossPct && momentum > -0.5) {
      recs.push(createRecommendation({
        action: 'CHECK',
        stock,
        priority: 38,
        reason: `This holding is down ${formatPct(Math.abs(position.profitLossPct))} after sell fee. Review whether it still fits your plan.`
      }));
    }

    if (!ignoreBenefits && position.hasBenefit && position.profitLossPct >= profile.keepLossFloorPct) {
      let reason = `Benefit is active. Net P/L after sell fee is ${formatPct(position.profitLossPct)} and payout status is ${payoutStatusText(position)}.`;
      if (stock.benefit && stock.benefit.bankComparison && stock.benefit.bankComparison.beatsBenefit) {
        const bank = stock.benefit.bankComparison;
        reason += stock.bank.activeInvestment
          ? ` Bank ${bank.termLabel} APR (${bank.apr.toFixed(1)}%) beats the estimated benefit ROI, but your bank investment is locked.`
          : ` Bank ${bank.termLabel} APR (${bank.apr.toFixed(1)}%) beats the estimated benefit ROI, so compare before adding more.`;
      }
      recs.push(createRecommendation({
        action: 'KEEP',
        stock,
        priority: 12,
        reason
      }));
    }

    if (locked && !position.dividendReady) {
      recs.push(createRecommendation({
        action: 'KEEP',
        stock,
        priority: 8,
        reason: 'This stock is locked in FLUZ settings, so sell and rebalance advice is suppressed.'
      }));
    }

    return recs;
  }

  function recommendBenefitSignals(stock, userCash, profile, strategy, rebalanceTargets) {
    const recs = [];
    const benefit = stock.benefit;
    if (!benefit || benefit.requirement <= 0) return recs;

    const position = stock.position;
    const tier = benefit.tier;
    const highTier = tier === 'S' || tier === 'A';
    const bankBeats = benefit.bankComparison && benefit.bankComparison.actionable;
    const hasRebalancePath = rebalanceTargets.some((target) => target.stock.id === stock.id);

    if (position && position.isPartialBenefit && stock.topUp) {
      const progress = Math.floor(position.benefitProgressPct);
      const label = benefitLabel(stock);
      if (stock.topUp.affordable) {
        recs.push(createRecommendation({
          action: 'TOP UP',
          stock,
          priority: 66 + (benefitPriorityBoost(stock, profile) * strategy.benefitWeight),
          reason: `You have ${progress}% of ${label}. Add ${compactNumber(stock.topUp.sharesNeeded)} shares for ${formatMoney(stock.topUp.cost)} to complete it.`
        }));
      } else {
        const action = position.profitLossPct > profile.sellProfitPct ? 'DECIDE' : 'WAIT';
        recs.push(createRecommendation({
          action,
          stock,
          priority: action === 'DECIDE' ? 48 : 32,
          reason: `Partial block is not earning yet. Top up costs ${formatMoney(stock.topUp.cost)}, short ${formatMoney(stock.topUp.shortfall)}. ${stock.topUp.affordableWithCayman ? 'Cayman funds may cover it after delay.' : 'Save toward it or rethink the position.'}`
        }));
      }
      return recs;
    }

    const ownedEnough = position && position.hasBenefit;
    if (ownedEnough) return recs;

    const sharesNeeded = position ? Math.max(0, benefit.requirement - position.totalShares) : benefit.requirement;
    const buyCost = sharesNeeded * stock.price;
    const affordable = buyCost <= userCash.immediate || userCash.immediate <= 0;
    const roiGood = benefit.annualRoi >= 15;
    const roiDecent = benefit.annualRoi >= 5;
    const priorityBoost = benefitPriorityBoost(stock, profile);

    if (bankBeats && !highTier) {
      recs.push(createRecommendation({
        action: 'WATCH',
        stock,
        priority: 18,
        reason: `Estimated benefit ROI is ${formatPct(benefit.annualRoi)}, but bank APR currently looks better.`
      }));
      return recs;
    }

    if ((highTier || roiGood) && affordable) {
      recs.push(createRecommendation({
        action: 'BUY',
        stock,
        priority: 58 + (priorityBoost * strategy.benefitWeight),
        reason: `${benefitLabel(stock)} looks strong. Need ${compactNumber(sharesNeeded)} shares, around ${formatMoney(buyCost)}.`
      }));
    } else if (roiDecent && affordable) {
      recs.push(createRecommendation({
        action: 'MAYBE BUY',
        stock,
        priority: 34 + Math.min(20, benefit.annualRoi * strategy.benefitWeight),
        reason: `Decent estimated ROI at ${formatPct(benefit.annualRoi)}. Compare against your bank and goals before buying.`
      }));
    } else if ((highTier || roiGood) && !hasRebalancePath) {
      const closeEnough = buyCost <= Math.max(userCash.immediate * 1.5, userCash.totalIncludingCayman);
      if (closeEnough || highTier) {
        recs.push(createRecommendation({
          action: 'SAVE TOWARD',
          stock,
          priority: 28 + (highTier ? 15 : 0),
          reason: `${benefitLabel(stock)} is worth tracking, but the block costs about ${formatMoney(buyCost)}.`
        }));
      }
    }

    return recs;
  }

  function recommendTechnicalSignals(stock, profile, strategy, ignoreBenefits) {
    const recs = [];
    const technicals = stock.technicals;
    const memory = stock.memory || {};
    if (!technicals && (!memory.samples || memory.samples < 3)) return recs;

    const position = stock.position;
    const committed = position && !ignoreBenefits && (position.hasBenefit || position.isPartialBenefit);
    const momentum = technicals ? technicals.momentumScore : memory.slope;
    const rsi = technicals ? technicals.rsi : null;
    const signal = technicals ? technicals.signal : memory.slope > 0.25 ? 'Observed Up' : memory.slope < -0.25 ? 'Observed Down' : 'Observed Flat';
    const rangePosition = technicals ? technicals.rangePosition : 50;
    const change7d = technicals && technicals.change7d != null ? technicals.change7d : memory.change7d;
    const change30d = technicals && technicals.change30d != null ? technicals.change30d : memory.change30d;

    if (profile.buyDip && !position && momentum >= strategy.buyDipMinMomentum && (rsi == null || rsi < 45)) {
      recs.push(createRecommendation({
        action: 'BUY DIP',
        stock,
        priority: 44 + (momentum * 6 * strategy.technicalWeight) + profile.buyDipBoost,
        reason: rsi == null
          ? `Observed local price memory is turning up (${signal}). This may be a trade entry, but confirm manually.`
          : `Momentum is ${signal}, RSI is ${rsi.toFixed(0)}, and the price may be recovering from a dip.`
      }));
    }

    if (profile.sellSoon && position && !committed && !stock.locked && position.profitLossPct > 0.5 && rangePosition > 75 && momentum <= 0.5) {
      recs.push(createRecommendation({
        action: 'SELL SOON',
        stock,
        priority: 48 + profile.sellSoonBoost + strategy.profitTargetBoost,
        reason: `Net after ${APP.sellFeePct}% sell fee, you are up ${formatPct(position.profitLossPct)} and price is high in its 30-day range. Momentum may be fading.`
      }));
    }

    if (position && !committed && !stock.locked && rsi != null && rsi > 75 && position.profitLossPct >= 1) {
      recs.push(createRecommendation({
        action: 'SELL SOON',
        stock,
        priority: 46 + profile.sellSoonBoost + strategy.profitTargetBoost,
        reason: `RSI is ${rsi.toFixed(0)} and you are net profitable after sell fee. Watch for a pullback.`
      }));
    }

    if (position && !committed && !stock.locked && position.profitLossPct > 0 && change30d != null && change30d > 8 && change7d != null && change7d < 1) {
      recs.push(createRecommendation({
        action: 'WATCH',
        stock,
        priority: 31,
        reason: `The 30-day move is ${formatPct(change30d)}, but the last 7 days slowed to ${formatPct(change7d)}.`
      }));
    }

    return recs;
  }

  function findRebalanceTargets(analyses, userCash, profile) {
    if (!profile.rebalance) return [];

    const sellIdeas = analyses
      .filter((stock) => stock.position && !stock.locked)
      .filter((stock) => !stock.position.hasBenefit && !stock.position.isPartialBenefit)
      .filter((stock) => stock.position.profitLossPct > profile.sellProfitPct || (stock.technicals && stock.technicals.momentumScore < -0.5))
      .map((stock) => ({
        id: stock.id,
        acronym: stock.acronym,
        value: stock.position.sellProceeds,
        score: stock.position.profitLossPct + (stock.technicals ? -stock.technicals.momentumScore : 0)
      }))
      .sort((a, b) => b.score - a.score);

    const availableSellValue = sellIdeas.reduce((sum, idea) => sum + idea.value, 0);
    if (availableSellValue <= 0) return [];

    return analyses
      .filter((stock) => stock.benefit && !stock.position)
      .filter((stock) => stock.benefit.tier === 'S' || stock.benefit.tier === 'A' || stock.benefit.annualRoi >= 20)
      .map((stock) => {
        const cost = stock.benefit.requirement * stock.price;
        const shortfall = Math.max(0, cost - userCash.immediate);
        return {
          stock,
          cost,
          shortfall,
          sellIdeas,
          priorityBoost: benefitPriorityBoost(stock, profile),
          benefitLabel: benefitLabel(stock)
        };
      })
      .filter((target) => target.shortfall > 0 && target.shortfall <= availableSellValue)
      .slice(0, 3);
  }

  function benefitPriorityBoost(stock, profile) {
    const benefit = stock.benefit || {};
    let boost = profile.benefitFocusBoost;
    if (benefit.tier === 'S') boost += 30;
    else if (benefit.tier === 'A') boost += 20;
    else boost += Math.min(25, benefit.annualRoi || 0);
    return boost;
  }

  function benefitLabel(stock) {
    const benefit = stock.benefit || {};
    if (benefit.tier === 'S') return `S-tier benefit (${benefit.note || benefit.description || stock.acronym})`;
    if (benefit.tier === 'A') return `A-tier benefit (${benefit.note || benefit.description || stock.acronym})`;
    if (benefit.annualRoi > 0) return `estimated ${formatPct(benefit.annualRoi)} yearly benefit`;
    return benefit.note || benefit.description || 'benefit block';
  }

  function createRecommendation({ action, stock, priority, reason, details = '' }) {
    return {
      id: `${action}:${stock.id}`,
      action,
      stock,
      priority: Math.round(priority),
      reason,
      details,
      meta: getActionMeta(action),
      createdAt: nowMs()
    };
  }

  function dedupeRecommendations(recommendations) {
    const best = new Map();
    recommendations.forEach((recommendation) => {
      const key = `${recommendation.action}:${recommendation.stock.id}`;
      const current = best.get(key);
      if (!current || recommendation.priority > current.priority) best.set(key, recommendation);
    });
    return Array.from(best.values());
  }

  // ---------------------------------------------------------------------------
  // Notification module
  // ---------------------------------------------------------------------------

  async function notifyIfNeeded(recommendation) {
    if (!shouldNotify(recommendation)) return;
    const sent = await sendBrowserNotification(recommendation);
    if (!sent) sendInPageNotification(recommendation);
    await rememberNotification(recommendation);
  }

  function shouldNotify(recommendation) {
    const settings = state.settings.notifications;
    if (!settings.enabled) return false;
    if (!recommendation || recommendation.priority < parseNumber(settings.minPriority)) return false;

    const group = recommendation.meta.group;
    if (group === 'buy' && !settings.buy) return false;
    if (group === 'sell' && !settings.sell) return false;
    if (group === 'claim' && !settings.claim) return false;
    if (group === 'topup' && !settings.topup) return false;
    if (group === 'rebalance' && !settings.rebalance) return false;
    if (!['buy', 'sell', 'claim', 'topup', 'rebalance'].includes(group)) return false;

    const cooldown = Math.max(1, parseNumber(settings.cooldownMinutes)) * 60 * 1000;
    const key = notificationKey(recommendation);
    const last = parseNumber(state.notificationHistory[key]);
    return !last || nowMs() - last >= cooldown;
  }

  async function sendBrowserNotification(recommendation) {
    if (!('Notification' in window)) return false;
    if (Notification.permission !== 'granted') return false;

    try {
      const notification = new Notification(`${APP.name}: ${recommendation.action} ${recommendation.stock.acronym}`, {
        body: `${recommendation.reason} Price: ${formatFullMoney(recommendation.stock.price)}. Priority: ${recommendation.priority}.`,
        tag: notificationKey(recommendation),
        requireInteraction: recommendation.priority >= 90
      });
      notification.onclick = () => {
        window.focus();
        findStockOnPage(recommendation.stock.acronym);
        notification.close();
      };
      return true;
    } catch (error) {
      console.warn('[FLUZ] Browser notification failed:', error);
      return false;
    }
  }

  function sendInPageNotification(recommendation) {
    state.inPageAlerts.unshift({
      id: `${notificationKey(recommendation)}:${nowMs()}`,
      recommendation,
      ts: nowMs()
    });
    state.inPageAlerts = state.inPageAlerts.slice(0, 5);
    renderPanel();
  }

  async function rememberNotification(recommendation) {
    state.notificationHistory[notificationKey(recommendation)] = nowMs();
    await writeJsonStorage(STORAGE.notificationHistory, state.notificationHistory);
  }

  async function clearNotificationHistory() {
    state.notificationHistory = {};
    await writeJsonStorage(STORAGE.notificationHistory, {});
    showFlash('Notification history cleared.');
  }

  function notificationKey(recommendation) {
    return `${recommendation.action}:${recommendation.stock.acronym}`;
  }

  async function requestNotificationPermissionIfNeeded() {
    if (!('Notification' in window)) {
      showFlash('Browser notifications are not available here. FLUZ will use in-page alerts.');
      return false;
    }
    if (Notification.permission === 'granted') return true;
    if (Notification.permission === 'denied') {
      showFlash('Browser notifications are blocked. FLUZ will use in-page alerts.');
      return false;
    }
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      showFlash('Notification permission was not granted. FLUZ will use in-page alerts.');
      return false;
    }
    return true;
  }

  function playAlertTone() {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextCtor) return false;
      const tone = String(state.utility.timerAlertTone || 'standard');
      const volume = clamp(parseNumber(state.utility.timerAlertVolume || 55), 0, 100) / 100;
      const pattern = tone === 'soft'
        ? { type: 'sine', freqs: [660, 880], step: 0.2, length: 0.16, duration: 0.62, gain: 0.22 }
        : tone === 'urgent'
          ? { type: 'square', freqs: [740, 980, 1240, 980], step: 0.18, length: 0.16, duration: 1.08, gain: 0.42 }
          : { type: 'triangle', freqs: [720, 960, 720], step: 0.2, length: 0.17, duration: 0.85, gain: 0.32 };
      const context = new AudioContextCtor();
      const gain = context.createGain();
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.01, pattern.gain * volume), context.currentTime + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + pattern.duration);
      gain.connect(context.destination);
      pattern.freqs.forEach((frequency, index) => {
        const osc = context.createOscillator();
        osc.type = pattern.type;
        osc.frequency.value = frequency;
        osc.connect(gain);
        osc.start(context.currentTime + index * pattern.step);
        osc.stop(context.currentTime + pattern.length + index * pattern.step);
      });
      setTimeout(() => context.close && context.close(), 1400);
      return true;
    } catch (error) {
      console.warn('[FLUZ] Alert tone failed:', error);
      return false;
    }
  }

  async function sendUtilityAlert({ title, body, tag, url, sound = true, desktop = true }) {
    if (sound) playAlertTone();
    let sent = false;
    if (desktop && 'Notification' in window) {
      if (Notification.permission !== 'granted') await requestNotificationPermissionIfNeeded();
      if (Notification.permission === 'granted') {
        try {
          const notification = new Notification(title, {
            body,
            tag: tag || `${APP.id}-utility-${nowMs()}`,
            requireInteraction: true
          });
          notification.onclick = () => {
            window.focus();
            if (url) window.open(url, '_blank', 'noopener,noreferrer');
            notification.close();
          };
          sent = true;
        } catch (error) {
          console.warn('[FLUZ] Utility notification failed:', error);
        }
      }
    }
    if (!sent) showFlash(`${title}: ${body}`);
    return sent;
  }

  async function runNotificationScan() {
    for (const recommendation of state.recommendations) {
      await notifyIfNeeded(recommendation);
    }
  }

  // ---------------------------------------------------------------------------
  // UI rendering
  // ---------------------------------------------------------------------------

  function injectStyles() {
    if ($(`#${APP.id}-style`)) return;
    const style = document.createElement('style');
    style.id = `${APP.id}-style`;
    style.textContent = `
      #${APP.id} {
        position: fixed;
        right: 14px;
        top: 78px;
        z-index: 2147483647;
        width: min(490px, calc(100vw - 24px));
        min-height: 160px;
        max-height: calc(100vh - 8px);
        display: flex;
        flex-direction: column;
        color: #d8d8d8;
        background: #101010;
        border: 1px solid #2a2a2a;
        box-shadow: 0 18px 60px rgba(0, 0, 0, .62);
        border-radius: 8px;
        overflow: hidden;
        font: 10px/1.35 Arial, Helvetica, sans-serif;
      }
      #${APP.id} * { box-sizing: border-box; }
      #${APP.id},
      #${APP.id} *,
      #${APP.id}-modal,
      #${APP.id}-modal * {
        scrollbar-width: thin;
        scrollbar-color: #444 #151515;
      }
      #${APP.id}::-webkit-scrollbar,
      #${APP.id} *::-webkit-scrollbar,
      #${APP.id}-modal::-webkit-scrollbar,
      #${APP.id}-modal *::-webkit-scrollbar {
        width: 8px;
        height: 8px;
      }
      #${APP.id}::-webkit-scrollbar-track,
      #${APP.id} *::-webkit-scrollbar-track,
      #${APP.id}-modal::-webkit-scrollbar-track,
      #${APP.id}-modal *::-webkit-scrollbar-track {
        background: #151515;
        border-left: 1px solid #202020;
      }
      #${APP.id}::-webkit-scrollbar-thumb,
      #${APP.id} *::-webkit-scrollbar-thumb,
      #${APP.id}-modal::-webkit-scrollbar-thumb,
      #${APP.id}-modal *::-webkit-scrollbar-thumb {
        background: #3f3f3f;
        border: 2px solid #151515;
        border-radius: 8px;
      }
      #${APP.id}::-webkit-scrollbar-thumb:hover,
      #${APP.id} *::-webkit-scrollbar-thumb:hover,
      #${APP.id}-modal::-webkit-scrollbar-thumb:hover,
      #${APP.id}-modal *::-webkit-scrollbar-thumb:hover {
        background: #666;
      }
      #${APP.id}::-webkit-scrollbar-corner,
      #${APP.id} *::-webkit-scrollbar-corner,
      #${APP.id}-modal::-webkit-scrollbar-corner,
      #${APP.id}-modal *::-webkit-scrollbar-corner {
        background: #151515;
      }
      #${APP.id}.is-collapsed {
        width: max-content;
        min-width: 0;
        min-height: 0;
        height: auto !important;
      }
      #${APP.id}.is-collapsed .fluz-title { display: none; }
      #${APP.id}.is-collapsed .fluz-body { display: none; }
      #${APP.id}.is-collapsed .fluz-vertical-resize { display: none; }
      #${APP.id}.is-collapsed .fluz-mini-drag-strip { display: block; }
      #${APP.id}.is-height-managed .fluz-content { max-height: none; }
      #${APP.id}.is-height-managed .fluz-body {
        overflow: hidden;
      }
      #${APP.id} button, #${APP.id} input, #${APP.id} select {
        font: inherit;
      }
      #${APP.id} .fluz-header {
        display: flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 5px;
        padding: 4px 7px;
        background: #151515;
        border-bottom: 1px solid #252525;
        cursor: move;
        user-select: none;
      }
      #${APP.id} .fluz-mark {
        width: 18px;
        height: 18px;
        display: grid;
        place-items: center;
        border: 0;
        border-radius: 4px;
        color: #08120f;
        background: #62e6a4;
        font-weight: 800;
        font-size: 9px;
        letter-spacing: 0;
        padding: 0;
        cursor: pointer;
      }
      #${APP.id} .fluz-title { flex: 1; min-width: 0; }
      #${APP.id} .fluz-title strong { display: block; font-size: 11px; color: #ffffff; }
      #${APP.id} .fluz-title span { display: block; color: #858585; font-size: 9px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      #${APP.id} .fluz-mini-drag-strip {
        display: none;
        width: 32px;
        height: 20px;
        border: 1px solid #383838;
        border-radius: 4px;
        background: linear-gradient(180deg, #262626, #151515);
        cursor: move;
        position: relative;
      }
      #${APP.id} .fluz-mini-drag-strip::before {
        content: "";
        position: absolute;
        inset: 3px 8px;
        background: #cfd6de;
        -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2 8 6h3v5H6V8l-4 4 4 4v-3h5v5H8l4 4 4-4h-3v-5h5v3l4-4-4-4v3h-5V6h3z'/%3E%3C/svg%3E") center / contain no-repeat;
        mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2 8 6h3v5H6V8l-4 4 4 4v-3h5v5H8l4 4 4-4h-3v-5h5v3l4-4-4-4v3h-5V6h3z'/%3E%3C/svg%3E") center / contain no-repeat;
      }
      #${APP.id} .fluz-icon-btn {
        min-width: 22px;
        height: 20px;
        display: inline-grid;
        place-items: center;
        border: 1px solid #303840;
        border-radius: 4px;
        color: #b9c7d5;
        background: linear-gradient(180deg, #202830, #12171d);
        cursor: pointer;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.05);
      }
      #${APP.id} .fluz-icon-btn svg {
        width: 12px;
        height: 12px;
        stroke: currentColor;
        stroke-width: 2;
        fill: none;
        pointer-events: none;
      }
      #${APP.id} .fluz-icon-btn:hover {
        color: #62e6a4;
        border-color: rgba(98,230,164,.55);
        background: linear-gradient(180deg, #26313a, #151d23);
      }
      #${APP.id} .fluz-icon-btn[data-action="refresh"],
      #${APP.id} .fluz-icon-btn[data-action="gym-refresh"],
      #${APP.id} .fluz-icon-btn[data-action="utility-refresh"] {
        color: #8dffc2;
        border-color: rgba(98, 230, 164, .45);
        background: linear-gradient(180deg, #173529, #0d1d17);
      }
      #${APP.id} .fluz-icon-btn[data-action="open-settings"],
      #${APP.id} .fluz-icon-btn[data-action="gym-settings"],
      #${APP.id} .fluz-icon-btn[data-action="utility-settings"],
      #${APP.id} .fluz-icon-btn[data-action="open-profile"] {
        color: #9bd5ff;
        border-color: rgba(127, 199, 255, .45);
        background: linear-gradient(180deg, #1c3245, #101e2a);
      }
      #${APP.id} .fluz-icon-btn[data-action="open-about"],
      #${APP.id} .fluz-icon-btn[data-action="gym-guide"],
      #${APP.id} .fluz-icon-btn[data-action="utility-guide"] {
        color: #ffe08a;
        border-color: rgba(255, 209, 102, .5);
        background: linear-gradient(180deg, #3b3117, #1f190c);
      }
      #${APP.id} .fluz-icon-btn[data-action="toggle-collapse"] {
        color: #d5d5d5;
        border-color: rgba(180, 180, 180, .35);
        background: linear-gradient(180deg, #2a2a2a, #151515);
      }
      #${APP.id} .fluz-icon-btn[data-action="refresh"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="gym-refresh"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="utility-refresh"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="open-settings"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="gym-settings"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="utility-settings"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="open-about"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="gym-guide"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="utility-guide"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="open-profile"]:hover,
      #${APP.id} .fluz-icon-btn[data-action="toggle-collapse"]:hover {
        filter: brightness(1.18);
        box-shadow: 0 0 0 1px rgba(255,255,255,.08), 0 0 10px rgba(98,230,164,.12);
      }
      #${APP.id} .fluz-icon-btn.danger {
        color: #ffb6be;
        border-color: rgba(255, 89, 103, .45);
        background: linear-gradient(180deg, #2d171b, #171012);
      }
      #${APP.id} .fluz-tabs {
        display: flex;
        flex-wrap: nowrap;
        border-bottom: 1px solid #2e2e2e;
        background: #171717;
      }
      #${APP.id} .fluz-tab {
        flex: 1 1 0;
        min-width: 0;
        border: 0;
        border-right: 1px solid #242424;
        background: transparent;
        color: #8f8f8f;
        padding: 5px 1px;
        font-size: 9px;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        cursor: pointer;
      }
      #${APP.id} .fluz-tab.is-active {
        color: #fff;
        background: #1b1b1b;
        box-shadow: inset 0 -2px 0 #d8d8d8;
      }
      #${APP.id} .fluz-content {
        flex: 1 1 auto;
        min-height: 0;
        overflow: auto;
        max-height: calc(min(690px, 100vh - 92px) - 78px);
        padding: 0;
      }
      #${APP.id} .fluz-body {
        display: flex;
        flex: 1 1 auto;
        min-height: 0;
        flex-direction: column;
      }
      #${APP.id} .fluz-tabs,
      #${APP.id} .fluz-footer {
        flex: 0 0 auto;
      }
      #${APP.id} .fluz-vertical-resize,
      #${APP.id}-modal .fluz-vertical-resize {
        position: absolute;
        left: 0;
        right: 0;
        bottom: 0;
        height: 9px;
        cursor: ns-resize;
        touch-action: none;
        background: linear-gradient(180deg, transparent, rgba(255,255,255,.08));
        z-index: 4;
      }
      #${APP.id} .fluz-vertical-resize::after,
      #${APP.id}-modal .fluz-vertical-resize::after {
        content: "";
        position: absolute;
        left: 50%;
        bottom: 2px;
        width: 42px;
        height: 3px;
        border-radius: 999px;
        transform: translateX(-50%);
        background: #3f3f3f;
      }
      #${APP.id}.is-resizing,
      #${APP.id}-modal.is-resizing {
        user-select: none;
      }
      #${APP.id}.is-resizing .fluz-vertical-resize::after,
      #${APP.id}-modal.is-resizing .fluz-vertical-resize::after {
        background: #ffd166;
        box-shadow: 0 0 8px rgba(255,209,102,.5);
      }
      #${APP.id} .fluz-section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin: 0;
        padding: 6px 10px;
        border-bottom: 1px solid #242424;
        color: #ffffff;
        font-size: 11px;
        font-weight: 700;
      }
      #${APP.id} .fluz-muted { color: #858585; }
      #${APP.id} .fluz-error {
        padding: 8px;
        border: 1px solid rgba(255, 99, 99, .35);
        background: rgba(255, 99, 99, .1);
        color: #ffd6d6;
        border-radius: 6px;
        margin-bottom: 10px;
      }
      #${APP.id} .fluz-alert {
        border: 1px solid rgba(98, 230, 164, .35);
        background: rgba(98, 230, 164, .1);
        border-radius: 6px;
        padding: 7px;
        margin-bottom: 8px;
      }
      #${APP.id} .fluz-card {
        border: 0;
        border-bottom: 1px solid #292929;
        border-radius: 0;
        background: #121212;
        padding: 8px 10px;
        margin: 0;
      }
      #${APP.id} .fluz-rec {
        border-left: 0;
      }
      #${APP.id} .fluz-card.fluz-rec {
        padding: 6px 9px;
      }
      #${APP.id} .fluz-rec.buy { border-left-color: #62e6a4; }
      #${APP.id} .fluz-rec.dip { border-left-color: #b778ff; }
      #${APP.id} .fluz-rec.sell { border-left-color: #f28b82; }
      #${APP.id} .fluz-rec.danger { border-left-color: #ff4f5f; }
      #${APP.id} .fluz-rec.caution { border-left-color: #ffbe55; }
      #${APP.id} .fluz-rec.claim { border-left-color: #f5d76e; }
      #${APP.id} .fluz-rec.keep { border-left-color: #76a9ff; }
      #${APP.id} .fluz-rec.topup { border-left-color: #4fd1c5; }
      #${APP.id} .fluz-rec.rebalance { border-left-color: #f59be7; }
      #${APP.id} .fluz-rec.wait, #${APP.id} .fluz-rec.watch, #${APP.id} .fluz-rec.maybe { border-left-color: #9cadbe; }
      #${APP.id} .fluz-rec-top {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 5px;
      }
      #${APP.id} .fluz-action {
        color: #06110d;
        background: #62e6a4;
        border: 1px solid transparent;
        border-radius: 3px;
        padding: 2px 5px;
        font-weight: 800;
        font-size: 9px;
      }
      #${APP.id} .fluz-rec.action-claim .fluz-action { color: #2b1600; background: #ffd166; border-color: #ffdf85; }
      #${APP.id} .fluz-rec.action-buy .fluz-action { color: #04140c; background: #62e6a4; border-color: #8dffc2; }
      #${APP.id} .fluz-rec.action-best-buy .fluz-action { color: #04140c; background: #62e6a4; border-color: #8dffc2; }
      #${APP.id} .fluz-rec.action-maybe-buy .fluz-action { color: #102116; background: #9be7b2; border-color: #62e6a4; }
      #${APP.id} .fluz-rec.action-buy-dip .fluz-action { color: #f6ddff; background: #7333a3; border-color: #b778ff; }
      #${APP.id} .fluz-rec.action-top-up .fluz-action { color: #041514; background: #4fd1c5; border-color: #7ff3ea; }
      #${APP.id} .fluz-rec.action-save-toward .fluz-action { color: #1c1a07; background: #c9a227; border-color: #ffd166; }
      #${APP.id} .fluz-rec.action-keep .fluz-action { color: #071323; background: #76a9ff; border-color: #9fc3ff; }
      #${APP.id} .fluz-rec.action-hold .fluz-action { color: #111923; background: #7fc7ff; border-color: #9bd5ff; }
      #${APP.id} .fluz-rec.action-watch .fluz-action { color: #121820; background: #9cadbe; border-color: #c1cfdd; }
      #${APP.id} .fluz-rec.action-wait .fluz-action { color: #151515; background: #6f7d8b; border-color: #9cadbe; }
      #${APP.id} .fluz-rec.action-check .fluz-action { color: #2a1a00; background: #ffbe55; border-color: #ffd166; }
      #${APP.id} .fluz-rec.action-decide .fluz-action { color: #241a05; background: #e6a23c; border-color: #ffc46b; }
      #${APP.id} .fluz-rec.action-sell-extra .fluz-action { color: #2a0f13; background: #f28b82; border-color: #ffaaa3; }
      #${APP.id} .fluz-rec.action-sell .fluz-action { color: #2a0f13; background: #ff6b6b; border-color: #ff9292; }
      #${APP.id} .fluz-rec.action-sell-soon .fluz-action { color: #2a1a00; background: #ff9f43; border-color: #ffc078; }
      #${APP.id} .fluz-rec.action-sell-now .fluz-action { color: #ffffff; background: #b42b38; border-color: #ff5967; }
      #${APP.id} .fluz-rec.action-rebalance .fluz-action { color: #260d25; background: #f59be7; border-color: #ffc1f3; }
      #${APP.id} .fluz-symbol { color: #fff; font-weight: 800; font-size: 11px; }
      #${APP.id} .fluz-priority { margin-left: auto; color: #b8c9db; font-size: 10px; }
      #${APP.id} .fluz-reason { color: #c0cad5; font-size: 10px; }
      #${APP.id} .fluz-mini-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        margin-top: 3px;
        color: #9badc2;
      }
      #${APP.id} .fluz-button {
        border: 1px solid #303030;
        background: #1b1b1b;
        color: #d8d8d8;
        border-radius: 3px;
        padding: 3px 6px;
        cursor: pointer;
      }
      #${APP.id} .fluz-button:hover { background: #292929; color: #fff; }
      #${APP.id} .fluz-button.primary { color: #06110d; background: #62e6a4; border-color: #62e6a4; font-weight: 800; }
      #${APP.id} .fluz-button.primary.fluz-fill-used {
        color: #f0e5ff;
        background: #5b2c83;
        border-color: #9f69d8;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.08), 0 0 8px rgba(159,105,216,.18);
      }
      #${APP.id} .fluz-button.fluz-bazaar-visited {
        color: #f0e5ff;
        background: #5b2c83;
        border-color: #9f69d8;
        box-shadow: inset 0 0 0 1px rgba(255,255,255,.08);
      }
      #${APP.id} a.fluz-bazaar-visited:not(.fluz-button) {
        color: #d9b8ff !important;
        text-shadow: 0 0 8px rgba(159,105,216,.5);
      }
      #${APP.id} .fluz-button.danger { background: #3a2024; border-color: rgba(255, 99, 99, .35); }
      #${APP.id} .fluz-button:disabled {
        opacity: .42;
        cursor: not-allowed;
        filter: grayscale(.6);
      }
      #${APP.id} .fluz-table { display: grid; gap: 0; }
      #${APP.id} .fluz-row {
        display: grid;
        grid-template-columns: 52px 1fr 66px 68px;
        gap: 5px;
        align-items: center;
        padding: 6px 10px;
        border: 0;
        border-bottom: 1px solid #292929;
        border-radius: 0;
        background: #111;
        cursor: pointer;
      }
      #${APP.id} .fluz-row:hover { background: #171717; }
      #${APP.id} .fluz-row.fluz-market-row { grid-template-columns: 52px 1fr 52px 48px 66px; }
      #${APP.id} .fluz-row.fluz-travel-row {
        grid-template-columns: minmax(104px, 1fr) 82px 70px 70px 78px;
        cursor: default;
      }
      #${APP.id} .fluz-row.fluz-travel-set-row {
        grid-template-columns: minmax(112px, 1fr) 72px 86px 48px 58px;
        cursor: default;
      }
      #${APP.id} .fluz-cell-main { color: #fff; font-weight: 700; font-size: 11px; }
      #${APP.id} .fluz-pos {
        color: #9dffbf;
        font-weight: 900;
        text-shadow: 0 0 8px rgba(98, 230, 164, .18);
      }
      #${APP.id} .fluz-neg {
        color: #ff9b9b;
        font-weight: 900;
      }
      #${APP.id} .fluz-tag {
        display: inline-flex;
        align-items: center;
        min-height: 18px;
        border-radius: 5px;
        padding: 1px 5px;
        background: rgba(255, 255, 255, .07);
        color: #b9c8d9;
        font-size: 10px;
      }
      #${APP.id} .fluz-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
      }
      #${APP.id} .fluz-form-grid.market-listing-filters {
        grid-template-columns: minmax(120px, 1.25fr) minmax(88px, .85fr) minmax(88px, .85fr);
      }
      #${APP.id} .fluz-bazaar-filter-grid {
        display: grid;
        grid-template-columns: minmax(150px, 1.35fr) minmax(48px, .45fr) minmax(62px, .55fr) minmax(82px, .75fr) minmax(58px, .5fr);
        gap: 6px;
        align-items: end;
      }
      #${APP.id} .fluz-target-dropdown {
        width: min(390px, calc(100% - 20px));
        margin: 0 10px;
        border: 1px solid #252525;
        border-radius: 4px;
        background: #0f0f0f;
        box-shadow: 0 8px 18px rgba(0, 0, 0, .32);
      }
      #${APP.id} .fluz-target-dropdown .fluz-form-grid {
        grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr) auto;
        align-items: end;
      }
      #${APP.id} .fluz-target-dropdown textarea {
        min-height: 54px;
      }
      #${APP.id} label { display: grid; gap: 3px; color: #9badc2; }
      #${APP.id} input, #${APP.id} select {
        width: 100%;
        color: #fff;
        background: #0f151c;
        border: 1px solid #303030;
        border-radius: 3px;
        padding: 5px 7px;
      }
      #${APP.id} input[type="checkbox"] { width: auto; }
      #${APP.id} .fluz-check {
        display: flex;
        grid-template-columns: none;
        align-items: center;
        gap: 5px;
      }
      #${APP.id} .fluz-footer {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 4px 7px;
        border-top: 1px solid #292929;
        margin-top: 0;
        color: #858585;
        font-size: 9px;
        line-height: 1.25;
        background: #151515;
        white-space: nowrap;
        overflow: hidden;
      }
      #${APP.id} .fluz-footer > span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${APP.id} .fluz-native-filter-status {
        display: inline-flex;
        flex: 0 0 auto;
        align-items: center;
        gap: 6px;
        color: #c8f7df;
        font-size: 10px;
        max-width: 58%;
      }
      #${APP.id} .fluz-native-filter-status span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${APP.id} .fluz-footer-mini-btn {
        border: 1px solid rgba(255, 89, 103, .62);
        background: linear-gradient(180deg, #b92f43, #781b29);
        color: #ffffff;
        border-radius: 4px;
        padding: 3px 10px;
        cursor: pointer;
        font-size: 9px;
        font-weight: 800;
        text-transform: uppercase;
        box-shadow: inset 0 1px 0 rgba(255,255,255,.14);
      }
      #${APP.id} .fluz-footer-mini-btn:hover { background: #9b2636; }
      #${APP.id} a { color: #62e6a4; text-decoration: none; }
      #${APP.id} a:hover { text-decoration: underline; }
      #${APP.id} .fluz-gym-hero {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
        align-items: center;
        padding: 8px 10px;
        border-bottom: 1px solid #292929;
        background: linear-gradient(180deg, #161616, #111);
      }
      #${APP.id} .fluz-big-stat {
        color: #62e6a4;
        font-size: 16px;
        font-weight: 900;
      }
      #${APP.id} .fluz-stat-bars {
        display: grid;
        gap: 5px;
      }
      #${APP.id} .fluz-stat-line {
        display: grid;
        grid-template-columns: 64px 1fr 40px;
        gap: 6px;
        align-items: center;
      }
      #${APP.id} .fluz-bar {
        height: 6px;
        border-radius: 99px;
        background: #282828;
        overflow: hidden;
      }
      #${APP.id} .fluz-bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #62e6a4, #7fc7ff);
      }
      #${APP.id} .fluz-gym-balance {
        display: grid;
        gap: 8px;
      }
      #${APP.id} .fluz-gym-balance-row {
        border: 1px solid #272d32;
        border-radius: 5px;
        background: #0f1317;
        padding: 7px;
      }
      #${APP.id} .fluz-gym-balance-row.is-focus {
        border-color: rgba(98, 230, 164, .62);
        box-shadow: 0 0 0 1px rgba(98, 230, 164, .16), inset 0 0 18px rgba(98, 230, 164, .06);
      }
      #${APP.id} .fluz-gym-balance-top,
      #${APP.id} .fluz-gym-balance-meta {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      #${APP.id} .fluz-gym-balance-top strong {
        color: #fff;
        min-width: 64px;
      }
      #${APP.id} .fluz-gym-balance-top span,
      #${APP.id} .fluz-gym-balance-meta {
        color: #9faab5;
        font-size: 10px;
      }
      #${APP.id} .fluz-gym-balance-top em {
        margin-left: auto;
        font-style: normal;
        font-size: 10px;
        font-weight: 900;
        white-space: nowrap;
      }
      #${APP.id} .fluz-gym-balance-row.is-behind .fluz-gym-balance-top em { color: #ff7f8b; }
      #${APP.id} .fluz-gym-balance-row.is-on-target .fluz-gym-balance-top em { color: #62e6a4; }
      #${APP.id} .fluz-gym-balance-row.is-ahead .fluz-gym-balance-top em { color: #7fc7ff; }
      #${APP.id} .fluz-gym-balance-track {
        position: relative;
        height: 12px;
        margin: 6px 0;
        border-radius: 999px;
        background: #242424;
        overflow: hidden;
      }
      #${APP.id} .fluz-gym-balance-track span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #62e6a4, #7fc7ff);
      }
      #${APP.id} .fluz-gym-balance-row.is-behind .fluz-gym-balance-track span {
        background: linear-gradient(90deg, #ff5967, #ffd166);
      }
      #${APP.id} .fluz-gym-balance-track i {
        position: absolute;
        top: -3px;
        width: 2px;
        height: 18px;
        background: #ffffff;
        box-shadow: 0 0 0 1px rgba(0,0,0,.75), 0 0 8px rgba(255,255,255,.35);
        transform: translateX(-1px);
      }
      #${APP.id} .fluz-gym-balance-meta {
        justify-content: space-between;
      }
      #${APP.id} .fluz-addiction-hero {
        display: grid;
        grid-template-columns: minmax(0, 1.2fr) minmax(150px, .8fr);
        gap: 8px;
        align-items: stretch;
      }
      #${APP.id} .fluz-addiction-card {
        border: 1px solid #27313a;
        border-radius: 5px;
        background: #0f1419;
        padding: 8px;
      }
      #${APP.id} .fluz-addiction-card.is-risk {
        border-color: rgba(255, 89, 103, .7);
        box-shadow: inset 0 0 18px rgba(255, 89, 103, .08);
      }
      #${APP.id} .fluz-addiction-score {
        display: flex;
        align-items: baseline;
        gap: 8px;
        margin: 2px 0 6px;
      }
      #${APP.id} .fluz-addiction-score b {
        color: #62e6a4;
        font-size: 24px;
        line-height: 1;
      }
      #${APP.id} .fluz-addiction-card.is-risk .fluz-addiction-score b { color: #ff7f8b; }
      #${APP.id} .fluz-addiction-score span {
        color: #9aa7b4;
        font-size: 10px;
      }
      #${APP.id} .fluz-addiction-track {
        position: relative;
        height: 12px;
        border-radius: 999px;
        border: 1px solid #30343a;
        background: linear-gradient(90deg, rgba(98,230,164,.2), rgba(255,209,102,.2), rgba(255,89,103,.24));
        overflow: visible;
        margin: 9px 0;
      }
      #${APP.id} .fluz-addiction-track span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #62e6a4, #ffd166, #ff5967);
      }
      #${APP.id} .fluz-addiction-track i {
        position: absolute;
        top: -4px;
        width: 2px;
        height: 18px;
        background: #fff;
        transform: translateX(-1px);
        box-shadow: 0 0 0 1px rgba(0,0,0,.7), 0 0 8px rgba(255,255,255,.35);
      }
      #${APP.id} .fluz-addiction-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 7px;
        margin-top: 7px;
      }
      #${APP.id} .fluz-addiction-note {
        border-left: 3px solid #62e6a4;
        background: rgba(98,230,164,.06);
        padding: 7px;
        color: #d8e2ea;
        font-size: 11px;
      }
      #${APP.id} .fluz-addiction-note.warn { border-color: #ffd166; background: rgba(255,209,102,.06); }
      #${APP.id} .fluz-addiction-note.bad { border-color: #ff5967; background: rgba(255,89,103,.07); }
      #${APP.id} .fluz-addiction-history {
        display: flex;
        align-items: end;
        gap: 2px;
        height: 34px;
        margin-top: 7px;
        border-bottom: 1px solid #2b3137;
      }
      #${APP.id} .fluz-addiction-history i {
        flex: 1 1 0;
        min-width: 3px;
        border-radius: 2px 2px 0 0;
        background: linear-gradient(180deg, #7fc7ff, #62e6a4);
        opacity: .85;
      }
      #${APP.id} .fluz-addiction-history i.warn { background: linear-gradient(180deg, #ffd166, #ff9f43); }
      #${APP.id} .fluz-addiction-history i.bad { background: linear-gradient(180deg, #ff7f8b, #ff5967); }
      #${APP.id} .fluz-casino-game {
        border: 1px solid #29323a;
        border-radius: 5px;
        background: #0f1419;
        padding: 9px;
      }
      #${APP.id} .fluz-casino-decision {
        display: grid;
        grid-template-columns: minmax(104px, .42fr) minmax(0, 1fr);
        gap: 9px;
        align-items: stretch;
        margin-top: 8px;
      }
      #${APP.id} .fluz-casino-call {
        display: grid;
        place-items: center;
        min-height: 78px;
        border-radius: 6px;
        border: 1px solid #30343a;
        background: #171d24;
        color: #fff;
        text-align: center;
        font-weight: 900;
        font-size: 22px;
        text-transform: uppercase;
      }
      #${APP.id} .fluz-casino-call.hit,
      #${APP.id} .fluz-casino-call.low { border-color: #ff9f43; background: rgba(255,159,67,.13); color: #ffd166; }
      #${APP.id} .fluz-casino-call.stand,
      #${APP.id} .fluz-casino-call.high { border-color: #62e6a4; background: rgba(98,230,164,.12); color: #62e6a4; }
      #${APP.id} .fluz-casino-call.double { border-color: #7fc7ff; background: rgba(127,199,255,.12); color: #7fc7ff; }
      #${APP.id} .fluz-casino-call.split { border-color: #c7b7ff; background: rgba(164,139,255,.13); color: #c7b7ff; }
      #${APP.id} .fluz-casino-call.raise,
      #${APP.id} .fluz-casino-call.continue { border-color: #62e6a4; background: rgba(98,230,164,.13); color: #62e6a4; }
      #${APP.id} .fluz-casino-call.call,
      #${APP.id} .fluz-casino-call.check,
      #${APP.id} .fluz-casino-call.caution { border-color: #7fc7ff; background: rgba(127,199,255,.12); color: #7fc7ff; }
      #${APP.id} .fluz-casino-call.fold,
      #${APP.id} .fluz-casino-call.cashout { border-color: #ff7f8b; background: rgba(255,127,139,.12); color: #ff9aa4; }
      #${APP.id} .fluz-casino-call.waiting { color: #aeb6c0; }
      #${APP.id} .fluz-cashout-alert {
        margin-top: 8px;
        border: 2px solid #ffd166;
        border-radius: 6px;
        background: rgba(255, 209, 102, .16);
        color: #ffe59a;
        padding: 9px 10px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0;
        box-shadow: 0 0 18px rgba(255, 209, 102, .32);
        animation: fluzCashoutPulse 1s ease-in-out infinite;
      }
      #${APP.id} .fluz-cashout-alert span {
        display: block;
        color: #f3f6f8;
        font-size: 11px;
        font-weight: 700;
        text-transform: none;
        margin-top: 3px;
      }
      @keyframes fluzCashoutPulse {
        0%, 100% { border-color: #ffd166; box-shadow: 0 0 12px rgba(255, 209, 102, .25); }
        50% { border-color: #fff2a8; box-shadow: 0 0 28px rgba(255, 209, 102, .75); background: rgba(255, 209, 102, .25); }
      }
      #${APP.id} .fluz-casino-info {
        display: grid;
        gap: 6px;
        align-content: center;
      }
      #${APP.id} .fluz-casino-bar {
        height: 10px;
        border-radius: 999px;
        background: #252a30;
        overflow: hidden;
      }
      #${APP.id} .fluz-casino-bar span {
        display: block;
        height: 100%;
        background: linear-gradient(90deg, #62e6a4, #7fc7ff);
      }
      #${APP.id} .fluz-casino-counts {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 6px;
      }
      #${APP.id} .fluz-card-strip {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        align-items: center;
      }
      #${APP.id} .fluz-playing-card {
        min-width: 30px;
        height: 38px;
        padding: 3px 5px;
        border: 1px solid #2e3740;
        border-radius: 5px;
        background: #f1f5f8;
        color: #14181d;
        font-weight: 900;
        display: grid;
        place-items: center;
        box-shadow: inset 0 -2px 0 rgba(0,0,0,.12);
      }
      #${APP.id} .fluz-playing-card.red { color: #c93342; }
      #${APP.id} .fluz-poker-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 8px;
        margin-top: 8px;
      }
      #${APP.id} .fluz-casino-strategy {
        border: 1px solid #29323a;
        border-radius: 5px;
        background: #10161c;
        padding: 8px;
      }
      #${APP.id} .fluz-bank-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 7px;
      }
      #${APP.id} .fluz-bank-row {
        display: grid;
        grid-template-columns: minmax(64px, .8fr) repeat(4, minmax(86px, 1fr));
        gap: 6px;
        align-items: stretch;
        padding: 6px 0;
        border-bottom: 1px solid #252b31;
      }
      #${APP.id} .fluz-bank-row.head {
        color: #aeb6c0;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
      }
      #${APP.id} .fluz-bank-cell {
        border: 1px solid #29323a;
        border-radius: 5px;
        background: #10161c;
        padding: 6px;
        min-width: 0;
      }
      #${APP.id} .fluz-bank-cell.best {
        border-color: rgba(98,230,164,.55);
        background: rgba(98,230,164,.1);
        box-shadow: 0 0 0 1px rgba(98,230,164,.12) inset;
      }
      #${APP.id} .fluz-bank-cell b {
        display: block;
        color: #f0f4f7;
      }
      #${APP.id} .fluz-bank-cell em {
        display: block;
        color: #58dfff;
        font-size: 10px;
        font-style: normal;
        margin-top: 1px;
      }
      @media (max-width: 620px) {
        #${APP.id} .fluz-bank-grid { grid-template-columns: 1fr 1fr; }
        #${APP.id} .fluz-bank-row { grid-template-columns: 1fr; }
        #${APP.id} .fluz-bank-row.head { display: none; }
      }
      #${APP.id} .fluz-chain-timer-bar {
        position: relative;
        height: 11px;
        margin: 8px 2px 12px;
        border: 1px solid #2d2d2d;
        border-radius: 999px;
        background: #090d10;
        overflow: visible;
      }
      #${APP.id} .fluz-chain-timer-bar span {
        display: block;
        height: 100%;
        width: 0;
        border-radius: inherit;
        background: linear-gradient(90deg, #ff5967 0%, #ffd166 45%, #62e6a4 100%);
        transition: width .45s linear;
      }
      #${APP.id} .fluz-chain-timer-bar i {
        position: absolute;
        top: -4px;
        width: 2px;
        height: 17px;
        border-radius: 2px;
        transform: translateX(-1px);
        box-shadow: 0 0 0 1px rgba(0,0,0,.65);
      }
      #${APP.id} .fluz-chain-timer-bar i.target { background: #7fc7ff; }
      #${APP.id} .fluz-chain-timer-bar i.message { background: #62e6a4; }
      #${APP.id} .fluz-chain-timer-bar i.warning { background: #ff5967; }
      #${APP.id} .fluz-chain-slider-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 7px;
        margin-top: 7px;
      }
      #${APP.id} .fluz-chain-slider-grid label {
        border: 1px solid #242424;
        background: #0f0f0f;
        border-radius: 4px;
        padding: 5px;
      }
      #${APP.id} .fluz-chain-slider-grid input[type="range"] {
        padding: 0;
        accent-color: #62e6a4;
      }
      #${APP.id} .fluz-chain-log {
        display: grid;
        gap: 4px;
        max-height: 104px;
        overflow: auto;
      }
      #${APP.id} .fluz-chain-log-row {
        display: grid;
        grid-template-columns: 58px 1fr;
        gap: 6px;
        padding: 4px 0;
        border-bottom: 1px solid #222;
      }
      #${APP.id} .fluz-chain-friendly-list {
        display: grid;
        gap: 5px;
        margin-top: 7px;
      }
      #${APP.id} .fluz-form-actions {
        display: flex;
        align-items: end;
        justify-content: flex-end;
      }
      #${APP.id} .fluz-chain-friendly-row {
        display: grid;
        grid-template-columns: minmax(94px, 1fr) 58px 60px minmax(70px, .75fr) 126px;
        gap: 5px;
        align-items: end;
        padding: 5px;
        border: 1px solid #242424;
        border-radius: 4px;
        background: #101010;
      }
      #${APP.id} .fluz-chain-friendly-row.is-next-attacker {
        border-color: rgba(255, 209, 102, .95);
        background: linear-gradient(90deg, rgba(255,209,102,.18), rgba(16,16,16,.95));
        box-shadow: 0 0 0 1px rgba(255,209,102,.25), 0 0 14px rgba(255,209,102,.55);
      }
      #${APP.id} .fluz-chain-friendly-row label {
        display: grid;
        gap: 2px;
        min-width: 0;
        color: #aeb5bd;
        font-size: 9px;
      }
      #${APP.id} .fluz-chain-friendly-row input {
        min-height: 22px;
        padding: 2px 5px;
        font-size: 10px;
      }
      #${APP.id} .fluz-chain-friendly-xid {
        display: grid;
        gap: 2px;
        min-width: 0;
        font-size: 9px;
      }
      #${APP.id} .fluz-chain-friendly-xid a {
        color: #7fc7ff;
        text-decoration: none;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${APP.id} .fluz-chain-friendly-row .fluz-row-actions {
        justify-content: flex-end;
        flex-wrap: nowrap;
        gap: 2px;
      }
      #${APP.id} .fluz-chain-friendly-row .fluz-button {
        min-height: 22px;
        padding: 2px 4px;
        font-size: 8px;
      }
      #${APP.id} .fluz-chain-generated {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px;
        align-items: center;
        margin-top: 7px;
        padding: 6px;
        border: 1px solid rgba(98,230,164,.28);
        border-radius: 4px;
        background: rgba(18, 54, 39, .24);
      }
      #${APP.id} .fluz-home-bars {
        display: grid;
        gap: 6px;
      }
      #${APP.id} .fluz-home-bar {
        border: 1px solid #2b2b2b;
        border-radius: 4px;
        background: #141414;
        padding: 7px;
      }
      #${APP.id} .fluz-home-bar.good { border-color: rgba(98, 230, 164, .38); }
      #${APP.id} .fluz-home-bar.warn { border-color: rgba(255, 209, 102, .35); }
      #${APP.id} .fluz-home-bar.dim { border-color: #2b2b2b; }
      #${APP.id} .fluz-home-bar .fluz-mini-row {
        margin-bottom: 5px;
      }
      #${APP.id} .fluz-home-bar .fluz-mini-row:last-child {
        margin: 6px 0 0;
      }
      #${APP.id} .fluz-gym-head,
      #${APP.id} .fluz-boost-head {
        display: grid;
        gap: 5px;
        padding: 5px 10px;
        border-bottom: 1px solid #292929;
        color: #777;
        text-transform: uppercase;
        font-size: 8px;
        letter-spacing: .4px;
      }
      #${APP.id} .fluz-gym-head { grid-template-columns: 1fr 48px 44px 46px 46px 46px 46px; }
      #${APP.id} .fluz-gym-row { grid-template-columns: 1fr 48px 44px 46px 46px 46px 46px; cursor: default; }
      #${APP.id} .fluz-boost-head { grid-template-columns: 90px 60px 76px 1fr; }
      #${APP.id} .fluz-boost-row { grid-template-columns: 90px 60px 76px 1fr; cursor: default; }
      #${APP.id} .fluz-target-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
      }
      #${APP.id} .fluz-link-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 5px;
      }
      #${APP.id} .fluz-form-grid.compact-build {
        grid-template-columns: minmax(0, 1fr) auto 24px;
        align-items: end;
        margin: 5px 0;
      }
      #${APP.id} .fluz-boost-row {
        cursor: pointer;
      }
      #${APP.id} .fluz-boost-row:hover {
        background: #191919;
      }
      #${APP.id} .fluz-boost-group {
        padding: 4px 10px;
        color: #62e6a4;
        font-weight: 800;
        background: #0f1412;
      }
      .fluz-native-hidden {
        display: none !important;
      }
      .fluz-highlight-stock {
        outline: 2px solid #62e6a4 !important;
        outline-offset: 2px !important;
        box-shadow: 0 0 0 2px rgba(98, 230, 164, .28), 0 0 14px rgba(98, 230, 164, .22) !important;
      }
      .fluz-stock-filter-reset {
        margin-left: 6px !important;
        border: 1px solid rgba(255, 89, 103, .75) !important;
        background: #7b202d !important;
        color: #fff !important;
        border-radius: 3px !important;
        padding: 5px 10px !important;
        font: 700 11px Arial, Helvetica, sans-serif !important;
        cursor: pointer !important;
        vertical-align: middle !important;
      }
      .fluz-stock-filter-reset:hover {
        background: #a72a3b !important;
      }
      #${APP.id}-modal {
        position: fixed;
        z-index: 100000;
        left: min(520px, 22vw);
        top: 110px;
        background: transparent;
        pointer-events: none;
      }
      #${APP.id}-modal .fluz-modal-box {
        width: min(420px, calc(100vw - 24px));
        min-height: 150px;
        border: 1px solid #2a2a2a;
        background: #101010;
        color: #d8d8d8;
        border-radius: 6px;
        padding: 0;
        box-shadow: 0 18px 60px rgba(0, 0, 0, .62);
        font: 11px/1.4 Arial, Helvetica, sans-serif;
        pointer-events: auto;
        overflow: hidden;
        position: relative;
      }
      #${APP.id}-modal .fluz-card {
        margin: 8px;
        border: 1px solid #2d2d2d;
        background: #151515;
        border-radius: 4px;
        padding: 8px;
      }
      #${APP.id}-modal .fluz-section-title {
        font-weight: 700;
        color: #f2f2f2;
        margin-bottom: 6px;
        font-size: 11px;
      }
      #${APP.id}-modal .fluz-muted {
        color: #8f8f8f;
      }
      #${APP.id}-modal .fluz-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 6px;
        align-items: end;
      }
      #${APP.id}-modal .fluz-form-grid.compact {
        grid-template-columns: 160px 1fr 1fr;
        align-items: center;
      }
      #${APP.id}-modal .fluz-check-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px 10px;
        margin-top: 6px;
      }
      #${APP.id}-modal .fluz-settings-columns {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8px;
        margin: 8px;
      }
      #${APP.id}-modal .fluz-settings-columns .fluz-card {
        margin: 0;
      }
      #${APP.id}-modal .fluz-notify-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 5px 10px;
        align-items: center;
      }
      #${APP.id}-modal .fluz-cache-line {
        color: #8f9aaa;
        font-size: 10px;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id}-modal .fluz-cache-row {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        align-items: center;
        gap: 8px;
      }
      #${APP.id}-modal input,
      #${APP.id}-modal select,
      #${APP.id}-modal textarea {
        width: 100%;
        color: #fff;
        background: #0f151c;
        border: 1px solid #303030;
        border-radius: 3px;
        padding: 5px 7px;
        box-sizing: border-box;
      }
      #${APP.id}-modal textarea {
        min-height: 100px;
        resize: vertical;
      }
      #${APP.id}-modal input[type="checkbox"] { width: auto; }
      #${APP.id}-modal label {
        display: grid;
        gap: 3px;
        color: #aeb8c2;
        font-size: 10px;
      }
      #${APP.id}-modal .fluz-check {
        display: flex;
        align-items: center;
        gap: 5px;
      }
      #${APP.id}-modal .fluz-mini-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 6px;
      }
      #${APP.id}-modal .fluz-button {
        border: 1px solid #343434;
        background: #202020;
        color: #d8d8d8;
        border-radius: 4px;
        padding: 4px 7px;
        font-weight: 700;
        cursor: pointer;
      }
      #${APP.id}-modal .fluz-button:hover { border-color: #62e6a4; }
      #${APP.id}-modal .fluz-button.primary {
        background: #62e6a4;
        border-color: #62e6a4;
        color: #05130d;
      }
      #${APP.id}-modal .fluz-button.danger {
        background: #2a1115;
        border-color: #74313a;
        color: #ffd8dc;
      }
      #${APP.id}-modal a { color: #62e6a4; text-decoration: none; }
      #${APP.id}-modal a:hover { text-decoration: underline; }
      #${APP.id}-flash {
        position: fixed;
        right: 16px;
        bottom: 16px;
        z-index: 100001;
        max-width: 360px;
        border: 1px solid rgba(98, 230, 164, .35);
        background: #13231d;
        color: #e8fff5;
        border-radius: 7px;
        padding: 10px 12px;
        box-shadow: 0 12px 34px rgba(0, 0, 0, .4);
        font: 12px/1.45 Arial, Helvetica, sans-serif;
      }
      #${APP.id}.is-dragging { opacity: .92; }
      #${APP.id} .fluz-market-head,
      #${APP.id} .fluz-portfolio-head {
        display: grid;
        gap: 8px;
        padding: 6px 12px;
        border-bottom: 1px solid #2e2e2e;
        color: #777;
        font-size: 10px;
        letter-spacing: .06em;
        text-transform: uppercase;
        background: #141414;
      }
      #${APP.id} .fluz-sort-head {
        width: 100%;
        border: 0;
        background: transparent;
        color: inherit;
        padding: 0;
        text-align: left;
        text-transform: uppercase;
        letter-spacing: .06em;
        cursor: pointer;
        font-weight: 800;
      }
      #${APP.id} .fluz-sort-head:hover {
        color: #62e6a4;
      }
      #${APP.id} .fluz-market-head,
      #${APP.id} .fluz-row.fluz-market-row {
        grid-template-columns: 56px 72px 70px 48px 1fr;
      }
      #${APP.id} .fluz-market-head.fluz-item-scan-head,
      #${APP.id} .fluz-row.fluz-item-scan-row {
        grid-template-columns: minmax(92px, 1.35fr) 34px 58px 54px 58px 58px 72px;
      }
      #${APP.id} .fluz-market-head.fluz-item-db-head,
      #${APP.id} .fluz-row.fluz-item-db-row {
        grid-template-columns: minmax(118px, 1fr) 72px 70px 44px 58px;
      }
      #${APP.id} .fluz-target-head,
      #${APP.id} .fluz-row.fluz-target-row {
        display: grid;
        grid-template-columns: 34px minmax(175px, 1fr) 58px minmax(76px, .48fr) 104px;
        gap: 4px;
        align-items: center;
      }
      #${APP.id} .fluz-target-head {
        padding: 6px 10px;
        border-bottom: 1px solid #2e2e2e;
        color: #777;
        font-size: 10px;
        letter-spacing: .06em;
        text-transform: uppercase;
        background: #141414;
      }
      #${APP.id} .fluz-row.fluz-target-row {
        min-height: 31px;
        padding: 3px 6px;
        border-bottom: 1px solid #242424;
        background: #101010;
      }
      #${APP.id} .fluz-target-player {
        display: grid;
        gap: 1px;
        min-width: 0;
        padding-left: 8px;
      }
      #${APP.id} .fluz-target-player-title {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 0;
      }
      #${APP.id} .fluz-target-player-title strong {
        flex: 1 1 auto;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-target-player-title .fluz-note-chips {
        flex: 0 0 auto;
        flex-wrap: nowrap;
      }
      #${APP.id} .fluz-target-player .fluz-muted {
        font-size: 9px;
        line-height: 1.05;
      }
      #${APP.id} .fluz-row.fluz-target-row.is-starred {
        background: linear-gradient(90deg, rgba(255, 209, 102, .12), #101010 42%);
      }
      #${APP.id} .fluz-row.fluz-target-row.is-hidden {
        opacity: .62;
      }
      #${APP.id} .fluz-target-row .fluz-row-actions {
        flex-wrap: nowrap;
        justify-content: flex-end;
        gap: 1px;
      }
      #${APP.id} .fluz-target-row .fluz-button {
        min-height: 19px;
        padding: 1px 2px;
        font-size: 7px;
        min-width: 0;
        white-space: nowrap;
      }
      #${APP.id} .fluz-target-row .fluz-remove-x {
        width: 20px;
        padding-left: 0;
        padding-right: 0;
        text-align: center;
        color: #ffd0d0;
        background: #4a171d;
        border-color: rgba(255, 89, 103, .55);
        font-weight: 900;
      }
      #${APP.id} .fluz-target-row input[data-target-note] {
        min-height: 21px;
        padding: 2px 5px;
        font-size: 10px;
      }
      #${APP.id} .fluz-target-row .fluz-note-chips {
        gap: 2px;
      }
      #${APP.id} .fluz-target-row .fluz-signal-tag {
        padding: 1px 4px;
        font-size: 8px;
        line-height: 1.05;
      }
      #${APP.id} .fluz-war-target-row {
        display: grid;
        grid-template-columns: minmax(118px, 1fr) 70px minmax(36px, .42fr) 58px 88px;
        gap: 4px;
        align-items: center;
        min-height: 30px;
        padding: 3px 0;
        border-bottom: 1px solid #242424;
      }
      #${APP.id} .fluz-war-target-main {
        display: grid;
        gap: 1px;
        min-width: 0;
      }
      #${APP.id} .fluz-war-target-main strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
      }
      #${APP.id} .fluz-war-target-main .fluz-muted {
        font-size: 9px;
        line-height: 1.05;
      }
      #${APP.id} .fluz-war-target-stats {
        display: grid;
        gap: 2px;
        justify-items: start;
      }
      #${APP.id} .fluz-war-target-stat-line {
        display: inline-flex;
        gap: 2px;
        align-items: center;
        flex-wrap: nowrap;
      }
      #${APP.id} .fluz-war-target-row .fluz-note-chips {
        gap: 2px;
        flex-wrap: nowrap;
      }
      #${APP.id} .fluz-war-target-row .fluz-signal-tag {
        padding: 1px 4px;
        font-size: 8px;
        line-height: 1.05;
      }
      #${APP.id} .fluz-war-target-row .fluz-row-actions {
        flex-wrap: nowrap;
        justify-content: flex-end;
        gap: 2px;
      }
      #${APP.id} .fluz-war-target-row .fluz-button {
        min-height: 20px;
        padding: 1px 4px;
        font-size: 8px;
      }
      #${APP.id} .fluz-chain-target-row {
        grid-template-columns: minmax(104px, 1fr) 70px minmax(94px, .72fr) 58px 88px;
      }
      #${APP.id} .fluz-chain-target-row input[data-target-note] {
        min-height: 22px;
        padding: 2px 5px;
        font-size: 10px;
      }
      #${APP.id} .fluz-status-pill {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 58px;
        border: 1px solid rgba(98,230,164,.35);
        border-radius: 4px;
        padding: 3px 5px;
        color: #62e6a4;
        background: rgba(18, 54, 39, .45);
        font-size: 9px;
        font-weight: 900;
      }
      #${APP.id} .fluz-status-pill.bad {
        color: #ffbbc3;
        border-color: rgba(255,89,103,.45);
        background: rgba(80, 20, 30, .42);
      }
      #${APP.id} .fluz-status-pill.dim {
        color: #b6bcc4;
        border-color: rgba(160, 168, 176, .32);
        background: rgba(120, 128, 138, .12);
      }
      #${APP.id} .fluz-note-chips {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        flex-wrap: wrap;
      }
      #${APP.id} .fluz-note-chip {
        display: inline-flex;
        align-items: center;
        border: 1px solid rgba(160, 168, 176, .32);
        border-radius: 4px;
        padding: 2px 5px;
        color: #b6bcc4;
        background: rgba(120, 128, 138, .12);
        font-size: 9px;
        font-weight: 800;
        line-height: 1.1;
        white-space: nowrap;
      }
      #${APP.id} .fluz-note-chip.blue {
        color: #7fc7ff;
        border-color: rgba(127, 199, 255, .42);
        background: rgba(127, 199, 255, .12);
      }
      #${APP.id} .fluz-note-chip.orange {
        color: #ffb45f;
        border-color: rgba(255, 180, 95, .5);
        background: rgba(255, 154, 82, .13);
      }
      #${APP.id} .fluz-note-chip.red {
        color: #ff7777;
        border-color: rgba(255, 85, 85, .5);
        background: rgba(255, 85, 85, .12);
      }
      #${APP.id} .fluz-note-chip.green {
        color: #62e6a4;
        border-color: rgba(98, 230, 164, .45);
        background: rgba(98, 230, 164, .12);
      }
      #${APP.id} .fluz-note-chip.yellow {
        color: #ffd166;
        border-color: rgba(255, 209, 102, .42);
        background: rgba(255, 209, 102, .10);
      }
      #${APP.id} .fluz-note-chip.purple {
        color: #d4a8ff;
        border-color: rgba(180, 120, 255, .45);
        background: rgba(180, 120, 255, .12);
      }
      #${APP.id} .fluz-note-chip.cyan {
        color: #71e7ff;
        border-color: rgba(113, 231, 255, .42);
        background: rgba(113, 231, 255, .10);
      }
      #${APP.id} .fluz-row.fluz-target-list-row {
        display: grid;
        grid-template-columns: minmax(120px, 1fr) 132px 142px;
        align-items: center;
        gap: 6px;
        min-height: 30px;
        padding: 4px 10px;
        border-bottom: 1px solid #242424;
        background: #101010;
      }
      #${APP.id} .fluz-target-list-title {
        display: flex;
        align-items: center;
        min-width: 0;
        gap: 5px;
        white-space: nowrap;
        overflow: hidden;
      }
      #${APP.id} .fluz-target-list-title strong {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-target-list-meta {
        display: flex;
        align-items: center;
        gap: 3px;
        min-width: 0;
        overflow: hidden;
      }
      #${APP.id} .fluz-target-list-row .fluz-signal-tag {
        padding: 2px 5px;
        font-size: 8px;
        line-height: 1.1;
        white-space: nowrap;
      }
      #${APP.id} .fluz-target-list-row .fluz-row-actions {
        flex-wrap: nowrap;
        justify-content: flex-end;
        gap: 2px;
      }
      #${APP.id} .fluz-target-list-row .fluz-button {
        min-height: 20px;
        padding: 2px 5px;
        font-size: 8px;
      }
      #${APP.id} .fluz-list-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 7px;
      }
      #${APP.id} .fluz-list-toolbar .fluz-row-actions {
        margin: 0;
      }
      #${APP.id} .fluz-target-filter-grid {
        display: grid;
        grid-template-columns: 1fr 130px;
        gap: 7px;
      }
      #${APP.id} .fluz-target-checks {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        align-items: center;
        color: #aeb8c2;
        font-size: 10px;
        margin-top: 5px;
      }
      #${APP.id} .fluz-target-checks label {
        display: inline-flex;
        align-items: center;
        gap: 4px;
      }
      #${APP.id} .fluz-target-note-filters {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
        max-height: 138px;
        overflow: auto;
        padding: 6px;
        border-top: 1px solid #242424;
      }
      #${APP.id} .fluz-filter-dropdown {
        position: relative;
      }
      #${APP.id} .fluz-filter-summary {
        width: 100%;
        border: 1px solid #303030;
        border-radius: 4px;
        padding: 5px 7px;
        background: #101820;
        color: #d8e4f0;
        font-size: 10px;
        text-align: left;
        cursor: pointer;
      }
      #${APP.id} .fluz-filter-summary:after {
        content: 'v';
        float: right;
        color: #8f9aaa;
      }
      #${APP.id} .fluz-filter-dropdown.is-open .fluz-filter-summary:after {
        content: '^';
      }
      #${APP.id} .fluz-filter-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 4px);
        z-index: 5;
        width: min(260px, 72vw);
        border: 1px solid #303030;
        border-radius: 5px;
        background: #101010;
        box-shadow: 0 10px 24px rgba(0, 0, 0, .45);
      }
      #${APP.id} .fluz-note-filter-chip {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        border: 1px solid #303030;
        border-radius: 4px;
        padding: 3px 6px;
        background: #151515;
        color: #b9c8d9;
        font-size: 10px;
        cursor: pointer;
      }
      #${APP.id} .fluz-note-filter-chip.is-active {
        border-color: rgba(98, 230, 164, .55);
        background: rgba(23, 71, 48, .5);
        color: #dcffec;
      }
      #${APP.id} .fluz-target-tree {
        display: grid;
        gap: 6px;
        padding: 8px 10px;
      }
      #${APP.id} .fluz-overview-strip {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 6px;
        padding: 0 10px 4px;
      }
      #${APP.id} .fluz-overview-stat {
        border: 1px solid #303030;
        border-radius: 4px;
        background: #141414;
        padding: 6px;
        min-width: 0;
      }
      #${APP.id} .fluz-overview-stat span {
        display: block;
        color: #9badc2;
        font-size: 9px;
        text-transform: uppercase;
        font-weight: 900;
      }
      #${APP.id} .fluz-overview-stat strong {
        display: block;
        color: #f0d7a0;
        font-size: 15px;
        line-height: 1.1;
      }
      #${APP.id} .fluz-overview-stat.good strong { color: #62e6a4; }
      #${APP.id} .fluz-overview-stat.bad strong { color: #ff8c8c; }
      #${APP.id} .fluz-overview-stat.warn strong { color: #ffd166; }
      #${APP.id} .fluz-overview-stat.info strong { color: #7fc7ff; }
      #${APP.id} .fluz-overview-stat.dim strong { color: #8f9aa8; }
      #${APP.id} .fluz-tree-node {
        border-left: 1px solid #303030;
        margin-left: 6px;
        padding-left: 8px;
      }
      #${APP.id} .fluz-tree-toggle {
        width: 100%;
        border: 1px solid #2c2c2c;
        border-radius: 4px;
        background: #141414;
        color: #d7dde6;
        padding: 5px 7px;
        text-align: left;
        font-weight: 800;
        cursor: pointer;
      }
      #${APP.id} .fluz-tree-toggle:hover {
        border-color: rgba(98, 230, 164, .45);
      }
      #${APP.id} .fluz-tree-count {
        float: right;
        color: #9badc2;
        font-weight: 700;
      }
      #${APP.id} .fluz-tree-leaf {
        display: grid;
        grid-template-columns: minmax(90px, 1fr) 62px 60px 70px;
        gap: 6px;
        align-items: center;
        padding: 5px 4px;
        border-bottom: 1px solid #242424;
        font-size: 10px;
      }
      #${APP.id} .fluz-target-sort {
        border: 0;
        background: transparent;
        color: inherit;
        padding: 0;
        text-align: left;
        text-transform: uppercase;
        letter-spacing: .06em;
        font-weight: 900;
        cursor: pointer;
      }
      #${APP.id} .fluz-target-sort:hover {
        color: #62e6a4;
      }
      #${APP.id} .fluz-target-marks {
        display: flex;
        gap: 4px;
      }
      #${APP.id} .fluz-mark-btn {
        width: 20px;
        height: 20px;
        display: grid;
        place-items: center;
        border: 1px solid #343434;
        border-radius: 4px;
        background: #191919;
        color: #8d8d8d;
        cursor: pointer;
        font-size: 10px;
        font-weight: 900;
      }
      #${APP.id} .fluz-mark-btn.on {
        color: #151005;
        background: #ffd166;
        border-color: #ffd166;
      }
      #${APP.id} .fluz-mark-btn.lock.on {
        color: #06110d;
        background: #62e6a4;
        border-color: #62e6a4;
      }
      #${APP.id} .fluz-row-profit-input {
        min-height: 22px;
        padding: 2px 4px;
        font-size: 10px;
        text-align: right;
      }
      #${APP.id} .fluz-portfolio-head,
      #${APP.id} .fluz-row.fluz-portfolio-row {
        grid-template-columns: 52px 112px 74px 74px 42px;
      }
      #${APP.id} .fluz-row.fluz-market-row,
      #${APP.id} .fluz-row.fluz-portfolio-row {
        min-height: 30px;
        cursor: pointer;
      }
      #${APP.id} .fluz-name-tight,
      #${APP.id} .fluz-price,
      #${APP.id} .fluz-trend,
      #${APP.id} .fluz-rsi,
      #${APP.id} .fluz-benefit {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${APP.id} .fluz-name-tight {
        color: #d9d9d9;
        font-weight: 700;
      }
      #${APP.id} .fluz-rec {
        display: grid;
        grid-template-columns: 88px 1fr;
        gap: 2px 8px;
        align-items: start;
        min-height: 44px;
      }
      #${APP.id} .fluz-rec-top { display: contents; }
      #${APP.id} .fluz-rec .fluz-action {
        grid-row: 1 / span 3;
        justify-self: stretch;
        text-align: center;
      }
      #${APP.id} .fluz-rec-heading {
        grid-column: 2;
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
      }
      #${APP.id} .fluz-rec-heading .fluz-muted {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-rec-heading .fluz-priority {
        margin-left: auto;
        flex: 0 0 auto;
      }
      #${APP.id} .fluz-rec .fluz-reason,
      #${APP.id} .fluz-rec .fluz-mini-row {
        grid-column: 2;
        margin: 0;
      }
      #${APP.id} .fluz-rec > .fluz-muted {
        grid-column: 2;
        margin: -1px 0 0;
        align-self: start;
        line-height: 1.15;
      }
      #${APP.id} .fluz-rec .fluz-muted {
        font-size: 10px;
      }
      #${APP.id} .fluz-rec .fluz-reason {
        font-size: 10px;
        line-height: 1.25;
      }
      #${APP.id} .fluz-row-actions {
        display: flex;
        gap: 4px;
        justify-content: flex-end;
        align-items: center;
      }
      #${APP.id} .fluz-card.compact {
        padding: 5px 8px;
      }
      #${APP.id} .fluz-chip-row {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      #${APP.id} .fluz-ignore-chip {
        border: 1px solid #543038;
        background: #241318;
        color: #ffc7cf;
        border-radius: 3px;
        padding: 2px 5px;
        cursor: pointer;
      }
      #${APP.id} .fluz-signal-tags {
        grid-column: 2;
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
        margin-top: 2px;
      }
      #${APP.id} .fluz-signal-tag,
      #${APP.id}-modal .fluz-signal-tag {
        display: inline-flex;
        align-items: center;
        min-height: 16px;
        padding: 1px 6px;
        border-radius: 3px;
        background: #242424;
        color: #9a9a9a;
        font-size: 10px;
        line-height: 1.3;
      }
      #${APP.id} .fluz-signal-tag.good,
      #${APP.id}-modal .fluz-signal-tag.good { color: #4ee577; background: rgba(78, 229, 119, .12); }
      #${APP.id} .fluz-signal-tag.bad,
      #${APP.id}-modal .fluz-signal-tag.bad { color: #ff5555; background: rgba(255, 85, 85, .12); }
      #${APP.id} .fluz-signal-tag.warn,
      #${APP.id}-modal .fluz-signal-tag.warn { color: #ffd166; background: rgba(255, 209, 102, .12); }
      #${APP.id} .fluz-signal-tag.info,
      #${APP.id}-modal .fluz-signal-tag.info { color: #7fc7ff; background: rgba(127, 199, 255, .12); }
      #${APP.id} .fluz-signal-tag.fee,
      #${APP.id}-modal .fluz-signal-tag.fee { color: #c7b7ff; background: rgba(164, 139, 255, .13); }
      #${APP.id}-modal .fluz-modal-box.guide,
      #${APP.id}-modal .fluz-modal-box.settings {
        width: min(760px, calc(100vw - 28px));
        max-height: calc(100vh - 8px);
      }
      #${APP.id}-modal .fluz-window-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 10px;
        background: #151515;
        border-bottom: 1px solid #252525;
        cursor: move;
        user-select: none;
      }
      #${APP.id}-modal .fluz-window-head strong { color: #fff; }
      #${APP.id}-modal .fluz-window-head .fluz-muted { flex: 1; }
      #${APP.id}-modal .fluz-window-body {
        padding: 0;
        max-height: calc(min(820px, 100vh - 28px) - 42px);
        overflow: auto;
      }
      #${APP.id}-modal .fluz-modal-box.is-height-managed {
        display: flex;
        flex-direction: column;
      }
      #${APP.id}-modal .fluz-modal-box.is-height-managed .fluz-window-head,
      #${APP.id}-modal .fluz-modal-box.is-height-managed .fluz-section-title {
        flex: 0 0 auto;
      }
      #${APP.id}-modal .fluz-modal-box.is-height-managed .fluz-window-body {
        flex: 1 1 auto;
        min-height: 0;
        max-height: none;
      }
      #${APP.id}-modal .fluz-modal-box.is-plain-height-managed {
        overflow: auto;
        padding-bottom: 9px;
      }
      #${APP.id}-modal .fluz-modal-box.settings {
        background:
          linear-gradient(135deg, rgba(63, 92, 119, .18), transparent 34%),
          linear-gradient(180deg, #111923, #0b1017);
        border-color: #34475b;
        box-shadow: inset 0 1px 0 rgba(170, 214, 255, .06), 0 20px 70px rgba(0, 0, 0, .68);
      }
      #${APP.id}-modal .fluz-modal-box.settings .fluz-window-head {
        background: linear-gradient(180deg, #1d2a36, #111923);
        border-bottom-color: #34475b;
      }
      #${APP.id}-modal .fluz-modal-box.settings .fluz-card {
        border-color: rgba(101, 134, 164, .34);
        background: rgba(12, 18, 26, .86);
      }
      #${APP.id}-modal .fluz-profile-hero {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(101, 134, 164, .34);
        background:
          linear-gradient(135deg, rgba(98, 230, 164, .08), transparent 36%),
          rgba(12, 18, 26, .72);
      }
      #${APP.id}-modal .fluz-profile-hero h3 {
        margin: 0 0 4px;
        color: #e8f4ff;
        font-size: 16px;
      }
      #${APP.id}-modal .fluz-profile-hero p {
        margin: 0;
        color: #91a8bc;
      }
      #${APP.id}-modal .fluz-combo-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }
      #${APP.id}-modal .fluz-combo-option {
        min-height: 72px;
        border: 1px solid #334152;
        background: #101923;
        color: #d8e7f7;
        border-radius: 4px;
        padding: 7px;
        text-align: left;
        cursor: pointer;
      }
      #${APP.id}-modal .fluz-combo-option strong {
        display: block;
        font-size: 11px;
        margin-bottom: 4px;
        color: #fff;
      }
      #${APP.id}-modal .fluz-combo-option span {
        display: block;
        color: #91a8bc;
        font-size: 10px;
        line-height: 1.25;
      }
      #${APP.id}-modal .fluz-combo-option.green { border-color: rgba(98, 230, 164, .45); }
      #${APP.id}-modal .fluz-combo-option.blue { border-color: rgba(127, 199, 255, .45); }
      #${APP.id}-modal .fluz-combo-option.yellow { border-color: rgba(255, 209, 102, .52); }
      #${APP.id}-modal .fluz-combo-option.orange { border-color: rgba(255, 154, 82, .55); }
      #${APP.id}-modal .fluz-combo-option.red { border-color: rgba(255, 85, 85, .55); }
      #${APP.id}-modal .fluz-combo-option.is-active {
        box-shadow: inset 0 -2px 0 #62e6a4, 0 0 0 1px rgba(98, 230, 164, .25);
        background: #162330;
      }
      #${APP.id}-modal .fluz-risk-label { margin-top: 10px; }
      #${APP.id}-modal .fluz-risk-slider {
        accent-color: #ffd166;
      }
      #${APP.id}-modal .fluz-risk-preview {
        margin-top: 4px;
        color: #e8f4ff;
        font-weight: 800;
      }
      #${APP.id}-modal .fluz-risk-scale {
        display: flex;
        justify-content: space-between;
        margin-top: 4px;
        padding-top: 4px;
        border-top: 3px solid transparent;
        border-image: linear-gradient(90deg, #62e6a4, #ffd166, #ff5555) 1;
        color: #8aa1b8;
        font-size: 10px;
      }
      #${APP.id}-modal .fluz-modal-box.guide {
        background:
          linear-gradient(90deg, rgba(0, 0, 0, .28), transparent 13%, transparent 87%, rgba(0, 0, 0, .24)),
          linear-gradient(90deg, rgba(59, 36, 18, .22), transparent 18%, transparent 82%, rgba(59, 36, 18, .22)),
          radial-gradient(circle at 18% 12%, rgba(255, 220, 150, .10), transparent 24%),
          #17120d;
        border-color: #5b4428;
        box-shadow:
          inset 18px 0 24px rgba(0, 0, 0, .22),
          inset -18px 0 24px rgba(0, 0, 0, .18),
          0 20px 70px rgba(0, 0, 0, .68);
      }
      #${APP.id}-modal .fluz-modal-box.guide .fluz-window-head {
        background: linear-gradient(180deg, #2b2117, #18120d);
        border-bottom-color: #5b4428;
      }
      #${APP.id}-modal .fluz-guide-hero {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(180, 137, 75, .35);
        background: rgba(255, 216, 150, .05);
      }
      #${APP.id}-modal .fluz-modal-box.guide .fluz-window-body {
        background:
          repeating-linear-gradient(0deg, rgba(255, 225, 172, .025), rgba(255, 225, 172, .025) 1px, transparent 1px, transparent 26px),
          transparent;
      }
      #${APP.id}-modal .fluz-guide-hero h3 {
        margin: 0 0 4px;
        color: #f0d7a0;
        font-size: 16px;
      }
      #${APP.id}-modal .fluz-guide-hero p {
        margin: 0;
        color: #c6aa7a;
        font-size: 11px;
      }
      #${APP.id}-modal .fluz-guide-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        padding: 12px;
      }
      #${APP.id}-modal .fluz-guide-card.wide {
        grid-column: 1 / -1;
      }
      #${APP.id}-modal .fluz-guide-combos {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 6px;
      }
      #${APP.id}-modal .fluz-guide-combo {
        border: 1px solid rgba(180, 137, 75, .32);
        border-radius: 4px;
        padding: 8px;
        background: rgba(0, 0, 0, .18);
      }
      #${APP.id}-modal .fluz-guide-combo strong {
        display: block;
        color: #fff4cf;
        font-size: 11px;
        margin-bottom: 3px;
      }
      #${APP.id}-modal .fluz-guide-combo span {
        display: block;
        color: #b9a276;
        font-size: 10px;
        line-height: 1.3;
      }
      #${APP.id}-modal .fluz-guide-combo.green { border-color: rgba(98, 230, 164, .46); }
      #${APP.id}-modal .fluz-guide-combo.blue { border-color: rgba(127, 199, 255, .44); }
      #${APP.id}-modal .fluz-guide-combo.yellow { border-color: rgba(255, 209, 102, .55); }
      #${APP.id}-modal .fluz-guide-combo.orange { border-color: rgba(255, 154, 82, .55); }
      #${APP.id}-modal .fluz-guide-combo.red { border-color: rgba(255, 85, 85, .55); }
      #${APP.id}-modal .fluz-guide-flow {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
      }
      #${APP.id}-modal .fluz-guide-step {
        border: 1px solid rgba(240, 215, 160, .22);
        background: rgba(255, 216, 150, .045);
        border-radius: 4px;
        padding: 8px;
        color: #d8c7a4;
      }
      #${APP.id}-modal .fluz-guide-step b {
        display: block;
        color: #f0d7a0;
        margin-bottom: 3px;
      }
      #${APP.id}-modal .fluz-guide-pill {
        display: inline-flex;
        align-items: center;
        min-height: 17px;
        padding: 1px 6px;
        border-radius: 3px;
        margin: 1px 3px 1px 0;
        font-size: 10px;
        font-weight: 800;
      }
      #${APP.id}-modal .fluz-guide-pill.good { background: rgba(98, 230, 164, .16); color: #62e6a4; }
      #${APP.id}-modal .fluz-guide-pill.warn { background: rgba(255, 209, 102, .15); color: #ffd166; }
      #${APP.id}-modal .fluz-guide-pill.bad { background: rgba(255, 85, 85, .15); color: #ff7777; }
      #${APP.id}-modal .fluz-guide-pill.info { background: rgba(127, 199, 255, .14); color: #7fc7ff; }
      #${APP.id}-modal .fluz-guide-signal-list {
        display: grid;
        gap: 5px;
        margin-top: 6px;
      }
      #${APP.id}-modal .fluz-guide-signal-list p {
        display: grid;
        grid-template-columns: 96px minmax(0, 1fr);
        align-items: center;
        gap: 9px;
        margin: 0;
        white-space: nowrap;
      }
      #${APP.id}-modal .fluz-guide-signal-list .fluz-guide-text {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id}-modal .fluz-guide-action {
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 96px;
        min-height: 18px;
        padding: 2px 6px;
        border-radius: 3px;
        border: 1px solid transparent;
        font-size: 10px;
        font-weight: 800;
        margin-right: 0;
      }
      #${APP.id}-modal .fluz-guide-action.buy { color: #04140c; background: #62e6a4; border-color: #8dffc2; }
      #${APP.id}-modal .fluz-guide-action.maybe { color: #102116; background: #9be7b2; border-color: #62e6a4; }
      #${APP.id}-modal .fluz-guide-action.dip { color: #f6ddff; background: #7333a3; border-color: #b778ff; }
      #${APP.id}-modal .fluz-guide-action.save { color: #1c1a07; background: #c9a227; border-color: #ffd166; }
      #${APP.id}-modal .fluz-guide-action.sell { color: #2a0f13; background: #ff6b6b; border-color: #ff9292; }
      #${APP.id}-modal .fluz-guide-action.soon { color: #2a1a00; background: #ff9f43; border-color: #ffc078; }
      #${APP.id}-modal .fluz-guide-action.now { color: #ffffff; background: #b42b38; border-color: #ff5967; }
      #${APP.id}-modal .fluz-guide-action.extra { color: #2a0f13; background: #f28b82; border-color: #ffaaa3; }
      #${APP.id} .fluz-mini-metrics,
      #${APP.id}-modal .fluz-mini-metrics {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
        margin: 8px 0;
      }
      #${APP.id} .fluz-mini-metrics span,
      #${APP.id}-modal .fluz-mini-metrics span {
        display: grid;
        gap: 2px;
        min-width: 0;
        border: 1px solid #252525;
        background: #101010;
        border-radius: 4px;
        padding: 6px;
      }
      #${APP.id} .fluz-mini-metrics b,
      #${APP.id}-modal .fluz-mini-metrics b {
        color: #f2f2f2;
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-mini-metrics em,
      #${APP.id}-modal .fluz-mini-metrics em {
        color: #7e7e7e;
        font-style: normal;
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: .04em;
      }
      #${APP.id} .fluz-bootleg-metrics {
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 5px;
      }
      #${APP.id} .fluz-bootleg-metrics span {
        padding: 5px;
      }
      #${APP.id} .fluz-bootleg-metrics b {
        font-size: 10px;
      }
      #${APP.id} .fluz-bootleg-metrics em {
        font-size: 8px;
        letter-spacing: .02em;
      }
      #${APP.id} .fluz-route-grid,
      #${APP.id}-modal .fluz-route-grid {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 6px;
      }
      #${APP.id} .fluz-market-bazaar-head,
      .fluz-market-bazaar-native .fluz-market-bazaar-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 7px;
      }
      #${APP.id} .fluz-market-bazaar-head strong,
      .fluz-market-bazaar-native .fluz-market-bazaar-head strong {
        color: #f1f1f1;
        font-size: 12px;
      }
      #${APP.id} .fluz-market-bazaar-controls,
      .fluz-market-bazaar-native .fluz-market-bazaar-controls {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
        margin: 6px 0;
      }
      #${APP.id} .fluz-market-bazaar-controls label,
      .fluz-market-bazaar-native .fluz-market-bazaar-controls label {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #9a9a9a;
        font-size: 10px;
      }
      #${APP.id} .fluz-market-bazaar-controls input,
      .fluz-market-bazaar-native .fluz-market-bazaar-controls input {
        width: 64px;
        height: 24px;
        border: 1px solid #303030;
        border-radius: 3px;
        background: #111820;
        color: #e8edf2;
        padding: 2px 5px;
        font-size: 11px;
      }
      #${APP.id} .fluz-highlight-control-grid {
        display: grid;
        grid-template-columns: auto 56px minmax(140px, 1fr);
        gap: 8px;
        align-items: end;
      }
      #${APP.id} .fluz-highlight-control-grid label {
        min-width: 0;
      }
      #${APP.id} .fluz-highlight-control-grid > .fluz-button {
        align-self: end;
        white-space: nowrap;
      }
      #${APP.id} .fluz-percent-input {
        width: 52px;
        text-align: center;
      }
      #${APP.id} .fluz-threshold-slider {
        width: 100%;
        height: 7px;
        appearance: none;
        border-radius: 999px;
        border: 1px solid #303030;
        background: linear-gradient(90deg, #2ecc71 0%, #62e6a4 38%, #ffd166 50%, #ff9f43 70%, #ff5f6d 100%);
      }
      #${APP.id} .fluz-threshold-slider::-webkit-slider-thumb {
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid #e6edf5;
        background: #111820;
        box-shadow: 0 1px 5px rgba(0,0,0,.55);
      }
      #${APP.id} .fluz-threshold-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        border: 1px solid #e6edf5;
        background: #111820;
        box-shadow: 0 1px 5px rgba(0,0,0,.55);
      }
      #${APP.id} .fluz-slider-scale {
        display: flex;
        justify-content: space-between;
        color: #8f98a3;
        font-size: 9px;
        line-height: 1;
        margin-top: 2px;
      }
      #${APP.id} .fluz-slider-scale span:first-child { color: #62e6a4; }
      #${APP.id} .fluz-slider-scale span:last-child { color: #ff7777; }
      #${APP.id} .fluz-market-bazaar-rows,
      #${APP.id}-modal .fluz-market-bazaar-rows,
      .fluz-market-bazaar-native .fluz-market-bazaar-rows {
        display: grid;
        gap: 0;
        border-top: 1px solid #242424;
        margin-top: 7px;
      }
      #${APP.id} .fluz-market-bazaar-row,
      #${APP.id}-modal .fluz-market-bazaar-row,
      .fluz-market-bazaar-native .fluz-market-bazaar-row {
        display: grid;
        grid-template-columns: minmax(92px, 1fr) 76px 52px 68px 58px;
        gap: 6px;
        align-items: center;
        min-height: 29px;
        border-bottom: 1px solid #252525;
        color: #d7d7d7;
        font-size: 11px;
      }
      #${APP.id} .fluz-market-bazaar-row.is-head,
      #${APP.id}-modal .fluz-market-bazaar-row.is-head,
      .fluz-market-bazaar-native .fluz-market-bazaar-row.is-head {
        min-height: 24px;
        color: #777;
        font-size: 9px;
        text-transform: uppercase;
      }
      #${APP.id} .fluz-table-sort,
      #${APP.id}-modal .fluz-table-sort {
        appearance: none;
        border: 0;
        background: transparent;
        color: inherit;
        padding: 0;
        margin: 0;
        text-align: left;
        text-transform: uppercase;
        font: inherit;
        cursor: pointer;
      }
      #${APP.id} .fluz-table-sort:hover,
      #${APP.id} .fluz-table-sort.is-active,
      #${APP.id}-modal .fluz-table-sort:hover,
      #${APP.id}-modal .fluz-table-sort.is-active {
        color: #62e6a4;
      }
      #${APP.id} .fluz-market-db-pager,
      #${APP.id}-modal .fluz-market-db-pager {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 7px;
        flex-wrap: wrap;
        padding: 7px 0;
      }
      #${APP.id}-modal .fluz-market-category-filter,
      #${APP.id} .fluz-market-category-filter {
        border: 1px solid #26313a;
        border-radius: 4px;
        background: #0f151c;
        margin: 7px 0;
      }
      #${APP.id}-modal .fluz-market-category-filter summary,
      #${APP.id} .fluz-market-category-filter summary {
        cursor: pointer;
        padding: 7px 8px;
        color: #e9edf2;
        font-weight: 800;
        font-size: 11px;
      }
      #${APP.id}-modal .fluz-market-category-list,
      #${APP.id} .fluz-market-category-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 5px;
        padding: 0 8px 8px;
      }
      #${APP.id}-modal .fluz-market-category-list label,
      #${APP.id} .fluz-market-category-list label {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        color: #d7dce2;
        font-size: 10px;
      }
      #${APP.id}-modal .fluz-market-category-list span,
      #${APP.id} .fluz-market-category-list span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-market-bazaar-row b,
      #${APP.id}-modal .fluz-market-bazaar-row b,
      .fluz-market-bazaar-native .fluz-market-bazaar-row b {
        color: #fff;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-market-bazaar-row.is-wide,
      #${APP.id}-modal .fluz-market-bazaar-row.is-wide {
        grid-template-columns: minmax(70px, 1fr) 56px 46px 58px 60px 34px 44px 50px;
      }
      #${APP.id} .fluz-market-bazaar-row.is-tight,
      #${APP.id}-modal .fluz-market-bazaar-row.is-tight {
        grid-template-columns: minmax(96px, 1fr) 72px 70px 58px 62px;
        min-height: 25px;
      }
      #${APP.id} .fluz-market-bazaar-row.is-racing-meta {
        grid-template-columns: minmax(70px, .8fr) repeat(4, minmax(58px, 1fr)) minmax(76px, 1.15fr);
        min-height: 27px;
        font-size: 9px;
      }
      #${APP.id} .fluz-market-bazaar-row.is-racing-meta span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-market-bazaar-row em,
      #${APP.id}-modal .fluz-market-bazaar-row em {
        display: block;
        font-style: normal;
        font-weight: 800;
        line-height: 1.2;
      }
      .fluz-market-highlight {
        background: rgba(36, 148, 45, .72) !important;
        box-shadow: inset 0 0 0 1px rgba(111, 246, 134, .55) !important;
      }
      .fluz-market-highlight * {
        color: #f1fff2 !important;
      }
      .fluz-market-bazaar-native .fluz-market-bazaar-compact-list {
        display: grid;
        gap: 4px;
        max-height: 210px;
        overflow: auto;
        padding: 7px;
        border: 1px solid #3a3a3a;
        background: #202020;
      }
      .fluz-market-bazaar-native .fluz-market-bazaar-compact-row {
        display: grid;
        grid-template-columns: minmax(110px, 1fr) auto auto auto;
        align-items: center;
        gap: 10px;
        min-height: 28px;
        padding: 3px 9px;
        border: 1px solid #363636;
        border-radius: 3px;
        background: #171717;
        color: #f0f0f0;
        font-size: 12px;
      }
      .fluz-market-bazaar-native .fluz-market-bazaar-seller {
        color: #00aaff;
        font-weight: 800;
        text-decoration: underline;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .fluz-market-bazaar-native .fluz-market-bazaar-compact-row strong {
        color: #fff;
        white-space: nowrap;
      }
      .fluz-market-bazaar-native .fluz-market-bazaar-time {
        color: #aaa;
        font-size: 11px;
        text-align: right;
        white-space: nowrap;
      }
      .fluz-market-bazaar-native .fluz-market-bazaar-foot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-top: 8px;
        color: #aaa;
        font-size: 11px;
      }
      .fluz-market-bazaar-native {
        box-sizing: border-box;
        width: 100%;
        margin: 0 0 8px 0;
        border: 1px solid #343434;
        background: #2b2b2b;
        color: #d7d7d7;
        padding: 9px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        grid-column: 1 / -1;
        clear: both;
      }
      .fluz-market-bazaar-native .fluz-button {
        border: 1px solid #303030;
        background: #1b1b1b;
        color: #d8d8d8;
        border-radius: 3px;
        padding: 3px 6px;
        cursor: pointer;
        text-decoration: none;
        font-size: 11px;
      }
      .fluz-market-bazaar-native .fluz-button.primary {
        color: #06110d;
        background: #62e6a4;
        border-color: #62e6a4;
        font-weight: 800;
      }
      .fluz-market-bazaar-native .fluz-muted { color: #858585; }
      #${APP.id} .fluz-route,
      #${APP.id}-modal .fluz-route {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        border: 1px solid #2b2b2b;
        background: #151515;
        color: #d8d8d8;
        border-radius: 4px;
        font-weight: 800;
        text-decoration: none;
      }
      #${APP.id} .fluz-route.good,
      #${APP.id}-modal .fluz-route.good { border-color: rgba(98, 230, 164, .38); color: #62e6a4; }
      #${APP.id} .fluz-route.info,
      #${APP.id}-modal .fluz-route.info { border-color: rgba(127, 199, 255, .35); color: #7fc7ff; }
      #${APP.id} .fluz-route.warn,
      #${APP.id}-modal .fluz-route.warn { border-color: rgba(255, 209, 102, .35); color: #ffd166; }
      #${APP.id} .fluz-route.bad,
      #${APP.id}-modal .fluz-route.bad { border-color: rgba(255, 85, 85, .35); color: #ff7777; }
      #${APP.id} .fluz-bootleg-head,
      #${APP.id} .fluz-bootleg-row {
        grid-template-columns: minmax(92px, 1fr) 58px 58px 58px 58px;
      }
      #${APP.id} .fluz-bootleg-row.is-best {
        border-left-color: #62e6a4;
        background: linear-gradient(90deg, rgba(98, 230, 164, .12), rgba(20, 20, 20, .9));
      }
      .fluz-bootleg-native {
        position: relative;
        overflow: hidden;
        border-color: rgba(98, 230, 164, .32) !important;
        outline: 1px solid rgba(98, 230, 164, .28) !important;
      }
      .fluz-bootleg-native::before {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 3;
        pointer-events: none;
        background: var(--fluz-bootleg-overlay, rgba(98, 230, 164, .14));
        box-shadow: inset 0 0 0 2px rgba(98, 230, 164, .52);
      }
      .fluz-bootleg-native.fluz-bootleg-best {
        border-color: #8dffc2 !important;
        outline: 3px solid rgba(98, 230, 164, .95) !important;
        box-shadow: 0 0 0 2px rgba(98, 230, 164, .22), 0 0 18px rgba(98, 230, 164, .42) !important;
        filter: saturate(1.12) brightness(1.04);
      }
      .fluz-bootleg-native.fluz-bootleg-best::before {
        box-shadow: inset 0 0 0 3px rgba(141, 255, 194, .9), inset 0 0 22px rgba(98, 230, 164, .35);
      }
      .fluz-bootleg-native::after {
        content: attr(data-fluz-bootleg-label);
        position: absolute;
        left: 5px;
        right: 5px;
        bottom: 4px;
        z-index: 4;
        padding: 2px 4px;
        border-radius: 4px;
        background: rgba(4, 10, 7, .82);
        color: #dcffe9;
        font-size: 10px;
        font-weight: 900;
        line-height: 1.1;
        text-align: center;
        text-shadow: 0 1px 1px rgba(0, 0, 0, .85);
        pointer-events: none;
      }
      .fluz-bootleg-visual-overlay {
        position: absolute;
        z-index: 1000;
        pointer-events: none;
        border: 1px solid var(--fluz-bootleg-overlay-border, rgba(98, 230, 164, .7));
        background: var(--fluz-bootleg-overlay-bg, rgba(98, 230, 164, .22));
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .16), 0 0 14px rgba(98, 230, 164, .2);
        mix-blend-mode: screen;
      }
      .fluz-bootleg-visual-overlay.fluz-bootleg-best {
        box-shadow: inset 0 0 0 2px rgba(141, 255, 194, .95), 0 0 20px rgba(98, 230, 164, .42);
      }
      .fluz-bootleg-visual-overlay::after {
        content: attr(data-fluz-bootleg-label);
        position: absolute;
        left: 4px;
        right: 4px;
        bottom: 3px;
        padding: 2px 4px;
        border-radius: 4px;
        background: rgba(4, 10, 7, .84);
        color: #dcffe9;
        font-size: 10px;
        font-weight: 900;
        line-height: 1.1;
        text-align: center;
        text-shadow: 0 1px 1px rgba(0, 0, 0, .85);
      }
      .fluz-crime-profit-chip {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        margin-left: auto;
        padding: 4px 9px;
        border: 1px solid rgba(157, 255, 191, .6);
        border-radius: 999px;
        color: #dfffeb;
        background: rgba(18, 76, 47, .96);
        font-size: 11.5px;
        font-weight: 650;
        white-space: nowrap;
        text-shadow: 0 1px 0 rgba(0, 0, 0, .35);
      }
      .fluz-crime-profit-chip.warn {
        border-color: rgba(255, 209, 102, .5);
        color: #fff0b3;
        background: rgba(42, 31, 5, .92);
      }
      .fluz-crime-profit-chip.bad {
        border-color: rgba(255, 119, 119, .5);
        color: #ffd0d0;
        background: rgba(44, 14, 18, .92);
      }
      .fluz-crime-profit-best {
        background: rgba(98, 230, 164, .12) !important;
        outline: 1px solid rgba(98, 230, 164, .28) !important;
      }
      .fluz-cracking-panel {
        display: inline-flex;
        flex-wrap: wrap;
        gap: 3px;
        align-items: center;
        justify-content: center;
        position: absolute;
        z-index: 9999;
        max-width: 280px;
        padding: 3px;
        border: 1px solid rgba(98, 230, 164, .45);
        border-radius: 4px;
        background: rgba(10, 16, 13, .96);
        color: #d8ffe8;
        font-size: 10px;
        line-height: 1.2;
        box-shadow: 0 4px 14px rgba(0,0,0,.35);
      }
      .fluz-cracking-panel button {
        min-height: 18px;
        border: 1px solid rgba(98, 230, 164, .35);
        border-radius: 3px;
        background: rgba(98, 230, 164, .12);
        color: #a9ffd1;
        font-size: 10px;
        line-height: 1;
        cursor: copy;
      }
      .fluz-cracking-panel .is-muted {
        padding: 2px 4px;
        color: #a0a0a0;
      }
      .fluz-pickpocket-native-controls {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-left: 10px;
        padding: 3px 6px;
        border: 1px solid rgba(98, 230, 164, .28);
        border-radius: 4px;
        background: rgba(10, 10, 10, .72);
        color: #d8d8d8;
        font-size: 10px;
        vertical-align: middle;
      }
      .fluz-pickpocket-native-controls input {
        width: 48px;
        min-height: 18px;
        padding: 1px 3px;
        border: 1px solid #333;
        border-radius: 3px;
        background: #111820;
        color: #e8e8e8;
        font-size: 10px;
      }
      .fluz-pickpocket-label {
        display: inline-flex;
        margin-left: 5px;
        padding: 1px 4px;
        border-radius: 3px;
        color: #111;
        font-size: 9px;
        font-weight: 800;
        line-height: 1.2;
      }
      #${APP.id} .fluz-crime-route-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 5px;
      }
      #${APP.id} .fluz-crime-route {
        display: grid;
        gap: 2px;
        min-height: 34px;
        padding: 6px 7px;
        border: 1px solid #262626;
        border-radius: 4px;
        background: #101010;
        color: #e5e5e5;
        text-decoration: none;
      }
      #${APP.id} .fluz-crime-route b {
        font-size: 10px;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      #${APP.id} .fluz-crime-route span {
        color: #858585;
        font-size: 8px;
        line-height: 1.1;
        text-transform: uppercase;
      }
      #${APP.id} .fluz-crime-route:hover {
        border-color: rgba(98, 230, 164, .38);
        color: #8dffc2;
      }
      #${APP.id} .fluz-bookie-panel {
        display: grid;
        gap: 8px;
        padding: 9px;
        border: 1px solid #303030;
        background:
          linear-gradient(180deg, rgba(22, 22, 22, .97), rgba(13, 13, 13, .98)),
          #101010;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .035);
      }
      #${APP.id} .fluz-bookie-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      #${APP.id} .fluz-bookie-title strong {
        display: block;
        color: #e0e0e0;
        font-size: 12px;
        letter-spacing: .07em;
      }
      #${APP.id} .fluz-bookie-title span {
        color: #8e8e8e;
        font-size: 9px;
      }
      #${APP.id} .fluz-bookie-badge {
        white-space: nowrap;
        color: #0b140c !important;
        font-weight: 800;
        font-size: 9px !important;
        padding: 3px 6px;
        border: 1px solid #82d77f;
        border-radius: 999px;
        background: #ffd45f;
      }
      #${APP.id} .fluz-bookie-settings {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 6px;
        padding: 7px;
        border: 1px solid #2b2b2b;
        background: rgba(0, 0, 0, .28);
      }
      #${APP.id} .fluz-bookie-settings label {
        display: grid;
        gap: 3px;
        color: #a5a5a5;
        font-size: 9px;
      }
      #${APP.id} .fluz-bookie-settings input {
        width: 100%;
        min-height: 26px;
        font-size: 11px;
      }
      #${APP.id} .fluz-bookie-sports {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 5px;
      }
      #${APP.id} .fluz-bookie-sports button {
        min-height: 24px;
        border: 1px solid #333;
        border-radius: 4px;
        color: #d0d0d0;
        background: #171717;
        font-size: 9px;
        font-weight: 800;
        cursor: pointer;
      }
      #${APP.id} .fluz-bookie-sports button.is-on {
        color: #dfffee;
        border-color: #2c9a63;
        background: linear-gradient(180deg, #12643b, #0b2b1d);
      }
      #${APP.id} .fluz-bookie-advice {
        display: grid;
        gap: 3px;
        padding: 7px;
        border: 1px solid rgba(255, 209, 102, .35);
        background: rgba(66, 47, 6, .22);
      }
      #${APP.id} .fluz-bookie-advice.good {
        border-color: rgba(94, 231, 164, .38);
        background: rgba(6, 59, 37, .24);
      }
      #${APP.id} .fluz-bookie-advice strong {
        color: #ffd166;
        font-size: 10px;
        letter-spacing: .04em;
      }
      #${APP.id} .fluz-bookie-advice.good strong { color: #64e6a5; }
      #${APP.id} .fluz-bookie-advice span {
        color: #d2d2d2;
        font-size: 10px;
        line-height: 1.35;
      }
      #${APP.id} .fluz-bookie-outcomes {
        display: grid;
        gap: 4px;
      }
      #${APP.id} .fluz-bookie-outcome-head,
      #${APP.id} .fluz-bookie-outcome {
        display: grid;
        grid-template-columns: minmax(0, 1.35fr) 44px 56px 44px 58px 84px;
        align-items: center;
        gap: 6px;
      }
      #${APP.id} .fluz-bookie-outcome-head {
        color: #858585;
        font-size: 8px;
        text-transform: uppercase;
        letter-spacing: .07em;
        padding: 0 5px;
      }
      #${APP.id} .fluz-bookie-outcome {
        min-height: 34px;
        padding: 5px;
        border: 1px solid #292929;
        background: rgba(0, 0, 0, .26);
      }
      #${APP.id} .fluz-bookie-outcome.good {
        border-color: rgba(94, 231, 164, .24);
        background: rgba(7, 46, 31, .24);
      }
      #${APP.id} .fluz-bookie-outcome span {
        min-width: 0;
        color: #e0e0e0;
        font-size: 10px;
        font-weight: 700;
      }
      #${APP.id} .fluz-bookie-outcome strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      #${APP.id} .fluz-bookie-outcome em {
        display: block;
        color: #7f7f7f;
        font-size: 8px;
        font-style: normal;
        font-weight: 700;
      }
      #${APP.id} .fluz-bookie-outcome .fluz-row-actions {
        justify-content: flex-end;
        gap: 4px;
      }
      #${APP.id} .fluz-bookie-outcome .fluz-button {
        min-height: 22px;
        padding: 3px 6px;
        font-size: 9px;
      }
      #${APP.id} .fluz-bookie-empty {
        padding: 9px;
        border: 1px dashed #3a3a3a;
        color: #aaa;
        background: rgba(0, 0, 0, .25);
        font-size: 10px;
      }
      #${APP.id}-modal .fluz-guide-flow.utility {
        grid-template-columns: repeat(4, minmax(0, 1fr));
      }
      #${APP.id}-modal .fluz-modal-box.donate {
        width: min(520px, calc(100vw - 28px));
        background:
          radial-gradient(circle at 24% 0%, rgba(255, 221, 119, .18), transparent 32%),
          linear-gradient(135deg, #21190a, #0f0d08 58%, #181006);
        border-color: #8c6c24;
        box-shadow: inset 0 1px 0 rgba(255, 239, 184, .12), 0 20px 70px rgba(0, 0, 0, .7);
      }
      #${APP.id}-modal .fluz-modal-box.donate .fluz-window-head {
        background: linear-gradient(180deg, #3a2b0f, #171107);
        border-bottom-color: #8c6c24;
      }
      #${APP.id}-modal .fluz-donate-hero {
        padding: 16px;
        text-align: center;
      }
      #${APP.id}-modal .fluz-donate-hero h3 {
        margin: 0 0 6px;
        color: #ffe29a;
        font-size: 18px;
      }
      #${APP.id}-modal .fluz-donate-hero p {
        margin: 0 auto 10px;
        max-width: 410px;
        color: #c8aa69;
      }
      #${APP.id}-modal .fluz-donate-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 32px;
        padding: 0 14px;
        border: 1px solid #ffd166;
        background: linear-gradient(180deg, #ffd166, #a7771d);
        color: #1b1205 !important;
        border-radius: 4px;
        font-weight: 900;
        text-decoration: none !important;
      }
      #${APP.id} .fluz-stat-bars,
      #${APP.id}-modal .fluz-stat-bars {
        display: grid;
        gap: 5px;
        margin-top: 8px;
      }
      #${APP.id} .fluz-stat-line,
      #${APP.id}-modal .fluz-stat-line {
        position: relative;
        display: grid;
        grid-template-columns: 74px 1fr 42px;
        gap: 6px;
        align-items: center;
        min-height: 19px;
        padding: 2px 5px;
        overflow: hidden;
        border: 1px solid #252525;
        background: #111;
        border-radius: 3px;
      }
      #${APP.id} .fluz-stat-line span,
      #${APP.id} .fluz-stat-line strong,
      #${APP.id} .fluz-stat-line em,
      #${APP.id}-modal .fluz-stat-line span,
      #${APP.id}-modal .fluz-stat-line strong,
      #${APP.id}-modal .fluz-stat-line em {
        position: relative;
        z-index: 1;
        font-style: normal;
      }
      #${APP.id} .fluz-stat-line span,
      #${APP.id}-modal .fluz-stat-line span { color: #aeb8c2; }
      #${APP.id} .fluz-stat-line strong,
      #${APP.id}-modal .fluz-stat-line strong { color: #fff; }
      #${APP.id} .fluz-stat-line em,
      #${APP.id}-modal .fluz-stat-line em { color: #62e6a4; text-align: right; }
      #${APP.id} .fluz-stat-line i,
      #${APP.id}-modal .fluz-stat-line i {
        position: absolute;
        left: 0;
        top: 0;
        bottom: 0;
        background: linear-gradient(90deg, rgba(98, 230, 164, .16), rgba(127, 199, 255, .08));
      }
      #${APP.id}-modal .fluz-guide-card {
        border: 1px solid rgba(180, 137, 75, .32);
        background: rgba(18, 13, 9, .78);
        border-radius: 4px;
        padding: 10px;
        box-shadow: inset 0 1px 0 rgba(255, 226, 170, .05);
      }
      #${APP.id}-modal .fluz-guide-card h4 {
        margin: 0 0 6px;
        color: #f0d7a0;
        font-size: 12px;
      }
      #${APP.id}-modal .fluz-guide-card p,
      #${APP.id}-modal .fluz-guide-card li {
        color: #aaa;
        font-size: 11px;
        line-height: 1.45;
      }
      #${APP.id}-modal .fluz-guide-card ul {
        margin: 6px 0 0 16px;
        padding: 0;
      }
      @media (max-width: 620px) {
        #${APP.id} { right: 6px; top: 54px; width: calc(100vw - 12px); }
        #${APP.id}-modal { left: 6px; top: 76px; }
        #${APP.id}-modal .fluz-form-grid { grid-template-columns: 1fr; }
        #${APP.id}-modal .fluz-form-grid.compact,
        #${APP.id}-modal .fluz-notify-grid,
        #${APP.id}-modal .fluz-check-grid,
        #${APP.id}-modal .fluz-settings-columns,
        #${APP.id}-modal .fluz-cache-row { grid-template-columns: 1fr; }
        #${APP.id}-modal .fluz-combo-grid { grid-template-columns: 1fr; }
        #${APP.id} .fluz-form-grid { grid-template-columns: 1fr; }
        #${APP.id}-modal .fluz-guide-grid { grid-template-columns: 1fr; }
        #${APP.id}-modal .fluz-guide-combos,
        #${APP.id}-modal .fluz-guide-flow { grid-template-columns: 1fr; }
        #${APP.id} .fluz-mini-metrics,
        #${APP.id}-modal .fluz-mini-metrics,
        #${APP.id} .fluz-route-grid,
        #${APP.id}-modal .fluz-route-grid,
        #${APP.id}-modal .fluz-guide-flow.utility { grid-template-columns: 1fr 1fr; }
        #${APP.id} .fluz-bootleg-metrics { grid-template-columns: 1fr 1fr; }
        #${APP.id} .fluz-overview-strip { grid-template-columns: repeat(3, minmax(0, 1fr)); }
        #${APP.id} .fluz-row, #${APP.id} .fluz-row.fluz-market-row {
          grid-template-columns: 56px 1fr;
        }
        #${APP.id} .fluz-row > div:nth-child(n+3) { font-size: 11px; }
      }
    `;
    const styleHost = document.head || document.documentElement || document.body;
    if (!styleHost) {
      setTimeout(injectStyles, 50);
      return;
    }
    styleHost.appendChild(style);
  }

  function ensurePanel() {
    injectStyles();
    let panel = $(`#${APP.id}`);
    if (!panel) {
      panel = document.createElement('div');
      panel.id = APP.id;
      const host = document.body || document.documentElement;
      if (!host) return;
      host.appendChild(panel);
    }
    state.elements.panel = panel;
    applyPanelSize(panel);
    applyPanelPosition(panel);
    renderPanel();
  }

  function clampWindowHeight(value, fallback, minHeight = 160, maxHeightOverride = 0) {
    const viewportMax = Math.max(minHeight, window.innerHeight - 8);
    const maxHeight = Math.max(minHeight, Math.min(viewportMax, parseNumber(maxHeightOverride) || viewportMax));
    const raw = parseNumber(value) || fallback || 0;
    return clamp(Math.round(raw), minHeight, maxHeight);
  }

  function panelContentMaxHeight(panel) {
    if (!panel) return window.innerHeight - 8;
    const header = $('.fluz-header', panel);
    const tabs = $('.fluz-tabs', panel);
    const content = $('.fluz-content', panel);
    const footer = $('.fluz-footer', panel);
    const grip = $('.fluz-vertical-resize', panel);
    const borderPad = 4;
    const natural = (header ? header.offsetHeight : 0)
      + (tabs ? tabs.offsetHeight : 0)
      + naturalContentHeight(content)
      + (footer ? footer.offsetHeight : 0)
      + (grip ? grip.offsetHeight : 0)
      + borderPad;
    return Math.max(160, Math.min(window.innerHeight - 8, Math.ceil(natural)));
  }

  function naturalContentHeight(content) {
    if (!content) return 0;
    const children = Array.from(content.children || []);
    if (!children.length) return content.scrollHeight || 0;
    return children.reduce((total, child) => {
      const style = window.getComputedStyle ? window.getComputedStyle(child) : null;
      const marginTop = style ? parseNumber(style.marginTop) : 0;
      const marginBottom = style ? parseNumber(style.marginBottom) : 0;
      return total + child.scrollHeight + marginTop + marginBottom;
    }, 0);
  }

  function modalContentMaxHeight(box) {
    if (!box) return window.innerHeight - 8;
    const head = $('.fluz-window-head, .fluz-section-title', box);
    const body = $('.fluz-window-body', box);
    const grip = $('.fluz-vertical-resize', box);
    if (body) {
      const natural = (head ? head.offsetHeight : 0) + body.scrollHeight + (grip ? grip.offsetHeight : 0) + 4;
      return Math.max(150, Math.min(window.innerHeight - 8, Math.ceil(natural)));
    }
    return Math.max(150, Math.min(window.innerHeight - 8, Math.ceil(box.scrollHeight + 4)));
  }

  function applyPanelSize(panel) {
    if (!panel) return;
    if (state.panel.collapsed) {
      panel.classList.remove('is-height-managed');
      panel.style.height = '';
      return;
    }
    const stored = parseNumber(state.panel.height);
    if (!stored) {
      panel.classList.remove('is-height-managed');
      panel.style.height = '';
      return;
    }
    panel.classList.add('is-height-managed');
    panel.style.height = `${clampWindowHeight(stored, panel.offsetHeight || 420, 160, panelContentMaxHeight(panel))}px`;
  }

  function applyPanelPosition(panel) {
    const x = parseNumber(state.panel.x);
    const y = parseNumber(state.panel.y);
    if (x > 0 || y > 0) {
      const width = panel.offsetWidth || 490;
      const height = panel.offsetHeight || 120;
      panel.style.left = `${clamp(x, 4, Math.max(4, window.innerWidth - width - 4))}px`;
      panel.style.top = `${clamp(y, 4, Math.max(4, window.innerHeight - Math.min(height, window.innerHeight - 8) - 4))}px`;
      panel.style.right = 'auto';
    } else {
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '';
    }
  }

  async function resetPanelPosition() {
    state.panel.x = null;
    state.panel.y = null;
    state.panel.collapsed = false;
    await savePanelState();
    if (state.elements.panel) applyPanelPosition(state.elements.panel);
    renderPanel();
    showFlash('Panel position reset.');
  }

  function renderPanel() {
    const panel = state.elements.panel;
    if (!panel) return;
    panel.className = state.panel.collapsed ? 'is-collapsed' : '';
    applyPanelSize(panel);
    applyPanelPosition(panel);
    if (state.mode === 'gym') {
      renderGymPanel(panel);
      return;
    }
    if (state.mode === 'utility') {
      renderUtilityPanel(panel);
      return;
    }
    panel.innerHTML = `
      <div class="fluz-header fluz-drag-handle" title="Drag to move">
        <button class="fluz-mark" title="FLUZ supporter page" data-action="open-donate">Tz</button>
        <div class="fluz-title">
          <strong>${APP.stockName}</strong>
          <span>${headerSubtitle()}</span>
        </div>
        <button class="fluz-icon-btn" title="Refresh" data-action="refresh">${iconSvg('refresh')}</button>
        <button class="fluz-icon-btn" title="Settings" data-action="open-settings">${iconSvg('settings')}</button>
        <button class="fluz-icon-btn" title="Guide" data-action="open-about">${iconSvg('book')}</button>
        <button class="fluz-icon-btn" title="Profile / API" data-action="open-profile">${iconSvg('profile')}</button>
        <div class="fluz-mini-drag-strip" title="Drag to move"></div>
        <button class="fluz-icon-btn" title="Minimize" data-action="toggle-collapse">${iconSvg(state.panel.collapsed ? 'plus' : 'minus')}</button>
      </div>
      <div class="fluz-body">
        <div class="fluz-tabs">
          ${renderTabButton('signals', 'Signals')}
          ${renderTabButton('portfolio', 'Portfolio')}
          ${renderTabButton('market', 'Market Scan')}
        </div>
        <div class="fluz-content">
          ${renderInPageAlerts()}
          ${state.error ? `<div class="fluz-error">${escapeHtml(state.error)}</div>` : ''}
          ${renderActiveTab()}
        </div>
        ${renderPanelFooter()}
      </div>
      ${renderVerticalResizeHandle('panel')}
    `;
    requestAnimationFrame(() => {
      if (!state.elements.panel) return;
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    });
  }

  function getPanelContentScrollTop() {
    const content = $(`#${APP.id} .fluz-content`);
    return content ? content.scrollTop : 0;
  }

  function restorePanelContentScrollTop(scrollTop) {
    requestAnimationFrame(() => {
      const content = $(`#${APP.id} .fluz-content`);
      if (content) content.scrollTop = scrollTop;
    });
  }

  function renderPanelKeepingScroll() {
    const scrollTop = getPanelContentScrollTop();
    renderPanel();
    restorePanelContentScrollTop(scrollTop);
  }

  function renderGymPanel(panel) {
    panel.innerHTML = `
      <div class="fluz-header fluz-drag-handle" title="Drag to move">
        <button class="fluz-mark" title="FLUZ supporter page" data-action="open-donate">Tz</button>
        <div class="fluz-title">
          <strong>${APP.gymName}</strong>
          <span>${gymHeaderSubtitle()}</span>
        </div>
        <button class="fluz-icon-btn" title="Refresh" data-action="gym-refresh">${iconSvg('refresh')}</button>
        <button class="fluz-icon-btn" title="Settings" data-action="gym-settings">${iconSvg('settings')}</button>
        <button class="fluz-icon-btn" title="Guide" data-action="gym-guide">${iconSvg('book')}</button>
        <button class="fluz-icon-btn" title="Profile / API" data-action="open-profile">${iconSvg('profile')}</button>
        <div class="fluz-mini-drag-strip" title="Drag to move"></div>
        <button class="fluz-icon-btn" title="Minimize" data-action="toggle-collapse">${iconSvg(state.panel.collapsed ? 'plus' : 'minus')}</button>
      </div>
      <div class="fluz-body">
        <div class="fluz-tabs">
          ${renderGymTabButton('train', 'Train')}
          ${renderGymTabButton('gyms', 'Gyms')}
          ${renderGymTabButton('boosts', 'Boosts')}
        </div>
        <div class="fluz-content">
          ${state.error ? `<div class="fluz-error">${escapeHtml(state.error)}</div>` : ''}
          ${renderGymActiveTab()}
        </div>
        <div class="fluz-footer">Updated ${escapeHtml(gymUpdatedText())} - ${escapeHtml(getGymBuild().label)} - Made by <a href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(APP.authorLabel)}</a></div>
      </div>
      ${renderVerticalResizeHandle('panel')}
    `;
    requestAnimationFrame(() => {
      if (!state.elements.panel) return;
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    });
  }

  function renderUtilityPanel(panel) {
    const module = getUtilityModule();
    const tabs = utilityTabsForModule(module);
    if (!tabs.includes(state.utility.activeTab)) state.utility.activeTab = tabs[0];
    const hasGuide = moduleHasUtilityGuide(module);
    const hasSettings = moduleHasUtilitySettings(module);
    panel.innerHTML = `
      <div class="fluz-header fluz-drag-handle" title="Drag to move">
        <button class="fluz-mark" title="FLUZ supporter page" data-action="open-donate">Tz</button>
        <div class="fluz-title">
          <strong>${escapeHtml(module.title)}</strong>
          <span>${escapeHtml(module.short)} tools - read-only manual assist</span>
        </div>
        <button class="fluz-icon-btn" title="Refresh scan" data-action="utility-refresh">${iconSvg('refresh')}</button>
        ${hasSettings ? `<button class="fluz-icon-btn" title="Settings" data-action="utility-settings">${iconSvg('settings')}</button>` : ''}
        ${hasGuide ? `<button class="fluz-icon-btn" title="Guide" data-action="utility-guide">${iconSvg('book')}</button>` : ''}
        <button class="fluz-icon-btn" title="Profile / API" data-action="open-profile">${iconSvg('profile')}</button>
        <div class="fluz-mini-drag-strip" title="Drag to move"></div>
        <button class="fluz-icon-btn" title="Minimize" data-action="toggle-collapse">${iconSvg(state.panel.collapsed ? 'plus' : 'minus')}</button>
      </div>
      <div class="fluz-body">
        <div class="fluz-tabs">${tabs.map((tab) => renderUtilityTabButton(tab, module)).join('')}</div>
        <div class="fluz-content">${renderUtilityActiveTab(module)}</div>
        <div class="fluz-footer">Manual helper - ${escapeHtml(module.short)} - no auto-clicks/actions - Made by <a href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(APP.authorLabel)}</a></div>
      </div>
      ${renderVerticalResizeHandle('panel')}
    `;
    if (module.key === 'itemmarket') scheduleAllBazaarAutoScan({ immediate: state.utility.activeTab === 'bazaarListings' });
    else clearTimeout(state.marketBazaarAllAutoTimer);
    if (module.key === 'itemmarket') requestAnimationFrame(() => applyItemMarketValueHighlights());
    if (module.key === 'items') requestAnimationFrame(() => scheduleInventoryPanelScan());
    if (module.key === 'hospital') scheduleHospitalCountdown();
    else clearInterval(state.hospitalCountdownTimer);
    if (module.key === 'casino' && (isBlackjackPage() || isHighLowPage() || isHoldemPage())) scheduleCasinoGameWatch();
    else clearInterval(state.casinoGameWatchTimer);
    if (moduleHasTargetTools(module)) scheduleChainWatch();
    else {
      clearInterval(state.chainWatchTimer);
      state.chainWatchTimer = null;
      state.chainWatchStarted = false;
    }
    requestAnimationFrame(() => {
      if (!state.elements.panel) return;
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    });
  }

  function renderVerticalResizeHandle(scope) {
    return `<div class="fluz-vertical-resize" data-resize-window="${escapeHtml(scope)}" title="Drag vertically to resize"></div>`;
  }

  function scheduleCasinoGameWatch() {
    clearInterval(state.casinoGameWatchTimer);
    state.casinoGameWatchTimer = setInterval(() => {
      if (state.mode !== 'utility') return;
      const module = getUtilityModule();
      if (!module || module.key !== 'casino' || (!isBlackjackPage() && !isHighLowPage() && !isHoldemPage())) return;
      renderPanelPreservingScroll();
    }, 1200);
  }

  function utilityTabsForModule(module) {
    const cleanTabs = (tabs) => {
      let workTabs = (tabs || ['tools']).filter((tab) => tab !== 'guide');
      if (!module || module.key !== 'city') workTabs = workTabs.filter((tab) => tab !== 'links');
      if (moduleHasTargetTools(module)) workTabs = workTabs.filter((tab) => tab !== 'timers');
      if (moduleHasTargetTools(module) && !workTabs.includes('chains')) {
        const targetIndex = workTabs.indexOf('targets');
        const insertAt = targetIndex >= 0 ? targetIndex + 1 : Math.max(0, workTabs.indexOf('finder'));
        workTabs.splice(insertAt, 0, 'chains');
      }
      if (moduleHasTargetTools(module) && !workTabs.includes('factionChains')) {
        const chainsIndex = workTabs.indexOf('chains');
        const insertAt = chainsIndex >= 0 ? chainsIndex + 1 : Math.max(0, workTabs.indexOf('finder'));
        workTabs.splice(insertAt, 0, 'factionChains');
      }
      return workTabs.length ? workTabs : ['tools'];
    };
    if (module && module.key === 'itemmarket') {
      return ['tools', 'bazaarListings'];
    }
    return cleanTabs(module && module.tabs ? module.tabs : ['tools']);
  }

  function moduleHasUtilityGuide(module) {
    return !!(module && Array.isArray(module.guide) && module.guide.length);
  }

  function moduleHasUtilitySettings(module) {
    return !!(module && (['bazaar', 'itemmarket', 'crimes', 'travel', 'missions', 'bounties', 'awards', 'attack'].includes(module.key) || (Array.isArray(module.tools) && module.tools.includes('addictionAdvisor')) || moduleHasTargetTools(module) || (Array.isArray(module.tools) && module.tools.includes('timers')) || (Array.isArray(module.tabs) && module.tabs.includes('timers'))));
  }

  function renderUtilityTabButton(tab, module = null) {
    const labels = {
      tools: 'Tools',
      home: 'Home',
      targets: 'Targets',
      chains: 'Chains',
      factionChains: 'Faction Chains',
      finder: 'Finder',
      lists: 'Lists',
      bazaarListings: 'Bazaar Listings',
      raceLoadout: 'Loadout',
      raceMeta: 'Track Meta',
      war: 'War',
      scan: 'Scan',
      guide: 'Guide',
      database: 'Database',
      links: 'Links',
      addictionAdvisor: 'Addiction Advisor',
      timers: 'Timers',
      mugCheck: 'Mug Check',
      overview: 'Overview'
    };
    if (tab === 'scan' && module && module.key === 'itemmarket') labels.scan = 'Item Market Price Calculator';
    if (tab === 'scan' && module && module.key === 'bazaar') labels.scan = 'Bazaar Price Calculator';
    const active = state.utility.activeTab === tab ? 'is-active' : '';
    return `<button class="fluz-tab ${active}" data-utility-tab="${escapeHtml(tab)}">${escapeHtml(labels[tab] || tab)}</button>`;
  }

  function getUtilityModule() {
    return detectUtilityModule() || UTILITY_MODULES.itemmarket;
  }

  function moduleHasTargetTools(module) {
    return !!(module && Array.isArray(module.tools) && module.tools.includes('targetBoard'));
  }

  function getModuleFeeKey(module) {
    if (module && module.key === 'bazaar') return 'bazaar';
    if (module && module.key === 'itemmarket') {
      return MARKET_FEES[state.utility.itemmarketFeeKey] ? state.utility.itemmarketFeeKey : 'itemMarket';
    }
    return state.utility.feeKey || (module && module.feeKey) || 'itemMarket';
  }

  function gymHeaderSubtitle() {
    if (state.loading) return 'Loading gym data...';
    const build = getGymBuild();
    const rec = state.gymData && state.gymData.recommendation;
    return rec ? `${build.label} - train ${statLabel(rec.stat)} next - read-only` : `${build.label} planner - read-only`;
  }

  function gymUpdatedText() {
    const item = state.cacheInfo && state.cacheInfo.gymUser;
    return item && item.fetchedAt ? new Date(item.fetchedAt).toLocaleTimeString() : 'local';
  }

  function renderGymTabButton(tab, label) {
    const active = state.gym.activeTab === tab ? 'is-active' : '';
    return `<button class="fluz-tab ${active}" data-gym-tab="${tab}">${label}</button>`;
  }

  function headerSubtitle() {
    if (state.loading) return 'Loading Torn data...';
    if (!state.apiKey) return 'Add a Limited Access API key to begin';
    const count = visibleSignalRecommendations().length;
    const profile = getProfile().label;
    return `${count} signals - ${getStrategy().label} - ${profile}`;
  }

  function renderTabButton(tab, label) {
    const active = state.panel.activeTab === tab ? 'is-active' : '';
    return `<button class="fluz-tab ${active}" data-tab="${tab}">${label}</button>`;
  }

  function renderPanelFooter() {
    const updated = state.cacheInfo && state.cacheInfo.market && state.cacheInfo.market.fetchedAt
      ? new Date(state.cacheInfo.market.fetchedAt).toLocaleTimeString()
      : 'not loaded';
    const filterStatus = state.nativeFilter
      ? `<div class="fluz-native-filter-status"><span>Filtered: <strong>${escapeHtml(state.nativeFilter)}</strong></span><button class="fluz-footer-mini-btn" data-action="clear-native-filter">Reset filter</button></div>`
      : '';
    return `
      <div class="fluz-footer">
        ${filterStatus}<span>Updated ${escapeHtml(updated)} - ${escapeHtml(getStrategy().label)} - ${state.analyses.length || 0} stocks - ${state.analyses.filter((stock) => stock.position).length} held - Made by <a href="${APP.profileUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(APP.authorLabel)}</a></span>
      </div>
    `;
  }

  function iconSvg(name) {
    const icons = {
      refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v6h-6"/></svg>',
      settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z"/><path d="M19.4 15a1.8 1.8 0 0 0 .4 2l.1.1-2 3.4-.2-.1a1.8 1.8 0 0 0-2 .1 8 8 0 0 1-1.3.7 1.8 1.8 0 0 0-1.1 1.6v.2h-4v-.2a1.8 1.8 0 0 0-1.1-1.6 8 8 0 0 1-1.3-.7 1.8 1.8 0 0 0-2-.1l-.2.1-2-3.4.1-.1a1.8 1.8 0 0 0 .4-2 8 8 0 0 1 0-1.4 1.8 1.8 0 0 0-.4-2l-.1-.1 2-3.4.2.1a1.8 1.8 0 0 0 2-.1 8 8 0 0 1 1.3-.7A1.8 1.8 0 0 0 9.3 5.8v-.2h4v.2a1.8 1.8 0 0 0 1.1 1.6 8 8 0 0 1 1.3.7 1.8 1.8 0 0 0 2 .1l.2-.1 2 3.4-.1.1a1.8 1.8 0 0 0-.4 2 8 8 0 0 1 0 1.4Z"/></svg>',
      book: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H7a3 3 0 0 0-3 3V5.5Z"/><path d="M4 20a3 3 0 0 1 3-3h13"/><path d="M8 7h8M8 11h6"/></svg>',
      profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"/></svg>',
      minus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 12h12"/></svg>',
      plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
      trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>'
    };
    return icons[name] || '';
  }

  function renderActiveTab() {
    if (!state.apiKey && state.panel.activeTab !== 'settings' && state.panel.activeTab !== 'about') {
      return renderSetupPrompt();
    }
    if (state.loading) {
      return '<div class="fluz-card">Loading market, portfolio, bank, and optional Tornsy data...</div>';
    }

    switch (state.panel.activeTab) {
      case 'portfolio': return renderPortfolioTab();
      case 'market': return renderMarketTab();
      case 'settings': return renderSettingsTab();
      case 'about': return renderAboutTab();
      case 'signals':
      default: return renderSignalsTab();
    }
  }

  function renderGymActiveTab() {
    if (state.loading) return '<div class="fluz-card">Loading gym stats, bars, and item values...</div>';
    if (!state.gymData) return renderGymSetupCard();
    if (state.gym.activeTab === 'gyms') return renderGymsTab();
    if (state.gym.activeTab === 'boosts') return renderGymBoostsTab();
    return renderGymTrainTab();
  }

  function renderUtilityActiveTab(module) {
    if (state.utility.activeTab === 'scan') return renderVisiblePriceScanner(module);
    if (state.utility.activeTab === 'home') return renderHomeDashboard();
    if (state.utility.activeTab === 'targets') return renderTargetBoard();
    if (state.utility.activeTab === 'chains') return renderTargetChains(module);
    if (state.utility.activeTab === 'factionChains') return renderFactionChainTracker(module);
    if (state.utility.activeTab === 'finder') return renderTargetFinder();
    if (state.utility.activeTab === 'lists') return renderTargetLists();
    if (state.utility.activeTab === 'war') return renderFactionWarTools(module);
    if (state.utility.activeTab === 'guide') return renderUtilityGuide(module);
    if (state.utility.activeTab === 'overview') return renderTargetOverviewTree();
    if (state.utility.activeTab === 'bazaarListings') return renderAllBazaarListings();
    if (state.utility.activeTab === 'raceLoadout') return renderRacingLoadout();
    if (state.utility.activeTab === 'raceMeta') return renderRacingMeta();
    if (state.utility.activeTab === 'database') return renderItemDatabaseTab(module);
    if (state.utility.activeTab === 'addictionAdvisor') return renderAddictionAdvisor({ dedicated: true });
    if (state.utility.activeTab === 'mugCheck') return renderMugProtectionHelper();
    if (state.utility.activeTab === 'links') return renderUtilityLinks(module);
    if (state.utility.activeTab === 'timers') return `${module.key === 'hospital' ? renderHospitalStatusCard() : ''}${renderUtilityTimers(module)}`;
    return renderUtilityTools(module);
  }

  function renderUtilityTools(module) {
    const tools = module.tools || [];
    return `
      <div class="fluz-section-title"><span>${escapeHtml(module.short)} tools</span><span class="fluz-muted">manual assist</span></div>
      ${tools.includes('pricePlanner') ? renderMarketPricePlanner(module) : ''}
      ${module.key === 'itemmarket' ? renderItemMarketHighlightControls() : ''}
      ${module.key === 'itemmarket' && isItemMarketListingToolPage() ? renderVisiblePriceScanner(module) : ''}
      ${module.key === 'itemmarket' && !isItemMarketListingToolPage() ? renderItemMarketBrowseTools() : ''}
      ${tools.includes('homeDashboard') ? renderHomeDashboard() : ''}
      ${tools.includes('crimePlanner') ? renderCrimePlanner() : ''}
      ${tools.includes('travelPlanner') ? renderTravelPlanner() : ''}
      ${tools.includes('missionPlanner') ? renderMissionPlanner() : ''}
      ${tools.includes('propertyPlanner') ? renderPropertyPlanner() : ''}
      ${tools.includes('educationPlanner') ? renderEducationPlanner() : ''}
      ${tools.includes('jobPlanner') ? renderJobPlanner() : ''}
      ${tools.includes('racingGuide') ? renderRacingPlanner() : ''}
      ${tools.includes('inventoryPlanner') ? renderInventoryPlanner() : ''}
      ${tools.includes('cityHub') ? renderCityHub() : ''}
      ${tools.includes('cityStoreScanner') ? renderCityStoreScanner() : ''}
      ${tools.includes('bankPlanner') ? renderBankPlanner() : ''}
      ${tools.includes('casinoPlanner') ? renderCasinoPlanner() : ''}
      ${tools.includes('bountyFilter') ? renderBountyFilter() : ''}
      ${tools.includes('meritTracker') ? renderMeritTracker() : ''}
      ${tools.includes('mugProtection') ? renderMugProtectionHelper() : ''}
      ${tools.includes('hospitalStatus') ? renderHospitalStatusCard() : ''}
      ${tools.includes('addictionAdvisor') && !(module.tabs || []).includes('addictionAdvisor') ? renderAddictionAdvisor() : ''}
      ${tools.includes('targetBoard') ? renderTargetBoard() : ''}
      ${!tools.length ? '<div class="fluz-card">Guide-only module for now.</div>' : ''}
    `;
  }

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

  function renderItemMarketBrowseTools() {
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Item Market browser</div>
        <p class="fluz-muted">The price calculator is hidden here because this is the buying/browsing market. Open Add Listing when you want listing-price tools.</p>
        <div class="fluz-route-grid">
          <a class="fluz-button primary" href="https://www.torn.com/page.php?sid=ItemMarket#/addListing" target="_blank" rel="noopener noreferrer">Open Add Listing</a>
          <a class="fluz-button" href="https://www.torn.com/bazaar.php#/add" target="_blank" rel="noopener noreferrer">Open Bazaar Add</a>
        </div>
      </div>
      ${renderItemMarketBazaarPanel()}
    `;
  }

  function renderItemMarketHighlightControls() {
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Item Market highlights</span><span class="fluz-muted">visual only</span></div>
        <div class="fluz-highlight-control-grid">
          <button class="fluz-button primary" data-action="apply-market-highlights">Apply highlights</button>
          <label>Threshold % vs RRP
            <input class="fluz-percent-input" type="number" min="-100" max="100" step="0.1" data-utility-setting="marketHighlightThresholdPct" value="${escapeHtml(state.utility.marketHighlightThresholdPct ?? -0.5)}" placeholder="-3">
          </label>
          <label>Quick slider
            <input class="fluz-threshold-slider" type="range" min="-10" max="10" step="0.1" data-utility-setting="marketHighlightThresholdPct" value="${escapeHtml(clamp(parseNumber(state.utility.marketHighlightThresholdPct ?? -0.5), -10, 10))}">
            <span class="fluz-slider-scale"><span>cheap -10%</span><span>RRP</span><span>high +10%</span></span>
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="marketHighlightEnabled" ${state.utility.marketHighlightEnabled ? 'checked' : ''}> Enable highlights</label>
        </div>
        <p class="fluz-muted">Green means visible item price is at or below RRP plus your threshold. Example: -0.5 highlights at least 0.5% under RRP; 2 highlights up to 2% above RRP.</p>
      </div>
    `;
  }

  function marketManualHiddenItemSet() {
    return new Set((state.utility.marketHiddenItemIds || []).map((id) => String(id)));
  }

  function marketValueHiddenItemSet() {
    return new Set((state.utility.marketValueHiddenItemIds || []).map((id) => String(id)));
  }

  function marketHiddenItemSet() {
    return new Set([
      ...(state.utility.marketHiddenItemIds || []).map((id) => String(id)),
      ...(state.utility.marketValueHiddenItemIds || []).map((id) => String(id))
    ]);
  }

  function filterAllMarketItems(records = getKnownItemRecords()) {
    const hidden = marketHiddenItemSet();
    const query = String(state.utility.marketAllSearch || '').trim().toLowerCase();
    const minValue = Math.max(0, parseNumber(state.utility.marketAllMinValue || 0));
    return records.filter((item) => {
      if (hidden.has(String(item.id))) return false;
      if (minValue && item.value < minValue) return false;
      if (query && !`${item.name} ${item.id} ${item.category || ''}`.toLowerCase().includes(query)) return false;
      return true;
    });
  }

  function getAllMarketScanItems() {
    const hidden = marketHiddenItemSet();
    return sortedAllMarketItems(getKnownItemRecords().filter((item) => parseNumber(item.value) > 0 && !hidden.has(String(item.id))));
  }

  function sortedAllMarketItems(records) {
    const key = String(state.utility.marketAllSortKey || 'name');
    const dir = state.utility.marketAllSortDir === 'desc' ? -1 : 1;
    const hidden = key === 'hidden' ? marketHiddenItemSet() : null;
    return records.slice().sort((a, b) => {
      let left = String(a.name || '').toLowerCase();
      let right = String(b.name || '').toLowerCase();
      if (key === 'category') {
        left = String(a.category || 'Other').toLowerCase();
        right = String(b.category || 'Other').toLowerCase();
      } else if (key === 'value') {
        left = parseNumber(a.value);
        right = parseNumber(b.value);
      } else if (key === 'id') {
        left = parseNumber(a.id);
        right = parseNumber(b.id);
      } else if (key === 'hidden') {
        left = hidden.has(String(a.id)) ? 1 : 0;
        right = hidden.has(String(b.id)) ? 1 : 0;
      }
      if (typeof left === 'number' && typeof right === 'number') return (left - right) * dir || String(a.name).localeCompare(String(b.name));
      return String(left).localeCompare(String(right)) * dir;
    });
  }

  function getMarketDatabasePage(records) {
    const total = Array.isArray(records) ? records.length : 0;
    const pageSize = MARKET_DATABASE_PAGE_SIZE;
    const pageCount = Math.max(1, Math.ceil(total / pageSize));
    const rawPage = Math.floor(parseNumber(state.utility.marketSettingsPage || 1)) || 1;
    const page = clamp(rawPage, 1, pageCount);
    const start = (page - 1) * pageSize;
    const end = Math.min(total, start + pageSize);
    if (state.utility.marketSettingsPage !== page) state.utility.marketSettingsPage = page;
    return {
      page,
      pageCount,
      pageSize,
      total,
      start,
      end,
      rows: records.slice(start, end)
    };
  }

  function renderMarketDatabasePager(info) {
    if (!info || info.total <= info.pageSize) {
      return `<div class="fluz-market-db-pager"><span class="fluz-muted">${escapeHtml(String(info ? info.total : 0))} items</span></div>`;
    }
    return `
      <div class="fluz-market-db-pager">
        <span class="fluz-muted">${escapeHtml(String(info.start + 1))}-${escapeHtml(String(info.end))} of ${escapeHtml(String(info.total))}</span>
        <button class="fluz-button" data-action="market-database-page" data-page="${escapeHtml(String(info.page - 1))}" ${info.page <= 1 ? 'disabled' : ''}>Prev</button>
        <span class="fluz-muted">Page ${escapeHtml(String(info.page))} / ${escapeHtml(String(info.pageCount))}</span>
        <button class="fluz-button" data-action="market-database-page" data-page="${escapeHtml(String(info.page + 1))}" ${info.page >= info.pageCount ? 'disabled' : ''}>Next</button>
      </div>
    `;
  }

  function getMarketCategoryRows() {
    const hidden = marketHiddenItemSet();
    const map = new Map();
    getKnownItemRecords().forEach((item) => {
      const category = item.category || 'Other';
      if (!map.has(category)) map.set(category, { category, total: 0, hidden: 0 });
      const row = map.get(category);
      row.total += 1;
      if (hidden.has(String(item.id))) row.hidden += 1;
    });
    return Array.from(map.values()).sort((a, b) => a.category.localeCompare(b.category));
  }

  function renderMarketCategoryFilter() {
    const rows = getMarketCategoryRows();
    if (!rows.length) return '';
    const active = rows.filter((row) => row.hidden < row.total).length;
    return `
      <details class="fluz-market-category-filter" open>
        <summary>Category scan filters <span class="fluz-muted">${escapeHtml(String(active))}/${escapeHtml(String(rows.length))} active</span></summary>
        <div class="fluz-market-category-list">
          ${rows.map((row) => {
            const included = Math.max(0, row.total - row.hidden);
            const checked = included > 0;
            const note = included === row.total ? `${row.total} on` : `${included}/${row.total} on`;
            return `
              <label title="${escapeHtml(row.category)} - ${escapeHtml(note)}">
                <input type="checkbox" data-market-category-scan="${escapeHtml(row.category)}" ${checked ? 'checked' : ''}>
                <span>${escapeHtml(row.category)}</span>
                <em class="fluz-muted">${escapeHtml(note)}</em>
              </label>
            `;
          }).join('')}
        </div>
      </details>
    `;
  }

  function renderMarketValueLimitControl() {
    const valueHidden = marketValueHiddenItemSet();
    const limit = Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMax || 0)));
    return `
      <div class="fluz-form-grid" style="margin-top:7px;">
        <label>Hide item value above
          <input type="number" min="0" step="1" data-utility-setting="marketValueLimitMax" value="${escapeHtml(limit)}" placeholder="100000">
        </label>
        <label>Value filter
          <button class="fluz-button primary" type="button" data-action="apply-market-value-limit">Apply</button>
        </label>
      </div>
      <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:6px;">
        <button class="fluz-button" type="button" data-action="clear-market-value-limit" ${limit || valueHidden.size ? '' : 'disabled'}>Clear value limit</button>
        <span class="fluz-muted">${escapeHtml(String(valueHidden.size))} hidden by value limit${limit ? ` over ${escapeHtml(formatMoney(limit))}` : ''}</span>
      </div>
    `;
  }

  function normalizeMarketFilterPresets(presets) {
    if (!Array.isArray(presets)) return [];
    return presets.map((preset) => ({
      id: String(preset && preset.id ? preset.id : `market-preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`),
      name: String(preset && preset.name ? preset.name : 'Market preset').trim() || 'Market preset',
      marketHiddenItemIds: Array.isArray(preset && preset.marketHiddenItemIds) ? preset.marketHiddenItemIds.map((id) => String(id).replace(/\D/g, '')).filter(Boolean) : [],
      marketValueLimitMax: Math.max(0, Math.floor(parseNumber(preset && preset.marketValueLimitMax))),
      marketValueHiddenItemIds: Array.isArray(preset && preset.marketValueHiddenItemIds) ? preset.marketValueHiddenItemIds.map((id) => String(id).replace(/\D/g, '')).filter(Boolean) : [],
      createdAt: parseNumber(preset && preset.createdAt) || nowMs(),
      updatedAt: parseNumber(preset && preset.updatedAt) || nowMs()
    })).filter((preset) => preset.id && preset.name).slice(0, 24);
  }

  function renderMarketFilterPresetControl() {
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const selected = presets.find((preset) => preset.id === state.utility.marketFilterPresetId);
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Filter presets</span><span class="fluz-muted">${presets.length} saved</span></div>
        <div class="fluz-form-grid">
          <label>Preset name
            <input type="text" data-utility-setting="marketFilterPresetName" value="${escapeHtml(state.utility.marketFilterPresetName || (selected && selected.name) || '')}" placeholder="Cheap scan, meds only...">
          </label>
          <label>Saved preset
            <select data-utility-setting="marketFilterPresetId">
              <option value="">Choose preset...</option>
              ${presets.map((preset) => `<option value="${escapeHtml(preset.id)}" ${state.utility.marketFilterPresetId === preset.id ? 'selected' : ''}>${escapeHtml(preset.name)}</option>`).join('')}
            </select>
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" type="button" data-action="save-market-filter-preset">Save current</button>
          <button class="fluz-button" type="button" data-action="load-market-filter-preset" ${presets.length ? '' : 'disabled'}>Load</button>
          <button class="fluz-button danger" type="button" data-action="delete-market-filter-preset" ${presets.length ? '' : 'disabled'}>Delete</button>
        </div>
      </div>
    `;
  }

  function marketResaleNumbers(row) {
    const marketValue = Math.max(0, parseNumber(row && row.marketValue));
    const price = Math.max(0, parseNumber(row && row.price));
    const quantity = Math.max(1, Math.floor(parseNumber(row && row.quantity) || 1));
    const profitEach = marketValue - price;
    const totalProfit = profitEach * quantity;
    const profitPct = price > 0 ? (profitEach / price) * 100 : 0;
    return { marketValue, netMarket: marketValue, price, quantity, profitEach, totalProfit, profitPct };
  }

  function getMarketBazaarMaxAgeMinutes() {
    const value = state.utility.marketBazaarMaxAgeMinutes;
    if (value == null || value === '') return 0;
    return Math.max(0, parseNumber(value));
  }

  function renderAllMarketListings() {
    const minEach = parseNumber(state.utility.marketAllMinProfitEach || 0);
    const minTotal = parseNumber(state.utility.marketAllMinTotalProfit || 0);
    const minDiffPct = parseNumber(state.utility.marketBazaarMinDiffPct || 0);
    const maxSeenMinutes = Math.max(0, parseNumber(state.utility.marketNativeMaxSeenMinutes || 0));
    refreshVisibleTornMarketRows();
    const rows = sortedAllMarketListingRows(state.marketNativeRows || [])
      .filter((row) => {
        const profit = marketResaleNumbers(row);
        if (maxSeenMinutes > 0 && parseNumber(row.seenAt) && nowMs() - parseNumber(row.seenAt) > maxSeenMinutes * 60 * 1000) return false;
        if (minDiffPct && profit.profitPct < minDiffPct) return false;
        return profit.profitEach >= minEach && profit.totalProfit >= minTotal;
      });
    const age = state.marketNativeRowsUpdatedAt ? `${Math.max(0, Math.round((nowMs() - state.marketNativeRowsUpdatedAt) / 1000))}s old` : 'not scanned';
    return `
      <div class="fluz-section-title"><span>Market listings</span><span class="fluz-muted">${rows.length} visible Torn rows - ${escapeHtml(age)}</span></div>
      <div class="fluz-card">
        <div class="fluz-bazaar-filter-grid">
          <label>Search item/seller
            <input type="text" data-utility-setting="marketAllSearch" value="${escapeHtml(state.utility.marketAllSearch || '')}" placeholder="Item or seller">
          </label>
          <label>Min qty
            <input type="number" min="1" data-utility-setting="marketBazaarMinQty" value="${escapeHtml(state.utility.marketBazaarMinQty || 1)}">
          </label>
          <label>Min % diff
            <input type="number" step="0.1" data-utility-setting="marketBazaarMinDiffPct" value="${escapeHtml(state.utility.marketBazaarMinDiffPct || 0)}" placeholder="0">
          </label>
          <label>Hide seen older than
            <input type="number" min="0" data-utility-setting="marketNativeMaxSeenMinutes" value="${escapeHtml(maxSeenMinutes)}" placeholder="0 = keep">
          </label>
          <label>Scan
            <button class="fluz-button primary" data-action="refresh-market-native-listings">Scan visible</button>
          </label>
        </div>
        <p class="fluz-muted">Reads Torn's currently visible Item Market listings and compares price to the Torn item database RRP/value. No TornW3B data is used in this tab.</p>
      </div>
      <div class="fluz-table">
        <div class="fluz-market-bazaar-row is-wide is-head">
          ${renderMarketNativeSortHeader('item', 'Item')}
          ${renderMarketNativeSortHeader('price', 'Price')}
          <span>RRP</span>
          ${renderMarketNativeSortHeader('deal', 'Diff %')}
          ${renderMarketNativeSortHeader('profit', 'Profit')}
          ${renderMarketNativeSortHeader('quantity', 'Qty')}
          <span>Seen</span>
          <span>Open</span>
        </div>
        ${rows.slice(0, 100).map((row) => {
          const profit = marketResaleNumbers(row);
          return `
            <div class="fluz-market-bazaar-row is-wide">
              <b title="${escapeHtml(row.itemName)}">${escapeHtml(row.itemName)}</b>
              <span>${formatFullMoney(row.price)}</span>
              <span>${formatFullMoney(profit.marketValue)}</span>
              <span class="${profit.profitPct >= 0 ? 'fluz-pos' : 'fluz-neg'}">${escapeHtml(formatPct(profit.profitPct))}</span>
              <span><strong class="${profit.profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.profitEach)}</strong><em class="${profit.totalProfit >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.totalProfit)} total</em></span>
              <span>x${escapeHtml(String(row.quantity || 0))}</span>
              <span>${escapeHtml(row.updated || 'visible')}</span>
              <a class="fluz-button primary" href="${escapeHtml(row.url || itemMarketUrl(row.itemName))}" target="_blank" rel="noopener noreferrer">Market</a>
            </div>
          `;
        }).join('') || '<div class="fluz-card">No visible Torn market rows matched. Open an item/category or press Scan visible Torn listings.</div>'}
      </div>
    `;
  }

  function renderAllMarketSortButton(key, label) {
    const active = state.utility.marketAllSortKey === key;
    const suffix = active ? (state.utility.marketAllSortDir === 'asc' ? ' up' : ' down') : '';
    return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-all-market" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderMarketDatabaseSortHeader(key, label) {
    const active = state.utility.marketAllSortKey === key;
    const suffix = active ? ` ${state.utility.marketAllSortDir === 'asc' ? 'up' : 'down'}` : '';
    return `<button class="fluz-table-sort ${active ? 'is-active' : ''}" data-action="sort-all-market" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderAllMarketListingSortButton(key, label) {
    const active = state.utility.marketNativeSortKey === key;
    const suffix = active ? (state.utility.marketNativeSortDir === 'asc' ? ' up' : ' down') : '';
    return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-market-native-listings" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderMarketNativeSortHeader(key, label) {
    const active = state.utility.marketNativeSortKey === key;
    const suffix = active ? ` ${state.utility.marketNativeSortDir === 'asc' ? 'up' : 'down'}` : '';
    return `<button class="fluz-table-sort ${active ? 'is-active' : ''}" data-action="sort-market-native-listings" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderBazaarSortHeader(key, label) {
    const active = state.utility.marketBazaarAllSortKey === key;
    const suffix = active ? ` ${state.utility.marketBazaarAllSortDir === 'asc' ? 'up' : 'down'}` : '';
    return `<button class="fluz-table-sort ${active ? 'is-active' : ''}" data-action="sort-all-bazaar" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function refreshVisibleTornMarketRows(force = false) {
    if (!force && state.marketNativeRowsUpdatedAt && nowMs() - state.marketNativeRowsUpdatedAt < 1200) return state.marketNativeRows || [];
    const rows = scanVisibleTornMarketListingRows();
    if (rows.length) {
      const current = new Map((state.marketNativeRows || []).map((row) => [`${row.itemId || row.itemName}|${row.price}|${row.playerName || ''}`, row]));
      rows.forEach((row) => {
        const key = `${row.itemId || row.itemName}|${row.price}|${row.playerName || ''}`;
        const existing = current.get(key) || {};
        current.set(key, { ...existing, ...row, seenAt: nowMs() });
      });
      state.marketNativeRows = Array.from(current.values()).slice(-220);
    }
    state.marketNativeRowsUpdatedAt = nowMs();
    return state.marketNativeRows || [];
  }

  function scanVisibleTornMarketListingRows(options = {}) {
    if (!document.body) return [];
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    const currentId = currentItemMarketItemId();
    const currentTitle = currentItemMarketItemTitle(currentId);
    const currentItem = known.find((item) => String(item.id) === String(currentId))
      || known.find((item) => item.name && item.name.toLowerCase() === String(currentTitle || '').toLowerCase());
    const nodes = Array.from(new Set([
      ...$all(tornUlCssModuleSelector('sellerList')).flatMap((list) => Array.from(list.children || [])),
      ...$all(tornCssModuleSelector('sellerListWrapper')).flatMap((wrap) => Array.from(wrap.querySelectorAll('li, [class*="seller"], [class*="row"]'))),
      ...Array.from(document.querySelectorAll('li, [class*="seller"], [class*="row"]'))
    ]));
    const seen = new Set();
    const minQty = Math.max(1, parseNumber(options.minQty == null ? state.utility.marketBazaarMinQty || 1 : options.minQty));
    return nodes.map((node) => {
      if (!node || !node.isConnected || node.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`)) return null;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || rect.height > 120) return null;
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (!/\$[\d,.]+[kmbt]?/i.test(text) || !/\b(available|qty|buy|price|\$\d)/i.test(text)) return null;
      const item = findKnownItemInText(text, known) || currentItem;
      if (!item || marketHiddenItemSet().has(String(item.id))) return null;
      const price = extractFirstMoneyFromText(text);
      if (price <= 0 || price > item.value * 25) return null;
      const quantity = extractListingQuantity(text);
      if (quantity < minQty) return null;
      const playerName = extractListingSellerName(text, item.name);
      const key = `${item.id}|${price}|${quantity}|${playerName}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const row = {
        itemId: String(item.id),
        itemName: item.name,
        marketValue: item.value,
        price,
        quantity,
        playerName,
        updated: 'visible',
        url: itemMarketUrl(item.name),
        source: 'Torn',
        seenAt: nowMs()
      };
      if (options.includeNode) row.node = node;
      return row;
    }).filter(Boolean);
  }

  function extractListingQuantity(text) {
    const clean = cleanBookieText(text);
    const patterns = [
      /([\d,]+)\s*available/i,
      /qty\s*:?\s*([\d,]+)/i,
      /quantity\s*:?\s*([\d,]+)/i,
      /x\s*([\d,]+)/i
    ];
    for (const pattern of patterns) {
      const match = clean.match(pattern);
      if (match) return Math.max(1, Math.floor(parseNumber(match[1])));
    }
    return 1;
  }

  function extractListingSellerName(text, itemName) {
    const lines = String(text || '').split(/\n| {2,}/).map((line) => line.trim()).filter(Boolean);
    const itemLower = String(itemName || '').toLowerCase();
    const line = lines.find((entry) => {
      const lower = entry.toLowerCase();
      return entry.length <= 40 && !lower.includes(itemLower) && !/\$|available|qty|quantity|buy|price|fill max/i.test(entry);
    });
    return line || 'Torn listing';
  }

  function sortedAllMarketListingRows(rows) {
    const query = String(state.utility.marketAllSearch || '').trim().toLowerCase();
    const key = state.utility.marketNativeSortKey || 'profit';
    const dir = state.utility.marketNativeSortDir === 'asc' ? 1 : -1;
    return (rows || [])
      .filter((row) => !marketHiddenItemSet().has(String(row.itemId)))
      .filter((row) => !query || `${row.itemName} ${row.playerName} ${row.itemId}`.toLowerCase().includes(query))
      .sort((a, b) => {
        if (key === 'item') return String(a.itemName || '').localeCompare(String(b.itemName || '')) * (state.utility.marketNativeSortDir === 'desc' ? -1 : 1);
        let left = 0;
        let right = 0;
        if (key === 'quantity') {
          left = parseNumber(a.quantity);
          right = parseNumber(b.quantity);
        } else if (key === 'price') {
          left = parseNumber(a.price);
          right = parseNumber(b.price);
        } else if (key === 'totalProfit') {
          left = marketResaleNumbers(a).totalProfit;
          right = marketResaleNumbers(b).totalProfit;
        } else if (key === 'deal') {
          left = marketResaleNumbers(a).profitPct;
          right = marketResaleNumbers(b).profitPct;
        } else {
          left = marketResaleNumbers(a).profitEach;
          right = marketResaleNumbers(b).profitEach;
        }
        if (left === right) return parseNumber(a.price) - parseNumber(b.price);
        return (left - right) * dir;
      });
  }

  function renderAllBazaarListings() {
    const rows = sortedAllBazaarRows(state.marketBazaarAllRows || []);
    const scan = state.marketBazaarAllScan || { index: 0, total: getAllMarketScanItems().length };
    const paused = !!state.utility.marketBazaarScanPaused;
    const progressText = `${rows.length} rows - ${scan.index || 0}/${scan.total || 0} scanned${paused ? ' - paused' : ''}`;
    return `
      <div class="fluz-section-title"><span>Bazaar listings</span><span class="fluz-muted" data-bazaar-scan-progress>${escapeHtml(progressText)}</span></div>
      <div class="fluz-card">
        <div class="fluz-bazaar-filter-grid">
          <label>Search item/seller
            <input type="text" data-utility-setting="marketAllSearch" value="${escapeHtml(state.utility.marketAllSearch || '')}" placeholder="Item or seller">
          </label>
          <label>Min qty
            <input type="number" min="1" data-utility-setting="marketBazaarMinQty" value="${escapeHtml(state.utility.marketBazaarMinQty || 1)}">
          </label>
          <label>Min % diff
            <input type="number" step="0.1" data-utility-setting="marketBazaarMinDiffPct" value="${escapeHtml(state.utility.marketBazaarMinDiffPct || 0)}" placeholder="0">
          </label>
          <label>Hide seen older than
            <input type="number" min="0" data-utility-setting="marketBazaarMaxAgeMinutes" value="${escapeHtml(getMarketBazaarMaxAgeMinutes())}" placeholder="0 = any">
          </label>
          <label>Batch size
            <input type="number" min="1" max="60" data-utility-setting="marketBazaarAllBatchSize" value="${escapeHtml(state.utility.marketBazaarAllBatchSize || 20)}">
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" data-action="scan-all-bazaar-batch" ${paused ? 'disabled' : ''}>Scan next batch</button>
          <button class="fluz-button" data-action="reset-all-bazaar-scan">Reset scan</button>
          <button class="fluz-button ${paused ? 'primary' : ''}" data-action="toggle-all-bazaar-scan-pause">${paused ? 'Resume scans' : 'Pause scans'}</button>
          <label class="fluz-muted" style="display:flex;align-items:center;gap:5px;"><input type="checkbox" data-utility-setting="marketBazaarAutoScan" ${state.utility.marketBazaarAutoScan ? 'checked' : ''}> Auto scan</label>
          <label class="fluz-muted" style="display:flex;align-items:center;gap:5px;"><input type="checkbox" data-utility-setting="marketBazaarMarkSellerVisited" ${state.utility.marketBazaarMarkSellerVisited !== false ? 'checked' : ''}> Mark seller</label>
        </div>
        <p class="fluz-muted">Manual batch scanner via TornW3B / weav3r.dev + FLUZ UI. It scans known items in batches and keeps the best matching bazaar listing per item.</p>
      </div>
      <div class="fluz-table">
        <div class="fluz-market-bazaar-row is-wide is-head">
          ${renderBazaarSortHeader('item', 'Item')}
          ${renderBazaarSortHeader('price', 'Price')}
          ${renderBazaarSortHeader('deal', 'Diff %')}
          ${renderBazaarSortHeader('profit', 'Profit')}
          ${renderBazaarSortHeader('totalProfit', 'Total')}
          ${renderBazaarSortHeader('quantity', 'Qty')}
          ${renderBazaarSortHeader('updated', 'Seen')}
          <span>Open</span>
        </div>
        ${rows.slice(0, 100).map((row) => {
          const profit = marketResaleNumbers(row);
          return `
            <div class="fluz-market-bazaar-row is-wide">
              <b title="${escapeHtml(row.itemName)}">${escapeHtml(row.itemName)}</b>
              <span>${formatFullMoney(row.price)}</span>
              <span class="${row.dealPct >= 0 ? 'fluz-pos' : 'fluz-neg'}">${escapeHtml(formatPct(row.dealPct || 0))}</span>
              <span class="${profit.profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.profitEach)}</span>
              <span class="${profit.totalProfit >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profit.totalProfit)}</span>
              <span>x${escapeHtml(String(row.quantity || 0))}</span>
              <span>${escapeHtml(formatBazaarUpdated(row.updated))}</span>
              ${bazaarLinkButton(row)}
            </div>
          `;
        }).join('') || '<div class="fluz-card">No all-item bazaar rows yet. Leave Auto scan on, or press Scan next batch.</div>'}
      </div>
    `;
  }

  function renderAllBazaarSortButton(key, label) {
    const active = state.utility.marketBazaarAllSortKey === key;
    const suffix = active ? (state.utility.marketBazaarAllSortDir === 'asc' ? ' up' : ' down') : '';
    return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-all-bazaar" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
  }

  function renderItemMarketBazaarPanel() {
    if (!isItemMarketBrowseItemPage()) return '';
    return renderItemMarketBazaarHtml({ native: false });
  }

  function renderItemMarketBazaarHtml(options = {}) {
    const native = !!options.native;
    const itemId = currentItemMarketItemId() || (state.itemMarketBazaarData && state.itemMarketBazaarData.itemId) || '';
    const data = state.itemMarketBazaarData && state.itemMarketBazaarData.itemId === itemId
      ? state.itemMarketBazaarData
      : { itemId, listings: [], fetchedAt: 0, warning: '' };
    const minQty = Math.max(1, parseNumber(state.utility.marketBazaarMinQty || 1));
    const maxAge = getMarketBazaarMaxAgeMinutes();
    const rows = sortedItemMarketBazaarListings(filterItemMarketBazaarRows(data.listings || [], { minQty, maxAge }));
    const age = data.fetchedAt ? `${Math.max(0, Math.round((nowMs() - data.fetchedAt) / 1000))}s old` : 'not loaded';
    const title = currentItemMarketItemTitle(itemId);
    const source = 'TornW3B / weav3r.dev';
    const shellClass = native ? 'fluz-market-bazaar-native' : 'fluz-card compact';
    const warningClass = data.warning && /source|cache|resting|temporarily/i.test(data.warning) ? 'fluz-muted' : 'fluz-error';
    const sortButton = (key, label) => {
      const active = state.utility.marketBazaarSortKey === key;
      const suffix = active ? (state.utility.marketBazaarSortDir === 'asc' ? ' up' : ' down') : '';
      return `<button class="fluz-button ${active ? 'primary' : ''}" data-action="sort-market-bazaar" data-sort-key="${escapeHtml(key)}">${escapeHtml(label + suffix)}</button>`;
    };
    if (native) {
      const maxRows = 100;
      const compactRows = rows.slice(0, maxRows).map((row) => `
        <div class="fluz-market-bazaar-compact-row">
          <a class="fluz-market-bazaar-seller ${isBazaarRowVisited(row) ? 'fluz-bazaar-visited' : ''}" href="${escapeHtml(itemMarketBazaarUrl(row))}" target="_blank" rel="noopener noreferrer" data-action="open-bazaar-link" data-bazaar-url="${escapeHtml(itemMarketBazaarUrl(row))}" data-bazaar-visit-key="${escapeHtml(bazaarVisitKey(row))}" data-bazaar-seller-key="${escapeHtml(bazaarSellerVisitKey(row))}">${escapeHtml(row.playerName || `Player ${row.playerId || ''}`)}</a>
          <strong>Price: ${escapeHtml(formatFullMoney(row.price))}</strong>
          <strong>Qty: ${escapeHtml(String(row.quantity || 0))}</strong>
          <span class="fluz-market-bazaar-time">${escapeHtml(formatBazaarUpdated(row.updated))}</span>
        </div>
      `).join('');
      return `
        <div class="${shellClass}" data-fluz-market-bazaar>
          <div class="fluz-market-bazaar-head">
            <strong>Bazaar Listings for ${escapeHtml(title)}${itemId ? ` (ID: ${escapeHtml(itemId)})` : ''}</strong>
            <span class="fluz-muted">${escapeHtml(state.itemMarketBazaarLoading ? 'loading' : age)}</span>
          </div>
          <div class="fluz-market-bazaar-controls">
            <button class="fluz-button" data-action="refresh-market-bazaar">Refresh</button>
            ${sortButton('price', 'Price')}
            ${sortButton('quantity', 'Qty')}
            ${sortButton('updated', 'Updated')}
            <label>Min Qty <input type="number" min="1" step="1" data-native-market-bazaar-min value="${escapeHtml(minQty)}"></label>
            <label>Max Age <input type="number" min="0" step="1" data-native-market-bazaar-age value="${escapeHtml(maxAge)}" placeholder="min"></label>
          </div>
          ${data.warning ? `<p class="${warningClass}">${escapeHtml(data.warning)}</p>` : ''}
          <div class="fluz-market-bazaar-compact-list">
            ${state.itemMarketBazaarLoading && !rows.length ? '<div class="fluz-market-bazaar-compact-row"><strong>Loading bazaar listings...</strong><span></span><span></span><span></span></div>' : ''}
            ${compactRows || (!state.itemMarketBazaarLoading ? '<div class="fluz-market-bazaar-compact-row"><strong>No bazaar listings matched.</strong><span></span><span></span><span></span></div>' : '')}
          </div>
          <div class="fluz-market-bazaar-foot">
            <span>Showing ${escapeHtml(String(Math.min(rows.length, maxRows)))} bazaars${data.listings && data.listings.length ? ` (${escapeHtml(String(data.listings.reduce((sum, row) => sum + parseNumber(row.quantity), 0)))} items total)` : ''}</span>
            <span>Powered by TornW3B / weav3r.dev + FLUZ UI</span>
          </div>
        </div>
      `;
    }
    const rowHtml = rows.slice(0, ITEM_MARKET_BAZAAR.maxRows).map((row) => `
      <div class="fluz-market-bazaar-row">
        <b title="${escapeHtml(row.playerName)}">${escapeHtml(row.playerName || `Player ${row.playerId || ''}`)}</b>
        <span>${escapeHtml(formatFullMoney(row.price))}</span>
        <span>x${escapeHtml(String(row.quantity || 0))}</span>
        <span>${escapeHtml(formatBazaarUpdated(row.updated))}</span>
        ${bazaarLinkButton(row)}
      </div>
    `).join('');
    return `
      <div class="${shellClass}" data-fluz-market-bazaar>
        <div class="fluz-market-bazaar-head">
          <strong>Bazaar listings for ${escapeHtml(title)}</strong>
          <span class="fluz-muted">${escapeHtml(state.itemMarketBazaarLoading ? 'loading' : age)}</span>
        </div>
        <div class="fluz-market-bazaar-controls">
          <button class="fluz-button" data-action="refresh-market-bazaar">Refresh bazaar</button>
          ${sortButton('price', 'Price')}
          ${sortButton('quantity', 'Qty')}
          ${sortButton('updated', 'Updated')}
          <label>Min qty <input type="number" min="1" step="1" ${native ? 'data-native-market-bazaar-min' : 'data-utility-setting="marketBazaarMinQty"'} value="${escapeHtml(minQty)}"></label>
          <label>Max age <input type="number" min="0" step="1" ${native ? 'data-native-market-bazaar-age' : 'data-utility-setting="marketBazaarMaxAgeMinutes"'} value="${escapeHtml(maxAge)}" placeholder="min"></label>
        </div>
        <p class="fluz-muted">Read-only bazaar snapshot via ${escapeHtml(source)} + FLUZ UI. Links open seller bazaars; no buying or account action is clicked.</p>
        ${data.warning ? `<p class="${warningClass}">${escapeHtml(data.warning)}</p>` : ''}
        <div class="fluz-market-bazaar-rows">
          <div class="fluz-market-bazaar-row is-head"><span>Seller</span><span>Price</span><span>Qty</span><span>Seen</span><span>Open</span></div>
          ${state.itemMarketBazaarLoading && !rows.length ? '<div class="fluz-market-bazaar-row"><b>Loading listings...</b><span></span><span></span><span></span><span></span></div>' : ''}
          ${rowHtml || (!state.itemMarketBazaarLoading ? '<div class="fluz-market-bazaar-row"><b>No bazaar rows matched.</b><span></span><span></span><span></span><span></span></div>' : '')}
        </div>
      </div>
    `;
  }

  function renderMarketPricePlanner(module) {
    const feeKey = getModuleFeeKey(module);
    const fee = MARKET_FEES[feeKey] || MARKET_FEES.itemMarket;
    const base = parseNumber(state.utility.basePrice);
    const qty = Math.max(1, parseNumber(state.utility.quantity));
    const pct = parseNumber(state.utility.percentChange);
    const target = Math.max(1, Math.round(base * (1 + pct / 100)));
    const netEach = target * (1 - fee.feePct / 100);
    const netTotal = netEach * qty;
    const cost = parseNumber(state.utility.buyCost);
    const profitEach = cost > 0 ? netEach - cost : 0;
    return `
      <div class="fluz-card">
        <div class="fluz-section-title">Bulk price planner</div>
        <div class="fluz-form-grid">
          <label>Current price
            <input type="number" min="0" data-utility-setting="basePrice" value="${escapeHtml(state.utility.basePrice)}">
          </label>
          <label>Change %
            <input type="number" step="0.1" data-utility-setting="percentChange" value="${escapeHtml(state.utility.percentChange)}">
          </label>
          <label>Quantity
            <input type="number" min="1" data-utility-setting="quantity" value="${escapeHtml(state.utility.quantity)}">
          </label>
          <label>Buy/cost each
            <input type="number" min="0" data-utility-setting="buyCost" value="${escapeHtml(state.utility.buyCost)}">
          </label>
          <label>Fee mode
            <select data-utility-setting="feeKey">
              ${Object.entries(MARKET_FEES).map(([key, item]) => `<option value="${key}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(item.label)} (${escapeHtml(item.feePct)}%)</option>`).join('')}
            </select>
          </label>
          <label>&nbsp;
            <button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(String(target))}">Copy target</button>
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="fill-market-price" data-price="${escapeHtml(String(target))}">Fill price box</button>
          </label>
        </div>
        <div class="fluz-alert">
          New list price: <strong>${formatFullMoney(target)}</strong> each. Net after ${escapeHtml(fee.feePct)}% fee: <strong>${formatFullMoney(netEach)}</strong> each / <strong>${formatFullMoney(netTotal)}</strong> total.
          ${cost > 0 ? ` Profit after fee: <strong class="${profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatFullMoney(profitEach)}</strong> each.` : ''}
        </div>
        <p class="fluz-muted">${escapeHtml(fee.note)} Fill only writes the number into a focused or visible price field. You still manually set/update/confirm.</p>
      </div>
    `;
  }

  function marketFillButtonKey(itemName, sourcePrice, targetPrice) {
    return [
      itemProfitKey(itemName),
      Math.round(parseNumber(sourcePrice)),
      Math.round(parseNumber(targetPrice))
    ].join('|');
  }

  function isMarketFillButtonUsed(key) {
    return !!(key && state.marketFilledPriceButtons && state.marketFilledPriceButtons[key]);
  }

  function markMarketFillButton(button) {
    if (!button) return;
    const key = String(button.dataset.fillKey || '').trim();
    if (!key) return;
    state.marketFilledPriceButtons = { ...(state.marketFilledPriceButtons || {}), [key]: nowMs() };
    button.classList.add('fluz-fill-used');
  }

  function renderVisiblePriceScanner(module) {
    const feeKey = getModuleFeeKey(module);
    const fee = MARKET_FEES[feeKey] || MARKET_FEES.itemMarket;
    const pct = parseNumber(state.utility.percentChange);
    const rows = scanVisibleMarketItemRows();
    const fallbackPrices = [];
    return `
      <div class="fluz-section-title"><span>Visible item scan</span><span class="fluz-muted">${rows.length} item rows</span></div>
      <div class="fluz-card">
        <p class="fluz-muted">Price is always per 1 item. Each row uses fee % + your profit %. Fill writes only to that item's price field, never quantity.</p>
        <div class="fluz-form-grid">
          <label>Fallback profit %
            <input type="number" step="0.1" data-utility-setting="percentChange" value="${escapeHtml(state.utility.percentChange)}">
          </label>
          <label>Fee mode
            ${renderMarketFeeModeControl(module, feeKey)}
          </label>
        </div>
      </div>
      ${rows.length ? `
        <div class="fluz-market-head fluz-item-scan-head">
          <div>Item</div><div>Qty</div><div>RRP</div><div>Profit %</div><div>Target</div><div>Net</div><div></div>
        </div>
      ` : ''}
      <div class="fluz-table">
        ${rows.length ? rows.map((row) => {
          const profitPct = getItemProfitPct(row.name, pct);
          const adjusted = Math.max(1, Math.round(row.price * (1 + (fee.feePct + profitPct) / 100)));
          const net = adjusted * (1 - fee.feePct / 100);
          const fillKey = marketFillButtonKey(row.name, row.price, adjusted);
          const fillClass = isMarketFillButtonUsed(fillKey) ? ' fluz-fill-used' : '';
          return `<div class="fluz-row fluz-market-row fluz-item-scan-row"><div class="fluz-cell-main" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div><div>x${escapeHtml(row.quantity)}</div><div>${formatMoney(row.price)}</div><div><input class="fluz-row-profit-input" type="number" step="0.1" data-item-profit="${escapeHtml(row.name)}" value="${escapeHtml(profitPct)}"></div><div>${formatMoney(adjusted)}</div><div>${formatMoney(net)}</div><div class="fluz-row-actions"><button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(String(adjusted))}">Copy</button><button class="fluz-button primary${fillClass}" data-action="fill-market-price" data-price="${escapeHtml(String(adjusted))}" data-item-name="${escapeHtml(row.name)}" data-source-price="${escapeHtml(String(Math.round(row.price)))}" data-fill-key="${escapeHtml(fillKey)}">Fill</button></div></div>`;
        }).join('') : fallbackPrices.map((price) => {
          const adjusted = Math.max(1, Math.round(price * (1 + (fee.feePct + pct) / 100)));
          const net = adjusted * (1 - fee.feePct / 100);
          return `<div class="fluz-row fluz-market-row"><div class="fluz-cell-main">${formatMoney(price)}</div><div>Target ${formatMoney(adjusted)}</div><div>Net ${formatMoney(net)}</div><div>${escapeHtml(fee.feePct)}%</div><div class="fluz-row-actions"><button class="fluz-button" data-action="copy-utility-result" data-copy-text="${escapeHtml(String(adjusted))}">Copy</button><button class="fluz-button primary" data-action="fill-market-price" data-price="${escapeHtml(String(adjusted))}">Fill</button></div></div>`;
        }).join('') || '<div class="fluz-card">No visible item rows or prices detected yet.</div>'}
      </div>
    `;
  }

  function renderItemDatabaseTab(module) {
    const hidden = marketHiddenItemSet();
    const query = String(state.utility.marketSettingsSearch || '').trim().toLowerCase();
    const records = sortedAllMarketItems(getKnownItemRecords()
      .filter((item) => !query || `${item.name} ${item.id} ${item.category || ''}`.toLowerCase().includes(query)));
    const itemCache = state.cacheInfo && state.cacheInfo.gymItems;
    const age = itemCache && itemCache.fetchedAt ? `${Math.round((nowMs() - itemCache.fetchedAt) / 1000)}s old` : 'not loaded';
    const title = module && module.key === 'bazaar' ? 'Bazaar reference database' : 'Item market reference database';
    const hiddenCount = getKnownItemRecords().filter((item) => hidden.has(String(item.id))).length;
    const includedCount = Math.max(0, getKnownItemRecords().length - hiddenCount);
    const page = getMarketDatabasePage(records);
    return `
      <div class="fluz-section-title"><span>${escapeHtml(title)}</span><span class="fluz-muted">${includedCount} scanning / ${hiddenCount} skipped - ${escapeHtml(age)}</span></div>
      <div class="fluz-card">
        <div class="fluz-form-grid">
          <label>Search item
            <input type="text" data-utility-setting="marketSettingsSearch" value="${escapeHtml(state.utility.marketSettingsSearch || '')}" placeholder="Cell Phone, Xanax, Medical, ID...">
          </label>
        </div>
        <p class="fluz-muted">Checked items are included in Market Listings recognition and all-item Bazaar scanning. Uncheck items you do not care about to make scans faster and save scan slots.</p>
      </div>
      ${records.length ? `
        <div class="fluz-market-head fluz-item-db-head">
          ${renderMarketDatabaseSortHeader('name', 'Item')}
          ${renderMarketDatabaseSortHeader('category', 'Type')}
          ${renderMarketDatabaseSortHeader('value', 'Value')}
          ${renderMarketDatabaseSortHeader('id', 'ID')}
          ${renderMarketDatabaseSortHeader('hidden', 'Scan')}
        </div>
        ${renderMarketDatabasePager(page)}
        <div class="fluz-table">
          ${page.rows.map((item) => {
            const included = !hidden.has(String(item.id));
            return `
            <div class="fluz-row fluz-market-row fluz-item-db-row">
              <div class="fluz-cell-main" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</div>
              <div title="${escapeHtml(item.category || 'Other')}">${escapeHtml(item.category || 'Other')}</div>
              <div>${formatMoney(item.value)}</div>
              <div>#${escapeHtml(item.id)}</div>
              <label class="fluz-check" title="${included ? 'Included in scans' : 'Skipped by scans'}"><input type="checkbox" data-market-scan-item="${escapeHtml(item.id)}" ${included ? 'checked' : ''}> ${included ? 'On' : 'Off'}</label>
            </div>
          `;
          }).join('')}
        </div>
        ${renderMarketDatabasePager(page)}
      ` : '<div class="fluz-card">No item database rows matched. Add a Limited API key, press refresh, or clear the search.</div>'}
    `;
  }

  function renderMarketFeeModeControl(module, feeKey) {
    if (module && module.key === 'bazaar') {
      return '<select disabled><option>Bazaar (0%) - locked</option></select>';
    }
    if (module && module.key === 'itemmarket') {
      return `
        <select data-utility-setting="itemmarketFeeKey">
          ${['retail', 'itemMarket', 'itemMarketAnon'].map((key) => {
            const item = MARKET_FEES[key];
            return `<option value="${key}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(item.label)} (${escapeHtml(item.feePct)}%)</option>`;
          }).join('')}
        </select>
      `;
    }
    return `
      <select data-utility-setting="feeKey">
        ${Object.entries(MARKET_FEES).map(([key, item]) => `<option value="${key}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(item.label)} (${escapeHtml(item.feePct)}%)</option>`).join('')}
      </select>
    `;
  }

  function currentItemMarketItemTitle(itemId = currentItemMarketItemId()) {
    if (state.itemMarketBazaarTitle && (!itemId || state.itemMarketBazaarTitleItemId === itemId)) return state.itemMarketBazaarTitle;
    const placement = findItemMarketBazaarPlacement(false);
    if (placement && placement.itemName && (!itemId || placement.itemId === itemId)) return placement.itemName;
    const selectors = [
      '[class^="itemsHeader"] [class^="title"]',
      '[class*=" itemsHeader"] [class*=" title"]',
      '[class^="itemInfo"] [class^="name"]',
      '[class*=" itemInfo"] [class*=" name"]',
      'h1'
    ];
    for (const selector of selectors) {
      const element = $(selector);
      const text = element ? String(element.textContent || '').trim() : '';
      if (text && !/item market/i.test(text)) return text.replace(/\s+/g, ' ');
    }
    const category = currentItemMarketCategoryName();
    return itemId ? `Item #${itemId}${category ? ` (${category})` : ''}` : 'selected item';
  }

  function normalizeItemMarketBazaarListing(raw, fallbackItemId) {
    const playerId = String(raw && (raw.player_id || raw.playerId || raw.user_id || raw.userId) || '').trim();
    return {
      itemId: String(raw && (raw.item_id || raw.itemId) || fallbackItemId || '').trim(),
      playerId,
      playerName: String(raw && (raw.player_name || raw.playerName || raw.name) || (playerId ? `Player ${playerId}` : 'Unknown seller')).trim(),
      quantity: Math.max(0, Math.floor(parseNumber(raw && raw.quantity))),
      price: Math.max(0, Math.round(parseNumber(raw && raw.price))),
      updated: raw && (raw.last_checked || raw.updated || raw.updatedAt || raw.lastChecked || '')
    };
  }

  function filterItemMarketBazaarRows(listings, options = {}) {
    const minQty = Math.max(1, parseNumber(options.minQty || state.utility.marketBazaarMinQty || 1));
    const maxAgeMinutes = options.maxAge == null ? getMarketBazaarMaxAgeMinutes() : Math.max(0, parseNumber(options.maxAge));
    const maxAgeMs = maxAgeMinutes > 0 ? maxAgeMinutes * 60 * 1000 : 0;
    return (listings || []).filter((row) => {
      if (parseNumber(row.quantity) < minQty) return false;
      if (maxAgeMs > 0) {
        const updatedMs = parseBazaarUpdatedMs(row.updated);
        if (!Number.isFinite(updatedMs) || nowMs() - updatedMs > maxAgeMs) return false;
      }
      return true;
    });
  }

  function sortedItemMarketBazaarListings(listings) {
    const key = state.utility.marketBazaarSortKey || 'price';
    const dir = state.utility.marketBazaarSortDir === 'desc' ? -1 : 1;
    return [...(listings || [])].sort((a, b) => {
      let left = 0;
      let right = 0;
      if (key === 'quantity') {
        left = parseNumber(a.quantity);
        right = parseNumber(b.quantity);
      } else if (key === 'updated') {
        left = parseBazaarUpdatedMs(a.updated);
        right = parseBazaarUpdatedMs(b.updated);
      } else {
        left = parseNumber(a.price);
        right = parseNumber(b.price);
      }
      if (left === right) return parseNumber(a.price) - parseNumber(b.price);
      return (left - right) * dir;
    });
  }

  function sortedAllBazaarRows(rows) {
    const query = String(state.utility.marketAllSearch || '').trim().toLowerCase();
    const minDiffPct = parseNumber(state.utility.marketBazaarMinDiffPct || 0);
    const key = state.utility.marketBazaarAllSortKey || 'totalProfit';
    const dir = state.utility.marketBazaarAllSortDir === 'asc' ? 1 : -1;
    return filterItemMarketBazaarRows(rows || [])
      .filter((row) => !marketHiddenItemSet().has(String(row.itemId)))
      .filter((row) => !query || `${row.itemName} ${row.playerName} ${row.itemId}`.toLowerCase().includes(query))
      .filter((row) => !minDiffPct || parseNumber(row.dealPct) >= minDiffPct)
      .sort((a, b) => {
        let left = 0;
        let right = 0;
        if (key === 'item') {
          return String(a.itemName || '').localeCompare(String(b.itemName || '')) * (state.utility.marketBazaarAllSortDir === 'desc' ? -1 : 1);
        }
        if (key === 'quantity') {
          left = parseNumber(a.quantity);
          right = parseNumber(b.quantity);
        } else if (key === 'updated') {
          left = parseBazaarUpdatedMs(a.updated);
          right = parseBazaarUpdatedMs(b.updated);
        } else if (key === 'price') {
          left = parseNumber(a.price);
          right = parseNumber(b.price);
        } else if (key === 'profit') {
          left = marketResaleNumbers(a).profitEach;
          right = marketResaleNumbers(b).profitEach;
        } else if (key === 'totalProfit') {
          left = marketResaleNumbers(a).totalProfit;
          right = marketResaleNumbers(b).totalProfit;
        } else if (key === 'value') {
          left = parseNumber(a.marketValue);
          right = parseNumber(b.marketValue);
        } else {
          left = parseNumber(a.dealPct);
          right = parseNumber(b.dealPct);
        }
        if (left === right) return parseNumber(a.price) - parseNumber(b.price);
        return (left - right) * dir;
      });
  }

  async function scanAllBazaarBatch(options = {}) {
    if (state.utility.marketBazaarScanPaused) {
      if (!options.silent) showFlash('Bazaar scanning is paused. Press Resume scans first.');
      return;
    }
    const records = getAllMarketScanItems();
    if (!records.length) {
      if (!options.silent) showFlash('No item database records matched the filters.');
      return;
    }
    const batchSize = clamp(Math.round(parseNumber(options.batchSize || state.utility.marketBazaarAllBatchSize) || 20), 1, 60);
    const scan = state.marketBazaarAllScan || { index: 0, total: records.length };
    let start = Math.min(scan.index || 0, records.length);
    if (start >= records.length && options.auto) start = 0;
    const batch = records.slice(start, start + batchSize);
    if (!batch.length) {
      if (!options.silent) showFlash('All filtered items scanned. Press Reset scan to start over.');
      return;
    }
    state.marketBazaarAllLoading = true;
    state.marketBazaarAllScan = { index: start, total: records.length };
    renderBazaarScanProgress(options);
    const currentRows = new Map((state.marketBazaarAllRows || []).map((row) => [String(row.itemId), row]));
    const applyBest = (item, best) => {
      if (!best) return;
      const dealPct = best.price > 0 ? ((item.value - best.price) / best.price) * 100 : 0;
      currentRows.set(String(item.id), { ...best, itemName: item.name, marketValue: item.value, dealPct, scannedAt: nowMs() });
    };
    if (options.auto) {
      const results = await Promise.allSettled(batch.map((item) => fetchBestBazaarListingForItem(item)));
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          state.marketBazaarSourceErrorStreak = 0;
          applyBest(batch[index], result.value);
        }
        else {
          if (isBazaarSourceTemporaryError(result.reason)) {
            state.marketBazaarSourceErrorStreak = (state.marketBazaarSourceErrorStreak || 0) + 1;
            if (state.marketBazaarSourceErrorStreak >= 3) state.marketBazaarSourceCooldownUntil = nowMs() + 20000;
          }
          console.debug(`${APP.name}: all bazaar scan failed for ${batch[index].name}`, result.reason);
        }
      });
    } else {
      for (const item of batch) {
        try {
          applyBest(item, await fetchBestBazaarListingForItem(item));
          state.marketBazaarSourceErrorStreak = 0;
          await sleep(120);
        } catch (error) {
          if (isBazaarSourceTemporaryError(error)) {
            state.marketBazaarSourceErrorStreak = (state.marketBazaarSourceErrorStreak || 0) + 1;
            if (state.marketBazaarSourceErrorStreak >= 3) state.marketBazaarSourceCooldownUntil = nowMs() + 20000;
          }
          console.debug(`${APP.name}: all bazaar scan failed for ${item.name}`, error);
        }
      }
    }
    state.marketBazaarAllRows = Array.from(currentRows.values());
    state.marketBazaarAllScan = { index: start + batch.length >= records.length ? records.length : start + batch.length, total: records.length };
    state.marketBazaarAllLoading = false;
    await saveMarketBazaarScanCache(!options.silent);
    renderBazaarScanProgress(options, true);
    if (!options.silent) showFlash(`Scanned ${batch.length} items for bazaar listings.`);
  }

  async function fetchBestBazaarListingForItem(item) {
    const json = await httpGetJson(`${ITEM_MARKET_BAZAAR.endpoint}${encodeURIComponent(item.id)}`);
    const rows = Array.isArray(json && json.listings)
      ? json.listings.map((row) => ({ ...normalizeItemMarketBazaarListing(row, item.id), itemName: item.name, marketValue: item.value }))
      : [];
    const listings = rows.map((row) => normalizeItemMarketBazaarListing(row, item.id)).filter((row) => row.playerId && row.price > 0);
    if (listings.length) {
      await writeJsonStorage(itemMarketBazaarCacheKey(item.id), {
        itemId: String(item.id),
        listings,
        fetchedAt: nowMs(),
        warning: ''
      });
    }
    return sortedItemMarketBazaarListings(filterItemMarketBazaarRows(rows))[0] || null;
  }

  function isBazaarSourceTemporaryError(error) {
    const message = error && error.message ? error.message : String(error || '');
    return /non-json|parse json|<!doctype|unexpected token|http 429|http 403|http 502|http 503|http 504/i.test(message);
  }

  function renderBazaarScanProgress(options = {}, finished = false) {
    if (!options.silent) {
      renderPanelPreservingScroll();
      return;
    }
    updateBazaarScanProgressText();
    const now = nowMs();
    if (finished
      && state.utility.activeTab === 'bazaarListings'
      && !isUserEditingText()
      && now - (state.marketBazaarAllLastRenderAt || 0) > ITEM_MARKET_BAZAAR.autoRenderThrottleMs) {
      state.marketBazaarAllLastRenderAt = now;
      renderPanelPreservingScroll();
    }
  }

  function updateBazaarScanProgressText() {
    const label = $(`#${APP.id} [data-bazaar-scan-progress]`);
    if (!label) return;
    const rows = state.marketBazaarAllRows || [];
    const scan = state.marketBazaarAllScan || { index: 0, total: getAllMarketScanItems().length };
    label.textContent = `${rows.length} rows - ${scan.index || 0}/${scan.total || 0} scanned${state.utility.marketBazaarScanPaused ? ' - paused' : ''}`;
  }

  function isUserEditingText() {
    const active = document.activeElement;
    if (!active) return false;
    return /^(INPUT|TEXTAREA|SELECT)$/i.test(active.tagName || '') || active.isContentEditable;
  }

  function scheduleAllBazaarAutoScan(options = {}) {
    clearTimeout(state.marketBazaarAllAutoTimer);
    const module = state.mode === 'utility' ? getUtilityModule() : null;
    if (!module || module.key !== 'itemmarket' || !state.utility.marketBazaarAutoScan || state.utility.marketBazaarScanPaused) return;
    const now = nowMs();
    const canKickstart = !!options.immediate
      && state.utility.activeTab === 'bazaarListings'
      && !state.marketBazaarAllLoading
      && now - (state.marketBazaarAllAutoKickAt || 0) > 1200;
    const delayMs = canKickstart ? 60 : ITEM_MARKET_BAZAAR.autoDelayMs;
    if (canKickstart) state.marketBazaarAllAutoKickAt = now;
    state.marketBazaarAllAutoTimer = setTimeout(async () => {
      if (state.marketBazaarSourceCooldownUntil && nowMs() < state.marketBazaarSourceCooldownUntil) {
        scheduleAllBazaarAutoScan();
        return;
      }
      if (!state.utility.marketBazaarAutoScan || state.utility.marketBazaarScanPaused || state.marketBazaarAllLoading) {
        scheduleAllBazaarAutoScan();
        return;
      }
      await scanAllBazaarBatch({ auto: true, batchSize: ITEM_MARKET_BAZAAR.autoBatchSize, silent: true });
      scheduleAllBazaarAutoScan();
    }, delayMs);
  }

  async function resetAllBazaarScan() {
    state.marketBazaarAllRows = [];
    state.marketBazaarAllScan = { index: 0, total: getAllMarketScanItems().length };
    await saveMarketBazaarScanCache(true);
    renderPanelPreservingScroll();
    showFlash('All-item bazaar scan reset.');
  }

  async function toggleAllBazaarScanPause() {
    state.utility.marketBazaarScanPaused = !state.utility.marketBazaarScanPaused;
    await saveUtilityState();
    scheduleAllBazaarAutoScan();
    renderPanelPreservingScroll();
    showFlash(state.utility.marketBazaarScanPaused ? 'Bazaar scans paused.' : 'Bazaar scans resumed.');
  }

  function formatBazaarUpdated(value) {
    if (!value) return '--';
    const parsed = parseBazaarUpdatedMs(value);
    if (!Number.isFinite(parsed)) return String(value).replace(/[TZ]/g, ' ').trim().slice(0, 12) || '--';
    const seconds = Math.max(0, Math.round((nowMs() - parsed) / 1000));
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }

  function parseBazaarUpdatedMs(value) {
    if (value == null || value === '') return NaN;
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
      const number = Number(value);
      if (!Number.isFinite(number)) return NaN;
      return number > 100000000000 ? number : number * 1000;
    }
    return Date.parse(value);
  }

  function itemMarketBazaarUrl(row) {
    const playerId = encodeURIComponent(row && row.playerId ? row.playerId : '');
    const itemId = encodeURIComponent(row && row.itemId ? row.itemId : currentItemMarketItemId());
    return `https://www.torn.com/bazaar.php?userId=${playerId}&itemId=${itemId}&highlight=1#/`;
  }

  function bazaarVisitKey(row) {
    if (!row) return '';
    const updated = parseBazaarUpdatedMs(row.updated);
    const updatedKey = Number.isFinite(updated) ? String(updated) : String(row.updated || '');
    return [
      row.itemId || row.itemName || '',
      row.playerId || row.playerName || '',
      Math.round(parseNumber(row.price)),
      Math.max(0, Math.floor(parseNumber(row.quantity))),
      updatedKey
    ].map((part) => String(part).trim()).join('|');
  }

  function bazaarSellerVisitKey(row) {
    if (!row) return '';
    const seller = String(row.playerId || row.playerName || '').trim();
    return seller ? `seller|${seller}` : '';
  }

  function isBazaarRowVisited(row) {
    const visited = state.utility.marketVisitedBazaarLinks || {};
    const exact = bazaarVisitKey(row);
    const seller = bazaarSellerVisitKey(row);
    return !!(exact && visited[exact]) || !!(state.utility.marketBazaarMarkSellerVisited !== false && seller && visited[seller]);
  }

  function bazaarLinkButton(row, label = 'Bazaar') {
    const url = itemMarketBazaarUrl(row);
    const key = bazaarVisitKey(row);
    const sellerKey = bazaarSellerVisitKey(row);
    const visited = isBazaarRowVisited(row);
    return `<a class="fluz-button primary ${visited ? 'fluz-bazaar-visited' : ''}" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" data-action="open-bazaar-link" data-bazaar-url="${escapeHtml(url)}" data-bazaar-visit-key="${escapeHtml(key)}" data-bazaar-seller-key="${escapeHtml(sellerKey)}">${escapeHtml(label)}</a>`;
  }

  async function openBazaarLink(url, key, sellerKey = '') {
    const cleanUrl = String(url || 'https://www.torn.com/bazaar.php');
    const cleanKey = String(key || '').trim();
    const cleanSellerKey = String(sellerKey || '').trim();
    window.open(cleanUrl, '_blank', 'noopener,noreferrer');
    if (cleanKey || cleanSellerKey) {
      const current = state.utility.marketVisitedBazaarLinks && typeof state.utility.marketVisitedBazaarLinks === 'object'
        ? state.utility.marketVisitedBazaarLinks
        : {};
      const next = { ...current };
      if (cleanKey) next[cleanKey] = nowMs();
      if (state.utility.marketBazaarMarkSellerVisited !== false && cleanSellerKey) next[cleanSellerKey] = nowMs();
      state.utility.marketVisitedBazaarLinks = next;
      await saveUtilityState();
      renderPanelPreservingScroll();
    }
  }

  function itemMarketBazaarCacheKey(itemId) {
    return toCacheKey(`itemMarketBazaar.${itemId}`);
  }

  async function loadItemMarketBazaarListings(force = false) {
    const itemId = currentItemMarketItemId();
    if (!itemId) {
      state.itemMarketBazaarData = { itemId: '', listings: [], fetchedAt: 0, warning: '' };
      renderNativeItemMarketBazaarPanel();
      return false;
    }
    const cacheKey = itemMarketBazaarCacheKey(itemId);
    const cached = await readJsonStorage(cacheKey, null);
    const fresh = cached && cached.fetchedAt && nowMs() - cached.fetchedAt < ITEM_MARKET_BAZAAR.cacheTtlMs;
    if (!force && fresh) {
      state.itemMarketBazaarData = { itemId, listings: Array.isArray(cached.listings) ? cached.listings : [], fetchedAt: cached.fetchedAt, warning: '' };
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
      return true;
    }
    if (state.marketBazaarSourceCooldownUntil && nowMs() < state.marketBazaarSourceCooldownUntil) {
      const cachedListings = cached && Array.isArray(cached.listings) ? cached.listings : [];
      state.itemMarketBazaarData = {
        itemId,
        listings: cachedListings,
        fetchedAt: cached && cached.fetchedAt ? cached.fetchedAt : 0,
        warning: cachedListings.length
          ? 'Bazaar source is resting. Showing cached rows.'
          : 'Bazaar source is resting. No cached rows for this item yet.'
      };
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
      return false;
    }
    state.itemMarketBazaarLoading = true;
    state.itemMarketBazaarData = {
      itemId,
      listings: cached && Array.isArray(cached.listings) ? cached.listings : [],
      fetchedAt: cached && cached.fetchedAt ? cached.fetchedAt : 0,
      warning: ''
    };
    renderPanelPreservingScroll();
    renderNativeItemMarketBazaarPanel();
    try {
      const json = await httpGetJson(`${ITEM_MARKET_BAZAAR.endpoint}${encodeURIComponent(itemId)}`);
      const listings = Array.isArray(json && json.listings)
        ? json.listings.map((row) => normalizeItemMarketBazaarListing(row, itemId)).filter((row) => row.playerId && row.price > 0)
        : [];
      state.itemMarketBazaarData = { itemId, listings, fetchedAt: nowMs(), warning: '' };
      await writeJsonStorage(cacheKey, state.itemMarketBazaarData);
      return true;
    } catch (error) {
      const hasCachedRows = !!(cached && Array.isArray(cached.listings) && cached.listings.length);
      const warning = isBazaarSourceTemporaryError(error) && hasCachedRows
        ? 'Bazaar source temporarily unavailable. Showing cached rows.'
        : (isBazaarSourceTemporaryError(error)
          ? 'Bazaar source temporarily unavailable. No cached rows for this item yet.'
          : `Bazaar source unavailable: ${friendlyError(error)}`);
      if (isBazaarSourceTemporaryError(error)) state.marketBazaarSourceCooldownUntil = nowMs() + 15000;
      state.itemMarketBazaarData = {
        itemId,
        listings: cached && Array.isArray(cached.listings) ? cached.listings : [],
        fetchedAt: cached && cached.fetchedAt ? cached.fetchedAt : 0,
        warning
      };
      return false;
    } finally {
      state.itemMarketBazaarLoading = false;
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
    }
  }

  function renderPanelPreservingScroll() {
    if (!state.elements.panel) return;
    const scrollTop = getPanelContentScrollTop();
    renderPanel();
    restorePanelContentScrollTop(scrollTop);
  }

  async function sortItemMarketBazaarListings(key) {
    const current = state.utility.marketBazaarSortKey || 'price';
    if (current === key) state.utility.marketBazaarSortDir = state.utility.marketBazaarSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketBazaarSortKey = key;
      state.utility.marketBazaarSortDir = key === 'updated' ? 'desc' : 'asc';
    }
    await saveUtilityState();
    renderPanelPreservingScroll();
    renderNativeItemMarketBazaarPanel();
  }

  async function sortAllMarketItems(key) {
    const cleanKey = String(key || '').trim();
    if (!['name', 'category', 'value', 'id', 'hidden'].includes(cleanKey)) return;
    if (state.utility.marketAllSortKey === cleanKey) state.utility.marketAllSortDir = state.utility.marketAllSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketAllSortKey = cleanKey;
      state.utility.marketAllSortDir = ['name', 'category', 'hidden'].includes(cleanKey) ? 'asc' : 'desc';
    }
    state.utility.marketSettingsPage = 1;
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function setMarketDatabasePage(page) {
    state.utility.marketSettingsPage = Math.max(1, Math.floor(parseNumber(page) || 1));
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function sortMarketNativeListings(key) {
    const cleanKey = String(key || '').trim();
    if (!['profit', 'totalProfit', 'deal', 'price', 'quantity', 'item'].includes(cleanKey)) return;
    if (state.utility.marketNativeSortKey === cleanKey) state.utility.marketNativeSortDir = state.utility.marketNativeSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketNativeSortKey = cleanKey;
      state.utility.marketNativeSortDir = ['price', 'item'].includes(cleanKey) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    refreshVisibleTornMarketRows(true);
    renderPanelPreservingScroll();
  }

  async function sortAllBazaarListings(key) {
    const cleanKey = String(key || '').trim();
    if (!['deal', 'profit', 'totalProfit', 'price', 'quantity', 'updated', 'item', 'value'].includes(cleanKey)) return;
    if (state.utility.marketBazaarAllSortKey === cleanKey) state.utility.marketBazaarAllSortDir = state.utility.marketBazaarAllSortDir === 'asc' ? 'desc' : 'asc';
    else {
      state.utility.marketBazaarAllSortKey = cleanKey;
      state.utility.marketBazaarAllSortDir = ['price', 'updated', 'item'].includes(cleanKey) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    renderPanelPreservingScroll();
  }

  async function hideMarketItem(itemId) {
    const id = String(itemId || '').replace(/\D/g, '');
    if (!id) return;
    const set = marketManualHiddenItemSet();
    set.add(id);
    state.utility.marketHiddenItemIds = Array.from(set).sort((a, b) => parseNumber(a) - parseNumber(b));
    state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => String(row.itemId) !== id);
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function unhideMarketItem(itemId) {
    const id = String(itemId || '').replace(/\D/g, '');
    state.utility.marketHiddenItemIds = (state.utility.marketHiddenItemIds || []).filter((item) => String(item) !== id);
    state.utility.marketValueHiddenItemIds = (state.utility.marketValueHiddenItemIds || []).filter((item) => String(item) !== id);
    await saveUtilityState();
    openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function setMarketItemScanEnabled(itemId, enabled) {
    const id = String(itemId || '').replace(/\D/g, '');
    if (!id) return;
    const set = marketManualHiddenItemSet();
    const valueSet = marketValueHiddenItemSet();
    if (enabled) set.delete(id);
    else set.add(id);
    if (enabled) valueSet.delete(id);
    state.utility.marketHiddenItemIds = Array.from(set).sort((a, b) => parseNumber(a) - parseNumber(b));
    state.utility.marketValueHiddenItemIds = Array.from(valueSet).sort((a, b) => parseNumber(a) - parseNumber(b));
    if (!enabled) {
      state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => String(row.itemId) !== id);
      state.marketNativeRows = (state.marketNativeRows || []).filter((row) => String(row.itemId) !== id);
    }
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    renderPanelPreservingScroll();
  }

  async function setMarketCategoryScanEnabled(category, enabled) {
    const cleanCategory = String(category || '').trim();
    if (!cleanCategory) return;
    const records = getKnownItemRecords().filter((item) => String(item.category || 'Other') === cleanCategory);
    if (!records.length) return;
    const ids = new Set(records.map((item) => String(item.id)));
    const hidden = marketManualHiddenItemSet();
    const valueHidden = marketValueHiddenItemSet();
    ids.forEach((id) => {
      if (enabled) hidden.delete(id);
      else hidden.add(id);
      if (enabled) valueHidden.delete(id);
    });
    state.utility.marketHiddenItemIds = Array.from(hidden).sort((a, b) => parseNumber(a) - parseNumber(b));
    state.utility.marketValueHiddenItemIds = Array.from(valueHidden).sort((a, b) => parseNumber(a) - parseNumber(b));
    if (!enabled) {
      state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => !ids.has(String(row.itemId)));
      state.marketNativeRows = (state.marketNativeRows || []).filter((row) => !ids.has(String(row.itemId)));
    }
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function applyMarketValueLimit() {
    const maxValue = Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMax || 0)));
    state.utility.marketValueLimitMax = maxValue;
    if (maxValue > 0) {
      state.utility.marketValueHiddenItemIds = getKnownItemRecords()
        .filter((item) => parseNumber(item.value) > maxValue)
        .map((item) => String(item.id))
        .sort((a, b) => parseNumber(a) - parseNumber(b));
    } else {
      state.utility.marketValueHiddenItemIds = [];
    }
    const effectiveHidden = marketHiddenItemSet();
    state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => !effectiveHidden.has(String(row.itemId)));
    state.marketNativeRows = (state.marketNativeRows || []).filter((row) => !effectiveHidden.has(String(row.itemId)));
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
    showFlash(maxValue > 0 ? `Market value limit applied: ${formatMoney(maxValue)} max.` : 'Market value limit cleared.');
  }

  async function refreshMarketFilterDisplays() {
    const effectiveHidden = marketHiddenItemSet();
    state.marketBazaarAllRows = (state.marketBazaarAllRows || []).filter((row) => !effectiveHidden.has(String(row.itemId)));
    state.marketNativeRows = (state.marketNativeRows || []).filter((row) => !effectiveHidden.has(String(row.itemId)));
    state.marketBazaarAllScan = { ...(state.marketBazaarAllScan || {}), total: getAllMarketScanItems().length };
    await saveUtilityState();
    await saveMarketBazaarScanCache(true);
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    renderPanelPreservingScroll();
  }

  async function saveMarketFilterPreset() {
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const selectedId = String(state.utility.marketFilterPresetId || '');
    const existing = presets.find((preset) => preset.id === selectedId);
    const name = cleanBookieText(state.utility.marketFilterPresetName || (existing && existing.name) || `Preset ${presets.length + 1}`);
    const now = nowMs();
    const next = {
      id: existing ? existing.id : `market-preset-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      name: name || `Preset ${presets.length + 1}`,
      marketHiddenItemIds: (state.utility.marketHiddenItemIds || []).map(String),
      marketValueLimitMax: Math.max(0, Math.floor(parseNumber(state.utility.marketValueLimitMax || 0))),
      marketValueHiddenItemIds: (state.utility.marketValueHiddenItemIds || []).map(String),
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now
    };
    const index = presets.findIndex((preset) => preset.id === next.id);
    if (index >= 0) presets[index] = next;
    else presets.unshift(next);
    state.utility.marketFilterPresets = normalizeMarketFilterPresets(presets);
    state.utility.marketFilterPresetId = next.id;
    state.utility.marketFilterPresetName = next.name;
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    showFlash(`Saved market filter preset: ${next.name}`);
  }

  async function loadMarketFilterPreset() {
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const preset = presets.find((item) => item.id === state.utility.marketFilterPresetId);
    if (!preset) {
      showFlash('Choose a market filter preset first.');
      return;
    }
    state.utility.marketHiddenItemIds = preset.marketHiddenItemIds.map(String);
    state.utility.marketValueLimitMax = Math.max(0, Math.floor(parseNumber(preset.marketValueLimitMax || 0)));
    state.utility.marketValueHiddenItemIds = (preset.marketValueHiddenItemIds || []).map(String);
    state.utility.marketFilterPresetName = preset.name;
    await refreshMarketFilterDisplays();
    showFlash(`Loaded market filter preset: ${preset.name}`);
  }

  async function deleteMarketFilterPreset() {
    const presets = normalizeMarketFilterPresets(state.utility.marketFilterPresets);
    const preset = presets.find((item) => item.id === state.utility.marketFilterPresetId);
    if (!preset) {
      showFlash('Choose a market filter preset first.');
      return;
    }
    state.utility.marketFilterPresets = presets.filter((item) => item.id !== preset.id);
    state.utility.marketFilterPresetId = '';
    state.utility.marketFilterPresetName = '';
    await saveUtilityState();
    if ($(`#${APP.id}-modal .fluz-modal-box.utility-settings`)) openUtilitySettingsWindow(getUtilityModule());
    showFlash(`Deleted market filter preset: ${preset.name}`);
  }
  function renderCrimePlanner() {
    return `
      ${renderCrimeRouteBoard()}
      ${renderCrimeProfitabilityPanel()}
      ${renderCrimeMoraleCard()}
      ${renderCrackingHelper()}
      ${renderPickpocketPlanner()}
      ${renderBootleggingPlanner()}
    `;
  }

  function renderCrimeRouteBoard() {
    if (!isCrimesHubPage()) return '';
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Crime routes</span><span class="fluz-muted">quick links</span></div>
        <div class="fluz-crime-route-grid">
          ${CRIME_ROUTE_LABELS.map(([slug, label, hint]) => `
            <a class="fluz-crime-route" href="https://www.torn.com/page.php?sid=crimes#/${escapeHtml(slug)}">
              <b>${escapeHtml(label)}</b>
              <span>${escapeHtml(hint)}</span>
            </a>
          `).join('')}
        </div>
      </div>
    `;
  }

  function renderPickpocketPlanner() {
    if (!isPickpocketCrimePage()) return '';
    const stats = state.pickpocketStats || { colored: 0, visible: 0, hidden: 0, skillLevel: 1, updatedAt: 0 };
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Pickpocket helper</span><span class="fluz-muted">manual assist</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(stats.colored || 0))}</b><em>labeled</em></span>
          <span><b>${escapeHtml(String(stats.visible || 0))}</b><em>visible</em></span>
          <span><b>${escapeHtml(String(stats.hidden || 0))}</b><em>hidden</em></span>
          <span><b>${escapeHtml(String(Math.floor(parseNumber(stats.skillLevel || 1))))}</b><em>skill</em></span>
          <span><b>${stats.updatedAt ? escapeHtml(new Date(stats.updatedAt).toLocaleTimeString()) : '--'}</b><em>updated</em></span>
        </div>
        <div class="fluz-form-grid">
          <label>Min CS
            <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMinCs" value="${escapeHtml(state.utility.pickpocketMinCs)}">
          </label>
          <label>Max CS
            <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMaxCs" value="${escapeHtml(state.utility.pickpocketMaxCs)}">
          </label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button" data-action="mark-pickpocket-targets">Relabel targets</button>
        </div>
        <p class="fluz-muted">Colors target type, build, activity, and the button area by estimated difficulty. It can hide targets outside your CS range, but it never clicks or starts the crime.</p>
      </div>
    `;
  }

  function renderCrimeMoraleCard() {
    if (!state.crimeMorale) {
      const hub = isCrimesHubPage();
      const status = state.crimeMoraleStatus || (hub ? 'open crime' : 'waiting');
      return `
        <div class="fluz-card compact">
          <div class="fluz-section-title"><span>Crime morale</span><span class="fluz-muted">${escapeHtml(status)}</span></div>
          <div class="fluz-mini-metrics fluz-bootleg-metrics">
            <span><b>--</b><em>morale</em></span>
            <span><b>--</b><em>demoralized</em></span>
            <span><b>${hub ? 'specific crime' : 'crimesData'}</b><em>source</em></span>
          </div>
          ${hub ? '' : '<div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;"><button class="fluz-button" data-action="refresh-crime-morale">Refresh morale</button></div>'}
          <p class="fluz-muted">${hub ? 'The Crimes hub usually does not load morale data. Open Search for Cash, Bootlegging, or another specific crime so Torn sends crimesData, then this card will remember the last value.' : 'Morale is read from Torn\'s demoralization value after the crime page loads. Lower morale means higher demoralization pressure, so treat it as a caution signal.'}</p>
        </div>
      `;
    }
    const morale = clamp(parseNumber(state.crimeMorale.morale), 0, 100);
    const tone = morale >= 80 ? 'good' : morale >= 50 ? 'warn' : 'bad';
    const note = morale >= 80
      ? 'Healthy morale. No obvious demoralization warning from the loaded crime data.'
      : morale >= 50
        ? 'Moderate morale. Be more selective if crime results start feeling worse.'
        : 'Low morale. Consider safer crime choices until it recovers.';
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Crime morale</span><span class="fluz-muted">${escapeHtml(state.crimeMorale.updatedText || 'live')}</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b class="${tone === 'bad' ? 'fluz-neg' : 'fluz-pos'}">${escapeHtml(`${Math.round(morale)}%`)}</b><em>morale</em></span>
          <span><b>${escapeHtml(`${Math.round(100 - morale)}%`)}</b><em>demoralized</em></span>
          <span><b>${escapeHtml(state.crimeMorale.label || 'Crime 2.0')}</b><em>source</em></span>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button" data-action="refresh-crime-morale">Refresh morale</button>
        </div>
        <p class="fluz-muted">${escapeHtml(note)}</p>
      </div>
    `;
  }

  function renderCrimeProfitabilityPanel() {
    const rows = state.crimeProfitData && Array.isArray(state.crimeProfitData.rows) ? state.crimeProfitData.rows : [];
    const visible = state.crimeProfitVisible || {};
    const hub = isCrimesHubPage();
    const age = state.crimeProfitData && state.crimeProfitData.fetchedAt
      ? `${Math.round((nowMs() - state.crimeProfitData.fetchedAt) / 60000)}m old`
      : 'not loaded';
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Crime profitability</span><span class="fluz-muted">${escapeHtml(age)}</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(rows.length))}</b><em>targets</em></span>
          <span><b>${state.crimeProfitLoading ? 'Loading' : 'Ready'}</b><em>sheet</em></span>
          <span><b>${escapeHtml(String(visible.count || 0))}</b><em>visible</em></span>
          <span><b>${visible.bestValue == null ? '--' : escapeHtml(formatMoney(visible.bestValue))}</b><em>best $/N</em></span>
          <span><b>${escapeHtml(visible.bestLabel || '--')}</b><em>best option</em></span>
        </div>
        ${state.crimeProfitData && state.crimeProfitData.warning ? `<p class="fluz-muted">${escapeHtml(state.crimeProfitData.warning)}</p>` : `<p class="fluz-muted">${hub ? 'Open a specific crime to show visible $/N chips. The Crimes hub only lists crime categories, so there are no target rows to label here.' : 'Adds read-only $/N chips to visible crime options using the public Crime Profitability Index. No crime actions are clicked.'}</p>`}
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button" data-action="refresh-crime-profitability">Refresh $/N data</button>
          <button class="fluz-button" data-action="mark-crime-profitability" ${hub ? 'disabled' : ''}>Relabel visible crimes</button>
        </div>
      </div>
    `;
  }

  function renderCrackingHelper() {
    if (!isCrackingCrimePage()) return '';
    const stats = state.crackingStats || {};
    const loadedWords = Object.values(stats).reduce((sum, value) => sum + parseNumber(value), 0);
    const status = state.crackingLoading ? 'loading' : (state.crackingStatus || 'local');
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Cracking helper</span><span class="fluz-muted">manual suggestions</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(Math.round(loadedWords)))}</b><em>local words</em></span>
          <span><b>${escapeHtml(String(state.utility.crackingMaxSuggestions || 8))}</b><em>shown</em></span>
          <span><b>${escapeHtml(status)}</b><em>status</em></span>
        </div>
        <div class="fluz-form-grid">
          <label>Suggestions
            <input type="number" min="1" max="20" step="1" data-utility-setting="crackingMaxSuggestions" value="${escapeHtml(state.utility.crackingMaxSuggestions || 8)}">
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="crackingShowComplete" ${state.utility.crackingShowComplete ? 'checked' : ''}> Show completed rows</label>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" data-action="scan-cracking-helper">Apply suggestions</button>
          <button class="fluz-button" data-action="load-cracking-wordlist" ${state.crackingLoading ? 'disabled' : ''}>Load public wordlist</button>
          <button class="fluz-button danger" data-action="clear-cracking-wordlist">Clear local words</button>
        </div>
        <p class="fluz-muted">Reads visible cracking patterns and shows copy-only word suggestions. The public wordlist is downloaded only when you press Load, and no cracked words are uploaded anywhere.</p>
      </div>
    `;
  }

  function renderBootleggingPlanner() {
    if (!isBootleggingCrimePage()) return '';

    if (!state.bootleggingData) ensureBootleggingDataFromVisiblePage();
    const rows = buildBootleggingRows(state.bootleggingData);
    if (!rows.length) {
      return `
        <div class="fluz-card">
          <div class="fluz-section-title"><span>Bootlegging balance</span><span class="fluz-muted">waiting for Torn data</span></div>
          <div class="fluz-row-actions" style="justify-content:flex-start;margin:7px 0;">
            <button class="fluz-button primary" data-action="refresh-bootlegging-data">Refresh bootlegging</button>
            <button class="fluz-button" data-action="mark-bootlegging-genres">Relabel buttons</button>
          </div>
          <p class="fluz-muted">Stay on the Bootlegging crime page until Torn loads the crimesData response, then press Refresh if needed. This helper only reads page data and never auto-selects or starts a crime.</p>
        </div>
      `;
    }

    const best = rows[0];
    const totalHave = rows.reduce((sum, row) => sum + row.have, 0);
    const totalSold = rows.reduce((sum, row) => sum + row.sold, 0);
    const queued = parseNumber(state.bootleggingData && state.bootleggingData.queued);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Bootlegging balance</span><span class="fluz-muted">manual assist</span></div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(best.name)}</b><em>suggested genre</em></span>
          <span><b>${escapeHtml(String(Math.max(0, best.diff)))}</b><em>copies short</em></span>
          <span><b>${escapeHtml(String(totalHave))}</b><em>held+queue</em></span>
          <span><b>${escapeHtml(String(totalSold))}</b><em>sold</em></span>
          <span><b>${escapeHtml(String(queued))}</b><em>queued</em></span>
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-top:7px;">
          <button class="fluz-button primary" data-action="select-bootlegging-genre" data-genre="${escapeHtml(best.name)}">Select suggested</button>
          <button class="fluz-button" data-action="mark-bootlegging-genres">Relabel buttons</button>
          <button class="fluz-button" data-action="refresh-bootlegging-data">Refresh data</button>
          <a class="fluz-button" href="https://www.torn.com/page.php?sid=crimes#/bootlegging">Open bootlegging</a>
        </div>
        <p class="fluz-muted">Suggestion balances your CD stock against your sold genre mix${state.bootleggingData && state.bootleggingData.visibleOnly ? ', or visible stock counts when Torn data is unavailable' : ''}. Button labels are visual only; Select suggested only chooses the genre, and you still manually start/confirm the crime.</p>
      </div>
      <div class="fluz-market-head fluz-bootleg-head">
        <div>Genre</div><div>Have</div><div>Sold</div><div>Target</div><div>Need</div>
      </div>
      <div class="fluz-table">
        ${rows.map((row) => `
          <div class="fluz-row fluz-market-row fluz-bootleg-row ${row.name === best.name ? 'is-best' : ''}">
            <div class="fluz-cell-main">${escapeHtml(row.name)}</div>
            <div>${escapeHtml(String(row.have))}</div>
            <div>${escapeHtml(String(row.sold))}</div>
            <div>${escapeHtml(String(row.target))}</div>
            <div class="${row.diff > 0 ? 'fluz-neg' : 'fluz-pos'}">${escapeHtml(row.diff > 0 ? `+${row.diff}` : 'ok')}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function isBootleggingCrimePage() {
    const url = currentUrl();
    return /sid=crimes/i.test(url.search || url.href) && /bootlegging/i.test(url.hash || url.href);
  }

  function isPickpocketCrimePage() {
    const url = currentUrl();
    return /sid=crimes/i.test(url.search || url.href) && /pickpocketing/i.test(url.hash || url.href);
  }

  function isCrimesHubPage() {
    const url = currentUrl();
    const hash = String(url.hash || '');
    return /sid=crimes/i.test(url.search || url.href) && (!hash || hash === '#' || hash === '#/');
  }

  function buildBootleggingRows(data) {
    if (!data || !data.have || !data.sold) return [];
    const totalHave = BOOTLEGGING_GENRES.reduce((sum, genre) => sum + parseNumber(data.have[genre.id]), 0);
    const totalSold = BOOTLEGGING_GENRES.reduce((sum, genre) => sum + parseNumber(data.sold[genre.id]), 0);
    if (totalHave <= 0) return [];
    return BOOTLEGGING_GENRES.map((genre) => {
      const have = parseNumber(data.have[genre.id]);
      const sold = parseNumber(data.sold[genre.id]);
      const target = totalSold > 0
        ? Math.floor((sold / totalSold) * totalHave)
        : Math.floor(totalHave / BOOTLEGGING_GENRES.length);
      return {
        ...genre,
        have,
        sold,
        target,
        diff: target - have
      };
    }).sort((a, b) => b.diff - a.diff || a.have - b.have || a.name.localeCompare(b.name));
  }

  function normalizeBootleggingCrimesData(payload) {
    const db = payload && payload.DB ? payload.DB : null;
    if (!db) return null;
    const crimeType = String((db.currentUserStatistics && db.currentUserStatistics[1] && db.currentUserStatistics[1].value) || db.currentCrime || '').trim();
    const rawHave = (db.generalInfo && db.generalInfo.CDs) || findBootleggingStockObject(payload) || {};
    const currentUserStats = db.currentUserStats || findBootleggingSoldObject(payload) || {};
    const looksLikeBootlegging = /counterfeit|bootleg/i.test(crimeType)
      || hasBootleggingStockKeys(rawHave)
      || Object.keys(currentUserStats).some((key) => /^CDType\d+Sold$/i.test(key));
    if (!looksLikeBootlegging) return null;

    const have = {};
    const sold = {};
    BOOTLEGGING_GENRES.forEach((genre) => {
      have[genre.id] = parseNumber(rawHave[genre.id] ?? rawHave[genre.name] ?? 0);
      sold[genre.id] = parseNumber(currentUserStats[`CDType${genre.id}Sold`] ?? currentUserStats[`cdType${genre.id}Sold`] ?? 0);
    });

    const queue = db.crimesByType && db.crimesByType['0'] && db.crimesByType['0'].additionalInfo
      ? db.crimesByType['0'].additionalInfo.currentQueue || []
      : [];
    (Array.isArray(queue) ? queue : []).forEach((id) => {
      const key = String(id);
      if (Object.prototype.hasOwnProperty.call(have, key)) have[key] += 1;
    });

    return {
      have,
      sold,
      queued: Array.isArray(queue) ? queue.length : 0,
      updatedAt: nowMs()
    };
  }

  function hasBootleggingStockKeys(value) {
    if (!value || typeof value !== 'object') return false;
    let matches = 0;
    BOOTLEGGING_GENRES.forEach((genre) => {
      if (value[genre.id] != null || value[genre.name] != null) matches += 1;
    });
    return matches >= 3;
  }

  function findBootleggingStockObject(value, depth = 0) {
    if (!value || depth > 7 || typeof value !== 'object') return null;
    if (hasBootleggingStockKeys(value)) return value;
    const direct = value.CDs || value.cds || value.cdStock || value.cdstock;
    if (hasBootleggingStockKeys(direct)) return direct;
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const found = findBootleggingStockObject(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function findBootleggingSoldObject(value, depth = 0) {
    if (!value || depth > 7 || typeof value !== 'object') return null;
    const keys = Object.keys(value);
    if (keys.some((key) => /^CDType\d+Sold$/i.test(key))) return value;
    const children = Array.isArray(value) ? value : Object.values(value);
    for (const child of children) {
      const found = findBootleggingSoldObject(child, depth + 1);
      if (found) return found;
    }
    return null;
  }

  function getBootleggingGenreFromText(text) {
    const clean = cleanBookieText(text || '');
    const matches = BOOTLEGGING_GENRES.filter((item) => {
      return bootleggingGenreRegExp(item).test(clean);
    });
    return matches.length === 1 ? matches[0] : null;
  }

  function bootleggingGenreRegExp(genre) {
    const pattern = genre && genre.name === 'Sci-Fi' ? '(?:Sci[-\\s]?Fi)' : escapeRegExp(genre && genre.name || '');
    return new RegExp(`\\b${pattern}\\b`, 'i');
  }

  function extractBootleggingVisibleCount(node, genre) {
    const clone = node && node.cloneNode ? node.cloneNode(true) : null;
    if (clone && clone.querySelectorAll) clone.querySelectorAll('.fluz-bootleg-diff').forEach((label) => label.remove());
    const text = cleanBookieText(clone ? clone.textContent : node ? node.textContent : '');
    const afterName = text.split(bootleggingGenreRegExp(genre)).pop() || text;
    const numbers = (afterName.match(/\b\d{1,6}\b/g) || []).map(parseNumber).filter((value) => value >= 0);
    return numbers.length ? numbers[numbers.length - 1] : 0;
  }

  function isBootleggingCandidateVisible(node) {
    if (!node || node.closest(`#${APP.id}, #${APP.id}-modal`)) return false;
    const rects = node.getClientRects ? Array.from(node.getClientRects()) : [];
    if (!rects.some((rect) => rect.width > 2 && rect.height > 2)) return false;
    const style = typeof getComputedStyle === 'function' ? getComputedStyle(node) : null;
    return !style || (style.display !== 'none' && style.visibility !== 'hidden' && parseNumber(style.opacity || 1) > 0);
  }

  function findBootleggingGenreHost(node, genre) {
    let host = node.closest('button, [role="button"], [class^="genreStock"], [class*=" genreStock"], [class*="genre"], [class*="Genre"]') || node;
    let cursor = node;
    const pattern = bootleggingGenreRegExp(genre);
    for (let depth = 0; depth < 7 && cursor && cursor.parentElement && cursor.parentElement !== document.body; depth += 1) {
      const parent = cursor.parentElement;
      if (parent.closest(`#${APP.id}, #${APP.id}-modal`)) break;
      const text = cleanBookieText(parent.textContent || '');
      const rect = parent.getBoundingClientRect ? parent.getBoundingClientRect() : { width: 0, height: 0 };
      const looksLikeTile = rect.width >= 42 && rect.width <= 170 && rect.height >= 55 && rect.height <= 190;
      if (pattern.test(text) && /\d/.test(text) && text.length < 260) {
        host = parent;
        if (looksLikeTile || /queued/i.test(text)) break;
      }
      cursor = parent;
    }
    return host;
  }

  function ensureBootleggingDataFromVisiblePage() {
    if (!isBootleggingCrimePage()) return false;
    const buttons = getBootleggingGenreButtons();
    const layout = buttons.length >= 3 ? [] : findVisibleBootleggingGenreLayout();
    if (buttons.length < 3 && layout.length < 3) return false;
    const have = {};
    const sold = {};
    BOOTLEGGING_GENRES.forEach((genre) => {
      const match = buttons.find((item) => item.genre.id === genre.id);
      const layoutMatch = layout.find((item) => item.genre.id === genre.id);
      have[genre.id] = match ? extractBootleggingVisibleCount(match.button, genre) : layoutMatch ? layoutMatch.count : 0;
      sold[genre.id] = 0;
    });
    if (BOOTLEGGING_GENRES.reduce((sum, genre) => sum + have[genre.id], 0) <= 0) return false;
    state.bootleggingData = {
      have,
      sold,
      queued: 0,
      visibleOnly: true,
      updatedAt: nowMs()
    };
    return true;
  }

  function getBootleggingGenreButtons() {
    const seenHosts = new Set();
    const seenGenres = new Set();
    return Array.from(document.querySelectorAll('button, [role="button"], [aria-label], [title], [class*="genre"], [class*="Genre"], [class*="stock"], [class*="Stock"], [class*="option"], [class*="Option"], div, span, p'))
      .filter(isBootleggingCandidateVisible)
      .map((node) => {
        const label = String(node.getAttribute('aria-label') || node.getAttribute('title') || node.innerText || node.textContent || '');
        if (!label || label.length > 260) return null;
        const genre = getBootleggingGenreFromText(label);
        if (!genre || seenGenres.has(genre.id)) return null;
        const host = findBootleggingGenreHost(node, genre);
        if (!isBootleggingCandidateVisible(host) || seenHosts.has(host)) return null;
        seenHosts.add(host);
        seenGenres.add(genre.id);
        return { button: host, genre };
      })
      .filter(Boolean);
  }

  function findVisibleBootleggingGenreLayout() {
    if (!isBootleggingCrimePage() || !document.body) return [];
    const elements = Array.from(document.body.querySelectorAll('*')).filter(isBootleggingCandidateVisible);
    const numberNodes = elements.map((node) => {
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (!/^\d{1,6}$/.test(text)) return null;
      const rect = node.getBoundingClientRect();
      return { node, rect, value: parseNumber(text), centerX: rect.left + rect.width / 2 };
    }).filter(Boolean);
    const labels = [];
    elements.forEach((node) => {
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (!text || /\d/.test(text) || text.length > 32) return;
      const genre = BOOTLEGGING_GENRES.find((item) => bootleggingGenreRegExp(item).test(text));
      if (!genre || labels.some((item) => item.genre.id === genre.id)) return;
      const rect = node.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 8) return;
      const centerX = rect.left + rect.width / 2;
      const count = numberNodes
        .filter((item) => item.value > 0 && item.rect.top > rect.bottom && item.rect.top - rect.bottom < 190)
        .filter((item) => Math.abs(item.centerX - centerX) < 52)
        .sort((a, b) => b.rect.top - a.rect.top)[0];
      if (!count) return;
      labels.push({ genre, labelNode: node, countNode: count.node, labelRect: rect, countRect: count.rect, count: count.value });
    });
    return labels.sort((a, b) => a.labelRect.left - b.labelRect.left);
  }

  function clearBootleggingVisualOverlays() {
    document.querySelectorAll('.fluz-bootleg-visual-overlay').forEach((node) => node.remove());
  }

  function applyBootleggingVisualOverlays(rows) {
    clearBootleggingVisualOverlays();
    const layouts = findVisibleBootleggingGenreLayout();
    if (!layouts.length || !rows.length) return false;
    const rowMap = new Map(rows.map((row, index) => [row.id, { ...row, index }]));
    const maxShortage = Math.max(0, ...rows.map((row) => row.diff));
    let touched = false;
    layouts.forEach((layout) => {
      const row = rowMap.get(layout.genre.id);
      if (!row) return;
      const overlay = document.createElement('div');
      overlay.className = 'fluz-bootleg-visual-overlay';
      overlay.classList.toggle('fluz-bootleg-best', row.index === 0);
      overlay.dataset.fluzBootlegLabel = row.diff > 0 ? `${row.diff} more needed` : 'balanced/excess';
      const left = Math.min(layout.labelRect.left, layout.countRect.left) + window.scrollX - 10;
      const top = layout.labelRect.top + window.scrollY - 8;
      const width = Math.max(72, Math.max(layout.labelRect.right, layout.countRect.right) - Math.min(layout.labelRect.left, layout.countRect.left) + 20);
      const height = Math.max(118, layout.countRect.bottom - layout.labelRect.top + 34);
      overlay.style.left = `${Math.round(left)}px`;
      overlay.style.top = `${Math.round(top)}px`;
      overlay.style.width = `${Math.round(width)}px`;
      overlay.style.height = `${Math.round(height)}px`;
      if (row.index === 0) {
        overlay.style.setProperty('--fluz-bootleg-overlay-bg', 'rgba(98, 230, 164, .38)');
        overlay.style.setProperty('--fluz-bootleg-overlay-border', 'rgba(141, 255, 194, .96)');
      } else if (row.diff > 0 && maxShortage > 0) {
        const hue = Math.round(48 + (row.diff / maxShortage) * 28);
        overlay.style.setProperty('--fluz-bootleg-overlay-bg', `hsla(${hue}, 94%, 62%, .34)`);
        overlay.style.setProperty('--fluz-bootleg-overlay-border', `hsla(${hue}, 94%, 74%, .88)`);
      } else {
        overlay.style.setProperty('--fluz-bootleg-overlay-bg', 'rgba(98, 230, 164, .18)');
        overlay.style.setProperty('--fluz-bootleg-overlay-border', 'rgba(98, 230, 164, .5)');
      }
      document.body.appendChild(overlay);
      touched = true;
    });
    return touched;
  }

  function applyBootleggingButtonLabels() {
    clearBootleggingVisualOverlays();
    if (!state.bootleggingData) ensureBootleggingDataFromVisiblePage();
    const rows = buildBootleggingRows(state.bootleggingData);
    if (!rows.length || !isBootleggingCrimePage()) return false;
    const rowMap = new Map(rows.map((row, index) => [row.name, { ...row, index }]));
    const maxShortage = Math.max(0, ...rows.map((row) => row.diff));
    let touched = false;
    getBootleggingGenreButtons().forEach(({ button, genre }) => {
      const row = rowMap.get(genre.name);
      if (!row) return;
      button.classList.add('fluz-bootleg-native');
      button.classList.toggle('fluz-bootleg-best', row.index === 0);
      button.style.setProperty('--fluz-bootleg-strength', String(clamp(row.diff, 0, Math.max(1, rows[0].diff))));
      if (getComputedStyle(button).position === 'static') button.style.position = 'relative';
      if (row.index === 0) {
        button.style.setProperty('--fluz-bootleg-overlay', 'rgba(98, 230, 164, .22)');
        button.style.background = 'linear-gradient(180deg, #72f0aa, #27a962)';
        button.style.borderColor = '#8dffc2';
        button.style.color = '#06140d';
      } else if (row.diff > 0 && maxShortage > 0) {
        const hue = Math.round(48 + (row.diff / maxShortage) * 28);
        button.style.setProperty('--fluz-bootleg-overlay', `hsla(${hue}, 94%, 55%, .18)`);
        button.style.background = `linear-gradient(180deg, hsl(${hue}, 94%, 76%), hsl(${hue}, 78%, 39%))`;
        button.style.borderColor = `hsl(${hue}, 92%, 70%)`;
        button.style.color = '#171307';
      } else {
        button.style.setProperty('--fluz-bootleg-overlay', 'rgba(98, 230, 164, .08)');
        button.style.background = 'rgba(18, 18, 18, .88)';
        button.style.borderColor = 'rgba(98, 230, 164, .32)';
        button.style.color = '#dce8df';
      }
      const text = row.diff > 0 ? `${row.diff} more needed` : 'balanced/excess';
      button.dataset.fluzBootlegLabel = text;
      button.querySelectorAll(':scope > .fluz-bootleg-diff').forEach((label) => label.remove());
      touched = true;
    });
    return applyBootleggingVisualOverlays(rows) || touched;
  }

  function scheduleBootleggingButtonLabels() {
    [50, 150, 300, 700, 1300, 2500].forEach((delayMs) => {
      setTimeout(() => applyBootleggingButtonLabels(), delayMs);
    });
  }

  function pickpocketSkillLevel() {
    const panel = document.getElementById('crime-stats-panel');
    const text = cleanBookieText(panel ? panel.textContent : '');
    const direct = text.match(/skill\s*level\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i)
      || text.match(/level\s*:?\s*([0-9]+(?:\.[0-9]+)?)/i);
    if (direct) return parseNumber(direct[1]) || 1;
    try {
      const legacy = panel.children[0].children[1].children[0].children[0].children[0].children[0].children[2].textContent;
      return parseNumber(legacy) || 1;
    } catch (error) {
      return state.pickpocketStats && state.pickpocketStats.skillLevel ? state.pickpocketStats.skillLevel : 1;
    }
  }

  function pickpocketSafeCategories(skillLevel) {
    let index = 0;
    PICKPOCKET_SKILL_STARTS.forEach((start, currentIndex) => {
      if (Math.floor(parseNumber(skillLevel)) >= start) index = currentIndex;
    });
    return PICKPOCKET_SKILL_CATS.slice(0, index + 1);
  }

  function pickpocketMarkDifficulty(mark, skillLevel) {
    const safeCats = pickpocketSafeCategories(skillLevel);
    for (let index = 0; index < safeCats.length; index += 1) {
      const category = safeCats[index];
      if ((PICKPOCKET_MARK_GROUPS[category] || []).includes(mark)) {
        if (index === safeCats.length - 1) return 'ideal';
        if (index === safeCats.length - 2) return 'easy';
        return 'tooEasy';
      }
    }
    return 'tooHard';
  }

  function pickpocketDifficulties(markType, build, activity, skillLevel) {
    const difficulties = {
      csSemantic: pickpocketMarkDifficulty(markType, skillLevel),
      activitySemantic: '',
      buildSemantic: '',
      finalSemantic: 'uncategorized'
    };
    difficulties.finalSemantic = difficulties.csSemantic;
    if ((PICKPOCKET_BUILDS_TO_AVOID[markType] || []).includes(build)) {
      difficulties.finalSemantic = 'tooHard';
      difficulties.buildSemantic = 'tooHard';
    }
    if ((PICKPOCKET_ACTIVITIES_TO_AVOID[markType] || []).includes(activity)) {
      difficulties.finalSemantic = 'tooHard';
      difficulties.activitySemantic = 'tooHard';
    }
    return difficulties;
  }

  function findChildByClassPrefix(parent, prefix) {
    if (!parent || !parent.children) return null;
    for (const child of parent.children) {
      if (Array.from(child.classList || []).some((className) => className && className.startsWith(prefix))) return child;
      const nested = findChildByClassPrefix(child, prefix);
      if (nested) return nested;
    }
    return null;
  }

  function getPickpocketContainer() {
    const current = document.querySelector('[class^="currentCrime"], [class*=" currentCrime"]');
    if (!current) return null;
    const children = Array.from(current.children || []);
    return children[3] || children.find((child) => child && child.children && child.children.length > 2) || null;
  }

  function getPickpocketTargetNodes() {
    const container = getPickpocketContainer();
    if (!container) return [];
    return Array.from(container.children || []).filter((node, index) => {
      const classes = String(node.className || '');
      if (index === 0 || /virtualItemsBackdrop/i.test(classes)) return false;
      return node && node.nodeType === 1;
    });
  }

  function extractPickpocketRow(node) {
    const row = node && node.children && node.children[0] && node.children[0].children
      ? node.children[0].children[0]
      : node;
    const sections = findChildByClassPrefix(row, 'sections');
    const main = findChildByClassPrefix(sections, 'mainSection') || row;
    const titleProps = findChildByClassPrefix(main, 'titleAndProps');
    const titleNode = titleProps && titleProps.children ? titleProps.children[0] : null;
    const propsNode = titleProps && titleProps.children ? titleProps.children[1] : null;
    const activityNode = findChildByClassPrefix(main, 'activity');
    const commitNode = findChildByClassPrefix(sections, 'commitButtonSection') || findChildByClassPrefix(row, 'commitButtonSection');
    if (!row || !titleNode || !propsNode || !activityNode || !commitNode) return null;
    const titleText = cleanBookieText(titleNode.textContent).replace(/\s+\([0-9]+%\)\s*$/, '');
    const mark = Object.keys(PICKPOCKET_MARK_CS_LEVELS).find((type) => titleText.startsWith(type));
    if (!mark) return null;
    const propsText = cleanBookieText(propsNode.textContent);
    const build = propsText.split(/\s+/)[0] || '';
    const activityText = cleanBookieText(activityNode.textContent);
    const activityMatch = activityText.match(/^\D+/);
    const activity = activityMatch ? cleanBookieText(activityMatch[0]) : '';
    return { outer: row, titleNode, propsNode, activityNode, commitNode, mark, build, activity };
  }

  function ensurePickpocketHeaderControls() {
    if (!isPickpocketCrimePage()) return;
    const header = document.querySelector('.crimes-app h4[class^="heading"], [class^="appHeader"], [class*=" appHeader"]');
    if (!header || document.getElementById('fluz-pickpocket-controls')) return;
    const controls = document.createElement('span');
    controls.id = 'fluz-pickpocket-controls';
    controls.className = 'fluz-pickpocket-native-controls';
    controls.innerHTML = `
      <span>CS</span>
      <input type="number" min="100" max="350" step="50" value="${escapeHtml(state.utility.pickpocketMinCs)}" title="Minimum target CS">
      <span>-</span>
      <input type="number" min="100" max="350" step="50" value="${escapeHtml(state.utility.pickpocketMaxCs)}" title="Maximum target CS">
    `;
    const inputs = controls.querySelectorAll('input');
    inputs[0].addEventListener('input', async (event) => {
      state.utility.pickpocketMinCs = parseNumber(event.target.value);
      await saveUtilityState();
      schedulePickpocketFormatting();
    });
    inputs[1].addEventListener('input', async (event) => {
      state.utility.pickpocketMaxCs = parseNumber(event.target.value);
      await saveUtilityState();
      schedulePickpocketFormatting();
    });
    header.appendChild(controls);
  }

  function clearPickpocketFormatting() {
    document.querySelectorAll('.fluz-pickpocket-label').forEach((node) => node.remove());
    document.querySelectorAll('[data-fluz-pickpocket-colored="1"]').forEach((node) => {
      node.style.removeProperty('color');
      node.style.removeProperty('background-color');
      node.removeAttribute('data-fluz-pickpocket-colored');
    });
    document.querySelectorAll('[data-fluz-pickpocket-row="1"]').forEach((node) => {
      node.style.removeProperty('display');
      node.removeAttribute('data-fluz-pickpocket-row');
    });
    const controls = document.getElementById('fluz-pickpocket-controls');
    if (controls) controls.remove();
  }

  function applyPickpocketFormatting() {
    if (!isPickpocketCrimePage()) {
      clearPickpocketFormatting();
      return false;
    }
    ensurePickpocketHeaderControls();
    const minCs = parseNumber(state.utility.pickpocketMinCs) || 100;
    const maxCs = parseNumber(state.utility.pickpocketMaxCs) || 350;
    const skillLevel = pickpocketSkillLevel();
    const stats = { colored: 0, visible: 0, hidden: 0, skillLevel, updatedAt: nowMs() };
    getPickpocketTargetNodes().forEach((node) => {
      const row = extractPickpocketRow(node);
      if (!row) return;
      const targetCs = PICKPOCKET_MARK_CS_LEVELS[row.mark] || 0;
      const hidden = targetCs < minCs || targetCs > maxCs;
      row.outer.setAttribute('data-fluz-pickpocket-row', '1');
      row.outer.style.display = hidden ? 'none' : '';
      if (hidden) stats.hidden += 1;
      else stats.visible += 1;
      const difficulties = pickpocketDifficulties(row.mark, row.build, row.activity, skillLevel);
      row.propsNode.style.removeProperty('color');
      row.activityNode.style.removeProperty('color');
      if (difficulties.buildSemantic) row.propsNode.style.color = PICKPOCKET_COLORS[difficulties.buildSemantic];
      if (difficulties.activitySemantic) row.activityNode.style.color = PICKPOCKET_COLORS[difficulties.activitySemantic];
      row.titleNode.style.color = PICKPOCKET_COLORS[difficulties.csSemantic] || PICKPOCKET_COLORS.uncategorized;
      row.commitNode.style.backgroundColor = PICKPOCKET_COLORS[difficulties.finalSemantic] || PICKPOCKET_COLORS.uncategorized;
      [row.titleNode, row.propsNode, row.activityNode, row.commitNode].forEach((item) => item.setAttribute('data-fluz-pickpocket-colored', '1'));
      let label = row.titleNode.querySelector('.fluz-pickpocket-label');
      if (!label) {
        label = document.createElement('span');
        label.className = 'fluz-pickpocket-label';
        row.titleNode.appendChild(label);
      }
      label.textContent = `${targetCs}%`;
      label.style.backgroundColor = PICKPOCKET_COLORS[difficulties.csSemantic] || PICKPOCKET_COLORS.uncategorized;
      stats.colored += 1;
    });
    state.pickpocketStats = stats;
    return stats.colored > 0;
  }

  function schedulePickpocketFormatting() {
    if (state.pickpocketScheduleTimer) clearTimeout(state.pickpocketScheduleTimer);
    state.pickpocketScheduleTimer = setTimeout(() => {
      applyPickpocketFormatting();
      if (state.mode === 'utility' && getUtilityModule().key === 'crimes' && isPickpocketCrimePage() && !isPanelInputFocused()) {
        renderPanelKeepingScroll();
      }
    }, 140);
    [450, 1000, 2200].forEach((delayMs) => setTimeout(() => applyPickpocketFormatting(), delayMs));
  }

  function selectBootleggingGenre(genreName) {
    const cleanName = cleanBookieText(genreName || '');
    if (!cleanName) return;
    const match = getBootleggingGenreButtons().find((item) => item.genre.name === cleanName);
    if (!match) {
      showFlash(`Could not find ${cleanName} genre button on the page.`);
      return;
    }
    match.button.scrollIntoView({ behavior: 'smooth', block: 'center' });
    match.button.click();
    showFlash(`Selected ${cleanName}. Start/confirm the crime manually.`);
  }

  function parseCrimeProfitCsv(text) {
    const rows = parseCsvRows(text).filter((row) => row.length);
    if (rows.length < 2) return [];
    const headers = rows.shift().map((header, index) => {
      if (header === '7BFS' && rows.some((row) => row[index])) return index === 2 ? '7BFS attempts' : header;
      return header;
    });
    return rows.map((row) => {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = row[index] || '';
      });
      return item;
    }).filter((item) => item.crime || item.target || item['Targeted service ']);
  }

  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const input = String(text || '');
    for (let i = 0; i < input.length; i += 1) {
      const char = input[i];
      const next = input[i + 1];
      if (char === '"' && quoted && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        row.push(cell);
        cell = '';
      } else if ((char === '\n' || char === '\r') && !quoted) {
        if (char === '\r' && next === '\n') i += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    row.push(cell);
    rows.push(row);
    return rows.map((items) => items.map((item) => item.trim()));
  }

  async function loadCrimeProfitabilityData(force = false) {
    if (state.crimeProfitLoading) return;
    state.crimeProfitLoading = true;
    try {
      const cached = await readJsonStorage(CRIME_PROFIT.cacheKey, null);
      if (cached && cached.fetchedAt) {
        const fresh = nowMs() - cached.fetchedAt < CRIME_PROFIT.cacheTtlMs;
        state.crimeProfitData = {
          ...cached,
          warning: fresh ? '' : 'Using cached $/N data while refreshing in the background.'
        };
        applyCrimeProfitabilityLabels();
        scheduleCrimeProfitabilityLabels();
        const module = getUtilityModule();
        if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
        if (!force && fresh) return;
      }
      const [allText, crackingText] = await Promise.all([
        httpGetText(CRIME_PROFIT.allUrl),
        httpGetText(CRIME_PROFIT.crackingUrl)
      ]);
      const data = {
        rows: parseCrimeProfitCsv(allText),
        crackingRows: parseCrimeProfitCsv(crackingText),
        fetchedAt: nowMs(),
        warning: ''
      };
      state.crimeProfitData = data;
      await writeJsonStorage(CRIME_PROFIT.cacheKey, data);
      applyCrimeProfitabilityLabels();
      scheduleCrimeProfitabilityLabels();
    } catch (error) {
      const cached = await readJsonStorage(CRIME_PROFIT.cacheKey, null);
      state.crimeProfitData = cached
        ? { ...cached, warning: `Using cached $/N data. Refresh failed: ${friendlyError(error)}` }
        : { rows: [], crackingRows: [], fetchedAt: 0, warning: `Could not load $/N data: ${friendlyError(error)}` };
    } finally {
      state.crimeProfitLoading = false;
      const module = getUtilityModule();
      if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
    }
  }

  function crimeProfitRowsForCurrentPage() {
    const data = state.crimeProfitData || {};
    if (/cracking/i.test(window.location.href)) return Array.isArray(data.crackingRows) ? data.crackingRows : [];
    return Array.isArray(data.rows) ? data.rows : [];
  }

  function normalizeCrimeProfitKey(value) {
    return cleanBookieText(value || '')
      .toLowerCase()
      .replace(/\bcity centre\b/g, 'city center')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseProfitValue(value) {
    const text = String(value || '').replace(/[$,\s]/g, '');
    const parsed = Number(text);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function buildCrimeProfitMap(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const target = normalizeCrimeProfitKey(row.target || row['Targeted service '] || '');
      if (!target) return;
      const value = parseProfitValue(row['$/N'] || row['Estimated profit per nerve 6BFS'] || row['7BFS'] || row['6BFS']);
      if (value == null) return;
      map.set(target, { row, value });
      if (target === 'city centre') map.set('city center', { row, value });
    });
    return map;
  }

  function visibleCrimeOptionLabel(option) {
    const selectors = [
      '[class*="titleAndProps__"] div',
      '[class*="titleAndIcon__"]',
      '[class*="tabletTitleAndTagCount__"]',
      '[class*="tabletShopTitle__"]',
      '[class*="tabletProjectTitle__"]',
      '[class*="type__"]',
      '[class*="service__"]',
      '[class*="title__"]'
    ];
    for (const selector of selectors) {
      const node = option.querySelector(selector);
      const text = cleanBookieText(node && node.textContent);
      if (text) return text;
    }
    const textNode = Array.from(option.childNodes).find((node) => node.nodeType === Node.TEXT_NODE && cleanBookieText(node.textContent));
    return cleanBookieText(textNode && textNode.textContent);
  }

  function applyCrimeProfitabilityLabels() {
    if (!/sid=crimes/i.test(window.location.href)) return false;
    const rows = crimeProfitRowsForCurrentPage();
    if (!rows.length) return false;
    const map = buildCrimeProfitMap(rows);
    let touched = false;
    let bestValue = -Infinity;
    let bestLabel = '';
    let bestWrapper = null;
    let visibleCount = 0;

    document.querySelectorAll('.fluz-crime-profit-best').forEach((node) => node.classList.remove('fluz-crime-profit-best'));

    if (isBootleggingCrimePage()) {
      const boot = applyBootleggingProfitability(map);
      if (boot.count) {
        visibleCount += boot.count;
        if (boot.bestValue > bestValue) {
          bestValue = boot.bestValue;
          bestLabel = boot.bestLabel;
        }
      }
      touched = boot.touched || touched;
    }

    const options = Array.from(document.querySelectorAll('[class*="crimeOptionSection__"]'));
    options.forEach((option) => {
      const label = normalizeCrimeProfitKey(visibleCrimeOptionLabel(option));
      if (!label) return;
      const match = map.get(label) || map.get(label.replace(/\s+unit$/, ''));
      if (!match) return;
      const chip = option.querySelector('.fluz-crime-profit-chip') || createCrimeProfitChip(match.value);
      updateCrimeProfitChip(chip, match.value);
      option.appendChild(chip);
      option.style.display = 'flex';
      option.style.justifyContent = 'space-between';
      option.style.alignItems = 'center';
      const wrapper = option.closest('[class*="crimeOptionWrapper__"], .virtual-item') || option.parentElement;
      if (match.value > bestValue) {
        bestValue = match.value;
        bestLabel = visibleCrimeOptionLabel(option);
        bestWrapper = wrapper;
      }
      visibleCount += 1;
      touched = true;
    });

    if (bestWrapper && bestValue > CRIME_PROFIT.threshold) bestWrapper.classList.add('fluz-crime-profit-best');
    state.crimeProfitVisible = {
      count: visibleCount,
      bestLabel: bestLabel || '',
      bestValue: bestValue === -Infinity ? null : bestValue
    };
    return touched;
  }

  function scheduleCrimeProfitabilityLabels() {
    [100, 350, 900, 1600].forEach((delayMs) => {
      setTimeout(() => applyCrimeProfitabilityLabels(), delayMs);
    });
  }

  function applyBootleggingProfitability(map) {
    const labelToTarget = new Map([
      ['sell counterfeit dvds', 'sell counterfeit dvds'],
      ['online store', 'collect from online store'],
      ['collect from online store', 'collect from online store']
    ]);
    let touched = false;
    let count = 0;
    let bestValue = -Infinity;
    let bestLabel = '';
    document.querySelectorAll('[class*="crimeOptionWrapper__"], [class*="crimeOptionSection__"]').forEach((node) => {
      const text = normalizeCrimeProfitKey(node.textContent);
      const target = Array.from(labelToTarget.entries()).find(([label]) => text.includes(label));
      if (!target) return;
      const match = map.get(target[1]);
      if (!match) return;
      const host = node.matches('[class*="crimeOptionSection__"]') ? node : node.querySelector('[class*="crimeOptionSection__"]') || node;
      const chip = host.querySelector('.fluz-crime-profit-chip') || createCrimeProfitChip(match.value);
      updateCrimeProfitChip(chip, match.value);
      host.appendChild(chip);
      count += 1;
      if (match.value > bestValue) {
        bestValue = match.value;
        bestLabel = target[0];
      }
      touched = true;
    });
    return { touched, count, bestValue, bestLabel };
  }

  function createCrimeProfitChip(value) {
    const chip = document.createElement('span');
    chip.className = 'fluz-crime-profit-chip';
    updateCrimeProfitChip(chip, value);
    return chip;
  }

  function updateCrimeProfitChip(chip, value) {
    chip.textContent = `${value < 0 ? '-' : ''}${formatMoney(Math.abs(value))} / N`;
    chip.classList.remove('good', 'warn', 'bad');
    if (value < 0) chip.classList.add('bad');
    else if (value < CRIME_PROFIT.threshold) chip.classList.add('warn');
    else chip.classList.add('good');
  }
  function renderTravelPlanner() {
    const live = scanTravelStatusFromPage();
    const destination = getTravelDestination();
    const itemName = String(state.utility.travelItemName || '').trim();
    const buy = parseNumber(state.utility.travelBuyCost);
    const sell = parseNumber(state.utility.travelSellPrice);
    const minutes = Math.max(1, parseNumber(state.utility.travelMinutes));
    const baseCarry = Math.max(1, parseNumber(state.utility.travelCarry || state.utility.travelCapacity));
    const cap = effectiveTravelCarry();
    const risk = Math.max(0, parseNumber(state.utility.travelRiskCost));
    const profitRows = buildTravelProfitRows();
    const destinationRows = profitRows.filter((row) => normalizeTravelCountryKey(row.country) === normalizeTravelCountryKey(destination.label)).slice(0, 6);
    const yataAge = state.travelYataData && state.travelYataData.fetchedAt
      ? `${Math.round((nowMs() - state.travelYataData.fetchedAt) / 1000)}s old`
      : 'not loaded';
    const profitEach = sell - buy;
    const gross = profitEach * cap;
    const fillCost = buy * cap;
    const total = gross - risk;
    const hourly = total / (minutes / 60);
    const daily = hourly * 24;
    const itemsPerHour = cap / (minutes / 60);
    const breakEven = buy + (risk / cap);
    const eta = new Date(nowMs() + minutes * 60000).toLocaleTimeString();
    const marketLink = itemName ? itemMarketUrl(itemName) : 'https://www.torn.com/page.php?sid=ItemMarket';
    return `
      ${live.detected ? `
        <div class="fluz-card compact">
          <div class="fluz-section-title"><span>Travel status</span><span class="fluz-muted">visible page</span></div>
          <div class="fluz-mini-metrics fluz-bootleg-metrics">
            <span><b>${escapeHtml(live.route || 'Traveling')}</b><em>route</em></span>
            <span><b>${escapeHtml(live.timer || '--')}</b><em>timer</em></span>
            <span><b>${escapeHtml(live.direction || 'manual')}</b><em>direction</em></span>
            <span><b>${escapeHtml(destination.label)}</b><em>plan</em></span>
            <span><b>${escapeHtml(itemName || 'choose item')}</b><em>item</em></span>
          </div>
        </div>
      ` : ''}
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Travel profit planner</span><span class="fluz-muted">${escapeHtml(destination.focus)}</span></div>
        <div class="fluz-form-grid">
          <label>Destination
            <select data-utility-setting="travelDestination">
              ${TRAVEL_DESTINATIONS.map((item) => `<option value="${escapeHtml(item.key)}" ${state.utility.travelDestination === item.key ? 'selected' : ''}>${escapeHtml(item.label)}</option>`).join('')}
            </select>
          </label>
          <label>Item / plan
            <input type="text" data-utility-setting="travelItemName" value="${escapeHtml(itemName)}" placeholder="Item to buy abroad">
          </label>
          <label>Abroad buy price
            <input type="number" data-utility-setting="travelBuyCost" value="${escapeHtml(state.utility.travelBuyCost)}">
          </label>
          <label>Torn sell value
            <input type="number" data-utility-setting="travelSellPrice" value="${escapeHtml(state.utility.travelSellPrice)}">
          </label>
          <label>Round trip minutes
            <input type="number" min="1" data-utility-setting="travelMinutes" value="${escapeHtml(state.utility.travelMinutes)}">
          </label>
          <label>Capacity
            <input type="number" min="1" data-utility-setting="travelCarry" value="${escapeHtml(baseCarry)}">
          </label>
          <label>Risk / fees / reserve
            <input type="number" min="0" data-utility-setting="travelRiskCost" value="${escapeHtml(state.utility.travelRiskCost)}">
          </label>
          <label>Flight speed
            <select data-utility-setting="travelSpeedTier">
              ${TRAVEL_SPEED_TIERS.map((tier) => `<option value="${escapeHtml(tier.key)}" ${state.utility.travelSpeedTier === tier.key ? 'selected' : ''}>${escapeHtml(tier.label)}</option>`).join('')}
            </select>
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelHasBook" ${state.utility.travelHasBook ? 'checked' : ''}> Travel book</label>
        </div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b class="${profitEach >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatMoney(profitEach)}</b><em>profit each</em></span>
          <span><b>${formatMoney(fillCost)}</b><em>cash to fill</em></span>
          <span><b class="${total >= 0 ? 'fluz-pos' : 'fluz-neg'}">${formatMoney(total)}</b><em>net trip</em></span>
          <span><b>${formatMoney(hourly)}</b><em>per hour</em></span>
          <span><b>${formatMoney(daily)}</b><em>per day</em></span>
        </div>
        <div class="fluz-alert">
          Break-even sell: <strong>${formatMoney(breakEven)}</strong> each. Throughput: <strong>${itemsPerHour.toFixed(1)}</strong> items/hour. Full round-trip estimate finishes around <strong>${escapeHtml(eta)}</strong>.
        </div>
        <p class="fluz-muted">Manual planner only. Confirm stock, price, and travel timers in Torn before buying abroad or listing items.</p>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Best live runs</span><span class="fluz-muted">${state.travelYataLoading ? 'loading' : escapeHtml(yataAge)}</span></div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-bottom:7px;">
          <button class="fluz-button" data-action="refresh-travel-yata">Refresh YATA stock</button>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePlushies" ${state.utility.travelIncludePlushies ? 'checked' : ''}> Plushies</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeFlowers" ${state.utility.travelIncludeFlowers ? 'checked' : ''}> Flowers</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePrehistoric" ${state.utility.travelIncludePrehistoric ? 'checked' : ''}> Points</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeSpecial" ${state.utility.travelIncludeSpecial ? 'checked' : ''}> Special</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeDrugs" ${state.utility.travelIncludeDrugs ? 'checked' : ''}> Xanax</label>
        </div>
        ${state.travelYataData && state.travelYataData.warning ? `<p class="fluz-error">${escapeHtml(state.travelYataData.warning)}</p>` : ''}
        ${renderTravelProfitRows(profitRows.slice(0, 5))}
        <p class="fluz-muted">Ranking uses YATA stock cost + Torn item market_value + your carry/speed/book settings. It is a planning estimate, not an instruction to buy.</p>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>${escapeHtml(destination.label)} live stock</span><span class="fluz-muted">${escapeHtml(formatTravelDuration(travelOneWayHours(destination.label)))} one-way @ ${escapeHtml(travelSpeedLabel())}</span></div>
        ${renderTravelProfitRows(destinationRows, true)}
      </div>
      ${renderTravelSetsPlanner()}
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Destination notes</span><span class="fluz-muted">quick item checks</span></div>
        <div class="fluz-route-grid">
          ${destination.items.map((name) => `<button class="fluz-button" data-action="use-travel-item" data-item-name="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join('')}
          <a class="fluz-button primary" href="${escapeHtml(marketLink)}" target="_blank" rel="noopener noreferrer">Market check</a>
        </div>
      </div>
      <div class="fluz-card compact">
        <div class="fluz-section-title">Travel routes</div>
        <div class="fluz-route-grid">
          <a class="fluz-route info" href="https://www.torn.com/travelagency.php">Travel Agency</a>
          <a class="fluz-route good" href="https://www.torn.com/page.php?sid=ItemMarket">Item Market</a>
          <a class="fluz-route warn" href="https://www.torn.com/page.php?sid=stocks">Stocks</a>
          <a class="fluz-route info" href="https://www.torn.com/missions.php">Missions</a>
        </div>
      </div>
    `;
  }

  function getTravelDestination() {
    return TRAVEL_DESTINATIONS.find((item) => item.key === state.utility.travelDestination) || TRAVEL_DESTINATIONS[0];
  }

  function renderTravelProfitRows(rows, compact = false) {
    if (!rows.length) {
      const hint = state.travelYataData && state.travelYataData.fetchedAt
        ? 'No profitable live stock matched your filters yet.'
        : 'Press Refresh YATA stock after your item database has loaded.';
      return `<div class="fluz-card compact">${escapeHtml(hint)}</div>`;
    }
    return `
      <div class="fluz-table">
        ${rows.map((row) => `
          <div class="fluz-row fluz-travel-row">
            <div class="fluz-cell-main" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
            <div>${escapeHtml(row.country)}</div>
            <div>${formatMoney(row.cost)} buy</div>
            <div>${formatMoney(row.sell)} sell</div>
            <div class="${row.profitPerHour >= 0 ? 'fluz-pos' : 'fluz-neg'}">${compact ? formatMoney(row.profitEach) : `${formatMoney(row.profitPerHour)}/h`}</div>
          </div>
        `).join('')}
      </div>
    `;
  }

  function renderTravelSetsPlanner() {
    const summary = buildTravelSetSummary();
    const pointsPrice = parseNumber(state.utility.travelPointsPrice);
    const pointBonus = state.utility.travelMuseumDay ? 1.1 : 1;
    const totalPoints = Math.floor(summary.totalPoints * pointBonus);
    const totalValue = totalPoints * pointsPrice;
    const carry = effectiveTravelCarry();
    const owned = state.utility.travelOwnedItems || {};
    return `
      <div class="fluz-card compact">
        <div class="fluz-section-title"><span>Museum sets planner</span><span class="fluz-muted">manual inventory</span></div>
        <div class="fluz-form-grid">
          <label>Point price
            <input type="number" min="0" data-utility-setting="travelPointsPrice" value="${escapeHtml(state.utility.travelPointsPrice)}">
          </label>
          <label>Base carry
            <input type="number" min="1" data-utility-setting="travelCarry" value="${escapeHtml(state.utility.travelCarry || state.utility.travelCapacity)}">
          </label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelMuseumDay" ${state.utility.travelMuseumDay ? 'checked' : ''}> Museum Day +10%</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="travelTourismDay" ${state.utility.travelTourismDay ? 'checked' : ''}> Tourism carry x2</label>
        </div>
        <div class="fluz-mini-metrics fluz-bootleg-metrics">
          <span><b>${escapeHtml(String(summary.plushieSets))}</b><em>plushie sets</em></span>
          <span><b>${escapeHtml(String(summary.flowerSets))}</b><em>flower sets</em></span>
          <span><b>${escapeHtml(String(summary.prehistoricSets))}</b><em>point sets</em></span>
          <span><b>${escapeHtml(String(totalPoints))}</b><em>points</em></span>
          <span><b>${formatMoney(totalValue)}</b><em>value</em></span>
        </div>
        <div class="fluz-alert">
          Effective carry: <strong>${escapeHtml(String(carry))}</strong>. Bottleneck: <strong>${escapeHtml(summary.bottleneck || 'Add counts')}</strong>.
          ${pointsPrice > 0 ? ` Estimated museum value: <strong>${formatMoney(totalValue)}</strong>.` : ' Add point price to value completed sets.'}
        </div>
        <div class="fluz-row-actions" style="justify-content:flex-start;margin-bottom:7px;">
          <button class="fluz-button" data-action="clear-travel-owned">Clear counts</button>
          <button class="fluz-button" data-action="fill-travel-owned-ones">Set empty to 1</button>
        </div>
        <div class="fluz-table">
          ${travelSetRows().map((row) => `
            <div class="fluz-row fluz-travel-set-row">
              <div class="fluz-cell-main" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</div>
              <div>${escapeHtml(row.type)}</div>
              <div>${escapeHtml(row.country)}</div>
              <div><input class="fluz-row-profit-input" type="number" min="0" data-travel-owned="${escapeHtml(row.name)}" value="${escapeHtml(owned[row.name] || 0)}"></div>
              <div><a class="fluz-button" href="${escapeHtml(itemMarketUrl(row.name))}" target="_blank" rel="noopener noreferrer">Market</a></div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  function travelSetRows() {
    return TRAVEL_ITEM_CATALOG
      .filter((item) => ['Plushie', 'Flower', 'Prehistoric', 'Special'].includes(item.type))
      .slice()
      .sort((a, b) => a.type.localeCompare(b.type) || a.country.localeCompare(b.country) || a.name.localeCompare(b.name));
  }

  function buildTravelSetSummary() {
    const owned = state.utility.travelOwnedItems || {};
    const countFor = (item) => Math.max(0, Math.floor(parseNumber(owned[item.name])));
    const group = (type) => TRAVEL_ITEM_CATALOG.filter((item) => item.type === type);
    const setCount = (type) => {
      const items = group(type);
      if (!items.length) return 0;
      return Math.min(...items.map(countFor));
    };
    const plushieSets = setCount('Plushie');
    const flowerSets = setCount('Flower');
    const prehistoricSets = setCount('Prehistoric');
    const specialPoints = group('Special').reduce((sum, item) => sum + countFor(item) * travelMuseumPoints(item), 0);
    const totalPoints = plushieSets * 10 + flowerSets * 10 + prehistoricSets * 25 + specialPoints;
    const missing = travelSetRows()
      .map((item) => ({ item, owned: countFor(item) }))
      .filter((row) => row.item.type !== 'Special')
      .sort((a, b) => a.owned - b.owned || a.item.name.localeCompare(b.item.name))[0];
    return {
      plushieSets,
      flowerSets,
      prehistoricSets,
      totalPoints,
      bottleneck: missing ? `${missing.item.name} (${missing.owned})` : ''
    };
  }

  function travelMuseumPoints(item) {
    if (!item) return 0;
    if (item.name === 'Meteorite Fragment') return 15;
    if (item.name === 'Patagonian Fossil') return 20;
    if (item.type === 'Prehistoric') return 25;
    if (item.type === 'Plushie' || item.type === 'Flower') return 10;
    return 0;
  }

  function effectiveTravelCarry() {
    const base = Math.max(1, parseNumber(state.utility.travelCarry || state.utility.travelCapacity || 1));
    return state.utility.travelTourismDay ? base * 2 : base;
  }

  function normalizeTravelCountryKey(value) {
    return String(value || '').toLowerCase().replace(/^uk$/, 'united kingdom').replace(/[^a-z]/g, '');
  }

  async function loadTravelYataData(force = false) {
    const cacheKey = toCacheKey('travelYata');
    const cached = await readJsonStorage(cacheKey, null);
    if (!force && cached && cached.fetchedAt && nowMs() - cached.fetchedAt < 5 * 60 * 1000) {
      state.travelYataData = cached;
      state.cacheInfo.travelYata = { fetchedAt: cached.fetchedAt, fromCache: true, stale: false };
      renderPanelPreservingScroll();
      return cached;
    }
    state.travelYataLoading = true;
    renderPanelPreservingScroll();
    try {
      const json = await httpGetJson('https://yata.yt/api/v1/travel/export/');
      const stocks = normalizeTravelYataStocks(json);
      const data = { stocks, fetchedAt: nowMs(), warning: '' };
      state.travelYataData = data;
      state.cacheInfo.travelYata = { fetchedAt: data.fetchedAt, fromCache: false, stale: false };
      await writeJsonStorage(cacheKey, data);
      return data;
    } catch (error) {
      const data = cached || { stocks: [], fetchedAt: 0, warning: '' };
      data.warning = `YATA travel stock could not load: ${friendlyError(error)}`;
      state.travelYataData = data;
      state.cacheInfo.travelYata = { fetchedAt: data.fetchedAt || 0, fromCache: !!cached, stale: !!cached };
      return data;
    } finally {
      state.travelYataLoading = false;
      renderPanelPreservingScroll();
    }
  }

  function normalizeTravelYataStocks(json) {
    const output = [];
    const catalogById = new Map(TRAVEL_ITEM_CATALOG.map((item) => [String(item.id), item]));
    Object.entries((json && json.stocks) || {}).forEach(([code, country]) => {
      const fallbackCountry = YATA_CITY_CODES[String(code).toLowerCase()] || country.country_name || code;
      ((country && country.stocks) || []).forEach((row) => {
        const catalog = catalogById.get(String(row.id || row.ID || ''));
        const name = String((row && row.name) || (catalog && catalog.name) || '').trim();
        if (!name) return;
        output.push({
          id: parseNumber(row.id || row.ID),
          name,
          country: catalog ? catalog.country : fallbackCountry,
          type: catalog ? catalog.type : 'Other',
          quantity: Math.max(0, Math.floor(parseNumber(row.quantity))),
          cost: Math.max(0, Math.round(parseNumber(row.cost)))
        });
      });
    });
    return output;
  }

  function travelSpeedIndex() {
    const tier = TRAVEL_SPEED_TIERS.find((item) => item.key === state.utility.travelSpeedTier) || TRAVEL_SPEED_TIERS[0];
    return tier.index;
  }

  function travelSpeedLabel() {
    const tier = TRAVEL_SPEED_TIERS.find((item) => item.key === state.utility.travelSpeedTier) || TRAVEL_SPEED_TIERS[0];
    return tier.label;
  }

  function travelOneWayHours(country) {
    const table = state.utility.travelHasBook ? TRAVEL_TIMES.book : TRAVEL_TIMES.noBook;
    const row = table[country] || table[String(country || '').replace(/^UK$/, 'United Kingdom')];
    return row ? row[travelSpeedIndex()] || row[0] : Math.max(1, parseNumber(state.utility.travelMinutes) / 120);
  }

  function formatTravelDuration(hours) {
    const minutes = Math.max(1, Math.round(parseNumber(hours) * 60));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
  }

  function travelItemAllowed(row) {
    const type = String(row.type || '').toLowerCase();
    if (type === 'plushie') return !!state.utility.travelIncludePlushies;
    if (type === 'flower') return !!state.utility.travelIncludeFlowers;
    if (type === 'prehistoric') return !!state.utility.travelIncludePrehistoric;
    if (type === 'special') return !!state.utility.travelIncludeSpecial;
    if (type === 'drug') return !!state.utility.travelIncludeDrugs;
    return false;
  }

  function buildTravelProfitRows() {
    const records = new Map(getKnownItemRecords().map((item) => [item.name.toLowerCase(), item]));
    const carry = effectiveTravelCarry();
    const risk = Math.max(0, parseNumber(state.utility.travelRiskCost));
    const data = state.travelYataData || { stocks: [] };
    return (data.stocks || [])
      .filter((row) => row.cost > 0 && row.quantity > 0 && travelItemAllowed(row))
      .map((row) => {
        const market = records.get(String(row.name || '').toLowerCase());
        const sell = market ? market.value : 0;
        const profitEach = sell - row.cost;
        const oneWayHours = travelOneWayHours(row.country);
        const roundHours = Math.max(0.1, oneWayHours * 2 + (90 / 3600));
        const tripProfit = profitEach * carry - risk;
        return {
          ...row,
          sell,
          profitEach,
          tripProfit,
          profitPerHour: tripProfit / roundHours,
          oneWayHours,
          roundHours,
          carry
        };
      })
      .filter((row) => row.sell > 0 && row.profitEach > 0)
      .sort((a, b) => b.profitPerHour - a.profitPerHour);
  }

  function scanTravelStatusFromPage() {
    const text = String(document.body && document.body.innerText ? document.body.innerText : '');
    const routeMatch = text.match(/\b([A-Z][A-Za-z ]{2,40})\s+to\s+(Torn|[A-Z][A-Za-z ]{2,40})\b/);
    const timerMatch = text.match(/\b(?:\d+d\s*)?(?:\d+h\s*)?\d{1,2}m(?:\s*\d{1,2}s)?\b/) || text.match(/\b\d{1,2}:\d{2}(?::\d{2})?\b/);
    const route = routeMatch ? `${routeMatch[1].trim()} to ${routeMatch[2].trim()}` : '';
    const lower = route.toLowerCase();
    return {
      detected: !!(route || /traveling|destination|flight/i.test(text)),
      route,
      timer: timerMatch ? timerMatch[0] : '',
      direction: lower.includes('to torn') ? 'returning' : (route ? 'outbound' : '')
    };
  }

  async function useTravelItem(itemName) {
    const name = String(itemName || '').trim();
    if (!name) return;
    state.utility.travelItemName = name;
    await saveUtilityState();
    showFlash(`Travel item set: ${name}`);
    renderPanel();
  }

  async function clearTravelOwnedItems() {
    state.utility.travelOwnedItems = {};
    await saveUtilityState();
    showFlash('Travel set counts cleared.');
    renderPanel();
  }

  async function fillTravelOwnedOnes() {
    const current = { ...(state.utility.travelOwnedItems || {}) };
    travelSetRows().forEach((item) => {
      if (!parseNumber(current[item.name])) current[item.name] = 1;
    });
    state.utility.travelOwnedItems = current;
    await saveUtilityState();
    showFlash('Empty travel set counts set to 1.');
    renderPanel();
  }

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

  function renderUtilityGuide(module) {
    return `
      <div class="fluz-guide-hero">
        <h3>${escapeHtml(module.title)} Manual</h3>
        <p>Read-only helper tools. FLUZ calculates, highlights, and reminds; you always make the final Torn action manually.</p>
      </div>
      <div class="fluz-guide-grid">
        ${(module.guide || []).map((line) => `<div class="fluz-guide-card"><p>${escapeHtml(line)}</p></div>`).join('')}
        ${moduleHasTargetTools(module) ? renderTargetFinderGuideCards() : ''}
        <div class="fluz-guide-card">
          <h4>Safety</h4>
          <p>No auto-buying, no auto-selling, no auto-price-changing, no attacks, no jail/hospital actions.</p>
          <p>Bulk pricing tools produce target numbers only. Copy and enter manually if you choose.</p>
        </div>
      </div>
    `;
  }

  function renderTargetFinderGuideCards() {
    return `
      <div class="fluz-guide-card wide">
        <h4>Finder setup</h4>
        <ol>
          <li>Save your Torn API key once in TORN'z Profile.</li>
          <li>Open Finder and read FFScouter's policy with the yellow Guide/policy buttons.</li>
          <li>Turn on Enable FFScouter features to allow manual register/search requests to ffscouter.com.</li>
          <li>Press Check FFScouter, then choose Leveling, Chain/Respect, War, or Custom.</li>
          <li>Press Search FFScouter to create an editable local list.</li>
          <li>Open Lists, remove bad rows, then add one target or the whole list to your Target Board.</li>
        </ol>
      </div>
      <div class="fluz-guide-card">
        <h4>Tags</h4>
        <p><span class="fluz-note-chip blue">level</span> Level/xp tags are blue.</p>
        <p><span class="fluz-note-chip green">chain</span> Chain/easy tags are green.</p>
        <p><span class="fluz-note-chip orange">war</span> War tags are orange.</p>
        <p><span class="fluz-note-chip red">enemy</span> Enemy/hard tags are red.</p>
        <p><span class="fluz-note-chip">unknown</span> Unmatched tags stay grey.</p>
      </div>
    `;
  }

  function renderMarketHiddenSettings() {
    const hidden = marketHiddenItemSet();
    const query = String(state.utility.marketSettingsSearch || '').trim().toLowerCase();
    const records = sortedAllMarketItems(getKnownItemRecords()
      .filter((item) => !query || `${item.name} ${item.id} ${item.category || ''}`.toLowerCase().includes(query)));
    const hiddenCount = records.filter((item) => hidden.has(String(item.id))).length;
    const page = getMarketDatabasePage(records);
    return `
      <div class="fluz-card">
        <div class="fluz-section-title"><span>Market item database</span><span class="fluz-muted">${hiddenCount} hidden here / ${hidden.size} total</span></div>
        <div class="fluz-form-grid">
          <label>Search item
            <input type="text" data-utility-setting="marketSettingsSearch" value="${escapeHtml(state.utility.marketSettingsSearch || '')}" placeholder="Cell Phone, Xanax, Medical, ID...">
          </label>
        </div>
        <p class="fluz-muted">Hidden items are excluded from Market Listings and all-item Bazaar scans. Showing ${escapeHtml(String(records.length))} matching items, ${escapeHtml(String(MARKET_DATABASE_PAGE_SIZE))} per page.</p>
        ${renderMarketFilterPresetControl()}
        ${renderMarketCategoryFilter()}
        ${renderMarketValueLimitControl()}
        ${renderMarketDatabasePager(page)}
        <div class="fluz-table">
          <div class="fluz-market-bazaar-row is-tight is-head">
            ${renderMarketDatabaseSortHeader('name', 'Item')}
            ${renderMarketDatabaseSortHeader('category', 'Type')}
            ${renderMarketDatabaseSortHeader('value', 'Value')}
            ${renderMarketDatabaseSortHeader('id', 'ID')}
            ${renderMarketDatabaseSortHeader('hidden', 'Status')}
          </div>
          ${page.rows.map((item) => {
            const isHidden = hidden.has(String(item.id));
            return `
            <div class="fluz-market-bazaar-row is-tight">
              <b title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</b>
              <div title="${escapeHtml(item.category || 'Other')}">${escapeHtml(item.category || 'Other')}</div>
              <div>${formatMoney(item.value)}</div>
              <div>#${escapeHtml(item.id)}</div>
              <div><button class="fluz-button ${isHidden ? 'primary' : 'danger'}" data-action="${isHidden ? 'unhide-market-item' : 'hide-market-item'}" data-item-id="${escapeHtml(item.id)}">${isHidden ? 'Unhide' : 'Hide'}</button></div>
            </div>
          `;
          }).join('') || '<div class="fluz-card compact">No item database rows matched.</div>'}
        </div>
        ${renderMarketDatabasePager(page)}
      </div>
    `;
  }

  function renderUtilitySettings(module) {
    if (!moduleHasUtilitySettings(module)) {
      return '<div class="fluz-card">No separate settings for this tool yet.</div>';
    }
    if (module.key === 'itemmarket' || module.key === 'bazaar') {
      const feeKey = module.key === 'itemmarket' ? state.utility.itemmarketFeeKey : 'bazaar';
      return `
        <div class="fluz-guide-hero">
          <h3>${escapeHtml(module.title)} Settings</h3>
          <p>Persistent market defaults for manual price planning.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Market pricing</div>
          <div class="fluz-form-grid">
            <label>Fallback profit %
              <input type="number" step="0.1" data-utility-setting="percentChange" value="${escapeHtml(state.utility.percentChange)}">
            </label>
            ${module.key === 'itemmarket' ? `
              <label>Fee mode
                <select data-utility-setting="itemmarketFeeKey">
                  ${Object.entries(MARKET_FEES).map(([key, fee]) => `<option value="${escapeHtml(key)}" ${feeKey === key ? 'selected' : ''}>${escapeHtml(fee.label)} (${escapeHtml(String(fee.feePct))}%)</option>`).join('')}
                </select>
              </label>
            ` : `
              <label>Fee mode
                <input type="text" value="Bazaar (0%)" disabled>
              </label>
            `}
          </div>
          <p class="fluz-muted">${escapeHtml((MARKET_FEES[feeKey] || MARKET_FEES.bazaar).note)}</p>
        </div>
        ${module.key === 'itemmarket' ? renderMarketHiddenSettings() : ''}
      `;
    }
    if (moduleHasTargetTools(module) || (Array.isArray(module.tools) && module.tools.includes('timers')) || (Array.isArray(module.tabs) && module.tabs.includes('timers'))) {
      return `
        <div class="fluz-guide-hero">
          <h3>${escapeHtml(module.title)} Settings</h3>
          <p>Alert behavior for manual timers and saved target readiness.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title"><span>Manual timer alarm</span><span class="fluz-muted">always on</span></div>
          <div class="fluz-form-grid">
            <label>Tone
              <select data-utility-setting="timerAlertTone">
                <option value="soft" ${state.utility.timerAlertTone === 'soft' ? 'selected' : ''}>Soft</option>
                <option value="standard" ${(state.utility.timerAlertTone || 'standard') === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="urgent" ${state.utility.timerAlertTone === 'urgent' ? 'selected' : ''}>Urgent</option>
              </select>
            </label>
            <label>Volume
              <input type="range" min="0" max="100" step="1" data-utility-setting="timerAlertVolume" value="${escapeHtml(state.utility.timerAlertVolume ?? 55)}">
            </label>
            <label>Volume %
              <input type="number" min="0" max="100" step="1" data-utility-setting="timerAlertVolume" value="${escapeHtml(state.utility.timerAlertVolume ?? 55)}">
            </label>
            <label>&nbsp;
              <button class="fluz-button primary" data-action="test-utility-alert">Test sound</button>
            </label>
          </div>
          <p class="fluz-muted">Manual timers always alert when they reach zero. Lower the volume or choose Soft if it is too aggressive.</p>
        </div>
        ${moduleHasTargetTools(module) ? `
        <div class="fluz-card">
          <div class="fluz-section-title"><span>Target alerts</span><span class="fluz-muted">ready status</span></div>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="targetSoundAlerts" ${state.utility.targetSoundAlerts ? 'checked' : ''}> Play sound when a saved target becomes ready.</label>
          <label class="fluz-check"><input type="checkbox" data-utility-setting="targetDesktopAlerts" ${state.utility.targetDesktopAlerts ? 'checked' : ''}> Show desktop notification when a saved target becomes ready.</label>
          <p class="fluz-muted">These alerts only fire for your saved Target Board rows when status changes back to Okay. No attacks or Torn actions are clicked.</p>
        </div>
        ` : ''}
      `;
    }
    if (module.key === 'crimes') {
      return `
        <div class="fluz-guide-hero">
          <h3>Crime Settings</h3>
          <p>Read-only defaults for crime labels and helper filters.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Pickpocket labels</div>
          <div class="fluz-form-grid">
            <label>Minimum CS
              <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMinCs" value="${escapeHtml(state.utility.pickpocketMinCs)}">
            </label>
            <label>Maximum CS
              <input type="number" min="100" max="350" step="50" data-utility-setting="pickpocketMaxCs" value="${escapeHtml(state.utility.pickpocketMaxCs)}">
            </label>
          </div>
          <p class="fluz-muted">Targets outside this range are only visually de-emphasized. You still choose every crime manually.</p>
        </div>
      `;
    }
    if (module.key === 'travel') {
      return `
        <div class="fluz-guide-hero">
          <h3>Travel Settings</h3>
          <p>Capacity, speed, book, and live-stock filters used by travel profit estimates.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Flight assumptions</div>
          <div class="fluz-form-grid">
            <label>Capacity
              <input type="number" min="1" data-utility-setting="travelCarry" value="${escapeHtml(state.utility.travelCarry || state.utility.travelCapacity)}">
            </label>
            <label>Flight speed
              <select data-utility-setting="travelSpeedTier">
                ${TRAVEL_SPEED_TIERS.map((tier) => `<option value="${escapeHtml(tier.key)}" ${state.utility.travelSpeedTier === tier.key ? 'selected' : ''}>${escapeHtml(tier.label)}</option>`).join('')}
              </select>
            </label>
            <label>Point price
              <input type="number" min="0" data-utility-setting="travelPointsPrice" value="${escapeHtml(state.utility.travelPointsPrice)}">
            </label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelHasBook" ${state.utility.travelHasBook ? 'checked' : ''}> Travel book</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelMuseumDay" ${state.utility.travelMuseumDay ? 'checked' : ''}> Museum Day +10%</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelTourismDay" ${state.utility.travelTourismDay ? 'checked' : ''}> Tourism carry x2</label>
          </div>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Live-stock filters</div>
          <div class="fluz-row-actions" style="justify-content:flex-start;">
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePlushies" ${state.utility.travelIncludePlushies ? 'checked' : ''}> Plushies</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeFlowers" ${state.utility.travelIncludeFlowers ? 'checked' : ''}> Flowers</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludePrehistoric" ${state.utility.travelIncludePrehistoric ? 'checked' : ''}> Points</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeSpecial" ${state.utility.travelIncludeSpecial ? 'checked' : ''}> Special</label>
            <label class="fluz-check"><input type="checkbox" data-utility-setting="travelIncludeDrugs" ${state.utility.travelIncludeDrugs ? 'checked' : ''}> Xanax</label>
          </div>
        </div>
      `;
    }
    if (module.key === 'missions') {
      return `
        <div class="fluz-guide-hero">
          <h3>Mission Settings</h3>
          <p>Persistent benchmark values for manual reward comparison.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Reward benchmark</div>
          <div class="fluz-form-grid">
            <label>Manual credit value
              <input type="number" min="0" data-utility-setting="missionTokenValue" value="${escapeHtml(state.utility.missionTokenValue)}">
            </label>
          </div>
          <p class="fluz-muted">Used when the visible reward does not give a clean implied value.</p>
        </div>
      `;
    }
    if (Array.isArray(module.tools) && module.tools.includes('addictionAdvisor')) {
      return `
        <div class="fluz-guide-hero">
          <h3>Addiction Advisor Settings</h3>
          <p>Manual thresholds for education risk and rehab planning.</p>
        </div>
        <div class="fluz-card">
          <div class="fluz-section-title">Risk thresholds</div>
          <div class="fluz-form-grid">
            <label>Education risk %
              <input type="number" min="0" max="100" step="0.1" data-utility-setting="addictionEduRiskPct" value="${escapeHtml(state.utility.addictionEduRiskPct)}">
            </label>
            <label>Rehab target %
              <input type="number" min="0" max="100" step="0.1" data-utility-setting="addictionRehabTargetPct" value="${escapeHtml(state.utility.addictionRehabTargetPct)}">
            </label>
            <label>Learned drop / rehab %
              <input type="number" min="0" max="100" step="0.1" data-utility-setting="addictionLearnedDropPct" value="${escapeHtml(state.utility.addictionLearnedDropPct)}">
            </label>
            <label>Manual rehabs done
              <input type="number" min="0" step="1" data-utility-setting="addictionManualRehabsDone" value="${escapeHtml(state.utility.addictionManualRehabsDone)}">
            </label>
            <label>Xanax AP estimate
              <input type="number" min="0" step="0.01" data-utility-setting="addictionXanaxAp" value="${escapeHtml(state.utility.addictionXanaxAp)}">
            </label>
            <label>Natural decay AP/day
              <input type="number" min="0" step="0.1" data-utility-setting="addictionNaturalDecayAp" value="${escapeHtml(state.utility.addictionNaturalDecayAp)}">
            </label>
            <label>Manual company penalty
              <input type="number" step="1" data-utility-setting="addictionCompanyPenalty" value="${escapeHtml(state.utility.addictionCompanyPenalty)}">
            </label>
            <label>Hot Turkey days
              <input type="number" min="0" step="1" data-utility-setting="addictionHotTurkeyDays" value="${escapeHtml(state.utility.addictionHotTurkeyDays)}">
            </label>
            <label>Hot Turkey OD estimate
              <input type="number" min="0" step="1" data-utility-setting="addictionHotTurkeyOds" value="${escapeHtml(state.utility.addictionHotTurkeyOds)}">
            </label>
            <label>Milk Sober removal %
              <input type="number" min="0" max="100" step="1" data-utility-setting="addictionMilkSoberRate" value="${escapeHtml(state.utility.addictionMilkSoberRate)}">
            </label>
          </div>
          <p class="fluz-muted">Learned drop is optional. If you leave it at 0, the helper will show "do 1 rehab, recheck" instead of pretending it knows your exact rehab count.</p>
        </div>
      `;
    }
    return '<div class="fluz-card">No separate settings for this tool yet.</div>';
  }

  function renderUtilityLinks(module) {
    const itemLinks = ['Xanax', 'Beer', 'Ecstasy', 'Erotic DVD', 'Feathery Hotel Coupon', 'Can of Munster', 'First Aid Kit', 'Morphine', 'Lockpick', 'Laptop'];
    return `
      <div class="fluz-section-title"><span>Useful links</span><span class="fluz-muted">${escapeHtml(module.short)}</span></div>
      <div class="fluz-card">
        <div class="fluz-link-grid">
          ${UTILITY_LINKS.map((link) => `<a class="fluz-button" href="${escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.label)}</a>`).join('')}
        </div>
      </div>
      <div class="fluz-card">
        <div class="fluz-section-title">Quick item market links</div>
        <div class="fluz-link-grid">
          ${itemLinks.map((name) => `<a class="fluz-button" href="${escapeHtml(itemMarketUrl(name))}" target="_blank" rel="noopener noreferrer">${escapeHtml(name)}</a>`).join('')}
        </div>
      </div>
    `;
  }

  function renderUtilityTimers(module) {
    const timers = getUtilityTimers(module.key);
    return `
      <div class="fluz-section-title"><span>${escapeHtml(module.short)} timers</span><span class="fluz-muted">${timers.length} saved</span></div>
      <div class="fluz-card">
        <div class="fluz-form-grid">
          <label>Label / target
            <input type="text" data-utility-setting="timerLabel" value="${escapeHtml(state.utility.timerLabel || '')}" placeholder="Player, faction, target...">
          </label>
          <label>Minutes from now
            <input type="number" min="1" data-utility-setting="timerMinutes" value="${escapeHtml(state.utility.timerMinutes || 30)}">
          </label>
          <label>Note
            <input type="text" data-utility-setting="timerNote" value="${escapeHtml(state.utility.timerNote || '')}" placeholder="Hosp exit, chain, bust, retal...">
          </label>
          <label>&nbsp;
            <button class="fluz-button primary" data-action="add-utility-timer">Add timer</button>
          </label>
        </div>
      </div>
      <div class="fluz-table">
        ${timers.map((timer) => renderUtilityTimerRow(timer)).join('') || '<div class="fluz-card">No timers saved for this page yet.</div>'}
      </div>
    `;
  }

  function renderUtilityTimerRow(timer) {
    const remainingMs = Math.max(0, timer.dueAt - nowMs());
    const mins = Math.ceil(remainingMs / 60000);
    return `
      <div class="fluz-row fluz-market-row">
        <div class="fluz-cell-main">${escapeHtml(timer.label)}</div>
        <div>${mins <= 0 ? `<span class="fluz-neg">${timer.alerted ? 'Alerted' : 'Ready'}</span>` : `${mins}m`}</div>
        <div>${escapeHtml(timer.note || '')}</div>
        <div>${new Date(timer.dueAt).toLocaleTimeString()}</div>
        <div><button class="fluz-icon-btn danger" title="Delete timer" data-action="delete-utility-timer" data-timer-id="${escapeHtml(timer.id)}">${iconSvg('trash')}</button></div>
      </div>
    `;
  }

  function scanVisibleMoneyValues() {
    const text = (document.body ? document.body.innerText : '') || '';
    const matches = text.match(/\$[\d,.]+[kmbt]?/gi) || [];
    const seen = new Set();
    return matches
      .map(parseMoneyText)
      .filter((value) => value > 0)
      .filter((value) => {
        const key = Math.round(value);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b - a);
  }

  function scanVisibleMarketItemRows() {
    if (!document.body) return [];
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    const rowNodes = Array.from(new Set(Array.from(document.querySelectorAll('tr, li, div, [class*="row"], [class*="item"]'))));
    const candidates = [];
    const seen = new Set();

    rowNodes.forEach((node) => {
      if (!node || !node.isConnected || node.closest(`#${APP.id}, #${APP.id}-modal`)) return;
      const priceInput = getMarketRowPriceInput(node);
      if (!priceInput) return;
      const rect = node.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const text = cleanBookieText(node.innerText || node.textContent || '');
      if (text.length < 4 || text.length > 220) return;
      const item = findKnownItemInText(text, known);
      if (!item) return;
      const name = item.name;
      if (!looksLikeMarketItemRow(text, name, priceInput)) return;

      const visiblePrice = extractFirstMoneyFromText(text);
      const price = visiblePrice > 0 ? visiblePrice : parseNumber(item && item.value);
      if (price <= 0) return;
      const quantity = extractMarketItemQuantity(text, name);
      const key = `${name.toLowerCase()}|${quantity}`;
      if (seen.has(key)) return;
      seen.add(key);
      candidates.push({ name, price, quantity, node, priceInput });
    });

    const childNodes = new Set(candidates.map((candidate) => candidate.node));
    return candidates
      .filter((candidate) => !Array.from(childNodes).some((other) => other !== candidate.node && candidate.node.contains(other)))
      .slice(0, 28);
  }

  function findKnownItemInText(text, knownItems = getKnownItemRecords()) {
    const clean = cleanBookieText(text);
    const lower = clean.toLowerCase();
    return (knownItems || []).find((item) => item.name && lower.includes(item.name.toLowerCase())) || null;
  }

  function looksLikeMarketItemRow(text, itemName = '', priceInput = null) {
    const clean = cleanBookieText(text);
    const hasMoney = /\$[\d,.]+[kmbt]?/i.test(clean);
    const hasQty = itemName && new RegExp(`${escapeRegExp(itemName)}\\s*x\\s*[\\d,]+`, 'i').test(clean);
    if (hasMoney && (hasQty || priceInput)) return true;
    if (hasMoney && itemName && clean.toLowerCase().includes(itemName.toLowerCase())) return true;
    if (priceInput && itemName && /\b(qty|quantity|price)\b/i.test(clean)) return true;
    return false;
  }

  function getMarketRowPriceInput(row) {
    const inputs = Array.from(row.querySelectorAll('input'))
      .filter(isNativeFillInput)
      .map((input) => ({ input, rect: input.getBoundingClientRect() }))
      .filter((item) => item.rect.width > 0 && item.rect.height > 0)
      .sort((a, b) => b.rect.left - a.rect.left);
    return inputs.length ? inputs[0].input : null;
  }

  function getMarketRowContainer(input) {
    let node = input;
    for (let depth = 0; node && depth < 8; depth += 1) {
      node = node.parentElement;
      if (!node || node.closest(`#${APP.id}, #${APP.id}-modal`)) return null;
      const text = cleanBookieText(node.innerText || node.textContent || '');
      const inputs = Array.from(node.querySelectorAll('input')).filter(isNativeFillInput);
      if (/\$[\d,.]+[kmbt]?/i.test(text) && inputs.length >= 1 && text.length < 220) return node;
    }
    return null;
  }

  function extractFirstMoneyFromText(text) {
    const match = String(text || '').match(/\$[\d,.]+[kmbt]?/i);
    return match ? parseMoneyText(match[0]) : 0;
  }

  function extractMarketItemName(text) {
    let beforeMoney = String(text || '').split(/\$[\d,.]+[kmbt]?/i)[0] || '';
    beforeMoney = beforeMoney
      .replace(/\b(which items would you like to add to market|you are adding|clear all|add to market)\b/ig, ' ')
      .replace(/\b(rrp|qty|quantity|price|market value|item market|bazaar)\b/ig, ' ')
      .replace(/[^\w\s'().-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const withQty = beforeMoney.match(/([A-Za-z][A-Za-z0-9'(). -]{1,60}?)\s+x\s*[\d,]+$/i);
    if (withQty) return cleanBookieText(withQty[1]).slice(0, 56);
    const match = beforeMoney.match(/([A-Za-z][A-Za-z0-9'(). -]{1,56})$/i);
    return cleanBookieText(match ? match[1] : beforeMoney).slice(0, 56);
  }

  function extractMarketItemQuantity(text, itemName) {
    const escapedName = escapeRegExp(itemName);
    const patterns = [
      new RegExp(`${escapedName}\\s*x\\s*([\\d,]+)`, 'i'),
      /\bx\s*([\d,]+)\b/i,
      /\bqty\s*:?\s*([\d,]+)/i,
      /\bquantity\s*:?\s*([\d,]+)/i
    ];
    for (const pattern of patterns) {
      const match = String(text || '').match(pattern);
      const quantity = match ? parseNumber(match[1]) : 0;
      if (quantity > 0 && quantity < 100000000) return Math.round(quantity);
    }
    return 1;
  }

  function parseMoneyText(value) {
    const raw = String(value || '').replace(/\$/g, '').replace(/,/g, '').trim().toLowerCase();
    const multiplier = raw.endsWith('t') ? 1e12 : raw.endsWith('b') ? 1e9 : raw.endsWith('m') ? 1e6 : raw.endsWith('k') ? 1e3 : 1;
    const number = parseFloat(raw.replace(/[kmbt]$/, ''));
    return Number.isFinite(number) ? number * multiplier : 0;
  }

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
    return `
      <div class="fluz-section-title">Stock settings</div>
      <div class="fluz-card fluz-combo-card">
        <div class="fluz-section-title">Combo selector</div>
        <div class="fluz-combo-grid">
          ${Object.values(STRATEGY_COMBOS).map((item) => `
            <button class="fluz-combo-option ${item.color} ${state.settings.strategyCombo === item.key ? 'is-active' : ''}" data-action="apply-combo" data-combo="${escapeHtml(item.key)}">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(item.description)}</span>
            </button>
          `).join('')}
        </div>
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
              ${Object.values(STRATEGY_METHODS).map((strategy) => `<option value="${strategy.key}" ${state.settings.strategyMode === strategy.key ? 'selected' : ''}>${strategy.label}</option>`).join('')}
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

  function bindEvents() {
    document.addEventListener('click', handleDocumentClick, true);
    document.addEventListener('change', handleDocumentChange, true);
    document.addEventListener('input', handleDocumentInput, true);
    document.addEventListener('focusin', handleDocumentFocusIn, true);
    document.addEventListener('pointerdown', handleDragStart, true);
    document.addEventListener('pointermove', handleDragMove, true);
    document.addEventListener('pointerup', handleDragEnd, true);
    document.addEventListener('pointercancel', handleDragEnd, true);
    window.addEventListener('resize', handleWindowResize, { passive: true });
    bindExtensionMessages();
  }

  function bindExtensionMessages() {
    if (state.extensionMessageBound) return;
    const runtime = typeof chrome !== 'undefined' && chrome && chrome.runtime && chrome.runtime.onMessage ? chrome.runtime : null;
    if (!runtime) return;
    state.extensionMessageBound = true;
    runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || message.type !== 'TORNZ_OPEN_PROFILE') return false;
      try {
        openProfileFromExtension();
        if (typeof sendResponse === 'function') sendResponse({ ok: true });
      } catch (error) {
        if (typeof sendResponse === 'function') sendResponse({ ok: false, error: error && error.message ? error.message : String(error) });
      }
      return false;
    });
  }

  function openProfileFromExtension() {
    state.panel.collapsed = false;
    ensurePanel();
    openProfileWindow();
  }

  function handleWindowResize() {
    if (state.elements.panel) {
      applyPanelSize(state.elements.panel);
      applyPanelPosition(state.elements.panel);
    }
    applyModalSize();
  }

  function handleDocumentFocusIn(event) {
    const input = event.target && event.target.tagName === 'INPUT' ? event.target : null;
    if (input && isNativeFillInput(input) && marketPriceInputScore(input) >= 5) state.lastNativeFillInput = input;
  }

  async function handleDocumentClick(event) {
    const target = event.target.closest(`#${APP.id} [data-action], #${APP.id} [data-tab], #${APP.id} [data-gym-tab], #${APP.id} [data-utility-tab], #${APP.id} [data-open-calc], #${APP.id} [data-filter-stock], #${APP.id}-modal [data-action]`);
    if (!target) return;

    const action = target.dataset.action;
    const tab = target.dataset.tab;
    const gymTab = target.dataset.gymTab;
    const utilityTab = target.dataset.utilityTab;
    const calcId = target.dataset.openCalc;
    const filterStock = target.dataset.filterStock;

    if (tab) {
      event.preventDefault();
      state.panel.activeTab = tab;
      await savePanelState();
      renderPanel();
      return;
    }

    if (gymTab) {
      event.preventDefault();
      state.gym.activeTab = gymTab;
      await saveGymState();
      renderPanel();
      return;
    }

    if (utilityTab) {
      event.preventDefault();
      state.utility.activeTab = utilityTab;
      await saveUtilityState();
      renderPanel();
      if (utilityTab === 'bazaarListings') scheduleAllBazaarAutoScan({ immediate: true });
      return;
    }

    if (calcId && !action) {
      event.preventDefault();
      openCalculator(calcId);
      return;
    }

    if (filterStock && !action) {
      event.preventDefault();
      findStockOnPage(filterStock);
      return;
    }

    if (!action) return;
    event.preventDefault();

    if (action === 'refresh') await refreshData(true);
    if (action === 'gym-refresh') await refreshGymData(true);
    if (action === 'gym-settings') openGymSettingsWindow();
    if (action === 'gym-guide') openGymGuideWindow();
    if (action === 'utility-refresh') {
      await refreshUtilityData(true);
      const module = getUtilityModule();
      if (moduleHasTargetTools(module)) await refreshTargetStatuses(true);
      if (isItemMarketBrowseItemPage()) await loadItemMarketBazaarListings(true);
      if (module.key === 'travel') await loadTravelYataData(true);
    }
    if (action === 'refresh-travel-yata') await loadTravelYataData(true);
    if (action === 'clear-travel-owned') await clearTravelOwnedItems();
    if (action === 'fill-travel-owned-ones') await fillTravelOwnedOnes();
    if (action === 'refresh-market-bazaar') await loadItemMarketBazaarListings(true);
    if (action === 'sort-market-bazaar') await sortItemMarketBazaarListings(target.dataset.sortKey);
    if (action === 'sort-all-market') await sortAllMarketItems(target.dataset.sortKey);
    if (action === 'market-database-page') await setMarketDatabasePage(target.dataset.page);
    if (action === 'sort-market-native-listings') await sortMarketNativeListings(target.dataset.sortKey);
    if (action === 'refresh-market-native-listings') {
      refreshVisibleTornMarketRows(true);
      renderPanelPreservingScroll();
    }
    if (action === 'apply-market-highlights') {
      applyItemMarketValueHighlights();
      showFlash('Item Market highlights refreshed.');
    }
    if (action === 'sort-all-bazaar') await sortAllBazaarListings(target.dataset.sortKey);
    if (action === 'scan-all-bazaar-batch') await scanAllBazaarBatch();
    if (action === 'reset-all-bazaar-scan') await resetAllBazaarScan();
    if (action === 'toggle-all-bazaar-scan-pause') await toggleAllBazaarScanPause();
    if (action === 'open-bazaar-link') await openBazaarLink(target.dataset.bazaarUrl, target.dataset.bazaarVisitKey, target.dataset.bazaarSellerKey);
    if (action === 'hide-market-item') await hideMarketItem(target.dataset.itemId);
    if (action === 'unhide-market-item') await unhideMarketItem(target.dataset.itemId);
    if (action === 'apply-market-value-limit') await applyMarketValueLimit();
    if (action === 'clear-market-value-limit') {
      state.utility.marketValueLimitMax = 0;
      await applyMarketValueLimit();
    }
    if (action === 'save-market-filter-preset') await saveMarketFilterPreset();
    if (action === 'load-market-filter-preset') await loadMarketFilterPreset();
    if (action === 'delete-market-filter-preset') await deleteMarketFilterPreset();
    if (action === 'utility-settings') openUtilitySettingsWindow();
    if (action === 'utility-guide') openUtilityGuideWindow();
    if (action === 'copy-utility-result') await copyUtilityText(target.dataset.copyText);
    if (action === 'log-chain-message') await logChainMessage(target.dataset.copyText);
    if (action === 'add-chain-friendly') await addChainFriendlyMember();
    if (action === 'copy-chain-friendly-message') await copyChainFriendlyMessage(target.dataset.memberId, target.dataset.copyText);
    if (action === 'copy-current-chain-message') await copyCurrentChainMessage();
    if (action === 'set-next-chain-friendly') await setNextChainFriendlyMember(target.dataset.memberId);
    if (action === 'remove-chain-friendly') await removeChainFriendlyMember(target.dataset.memberId);
    if (action === 'clear-chain-message-log') await clearChainMessageLog();
    if (action === 'fill-market-price') {
      const filled = await fillMarketPrice(target.dataset.price, target.dataset.itemName, target.dataset.sourcePrice);
      if (filled) markMarketFillButton(target);
    }
    if (action === 'sort-utility-table') await sortUtilityTable(target.dataset.sortTable, target.dataset.sortKey);
    if (action === 'ignore-item') await ignoreInventoryItem(target.dataset.itemName);
    if (action === 'unignore-item') await unignoreInventoryItem(target.dataset.itemName);
    if (action === 'use-casino-odds') await useCasinoOdds(target.dataset.odds);
    if (action === 'use-visible-bank-amount') await useVisibleBankAmount();
    if (action === 'fill-bank-amount') await fillBankAmount(target.dataset.bankAmount);
    if (action === 'apply-bounty-filter') applyBountyFilterToPage();
    if (action === 'clear-bounty-filter') clearBountyFilterDisplay();
    if (action === 'check-mug-protection') await checkMugProtection();
    if (action === 'use-travel-item') await useTravelItem(target.dataset.itemName);
    if (action === 'use-mission-item') await useMissionItem(target.dataset.itemName);
    if (action === 'toggle-bookie-sport') await toggleBookieSport(target.dataset.sport);
    if (action === 'fill-bookie-stake') await fillBookieStake(target.dataset.label, target.dataset.odds, target.dataset.stake);
    if (action === 'select-bootlegging-genre') selectBootleggingGenre(target.dataset.genre);
    if (action === 'mark-bootlegging-genres') {
      if (applyBootleggingButtonLabels()) showFlash('Bootlegging genre buttons labeled.');
      else showFlash('No Bootlegging genre buttons found yet.');
    }
    if (action === 'refresh-bootlegging-data') await refreshBootleggingFromPageData(true);
    if (action === 'refresh-crime-profitability') await loadCrimeProfitabilityData(true);
    if (action === 'mark-crime-profitability') {
      if (applyCrimeProfitabilityLabels()) showFlash('Crime profitability labels applied.');
      else showFlash('No matching visible crime options found yet.');
    }
    if (action === 'scan-cracking-helper') {
      if (scanCrackingCrimePage()) showFlash('Cracking suggestions applied.');
      else showFlash('No visible cracking rows found yet.');
    }
    if (action === 'load-cracking-wordlist') await loadCrackingPublicWordlist();
    if (action === 'clear-cracking-wordlist') await clearCrackingWordlist();
    if (action === 'refresh-crime-morale') await refreshCrimeMoraleFromPageData(true);
    if (action === 'mark-pickpocket-targets') {
      if (applyPickpocketFormatting()) showFlash('Pickpocket targets labeled.');
      else showFlash('No Pickpocket targets found yet.');
    }
    if (action === 'apply-racing-highlights') applyRacingUpgradeHighlights();
    if (action === 'test-utility-alert') {
      await sendUtilityAlert({
        title: `${APP.name}: Test alarm`,
        body: 'Timer alarm test.',
        tag: `${APP.id}-timer-test`,
        sound: true,
        desktop: false
      });
    }
    if (action === 'add-utility-timer') await addUtilityTimer();
    if (action === 'delete-utility-timer') await deleteUtilityTimer(target.dataset.timerId);
    if (action === 'set-hospital-alert') await setHospitalAlertTimer(target.dataset.hospitalUntil, target.dataset.offsetMinutes);
    if (action === 'check-ffscouter-key') await checkFfscouterKey();
    if (action === 'register-ffscouter-key') await registerFfscouterKey();
    if (action === 'apply-target-finder-preset') await applyTargetFinderPreset(target.dataset.preset);
    if (action === 'search-ffscouter-targets') await searchFfscouterTargets();
    if (action === 'open-ffscouter-target-finder') window.open('https://ffscouter.com/target-finder', '_blank', 'noopener,noreferrer');
    if (action === 'create-target-list-from-paste') await createTargetListFromPaste();
    if (action === 'select-target-list') await selectTargetList(target.dataset.listId);
    if (action === 'sort-target-list') await sortTargetList(target.dataset.sortKey);
    if (action === 'delete-target-list') await deleteTargetList(target.dataset.listId);
    if (action === 'copy-target-list-ids') await copyTargetListIds(target.dataset.listId);
    if (action === 'add-target-list-to-board') await addTargetListToBoard(target.dataset.listId);
    if (action === 'add-list-target-to-board') await addTargetFromListToBoard(target.dataset.listId, target.dataset.xid);
    if (action === 'remove-target-from-list') await removeTargetFromList(target.dataset.listId, target.dataset.xid);
    if (action === 'add-current-target') await addCurrentTarget();
    if (action === 'open-add-target') openTargetAddWindow();
    if (action === 'save-target-modal') await saveTargetFromModal();
    if (action === 'open-add-faction') openFactionImportWindow();
    if (action === 'import-faction-modal') await importFactionFromModal();
    if (action === 'export-targets') exportTargets();
    if (action === 'open-import-targets') openTargetsImportWindow();
    if (action === 'import-targets-modal') await importTargetsFromModal();
    if (action === 'sort-targets') await sortTargetTable(target.dataset.sortKey);
    if (action === 'toggle-note-filter-menu') await toggleTargetNoteFilterMenu();
    if (action === 'toggle-note-filter') await toggleTargetNoteFilter(target.dataset.note);
    if (action === 'clear-note-filters') await clearTargetNoteFilters();
    if (action === 'toggle-target-tree') await toggleTargetTreeNode(target.dataset.treeKey);
    if (action === 'toggle-target-star') await toggleTargetFlag(target.dataset.xid, 'starred');
    if (action === 'toggle-target-lock') await toggleTargetFlag(target.dataset.xid, 'locked');
    if (action === 'toggle-target-hide') await toggleTargetHide(target.dataset.xid);
    if (action === 'remove-target') await removeTarget(target.dataset.xid);
    if (action === 'open-item-market') openItemMarket(target.dataset.itemName);
    if (action === 'save-gym-build') await saveCurrentGymBuild();
    if (action === 'delete-gym-build') await deleteCurrentGymBuild();
    if (action === 'mark-all-gyms') await setAllGymsAvailable();
    if (action === 'clear-available-gyms') await clearAvailableGyms();
    if (action === 'open-settings') {
      openSettingsWindow();
    }
    if (action === 'open-about') {
      openGuideWindow();
    }
    if (action === 'open-profile') {
      openProfileWindow();
    }
    if (action === 'open-donate') {
      openDonateWindow();
    }
    if (action === 'apply-combo') {
      applyCombo(target.dataset.combo);
      await saveSettings();
      await refreshAnalysisOnly();
      openSettingsWindow();
    }
    if (action === 'toggle-collapse') {
      state.panel.collapsed = !state.panel.collapsed;
      await savePanelState();
      renderPanel();
    }
    if (action === 'save-api-key') await handleSaveApiKey(target);
    if (action === 'clear-api-key') await handleClearApiKey();
    if (action === 'toggle-lock') await toggleStockLock(target.dataset.stockId);
    if (action === 'find-stock') findStockOnPage(target.dataset.acronym);
    if (action === 'clear-native-filter') clearNativeStockFilter();
    if (action === 'reset-local-data') await handleResetLocalData();
    if (action === 'test-notification') await handleTestNotification();
    if (action === 'clear-notification-history') await clearNotificationHistory();
    if (action === 'close-modal') closeModal();
  }

  function handleDragStart(event) {
    const resizeHandle = event.target.closest && event.target.closest(`#${APP.id} .fluz-vertical-resize, #${APP.id}-modal .fluz-vertical-resize`);
    if (resizeHandle) {
      const scope = resizeHandle.dataset.resizeWindow || 'panel';
      const target = scope === 'modal'
        ? $(`#${APP.id}-modal .fluz-modal-box`)
        : state.elements.panel;
      if (!target || (scope === 'panel' && state.panel.collapsed)) return;
      const rect = target.getBoundingClientRect();
      state.resize = {
        active: true,
        scope,
        pointerId: event.pointerId,
        startY: event.clientY,
        startHeight: rect.height,
        minHeight: scope === 'modal' ? 150 : 160,
        maxHeight: Math.max(scope === 'modal' ? 150 : 160, scope === 'modal' ? modalContentMaxHeight(target) : panelContentMaxHeight(target))
      };
      const root = scope === 'modal' ? $(`#${APP.id}-modal`) : target;
      if (root) root.classList.add('is-resizing');
      if (resizeHandle.setPointerCapture) {
        try { resizeHandle.setPointerCapture(event.pointerId); } catch (error) { /* ignore capture failures */ }
      }
      event.preventDefault();
      return;
    }

    const modalHandle = event.target.closest && event.target.closest(`#${APP.id}-modal .fluz-window-head`);
    if (modalHandle && !event.target.closest('button, input, select, textarea, a')) {
      const modal = $(`#${APP.id}-modal`);
      if (!modal) return;
      const rect = modal.getBoundingClientRect();
      state.drag = {
        active: true,
        modal: true,
        pointerId: event.pointerId,
        offsetX: event.clientX - rect.left,
        offsetY: event.clientY - rect.top
      };
      if (modalHandle.setPointerCapture) {
        try { modalHandle.setPointerCapture(event.pointerId); } catch (error) { /* ignore capture failures */ }
      }
      event.preventDefault();
      return;
    }

    const handle = event.target.closest && event.target.closest(`#${APP.id} .fluz-drag-handle`);
    if (!handle || event.target.closest('button, input, select, textarea, a')) return;
    const panel = state.elements.panel;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    state.drag = {
      active: true,
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top
    };
    panel.classList.add('is-dragging');
    if (handle.setPointerCapture) {
      try { handle.setPointerCapture(event.pointerId); } catch (error) { /* ignore capture failures */ }
    }
    event.preventDefault();
  }

  function handleDragMove(event) {
    if (state.resize && state.resize.active) {
      const scope = state.resize.scope;
      const target = scope === 'modal'
        ? $(`#${APP.id}-modal .fluz-modal-box`)
        : state.elements.panel;
      if (!target) return;
      const nextHeight = clamp(state.resize.startHeight + (event.clientY - state.resize.startY), state.resize.minHeight, state.resize.maxHeight);
      target.style.height = `${Math.round(nextHeight)}px`;
      if (scope === 'modal') state.panel.modalHeight = Math.round(nextHeight);
      else state.panel.height = Math.round(nextHeight);
      event.preventDefault();
      return;
    }

    if (!state.drag || !state.drag.active) return;
    if (state.drag.modal) {
      const modal = $(`#${APP.id}-modal`);
      if (!modal) return;
      const box = $('.fluz-modal-box', modal);
      const width = box ? box.offsetWidth || 520 : 520;
      const height = box ? box.offsetHeight || 120 : 120;
      const x = clamp(event.clientX - state.drag.offsetX, 4, Math.max(4, window.innerWidth - width - 4));
      const y = clamp(event.clientY - state.drag.offsetY, 4, Math.max(4, window.innerHeight - Math.min(height, window.innerHeight - 8) - 4));
      modal.style.left = `${x}px`;
      modal.style.top = `${y}px`;
      event.preventDefault();
      return;
    }
    const panel = state.elements.panel;
    if (!panel) return;
    const width = panel.offsetWidth || 490;
    const height = panel.offsetHeight || 80;
    const x = clamp(event.clientX - state.drag.offsetX, 4, Math.max(4, window.innerWidth - width - 4));
    const y = clamp(event.clientY - state.drag.offsetY, 4, Math.max(4, window.innerHeight - Math.min(height, 80) - 4));
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
    panel.style.right = 'auto';
    state.panel.x = Math.round(x);
    state.panel.y = Math.round(y);
    event.preventDefault();
  }

  async function handleDragEnd() {
    if (state.resize && state.resize.active) {
      const scope = state.resize.scope;
      const root = scope === 'modal' ? $(`#${APP.id}-modal`) : state.elements.panel;
      if (root) root.classList.remove('is-resizing');
      state.resize.active = false;
      state.resize = null;
      await savePanelState();
      return;
    }
    if (!state.drag || !state.drag.active) return;
    state.drag.active = false;
    if (state.elements.panel) state.elements.panel.classList.remove('is-dragging');
    await savePanelState();
  }

  async function handleDocumentChange(event) {
    const setting = event.target.closest(`#${APP.id} [data-setting], #${APP.id}-modal [data-setting]`);
    const notify = event.target.closest(`#${APP.id} [data-notify-setting], #${APP.id}-modal [data-notify-setting]`);
    const gymSetting = event.target.closest(`#${APP.id} [data-gym-setting], #${APP.id}-modal [data-gym-setting]`);
    const gymAvailable = event.target.closest(`#${APP.id} [data-gym-available], #${APP.id}-modal [data-gym-available]`);
    const gymTarget = event.target.closest(`#${APP.id} [data-gym-target], #${APP.id}-modal [data-gym-target]`);
    const gymManual = event.target.closest(`#${APP.id} [data-gym-manual], #${APP.id}-modal [data-gym-manual]`);
    const utilitySetting = event.target.closest(`#${APP.id} [data-utility-setting], #${APP.id}-modal [data-utility-setting]`);
    const chainFriendlyField = event.target.closest(`#${APP.id} [data-chain-friendly-field]`);
    const travelOwned = event.target.closest(`#${APP.id} [data-travel-owned], #${APP.id}-modal [data-travel-owned]`);
    const targetNote = event.target.closest(`#${APP.id} [data-target-note]`);
    const marketScanItem = event.target.closest(`#${APP.id} [data-market-scan-item], #${APP.id}-modal [data-market-scan-item]`);
    const marketCategoryScan = event.target.closest(`#${APP.id} [data-market-category-scan], #${APP.id}-modal [data-market-category-scan]`);
    const meritLevel = event.target.closest(`#${APP.id} [data-merit-level-key], #${APP.id}-modal [data-merit-level-key]`);
    if (setting) {
      await updateSetting(setting);
      return;
    }
    if (gymSetting) {
      await updateGymSetting(gymSetting);
      return;
    }
    if (gymAvailable) {
      await updateAvailableGym(gymAvailable);
      return;
    }
    if (gymTarget || gymManual) {
      await updateGymNumberInput(gymTarget || gymManual);
      return;
    }
    if (utilitySetting) {
      const noRenderMerit = getUtilityModule().key === 'awards' && ['meritFreePoints'].includes(utilitySetting.dataset.utilitySetting || '');
      await updateUtilitySetting(utilitySetting, noRenderMerit ? { render: false } : {});
      return;
    }
    if (chainFriendlyField) {
      await updateChainFriendlyMember(chainFriendlyField);
      return;
    }
    if (travelOwned) {
      await updateTravelOwnedItem(travelOwned);
      return;
    }
    if (targetNote) {
      await updateTargetNote(targetNote);
      return;
    }
    if (meritLevel) {
      await updateMeritLevel(meritLevel, { render: false });
      return;
    }
    if (marketScanItem) {
      await setMarketItemScanEnabled(marketScanItem.dataset.marketScanItem, marketScanItem.checked);
      return;
    }
    if (marketCategoryScan) {
      await setMarketCategoryScanEnabled(marketCategoryScan.dataset.marketCategoryScan, marketCategoryScan.checked);
      return;
    }
    const itemProfit = event.target.closest(`#${APP.id} [data-item-profit]`);
    if (itemProfit) {
      await updateItemProfitPct(itemProfit);
      return;
    }
    if (notify) {
      await updateNotificationSetting(notify);
    }
  }

  async function handleDocumentInput(event) {
    const calcInput = event.target.closest(`#${APP.id}-modal [data-calc-input]`);
    if (calcInput) updateCalculator(calcInput.dataset.calcInput);
    const riskInput = event.target.closest(`#${APP.id}-modal [data-setting="riskLevel"]`);
    if (riskInput) {
      const combo = comboFromRisk(riskInput.value);
      const label = $(`#${APP.id}-modal [data-risk-preview]`);
      if (label) label.textContent = `${combo.label} - risk ${combo.risk}/100`;
    }
    const gymTarget = event.target.closest(`#${APP.id} [data-gym-target], #${APP.id}-modal [data-gym-target]`);
    const gymManual = event.target.closest(`#${APP.id} [data-gym-manual], #${APP.id}-modal [data-gym-manual]`);
    if (gymTarget || gymManual) {
      await updateGymNumberInput(gymTarget || gymManual, { render: false });
    }
    const utilitySetting = event.target.closest(`#${APP.id} [data-utility-setting], #${APP.id}-modal [data-utility-setting]`);
    if (utilitySetting) await updateUtilitySetting(utilitySetting, { render: false });
    const chainFriendlyField = event.target.closest(`#${APP.id} [data-chain-friendly-field]`);
    if (chainFriendlyField) await updateChainFriendlyMember(chainFriendlyField, { render: false });
    const travelOwned = event.target.closest(`#${APP.id} [data-travel-owned], #${APP.id}-modal [data-travel-owned]`);
    if (travelOwned) await updateTravelOwnedItem(travelOwned, { render: false });
    const targetNote = event.target.closest(`#${APP.id} [data-target-note]`);
    if (targetNote) await updateTargetNote(targetNote, { render: false });
    const meritLevel = event.target.closest(`#${APP.id} [data-merit-level-key], #${APP.id}-modal [data-merit-level-key]`);
    if (meritLevel) await updateMeritLevel(meritLevel, { render: false });
  }

  async function updateUtilitySetting(input, options = {}) {
    const key = input.dataset.utilitySetting;
    if (!key) return;
    if (input.type === 'checkbox') state.utility[key] = input.checked;
    else if (input.type === 'number' || input.type === 'range') state.utility[key] = parseNumber(input.value);
    else state.utility[key] = input.value;
    if (key === 'marketSettingsSearch') state.utility.marketSettingsPage = 1;
    if (key === 'marketFilterPresetId') {
      const preset = normalizeMarketFilterPresets(state.utility.marketFilterPresets).find((item) => item.id === state.utility.marketFilterPresetId);
      state.utility.marketFilterPresetName = preset ? preset.name : '';
      syncUtilitySettingInputs('marketFilterPresetName', state.utility.marketFilterPresetName);
    }
    await saveUtilityState();
    if (key === 'pickpocketMinCs' || key === 'pickpocketMaxCs') schedulePickpocketFormatting();
    if (key === 'crackingMaxSuggestions') {
      state.utility[key] = clamp(Math.floor(parseNumber(state.utility[key] || 8)), 1, 20);
      syncUtilitySettingInputs(key, state.utility[key]);
      scheduleCrackingScan();
      await saveUtilityState();
    }
    if (key === 'crackingShowComplete') scheduleCrackingScan();
    if (key === 'marketBazaarMinQty' || key === 'marketBazaarMaxAgeMinutes') renderNativeItemMarketBazaarPanel();
    if (key === 'marketBazaarAutoScan' || key === 'marketBazaarScanPaused') scheduleAllBazaarAutoScan();
    if (key === 'marketHighlightEnabled' || key === 'marketHighlightThresholdPct') {
      syncUtilitySettingInputs(key, state.utility[key]);
      requestAnimationFrame(() => applyItemMarketValueHighlights());
    }
    if (key === 'targetDesktopAlerts' && state.utility.targetDesktopAlerts) await requestNotificationPermissionIfNeeded();
    if (['chainMessageAlertEnabled', 'chainTargetAlertEnabled', 'chainWarningAlertEnabled'].includes(key) && state.utility[key]) await requestNotificationPermissionIfNeeded();
    if (key === 'chainMessageAlertAt' || key === 'chainTargetAlertAt' || key === 'chainWarningAlertAt') syncChainAlertControls();
    if (key === 'timerAlertVolume') {
      state.utility[key] = clamp(parseNumber(state.utility[key]), 0, 100);
      syncUtilitySettingInputs(key, state.utility[key]);
      await saveUtilityState();
    }
    if (key === 'casinoPokerRisk') {
      state.utility[key] = clamp(Math.round(parseNumber(state.utility[key])), 0, 100);
      syncUtilitySettingInputs(key, state.utility[key]);
      const label = $(`#${APP.id} [data-poker-risk-label]`);
      if (label) label.textContent = `${state.utility[key] <= 30 ? 'Safe' : (state.utility[key] >= 70 ? 'Loose' : 'Balanced')} ${state.utility[key]}/100`;
      await saveUtilityState();
    }
    if (key === 'travelCarry') state.utility.travelCapacity = state.utility.travelCarry;
    if (options.render !== false) renderPanel();
  }

  function syncUtilitySettingInputs(key, value) {
    $all(`#${APP.id} [data-utility-setting], #${APP.id}-modal [data-utility-setting]`).filter((input) => input.dataset.utilitySetting === key).forEach((input) => {
      if (input.type === 'checkbox') input.checked = !!value;
      else if (input.type === 'range' && key === 'marketHighlightThresholdPct') input.value = String(clamp(parseNumber(value), -10, 10));
      else if (input.type === 'range' && (key === 'chainMessageAlertAt' || key === 'chainTargetAlertAt' || key === 'chainWarningAlertAt')) input.value = String(clamp(parseChainTimeSetting(value, key === 'chainMessageAlertAt' ? 290 : (key === 'chainTargetAlertAt' ? 140 : 30)), 0, 300));
      else input.value = String(value ?? '');
    });
  }

  function syncChainAlertControls() {
    const panel = state.elements.panel;
    if (!panel) return;
    const messageSeconds = parseChainTimeSetting(state.utility.chainMessageAlertAt, 290);
    const targetSeconds = parseChainTimeSetting(state.utility.chainTargetAlertAt, 140);
    const warningSeconds = parseChainTimeSetting(state.utility.chainWarningAlertAt, 30);
    const messageLabel = $('[data-chain-message-alert-label]', panel);
    const targetLabel = $('[data-chain-target-label]', panel);
    const warningLabel = $('[data-chain-warning-label]', panel);
    const messageMarker = $('[data-chain-message-alert-marker]', panel);
    const targetMarker = $('[data-chain-target-marker]', panel);
    const warningMarker = $('[data-chain-warning-marker]', panel);
    if (messageLabel) messageLabel.textContent = formatChainClock(messageSeconds * 1000);
    if (targetLabel) targetLabel.textContent = formatChainClock(targetSeconds * 1000);
    if (warningLabel) warningLabel.textContent = formatChainClock(warningSeconds * 1000);
    if (messageMarker) messageMarker.style.left = `${clamp((messageSeconds / 300) * 100, 0, 100).toFixed(1)}%`;
    if (targetMarker) targetMarker.style.left = `${clamp((targetSeconds / 300) * 100, 0, 100).toFixed(1)}%`;
    if (warningMarker) warningMarker.style.left = `${clamp((warningSeconds / 300) * 100, 0, 100).toFixed(1)}%`;
    syncUtilitySettingInputs('chainMessageAlertAt', messageSeconds);
    syncUtilitySettingInputs('chainTargetAlertAt', targetSeconds);
    syncUtilitySettingInputs('chainWarningAlertAt', warningSeconds);
  }

  async function updateTravelOwnedItem(input, options = {}) {
    const name = String(input.dataset.travelOwned || '').trim();
    if (!name) return;
    state.utility.travelOwnedItems = { ...(state.utility.travelOwnedItems || {}) };
    state.utility.travelOwnedItems[name] = Math.max(0, Math.floor(parseNumber(input.value)));
    await saveUtilityState();
    if (options.render !== false) renderPanel();
  }

  async function updateItemProfitPct(input) {
    const key = itemProfitKey(input.dataset.itemProfit);
    if (!key) return;
    state.utility.itemProfitPcts = { ...(state.utility.itemProfitPcts || {}) };
    state.utility.itemProfitPcts[key] = parseNumber(input.value);
    await saveUtilityState();
    renderPanel();
  }

  async function copyUtilityText(value) {
    const text = String(value || '');
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(text);
      else window.prompt('Copy value:', text);
      showFlash('Copied helper value.');
    } catch (error) {
      window.prompt('Copy value:', text);
    }
  }

  async function addChainFriendlyMember() {
    const parsed = parseChainFriendlyInput(state.utility.chainFriendlyInput);
    if (!parsed.name && !parsed.xid) {
      showFlash('Enter a friendly member name, XID, or profile link first.');
      return;
    }
    const members = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers);
    const energy = Math.max(0, Math.floor(parseNumber(state.utility.chainFriendlyEnergy)));
    const note = String(state.utility.chainFriendlyNote || '').trim();
    const fetchedName = parsed.xid ? await fetchProfileNameByXid(parsed.xid) : '';
    const displayName = fetchedName || parsed.name || (parsed.xid ? `XID ${parsed.xid}` : '');
    const existingIndex = parsed.xid ? members.findIndex((member) => member.xid === parsed.xid) : -1;
    const member = {
      id: existingIndex >= 0 ? members[existingIndex].id : makeChainFriendlyId(parsed.xid, displayName, members.length),
      xid: parsed.xid,
      name: displayName,
      energy,
      note,
      createdAt: existingIndex >= 0 ? members[existingIndex].createdAt : nowMs(),
      updatedAt: nowMs()
    };
    if (existingIndex >= 0) members[existingIndex] = { ...members[existingIndex], ...member };
    else members.push(member);
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(members);
    state.utility.chainFriendlyInput = '';
    state.utility.chainFriendlyEnergy = 0;
    state.utility.chainFriendlyNote = '';
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(existingIndex >= 0 ? 'Friendly member updated.' : 'Friendly member added.');
  }

  async function updateChainFriendlyMember(input, options = {}) {
    const id = String(input.dataset.memberId || '').trim();
    const field = String(input.dataset.chainFriendlyField || '').trim();
    if (!id || !field) return;
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers).map((member) => {
      if (member.id !== id) return member;
      const next = { ...member, updatedAt: nowMs() };
      if (field === 'name') next.name = cleanBookieText(input.value) || (member.xid ? `XID ${member.xid}` : 'Member');
      if (field === 'energy') next.energy = Math.max(0, Math.floor(parseNumber(input.value)));
      if (field === 'note') next.note = String(input.value || '').trim();
      return next;
    });
    await saveUtilityState();
    if (options.render !== false) renderPanelKeepingScroll();
  }

  async function removeChainFriendlyMember(memberId) {
    const id = String(memberId || '').trim();
    if (!id) return;
    state.utility.chainFriendlyMembers = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers).filter((member) => member.id !== id);
    const count = state.utility.chainFriendlyMembers.length;
    if (count) state.utility.chainFriendlyCursor = Math.max(0, Math.floor(parseNumber(state.utility.chainFriendlyCursor))) % count;
    else state.utility.chainFriendlyCursor = 0;
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash('Friendly member removed.');
  }

  async function setNextChainFriendlyMember(memberId) {
    const id = String(memberId || '').trim();
    if (!id) return;
    const members = sortChainFriendlyMembers(normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers));
    const index = members.findIndex((member) => member.id === id);
    if (index < 0) return;
    state.utility.chainFriendlyCursor = index;
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`${members[index].name || 'Friendly member'} set as next attacker.`);
  }

  async function copyCurrentChainMessage() {
    const text = String(state.utility.chainGeneratedMessage || '').trim();
    if (!text) return;
    await copyUtilityText(text);
  }

  async function copyChainFriendlyMessage(memberId, fallbackText = '', preferFallback = false) {
    const id = String(memberId || '').trim();
    const members = normalizeChainFriendlyMembers(state.utility.chainFriendlyMembers);
    const index = members.findIndex((member) => member.id === id);
    if (index < 0) return;
    const member = members[index];
    await resolveChainFriendlyMemberName(member);
    const text = String(preferFallback ? (fallbackText || buildFriendlyChainMessage(member)) : (buildFriendlyChainMessage(member) || fallbackText)).trim();
    if (!text) return;
    await copyUtilityText(text);
    const cost = Math.max(1, Math.floor(parseNumber(state.utility.chainAttackCost || 25)));
    members[index] = {
      ...member,
      energy: Math.max(0, Math.floor(parseNumber(member.energy)) - cost),
      updatedAt: nowMs()
    };
    state.utility.chainFriendlyMembers = members;
    state.utility.chainMessageLog = [
      { ts: nowMs(), text, memberId: member.id, memberName: member.name || (member.xid ? `XID ${member.xid}` : '') },
      ...(Array.isArray(state.utility.chainMessageLog) ? state.utility.chainMessageLog : [])
    ].slice(0, 30);
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function logChainMessage(value) {
    const text = String(value || '').trim();
    if (!text) return;
    await copyUtilityText(text);
    state.utility.chainMessageLog = [
      { ts: nowMs(), text },
      ...(Array.isArray(state.utility.chainMessageLog) ? state.utility.chainMessageLog : [])
    ].slice(0, 30);
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function clearChainMessageLog() {
    state.utility.chainMessageLog = [];
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function fillMarketPrice(value, itemName = '', sourcePrice = 0) {
    const amount = Math.max(1, Math.round(parseNumber(value)));
    const input = findMarketPriceInput(itemName, sourcePrice);
    if (!input) {
      showFlash(itemName ? `No price box found for ${itemName}. Click that item's Price field first, then press Fill.` : 'No visible price box found. Click a Torn price field first, then press Fill.');
      return false;
    }
    if (setVisibleInputValue(input, amount)) {
      try { input.focus({ preventScroll: true }); } catch (error) { input.focus(); }
      showFlash(`Filled ${formatFullMoney(amount)}. Review and confirm manually.`);
      return true;
    }
    return false;
  }

  async function sortUtilityTable(table, key) {
    if (!table || !key) return;
    const keyName = table === 'inventory' ? 'inventorySortKey' : 'citySortKey';
    const dirName = table === 'inventory' ? 'inventorySortDir' : 'citySortDir';
    if (state.utility[keyName] === key) {
      state.utility[dirName] = state.utility[dirName] === 'asc' ? 'desc' : 'asc';
    } else {
      state.utility[keyName] = key;
      state.utility[dirName] = ['name', 'store'].includes(key) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    renderPanel();
  }

  async function ignoreInventoryItem(name) {
    const itemName = String(name || '').trim();
    if (!itemName) return;
    const set = new Set(state.utility.ignoredItems || []);
    set.add(itemName);
    state.utility.ignoredItems = Array.from(set).sort((a, b) => a.localeCompare(b));
    await saveUtilityState();
    renderPanel();
    showFlash(`Ignored ${itemName}.`);
  }

  async function unignoreInventoryItem(name) {
    const itemName = String(name || '').trim();
    state.utility.ignoredItems = (state.utility.ignoredItems || []).filter((item) => item !== itemName);
    await saveUtilityState();
    renderPanel();
    showFlash(`Unignored ${itemName}.`);
  }

  async function useCasinoOdds(value) {
    const odds = Math.max(1.01, parseNumber(value));
    if (!Number.isFinite(odds) || odds <= 1) return;
    state.utility.casinoOdds = Math.round(odds * 100) / 100;
    await saveUtilityState();
    renderPanel();
    showFlash(`Loaded odds ${state.utility.casinoOdds.toFixed(2)}.`);
  }

  async function useVisibleBankAmount() {
    const amount = bankVisibleAmount();
    if (!amount) {
      showFlash('No visible bank amount found.');
      return;
    }
    state.utility.bankPlanAmount = Math.round(amount);
    await saveUtilityState();
    renderPanel();
    showFlash(`Loaded visible bank amount ${formatMoney(amount)}.`);
  }

  async function fillBankAmount(value) {
    const amount = Math.max(0, Math.floor(parseNumber(value)));
    const input = bankVisibleAmountInput();
    if (!amount || !input) {
      showFlash('No bank amount input found.');
      return;
    }
    input.focus();
    input.value = String(amount);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    state.utility.bankPlanAmount = amount;
    await saveUtilityState();
    showFlash(`Filled bank amount ${formatMoney(amount)}. Review and confirm manually in Torn.`);
  }

  async function toggleBookieSport(sport) {
    const key = String(sport || '').trim();
    if (!key) return;
    state.utility.bookieSports = { ...DEFAULT_UTILITY_STATE.bookieSports, ...(state.utility.bookieSports || {}) };
    const enabledCount = Object.values(state.utility.bookieSports).filter(Boolean).length;
    if (state.utility.bookieSports[key] && enabledCount <= 1) {
      showFlash('Keep at least one Bookie sport enabled.');
      return;
    }
    state.utility.bookieSports[key] = !state.utility.bookieSports[key];
    await saveUtilityState();
    renderPanel();
  }

  async function fillBookieStake(label, odds, stake) {
    const input = findBookieStakeInput(label, odds);
    if (!input) {
      showFlash(`Could not find stake input for ${label || 'that outcome'}. Scroll it into view, then refresh.`);
      return;
    }
    const amount = Math.max(0, Math.round(parseNumber(stake)));
    if (!amount) {
      showFlash('Stake is 0. Raise your base stake or use an outcome with positive edge.');
      return;
    }
    if (setVisibleInputValue(input, amount)) {
      try { input.focus({ preventScroll: true }); } catch (error) { input.focus(); }
      showFlash(`Filled ${formatFullMoney(amount)} for ${label}. Review before pressing BET.`);
    }
  }

  function ffscouterKey() {
    return String(state.apiKey || '').trim();
  }

  function isFfscouterKeyReasonable(key = ffscouterKey()) {
    return /^[a-z0-9]{16}$/i.test(String(key || '').trim());
  }

  function ffscouterError(data, fallback = 'FFScouter request failed') {
    return data && data.error ? data.error : fallback;
  }

  async function checkFfscouterKey() {
    const key = ffscouterKey();
    if (!isFfscouterKeyReasonable(key)) {
      state.ffscouterStatus = 'invalid key format';
      renderPanel();
      showFlash('Add your Torn API key in Profile first.');
      return;
    }
    if (!state.utility.ffscouterEnabled) {
      showFlash('Enable FFScouter features before checking the key.');
      return;
    }
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const data = await httpGetJson(`${APP.ffscouterBaseUrl}/check-key?key=${encodeURIComponent(key)}`);
      if (data && data.error) throw new Error(data.error);
      state.ffscouterStatus = data.is_registered
        ? `registered${data.is_premium ? ' premium' : ''}`
        : 'not registered';
      showFlash(`FFScouter key ${state.ffscouterStatus}.`);
    } catch (error) {
      state.ffscouterStatus = 'check failed';
      showFlash(`FFScouter check failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanel();
    }
  }

  async function registerFfscouterKey() {
    const key = ffscouterKey();
    if (!isFfscouterKeyReasonable(key)) {
      showFlash('Add your Torn API key in Profile first.');
      return;
    }
    if (!state.utility.ffscouterEnabled) {
      showFlash('Enable FFScouter before registering with FFScouter.');
      return;
    }
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const data = await httpPostJson(`${APP.ffscouterBaseUrl}/register`, {
        key,
        agree_to_data_policy: true,
        signup_source: 'TORNzTools'
      });
      if (data && data.error) throw new Error(ffscouterError(data));
      state.ffscouterStatus = 'registered';
      showFlash(data.message || 'FFScouter key registered.');
    } catch (error) {
      state.ffscouterStatus = 'register failed';
      showFlash(`FFScouter register failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanel();
    }
  }

  async function searchFfscouterTargets() {
    const key = ffscouterKey();
    if (!isFfscouterKeyReasonable(key)) {
      showFlash('Add your Torn API key in Profile first.');
      return;
    }
    if (!state.utility.ffscouterEnabled) {
      showFlash('Enable FFScouter features before searching.');
      return;
    }
    const preset = String(state.utility.ffscouterPreset || 'level');
    const limit = clamp(Math.round(parseNumber(state.utility.ffscouterLimit) || 20), 1, 50);
    const params = new URLSearchParams({ key, limit: String(limit) });
    if (preset === 'level' || preset === 'respect') {
      params.set('preset', preset);
    } else {
      params.set('minlevel', String(clamp(Math.round(parseNumber(state.utility.ffscouterMinLevel) || 1), 1, 100)));
      params.set('maxlevel', String(clamp(Math.round(parseNumber(state.utility.ffscouterMaxLevel) || 100), 1, 100)));
      params.set('minff', String(Math.max(1, parseNumber(state.utility.ffscouterMinFf) || 1)));
      params.set('maxff', String(Math.max(1, parseNumber(state.utility.ffscouterMaxFf) || 3)));
      params.set('inactiveonly', state.utility.ffscouterInactiveOnly ? '1' : '0');
      params.set('factionless', state.utility.ffscouterFactionless ? '1' : '0');
    }
    try {
      state.ffscouterLoading = true;
      renderPanel();
      const data = await httpGetJson(`${APP.ffscouterBaseUrl}/get-targets?${params.toString()}`);
      if (data && data.error) throw new Error(ffscouterError(data));
      const rows = filterFfscouterRows(normalizeTargetListRows(data.targets || []));
      if (!rows.length) throw new Error('No targets returned.');
      await createTargetListFromRows(rows, {
        name: state.utility.ffscouterListName || `${preset === 'respect' ? 'Chain / respect' : preset === 'level' ? 'Leveling' : preset === 'war' ? 'War ready' : 'Custom'} - ${new Date().toLocaleTimeString()}`,
        source: 'FFScouter',
        preset
      });
      state.ffscouterStatus = `${rows.length} targets loaded`;
      state.utility.ffscouterListName = '';
      await saveUtilityState();
      showFlash(`Created FFScouter list with ${rows.length} targets.`);
    } catch (error) {
      state.ffscouterStatus = 'search failed';
      showFlash(`FFScouter search failed: ${friendlyError(error)}`);
    } finally {
      state.ffscouterLoading = false;
      renderPanel();
    }
  }

  function filterFfscouterRows(rows) {
    const saved = new Set(normalizeTargets(state.utility.targets).map((target) => target.xid));
    const maxDays = Math.max(0, parseNumber(state.utility.ffscouterMaxLastActionDays));
    const maxAgeSeconds = maxDays > 0 ? maxDays * 24 * 60 * 60 : 0;
    const nowSeconds = Math.floor(nowMs() / 1000);
    const filtered = rows.filter((row) => {
      if (state.utility.ffscouterExcludeSaved && saved.has(row.xid)) return false;
      if (state.utility.ffscouterRequireStats && !row.bsEstimate && !row.bsEstimateHuman && !row.bssPublic) return false;
      if (maxAgeSeconds && row.lastAction && nowSeconds - row.lastAction > maxAgeSeconds) return false;
      return true;
    });
    const sortKey = String(state.utility.ffscouterSortKey || 'ff');
    return filtered.sort((a, b) => {
      if (sortKey === 'level') return (b.level || 0) - (a.level || 0) || (a.fairFight || 999) - (b.fairFight || 999);
      if (sortKey === 'stats') return (a.bsEstimate || a.bssPublic || Number.MAX_SAFE_INTEGER) - (b.bsEstimate || b.bssPublic || Number.MAX_SAFE_INTEGER);
      if (sortKey === 'activity') return (b.lastAction || 0) - (a.lastAction || 0);
      return (a.fairFight || 999) - (b.fairFight || 999) || (b.level || 0) - (a.level || 0);
    });
  }

  async function applyTargetFinderPreset(preset) {
    const key = String(preset || '').trim();
    if (!['level', 'respect', 'war', 'custom'].includes(key)) return;
    state.utility.ffscouterPreset = key;
    if (key === 'level') {
      state.utility.ffscouterLimit = 20;
      state.utility.ffscouterMinLevel = 1;
      state.utility.ffscouterMaxLevel = 100;
      state.utility.ffscouterMinFf = 1;
      state.utility.ffscouterMaxFf = 3;
      state.utility.ffscouterInactiveOnly = true;
      state.utility.ffscouterFactionless = false;
      state.utility.ffscouterExcludeSaved = false;
      state.utility.ffscouterRequireStats = false;
      state.utility.ffscouterMaxLastActionDays = 0;
      state.utility.ffscouterSortKey = 'level';
      state.utility.ffscouterListTag = 'level';
      state.utility.ffscouterListName = '';
    }
    if (key === 'respect') {
      state.utility.ffscouterLimit = 30;
      state.utility.ffscouterMinLevel = 1;
      state.utility.ffscouterMaxLevel = 100;
      state.utility.ffscouterMinFf = 1;
      state.utility.ffscouterMaxFf = 2.5;
      state.utility.ffscouterInactiveOnly = true;
      state.utility.ffscouterFactionless = false;
      state.utility.ffscouterExcludeSaved = true;
      state.utility.ffscouterRequireStats = false;
      state.utility.ffscouterMaxLastActionDays = 0;
      state.utility.ffscouterSortKey = 'ff';
      state.utility.ffscouterListTag = 'chain';
      state.utility.ffscouterListName = 'Chain / respect';
    }
    if (key === 'war') {
      state.utility.ffscouterLimit = 40;
      state.utility.ffscouterMinLevel = 1;
      state.utility.ffscouterMaxLevel = 100;
      state.utility.ffscouterMinFf = 1;
      state.utility.ffscouterMaxFf = 2.2;
      state.utility.ffscouterInactiveOnly = false;
      state.utility.ffscouterFactionless = false;
      state.utility.ffscouterExcludeSaved = true;
      state.utility.ffscouterRequireStats = false;
      state.utility.ffscouterMaxLastActionDays = 7;
      state.utility.ffscouterSortKey = 'ff';
      state.utility.ffscouterListTag = 'war enemy';
      state.utility.ffscouterListName = 'war enemy';
    }
    await saveUtilityState();
    renderPanel();
  }

  async function createTargetListFromPaste() {
    const rows = extractTargetRowsFromText(state.utility.ffscouterImportText);
    if (!rows.length) {
      showFlash('Paste at least one player ID or profile link.');
      return;
    }
    await createTargetListFromRows(rows, {
      name: state.utility.ffscouterListName || `Manual list - ${new Date().toLocaleTimeString()}`,
      source: 'Manual paste',
      preset: 'manual'
    });
    state.utility.ffscouterImportText = '';
    state.utility.ffscouterListName = '';
    await saveUtilityState();
    renderPanel();
    showFlash(`Created list with ${rows.length} targets.`);
  }

  function extractTargetRowsFromText(text) {
    const matches = String(text || '').match(/\b\d{3,10}\b/g) || [];
    const seen = new Set();
    return matches
      .map((xid) => String(xid).replace(/\D/g, ''))
      .filter((xid) => xid && !seen.has(xid) && seen.add(xid))
      .map((xid) => ({ xid, name: `XID ${xid}`, source: 'manual' }));
  }

  async function createTargetListFromRows(rows, options = {}) {
    const cleanRows = normalizeTargetListRows(rows);
    if (!cleanRows.length) return null;
    const list = {
      id: `list-${Date.now().toString(36)}`,
      name: String(options.name || 'Target list').trim(),
      source: String(options.source || 'local').trim(),
      preset: String(options.preset || '').trim(),
      defaultNote: String(options.defaultNote || state.utility.ffscouterListTag || '').trim(),
      createdAt: nowMs(),
      updatedAt: nowMs(),
      targets: cleanRows
    };
    const lists = normalizeTargetLists(state.utility.targetLists);
    state.utility.targetLists = normalizeTargetLists([list, ...lists]);
    state.utility.activeTargetListId = list.id;
    state.utility.activeTab = 'lists';
    await saveUtilityState();
    return list;
  }

  async function selectTargetList(listId) {
    state.utility.activeTargetListId = String(listId || '');
    await saveUtilityState();
    renderPanel();
  }

  async function sortTargetList(key) {
    const sortKey = String(key || '').trim();
    if (!['level', 'ff', 'stats'].includes(sortKey)) return;
    if (state.utility.targetListSortKey === sortKey) {
      state.utility.targetListSortDir = state.utility.targetListSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.utility.targetListSortKey = sortKey;
      state.utility.targetListSortDir = sortKey === 'level' ? 'desc' : 'asc';
    }
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function deleteTargetList(listId) {
    const id = String(listId || '');
    await reloadUtilityStateFromStorage();
    state.utility.targetLists = normalizeTargetLists(state.utility.targetLists).filter((list) => list.id !== id);
    if (state.utility.activeTargetListId === id) state.utility.activeTargetListId = '';
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash('Target list deleted.');
  }

  async function removeTargetFromList(listId, xid) {
    const id = String(listId || '');
    const cleanXid = String(xid || '').replace(/\D/g, '');
    await reloadUtilityStateFromStorage();
    state.utility.targetLists = normalizeTargetLists(state.utility.targetLists).map((list) => (
      list.id === id ? { ...list, targets: list.targets.filter((target) => target.xid !== cleanXid), updatedAt: nowMs() } : list
    )).filter((list) => list.targets.length);
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function copyTargetListIds(listId) {
    const list = normalizeTargetLists(state.utility.targetLists).find((item) => item.id === String(listId || ''));
    if (!list) return;
    await copyUtilityText(list.targets.map((target) => target.xid).join(','));
  }

  function targetFromListRow(row, note = '') {
    return {
      xid: row.xid,
      name: row.name || `XID ${row.xid}`,
      note: note || row.note || '',
      level: row.level,
      fairFight: row.fairFight,
      bssPublic: row.bssPublic,
      bsEstimate: row.bsEstimate,
      bsEstimateHuman: row.bsEstimateHuman,
      lastAction: row.lastAction,
      source: row.source || 'FFScouter'
    };
  }

  async function addTargetFromListToBoard(listId, xid) {
    await reloadUtilityStateFromStorage();
    const list = normalizeTargetLists(state.utility.targetLists).find((item) => item.id === String(listId || ''));
    if (!list) return;
    const row = list.targets.find((item) => item.xid === String(xid || '').replace(/\D/g, ''));
    if (!row) return;
    await saveTarget(targetFromListRow(row, targetListDefaultNote(list)));
  }

  async function addTargetListToBoard(listId) {
    await reloadUtilityStateFromStorage();
    const list = normalizeTargetLists(state.utility.targetLists).find((item) => item.id === String(listId || ''));
    if (!list) return;
    const note = targetListDefaultNote(list);
    const imported = list.targets.map((row) => targetFromListRow(row, note));
    state.utility.targets = normalizeTargets([...imported, ...normalizeTargets(state.utility.targets)]);
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Added ${imported.length} targets to board.`);
  }

  async function saveTarget(target) {
    if (!target || !target.xid) return;
    await reloadUtilityStateFromStorage();
    const targets = normalizeTargets(state.utility.targets);
    const existing = targets.find((item) => item.xid === target.xid);
    const incomingName = String(target.name || '').trim();
    const existingName = String(existing && existing.name ? existing.name : '').trim();
    const mergedName = /^XID\s+\d+$/i.test(incomingName) && existingName && !/^XID\s+\d+$/i.test(existingName)
      ? existingName
      : incomingName || existingName || `XID ${target.xid}`;
    const next = {
      xid: target.xid,
      name: mergedName,
      note: String(target.note || (existing && existing.note) || '').trim(),
      factionId: String(target.factionId || (existing && existing.factionId) || '').replace(/\D/g, ''),
      factionName: String(target.factionName || (existing && existing.factionName) || '').trim(),
      starred: existing ? existing.starred : false,
      locked: existing ? existing.locked : false,
      hidden: existing ? existing.hidden : false,
      hospitalUntil: parseNumber(target.hospitalUntil) || (existing ? existing.hospitalUntil : 0),
      statusState: String(target.statusState || (existing && existing.statusState) || '').trim(),
      statusText: String(target.statusText || (existing && existing.statusText) || '').trim(),
      statusUntil: parseNumber(target.statusUntil) || (existing ? existing.statusUntil : 0),
      statusUpdatedAt: parseNumber(target.statusUpdatedAt) || (existing ? existing.statusUpdatedAt : 0),
      level: parseNumber(target.level) || (existing ? existing.level : 0),
      fairFight: parseNumber(target.fairFight) || (existing ? existing.fairFight : 0),
      bssPublic: parseNumber(target.bssPublic) || (existing ? existing.bssPublic : 0),
      bsEstimate: parseNumber(target.bsEstimate) || (existing ? existing.bsEstimate : 0),
      bsEstimateHuman: String(target.bsEstimateHuman || (existing && existing.bsEstimateHuman) || '').trim(),
      lastAction: parseNumber(target.lastAction) || (existing ? existing.lastAction : 0),
      source: String(target.source || (existing && existing.source) || '').trim(),
      createdAt: existing ? existing.createdAt : nowMs(),
      updatedAt: nowMs()
    };
    state.utility.targets = normalizeTargets([next, ...targets.filter((item) => item.xid !== target.xid)]);
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Saved target ${next.name}.`);
  }

  async function addCurrentTarget() {
    const target = getCurrentProfileTarget();
    if (!target) {
      showFlash('Open a Torn profile page first.');
      return;
    }
    await saveTarget(target);
  }

  async function addManualTarget() {
    const xid = parseProfileXid(state.utility.targetInput);
    if (!xid) {
      showFlash('Paste a profile URL or XID first.');
      return;
    }
    const note = String(state.utility.targetNote || '').trim();
    const name = await fetchProfileNameByXid(xid) || `XID ${xid}`;
    await saveTarget({ xid, name, note });
    state.utility.targetInput = '';
    state.utility.targetNote = '';
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function saveTargetFromModal() {
    const input = $(`#${APP.id} [data-utility-setting="targetInput"]`) || $(`#${APP.id}-modal [data-target-modal-input]`);
    const noteInput = $(`#${APP.id} [data-utility-setting="targetNote"]`) || $(`#${APP.id}-modal [data-target-modal-note]`);
    const xid = parseProfileXid(input ? input.value : state.utility.targetInput);
    if (!xid) {
      showFlash('Paste a profile URL or XID first.');
      return;
    }
    const name = await fetchProfileNameByXid(xid) || `XID ${xid}`;
    await saveTarget({ xid, name, note: noteInput ? noteInput.value : state.utility.targetNote });
    state.utility.targetInput = '';
    state.utility.targetNote = '';
    state.utility.targetAddOpen = false;
    await saveUtilityState();
    renderPanel();
  }

  function openTargetAddWindow() {
    const opening = !state.utility.targetAddOpen;
    state.utility.targetAddOpen = opening;
    if (opening) {
      state.utility.targetInput = '';
      state.utility.targetNote = '';
    }
    state.utility.factionAddOpen = false;
    state.utility.targetImportOpen = false;
    saveUtilityState();
    renderPanel();
  }

  async function toggleTargetFlag(xid, flag) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid || !['starred', 'locked'].includes(flag)) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, [flag]: !target[flag], updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function toggleTargetHide(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    const target = normalizeTargets(state.utility.targets).find((item) => item.xid === cleanXid);
    if (target && target.locked && !target.hidden) {
      showFlash('Locked target protected. Unlock it before hiding.');
      return;
    }
    state.utility.targets = normalizeTargets(state.utility.targets).map((item) => (
      item.xid === cleanXid ? { ...item, hidden: !item.hidden, updatedAt: nowMs() } : item
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function sortTargetTable(key) {
    if (!key) return;
    if (state.utility.targetSortKey === key) {
      state.utility.targetSortDir = state.utility.targetSortDir === 'asc' ? 'desc' : 'asc';
    } else {
      state.utility.targetSortKey = key;
      state.utility.targetSortDir = ['player', 'note'].includes(key) ? 'asc' : 'desc';
    }
    await saveUtilityState();
    renderPanel();
  }

  async function toggleTargetNoteFilterMenu() {
    state.utility.targetNoteFilterOpen = !state.utility.targetNoteFilterOpen;
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function toggleTargetNoteFilter(note) {
    const cleanNote = String(note || '').trim();
    if (!cleanNote) return;
    const set = new Set(selectedTargetNoteFilters());
    if (set.has(cleanNote)) set.delete(cleanNote);
    else set.add(cleanNote);
    state.utility.targetNoteFilters = Array.from(set).sort((a, b) => a.localeCompare(b));
    state.utility.targetNoteFilter = '';
    state.utility.targetNoteFilterOpen = true;
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function clearTargetNoteFilters() {
    state.utility.targetNoteFilters = [];
    state.utility.targetNoteFilter = '';
    state.utility.targetNoteFilterOpen = true;
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  async function toggleTargetTreeNode(key) {
    const cleanKey = String(key || '').trim();
    if (!cleanKey) return;
    state.utility.targetTreeOpen = { ...(state.utility.targetTreeOpen || {}) };
    state.utility.targetTreeOpen[cleanKey] = !targetTreeIsOpen(cleanKey);
    await saveUtilityState();
    renderPanel();
  }

  function targetTreeIsOpen(key) {
    const map = state.utility.targetTreeOpen || {};
    if (Object.prototype.hasOwnProperty.call(map, key)) return !!map[key];
    return /^root:(priority|factions|tags|status)$/.test(String(key || ''));
  }

  async function updateTargetNote(input, options = {}) {
    const cleanXid = String(input.dataset.targetNote || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, note: String(input.value || ''), updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    if (options.render !== false) renderPanelKeepingScroll();
  }

  async function setTargetHospitalTimer(xid, minutes) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    const mins = Math.max(1, parseNumber(minutes));
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, hospitalUntil: nowMs() + mins * 60 * 1000, updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Hospital timer set for ${mins} minutes.`);
  }

  async function clearTargetHospitalTimer(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets(state.utility.targets).map((target) => (
      target.xid === cleanXid ? { ...target, hospitalUntil: 0, updatedAt: nowMs() } : target
    ));
    await saveUtilityState();
    renderPanelKeepingScroll();
  }

  function exportTargets() {
    const payload = {
      app: APP.name,
      version: APP.version,
      exportedAt: new Date().toISOString(),
      targets: normalizeTargets(state.utility.targets)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tornz-targets-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showFlash('Exported target list.');
  }

  function openTargetsImportWindow() {
    state.utility.targetImportOpen = !state.utility.targetImportOpen;
    state.utility.targetAddOpen = false;
    state.utility.factionAddOpen = false;
    saveUtilityState();
    renderPanel();
  }

  async function importTargetsFromModal() {
    const textarea = $(`#${APP.id} [data-utility-setting="targetImportJson"]`) || $(`#${APP.id}-modal [data-target-import-json]`);
    let parsed;
    try {
      parsed = JSON.parse(textarea ? textarea.value : state.utility.targetImportJson || '');
    } catch (error) {
      showFlash('Import failed: JSON is not valid.');
      return;
    }
    const imported = normalizeTargets(Array.isArray(parsed) ? parsed : parsed.targets);
    if (!imported.length) {
      showFlash('No targets found in import.');
      return;
    }
    await reloadUtilityStateFromStorage();
    state.utility.targets = normalizeTargets([...imported, ...normalizeTargets(state.utility.targets)]);
    state.utility.targetImportJson = '';
    state.utility.targetImportOpen = false;
    await saveUtilityState();
    closeModal();
    renderPanelKeepingScroll();
    showFlash(`Imported ${imported.length} targets.`);
  }

  function openFactionImportWindow() {
    state.utility.factionAddOpen = !state.utility.factionAddOpen;
    state.utility.targetAddOpen = false;
    state.utility.targetImportOpen = false;
    saveUtilityState();
    renderPanel();
  }

  async function importFactionFromModal() {
    const input = $(`#${APP.id} [data-utility-setting="factionInput"]`) || $(`#${APP.id}-modal [data-faction-modal-input]`);
    const noteInput = $(`#${APP.id} [data-utility-setting="factionNote"]`) || $(`#${APP.id}-modal [data-faction-modal-note]`);
    const factionId = parseFactionId(input ? input.value : state.utility.factionInput);
    if (!factionId) {
      showFlash('Paste a faction ID or faction URL first.');
      return;
    }
    if (!isApiKeyReasonable(state.apiKey)) {
      showFlash('Add an API key first, then import faction members.');
      return;
    }
    try {
      const url = `${APP.apiBaseUrl}/faction/${encodeURIComponent(factionId)}?selections=basic&key=${encodeURIComponent(state.apiKey)}`;
      const data = await httpGetJson(url);
      if (data.error) throw new Error(data.error.error || 'Torn API error');
      const members = data.members || {};
      const factionName = cleanBookieText(data.name || (data.faction && data.faction.name) || `Faction ${factionId}`);
      const note = String(noteInput ? noteInput.value : state.utility.factionNote || '').trim();
      const imported = Object.entries(members).map(([xid, member]) => ({
        xid: String(xid).replace(/\D/g, ''),
        name: cleanProfileName(member && member.name ? member.name : `XID ${xid}`, xid),
        note,
        factionId: String(factionId),
        factionName,
        starred: false,
        locked: false,
        hidden: false,
        createdAt: nowMs(),
        updatedAt: nowMs()
      })).filter((target) => target.xid);
      if (!imported.length) throw new Error('No faction members returned.');
      await reloadUtilityStateFromStorage();
      state.utility.targets = normalizeTargets([...imported, ...normalizeTargets(state.utility.targets)]);
      state.utility.factionInput = '';
      state.utility.factionNote = '';
      state.utility.factionAddOpen = false;
      await saveUtilityState();
      closeModal();
      renderPanelKeepingScroll();
      showFlash(`Imported ${imported.length} faction targets.`);
    } catch (error) {
      showFlash(`Faction import failed: ${friendlyError(error)}`);
    }
  }

  function parseFactionId(value) {
    const text = String(value || '');
    const match = text.match(/[?&#](?:ID|factionID)=(\d+)/i) || text.match(/\bfaction\s*[:#]?\s*(\d+)\b/i) || text.match(/\b(\d{2,10})\b/);
    return match ? match[1] : '';
  }

  async function removeTarget(xid) {
    const cleanXid = String(xid || '').replace(/\D/g, '');
    if (!cleanXid) return;
    await reloadUtilityStateFromStorage();
    const target = normalizeTargets(state.utility.targets).find((item) => item.xid === cleanXid);
    if (target && target.locked) {
      showFlash('Locked target protected. Unlock it before removing.');
      return;
    }
    state.utility.targets = normalizeTargets(state.utility.targets).filter((target) => target.xid !== cleanXid);
    await saveUtilityState();
    renderPanelKeepingScroll();
    showFlash(`Removed target XID ${cleanXid}.`);
  }

  async function addUtilityTimer() {
    const module = getUtilityModule();
    const label = String(state.utility.timerLabel || module.short || 'Timer').trim() || 'Timer';
    const minutes = Math.max(1, parseNumber(state.utility.timerMinutes || 30));
    await addUtilityTimerAt(module.key, label, String(state.utility.timerNote || '').trim(), nowMs() + minutes * 60 * 1000);
    showFlash(`Timer added: ${label}`);
  }

  async function addUtilityTimerAt(moduleKey, label, note, dueAt) {
    if ('Notification' in window && Notification.permission === 'default') await requestNotificationPermissionIfNeeded();
    const timer = {
      id: `timer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      moduleKey,
      label: String(label || 'Timer').trim() || 'Timer',
      note: String(note || '').trim(),
      dueAt: Math.max(nowMs() + 1000, parseNumber(dueAt)),
      alerted: false
    };
    state.utility.timers = [...(state.utility.timers || []), timer];
    await saveUtilityState();
    renderPanelKeepingScroll();
    return timer;
  }

  async function setHospitalAlertTimer(untilValue, offsetMinutesValue) {
    const untilMs = parseNumber(untilValue);
    const offsetMinutes = Math.max(0, parseNumber(offsetMinutesValue));
    if (!untilMs || untilMs <= nowMs()) {
      showFlash('Hospital exit time is not active anymore.');
      return;
    }
    const dueAt = untilMs - offsetMinutes * 60 * 1000;
    if (dueAt <= nowMs()) {
      showFlash(`${offsetMinutes}m-before alert has already passed.`);
      return;
    }
    const label = offsetMinutes > 0 ? `Hospital exit - ${offsetMinutes}m warning` : 'Hospital exit now';
    const note = offsetMinutes > 0 ? `Hospital exit at ${new Date(untilMs).toLocaleTimeString()}` : 'Hospital timer reaches 00';
    await addUtilityTimerAt('hospital', label, note, dueAt);
    showFlash(`Hospital alert set for ${new Date(dueAt).toLocaleTimeString()}.`);
  }

  async function deleteUtilityTimer(timerId) {
    state.utility.timers = (state.utility.timers || []).filter((timer) => timer.id !== timerId);
    await saveUtilityState();
    renderPanel();
  }

  async function checkUtilityTimerAlerts() {
    const timers = Array.isArray(state.utility.timers) ? state.utility.timers : [];
    const due = timers.filter((timer) => !timer.alerted && parseNumber(timer.dueAt) <= nowMs());
    if (!due.length) return;
    state.utility.timers = timers.map((timer) => due.some((item) => item.id === timer.id) ? { ...timer, alerted: true } : timer);
    await saveUtilityState();
    for (const timer of due.slice(0, 3)) {
      await sendUtilityAlert({
        title: `${APP.name}: Timer ready`,
        body: `${timer.label}${timer.note ? ` - ${timer.note}` : ''}`,
        tag: `${APP.id}-timer-${timer.id}`,
        sound: true,
        desktop: true
      });
    }
    if (!isPanelInputFocused()) renderPanelKeepingScroll();
  }

  async function updateGymSetting(input) {
    const key = input.dataset.gymSetting;
    state.gym[key] = input.value;
    if (key === 'buildKey' && input.value !== 'custom') {
      if (String(input.value).startsWith('saved:')) {
        const id = String(input.value).slice(6);
        const saved = (state.gym.customBuilds || []).find((build) => build.id === id);
        if (saved) {
          state.gym.target = { ...normalizeGymTarget(saved.target) };
          state.gym.customBuildName = saved.name || state.gym.customBuildName;
        }
      } else if (GYM_BUILDS[input.value]) {
        state.gym.target = { ...GYM_BUILDS[input.value].target };
      }
    }
    await saveGymState();
    await refreshGymAnalysisOnly();
  }

  async function updateGymNumberInput(input, options = {}) {
    if (input.dataset.gymTarget) {
      if (!String(state.gym.buildKey || '').startsWith('saved:')) state.gym.buildKey = 'custom';
      state.gym.target[input.dataset.gymTarget] = parseNumber(input.value);
    }
    if (input.dataset.gymManual) {
      state.gym.manualStats[input.dataset.gymManual] = parseNumber(input.value);
    }
    await saveGymState();
    if (options.render !== false) await refreshGymAnalysisOnly();
  }

  function openItemMarket(itemName) {
    const name = String(itemName || '').trim();
    if (!name) return;
    window.open(itemMarketUrl(name), '_blank', 'noopener,noreferrer');
  }

  async function saveCurrentGymBuild() {
    const nameInput = $(`#${APP.id} [data-gym-setting="customBuildName"]`) || $(`#${APP.id}-modal [data-gym-setting="customBuildName"]`);
    const name = String((nameInput && nameInput.value) || state.gym.customBuildName || 'Custom build').trim();
    const target = normalizeGymTarget(state.gym.target);
    const id = String(state.gym.buildKey || '').startsWith('saved:')
      ? String(state.gym.buildKey).slice(6)
      : `build-${Date.now().toString(36)}`;
    const customBuilds = (state.gym.customBuilds || []).filter((build) => build.id !== id);
    customBuilds.push({ id, name, target });
    state.gym.customBuilds = customBuilds;
    state.gym.customBuildName = name;
    state.gym.buildKey = `saved:${id}`;
    state.gym.target = { ...target };
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash(`Saved gym build: ${name}`);
  }

  async function deleteCurrentGymBuild() {
    if (!String(state.gym.buildKey || '').startsWith('saved:')) return;
    const id = String(state.gym.buildKey).slice(6);
    const build = (state.gym.customBuilds || []).find((item) => item.id === id);
    state.gym.customBuilds = (state.gym.customBuilds || []).filter((item) => item.id !== id);
    state.gym.buildKey = 'balanced';
    state.gym.target = { ...GYM_BUILDS.balanced.target };
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash(`Deleted gym build${build && build.name ? `: ${build.name}` : ''}`);
  }

  async function updateAvailableGym(input) {
    const name = input.dataset.gymAvailable;
    const current = getAvailableGymNames();
    const set = new Set(current.length ? current : GYM_DATABASE.map((gym) => gym.name));
    if (input.checked) set.add(name);
    else set.delete(name);
    state.gym.availableGyms = Array.from(set);
    await saveGymState();
    await refreshGymAnalysisOnly();
  }

  async function setAllGymsAvailable() {
    state.gym.availableGyms = GYM_DATABASE.map((gym) => gym.name);
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash('All gyms marked available.');
  }

  async function clearAvailableGyms() {
    state.gym.availableGyms = [];
    await saveGymState();
    await refreshGymAnalysisOnly();
    showFlash('Available gym list cleared. Using all gyms as possible.');
  }

  async function updateSetting(input) {
    const key = input.dataset.setting;
    if (key === 'strategyCombo') {
      applyCombo(input.value);
    } else if (key === 'riskLevel') {
      applyCombo(comboFromRisk(input.value).key);
    } else {
      if (input.type === 'checkbox') state.settings[key] = input.checked;
      else if (input.type === 'number' || input.type === 'range') state.settings[key] = parseNumber(input.value);
      else state.settings[key] = input.value;
    }
    if (key === 'stockHighlightOnlyMode' && state.settings.stockHighlightOnlyMode) clearNativeStockFilter({ silent: true });
    await saveSettings();
    await refreshAnalysisOnly();
    if ($(`#${APP.id}-modal .fluz-modal-box.stock-settings`)) openSettingsWindow();
  }

  async function updateNotificationSetting(input) {
    const key = input.dataset.notifySetting;
    if (input.type === 'checkbox') {
      state.settings.notifications[key] = input.checked;
      if (key === 'enabled' && input.checked) await requestNotificationPermissionIfNeeded();
    } else {
      state.settings.notifications[key] = parseNumber(input.value);
    }
    await saveSettings();
    renderPanel();
    if ($(`#${APP.id}-modal .fluz-modal-box.stock-settings`)) openSettingsWindow();
  }

  async function handleSaveApiKey(trigger) {
    const profileModalOpen = !!$(`#${APP.id}-modal .fluz-modal-box.profile-settings`);
    const scope = trigger && trigger.closest
      ? trigger.closest(`#${APP.id}, #${APP.id}-modal`)
      : null;
    const localInput = scope ? $('[data-input="api-key"]', scope) : null;
    const filledInput = $all('[data-input="api-key"]')
      .filter((candidate) => candidate.offsetParent !== null)
      .find((candidate) => String(candidate.value || '').trim());
    const input = localInput || filledInput || $(`#${APP.id}-modal [data-input="api-key"]`) || $(`#${APP.id} [data-input="api-key"]`);
    const key = input ? input.value.trim() : '';
    if (!isApiKeyReasonable(key)) {
      state.error = 'That API key field is empty or contains spaces. Paste the full Torn API key, preferably Limited Access.';
      renderPanel();
      return;
    }
    await saveApiKey(key);
    if (input) input.value = '';
    state.error = '';
    showFlash('API key saved locally.');
    if (state.mode === 'gym') await refreshGymData(true);
    else if (state.mode === 'stocks') await refreshData(true);
    else await refreshUtilityData(true);
    if (profileModalOpen) openProfileWindow();
  }

  async function handleClearApiKey() {
    const profileModalOpen = !!$(`#${APP.id}-modal .fluz-modal-box.profile-settings`);
    await clearApiKey();
    state.data = null;
    state.gymRaw = null;
    state.gymData = null;
    state.analyses = [];
    state.recommendations = [];
    state.error = 'API key cleared.';
    renderPanel();
    if (profileModalOpen) openProfileWindow();
  }

  async function handleResetLocalData() {
    await clearLocalData();
    state.error = '';
    showFlash('Local FLUZ data reset.');
    renderPanel();
  }

  async function handleTestNotification() {
    const stock = state.analyses[0] || {
      id: 'TEST',
      acronym: 'SYS',
      name: 'Test Stock',
      price: 1234567
    };
    const recommendation = createRecommendation({
      action: 'SELL NOW',
      stock,
      priority: 99,
      reason: 'Test notification only. FLUZ never auto-sells or performs account actions.'
    });
    if (state.settings.notifications.enabled) await requestNotificationPermissionIfNeeded();
    const sent = await sendBrowserNotification(recommendation);
    sendInPageNotification(recommendation);
    showFlash(sent ? 'Test notification sent. Also showing an in-page FLUZ alert.' : 'Browser notification was not shown. FLUZ in-page alert is active.');
  }

  // ---------------------------------------------------------------------------
  // Torn page integration
  // ---------------------------------------------------------------------------

  function removeNativeSearch() {
    const existing = $(`#${APP.id}-native-search`);
    if (existing) existing.remove();
  }

  function getKnownStockAcronyms() {
    return state.analyses
      .map((stock) => String(stock.acronym || '').trim().toUpperCase())
      .filter(Boolean);
  }

  function getKnownStockRefs() {
    const refs = new Map();
    state.analyses.forEach((stock) => {
      const acronym = String(stock.acronym || '').trim().toUpperCase();
      if (acronym) refs.set(acronym, { acronym, name: stock.name || '' });
    });
    Object.entries(BENEFIT_DATABASE || {}).forEach(([acronym, benefit]) => {
      const key = String(acronym || '').trim().toUpperCase();
      if (key && !refs.has(key)) refs.set(key, { acronym: key, name: benefit.name || '' });
    });
    return Array.from(refs.values());
  }

  function normalizeStockMatchText(text) {
    return String(text || '')
      .toUpperCase()
      .replace(/&/g, ' AND ')
      .replace(/['’]/g, '')
      .replace(/[^A-Z0-9]+/g, ' ')
      .trim();
  }

  function stockRefMatchesText(stock, text) {
    const upper = String(text || '').toUpperCase();
    const acronym = String(stock?.acronym || '').trim().toUpperCase();
    if (acronym && (upper.includes(`(${acronym})`) || new RegExp(`\\b${escapeRegExp(acronym)}\\b`).test(upper))) return true;
    const name = normalizeStockMatchText(stock?.name);
    return name.length > 2 && normalizeStockMatchText(text).includes(name);
  }

  function countKnownStockRefs(text) {
    return getKnownStockRefs().filter((stock) => stockRefMatchesText(stock, text)).length;
  }

  function textHasKnownStockSignal(text) {
    const upper = String(text || '').toUpperCase();
    if (getKnownStockAcronyms().some((acronym) => upper.includes(`(${acronym})`) || new RegExp(`\\b${escapeRegExp(acronym)}\\b`).test(upper))) return true;
    return getKnownStockRefs().some((stock) => stockRefMatchesText(stock, text));
  }

  function escapeRegExp(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function findLikelyStockListHost() {
    const candidates = [
      '[class*="stock"]',
      '[class*="Stock"]',
      '[class*="stocks"]',
      '#mainContainer',
      '.content-wrapper'
    ];
    for (const selector of candidates) {
      const node = $(selector);
      if (node && node.textContent && node.textContent.length > 200) return node;
    }
    return document.body;
  }

  function getNativeStockRows() {
    const root = findLikelyStockListHost();
    const seen = new Set();
    const rows = [];
    $all('li, tr, [class*="row"], [class*="Row"], [class*="stock"], [class*="Stock"]', root)
      .filter((row) => row !== state.elements.panel && !row.closest(`#${APP.id}`))
      .filter((row) => row.textContent && row.textContent.trim().length > 3)
      .forEach((node) => {
        if (!textHasKnownStockSignal(node.textContent)) return;
        const target = node.closest('tr, li, [class*="row"], [class*="Row"]') || node;
        const text = target.textContent || '';
        if (!textHasKnownStockSignal(text)) return;
        if (text.length > 1800 || countKnownStockRefs(text) > 4) return;
        if (seen.has(target)) return;
        seen.add(target);
        rows.push(target);
      });
    return rows.length ? rows : [];
  }

  function getTornStockSearchInput() {
    const inputs = $all('input')
      .filter((input) => !input.closest(`#${APP.id}`) && !input.closest(`#${APP.id}-modal`))
      .filter((input) => input.offsetParent !== null)
      .filter((input) => {
        const text = `${input.placeholder || ''} ${input.getAttribute('aria-label') || ''} ${input.value || ''}`.toLowerCase();
        if (/find stock|stock|acronym|name/.test(text) && !/user|wiki|forum|search\.\.\./.test(text)) return true;
        const parentText = input.closest('[class*="stock"], [class*="Stock"], [class*="filter"], [class*="Filter"]')?.textContent || '';
        return /stock|name/i.test(parentText) && input.type !== 'checkbox' && input.type !== 'radio';
      });
    return inputs[0] || null;
  }

  function setInputValue(input, value) {
    const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
    if (descriptor && descriptor.set) descriptor.set.call(input, value);
    else input.value = value;
    ['input', 'change', 'keyup'].forEach((type) => {
      input.dispatchEvent(new Event(type, { bubbles: true }));
    });
  }

  function applyTornNativeStockSearch(value) {
    const input = getTornStockSearchInput();
    if (!input) return false;
    input.focus();
    setInputValue(input, value);
    return true;
  }

  function removeNativeFilterResetButton() {
    const button = document.getElementById(`${APP.id}-stock-reset`);
    if (button) button.remove();
  }

  function ensureNativeFilterResetButton() {
    removeNativeFilterResetButton();
    const input = getTornStockSearchInput();
    if (!input || !input.parentElement) return;
    const button = document.createElement('button');
    button.id = `${APP.id}-stock-reset`;
    button.className = 'fluz-stock-filter-reset';
    button.type = 'button';
    button.textContent = 'Reset filter';
    button.addEventListener('click', () => clearNativeStockFilter());
    input.insertAdjacentElement('afterend', button);
  }

  function clearNativeStockHighlights() {
    $all('.fluz-highlight-stock').forEach((row) => {
      row.classList.remove('fluz-highlight-stock');
    });
  }

  function nativeStockRowMatches(row, value) {
    const stock = getKnownStockRefs().find((item) => item.acronym === value) || { acronym: value, name: '' };
    return stockRefMatchesText(stock, row.textContent);
  }

  function highlightNativeStockRow(row) {
    if (!row) return false;
    clearNativeStockHighlights();
    row.classList.add('fluz-highlight-stock');
    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return true;
  }

  function clearNativeStockFilter({ silent = false } = {}) {
    applyTornNativeStockSearch('');
    removeNativeFilterResetButton();
    $all('.fluz-native-hidden').forEach((row) => {
      row.classList.remove('fluz-native-hidden');
    });
    $all('[data-fluz-native-filtered="1"]').forEach((row) => {
      row.removeAttribute('data-fluz-native-filtered');
    });
    clearNativeStockHighlights();
    state.nativeFilter = '';
    if (!silent) {
      showFlash('Torn stock filter cleared.');
      renderPanel();
    }
  }

  function filterNativeStockRows(query) {
    const value = String(query || '').trim().toUpperCase();
    clearNativeStockFilter({ silent: true });
    if (!value) return [];

    const usedNativeSearch = applyTornNativeStockSearch(value.toLowerCase());

    const rows = getNativeStockRows();
    const matches = [];
    rows.forEach((row) => {
      const isMatch = nativeStockRowMatches(row, value);
      row.dataset.fluzNativeFiltered = '1';
      if (isMatch) {
        matches.push(row);
        row.classList.remove('fluz-native-hidden');
      }
      else row.classList.add('fluz-native-hidden');
    });
    state.nativeFilter = value;
    if (usedNativeSearch) {
      ensureNativeFilterResetButton();
      setTimeout(() => {
        const refreshedRows = getNativeStockRows();
        const refreshedMatch = refreshedRows.find((row) => nativeStockRowMatches(row, value));
        if (refreshedMatch) highlightNativeStockRow(refreshedMatch);
      }, 120);
    }
    return matches;
  }

  function findStockOnPage(acronym) {
    const value = String(acronym || '').trim().toUpperCase();
    if (!value) return;

    if (state.settings.stockHighlightOnlyMode) {
      clearNativeStockFilter({ silent: true });
      const row = getNativeStockRows().find((candidate) => nativeStockRowMatches(candidate, value));
      if (highlightNativeStockRow(row)) {
        showFlash(`Highlighted ${value}.`);
        renderPanel();
      } else {
        renderPanel();
        showFlash(`Could not find ${value} in Torn's current page HTML.`);
      }
      return;
    }

    const matches = filterNativeStockRows(value);
    const row = matches[0] || getNativeStockRows().find((candidate) => nativeStockRowMatches(candidate, value));
    if (highlightNativeStockRow(row)) {
      showFlash(`Filtered Torn list to ${value}.`);
      renderPanel();
    } else {
      clearNativeStockFilter({ silent: true });
      renderPanel();
      showFlash(`Could not find ${value} in Torn's current page HTML.`);
    }
  }

  // ---------------------------------------------------------------------------
  // Calculator helper
  // ---------------------------------------------------------------------------

  function openCalculator(stockId) {
    const stock = state.analyses.find((item) => String(item.id) === String(stockId));
    if (!stock) return;
    closeModal();
    const overlay = document.createElement('div');
    overlay.id = `${APP.id}-modal`;
    overlay.dataset.stockId = stock.id;
    overlay.innerHTML = `
      <div class="fluz-modal-box">
        <div class="fluz-section-title">
          <span>${escapeHtml(stock.acronym)} calculator</span>
          <button class="fluz-button" data-action="close-modal">Close</button>
        </div>
        <p class="fluz-muted">${escapeHtml(stock.name)} - ${formatFullMoney(stock.price)} per share</p>
        <div class="fluz-form-grid">
          <label>Money amount
            <input type="text" data-calc-input="money" placeholder="1000000">
          </label>
          <label>Shares
            <input type="text" data-calc-input="shares" placeholder="1000">
          </label>
        </div>
        <div class="fluz-card" data-calc-output>
          Enter money or shares to calculate.
        </div>
        <div class="fluz-muted">
          ${escapeHtml(calculatorBenefitHint(stock))}
        </div>
      </div>
    `;
    mountModalOverlay(overlay);
  }

  function closeModal() {
    const existing = $(`#${APP.id}-modal`);
    if (existing) existing.remove();
  }

  function updateCalculator(source) {
    const modal = $(`#${APP.id}-modal`);
    if (!modal) return;
    const stock = state.analyses.find((item) => String(item.id) === String(modal.dataset.stockId));
    if (!stock) return;

    const moneyInput = $('[data-calc-input="money"]', modal);
    const sharesInput = $('[data-calc-input="shares"]', modal);
    const output = $('[data-calc-output]', modal);
    const price = stock.price || 0;

    if (source === 'money') {
      const money = parseNumber(moneyInput.value);
      const shares = price > 0 ? Math.floor(money / price) : 0;
      sharesInput.value = shares ? shares.toLocaleString() : '';
    } else {
      const shares = parseNumber(sharesInput.value);
      const cost = shares * price;
      moneyInput.value = cost ? Math.round(cost).toLocaleString() : '';
    }

    const shares = parseNumber(sharesInput.value);
    const value = shares * price;
    const missing = stock.benefit && stock.benefit.requirement
      ? Math.max(0, stock.benefit.requirement - ((stock.position ? stock.position.totalShares : 0) + shares))
      : 0;
    output.innerHTML = `
      <div>Shares: <strong>${compactNumber(shares)}</strong></div>
      <div>Approx value/cost: <strong>${formatFullMoney(value)}</strong></div>
      ${stock.benefit && stock.benefit.requirement ? `<div>Missing after this: <strong>${compactNumber(missing)}</strong> shares for next block</div>` : ''}
    `;
  }

  function calculatorBenefitHint(stock) {
    if (!stock.benefit || !stock.benefit.requirement) return 'No benefit block requirement is available for this stock.';
    const owned = stock.position ? stock.position.totalShares : 0;
    const missing = Math.max(0, stock.benefit.requirement - owned);
    return `Benefit requirement: ${compactNumber(stock.benefit.requirement)} shares. You own ${compactNumber(owned)}. Missing ${compactNumber(missing)} shares, about ${formatMoney(missing * stock.price)}.`;
  }

  // ---------------------------------------------------------------------------
  // Initialization
  // ---------------------------------------------------------------------------

  const state = {
    mode: '',
    apiKey: '',
    settings: mergeSettings(DEFAULT_SETTINGS, {}),
    panel: { ...DEFAULT_PANEL_STATE },
    gym: mergeGymState({}),
    utility: mergeUtilityState({}),
    gymRaw: null,
    gymData: null,
    utilityData: { user: {}, items: {}, warnings: [] },
    loading: false,
    error: '',
    raw: null,
    tornsy: {},
    priceMemory: {},
    data: null,
    analyses: [],
    recommendations: [],
    cacheInfo: {},
    notificationHistory: {},
    inPageAlerts: [],
    drag: null,
    resize: null,
    nativeFilter: '',
    tornApiBackoffUntil: 0,
    lastNativeFillInput: null,
    locationWatchStarted: false,
    utilityDomWatchStarted: false,
    itemMarketBazaarDomWatchStarted: false,
    extensionMessageBound: false,
    itemMarketBazaarTimer: null,
    crimesDataWatchStarted: false,
    bootleggingDomWatchStarted: false,
    crimeProfitDomWatchStarted: false,
    pickpocketDomWatchStarted: false,
    pickpocketScheduleTimer: null,
    crimeProfitLoading: false,
    utilityScanSignature: '',
    bootleggingData: null,
    crimeMorale: null,
    crimeMoraleLoading: false,
    crimeMoraleStatus: '',
    crimeMoraleRequestKey: '',
    crimeMoraleRequestAt: 0,
    pickpocketStats: { colored: 0, visible: 0, hidden: 0, skillLevel: 1, updatedAt: 0 },
    itemMarketBazaarLoading: false,
    itemMarketBazaarData: { itemId: '', listings: [], fetchedAt: 0, warning: '' },
    itemMarketBazaarTitle: '',
    itemMarketBazaarTitleItemId: '',
    marketBazaarAllLoading: false,
    marketBazaarAllRows: [],
    marketBazaarAllScan: { index: 0, total: 0 },
    marketBazaarAllAutoTimer: null,
    marketBazaarAllAutoKickAt: 0,
    marketBazaarAllLastRenderAt: 0,
    marketBazaarAllLastCacheWriteAt: 0,
    marketBazaarSourceCooldownUntil: 0,
    marketBazaarSourceErrorStreak: 0,
    marketNativeRows: [],
    marketNativeRowsUpdatedAt: 0,
    marketFilledPriceButtons: {},
    travelYataLoading: false,
    travelYataData: { stocks: [], fetchedAt: 0, warning: '' },
    crimeProfitData: { rows: [], crackingRows: [], fetchedAt: 0, warning: '' },
    crimeProfitVisible: { count: 0, bestLabel: '', bestValue: null },
    crackingDomWatchStarted: false,
    crackingScanTimer: null,
    crackingLoading: false,
    crackingStatus: '',
    crackingStats: {},
    targetTimerWatchStarted: false,
    targetStatusLoading: false,
    targetStatusLastRefresh: 0,
    casinoGameWatchTimer: null,
    chainWatchStarted: false,
    chainWatchTimer: null,
    chainStatus: null,
    chainAlertState: { count: 0, message: false, target: false, warning: false },
    chainFriendlyNameLoading: false,
    chainLastCount: 0,
    ffscouterLoading: false,
    ffscouterStatus: '',
    elements: {
      panel: null
    }
  };
  async function refreshData(force = false) {
    state.loading = true;
    state.error = '';
    renderPanel();

    try {
      const raw = await fetchTornData(force);
      const marketStocks = normalizeMarketStocks(raw.market && raw.market.stocks);
      const tornsy = await fetchTornsyData(marketStocks, force);
      state.raw = raw;
      state.tornsy = tornsy;
      state.data = normalizeAll(raw, tornsy);
      state.analyses = state.data.analyses;
      state.recommendations = buildRecommendations(state.analyses, state.data);
      state.error = state.data.warnings.length ? `Loaded with warning: ${state.data.warnings.join(' | ')}` : '';
      renderPanel();
      await runNotificationScan();
    } catch (error) {
      state.error = friendlyError(error);
      renderPanel();
    } finally {
      state.loading = false;
      renderPanel();
    }
  }

  async function refreshAnalysisOnly() {
    if (!state.raw) {
      renderPanel();
      return;
    }
    const tornsy = state.settings.enableTornsy ? state.tornsy : {};
    state.data = normalizeAll(state.raw, tornsy);
    state.analyses = state.data.analyses;
    state.recommendations = buildRecommendations(state.analyses, state.data);
    renderPanel();
  }

  async function refreshGymData(force = false) {
    state.loading = true;
    state.error = '';
    renderPanel();

    try {
      const raw = await fetchGymData(force);
      state.gymRaw = raw;
      state.gymData = normalizeGymData(raw);
      state.error = state.gymData.warnings.length ? `Loaded with warning: ${state.gymData.warnings.join(' | ')}` : '';
    } catch (error) {
      state.error = friendlyError(error);
    } finally {
      state.loading = false;
      renderPanel();
    }
  }

  async function refreshGymAnalysisOnly() {
    const scrollTop = getPanelContentScrollTop();
    if (!state.gymData) {
      renderPanel();
      restorePanelContentScrollTop(scrollTop);
      return;
    }
    state.gymData = normalizeGymData(state.gymRaw || { user: {}, items: {}, warnings: state.gymData.warnings || [] });
    renderPanel();
    restorePanelContentScrollTop(scrollTop);
  }

  async function refreshUtilityData(force = false) {
    try {
      state.utilityData = await fetchUtilityData(force);
    } catch (error) {
      state.utilityData = {
        user: {},
        items: {},
        warnings: [friendlyError(error)]
      };
    }
    renderPanel();
    if (utilityAutoRefreshEnabled()) state.utilityScanSignature = currentUtilityScanSignature();
  }

  function friendlyError(error) {
    const message = error && error.message ? error.message : String(error);
    if (/non-json|parse json|<!doctype|unexpected token/i.test(message)) return 'Source returned a temporary web/error page instead of data. Using cached rows if available.';
    if (/api.*2|incorrect|invalid/i.test(message)) return `${message}. Check that your API key is correct and has Limited Access.`;
    if (/rate/i.test(message)) return `${message}. Torn may be rate limiting requests; wait a minute and refresh.`;
    return message;
  }

  function showFlash(message) {
    const old = $(`#${APP.id}-flash`);
    if (old) old.remove();
    const flash = document.createElement('div');
    flash.id = `${APP.id}-flash`;
    flash.textContent = message;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 3600);
  }

  function isPanelInputFocused() {
    const active = document.activeElement;
    return !!(active && active.closest && active.closest(`#${APP.id} input, #${APP.id} textarea, #${APP.id} select, #${APP.id}-modal input, #${APP.id}-modal textarea, #${APP.id}-modal select`));
  }

  function watchPageLocation() {
    if (state.locationWatchStarted) return;
    state.locationWatchStarted = true;
    let lastHref = window.location.href;
    setInterval(() => {
      if (window.location.href === lastHref) return;
      lastHref = window.location.href;
      const mode = detectToolMode();
      if (!mode) {
        removeAppUi();
        return;
      }
      state.mode = mode;
      ensurePanel();
      removeNativeSearch();
      if (mode === 'stocks' && state.apiKey) refreshData(false);
      if (mode === 'gym') refreshGymData(false);
      if (mode === 'utility') {
        refreshUtilityData(false);
        const module = getUtilityModule();
        if (module.key === 'itemmarket') {
          scheduleItemMarketBazaarPanel(isItemMarketBrowseItemPage());
        } else {
          renderNativeItemMarketBazaarPanel();
        }
        if (module.key === 'travel') loadTravelYataData(false);
        if (module.key === 'crimes') {
          loadCrimeProfitabilityData(false);
          scheduleCrimeProfitabilityLabels();
          if (isBootleggingCrimePage()) scheduleBootleggingButtonLabels();
          if (isPickpocketCrimePage()) schedulePickpocketFormatting();
          else clearPickpocketFormatting();
          if (isCrackingCrimePage()) scheduleCrackingScan();
          scheduleCrimeMoraleRefresh();
        }
        setTimeout(() => refreshTargetStatuses(true), 500);
      }
    }, 1000);
  }

  function utilityAutoRefreshEnabled() {
    if (state.mode !== 'utility') return false;
    const module = getUtilityModule();
    return module && (module.key === 'bazaar' || (module.key === 'itemmarket' && isItemMarketListingToolPage()));
  }

  function currentUtilityScanSignature() {
    if (!utilityAutoRefreshEnabled()) return '';
    const rows = scanVisibleMarketItemRows();
    if (rows.length) {
      return rows.map((row) => `${row.name}|${row.quantity}|${Math.round(row.price)}`).join('::');
    }
    return scanVisibleMoneyValues().slice(0, 8).map((value) => Math.round(value)).join('::');
  }

  function inventoryScanSignature() {
    return scanVisibleInventoryStacks()
      .slice(0, 60)
      .map((item) => `${item.name}|${item.quantity}|${Math.round(item.value)}`)
      .join('::');
  }

  function scheduleInventoryPanelScan() {
    clearTimeout(state.inventoryScanTimer);
    state.inventoryScanTimer = setTimeout(() => {
      if (state.mode !== 'utility' || getUtilityModule().key !== 'items') return;
      const nextSignature = inventoryScanSignature();
      if (!nextSignature || nextSignature === state.inventoryScanSignature) return;
      state.inventoryScanSignature = nextSignature;
      if (!isPanelInputFocused()) renderPanelKeepingScroll();
    }, 180);
  }

  function watchUtilityDomChanges() {
    if (state.utilityDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.utilityDomWatchStarted = true;
    let refreshTimer = null;
    let highlightTimer = null;
    const observer = new MutationObserver((mutations) => {
      const module = state.mode === 'utility' ? getUtilityModule() : null;
      const itemMarketBrowse = module && module.key === 'itemmarket' && isItemMarketPage() && !isItemMarketListingToolPage();
      const inventoryPage = module && module.key === 'items';
      if (!utilityAutoRefreshEnabled() && !itemMarketBrowse && !inventoryPage) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`);
      });
      if (!relevant) return;
      if (itemMarketBrowse) {
        clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => applyItemMarketValueHighlights(), 180);
        if (!utilityAutoRefreshEnabled()) return;
      }
      if (inventoryPage) {
        scheduleInventoryPanelScan();
        return;
      }
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => {
        const nextSignature = currentUtilityScanSignature();
        if (!nextSignature || nextSignature === state.utilityScanSignature) return;
        state.utilityScanSignature = nextSignature;
        const scrollTop = getPanelContentScrollTop();
        renderPanel();
        restorePanelContentScrollTop(scrollTop);
      }, 350);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function itemMarketIdFromButton(button) {
    const controls = button ? String(button.getAttribute('aria-controls') || '') : '';
    const parts = controls.split('-').filter(Boolean);
    return parts.length ? parts[parts.length - 1] : '';
  }

  function itemMarketNameFromTile(tile) {
    if (!tile) return '';
    const nameEl = $(tornCssModuleSelector('name'), tile)
      || $('[class^="name___"]', tile)
      || $('[class*=" name___"]', tile);
    const text = nameEl ? String(nameEl.textContent || '').trim() : '';
    return text.replace(/\s+/g, ' ');
  }

  function applyItemMarketValueHighlights() {
    if (!isItemMarketPage()) return 0;
    const highlighted = [];
    document.querySelectorAll('.fluz-market-highlight').forEach((node) => node.classList.remove('fluz-market-highlight'));
    if (!state.utility.marketHighlightEnabled) return 0;
    const thresholdRaw = state.utility.marketHighlightThresholdPct;
    if (thresholdRaw == null || thresholdRaw === '') return 0;
    const thresholdPct = parseNumber(thresholdRaw);
    const known = getKnownItemRecords().sort((a, b) => b.name.length - a.name.length);
    const candidates = Array.from(document.querySelectorAll('button[aria-controls^="wai-itemInfo-"]'))
      .map((node) => closestItemMarketTile(node))
      .filter(Boolean);
    const seen = new Set();
    candidates.forEach((tile) => {
      if (!tile || tile.closest(`#${APP.id}, #${APP.id}-modal`) || seen.has(tile)) return;
      seen.add(tile);
      const text = cleanBookieText(tile.innerText || tile.textContent || '');
      if (!text || !/\$[\d,.]+[kmbt]?/i.test(text)) return;
      const item = findKnownItemInText(text, known);
      if (!item) return;
      const price = extractFirstMoneyFromText(text);
      if (!price) return;
      const maxPrice = item.value * (1 + thresholdPct / 100);
      if (price <= maxPrice) {
        tile.classList.add('fluz-market-highlight');
        highlighted.push(tile);
      }
    });
    if (isItemMarketBrowseItemPage()) {
      scanVisibleTornMarketListingRows({ includeNode: true, minQty: 1 }).forEach((row) => {
        if (!row || !row.node || seen.has(row.node)) return;
        const price = parseNumber(row.price);
        const value = parseNumber(row.marketValue);
        if (price <= 0 || value <= 0) return;
        const maxPrice = value * (1 + thresholdPct / 100);
        if (price <= maxPrice) {
          row.node.classList.add('fluz-market-highlight');
          highlighted.push(row.node);
          seen.add(row.node);
        }
      });
    }
    return highlighted.length;
  }

  function closestItemMarketTile(node) {
    if (!node || !node.closest) return null;
    if (node.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`)) return null;
    for (let current = node.parentElement || node; current && current !== document.body; current = current.parentElement) {
      if (current.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`)) return null;
      const rect = current.getBoundingClientRect ? current.getBoundingClientRect() : { width: 0, height: 0 };
      const text = cleanBookieText(current.innerText || current.textContent || '');
      const compactTile = rect.width >= 70 && rect.width <= 230 && rect.height >= 70 && rect.height <= 230;
      if (compactTile && /\$[\d,.]+[kmbt]?/i.test(text)) return current;
      if (rect.width > 280 || rect.height > 280) break;
    }
    return null;
  }

  function findItemMarketBazaarPlacement(preferCurrent = true) {
    const currentId = currentItemMarketItemId();
    const wrappers = $all(tornCssModuleSelector('sellerListWrapper'))
      .filter((wrapper) => !wrapper.closest(`#${APP.id}, #${APP.id}-modal`));
    const placements = wrappers.map((wrapper) => {
      const tile = wrapper.previousElementSibling;
      const button = tile ? $('button[aria-controls^="wai-itemInfo-"]', tile) : null;
      const itemId = itemMarketIdFromButton(button) || currentId;
      const itemName = itemMarketNameFromTile(tile);
      return { target: wrapper, mode: 'inside', itemId, itemName };
    }).filter((item) => item.target && item.itemId);
    const exact = preferCurrent && currentId ? placements.find((item) => item.itemId === currentId) : null;
    if (exact) return exact;
    if (placements.length) return placements[0];

    const sellerList = $(tornUlCssModuleSelector('sellerList'));
    if (sellerList && sellerList.parentElement) {
      const header = $(tornCssModuleSelector('itemsHeader'));
      const button = header ? $('button[aria-controls^="wai-itemInfo-"]', header) : null;
      const title = header ? String(($(tornCssModuleSelector('title'), header) || header).textContent || '').trim().replace(/\s+/g, ' ') : '';
      return {
        target: sellerList,
        mode: 'before',
        itemId: itemMarketIdFromButton(button) || currentId,
        itemName: title && !/item market|most popular/i.test(title) ? title : ''
      };
    }
    return null;
  }

  function getNativeMarketBazaarScrollTop(panel) {
    const list = panel ? $('.fluz-market-bazaar-compact-list', panel) : null;
    return list ? list.scrollTop : 0;
  }

  function restoreNativeMarketBazaarScrollTop(panel, scrollTop) {
    requestAnimationFrame(() => {
      const list = panel ? $('.fluz-market-bazaar-compact-list', panel) : null;
      if (list) list.scrollTop = scrollTop || 0;
    });
  }

  function renderNativeItemMarketBazaarPanel() {
    const existing = $('#fluz-itemmarket-bazaar-native');
    if (!isItemMarketBrowseItemPage()) {
      if (existing) existing.remove();
      return false;
    }
    const placement = findItemMarketBazaarPlacement(true);
    if (!placement || !placement.target) return false;
    if (placement.itemName) {
      state.itemMarketBazaarTitle = placement.itemName;
      state.itemMarketBazaarTitleItemId = placement.itemId || currentItemMarketItemId();
    }
    const panel = existing || document.createElement('div');
    const scrollTop = getNativeMarketBazaarScrollTop(existing);
    panel.id = 'fluz-itemmarket-bazaar-native';
    panel.innerHTML = renderItemMarketBazaarHtml({ native: true });
    if (placement.mode === 'inside') {
      if (panel.parentElement !== placement.target || panel !== placement.target.firstElementChild) {
        placement.target.insertBefore(panel, placement.target.firstChild);
      }
    } else if (placement.target.parentElement && (panel.parentElement !== placement.target.parentElement || panel.nextSibling !== placement.target)) {
      placement.target.parentElement.insertBefore(panel, placement.target);
    }
    bindNativeItemMarketBazaarPanel(panel);
    restoreNativeMarketBazaarScrollTop(panel, scrollTop);
    return true;
  }

  function bindNativeItemMarketBazaarPanel(panel) {
    if (!panel || panel.dataset.bound === '1') return;
    panel.dataset.bound = '1';
    panel.addEventListener('click', async (event) => {
      const button = event.target.closest('[data-action]');
      if (!button) return;
      const action = button.dataset.action;
      if (action === 'refresh-market-bazaar') {
        event.preventDefault();
        await loadItemMarketBazaarListings(true);
      }
      if (action === 'sort-market-bazaar') {
        event.preventDefault();
        await sortItemMarketBazaarListings(button.dataset.sortKey);
      }
      if (action === 'open-bazaar-link') {
        event.preventDefault();
        await openBazaarLink(button.dataset.bazaarUrl, button.dataset.bazaarVisitKey, button.dataset.bazaarSellerKey);
      }
    });
    panel.addEventListener('change', async (event) => {
      const minInput = event.target.closest('[data-native-market-bazaar-min]');
      const ageInput = event.target.closest('[data-native-market-bazaar-age]');
      if (!minInput && !ageInput) return;
      if (minInput) state.utility.marketBazaarMinQty = Math.max(1, parseNumber(minInput.value || 1));
      if (ageInput) state.utility.marketBazaarMaxAgeMinutes = Math.max(0, parseNumber(ageInput.value || 0));
      await saveUtilityState();
      renderPanelPreservingScroll();
      renderNativeItemMarketBazaarPanel();
    });
  }

  function scheduleItemMarketBazaarPanel(load = false) {
    clearTimeout(state.itemMarketBazaarTimer);
    state.itemMarketBazaarTimer = setTimeout(() => {
      if (!isItemMarketBrowseItemPage()) {
        renderNativeItemMarketBazaarPanel();
        return;
      }
      renderNativeItemMarketBazaarPanel();
      if (load) loadItemMarketBazaarListings(false);
      for (const delay of [250, 750, 1500, 3000]) {
        setTimeout(() => {
          if (isItemMarketBrowseItemPage()) renderNativeItemMarketBazaarPanel();
        }, delay);
      }
    }, 120);
  }

  function watchItemMarketBazaarDomChanges() {
    if (state.itemMarketBazaarDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.itemMarketBazaarDomWatchStarted = true;
    let timer = null;
    const observer = new MutationObserver((mutations) => {
      if (!isItemMarketBrowseItemPage()) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal, .fluz-market-bazaar-native`);
      });
      if (!relevant) return;
      clearTimeout(timer);
      timer = setTimeout(() => renderNativeItemMarketBazaarPanel(), 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function requestUrlFromInput(input) {
    if (typeof input === 'string') return input;
    if (input && typeof input.url === 'string') return input.url;
    return '';
  }

  function isCrimesDataRequest(input, init = {}) {
    const rawUrl = requestUrlFromInput(input);
    try {
      const url = new URL(rawUrl, window.location.origin);
      if (String(url.searchParams.get('sid') || '').toLowerCase() === 'crimesdata') return true;
    } catch (error) {
      if (/sid=crimesData/i.test(String(rawUrl || ''))) return true;
    }
    const body = init && init.body;
    if (!body) return false;
    if (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) return String(body.get('sid') || '').toLowerCase() === 'crimesdata';
    if (typeof FormData !== 'undefined' && body instanceof FormData) return String(body.get('sid') || '').toLowerCase() === 'crimesdata';
    return /sid=crimesData/i.test(String(body || ''));
  }

  function parseCrimesDataResponse(xhr) {
    if (xhr && xhr.response && typeof xhr.response === 'object') return xhr.response;
    const text = String((xhr && xhr.responseText) || '').trim();
    if (!text) return null;
    const jsonStart = text.indexOf('{');
    if (jsonStart < 0) return null;
    return JSON.parse(text.slice(jsonStart));
  }

  function currentCrimeSlug() {
    const hash = String(currentUrl().hash || '').replace(/^#\/?/, '').replace(/\/.*$/, '');
    return hash.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  function currentCrimeTypeId() {
    const slug = currentCrimeSlug();
    return CRIME_TYPE_IDS[slug] || '';
  }

  function isCrackingCrimePage() {
    return currentCrimeSlug() === 'cracking' || /#\/cracking/i.test(String(currentUrl().hash || ''));
  }

  function normalizeCrackingWord(value) {
    const word = String(value || '').trim().toUpperCase();
    if (word.length < CRACKING_HELPER.minLength || word.length > CRACKING_HELPER.maxLength) return '';
    return /^[A-Z0-9_.]+$/.test(word) ? word : '';
  }

  function openCrackingDb() {
    return new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB is not available.'));
        return;
      }
      const request = indexedDB.open(CRACKING_HELPER.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(CRACKING_HELPER.storeName)) db.createObjectStore(CRACKING_HELPER.storeName);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Could not open cracking cache.'));
    });
  }

  async function crackingDbGet(key) {
    const db = await openCrackingDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CRACKING_HELPER.storeName, 'readonly');
      const request = tx.objectStore(CRACKING_HELPER.storeName).get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  }

  async function crackingDbSet(key, value) {
    const db = await openCrackingDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CRACKING_HELPER.storeName, 'readwrite');
      tx.objectStore(CRACKING_HELPER.storeName).put(value, key);
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  async function crackingDbClear() {
    const db = await openCrackingDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(CRACKING_HELPER.storeName, 'readwrite');
      tx.objectStore(CRACKING_HELPER.storeName).clear();
      tx.oncomplete = () => { db.close(); resolve(true); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  function seedCrackingWordsForLength(length) {
    return CRACKING_HELPER.seedWords
      .map(normalizeCrackingWord)
      .filter((word) => word.length === length);
  }

  async function getCrackingWordsForLength(length) {
    const len = Math.floor(parseNumber(length));
    if (len < CRACKING_HELPER.minLength || len > CRACKING_HELPER.maxLength) return [];
    if (Array.isArray(crackingDictCache[len])) return crackingDictCache[len];
    let words = [];
    try {
      words = await crackingDbGet(`len_${len}`) || [];
    } catch (error) {
      words = [];
    }
    if (!Array.isArray(words) || !words.length) words = seedCrackingWordsForLength(len);
    crackingDictCache[len] = words;
    return words;
  }

  async function addCrackingWordToLocalCache(value) {
    const word = normalizeCrackingWord(value);
    if (!word) return false;
    const len = word.length;
    const words = await getCrackingWordsForLength(len);
    if (words.includes(word)) return false;
    const next = [...words, word].sort();
    crackingDictCache[len] = next;
    await crackingDbSet(`len_${len}`, next);
    state.crackingStats = { ...(state.crackingStats || {}), [len]: next.length };
    return true;
  }

  async function refreshCrackingStats() {
    const stats = {};
    for (let len = CRACKING_HELPER.minLength; len <= CRACKING_HELPER.maxLength; len += 1) {
      const words = await getCrackingWordsForLength(len);
      stats[len] = words.length;
    }
    state.crackingStats = stats;
    return stats;
  }

  async function loadCrackingPublicWordlist() {
    if (state.crackingLoading) return;
    state.crackingLoading = true;
    state.crackingStatus = 'downloading';
    renderPanelKeepingScroll();
    try {
      const text = await httpGetText(CRACKING_HELPER.publicWordlistUrl);
      const buckets = {};
      String(text || '').split(/\r?\n/).forEach((line) => {
        const word = normalizeCrackingWord(line);
        if (!word) return;
        if (!buckets[word.length]) buckets[word.length] = new Set();
        buckets[word.length].add(word);
      });
      for (const [len, set] of Object.entries(buckets)) {
        const length = Math.floor(parseNumber(len));
        const existing = await getCrackingWordsForLength(length);
        const merged = Array.from(new Set([...existing, ...set])).sort();
        crackingDictCache[length] = merged;
        await crackingDbSet(`len_${length}`, merged);
      }
      await refreshCrackingStats();
      state.crackingStatus = 'ready';
      showFlash('Cracking wordlist loaded locally.');
      scheduleCrackingScan();
    } catch (error) {
      state.crackingStatus = 'load failed';
      showFlash(`Cracking wordlist failed: ${friendlyError(error)}`);
    } finally {
      state.crackingLoading = false;
      renderPanelKeepingScroll();
    }
  }

  async function clearCrackingWordlist() {
    try {
      await crackingDbClear();
      Object.keys(crackingDictCache).forEach((key) => { delete crackingDictCache[key]; });
      state.crackingStats = {};
      state.crackingStatus = 'cleared';
      showFlash('Cracking local wordlist cleared.');
      removeCrackingPanels();
      renderPanelKeepingScroll();
    } catch (error) {
      showFlash(`Could not clear cracking cache: ${friendlyError(error)}`);
    }
  }

  function crackingExclusionKey(rowKey, length) {
    return `fluz.cracking.excl.${rowKey}.${length}`;
  }

  function loadCrackingExclusions(rowKey, length) {
    let parsed = [];
    try {
      parsed = JSON.parse(sessionStorage.getItem(crackingExclusionKey(rowKey, length)) || '[]');
    } catch (error) {
      parsed = [];
    }
    return Array.from({ length }, (_, index) => new Set(Array.isArray(parsed[index]) ? parsed[index] : []));
  }

  function saveCrackingExclusions(rowKey, length, sets) {
    const payload = Array.from({ length }, (_, index) => Array.from(sets[index] || []));
    sessionStorage.setItem(crackingExclusionKey(rowKey, length), JSON.stringify(payload));
  }

  function addCrackingExclusion(rowKey, position, letter, length) {
    const clean = String(letter || '').trim().toUpperCase();
    if (!/^[A-Z0-9_.]$/.test(clean)) return;
    const sets = loadCrackingExclusions(rowKey, length);
    if (!sets[position]) sets[position] = new Set();
    const before = sets[position].size;
    sets[position].add(clean);
    if (sets[position].size !== before) saveCrackingExclusions(rowKey, length, sets);
  }

  async function suggestCrackingWords(pattern, rowKey) {
    const pat = String(pattern || '').toUpperCase();
    const len = pat.length;
    if (len < CRACKING_HELPER.minLength || len > CRACKING_HELPER.maxLength) return [];
    const words = await getCrackingWordsForLength(len);
    const regex = new RegExp(`^${pat.replace(/[*]/g, '.')}$`);
    const exclusions = loadCrackingExclusions(rowKey, len);
    const max = clamp(Math.floor(parseNumber(state.utility.crackingMaxSuggestions || 8)), 1, 20);
    const out = [];
    for (const word of words) {
      if (!regex.test(word)) continue;
      if (Array.from(word).some((char, index) => exclusions[index] && exclusions[index].has(char))) continue;
      out.push(word);
      if (out.length >= max) break;
    }
    return out;
  }

  function getCrackingRowKey(row) {
    if (!row.dataset.fluzCrackingKey) row.dataset.fluzCrackingKey = `crack-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    return row.dataset.fluzCrackingKey;
  }

  function scheduleCrackingPanelUpdate(panel) {
    if (!panel) return;
    const key = panel.dataset.rowkey || '';
    if (crackingPanelTimers.has(key)) clearTimeout(crackingPanelTimers.get(key));
    crackingPanelTimers.set(key, setTimeout(() => {
      if (panel.updateSuggestions) panel.updateSuggestions();
      crackingPanelTimers.delete(key);
    }, 80));
  }

  function renderCrackingPanel(row, pattern, rowKey) {
    let panel = row.querySelector('.fluz-cracking-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.className = 'fluz-cracking-panel';
      panel.dataset.rowkey = rowKey;
      panel.addEventListener('click', async (event) => {
        const button = event.target.closest('[data-cracking-copy]');
        if (!button) return;
        event.preventDefault();
        await copyUtilityText(button.dataset.crackingCopy || '');
      });
      panel.updateSuggestions = async () => {
        const currentPattern = panel.dataset.pattern || '';
        const suggestions = await suggestCrackingWords(currentPattern, panel.dataset.rowkey || rowKey);
        if (!suggestions.length) {
          panel.innerHTML = `<span class="is-muted">${escapeHtml(state.crackingLoading ? 'loading...' : 'no matches')}</span>`;
          return;
        }
        panel.innerHTML = suggestions.map((word) => `<button type="button" data-cracking-copy="${escapeHtml(word)}" title="Copy ${escapeHtml(word)}">${escapeHtml(word)}</button>`).join('');
      };
      row.prepend(panel);
    }
    panel.dataset.pattern = pattern;
    scheduleCrackingPanelUpdate(panel);
  }

  function removeCrackingPanels() {
    document.querySelectorAll('.fluz-cracking-panel').forEach((node) => node.remove());
    crackingPanelTimers.forEach((timer) => clearTimeout(timer));
    crackingPanelTimers.clear();
  }

  function attachCrackingSlotSensors(row, rowKey) {
    if (row.dataset.fluzCrackingDelegated === '1') return;
    row.dataset.fluzCrackingDelegated = '1';
    const slotSelector = '[class^="charSlot"]:not([class*="charSlotDummy"])';
    const onCue = (event) => {
      const slot = event.target && event.target.closest ? event.target.closest(slotSelector) : null;
      if (!slot || !row.contains(slot)) return;
      const slots = Array.from(row.querySelectorAll(slotSelector));
      const index = slots.indexOf(slot);
      if (index < 0) return;
      const shown = String(slot.textContent || '').trim();
      if (shown && /^[A-Za-z0-9._]$/.test(shown)) return;
      const previous = crackingPrevRowStates.get(rowKey) || {};
      const now = performance.now();
      const recentRow = previous.lastInput && previous.lastInput.i === index && now - previous.lastInput.time <= 1800;
      const letter = recentRow ? previous.lastInput.letter : (now - crackingLastInput.time <= 1800 ? crackingLastInput.key : '');
      if (!letter) return;
      addCrackingExclusion(rowKey, index, letter, slots.length);
      const panel = row.querySelector('.fluz-cracking-panel');
      scheduleCrackingPanelUpdate(panel);
    };
    row.addEventListener('animationstart', onCue, true);
    row.addEventListener('transitionend', onCue, true);
  }

  function scanCrackingCrimePage() {
    if (!isCrackingCrimePage()) {
      removeCrackingPanels();
      return false;
    }
    const currentCrime = $('[class^="currentCrime"]');
    const container = currentCrime ? $('[class^="virtualList"]', currentCrime) : null;
    if (!container) return false;
    const rows = $all('[class^="crimeOptionWrapper"]', container);
    if (!rows.length) return false;
    rows.forEach((row) => {
      const rowKey = getCrackingRowKey(row);
      attachCrackingSlotSensors(row, rowKey);
      const slots = $all('[class^="charSlot"]:not([class*="charSlotDummy"])', row);
      const chars = slots.map((slot) => {
        const ch = String(slot.textContent || '').trim().toUpperCase();
        return /^[A-Z0-9_.]$/.test(ch) ? ch : '*';
      });
      if (!chars.length) return;
      const now = performance.now();
      const previous = crackingPrevRowStates.get(rowKey) || { chars: Array(chars.length).fill('*') };
      chars.forEach((char, index) => {
        const was = previous.chars && previous.chars[index] ? previous.chars[index] : '*';
        if (was === '*' && char !== '*') previous.lastInput = { i: index, letter: char, time: now };
        if (was !== '*' && char === '*' && previous.lastInput && previous.lastInput.i === index && previous.lastInput.letter === was && now - previous.lastInput.time <= 1800) {
          addCrackingExclusion(rowKey, index, was, chars.length);
        }
      });
      crackingPrevRowStates.set(rowKey, { chars, lastInput: previous.lastInput, time: now });
      const pattern = chars.join('');
      const complete = pattern && !pattern.includes('*');
      if (complete) addCrackingWordToLocalCache(pattern).catch(() => {});
      if (pattern && !/^[*]+$/.test(pattern) && (!complete || state.utility.crackingShowComplete)) renderCrackingPanel(row, pattern, rowKey);
      else {
        const existing = row.querySelector('.fluz-cracking-panel');
        if (existing) existing.remove();
      }
    });
    state.crackingStatus = state.crackingStatus || 'active';
    return true;
  }

  function scheduleCrackingScan() {
    clearTimeout(state.crackingScanTimer);
    state.crackingScanTimer = setTimeout(() => scanCrackingCrimePage(), 180);
  }

  function watchCrackingDomChanges() {
    if (state.crackingDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.crackingDomWatchStarted = true;
    window.addEventListener('keydown', (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (/^[A-Za-z0-9._]$/.test(event.key || '')) {
        crackingLastInput.key = String(event.key).toUpperCase();
        crackingLastInput.time = performance.now();
      }
    }, true);
    const observer = new MutationObserver((mutations) => {
      if (!/sid=crimes/i.test(window.location.href) || !isCrackingCrimePage()) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal`) && !target.closest('.fluz-cracking-panel');
      });
      if (relevant) scheduleCrackingScan();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    setInterval(() => {
      if (isCrackingCrimePage()) scheduleCrackingScan();
    }, 1000);
  }

  async function refreshCrimeMoraleFromPageData(force = false) {
    if (isCrimesHubPage()) {
      state.crimeMoraleStatus = 'open crime';
      if (force) showFlash('Open a specific crime first.');
      renderPanelKeepingScroll();
      return false;
    }
    const typeId = currentCrimeTypeId();
    if (!typeId) {
      state.crimeMoraleStatus = 'unknown crime';
      if (force) showFlash('Could not detect this crime type yet.');
      renderPanelKeepingScroll();
      return false;
    }
    const requestKey = `${currentCrimeSlug()}:${typeId}`;
    const now = nowMs();
    if (!force && state.crimeMoraleRequestKey === requestKey && now - state.crimeMoraleRequestAt < 30000) return false;
    if (state.crimeMoraleLoading) return false;
    state.crimeMoraleLoading = true;
    state.crimeMoraleRequestKey = requestKey;
    state.crimeMoraleRequestAt = now;
    state.crimeMoraleStatus = 'loading';
    try {
      const response = await fetch(`/page.php?sid=crimesData&typeID=${encodeURIComponent(typeId)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      const payload = await response.json();
      const before = state.crimeMorale ? state.crimeMorale.morale : null;
      handleCrimesDataPayload(payload);
      const after = state.crimeMorale ? state.crimeMorale.morale : null;
      state.crimeMoraleStatus = after == null ? 'no demMod' : 'live';
      if (force) showFlash(after == null || after === before ? 'Morale data refreshed.' : 'Morale updated.');
      return after != null;
    } catch (error) {
      state.crimeMoraleStatus = 'failed';
      if (force) showFlash(`Morale refresh failed: ${friendlyError(error)}`);
      return false;
    } finally {
      state.crimeMoraleLoading = false;
      const module = getUtilityModule();
      if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
    }
  }

  function scheduleCrimeMoraleRefresh() {
    if (isCrimesHubPage()) return;
    setTimeout(() => refreshCrimeMoraleFromPageData(false), 700);
    setTimeout(() => refreshCrimeMoraleFromPageData(false), 2200);
  }

  async function refreshBootleggingFromPageData(force = false) {
    if (!isBootleggingCrimePage()) {
      if (force) showFlash('Open Bootlegging first.');
      return false;
    }
    const typeId = currentCrimeTypeId() || CRIME_TYPE_IDS.bootlegging;
    const requestKey = `bootlegging:${typeId}`;
    const now = nowMs();
    if (!force && state.bootleggingRequestKey === requestKey && now - state.bootleggingRequestAt < 30000) {
      return applyBootleggingButtonLabels();
    }
    if (state.bootleggingLoading) return false;
    state.bootleggingLoading = true;
    state.bootleggingRequestKey = requestKey;
    state.bootleggingRequestAt = now;
    try {
      const response = await fetch(`/page.php?sid=crimesData&typeID=${encodeURIComponent(typeId)}`, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json, text/javascript, */*; q=0.01',
          'X-Requested-With': 'XMLHttpRequest'
        }
      });
      const payload = await response.json();
      handleCrimesDataPayload(payload);
      const hasData = !!(state.bootleggingData && buildBootleggingRows(state.bootleggingData).length);
      if (!hasData) ensureBootleggingDataFromVisiblePage();
      scheduleBootleggingButtonLabels();
      const touched = applyBootleggingButtonLabels();
      if (force) showFlash(touched ? 'Bootlegging helper refreshed.' : 'Bootlegging data not visible yet.');
      return touched;
    } catch (error) {
      const touched = ensureBootleggingDataFromVisiblePage() && applyBootleggingButtonLabels();
      if (force) showFlash(touched ? 'Bootlegging visible counts labeled.' : `Bootlegging refresh failed: ${friendlyError(error)}`);
      return touched;
    } finally {
      state.bootleggingLoading = false;
      const module = getUtilityModule();
      if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) renderPanelKeepingScroll();
    }
  }

  function scheduleBootleggingRefresh() {
    if (!isBootleggingCrimePage()) return;
    [500, 1500, 3500].forEach((delayMs) => {
      setTimeout(() => {
        refreshBootleggingFromPageData(false).catch(() => {});
      }, delayMs);
    });
    scheduleBootleggingButtonLabels();
  }

  function watchCrimesData() {
    if (state.crimesDataWatchStarted) return;
    state.crimesDataWatchStarted = true;
    const pageWindow = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;
    if (!pageWindow) return;
    if (typeof pageWindow.fetch === 'function' && !pageWindow.__TORNZ_CRIMES_FETCH_PATCHED__) {
      const originalFetch = pageWindow.fetch.bind(pageWindow);
      pageWindow.__TORNZ_CRIMES_FETCH_PATCHED__ = true;
      pageWindow.fetch = async (...args) => {
        const response = await originalFetch(...args);
        try {
          if (isCrimesDataRequest(args[0], args[1] || {})) {
            response.clone().json()
              .then(handleCrimesDataPayload)
              .catch(() => {});
          }
        } catch (error) {
          console.debug(`${APP.name}: crimesData fetch watch failed`, error);
        }
        return response;
      };
    }
    if (pageWindow.XMLHttpRequest && !pageWindow.__TORNZ_CRIMES_XHR_PATCHED__) {
      pageWindow.__TORNZ_CRIMES_XHR_PATCHED__ = true;
      const originalOpen = pageWindow.XMLHttpRequest.prototype.open;
      const originalSend = pageWindow.XMLHttpRequest.prototype.send;
      pageWindow.XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
        this.__tornzUrl = String(url || '');
        return originalOpen.call(this, method, url, ...rest);
      };
      pageWindow.XMLHttpRequest.prototype.send = function patchedSend(...args) {
        this.addEventListener('load', function onLoad() {
          try {
            if (!isCrimesDataRequest(this.__tornzUrl || '', { body: args[0] })) return;
            const payload = parseCrimesDataResponse(this);
            if (payload) handleCrimesDataPayload(payload);
          } catch (error) {
            console.debug(`${APP.name}: crimesData xhr watch failed`, error);
          }
        });
        return originalSend.apply(this, args);
      };
    }
  }

  function handleCrimesDataPayload(payload) {
    updateCrimeMoraleFromPayload(payload);
    const bootleggingData = normalizeBootleggingCrimesData(payload);
    if (bootleggingData) {
      state.bootleggingData = bootleggingData;
      applyBootleggingButtonLabels();
      scheduleBootleggingButtonLabels();
    }
    if (isPickpocketCrimePage()) schedulePickpocketFormatting();
    applyCrimeProfitabilityLabels();
    const module = getUtilityModule();
    if (state.mode === 'utility' && module && module.key === 'crimes' && !isPanelInputFocused()) {
      renderPanelKeepingScroll();
    }
  }

  function updateCrimeMoraleFromPayload(payload) {
    const rawDemMod = findNestedValue(payload, 'demMod');
    if (rawDemMod == null || rawDemMod === '') return;
    const demMod = parseNumber(rawDemMod);
    if (!Number.isFinite(demMod)) return;
    state.crimeMorale = {
      morale: clamp(100 - demMod, 0, 100),
      demMod,
      label: 'Crime 2.0',
      updatedText: 'live'
    };
    writeJsonStorage(STORAGE.crimeMorale, {
      morale: state.crimeMorale.morale,
      demMod,
      label: state.crimeMorale.label,
      fetchedAt: nowMs()
    });
  }

  function findNestedValue(value, key, depth = 0) {
    if (!value || depth > 5) return null;
    if (typeof value !== 'object') return null;
    if (Object.prototype.hasOwnProperty.call(value, key)) return value[key];
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = findNestedValue(item, key, depth + 1);
        if (found != null) return found;
      }
      return null;
    }
    for (const item of Object.values(value)) {
      const found = findNestedValue(item, key, depth + 1);
      if (found != null) return found;
    }
    return null;
  }

  function watchBootleggingDomChanges() {
    if (state.bootleggingDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.bootleggingDomWatchStarted = true;
    let labelTimer = null;
    const observer = new MutationObserver(() => {
      if (!state.bootleggingData || !isBootleggingCrimePage()) return;
      clearTimeout(labelTimer);
      labelTimer = setTimeout(() => applyBootleggingButtonLabels(), 250);
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  function watchPickpocketDomChanges() {
    if (state.pickpocketDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.pickpocketDomWatchStarted = true;
    const observer = new MutationObserver((mutations) => {
      if (!isPickpocketCrimePage()) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal, #fluz-pickpocket-controls`);
      });
      if (relevant) schedulePickpocketFormatting();
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function watchCrimeProfitDomChanges() {
    if (state.crimeProfitDomWatchStarted || !document.body || typeof MutationObserver === 'undefined') return;
    state.crimeProfitDomWatchStarted = true;
    let labelTimer = null;
    const observer = new MutationObserver((mutations) => {
      if (!/sid=crimes/i.test(window.location.href)) return;
      const relevant = mutations.some((mutation) => {
        const target = mutation.target && mutation.target.nodeType === 1 ? mutation.target : mutation.target && mutation.target.parentElement;
        return target && !target.closest(`#${APP.id}, #${APP.id}-modal`) && !target.closest('.fluz-crime-profit-chip');
      });
      if (!relevant) return;
      clearTimeout(labelTimer);
      labelTimer = setTimeout(() => applyCrimeProfitabilityLabels(), 350);
    });
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  function watchTargetTimers() {
    if (state.targetTimerWatchStarted) return;
    state.targetTimerWatchStarted = true;
    setInterval(() => {
      if (state.mode !== 'utility') return;
      const module = getUtilityModule();
      if (!moduleHasTargetTools(module)) return;
      if (!normalizeTargets(state.utility.targets).some((target) => targetCountdownNeedsTick(target))) return;
      patchTargetStatusDom();
    }, 1000);
    setInterval(() => {
      refreshTargetStatuses(false);
    }, 30000);
    setInterval(() => {
      checkUtilityTimerAlerts();
    }, 1000);
  }
  async function init() {
    watchCrimesData();
    await loadSettings();
    state.mode = detectToolMode();
    if (!state.mode) {
      removeAppUi();
      return;
    }
    window.__TORNZ_TOOLS_DEBUG__ = {
      version: APP.version,
      state,
      showPanel: () => {
        state.panel.collapsed = false;
        ensurePanel();
      },
      refresh: () => refreshData(true),
      refreshGym: () => refreshGymData(true),
      openProfile: () => openProfileFromExtension(),
      filterStock: (acronym) => findStockOnPage(acronym),
      clearFilter: () => clearNativeStockFilter(),
      looksLikeStocksPage,
      looksLikeGymPage
    };
    window.__TORNZ_MONEY_HELPER_DEBUG__ = window.__TORNZ_TOOLS_DEBUG__;

    if (!state.apiKey && state.mode === 'stocks') {
      state.panel.activeTab = 'signals';
      state.panel.collapsed = false;
    }

    ensurePanel();
    if (!state.apiKey && (state.mode === 'stocks' || state.mode === 'gym')) setTimeout(openProfileWindow, 100);
    bindEvents();
    watchUtilityDomChanges();
    watchItemMarketBazaarDomChanges();
    watchCrimesData();
    watchBootleggingDomChanges();
    watchPickpocketDomChanges();
    watchCrackingDomChanges();
    watchCrimeProfitDomChanges();
    watchTargetTimers();
    registerMenuCommand(`${APP.name}: Show panel`, () => {
      state.panel.collapsed = false;
      state.panel.x = null;
      state.panel.y = null;
      state.panel.activeTab = 'signals';
      ensurePanel();
      if (!state.apiKey && state.mode === 'stocks') setTimeout(openProfileWindow, 100);
      savePanelState();
    });
    registerMenuCommand(`${APP.name}: Reset panel position`, () => resetPanelPosition());
    registerMenuCommand(`${APP.name}: Profile / API key`, () => openProfileWindow());
    registerMenuCommand(`${APP.name}: Clear API key`, () => {
      clearApiKey().then(() => {
        state.error = 'API key cleared.';
        renderPanel();
      });
    });
    registerMenuCommand(`${APP.name}: Refresh`, () => refreshData(true));
    registerMenuCommand(`${APP.gymName}: Refresh`, () => refreshGymData(true));
    registerMenuCommand(`${APP.name}: Clear Torn stock filter`, () => clearNativeStockFilter());
    registerMenuCommand(`${APP.name}: Donate / FLUZ page`, () => openDonateWindow());
    watchPageLocation();
    const mode = await waitForSupportedPage();
    if (!mode) {
      removeAppUi();
      return;
    }
    state.mode = mode;
    removeNativeSearch();
    if (mode === 'stocks' && state.apiKey) await refreshData(false);
    if (mode === 'gym') await refreshGymData(false);
    if (mode === 'utility') {
      await refreshUtilityData(false);
      const module = getUtilityModule();
      if (module.key === 'itemmarket') {
        scheduleItemMarketBazaarPanel(isItemMarketBrowseItemPage());
      } else {
        renderNativeItemMarketBazaarPanel();
      }
      if (module.key === 'travel') loadTravelYataData(false);
      if (module.key === 'crimes') {
        loadCrimeProfitabilityData(false);
        scheduleCrimeProfitabilityLabels();
        if (isBootleggingCrimePage()) scheduleBootleggingRefresh();
        if (isPickpocketCrimePage()) schedulePickpocketFormatting();
        if (isCrackingCrimePage()) {
          refreshCrackingStats().catch(() => {});
          scheduleCrackingScan();
        }
        scheduleCrimeMoraleRefresh();
      }
      await refreshTargetStatuses(true);
    }
  }

  init().catch((error) => {
    console.error('[FLUZ] init failed:', error);
    state.error = friendlyError(error);
    ensurePanel();
  });
})();
