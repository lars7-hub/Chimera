let selectedImagePath = null;

const cropCheckbox = document.getElementById('crop-image');
const showStatsCheckbox = document.getElementById('show-stats');
const traitsContainer = document.getElementById('traits-container');
const statsList = ['strength','dexterity','constitution','endurance','intelligence','charisma','fortitude'];

function addTraitRow(trait = {}) {
    const row = document.createElement('div');
    row.className = 'trait-row';
    const type = (trait.stats && trait.stats[0] && trait.stats[0].type) || 'add';
    const stat = (trait.stats && trait.stats[0] && trait.stats[0].stat) || '';
    const value = (trait.stats && trait.stats[0] && trait.stats[0].value) || 0;
    row.innerHTML = `
        <label>Trait name: <input type="text" class="trait-text" placeholder="Trait description" value="${trait.text || ''}"></label>
        <select class="trait-stat">
            <option value="">Stat</option>
            <option value="strength"${stat === 'strength' ? ' selected' : ''}>Strength</option>
            <option value="dexterity"${stat === 'dexterity' ? ' selected' : ''}>Dexterity</option>
            <option value="constitution"${stat === 'constitution' ? ' selected' : ''}>Constitution</option>
            <option value="endurance"${stat === 'endurance' ? ' selected' : ''}>Endurance</option>
            <option value="intelligence"${stat === 'intelligence' ? ' selected' : ''}>Intelligence</option>
            <option value="charisma"${stat === 'charisma' ? ' selected' : ''}>Charisma</option>
            <option value="fortitude"${stat === 'fortitude' ? ' selected' : ''}>Fortitude</option>
        </select>
        <input type="number" class="trait-value" value="${value}">
        <div class="type-toggle">
            <button type="button" class="type-btn${type === 'mul' ? '' : ' active'}" data-type="add">Add</button>
            <button type="button" class="type-btn${type === 'mul' ? ' active' : ''}" data-type="mul">%</button>
        </div>
        <input type="color" class="trait-color" value="${trait.color || '#ffffff'}">
        <button type="button" class="remove-trait-btn">Remove</button>
    `;
    traitsContainer.appendChild(row);
    const toggle = row.querySelector('.type-toggle');
    toggle.querySelectorAll('.type-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            toggle.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    row.querySelector('.remove-trait-btn').addEventListener('click', () => row.remove());
}

document.getElementById('add-trait-btn').addEventListener('click', () => addTraitRow());

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
    (data.traits || []).forEach(t => addTraitRow(t));
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
    (data.traits || []).forEach(t => addTraitRow(t));
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
        traits: Array.from(traitsContainer.querySelectorAll('.trait-row')).map(row => {
            const stat = row.querySelector('.trait-stat').value;
            const value = parseInt(row.querySelector('.trait-value').value) || 0;
            const typeBtn = row.querySelector('.type-btn.active');
            const type = typeBtn ? typeBtn.dataset.type : 'add';
            return {
                text: row.querySelector('.trait-text').value,
                stats: stat ? [{ stat, value, type }] : [],
                color: row.querySelector('.trait-color').value,
            };
        }),
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