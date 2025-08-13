window.onload = async function () {
    document.getElementById('home-btn').addEventListener('click', () => {
        window.location.href = 'index.html';
    });
    document.getElementById('info-btn').addEventListener('click', () => {
        window.location.href = 'info.html';
    });
    document.getElementById('map-btn').addEventListener('click', () => {
        window.location.href = 'map.html';
    });
    document.getElementById('adventure-btn').addEventListener('click', () => {
        window.location.href = 'adventure.html';
    });
    document.getElementById('random-btn').addEventListener('click', goRandom);
    document.getElementById('new-adventure-btn').addEventListener('click', newAdventure);
    loadAdventures();
};

async function loadAdventures() {
    const list = document.getElementById('adventure-list');
    list.innerHTML = '';
    const adventures = await window.electron.getAdventures();
    adventures.forEach(name => {
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.className = 'adventure-chip';
        btn.addEventListener('click', () => {
            alert(`Loading adventure: ${name}`);
        });
        list.appendChild(btn);
    });
}

async function newAdventure() {
    const name = prompt('Enter adventure name:');
    if (!name || !/^[A-Za-z0-9 ]+$/.test(name)) {
        alert('Invalid name. Use letters, numbers and spaces only.');
        return;
    }
    const trimmed = name.trim();
    const result = await window.electron.createAdventure(trimmed);
    if (!result || !result.success) {
        alert(result && result.message ? result.message : 'Failed to create adventure');
        return;
    }
    selectCharacter(trimmed);
}

async function selectCharacter(saveName) {
    const selectDiv = document.getElementById('character-select');
    selectDiv.style.display = 'block';
    const chips = document.getElementById('character-chips');
    chips.innerHTML = '';
    const chars = await window.electron.getCharacters();
    chars.forEach(c => {
        const chip = document.createElement('div');
        chip.className = 'character-chip';
        const img = document.createElement('img');
        img.src = c.imagePath;
        img.alt = c.name;
        chip.appendChild(img);
        chip.addEventListener('click', () => chooseLoadout(saveName, c.name));
        chips.appendChild(chip);
    });
}

async function chooseLoadout(saveName, charName) {
    const loads = await window.electron.getLoadouts(charName);
    const loadDiv = document.getElementById('loadout-select');
    const chips = document.getElementById('loadout-chips');
    chips.innerHTML = '';
    if (loads.length) {
        loadDiv.style.display = 'block';
        loads.forEach(l => {
            const btn = document.createElement('button');
            btn.textContent = l.name;
            btn.addEventListener('click', () => finalizeAdventure(saveName, charName, l.name));
            chips.appendChild(btn);
        });
        const defBtn = document.createElement('button');
        defBtn.textContent = 'default';
        defBtn.addEventListener('click', () => finalizeAdventure(saveName, charName, 'default'));
        chips.appendChild(defBtn);
    } else {
        loadDiv.style.display = 'none';
        finalizeAdventure(saveName, charName, null);
    }
}

async function finalizeAdventure(saveName, charName, loadout) {
    await window.electron.prepareAdventureCharacter(saveName, charName, loadout);
    document.getElementById('character-select').style.display = 'none';
    loadAdventures();
    alert('Adventure created!');
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