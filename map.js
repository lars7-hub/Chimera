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
    addTileBtn.addEventListener('click', () => {
        if (!editMode) return;
        const x = parseInt(prompt('Tile X coordinate:', ''));
        const y = parseInt(prompt('Tile Y coordinate:', ''));
        if (!x || !y) return;
        gridWidth = Math.max(gridWidth, x);
        gridHeight = Math.max(gridHeight, y);
        const key = `${x}-${y}`;
        if (!tileMap[key]) {
            tileMap[key] = { data: { name: '', type: '', items: [] } };
        }
        renderGrid();
        editTile(x, y);
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

    document.getElementById('map-grid').addEventListener('click', (e) => {
        if (!e.target.classList.contains('map-tile')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const key = `${x}-${y}`;
        if (editMode) {
            editTile(x, y);
            return;
        }
        if (!tileMap[key]) return;
        const [cx, cy] = currentKey.split('-').map(Number);
        if (Math.abs(cx - x) + Math.abs(cy - y) === 1) {
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
};

function renderGrid() {
    const mapGrid = document.getElementById('map-grid');
    mapGrid.innerHTML = '';
    mapGrid.style.gridTemplateColumns = `repeat(${gridWidth}, 1fr)`;
    mapGrid.style.gridTemplateRows = `repeat(${gridHeight}, 1fr)`;
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

function editTile(x, y) {
    const key = `${x}-${y}`;
    let entry = tileMap[key];
    if (!entry) {
        const div = document.querySelector(`.map-tile[data-x='${x}'][data-y='${y}']`);
        if (div) div.classList.remove('blank');
        entry = { el: div, data: { name: '', type: '', items: [] } };
        tileMap[key] = entry;
    }
    const name = prompt('Tile name:', entry.data.name || '');
    if (name === null) return;
    entry.data.name = name;
    const type = prompt('Tile type:', entry.data.type || '');
    if (type !== null) entry.data.type = type;
    const items = [];
    while (true) {
        const itemName = prompt('Item name (leave blank to finish):');
        if (!itemName) break;
        const itemDesc = prompt('Item description:') || '';
        items.push({ name: itemName, description: itemDesc });
    }
    entry.data.items = items;
    updateTileVisual(entry);
    displayTile(entry.data);
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
