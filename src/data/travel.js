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

