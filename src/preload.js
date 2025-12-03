const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  moveWindow: (deltaX, deltaY) => ipcRenderer.send('move-window', { deltaX, deltaY }),
  quitApp: () => ipcRenderer.send('quit-app'),
  getScreenBounds: () => ipcRenderer.invoke('get-screen-bounds'),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (x, y) => ipcRenderer.send('set-window-position', { x, y })
});
