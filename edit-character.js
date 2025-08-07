// edit-character.js

let selectedImagePath = null;
const cropCheckbox = document.getElementById('crop-image');

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
    document.getElementById('description').value = data.description || '';
    cropCheckbox.checked = data.imageFit !== 'squish';

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
        description: document.getElementById('description').value,
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