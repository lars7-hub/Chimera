// Extract character and loadout names from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');
let activeLoadout = urlParams.get('loadout');

// Display profile data in the DOM
function displayProfile(data, imagePath, loadoutName = null) {
    document.getElementById('character-name').innerText = data.name;
    document.getElementById('character-age').innerText = `Age: ${data.age}`;
    document.getElementById('character-gender').innerText = `Gender: ${data.gender}`;
    document.getElementById('character-description').innerText = data.description;

    const fit = data.imageFit === 'squish' ? 'fill' : 'cover';
    document.getElementById('profile-image').innerHTML =
        `<img src="${imagePath}" alt="${data.name}" style="width:100%;height:100%;object-fit:${fit};">`;

const editBtn = document.getElementById('edit-character-btn');
    if (loadoutName) {
        editBtn.innerText = 'Edit Loadout';
        editBtn.onclick = () => {
            window.location.href = `loadout-editor.html?character=${characterName}&loadout=${loadoutName}`;
        };
    } else {
        editBtn.innerText = 'Edit Character';
        editBtn.onclick = () => {
            window.location.href = `edit-character.html?character=${characterName}`;
        };
    }
}
// Load base character profile
async function loadCharacterProfile() {
    activeLoadout = null;
    const characterData = await window.electron.getCharacter(characterName);
    if (!characterData) {
        console.error('Character data not found:', characterName);
        return;
    }
    const imagePath = `app/characters/${characterName}/${characterName}.png`;
    displayProfile(characterData, imagePath);
}

// Load specific loadout profile
async function loadLoadout(loadoutName) {
    const loadoutData = await window.electron.getLoadout(characterName, loadoutName);
    if (!loadoutData) {
        console.error('Loadout data not found:', loadoutName);
        return;
    }
    activeLoadout = loadoutName;
    const imagePath = `app/characters/${characterName}/loadouts/${loadoutName}.png`;
    displayProfile(loadoutData, imagePath, loadoutName);
}

// Populate loadout list
async function loadLoadouts() {
    const loadouts = await window.electron.getLoadouts(characterName);
    const list = document.getElementById('loadout-list');
	if (!list) {
		console.error('Loadout list element not found');
		return;
	}
    list.innerHTML = '';

    const baseItem = document.createElement('div');
    baseItem.className = 'loadout-item';
    baseItem.innerText = 'Base';
    baseItem.addEventListener('click', loadCharacterProfile);
    list.appendChild(baseItem);

    loadouts.forEach(l => {
        const item = document.createElement('div');
        item.className = 'loadout-item';
        item.innerText = l.name;
        item.addEventListener('click', () => loadLoadout(l.name));
        list.appendChild(item);
    });
}

document.getElementById('add-loadout-btn').addEventListener('click', async () => {
    const input = document.getElementById('new-loadout-name');
    const name = input.value.trim();
    if (!name) return;
    const result = await window.electron.createLoadout(characterName, name);
    if (result && result.success) {
        input.value = '';
        loadLoadouts();
    } else if (result && result.message) {
        alert(result.message);
    }
});

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

loadLoadouts();
if (activeLoadout) {
    loadLoadout(activeLoadout);
} else {
    loadCharacterProfile();
}