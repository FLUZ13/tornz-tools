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
    },
    ultimate: {
      key: 'ultimate',
      label: 'Ultimate Trader',
      description: 'Uses local stock history, shared model confidence, portfolio context, and strict lock protection.',
      benefitWeight: 0.55,
      technicalWeight: 1.65,
      profitTargetBoost: 8,
      lossCutBoost: 10,
      buyDipMinMomentum: 0.9,
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
    },
    ultimate_trader: {
      key: 'ultimate_trader',
      label: 'Ultimate Trader',
      color: 'blue',
      risk: 82,
      strategyMode: 'ultimate',
      investorProfile: 'day',
      ignoreBenefits: false,
      description: 'Data-assisted confidence mode using local history plus optional private Drive model sync.',
      rhythm: 'Follow only high-confidence signals and always confirm manually in Torn.'
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

