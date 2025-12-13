import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import type { Connection } from '../renderer/src/types'

// Custom APIs for renderer
const api = {
  // From Main to Renderer
  onSshData: (callback: (id: string, data: Uint8Array) => void) => 
    ipcRenderer.on('ssh:data', (_event: IpcRendererEvent, id: string, data: Uint8Array) => callback(id, data)),
  onSshError: (callback: (id: string, error: Error) => void) =>
    ipcRenderer.on('ssh:error', (_event: IpcRendererEvent, id: string, error: Error) => callback(id, error)),
  onSshClose: (callback: (id: string) => void) =>
    ipcRenderer.on('ssh:close', (_event: IpcRendererEvent, id: string) => callback(id)),

  // From Renderer to Main
  getConnections: (): Promise<Connection[]> => ipcRenderer.invoke('db:get-connections'),
  saveConnection: (connection: Connection): Promise<Connection[]> => ipcRenderer.invoke('db:save-connection', connection),
  deleteConnection: (id: string): Promise<Connection[]> => ipcRenderer.invoke('db:delete-connection', id),
  
  // SSH Operations
  sshConnect: (connection: Connection, sessionId: string) => ipcRenderer.send('ssh:connect', connection, sessionId),
  sshWrite: (id: string, data: string) => ipcRenderer.send('ssh:write', id, data),
  sshResize: (id: string, cols: number, rows: number, height: number, width: number) => ipcRenderer.send('ssh:resize', id, { cols, rows, height, width }),
  sshClose: (id: string) => ipcRenderer.send('ssh:close', id),
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
