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

