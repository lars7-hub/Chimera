const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getCharacters: () => ipcRenderer.invoke('get-characters'),
        getCharacter: (characterName) => ipcRenderer.invoke('get-character', characterName),
    createCharacter: (characterName, characterData, imagePath) => ipcRenderer.invoke('create-character', characterName, characterData, imagePath),
    updateCharacter: (originalName, characterData, imagePath) => ipcRenderer.invoke('update-character', originalName, characterData, imagePath),
    deleteCharacter: (characterName) => ipcRenderer.invoke('delete-character', characterName),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
	getLoadouts: (characterName) => ipcRenderer.invoke('get-loadouts', characterName),
	getLoadout: (characterName, loadoutName) => ipcRenderer.invoke('get-loadout', characterName, loadoutName),
	createLoadout: (characterName, loadoutName) => ipcRenderer.invoke('create-loadout', characterName, loadoutName),
	updateLoadout: (characterName, originalName, loadoutData, imagePath) => ipcRenderer.invoke('update-loadout', characterName, originalName, loadoutData, imagePath)
});