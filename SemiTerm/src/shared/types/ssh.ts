import type { ClientChannel } from 'ssh2'

/**
 * SSHセッションレコード
 */
export interface SessionRecord {
  client: any // ssh2.Client
  stream?: ClientChannel
  webContentsId: number
  timeout?: NodeJS.Timeout
}

/**
 * SSHエラー情報
 */
export interface SshErrorInfo {
  message: string
  code: string
  userMessage: string
}

/**
 * ターミナルサイズ
 */
export interface TerminalSize {
  cols: number
  rows: number
  height?: number
  width?: number
}

/**
 * SSH接続設定
 */
export interface SshConnectionConfig {
  host: string
  port: number
  username: string
  password?: string
  privateKey?: Buffer
  keepaliveInterval?: number
  keepaliveCountMax?: number
  readyTimeout?: number
}

// Made with Bob
