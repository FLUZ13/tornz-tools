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

