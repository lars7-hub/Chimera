const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    getCharacters: () => ipcRenderer.invoke('get-characters'),
    createCharacter: (characterName, characterData, imagePath) => ipcRenderer.invoke('create-character', characterName, characterData, imagePath),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog')
});
