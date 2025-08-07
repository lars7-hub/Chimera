// Extract character name from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');

// Load character data
async function loadCharacterProfile() {
    const characterData = await ipcRenderer.invoke('get-character', characterName);
	if (!characterData) {
		console.error('Character data not found:', characterName);
		return;	
	}
	
    document.getElementById('character-name').innerText = characterData.name;
    document.getElementById('character-age').innerText = `Age: ${characterData.age}`;
    document.getElementById('character-gender').innerText = `Gender: ${characterData.gender}`;
    document.getElementById('character-description').innerText = characterData.description;

    // Set character image
    const imagePath = `file://${__dirname}/app/characters/${characterName}/${characterName}.png`;
	const fit = characterData.imageFit === 'squish' ? 'fill' : 'cover';
	document.getElementById('profile-image').innerHTML = `<img src="${imagePath}" alt="${characterName}" style="width:200px;height:200px;object-fit:${fit};">`;
	}

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

loadCharacterProfile();
