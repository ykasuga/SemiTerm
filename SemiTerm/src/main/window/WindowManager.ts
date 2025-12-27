import { BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../resources/icon.png?asset'

/**
 * ウィンドウ管理クラス
 * アプリケーションのメインウィンドウの作成と管理を担当
 */
export class WindowManager {
  private mainWindow: BrowserWindow | null = null

  /**
   * メインウィンドウを作成
   */
  createMainWindow(): BrowserWindow {
    this.mainWindow = new BrowserWindow({
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

    this.setupWindowHandlers()
    this.loadContent()

    return this.mainWindow
  }

  /**
   * メインウィンドウを取得
   */
  getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  /**
   * ウィンドウイベントハンドラーの設定
   */
  private setupWindowHandlers(): void {
    if (!this.mainWindow) return

    this.mainWindow.on('ready-to-show', () => {
      this.mainWindow?.show()
    })

    this.mainWindow.webContents.setWindowOpenHandler((details) => {
      shell.openExternal(details.url)
      return { action: 'deny' }
    })
  }

  /**
   * コンテンツの読み込み
   */
  private loadContent(): void {
    if (!this.mainWindow) return

    // HMR for renderer base on electron-vite cli.
    // Load the remote URL for development or the local html file for production.
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
      this.mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
      this.mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }
  }
}

// Made with Bob
