window.onload = function() {
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

    document.getElementById('module-characters').addEventListener('click', () => {
        window.location.href = 'character-select.html';
    });
    document.getElementById('module-random').addEventListener('click', goRandom);
    document.getElementById('module-info').addEventListener('click', () => {
        window.location.href = 'info.html';
    });
    document.getElementById('module-world').addEventListener('click', () => {
        window.location.href = 'world-builder.html';
    });
    document.getElementById('module-adventure').addEventListener('click', () => {
        window.location.href = 'adventure.html';
    });
};

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