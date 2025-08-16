const resourceTypes = {
  construction: {
    name: 'Construction Materials',
    resources: [
      { key: 'wood', name: 'Wood', icon: 'wood.png' },
      { key: 'stone', name: 'Stone', icon: 'stone.png' },
      { key: 'clay', name: 'Clay', icon: 'clay.png' }
    ]
  },
  food: {
    name: 'Food',
    resources: [
      { key: 'fish', name: 'Fish', icon: 'fish.png' },
      { key: 'meat', name: 'Meat', icon: 'meat.png' },
      { key: 'grain', name: 'Grain', icon: 'grain.png' }
    ]
  },
  magic: {
    name: 'Magic',
    resources: [
      { key: 'fire_rune', name: 'Fire Rune', icon: 'fire_rune.png' },
      { key: 'water_rune', name: 'Water Rune', icon: 'water_rune.png' },
      { key: 'earth_rune', name: 'Earth Rune', icon: 'earth_rune.png' }
    ]
  },
  fuel: {
    name: 'Fuel',
    resources: [
      { key: 'coal', name: 'Coal', icon: 'coal.png' },
      { key: 'oil', name: 'Oil', icon: 'oil.png' },
      { key: 'peat', name: 'Peat', icon: 'peat.png' }
    ]
  },
  flora: {
    name: 'Flora',
    resources: [
      { key: 'herbs', name: 'Herbs', icon: 'herbs.png' },
      { key: 'berries', name: 'Berries', icon: 'berries.png' },
      { key: 'mushrooms', name: 'Mushrooms', icon: 'mushrooms.png' }
    ]
  },
  fauna: {
    name: 'Fauna',
    resources: [
      { key: 'fur', name: 'Fur', icon: 'fur.png' },
      { key: 'leather', name: 'Leather', icon: 'leather.png' },
      { key: 'bone', name: 'Bone', icon: 'bone.png' }
    ]
  },
  minerals: {
    name: 'Minerals',
    resources: [
      { key: 'iron_ore', name: 'Iron Ore', icon: 'iron_ore.png' },
      { key: 'copper_ore', name: 'Copper Ore', icon: 'copper_ore.png' },
      { key: 'gold_ore', name: 'Gold Ore', icon: 'gold_ore.png' }
    ]
  }
};

const allResources = [];
Object.entries(resourceTypes).forEach(([type, data]) => {
  data.resources.forEach(r => {
    allResources.push({ ...r, type });
  });
});

window.RESOURCE_TYPES = resourceTypes;
window.RESOURCES = allResources;
