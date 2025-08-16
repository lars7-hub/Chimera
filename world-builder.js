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

const tileModPresets = {
    Village: {
        name: 'Village',
        icon: 'village0.png',
        message: "Welcome to our village!"
    }
};

const resourceDefs = window.RESOURCES || [];
const resourceByKey = {};
resourceDefs.forEach(r => { resourceByKey[r.key] = r; });

let editMode = false;
let gridWidth = 0;
let gridHeight = 0;
let tileMap = {};
let currentKey = '1-1';
let originKey = '1-1';
let tileSize = 0;
let currentWorld = null;
let showTypeIcons = false;
let paintMode = false;
const tileGap = 2;
let minX = 1, minY = 1, maxX = 0, maxY = 0;

function keyToCoords(key) {
	const idx = key.indexOf('-', 1);
	const x = parseInt(key.slice(0, idx), 10);
	const y = parseInt(key.slice(idx + 1), 10);
	return [x, y];
}

function coordsToKey(x, y) {
	return `${x}-${y}`;
}

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
        const resBtn = document.getElementById('tile-resource-btn');
        const grid = document.getElementById('tile-connection-grid');
        const saveBtn = document.getElementById('tile-save');
        const cancelBtn = document.getElementById('tile-cancel');
        const typeContainer = document.getElementById('tile-type-options');
        const bgBtn = document.getElementById('tile-bg-btn');
        const bgPreview = document.getElementById('tile-bg-preview');
        const oneWayBtn = document.getElementById('one-way-toggle');
        const modBtn = document.getElementById('tile-mod-btn');
        const modOverlay = document.getElementById('tile-mod-overlay');

        nameInput.value = data.name || '';
        itemsInput.value = (data.items || []).map(i => `${i.name}:${i.description || ''}`).join('\n');
        let resources = JSON.parse(JSON.stringify(data.resources || []));

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
        function openResourceEditor() {
            const overlay = document.getElementById('tile-resource-overlay');
            const list = document.getElementById('tile-resource-list');
            const addBtn = document.getElementById('tile-resource-add');
            const closeBtn = document.getElementById('tile-resource-close');

            function render() {
                list.innerHTML = '';
                resources.forEach((r, idx) => {
                    const row = document.createElement('div');
                    const img = document.createElement('img');
                    const def = resourceByKey[r.key] || resourceDefs.find(d => d.name === r.name) || resourceDefs[0];
                    r.key = def.key;
                    r.name = def.name;
                    img.src = `resources/ui/resources/${def.icon}`;
                    img.className = 'resource-icon';
                    row.appendChild(img);
                    const sel = document.createElement('select');
                    resourceDefs.forEach(def2 => {
                        const opt = document.createElement('option');
                        opt.value = def2.key;
                        opt.textContent = def2.name;
                        if (def2.key === r.key) opt.selected = true;
                        sel.appendChild(opt);
                    });
                    sel.addEventListener('change', () => {
                        const d = resourceByKey[sel.value];
                        r.key = d.key; r.name = d.name;
                        img.src = `resources/ui/resources/${d.icon}`;
                    });
                    row.appendChild(sel);
                    const amt = document.createElement('input');
                    amt.type = 'number';
                    amt.value = r.amount || 0;
                    amt.addEventListener('change', () => { r.amount = parseInt(amt.value,10) || 0; });
                    row.appendChild(amt);
                    const cb = document.createElement('input');
                    cb.type = 'checkbox';
                    cb.checked = !!r.renewable;
                    cb.addEventListener('change', () => { r.renewable = cb.checked; });
                    row.appendChild(cb);
                    const del = document.createElement('button');
                    del.textContent = 'X';
                    del.addEventListener('click', () => { resources.splice(idx,1); render(); });
                    row.appendChild(del);
                    list.appendChild(row);
                });
            }
            addBtn.onclick = () => {
                const d = resourceDefs[0];
                resources.push({ key: d.key, name: d.name, amount: 0, renewable: false });
                render();
            };
            function close() {
                overlay.classList.add('hidden');
                addBtn.onclick = null;
                closeBtn.onclick = null;
            }
            closeBtn.onclick = () => { close(); };
            render();
            overlay.classList.remove('hidden');
        }
        resBtn.addEventListener('click', openResourceEditor);
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
            saveBtn.removeEventListener('click', onSave);
            cancelBtn.removeEventListener('click', onCancel);
            bgBtn.removeEventListener('click', pickBackground);
            modBtn.removeEventListener('click', openModEditor);
            resBtn.removeEventListener('click', openResourceEditor);
        }

        async function onSave() {
            const items = itemsInput.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => {
                const [name, ...desc] = l.split(':');
                return { name: name.trim(), description: desc.join(':').trim() };
            });
            const resourcesOut = resources.map(r => ({ key: r.key, name: r.name, type: resourceByKey[r.key].type, renewable: !!r.renewable, amount: r.amount || 0 }));
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
                resources: resourcesOut,
                connections,
                modifiers,
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
    document.getElementById('add-item-btn').addEventListener('click', addItemToTile);
    document.getElementById('remove-item-btn').addEventListener('click', removeItemFromTile);
    document.getElementById('add-resource-btn').addEventListener('click', addResourceToTile);
    document.getElementById('remove-resource-btn').addEventListener('click', removeResourceFromTile);
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

    const paintToggle = document.getElementById('paint-toggle');
    const paintBiomeSelect = document.getElementById('paint-biome-select');
    tileTypes.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t;
        opt.textContent = t;
        paintBiomeSelect.appendChild(opt);
    });
    const paintModOptions = document.getElementById('paint-mod-options');
    Object.entries(tileModPresets).forEach(([key, p]) => {
        const label = document.createElement('label');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = key;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(p.name));
        paintModOptions.appendChild(label);
    });
    const paintResourceSelect = document.getElementById('paint-resource-select');
    resourceDefs.forEach(r => {
        const opt = document.createElement('option');
        opt.value = r.key;
        opt.textContent = r.name;
        paintResourceSelect.appendChild(opt);
    });
    paintToggle.addEventListener('click', () => {
        paintMode = !paintMode;
        paintToggle.textContent = paintMode ? 'Paint Mode: On' : 'Paint Mode: Off';
    });

    document.getElementById('map-module').addEventListener('click', async (e) => {
        if (!e.target.classList.contains('map-tile')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const key = `${x}-${y}`;
        if (paintMode) {
            await paintTile(x, y);
            return;
        }
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
            (cur.data.modifiers || []).forEach(m => {
                if (m.message) alert(m.message);
            });
        }
    });
    window.addEventListener('resize', renderGrid);
};

async function loadWorld() {
    const region = await window.electron.getMapRegion('region1', currentWorld);
    tileMap = {};
    region.tiles.forEach(t => {
        const data = { ...t };
        if (data.type && !data.types) data.types = [data.type];
        delete data.type;
		data.resources = data.resources || [];
        tileMap[`${t.x}-${t.y}`] = { data };
        if (data.start) originKey = `${t.x}-${t.y}`;
    });
    currentKey = originKey;
    updateBounds();
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
    for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
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

    (entry.data.modifiers || []).forEach(m => {
        if (!m.icon) return;
        const img = document.createElement('img');
        img.className = 'tile-mod-img';
        img.src = `resources/map/tilemod/${m.icon}`;
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
        entry = { el: div, data: { name: `Tile ${x}-${y}`, types: [], background: '', items: [], resources: [], connections: [] } };
        tileMap[key] = entry;
    }

    const data = await openTileEditor(entry.data, x, y);
    if (!data) return;
    entry.data.name = data.name;
    entry.data.types = data.types;
    entry.data.background = data.background;
    entry.data.items = data.items;
	entry.data.resources = data.resources;
    entry.data.connections = data.connections;
    entry.data.modifiers = data.modifiers;
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
        const [x, y] = keyToCoords(key);
        (entry.data.connections || []).forEach(conn => {
            const pair = [key, conn].sort().join('|');
            if (drawn.has(pair)) return;
            drawn.add(pair);
            const target = tileMap[conn];
            if (!target) return;
            const [nx, ny] = keyToCoords(conn);
            const x1 = (x - minX) * (tileSize + tileGap) + tileSize / 2;
            const y1 = (y - minY) * (tileSize + tileGap) + tileSize / 2;
            const x2 = (nx - minX) * (tileSize + tileGap) + tileSize / 2;
            const y2 = (ny - minY) * (tileSize + tileGap) + tileSize / 2;
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

function displayTile(tile, key = currentKey) {
    const [x, y] = keyToCoords(key);
    document.getElementById('tile-name').textContent = tile.name || '';
    document.getElementById('tile-coords').textContent = `Coordinates: ${x}, ${y}`;
    const types = tile.types || (tile.type ? [tile.type] : []);
    document.getElementById('tile-type').textContent = types.length ? `Type: ${types.join(', ')}` : '';
    const list = document.getElementById('tile-items');
    list.innerHTML = '';
    (tile.items || []).forEach(item => {
        const li = document.createElement('li');
        li.textContent = item.name || 'Item';
        list.appendChild(li);
    });
    const resList = document.getElementById('tile-resources');
    if (resList) {
        resList.innerHTML = '';
        (tile.resources || []).forEach(r => {
            const li = document.createElement('li');
            const def = resourceByKey[r.key] || resourceDefs.find(d => d.name === r.name);
            if (def) {
                const img = document.createElement('img');
                img.src = `resources/ui/resources/${def.icon}`;
                img.className = 'resource-icon';
                li.appendChild(img);
            }
            const text = document.createTextNode(`${r.name} x${r.amount || 0} ${r.renewable ? '(Renewable)' : '(Finite)'}`);
            li.appendChild(text);
            resList.appendChild(li);
        });
    }
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

async function paintTile(x, y) {
    const key = `${x}-${y}`;
    const biomeChecked = document.getElementById('paint-biome-cb').checked;
    const nameChecked = document.getElementById('paint-name-cb').checked;
    const clearChecked = document.getElementById('paint-clear-cb').checked;
    const modChecked = document.getElementById('paint-mod-cb').checked;
    const connChecked = document.getElementById('paint-conn-cb').checked;
    const resModeEl = document.querySelector('input[name="paint-resource-mode"]:checked');
    const resMode = resModeEl ? resModeEl.value : null;
    const resKey = document.getElementById('paint-resource-select').value;
    const resAmt = parseInt(document.getElementById('paint-resource-amount').value, 10) || 0;
    const resRenew = document.getElementById('paint-resource-renewable').checked;

    if (clearChecked) {
        if (tileMap[key]) {
            delete tileMap[key];
            Object.values(tileMap).forEach(e => {
                e.data.connections = (e.data.connections || []).filter(c => c !== key);
            });
        }
        renderGrid();
        saveRegion();
        return;
    }

    let entry = tileMap[key];
    if (!entry) {
        entry = { data: { name: `Tile ${x}-${y}`, types: [], background: '', items: [], resources: [], connections: [], modifiers: [] } };
        tileMap[key] = entry;
    }

    if (nameChecked) {
        entry.data.name = `Tile ${x}-${y}`;
    }
    if (biomeChecked) {
        const t = document.getElementById('paint-biome-select').value;
        if (t) {
            entry.data.types = [t];
            const bg = await window.electron.getRandomTileImage(t);
            if (bg) entry.data.background = bg;
        }
    }
    if (modChecked) {
        const mods = Array.from(document.querySelectorAll('#paint-mod-options input:checked')).map(cb => ({ ...tileModPresets[cb.value] }));
        entry.data.modifiers = mods;
    }

    if (resMode) {
        if (resMode === 'clear') {
            entry.data.resources = [];
        } else {
            const def = resourceByKey[resKey];
            if (def) {
                entry.data.resources = entry.data.resources || [];
                let r = entry.data.resources.find(rr => rr.key === resKey);
                if (!r) {
                    r = { key: def.key, name: def.name, type: def.type, renewable: resRenew, amount: 0 };
                    entry.data.resources.push(r);
                }
                if (resMode === 'add') {
                    r.amount += resAmt;
                    r.renewable = resRenew;
                } else if (resMode === 'remove') {
                    r.amount -= resAmt;
                    if (r.amount <= 0) {
                        if (r.renewable) r.amount = 0; else entry.data.resources = entry.data.resources.filter(rr => rr !== r);
                    }
                }
            }
        }
    }

    if (connChecked) {
        regenerateConnections(x, y);
    }

    renderGrid();
    saveRegion();
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
}
	
async function saveRegion() {
    const tiles = Object.entries(tileMap).map(([key, entry]) => {
        const [x, y] = keyToCoords(key);
        const data = { ...entry.data };
        if (data.type) delete data.type;
        return { x, y, ...data, start: key === originKey };
    });
    const [ox, oy] = keyToCoords(originKey);
    await window.electron.saveMapRegion('region1', currentWorld, tiles, { x: ox, y: oy });
}

function configureConnections(x, y, starterType = '', starterBg = '') {
    const key = `${x}-${y}`;
    tileMap[key] = {
        data: {
            name: `Tile ${x}-${y}`,
            types: starterType ? [starterType] : [],
            background: starterBg,
            items: [],
			resources: [],
            connections: [],
            modifiers: []
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

async function addResourceToTile() {
    const entry = tileMap[currentKey];
    if (!entry) return;
    const key = await showPrompt('Resource key:\n' + resourceDefs.map(r => r.key).join(', '));
    if (!key) return;
    const def = resourceByKey[key];
    if (!def) return;
    const renewableStr = await showPrompt('Is it renewable? (yes/no):', 'yes');
    if (renewableStr === null) return;
    const amountStr = await showPrompt('Amount:', '0');
    if (amountStr === null) return;
    const renewable = renewableStr.toLowerCase().startsWith('y');
    entry.data.resources = entry.data.resources || [];
    entry.data.resources.push({ key: def.key, name: def.name, type: def.type, renewable, amount: parseInt(amountStr, 10) || 0 });
    displayTile(entry.data);
    saveRegion();
}

async function removeResourceFromTile() {
    const entry = tileMap[currentKey];
    if (!entry || !(entry.data.resources || []).length) return;
    const key = await showPrompt('Resource key to remove:');
    if (!key) return;
    entry.data.resources = entry.data.resources.filter(r => r.key !== key && r.name !== key);
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