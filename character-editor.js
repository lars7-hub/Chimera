let selectedImagePath = null;

const cropCheckbox = document.getElementById('crop-image');
const showStatsCheckbox = document.getElementById('show-stats');
const traitsContainer = document.getElementById('traits-container');
const statsList = ['strength','dexterity','constitution','endurance','intelligence','charisma','fortitude'];

let traitsData = [];
let editingTraitIndex = null;

const traitModal = document.getElementById('trait-modal');
const traitForm = document.getElementById('trait-form');
const traitModalTitle = document.getElementById('trait-modal-title');
const traitTextInput = document.getElementById('trait-name');
const traitStatSelect = document.getElementById('trait-desc');
const traitColorInput = document.getElementById('trait-color');
const traitDeleteBtn = document.getElementById('trait-delete-btn');
const traitStatsContainer = document.getElementById('trait-stats-container');
const addStatBtn = document.getElementById('add-stat-btn');

function createTypeToggle(initialType = 'boost') {
    const toggle = document.createElement('div');
    toggle.className = 'type-toggle';
    const boostBtn = document.createElement('button');
    boostBtn.type = 'button';
    boostBtn.textContent = 'Add';
    boostBtn.className = 'type-btn';
    boostBtn.dataset.type = 'boost';
    const multBtn = document.createElement('button');
    multBtn.type = 'button';
    multBtn.textContent = 'x';
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
    row.className = 'stat-row';

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
    removeBtn.textContent = 'X';
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
        textDiv.textContent = t.name || t.text;
		textDiv.title = t.description || '';
        textDiv.style.color = t.color || '#ffffff';
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
        chip.addEventListener('click', () => openTraitModal(index));
        traitsContainer.appendChild(chip);
    });
}

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
        traitTypeToggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
        traitTypeToggle.querySelector(`.type-btn[data-type="${type}"]`).classList.add('active');
        traitDeleteBtn.style.display = 'inline-block';
    } else {
        traitModalTitle.textContent = 'Add Trait';
        traitnameInput.value = '';
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

document.getElementById('trait-modal-close').addEventListener('click', closeTraitModal);
document.getElementById('add-trait-btn').addEventListener('click', () => openTraitModal());

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
	traitStatsContainer.querySelectorAll('.stat-row').forEach(row => {
		const stat = row.querySelector('.stat-select').value;
		if (!stat) return;
		const value = parseFloat(row.querySelector('.stat-value').value) || 0;
		const typeBtn = row.querySelector('.type-btn.active');
		const type = typeBtn ? typeBtn.dataset.type : 'boost';
		stats.push({ stat, value, type});
		
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

function updatePreviewFit() {
    const previewImg = document.getElementById('image-preview-img');
    if (previewImg.style.display !== 'none') {
        previewImg.style.objectFit = cropCheckbox.checked ? 'cover' : 'fill';
    }
}

document.getElementById('image-upload-btn').addEventListener('click', async () => {
    const imagePath = await window.electron.openFileDialog();
    if (imagePath) {
        selectedImagePath = imagePath;
        const previewImg = document.getElementById('image-preview-img');
        previewImg.src = `file://${imagePath}`;
        previewImg.style.display = 'block';
        updatePreviewFit();
    }
});

cropCheckbox.addEventListener('change', updatePreviewFit);

const urlParams = new URLSearchParams(window.location.search);
const mode = urlParams.get('mode'); // new, edit, loadout
const originalCharacterName = urlParams.get('character');
const originalLoadoutName = urlParams.get('loadout');

const titleEl = document.getElementById('editor-title');
const nameLabel = document.getElementById('name-label');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const deleteBtn = document.getElementById('delete-btn');

switch (mode) {
    case 'edit':
        titleEl.textContent = 'Edit Character';
        nameLabel.textContent = 'Character Name (Required):';
        saveBtn.textContent = 'Save Character';
        deleteBtn.textContent = 'Delete Character';
        cancelBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        loadCharacter();
        break;
    case 'loadout':
        titleEl.textContent = 'Edit Loadout';
        nameLabel.textContent = 'Loadout Name (Required):';
        saveBtn.textContent = 'Save Loadout';
        deleteBtn.textContent = 'Delete Loadout';
        cancelBtn.style.display = 'inline-block';
        deleteBtn.style.display = 'inline-block';
        loadLoadout();
        break;
    default:
        titleEl.textContent = 'Create New Character';
        nameLabel.textContent = 'Character Name (Required):';
        saveBtn.textContent = 'Save Character';
        deleteBtn.textContent = 'Delete Character';
        // cancel/delete stay hidden
}

async function loadCharacter() {
    const data = await window.electron.getCharacter(originalCharacterName);
    if (!data) return;
    document.getElementById('name').value = data.name || '';
    document.getElementById('age').value = data.age || '';
    document.getElementById('gender').value = data.gender || '';
    document.getElementById('height').value = data.height || '';
    document.getElementById('build').value = data.build || '';
    document.getElementById('occupation').value = data.occupation || '';
    document.getElementById('alignment').value = data.alignment || '';
    document.getElementById('race').value = data.race || '';
    document.getElementById('description').value = data.description || '';
    cropCheckbox.checked = data.imageFit !== 'squish';
    showStatsCheckbox.checked = data.showStats !== false;
    document.getElementById('stat-strength').value = data.stats?.strength || 0;
    document.getElementById('stat-dexterity').value = data.stats?.dexterity || 0;
    document.getElementById('stat-constitution').value = data.stats?.constitution || 0;
    document.getElementById('stat-endurance').value = data.stats?.endurance || 0;
    document.getElementById('stat-intelligence').value = data.stats?.intelligence || 0;
    document.getElementById('stat-charisma').value = data.stats?.charisma || 0;
    document.getElementById('stat-fortitude').value = data.stats?.fortitude || 0;
	traitsData = data.traits || [];
	renderTraits();
    const previewImg = document.getElementById('image-preview-img');
    previewImg.src = `app/characters/${originalCharacterName}/${originalCharacterName}.png`;
    previewImg.style.display = 'block';
    updatePreviewFit();
}

async function loadLoadout() {
    const data = await window.electron.getLoadout(originalCharacterName, originalLoadoutName);
    if (!data) return;
    document.getElementById('name').value = data.name || '';
    document.getElementById('age').value = data.age || '';
    document.getElementById('gender').value = data.gender || '';
    document.getElementById('height').value = data.height || '';
    document.getElementById('build').value = data.build || '';
    document.getElementById('occupation').value = data.occupation || '';
    document.getElementById('alignment').value = data.alignment || '';
    document.getElementById('race').value = data.race || '';
    document.getElementById('description').value = data.description || '';
    cropCheckbox.checked = data.imageFit !== 'squish';
    showStatsCheckbox.checked = data.showStats !== false;
    document.getElementById('stat-strength').value = data.stats?.strength || 0;
    document.getElementById('stat-dexterity').value = data.stats?.dexterity || 0;
    document.getElementById('stat-constitution').value = data.stats?.constitution || 0;
    document.getElementById('stat-endurance').value = data.stats?.endurance || 0;
    document.getElementById('stat-intelligence').value = data.stats?.intelligence || 0;
    document.getElementById('stat-charisma').value = data.stats?.charisma || 0;
    document.getElementById('stat-fortitude').value = data.stats?.fortitude || 0;
	traitsData = data.traits || [];
	renderTraits();
    const previewImg = document.getElementById('image-preview-img');
    previewImg.src = `app/characters/${originalCharacterName}/loadouts/${originalLoadoutName}/image.png`;
    previewImg.style.display = 'block';
    updatePreviewFit();
}

saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    if (!name) {
        alert(mode === 'loadout' ? 'Loadout name is required.' : 'Character name is required.');
        return;
    }
    const data = {
        name,
        age: document.getElementById('age').value,
        gender: document.getElementById('gender').value,
        height: document.getElementById('height').value,
        build: document.getElementById('build').value,
        occupation: document.getElementById('occupation').value,
        alignment: document.getElementById('alignment').value,
        race: document.getElementById('race').value,
        description: document.getElementById('description').value,
        stats: {
            strength: parseInt(document.getElementById('stat-strength').value) || 0,
            dexterity: parseInt(document.getElementById('stat-dexterity').value) || 0,
            constitution: parseInt(document.getElementById('stat-constitution').value) || 0,
            endurance: parseInt(document.getElementById('stat-endurance').value) || 0,
            intelligence: parseInt(document.getElementById('stat-intelligence').value) || 0,
            charisma: parseInt(document.getElementById('stat-charisma').value) || 0,
            fortitude: parseInt(document.getElementById('stat-fortitude').value) || 0,
        },
        traits: traitsData,
        showStats: showStatsCheckbox.checked,
        imageFit: cropCheckbox.checked ? 'crop' : 'squish'
    };

    try {
        if (mode === 'edit') {
            const result = await window.electron.updateCharacter(originalCharacterName, data, selectedImagePath);
            if (result && result.success) {
                window.location.href = `profile.html?character=${data.name}`;
            } else {
                alert(result.message || 'Error saving character.');
            }
        } else if (mode === 'loadout') {
            const result = await window.electron.updateLoadout(originalCharacterName, originalLoadoutName, data, selectedImagePath);
            if (result && result.success) {
                window.location.href = `profile.html?character=${originalCharacterName}&loadout=${data.name}`;
            } else {
                alert(result.message || 'Error saving loadout.');
            }
        } else {
            if (!selectedImagePath) {
                alert('Please upload a character image.');
                return;
            }
            const result = await window.electron.createCharacter(name, data, selectedImagePath);
            if (result && result.success) {
                window.location.href = 'index.html';
            } else {
                alert(result.message || 'Error saving character.');
            }
        }
    } catch (err) {
        alert('An error occurred: ' + err.message);
    }
});

cancelBtn.addEventListener('click', () => {
    if (mode === 'edit') {
        window.location.href = `profile.html?character=${originalCharacterName}`;
    } else if (mode === 'loadout') {
        window.location.href = `profile.html?character=${originalCharacterName}&loadout=${originalLoadoutName}`;
    }
});

deleteBtn.addEventListener('click', async () => {
    if (mode === 'edit') {
        if (confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
            const result = await window.electron.deleteCharacter(originalCharacterName);
            if (result && result.success) {
                window.location.href = 'index.html';
            } else {
                alert(result.message || 'Error deleting character.');
            }
        }
    } else if (mode === 'loadout') {
        if (confirm('Delete this loadout?')) {
            const result = await window.electron.deleteLoadout(originalCharacterName, originalLoadoutName);
            if (result && result.success) {
                window.location.href = `profile.html?character=${originalCharacterName}`;
            } else if (result && result.message) {
                alert(result.message);
            }
        }
    }
});

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});