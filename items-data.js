const itemCategories = {
  resources: {
    name: 'Resources',
    items: []
  },
  consumables: {
    name: 'Consumables',
    items: []
  },
  ingredients: {
    name: 'Ingredients',
    items: []
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