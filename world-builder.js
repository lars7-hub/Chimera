const tileIcons = {
    water: '🌊',
    tree: '🌳',
    building: '🏠',
    fish: '🐟',
    mountain: '⛰️',
    town: '🏘️',
    land: ''
};

let editMode = false;
let gridWidth = 0;
let gridHeight = 0;
let tileMap = {};
let currentKey = '1-1';
let tileSize = 0;
let currentWorld = null;
const tileGap = 4;

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
        const typeInput = document.getElementById('tile-type-input');
        const itemsInput = document.getElementById('tile-items-input');
        const grid = document.getElementById('tile-connection-grid');
        const saveBtn = document.getElementById('tile-save');
        const cancelBtn = document.getElementById('tile-cancel');

        nameInput.value = data.name || '';
        typeInput.value = data.type || '';
        itemsInput.value = (data.items || []).map(i => `${i.name}:${i.description || ''}`).join('\n');
        grid.innerHTML = '';
        const connectionState = {};
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
                    connectionState[key] = connected;
                    cell.classList.add('existing', connected ? 'connected' : 'disconnected');
                    cell.addEventListener('click', () => {
                        connectionState[key] = !connectionState[key];
                        cell.classList.toggle('connected', connectionState[key]);
                        cell.classList.toggle('disconnected', !connectionState[key]);
                    });
                } else {
                    cell.classList.add('phantom');
                }
                grid.appendChild(cell);
            }
        }
        overlay.classList.remove('hidden');

        function cleanup() {
            overlay.classList.add('hidden');
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
        }

        function onSave() {
            const items = itemsInput.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
                const [name, ...desc] = l.split(':');
                return { name: name.trim(), description: desc.join(':').trim() };
            });
            const connections = Object.keys(connectionState).filter(k => connectionState[k]);
            const obj = {
                name: nameInput.value,
                type: typeInput.value,
                items,
                connections
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
            currentWorld = name;
            document.getElementById('world-menu').classList.add('hidden');
            document.getElementById('editor-container').classList.remove('hidden');
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
    document.getElementById('export-world-btn').addEventListener('click', () => {
        if (currentWorld) window.electron.exportWorld(currentWorld);
    });
    document.getElementById('import-world-btn').addEventListener('click', async () => {
        if (!currentWorld) return;
        await window.electron.importWorld(currentWorld);
        await loadWorld();
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
        currentWorld = name;
        document.getElementById('world-menu').classList.add('hidden');
        document.getElementById('editor-container').classList.remove('hidden');
        await loadWorld();
    });

    document.getElementById('edit-btn').addEventListener('click', () => {
        editMode = !editMode;
        document.getElementById('edit-btn').textContent = editMode ? 'Play Mode' : 'Edit Mode';
    });
    document.getElementById('edit-current-btn').addEventListener('click', async () => {
        const [x, y] = currentKey.split('-').map(Number);
        await editTile(x, y);
    });
    document.getElementById('add-adjacent-btn').addEventListener('click', () => {
        addAdjacentTile();
    });
    document.getElementById('delete-adjacent-btn').addEventListener('click', () => {
        deleteAdjacentTile();
    });
    document.getElementById('refresh-btn').addEventListener('click', renderGrid);
    document.getElementById('add-item-btn').addEventListener('click', addItemToTile);
    document.getElementById('remove-item-btn').addEventListener('click', removeItemFromTile);

    document.getElementById('map-module').addEventListener('click', async (e) => {
        if (!e.target.classList.contains('map-tile')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const key = `${x}-${y}`;
        if (editMode) {
            await editTile(x, y);
            return;
        }
        if (!tileMap[key]) return;
        const curEntry = tileMap[currentKey];
        const targetEntry = tileMap[key];
        const curCons = (curEntry.data.connections || []);
        const targetCons = (targetEntry.data.connections || []);
        if (curCons.includes(key) || targetCons.includes(currentKey)) {
            const prev = tileMap[currentKey];
            if (prev) {
                prev.el.classList.remove('current');
                updateTileVisual(prev);
            }
            currentKey = key;
            const cur = tileMap[currentKey];
            cur.el.classList.add('current');
            updateTileVisual(cur);
            displayTile(cur.data);
        }
    });
    window.addEventListener('resize', renderGrid);
};

async function loadWorld() {
    const region = await window.electron.getMapRegion('region1', currentWorld);
    gridWidth = region.width;
    gridHeight = region.height;
    tileMap = {};
    region.tiles.forEach(t => {
        tileMap[`${t.x}-${t.y}`] = { data: t };
    });
    currentKey = region.start ? `${region.start.x}-${region.start.y}` : '1-1';
    normalizeCoordinates();
    renderGrid();
}

function renderGrid() {
    const mapGrid = document.getElementById('map-module');
    mapGrid.innerHTML = '';
    const rect = mapGrid.getBoundingClientRect();
    if (gridWidth === 0 || gridHeight === 0) return;
    tileSize = Math.floor(Math.min(
        (rect.width - tileGap * (gridWidth - 1)) / gridWidth,
        (rect.height - tileGap * (gridHeight - 1)) / gridHeight
    ));
    mapGrid.style.gap = `${tileGap}px`;
    mapGrid.style.gridTemplateColumns = `repeat(${gridWidth}, ${tileSize}px)`;
    mapGrid.style.gridTemplateRows = `repeat(${gridHeight}, ${tileSize}px)`;
    for (let y = 1; y <= gridHeight; y++) {
        for (let x = 1; x <= gridWidth; x++) {
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
                updateTileVisual(entry);
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
}

function updateTileVisual(entry) {
    const icon = tileIcons[entry.data.type] || '';
    entry.el.textContent = icon;
    if (entry.el.classList.contains('current')) {
        entry.el.textContent = '🧍' + icon;
    }
}

async function editTile(x, y) {
    const key = `${x}-${y}`;
    let entry = tileMap[key];
    if (!entry) {
        const div = document.querySelector(`.map-tile[data-x='${x}'][data-y='${y}']`);
        if (div) div.classList.remove('blank');
        entry = { el: div, data: { name: '', type: '', items: [], connections: [] } };
        tileMap[key] = entry;
    }
	
    const data = await openTileEditor(entry.data, x, y);
    if (!data) return;
    entry.data = data;
    updateTileVisual(entry);
    displayTile(entry.data);
    renderGrid();
	saveRegion();
}

function drawConnections() {
    document.querySelectorAll('.map-connection').forEach(el => el.remove());
    const mapGrid = document.getElementById('map-module');
    for (const [key, entry] of Object.entries(tileMap)) {
        const [x, y] = key.split('-').map(Number);
        (entry.data.connections || []).forEach(conn => {
            if (key >= conn) return; // avoid duplicates
            const target = tileMap[conn];
            if (!target) return;
            const [nx, ny] = conn.split('-').map(Number);
            const x1 = (x - 1) * (tileSize + tileGap) + tileSize / 2;
            const y1 = (y - 1) * (tileSize + tileGap) + tileSize / 2;
            const x2 = (nx - 1) * (tileSize + tileGap) + tileSize / 2;
            const y2 = (ny - 1) * (tileSize + tileGap) + tileSize / 2;
            const length = Math.hypot(x2 - x1, y2 - y1);
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            const line = document.createElement('div');
            line.className = 'map-connection';
            line.style.width = `${length}px`;
            line.style.left = `${x1}px`;
            line.style.top = `${y1}px`;
            line.style.transform = `rotate(${angle}deg)`;
            mapGrid.appendChild(line);
        });
    }
}

function displayTile(tile) {
    document.getElementById('tile-name').textContent = tile.name || '';
    document.getElementById('tile-type').textContent = tile.type ? `Type: ${tile.type}` : '';
    const list = document.getElementById('tile-items');
    list.innerHTML = '';
    (tile.items || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.name || 'Item';
        list.appendChild(li);
    });
}

function addAdjacentTile() {
    const [cx, cy] = currentKey.split('-').map(Number);
    const overlay = document.createElement('div');
    overlay.id = 'mini-map-overlay';
    const container = document.createElement('div');
	const grid = document.createElement('div');
	grid.className = 'mini-map-grid';
	for (let dy = -1; dy <= 1; dy++) {
		for(let dx = -1; dx <= 1; dx++) {
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
				cell.addEventListener('click', () => {
					document.body.removeChild(overlay);
					configureConnections(x, y);
				});
			}
			grid.appendChild(cell);
		}
	}
	container.appendChild(grid);
	const btns = document.createElement('div');
	btns.className = 'editor-buttons';
	const cancel = document.createElement('button');
	cancel.textContent = 'Cancel';
	cancel.addEventListener = 'click', () => document.body.removeChild(overlay);
	btns.appendChild(cancel);
	container.appendChild(btns);
	overlay.appendChild(container);
	document.body.appendChild(overlay);
}

//Update map size to fit all tiles
function updateBounds() {
	let maxX = 0, maxY = 0;
	Object.keys(tileMap).forEach(k => {
		const [x, y] = k.split('-').map(Number);
		if (x > maxX) maxX = x;
		if (y > maxY) maxY = y;
	});
	gridWidth = maxX;
	gridHeight = maxY;
}

function normalizeCoordinates() {
    let minX = Infinity, minY = Infinity;
    Object.keys(tileMap).forEach(k => {
        const [x, y] = k.split('-').map(Number);
        if (x < minX) minX = x;
        if (y < minY) minY = y;
    });
    const shiftX = minX < 1 ? 1 - minX : 0;
    const shiftY = minY < 1 ? 1 - minY : 0;
    if (shiftX || shiftY) {
        const newMap = {};
        Object.entries(tileMap).forEach(([key, entry]) => {
            const [x, y] = key.split('-').map(Number);
            const nx = x + shiftX;
            const ny = y + shiftY;
            const newKey = `${nx}-${ny}`;
            entry.data.connections = (entry.data.connections || []).map(c => {
                const [cx, cy] = c.split('-').map(Number);
                return `${cx + shiftX}-${cy + shiftY}`;
            });
            newMap[newKey] = entry;
            if (currentKey === key) currentKey = newKey;
        });
        tileMap = newMap;
    }
    updateBounds();
}
	
async function saveRegion() {
	const tiles = Object.entries(tileMap).map(([key, entry]) => {
		const [x, y] = key.split('-').map(Number);
		return { x, y, ...entry.data};
	});
	await window.electron.saveMapRegion('region1', currentWorld, tiles);
}	

function configureConnections(x, y) {
    const overlay = document.createElement('div');
    overlay.id = 'connection-overlay';
    const grid = document.createElement('div');
    grid.className = 'mini-map-grid';
    const connections = {};
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            const key = `${nx}-${ny}`;
            const cell = document.createElement('div');
            cell.className = 'mini-map-cell';
            if (dx === 0 && dy === 0) {
                cell.textContent = 'N';
                cell.classList.add('existing');
            } else if (tileMap[key]) {
                connections[key] = true;
                cell.classList.add('existing', 'connected');
                cell.addEventListener('click', () => {
                    connections[key] = !connections[key];
                    cell.classList.toggle('connected', connections[key]);
                    cell.classList.toggle('disconnected', !connections[key]);
                });
            } else {
                cell.classList.add('phantom');
            }
            grid.appendChild(cell);
        }
    }
    const btns = document.createElement('div');
    btns.className = 'editor-buttons';
    const ok = document.createElement('button');
    ok.textContent = 'Create';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    btns.appendChild(ok);
    btns.appendChild(cancel);
    const container = document.createElement('div');
    const instr = document.createElement('p');
    instr.textContent = 'Select which tiles will connect to the new tile:';
    container.appendChild(instr);
    container.appendChild(grid);
    container.appendChild(btns);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    cancel.addEventListener('click', () => document.body.removeChild(overlay));
    ok.addEventListener('click', () => {
        const key = `${x}-${y}`;
        tileMap[key] = { data: { name: '', type: '', items: [], connections: Object.keys(connections).filter(k => connections[k]) } };
        Object.keys(connections).forEach(k => {
            if (connections[k]) {
                const entry = tileMap[k];
		if (entry && !(entry.data.connecions || []).includes(key)) {
                     entry.data.connections.push(key);
                    }
                }
        });
        document.body.removeChild(overlay);
		normalizeCoordinates();
        renderGrid();
		saveRegion();
    });
}

function deleteAdjacentTile() {
    const [cx, cy] = currentKey.split('-').map(Number);
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
                cell.classList.add('existing');
                cell.addEventListener('click', () => {
                    delete tileMap[key];
                    Object.values(tileMap).forEach(e => {
                        e.data.connections = (e.data.connections || []).filter(c => c !== key);
                    });
                    document.body.removeChild(overlay);
					normalizeCoordinates();
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

async function addItemToTile() {
    const entry = tileMap[currentKey];
    if (!entry) return;
    const name = await showPrompt('Item name:');
    if (!name) return;
    const desc = await showPrompt('Item description:', '') || '';
    entry.data.items.push({ name, description: desc });
    displayTile(entry.data);
	saveRegion();
}

async function removeItemFromTile() {
    const entry = tileMap[currentKey];
    if (!entry || !(entry.data.items || []).length) return;
    const name = await showPrompt('Item name to remove:');
    if (!name) return;
    entry.data.items = entry.data.items.filter(i => i.name !== name);
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
