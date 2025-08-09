// edit-character.js

let selectedImagePath = null;
const cropCheckbox = document.getElementById('crop-image');
const showStatsCheckbox = document.getElementById('show-stats');
const traitsContainer = document.getElementById('traits-container');
const statsList = ['strength','dexterity','constitution','endurance','intelligence','charisma','fortitude'];

function addTraitRow(trait = {}) {
    const row = document.createElement('div');
    row.className = 'trait-row';
    const statsRows = statsList.map(stat => {
        const existing = (trait.stats || []).find(s => s.stat === stat) || {};
        const type = existing.type || 'add';
        const value = existing.value || 0;
        return `<tr>
            <td>${stat.charAt(0).toUpperCase() + stat.slice(1)}</td>
            <td><input type="number" class="trait-stat-value" data-stat="${stat}" value="${value}"></td>
            <td>
                <select class="trait-stat-type" data-stat="${stat}">
                    <option value="add"${type === 'add' ? ' selected' : ''}>+</option>
                    <option value="sub"${type === 'sub' ? ' selected' : ''}>-</option>
                    <option value="mul"${type === 'mul' ? ' selected' : ''}>%</option>
                </select>
            </td>
        </tr>`;
    }).join('');

    row.innerHTML = `
        <input type="text" class="trait-text" placeholder="Trait description" value="${trait.text || ''}">
        <table class="trait-stats-table">
            <thead><tr><th>Stat</th><th>Value</th><th>Type</th></tr></thead>
            <tbody>${statsRows}</tbody>
        </table>
        <input type="color" class="trait-color" value="${trait.color || '#ffffff'}">
        <button type="button" class="remove-trait-btn">Remove</button>
    `;
    traitsContainer.appendChild(row);
    row.querySelector('.remove-trait-btn').addEventListener('click', () => row.remove());
}

document.getElementById('add-trait-btn').addEventListener('click', () => addTraitRow());

function updatePreviewFit() {
    const previewImg = document.getElementById('image-preview-img');
    if (previewImg.style.display !== 'none') {
        previewImg.style.objectFit = cropCheckbox.checked ? 'cover' : 'fill';
    }
}

// Extract original character name from URL
const urlParams = new URLSearchParams(window.location.search);
const originalName = urlParams.get('character');

// Load existing character data and populate form
async function loadCharacter() {
    const data = await window.electron.getCharacter(originalName);
    if (!data) {
        console.error('Character data not found:', originalName);
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
	document.getElementById('stat-strength').value = data.stats?.strength || 0;
    document.getElementById('stat-dexterity').value = data.stats?.dexterity || 0;
    document.getElementById('stat-constitution').value = data.stats?.constitution || 0;
    document.getElementById('stat-endurance').value = data.stats?.endurance || 0;
    document.getElementById('stat-intelligence').value = data.stats?.intelligence || 0;
    document.getElementById('stat-charisma').value = data.stats?.charisma || 0;
    document.getElementById('stat-fortitude').value = data.stats?.fortitude || 0;

    (data.traits || []).forEach(t => addTraitRow(t));

    const previewImg = document.getElementById('image-preview-img');
    const imagePath = `app/characters/${originalName}/${originalName}.png`;
    previewImg.src = imagePath;
    previewImg.style.display = 'block';
    updatePreviewFit();
}

// Image upload button event
const uploadBtn = document.getElementById('image-upload-btn');
uploadBtn.addEventListener('click', async () => {
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

// Save changes
const saveBtn = document.getElementById('save-btn');
saveBtn.addEventListener('click', async () => {
    const name = document.getElementById('name').value.trim();
    if (!name) {
        alert('Character name is required.');
        return;
    }

    const characterData = {
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
            const stats = [];
            statsList.forEach(stat => {
                const val = parseInt(row.querySelector(`.trait-stat-value[data-stat="${stat}"]`).value) || 0;
                if (val) {
                    const type = row.querySelector(`.trait-stat-type[data-stat="${stat}"]`).value;
                    stats.push({ stat, value: val, type });
                }
            });
            return {
                text: row.querySelector('.trait-text').value,
                stats,
                color: row.querySelector('.trait-color').value,
            };
        }),
        showStats: showStatsCheckbox.checked,
        imageFit: cropCheckbox.checked ? 'crop' : 'squish'
    };

    try {
        const result = await window.electron.updateCharacter(originalName, characterData, selectedImagePath);
        if (result && result.success) {
            window.location.href = `profile.html?character=${characterData.name}`;
        } else {
            alert(result.message || 'Error saving character.');
        }
    } catch (err) {
        alert('An error occurred: ' + err.message);
    }
});

// Cancel editing
const cancelBtn = document.getElementById('cancel-btn');
cancelBtn.addEventListener('click', () => {
    window.location.href = `profile.html?character=${originalName}`;
});

// Delete character
const deleteBtn = document.getElementById('delete-btn');
deleteBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete this character? This action cannot be undone.')) {
        try {
            const result = await window.electron.deleteCharacter(originalName);
            if (result && result.success) {
                window.location.href = 'index.html';
            } else {
                alert(result.message || 'Error deleting character.');
            }
        } catch (err) {
            alert('An error occurred: ' + err.message);
        }
    }
});

// Home button
document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

loadCharacter();