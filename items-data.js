const itemCategories = {
  resources: {
    name: 'Resources',
    items: [
      { key: 'wood', name: 'Wood', icon: 'wood.png', description: '', rarity: 'common', stackable: true, maxStack: 99, value: 0, stats: [] },
      { key: 'stone', name: 'Stone', icon: 'stone.png', description: '', rarity: 'common', stackable: true, maxStack: 99, value: 0, stats: [] },
      { key: 'coal', name: 'Coal', icon: 'coal.png', description: '', rarity: 'common', stackable: true, maxStack: 99, value: 0, stats: [] },
      { key: 'iron_ore', name: 'Iron Ore', icon: 'iron_ore.png', description: '', rarity: 'common', stackable: true, maxStack: 99, value: 0, stats: [] },
      { key: 'copper_ore', name: 'Copper Ore', icon: 'copper_ore.png', description: '', rarity: 'common', stackable: true, maxStack: 99, value: 0, stats: [] },
      { key: 'gold_ore', name: 'Gold Ore', icon: 'gold_ore.png', description: '', rarity: 'common', stackable: true, maxStack: 99, value: 0, stats: [] }
    ]
  },
  consumables: {
    name: 'Consumables',
    items: [
      { key: 'berries', name: 'Berries', icon: 'berries.png', description: '', rarity: 'common', stackable: true, maxStack: 20, value: 0, stats: [] },
      { key: 'mushroom', name: 'Mushroom', icon: 'mushroom.png', description: '', rarity: 'common', stackable: true, maxStack: 20, value: 0, stats: [] },
      { key: 'cooked fish', name: 'Cooked Fish', icon: 'cooked_fish.png', description: '', rarity: 'common', stackable: true, maxStack: 20, value: 0, stats: [] },
      { key: 'cooked meat', name: 'Cooked Meat', icon: 'cooked_meat.png', description: '', rarity: 'common', stackable: true, maxStack: 20, value: 0, stats: [] },
      { key: 'grain', name: 'Grain', icon: 'grain.png', description: '', rarity: 'common', stackable: true, maxStack: 20, value: 0, stats: [] }
    ]
  },
  ingredients: {
    name: 'Ingredients',
    items: [
      { key: 'fire_rune', name: 'Fire Rune', icon: 'fire_rune.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'water_rune', name: 'Water Rune', icon: 'water_rune.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'earth_rune', name: 'Earth Rune', icon: 'earth_rune.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'air_rune', name: 'Air Rune', icon: 'air_rune.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'herbs', name: 'Herbs', icon: 'herbs.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'fur', name: 'Fur', icon: 'fur.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'leather', name: 'Leather', icon: 'leather.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'bone', name: 'Bone', icon: 'bone.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'raw_fish', name: 'Raw Fish', icon: 'raw_fish.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'raw_meat', name: 'Raw Meat', icon: 'raw_meat.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] },
      { key: 'grain', name: 'Grain', icon: 'grain.png', description: '', rarity: 'common', stackable: true, maxStack: 50, value: 0, stats: [] }
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
  key_items: {
    name: 'Key Items',
    items: [
      { key: 'climbing_pick', name: 'Climbing Pick', icon: 'climbing_pick.png', description: 'A small hand pick that allows traversing treacherously rocky terrain.', rarity: 'common', stackable: false, maxStack: 1, value: 0, stats: [] }
    ]
  },
  miscellaneous: {
    name: 'Miscellaneous',
    items: []
  }
};

const allItems = [];
Object.entries(itemCategories).forEach(([category, data]) => {
  data.items.forEach(i => {
    const item = {
      ...i,
      category,
      rarity: i.rarity || 'common',
      quantity: i.quantity || 0,
      description: i.description || '',
      value: i.value || 0,
      stats: i.stats || [],
      stackable: i.stackable || false,
      maxStack: i.maxStack || 1
    };
    allItems.push(item);
  });
});

window.ITEM_CATEGORIES = itemCategories;
window.ITEMS = allItems;