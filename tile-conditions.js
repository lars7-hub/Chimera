(function(){
  const defaultConditions = {
    mountain: {
      passable: [{ type: 'ability', key: 'mountain_climb', message: 'You need to be able to climb mountains.' }]
    },
    water: {
      passable: [{ type: 'ability', key: 'water_swim', message: 'You need to be able to swim.' }]
    }
  };

  function mergeConditions(tile){
    const result = JSON.parse(JSON.stringify(tile.conditions || {}));
    (tile.types || []).forEach(t => {
      const def = defaultConditions[t];
      if(def){
        result.passable = (result.passable || []).concat(def.passable || []);
      }
    });
    return result;
  }

function hasItem(inventory, key){
    return Array.isArray(inventory) && inventory.some(i => i && i.key === key && (!i.stackable || (i.quantity && i.quantity > 0)));
  }

  function hasAbility(abilities, key){
    return Array.isArray(abilities) && abilities.some(a => {
      if (!a) return false;
      if (typeof a === 'string') return a === key;
      return a.key === key || a.name === key;
    });
  }

  function isPassable(tile, inventory, abilities){
    const conds = mergeConditions(tile);
    const pass = conds.passable || [];
    for (const c of pass) {
      if (c.type === 'item' && !hasItem(inventory, c.key)) {
        return { passable: false, message: c.message };
      }
      if (c.type === 'ability' && !hasAbility(abilities, c.key)) {
        return { passable: false, message: c.message };
      }
    }
    return { passable: true };
  }

  window.TileConditions = { isPassable };
})();