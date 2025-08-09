// Extract character and loadout names from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');
let activeLoadout = urlParams.get('loadout');
let currentProfileData = null;
let inventory = [];

function calculateFinalStats(baseStats = {}, traits = [], inventoryMods = []) {
    const finalStats = { ...baseStats };
    const modifiers = {};
    traits.forEach(t => {
        if (t.stat && finalStats[t.stat] !== undefined) {
            const val = Number(t.value) || 0;
            finalStats[t.stat] += val;
            modifiers[t.stat] = (modifiers[t.stat] || 0) + val;
        }
    });
    inventoryMods.forEach(m => {
        if (m.stat && finalStats[m.stat] !== undefined) {
            const val = Number(m.value) || 0;
            let change = 0;
            if (m.type === 'sub') {
                change = -val;
            } else if (m.type === 'mul') {
                change = finalStats[m.stat] * (val / 100);
            } else {
                change = val;
            }
            finalStats[m.stat] += change;
            modifiers[m.stat] = (modifiers[m.stat] || 0) + change;
        }
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
        { key: 'alignment', label: 'Alignment' },
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

    const statsContainer = document.getElementById('profile-stats');
    const traitsContainer = document.getElementById('profile-traits');
    traitsContainer.innerHTML = '';

    const inventoryMods = [];
    (data.inventory || []).forEach(item => {
        (item.stats || []).forEach(mod => inventoryMods.push(mod));
    });
    const { finalStats, modifiers } = calculateFinalStats(data.stats || {}, data.traits || [], inventoryMods);
    if (data.showStats) {
        statsContainer.style.display = 'block';
        Object.keys(finalStats).forEach(key => {
            const el = document.getElementById(`stat-${key}`);
            if (el) {
                const base = (data.stats && data.stats[key]) || 0;
                const mod = modifiers[key] || 0;
                if (mod) {
                    const sign = mod > 0 ? '+' : '-';
                    el.innerText = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${base} ${sign} ${Math.abs(mod)} = ${finalStats[key]}`;
                } else {
                    el.innerText = `${key.charAt(0).toUpperCase() + key.slice(1)}: ${base}`;
                }
            }
        });
    } else {
        statsContainer.style.display = 'none';
    }

    (data.traits || []).forEach(t => {
        const p = document.createElement('p');
        p.textContent = t.text;
        p.style.color = t.color || '#ffffff';
        traitsContainer.appendChild(p);
    });

    const fit = data.imageFit === 'squish' ? 'fill' : 'cover';
    document.getElementById('profile-image').innerHTML =
        `<img src="${imagePath}" alt="${data.name}" style="width:100%;height:100%;object-fit:${fit};">`;

const editBtn = document.getElementById('edit-character-btn');
    if (loadoutName) {
        editBtn.innerText = 'Edit Loadout';
        editBtn.onclick = () => {
            window.location.href = `loadout-editor.html?character=${characterName}&loadout=${loadoutName}`;
        };
    } else {
        editBtn.innerText = 'Edit Character';
        editBtn.onclick = () => {
            window.location.href = `edit-character.html?character=${characterName}`;
        };
    }
    inventory = data.inventory || [];
    renderInventory();
}

function renderInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return;
    grid.innerHTML = '';
    inventory.forEach((item, index) => {
        const tile = document.createElement('div');
        tile.className = 'inventory-tile';
        if (item.image) {
            const img = document.createElement('img');
            img.src = item.image;
            tile.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = item.name;
            tile.appendChild(span);
        }
        const left = document.createElement('button');
        left.className = 'move-left';
        left.textContent = '<';
        left.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index > 0) {
                [inventory[index - 1], inventory[index]] = [inventory[index], inventory[index - 1]];
                saveInventory();
                renderInventory();
            }
        });
        tile.appendChild(left);
        const right = document.createElement('button');
        right.className = 'move-right';
        right.textContent = '>';
        right.addEventListener('click', (e) => {
            e.stopPropagation();
            if (index < inventory.length - 1) {
                [inventory[index + 1], inventory[index]] = [inventory[index], inventory[index + 1]];
                saveInventory();
                renderInventory();
            }
        });
        tile.appendChild(right);
        tile.addEventListener('click', () => openItemInfo(index));
        grid.appendChild(tile);
    });
    const blank = document.createElement('div');
    blank.className = 'inventory-tile blank';
    blank.textContent = '+';
    blank.addEventListener('click', () => openItemModal());
    grid.appendChild(blank);
}

function openItemModal(index = null) {
    const modal = document.getElementById('item-modal');
    const form = document.getElementById('item-form');
    form.reset();
    document.getElementById('item-modal-title').innerText = index === null ? 'Create Item' : 'Edit Item';
    const statsContainer = document.getElementById('item-stats');
    statsContainer.innerHTML = '';
    const statsList = ['strength','dexterity','constitution','endurance','intelligence','charisma','fortitude'];
    statsList.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'item-stat-row';
        row.dataset.stat = stat;
        row.innerHTML = `<label>${stat.charAt(0).toUpperCase()+stat.slice(1)}</label>`+
            `<input type="number" class="stat-value" value="0">`+
            `<select class="stat-type"><option value="add">Add</option><option value="sub">Subtract</option><option value="mul">Percent</option></select>`;
        statsContainer.appendChild(row);
    });
    if (index !== null) {
        const item = inventory[index];
        document.getElementById('item-name').value = item.name || '';
        document.getElementById('item-rarity').value = item.rarity || 'common';
        document.getElementById('item-description').value = item.description || '';
        document.getElementById('item-stackable').checked = item.stackable || false;
        document.getElementById('item-maxstack').value = item.maxStack || 0;
        document.getElementById('item-quantity').value = item.quantity || 0;
        document.getElementById('item-value').value = item.value || 0;
        (item.stats || []).forEach(sm => {
            const row = statsContainer.querySelector(`[data-stat="${sm.stat}"]`);
            if (row) {
                row.querySelector('.stat-value').value = sm.value;
                row.querySelector('.stat-type').value = sm.type;
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

function openItemInfo(index) {
    const item = inventory[index];
    const modal = document.getElementById('item-info-modal');
    document.getElementById('item-info-name').innerText = item.name;
    const img = document.getElementById('item-info-image');
    if (item.image) {
        img.src = item.image;
        img.style.display = 'block';
    } else {
        img.style.display = 'none';
    }
    document.getElementById('item-info-description').innerText = item.description || '';
    document.getElementById('item-edit-btn').onclick = () => { closeItemInfo(); openItemModal(index); };
    document.getElementById('item-delete-btn').onclick = () => {
        inventory.splice(index,1);
        saveInventory();
        renderInventory();
        closeItemInfo();
    };
    modal.classList.remove('hidden');
}

function closeItemInfo() {
    const modal = document.getElementById('item-info-modal');
    modal.classList.add('hidden');
}

function handleItemFormSubmit(e) {
    e.preventDefault();
    const index = e.target.dataset.editIndex !== undefined ? parseInt(e.target.dataset.editIndex) : null;
    const item = {
        name: document.getElementById('item-name').value.trim(),
        rarity: document.getElementById('item-rarity').value,
        description: document.getElementById('item-description').value,
        stackable: document.getElementById('item-stackable').checked,
        maxStack: parseInt(document.getElementById('item-maxstack').value) || 0,
        quantity: parseInt(document.getElementById('item-quantity').value) || 0,
        value: parseFloat(document.getElementById('item-value').value) || 0,
        stats: []
    };
    document.querySelectorAll('#item-stats .item-stat-row').forEach(row => {
        const val = parseFloat(row.querySelector('.stat-value').value) || 0;
        if (val !== 0) {
            item.stats.push({ stat: row.dataset.stat, value: val, type: row.querySelector('.stat-type').value });
        }
    });
    const file = document.getElementById('item-image').files[0];
    const finalize = () => {
        if (index !== null) {
            item.image = item.image || (inventory[index] && inventory[index].image);
            inventory[index] = item;
        } else {
            inventory.push(item);
        }
        saveInventory();
        renderInventory();
        closeItemModal();
    };
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            item.image = reader.result;
            finalize();
        };
        reader.readAsDataURL(file);
    } else {
        finalize();
    }
}

async function saveInventory() {
    if (!currentProfileData) return;
    currentProfileData.inventory = inventory;
    try {
        if (activeLoadout) {
            await window.electron.updateLoadout(characterName, activeLoadout, currentProfileData, null);
        } else {
            await window.electron.updateCharacter(characterName, currentProfileData, null);
        }
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
    const imagePath = `app/characters/${characterName}/${characterName}.png`;
    displayProfile(characterData, imagePath);
}

// Load specific loadout profile
async function loadLoadout(loadoutName) {
    const loadoutData = await window.electron.getLoadout(characterName, loadoutName);
    if (!loadoutData) {
        console.error('Loadout data not found:', loadoutName);
        return;
    }
    activeLoadout = loadoutName;
    const imagePath = `app/characters/${characterName}/loadouts/${loadoutName}.png`;
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

document.getElementById('add-loadout-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-loadout-name');
    const name = input.value.trim();
    if (!name) return;
    const result = await window.electron.createLoadout(characterName, name);
    if (result && result.success) {
        input.value = '';
        loadLoadouts();
    } else if (result && result.message) {
        alert(result.message);
    }
});

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

loadLoadouts();
if (activeLoadout) {
    loadLoadout(activeLoadout);
} else {
    loadCharacterProfile();
}