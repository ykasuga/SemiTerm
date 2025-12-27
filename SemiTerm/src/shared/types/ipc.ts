import type { Connection } from './connection'

/**
 * IPC応答の基本型
 */
export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: {
    message: string
    code: string
    userMessage?: string
  }
}

/**
 * データベース操作のペイロード型
 */
export interface MoveConnectionPayload {
  id: string
  folderPath: string | null
}

export interface MoveFolderPayload {
  sourcePath: string
  targetFolderPath: string | null
}

export interface ReorderConnectionsPayload {
  connectionIds: string[]
  folderPath?: string
}

export interface ReorderFoldersPayload {
  folderPaths: string[]
  parentFolderPath?: string
}

/**
 * SSH操作のペイロード型
 */
export interface SshConnectPayload {
  connection: Connection
  sessionId?: string
}

export interface SshWritePayload {
  id: string
  data: string
}

export interface SshResizePayload {
  id: string
  size: {
    cols: number
    rows: number
    height?: number
    width?: number
  }
}

/**
 * IPC通信チャンネル名
 */
export const IPC_CHANNELS = {
  // Database
  DB_GET_CONNECTIONS: 'db:get-connections',
  DB_SAVE_CONNECTION: 'db:save-connection',
  DB_DELETE_CONNECTION: 'db:delete-connection',
  DB_CREATE_FOLDER: 'db:create-folder',
  DB_MOVE_CONNECTION: 'db:move-connection',
  DB_MOVE_FOLDER: 'db:move-folder',
  DB_REORDER_CONNECTIONS: 'db:reorder-connections',
  DB_REORDER_FOLDERS: 'db:reorder-folders',
  
  // Dialog
  DIALOG_OPEN_KEY_FILE: 'dialog:open-key-file',
  
  // SSH
  SSH_CONNECT: 'ssh:connect',
  SSH_WRITE: 'ssh:write',
  SSH_RESIZE: 'ssh:resize',
  SSH_CLOSE: 'ssh:close',
  SSH_CONNECTED: 'ssh:connected',
  SSH_DATA: 'ssh:data',
  SSH_ERROR: 'ssh:error',
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]

// Made with Bob
