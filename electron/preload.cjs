const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('realmsSession', {
  read: () => ipcRenderer.invoke('realms:session:read'),
  write: (value) => ipcRenderer.invoke('realms:session:write', value),
  clear: () => ipcRenderer.invoke('realms:session:clear'),
});
