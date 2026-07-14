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
    autoBatchSize: 6,
    autoConcurrency: 3,
    autoDelayMs: 650,
    autoRequestGapMs: 90,
    recoveryBatchSize: 2,
    recoveryConcurrency: 1,
    recoveryDelayMs: 1500,
    recoveryRequestGapMs: 260,
    manualConcurrency: 3,
    manualRequestGapMs: 90,
    autoRenderThrottleMs: 4500,
    scanCacheTtlMs: 60 * 60 * 1000,
    scanCacheWriteThrottleMs: 15000,
    sourceCooldownMs: 4500,
    sourceRecoveryMs: 20000,
    sourceMaxCooldownMs: 12000
  };

