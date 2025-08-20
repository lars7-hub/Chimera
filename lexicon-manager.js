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

    const itemsEditor = document.getElementById('items-editor');
    const itemsTable = document.getElementById('items-table');
    const addItemBtn = document.getElementById('add-item-btn');

    const npcEditor = document.getElementById('npc-editor');
    const npcTable = document.getElementById('npc-table');
    const addNpcBtn = document.getElementById('add-npc-btn');

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

function buildItemsTable() {
        const data = Array.isArray(lexicon.items) ? lexicon.items : [];
        lexicon.items = data;
        itemsTable.innerHTML = '';

        const catListId = 'item-category-list';
        let catList = document.getElementById(catListId);
        if (!catList) {
            catList = document.createElement('datalist');
            catList.id = catListId;
            const categories = window.ITEM_CATEGORIES ? Object.keys(window.ITEM_CATEGORIES) : [];
            categories.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c;
                const def = window.ITEM_CATEGORIES && window.ITEM_CATEGORIES[c];
                if (def && def.name) opt.label = def.name;
                catList.appendChild(opt);
            });
            itemsEditor.appendChild(catList);
        }

        const head = document.createElement('tr');
        ['Key', 'Name', 'Category', 'Description', 'Rarity', 'Stackable', 'Max Stack', 'Value', 'Icon', 'Stats', ''].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            head.appendChild(th);
        });
        itemsTable.appendChild(head);

        data.forEach((item, idx) => {
            const tr = document.createElement('tr');

            const keyInput = document.createElement('input');
            keyInput.value = item.key || '';
            keyInput.addEventListener('input', e => item.key = e.target.value);
            const keyTd = document.createElement('td');
            keyTd.appendChild(keyInput);
            tr.appendChild(keyTd);

            const nameInput = document.createElement('input');
            nameInput.value = item.name || '';
            nameInput.addEventListener('input', e => item.name = e.target.value);
            const nameTd = document.createElement('td');
            nameTd.appendChild(nameInput);
            tr.appendChild(nameTd);

            const catInput = document.createElement('input');
            catInput.setAttribute('list', catListId);
            catInput.value = item.category || '';
            catInput.addEventListener('input', e => item.category = e.target.value);
            const catTd = document.createElement('td');
            catTd.appendChild(catInput);
            tr.appendChild(catTd);

            const descInput = document.createElement('input');
            descInput.value = item.description || '';
            descInput.addEventListener('input', e => item.description = e.target.value);
            const descTd = document.createElement('td');
            descTd.appendChild(descInput);
            tr.appendChild(descTd);

            const rarityInput = document.createElement('input');
            rarityInput.value = item.rarity || '';
            rarityInput.addEventListener('input', e => item.rarity = e.target.value);
            const rarityTd = document.createElement('td');
            rarityTd.appendChild(rarityInput);
            tr.appendChild(rarityTd);

            const stackInput = document.createElement('input');
            stackInput.type = 'checkbox';
            stackInput.checked = !!item.stackable;
            stackInput.addEventListener('change', e => item.stackable = e.target.checked);
            const stackTd = document.createElement('td');
            stackTd.appendChild(stackInput);
            tr.appendChild(stackTd);

            const maxInput = document.createElement('input');
            maxInput.type = 'number';
            maxInput.value = item.maxStack != null ? item.maxStack : 1;
            maxInput.addEventListener('input', e => item.maxStack = parseInt(e.target.value) || 1);
            const maxTd = document.createElement('td');
            maxTd.appendChild(maxInput);
            tr.appendChild(maxTd);

            const valInput = document.createElement('input');
            valInput.type = 'number';
            valInput.value = item.value != null ? item.value : 0;
            valInput.addEventListener('input', e => item.value = parseInt(e.target.value) || 0);
            const valTd = document.createElement('td');
            valTd.appendChild(valInput);
            tr.appendChild(valTd);

            const iconTd = document.createElement('td');
            const img = document.createElement('img');
            img.className = 'item-thumb';
            if (item.icon) img.src = item.icon;
            const imgBtn = document.createElement('button');
            imgBtn.textContent = 'Icon';
            imgBtn.addEventListener('click', async () => {
                const p = await window.electron.openFileDialog();
                if (p) {
                    const url = p.startsWith('file://') ? p : `file://${p}`;
                    item.icon = url;
                    img.src = url;
                }
            });
            iconTd.appendChild(img);
            iconTd.appendChild(imgBtn);
            tr.appendChild(iconTd);

            const statsInput = document.createElement('input');
            statsInput.value = JSON.stringify(item.stats || []);
            statsInput.addEventListener('input', e => {
                try {
                    item.stats = JSON.parse(e.target.value || '[]');
                    statsInput.classList.remove('error');
                } catch {
                    statsInput.classList.add('error');
                }
            });
            const statsTd = document.createElement('td');
            statsTd.appendChild(statsInput);
            tr.appendChild(statsTd);

            const remTd = document.createElement('td');
            const remBtn = document.createElement('button');
            remBtn.textContent = '×';
            remBtn.addEventListener('click', () => {
                data.splice(idx, 1);
                buildItemsTable();
            });
            remTd.appendChild(remBtn);
            tr.appendChild(remTd);

            itemsTable.appendChild(tr);
        });
    }

    addItemBtn.addEventListener('click', () => {
        const data = Array.isArray(lexicon.items) ? lexicon.items : [];
        const defCat = Object.keys(window.ITEM_CATEGORIES || {})[0] || '';
        data.push({ key: '', name: '', category: defCat, description: '', rarity: 'common', stackable: false, maxStack: 1, value: 0, icon: null, stats: [] });
        lexicon.items = data;
        buildItemsTable();
    });

    function buildNPCBlueprintsTable() {
        const data = Array.isArray(lexicon.npc_blueprints) ? lexicon.npc_blueprints : [];
        lexicon.npc_blueprints = data;
        npcTable.innerHTML = '';

        const typeListId = 'npc-type-list';
        const traitListId = 'npc-trait-list';
        const abilityListId = 'npc-ability-list';
        const itemListId = 'npc-item-list';

        function buildList(id, values, parent) {
            let list = document.getElementById(id);
            if (!list) {
                list = document.createElement('datalist');
                list.id = id;
                parent.appendChild(list);
            }
            list.innerHTML = '';
            values.forEach(v => {
                const opt = document.createElement('option');
                if (typeof v === 'string') {
                    opt.value = v;
                } else if (v && v.name) {
                    opt.value = v.name;
                } else if (v && v.key) {
                    opt.value = v.key;
                    if (v.name) opt.label = v.name;
                }
                list.appendChild(opt);
            });
            return list;
        }

        buildList(typeListId, (lexicon.typing && lexicon.typing.types) || [], npcEditor);
        buildList(traitListId, Array.isArray(lexicon.traits) ? lexicon.traits : [], npcEditor);
        buildList(abilityListId, Array.isArray(lexicon.abilities) ? lexicon.abilities : [], npcEditor);
        buildList(itemListId, Array.isArray(lexicon.items) ? lexicon.items : [], npcEditor);

        const head = document.createElement('tr');
        ['Species', 'Name', 'Description', 'Level', 'Types', 'Traits', 'Abilities', 'Inventory', 'Loot', 'XP', ''].forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            head.appendChild(th);
        });
        npcTable.appendChild(head);

        data.forEach((npc, idx) => {
            const tr = document.createElement('tr');

            const speciesInput = document.createElement('input');
            speciesInput.value = npc.species || '';
            speciesInput.addEventListener('input', e => npc.species = e.target.value);
            const speciesTd = document.createElement('td');
            speciesTd.appendChild(speciesInput);
            tr.appendChild(speciesTd);

            const nameInput = document.createElement('input');
            nameInput.value = npc.name || '';
            nameInput.addEventListener('input', e => npc.name = e.target.value);
            const nameTd = document.createElement('td');
            nameTd.appendChild(nameInput);
            tr.appendChild(nameTd);

            const descInput = document.createElement('input');
            descInput.value = npc.description || '';
            descInput.addEventListener('input', e => npc.description = e.target.value);
            const descTd = document.createElement('td');
            descTd.appendChild(descInput);
            tr.appendChild(descTd);

            const levelInput = document.createElement('input');
            levelInput.type = 'number';
            levelInput.value = npc.level != null ? npc.level : 1;
            levelInput.addEventListener('input', e => npc.level = parseInt(e.target.value) || 1);
            const levelTd = document.createElement('td');
            levelTd.appendChild(levelInput);
            tr.appendChild(levelTd);

            function arrayInput(values, listId, prop) {
                const input = document.createElement('input');
                input.setAttribute('list', listId);
                input.value = (npc[prop] || []).join(', ');
                input.addEventListener('input', e => {
                    npc[prop] = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                });
                const td = document.createElement('td');
                td.appendChild(input);
                tr.appendChild(td);
            }

            arrayInput((npc.types || []), typeListId, 'types');
            arrayInput((npc.traits || []), traitListId, 'traits');
            arrayInput((npc.abilities || []), abilityListId, 'abilities');
            arrayInput((npc.inventory || []), itemListId, 'inventory');

            const lootTd = document.createElement('td');
            const lootTable = document.createElement('table');
            (npc.lootTable || []).forEach((loot, lidx) => {
                const ltr = document.createElement('tr');
                const itemInput = document.createElement('input');
                itemInput.setAttribute('list', itemListId);
                itemInput.value = loot.item || '';
                itemInput.addEventListener('input', e => loot.item = e.target.value);
                const itemTd = document.createElement('td');
                itemTd.appendChild(itemInput);
                ltr.appendChild(itemTd);

                const chanceInput = document.createElement('input');
                chanceInput.type = 'number';
                chanceInput.value = loot.chance != null ? loot.chance : 100;
                chanceInput.addEventListener('input', e => loot.chance = parseFloat(e.target.value) || 0);
                const chanceTd = document.createElement('td');
                chanceTd.appendChild(chanceInput);
                ltr.appendChild(chanceTd);

                const minInput = document.createElement('input');
                minInput.type = 'number';
                minInput.value = loot.min != null ? loot.min : 1;
                minInput.addEventListener('input', e => loot.min = parseInt(e.target.value) || 0);
                const minTd = document.createElement('td');
                minTd.appendChild(minInput);
                ltr.appendChild(minTd);

                const maxInput = document.createElement('input');
                maxInput.type = 'number';
                maxInput.value = loot.max != null ? loot.max : 1;
                maxInput.addEventListener('input', e => loot.max = parseInt(e.target.value) || 0);
                const maxTd = document.createElement('td');
                maxTd.appendChild(maxInput);
                ltr.appendChild(maxTd);

                const remLootTd = document.createElement('td');
                const remLootBtn = document.createElement('button');
                remLootBtn.textContent = '×';
                remLootBtn.addEventListener('click', () => {
                    npc.lootTable.splice(lidx, 1);
                    buildNPCBlueprintsTable();
                });
                remLootTd.appendChild(remLootBtn);
                ltr.appendChild(remLootTd);

                lootTable.appendChild(ltr);
            });
            const addLootBtn = document.createElement('button');
            addLootBtn.textContent = '+';
            addLootBtn.addEventListener('click', () => {
                npc.lootTable = npc.lootTable || [];
                npc.lootTable.push({ item: '', chance: 100, min: 1, max: 1 });
                buildNPCBlueprintsTable();
            });
            lootTd.appendChild(lootTable);
            lootTd.appendChild(addLootBtn);
            tr.appendChild(lootTd);

            const xpInput = document.createElement('input');
            xpInput.type = 'number';
            xpInput.value = npc.xp != null ? npc.xp : 0;
            xpInput.addEventListener('input', e => npc.xp = parseInt(e.target.value) || 0);
            const xpTd = document.createElement('td');
            xpTd.appendChild(xpInput);
            tr.appendChild(xpTd);

            const remTd = document.createElement('td');
            const remBtn = document.createElement('button');
            remBtn.textContent = '×';
            remBtn.addEventListener('click', () => {
                data.splice(idx, 1);
                buildNPCBlueprintsTable();
            });
            remTd.appendChild(remBtn);
            tr.appendChild(remTd);

            npcTable.appendChild(tr);
        });
    }

    addNpcBtn.addEventListener('click', () => {
        const data = Array.isArray(lexicon.npc_blueprints) ? lexicon.npc_blueprints : [];
        data.push({ species: '', name: '', description: '', level: 1, types: [], traits: [], abilities: [], inventory: [], lootTable: [], xp: 0 });
        lexicon.npc_blueprints = data;
        buildNPCBlueprintsTable();
    });

    function showLibrary() {
        const lib = librarySelect.value;
        if (lib === 'typing') {
            chipEditor.classList.add('hidden');
            itemsEditor.classList.add('hidden');
            npcEditor.classList.add('hidden');
            typingEditor.classList.remove('hidden');
            buildTypingUI();
        } else if (lib === 'items') {
            typingEditor.classList.add('hidden');
            chipEditor.classList.add('hidden');
            npcEditor.classList.add('hidden');
            itemsEditor.classList.remove('hidden');
            buildItemsTable();
        } else if (lib === 'npc_blueprints') {
            typingEditor.classList.add('hidden');
            chipEditor.classList.add('hidden');
            itemsEditor.classList.add('hidden');
            npcEditor.classList.remove('hidden');
            buildNPCBlueprintsTable();
        } else {
            typingEditor.classList.add('hidden');
            itemsEditor.classList.add('hidden');
            npcEditor.classList.add('hidden');
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