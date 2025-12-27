/**
 * 接続認証情報の型定義
 */
export type AuthConfig =
  | { type: 'password'; password?: string }
  | { type: 'key'; keyPath: string }

/**
 * 接続情報の型定義
 */
export interface Connection {
  id: string
  name: string
  host: string
  port: number
  username: string
  auth: AuthConfig
  folderPath?: string
  order?: number
  createdAt?: string
  updatedAt?: string
}

/**
 * フォルダ情報の型定義
 */
export interface FolderInfo {
  path: string
  order?: number
  isCollapsed?: boolean
}

/**
 * 接続ストアの状態
 */
export interface ConnectionStoreState {
  connections: Connection[]
  folders: string[]
  folderInfos: FolderInfo[]
}

/**
 * 接続データの正規化オプション
 */
export interface NormalizeOptions {
  removePassword?: boolean
}

// Made with Bob
