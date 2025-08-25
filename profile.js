// Extract character and loadout names from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');
if (characterName) {
    localStorage.setItem('currentCharacter', characterName);
}
let activeLoadout = urlParams.get('loadout');
let currentProfileData = null;
let inventory = [];

function alignmentText(value) {
    if (value < -90) return 'pure evil';
    if (value < -25) return 'evil';
    if (value <= 24) return 'neutral';
    if (value <= 90) return 'good';
    return 'pure good';
}

function alignmentColor(value) {
    const clamped = Math.max(-100, Math.min(100, value));
    if (clamped < 0) {
        const t = (clamped + 100) / 100;
        const g = Math.round(255 * t);
        const b = g;
        return `rgb(255,${g},${b})`;
    }
    const t = clamped / 100;
    const r = Math.round(255 - (82 * t));
    const g = Math.round(255 - (39 * t));
    const b = Math.round(255 - (25 * t));
    return `rgb(${r},${g},${b})`;
}

function updateStatsDisplay() {
    if (!currentProfileData) return;
    const statsContainer = document.getElementById('profile-stats');
    const inventoryMods = [];
   inventory.forEach(item => {
        (item.stats || []).forEach(mod => {
            const m = { ...mod };
            if (item.stackable && item.quantityMultiplier) {
                m.value = m.value * item.quantity;
            }
            inventoryMods.push(m);
        });
    });
    const { finalStats, modifiers } = calculateFinalStats(currentProfileData.stats || {}, currentProfileData.traits || [], inventoryMods);
    const tableBody = document.querySelector('#stats-table tbody');
    if (currentProfileData.showStats) {
        statsContainer.style.display = 'block';
        tableBody.innerHTML = '';
        Object.keys(finalStats).forEach(key => {
            const tr = document.createElement('tr');
            const nameTd = document.createElement('td');
            nameTd.className = 'stat-name';
            const label = key.split('_').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
            nameTd.textContent = label;

            const base = (currentProfileData.stats && currentProfileData.stats[key]) || 0;
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
    } else {
        statsContainer.style.display = 'none';
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

// Display profile data in the DOM
function displayProfile(data, imagePath, loadoutName = null) {
	currentProfileData = data;
    document.getElementById('character-name').innerText = data.name;
    document.getElementById('character-description').innerText = data.description;

    const infoList = document.getElementById('core-info-list');
    infoList.innerHTML = '';
    const infoFields = [
        { key: 'age', label: 'Age' },
        { key: 'gender', label: 'Gender' },
        { key: 'height', label: 'Height' },
        { key: 'build', label: 'Build' },
        { key: 'occupation', label: 'Occupation' },
        { key: 'race', label: 'Race' },
        { key: 'affiliation', label: 'Affiliation' },
        { key: 'origin', label: 'Origin' },
        { key: 'goal', label: 'Goal' }
    ];
    infoFields.forEach(f => {
        if (data[f.key]) {
            const li = document.createElement('li');
            li.textContent = `${f.label}: ${data[f.key]}`;
            infoList.appendChild(li);
        }
    });

    const alignmentContainer = document.getElementById('alignment-container');
    const alignmentValue = parseInt(data.alignment);
    if (!isNaN(alignmentValue)) {
        const tick = document.getElementById('alignment-tick');
        const clamped = Math.max(-100, Math.min(100, alignmentValue));
        tick.style.left = `${(clamped + 100) / 2}%`;
        const label = document.getElementById('alignment-text');
        label.textContent = alignmentText(clamped);
        label.style.color = alignmentColor(clamped);
        alignmentContainer.style.display = 'block';
    } else {
        alignmentContainer.style.display = 'none';
    }

    const traitsContainer = document.getElementById('profile-traits');
    traitsContainer.innerHTML = '';
    (data.traits || []).forEach(t => {
        const chip = document.createElement('div');
        chip.className = 'trait-chip';

        const textDiv = document.createElement('div');
        textDiv.className = 'trait-text';
        const nameDiv = document.createElement('div');
        nameDiv.className = 'trait-name';
        nameDiv.textContent = t.name || t.text;
        nameDiv.style.color = t.color || '#ffffff';
        textDiv.appendChild(nameDiv);
        if (t.description) {
            const descDiv = document.createElement('div');
            descDiv.className = 'trait-desc';
            descDiv.textContent = t.description;
            textDiv.appendChild(descDiv);
        }
        chip.appendChild(textDiv);

        const modsDiv = document.createElement('div');
        modsDiv.className = 'trait-modifiers';
        const statsArr = Array.isArray(t.stats) ? t.stats : (t.stat ? [{ stat: t.stat, value: t.value, type: 'boost' }] : []);
        statsArr.forEach(s => {
            if (!s.stat) return;
            const chipEl = document.createElement('div');
            chipEl.className = 'stat-chip';

            const imgEl = document.createElement('img');
            imgEl.src = `resources/ui/${s.stat}.png`;
            imgEl.alt = s.stat;
            chipEl.appendChild(imgEl);

            const textEl = document.createElement('span');
            textEl.className = 'stat-chip-value';
            let display = '';
            if (s.type === 'mult' || s.type === 'mul') {
                display = `${s.value}x`;
                if (s.value > 1) textEl.classList.add('positive');
                else if (s.value < 1) textEl.classList.add('negative');
            } else {
                const num = s.value;
                display = num > 0 ? `+${num}` : `${num}`;
                if (num > 0) textEl.classList.add('positive');
                else if (num < 0) textEl.classList.add('negative');
            }
            textEl.textContent = display;
            chipEl.appendChild(textEl);
            modsDiv.appendChild(chipEl);
        });
        chip.appendChild(modsDiv);
                chip.addEventListener('click', () => openTraitInfo(t));

        traitsContainer.appendChild(chip);
    });

    const fit = data.imageFit === 'squish' ? 'fill' : 'cover';
    document.getElementById('profile-image').innerHTML =
        `<img src="${imagePath}" alt="${data.name}" style="width:100%;height:100%;object-fit:${fit};">`;

	const editLoadoutBtn = document.getElementById('edit-loadout-btn');
	const editCharacterBtn = document.getElementById('edit-character-btn');
	if (loadoutName) {
		editLoadoutBtn.style.display = 'block'; //this makes it so only one or the other button will Display
		editCharacterBtn.style.display = 'none'; //depending the page you are on
	} else {
		editLoadoutBtn.style.display = 'none'; //this makes it so only one or the other button will Display
		editCharacterBtn.style.display = 'block'; //depending the page you are on
	}
	renderInventory();
	updateStatsDisplay();
}


function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';

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

    // ensure all items have positions
    inventory.forEach((item, idx) => {
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

    function clearHighlights() {
        grid.querySelectorAll('.highlight').forEach(el => el.classList.remove('highlight'));
    }

    function highlightCells(item, x, y) {
        clearHighlights();
        const w = item.width || 1;
        const h = item.height || 1;
        for (let yy = y; yy < y + h; yy++) {
            for (let xx = x; xx < x + w; xx++) {
                const cellEl = grid.querySelector(`[data-x="${xx}"][data-y="${yy}"]`);
                if (cellEl) cellEl.classList.add('highlight');
            }
        }
    }

    // create blank cells
    for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
            if (map[y][x] !== null) continue;
            const blank = document.createElement('div');
            blank.className = 'inventory-tile blank';
            blank.dataset.x = x;
            blank.dataset.y = y;
            blank.addEventListener('click', () => openItemModal());
            blank.addEventListener('dragover', e => {
                e.preventDefault();
                const idx = parseInt(e.dataTransfer.getData('text/plain'));
                const item = inventory[idx];
                highlightCells(item, x, y);
            });
            blank.addEventListener('dragleave', clearHighlights);
            blank.addEventListener('drop', async e => {
                e.preventDefault();
                const idx = parseInt(e.dataTransfer.getData('text/plain'));
                const item = inventory[idx];
                if (canPlace(item, x, y, idx)) {
                    item.x = x; item.y = y;
                    renderInventory();
                    await saveInventory();
                }
                clearHighlights();
            });
            grid.appendChild(blank);
        }
    }

    // create item tiles
    inventory.forEach((item, index) => {
        const tile = document.createElement('div');
        tile.className = 'inventory-tile';
        tile.style.gridColumn = `${item.x + 1} / span ${item.width || 1}`;
        tile.style.gridRow = `${item.y + 1} / span ${item.height || 1}`;
        tile.draggable = true;
        tile.dataset.x = item.x;
        tile.dataset.y = item.y;
        tile.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', index);
            e.dataTransfer.setDragImage(tile, tile.offsetWidth / 2, tile.offsetHeight / 2);
        });
        tile.addEventListener('dragend', clearHighlights);
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
}

function openItemModal(index = null) {
    const modal = document.getElementById('item-modal');
    const form = document.getElementById('item-form');
    form.reset();
    document.getElementById('item-quantity-multiplier').checked = false;
    document.getElementById('item-maxstack').value = 1;
    document.getElementById('item-quantity').value = 1;
    document.getElementById('item-weight').value = 0;
    document.getElementById('item-width').value = 1;
    document.getElementById('item-height').value = 1;
    document.getElementById('item-modal-title').innerText = index === null ? 'Create Item' : 'Edit Item';
    const statsContainer = document.getElementById('item-stats');
    statsContainer.innerHTML = '';
    const statsList = ['strength','dexterity','constitution','endurance','intelligence','charisma','fortitude','carry_capacity'];
    statsList.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'item-stat-row';
        row.dataset.stat = stat;
        const label = stat.split('_').map(s=>s.charAt(0).toUpperCase()+s.slice(1)).join(' ');
        row.innerHTML = `<label>${label}</label>`+
            `<input type="number" class="stat-value" value="0" step="any">`+
            `<div class="type-toggle"><button type="button" class="type-btn active" data-type="boost">Boost</button><button type="button" class="type-btn" data-type="mult">x</button></div>`;
        statsContainer.appendChild(row);
        const toggle = row.querySelector('.type-toggle');
        toggle.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                toggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    });
    if (index !== null) {
        const item = inventory[index];
        document.getElementById('item-name').value = item.name || '';
        document.getElementById('item-rarity').value = item.rarity || 'common';
        document.getElementById('item-description').value = item.description || '';
        document.getElementById('item-stackable').checked = item.stackable || false;
        document.getElementById('item-maxstack').value = item.maxStack || 0;
        document.getElementById('item-quantity').value = item.quantity || 0;
        document.getElementById('item-quantity-multiplier').checked = item.quantityMultiplier || false;
        document.getElementById('item-value').value = item.value || 0;
        document.getElementById('item-weight').value = item.weight || 0;
        document.getElementById('item-width').value = item.width || 1;
        document.getElementById('item-height').value = item.height || 1;
        (item.stats || []).forEach(sm => {
            const row = statsContainer.querySelector(`[data-stat="${sm.stat}"]`);
            if (row) {
                row.querySelector('.stat-value').value = sm.value;
                const typeBtn = row.querySelector(`.type-btn[data-type="${(sm.type === 'mult' || sm.type === 'mul') ? 'mult' : 'boost'}"]`);
                if (typeBtn) {
                    row.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                    typeBtn.classList.add('active');
                }
            }
        });
        form.dataset.editIndex = index;
    } else {
        delete form.dataset.editIndex;
    }
    modal.classList.remove('hidden');
}

function closeItemModal() {
    const modal = document.getElementById('item-modal');
    modal.classList.add('hidden');
}

function formatCurrency(value) {
	return (Math.round(value) || 0).toLocaleString();
}

function openItemInfo(index) {
    const item = inventory[index];
    const modal = document.getElementById('item-info-modal');
    const nameEl = document.getElementById('item-info-name');
    const displayName = item.stackable ? `${item.name} [ x${item.quantity} ]` : item.name;
    const rarityColors = {
        common: '#D1D1D1',
        uncommon: '#2BED2F',
        rare: '#24A9F0',
        epic: '#EAB8FF',
        legendary: '#FF980F'
    };
    const color = rarityColors[item.rarity] || rarityColors.common;
    nameEl.style.backgroundColor = "rgba(50,50,50,0.5)";
    nameEl.style.color = color;
    nameEl.textContent = displayName;

    const rarityEl = document.getElementById('item-info-rarity');
    rarityEl.textContent = (item.rarity || 'common').charAt(0).toUpperCase() + (item.rarity || 'common').slice(1);
    rarityEl.style.backgroundColor = color;

    const img = document.getElementById('item-info-image');
    if (item.image) {
        img.src = `${item.image}?cb=${Date.now()}`;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
	
    const statContainer = document.getElementById('item-info-stats');
    statContainer.innerHTML = '';
    (item.stats || []).forEach(s => {
        if (!s.stat) return;
        const chip = document.createElement('div');
        chip.className = 'stat-chip';

        const imgEl = document.createElement('img');
        imgEl.src = `resources/ui/${s.stat}.png`;
        imgEl.alt = s.stat;
        chip.appendChild(imgEl);

        const textEl = document.createElement('span');
        textEl.className = 'stat-chip-value';
        let display = '';
        if (s.type === 'mult' || s.type === 'mul') {
            display = `${s.value}x`;
            if (s.value > 1) textEl.classList.add('positive');
            else if (s.value < 1) textEl.classList.add('negative');
        } else {
            const num = s.type === 'sub' ? -s.value : s.value;
            display = num > 0 ? `+${num}` : `${num}`;
            if (num > 0) textEl.classList.add('positive');
            else if (num < 0) textEl.classList.add('negative');
        }
        textEl.textContent = display;
        chip.appendChild(textEl);
        statContainer.appendChild(chip);
    });
    document.getElementById('item-info-description').innerText = item.description || '';
    const valueText = document.getElementById('item-info-value-text');
    const weightText = document.getElementById('item-info-weight-text');
    if (item.stackable) {
        const total = item.value * item.quantity;
        valueText.innerText = `Base: ${formatCurrency(item.value)} | Total: ${formatCurrency(total)}`;
        const totalW = (item.weight || 0) * (item.quantity || 0);
        weightText.innerText = `Base: ${item.weight || 0} | Total: ${totalW}`;
    } else {
        valueText.innerText = formatCurrency(item.value);
        weightText.innerText = item.weight != null ? item.weight : '';
    }
    document.getElementById('item-edit-btn').onclick = () => { closeItemInfo(); openItemModal(index); };
    document.getElementById('item-destroy-btn').onclick = async () => {
        if (!confirm('Destroy this item?')) return;
        inventory.splice(index,1);
        await saveInventory();
        closeItemInfo();
    };
    modal.classList.remove('hidden');
}

function closeItemInfo() {
    const modal = document.getElementById('item-info-modal');
    modal.classList.add('hidden');
}

function showPrompt(message) {
    return new Promise(resolve => {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <p>${message}</p>
                <input type="text" id="prompt-input">
                <div class="prompt-buttons">
                    <button id="prompt-ok">OK</button>
                    <button id="prompt-cancel">Cancel</button>
                </div>
            </div>`;
        document.body.appendChild(modal);
        const input = modal.querySelector('#prompt-input');
        input.focus();
        modal.querySelector('#prompt-ok').onclick = () => {
            const value = input.value.trim();
            modal.remove();
            resolve(value);
        };
        modal.querySelector('#prompt-cancel').onclick = () => {
            modal.remove();
            resolve(null);
        };
    });
}

async function handleItemFormSubmit(e) {
    e.preventDefault();
    const index = e.target.dataset.editIndex !== undefined ? parseInt(e.target.dataset.editIndex) : null;
    const item = {
        name: document.getElementById('item-name').value.trim(),
        rarity: document.getElementById('item-rarity').value,
        description: document.getElementById('item-description').value,
        stackable: document.getElementById('item-stackable').checked,
        maxStack: parseInt(document.getElementById('item-maxstack').value) || 0,
        quantity: parseInt(document.getElementById('item-quantity').value) || 0,
        quantityMultiplier: document.getElementById('item-quantity-multiplier').checked,
        value: parseFloat(document.getElementById('item-value').value) || 0,
        weight: parseFloat(document.getElementById('item-weight').value) || 0,
        width: parseInt(document.getElementById('item-width').value) || 1,
        height: parseInt(document.getElementById('item-height').value) || 1,
        stats: []
    };
    document.querySelectorAll('#item-stats .item-stat-row').forEach(row => {
        const val = parseFloat(row.querySelector('.stat-value').value) || 0;
        if (val !== 0) {
            const typeBtn = row.querySelector('.type-btn.active');
            const type = typeBtn ? typeBtn.dataset.type : 'boost';
            item.stats.push({ stat: row.dataset.stat, value: val, type });
        }
    });
    const file = document.getElementById('item-image').files[0];
    if (file) {
        item.tempImagePath = file.path;
    } else if (index !== null) {
        item.image = inventory[index].image;
    }
    if (item.stackable) {
        item.maxStack = item.maxStack > 0 ? item.maxStack : 1;
        item.quantity = item.quantity > 0 ? Math.min(item.quantity, item.maxStack) : 1;
    } else {
        item.maxStack = 1;
        item.quantity = 1;
    }
    if (index !== null) {
        item.x = inventory[index].x;
        item.y = inventory[index].y;
        inventory[index] = item;
    } else {
        inventory.push(item);
    }
    await saveInventory();
    closeItemModal();
}

async function saveInventory() {
    const loadoutName = activeLoadout || 'default';
    try {
        await window.electron.saveInventory(characterName, loadoutName, inventory);
        inventory = await window.electron.getInventory(characterName, loadoutName);
        renderInventory();
        updateStatsDisplay();
    } catch (err) {
        console.error('Error saving inventory:', err);
    }
}

document.getElementById('item-modal-close').addEventListener('click', closeItemModal);
document.getElementById('item-info-close').addEventListener('click', closeItemInfo);
document.getElementById('item-form').addEventListener('submit', handleItemFormSubmit);

// Load base character profile
async function loadCharacterProfile() {
    activeLoadout = null;
    const characterData = await window.electron.getCharacter(characterName);
    if (!characterData) {
        console.error('Character data not found:', characterName);
        return;
    }
    inventory = await window.electron.getInventory(characterName, 'default');
    const imagePath = await window.electron.getCharacterImage(characterName);
    displayProfile(characterData, imagePath);
}

// Load specific loadout profile
async function loadLoadout(loadoutName) {
    const loadoutData = await window.electron.getLoadout(characterName, loadoutName);
    if (!loadoutData) {
        console.error('Loadout data not found:', loadoutName);
        return;
    }
    inventory = await window.electron.getInventory(characterName, loadoutName);
    activeLoadout = loadoutName;
    const imagePath = await window.electron.getLoadoutImage(characterName, loadoutName);
    displayProfile(loadoutData, imagePath, loadoutName);
}

// Populate loadout list
async function loadLoadouts() {
    const loadouts = await window.electron.getLoadouts(characterName);
    const list = document.getElementById('loadout-list');
	if (!list) {
		console.error('Loadout list element not found');
		return;
	}
    list.innerHTML = '';

    const baseItem = document.createElement('div');
    baseItem.className = 'loadout-item';
    baseItem.innerText = 'Base';
    baseItem.addEventListener('click', loadCharacterProfile);
    list.appendChild(baseItem);

    loadouts.forEach(l => {
        const item = document.createElement('div');
        item.className = 'loadout-item';
        item.innerText = l.name;
        item.addEventListener('click', () => loadLoadout(l.name));
        list.appendChild(item);
    });
}

document.getElementById('edit-character-btn').addEventListener('click', () => {
    window.location.href = `character-editor.html?mode=edit&character=${characterName}`;
});

document.getElementById('edit-loadout-btn').addEventListener('click', () => {
    if (!activeLoadout) return;
    window.location.href = `character-editor.html?mode=loadout&character=${characterName}&loadout=${activeLoadout}`;
});

document.getElementById('new-loadout-btn').addEventListener('click', async () => {
    const name = await showPrompt('Enter loadout name:');
    if (!name) return;
    const result = await window.electron.createLoadout(characterName, name.trim());
    if (result && result.success) {
        loadLoadouts();
    } else if (result && result.message) {
        alert(result.message);
    }
});

document.getElementById('delete-loadout-btn').addEventListener('click', async () => {
    if (!activeLoadout) return;
    if (confirm(`Delete loadout ${activeLoadout}?`)) {
        const result = await window.electron.deleteLoadout(characterName, activeLoadout);
        if (result && result.success) {
            activeLoadout = null;
            loadLoadouts();
            loadCharacterProfile();
        } else if (result && result.message) {
            alert(result.message);
        }
    }
});

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('info-btn').addEventListener('click', () => {
    window.location.href = 'info.html';
});

document.getElementById('world-builder-btn').addEventListener('click', () => {
    window.location.href = 'world-builder.html';
});

document.getElementById('adventure-btn').addEventListener('click', () => {
    window.location.href = 'adventure.html';
});

document.getElementById('random-btn').addEventListener('click', goRandom);

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

loadLoadouts();
if (activeLoadout) {
    loadLoadout(activeLoadout);
} else {
    loadCharacterProfile();
}
function openTraitInfo(trait) {
    const modal = document.getElementById('trait-info-modal');
    document.getElementById('trait-info-name').textContent = trait.name || trait.text || '';
    document.getElementById('trait-info-description').textContent = trait.description || trait.desc || '';
    const statsDiv = document.getElementById('trait-info-stats');
    statsDiv.innerHTML = '';
    (trait.stats || []).forEach(s => {
        if (!s.stat) return;
        const chipEl = document.createElement('div');
        chipEl.className = 'stat-chip';
        const imgEl = document.createElement('img');
        imgEl.src = `resources/ui/${s.stat}.png`;
        imgEl.alt = s.stat;
        chipEl.appendChild(imgEl);
        const textEl = document.createElement('span');
        textEl.className = 'stat-chip-value';
        let display = '';
        if (s.type === 'mult' || s.type === 'mul') {
            display = `${s.value}x`;
            if (s.value > 1) textEl.classList.add('positive');
            else if (s.value < 1) textEl.classList.add('negative');
        } else {
            const num = s.value;
            display = num > 0 ? `+${num}` : `${num}`;
            if (num > 0) textEl.classList.add('positive');
            else if (num < 0) textEl.classList.add('negative');
        }
        textEl.textContent = display;
        chipEl.appendChild(textEl);
        statsDiv.appendChild(chipEl);
    });
    modal.classList.remove('hidden');
}

function closeTraitInfo() {
    document.getElementById('trait-info-modal').classList.add('hidden');
}

document.getElementById('trait-info-close').addEventListener('click', closeTraitInfo);