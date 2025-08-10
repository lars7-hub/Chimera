window.onload = async function () {
    // Load the list of characters and display them
    await loadCharacters();

    // Set up event listener for the "Create New Character" tile
    document.getElementById('create-new-character-tile').addEventListener('click', () => {
        window.location.href = 'character-editor.html?mode=new'; // Navigate to character creator page
    });

    document.getElementById('home-btn').addEventListener('click', () => {
        window.location.href = 'index.html'; // Ensure Home button navigates to the selector page
    });
};

// Load characters dynamically from the characters directory
async function loadCharacters() {
    try {
        const characters = await window.electron.getCharacters(); // Use the exposed method
        const characterListContainer = document.getElementById('character-list');
        characterListContainer.innerHTML = ''; // Clear existing character list

        characters.forEach(character => {
            const characterTile = document.createElement('div');
            characterTile.className = 'character-tile';
			const fit = character.data && character.data.imageFit === 'squish' ? 'fill' : 'cover';
            characterTile.innerHTML = `
                <img src="${character.imagePath}" alt="${character.name}">
                <h3>${character.name}</h3>
            `;
            characterTile.addEventListener('click', () => {
                viewCharacterProfile(character.name);
            });

            characterListContainer.appendChild(characterTile);
        });
    } catch (error) {
        console.error('Error loading characters:', error);
    }
}

// Navigate to a character's profile page
function viewCharacterProfile(characterName) {
    window.location.href = `profile.html?character=${characterName}`; // Navigate to profile page
}
