let selectedImagePath = null;

const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');
const originalLoadoutName = urlParams.get('loadout');

const cropCheckbox = document.getElementById('crop-image');

function updatePreviewFit() {
    const previewImg = document.getElementById('image-preview-img');
    if (previewImg.style.display !== 'none') {
        previewImg.style.objectFit = cropCheckbox.checked ? 'cover' : 'fill';
    }
}

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
    document.getElementById('description').value = data.description || '';
    cropCheckbox.checked = data.imageFit !== 'squish';

    const imagePath = `app/characters/${characterName}/loadouts/${originalLoadoutName}.png`;
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
        description: document.getElementById('description').value,
        imageFit: cropCheckbox.checked ? 'crop' : 'squish'
    };

    const result = await window.electron.updateLoadout(characterName, originalLoadoutName, loadoutData, selectedImagePath);
    if (result && result.success) {
        window.location.href = `profile.html?character=${characterName}&loadout=${name}`;
    } else {
        alert(result.message || 'Error saving loadout');
    }
});

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

loadLoadoutData();
