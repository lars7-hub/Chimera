window.addEventListener('DOMContentLoaded', async () => {
    const worldSelect = document.getElementById('world-select');
    const librarySelect = document.getElementById('library-select');
    const saveBtn = document.getElementById('save-btn');
    const importBtn = document.getElementById('import-btn');
    const exportBtn = document.getElementById('export-btn');

    const chipEditor = document.getElementById('chip-editor');
    const chipsDiv = document.getElementById('chips');
    const chipInput = document.getElementById('chip-input');
    const addChipBtn = document.getElementById('add-chip-btn');

    const typingEditor = document.getElementById('typing-editor');
    const typeChipsDiv = document.getElementById('type-chips');
    const typeInput = document.getElementById('type-input');
    const addTypeBtn = document.getElementById('add-type-btn');
    const typeTable = document.getElementById('type-table');

    const RELATIONS = [
        { label: 'Neutral', value: 1, class: 'relation-neutral' },
        { label: 'Weak', value: 0.75, class: 'relation-weak' },
        { label: 'Strong', value: 1.25, class: 'relation-strong' },
        { label: 'Immune', value: 0, class: 'relation-immune' }
    ];

    function relationByValue(value) {
        return RELATIONS.find(r => r.value === value) || RELATIONS[0];
    }

    function nextRelation(value) {
        const idx = RELATIONS.findIndex(r => r.value === value);
        return RELATIONS[(idx + 1) % RELATIONS.length];
    }

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
        showLibrary();
    }

    function buildChips() {
        const lib = librarySelect.value;
        const data = Array.isArray(lexicon[lib]) ? lexicon[lib] : [];
        lexicon[lib] = data;
        chipsDiv.innerHTML = '';
        data.forEach((item, idx) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = item;
            const btn = document.createElement('button');
            btn.textContent = '×';
            btn.addEventListener('click', () => {
                data.splice(idx, 1);
                buildChips();
            });
            chip.appendChild(btn);
            chipsDiv.appendChild(chip);
        });
    }

    addChipBtn.addEventListener('click', () => {
        const val = chipInput.value.trim();
        if (!val) return;
        const lib = librarySelect.value;
        const data = Array.isArray(lexicon[lib]) ? lexicon[lib] : [];
        data.push(val);
        lexicon[lib] = data;
        chipInput.value = '';
        buildChips();
    });

    function buildTypeChips() {
        const typing = lexicon.typing;
        typeChipsDiv.innerHTML = '';
        typing.types.forEach((type, idx) => {
            const chip = document.createElement('span');
            chip.className = 'chip';
            chip.textContent = type;
            const btn = document.createElement('button');
            btn.textContent = '×';
            btn.addEventListener('click', () => {
                const removed = typing.types.splice(idx, 1)[0];
                delete typing.table[removed];
                for (const t of typing.types) {
                    if (typing.table[t]) delete typing.table[t][removed];
                }
                buildTypingUI();
            });
            chip.appendChild(btn);
            typeChipsDiv.appendChild(chip);
        });
    }

    function buildTypeTable() {
        const typing = lexicon.typing;
        const types = typing.types;
        const tbl = typing.table;
        typeTable.innerHTML = '';
        const head = document.createElement('tr');
        head.appendChild(document.createElement('th'));
        for (const def of types) {
            const th = document.createElement('th');
            th.textContent = def;
            head.appendChild(th);
        }
        typeTable.appendChild(head);
        for (const atk of types) {
            const tr = document.createElement('tr');
            const th = document.createElement('th');
            th.textContent = atk;
            tr.appendChild(th);
            for (const def of types) {
                if (!tbl[atk]) tbl[atk] = {};
                if (tbl[atk][def] == null) tbl[atk][def] = 1;
                const rel = relationByValue(tbl[atk][def]);
                const td = document.createElement('td');
                td.textContent = rel.label;
                td.className = rel.class;
                td.addEventListener('click', () => {
                    const next = nextRelation(tbl[atk][def]);
                    tbl[atk][def] = next.value;
                    td.textContent = next.label;
                    td.className = next.class;
                });
                tr.appendChild(td);
            }
            typeTable.appendChild(tr);
        }
    }

    function buildTypingUI() {
        if (!lexicon.typing || !Array.isArray(lexicon.typing.types)) {
            if (Array.isArray(lexicon.typing)) {
                const types = lexicon.typing.map(t => t.name || t);
                const table = {};
                for (const atk of types) {
                    table[atk] = {};
                    for (const def of types) {
                        table[atk][def] = 1;
                    }
                }
                lexicon.typing = { types, table };
            } else {
                lexicon.typing = { types: [], table: {} };
            }
        }
        buildTypeChips();
        buildTypeTable();
    }

    addTypeBtn.addEventListener('click', () => {
        const val = typeInput.value.trim();
        if (!val) return;
        const typing = lexicon.typing || { types: [], table: {} };
        lexicon.typing = typing;
        if (!typing.types.includes(val)) {
            typing.types.push(val);
            if (!typing.table[val]) typing.table[val] = {};
            for (const t of typing.types) {
                if (!typing.table[val][t]) typing.table[val][t] = 1;
                if (!typing.table[t]) typing.table[t] = {};
                if (!typing.table[t][val]) typing.table[t][val] = 1;
            }
        }
        typeInput.value = '';
        buildTypingUI();
    });

    function showLibrary() {
        const lib = librarySelect.value;
        if (lib === 'typing') {
            chipEditor.classList.add('hidden');
            typingEditor.classList.remove('hidden');
            buildTypingUI();
        } else {
            typingEditor.classList.add('hidden');
            chipEditor.classList.remove('hidden');
            buildChips();
        }
    }

    worldSelect.addEventListener('change', load);
    librarySelect.addEventListener('change', showLibrary);

    saveBtn.addEventListener('click', async () => {
        const world = worldSelect.value;
        if (!world) return;
        const lib = librarySelect.value;
        const data = lib === 'typing' ? lexicon.typing : (lexicon[lib] || []);
        await window.electron.saveLexicon(world, lib, data);
        alert('Saved');
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