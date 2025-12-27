import log from 'electron-log'
import { app } from 'electron'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * ログ管理クラス
 * アプリケーションのログファイル管理を担当
 */
export class Logger {
  private static initialized = false

  /**
   * ログファイルの初期化
   */
  static initialize(): void {
    if (this.initialized) return

    const userData = app.getPath('userData')
    const date = new Date().toISOString().slice(0, 10)
    const logDir = join(userData, 'logs', date)

    if (!existsSync(logDir)) {
      mkdirSync(logDir, { recursive: true })
    }

    log.transports.file.resolvePathFn = () => join(logDir, 'semiterm.log')
    log.transports.file.level = 'debug'
    log.info('Logger initialized', { logDir })

    this.initialized = true
  }

  /**
   * 情報ログ
   */
  static info(message: string, ...args: unknown[]): void {
    log.info(message, ...args)
  }

  /**
   * 警告ログ
   */
  static warn(message: string, ...args: unknown[]): void {
    log.warn(message, ...args)
  }

  /**
   * エラーログ
   */
  static error(message: string, ...args: unknown[]): void {
    log.error(message, ...args)
  }

  /**
   * デバッグログ
   */
  static debug(message: string, ...args: unknown[]): void {
    log.debug(message, ...args)
  }
}

// Made with Bob
