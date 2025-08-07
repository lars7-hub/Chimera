// character-creator.js
// Attach this script to your character-creator.html WITH <script src="character-creator.js"></script> (remove from renderer.js if present).
// Handles form submission, image upload, and calls Electron IPC to create character.

let selectedImagePath = null;

const cropCheckbox = document.getElementById('crop-image');

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
    const description = document.getElementById('description').value;
	const cropImage = cropCheckbox.checked;

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
        description,
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