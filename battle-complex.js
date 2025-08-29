let lexicon = null;
let abilities = [];
let inventory = [];
let abilityPage = 0;
let inventoryPage = 0;
let selectedPlayer = "";
let selectedEnemy = "";
let selectedType = "";
let currentWorld = "";
let allChars = [];
let tooltipEl = null;
let playerChar = null;
let enemyChar = null;
let awaitingInput = false;
let actionLogDiv = null;
let turnLog = [];

const TEXT_TEMPLATES = {
    abilityUse: (name, ability) => `${name} cast ${ability}!`,
    damage: (name, dmg) => `${name} took ${dmg} damage!`,
    miss: (name, ability) => `${name}'s ${ability} missed!`,
    crit: (name, ability, dmg) => `${name} dealt critical ${ability} for ${dmg} damage!`,
    effective: ability => `${ability} was super effective!`,
    ineffective: ability => `${ability} was not very effective...`,
    item: (name, item) => `${name} used ${item}!`
};

window.addEventListener('load', async function () {
    actionLogDiv = document.getElementById('action-log');
    await loadWorlds();
    await loadCharacters();
    document.getElementById('world-select').addEventListener('change', loadLexicon);
    document.getElementById('start-battle-btn').addEventListener('click', startBattle);
});

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
    allChars = await window.electron.getCharacters();
    await renderCharacterChips();
}

async function renderCharacterChips() {
    const playerSel = document.getElementById('player-select');
    const enemySel = document.getElementById('enemy-select');
    playerSel.innerHTML = '';
    enemySel.innerHTML = '';
    for (const c of allChars) {
        const img = await window.electron.getCharacterImage(c.name);
        const chipP = createChip(img, c.name, c.name, playerSel, v => { selectedPlayer = v; });
        playerSel.appendChild(chipP);
        const chipE = createChip(img, c.name, `pc:${c.name}`, enemySel, v => { selectedEnemy = v; });
        enemySel.appendChild(chipE);
    }
    if (lexicon) {
        (lexicon.npc_blueprints || []).forEach(n => {
            const chipEnemy = createChip(n.icon || '', n.name, `npc:${n.name}`, enemySel, v => { selectedEnemy = v; });
            enemySel.appendChild(chipEnemy);
            const chipPlayer = createChip(n.icon || '', n.name, `npc:${n.name}`, playerSel, v => { selectedPlayer = v; });
            playerSel.appendChild(chipPlayer);
        });
    }
}


async function loadLexicon() {
    const world = document.getElementById('world-select').value;
    if (!world) return;
    currentWorld = world;
    await window.electron.ensureLexicon(world);
    lexicon = await window.electron.getLexicon(world);
    await renderCharacterChips();
    const typeSel = document.getElementById('type-select');
    typeSel.innerHTML = '';
    selectedType = '';
    const types = (lexicon.typing && lexicon.typing.types) || [];
    for (const t of types) {
        const img = await window.electron.getBattleTypeImage(world, t) || '';
        const chip = createChip(img, t, t, typeSel, v => { selectedType = v; });
        typeSel.appendChild(chip);
    }
}


async function startBattle() {
    const playerVal = selectedPlayer;
    const enemyVal = selectedEnemy;
    const type = selectedType;
    if (!playerVal || !enemyVal) return;
    let player;
    if (playerVal.startsWith('npc:')) {
        const bpName = playerVal.slice(4);
        const bp = (lexicon.npc_blueprints || []).find(n => n.name === bpName) || {};
        player = { ...bp };
        player.image = bp.icon || '';
        player.inventory = bp.inventory || [];
    } else {
        player = await window.electron.getCharacter(playerVal);
        player.image = await window.electron.getCharacterImage(playerVal);
        player.inventory = await window.electron.getInventory(playerVal, 'default');
    }
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
    playerChar = player;
    enemyChar = enemy;
    playerChar.abilities = resolveAbilities(playerChar.abilities);
    enemyChar.abilities = resolveAbilities(enemyChar.abilities);
    renderInfo('player-info', playerChar);
    renderInfo('enemy-info', enemyChar);
    await renderVisualizer(player.image, enemy.image, type);
    abilities = playerChar.abilities || [];
    abilityPage = 0;
    renderAbilities();
    inventory = playerChar.inventory || [];
    inventoryPage = 0;
    renderInventory();
    renderSpecialMenu();
    awaitingInput = true;
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
    data.finalStats = finalStats;
    if (data.hpMax == null) data.hpMax = calculateHealth(finalStats);
    if (data.hp == null) data.hp = data.hpMax;
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
    const hpBar = createHealthBar(data.hp, data.hpMax);
    el.appendChild(hpBar);
}

function calculateHealth(stats = {}) {
    const fortitude = Number(stats.fortitude) || 0;
    const strength = Number(stats.strength) || 0;
    const dexterity = Number(stats.dexterity) || 0;
    return Math.round(fortitude * 10 + strength * 2 + dexterity);
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
    const log = actionLogDiv;
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
    if (log) vis.appendChild(log);
}

function renderAbilities() {
    const container = document.getElementById('battle-buttons');
    container.innerHTML = '';
    const grid = document.createElement('div');
    grid.className = 'ability-grid';
    abilities.slice(abilityPage * 12, abilityPage * 12 + 12).forEach(ab => {
        const btn = document.createElement('button');
        if (ab.image) {
            const img = document.createElement('img');
            img.src = ab.image;
            btn.appendChild(img);
        } else {
            btn.textContent = ab.name || ab;
        }
        btn.addEventListener('mouseenter', () => showTooltip(ab.description || ab.name || ab, btn));
        btn.addEventListener('mouseleave', hideTooltip);
        btn.addEventListener('click', () => selectAbility(ab));
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
        const btn = document.createElement('button');
        btn.className = 'inventory-item';
        const imgSrc = it.image || it.icon;
        if (imgSrc) {
            const img = document.createElement('img');
            img.src = imgSrc;
            btn.appendChild(img);
        } else {
            btn.textContent = it.name || it;
        }
        btn.addEventListener('mouseenter', () => showTooltip(it.description || it.name || it, btn));
        btn.addEventListener('mouseleave', hideTooltip);
        btn.addEventListener('click', () => useItem(it));
        grid.appendChild(btn);
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


function resolveAbilities(list = []) {
    return (list || []).map(ab => {
        if (typeof ab === 'string') {
            return (lexicon.abilities || []).find(a => a.key === ab || a.name === ab) || { name: ab, power: 0 };
        }
        return ab;
    });
}

function selectAbility(ab) {
    if (!awaitingInput) return;
    awaitingInput = false;
    const enemyAbility = chooseEnemyAbility();
    runTurn(ab, enemyAbility);
}

function chooseEnemyAbility() {
    const list = enemyChar && Array.isArray(enemyChar.abilities) ? enemyChar.abilities : [];
    if (!list.length) return { name: 'Attack', power: 0, attackStat: 'strength', defendStat: 'fortitude' };
    return list[Math.floor(Math.random() * list.length)];
}

function useItem(it) {
    if (!awaitingInput) return;
    awaitingInput = false;
    performItem(playerChar, it);
    renderInventory();
    if (!checkBattleEnd()) {
        runEnemyAction();
    }
}

function runEnemyAction() {
    const enemyAbility = chooseEnemyAbility();
    executeAction(enemyChar, playerChar, enemyAbility);
    postTurn();
}

function runTurn(playerAbility, enemyAbility) {
    const pSpeed = getSpeed(playerChar, playerAbility);
    const eSpeed = getSpeed(enemyChar, enemyAbility);
    if (pSpeed >= eSpeed) {
        executeAction(playerChar, enemyChar, playerAbility);
        if (enemyChar.hp > 0) executeAction(enemyChar, playerChar, enemyAbility);
    } else {
        executeAction(enemyChar, playerChar, enemyAbility);
        if (playerChar.hp > 0) executeAction(playerChar, enemyChar, playerAbility);
    }
    postTurn();
}

function getSpeed(ch, ability) {
    const dex = (ch.finalStats && ch.finalStats.dexterity) || 0;
    const mult = ability && ability.speedMultiplier != null ? ability.speedMultiplier : 1;
    return dex * mult;
}

function addLog(side, text) {
    turnLog.push({ side, text });
}

function renderActionLog() {
    if (!actionLogDiv) return;
    actionLogDiv.innerHTML = '';
    turnLog.forEach(entry => {
        const p = document.createElement('p');
        p.className = entry.side;
        p.textContent = entry.text;
        actionLogDiv.appendChild(p);
    });
    turnLog = [];
}

function executeAction(attacker, defender, ability) {
    if (!ability) return;
    const acc = ability.accuracy != null ? ability.accuracy : 100;
    const atkSide = attacker === playerChar ? 'player' : 'enemy';
    const defSide = defender === playerChar ? 'player' : 'enemy';
    if (Math.random() * 100 > acc) {
        addLog(atkSide, TEXT_TEMPLATES.miss(attacker.name || 'Unknown', ability.name || 'ability'));
        return;
    }
    addLog(atkSide, TEXT_TEMPLATES.abilityUse(attacker.name || 'Unknown', ability.name || 'Ability'));
    const dmg = dealDamage(attacker, defender, ability);
    addLog(defSide, TEXT_TEMPLATES.damage(defender.name || 'Unknown', dmg));
}

function dealDamage(attacker, defender, ability) {
    const atk = ability.attackStat || 'strength';
    const def = ability.defendStat || 'fortitude';
    const atkVal = (attacker.finalStats && attacker.finalStats[atk]) || 0;
    const defVal = (defender.finalStats && defender.finalStats[def]) || 0;
    const base = Number(ability.power) || 0;
    const dmg = Math.max(0, Math.round(base * (1 + atkVal / 100 - defVal / 100)));
    defender.hp = Math.max(0, (defender.hp || 0) - dmg);
    return dmg;
}

function performItem(user, item) {
    if (!item) return;
    addLog(user === playerChar ? 'player' : 'enemy', TEXT_TEMPLATES.item(user.name || 'Unknown', item.name || 'item'));
    let healed = 0;
    if (item.heal) healed += Number(item.heal) || 0;
    (item.stats || []).forEach(s => {
        if (s.stat === 'hp') healed += Number(s.value) || 0;
    });
    if (healed) user.hp = Math.min(user.hpMax, (user.hp || 0) + healed);
    if (item.stackable) {
        item.quantity = Math.max(0, (item.quantity || 1) - 1);
        if (item.quantity === 0) {
            const idx = inventory.indexOf(item);
            if (idx >= 0) inventory.splice(idx, 1);
        }
    } else {
        const idx = inventory.indexOf(item);
        if (idx >= 0) inventory.splice(idx, 1);
    }
    renderInfo('player-info', playerChar);
}

function postTurn() {
    renderInfo('player-info', playerChar);
    renderInfo('enemy-info', enemyChar);
    renderAbilities();
    renderInventory();
    renderActionLog();
    if (!checkBattleEnd()) awaitingInput = true;
}

function checkBattleEnd() {
    if (playerChar.hp <= 0) {
        alert('You were defeated');
        location.reload();
        return true;
    }
    if (enemyChar.hp <= 0) {
        alert('Enemy defeated');
        location.reload();
        return true;
    }
    return false;
}


function createChip(imgSrc, label, value, container, onSelect) {
    const chip = document.createElement('div');
    chip.className = 'chip';
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = label;
    chip.appendChild(img);
    chip.addEventListener('click', () => {
        [...container.children].forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        onSelect(value);
    });
    return chip;
}

function showTooltip(text, target) {
    if (!text) return;
    hideTooltip();
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip-bubble';
    tooltipEl.textContent = text;
    document.body.appendChild(tooltipEl);
    const rect = target.getBoundingClientRect();
    const top = rect.top - tooltipEl.offsetHeight - 5;
    tooltipEl.style.left = rect.left + 'px';
    tooltipEl.style.top = (top < 0 ? rect.bottom + 5 : top) + 'px';
}

function hideTooltip() {
    if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
    }
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