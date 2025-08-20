(function(){
  const defaultConditions = {
    mountain: {
      passable: [{ type: 'item', key: 'climbing_pick' }]
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

  function isPassable(tile, inventory){
    const conds = mergeConditions(tile);
    const pass = conds.passable || [];
    return pass.every(c => {
      if(c.type === 'item'){ return hasItem(inventory, c.key); }
      return true;
    });
  }

  window.TileConditions = { isPassable };
})();