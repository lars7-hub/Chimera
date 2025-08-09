const { app, BrowserWindow, ipcMain, dialog} = require('electron'); // Ensure path and fs are required properly
const fs = require('fs'); // Core Node.js fs module
const path = require('path'); // Core Node.js path module
const { pathToFileURL } = require('url');

const fileSystemPath = path.join(__dirname, 'app/characters'); // Correctly access the characters directory

// Check if the directory exists and make it if it doesn't
if (!fs.existsSync(fileSystemPath)) {
	fs.mkdirSync(fileSystemPath, { recursive: true });
}

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Correctly reference the preload.js file
            nodeIntegration: false,
            contextIsolation: true,
        }
    });
    mainWindow.loadFile('index.html'); // Load the character selector page by default
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Add handler for 'get-characters'
ipcMain.handle('get-characters', () => {
    const characters = [];
    try {
        fs.readdirSync(fileSystemPath).forEach(characterFolder => {
            const characterPath = path.join(fileSystemPath, characterFolder);
            if (fs.lstatSync(characterPath).isDirectory()) {
                const characterDataPath = path.join(characterPath, `${characterFolder}.json`);
                if (fs.existsSync(characterDataPath)) {
                    const characterData = JSON.parse(fs.readFileSync(characterDataPath, 'utf-8'));
					const imagePath = path.join(characterPath, `${characterFolder}.png`);
                    characters.push({ 
					name: characterFolder, 
					data: characterData, 
					imagePath: pathToFileURL(imagePath).href,
					});
                }
            }
        });
    } catch (error) {
        console.error('Error reading characters:', error);
    }
    return characters;
});

// Fetch a single character's data
ipcMain.handle('get-character', (even, characterName) => {
	try {
		const characterDataPath = path.join(fileSystemPath, characterName, `${characterName}.json`);
		if (fs.existsSync(characterDataPath)) {
			const characterData = JSON.parse(fs.readFileSync(characterDataPath, 'utf-8'));
			return characterData;
		}
	
	} catch (error) {
		console.error('Error reading character data:', error);
	}
	return null;
	});

// Open file dialog for image selection
ipcMain.handle('open-file-dialog', () => {
    return dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif'] }]
    }).then(result => {
        if (!result.canceled) {
            return result.filePaths[0];
        }
        return null;
    });
});

// Create a new character
ipcMain.handle('create-character', (event, characterName, characterData, imagePath) => {
    const characterFolderPath = path.join(fileSystemPath, characterName);

    // Ensure character folder exists
    if (!fs.existsSync(characterFolderPath)) {
        fs.mkdirSync(characterFolderPath);
        fs.mkdirSync(path.join(characterFolderPath, 'loadouts'));
    }
    // Ensure default loadout inventory folder exists
    const defaultInvPath = path.join(characterFolderPath, 'loadouts', 'default', 'inventory');
    if (!fs.existsSync(defaultInvPath)) {
        fs.mkdirSync(defaultInvPath, { recursive: true });
    }

    // Save the character image
    const newImagePath = path.join(characterFolderPath, `${characterName}.png`);
    fs.copyFileSync(imagePath, newImagePath);

    // Save the character data to a JSON file
    const characterDataPath = path.join(characterFolderPath, `${characterName}.json`);
    fs.writeFileSync(characterDataPath, JSON.stringify(characterData));

    return { success: true, message: 'Character created successfully' };
});

// Update an existing character
ipcMain.handle('update-character', (event, originalName, characterData, imagePath) => {
    const originalFolderPath = path.join(fileSystemPath, originalName);
    const newName = characterData.name;
    let newFolderPath = originalFolderPath;

    // Rename folder if character's name has changed
    if (newName !== originalName) {
        newFolderPath = path.join(fileSystemPath, newName);
        fs.renameSync(originalFolderPath, newFolderPath);
    }

    // Handle image
    const newImageDestination = path.join(newFolderPath, `${newName}.png`);
    if (imagePath) {
        fs.copyFileSync(imagePath, newImageDestination);
    } else if (newName !== originalName) {
        const oldImagePath = path.join(newFolderPath, `${originalName}.png`);
        if (fs.existsSync(oldImagePath)) {
            fs.renameSync(oldImagePath, newImageDestination);
        }
    }

    // Save character data
    const newDataPath = path.join(newFolderPath, `${newName}.json`);
    if (newName !== originalName) {
        const oldDataPath = path.join(newFolderPath, `${originalName}.json`);
        if (fs.existsSync(oldDataPath)) {
            fs.unlinkSync(oldDataPath);
        }
    }
    fs.writeFileSync(newDataPath, JSON.stringify(characterData));
    const defaultInvPath = path.join(newFolderPath, 'loadouts', 'default', 'inventory');
    if (!fs.existsSync(defaultInvPath)) {
        fs.mkdirSync(defaultInvPath, { recursive: true });
    }

    return { success: true, message: 'Character updated successfully' };
});

// Delete a character
ipcMain.handle('delete-character', (event, characterName) => {
    const characterFolderPath = path.join(fileSystemPath, characterName);
    try {
        if (fs.existsSync(characterFolderPath)) {
            fs.rmSync(characterFolderPath, { recursive: true, force: true });
            return { success: true };
        }
        return { success: false, message: 'Character not found' };
    } catch (error) {
        console.error('Error deleting character:', error);
        return { success: false, message: 'Error deleting character' };
    }
});

// Get all loadouts for a character
ipcMain.handle('get-loadouts', (event, characterName) => {
    const loadouts = [];
    try {
        const loadoutsPath = path.join(fileSystemPath, characterName, 'loadouts');
        if (fs.existsSync(loadoutsPath)) {
            fs.readdirSync(loadoutsPath).forEach(folder => {
                const loadoutFolder = path.join(loadoutsPath, folder);
                if (fs.lstatSync(loadoutFolder).isDirectory() && folder !== 'default') {
                    const dataPath = path.join(loadoutFolder, 'data.json');
                    if (fs.existsSync(dataPath)) {
                        const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
                        loadouts.push({ name: folder, data });
                    }
                }
            });
        }
    } catch (error) {
        console.error('Error reading loadouts:', error);
    }
    return loadouts;
});

// Get a specific loadout's data
ipcMain.handle('get-loadout', (event, characterName, loadoutName) => {
    try {
        const loadoutDataPath = path.join(fileSystemPath, characterName, 'loadouts', loadoutName, 'data.json');
        if (fs.existsSync(loadoutDataPath)) {
            const loadoutData = JSON.parse(fs.readFileSync(loadoutDataPath, 'utf-8'));
            return loadoutData;
        }
    } catch (error) {
        console.error('Error reading loadout data:', error);
    }
    return null;
});

// Create a new loadout by copying base character data
ipcMain.handle('create-loadout', (event, characterName, loadoutName) => {
    const loadoutsPath = path.join(fileSystemPath, characterName, 'loadouts');
    try {
        const newLoadoutFolder = path.join(loadoutsPath, loadoutName);
        if (fs.existsSync(newLoadoutFolder)) {
            return { success: false, message: 'Loadout already exists' };
        }
        fs.mkdirSync(path.join(newLoadoutFolder, 'inventory'), { recursive: true });
        const baseDataPath = path.join(fileSystemPath, characterName, `${characterName}.json`);
        const baseImagePath = path.join(fileSystemPath, characterName, `${characterName}.png`);
        const baseData = JSON.parse(fs.readFileSync(baseDataPath, 'utf-8'));
        delete baseData.inventory;
        baseData.name = loadoutName;
        fs.writeFileSync(path.join(newLoadoutFolder, 'data.json'), JSON.stringify(baseData));
        const newImagePath = path.join(newLoadoutFolder, 'image.png');
        if (fs.existsSync(baseImagePath)) {
            fs.copyFileSync(baseImagePath, newImagePath);
        }
        return { success: true };
    } catch (error) {
        console.error('Error creating loadout:', error);
        return { success: false, message: 'Error creating loadout' };
    }
});

// Update an existing loadout
ipcMain.handle('update-loadout', (event, characterName, originalName, loadoutData, imagePath) => {
    const loadoutsPath = path.join(fileSystemPath, characterName, 'loadouts');
    const newName = loadoutData.name;
    try {
        let loadoutFolder = path.join(loadoutsPath, originalName);
        if (newName !== originalName) {
            const newFolder = path.join(loadoutsPath, newName);
            if (fs.existsSync(loadoutFolder)) {
                fs.renameSync(loadoutFolder, newFolder);
            }
            loadoutFolder = newFolder;
        }

        if (!fs.existsSync(loadoutFolder)) {
            fs.mkdirSync(loadoutFolder, { recursive: true });
        }
        if (imagePath) {
            const imageDestination = path.join(loadoutFolder, 'image.png');
            fs.copyFileSync(imagePath, imageDestination);
        }

        fs.writeFileSync(path.join(loadoutFolder, 'data.json'), JSON.stringify(loadoutData));
        return { success: true };
    } catch (error) {
        console.error('Error updating loadout:', error);
        return { success: false, message: 'Error updating loadout' };
    }
});

// Get inventory for a loadout
ipcMain.handle('get-inventory', (event, characterName, loadoutName) => {
    const items = [];
    try {
        const inventoryPath = path.join(fileSystemPath, characterName, 'loadouts', loadoutName, 'inventory');
        if (fs.existsSync(inventoryPath)) {
            fs.readdirSync(inventoryPath).forEach(file => {
                if (file.endsWith('.json')) {
                    const base = path.basename(file, '.json');
                    const data = JSON.parse(fs.readFileSync(path.join(inventoryPath, file), 'utf-8'));
                    const imgPath = path.join(inventoryPath, `${base}.png`);
                    if (fs.existsSync(imgPath)) {
                        data.image = pathToFileURL(imgPath).href;
                    }
                    items.push(data);
                }
            });
        }
    } catch (error) {
        console.error('Error reading inventory:', error);
    }
    return items;
});

// Save inventory for a loadout
ipcMain.handle('save-inventory', (event, characterName, loadoutName, items) => {
    try {
        const inventoryPath = path.join(fileSystemPath, characterName, 'loadouts', loadoutName, 'inventory');
        fs.rmSync(inventoryPath, { recursive: true, force: true });
        fs.mkdirSync(inventoryPath, { recursive: true });
        items.forEach((item, index) => {
            const base = `item${index}`;
            const data = { ...item };
            const tempImage = data.tempImagePath;
            delete data.tempImagePath;
            delete data.image;
            fs.writeFileSync(path.join(inventoryPath, `${base}.json`), JSON.stringify(data));
            const destImage = path.join(inventoryPath, `${base}.png`);
            const srcImage = tempImage || (item.image ? new URL(item.image).pathname : null);
            if (srcImage && fs.existsSync(srcImage)) {
                fs.copyFileSync(srcImage, destImage);
            }
        });
        return { success: true };
    } catch (error) {
        console.error('Error saving inventory:', error);
        return { success: false, message: 'Error saving inventory' };
    }
});