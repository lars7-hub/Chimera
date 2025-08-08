// character-creator.js
// Attach this script to your character-creator.html WITH <script src="character-creator.js"></script> (remove from renderer.js if present).
// Handles form submission, image upload, and calls Electron IPC to create character.

let selectedImagePath = null;

const cropCheckbox = document.getElementById('crop-image');
const showStatsCheckbox = document.getElementById('show-stats');
const traitsContainer = document.getElementById('traits-container');

function addTraitRow(trait = {}) {
    const row = document.createElement('div');
    row.className = 'trait-row';
    row.innerHTML = `
        <input type="text" class="trait-text" placeholder="Trait description" value="${trait.text || ''}">
        <select class="trait-stat">
            <option value="">Stat</option>
            <option value="strength">Strength</option>
            <option value="dexterity">Dexterity</option>
            <option value="constitution">Constitution</option>
            <option value="endurance">Endurance</option>
            <option value="intelligence">Intelligence</option>
            <option value="charisma">Charisma</option>
            <option value="fortitude">Fortitude</option>
        </select>
        <input type="number" class="trait-value" value="${trait.value || 0}">
        <input type="color" class="trait-color" value="${trait.color || '#ffffff'}">
        <button type="button" class="remove-trait-btn">Remove</button>
    `;
    traitsContainer.appendChild(row);
    row.querySelector('.trait-stat').value = trait.stat || '';
    row.querySelector('.remove-trait-btn').addEventListener('click', () => row.remove());
}

document.getElementById('add-trait-btn').addEventListener('click', () => addTraitRow());

function updatePreviewFit() {
    const previewImg = document.getElementById('image-preview-img');
    if (previewImg.style.display !== 'none') {
        previewImg.style.objectFit = cropCheckbox.checked ? 'cover' : 'fill';
    }
}

// Image upload button event
document.getElementById('image-upload-btn').addEventListener('click', async () => {
    const imagePath = await window.electron.openFileDialog();
    if (imagePath) {
        selectedImagePath = imagePath;
        // Show image preview
        const previewImg = document.getElementById('image-preview-img');
        previewImg.src = `file://${imagePath}`;
        previewImg.style.display = 'block';
		updatePreviewFit();
    }
});

cropCheckbox.addEventListener('change', updatePreviewFit);

// Save Character button event
document.getElementById('save-btn').addEventListener('click', async () => {
    // Gather form data
    const name = document.getElementById('name').value.trim();
    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const height = document.getElementById('height').value;
    const build = document.getElementById('build').value;
	const occupation = document.getElementById('occupation').value;
    const alignment = document.getElementById('alignment').value;
    const race = document.getElementById('race').value;
    const description = document.getElementById('description').value;
	const cropImage = cropCheckbox.checked;

	const stats = {
        strength: parseInt(document.getElementById('stat-strength').value) || 0,
        dexterity: parseInt(document.getElementById('stat-dexterity').value) || 0,
        constitution: parseInt(document.getElementById('stat-constitution').value) || 0,
        endurance: parseInt(document.getElementById('stat-endurance').value) || 0,
        intelligence: parseInt(document.getElementById('stat-intelligence').value) || 0,
        charisma: parseInt(document.getElementById('stat-charisma').value) || 0,
        fortitude: parseInt(document.getElementById('stat-fortitude').value) || 0,
    };

    const traits = Array.from(traitsContainer.querySelectorAll('.trait-row')).map(row => ({
        text: row.querySelector('.trait-text').value,
        stat: row.querySelector('.trait-stat').value,
        value: parseInt(row.querySelector('.trait-value').value) || 0,
        color: row.querySelector('.trait-color').value,
    }));

    const showStats = showStatsCheckbox.checked;

    // Validation
    if (!name) {
        alert('Character name is required.');
        return;
    }
    if (!selectedImagePath) {
        alert('Please upload a character image.');
        return;
    }

    // Prepare character data object
    const characterData = {
        name,
        age,
        gender,
        height,
        build,
		occupation,
        alignment,
        race,
        description,
		stats,
        traits,
        showStats,
        imageFit: cropImage ? 'crop' : 'squish'
    };

    // Call backend to create character
    try {
        const result = await window.electron.createCharacter(name, characterData, selectedImagePath);
        if (result && result.success) {
            // Redirect to main page
            window.location.href = 'index.html';
        } else {
            alert(result.message || 'Error saving character.');
        }
    } catch (err) {
        alert('An error occurred: ' + err.message);
    }
});

// Home button navigation (optional safety)
const homeBtn = document.getElementById('home-btn');
if (homeBtn) {
    homeBtn.addEventListener('click', () => {
        window.location.href = 'index.html';
    });
}