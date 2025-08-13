const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');

let fileSystemPath;
let mapPath;
let mainWindow;

function ensureSampleMap() {
    const regionPath = path.join(mapPath, 'region1');
    for (let y = 1; y <= 3; y++) {
        for (let x = 1; x <= 3; x++) {
            const tileFolder = path.join(regionPath, `tile${x}-${y}`);
            const inventoryFolder = path.join(tileFolder, 'inventory');
            if (!fs.existsSync(tileFolder)) {
                fs.mkdirSync(inventoryFolder, { recursive: true });
            } else if (!fs.existsSync(inventoryFolder)) {
                fs.mkdirSync(inventoryFolder, { recursive: true });
            }
            const tileDataPath = path.join(tileFolder, 'tile.json');
            if (!fs.existsSync(tileDataPath)) {
                const tileData = {
                    name: x === 2 && y === 2 ? 'Start' : `Tile ${x}-${y}`,
                    type: x === 2 && y === 2 ? 'town' : 'land',
                    start: x === 2 && y === 2
                };
                fs.writeFileSync(tileDataPath, JSON.stringify(tileData));
            }
            if (x === 2 && y === 2) {
                const sampleItem = path.join(inventoryFolder, 'item0.json');
                if (!fs.existsSync(sampleItem)) {
                    fs.writeFileSync(sampleItem, JSON.stringify({ name: 'Welcome Sword', description: 'A basic sword.' }));
                }
            }
        }
    }
}

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

app.whenReady().then(() => {
    const basePath = path.join(app.getPath('documents'), 'Chimera');
    fileSystemPath = path.join(basePath, 'characters');
    mapPath = path.join(basePath, 'map');
    if (!fs.existsSync(fileSystemPath)) {
        fs.mkdirSync(fileSystemPath, { recursive: true });
    }
    if (!fs.existsSync(mapPath)) {
        fs.mkdirSync(mapPath, { recursive: true });
    }
    ensureSampleMap();
    createWindow();
});

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
ipcMain.handle('get-character', (event, characterName) => {
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
	
	ipcMain.handle('get-character-image', (event, characterName) => {
    const imgPath = path.join(fileSystemPath, characterName, `${characterName}.png`);
    if (fs.existsSync(imgPath)) {
        return pathToFileURL(imgPath).href;
    }
    return null;
});

ipcMain.handle('get-loadout-image', (event, characterName, loadoutName) => {
    const imgPath = path.join(fileSystemPath, characterName, 'loadouts', loadoutName, 'image.png');
    if (fs.existsSync(imgPath)) {
        return pathToFileURL(imgPath).href;
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

// Delete a loadout
ipcMain.handle('delete-loadout', (event, characterName, loadoutName) => {
    try {
        const loadoutFolder = path.join(fileSystemPath, characterName, 'loadouts', loadoutName);
        if (fs.existsSync(loadoutFolder)) {
            fs.rmSync(loadoutFolder, { recursive: true, force: true });
            return { success: true };
        }
        return { success: false, message: 'Loadout not found' };
    } catch (error) {
        console.error('Error deleting loadout:', error);
        return { success: false, message: 'Error deleting loadout' };
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
		const tempPath = path.join(fileSystemPath, characterName, 'loadouts', loadoutName, 'inventory_tmp');
        fs.rmSync(tempPath, { recursive: true, force: true });
        fs.mkdirSync(tempPath, { recursive: true });
        items.forEach((item, index) => {
            const base = `item${index}`;
            const data = { ...item };
            const tempImage = data.tempImagePath;
            delete data.tempImagePath;
            delete data.image;
            fs.writeFileSync(path.join(tempPath, `${base}.json`), JSON.stringify(data));
            const destImage = path.join(tempPath, `${base}.png`);
            const srcImage = tempImage || (item.image ? fileURLToPath(item.image) : null);
            if (srcImage && fs.existsSync(srcImage)) {
                fs.copyFileSync(srcImage, destImage);
            }
        });
		fs.rmSync(inventoryPath, { recursive: true, force: true});
		fs.renameSync(tempPath, inventoryPath);
        return { success: true };
    } catch (error) {
        console.error('Error saving inventory:', error);
        return { success: false, message: 'Error saving inventory' };
    }
});

// Map handlers
ipcMain.handle('get-map-region', (event, regionName) => {
    const regionDir = path.join(mapPath, regionName);
    const result = { tiles: [], width: 0, height: 0, start: null };
    try {
        if (fs.existsSync(regionDir)) {
            fs.readdirSync(regionDir).forEach(folder => {
                const tileDir = path.join(regionDir, folder);
                if (fs.lstatSync(tileDir).isDirectory()) {
                    const match = folder.match(/^tile(\d+)-(\d+)$/);
                    if (match) {
                        const x = parseInt(match[1]);
                        const y = parseInt(match[2]);
                        const tileDataPath = path.join(tileDir, 'tile.json');
                        let tileData = { name: '', type: '' };
                        if (fs.existsSync(tileDataPath)) {
                            tileData = JSON.parse(fs.readFileSync(tileDataPath, 'utf-8'));
                        }
                        const items = [];
                        const inventoryDir = path.join(tileDir, 'inventory');
                        if (fs.existsSync(inventoryDir)) {
                            fs.readdirSync(inventoryDir).forEach(file => {
                                if (file.endsWith('.json')) {
                                    const base = path.basename(file, '.json');
                                    const data = JSON.parse(fs.readFileSync(path.join(inventoryDir, file), 'utf-8'));
                                    const img = path.join(inventoryDir, `${base}.png`);
                                    if (fs.existsSync(img)) {
                                        data.image = pathToFileURL(img).href;
                                    }
                                    items.push(data);
                                }
                            });
                        }
                        result.tiles.push({ x, y, name: tileData.name, type: tileData.type, items });
                        if (tileData.start) {
                            result.start = { x, y };
                        }
                        if (x > result.width) result.width = x;
                        if (y > result.height) result.height = y;
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error loading map region:', err);
    }
    return result;
});

// Info page handlers
const infoPath = path.join(__dirname, 'resources', 'info.json');

ipcMain.handle('get-info', () => {
    try {
        if (fs.existsSync(infoPath)) {
            return JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
        }
    } catch (error) {
        console.error('Error reading info file:', error);
    }
    return { sections: [] };
});

ipcMain.handle('save-info', (event, data) => {
    try {
        fs.writeFileSync(infoPath, JSON.stringify(data));
        return { success: true };
    } catch (error) {
        console.error('Error saving info file:', error);
        return { success: false };
    }
});