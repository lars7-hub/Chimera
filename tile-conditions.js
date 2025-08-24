(function(){
  const defaultConditions = {
    mountain: {
      passable: [{ type: 'item', key: 'climbing_pick' }]
    },
    water: {
      passable: [{ type: 'ability', key: 'swim_deep' }]
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
    return pass.every(c => {
      if(c.type === 'item'){ return hasItem(inventory, c.key); }
      if(c.type === 'ability'){ return hasAbility(abilities, c.key); }
      return true;
    });
  }

  window.TileConditions = { isPassable };})();