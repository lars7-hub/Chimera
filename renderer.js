window.onload = async function () {
    // Load the list of characters and display them
    await loadCharacters();

    // Set up event listener for the "Create New Character" button
	const createBtn = document.getElementById('create-character-btn');
    if (createBtn) {
        createBtn.addEventListener('click', () => {
            window.location.href = 'character-editor.html?mode=new'; // Navigate to character creator page
        });
    }

    document.getElementById('home-btn').addEventListener('click', () => {
        window.location.href = 'index.html'; // Ensure Home button navigates to the selector page
    });

    document.getElementById('info-btn').addEventListener('click', () => {
        window.location.href = 'info.html';
    });

    document.getElementById('world-builder-btn').addEventListener('click', () => {
        window.location.href = 'world-builder.html';
    });

    document.getElementById('adventure-btn').addEventListener('click', () => {
        window.location.href = 'adventure.html';
    });

    document.getElementById('random-btn').addEventListener('click', goRandom);
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
                <img src="${character.imagePath}" alt="${character.name}" style="object-fit:${fit};">
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
    localStorage.setItem('currentCharacter', characterName);
    window.location.href = `profile.html?character=${characterName}`; // Navigate to profile page
}

async function goRandom() {
    try {
        const chars = await window.electron.getCharacters();
        if (!chars.length) return;
        const char = chars[Math.floor(Math.random() * chars.length)];
        let loads = await window.electron.getLoadouts(char.name);
        let names = loads.map(l => l.name);
        names.push('default');
        const loadName = names[Math.floor(Math.random() * names.length)];
		const url = loadName === 'default'
        ? `profile.html?character=${char.name}`
        : `profile.html?character=${char.name}&loadout=${loadName}`;
        localStorage.setItem('currentCharacter', char.name);
        window.location.href = url;
    } catch (err) {
        console.error(err);
    }
}
