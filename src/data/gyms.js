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

