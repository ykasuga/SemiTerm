import { ipcMain } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import type { Connection } from '../../shared/types'
import { SshSessionManager } from '../ssh/SshSessionManager'

/**
 * SSH関連のIPCハンドラーを登録
 */
export function registerSshHandlers(sshManager: SshSessionManager): void {
  // SSH接続
  ipcMain.on('ssh:connect', (event, connection: Connection, sessionId?: string) => {
    const resolvedSessionId = sessionId || connection.id || uuidv4()
    const senderId = event.sender.id
    sshManager.connect(connection, resolvedSessionId, senderId)
  })

  // データ書き込み
  ipcMain.on('ssh:write', (_event, arg1: string | { id: string; data: string }, arg2?: string) => {
    const sessionId = typeof arg1 === 'string' ? arg1 : arg1.id
    const data = typeof arg1 === 'string' ? arg2 : arg1.data
    if (!sessionId || data === undefined) return
    sshManager.write(sessionId, data)
  })

  // ターミナルサイズ変更
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
      sshManager.resize(sessionId, size)
    }
  )

  // SSH接続を閉じる
  ipcMain.on('ssh:close', (_event, sessionId: string) => {
    sshManager.close(sessionId)
  })
}

// Made with Bob
