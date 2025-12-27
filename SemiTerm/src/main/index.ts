import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { WindowManager } from './window/WindowManager'
import { ConnectionStore } from './database/ConnectionStore'
import { FolderStore } from './database/FolderStore'
import { SshSessionManager } from './ssh/SshSessionManager'
import { Logger } from './utils/Logger'
import { registerDatabaseHandlers } from './ipc/DatabaseHandlers'
import { registerSshHandlers } from './ipc/SshHandlers'

/**
 * アプリケーションのメインエントリーポイント
 */

// グローバルインスタンス
const windowManager = new WindowManager()
const connectionStore = new ConnectionStore()
const folderStore = new FolderStore(connectionStore.getStore())
const sshSessionManager = new SshSessionManager()

/**
 * Electronアプリケーションの初期化
 */
app.whenReady().then(() => {
  // アプリケーションIDの設定
  electronApp.setAppUserModelId('com.electron.semiterm')

  // ロガーの初期化
  Logger.initialize()

  // 開発ツールのショートカット設定
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // メインウィンドウの作成
  windowManager.createMainWindow()

  // IPCハンドラーの登録
  registerDatabaseHandlers(connectionStore, folderStore)
  registerSshHandlers(sshSessionManager)

  // macOS: Dockアイコンクリック時の処理
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      windowManager.createMainWindow()
    }
  })
})

/**
 * 全ウィンドウが閉じられた時の処理
 * macOS以外ではアプリケーションを終了
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Made with Bob
