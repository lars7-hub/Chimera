let lexicon = null;
let abilities = [];
let inventory = [];
let abilityPage = 0;
let inventoryPage = 0;

window.onload = async function () {
    await loadWorlds();
    await loadCharacters();
    document.getElementById('world-select').addEventListener('change', loadLexicon);
    document.getElementById('start-battle-btn').addEventListener('click', startBattle);
};

async function loadWorlds() {
    const worlds = await window.electron.listWorlds();
    const sel = document.getElementById('world-select');
    sel.innerHTML = '<option value="">Select...</option>';
    worlds.forEach(w => {
        const opt = document.createElement('option');
        opt.value = w;
        opt.textContent = w;
        sel.appendChild(opt);
    });
}

async function loadCharacters() {
    const chars = await window.electron.getCharacters();
    const playerSel = document.getElementById('player-select');
    const enemySel = document.getElementById('enemy-select');
    playerSel.innerHTML = '<option value="">Select...</option>';
    enemySel.innerHTML = '<option value="">Select...</option>';
    chars.forEach(c => {
        const opt1 = document.createElement('option');
        opt1.value = c.name;
        opt1.textContent = c.name;
        playerSel.appendChild(opt1);
        const opt2 = document.createElement('option');
        opt2.value = `pc:${c.name}`;
        opt2.textContent = c.name;
        enemySel.appendChild(opt2);
    });
}

async function loadLexicon() {
    const world = document.getElementById('world-select').value;
    if (!world) return;
    await window.electron.ensureLexicon(world);
    lexicon = await window.electron.getLexicon(world);
    const enemySel = document.getElementById('enemy-select');
    [...enemySel.querySelectorAll('option[data-type="npc"]')].forEach(o => o.remove());
    (lexicon.npc_blueprints || []).forEach(n => {
        const opt = document.createElement('option');
        opt.value = `npc:${n.name}`;
        opt.textContent = n.name;
        opt.dataset.type = 'npc';
        enemySel.appendChild(opt);
    });
    const typeSel = document.getElementById('type-select');
    typeSel.innerHTML = '';
    const none = document.createElement('option');
    none.value = '';
    none.textContent = 'None';
    typeSel.appendChild(none);
    (lexicon.typing || []).forEach(t => {
        const opt = document.createElement('option');
        opt.value = t.name || t;
        opt.textContent = t.name || t;
        typeSel.appendChild(opt);
    });
}

async function startBattle() {
    const playerName = document.getElementById('player-select').value;
    const enemyVal = document.getElementById('enemy-select').value;
    const type = document.getElementById('type-select').value;
    if (!playerName || !enemyVal) return;
    const player = await window.electron.getCharacter(playerName);
    player.image = await window.electron.getCharacterImage(playerName);
    player.inventory = await window.electron.getInventory(playerName, 'default');
    let enemy;
    if (enemyVal.startsWith('pc:')) {
        const enemyName = enemyVal.slice(3);
        enemy = await window.electron.getCharacter(enemyName);
        enemy.image = await window.electron.getCharacterImage(enemyName);
        enemy.inventory = await window.electron.getInventory(enemyName, 'default');
    } else {
        const bpName = enemyVal.slice(4);
        const bp = (lexicon.npc_blueprints || []).find(n => n.name === bpName) || {};
        enemy = { ...bp };
        enemy.image = bp.icon || '';
        enemy.inventory = bp.inventory || [];
    }
    await renderBattle(player, enemy, type);
}

async function renderBattle(player, enemy, type) {
    document.getElementById('selection-screen').classList.add('hidden');
    const screen = document.getElementById('battle-screen');
    screen.classList.remove('hidden');
    renderInfo('player-info', player);
    renderInfo('enemy-info', enemy);
    await renderVisualizer(player.image, enemy.image, type);
    abilities = player.abilities || [];
    abilityPage = 0;
    renderAbilities();
    inventory = player.inventory || [];
    inventoryPage = 0;
    renderInventory();
    renderSpecialMenu();
}

function renderInfo(id, data) {
    const el = document.getElementById(id);
    el.innerHTML = '';
    const name = document.createElement('div');
    name.textContent = `${data.name || ''} Lv.${data.level || 1}`;
    el.appendChild(name);
    const table = document.createElement('table');
    const tbody = document.createElement('tbody');
    const invMods = [];
    (data.inventory || []).forEach(item => {
        (item.stats || []).forEach(mod => {
            const m = { ...mod };
            if (item.stackable && item.quantity) m.value = m.value * item.quantity;
            invMods.push(m);
        });
    });
    const { finalStats, modifiers } = calculateFinalStats(data.stats || {}, data.traits || [], invMods);
    Object.keys(finalStats).forEach(key => {
        const tr = document.createElement('tr');
        const th = document.createElement('td');
        th.textContent = key;
        tr.appendChild(th);
        const baseTd = document.createElement('td');
        baseTd.textContent = (data.stats && data.stats[key]) || 0;
        tr.appendChild(baseTd);
        const modTd = document.createElement('td');
        const mod = modifiers[key] || 0;
        modTd.textContent = mod >= 0 ? `+${Math.round(mod)}` : Math.round(mod);
        tr.appendChild(modTd);
        const totalTd = document.createElement('td');
        totalTd.textContent = Math.round(finalStats[key]);
        tr.appendChild(totalTd);
        tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    el.appendChild(table);
    const hpBar = createHealthBar(data.hp || (data.stats && data.stats.hp) || 0, (data.stats && data.stats.hp) || (data.hpMax || 0));
    el.appendChild(hpBar);
}

function createHealthBar(cur, max) {
    const cont = document.createElement('div');
    cont.className = 'hp-bar';
    const fill = document.createElement('div');
    fill.className = 'hp-fill';
    const pct = max ? cur / max : 0;
    fill.style.width = (pct * 100) + '%';
    fill.style.backgroundColor = pct > 0.5 ? 'green' : pct > 0.2 ? 'yellow' : 'red';
    const text = document.createElement('div');
    text.className = 'hp-text';
    text.textContent = `${cur}/${max}`;
    cont.appendChild(fill);
    cont.appendChild(text);
    return cont;
}

async function renderVisualizer(playerImg, enemyImg, type) {
    const vis = document.getElementById('visualizer');
    vis.innerHTML = '';
    let bg = 'resources/ui/battle.png';
    if (type) {
        try {
            const p = await window.electron.getRandomTileImage(type);
            if (p) bg = p;
        } catch(e){}
    }
    vis.style.backgroundImage = `url('${bg}')`;
    const left = document.createElement('img');
    left.src = playerImg;
    const right = document.createElement('img');
    right.src = enemyImg;
    vis.appendChild(left);
    vis.appendChild(right);
}

function renderAbilities() {
    const container = document.getElementById('battle-buttons');
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'ability-grid';
    abilities.slice(abilityPage * 12, abilityPage * 12 + 12).forEach(ab => {
        const btn = document.createElement('button');
        btn.textContent = ab.name || ab;
        grid.appendChild(btn);
    });
    container.appendChild(grid);
    if (abilities.length > 12) {
        const controls = document.createElement('div');
        controls.className = 'page-controls';
        const prev = document.createElement('button');
        prev.textContent = '<';
        prev.disabled = abilityPage === 0;
        prev.addEventListener('click', () => { abilityPage--; renderAbilities(); });
        const next = document.createElement('button');
        next.textContent = '>';
        next.disabled = (abilityPage + 1) * 12 >= abilities.length;
        next.addEventListener('click', () => { abilityPage++; renderAbilities(); });
        controls.appendChild(prev);
        controls.appendChild(next);
        container.appendChild(controls);
    }
}

function renderInventory() {
    const container = document.getElementById('inventory');
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'inventory-grid';
    inventory.slice(inventoryPage * 24, inventoryPage * 24 + 24).forEach(it => {
        const div = document.createElement('div');
        div.className = 'inventory-item';
        div.textContent = it.name || it;
        grid.appendChild(div);
    });
    container.appendChild(grid);
    if (inventory.length > 24) {
        const controls = document.createElement('div');
        controls.className = 'page-controls';
        const prev = document.createElement('button');
        prev.textContent = '<';
        prev.disabled = inventoryPage === 0;
        prev.addEventListener('click', () => { inventoryPage--; renderInventory(); });
        const next = document.createElement('button');
        next.textContent = '>';
        next.disabled = (inventoryPage + 1) * 24 >= inventory.length;
        next.addEventListener('click', () => { inventoryPage++; renderInventory(); });
        controls.appendChild(prev);
        controls.appendChild(next);
        container.appendChild(controls);
    }
}

function renderSpecialMenu() {
    const container = document.getElementById('special-menu');
    container.innerHTML = '';
    const flee = document.createElement('button');
    flee.textContent = 'Flee';
    flee.addEventListener('click', () => { location.reload(); });
    const surrender = document.createElement('button');
    surrender.textContent = 'Surrender';
    surrender.addEventListener('click', () => { alert('You surrendered'); location.reload(); });
    container.appendChild(flee);
    container.appendChild(surrender);
}

function calculateFinalStats(baseStats = {}, traits = [], inventoryMods = []) {
    const finalStats = { ...baseStats };
    const modifiers = {};
    const boosts = {};
    const multipliers = {};
    function gather(mod) {
        if (!mod || !mod.stat || finalStats[mod.stat] === undefined) return;
        const val = Number(mod.value) || 0;
        const type = mod.type;
        if (type === 'mult' || type === 'mul') {
            multipliers[mod.stat] = (multipliers[mod.stat] || 1) * val;
        } else {
            const adj = type === 'sub' ? -val : val;
            boosts[mod.stat] = (boosts[mod.stat] || 0) + adj;
        }
    }
    traits.forEach(t => {
        if (Array.isArray(t.stats)) t.stats.forEach(gather);
        else gather(t);
    });
    inventoryMods.forEach(gather);
    Object.keys(finalStats).forEach(stat => {
        const base = Number(baseStats[stat]) || 0;
        const boost = boosts[stat] || 0;
        const mult = multipliers[stat] || 1;
        const total = (base + boost) * mult;
        finalStats[stat] = total;
        modifiers[stat] = total - base;
    });
    return { finalStats, modifiers };
}