window.addEventListener('DOMContentLoaded', async () => {
    const worldSelect = document.getElementById('world-select');
    const librarySelect = document.getElementById('library-select');
    const dataArea = document.getElementById('library-data');
    const saveBtn = document.getElementById('save-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');

    const worlds = await window.electron.listWorlds();
    for (const name of worlds) {
        const opt = document.createElement('option');
        const hasLex = await window.electron.hasLexicon(name);
        opt.value = name;
        opt.textContent = hasLex ? name : `${name} (create)`;
        worldSelect.appendChild(opt);
    }

    let lexicon = {};

    async function load() {
        const world = worldSelect.value;
        if (!world) return;
        await window.electron.ensureLexicon(world);
        lexicon = await window.electron.getLexicon(world);
        updateText();
    }

    function updateText() {
        const lib = librarySelect.value;
        const data = lexicon[lib] || [];
        dataArea.value = JSON.stringify(data, null, 2);
    }

    worldSelect.addEventListener('change', load);
    librarySelect.addEventListener('change', updateText);

    saveBtn.addEventListener('click', async () => {
        const world = worldSelect.value;
        const lib = librarySelect.value;
        try {
            const parsed = JSON.parse(dataArea.value || '[]');
            await window.electron.saveLexicon(world, lib, parsed);
            lexicon[lib] = parsed;
            alert('Saved');
        } catch (err) {
            alert('Invalid JSON');
        }
    });

    importBtn.addEventListener('click', async () => {
        const world = worldSelect.value;
        if (!world) return;
        await window.electron.importLexicon(world);
        await load();
    });

    exportBtn.addEventListener('click', async () => {
        const world = worldSelect.value;
        if (!world) return;
        await window.electron.exportLexicon(world);
    });

    await load();
});