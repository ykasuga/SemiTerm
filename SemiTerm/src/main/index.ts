import { app, shell, BrowserWindow, ipcMain, webContents, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import Store from 'electron-store'
import type { Connection, ConnectionStoreState } from '../renderer/src/types'
import { v4 as uuidv4 } from 'uuid'
import log from 'electron-log'
import { Client, ClientChannel, ConnectConfig } from 'ssh2'
import { existsSync, mkdirSync, readFileSync } from 'fs'
import { homedir } from 'os'


type SessionRecord = {
  client: Client
  stream?: ClientChannel
  webContentsId: number
  timeout?: NodeJS.Timeout
}

const sessions = new Map<string, SessionRecord>()

function resolveKeyPath(keyPath: string): string {
  if (keyPath.startsWith('~')) {
    const suffix = keyPath.slice(1).replace(/^[/\\]/, '')
    if (!suffix) {
      return homedir()
    }
    return join(homedir(), suffix)
  }
  return keyPath
}

function ensureLogFile(): void {
  const userData = app.getPath('userData')
  const date = new Date().toISOString().slice(0, 10)
  const logDir = join(userData, 'logs', date)
  if (!existsSync(logDir)) {
    mkdirSync(logDir, { recursive: true })
  }
  log.transports.file.resolvePathFn = () => join(logDir, 'semiterm.log')
  log.transports.file.level = 'debug'
  log.info('Logger initialized', { logDir })
}

function sendToRenderer(contentsId: number, channel: string, ...args: unknown[]): void {
  const contents = webContents.fromId(contentsId)
  contents?.send(channel, ...args)
}

function emitSshError(sessionId: string, contentsId: number, message: string): void {
  log.error(`[${sessionId}] SSH error: ${message}`)
  sendToRenderer(contentsId, 'ssh:error', sessionId, { message })
}

function disposeSession(sessionId: string, emitClose = false): void {
  const session = sessions.get(sessionId)
  if (!session) return

  if (session.timeout) {
    clearTimeout(session.timeout)
  }

  if (session.stream) {
    try {
      session.stream.removeAllListeners()
      session.stream.close()
    } catch (error) {
      log.warn(`[${sessionId}] Failed to close stream`, error)
    }
  }

  session.client.removeAllListeners()
  try {
    session.client.end()
  } catch (error) {
    log.warn(`[${sessionId}] Failed to end client`, error)
  }

  sessions.delete(sessionId)
  log.info(`[${sessionId}] Session disposed`)
  if (emitClose) {
    sendToRenderer(session.webContentsId, 'ssh:close', sessionId)
  }
}

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

  ensureLogFile()

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  createWindow()

  // --- IPC Handlers ---

  // Initialize electron-store
  const store = new Store<{ connections: Connection[], folders: string[] }>({
    defaults: {
      connections: [],
      folders: []
    },
    // As per design doc, save to standard user data folder
    // electron-store handles this by default.
    // The path will be app.getPath('userData') + '/config.json'
    name: 'connections',
    fileExtension: 'json'
  });

  // DB Handlers
  const normalizeFolderPath = (folderPath?: string): string | undefined => {
    if (!folderPath) return undefined
    const normalized = folderPath
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join('/')
    return normalized || undefined
  }

  const sanitizeConnection = (connection: Connection): Connection => {
    const sanitizedAuth =
      connection.auth.type === 'password'
        ? { type: 'password' as const }
        : { type: 'key' as const, keyPath: connection.auth.keyPath }
    return {
      ...connection,
      folderPath: normalizeFolderPath(connection.folderPath),
      auth: sanitizedAuth
    }
  }

  const sanitizeFolderList = (folders: string[]): string[] => {
    const normalizedSet = new Set<string>()
    folders.forEach((folderPath) => {
      const normalized = normalizeFolderPath(folderPath)
      if (!normalized) {
        return
      }
      const segments = normalized.split('/')
      let current = ''
      segments.forEach((segment) => {
        current = current ? `${current}/${segment}` : segment
        normalizedSet.add(current)
      })
    })
    return Array.from(normalizedSet).sort((a, b) => a.localeCompare(b, 'ja'))
  }

  const addFolderPath = (folderPath?: string): void => {
    const normalized = normalizeFolderPath(folderPath)
    if (!normalized) return
    const existingFolders = store.get('folders', [])
    const updatedFolders = sanitizeFolderList([...existingFolders, normalized])
    store.set('folders', updatedFolders)
  }

  const buildStoreState = (): ConnectionStoreState => {
    const connections = store.get('connections', [])
    const sanitizedConnections = connections.map((conn) => sanitizeConnection(conn))
    const sanitizedFolders = sanitizeFolderList(store.get('folders', []))
    store.set('connections', sanitizedConnections)
    store.set('folders', sanitizedFolders)
    return {
      connections: sanitizedConnections,
      folders: sanitizedFolders
    }
  }

  const replaceFolderPath = (value: string, sourcePath: string, destinationPath: string): string => {
    if (value === sourcePath) return destinationPath
    const prefix = `${sourcePath}/`
    if (value.startsWith(prefix)) {
      const suffix = value.slice(prefix.length)
      return `${destinationPath}/${suffix}`
    }
    return value
  }

  ipcMain.handle('db:get-connections', () => {
    return buildStoreState()
  });

  ipcMain.handle('db:save-connection', (_event, connection: Connection) => {
    const connections = store.get('connections', [])
    const now = new Date().toISOString()
    const sanitizedIncoming = sanitizeConnection(connection)
    if (connection.id) {
      // Update existing
      const index = connections.findIndex(c => c.id === connection.id)
      if (index !== -1) {
        connections[index] = { ...connections[index], ...sanitizedIncoming, updatedAt: now }
      }
    } else {
      // Create new
      const newConnection = { ...sanitizedIncoming, id: uuidv4(), createdAt: now, updatedAt: now }
      connections.push(newConnection)
    }
    store.set('connections', connections)
    addFolderPath(sanitizedIncoming.folderPath)
    return buildStoreState()
  });

  ipcMain.handle('db:delete-connection', (_event, id: string) => {
    let connections = store.get('connections', [])
    connections = connections.filter(c => c.id !== id)
    store.set('connections', connections)
    return buildStoreState()
  });

  ipcMain.handle('db:create-folder', (_event, folderPath: string) => {
    addFolderPath(folderPath)
    return buildStoreState()
  });

  ipcMain.handle('db:move-connection', (_event, payload: { id: string, folderPath: string | null }) => {
    const { id, folderPath } = payload
    const connections = store.get('connections', [])
    const index = connections.findIndex((conn) => conn.id === id)
    if (index === -1) {
      return buildStoreState()
    }
    const normalizedFolder = normalizeFolderPath(folderPath || undefined)
    const now = new Date().toISOString()
    connections[index] = {
      ...connections[index],
      folderPath: normalizedFolder,
      updatedAt: now
    }
    store.set('connections', connections)
    if (normalizedFolder) {
      addFolderPath(normalizedFolder)
    }
    return buildStoreState()
  });

  ipcMain.handle('db:move-folder', (_event, payload: { sourcePath: string, targetFolderPath: string | null }) => {
    const { sourcePath, targetFolderPath } = payload
    const normalizedSource = normalizeFolderPath(sourcePath)
    if (!normalizedSource) {
      return buildStoreState()
    }
    const normalizedTargetParent = normalizeFolderPath(targetFolderPath || undefined)
    if (normalizedTargetParent && (normalizedTargetParent === normalizedSource || normalizedTargetParent.startsWith(`${normalizedSource}/`))) {
      return buildStoreState()
    }
    const folderName = normalizedSource.split('/').pop() || normalizedSource
    const destinationPath = normalizedTargetParent ? `${normalizedTargetParent}/${folderName}` : folderName
    const normalizedDestination = normalizeFolderPath(destinationPath)
    if (!normalizedDestination || normalizedDestination === normalizedSource) {
      return buildStoreState()
    }

    const connections = store.get('connections', []).map((conn) => {
      if (!conn.folderPath) return conn
      if (conn.folderPath === normalizedSource || conn.folderPath.startsWith(`${normalizedSource}/`)) {
        const newPath = replaceFolderPath(conn.folderPath, normalizedSource, normalizedDestination)
        return { ...conn, folderPath: newPath }
      }
      return conn
    })
    store.set('connections', connections)

    const folders = store.get('folders', [])
    const updatedFolders = folders
      .map((folderEntry) => {
        const normalizedEntry = normalizeFolderPath(folderEntry)
        if (!normalizedEntry) return null
        if (normalizedEntry === normalizedSource || normalizedEntry.startsWith(`${normalizedSource}/`)) {
          return replaceFolderPath(normalizedEntry, normalizedSource, normalizedDestination)
        }
        return normalizedEntry
      })
      .filter((value): value is string => Boolean(value))

    store.set('folders', updatedFolders)
    addFolderPath(normalizedDestination)
    return buildStoreState()
  });

  ipcMain.handle('dialog:open-key-file', async () => {
    const result = await dialog.showOpenDialog({
      title: '秘密鍵を選択',
      defaultPath: join(homedir(), '.ssh'),
      properties: ['openFile'],
      filters: [
        {
          name: 'SSH Private Keys',
          extensions: ['pem', 'ppk', 'key', 'rsa', '']
        },
        {
          name: 'All Files',
          extensions: ['*']
        }
      ]
    })
    if (result.canceled || result.filePaths.length === 0) {
      return null
    }
    return result.filePaths[0]
  });

  // SSH Handlers
  ipcMain.on('ssh:connect', (event, connection: Connection, sessionId?: string) => {
    const resolvedSessionId = sessionId || connection.id || uuidv4()
    const senderId = event.sender.id
    log.info(`[${resolvedSessionId}] Connecting to ${connection.username}@${connection.host}:${connection.port}`)

    disposeSession(resolvedSessionId)

    if (connection.auth.type === 'password' && !connection.auth.password) {
      emitSshError(resolvedSessionId, senderId, 'パスワードが入力されていません')
      return
    }

    if (connection.auth.type === 'key' && !connection.auth.keyPath) {
      emitSshError(resolvedSessionId, senderId, '秘密鍵のパスが設定されていません')
      return
    }

    const client = new Client()
    const timeout = setTimeout(() => {
      emitSshError(resolvedSessionId, senderId, '接続がタイムアウトしました')
      disposeSession(resolvedSessionId)
    }, 10000)

    sessions.set(resolvedSessionId, { client, webContentsId: senderId, timeout })

    const sshConfig: ConnectConfig = {
      host: connection.host,
      port: connection.port || 22,
      username: connection.username,
      keepaliveInterval: 15000,
      keepaliveCountMax: 3,
      readyTimeout: 10000
    }

    try {
      if (connection.auth.type === 'password' && connection.auth.password) {
        sshConfig.password = connection.auth.password
      } else if (connection.auth.type === 'key' && connection.auth.keyPath) {
        const resolvedPath = resolveKeyPath(connection.auth.keyPath)
        const keyBuffer = readFileSync(resolvedPath)
        sshConfig.privateKey = keyBuffer
      }
    } catch (error) {
      emitSshError(resolvedSessionId, senderId, '秘密鍵の読み込みに失敗しました')
      disposeSession(resolvedSessionId)
      return
    }

    client
      .on('ready', () => {
        const session = sessions.get(resolvedSessionId)
        if (session?.timeout) {
          clearTimeout(session.timeout)
          session.timeout = undefined
        }
        log.info(`[${resolvedSessionId}] SSH connection ready`)
        sendToRenderer(senderId, 'ssh:connected', resolvedSessionId)
        client.shell((err, stream) => {
          if (err) {
            emitSshError(resolvedSessionId, senderId, err.message)
            disposeSession(resolvedSessionId)
            return
          }

          const updatedSession = sessions.get(resolvedSessionId)
          if (!updatedSession) {
            stream.close()
            return
          }
          updatedSession.stream = stream
          sessions.set(resolvedSessionId, updatedSession)

          stream.on('data', (data: Buffer | string) => {
            sendToRenderer(updatedSession.webContentsId, 'ssh:data', resolvedSessionId, data)
            sendToRenderer(updatedSession.webContentsId, `ssh:data:${resolvedSessionId}`, data)
          })

          stream.stderr?.on('data', (data: Buffer | string) => {
            sendToRenderer(updatedSession.webContentsId, 'ssh:data', resolvedSessionId, data)
            sendToRenderer(updatedSession.webContentsId, `ssh:data:${resolvedSessionId}`, data)
          })

          stream.on('close', () => {
            log.info(`[${resolvedSessionId}] SSH stream closed`)
            disposeSession(resolvedSessionId, true)
          })
        })
      })
      .on('error', (error) => {
        emitSshError(resolvedSessionId, senderId, error.message)
        disposeSession(resolvedSessionId)
      })
      .on('end', () => {
        log.info(`[${resolvedSessionId}] SSH connection ended`)
        disposeSession(resolvedSessionId, true)
      })
      .on('close', () => {
        log.info(`[${resolvedSessionId}] SSH connection closed`)
        disposeSession(resolvedSessionId, true)
      })

    try {
      client.connect(sshConfig)
    } catch (error) {
      emitSshError(resolvedSessionId, senderId, 'SSH接続に失敗しました')
      disposeSession(resolvedSessionId)
    }
  })

  ipcMain.on('ssh:write', (_event, arg1: string | { id: string; data: string }, arg2?: string) => {
    const sessionId = typeof arg1 === 'string' ? arg1 : arg1.id
    const data = typeof arg1 === 'string' ? arg2 : arg1.data
    if (!sessionId || data === undefined) return
    const session = sessions.get(sessionId)
    session?.stream?.write(data)
  })

  ipcMain.on(
    'ssh:resize',
    (
      _event,
      arg1: string | { id: string; size: { cols: number; rows: number; height?: number; width?: number } },
      arg2?: { cols: number; rows: number; height?: number; width?: number }
    ) => {
      const sessionId = typeof arg1 === 'string' ? arg1 : arg1.id
      const size = typeof arg1 === 'string' ? arg2 : arg1.size
      if (!sessionId || !size) return
      const session = sessions.get(sessionId)
      if (session?.stream) {
        session.stream.setWindow(size.rows, size.cols, size.height ?? 0, size.width ?? 0)
      }
    }
  )

  ipcMain.on('ssh:close', (_event, sessionId: string) => {
    disposeSession(sessionId, true)
  })


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
