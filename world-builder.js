const tileIcons = {
    grass: '🌿',
    sand: '🏖️',
    snow: '❄️',
    wasteland: '💀',
    forest: '🌲',
    mountain: '⛰️',
    water: '🌊',
    town: '🏘️',
    indoors: '🏠'
};
const tileTypes = Object.keys(tileIcons);
const tileColors = {
    grass: '#228b22',
    sand: '#d2b48c',
    snow: '#ffffff',
    wasteland: '#808080',
    forest: '#006400',
    mountain: '#a9a9a9',
    water: '#1e90ff',
    town: '#cd853f',
    indoors: '#555555'
};

let editMode = false;
let gridWidth = 0;
let gridHeight = 0;
let tileMap = {};
let currentKey = '1-1';
let originKey = '1-1';
let tileSize = 0;
let currentWorld = null;
let showTypeIcons = false;
let biomePaintMode = false;
let itemPaintMode = false;
let biomePanel = null;
let itemPanel = null;
let zoneEditMode = false;
let zonePanel = null;
let zones = {};
let currentZone = null;
let zoneToggle = null;
let zoneNameInput = null;
let zoneColorInput = null;
let zoneNameWorld = null;
let zoneNameSplit = null;
let zoneNameFull = null;
let currentZoneInfo = null;
let isPainting = false;
let lastKey = null;
const tileGap = 1;
let activeZoneIds = [];
let zoneEntryTimeout = null;

let npcPanel = null;
let npcMode = 'manual';
const npcBlueprints = [];
let currentNpcBlueprint = {};
let worldNpcs = [];
let spawnPoints = [];
let editingSpawn = null;
let showSpawnPoints = false;
let npcMovementPaused = false;
let playerMovementLocked = false;
let hostileInteractionCooldown = 0;
let hostilePursuitShield = 0;
let hostileTimerEnd = 0;
let saveSpawnBtn = null;
let cleanupSpawnBtn = null;

function updateNpcCoords() {
    const [x, y] = keyToCoords(currentKey);
    const xInput = document.getElementById('npc-spawn-x');
    const yInput = document.getElementById('npc-spawn-y');
    if (xInput) xInput.value = x;
    if (yInput) yInput.value = y;
}

function updateZoneInfo() {
    if (!currentZoneInfo) return;
    if (currentZone) {
        currentZoneInfo.textContent = `Editing Zone: ${currentZone.name || ''} (ID ${currentZone.id})`;
    } else {
        currentZoneInfo.textContent = 'No zone selected';
    }
}

function hexToRgba(hex, alpha) {
    const bigint = parseInt(hex.slice(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r},${g},${b},${alpha})`;
}
let minX = 1, minY = 1, maxX = 0, maxY = 0;
let autoMoveTimer = null;
let isAutoMoving = false;
let useSplitView = false;
let viewMode = 'split'; // 'split', 'world', 'full'
let viewMinX = 0, viewMinY = 0, viewMaxX = 0, viewMaxY = 0;
const minimapImageCache = {};

const tileModPresets = {
    Village: {
        name: 'Village',
        icon: 'village0.png',
        message: "Welcome to our village!"
    }
};

const itemDefs = window.ITEMS || [];
const baseItemCategories = JSON.parse(JSON.stringify(window.ITEM_CATEGORIES || {}));
const baseItemDefs = itemDefs.map(i => ({ ...i }));
const abilityDefs = window.ABILITIES || [];

const itemByKey = {};
function rebuildItemIndex() {
    Object.keys(itemByKey).forEach(k => delete itemByKey[k]);
    itemDefs.forEach(i => { itemByKey[i.key] = i; });
}
rebuildItemIndex();

function resolveItemIcon(icon) {
	if (!icon) return '';
	return icon.startsWith('file://') ? icon : `resources/ui/items/${icon}`;
}


async function loadLexiconItems() {
    if (!currentWorld) return;
    try {
        await window.electron.ensureLexicon(currentWorld);
        const lex = await window.electron.getLexicon(currentWorld);
        const items = Array.isArray(lex.items) ? lex.items : [];
        const npcs = Array.isArray(lex.npc_blueprints) ? lex.npc_blueprints : [];
        const abilities = Array.isArray(lex.abilities) ? lex.abilities : [];

        Object.keys(itemCategories).forEach(k => delete itemCategories[k]);
        Object.assign(itemCategories, JSON.parse(JSON.stringify(baseItemCategories)));
        itemDefs.length = 0;
        baseItemDefs.forEach(i => itemDefs.push({ ...i }));

        items.forEach(it => {
            const cat = it.category || 'miscellaneous';
            if (!itemCategories[cat]) itemCategories[cat] = { name: cat, items: [] };
            const entry = {
                key: it.key || '',
                name: it.name || '',
                icon: it.icon || '',
                description: it.description || '',
                rarity: it.rarity || 'common',
                stackable: !!it.stackable,
                maxStack: it.maxStack != null ? it.maxStack : 1,
                value: it.value != null ? it.value : 0,
                weight: it.weight != null ? it.weight : 0,
                slots: it.slots != null ? it.slots : 0,
                width: it.width != null ? it.width : 1,
                height: it.height != null ? it.height : 1,
                stats: Array.isArray(it.stats) ? it.stats : [],
                abilities: Array.isArray(it.abilities) ? it.abilities : []
            };
            itemCategories[cat].items = itemCategories[cat].items || [];
            itemCategories[cat].items.push(entry);
            itemDefs.push({ ...entry, category: cat });
        });
        rebuildItemIndex();
        window.ITEMS = itemDefs;
        window.ITEM_CATEGORIES = itemCategories;

        npcBlueprints.length = 0;
        npcs.forEach(n => npcBlueprints.push({ ...n }));

        abilityDefs.length = 0;
        abilities.forEach(a => abilityDefs.push({ ...a }));
        window.ABILITIES = abilityDefs;
    } catch (err) {
        console.error('Failed to load lexicon items:', err);
    }
}

let worldCharacter = null;
let worldInventory = [];

const BASE_INVENTORY_SLOTS = 40;

function getInventoryCapacity() {
    let bonus = 0;
    (worldInventory || []).forEach(item => {
        if (item && item.slots) {
            const qty = item.stackable ? (item.quantity || 0) : 1;
            bonus += item.slots * qty;
        }
    });
    return BASE_INVENTORY_SLOTS + bonus;
}

function getInventoryWeight() {
    let total = 0;
    (worldInventory || []).forEach(item => {
        if (!item) return;
        const qty = item.stackable ? (item.quantity || 0) : 1;
        total += (item.weight || 0) * qty;
    });
    return total;
}

function updateCarryInfo(finalStats = {}) {
    const capacity = finalStats.carry_capacity != null
        ? finalStats.carry_capacity
        : ((worldCharacter && worldCharacter.stats && worldCharacter.stats.carry_capacity) || 0);
    const weight = getInventoryWeight();
    const textEl = document.getElementById('inventory-weight-text');
    if (textEl) {
        textEl.textContent = `${weight.toFixed(2)} / ${capacity}`;
    }
    const bar = document.getElementById('carry-weight-bar');
    if (bar) {
        const fill = bar.querySelector('.fill');
        const ratio = capacity > 0 ? weight / capacity : 0;
        const pct = Math.min(ratio, 1) * 100;
        if (fill) {
            fill.style.width = `${pct}%`;
            if (weight > capacity) fill.style.backgroundColor = 'red';
            else if (ratio >= 0.7) fill.style.backgroundColor = 'yellow';
            else fill.style.backgroundColor = 'gray';
        }
    }
}

function initCharacterAbilities() {
    if (!worldCharacter) return;
    worldCharacter.baseAbilities = Array.isArray(worldCharacter.abilities)
        ? [...worldCharacter.abilities]
        : [];
    worldCharacter.tempAbilities = [];
    worldCharacter.abilities = [...worldCharacter.baseAbilities];
}

function addTempAbility(ab) {
    if (!worldCharacter) return;
    if (!Array.isArray(worldCharacter.baseAbilities)) {
        worldCharacter.baseAbilities = Array.isArray(worldCharacter.abilities)
            ? [...worldCharacter.abilities]
            : [];
    }
    if (!Array.isArray(worldCharacter.tempAbilities)) {
        worldCharacter.tempAbilities = [];
    }
    const key = (ab && (ab.key || ab.name)) || ab;
    if (!key) return;
    if (!worldCharacter.tempAbilities.includes(key)) {
        worldCharacter.tempAbilities.push(key);
        worldCharacter.abilities = [...worldCharacter.baseAbilities, ...worldCharacter.tempAbilities];
    }
}

function removeTempAbility(ab) {
    if (!worldCharacter) return;
    if (!Array.isArray(worldCharacter.baseAbilities)) {
        worldCharacter.baseAbilities = Array.isArray(worldCharacter.abilities)
            ? [...worldCharacter.abilities]
            : [];
    }
    if (!Array.isArray(worldCharacter.tempAbilities)) {
        worldCharacter.tempAbilities = [];
    }
    const key = (ab && (ab.key || ab.name)) || ab;
    if (!key) return;
    const idx = worldCharacter.tempAbilities.indexOf(key);
    if (idx !== -1) {
        worldCharacter.tempAbilities.splice(idx, 1);
        worldCharacter.abilities = [...worldCharacter.baseAbilities, ...worldCharacter.tempAbilities];
    }
}

function recomputeTempAbilities() {
    if (!worldCharacter) return;
    if (!Array.isArray(worldCharacter.baseAbilities)) {
        worldCharacter.baseAbilities = Array.isArray(worldCharacter.abilities)
            ? [...worldCharacter.abilities]
            : [];
    }
    worldCharacter.tempAbilities = [];
    worldInventory.forEach(item => {
        if (!item) return;
        let abs = item.abilities;
        if (typeof abs === 'string') abs = [abs];
        if (Array.isArray(abs)) {
            abs.forEach(addTempAbility);
        }
    });
    worldCharacter.abilities = [...worldCharacter.baseAbilities, ...worldCharacter.tempAbilities];
    renderUtilityAbilities();
}
const statAbbr = {
    strength: 'STR',
    dexterity: 'DEX',
    constitution: 'CON',
    endurance: 'END',
    intelligence: 'INT',
    charisma: 'CHA',
    fortitude: 'FOR',
    carry_capacity: 'CARRY'
};

function renderUtilityAbilities() {
    const container = document.getElementById('utility-abilities');
    const grid = document.getElementById('utility-ability-grid');
    if (!container || !grid) return;
    grid.innerHTML = '';
    if (!worldCharacter || !Array.isArray(worldCharacter.abilities)) {
        container.classList.add('hidden');
        return;
    }
    const utilities = worldCharacter.abilities
        .map(key => abilityDefs.find(a => a.key === key || a.name === key))
        .filter(ab => ab && Array.isArray(ab.categories) && ab.categories.includes('utility'));
    if (utilities.length === 0) {
        container.classList.add('hidden');
        return;
    }
    utilities.forEach(ab => {
        const tile = document.createElement('div');
        tile.className = 'ability-tile';
        if (ab.icon) {
            const img = document.createElement('img');
            img.src = ab.icon;
            img.alt = ab.name || ab.key;
            tile.appendChild(img);
        }
        const tooltip = document.createElement('span');
        tooltip.className = 'ability-tooltip';
        tooltip.textContent = ab.name || ab.key;
        tile.appendChild(tooltip);
        grid.appendChild(tile);
    });
    container.classList.remove('hidden');
}

function getRenewableColor(item) {
    if (!item || !item.renewable) return 'transparent';
    const current = item.quantity != null ? item.quantity : (item.amount || 0);
    if (item.maxAmount == null) item.maxAmount = current;
    const max = item.maxAmount || 0;
    if (max <= 0) return 'gray';
    const ratio = current / max;
    if (ratio >= 1) return 'transparent';
    const grey = [128, 128, 128];
    const green = [144, 238, 144];
    const mix = grey.map((g, i) => Math.round(g + (green[i] - g) * ratio));
    return `rgb(${mix[0]},${mix[1]},${mix[2]})`;
}

function openTileItemsPopup(items) {
    return new Promise(resolve => {
        const overlay = document.getElementById('tile-item-overlay');
        const list = document.getElementById('tile-item-list');
        const addBtn = document.getElementById('tile-item-add');
        const closeBtn = document.getElementById('tile-item-close');
        const form = document.getElementById('tile-item-form');

        function render() {
            list.innerHTML = '';
            const header = document.createElement('div');
            header.className = 'tile-item-row tile-item-header';
            ['Icon','Category','Item','Quantity','Renewable',''].forEach(text => {
                const span = document.createElement('span');
                span.textContent = text;
                header.appendChild(span);
            });
            list.appendChild(header);
            items.forEach((r, idx) => {
                const row = document.createElement('div');
                row.className = 'tile-item-row';
                const def = itemByKey[r.key] || itemDefs[0];
                const img = document.createElement('img');
                if (def) {
                    r.key = def.key;
                    r.name = def.name;
                    r.category = def.category;
                    r.rarity = def.rarity;
                    r.description = def.description;
                    r.value = def.value;
                    r.weight = def.weight;
                    r.slots = def.slots;
                    r.width = def.width;
                    r.height = def.height;
                    r.stats = def.stats;
                    r.abilities = def.abilities;
                    r.image = r.image || resolveItemIcon(def && def.icon);
                }
                r.quantity = r.quantity != null ? r.quantity : (r.amount || 0);
                img.src = r.image || '';
                img.className = 'item-icon';
                if (r.renewable) {
                    img.style.borderRadius = '50%';
                    img.style.backgroundColor = getRenewableColor(r);
                }
                row.appendChild(img);

                const catSel = document.createElement('select');
                Object.entries(itemCategories).forEach(([cKey, cData]) => {
                    const opt = document.createElement('option');
                    opt.value = cKey;
                    opt.textContent = cData.name;
                    if (r.category === cKey) opt.selected = true;
                    catSel.appendChild(opt);
                });
                row.appendChild(catSel);

                const itemSel = document.createElement('select');
                function populate(catKey) {
                    itemSel.innerHTML = '';
                    (itemCategories[catKey].items || []).forEach(it => {
                        const opt = document.createElement('option');
                        opt.value = it.key;
                        opt.textContent = it.name;
                        itemSel.appendChild(opt);
                    });
                }
                const initialCat = r.category || Object.keys(itemCategories)[0];
                populate(initialCat);
                itemSel.value = r.key;
                row.appendChild(itemSel);

                catSel.addEventListener('change', () => {
                    populate(catSel.value);
                    const first = itemCategories[catSel.value].items[0];
                    if (first) {
                        itemSel.value = first.key;
                        r.key = first.key;
                        r.name = first.name;
                        r.category = catSel.value;
                        r.rarity = first.rarity;
                        r.description = first.description;
                         r.value = first.value;
                        r.weight = first.weight;
                        r.slots = first.slots;
                        r.width = first.width;
                        r.height = first.height;
                        r.stats = first.stats;
                        r.abilities = first.abilities;
                        r.image = resolveItemIcon(first && first.icon);
                        img.src = r.image;
                    }
                });
                itemSel.addEventListener('change', () => {
                    const d = itemByKey[itemSel.value];
                    if (d) {
                        r.key = d.key;
                        r.name = d.name;
                        r.category = d.category;
                        r.rarity = d.rarity;
                        r.description = d.description;
                        r.value = d.value;
                        r.weight = d.weight;
                        r.slots = d.slots;
                        r.width = d.width;
                        r.height = d.height;
                        r.stats = d.stats;
                        r.abilities = d.abilities;
                        r.image = resolveItemIcon(d && d.icon);
                        img.src = r.image;
                    }
                });

                const amt = document.createElement('input');
                amt.type = 'number';
                amt.value = r.quantity || r.amount || 0;
                amt.addEventListener('change', () => {
                    r.quantity = parseInt(amt.value,10) || 0;
                    r.amount = r.quantity;
                    if (r.renewable) {
                        img.style.backgroundColor = getRenewableColor(r);
                    }
                });
                row.appendChild(amt);

                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.checked = !!r.renewable;
                cb.addEventListener('change', () => { 
                    r.renewable = cb.checked; 
                    img.style.backgroundColor = getRenewableColor(r);
                });
                row.appendChild(cb);

                const del = document.createElement('button');
                del.textContent = 'X';
                del.addEventListener('click', () => { items.splice(idx,1); render(); });
                row.appendChild(del);

                list.appendChild(row);
            });
        }

        addBtn.onclick = async () => {
            const firstCat = Object.keys(itemCategories)[0];
            const firstItem = itemCategories[firstCat].items[0];
            if (firstItem) {
                items.push({
                    key: firstItem.key,
                    name: firstItem.name,
                    category: firstCat,
                    amount: 0,
                    quantity: 0,
                    maxQuantity: 0,
                    regenTime: 0,
                    renewable: false,
                    rarity: firstItem.rarity,
                    description: firstItem.description,
                    value: firstItem.value,
                    weight: firstItem.weight,
                    slots: firstItem.slots,
                    width: firstItem.width,
                    height: firstItem.height,
                    stats: firstItem.stats,
                    abilities: firstItem.abilities,
                    image: resolveItemIcon(firstItem && firstItem.icon),
                    _lastRegen: Date.now()
                });
                render();
            }
        };
        function close() {
            overlay.classList.add('hidden');
            addBtn.onclick = null;
            closeBtn.removeEventListener('click', onSubmit);
            form.removeEventListener('submit', onSubmit);
            resolve();
        }
        function onSubmit(e) {
            e.preventDefault();
            close();
        }
        form.addEventListener('submit', onSubmit);
        closeBtn.addEventListener('click', onSubmit);
        render();
        overlay.classList.remove('hidden');
    });
}


function keyToCoords(key) {
	const idx = key.indexOf('-', 1);
	const x = parseInt(key.slice(0, idx), 10);
	const y = parseInt(key.slice(idx + 1), 10);
	return [x, y];
}

function coordsToKey(x, y) {
        return `${x}-${y}`;
}

async function getRandomStickers(type) {
    const files = await window.electron.getStickerImages(type);
    if (!files || !files.length) return [];
    const groups = {};
    files.forEach(f => {
        const base = f.replace(/\.[^.]+$/, '');
        const idx = base.lastIndexOf('_');
        const g = idx >= 0 ? base.slice(0, idx) : base;
        if (!groups[g]) groups[g] = [];
        groups[g].push(f);
    });
    const keys = Object.keys(groups);
    const count = Math.floor(Math.random() * 3);
    const chosen = [];
    const available = [...keys];
    for (let i = 0; i < count && available.length; i++) {
        const tIdx = Math.floor(Math.random() * available.length);
        const g = available.splice(tIdx, 1)[0];
        const variants = groups[g];
        const file = variants[Math.floor(Math.random() * variants.length)];
        chosen.push({ icon: `${type}/${file}` });
    }
    return chosen;
}

function startWorldEditing(name) {
    currentWorld = name;
    const menu = document.getElementById('world-menu');
    if (menu) menu.remove();
    const editor = document.getElementById('editor-container');
    if (editor) editor.classList.remove('hidden');
	if (biomePanel) biomePanel.classList.add('hidden');
	if (itemPanel) itemPanel.classList.add('hidden');
}

async function showPrompt(message, defaultValue = '') {
    return new Promise(resolve => {
        const overlay = document.getElementById('prompt-overlay');
        const msg = document.getElementById('prompt-message');
        const input = document.getElementById('prompt-input');
        const ok = document.getElementById('prompt-ok');
        const cancel = document.getElementById('prompt-cancel');
        msg.textContent = message;
        input.value = defaultValue;
        overlay.classList.remove('hidden');

        function cleanup() {
            overlay.classList.add('hidden');
            ok.removeEventListener('click', onOk);
            cancel.removeEventListener('click', onCancel);
        }

        function onOk() {
            const val = input.value;
            cleanup();
            resolve(val);
        }
        function onCancel() {
            cleanup();
            resolve(null);
        }

        ok.addEventListener('click', onOk);
        cancel.addEventListener('click', onCancel);
        input.focus();
    });
}

function openTileEditor(data, x, y) {
    return new Promise(resolve => {
        const overlay = document.getElementById('tile-editor-overlay');
        const nameInput = document.getElementById('tile-name-input');
        const grid = document.getElementById('tile-connection-grid');
        const saveBtn = document.getElementById('tile-save');
        const cancelBtn = document.getElementById('tile-cancel');
        const typeContainer = document.getElementById('tile-type-options');
        const bgBtn = document.getElementById('tile-bg-btn');
        const bgPreview = document.getElementById('tile-bg-preview');
        const oneWayBtn = document.getElementById('one-way-toggle');
        const modBtn = document.getElementById('tile-mod-btn');
        const modOverlay = document.getElementById('tile-mod-overlay');
        const stickerBtn = document.getElementById('tile-sticker-btn');
        const manualList = document.getElementById('manual-connection-list');
        const manualAddBtn = document.getElementById('manual-connection-add');

        nameInput.value = data.name || '';
        let items = JSON.parse(JSON.stringify(data.items || []));
		let conditions = JSON.parse(JSON.stringify(data.conditions || {}));
		
        let selectedBg = data.background || '';
        function updateBg() {
            if (selectedBg) bgPreview.src = `resources/map/tiles/${selectedBg}`;
            else bgPreview.src = '';
        }
        updateBg();

        const existingTypes = data.types || (data.type ? [data.type] : []);
        typeContainer.innerHTML = '';
        tileTypes.forEach(t => {
            const label = document.createElement('label');
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = t;
            if (existingTypes.includes(t)) cb.checked = true;
            label.appendChild(cb);
            label.appendChild(document.createTextNode(t));
            typeContainer.appendChild(label);
        });
		
        let modifiers = JSON.parse(JSON.stringify(data.modifiers || []));
        let stickers = JSON.parse(JSON.stringify(data.stickers || []));
        let farConnections = (data.connections || [])
            .filter(k => {
                const [nx, ny] = keyToCoords(k);
                return Math.abs(nx - x) > 1 || Math.abs(ny - y) > 1;
            })
            .map(k => {
                const [nx, ny] = keyToCoords(k);
                return { x: nx, y: ny };
            });
        function openModEditor() {
            const modOverlay = document.getElementById('tile-mod-overlay');
            const modList = document.getElementById('tile-mod-list');
            const presetDiv = document.getElementById('tile-mod-presets');
            const addCustom = document.getElementById('tile-mod-add-custom');
            const closeBtn = document.getElementById('tile-mod-close');

            function renderList() {
                modList.innerHTML = '';
                modifiers.forEach((m, idx) => {
                    const row = document.createElement('div');
                    row.textContent = m.name;
                    const del = document.createElement('button');
                    del.textContent = 'X';
                    del.addEventListener('click', () => { modifiers.splice(idx,1); renderList(); });
                    row.appendChild(del);
                    modList.appendChild(row);
                });
            }

            presetDiv.innerHTML = '';
            Object.values(tileModPresets).forEach(p => {
                const btn = document.createElement('button');
                btn.textContent = p.name;
                btn.addEventListener('click', () => { modifiers.push({ ...p }); renderList(); });
                presetDiv.appendChild(btn);
            });

            addCustom.onclick = async () => {
                const name = await showPrompt('Modifier Name:');
                if (!name) return;
                const icon = await showPrompt('Image filename (in resources/map/tilemod):');
                if (icon === null) return;
                const message = await showPrompt('Message (optional):');
                modifiers.push({ name, icon, message });
                renderList();
            };

            function close() {
                modOverlay.classList.add('hidden');
                closeBtn.removeEventListener('click', close);
            }
            closeBtn.addEventListener('click', close);
            renderList();
            modOverlay.classList.remove('hidden');
        }
        modBtn.addEventListener('click', openModEditor);

        function openStickerEditor() {
            const over = document.getElementById('tile-sticker-overlay');
            const list = document.getElementById('tile-sticker-list');
            const addBtn = document.getElementById('tile-sticker-add');
            const closeBtn = document.getElementById('tile-sticker-close');

            function renderList() {
                list.innerHTML = '';
                stickers.forEach((s, idx) => {
                    const row = document.createElement('div');
                    row.textContent = s.icon;
                    const del = document.createElement('button');
                    del.textContent = 'X';
                    del.addEventListener('click', () => { stickers.splice(idx,1); renderList(); });
                    row.appendChild(del);
                    list.appendChild(row);
                });
            }

            addBtn.onclick = async () => {
                const icon = await showPrompt('Image filename (in resources/map/stickers):');
                if (!icon) return;
                stickers.push({ icon });
                renderList();
            };

            function close() {
                over.classList.add('hidden');
                closeBtn.removeEventListener('click', close);
                addBtn.onclick = null;
            }
            closeBtn.addEventListener('click', close);
            renderList();
            over.classList.remove('hidden');
        }
        stickerBtn.addEventListener('click', openStickerEditor);

        function renderManualConnections() {
            manualList.innerHTML = '';
            farConnections.forEach((c, idx) => {
                const row = document.createElement('div');
                row.className = 'manual-connection-row';
                const xInput = document.createElement('input');
                xInput.type = 'number';
                xInput.value = c.x;
                xInput.addEventListener('change', () => { c.x = parseInt(xInput.value, 10) || 0; });
                const yInput = document.createElement('input');
                yInput.type = 'number';
                yInput.value = c.y;
                yInput.addEventListener('change', () => { c.y = parseInt(yInput.value, 10) || 0; });
                const del = document.createElement('button');
                del.textContent = 'X';
                del.addEventListener('click', () => { farConnections.splice(idx,1); renderManualConnections(); });
                row.appendChild(xInput);
                row.appendChild(yInput);
                row.appendChild(del);
                manualList.appendChild(row);
            });
        }
        manualAddBtn.onclick = () => {
            farConnections.push({ x: x + 2, y: y });
            renderManualConnections();
        };
        renderManualConnections();

        grid.innerHTML = '';
        const connectionState = {};
        const incoming = {};
        const removeIncoming = {};
        let oneWayMode = false;

        oneWayBtn.onclick = () => {
            oneWayMode = !oneWayMode;
            oneWayBtn.textContent = `One-Way Mode: ${oneWayMode ? 'On' : 'Off'}`;
        };

        function updateCellClass(key, cell) {
            cell.classList.remove('connected', 'one-way', 'incoming', 'disconnected');
            const st = connectionState[key];
            if (st === 1) {
                cell.classList.add('existing', 'connected');
            } else if (st === 2) {
                cell.classList.add('existing', 'one-way');
            } else if (incoming[key] && !removeIncoming[key]) {
                cell.classList.add('existing', 'incoming');
            } else {
                cell.classList.add('existing', 'disconnected');
            }
        }
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                const key = `${nx}-${ny}`;
                const cell = document.createElement('div');
                cell.className = 'mini-map-cell';
                if (dx === 0 && dy === 0) {
                    cell.textContent = 'C';
                    cell.classList.add('existing');
                } else if (tileMap[key]) {
                    const connected = (data.connections || []).includes(key);
                    const neighborConnected = (tileMap[key].data.connections || []).includes(`${x}-${y}`);
                    let state = 0;
                    if (connected && neighborConnected) {
                        state = 1;
                    } else if (connected) {
                        state = 2;
                    } else if (neighborConnected) {
                        state = 0;
                        incoming[key] = true;
                    } else {
                        state = 0;
                    }
                    connectionState[key] = state;
                    updateCellClass(key, cell);
                    cell.addEventListener('click', () => {
                        let st = connectionState[key];
                        if (oneWayMode) {
                            if (incoming[key] && !removeIncoming[key] && st === 0) {
                                removeIncoming[key] = true;
                            } else {
                                st = st === 2 ? 0 : 2;
                                connectionState[key] = st;
                                removeIncoming[key] = true;
                            }
                        } else {
                            st = st === 1 ? 0 : 1;
                            connectionState[key] = st;
                            removeIncoming[key] = st === 1 ? false : true;
                        }
                        updateCellClass(key, cell);
                    });
                } else {
                    cell.classList.add('phantom');
                }
                grid.appendChild(cell);
            }
        }
        overlay.classList.remove('hidden');

        async function pickBackground() {
            const sections = await window.electron.listTileImages();
            const over = document.createElement('div');
            over.id = 'image-picker-overlay';
            Object.entries(sections).forEach(([name, files]) => {
                if (!files.length) return;
                const sec = document.createElement('div');
                sec.className = 'image-picker-section';
                const header = document.createElement('h3');
                header.textContent = name === 'root' ? 'Base' : name;
                sec.appendChild(header);
                const g = document.createElement('div');
                g.className = 'image-picker-grid';
                files.forEach(f => {
                    const img = document.createElement('img');
                    img.src = `resources/map/tiles/${f}`;
                    img.addEventListener('click', () => {
                        selectedBg = f;
                        updateBg();
                        document.body.removeChild(over);
                    });
                    g.appendChild(img);
                });
                sec.appendChild(g);
                over.appendChild(sec);
            });
            over.addEventListener('click', e => { if (e.target === over) document.body.removeChild(over); });
            document.body.appendChild(over);
        }
        bgBtn.addEventListener('click', pickBackground);

        function cleanup() {
            overlay.classList.add('hidden');
            modOverlay.classList.add('hidden');
            document.getElementById('tile-sticker-overlay').classList.add('hidden');
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
            bgBtn.removeEventListener('click', pickBackground);
            modBtn.removeEventListener('click', openModEditor);
            stickerBtn.removeEventListener('click', openStickerEditor);
            manualAddBtn.onclick = null;
        }

        async function onSave() {
            const itemsOut = items.map(r => {
                const qty = r.quantity != null ? r.quantity : (r.amount || 0);
                const maxQ = r.maxQuantity != null ? r.maxQuantity : qty;
                return {
                    key: r.key,
                    name: r.name,
                    category: itemByKey[r.key].category,
                    renewable: !!r.renewable,
                    quantity: qty,
                    amount: qty,
                    maxQuantity: maxQ,
                    regenTime: r.regenTime || 0
                };
            });
            const connections = Object.keys(connectionState).filter(k => connectionState[k] > 0);
            farConnections.forEach(c => {
                const key = `${c.x}-${c.y}`;
                if (!connections.includes(key)) connections.push(key);
            });
            const types = Array.from(typeContainer.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
            if (!selectedBg && types.length > 0) {
                const randomBg = await window.electron.getRandomTileImage(types[0]);
                if (randomBg) {
                    selectedBg = randomBg;
                }
            }
            const obj = {
                name: nameInput.value,
                types,
                background: selectedBg,
                items: itemsOut,
                connections,
                modifiers,
                stickers,
                conditions,
                connectionStates: connectionState,
                removeIncoming
            };
            cleanup();
            resolve(obj);
        }
        function onCancel() { cleanup(); resolve(null); }

        saveBtn.addEventListener('click', onSave);
        cancelBtn.addEventListener('click', onCancel);
    });
}

async function populateWorldChips() {
    const container = document.getElementById('world-chips');
    if (!container) return;
    const worlds = await window.electron.listWorlds();
    container.innerHTML = '';
    worlds.forEach(name => {
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.className = 'adventure-chip';
        btn.addEventListener('click', async () => {
            startWorldEditing(name);
            await loadWorld();
        });
        container.appendChild(btn);
    });
}
window.onload = async function () {
    document.getElementById('home-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('info-btn').addEventListener('click', () => {
        window.location.href = 'info.html';
    });
    document.getElementById('random-btn').addEventListener('click', goRandom);
    document.getElementById('world-builder-btn').addEventListener('click', () => {
        window.location.href = 'world-builder.html';
    });
    document.getElementById('adventure-btn').addEventListener('click', () => {
        window.location.href = 'adventure.html';
    });
    document.getElementById('lexicon-btn').addEventListener('click', () => {
        window.location.href = 'lexicon-manager.html';
    });

    await populateWorldChips();

    document.getElementById('create-world-btn').addEventListener('click', async () => {
        const name = await showPrompt('Name for new world:');
        if (!name) return;
        const res = await window.electron.createWorld(name);
        if (!res.success) {
            alert(res.message || 'Failed to create world');
            return;
        }
        startWorldEditing(name);
        await loadWorld();
    });

    document.getElementById('edit-btn').addEventListener('click', () => {
        editMode = !editMode;
        document.getElementById('edit-btn').textContent = editMode ? 'Play Mode' : 'Edit Mode';
    });
    document.getElementById('edit-current-btn').addEventListener('click', async () => {
        const [x, y] = keyToCoords(currentKey);
        await editTile(x, y);
    });
    document.getElementById('add-adjacent-btn').addEventListener('click', () => {
        addAdjacentTile();
    });
    document.getElementById('delete-adjacent-btn').addEventListener('click', () => {
        deleteAdjacentTile();
    });
    document.getElementById('refresh-btn').addEventListener('click', renderGrid);
    document.getElementById('tile-items-btn').addEventListener('click', editTileItems);
    document.getElementById('set-origin-btn').addEventListener('click', () => {
        originKey = currentKey;
        renderGrid();
        saveRegion();
    });
    document.getElementById('toggle-icons-btn').addEventListener('click', () => {
        showTypeIcons = !showTypeIcons;
        document.getElementById('toggle-icons-btn').textContent = showTypeIcons ? 'Hide Type Icons' : 'Show Type Icons';
        renderGrid();
    });

    document.getElementById('import-character-btn').addEventListener('click', importWorldCharacter);
    document.getElementById('inventory-btn').addEventListener('click', () => {
        if (!worldCharacter) return;
        renderWorldInventory();
        document.getElementById('inventory-overlay').classList.remove('hidden');
    });
    document.getElementById('inventory-close').addEventListener('click', () => {
        document.getElementById('inventory-overlay').classList.add('hidden');
    });
    document.getElementById('item-info-close').addEventListener('click', () => {
        document.getElementById('item-info-modal').classList.add('hidden');
    });
    document.getElementById('npc-info-close').addEventListener('click', () => {
        document.getElementById('npc-info-modal').classList.add('hidden');
        playerMovementLocked = false;
    });

    document.getElementById('world-map-btn').addEventListener('click', () => {
        viewMode = 'world';
        updateBounds();
        renderGrid();
	});
    document.getElementById('split-view-btn').addEventListener('click', () => {
        viewMode = 'split';
        updateBounds();
        renderGrid();
    });
    document.getElementById('full-view-btn').addEventListener('click', () => {
        viewMode = 'full';
        updateBounds();
        renderGrid();
    });

    biomePanel = document.getElementById('biome-paint-panel');
    itemPanel = document.getElementById('item-paint-panel');
    zonePanel = document.getElementById('zone-tool-panel');
    currentZoneInfo = document.getElementById('current-zone-info');

    const biomeToggle = document.getElementById('biome-paint-toggle');
    const biomeSelect = document.getElementById('paint-biome-select');
    tileTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        biomeSelect.appendChild(opt);
    });
    biomeToggle.addEventListener('click', () => {
        biomePaintMode = !biomePaintMode;
        biomeToggle.textContent = biomePaintMode ? 'Paint Mode: On' : 'Paint Mode: Off';
    });

    const itemToggle = document.getElementById('item-paint-toggle');
    const itemCat = document.getElementById('item-paint-category');
    const itemSel = document.getElementById('item-paint-item');
    function populateItemSelect(cat) {
        itemSel.innerHTML = '';
        (itemCategories[cat].items || []).forEach(it => {
            const opt = document.createElement('option');
            opt.value = it.key;
            opt.textContent = it.name;
            itemSel.appendChild(opt);
        });
    }
    Object.entries(itemCategories).forEach(([k, v]) => {
        const opt = document.createElement('option');
        opt.value = k;
        opt.textContent = v.name;
        itemCat.appendChild(opt);
    });
    itemCat.addEventListener('change', () => { populateItemSelect(itemCat.value); });
    populateItemSelect(Object.keys(itemCategories)[0]);
    itemToggle.addEventListener('click', () => {
        itemPaintMode = !itemPaintMode;
        itemToggle.textContent = itemPaintMode ? 'Item Paint Mode: On' : 'Item Paint Mode: Off';
    });

    zoneToggle = document.getElementById('zone-tool-toggle');
    zoneToggle.addEventListener('click', () => {
        if (!currentZone) return;
        zoneEditMode = !zoneEditMode;
        zoneToggle.textContent = zoneEditMode ? 'Zone Mode: On' : 'Zone Mode: Off';
    });

    const createZoneBtn = document.getElementById('create-zone-btn');
    createZoneBtn.addEventListener('click', createZone);
    const editZoneBtn = document.getElementById('edit-zone-btn');
    editZoneBtn.addEventListener('click', selectZoneForEdit);
    zoneNameInput = document.getElementById('zone-name-input');
    zoneNameInput.addEventListener('input', () => {
        if (!currentZone) return;
        currentZone.name = zoneNameInput.value;
        saveZone(currentZone);
        renderGrid();
        updateZoneInfo();
    });
    zoneColorInput = document.getElementById('zone-color-input');
    zoneColorInput.addEventListener('input', () => {
        if (!currentZone) return;
        currentZone.color = zoneColorInput.value;
        saveZone(currentZone);
        renderGrid();
    });
    zoneNameWorld = document.getElementById('zone-name-world');
    zoneNameSplit = document.getElementById('zone-name-split');
    zoneNameFull = document.getElementById('zone-name-full');
    [zoneNameWorld, zoneNameSplit, zoneNameFull].forEach(el => {
        el.addEventListener('change', () => {
            if (!currentZone) return;
            currentZone.showName = currentZone.showName || { world: true, split: true, full: true };
            currentZone.showName.world = zoneNameWorld.checked;
            currentZone.showName.split = zoneNameSplit.checked;
            currentZone.showName.full = zoneNameFull.checked;
            saveZone(currentZone);
            renderGrid();
        });
    });

    npcPanel = document.getElementById('npc-manager-panel');
    const spawnToggle = document.getElementById('npc-spawn-toggle');
    saveSpawnBtn = document.getElementById('npc-save-spawn');
    cleanupSpawnBtn = document.getElementById('npc-spawn-cleanup');
    if (spawnToggle) {
        spawnToggle.checked = showSpawnPoints;
        spawnToggle.addEventListener('change', () => {
            showSpawnPoints = spawnToggle.checked;
            Object.entries(tileMap).forEach(([k, e]) => updateTileVisual(e, k));
            if (tileMap[currentKey]) displayTile(tileMap[currentKey].data);
        });
    }
    if (cleanupSpawnBtn) {
        cleanupSpawnBtn.addEventListener('click', async () => {
            if (!editingSpawn) return;
            const npcs = worldNpcs.filter(n => n.spawnPoint === editingSpawn.name);
            for (const n of npcs) await removeNpc(n);
        });
    }

    function populateNpcBlueprints() {
        const sel = document.getElementById('npc-blueprint-select');
        sel.innerHTML = '';
        npcBlueprints.forEach((b, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = b.name || b.species || `NPC ${idx + 1}`;
            sel.appendChild(opt);
        });
        if (npcBlueprints.length > 0) {
            sel.value = '0';
            populateNpcFields(npcBlueprints[0]);
        } else {
            populateNpcFields({});
        }
    }

    function populateNpcFields(bp) {
        const cont = document.getElementById('npc-data-fields');
        cont.innerHTML = '';
        currentNpcBlueprint = JSON.parse(JSON.stringify(bp || {}));
        const data = currentNpcBlueprint;
        const editable = ['description','level','attitude','sightRange','pursuitTime','inventory'];
        function addField(key, val) {
            const wrap = document.createElement('div');
            wrap.className = 'npc-field';
            const label = document.createElement('label');
            label.textContent = key + ':';
            let input;
            if (key === 'attitude') {
                input = document.createElement('select');
                ['Passive','Hostile','Friendly','Fearful'].forEach(optVal => {
                    const opt = document.createElement('option');
                    opt.value = optVal;
                    opt.textContent = optVal;
                    if (val === optVal) opt.selected = true;
                    input.appendChild(opt);
                });
                input.dataset.type = 'string';
            } else if (typeof val === 'object') {
                input = document.createElement('textarea');
                input.value = JSON.stringify(val, null, 2);
                input.rows = 2;
                input.dataset.type = 'json';
            } else if (typeof val === 'number') {
                input = document.createElement('input');
                input.type = 'number';
                input.value = val;
                input.dataset.type = 'number';
            } else if (typeof val === 'boolean') {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.checked = val;
                input.dataset.type = 'boolean';
            } else {
                input = document.createElement('input');
                input.type = 'text';
                input.value = val;
                input.dataset.type = 'string';
            }
            input.dataset.key = key;
            label.appendChild(input);
            wrap.appendChild(label);
            cont.appendChild(wrap);
        }
        editable.forEach(key => { if (key in data) addField(key, data[key]); });
        if (!('description' in data)) addField('description','');
        if (!('level' in data)) addField('level',1);
        if (!('attitude' in data)) addField('attitude', 'Passive');
        if (!('sightRange' in data)) addField('sightRange', 5);
        if (!('pursuitTime' in data)) addField('pursuitTime', 0);
        if (!('inventory' in data)) addField('inventory', []);
    }

    function collectNpcData() {
        const cont = document.getElementById('npc-data-fields');
        const data = JSON.parse(JSON.stringify(currentNpcBlueprint || {}));
        cont.querySelectorAll('input, textarea, select').forEach(inp => {
            const key = inp.dataset.key;
            const type = inp.dataset.type;
            let val;
            if (type === 'number') {
                val = parseFloat(inp.value) || 0;
            } else if (type === 'boolean') {
                val = inp.checked;
            } else if (type === 'json') {
                try { val = JSON.parse(inp.value || '{}'); } catch { val = {}; }
            } else {
                val = inp.value;
            }
            data[key] = val;
        });
        return data;
    }

    function populateSpawnZoneSelect() {
        const sel = document.getElementById('npc-spawn-zone');
        sel.innerHTML = '<option value="none">None</option>';
        Object.values(zones).forEach(z => {
            const opt = document.createElement('option');
            opt.value = z.id;
            opt.textContent = z.name || `Zone ${z.id}`;
            sel.appendChild(opt);
        });
    }

    function renderSpawnBiomeChips(zoneId) {
        const cont = document.getElementById('npc-spawn-biomes');
        cont.innerHTML = '';
        if (!zoneId || zoneId === 'none') return;
        const z = zones[zoneId];
        if (!z) return;
        const types = new Set();
        (z.tiles || []).forEach(k => {
            const t = tileMap[k];
            if (t) (t.data.types || []).forEach(tp => types.add(tp));
        });
        types.forEach(tp => {
            const chip = document.createElement('div');
            chip.className = 'biome-chip selected';
            chip.textContent = tp;
            chip.addEventListener('click', () => chip.classList.toggle('selected'));
            cont.appendChild(chip);
        });
    }

    window.openSpawnerEditor = function(spawn) {
        npcPanel.classList.remove('hidden');
        if (biomePanel) biomePanel.classList.add('hidden');
        if (itemPanel) itemPanel.classList.add('hidden');
        if (zonePanel) zonePanel.classList.add('hidden');
        biomePaintMode = false;
        itemPaintMode = false;
        zoneEditMode = false;
        biomeToggle.textContent = 'Paint Mode: Off';
        itemToggle.textContent = 'Item Paint Mode: Off';
        zoneToggle.textContent = 'Zone Mode: Off';
        populateNpcBlueprints();
        populateSpawnZoneSelect();
        npcMode = 'spawn';
        document.querySelector('input[name="npc-mode"][value="spawn"]').checked = true;
        document.getElementById('npc-manual-options').classList.add('hidden');
        document.getElementById('npc-spawn-options').classList.remove('hidden');
        populateNpcFields(spawn.blueprint);
        document.getElementById('npc-spawn-name').value = spawn.name;
        document.getElementById('npc-spawn-name').disabled = true;
        document.getElementById('npc-spawn-x').value = spawn.tile.x;
        document.getElementById('npc-spawn-y').value = spawn.tile.y;
        document.getElementById('npc-spawn-max').value = spawn.maxPopulation || 1;
        document.getElementById('npc-spawn-period').value = spawn.period || 60;
        document.getElementById('npc-level-min').value = (spawn.levelRange && spawn.levelRange[0]) || 1;
        document.getElementById('npc-level-max').value = (spawn.levelRange && spawn.levelRange[1]) || 1;
        document.getElementById('npc-wander-radius').value = spawn.wanderRadius || 0;
        document.getElementById('npc-spawn-zone').value = spawn.zone || 'none';
        renderSpawnBiomeChips(spawn.zone);
        if (spawn.biomes) {
            const chips = document.querySelectorAll('#npc-spawn-biomes .biome-chip');
            chips.forEach(c => {
                if (spawn.biomes.includes(c.textContent)) c.classList.add('selected');
                else c.classList.remove('selected');
            });
        }
        editingSpawn = spawn;
        if (saveSpawnBtn) saveSpawnBtn.textContent = 'Save Changes';
        if (cleanupSpawnBtn) cleanupSpawnBtn.classList.remove('hidden');
    };

    document.getElementById('npc-blueprint-select').addEventListener('change', e => {
        const idx = parseInt(e.target.value);
        const bp = npcBlueprints[idx];
        populateNpcFields(bp || {});
    });

    document.getElementById('npc-spawn-zone').addEventListener('change', e => {
        renderSpawnBiomeChips(e.target.value);
    });

    document.querySelectorAll('input[name="npc-mode"]').forEach(r => {
        r.addEventListener('change', e => {
            npcMode = e.target.value;
            document.getElementById('npc-manual-options').classList.toggle('hidden', npcMode !== 'manual');
            document.getElementById('npc-spawn-options').classList.toggle('hidden', npcMode !== 'spawn');
        });
    });

    document.getElementById('npc-spawn-btn').addEventListener('click', async () => {
        try {
            const data = collectNpcData();
            const [x, y] = keyToCoords(currentKey);
            data.tile = { x, y };
            data.home = { x, y };
            data.state = 'wander';
            data.spawnPoint = null;
            const res = await window.electron.saveNPC('region1', currentWorld, data);
            if (res && res.success) {
                data._file = res.file;
                if (data.dialogue && data.dialogue.random) scheduleRandomSpeech(data);
                worldNpcs.push(data);
                alert('NPC spawned');
                const key = `${x}-${y}`;
                const entry = tileMap[key];
                if (entry) updateTileVisual(entry, key);
                displayTile(tileMap[currentKey].data);
                renderZoneBorders();
            }
        } catch (err) {
            alert('Invalid NPC data');
        }
    });

    document.getElementById('npc-save-spawn').addEventListener('click', async () => {
        const name = document.getElementById('npc-spawn-name').value.trim();
        if (!name) { alert('Spawner name required'); return; }
        if (!editingSpawn && spawnPoints.some(s => s.name === name)) { alert('Spawner name exists'); return; }
        try {
            const data = collectNpcData();
            const spawn = {
                name,
                tile: {
                    x: parseInt(document.getElementById('npc-spawn-x').value, 10) || 0,
                    y: parseInt(document.getElementById('npc-spawn-y').value, 10) || 0
                },
                maxPopulation: parseInt(document.getElementById('npc-spawn-max').value, 10) || 1,
                period: parseInt(document.getElementById('npc-spawn-period').value, 10) || 60,
                levelRange: [
                    parseInt(document.getElementById('npc-level-min').value, 10) || 1,
                    parseInt(document.getElementById('npc-level-max').value, 10) || 1
                ],
                wanderRadius: parseInt(document.getElementById('npc-wander-radius').value, 10) || 0,
                zone: document.getElementById('npc-spawn-zone').value !== 'none' ? document.getElementById('npc-spawn-zone').value : null,
                biomes: Array.from(document.querySelectorAll('#npc-spawn-biomes .biome-chip.selected')).map(c => c.textContent),
                blueprint: data
            };
            const res = await window.electron.saveNpcSpawn('region1', currentWorld, spawn);
            if (res && res.success) {
                if (editingSpawn) {
                    const oldX = editingSpawn.tile.x;
                    const oldY = editingSpawn.tile.y;
                    const idx = spawnPoints.findIndex(s => s.name === editingSpawn.name);
                    if (idx >= 0) spawnPoints[idx] = spawn;
                    const oldKey = `${oldX}-${oldY}`;
                    const newKey = `${spawn.tile.x}-${spawn.tile.y}`;
                    if (tileMap[oldKey]) updateTileVisual(tileMap[oldKey], oldKey);
                    if (tileMap[newKey]) updateTileVisual(tileMap[newKey], newKey);
                    alert('Spawn point updated');
                } else {
                    spawnPoints.push(spawn);
                    const key = `${spawn.tile.x}-${spawn.tile.y}`;
                    if (tileMap[key]) updateTileVisual(tileMap[key], key);
                    alert('Spawn point created');
                }
                editingSpawn = null;
                document.getElementById('npc-spawn-name').disabled = false;
                if (saveSpawnBtn) saveSpawnBtn.textContent = 'Create Spawn Point';
                if (cleanupSpawnBtn) cleanupSpawnBtn.classList.add('hidden');
            }
        } catch (err) {
            alert('Invalid NPC data');
        }
    });

    const biomeBtn = document.getElementById('biome-painter-btn');
    const itemBtn = document.getElementById('item-painter-btn');
    const zoneBtn = document.getElementById('zone-tool-btn');
    biomeBtn.addEventListener('click', () => {
        const hidden = biomePanel.classList.contains('hidden');
        if (hidden) {
            biomePanel.classList.remove('hidden');
            itemPanel.classList.add('hidden');
            zonePanel.classList.add('hidden');
            npcPanel.classList.add('hidden');
            itemPaintMode = false;
            zoneEditMode = false;
            npcMode = 'manual';
            itemToggle.textContent = 'Item Paint Mode: Off';
            zoneToggle.textContent = 'Zone Mode: Off';
        } else {
            biomePanel.classList.add('hidden');
            biomePaintMode = false;
            biomeToggle.textContent = 'Paint Mode: Off';
        }
    });
    itemBtn.addEventListener('click', () => {
        const hidden = itemPanel.classList.contains('hidden');
        if (hidden) {
            itemPanel.classList.remove('hidden');
            biomePanel.classList.add('hidden');
            zonePanel.classList.add('hidden');
            npcPanel.classList.add('hidden');
            biomePaintMode = false;
            zoneEditMode = false;
            npcMode = 'manual';
            biomeToggle.textContent = 'Paint Mode: Off';
            zoneToggle.textContent = 'Zone Mode: Off';
        } else {
            itemPanel.classList.add('hidden');
            itemPaintMode = false;
            itemToggle.textContent = 'Item Paint Mode: Off';
        }
    });

    zoneBtn.addEventListener('click', () => {
        const hidden = zonePanel.classList.contains('hidden');
        if (hidden) {
            zonePanel.classList.remove('hidden');
            biomePanel.classList.add('hidden');
            itemPanel.classList.add('hidden');
            npcPanel.classList.add('hidden');
            biomePaintMode = false;
            itemPaintMode = false;
            npcMode = 'manual';
            biomeToggle.textContent = 'Paint Mode: Off';
            itemToggle.textContent = 'Item Paint Mode: Off';
        } else {
            zonePanel.classList.add('hidden');
            zoneEditMode = false;
            zoneToggle.textContent = 'Zone Mode: Off';
        }
    });

    const npcBtn = document.getElementById('npc-manager-btn');
    npcBtn.addEventListener('click', () => {
        const hidden = npcPanel.classList.contains('hidden');
        if (hidden) {
            npcPanel.classList.remove('hidden');
            biomePanel.classList.add('hidden');
            itemPanel.classList.add('hidden');
            zonePanel.classList.add('hidden');
            biomePaintMode = false;
            itemPaintMode = false;
            zoneEditMode = false;
            biomeToggle.textContent = 'Paint Mode: Off';
            itemToggle.textContent = 'Item Paint Mode: Off';
            zoneToggle.textContent = 'Zone Mode: Off';
            populateNpcBlueprints();
            populateSpawnZoneSelect();
            updateNpcCoords();
            editingSpawn = null;
            const nameInput = document.getElementById('npc-spawn-name');
            if (nameInput) nameInput.disabled = false;
            if (saveSpawnBtn) saveSpawnBtn.textContent = 'Create Spawn Point';
            if (cleanupSpawnBtn) cleanupSpawnBtn.classList.add('hidden');
        } else {
            npcPanel.classList.add('hidden');
        }
    });

    const mapModule = document.getElementById('map-module');
	const miniMap = document.getElementById('minimap');
    mapModule.addEventListener('mousedown', async (e) => {
        if (playerMovementLocked) return;
        if (!e.target.classList.contains('map-tile')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const key = `${x}-${y}`;
        isPainting = true;
        if (biomePaintMode) {
            const bucket = document.getElementById('paint-bucket-enable').checked;
            if (bucket) {
                await bucketPaint(x, y);
                isPainting = false;
            } else {
                await paintTile(x, y);
            }
            lastKey = key;
            return;
        }
        if (itemPaintMode) {
            await paintItem(x, y);
            lastKey = key;
            return;
        }
        if (zoneEditMode) {
            addTileToZone(x, y);
            lastKey = key;
            return;
        }
        if (editMode) {
            await editTile(x, y);
            lastKey = key;
            return;
        }
        if (showSpawnPoints) {
            const spawn = spawnPoints.find(s => s.tile && s.tile.x === x && s.tile.y === y);
            if (spawn) {
                openSpawnerEditor(spawn);
                lastKey = key;
                return;
            }
        }
        if (!tileMap[key]) return;
        const curEntry = tileMap[currentKey];
        const curCons = (curEntry.data.connections || []);
        if (curCons.includes(key)) {
            stopAutoMove();
            const prevKey = currentKey;
            const prev = tileMap[prevKey];
            if (prev) {
                prev.el.classList.remove('current');
                updateTileVisual(prev, prevKey);
            }
            currentKey = key;
            const cur = tileMap[currentKey];
            cur.el.classList.add('current');
            updateTileVisual(cur, currentKey);
            displayTile(cur.data);
            (cur.data.modifiers || []).forEach(m => {
                if (m.message) alert(m.message);
            });
            renderZoneNames();
            renderZoneBorders();
        } else {
            const path = findPath(currentKey, key, worldInventory || [], (worldCharacter && worldCharacter.abilities) || []);
            if (path && path.length > 1) {
                stopAutoMove();
                startAutoMove(path);
            }
        }
    });
    mapModule.addEventListener('mousemove', async (e) => {
        if (!isPainting || !e.target.classList.contains('map-tile')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const key = `${x}-${y}`;
        if (key === lastKey) return;
        lastKey = key;
        if (biomePaintMode) {
            if (!document.getElementById('paint-bucket-enable').checked) {
                await paintTile(x, y);
            }
        } else if (itemPaintMode) {
            await paintItem(x, y);
        }
    });
    mapModule.addEventListener('mouseup', () => {
        isPainting = false;
        lastKey = null;
    });
    mapModule.addEventListener('mouseleave', () => {
        isPainting = false;
        lastKey = null;
    });
	if (miniMap) {
        miniMap.addEventListener('click', (e) => {
			if (!useSplitView) return;
			if (playerMovementLocked) return;
			const regionW = maxX - minX + 1;
			const regionH = maxY - minY + 1;
			const tileW = miniMap.width / regionW;
			const tileH = miniMap.height / regionH;
			const tx = Math.floor(e.offsetX / tileW) + minX;
			const ty = Math.floor(e.offsetY / tileH) + minY;
			const key = `${tx}-${ty}`;
			if (!tileMap[key]) return;
			const path = findPath(currentKey, key, worldInventory || [], (worldCharacter && worldCharacter.abilities) || []);
			if (path && path.length > 1) {
				stopAutoMove();
				startAutoMove(path);
			}
		});
	}
    window.addEventListener('keydown', (e) => {
        if (!document.getElementById('tile-editor-overlay').classList.contains('hidden')) return;
        if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
        if (playerMovementLocked) return;
        let dir = null;
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') dir = 'up';
        else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') dir = 'down';
        else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') dir = 'left';
        else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') dir = 'right';
        if (dir) {
            e.preventDefault();
            moveDirection(dir);
        }
    });
    window.addEventListener('resize', renderGrid);

    setInterval(tickRenewables, 1000);
    setInterval(tickSpawners, 1000);
    setInterval(tickNpcMovement, 1000);
    setInterval(updateHostileTimer, 250);
};

async function loadWorld() {
	await loadLexiconItems();
    const region = await window.electron.getMapRegion('region1', currentWorld);
    tileMap = {};
    region.tiles.forEach(t => {
        const data = { ...t };
        if (data.type && !data.types) data.types = [data.type];
        delete data.type;
        data.items = (data.items || []).map(i => ({
            ...i,
            quantity: i.quantity != null ? i.quantity : (i.amount || 0),
            maxQuantity: i.maxQuantity != null ? i.maxQuantity : (i.quantity != null ? i.quantity : (i.amount || 0)),
            regenTime: i.regenTime || 0,
            _lastRegen: Date.now()
        }));
        data.stickers = data.stickers || [];
        data.conditions = data.conditions || {};
        tileMap[`${t.x}-${t.y}`] = { data };
        if (data.start) originKey = `${t.x}-${t.y}`;
    });
    const zoneList = await window.electron.getZones('region1', currentWorld);
    zones = {};
    zoneList.forEach(z => {
        z.tiles = (z.tiles || []).map(t => `${t.x}-${t.y}`);
        z.showName = z.showName || { world: true, split: true, full: true };
        zones[z.id] = z;
    });
    currentZone = null;
    zoneToggle && (zoneToggle.disabled = true);
    zoneEditMode = false;
    if (zoneToggle) zoneToggle.textContent = 'Zone Mode: Off';
    updateZoneInfo();
    const savedPos = await window.electron.getWorldPosition(currentWorld);
    let startKey = originKey;
    if (savedPos) {
        const key = `${savedPos.x}-${savedPos.y}`;
        if (tileMap[key]) startKey = key;
    }
    currentKey = startKey;
    updateBounds();
    renderGrid();
    const [sx, sy] = keyToCoords(currentKey);
    window.electron.saveWorldPosition(currentWorld, { x: sx, y: sy });
	
    if (biomePanel) biomePanel.classList.add('hidden');
    if (itemPanel) itemPanel.classList.add('hidden');
    if (npcPanel) npcPanel.classList.add('hidden');

    const npcData = await window.electron.getNPCs('region1', currentWorld);
    worldNpcs = (npcData.npcs || []).map(n => {
        if (n.tile && !n.home) n.home = { ...n.tile };
        if (!n.state) n.state = 'wander';
        if (n.dialogue && n.dialogue.random) scheduleRandomSpeech(n);
        return n;
    });
    spawnPoints = npcData.spawns || [];
	renderGrid();
	
    worldCharacter = await window.electron.getWorldCharacter(currentWorld);
    if (worldCharacter) {
        initCharacterAbilities();
        worldInventory = await window.electron.getWorldInventory(currentWorld);
        recomputeTempAbilities();
        document.getElementById('character-name').textContent = worldCharacter.name || '';
        document.getElementById('inventory-btn').classList.remove('hidden');
        document.getElementById('mini-inventory-grid').classList.remove('hidden');
        renderMiniInventory();
        renderStats();
    } else {
        worldInventory = [];
        document.getElementById('character-name').textContent = '';
        document.getElementById('inventory-btn').classList.add('hidden');
        document.getElementById('mini-inventory-grid').classList.add('hidden');
        document.getElementById('profile-stats').classList.add('hidden');
    }
}

function renderGrid() {
    const mapGrid = document.getElementById('map-module');
    const miniWrap = document.getElementById('minimap-container');
    const mapView = mapGrid.parentElement;
    mapGrid.classList.toggle('world-mode', viewMode === 'world');
    mapGrid.innerHTML = '';
    if (miniWrap) miniWrap.classList.toggle('hidden', !useSplitView);
    const rect = mapView.getBoundingClientRect();
    if (gridWidth === 0 || gridHeight === 0) return;

    if (useSplitView) {
        const [cx, cy] = keyToCoords(currentKey);
        viewMinX = cx - 4;
        viewMaxX = cx + 4;
        viewMinY = cy - 4;
        viewMaxY = cy + 4;
        if (viewMinX < minX) { viewMaxX += (minX - viewMinX); viewMinX = minX; }
        if (viewMaxX > maxX) { viewMinX -= (viewMaxX - maxX); viewMaxX = maxX; }
        if (viewMinY < minY) { viewMaxY += (minY - viewMinY); viewMinY = minY; }
        if (viewMaxY > maxY) { viewMinY -= (viewMaxY - maxY); viewMaxY = maxY; }
        viewMinX = Math.max(minX, viewMinX);
        viewMaxX = Math.min(maxX, viewMaxX);
        viewMinY = Math.max(minY, viewMinY);
        viewMaxY = Math.min(maxY, viewMaxY);
    } else {
        viewMinX = minX;
        viewMaxX = maxX;
        viewMinY = minY;
        viewMaxY = maxY;
    }

    const displayWidth = viewMaxX - viewMinX + 1;
    const displayHeight = viewMaxY - viewMinY + 1;
    const gap = viewMode === 'world' ? 0 : tileGap;
    const rawSize = Math.min(
        (rect.width - gap * (displayWidth - 1)) / displayWidth,
        (rect.height - gap * (displayHeight - 1)) / displayHeight
    );
    const step = 4;
    tileSize = Math.max(step, Math.floor(rawSize / step) * step);
    const totalWidth = tileSize * displayWidth + gap * (displayWidth - 1);
    const totalHeight = tileSize * displayHeight + gap * (displayHeight - 1);
    mapGrid.style.gap = `${gap}px`;
    mapGrid.style.gridTemplateColumns = `repeat(${displayWidth}, ${tileSize}px)`;
    mapGrid.style.gridTemplateRows = `repeat(${displayHeight}, ${tileSize}px)`;
    mapGrid.style.width = `${totalWidth}px`;
    mapGrid.style.height = `${totalHeight}px`;

    for (let y = viewMinY; y <= viewMaxY; y++) {
        for (let x = viewMinX; x <= viewMaxX; x++) {
            const key = `${x}-${y}`;
            const entry = tileMap[key];
            const div = document.createElement('div');
            div.dataset.x = x;
            div.dataset.y = y;
            if (entry) {
                div.className = 'map-tile';
                entry.el = div;
                if (key === currentKey) {
                    div.classList.add('current');
                }
                updateTileVisual(entry, key);
            } else {
                div.className = 'map-tile blank';
            }
            mapGrid.appendChild(div);
        }
    }
    drawConnections();
    if (tileMap[currentKey]) {
        displayTile(tileMap[currentKey].data);
    }
    renderMinimap();
    renderZoneBorders();
    renderZoneNames();
}

function updateTileVisual(entry, key) {
    if (!entry || !entry.el) return;
    const types = entry.data.types || (entry.data.type ? [entry.data.type] : []);
    const [x, y] = keyToCoords(key);
    entry.el.innerHTML = '';
    if (entry.el.classList.contains('current')) {
        const cur = document.createElement('div');
        cur.className = 'current-marker';
        cur.textContent = '🧍';
        entry.el.appendChild(cur);
    }

    if (entry.data.background) {
        entry.el.style.backgroundImage = `url(resources/map/tiles/${entry.data.background})`;
        entry.el.style.backgroundSize = '100% 100%';
        entry.el.style.backgroundRepeat = 'no-repeat';
        entry.el.style.backgroundColor = '';
    } else {
        entry.el.style.backgroundImage = 'none';
        entry.el.style.backgroundColor = tileColors[types[0]] || '#111';
    }

    if (viewMode !== 'world') {
        (entry.data.stickers || []).forEach(s => {
            if (!s.icon) return;
            const img = document.createElement('img');
            img.className = 'tile-sticker-img';
            img.src = `resources/map/stickers/${s.icon}`;
            entry.el.appendChild(img);
        });
    }
	if (showSpawnPoints && spawnPoints.some(s => s.tile && s.tile.x === x && s.tile.y === y)) {
                const img = document.createElement('img');
                img.className = 'spawner-icon';
                img.src = 'resources/map/stickers/spawner.png';
                entry.el.appendChild(img);
        }
    const npcsHere = worldNpcs.filter(n => n.tile && n.tile.x === x && n.tile.y === y);
    npcsHere.forEach(npc => {
        if (!npc.icon) return;
        const img = document.createElement('img');
        img.className = 'npc-icon';
        img.src = npc.icon;
        entry.el.appendChild(img);
        if (npc._bubbleEl) {
            scaleNpcBubble(npc._bubbleEl);
            entry.el.appendChild(npc._bubbleEl);
        }
    });
    (entry.data.modifiers || []).forEach(m => {
        if (!m.icon) return;
        const img = document.createElement('img');
        img.className = 'tile-mod-img';
        img.src = `resources/map/tilemod/${m.icon}`;
        entry.el.appendChild(img);
    });

    (entry.data.items || []).forEach(r => {
        const qty = r.quantity != null ? r.quantity : (r.amount || 0);
        if (qty <= 0) return;
        const def = itemByKey[r.key] || itemDefs.find(d => d.name === r.name);
        if (!def || !def.icon) return;
        const img = document.createElement('img');
        img.className = 'tile-resource-img';
        img.src = resolveItemIcon(def.icon);
        entry.el.appendChild(img);
    });

    if (key === originKey) {
        const star = document.createElement('div');
        star.className = 'origin-marker';
        star.textContent = '⭐';
        star.style.fontSize = `${tileSize * 0.05}px`;
        star.style.zIndex = 2;
        entry.el.appendChild(star);
    }

    if (showTypeIcons && types.length) {
        const iconEl = document.createElement('div');
        iconEl.className = 'type-icons';
        iconEl.textContent = types.map(t => tileIcons[t] || '').join('');
        iconEl.style.fontSize = `${tileSize * 0.25}px`;
        iconEl.style.zIndex = 2;
        entry.el.appendChild(iconEl);
    }
}

async function editTile(x, y) {
    const key = `${x}-${y}`;
    let entry = tileMap[key];
    if (!entry) {
        const div = document.querySelector(`.map-tile[data-x='${x}'][data-y='${y}']`);
        if (div) div.classList.remove('blank');
        entry = { el: div, data: { name: `Tile ${x}-${y}`, types: [], background: '', items: [], connections: [], modifiers: [], stickers: [], conditions: [] } };
        tileMap[key] = entry;
    }

    const oldConnections = new Set(entry.data.connections || []);
    const data = await openTileEditor(entry.data, x, y);
    if (!data) return;
    entry.data.name = data.name;
    entry.data.types = data.types;
    entry.data.background = data.background;
    entry.data.items = data.items;
    entry.data.connections = data.connections;
    entry.data.modifiers = data.modifiers;
    entry.data.stickers = data.stickers;
	entry.data.conditions = data.conditions || {};
    updateTileVisual(entry, key);
    Object.entries(data.connectionStates).forEach(([k, state]) => {
        const neighbor = tileMap[k];
        if (!neighbor) return;
        if (state === 1) {
            if (!(neighbor.data.connections || []).includes(key)) {
                neighbor.data.connections.push(key);
            }
        } else if (state === 2) {
            neighbor.data.connections = (neighbor.data.connections || []).filter(c => c !== key);
        } else if (data.removeIncoming[k]) {
            neighbor.data.connections = (neighbor.data.connections || []).filter(c => c !== key);
        }
    });
    const handled = new Set(Object.keys(data.connectionStates));
    const newConnections = new Set(entry.data.connections || []);
    oldConnections.forEach(k => {
        if (handled.has(k)) return;
        if (!newConnections.has(k)) {
            const neighbor = tileMap[k];
            if (neighbor) {
                neighbor.data.connections = (neighbor.data.connections || []).filter(c => c !== key);
            }
        }
    });
    newConnections.forEach(k => {
        if (handled.has(k)) return;
        if (!oldConnections.has(k)) {
            const neighbor = tileMap[k];
            if (neighbor) {
                neighbor.data.connections = neighbor.data.connections || [];
                if (!neighbor.data.connections.includes(key)) {
                    neighbor.data.connections.push(key);
                }
            }
        }
    });
    displayTile(entry.data);
    renderGrid();
    saveRegion();
}

function drawConnections() {
    document.querySelectorAll('.map-connection').forEach(el => el.remove());
    const mapGrid = document.getElementById('map-module');
    const drawn = new Set();
    const gap = viewMode === 'world' ? 0 : tileGap;
    for (const [key, entry] of Object.entries(tileMap)) {
        const [x, y] = keyToCoords(key);
        if (viewMode !== 'world' && (x < viewMinX || x > viewMaxX || y < viewMinY || y > viewMaxY)) continue;
        (entry.data.connections || []).forEach(conn => {
            const pair = [key, conn].sort().join('|');
            if (drawn.has(pair)) return;
            drawn.add(pair);
            const target = tileMap[conn];
            if (!target) return;
            const [nx, ny] = keyToCoords(conn);
            if (viewMode !== 'world' && (nx < viewMinX || nx > viewMaxX || ny < viewMinY || ny > viewMaxY)) return;
            const dist = Math.max(Math.abs(nx - x), Math.abs(ny - y));
            if (viewMode === 'world' && dist <= 1) return;
            const x1 = (x - viewMinX) * (tileSize + gap) + tileSize / 2;
            const y1 = (y - viewMinY) * (tileSize + gap) + tileSize / 2;
            const x2 = (nx - viewMinX) * (tileSize + gap) + tileSize / 2;
            const y2 = (ny - viewMinY) * (tileSize + gap) + tileSize / 2;
            const length = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            const line = document.createElement('div');
            line.className = 'map-connection';
            line.style.width = `${length}px`;
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.transform = `rotate(${angle}deg)`;
            if (viewMode === 'world') line.style.zIndex = 3;
            mapGrid.appendChild(line);
        });
    }
}

function drawDirectionArrows() {
    document.querySelectorAll('.direction-arrow').forEach(el => el.remove());
    const entry = tileMap[currentKey];
    if (!entry) return;
    const [cx, cy] = keyToCoords(currentKey);
    const dirs = {};
    (entry.data.connections || []).forEach(k => {
        const [nx, ny] = keyToCoords(k);
        const dx = nx - cx;
        const dy = ny - cy;
        if (dx === 0 && dy < 0) {
            const dist = -dy;
            if (!dirs.up || dist < dirs.up.dist) dirs.up = { dist };
        } else if (dx === 0 && dy > 0) {
            const dist = dy;
            if (!dirs.down || dist < dirs.down.dist) dirs.down = { dist };
        } else if (dy === 0 && dx > 0) {
            const dist = dx;
            if (!dirs.right || dist < dirs.right.dist) dirs.right = { dist };
        } else if (dy === 0 && dx < 0) {
            const dist = -dx;
            if (!dirs.left || dist < dirs.left.dist) dirs.left = { dist };
        } else if (dx < 0 && dy < 0) {
            const dist = Math.max(-dx, -dy);
            if (!dirs.upLeft || dist < dirs.upLeft.dist) dirs.upLeft = { dist };
        } else if (dx > 0 && dy < 0) {
            const dist = Math.max(dx, -dy);
            if (!dirs.upRight || dist < dirs.upRight.dist) dirs.upRight = { dist };
        } else if (dx < 0 && dy > 0) {
            const dist = Math.max(-dx, dy);
            if (!dirs.downLeft || dist < dirs.downLeft.dist) dirs.downLeft = { dist };
        } else if (dx > 0 && dy > 0) {
            const dist = Math.max(dx, dy);
            if (!dirs.downRight || dist < dirs.downRight.dist) dirs.downRight = { dist };
        }
    });
    const mapGrid = document.getElementById('map-module');
    const gap = viewMode === 'world' ? 0 : tileGap;
    const baseX = (cx - viewMinX) * (tileSize + gap);
    const baseY = (cy - viewMinY) * (tileSize + gap);
    const size = Math.floor(tileSize * 0.3);

    function placeArrow(symbol, colorClass, left, top) {
        const arrow = document.createElement('div');
        arrow.textContent = symbol;
        arrow.className = `direction-arrow ${colorClass}`;
        arrow.style.width = `${size}px`;
        arrow.style.height = `${size}px`;
        arrow.style.fontSize = `${size}px`;
        arrow.style.left = `${left}px`;
        arrow.style.top = `${top}px`;
        mapGrid.appendChild(arrow);
    }

    if (dirs.up) {
        placeArrow('↑', dirs.up.dist > 1 ? 'blue' : 'yellow',
            baseX + tileSize / 2 - size / 2,
            baseY - size / 2);
    }
    if (dirs.down) {
        placeArrow('↓', dirs.down.dist > 1 ? 'blue' : 'yellow',
            baseX + tileSize / 2 - size / 2,
            baseY + tileSize - size / 2);
    }
    if (dirs.left) {
        placeArrow('←', dirs.left.dist > 1 ? 'blue' : 'yellow',
            baseX - size / 2,
            baseY + tileSize / 2 - size / 2);
    }
    if (dirs.right) {
        placeArrow('→', dirs.right.dist > 1 ? 'blue' : 'yellow',
            baseX + tileSize - size / 2,
            baseY + tileSize / 2 - size / 2);
    }
    if (dirs.upLeft) {
        placeArrow('↖', dirs.upLeft.dist > 1 ? 'blue' : 'yellow',
            baseX - size / 2,
            baseY - size / 2);
    }
    if (dirs.upRight) {
        placeArrow('↗', dirs.upRight.dist > 1 ? 'blue' : 'yellow',
            baseX + tileSize - size / 2,
            baseY - size / 2);
    }
    if (dirs.downLeft) {
        placeArrow('↙', dirs.downLeft.dist > 1 ? 'blue' : 'yellow',
            baseX - size / 2,
            baseY + tileSize - size / 2);
    }
    if (dirs.downRight) {
        placeArrow('↘', dirs.downRight.dist > 1 ? 'blue' : 'yellow',
            baseX + tileSize - size / 2,
            baseY + tileSize - size / 2);
    }
}

function renderMinimap() {
    const wrap = document.getElementById('minimap-container');
    const canvas = document.getElementById('minimap');
    if (!wrap || !canvas || !useSplitView) return;
    const regionW = maxX - minX + 1;
    const regionH = maxY - minY + 1;
    const maxW = wrap.clientWidth;
    const maxH = wrap.clientHeight;
    const tileSize = Math.max(1, Math.floor(Math.min(maxW / regionW, maxH / regionH)));
    const w = tileSize * regionW;
    const h = tileSize * regionH;
    canvas.width = w;
    canvas.height = h;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
            const entry = tileMap[`${x}-${y}`];
            const px = (x - minX) * tileSize;
            const py = (y - minY) * tileSize;
            if (entry && entry.data.background) {
                const bg = entry.data.background;
                let img = minimapImageCache[bg];
                if (!img) {
                    img = new Image();
                    img.src = `resources/map/tiles/${bg}`;
                    minimapImageCache[bg] = img;
                    img.onload = renderMinimap;
                }
                if (img.complete) {
                    ctx.drawImage(img, px, py, tileSize, tileSize);
                    continue;
                }
            }
            let color = '#000';
            if (entry) {
                const types = entry.data.types || (entry.data.type ? [entry.data.type] : []);
                color = tileColors[types[0]] || '#111';
            }
            ctx.fillStyle = color;
            ctx.fillRect(px, py, tileSize, tileSize);
        }
    }
    const [cx, cy] = keyToCoords(currentKey);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = Math.max(2, tileSize / 5);
    ctx.strokeRect((cx - minX) * tileSize, (cy - minY) * tileSize, tileSize, tileSize);
}

function goToTile(target) {
    const inv = worldInventory || [];
    const abilities = (worldCharacter && worldCharacter.abilities) || [];
    const targetEntry = tileMap[target];
    if (targetEntry && !TileConditions.isPassable(targetEntry.data, inv, abilities)) {
        alert('You cannot traverse this tile.');
        return;
    }
    const npcThere = worldNpcs.find(n => n.tile && `${n.tile.x}-${n.tile.y}` === target);
    if (npcThere) {
        if (npcThere.attitude === 'Hostile' && Date.now() > hostileInteractionCooldown) {
            showHostileModal(npcThere);
        } else {
            alert('The tile is occupied.');
        }
        return;
    }
    const prevKey = currentKey;
    const prevZoneIds = activeZoneIds.slice();
    currentKey = target;
    activeZoneIds = findZonesByTile(currentKey).map(z => z.id);
    const enteredIds = activeZoneIds.filter(id => !prevZoneIds.includes(id));
    if (enteredIds.length && zones[enteredIds[0]]) {
        showZoneEntry(zones[enteredIds[0]]);
    }
    if (useSplitView) {
        renderGrid();
    } else {
        const prev = tileMap[prevKey];
        if (prev) {
            prev.el.classList.remove('current');
            updateTileVisual(prev, prevKey);
        }
        const curEntry = tileMap[currentKey];
        if (curEntry) {
            curEntry.el.classList.add('current');
            updateTileVisual(curEntry, currentKey);
        }
    }
    const cur = tileMap[currentKey];
    if (cur) {
        displayTile(cur.data);
        (cur.data.modifiers || []).forEach(m => { if (m.message) alert(m.message); });
    }
    renderZoneNames();
    renderZoneBorders();
    const [sx, sy] = keyToCoords(currentKey);
    window.electron.saveWorldPosition(currentWorld, { x: sx, y: sy });
}


function findPath(startKey, targetKey, inv = worldInventory || [], abilities = (worldCharacter && worldCharacter.abilities) || []) {
    const open = new Set([startKey]);
    const cameFrom = {};
    const gScore = { [startKey]: 0 };
    const fScore = { [startKey]: heuristic(startKey, targetKey) };
    while (open.size) {
        let current = null;
        let best = Infinity;
        for (const k of open) {
            const score = fScore[k] != null ? fScore[k] : Infinity;
            if (score < best) { best = score; current = k; }
        }
        if (current === targetKey) {
            const path = [current];
            while (cameFrom[current]) { current = cameFrom[current]; path.push(current); }
            return path.reverse();
        }
        open.delete(current);
        const entry = tileMap[current];
        if (!entry) continue;
        for (const next of entry.data.connections || []) {
            const nextEntry = tileMap[next];
            if (!nextEntry || !TileConditions.isPassable(nextEntry.data, inv, abilities)) continue;
            const tentativeG = (gScore[current] ?? Infinity) + moveCost(current, next);
            if (tentativeG < (gScore[next] ?? Infinity)) {
                cameFrom[next] = current;
                gScore[next] = tentativeG;
                fScore[next] = tentativeG + heuristic(next, targetKey);
                open.add(next);
            }
        }
    }
    return null;
}

function moveCost(aKey, bKey) {
    const [ax, ay] = keyToCoords(aKey);
    const [bx, by] = keyToCoords(bKey);
    return (ax !== bx && ay !== by) ? 1.4 : 1;
}

function heuristic(aKey, bKey) {
    const [ax, ay] = keyToCoords(aKey);
    const [bx, by] = keyToCoords(bKey);
    return Math.abs(ax - bx) + Math.abs(ay - by);
}

function stopAutoMove() {
    if (autoMoveTimer) {
        clearTimeout(autoMoveTimer);
        autoMoveTimer = null;
    }
    isAutoMoving = false;
}

function startAutoMove(path, index = 1) {
    if (index >= path.length) {
        isAutoMoving = false;
        return;
    }
    isAutoMoving = true;
    goToTile(path[index]);
    autoMoveTimer = setTimeout(() => startAutoMove(path, index + 1), 250);
}

function moveDirection(dir) {
    if (playerMovementLocked) return;
    const entry = tileMap[currentKey];
    if (!entry) return;
    const [cx, cy] = keyToCoords(currentKey);
    let target = null;
    let best = Infinity;
    (entry.data.connections || []).forEach(k => {
        const [nx, ny] = keyToCoords(k);
        const dx = nx - cx;
        const dy = ny - cy;
        if (dir === 'up' && dx === 0 && dy < 0 && -dy < best) { best = -dy; target = k; }
        if (dir === 'down' && dx === 0 && dy > 0 && dy < best) { best = dy; target = k; }
        if (dir === 'left' && dy === 0 && dx < 0 && -dx < best) { best = -dx; target = k; }
        if (dir === 'right' && dy === 0 && dx > 0 && dx < best) { best = dx; target = k; }
    });
    if (!target) return;
    stopAutoMove();
    goToTile(target);
}

function displayTile(tile, key = currentKey) {
    const [x, y] = keyToCoords(key);
    document.getElementById('tile-name').textContent = tile.name || '';
    document.getElementById('tile-coords').textContent = `Coordinates: ${x}, ${y}`;
    const types = tile.types || (tile.type ? [tile.type] : []);
    document.getElementById('tile-type').textContent = types.length ? `Type: ${types.join(', ')}` : '';
    const itemList = document.getElementById('tile-items');
    if (itemList) {
        itemList.innerHTML = '';
        (tile.items || []).forEach((r, idx) => {
            const li = document.createElement('li');
            const def = itemByKey[r.key] || itemDefs.find(d => d.name === r.name);
            if (def) {
                const img = document.createElement('img');
                img.src = r.image || resolveItemIcon(def && def.icon);
                img.className = 'item-icon';
                if (r.renewable) {
                    img.style.borderRadius = '50%';
                    img.style.backgroundColor = getRenewableColor(r);
                }
                li.appendChild(img);
            }
            const qty = r.quantity != null ? r.quantity : (r.amount || 0);
            const text = document.createTextNode(`${r.name} x${qty} ${r.renewable ? '(Renewable)' : '(Finite)'}`);
            li.appendChild(text);
                        if (worldCharacter) {
                                const pickBtn = document.createElement('button');
                                pickBtn.textContent = 'Pick Up';
                                pickBtn.addEventListener('click', () => pickUpTileItem(idx));
                                li.appendChild(pickBtn);
                                const delBtn = document.createElement('button');
                                delBtn.textContent = 'Destroy';
                                delBtn.addEventListener('click', () => destroyTileItem(idx));
                                li.appendChild(delBtn);
                        }
            itemList.appendChild(li);
        });
    }
    const shortDiv = document.getElementById('tile-shortcuts');
    const shortList = document.getElementById('shortcut-list');
    if (shortDiv && shortList) {
        shortList.innerHTML = '';
        const [cx, cy] = keyToCoords(key);
        const far = (tile.connections || []).filter(k => {
            const [nx, ny] = keyToCoords(k);
            return Math.abs(nx - cx) > 1 || Math.abs(ny - cy) > 1;
        });
        if (far.length) {
            shortDiv.classList.remove('hidden');
            far.forEach(k => {
                const [nx, ny] = keyToCoords(k);
                const li = document.createElement('li');
                const btn = document.createElement('button');
                btn.textContent = `(${nx}, ${ny})`;
                btn.addEventListener('click', () => goToTile(k));
                li.appendChild(btn);
                shortList.appendChild(li);
            });
        } else {
            shortDiv.classList.add('hidden');
        }
    }
    const inspectWrap = document.getElementById('npc-inspect-buttons');
    const editSpawnerBtn = document.getElementById('edit-spawner-btn');
    const deleteSpawnerBtn = document.getElementById('delete-spawner-btn');
    if (inspectWrap && worldCharacter) {
        const npcsHere = worldNpcs.filter(n => n.tile && n.tile.x === x && n.tile.y === y);
        const hostileHere = npcsHere.find(n => n.attitude === 'Hostile');
        if (hostileHere && Date.now() > hostileInteractionCooldown) {
            inspectWrap.classList.add('hidden');
            showHostileModal(hostileHere);
            return;
        }
        const connections = (tileMap[key] && tileMap[key].data.connections) || [];
        const npcsAdj = worldNpcs.filter(n => {
            if (!n.tile) return false;
            const nk = `${n.tile.x}-${n.tile.y}`;
            return connections.includes(nk);
        });
        const npcsAround = [...npcsHere, ...npcsAdj.filter(n => !npcsHere.includes(n))];
        inspectWrap.innerHTML = '';
        if (npcsAround.length) {
            inspectWrap.classList.remove('hidden');
            npcsAround.forEach(npc => {
                const name = npc.name || npc.species || 'NPC';
                const lvl = npc.level != null ? npc.level : 1;
                const wrapNpc = document.createElement('div');
                const btn = document.createElement('button');
                btn.textContent = `Interact with ${name} L${lvl}`;
                btn.addEventListener('click', () => {
                    playerMovementLocked = true;
                    stopAutoMove();
                    showNpcInfoModal(npc);
                });
                const delBtn = document.createElement('button');
                delBtn.textContent = `Destroy ${name}`;
                delBtn.className = 'destroy-btn';
                delBtn.addEventListener('click', async () => {
                    triggerNpcDialog(npc, 'destroyed', async () => {
                        await removeNpc(npc);
                        if (npc.attitude === 'Hostile') {
                            hostilePursuitShield = Date.now() + 10000;
                            hostileTimerEnd = hostilePursuitShield;
                        }
                    });
                });
                wrapNpc.appendChild(btn);
                wrapNpc.appendChild(delBtn);
                inspectWrap.appendChild(wrapNpc);
            });
        } else {
            inspectWrap.classList.add('hidden');
        }
    } else if (inspectWrap) {
        inspectWrap.classList.add('hidden');
        inspectWrap.innerHTML = '';
    }
    if (editSpawnerBtn && deleteSpawnerBtn) {
        const spawn = showSpawnPoints ? spawnPoints.find(s => s.tile && s.tile.x === x && s.tile.y === y) : null;
        if (spawn) {
            editSpawnerBtn.classList.remove('hidden');
            deleteSpawnerBtn.classList.remove('hidden');
            editSpawnerBtn.onclick = () => openSpawnerEditor(spawn);
            deleteSpawnerBtn.onclick = async () => {
                const res = await window.electron.deleteNpcSpawn('region1', currentWorld, spawn.name);
                if (res && res.success) {
                    const idx = spawnPoints.findIndex(s => s.name === spawn.name);
                    if (idx >= 0) spawnPoints.splice(idx, 1);
                    const key = `${spawn.tile.x}-${spawn.tile.y}`;
                    if (tileMap[key]) updateTileVisual(tileMap[key], key);
                    if (currentKey === key && tileMap[currentKey]) displayTile(tileMap[currentKey].data);
                    editSpawnerBtn.classList.add('hidden');
                    deleteSpawnerBtn.classList.add('hidden');
                }
            };
        } else {
            editSpawnerBtn.classList.add('hidden');
            deleteSpawnerBtn.classList.add('hidden');
        }
    }
    drawDirectionArrows();
}

function pickUpTileItem(idx) {
        const entry = tileMap[currentKey];
        if (!entry || !entry.data.items || !entry.data.items[idx]) return;
        const ref = entry.data.items[idx];
        const def = itemByKey[ref.key] || itemDefs.find(d => d.name === ref.name) || {};
        const base = { ...def, ...ref };
        const stackable = base.stackable !== false;
        const maxStack = base.maxStack || 1;
        let remaining = base.quantity != null ? base.quantity : (base.amount || 1);
        const maxSlots = getInventoryCapacity();

        if (stackable) {
                // Fill existing stacks
                worldInventory.forEach(invItem => {
                        if (remaining <= 0) return;
                        if (invItem && invItem.key === base.key && invItem.stackable) {
                                const room = invItem.maxStack - (invItem.quantity || 0);
                                if (room > 0) {
                                        const add = Math.min(room, remaining);
                                        invItem.quantity = (invItem.quantity || 0) + add;
                                        remaining -= add;
                                }
                        }
                });
                // Create new stacks
                while (remaining > 0) {
                        let slot = worldInventory.findIndex(i => !i);
                        if (slot === -1) {
                                if (worldInventory.length < maxSlots) {
                                        slot = worldInventory.length;
                                } else {
                                        break;
                                }
                        }
                        const add = Math.min(maxStack, remaining);
                        const item = { ...base, quantity: add, amount: add, stackable: true, maxStack };
                        if (!item.image && def.icon) {
                                item.image = resolveItemIcon(def.icon);
                        }
                        worldInventory[slot] = item;
                        remaining -= add;
                }
        } else {
                // Non-stackable items occupy separate slots
                while (remaining > 0) {
                        let slot = worldInventory.findIndex(i => !i);
                        if (slot === -1) {
                                if (worldInventory.length < maxSlots) {
                                        slot = worldInventory.length;
                                } else {
                                        break;
                                }
                        }
                        const item = { ...base, quantity: 1, amount: 1, stackable: false, maxStack: 1 };
                        if (!item.image && def.icon) {
                                item.image = resolveItemIcon(def.icon);
                        }
                        worldInventory[slot] = item;
                        remaining--;
                }
        }

        const leftover = remaining;
        if (leftover > 0) {
                ref.quantity = leftover;
                ref.amount = leftover;
                if (ref.renewable) {
					const maxVal = base.quantity != null ? base.quantity : (base.amount || 1);
					if (ref.maxQuantity == null) ref.maxQuantity = maxVal;
					if (ref.maxAmount == null) ref.maxAmount = maxVal;
				}
		} else {
			if (ref.renewable) {
				const maxVal = base.quantity != null ? base.quantity : (base.amount || 1);
				if (ref.maxQuantity == null) ref.maxQuantity = maxVal;
				if (ref.maxAmount == null) ref.maxAmount = maxVal;
				ref.quantity = 0;
				ref.amount = 0;
				ref._lastRegen = Date.now();
			} else {
                entry.data.items.splice(idx, 1);
			}
		}
        renderWorldInventory();
        displayTile(entry.data);
        saveRegion();
        if (window.electron.saveWorldInventory) {
                window.electron.saveWorldInventory(currentWorld, worldInventory);
        }
        recomputeTempAbilities();
        if (leftover > 0) {
                alert('Inventory full');
        }
}

function destroyTileItem(idx) {
        const entry = tileMap[currentKey];
        if (!entry || !entry.data.items || !entry.data.items[idx]) return;
        entry.data.items.splice(idx, 1);
        updateTileVisual(entry, currentKey);
        displayTile(entry.data);
        saveRegion();
}

function dropInventoryItem(index) {
    const entry = tileMap[currentKey];
    if (!entry) return;
    const item = worldInventory[index];
    if (!item) return;
    entry.data.items = entry.data.items || [];
    const ref = {
        key: item.key,
        name: item.name,
        rarity: item.rarity,
        description: item.description,
        value: item.value,
        stats: item.stats,
        abilities: item.abilities,
        image: item.image,
        renewable: false,
        regenTime: 0,
        _lastRegen: Date.now()
    };
    if (item.quantity != null) {
        ref.amount = item.quantity;
        ref.quantity = item.quantity;
        ref.maxQuantity = item.quantity;
    }
    entry.data.items.push(ref);
    updateTileVisual(entry, currentKey);
    worldInventory.splice(index, 1);
    renderWorldInventory();
    displayTile(entry.data);
    saveRegion();
    if (window.electron.saveWorldInventory) {
        window.electron.saveWorldInventory(currentWorld, worldInventory);
    }
    recomputeTempAbilities();
}

function destroyInventoryItem(index) {
    if (!worldInventory[index]) return;
    worldInventory.splice(index, 1);
    renderWorldInventory();
    if (window.electron.saveWorldInventory) {
        window.electron.saveWorldInventory(currentWorld, worldInventory);
    }
    recomputeTempAbilities();
}

function regenerateConnections(x, y) {
    const targets = [[x, y]];
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (tileMap[`${nx}-${ny}`]) targets.push([nx, ny]);
        }
    }

    targets.forEach(([tx, ty]) => {
        const key = `${tx}-${ty}`;
        const entry = tileMap[key];
        if (!entry) return;
        const types = entry.data.types || (entry.data.type ? [entry.data.type] : []);
        const isWater = types.includes('water');
        const isMountain = types.includes('mountain');
        const conns = [];
        for (let dy2 = -1; dy2 <= 1; dy2++) {
            for (let dx2 = -1; dx2 <= 1; dx2++) {
                if (dx2 === 0 && dy2 === 0) continue;
                const nx = tx + dx2;
                const ny = ty + dy2;
                const nKey = `${nx}-${ny}`;
                const neighbor = tileMap[nKey];
                if (!neighbor) continue;
                const nTypes = neighbor.data.types || (neighbor.data.type ? [neighbor.data.type] : []);
                const nWater = nTypes.includes('water');
                const nMountain = nTypes.includes('mountain');
                if ((isWater && !nWater) || (nWater && !isWater) ||
                    (isMountain && !nMountain) || (nMountain && !isMountain)) {
                    neighbor.data.connections = (neighbor.data.connections || []).filter(c => c !== key);
                    continue;
                }
                conns.push(nKey);
                neighbor.data.connections = neighbor.data.connections || [];
                if (!neighbor.data.connections.includes(key)) {
                    neighbor.data.connections.push(key);
                }
            }
        }
        entry.data.connections = [...new Set(conns)];
    });
}

async function paintTile(x, y, renderSave = true) {
    const key = `${x}-${y}`;
    let created = false;

    function ensureEntry() {
        if (!tileMap[key]) {
            created = true;
            tileMap[key] = {
                data: {
                    name: `Tile ${x}-${y}`,
                    types: [],
                    background: '',
                    items: [],
                    connections: [],
                    modifiers: [],
                    stickers: []
                }
            };
        }
        return tileMap[key];
    }

    const biomeChecked = document.getElementById('paint-biome-enable').checked;
    const nameChecked = document.getElementById('paint-name-enable').checked;
    const clearChecked = document.getElementById('paint-clear-enable').checked;
    const connChecked = document.getElementById('paint-conn-enable').checked;
    const stickerChecked = document.getElementById('paint-sticker-enable').checked;

    if (clearChecked) {
        if (tileMap[key]) {
            delete tileMap[key];
            Object.values(tileMap).forEach(e => {
                e.data.connections = (e.data.connections || []).filter(c => c !== key);
            });
        }
        if (renderSave) {
            renderGrid();
            saveRegion();
        }
        return;
    }

    const entry = ensureEntry();
    if (nameChecked) {
        entry.data.name = `Tile ${x}-${y}`;
    }
    if (biomeChecked) {
        const t = document.getElementById('paint-biome-select').value;
        if (t) {
            entry.data.types = [t];
            const bg = await window.electron.getRandomTileImage(t);
            if (bg) entry.data.background = bg;
            if (created || stickerChecked) {
                entry.data.stickers = await getRandomStickers(t);
            }
        }
    } else if (stickerChecked) {
        const t = entry.data.types && entry.data.types[0];
        if (t) {
            entry.data.stickers = await getRandomStickers(t);
        }
    }
    if (connChecked) {
        regenerateConnections(x, y);
    }

    if (renderSave) {
        renderGrid();
        saveRegion();
    }
}

async function bucketPaint(x, y) {
    const startKey = `${x}-${y}`;
    const startEntry = tileMap[startKey];
    const startBiome = startEntry && startEntry.data.types && startEntry.data.types[0];
    if (!startBiome) {
        await paintTile(x, y);
        return;
    }

    const toVisit = [startKey];
    const seen = new Set();
    const targets = [];
    while (toVisit.length) {
        const key = toVisit.pop();
        if (seen.has(key)) continue;
        seen.add(key);
        const entry = tileMap[key];
        if (!entry) continue;
        const biome = entry.data.types && entry.data.types[0];
        if (biome !== startBiome) continue;
        targets.push(key);
        const [cx, cy] = keyToCoords(key);
        const neighbors = [
            `${cx - 1}-${cy}`,
            `${cx + 1}-${cy}`,
            `${cx}-${cy - 1}`,
            `${cx}-${cy + 1}`,
        ];
        neighbors.forEach(nk => { if (!seen.has(nk)) toVisit.push(nk); });
    }

    for (const key of targets) {
        const [tx, ty] = keyToCoords(key);
        await paintTile(tx, ty, false);
    }
    renderGrid();
    saveRegion();
}

async function paintItem(x, y) {
    const key = `${x}-${y}`;

    function ensureEntry() {
        if (!tileMap[key]) {
            tileMap[key] = {
                data: {
                    name: `Tile ${x}-${y}`,
                    types: [],
                    background: '',
                    items: [],
                    connections: [],
                    modifiers: [],
                    stickers: []
                }
            };
        }
        return tileMap[key];
    }

    const clearChecked = document.getElementById('item-paint-clear').checked;
    const entry = ensureEntry();
    if (clearChecked) {
        entry.data.items = [];
    } else {
        const keySel = document.getElementById('item-paint-item').value;
        const qty = parseInt(document.getElementById('item-paint-quantity').value, 10) || 0;
        const maxQtyInput = parseInt(document.getElementById('item-paint-max').value, 10);
        const maxQty = !isNaN(maxQtyInput) ? maxQtyInput : qty;
        const regen = parseInt(document.getElementById('item-paint-regen').value, 10) || 0;
        const renewable = document.getElementById('item-paint-renewable').checked;
        const def = itemByKey[keySel];
        if (def) {
            entry.data.items = entry.data.items || [];
            const existing = entry.data.items.find(i => i.key === keySel);
            if (existing) {
                existing.amount = qty;
                existing.quantity = qty;
                existing.renewable = renewable;
                existing.maxQuantity = maxQty;
                existing.regenTime = regen;
                existing._lastRegen = Date.now();
                existing.name = def.name;
                existing.category = def.category;
                existing.rarity = def.rarity;
                existing.description = def.description;
                existing.value = def.value;
                existing.stats = def.stats;
                existing.abilities = def.abilities;
                existing.image = resolveItemIcon(def.icon);
            } else {
                entry.data.items.push({
                    key: def.key,
                    name: def.name,
                    category: def.category,
                    amount: qty,
                    quantity: qty,
                    maxQuantity: maxQty,
                    regenTime: regen,
                    renewable,
                    rarity: def.rarity,
                    description: def.description,
                    value: def.value,
                    stats: def.stats,
                    abilities: def.abilities,
                    image: resolveItemIcon(def.icon),
                    _lastRegen: Date.now()
                });
            }
        }
    }
    updateTileVisual(entry, key);
    displayTile(entry.data, key);
    saveRegion();
}

function addTileToZone(x, y) {
    if (!currentZone) return;
    const key = `${x}-${y}`;
    const idx = currentZone.tiles.indexOf(key);
    if (idx === -1) {
        currentZone.tiles.push(key);
    } else {
        currentZone.tiles.splice(idx, 1);
    }
    saveZone(currentZone);
    renderGrid();
}

async function createZone() {
    const id = Object.keys(zones).length ? Math.max(...Object.keys(zones).map(i => parseInt(i))) + 1 : 1;
    const name = await showPrompt('Zone name?', `Zone ${id}`);
    const zone = {
        id,
        name: name || `Zone ${id}`,
        color: zoneColorInput.value || '#ff0000',
        modifiers: [],
        showName: { world: true, split: true, full: true },
        tiles: [currentKey]
    };
    zones[id] = zone;
    currentZone = zone;
    zoneNameInput.value = zone.name;
    zoneToggle.disabled = false;
    zoneEditMode = false;
    zoneToggle.textContent = 'Zone Mode: Off';
    saveZone(zone);
    renderGrid();
    updateZoneInfo();
}

async function selectZoneForEdit() {
    let zone = findZonesByTile(currentKey)[0];
    if (!zone) {
        const list = Object.values(zones).map(z => `${z.id}: ${z.name}`).join('\n');
        const idStr = await showPrompt(`Zone ID to edit?\n${list}`, '');
        const id = parseInt(idStr, 10);
        if (!isNaN(id)) zone = zones[id];
    }
    if (zone) {
        currentZone = zone;
        zoneNameInput.value = zone.name || '';
        zoneColorInput.value = zone.color || '#ff0000';
        zoneNameWorld.checked = zone.showName ? zone.showName.world !== false : true;
        zoneNameSplit.checked = zone.showName ? zone.showName.split !== false : true;
        zoneNameFull.checked = zone.showName ? zone.showName.full !== false : true;
        zoneToggle.disabled = false;
        updateZoneInfo();
    }
}

function findZonesByTile(key) {
    return Object.values(zones).filter(z => z.tiles.includes(key));
}

function saveZone(zone) {
    const data = {
        id: zone.id,
        name: zone.name,
        color: zone.color,
        modifiers: zone.modifiers || [],
        showName: zone.showName || { world: true, split: true, full: true },
        tiles: zone.tiles.map(k => {
            const [x, y] = keyToCoords(k);
            return { x, y };
        })
    };
    window.electron.saveZone('region1', currentWorld, data);
}

function renderZoneBorders() {
    document.querySelectorAll('.zone-border').forEach(el => el.remove());
    Object.values(zones).forEach(z => {
        const shade = hexToRgba(z.color, 0.3);
        z.tiles.forEach(key => {
            const entry = tileMap[key];
            if (!entry || !entry.el) return;
            const [x, y] = keyToCoords(key);
            const neighbors = {
                top: `${x}-${y-1}`,
                bottom: `${x}-${y+1}`,
                left: `${x-1}-${y}`,
                right: `${x+1}-${y}`
            };
            const border = document.createElement('div');
            border.className = 'zone-border';
            const topMissing = !z.tiles.includes(neighbors.top);
            const bottomMissing = !z.tiles.includes(neighbors.bottom);
            const leftMissing = !z.tiles.includes(neighbors.left);
            const rightMissing = !z.tiles.includes(neighbors.right);
            border.style.borderTop = topMissing ? `2px solid ${z.color}` : 'none';
            border.style.borderBottom = bottomMissing ? `2px solid ${z.color}` : 'none';
            border.style.borderLeft = leftMissing ? `2px solid ${z.color}` : 'none';
            border.style.borderRight = rightMissing ? `2px solid ${z.color}` : 'none';
            const shadowSize = tileSize / 2;
            const shadows = [];
            if (topMissing) shadows.push(`inset 0 ${shadowSize}px ${shadowSize}px -${shadowSize/2}px ${shade}`);
            if (bottomMissing) shadows.push(`inset 0 -${shadowSize}px ${shadowSize}px -${shadowSize/2}px ${shade}`);
            if (leftMissing) shadows.push(`inset ${shadowSize}px 0 ${shadowSize}px -${shadowSize/2}px ${shade}`);
            if (rightMissing) shadows.push(`inset -${shadowSize}px 0 ${shadowSize}px -${shadowSize/2}px ${shade}`);
            border.style.boxShadow = shadows.join(', ');
            entry.el.appendChild(border);
        });
    });
}

function renderZoneNames() {
    const mapGrid = document.getElementById('map-module');
    mapGrid.querySelectorAll('.zone-name').forEach(el => el.remove());
    const active = [];
    const gap = viewMode === 'world' ? 0 : tileGap;
    Object.values(zones).forEach(z => {
        const tiles = z.tiles;
        if (!tiles || tiles.length === 0) return;
        const inZone = tiles.includes(currentKey);
        if (inZone) active.push(z.name);
        z.showName = z.showName || { world: true, split: true, full: true };
        if (!z.showName[viewMode] || inZone) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        tiles.forEach(k => {
            const [tx, ty] = keyToCoords(k);
            if (tx < minX) minX = tx;
            if (ty < minY) minY = ty;
            if (tx > maxX) maxX = tx;
            if (ty > maxY) maxY = ty;
        });
        const dispMinX = Math.max(minX, viewMinX);
        const dispMaxX = Math.min(maxX, viewMaxX);
        const dispMinY = Math.max(minY, viewMinY);
        const dispMaxY = Math.min(maxY, viewMaxY);
        if (dispMinX > dispMaxX || dispMinY > dispMaxY) return;
        const left = (dispMinX - viewMinX) * (tileSize + gap) + ((dispMaxX - dispMinX + 1) * (tileSize + gap) - gap) / 2;
        const top = (dispMinY - viewMinY) * (tileSize + gap) + ((dispMaxY - dispMinY + 1) * (tileSize + gap) - gap) / 2;
        const div = document.createElement('div');
        div.className = 'zone-name';
        div.style.left = `${left}px`;
        div.style.top = `${top}px`;
        div.textContent = z.name;
        mapGrid.appendChild(div);
    });
    const title = document.getElementById('zone-title');
    if (active.length) {
        title.textContent = active.join(' / ');
        title.classList.remove('hidden');
    } else {
        title.classList.add('hidden');
    }
}

function addAdjacentTile() {
    const [cx, cy] = keyToCoords(currentKey);
    const overlay = document.createElement('div');
    overlay.id = 'mini-map-overlay';
    const container = document.createElement('div');
    container.className = 'mini-map-container';

    let selectedType = '';
    let selectedBg = '';

    const typeList = document.createElement('div');
    typeList.className = 'tile-type-list';
    tileTypes.forEach(t => {
        const btn = document.createElement('button');
        btn.textContent = t;
        btn.addEventListener('click', async () => {
            selectedType = t;
            const bg = await window.electron.getRandomTileImage(t);
            if (bg) selectedBg = bg;
            Array.from(typeList.children).forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
        });
        typeList.appendChild(btn);
    });

    const grid = document.createElement('div');
    grid.className = 'mini-map-grid';
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            const key = `${x}-${y}`;
            const cell = document.createElement('div');
            cell.className = 'mini-map-cell';
            if (dx === 0 && dy === 0) {
                cell.textContent = 'X';
                cell.classList.add('existing');
            } else if (tileMap[key]) {
                cell.classList.add('existing');
            } else {
                cell.classList.add('phantom');
                cell.textContent = '+';
                cell.addEventListener('click', () => {
                    document.body.removeChild(overlay);
                    configureConnections(x, y, selectedType, selectedBg);
                });
            }
            grid.appendChild(cell);
        }
    }

    const coordDiv = document.createElement('div');
    const xInput = document.createElement('input');
    xInput.type = 'number';
    xInput.placeholder = 'X';
    const yInput = document.createElement('input');
    yInput.type = 'number';
    yInput.placeholder = 'Y';
    const addBtn = document.createElement('button');
    addBtn.textContent = 'Add';
    addBtn.addEventListener('click', () => {
        const x = parseInt(xInput.value, 10);
        const y = parseInt(yInput.value, 10);
        if (!isNaN(x) && !isNaN(y) && !tileMap[`${x}-${y}`]) {
            document.body.removeChild(overlay);
            configureConnections(x, y, selectedType, selectedBg);
        }
    });
    coordDiv.appendChild(xInput);
    coordDiv.appendChild(yInput);
    coordDiv.appendChild(addBtn);

    const btns = document.createElement('div');
    btns.className = 'editor-buttons';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => document.body.removeChild(overlay));
    btns.appendChild(cancel);

    const right = document.createElement('div');
    right.appendChild(coordDiv);
    right.appendChild(grid);
    right.appendChild(btns);

    container.appendChild(typeList);
    container.appendChild(right);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
}

//Update map size to fit all tiles
function updateBounds() {
    minX = Infinity;
    minY = Infinity;
    maxX = -Infinity;
    maxY = -Infinity;
    Object.keys(tileMap).forEach(k => {
        const [x, y] = keyToCoords(k);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
    });
    if (maxX === -Infinity || maxY === -Infinity) {
        gridWidth = 0;
        gridHeight = 0;
        minX = minY = maxX = maxY = 0;
    } else {
        gridWidth = maxX - minX + 1;
        gridHeight = maxY - minY + 1;
    }
    if (viewMode === 'split') {
        useSplitView = gridWidth > 10 || gridHeight > 10;
    } else {
        useSplitView = false;
    }
}
	
async function saveRegion() {
    const tiles = Object.entries(tileMap).map(([key, entry]) => {
        const [x, y] = keyToCoords(key);
        const data = { ...entry.data };
        if (data.items) {
            data.items = data.items.map(i => {
                const { _lastRegen, ...rest } = i;
                return rest;
            });
        }
        if (data.type) delete data.type;
        return { x, y, ...data, start: key === originKey };
    });
    const [ox, oy] = keyToCoords(originKey);
    await window.electron.saveMapRegion('region1', currentWorld, tiles, { x: ox, y: oy });
}

async function tickSpawners() {
	const now = Date.now();
		for (const spawn of spawnPoints) {
			const period =(spawn.period || 60) * 1000;
			spawn._last = spawn._last || 0;
			if (now - spawn._last < period) continue;
			spawn._last = now;
			const count = worldNpcs.filter(n => n.spawnPoint === spawn.name).length;
			if (count >= (spawn.maxPopulation || 1)) continue;
			const npc = JSON.parse(JSON.stringify(spawn.blueprint || {}));
			npc.tile = { ...spawn.tile };
                        npc.home = { ...spawn.tile };
                        npc.state = 'wander';
                        npc.spawnPoint = spawn.name;
		if (spawn.levelRange && spawn.levelRange.length === 2) {
                        const [minL, maxL] = spawn.levelRange;
                        npc.level = Math.floor(Math.random() * (maxL - minL + 1)) + minL;
                }
                try {
                        const res = await window.electron.saveNPC('region1', currentWorld, npc);
                        npc._file = res && res.file;
                } catch (err) {
                        console.error(err);
                }
                if (npc.dialogue && npc.dialogue.random) scheduleRandomSpeech(npc);
                worldNpcs.push(npc);
                const key = `${spawn.tile.x}-${spawn.tile.y}`;
                if (tileMap[key]) updateTileVisual(tileMap[key], key);
                if (currentKey === key && tileMap[currentKey]) {
                        displayTile(tileMap[currentKey].data);
                }
                renderZoneBorders();
        }
}

async function removeNpc(npc) {
    const idx = worldNpcs.indexOf(npc);
    if (idx >= 0) worldNpcs.splice(idx, 1);
    if (npc._file) {
        try { await window.electron.deleteNPC('region1', currentWorld, npc._file); } catch (err) { console.error(err); }
    }
    if (npc.tile) {
        const key = `${npc.tile.x}-${npc.tile.y}`;
        if (tileMap[key]) updateTileVisual(tileMap[key], key);
        if (key === currentKey && tileMap[currentKey]) displayTile(tileMap[currentKey].data);
    }
    renderZoneBorders();
}

function scaleNpcBubble(bubble) {
    if (!bubble) return;
    if (viewMode === 'world') {
        const scale = tileSize / 100;
        bubble.style.fontSize = `${Math.max(1, 24 * scale)}px`;
        bubble.style.transform = `translate(-50%, -${5 * scale}px)`;
    } else {
        bubble.style.fontSize = '';
        bubble.style.transform = 'translate(-50%, -5px)';
    }
}

function showNpcBubble(npc, text, callback) {
    if (!npc || !npc.tile) { if (callback) callback(); return; }
    const key = `${npc.tile.x}-${npc.tile.y}`;
    const entry = tileMap[key];
    if (!entry) { if (callback) callback(); return; }
    if (npc._bubbleTimeout) {
        clearTimeout(npc._bubbleTimeout);
        npc._bubbleTimeout = null;
    }
    if (npc._bubbleEl) npc._bubbleEl.remove();
    const bubble = document.createElement('div');
    bubble.className = 'npc-bubble';
    bubble.textContent = text;
    scaleNpcBubble(bubble);
    npc._bubbleEl = bubble;
    if (entry.el) {
        entry.el.appendChild(bubble);
    }
    const letters = text.replace(/ /g, '').length;
    const spaces = (text.match(/ /g) || []).length;
    const duration = 2000 + letters * 250 + spaces * 500;
    npc._bubbleTimeout = setTimeout(() => {
        if (npc._bubbleEl === bubble) {
            bubble.remove();
            npc._bubbleEl = null;
        }
        if (callback) callback();
    }, duration);
}

function triggerNpcDialog(npc, type, callback) {
    const dlg = npc.dialogue || {};
    let lines = [];
    if (type === 'random') {
        lines = (dlg.random && dlg.random.lines) || [];
    } else {
        lines = dlg[type] || [];
    }
    if (!Array.isArray(lines) || lines.length === 0) {
        if (callback) callback();
        return;
    }
    const line = lines[Math.floor(Math.random() * lines.length)];
    showNpcBubble(npc, line, callback);
}

function scheduleRandomSpeech(npc) {
    const rand = npc.dialogue && npc.dialogue.random;
    if (!rand || !Array.isArray(rand.lines) || rand.lines.length === 0) return;
    const min = rand.min != null ? rand.min : 0;
    const max = rand.max != null ? rand.max : min;
    npc._nextRandomSpeech = Date.now() + (Math.random() * (max - min) + min) * 1000;
}

function populateNpcModal(npc, prefix) {
    document.getElementById(`${prefix}-name`).textContent = npc.name || npc.species || 'NPC';
    const imgEl = document.getElementById(`${prefix}-image`);
    if (imgEl) imgEl.src = npc.image || npc.icon || '';
    const descEl = document.getElementById(`${prefix}-description`);
    if (descEl) descEl.textContent = npc.description || '';
    const statsEl = document.getElementById(`${prefix}-stats`);
    if (statsEl) {
        statsEl.innerHTML = '';
        Object.entries(npc.stats || {}).forEach(([k, v]) => {
            const li = document.createElement('li');
            li.textContent = `${statAbbr[k] || k}: ${v}`;
            statsEl.appendChild(li);
        });
    }
    const invList = document.getElementById(`${prefix}-inventory-list`);
    if (invList) {
        invList.innerHTML = '';
        (npc.inventory || []).forEach(it => {
            const name = it.name || it.key || 'Item';
            const qty = it.quantity != null ? it.quantity : (it.amount != null ? it.amount : 1);
            const li = document.createElement('li');
            li.textContent = `${name} x${qty}`;
            invList.appendChild(li);
        });
    }
    const lootList = document.getElementById(`${prefix}-loot-list`);
    if (lootList) {
        lootList.innerHTML = '';
        const loot = npc.loot || npc.lootTable || [];
        loot.forEach(l => {
            const name = l.name || l.key || 'Item';
            const chance = l.chance != null ? ` (${l.chance}%)` : '';
            const li = document.createElement('li');
            li.textContent = `${name}${chance}`;
            lootList.appendChild(li);
        });
    }
}

function showNpcInfoModal(npc) {
    playerMovementLocked = true;
    stopAutoMove();
    populateNpcModal(npc, 'npc-info');
    document.getElementById('npc-info-modal').classList.remove('hidden');
}

function showHostileModal(npc) {
    npcMovementPaused = true;
    playerMovementLocked = true;
    stopAutoMove();
    const modal = document.getElementById('hostile-npc-modal');
    populateNpcModal(npc, 'hostile-npc');
    modal.classList.remove('hidden');
    document.getElementById('hostile-destroy-btn').onclick = async () => {
        await removeNpc(npc);
        modal.classList.add('hidden');
        npcMovementPaused = false;
        playerMovementLocked = false;
        hostilePursuitShield = Date.now() + 10000;
        hostileTimerEnd = hostilePursuitShield;
    };
    document.getElementById('hostile-dismiss-btn').onclick = () => {
        modal.classList.add('hidden');
        npcMovementPaused = false;
        playerMovementLocked = false;
        hostileInteractionCooldown = Date.now() + 5000;
        hostileTimerEnd = hostileInteractionCooldown;
    };
}

function updateHostileTimer() {
    const el = document.getElementById('hostile-timer');
    const remaining = hostileTimerEnd - Date.now();
    if (remaining > 0) {
        el.textContent = Math.ceil(remaining / 1000);
        el.classList.remove('hidden');
    } else {
        el.classList.add('hidden');
    }
}

function moveNpcStep(npc, targetKey) {
    if (targetKey === currentKey) {
        if (npc.attitude === 'Hostile' && Date.now() > hostileInteractionCooldown) {
            showHostileModal(npc);
        }
        return false;
    }
    const [tx, ty] = keyToCoords(targetKey);
    const npcKey = `${npc.tile.x}-${npc.tile.y}`;
    npc.tile.x = tx;
    npc.tile.y = ty;
    if (tileMap[npcKey]) updateTileVisual(tileMap[npcKey], npcKey);
    if (tileMap[targetKey]) updateTileVisual(tileMap[targetKey], targetKey);
    if ((npcKey === currentKey || targetKey === currentKey) && tileMap[currentKey]) {
        displayTile(tileMap[currentKey].data);
    }
    return true;
}

function directStep(startKey, targetKey, inv, abilities = []) {
    const entry = tileMap[startKey];
    if (!entry) return null;
    const [tx, ty] = keyToCoords(targetKey);
    let best = null;
    let bestDist = Infinity;
    for (const next of entry.data.connections || []) {
        const nextEntry = tileMap[next];
        if (!nextEntry || !TileConditions.isPassable(nextEntry.data, inv, abilities)) continue;
        const [nx, ny] = keyToCoords(next);
        const d = Math.hypot(tx - nx, ty - ny);
        if (d < bestDist) {
            bestDist = d;
            best = next;
        }
    }
    return best;
}

function tickNpcMovement() {
    if (npcMovementPaused) return;
    const [px, py] = keyToCoords(currentKey);
    for (const npc of worldNpcs) {
        if (!npc.tile) continue;
        const npcKey = `${npc.tile.x}-${npc.tile.y}`;
        const entry = tileMap[npcKey];
        if (!entry) continue;
        const spawn = npc.spawnPoint ? spawnPoints.find(s => s.name === npc.spawnPoint) : null;

        const randDlg = npc.dialogue && npc.dialogue.random;
        if (randDlg && Array.isArray(randDlg.lines) && randDlg.lines.length) {
            if (!npc._nextRandomSpeech) {
                scheduleRandomSpeech(npc);
            } else if (Date.now() >= npc._nextRandomSpeech) {
                npc._nextRandomSpeech = null;
                triggerNpcDialog(npc, 'random', () => scheduleRandomSpeech(npc));
            }
        }

        if (npc.attitude === 'Hostile') {
            const range = npc.sightRange != null ? npc.sightRange : 0;
            const dist = Math.hypot(npc.tile.x - px, npc.tile.y - py);
            if (npc._cooldownUntil && Date.now() >= npc._cooldownUntil) {
                npc._cooldownUntil = null;
            }
            if (!npc._cooldownUntil && Date.now() > hostilePursuitShield) {
                if (npc.state !== 'chase' && dist <= range) {
                    npc.state = 'chase';
                    npc._pursuitStart = Date.now();
                    triggerNpcDialog(npc, 'sightline');
                } else if (npc.state === 'chase' && dist > range) {
                    npc.state = 'return';
                }
            } else if (npc.state === 'chase') {
                npc.state = 'return';
            }
        }

        if (npc.state === 'chase') {
            const range = npc.sightRange != null ? npc.sightRange : 0;
            if (npc.pursuitTime && npc.pursuitTime > 0 && npc._pursuitStart && Date.now() - npc._pursuitStart > npc.pursuitTime * 1000) {
                npc.state = 'return';
                npc._cooldownUntil = Date.now() + npc.pursuitTime * 1000;
                triggerNpcDialog(npc, 'pursuitEnd');
                continue;
            }
            const path = findPath(npcKey, currentKey, npc.inventory || [], npc.abilities || []);
            if (path && path.length > 1) {
                if (path.length - 1 <= range + 3) {
                    moveNpcStep(npc, path[1]);
                } else {
                    const step = directStep(npcKey, currentKey, npc.inventory || [], npc.abilities || []);
                    if (step) moveNpcStep(npc, step);
                }
            } else {
                const step = directStep(npcKey, currentKey, npc.inventory || [], npc.abilities || []);
                if (step) moveNpcStep(npc, step);
            }
            continue;
        }
        if (npc.state === 'return') {
            const homeKey = `${npc.home.x}-${npc.home.y}`;
            if (npcKey === homeKey) {
                npc.state = 'wander';
            } else {
                const path = findPath(npcKey, homeKey, npc.inventory || []);
                if (path && path.length > 1) moveNpcStep(npc, path[1]);
            }
            continue;
        }

        if (Math.random() < 0.5) continue; // stay still
        const options = (entry.data.connections || []).filter(key => {
            if (key === currentKey) return false;
            const next = tileMap[key];
            if (!next) return false;
            const inv = npc.inventory || [];
            if (!TileConditions.isPassable(next.data, inv, npc.abilities || [])) return false;
            if (spawn) {
                if (spawn.zone && zones[spawn.zone]) {
                    const z = zones[spawn.zone];
                    if (!z.tiles.includes(key)) return false;
                } else if (spawn && spawn.wanderRadius != null && spawn.wanderRadius > 0) {
                    const [sx, sy] = [spawn.tile.x, spawn.tile.y];
                    const [nx, ny] = keyToCoords(key);
                    const distNext = Math.hypot(nx - sx, ny - sy);
                    if (distNext > spawn.wanderRadius) {
                        const [cx, cy] = [npc.tile.x, npc.tile.y];
                        const distCurrent = Math.hypot(cx - sx, cy - sy);
                        if (distNext >= distCurrent) return false;
                    }
                }
            }
            return true;
        });
        if (!options.length) continue;
        const targetKey = options[Math.floor(Math.random() * options.length)];
        moveNpcStep(npc, targetKey);
    }
    renderZoneBorders();
}


function tickRenewables() {
    const now = Date.now();
    for (const [key, entry] of Object.entries(tileMap)) {
        let changed = false;
        (entry.data.items || []).forEach(r => {
            if (!r.renewable) return;
            r.quantity = r.quantity != null ? r.quantity : (r.amount || 0);
            const maxQ = r.maxQuantity != null ? r.maxQuantity : r.quantity;
            const regen = r.regenTime || 0;
            if (regen <= 0 || r.quantity >= maxQ) {
                r._lastRegen = now;
                return;
            }
            r._lastRegen = r._lastRegen || now;
            const step = regen * 1000;
            const elapsed = now - r._lastRegen;
            if (elapsed >= step) {
                const inc = Math.floor(elapsed / step);
                r.quantity = Math.min(maxQ, r.quantity + inc);
                r.amount = r.quantity;
                r._lastRegen = now - (elapsed % step);
                changed = true;
            }
        });
        if (changed) {
            updateTileVisual(entry, key);
            if (key === currentKey) displayTile(entry.data, key);
        }
    }
}

async function configureConnections(x, y, starterType = '', starterBg = '') {
    const key = `${x}-${y}`;
    const stickers = starterType ? await getRandomStickers(starterType) : [];
    tileMap[key] = {
        data: {
            name: `Tile ${x}-${y}`,
            types: starterType ? [starterType] : [],
            background: starterBg,
            items: [],
            connections: [],
            modifiers: [],
            stickers
        }
    };
    regenerateConnections(x, y);
    updateBounds();
    renderGrid();
    saveRegion();
}

function deleteAdjacentTile() {
    const [cx, cy] = keyToCoords(currentKey);
    const overlay = document.createElement('div');
    overlay.id = 'mini-map-overlay';
	const container = document.createElement('div');
    const grid = document.createElement('div');
    grid.className = 'mini-map-grid';
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = cx + dx;
            const y = cy + dy;
            const key = `${x}-${y}`;
            const cell = document.createElement('div');
            cell.className = 'mini-map-cell';
            if (dx === 0 && dy === 0) {
                cell.textContent = 'X';
                cell.classList.add('existing');
            } else if (tileMap[key]) {
                cell.classList.add('existing', 'deletable');
                cell.addEventListener('click', () => {
                    delete tileMap[key];
                    Object.values(tileMap).forEach(e => {
                        e.data.connections = (e.data.connections || []).filter(c => c !== key);
                    });
                    document.body.removeChild(overlay);
					updateBounds();
                    renderGrid();
					saveRegion();
                });
            } else {
                cell.classList.add('phantom');
            }
            grid.appendChild(cell);
        }
    }
	container.appendChild(grid);
	const btns = document.createElement('div');
	btns.className = 'editor-buttons';
	const cancel = document.createElement('button');
	cancel.textContent = 'Cancel';
	cancel.addEventListener('click', () => document.body.removeChild(overlay));
	btns.appendChild(cancel);
	container.appendChild(btns);
    overlay.appendChild(container);
    document.body.appendChild(overlay);
}

async function editTileItems() {
    const entry = tileMap[currentKey];
    if (!entry) return;
    entry.data.items = entry.data.items || [];
    await openTileItemsPopup(entry.data.items);
    updateTileVisual(entry, currentKey);
    displayTile(entry.data);
    saveRegion();
}

async function goRandom() {
    try {
        const chars = await window.electron.getCharacters();
        if (!chars.length) return;
        const char = chars[Math.floor(Math.random() * chars.length)];
        let loads = await window.electron.getLoadouts(char.name);
        let names = loads.map(l => l.name);
        names.push('default');
        const loadName = names[Math.floor(Math.random() * names.length)];
        const url = loadName === 'default'
            ? `profile.html?character=${char.name}`
            : `profile.html?character=${char.name}&loadout=${loadName}`;
        localStorage.setItem('currentCharacter', char.name);
        window.location.href = url;
    } catch (err) {
        console.error(err);
    }
}

async function importWorldCharacter() {
    if (!currentWorld) {
        alert('Select a world first.');
        return;
    }
    const chars = await window.electron.getCharacters();
    if (!chars.length) {
        alert('No characters found');
        return;
    }
    const options = chars.map(c => ({ name: c.name, image: c.imagePath }));
    const name = await showSelection('Select Character', options);
    if (!name) return;
    let loadout = 'default';
    let loads = await window.electron.getLoadouts(name);
    if (loads.length) {
        const loadOpts = [];
        for (const l of loads) {
            let img = await window.electron.getLoadoutImage(name, l.name);
            if (!img) {
                img = await window.electron.getCharacterImage(name);
            }
            loadOpts.push({ name: l.name, image: img });
        }
        loadOpts.push({ name: 'default', image: await window.electron.getCharacterImage(name) });
        const selLoad = await showSelection('Select Loadout', loadOpts);
        if (!selLoad) return;
        loadout = selLoad;
    }
    await window.electron.prepareWorldCharacter(currentWorld, name, loadout);
    worldCharacter = await window.electron.getWorldCharacter(currentWorld);
    initCharacterAbilities();
    worldInventory = await window.electron.getWorldInventory(currentWorld);
    recomputeTempAbilities();
    document.getElementById('character-name').textContent = worldCharacter.name || '';
    document.getElementById('inventory-btn').classList.remove('hidden');
    document.getElementById('mini-inventory-grid').classList.remove('hidden');
    renderMiniInventory();
    renderStats();
}

function renderWorldInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    recomputeTempAbilities();

    const COLS = 5;
    const ROWS = 8;
    const map = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    function canPlace(item, x, y, ignoreIdx = null) {
        const w = item.width || 1;
        const h = item.height || 1;
        if (x + w > COLS || y + h > ROWS) return false;
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
                const cell = map[yy][xx];
                if (cell !== null && cell !== ignoreIdx) return false;
            }
        }
        return true;
    }

    function placeItemOnMap(idx, item) {
        const w = item.width || 1;
        const h = item.height || 1;
        const x = item.x ?? 0;
        const y = item.y ?? 0;
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
                map[yy][xx] = idx;
            }
        }
    }

    worldInventory.forEach((item, idx) => {
        if (item.x == null || item.y == null || !canPlace(item, item.x, item.y)) {
            outer: for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    if (canPlace(item, x, y)) {
                        item.x = x; item.y = y;
                        break outer;
                    }
                }
            }
        }
        placeItemOnMap(idx, item);
    });

    let dragInfo = null;
    let previewEl = null;

    function tryItemInteraction(source, target) {
        // Placeholder for future item interaction logic
        // Return true if an interaction was handled
        return false;
    }

    function finalizeDrag() {
        if (!dragInfo) return;
        (dragInfo.placeholders || []).forEach(el => {
            if (el.parentNode) el.parentNode.removeChild(el);
        });
        if (dragInfo.el) dragInfo.el.style.visibility = '';
        dragInfo = null;
        clearPreview();
        renderWorldInventory();
    }

    function clearPreview() {
        if (previewEl && previewEl.parentNode) {
            previewEl.parentNode.removeChild(previewEl);
        }
        previewEl = null;
    }

    function showPreview(item, x, y) {
        if (!previewEl) {
            previewEl = document.createElement('div');
            previewEl.className = 'inventory-tile preview';
            grid.appendChild(previewEl);
        }
        previewEl.style.gridColumn = `${x + 1} / span ${item.width || 1}`;
        previewEl.style.gridRow = `${y + 1} / span ${item.height || 1}`;
        previewEl.innerHTML = '';
        if (item.image) {
            const img = document.createElement('img');
            img.src = `${item.image}?cb=${Date.now()}`;
            img.draggable = false;
            previewEl.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = item.name || '';
            previewEl.appendChild(span);
        }
    }

    function handleMove(e) {
        if (!dragInfo) return;
        const rect = grid.getBoundingClientRect();
        const cellW = rect.width / COLS;
        const cellH = rect.height / ROWS;
        const x = Math.floor((e.clientX - rect.left - dragInfo.offsetX) / cellW);
        const y = Math.floor((e.clientY - rect.top - dragInfo.offsetY) / cellH);
        const item = worldInventory[dragInfo.index];
        if (x < 0 || y < 0 || x + (item.width || 1) > COLS || y + (item.height || 1) > ROWS) {
            clearPreview();
            return;
        }
        if (canPlace(item, x, y)) {
            showPreview(item, x, y);
        } else {
            clearPreview();
        }
    }

    async function handleUp(e) {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        if (!dragInfo) return;
        const rect = grid.getBoundingClientRect();
        const cellW = rect.width / COLS;
        const cellH = rect.height / ROWS;
        const x = Math.floor((e.clientX - rect.left - dragInfo.offsetX) / cellW);
        const y = Math.floor((e.clientY - rect.top - dragInfo.offsetY) / cellH);
        const item = worldInventory[dragInfo.index];
        const w = item.width || 1;
        const h = item.height || 1;

        if (canPlace(item, x, y)) {
            item.x = x; item.y = y;
            await window.electron.saveWorldInventory(currentWorld, worldInventory);
            finalizeDrag();
            return;
        }

        let targetIdx = null;
        for (let yy = y; yy < y + h && targetIdx === null; yy++) {
            for (let xx = x; xx < x + w && targetIdx === null; xx++) {
                if (yy >= 0 && yy < ROWS && xx >= 0 && xx < COLS && map[yy][xx] !== null) {
                    targetIdx = map[yy][xx];
                }
            }
        }

        if (targetIdx !== null && tryItemInteraction(item, worldInventory[targetIdx])) {
            await window.electron.saveWorldInventory(currentWorld, worldInventory);
        }
        finalizeDrag();
    }

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (map[y][x] !== null) continue;
            const blank = document.createElement('div');
            blank.className = 'inventory-tile blank';
            blank.dataset.x = x;
            blank.dataset.y = y;
            grid.appendChild(blank);
        }
    }

    worldInventory.forEach((item, index) => {
        const tile = document.createElement('div');
        tile.className = 'inventory-tile';
        tile.style.gridColumn = `${item.x + 1} / span ${item.width || 1}`;
        tile.style.gridRow = `${item.y + 1} / span ${item.height || 1}`;
        tile.draggable = true;
        tile.dataset.x = item.x;
        tile.dataset.y = item.y;
        tile.addEventListener('mousedown', e => {
            e.preventDefault();
            const rect = tile.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            const item = worldInventory[index];
            const placeholders = [];
            const w = item.width || 1;
            const h = item.height || 1;
            for (let yy = item.y; yy < item.y + h; yy++) {
                for (let xx = item.x; xx < item.x + w; xx++) {
                    map[yy][xx] = null;
                    const blank = document.createElement('div');
                    blank.className = 'inventory-tile blank';
                    blank.dataset.x = xx;
                    blank.dataset.y = yy;
                    grid.appendChild(blank);
                    placeholders.push(blank);
                }
            }
            dragInfo = { index, offsetX, offsetY, el: tile, originalX: item.x, originalY: item.y, placeholders };
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
            tile.style.visibility = 'hidden';
        });
        if (item.image) {
            const img = document.createElement('img');
            img.src = `${item.image}?cb=${Date.now()}`;
            img.draggable = false;
            tile.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = item.name;
            tile.appendChild(span);
        }
        if (item.stackable && item.quantity > 1) {
            const qty = document.createElement('div');
            qty.className = 'qty';
            qty.textContent = item.quantity;
            tile.appendChild(qty);
        }
        tile.addEventListener('click', () => openItemInfo(index));
        grid.appendChild(tile);
    });

    renderMiniInventory();
    renderStats();
}

function showMiniItemInfo(item, target) {
    const popup = document.getElementById('mini-item-popup');
    if (!popup || !item) return;
    document.getElementById('mini-item-name').textContent = item.name || '';
    const img = document.getElementById('mini-item-image');
    if (item.image) {
        img.src = `${item.image}?cb=${Date.now()}`;
        img.classList.remove('hidden');
    } else {
        img.classList.add('hidden');
    }
    const statsDiv = document.getElementById('mini-item-stats');
    statsDiv.innerHTML = '';
    (item.stats || []).forEach(s => {
        const p = document.createElement('p');
        const prefix = (s.type === 'mult' || s.type === 'mul') ? 'x' : '+';
        p.textContent = `${s.stat}: ${prefix}${s.value}`;
        statsDiv.appendChild(p);
    });
    document.getElementById('mini-item-description').textContent = item.description || '';
    popup.classList.remove('hidden');
    popup.style.maxWidth = '400px';
    popup.style.maxHeight = '400px';
    const rect = target.getBoundingClientRect();
    popup.style.left = `${rect.right + 5}px`;
    popup.style.top = `${rect.top}px`;
}

function hideMiniItemInfo() {
    const popup = document.getElementById('mini-item-popup');
    if (popup) popup.classList.add('hidden');
}

function renderMiniInventory() {
    const grid = document.getElementById('mini-inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    recomputeTempAbilities();

    const COLS = 5;
    const ROWS = 8;
    const map = Array.from({ length: ROWS }, () => Array(COLS).fill(null));

    function canPlace(item, x, y, ignoreIdx = null) {
        const w = item.width || 1;
        const h = item.height || 1;
        if (x + w > COLS || y + h > ROWS) return false;
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
                const cell = map[yy][xx];
                if (cell !== null && cell !== ignoreIdx) return false;
            }
        }
        return true;
    }

    function placeItemOnMap(idx, item) {
        const w = item.width || 1;
        const h = item.height || 1;
        const x = item.x ?? 0;
        const y = item.y ?? 0;
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
                map[yy][xx] = idx;
            }
        }
    }

    worldInventory.forEach((item, idx) => {
        if (item.x == null || item.y == null || !canPlace(item, item.x, item.y)) {
            outer: for (let y = 0; y < ROWS; y++) {
                for (let x = 0; x < COLS; x++) {
                    if (canPlace(item, x, y)) {
                        item.x = x; item.y = y;
                        break outer;
                    }
                }
            }
        }
        placeItemOnMap(idx, item);
    });

    let dragInfo = null;
    let previewEl = null;

    function clearPreview() {
        if (previewEl && previewEl.parentNode) {
            previewEl.parentNode.removeChild(previewEl);
        }
        previewEl = null;
    }

    function showPreview(item, x, y) {
        if (!previewEl) {
            previewEl = document.createElement('div');
            previewEl.className = 'mini-slot preview';
            grid.appendChild(previewEl);
        }
        previewEl.style.gridColumn = `${x + 1} / span ${item.width || 1}`;
        previewEl.style.gridRow = `${y + 1} / span ${item.height || 1}`;
        previewEl.innerHTML = '';
        if (item.image) {
            const img = document.createElement('img');
            img.src = `${item.image}?cb=${Date.now()}`;
            img.draggable = false;
            previewEl.appendChild(img);
        }
    }

    function handleMove(e) {
        if (!dragInfo) return;
        const rect = grid.getBoundingClientRect();
        const cellW = rect.width / COLS;
        const cellH = rect.height / ROWS;
        const x = Math.floor((e.clientX - rect.left - dragInfo.offsetX) / cellW);
        const y = Math.floor((e.clientY - rect.top - dragInfo.offsetY) / cellH);
        const item = worldInventory[dragInfo.index];
        if (x < 0 || y < 0 || x + (item.width || 1) > COLS || y + (item.height || 1) > ROWS) {
            clearPreview();
            return;
        }
        if (canPlace(item, x, y, dragInfo.index)) {
            showPreview(item, x, y);
        } else {
            clearPreview();
        }
    }

    async function handleUp(e) {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
        if (!dragInfo) return;
        const rect = grid.getBoundingClientRect();
        const cellW = rect.width / COLS;
        const cellH = rect.height / ROWS;
        const x = Math.floor((e.clientX - rect.left - dragInfo.offsetX) / cellW);
        const y = Math.floor((e.clientY - rect.top - dragInfo.offsetY) / cellH);
        const item = worldInventory[dragInfo.index];
        if (canPlace(item, x, y, dragInfo.index)) {
            item.x = x; item.y = y;
            renderWorldInventory();
            await window.electron.saveWorldInventory(currentWorld, worldInventory);
        }
        dragInfo.el.style.visibility = '';
        clearPreview();
        dragInfo = null;
    }

    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (map[y][x] !== null) continue;
            const blank = document.createElement('div');
            blank.className = 'mini-slot blank';
            blank.dataset.x = x;
            blank.dataset.y = y;
            grid.appendChild(blank);
        }
    }

    worldInventory.forEach((item, index) => {
        const slot = document.createElement('div');
        slot.className = 'mini-slot';
        slot.style.gridColumn = `${(item.x ?? 0) + 1} / span ${item.width || 1}`;
        slot.style.gridRow = `${(item.y ?? 0) + 1} / span ${item.height || 1}`;
        slot.dataset.x = item.x ?? 0;
        slot.dataset.y = item.y ?? 0;
        slot.addEventListener('mousedown', e => {
			e.preventDefault();
            const rect = slot.getBoundingClientRect();
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;
            dragInfo = { index, offsetX, offsetY, el: slot };
            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleUp);
            slot.style.visibility = 'hidden';
        });
        if (item.image) {
            const img = document.createElement('img');
            img.src = `${item.image}?cb=${Date.now()}`;
            img.draggable = false;
            slot.appendChild(img);
        }
        slot.addEventListener('mouseenter', (e) => showMiniItemInfo(item, e.currentTarget));
        slot.addEventListener('mouseleave', hideMiniItemInfo);
        grid.appendChild(slot);
    });
}

function renderStats() {
    if (!worldCharacter) return;
    const inventoryMods = [];
    worldInventory.forEach(item => {
        (item.stats || []).forEach(mod => {
            const m = { ...mod };
            if (item.stackable && item.quantityMultiplier) {
                m.value = m.value * item.quantity;
            }
            inventoryMods.push(m);
        });
    });
    const { finalStats, modifiers } = calculateFinalStats(worldCharacter.stats || {}, worldCharacter.traits || [], inventoryMods);
    updateCarryInfo(finalStats);
    if (worldCharacter.showStats === false) {
        document.getElementById('profile-stats').classList.add('hidden');
        renderUtilityAbilities();
        return { finalStats, modifiers };
    }
    const container = document.getElementById('profile-stats');
    const tableBody = document.querySelector('#stats-table tbody');
    container.classList.remove('hidden');
    tableBody.innerHTML = '';
    Object.keys(finalStats).forEach(key => {
        const tr = document.createElement('tr');
        const nameTd = document.createElement('td');
        nameTd.className = 'stat-name';
        const label = key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        nameTd.textContent = statAbbr[key] || label;

        const base = (worldCharacter.stats && worldCharacter.stats[key]) || 0;
        const baseTd = document.createElement('td');
        baseTd.className = 'base';
        baseTd.textContent = base;

        const mod = modifiers[key] || 0;
        const modTd = document.createElement('td');
        modTd.className = 'mod';
        if (mod > 0) {
            modTd.classList.add('positive');
            modTd.textContent = `+${Math.round(mod)}`;
        } else if (mod < 0) {
            modTd.classList.add('negative');
            modTd.textContent = `${Math.round(mod)}`;
        } else {
            modTd.textContent = '0';
        }

        const finalTd = document.createElement('td');
        finalTd.className = 'final';
        finalTd.textContent = Math.round(finalStats[key]);
        if (mod > 0) {
            finalTd.classList.add('positive');
        } else if (mod < 0) {
            finalTd.classList.add('negative');
        }

        tr.appendChild(nameTd);
        tr.appendChild(baseTd);
        tr.appendChild(modTd);
        tr.appendChild(finalTd);
        tableBody.appendChild(tr);
    });
    renderUtilityAbilities();
    return { finalStats, modifiers };
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
        } else if (type === 'boost' || type === 'add' || type === 'sub' || !type) {
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

function openItemInfo(index) {
    hideMiniItemInfo();
    const item = worldInventory[index];
    if (!item) return;
    const displayName = item.stackable ? `${item.name} [ x${item.quantity} ]` : item.name;
    document.getElementById('item-info-name').textContent = displayName || '';
    document.getElementById('item-info-rarity').textContent = item.rarity || '';
    const img = document.getElementById('item-info-image');
    if (item.image) {
        img.src = `${item.image}?cb=${Date.now()}`;
    } else {
        img.removeAttribute('src');
    }
    const statsDiv = document.getElementById('item-info-stats');
    statsDiv.innerHTML = '';
    (item.stats || []).forEach(s => {
        const p = document.createElement('p');
        const prefix = (s.type === 'mult' || s.type === 'mul') ? 'x' : '+';
        p.textContent = `${s.stat}: ${prefix}${s.value}`;
        statsDiv.appendChild(p);
    });
    document.getElementById('item-info-description').textContent = item.description || '';
    const valueEl = document.getElementById('item-info-value-text');
    const weightEl = document.getElementById('item-info-weight-text');
    if (item.stackable) {
        const total = (item.value || 0) * (item.quantity || 0);
        valueEl.textContent = `Base: ${item.value || 0} | Total: ${total}`;
        const totalW = (item.weight || 0) * (item.quantity || 0);
        weightEl.textContent = `Base: ${item.weight || 0} | Total: ${totalW}`;
    } else {
        valueEl.textContent = (item.value != null ? item.value : '');
        weightEl.textContent = (item.weight != null ? item.weight : '');
    }
    document.getElementById('item-drop-btn').onclick = () => {
        dropInventoryItem(index);
        document.getElementById('item-info-modal').classList.add('hidden');
    };
    document.getElementById('item-destroy-btn').onclick = () => {
        destroyInventoryItem(index);
        document.getElementById('item-info-modal').classList.add('hidden');
    };
    document.getElementById('item-info-modal').classList.remove('hidden');
}

async function showSelection(title, items) {
    return new Promise(resolve => {
        const overlay = document.getElementById('selection-overlay');
        const list = document.getElementById('selection-list');
        const cancel = document.getElementById('selection-cancel');
        const header = document.getElementById('selection-title');
        header.textContent = title;
        list.innerHTML = '';

        function cleanup() {
            overlay.classList.add('hidden');
            cancel.removeEventListener('click', onCancel);
        }

        function onCancel() {
            cleanup();
            resolve(null);
        }

        cancel.addEventListener('click', onCancel);

        items.forEach(item => {
            const tab = document.createElement('div');
            tab.className = 'selection-tab';
            const img = document.createElement('img');
            img.src = item.image;
            img.alt = item.name;
            tab.appendChild(img);
            const label = document.createElement('div');
            label.textContent = item.name;
            tab.appendChild(label);
            tab.addEventListener('click', () => {
                cleanup();
                resolve(item.name);
            });
            list.appendChild(tab);
        });

        overlay.classList.remove('hidden');
    });
}

function showZoneEntry(zone) {
    const container = document.getElementById('zone-entry');
    const content = document.getElementById('zone-entry-content');
    const nameEl = document.getElementById('zone-entry-name');
    if (!container || !content || !nameEl || !zone) return;
    nameEl.textContent = zone.name || '';
    nameEl.style.borderColor = zone.color || '#fff';
    container.classList.add('active');
    content.classList.remove('animate');
    // trigger reflow to restart animation
    void content.offsetWidth;
    content.classList.add('animate');
    if (zoneEntryTimeout) clearTimeout(zoneEntryTimeout);
    zoneEntryTimeout = setTimeout(() => {
        container.classList.remove('active');
        content.classList.remove('animate');
    }, 2800);
}
