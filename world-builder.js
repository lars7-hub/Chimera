const tileIcons = {
    water: '🌊',
    tree: '🌳',
    building: '🏠',
    fish: '🐟',
    mountain: '⛰️',
    town: '🏘️',
    land: ''
};
const tileTypes = Object.keys(tileIcons);
const tileColors = {
    water: '#1e90ff',
    tree: '#228b22',
    building: '#555555',
    fish: '#20b2aa',
    mountain: '#a9a9a9',
    town: '#cd853f',
    land: '#c2b280'
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
const tileGap = 6;

function startWorldEditing(name) {
    currentWorld = name;
    const menu = document.getElementById('world-menu');
    if (menu) menu.remove();
    const editor = document.getElementById('editor-container');
    if (editor) editor.classList.remove('hidden');
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
        const itemsInput = document.getElementById('tile-items-input');
        const grid = document.getElementById('tile-connection-grid');
        const saveBtn = document.getElementById('tile-save');
        const cancelBtn = document.getElementById('tile-cancel');
        const typeContainer = document.getElementById('tile-type-options');
        const bgBtn = document.getElementById('tile-bg-btn');
        const bgPreview = document.getElementById('tile-bg-preview');
        const oneWayBtn = document.getElementById('one-way-toggle');

        nameInput.value = data.name || '';
        itemsInput.value = (data.items || []).map(i => `${i.name}:${i.description || ''}`).join('\n');

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
            const files = await window.electron.listTileImages();
            const over = document.createElement('div');
            over.id = 'image-picker-overlay';
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
            over.appendChild(g);
            over.addEventListener('click', e => { if (e.target === over) document.body.removeChild(over); });
            document.body.appendChild(over);
        }
        bgBtn.addEventListener('click', pickBackground);

        function cleanup() {
            overlay.classList.add('hidden');
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
            bgBtn.removeEventListener('click', pickBackground);
        }

        async function onSave() {
            const items = itemsInput.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
                const [name, ...desc] = l.split(':');
                return { name: name.trim(), description: desc.join(':').trim() };
            });
            const connections = Object.keys(connectionState).filter(k => connectionState[k] > 0);
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
                items,
                connections,
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
        const curCons = (curEntry.data.connections || []);
        if (curCons.includes(key)) {
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
        const data = { ...t };
        if (data.type && !data.types) data.types = [data.type];
        delete data.type;
        tileMap[`${t.x}-${t.y}`] = { data };
        if (data.start) originKey = `${t.x}-${t.y}`;
    });
    currentKey = originKey;
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
}

function updateTileVisual(entry, key) {
    const types = entry.data.types || (entry.data.type ? [entry.data.type] : []);
    entry.el.textContent = entry.el.classList.contains('current') ? '🧍' : '';

    if (entry.data.background) {
        entry.el.style.backgroundImage = `url(resources/map/tiles/${entry.data.background})`;
        entry.el.style.backgroundSize = '100% 100%';
        entry.el.style.backgroundRepeat = 'no-repeat';
        entry.el.style.backgroundColor = '';
    } else {
        entry.el.style.backgroundImage = 'none';
        entry.el.style.backgroundColor = tileColors[types[0]] || '#111';
    }

    if (key === originKey) {
        const star = document.createElement('div');
        star.className = 'origin-marker';
        star.textContent = '⭐';
        star.style.fontSize = `${tileSize * 0.05}px`;
        entry.el.appendChild(star);
    }

    if (showTypeIcons && types.length) {
        const iconEl = document.createElement('div');
        iconEl.className = 'type-icons';
        iconEl.textContent = types.map(t => tileIcons[t] || '').join('');
        iconEl.style.fontSize = `${tileSize * 0.25}px`;
        entry.el.appendChild(iconEl);
    }
}

async function editTile(x, y) {
    const key = `${x}-${y}`;
    let entry = tileMap[key];
    if (!entry) {
        const div = document.querySelector(`.map-tile[data-x='${x}'][data-y='${y}']`);
        if (div) div.classList.remove('blank');
        entry = { el: div, data: { name: `Tile ${x}-${y}`, types: [], background: '', items: [], connections: [] } };
        tileMap[key] = entry;
    }

    const data = await openTileEditor(entry.data, x, y);
    if (!data) return;
    entry.data.name = data.name;
    entry.data.types = data.types;
    entry.data.background = data.background;
    entry.data.items = data.items;
    entry.data.connections = data.connections;
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
    displayTile(entry.data);
    renderGrid();
    saveRegion();
}

function drawConnections() {
    document.querySelectorAll('.map-connection').forEach(el => el.remove());
    const mapGrid = document.getElementById('map-module');
    const drawn = new Set();
    for (const [key, entry] of Object.entries(tileMap)) {
        const [x, y] = key.split('-').map(Number);
        (entry.data.connections || []).forEach(conn => {
            const pair = [key, conn].sort().join('|');
            if (drawn.has(pair)) return;
            drawn.add(pair);
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
    const types = tile.types || (tile.type ? [tile.type] : []);
    document.getElementById('tile-type').textContent = types.length ? `Type: ${types.join(', ')}` : '';
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
	cancel.addEventListener('click', () => document.body.removeChild(overlay));
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
            if (originKey === key) originKey = newKey;
        });
        tileMap = newMap;
    }
    updateBounds();
}
	
async function saveRegion() {
    const tiles = Object.entries(tileMap).map(([key, entry]) => {
        const [x, y] = key.split('-').map(Number);
        const data = { ...entry.data };
        if (data.type) delete data.type;
        return { x, y, ...data, start: key === originKey };
    });
    const [ox, oy] = originKey.split('-').map(Number);
    await window.electron.saveMapRegion('region1', currentWorld, tiles, { x: ox, y: oy });
}

function configureConnections(x, y) {
    const overlay = document.createElement('div');
    overlay.id = 'connection-overlay';
    const grid = document.createElement('div');
    grid.className = 'mini-map-grid';
    const connections = {};
    let oneWayMode = false;
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
                connections[key] = 1;
                cell.classList.add('existing', 'connected');
                cell.addEventListener('click', (e) => {
                    let state = connections[key];
                    if (oneWayMode) {
                        state = state === 2 ? 0 : 2;
                        connections[key] = state;
                        cell.classList.toggle('one-way', state === 2);
                        cell.classList.remove('connected');
                    } else {
                        state = state === 1 ? 0 : 1;
                        connections[key] = state;
                        cell.classList.toggle('connected', state === 1);
                        cell.classList.remove('one-way');
                    }
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
    const instr = document.createElement('p');
    instr.textContent = 'Select which tiles will connect to the new tile:';
    const toggle = document.createElement('button');
    toggle.textContent = 'One-Way Mode: Off';
    toggle.addEventListener('click', () => {
        oneWayMode = !oneWayMode;
        toggle.textContent = `One-Way Mode: ${oneWayMode ? 'On' : 'Off'}`;
    });
    container.appendChild(instr);
    container.appendChild(toggle);
    container.appendChild(grid);
    container.appendChild(btns);
    overlay.appendChild(container);
    document.body.appendChild(overlay);

    cancel.addEventListener('click', () => document.body.removeChild(overlay));
    ok.addEventListener('click', () => {
        const key = `${x}-${y}`;
        tileMap[key] = { data: { name: `Tile ${x}-${y}`, types: [], background: '', items: [], connections: Object.keys(connections).filter(k => connections[k] > 0) } };
        Object.entries(connections).forEach(([k, state]) => {
            const entry = tileMap[k];
            if (!entry) return;
            if (state === 1) {
                if (!(entry.data.connections || []).includes(key)) {
                    entry.data.connections.push(key);
                }
            } else if (state === 2) {
                entry.data.connections = (entry.data.connections || []).filter(c => c !== key);
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
                cell.classList.add('existing', 'deletable');
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
