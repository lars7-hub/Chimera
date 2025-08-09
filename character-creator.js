// character-creator.js
// Attach this script to your character-creator.html WITH <script src="character-creator.js"></script> (remove from renderer.js if present).
// Handles form submission, image upload, and calls Electron IPC to create character.

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

    const traits = Array.from(traitsContainer.querySelectorAll('.trait-row')).map(row => {
        const stat = row.querySelector('.trait-stat').value;
        const value = parseInt(row.querySelector('.trait-value').value) || 0;
        const typeBtn = row.querySelector('.type-btn.active');
        const type = typeBtn ? typeBtn.dataset.type : 'add';
        return {
            text: row.querySelector('.trait-text').value,
            stats: stat ? [{ stat, value, type }] : [],
            color: row.querySelector('.trait-color').value,
        };
    });

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