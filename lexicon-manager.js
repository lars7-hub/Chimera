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

    const traitsEditor = document.getElementById('traits-editor');
    const traitsContainer = document.getElementById('traits-container');
    const addTraitBtn = document.getElementById('add-trait-btn');
    const traitModal = document.getElementById('trait-modal');
    const traitForm = document.getElementById('trait-form');
    const traitModalTitle = document.getElementById('trait-modal-title');
    const traitNameInput = document.getElementById('trait-name');
    const traitDescInput = document.getElementById('trait-desc');
    const traitColorInput = document.getElementById('trait-color');
    const traitDeleteBtn = document.getElementById('trait-delete-btn');
    const traitStatsContainer = document.getElementById('trait-stats-container');
    const addStatBtn = document.getElementById('add-stat-btn');
    const traitModalClose = document.getElementById('trait-modal-close');
    const traitInfoModal = document.getElementById('trait-info-modal');
    const traitInfoClose = document.getElementById('trait-info-close');

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

    const RARITIES = ['common','uncommon','rare','epic','legendary'];
    const RARITY_COLORS = {
        common: '#ccc',
        uncommon: '#5EAC24',
        rare: '#4169E1',
        epic: '#9932CC',
        legendary: '#FFA500'
    };
    const STAT_INFO = [
        { key: 'strength', label: 'Strength', desc: 'Increases physical power and physical damage-dealing potential.' },
        { key: 'dexterity', label: 'Dexterity', desc: 'Improves agility and reflexes. Useful for delicate tools as well.' },
        { key: 'constitution', label: 'Constitution', desc: 'Represents the amount of Health one has.' },
        { key: 'endurance', label: 'Endurance', desc: 'Stamina reserves and Lifespan/longevity.' },
        { key: 'intelligence', label: 'Intelligence', desc: 'Determines Intellect and reasoning. Also governs magical and mental abilities.' },
        { key: 'charisma', label: 'Charisma', desc: 'Influences persuasion and charm. Represents physical attractiveness and verbal influence.' },
        { key: 'fortitude', label: 'Fortitude', desc: 'Enhances resistance to damage. Affects resistance to the elements, toxins, crippling conditions, etc. Governs physical defense rating.' }
    ];

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

    // Trait editor functions
    let traitsData = [];
    let editingTraitIndex = null;

    function createTypeToggle(initialType = 'boost') {
        const toggle = document.createElement('div');
        toggle.className = 'type-toggle';
        const boostBtn = document.createElement('button');
        boostBtn.type = 'button';
        boostBtn.textContent = 'Stat Boost';
        boostBtn.className = 'type-btn';
        boostBtn.dataset.type = 'boost';
        const multBtn = document.createElement('button');
        multBtn.type = 'button';
        multBtn.textContent = 'Multiplier';
        multBtn.className = 'type-btn';
        multBtn.dataset.type = 'mult';
        toggle.appendChild(boostBtn);
        toggle.appendChild(multBtn);
        toggle.querySelectorAll('.type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                toggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
        const type = (initialType === 'mul' || initialType === 'mult') ? 'mult' : 'boost';
        toggle.querySelector(`.type-btn[data-type="${type}"]`).classList.add('active');
        return toggle;
    }

    function createStatRow(data = {}) {
        const row = document.createElement('div');
        row.className = 'trait-stat-row';

        const statSelect = document.createElement('select');
        statSelect.className = 'stat-select';
        statSelect.innerHTML = `
            <option value="">None</option>
            <option value="strength">Strength</option>
            <option value="dexterity">Dexterity</option>
            <option value="constitution">Constitution</option>
            <option value="endurance">Endurance</option>
            <option value="intelligence">Intelligence</option>
            <option value="charisma">Charisma</option>
            <option value="fortitude">Fortitude</option>`;
        statSelect.value = data.stat || '';
        row.appendChild(statSelect);

        const valueInput = document.createElement('input');
        valueInput.type = 'number';
        valueInput.className = 'stat-value';
        valueInput.value = data.value || 0;
        row.appendChild(valueInput);

        const toggle = createTypeToggle(data.type || 'boost');
        row.appendChild(toggle);

        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.textContent = 'Delete Stat';
        removeBtn.className = 'remove-stat-btn delete-btn';
        removeBtn.addEventListener('click', () => row.remove());
        row.appendChild(removeBtn);

        traitStatsContainer.appendChild(row);
    }

    addStatBtn.addEventListener('click', () => createStatRow());

    function renderTraits() {
        traitsContainer.innerHTML = '';
        traitsData.forEach((t, index) => {
            const chip = document.createElement('div');
            chip.className = 'trait-chip';

            const textDiv = document.createElement('div');
            textDiv.className = 'trait-text';
            const nameDiv = document.createElement('div');
            nameDiv.className = 'trait-name';
            nameDiv.textContent = t.name || t.text;
            nameDiv.style.color = t.color || '#ffffff';
            textDiv.appendChild(nameDiv);
            if (t.description) {
                const descDiv = document.createElement('div');
                descDiv.className = 'trait-desc';
                descDiv.textContent = t.description;
                textDiv.appendChild(descDiv);
            }
            chip.appendChild(textDiv);

            const modsDiv = document.createElement('div');
            modsDiv.className = 'trait-modifiers';
            const statsArr = Array.isArray(t.stats) ? t.stats : [];
            statsArr.forEach(s => {
                if (!s.stat) return;
                const chipEl = document.createElement('div');
                chipEl.className = 'stat-chip';
                const imgEl = document.createElement('img');
                imgEl.src = `resources/ui/${s.stat}.png`;
                imgEl.alt = s.stat;
                chipEl.appendChild(imgEl);
                const textEl = document.createElement('span');
                textEl.className = 'stat-chip-value';
                let display = '';
                if (s.type === 'mult' || s.type === 'mul') {
                    display = `${s.value}x`;
                    if (s.value > 1) textEl.classList.add('positive');
                    else if (s.value < 1) textEl.classList.add('negative');
                } else {
                    const num = s.value;
                    display = num > 0 ? `+${num}` : `${num}`;
                    if (num > 0) textEl.classList.add('positive');
                    else if (num < 0) textEl.classList.add('negative');
                }
                textEl.textContent = display;
                chipEl.appendChild(textEl);
                modsDiv.appendChild(chipEl);
            });
            chip.appendChild(modsDiv);
            chip.addEventListener('click', () => openTraitInfo(index));
            traitsContainer.appendChild(chip);
        });
    }

    function openTraitInfo(index) {
        const trait = traitsData[index];
        document.getElementById('trait-info-name').textContent = trait.name || '';
        document.getElementById('trait-info-description').textContent = trait.description || '';
        const statsDiv = document.getElementById('trait-info-stats');
        statsDiv.innerHTML = '';
        (trait.stats || []).forEach(s => {
            if (!s.stat) return;
            const chipEl = document.createElement('div');
            chipEl.className = 'stat-chip';
            const imgEl = document.createElement('img');
            imgEl.src = `resources/ui/${s.stat}.png`;
            imgEl.alt = s.stat;
            chipEl.appendChild(imgEl);
            const textEl = document.createElement('span');
            textEl.className = 'stat-chip-value';
            let display = '';
            if (s.type === 'mult' || s.type === 'mul') {
                display = `${s.value}x`;
                if (s.value > 1) textEl.classList.add('positive');
                else if (s.value < 1) textEl.classList.add('negative');
            } else {
                const num = s.value;
                display = num > 0 ? `+${num}` : `${num}`;
                if (num > 0) textEl.classList.add('positive');
                else if (num < 0) textEl.classList.add('negative');
            }
            textEl.textContent = display;
            chipEl.appendChild(textEl);
            statsDiv.appendChild(chipEl);
        });
        traitInfoModal.classList.remove('hidden');
        document.getElementById('trait-edit-btn').onclick = () => { traitInfoModal.classList.add('hidden'); openTraitModal(index); };
        document.getElementById('trait-remove-btn').onclick = () => {
            traitsData.splice(index, 1);
            renderTraits();
            traitInfoModal.classList.add('hidden');
        };
    }

    function closeTraitInfo() {
        traitInfoModal.classList.add('hidden');
    }

    traitInfoClose.addEventListener('click', closeTraitInfo);

    function openTraitModal(index) {
        editingTraitIndex = index;
        traitStatsContainer.innerHTML = '';
        if (index != null) {
            const t = traitsData[index];
            traitModalTitle.textContent = 'Edit Trait';
            traitNameInput.value = t.name || t.text || '';
            traitDescInput.value = t.description || '';
            const statsArr = Array.isArray(t.stats) && t.stats.length ? t.stats : [{}];
            statsArr.forEach(s => createStatRow(s));
            traitColorInput.value = t.color || '#ffffff';
            traitDeleteBtn.style.display = 'inline-block';
        } else {
            traitModalTitle.textContent = 'Add Trait';
            traitNameInput.value = '';
            traitDescInput.value = '';
            createStatRow();
            traitColorInput.value = '#ffffff';
            traitDeleteBtn.style.display = 'none';
        }
        traitModal.classList.remove('hidden');
    }

    function closeTraitModal() {
        traitModal.classList.add('hidden');
    }

    traitModalClose.addEventListener('click', closeTraitModal);
    addTraitBtn.addEventListener('click', () => openTraitModal());

    traitDeleteBtn.addEventListener('click', () => {
        if (editingTraitIndex != null) {
            traitsData.splice(editingTraitIndex, 1);
            renderTraits();
        }
        closeTraitModal();
    });

    traitForm.addEventListener('submit', e => {
        e.preventDefault();
        const name = traitNameInput.value.trim();
        if (!name) return;
        const description = traitDescInput.value.trim();
        const color = traitColorInput.value;
        const stats = [];
        traitStatsContainer.querySelectorAll('.trait-stat-row').forEach(row => {
            const stat = row.querySelector('.stat-select').value;
            if (!stat) return;
            const value = parseFloat(row.querySelector('.stat-value').value) || 0;
            const typeBtn = row.querySelector('.type-btn.active');
            const type = typeBtn ? typeBtn.dataset.type : 'boost';
            stats.push({ stat, value, type });
        });
        const trait = { name, description, stats, color };
        if (editingTraitIndex != null) {
            traitsData[editingTraitIndex] = trait;
        } else {
            traitsData.push(trait);
        }
        renderTraits();
        closeTraitModal();
    });

    function buildTraitsUI() {
        traitsData = Array.isArray(lexicon.traits) ? lexicon.traits : [];
        lexicon.traits = traitsData;
        renderTraits();
    }

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

        function buildRaritySelector(item) {
            const wrap = document.createElement('div');
            wrap.className = 'rarity-chips';
            RARITIES.forEach(r => {
                const chip = document.createElement('span');
                chip.className = 'rarity-chip';
                chip.textContent = r.charAt(0).toUpperCase() + r.slice(1);
                chip.style.backgroundColor = RARITY_COLORS[r];
                if (item.rarity === r) chip.classList.add('selected');
                chip.addEventListener('click', () => {
                    item.rarity = r;
                    buildItemsTable();
                });
                wrap.appendChild(chip);
            });
            return wrap;
        }

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

            const rarityTd = document.createElement('td');
            rarityTd.appendChild(buildRaritySelector(item));
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

        function createItemSelect(selected, onChange) {
            const sel = document.createElement('select');
            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = '--select item--';
            sel.appendChild(placeholder);
            (lexicon.items || []).forEach(i => {
                const opt = document.createElement('option');
                opt.value = i.key;
                opt.textContent = i.name || i.key;
                sel.appendChild(opt);
            });
            sel.value = selected || '';
            sel.addEventListener('change', e => onChange(e.target.value));
            return sel;
        }

        function buildStatsSection(npc) {
            const section = document.createElement('div');
            section.className = 'npc-stats';
            const label = document.createElement('div');
            label.textContent = 'Base Stats';
            section.appendChild(label);
            const table = document.createElement('table');
            table.className = 'stats-table-editor';
            STAT_INFO.forEach(si => {
                const tr = document.createElement('tr');

                const iconTd = document.createElement('td');
                iconTd.className = 'stat-icon';
                const iconWrap = document.createElement('div');
                iconWrap.className = 'stat-icon-container';
                const label = document.createElement('span');
                label.textContent = si.label;
                const img = document.createElement('img');
                img.src = `resources/ui/${si.key}.png`;
                img.alt = si.label;
                iconWrap.appendChild(label);
                iconWrap.appendChild(img);
                iconTd.appendChild(iconWrap);
                tr.appendChild(iconTd);

                const inputTd = document.createElement('td');
                inputTd.className = 'stat-input';
                const input = document.createElement('input');
                input.type = 'number';
                input.value = npc.stats && npc.stats[si.key] != null ? npc.stats[si.key] : 0;
                input.addEventListener('input', e => {
                    npc.stats = npc.stats || {};
                    npc.stats[si.key] = parseInt(e.target.value) || 0;
                });
                inputTd.appendChild(input);
                tr.appendChild(inputTd);

                const descTd = document.createElement('td');
                descTd.className = 'stat-desc';
                descTd.textContent = si.desc;
                tr.appendChild(descTd);

                table.appendChild(tr);
            });
            section.appendChild(table);
            return section;
        }

        data.forEach((npc, idx) => {
            const chip = document.createElement('div');
            chip.className = 'npc-chip';

            const top = document.createElement('div');
            top.className = 'npc-top';

            const details = document.createElement('div');
            details.className = 'npc-details';
            function labeledInput(labelText, value, onInput, type = 'text') {
                const wrap = document.createElement('div');
                const label = document.createElement('label');
                label.textContent = labelText;
                const input = document.createElement('input');
                input.type = type;
                input.value = value;
                input.addEventListener('input', e => onInput(e.target.value));
                if (type === 'number') input.classList.add('small-num');
                wrap.appendChild(label);
                wrap.appendChild(input);
                return wrap;
            }
            details.appendChild(labeledInput('Species', npc.species || '', v => npc.species = v));
            details.appendChild(labeledInput('Name', npc.name || '', v => npc.name = v));
            details.appendChild(labeledInput('Level', npc.level != null ? npc.level : 1, v => npc.level = parseInt(v) || 1, 'number'));
            details.appendChild(labeledInput('XP', npc.xp != null ? npc.xp : 0, v => npc.xp = parseInt(v) || 0, 'number'));
            top.appendChild(details);

            const descDiv = document.createElement('div');
            descDiv.className = 'npc-description';
            const descLabel = document.createElement('label');
            descLabel.textContent = 'Description';
            const descInput = document.createElement('textarea');
            descInput.value = npc.description || '';
            descInput.addEventListener('input', e => npc.description = e.target.value);
            descDiv.appendChild(descLabel);
            descDiv.appendChild(descInput);
            top.appendChild(descDiv);

            top.appendChild(buildStatsSection(npc));

            function arraySection(title, prop, listId, singular) {
                const section = document.createElement('div');
                section.className = 'npc-array-section';
                const label = document.createElement('div');
                label.textContent = title;
                section.appendChild(label);
                const listDiv = document.createElement('div');
                (npc[prop] || []).forEach((val, vIdx) => {
                    const entry = document.createElement('div');
                    entry.className = 'npc-array-entry';
                    const input = document.createElement('input');
                    if (listId) input.setAttribute('list', listId);
                    input.value = val || '';
                    input.addEventListener('input', e => npc[prop][vIdx] = e.target.value);
                    const rem = document.createElement('button');
                    rem.textContent = `Delete ${singular}`;
                    rem.addEventListener('click', () => { npc[prop].splice(vIdx, 1); buildNPCBlueprintsTable(); });
                    entry.appendChild(input);
                    entry.appendChild(rem);
                    listDiv.appendChild(entry);
                });
                const addBtn = document.createElement('button');
                addBtn.textContent = `Add ${singular}`;
                addBtn.addEventListener('click', () => {
                    npc[prop] = npc[prop] || [];
                    npc[prop].push('');
                    buildNPCBlueprintsTable();
                });
                section.appendChild(listDiv);
                section.appendChild(addBtn);
                return section;
            }

            function buildTypeGrid() {
                const section = document.createElement('div');
                section.className = 'npc-array-section';
                const label = document.createElement('div');
                label.textContent = 'Types';
                section.appendChild(label);
                const grid = document.createElement('div');
                grid.className = 'type-grid';
                const allTypes = (lexicon.typing && lexicon.typing.types) || [];
                const cols = Math.ceil(Math.sqrt(allTypes.length || 1));
                grid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
                allTypes.forEach(t => {
                    const chipEl = document.createElement('div');
                    chipEl.className = 'type-chip';
                    chipEl.textContent = t;
                    if ((npc.types || []).includes(t)) chipEl.classList.add('selected');
                    chipEl.addEventListener('click', () => {
                        npc.types = npc.types || [];
                        const i = npc.types.indexOf(t);
                        if (i >= 0) npc.types.splice(i, 1); else npc.types.push(t);
                        buildNPCBlueprintsTable();
                    });
                    grid.appendChild(chipEl);
                });
                section.appendChild(grid);
                return section;
            }

            function buildTraitsSection() {
                const section = document.createElement('div');
                section.className = 'npc-array-section';
                const label = document.createElement('div');
                label.textContent = 'Traits';
                section.appendChild(label);
                const chips = document.createElement('div');
                chips.className = 'npc-trait-chips';
                (npc.traits || []).forEach((name, tIdx) => {
                    const trait = (lexicon.traits || []).find(tr => (tr.name || tr.text) === name);
                    const chipEl = document.createElement('div');
                    chipEl.className = 'trait-chip';
                    const text = document.createElement('span');
                    text.className = 'trait-name';
                    text.textContent = name;
                    if (trait && trait.color) text.style.color = trait.color;
                    chipEl.appendChild(text);
                    const rem = document.createElement('button');
                    rem.textContent = 'Delete Trait';
                    rem.addEventListener('click', () => { npc.traits.splice(tIdx, 1); buildNPCBlueprintsTable(); });
                    chipEl.appendChild(rem);
                    chips.appendChild(chipEl);
                });
                section.appendChild(chips);
                const input = document.createElement('input');
                input.setAttribute('list', traitListId);
                const addBtn = document.createElement('button');
                addBtn.textContent = 'Add Trait';
                addBtn.addEventListener('click', () => {
                    const val = input.value.trim();
                    if (!val) return;
                    npc.traits = npc.traits || [];
                    npc.traits.push(val);
                    input.value = '';
                    buildNPCBlueprintsTable();
                });
                section.appendChild(input);
                section.appendChild(addBtn);
                return section;
            }

            function buildInventorySection() {
                const section = document.createElement('div');
                section.className = 'npc-array-section npc-inventory';
                const label = document.createElement('div');
                label.textContent = 'Inventory';
                section.appendChild(label);
                const listDiv = document.createElement('div');
                (npc.inventory || []).forEach((val, vIdx) => {
                    if (typeof val === 'string') val = { item: val, qty: 1 };
                    npc.inventory[vIdx] = val;
                    const entry = document.createElement('div');
                    entry.className = 'inventory-chip';
                    const itemData = (lexicon.items || []).find(i => i.key === val.item);
                    const icon = document.createElement('img');
                    icon.className = 'item-icon';
                    if (itemData && itemData.icon) {
                        icon.src = /^(https?:|file:)/.test(itemData.icon) ? itemData.icon : `resources/items/${itemData.icon}`;
                    }
                    entry.appendChild(icon);
                    const select = createItemSelect(val.item, v => { val.item = v; buildNPCBlueprintsTable(); });
                    entry.appendChild(select);
                    const keySpan = document.createElement('span');
                    keySpan.className = 'item-key-display';
                    keySpan.textContent = val.item || '';
                    entry.appendChild(keySpan);
                    const qtyInput = document.createElement('input');
                    qtyInput.type = 'number';
                    qtyInput.className = 'small-num';
                    qtyInput.value = val.qty != null ? val.qty : 1;
                    if (itemData && itemData.stackable) {
                        qtyInput.addEventListener('input', e => val.qty = parseInt(e.target.value) || 0);
                    } else {
                        qtyInput.value = 1;
                        qtyInput.disabled = true;
                    }
                    entry.appendChild(qtyInput);
                    const rem = document.createElement('button');
                    rem.textContent = 'Delete Item';
                    rem.addEventListener('click', () => { npc.inventory.splice(vIdx, 1); buildNPCBlueprintsTable(); });
                    entry.appendChild(rem);
                    listDiv.appendChild(entry);
                });
                const addBtn = document.createElement('button');
                addBtn.textContent = 'Add Inventory Item';
                addBtn.addEventListener('click', () => {
                    npc.inventory = npc.inventory || [];
                    npc.inventory.push({ item: '', qty: 1 });
                    buildNPCBlueprintsTable();
                });
                section.appendChild(listDiv);
                section.appendChild(addBtn);
                return section;
            }

            const typesDiv = document.createElement('div');
            typesDiv.className = 'npc-types';
            typesDiv.appendChild(buildTypeGrid());
            top.appendChild(typesDiv);

            const taDiv = document.createElement('div');
            taDiv.className = 'npc-traits-abilities';
            const traitInvWrap = document.createElement('div');
            traitInvWrap.className = 'npc-trait-inventory';
            traitInvWrap.appendChild(buildTraitsSection());
            traitInvWrap.appendChild(buildInventorySection());
            taDiv.appendChild(traitInvWrap);
            taDiv.appendChild(arraySection('Abilities', 'abilities', abilityListId, 'Ability'));
            top.appendChild(taDiv);

            chip.appendChild(top);

            const lootDiv = document.createElement('div');
            lootDiv.className = 'npc-loot';
            const lootTable = document.createElement('table');
            const head = document.createElement('tr');
            ['Icon','Item','Key','Chance','Qty',''].forEach(h => {
                const th = document.createElement('th');
                th.textContent = h;
                head.appendChild(th);
            });
            lootTable.appendChild(head);
            (npc.lootTable || []).forEach((loot, lidx) => {
                const ltr = document.createElement('tr');

                const iconTd = document.createElement('td');
                const icon = document.createElement('img');
                icon.className = 'item-icon';
                const itemData = (lexicon.items || []).find(i => i.key === loot.item);
                if (itemData && itemData.icon) {
                    icon.src = /^(https?:|file:)/.test(itemData.icon) ? itemData.icon : `resources/items/${itemData.icon}`;
                }
                iconTd.appendChild(icon);
                ltr.appendChild(iconTd);

                const itemSelect = createItemSelect(loot.item, v => { loot.item = v; buildNPCBlueprintsTable(); });
                const itemTd = document.createElement('td');
                itemTd.appendChild(itemSelect);
                ltr.appendChild(itemTd);

                const keyTd = document.createElement('td');
                keyTd.className = 'item-key-display';
                keyTd.textContent = loot.item || '';
                ltr.appendChild(keyTd);

                const chanceInput = document.createElement('input');
                chanceInput.type = 'number';
                chanceInput.className = 'small-num';
                chanceInput.value = loot.chance != null ? loot.chance : 100;
                chanceInput.addEventListener('input', e => loot.chance = parseFloat(e.target.value) || 0);
                const chanceTd = document.createElement('td');

                const qtyTd = document.createElement('td');
                const qtyWrap = document.createElement('div');
                qtyWrap.className = 'quantity-inputs';
                const minInput = document.createElement('input');
                minInput.type = 'number';
                minInput.className = 'small-num';
                minInput.value = loot.min != null ? loot.min : 1;
                const maxInput = document.createElement('input');
                maxInput.type = 'number';
                maxInput.className = 'small-num';
                maxInput.value = loot.max != null ? loot.max : 1;
                if (itemData && itemData.stackable) {
                    minInput.addEventListener('input', e => loot.min = parseInt(e.target.value) || 0);
                    maxInput.addEventListener('input', e => loot.max = parseInt(e.target.value) || 0);
                } else {
                    minInput.value = 1;
                    maxInput.value = 1;
                    minInput.disabled = true;
                    maxInput.disabled = true;
                }
                qtyWrap.appendChild(minInput);
                qtyWrap.appendChild(maxInput);
                qtyTd.appendChild(qtyWrap);
                ltr.appendChild(qtyTd);

                const remLootTd = document.createElement('td');
                const remLootBtn = document.createElement('button');
                remLootBtn.textContent = 'Delete Loot Item';
                remLootBtn.addEventListener('click', () => {
                    npc.lootTable.splice(lidx, 1);
                    buildNPCBlueprintsTable();
                });
                remLootTd.appendChild(remLootBtn);
                ltr.appendChild(remLootTd);

                lootTable.appendChild(ltr);
            });
            const addLootBtn = document.createElement('button');
            addLootBtn.textContent = 'Add Loot Item';
            addLootBtn.addEventListener('click', () => {
                npc.lootTable = npc.lootTable || [];
                npc.lootTable.push({ item: '', chance: 100, min: 1, max: 1 });
                buildNPCBlueprintsTable();
            });
            lootDiv.appendChild(lootTable);
            lootDiv.appendChild(addLootBtn);
            chip.appendChild(lootDiv);

            const remBtn = document.createElement('button');
            remBtn.textContent = 'Delete NPC';
            remBtn.className = 'delete-btn';
            remBtn.addEventListener('click', () => {
                data.splice(idx, 1);
                buildNPCBlueprintsTable();
            });
            chip.appendChild(remBtn);

            npcTable.appendChild(chip);
        });
    }

    addNpcBtn.addEventListener('click', () => {
        const data = Array.isArray(lexicon.npc_blueprints) ? lexicon.npc_blueprints : [];
        data.push({ species: '', name: '', description: '', level: 1, xp: 0, types: [], traits: [], abilities: [], inventory: [], lootTable: [], stats: { strength: 0, dexterity: 0, constitution: 0, endurance: 0, intelligence: 0, charisma: 0, fortitude: 0 } });
        lexicon.npc_blueprints = data;
        buildNPCBlueprintsTable();
    });

    function showLibrary() {
        const lib = librarySelect.value;
        if (lib === 'typing') {
            chipEditor.classList.add('hidden');
            itemsEditor.classList.add('hidden');
            npcEditor.classList.add('hidden');
            traitsEditor.classList.add('hidden');
            typingEditor.classList.remove('hidden');
            buildTypingUI();
        } else if (lib === 'items') {
            typingEditor.classList.add('hidden');
            chipEditor.classList.add('hidden');
            npcEditor.classList.add('hidden');
            traitsEditor.classList.add('hidden');
            itemsEditor.classList.remove('hidden');
            buildItemsTable();
        } else if (lib === 'npc_blueprints') {
            typingEditor.classList.add('hidden');
            chipEditor.classList.add('hidden');
            itemsEditor.classList.add('hidden');
            traitsEditor.classList.add('hidden');
            npcEditor.classList.remove('hidden');
            buildNPCBlueprintsTable();
        } else if (lib === 'traits') {
            typingEditor.classList.add('hidden');
            chipEditor.classList.add('hidden');
            itemsEditor.classList.add('hidden');
            npcEditor.classList.add('hidden');
            traitsEditor.classList.remove('hidden');
            buildTraitsUI();
        } else {
            typingEditor.classList.add('hidden');
            itemsEditor.classList.add('hidden');
            npcEditor.classList.add('hidden');
            traitsEditor.classList.add('hidden');
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