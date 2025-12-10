import { app, shell, BrowserWindow, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import { Connection } from '../renderer/src/globals'
import { v4 as uuidv4 } from 'uuid'


// Create the browser window.
function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron.semiterm')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // --- IPC Handlers ---

  // Initialize electron-store
  const store = new Store<{ connections: Connection[] }>({
    defaults: {
      connections: []
    },
    // As per design doc, save to standard user data folder
    // electron-store handles this by default.
    // The path will be app.getPath('userData') + '/config.json'
    name: 'connections',
    fileExtension: 'json'
  });

  // DB Handlers
  ipcMain.handle('db:get-connections', () => {
    return store.get('connections', []);
  });

  ipcMain.handle('db:save-connection', (_event, connection: Connection) => {
    const connections = store.get('connections', []);
    const now = new Date().toISOString();
    if (connection.id) {
      // Update existing
      const index = connections.findIndex(c => c.id === connection.id);
      if (index !== -1) {
        connections[index] = { ...connections[index], ...connection, updatedAt: now };
      }
    } else {
      // Create new
      const newConnection = { ...connection, id: uuidv4(), createdAt: now, updatedAt: now };
      connections.push(newConnection);
    }
    store.set('connections', connections);
    return connections;
  });

  ipcMain.handle('db:delete-connection', (_event, id: string) => {
    let connections = store.get('connections', []);
    connections = connections.filter(c => c.id !== id);
    store.set('connections', connections);
    return connections;
  });

  // SSH Handlers (Placeholders)
  ipcMain.on('ssh:connect', (_event, connection: Connection) => {
    console.log('SSH Connect:', connection.title);
    // SSH connection logic will go here
  });

  ipcMain.on('ssh:write', (_event, id: string, data: string) => {
    console.log(`SSH Write to ${id}:`, data);
    // SSH write logic will go here
  });

  ipcMain.on('ssh:resize', (_event, id: string, size: { cols: number, rows: number }) => {
    console.log(`SSH Resize for ${id}:`, size);
    // SSH resize logic will go here
  });

  ipcMain.on('ssh:close', (_event, id: string) => {
    console.log(`SSH Close:`, id);
    // SSH close logic will go here
  });


  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.