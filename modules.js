window.onload = function() {
    const homeBtn = document.getElementById('home-btn');
    if (homeBtn) homeBtn.addEventListener('click', () => { window.location.href = 'index.html'; });
    const infoBtn = document.getElementById('info-btn');
    if (infoBtn) infoBtn.addEventListener('click', () => { window.location.href = 'info.html'; });
    const worldBtn = document.getElementById('world-builder-btn');
    if (worldBtn) worldBtn.addEventListener('click', () => { window.location.href = 'world-builder.html'; });
    const adventureBtn = document.getElementById('adventure-btn');
    if (adventureBtn) adventureBtn.addEventListener('click', () => { window.location.href = 'adventure.html'; });
    const lexiconBtn = document.getElementById('lexicon-btn');
    if (lexiconBtn) lexiconBtn.addEventListener('click', () => { window.location.href = 'lexicon-manager.html'; });
    const randomBtn = document.getElementById('random-btn');
    if (randomBtn) randomBtn.addEventListener('click', goRandom);

    const modChars = document.getElementById('module-characters');
    if (modChars) modChars.addEventListener('click', () => { window.location.href = 'character-select.html'; });
    const modRandom = document.getElementById('module-random');
    if (modRandom) modRandom.addEventListener('click', goRandom);
    const modInfo = document.getElementById('module-info');
    if (modInfo) modInfo.addEventListener('click', () => { window.location.href = 'info.html'; });
    const modWorld = document.getElementById('module-world');
    if (modWorld) modWorld.addEventListener('click', () => { window.location.href = 'world-builder.html'; });
    const modAdv = document.getElementById('module-adventure');
    if (modAdv) modAdv.addEventListener('click', () => { window.location.href = 'adventure.html'; });
    const modLex = document.getElementById('module-lexicon');
    if (modLex) modLex.addEventListener('click', () => { window.location.href = 'lexicon-manager.html'; });
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