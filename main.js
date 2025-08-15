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
ipcMain.handle('get-map-region', (event, regionName, worldName) => {
    const baseMap = worldName ? path.join(worldRoot, worldName, 'map') : mapPath;
    const regionDir = path.join(baseMap, regionName);
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
                        let tileData = { name: '', types: [], background: '', items: [], connections: [] };
                        if (fs.existsSync(tileDataPath)) {
                            tileData = JSON.parse(fs.readFileSync(tileDataPath, 'utf-8'));
                        }
                        const types = tileData.types && Array.isArray(tileData.types)
                            ? tileData.types
                            : (tileData.type ? [tileData.type] : []);
                        const isStart = !!tileData.start;
                        result.tiles.push({ x, y, name: tileData.name, types, background: tileData.background || '', items: tileData.items || [], connections: tileData.connections || [], modifiers: tileData.modifiers || [], start: isStart });
                        if (isStart) {
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
        return { success: true };
    } catch (err) {
        console.error('Error creating world:', err);
        return { success: false, message: 'Error creating world' };
    }
});

ipcMain.handle('save-map-region', (event, regionName, worldName, tiles, start) => {
    try {
        const baseMap = worldName ? path.join(worldRoot, worldName, 'map') : mapPath;
        const regionDir = path.join(baseMap, regionName);
        fs.rmSync(regionDir, { recursive: true, force: true });
        fs.mkdirSync(regionDir, { recursive: true });
        tiles.forEach(t => {
            const tileDir = path.join(regionDir, `tile${t.x}-${t.y}`);
            fs.mkdirSync(tileDir, { recursive: true });
            const data = {
                name: t.name || '',
                types: t.types || [],
                background: t.background || '',
                items: t.items || [],
                connections: t.connections || [],
				modifiers: t.modifiers || []
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