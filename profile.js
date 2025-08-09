// Extract character and loadout names from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');
let activeLoadout = urlParams.get('loadout');
let currentProfileData = null;
let inventory = [];
const statAbbr = {
    strength: 'Str',
    dexterity: 'Dex',
    constitution: 'Con',
    endurance: 'End',
    intelligence: 'Int',
    charisma: 'Cha',
    fortitude: 'For'
};

function updateStatsDisplay() {
    if (!currentProfileData) return;
    const statsContainer = document.getElementById('profile-stats');
    const inventoryMods = [];
    inventory.forEach(item => {
        (item.stats || []).forEach(mod => inventoryMods.push(mod));
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
            nameTd.textContent = key.charAt(0).toUpperCase() + key.slice(1);

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
    traits.forEach(t => {
        if (Array.isArray(t.stats)) {
            t.stats.forEach(s => {
                if (s.stat && finalStats[s.stat] !== undefined) {
                    const val = Number(s.value) || 0;
                    let change = 0;
                    if (s.type === 'sub') {
                        change = -val;
                    } else if (s.type === 'mul') {
                        change = finalStats[s.stat] * (val / 100);
                    } else {
                        change = val;
                    }
                    finalStats[s.stat] += change;
                    modifiers[s.stat] = (modifiers[s.stat] || 0) + change;
                }
            });
        } else if (t.stat && finalStats[t.stat] !== undefined) {
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

    const traitsContainer = document.getElementById('profile-traits');
    traitsContainer.innerHTML = '';
    (data.traits || []).forEach(t => {
        const chip = document.createElement('div');
        chip.className = 'trait-chip';

        const textDiv = document.createElement('div');
        textDiv.className = 'trait-text';
        textDiv.textContent = t.text;
        textDiv.style.color = t.color || '#ffffff';
        chip.appendChild(textDiv);

        const modsDiv = document.createElement('div');
        modsDiv.className = 'trait-modifiers';
        const statsArr = Array.isArray(t.stats) ? t.stats : (t.stat ? [{ stat: t.stat, value: t.value, type: 'add' }] : []);
        statsArr.forEach(s => {
            if (!s.stat) return;
            const chipEl = document.createElement('div');
            chipEl.className = 'stat-chip';
            const abbr = statAbbr[s.stat] || s.stat.substring(0,3).toUpperCase();
            let val = s.type === 'mul' ? `${s.value}%` : `${s.type === 'sub' ? -s.value : s.value}`;
            const num = s.type === 'mul' ? s.value : (s.type === 'sub' ? -s.value : s.value);
            if (num >= 0) chipEl.classList.add('positive'); else chipEl.classList.add('negative');
            if (s.type !== 'mul' && num > 0) val = `+${val}`;
            chipEl.textContent = `${abbr}. ${val}`;
            modsDiv.appendChild(chipEl);
        });
        chip.appendChild(modsDiv);
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
    inventory.forEach((item, index) => {
        const tile = document.createElement('div');
        tile.className = 'inventory-tile';
        if (item.image) {
            const img = document.createElement('img');
            img.src = `${item.image}?cb=${Date.now()}`;
            tile.appendChild(img);
        } else {
            const span = document.createElement('span');
            span.textContent = item.name;
            tile.appendChild(span);
        }
        const left = document.createElement('button');
        left.className = 'move-left';
        left.textContent = '<';
        left.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (index > 0) {
                [inventory[index - 1], inventory[index]] = [inventory[index], inventory[index - 1]];
				renderInventory();
                await saveInventory();
            }
        });
        tile.appendChild(left);
        const right = document.createElement('button');
        right.className = 'move-right';
        right.textContent = '>';
        right.addEventListener('click', async (e) => {
            e.stopPropagation();
            if (index < inventory.length - 1) {
                [inventory[index + 1], inventory[index]] = [inventory[index], inventory[index + 1]];
				renderInventory();
                await saveInventory();
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

function formatCurrency(value) {
	return (Math.round(value) || 0).toLocaleString();
}

function openItemInfo(index) {
    const item = inventory[index];
    const modal = document.getElementById('item-info-modal');
	const nameEl = document.getElementById('item-info-name');
	nameEl.innerText = item.name;
	
	const rarityColors = {
		common: '#D1D1D1',
		uncommon: '#2BED2F',
		rare: '#24A9F0',
		epic: '#EAB8FF',
		legendary: '#FF980F'
	};
	
	const color = rarityColors[item.rarity] || rarityColors.common;
	nameEl.style.backgroundColor = "rgba(50,50,50,0.5)";
	nameEl.textContent = item.name;
	nameEl.style.color = color;
	
	const rarityEl = document.getElementById('item-info-rarity');
	rarityEl.textContent = (item.rarity || 'common').charAt(0).toUpperCase() + (item.rarity || 'common').slice(1);
	rarityEl.style.backgroundColor = color;
	
	
    const img = document.getElementById('item-info-image');
    if (item.image) {
        img.src = item.image;
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
        const abbr = statAbbr[s.stat] || s.stat.substring(0,3).toUpperCase();
        let val = s.type === 'mul' ? `${s.value}%` : `${s.type === 'sub' ? -s.value : s.value}`;
        const num = s.type === 'mul' ? s.value : (s.type === 'sub' ? -s.value : s.value);
        if (num >= 0) chip.classList.add('positive'); else chip.classList.add('negative');
        if (s.type !== 'mul' && num > 0) val = `+${val}`;
        chip.textContent = `${abbr}. ${val}`;
        statContainer.appendChild(chip);
    });
    document.getElementById('item-info-description').innerText = item.description || '';
    document.getElementById('item-info-value-text').innerText = formatCurrency(item.value);
    document.getElementById('item-edit-btn').onclick = () => { closeItemInfo(); openItemModal(index); };
    document.getElementById('item-delete-btn').onclick = async () => {
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
    if (file) {
        item.tempImagePath = file.path;
    } else if (index !== null) {
        item.image = inventory[index].image;
    }
    if (index !== null) {
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
    inventory = await window.electron.getInventory(characterName, loadoutName);
    activeLoadout = loadoutName;
    const imagePath = `app/characters/${characterName}/loadouts/${loadoutName}/image.png`;
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
    window.location.href = `edit-character.html?character=${characterName}`;
});

document.getElementById('edit-loadout-btn').addEventListener('click', () => {
    if (!activeLoadout) return;
    window.location.href = `loadout-editor.html?character=${characterName}&loadout=${activeLoadout}`;
});

document.getElementById('new-loadout-btn').addEventListener('click', async () => {
    const name = prompt('Enter loadout name:');
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

loadLoadouts();
if (activeLoadout) {
    loadLoadout(activeLoadout);
} else {
    loadCharacterProfile();
}