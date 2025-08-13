const tileIcons = {
    water: '🌊',
    tree: '🌳',
    building: '🏠',
    pond: '🐟',
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

window.onload = async function () {
    document.getElementById('home-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('info-btn').addEventListener('click', () => {
        window.location.href = 'info.html';
    });
    document.getElementById('random-btn').addEventListener('click', goRandom);
    document.getElementById('map-btn').addEventListener('click', () => {
        window.location.href = 'map.html';
    });
    document.getElementById('adventure-btn').addEventListener('click', () => {
        window.location.href = 'adventure.html';
    });
    document.getElementById('export-world-btn').addEventListener('click', () => {
        window.electron.exportWorld();
    });
    document.getElementById('import-world-btn').addEventListener('click', () => {
        window.electron.importWorld();
    });

    const editBtn = document.getElementById('edit-btn');
    const addTileBtn = document.getElementById('add-tile-btn');
    editBtn.addEventListener('click', () => {
        editMode = !editMode;
        editBtn.textContent = editMode ? 'Play Mode' : 'Edit Mode';
    });
    addTileBtn.addEventListener('click', async () => {
        if (!editMode) return;
        const x = parseInt(await showPrompt('Tile X coordinate:', ''));
        const y = parseInt(await showPrompt('Tile Y coordinate:', ''));
        if (!x || !y) return;
        gridWidth = Math.max(gridWidth, x);
        gridHeight = Math.max(gridHeight, y);
        const key = `${x}-${y}`;
        if (!tileMap[key]) {
            tileMap[key] = { data: { name: '', type: '', items: [], connections: [] } };
        }
        renderGrid();
        await editTile(x, y);
    });

        const region = await window.electron.getMapRegion('region1');
    gridWidth = region.width;
    gridHeight = region.height;
    tileMap = {};
    region.tiles.forEach(t => {
        tileMap[`${t.x}-${t.y}`] = { data: t };
    });
    currentKey = region.start ? `${region.start.x}-${region.start.y}` : '1-1';
    renderGrid();

    document.getElementById('map-grid').addEventListener('click', async (e) => {
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

function renderGrid() {
    const mapGrid = document.getElementById('map-grid');
    mapGrid.innerHTML = '';
    const rect = mapGrid.getBoundingClientRect();
    if (gridWidth === 0 || gridHeight === 0) return;
    tileSize = Math.floor(Math.min(rect.width / gridWidth, rect.height / gridHeight));
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
    const name = await showPrompt('Tile name:', entry.data.name || '');
    if (name === null) return;
    entry.data.name = name;
    const type = await showPrompt('Tile type:', entry.data.type || '');
    if (type !== null) entry.data.type = type;
    const items = [];
    while (true) {
        const itemName = await showPrompt('Item name (leave blank to finish):');
        if (!itemName) break;
        const itemDesc = await showPrompt('Item description:') || '';
        items.push({ name: itemName, description: itemDesc });
    }
    entry.data.items = items;
    const connectionsStr = await showPrompt('Connections (comma separated x-y):', (entry.data.connections || []).join(','));
    if (connectionsStr !== null) {
        entry.data.connections = connectionsStr.split(',').map(s => s.trim()).filter(Boolean);
    }
    updateTileVisual(entry);
    displayTile(entry.data);
    renderGrid();
}

function drawConnections() {
    document.querySelectorAll('.map-connection').forEach(el => el.remove());
    const mapGrid = document.getElementById('map-grid');
    for (const [key, entry] of Object.entries(tileMap)) {
        const [x, y] = key.split('-').map(Number);
        (entry.data.connections || []).forEach(conn => {
            if (key >= conn) return; // avoid duplicates
            const target = tileMap[conn];
            if (!target) return;
            const [nx, ny] = conn.split('-').map(Number);
            const x1 = (x - 1) * tileSize + tileSize / 2;
            const y1 = (y - 1) * tileSize + tileSize / 2;
            const x2 = (nx - 1) * tileSize + tileSize / 2;
            const y2 = (ny - 1) * tileSize + tileSize / 2;
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
