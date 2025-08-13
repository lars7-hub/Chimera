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

    const region = await window.electron.getMapRegion('region1');
    const mapGrid = document.getElementById('map-grid');
    mapGrid.style.gridTemplateColumns = `repeat(${region.width}, 1fr)`;
    mapGrid.style.gridTemplateRows = `repeat(${region.height}, 1fr)`;

    const tileMap = {};
    for (let y = 1; y <= region.height; y++) {
        for (let x = 1; x <= region.width; x++) {
            const tile = region.tiles.find(t => t.x === x && t.y === y) || { name: '', type: '', items: [] };
            const div = document.createElement('div');
            div.className = 'map-tile';
            div.dataset.x = x;
            div.dataset.y = y;
            mapGrid.appendChild(div);
            tileMap[`${x}-${y}`] = { el: div, data: tile };
        }
    }

    let currentKey = region.start ? `${region.start.x}-${region.start.y}` : '1-1';
    if (tileMap[currentKey]) {
        tileMap[currentKey].el.classList.add('current');
        displayTile(tileMap[currentKey].data);
    }

    mapGrid.addEventListener('click', (e) => {
        if (!e.target.classList.contains('map-tile')) return;
        const x = parseInt(e.target.dataset.x);
        const y = parseInt(e.target.dataset.y);
        const [cx, cy] = currentKey.split('-').map(Number);
        if (Math.abs(cx - x) + Math.abs(cy - y) === 1) {
            tileMap[currentKey].el.classList.remove('current');
            currentKey = `${x}-${y}`;
            tileMap[currentKey].el.classList.add('current');
            displayTile(tileMap[currentKey].data);
        }
    });
};

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
        window.location.href = url;
    } catch (err) {
        console.error(err);
    }
}