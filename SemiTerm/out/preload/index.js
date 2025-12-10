"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  // From Main to Renderer
  onSshData: (callback) => electron.ipcRenderer.on("ssh:data", (_event, id, data) => callback(id, data)),
  onSshError: (callback) => electron.ipcRenderer.on("ssh:error", (_event, id, error) => callback(id, error)),
  onSshClose: (callback) => electron.ipcRenderer.on("ssh:close", (_event, id) => callback(id)),
  // From Renderer to Main
  getConnections: () => electron.ipcRenderer.invoke("db:get-connections"),
  saveConnection: (connection) => electron.ipcRenderer.invoke("db:save-connection", connection),
  deleteConnection: (id) => electron.ipcRenderer.invoke("db:delete-connection", id),
  // SSH Operations
  sshConnect: (connection) => electron.ipcRenderer.send("ssh:connect", connection),
  sshWrite: (id, data) => electron.ipcRenderer.send("ssh:write", id, data),
  sshResize: (id, cols, rows, height, width) => electron.ipcRenderer.send("ssh:resize", id, { cols, rows, height, width }),
  sshClose: (id) => electron.ipcRenderer.send("ssh:close", id)
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
