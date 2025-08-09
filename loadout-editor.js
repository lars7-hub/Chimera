let selectedImagePath = null;
let traitsData = [];
let editingTraitIndex = null;
const statsList = ['strength','dexterity','constitution','endurance','intelligence','charisma','fortitude'];

const cropCheckbox = document.getElementById('crop-image');
const showStatsCheckbox = document.getElementById('show-stats');

function renderTraits() {
    const list = document.getElementById('traits-list');
    list.innerHTML = '';
    traitsData.forEach((t, i) => {
        const btn = document.createElement('button');
        btn.className = 'trait-btn';
        btn.textContent = t.text || `Trait ${i + 1}`;
        btn.addEventListener('click', () => openTraitModal(i));
        list.appendChild(btn);
    });
    const newBtn = document.createElement('button');
    newBtn.className = 'trait-btn';
    newBtn.textContent = 'New Trait';
    newBtn.addEventListener('click', () => openTraitModal());
    list.appendChild(newBtn);
}

function buildTraitStats(trait = {}) {
    const statsContainer = document.getElementById('trait-stats');
    statsContainer.innerHTML = '';
    statsList.forEach(stat => {
        const row = document.createElement('div');
        row.className = 'trait-stat-row';
        const existing = (trait.stats || []).find(s => s.stat === stat) || {};
        row.innerHTML = `
            <label>${stat.charAt(0).toUpperCase() + stat.slice(1)}</label>
            <input type="number" data-stat="${stat}" value="${existing.value || 0}">
            <select data-stat-type="${stat}">
                <option value="add">+</option>
                <option value="sub">-</option>
                <option value="mul">%</option>
            </select>`;
        row.querySelector('select').value = existing.type || 'add';
        statsContainer.appendChild(row);
    });
}

function openTraitModal(index = null) {
    editingTraitIndex = index;
    const modal = document.getElementById('trait-modal');
    const title = document.getElementById('trait-modal-title');
    const delBtn = document.getElementById('trait-delete-btn');
    if (index === null) {
        title.textContent = 'New Trait';
        document.getElementById('trait-text').value = '';
        document.getElementById('trait-color').value = '#ffffff';
        delBtn.style.display = 'none';
        buildTraitStats();
    } else {
        const trait = traitsData[index];
        title.textContent = 'Edit Trait';
        document.getElementById('trait-text').value = trait.text || '';
        document.getElementById('trait-color').value = trait.color || '#ffffff';
        delBtn.style.display = 'block';
        buildTraitStats(trait);
    }
    modal.classList.remove('hidden');
}

function closeTraitModal() {
    document.getElementById('trait-modal').classList.add('hidden');
}

document.getElementById('trait-modal-close').addEventListener('click', closeTraitModal);

document.getElementById('trait-save-btn').addEventListener('click', () => {
    const text = document.getElementById('trait-text').value;
    const color = document.getElementById('trait-color').value;
    const stats = [];
    document.querySelectorAll('#trait-stats .trait-stat-row').forEach(row => {
        const stat = row.querySelector('input').dataset.stat;
        const value = parseInt(row.querySelector('input').value) || 0;
        if (value) {
            const type = row.querySelector('select').value;
            stats.push({ stat, value, type });
        }
    });
    const trait = { text, color, stats };
    if (editingTraitIndex === null) {
        traitsData.push(trait);
    } else {
        traitsData[editingTraitIndex] = trait;
    }
    closeTraitModal();
    renderTraits();
});

document.getElementById('trait-delete-btn').addEventListener('click', () => {
    if (editingTraitIndex !== null) {
        traitsData.splice(editingTraitIndex, 1);
        renderTraits();
    }
    closeTraitModal();
});

function updatePreviewFit() {
    const previewImg = document.getElementById('image-preview-img');
    if (previewImg.style.display !== 'none') {
        previewImg.style.objectFit = cropCheckbox.checked ? 'cover' : 'fill';
    }
}

const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');
const originalLoadoutName = urlParams.get('loadout');

async function loadLoadoutData() {
    const data = await window.electron.getLoadout(characterName, originalLoadoutName);
    if (!data) {
        console.error('Loadout data not found:', originalLoadoutName);
        return;
    }
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
    const imagePath = `app/characters/${characterName}/loadouts/${originalLoadoutName}/image.png`;
    const previewImg = document.getElementById('image-preview-img');
    previewImg.src = imagePath;
    previewImg.style.display = 'block';
    updatePreviewFit();
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

document.getElementById('save-btn').addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    if (!name) {
        alert('Loadout name is required.');
        return;
    }
    const loadoutData = {
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
    const result = await window.electron.updateLoadout(characterName, originalLoadoutName, loadoutData, selectedImagePath);
    if (result && result.success) {
        window.location.href = `profile.html?character=${characterName}&loadout=${name}`;
    } else {
        alert(result.message || 'Error saving loadout');
    }
});

// Cancel and delete buttons

document.getElementById('cancel-btn').addEventListener('click', () => {
    window.location.href = `profile.html?character=${characterName}&loadout=${originalLoadoutName}`;
});

document.getElementById('delete-btn').addEventListener('click', async () => {
    if (confirm('Delete this loadout?')) {
        const result = await window.electron.deleteLoadout(characterName, originalLoadoutName);
        if (result && result.success) {
            window.location.href = `profile.html?character=${characterName}`;
        } else if (result && result.message) {
            alert(result.message);
        }
    }
});

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

loadLoadoutData();