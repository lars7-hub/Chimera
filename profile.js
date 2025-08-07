// Extract character name from the URL query string
const urlParams = new URLSearchParams(window.location.search);
const characterName = urlParams.get('character');

// Load character data
async function loadCharacterProfile() {
    const characterData = await window.electron.getCharacter(characterName);
	if (!characterData) {
		console.error('Character data not found:', characterName);
		return;	
	}
	
    document.getElementById('character-name').innerText = characterData.name;
    document.getElementById('character-age').innerText = `Age: ${characterData.age}`;
    document.getElementById('character-gender').innerText = `Gender: ${characterData.gender}`;
    document.getElementById('character-description').innerText = characterData.description;

    // Set character image
    const imagePath = `app/characters/${characterName}/${characterName}.png`;
    const fit = characterData.imageFit === 'squish' ? 'fill' : 'cover';
    document.getElementById('profile-image').innerHTML =
        `<img src="${imagePath}" alt="${characterName}" style="width:100%;height:100%;object-fit:${fit};">`;
}

document.getElementById('home-btn').addEventListener('click', () => {
    window.location.href = 'index.html';
});

document.getElementById('edit-character-btn')?.addEventListener('click', () => {
    window.location.href = `edit-character.html?character=${characterName}`;
});



loadCharacterProfile();