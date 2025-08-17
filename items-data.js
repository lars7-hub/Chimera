const itemCategories = {
  resources: {
    name: 'Resources',
    items: [
      { key: 'wood', name: 'Wood', icon: 'wood.png' },
      { key: 'stone', name: 'Stone', icon: 'stone.png' },
      { key: 'coal', name: 'Coal', icon: 'coal.png' },
      { key: 'iron_ore', name: 'Iron Ore', icon: 'iron_ore.png' },
      { key: 'copper_ore', name: 'Copper Ore', icon: 'copper_ore.png' },
      { key: 'gold_ore', name: 'Gold Ore', icon: 'gold_ore.png' }
    ]
  },
  consumables: {
    name: 'Consumables',
    items: [
      { key: 'berries', name: 'Berries', icon: 'berries.png' },
      { key: 'mushrooms', name: 'Mushrooms', icon: 'mushrooms.png' },
      { key: 'cooked fish', name: 'Cooked Fish', icon: 'cooked_fish.png' },
      { key: 'cooked meat', name: 'Cooked Meat', icon: 'cooked_meat.png' },
      { key: 'grain', name: 'Grain', icon: 'grain.png' }
    ]
  },
  ingredients: {
    name: 'Ingredients',
    items: [
      { key: 'fire_rune', name: 'Fire Rune', icon: 'fire_rune.png' },
      { key: 'water_rune', name: 'Water Rune', icon: 'water_rune.png' },
      { key: 'earth_rune', name: 'Earth Rune', icon: 'earth_rune.png' },
      { key: 'air_rune', name: 'Air Rune', icon: 'air_rune.png' },
      { key: 'herbs', name: 'Herbs', icon: 'herbs.png' },
      { key: 'fur', name: 'Fur', icon: 'fur.png' },
      { key: 'leather', name: 'Leather', icon: 'leather.png' },
      { key: 'bone', name: 'Bone', icon: 'bone.png' },
      { key: 'fish', name: 'Fish', icon: 'fish.png' },
      { key: 'meat', name: 'Meat', icon: 'meat.png' },
      { key: 'grain', name: 'Grain', icon: 'grain.png' }
    ]
  },
  gear: {
    name: 'Gear',
    items: []
  },
  currency: {
    name: 'Currency',
    items: []
  },
  miscellaneous: {
    name: 'Miscellaneous',
    items: []
  }
};

const allItems = [];
Object.entries(itemCategories).forEach(([category, data]) => {
  data.items.forEach(i => {
    allItems.push({ ...i, category });
  });
});

window.ITEM_CATEGORIES = itemCategories;
window.ITEMS = allItems;