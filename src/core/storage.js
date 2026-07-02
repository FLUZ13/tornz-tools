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

