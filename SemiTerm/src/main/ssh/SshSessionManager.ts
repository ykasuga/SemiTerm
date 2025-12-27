import { Client, ConnectConfig } from 'ssh2'
import { webContents } from 'electron'
import { readFileSync } from 'fs'
import type { Connection, SessionRecord, TerminalSize, SshErrorInfo } from '../../shared/types'
import { PathResolver } from '../utils/PathResolver'
import { Logger } from '../utils/Logger'
import {
  SshError,
  FileSystemError,
  ErrorCodes,
  toSshError,
  logError
} from '../../shared/errors'

/**
 * SSHセッション管理クラス
 * SSH接続のライフサイクル管理を担当
 */
export class SshSessionManager {
  private sessions = new Map<string, SessionRecord>()

  /**
   * Rendererプロセスにメッセージを送信
   */
  private sendToRenderer(contentsId: number, channel: string, ...args: unknown[]): void {
    const contents = webContents.fromId(contentsId)
    contents?.send(channel, ...args)
  }

  /**
   * SSHエラーをRendererに送信
   */
  private emitSshError(sessionId: string, contentsId: number, error: unknown): void {
    const sshError = toSshError(error, { sessionId })
    logError(sshError)
    this.sendToRenderer(contentsId, 'ssh:error', sessionId, {
      message: sshError.message,
      code: sshError.code,
      userMessage: sshError.getUserMessage()
    } as SshErrorInfo)
  }

  /**
   * セッションを破棄
   */
  disposeSession(sessionId: string, emitClose = false): void {
    const session = this.sessions.get(sessionId)
    if (!session) return

    if (session.timeout) {
      clearTimeout(session.timeout)
    }

    if (session.stream) {
      try {
        session.stream.removeAllListeners()
        session.stream.close()
      } catch (error) {
        Logger.warn(`[${sessionId}] Failed to close stream`, error)
      }
    }

    session.client.removeAllListeners()
    try {
      session.client.end()
    } catch (error) {
      Logger.warn(`[${sessionId}] Failed to end client`, error)
    }

    this.sessions.delete(sessionId)
    Logger.info(`[${sessionId}] Session disposed`)
    
    if (emitClose) {
      this.sendToRenderer(session.webContentsId, 'ssh:close', sessionId)
    }
  }

  /**
   * SSH接続を確立
   */
  connect(connection: Connection, sessionId: string, senderId: number): void {
    Logger.info(`[${sessionId}] Connecting to ${connection.username}@${connection.host}:${connection.port}`)

    // 既存のセッションを破棄
    this.disposeSession(sessionId)

    // 認証情報の検証
    if (connection.auth.type === 'password' && !connection.auth.password) {
      const error = new SshError('パスワードが入力されていません', ErrorCodes.SSH_AUTH_FAILED)
      this.emitSshError(sessionId, senderId, error)
      return
    }

    if (connection.auth.type === 'key' && !connection.auth.keyPath) {
      const error = new SshError('秘密鍵のパスが設定されていません', ErrorCodes.SSH_KEY_NOT_FOUND)
      this.emitSshError(sessionId, senderId, error)
      return
    }

    const client = new Client()
    const timeout = setTimeout(() => {
      const error = new SshError('接続がタイムアウトしました', ErrorCodes.SSH_TIMEOUT)
      this.emitSshError(sessionId, senderId, error)
      this.disposeSession(sessionId)
    }, 10000)

    this.sessions.set(sessionId, { client, webContentsId: senderId, timeout })

    const sshConfig: ConnectConfig = {
      host: connection.host,
      port: connection.port || 22,
      username: connection.username,
      keepaliveInterval: 15000,
      keepaliveCountMax: 3,
      readyTimeout: 10000
    }

    // 認証設定
    try {
      if (connection.auth.type === 'password' && connection.auth.password) {
        sshConfig.password = connection.auth.password
      } else if (connection.auth.type === 'key' && connection.auth.keyPath) {
        const resolvedPath = PathResolver.resolveKeyPath(connection.auth.keyPath)
        try {
          const keyBuffer = readFileSync(resolvedPath)
          sshConfig.privateKey = keyBuffer
        } catch (readError) {
          const error = new FileSystemError(
            `秘密鍵の読み込みに失敗しました: ${resolvedPath}`,
            ErrorCodes.FS_READ_FAILED,
            { path: resolvedPath, originalError: readError }
          )
          this.emitSshError(sessionId, senderId, error)
          this.disposeSession(sessionId)
          return
        }
      }
    } catch (error) {
      const sshError = new SshError(
        '秘密鍵の設定に失敗しました',
        ErrorCodes.SSH_KEY_INVALID,
        { originalError: error }
      )
      this.emitSshError(sessionId, senderId, sshError)
      this.disposeSession(sessionId)
      return
    }

    // SSH接続イベントハンドラー
    client
      .on('ready', () => {
        const session = this.sessions.get(sessionId)
        if (session?.timeout) {
          clearTimeout(session.timeout)
          session.timeout = undefined
        }
        Logger.info(`[${sessionId}] SSH connection ready`)
        this.sendToRenderer(senderId, 'ssh:connected', sessionId)
        
        client.shell((err, stream) => {
          if (err) {
            const error = new SshError(
              'シェルの起動に失敗しました',
              ErrorCodes.SSH_SHELL_FAILED,
              { originalError: err.message }
            )
            this.emitSshError(sessionId, senderId, error)
            this.disposeSession(sessionId)
            return
          }

          const updatedSession = this.sessions.get(sessionId)
          if (!updatedSession) {
            stream.close()
            return
          }
          updatedSession.stream = stream
          this.sessions.set(sessionId, updatedSession)

          stream.on('data', (data: Buffer | string) => {
            this.sendToRenderer(updatedSession.webContentsId, 'ssh:data', sessionId, data)
            this.sendToRenderer(updatedSession.webContentsId, `ssh:data:${sessionId}`, data)
          })

          stream.stderr?.on('data', (data: Buffer | string) => {
            this.sendToRenderer(updatedSession.webContentsId, 'ssh:data', sessionId, data)
            this.sendToRenderer(updatedSession.webContentsId, `ssh:data:${sessionId}`, data)
          })

          stream.on('close', () => {
            Logger.info(`[${sessionId}] SSH stream closed`)
            this.disposeSession(sessionId, true)
          })
        })
      })
      .on('error', (error) => {
        this.emitSshError(sessionId, senderId, error)
        this.disposeSession(sessionId)
      })
      .on('end', () => {
        Logger.info(`[${sessionId}] SSH connection ended`)
        this.disposeSession(sessionId, true)
      })
      .on('close', () => {
        Logger.info(`[${sessionId}] SSH connection closed`)
        this.disposeSession(sessionId, true)
      })

    try {
      client.connect(sshConfig)
    } catch (error) {
      this.emitSshError(sessionId, senderId, error)
      this.disposeSession(sessionId)
    }
  }

  /**
   * データを書き込み
   */
  write(sessionId: string, data: string): void {
    const session = this.sessions.get(sessionId)
    session?.stream?.write(data)
  }

  /**
   * ターミナルサイズを変更
   */
  resize(sessionId: string, size: TerminalSize): void {
    const session = this.sessions.get(sessionId)
    if (session?.stream) {
      session.stream.setWindow(size.rows, size.cols, size.height ?? 0, size.width ?? 0)
    }
  }

  /**
   * セッションを閉じる
   */
  close(sessionId: string): void {
    this.disposeSession(sessionId, true)
  }

  /**
   * 全セッションを取得
   */
  getAllSessions(): Map<string, SessionRecord> {
    return this.sessions
  }
}

// Made with Bob
