const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { pathToFileURL, fileURLToPath } = require('url');

let worldRoot;

let fileSystemPath;
let mapPath;
let adventurePath;
let mainWindow;

function ensureSampleMap(targetMapPath) {
    const regionPath = path.join(targetMapPath, 'region1');
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
                    types: [x === 2 && y === 2 ? 'town' : 'land'],
                    start: x === 2 && y === 2,
					items: [],
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

function ensureDefaultLexicon(worldName) {
    const lexiconDir = path.join(worldRoot, worldName, 'Lexicon');
    fs.mkdirSync(lexiconDir, { recursive: true });
    const libs = ['traits', 'typing', 'abilities', 'items', 'npc_blueprints'];
    const samples = {
        traits: [{ name: 'Brave', description: 'Unafraid of danger.' }],
        typing: [{ name: 'Normal', weaknesses: [], resistances: [] }],
        abilities: [{ name: 'Sample Strike', description: 'A basic attack.', typing: 'Normal', power: 0 }],
        items: [{
            key: 'sample_item',
            name: 'Sample Item',
            category: 'miscellaneous',
            icon: 'sample_item.png',
            description: 'Placeholder item.',
            rarity: 'common',
            stackable: false,
            maxStack: 1,
            value: 0,
            stats: []
        }],
        npc_blueprints: [{
            species: 'Sample Species',
            name: 'Sample Species',
            description: 'Placeholder NPC.',
            level: 1,
            types: ['Normal'],
            traits: ['Brave'],
            abilities: ['Sample Strike'],
            inventory: ['sample_item'],
            lootTable: [{ item: 'sample_item', chance: 100, min: 1, max: 1 }],
            xp: 0
        }]
    };
    libs.forEach(lib => {
        const jsonPath = path.join(lexiconDir, `${lib}.json`);
        const imgDir = path.join(lexiconDir, lib);
        if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
        if (!fs.existsSync(jsonPath)) {
            fs.writeFileSync(jsonPath, JSON.stringify(samples[lib] || [], null, 2));
        }
    });
	
	const itemsDir = path.join(lexiconDir, 'items');
    if (!fs.existsSync(itemsDir)) fs.mkdirSync(itemsDir, { recursive : true });
    const sampleItemPath = path.join(itemsDir, 'sample_item.json');
    if (!fs.existsSync(sampleItemPath)) {
        const sampleItem = {
            key: 'sample_item',
            name: 'Sample Item',
            category: 'miscellaneous',
            icon: 'sample_item.png',
            description: 'Placeholder Item',
            rarity: 'common',
            stackable: false,
            maxStack: 1,
            value: 0,
            stats: []
        };
        fs.writeFileSync(sampleItemPath, JSON.stringify(sampleItem, null, 2));
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
    adventurePath = path.join(basePath, 'Adventure');
    worldRoot = path.join(basePath, 'worlds');
    mapPath = path.join(worldRoot, 'map');
    if (!fs.existsSync(fileSystemPath)) {
        fs.mkdirSync(fileSystemPath, { recursive: true });
    }
    if (!fs.existsSync(adventurePath)) {
        fs.mkdirSync(adventurePath, { recursive: true });
    }
    if (!fs.existsSync(mapPath)) {
        fs.mkdirSync(mapPath, { recursive: true });
    }
    ensureSampleMap(mapPath);
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
            const imageField = data.image;
            delete data.tempImagePath;
            if (imageField && (tempImage || imageField.startsWith('file:'))) {
                delete data.image;
            }
            fs.writeFileSync(path.join(tempPath, `${base}.json`), JSON.stringify(data));
            const destImage = path.join(tempPath, `${base}.png`);
            const srcImage = tempImage || (imageField && imageField.startsWith('file:') ? fileURLToPath(imageField) : null);
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
ipcMain.handle('get-map-region', (event, regionName, worldName) => {
    const baseMap = worldName ? path.join(worldRoot, worldName, 'map') : mapPath;
    const regionDir = path.join(baseMap, regionName);
    const result = { tiles: [], width: 0, height: 0, start: null };
	let minX = Infinity, minY = Infinity, maxX= -Infinity, maxY = -Infinity
    try {
        if (fs.existsSync(regionDir)) {
            fs.readdirSync(regionDir).forEach(folder => {
                const tileDir = path.join(regionDir, folder);
                if (fs.lstatSync(tileDir).isDirectory()) {
                    const match = folder.match(/^tile(-?\d+)-(-?\d+)$/);
                    if (match) {
                        const x = parseInt(match[1]);
                        const y = parseInt(match[2]);
                        const tileDataPath = path.join(tileDir, 'tile.json');
                        let tileData = { name: '', types: [], background: '', items: [], connections: [], conditions: [] };
                        if (fs.existsSync(tileDataPath)) {
                            tileData = JSON.parse(fs.readFileSync(tileDataPath, 'utf-8'));
                        }
                        const types = tileData.types && Array.isArray(tileData.types)
                            ? tileData.types
                            : (tileData.type ? [tileData.type] : []);
                        const isStart = !!tileData.start;
                        result.tiles.push({ x, y, name: tileData.name, types, background: tileData.background || '', items: tileData.items || [], connections: tileData.connections || [], modifiers: tileData.modifiers || [], stickers: tileData.stickers || [], conditions: tileData.conditions || {}, start: isStart });
                        if (isStart) {
                            result.start = { x, y };
                        }
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                    }
                }
            });
        }
    } catch (err) {
        console.error('Error loading map region:', err);
    }
    if (maxX !== -Infinity && maxY !== -Infinity) {
        result.width = maxX - minX + 1;
        result.height = maxY - minY + 1;
        result.minX = minX;
        result.minY = minY;
    }
    return result;
});

ipcMain.handle('get-zones', (event, regionName, worldName) => {
    const baseMap = worldName ? path.join(worldRoot, worldName, 'map') : mapPath;
    const zoneDir = path.join(baseMap, regionName, 'zones');
    const zones = [];
    try {
        if (fs.existsSync(zoneDir)) {
            fs.readdirSync(zoneDir).forEach(file => {
                if (file.endsWith('.json')) {
                    const p = path.join(zoneDir, file);
                    const z = JSON.parse(fs.readFileSync(p, 'utf-8'));
                    zones.push(z);
                }
            });
        }
    } catch (err) {
        console.error('Error loading zones:', err);
    }
    return zones;
});

ipcMain.handle('get-adventures', () => {
    try {
        if (!fs.existsSync(adventurePath)) return [];
        return fs.readdirSync(adventurePath).filter(name => {
            const dir = path.join(adventurePath, name);
            return fs.lstatSync(dir).isDirectory();
        });
    } catch (err) {
        console.error('Error listing adventures:', err);
        return [];
    }
});

ipcMain.handle('create-adventure', (event, saveName) => {
    try {
        const target = path.join(adventurePath, saveName);
        if (fs.existsSync(target)) {
            return { success: false, message: 'Adventure already exists' };
        }
        fs.mkdirSync(target, { recursive: true });
        fs.cpSync(worldRoot, path.join(target, 'world'), { recursive: true });
        return { success: true };
    } catch (err) {
        console.error('Error creating adventure:', err);
        return { success: false };
    }
});

ipcMain.handle('prepare-adventure-character', (event, saveName, characterName, loadoutName) => {
    try {
        const destDir = path.join(adventurePath, saveName, 'characters', characterName);
        fs.mkdirSync(destDir, { recursive: true });
        const srcDir = path.join(fileSystemPath, characterName);
        const files = [`${characterName}.json`, `${characterName}.png`];
        files.forEach(f => {
            const src = path.join(srcDir, f);
            const dest = path.join(destDir, f);
            if (fs.existsSync(src)) {
                fs.copyFileSync(src, dest);
            }
        });
        if (loadoutName) {
            const srcLoad = path.join(srcDir, 'loadouts', loadoutName);
            const destLoad = path.join(destDir, 'loadouts', loadoutName);
            if (fs.existsSync(srcLoad)) {
                fs.cpSync(srcLoad, destLoad, { recursive: true });
            }
        }
        return { success: true };
     } catch (err) {
        console.error('Error preparing adventure character:', err);
        return { success: false };
    }
});

ipcMain.handle('export-character', async (event, characterName) => {
    const srcDir = path.join(fileSystemPath, characterName);
    if (!fs.existsSync(srcDir)) {
        return { success: false, message: 'Character not found' };
    }
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: `${characterName}.zip` });
    if (canceled || !filePath) return { success: false };
    return new Promise(resolve => {
        exec(`zip -r "${filePath}" .`, { cwd: srcDir }, err => {
            if (err) resolve({ success: false }); else resolve({ success: true, path: filePath });
        });
    });
});

ipcMain.handle('import-character', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Zip', extensions: ['zip'] }] });
    if (canceled || !filePaths || !filePaths[0]) return { success: false };
    const zipPath = filePaths[0];
    return new Promise(resolve => {
        exec(`unzip -o "${zipPath}" -d "${fileSystemPath}"`, err => {
            if (err) resolve({ success: false }); else resolve({ success: true });
        });
    });
});

ipcMain.handle('export-world', async (event, worldName) => {
    const srcDir = worldName ? path.join(worldRoot, worldName) : worldRoot;
    if (!fs.existsSync(srcDir)) {
        return { success: false, message: 'World not found' };
    }
    const baseName = worldName || 'world';
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: `${baseName}.zip` });
    if (canceled || !filePath) return { success: false };
    return new Promise(resolve => {
        exec(`zip -r "${filePath}" .`, { cwd: srcDir }, err => {
            if (err) resolve({ success: false }); else resolve({ success: true, path: filePath });
        });
    });
});

ipcMain.handle('import-world', async (event, worldName) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Zip', extensions: ['zip'] }] });
    if (canceled || !filePaths || !filePaths[0]) return { success: false };
    const zipPath = filePaths[0];
    const destDir = worldName ? path.join(worldRoot, worldName) : worldRoot;
    return new Promise(resolve => {
        exec(`unzip -o "${zipPath}" -d "${destDir}"`, err => {
            if (err) resolve({ success: false }); else resolve({ success: true });
        });
    });
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

ipcMain.handle('list-tile-images', () => {
    const dir = path.join(__dirname, 'resources', 'map', 'tiles');
    try {
        const sections = { root: [] };
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        entries.forEach(e => {
            if (e.isDirectory()) {
                const subDir = path.join(dir, e.name);
                const files = fs
                    .readdirSync(subDir)
                    .filter(f => /\.(png|jpg|jpeg|gif)$/.test(f))
                    .map(f => path.join(e.name, f).replace(/\\/g, '/'));
                if (files.length) sections[e.name] = files;
            } else if (e.isFile() && /\.(png|jpg|jpeg|gif)$/.test(e.name)) {
                sections.root.push(e.name);
            }
        });
        return sections;
    } catch (err) {
        console.error('Error listing tile images:', err);
        return {};
    }
});

ipcMain.handle('get-random-tile-image', (event, type) => {
    const dir = path.join(__dirname, 'resources', 'map', 'tiles', type);
    try {
        const files = fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|gif)$/.test(f));
        if (!files.length) return null;
        const file = files[Math.floor(Math.random() * files.length)];
        return `${type}/${file}`;
    } catch (err) {
        console.error('Error getting random tile image:', err);
        return null;
    }
});

ipcMain.handle('get-sticker-images', (event, type) => {
    const dir = path.join(__dirname, 'resources', 'map', 'stickers', type);
    try {
        return fs.readdirSync(dir).filter(f => /\.(png|jpg|jpeg|gif)$/.test(f));
    } catch (err) {
        console.error('Error listing sticker images:', err);
        return [];
    }
});

ipcMain.handle('prepare-world-character', (event, worldName, characterName, loadoutName) => {
    try {
        const destDir = path.join(worldRoot, worldName, 'savedata');
        fs.rmSync(destDir, { recursive: true, force: true });
        fs.mkdirSync(destDir, { recursive: true });
        const srcDir = path.join(fileSystemPath, characterName);
        // Copy character data and image, renaming to fixed filenames
        const srcJson = path.join(srcDir, `${characterName}.json`);
        const destJson = path.join(destDir, 'character.json');
        if (fs.existsSync(srcJson)) {
            fs.copyFileSync(srcJson, destJson);
        }
        const srcImg = path.join(srcDir, `${characterName}.png`);
        const destImg = path.join(destDir, 'character.png');
        if (fs.existsSync(srcImg)) {
            fs.copyFileSync(srcImg, destImg);
        }
        // Copy inventory from the selected loadout
        const srcInv = path.join(srcDir, 'loadouts', loadoutName || 'default', 'inventory');
        const destInv = path.join(destDir, 'inventory');
        if (fs.existsSync(srcInv)) {
            fs.rmSync(destInv, { recursive: true, force: true });
            fs.cpSync(srcInv, destInv, { recursive: true });
        }
        return { success: true };
    } catch (err) {
        console.error('Error preparing world character:', err);
        return { success: false, message: 'Error preparing world character' };
    }
});

ipcMain.handle('get-world-character', (event, worldName) => {
    try {
        const charDir = path.join(worldRoot, worldName, 'savedata');
        const jsonPath = path.join(charDir, 'character.json');
        if (!fs.existsSync(jsonPath)) return null;
        const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
        return data;
    } catch (err) {
        console.error('Error reading world character:', err);
        return null;
    }
});

ipcMain.handle('get-world-inventory', (event, worldName) => {
    const items = [];
    try {
        const invPath = path.join(worldRoot, worldName, 'savedata', 'inventory');
        if (fs.existsSync(invPath)) {
            fs.readdirSync(invPath).forEach(file => {
                if (file.endsWith('.json')) {
                    const base = path.basename(file, '.json');
                    const data = JSON.parse(fs.readFileSync(path.join(invPath, file), 'utf-8'));
                    const imgPath = path.join(invPath, `${base}.png`);
                    if (fs.existsSync(imgPath)) {
                        data.image = pathToFileURL(imgPath).href;
                    }
                    items.push(data);
                }
            });
        }
    } catch (err) {
        console.error('Error reading world inventory:', err);
    }
    return items;
});

ipcMain.handle('save-world-inventory', (event, worldName, items) => {
    try {
        const invPath = path.join(worldRoot, worldName, 'savedata', 'inventory');
        const tempPath = path.join(worldRoot, worldName, 'savedata', 'inventory_tmp');
        fs.rmSync(tempPath, { recursive: true, force: true });
        fs.mkdirSync(tempPath, { recursive: true });
        items.forEach((item, index) => {
            const base = `item${index}`;
            const data = { ...item };
            const tempImage = data.tempImagePath;
            const imageField = data.image;
            delete data.tempImagePath;
            if (imageField && (tempImage || imageField.startsWith('file:'))) {
                delete data.image; // stored separately as a file
            }
            fs.writeFileSync(path.join(tempPath, `${base}.json`), JSON.stringify(data));
            const destImage = path.join(tempPath, `${base}.png`);
            const srcImage = tempImage || (imageField && imageField.startsWith('file:') ? fileURLToPath(imageField) : null);
            if (srcImage && fs.existsSync(srcImage)) {
                fs.copyFileSync(srcImage, destImage);
            }
        });
        fs.rmSync(invPath, { recursive: true, force: true });
        fs.renameSync(tempPath, invPath);
        return { success: true };
    } catch (err) {
        console.error('Error saving world inventory:', err);
        return { success: false, message: 'Error saving world inventory' };
    }
});

ipcMain.handle('list-worlds', () => {
    try {
        if (!fs.existsSync(worldRoot)) return [];
        return fs.readdirSync(worldRoot).filter(name => {
            const dir = path.join(worldRoot, name);
            return fs.lstatSync(dir).isDirectory() && name !== 'map';
        });
    } catch (err) {
        console.error('Error listing worlds:', err);
        return [];
    }
});

ipcMain.handle('create-world', (event, worldName) => {
    try {
        const target = path.join(worldRoot, worldName);
        if (fs.existsSync(target)) {
            return { success: false, message: 'World already exists' };
        }
        const mapDir = path.join(target, 'map');
        fs.mkdirSync(mapDir, { recursive: true });
        ensureSampleMap(mapDir);
        ensureDefaultLexicon(worldName);
        return { success: true };
    } catch (err) {
        console.error('Error creating world:', err);
        return { success: false, message: 'Error creating world' };
    }
});

ipcMain.handle('ensure-lexicon', (event, worldName) => {
    try {
        ensureDefaultLexicon(worldName);
        return { success: true };
    } catch (err) {
        console.error('Error ensuring lexicon:', err);
        return { success: false };
    }
});

ipcMain.handle('has-lexicon', (event, worldName) => {
    const dir = path.join(worldRoot, worldName, 'Lexicon');
    return fs.existsSync(dir);
});

ipcMain.handle('get-lexicon', (event, worldName) => {
    try {
        ensureDefaultLexicon(worldName);
        const dir = path.join(worldRoot, worldName, 'Lexicon');
        const libs = ['traits', 'typing', 'abilities', 'npc_blueprints'];
        const result = {};
        libs.forEach(lib => {
            const file = path.join(dir, `${lib}.json`);
            if (fs.existsSync(file)) {
                result[lib] = JSON.parse(fs.readFileSync(file, 'utf-8'));
            } else {
                result[lib] = [];
            }
        });

        const itemsDir = path.join(dir, 'items');
        const items = [];
        if (fs.existsSync(itemsDir)) {
            fs.readdirSync(itemsDir).forEach(f => {
                if (f.endsWith('.json')) {
                    const jsonPath = path.join(itemsDir, f);
                    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
                    const base = f.slice(0, -5);
                    const imgPath = path.join(itemsDir, data.icon || `${base}.png`);
                    if (fs.existsSync(imgPath)) {
                        data.icon = pathToFileURL(imgPath).href;
                    }
                    data.key = data.key || base;
                    items.push(data);
                }
            });
        }
        result.items = items;
        return result;
    } catch (err) {
        console.error('Error loading lexicon:', err);
        return {};
    }
});

ipcMain.handle('save-lexicon', (event, worldName, library, data) => {
    try {
        const dir = path.join(worldRoot, worldName, 'Lexicon');
        fs.mkdirSync(dir, { recursive: true });
		
		if (library === 'items') {
            const itemsDir = path.join(dir, 'items');
            fs.mkdirSync(itemsDir, { recursive : true });
            const names = new Set();
            data.forEach(item => {
                const base = (item.key || item.name || 'item').replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
                names.add(base);
                const jsonPath = path.join(itemsDir, `${base}.json`);
                const imgPath = path.join(itemsDir, `${base}.png`);
                const { icon, ...rest } = item;
                rest.key = item.key || base;
                rest.icon = `${base}.png`;
                fs.writeFileSync(jsonPath, JSON.stringify(rest, null, 2));
                if (icon) {
                    const src = icon.startsWith('file://') ? fileURLToPath(icon) : icon;
                    if (path.resolve(src) !== imgPath) {
                        fs.copyFileSync(src, imgPath);
                    }
                }
            });
            fs.readdirSync(itemsDir).forEach(f => {
                const base = f.replace(/\.(json|png)$/i, '');
                if (!names.has(base)) {
                    fs.unlinkSync(path.join(itemsDir, f));
                }
            });
        } else {
            const file = path.join(dir, `${library}.json`);
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        }
        return { success: true };
    } catch (err) {
        console.error('Error saving lexicon:', err);
        return { success: false };
    }
});

ipcMain.handle('export-lexicon', async (event, worldName) => {
    const srcDir = path.join(worldRoot, worldName, 'Lexicon');
    if (!fs.existsSync(srcDir)) return { success: false, message: 'Lexicon not found' };
    const { canceled, filePath } = await dialog.showSaveDialog({ defaultPath: `${worldName}-lexicon.zip` });
    if (canceled || !filePath) return { success: false };
    return new Promise(resolve => {
        exec(`zip -r "${filePath}" .`, { cwd: srcDir }, err => {
            if (err) resolve({ success: false }); else resolve({ success: true, path: filePath });
        });
    });
});

ipcMain.handle('import-lexicon', async (event, worldName) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openFile'], filters: [{ name: 'Zip', extensions: ['zip'] }] });
    if (canceled || !filePaths || !filePaths[0]) return { success: false };
    const zipPath = filePaths[0];
    const destDir = path.join(worldRoot, worldName, 'Lexicon');
    fs.mkdirSync(destDir, { recursive: true });
    return new Promise(resolve => {
        exec(`unzip -o "${zipPath}" -d "${destDir}"`, err => {
            if (err) resolve({ success: false }); else resolve({ success: true });
        });
    });
});

ipcMain.handle('save-map-region', (event, regionName, worldName, tiles, start) => {
    try {
        const baseMap = worldName ? path.join(worldRoot, worldName, 'map') : mapPath;
        const regionDir = path.join(baseMap, regionName);
        fs.mkdirSync(regionDir, { recursive: true });
        fs.readdirSync(regionDir).forEach(name => {
            if (name !== 'zones') {
                fs.rmSync(path.join(regionDir, name), { recursive: true, force: true });
            }
        });
        tiles.forEach(t => {
            const tileDir = path.join(regionDir, `tile${t.x}-${t.y}`);
            fs.mkdirSync(tileDir, { recursive: true });
            const data = {
                name: t.name || '',
                types: t.types || [],
                background: t.background || '',
                items: t.items || [],
                resources: t.resources || [],
                connections: t.connections || [],
                modifiers: t.modifiers || [],
                stickers: t.stickers || [],
                conditions: t.conditions || {}
            };
            if (start && start.x === t.x && start.y === t.y) {
                data.start = true;
            }
            fs.writeFileSync(path.join(tileDir, 'tile.json'), JSON.stringify(data, null, 2));
        });
        return { success: true };
    } catch (err) {
        console.error('Error saving map region:', err);
        return { success: false };
    }
});



ipcMain.handle('save-zone', (event, regionName, worldName, zone) => {
    try {
        const baseMap = worldName ? path.join(worldRoot, worldName, 'map') : mapPath;
        const zoneDir = path.join(baseMap, regionName, 'zones');
        fs.mkdirSync(zoneDir, { recursive: true });
        const file = path.join(zoneDir, `zone${zone.id}.json`);
        fs.writeFileSync(file, JSON.stringify(zone, null, 2));
        return { success: true };
    } catch (err) {
        console.error('Error saving zone:', err);
        return { success: false };
    }
});