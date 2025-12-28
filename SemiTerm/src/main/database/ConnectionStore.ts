import Store from 'electron-store'
import { v4 as uuidv4 } from 'uuid'
import type { Connection, ConnectionStoreState, FolderInfo } from '../../shared/types'
import { PathResolver } from '../utils/PathResolver'
import { DatabaseError, ErrorCodes } from '../../shared/errors'

/**
 * 接続データストアクラス
 * 接続情報のCRUD操作を担当
 */
export class ConnectionStore {
  private store: Store<{
    connections: Connection[]
    folders: string[]
    folderInfos: FolderInfo[]
  }>

  constructor() {
    this.store = new Store({
      defaults: {
        connections: [] as Connection[],
        folders: [] as string[],
        folderInfos: [] as FolderInfo[]
      },
      name: 'connections',
      fileExtension: 'json'
    })
  }

  /**
   * Storeインスタンスを取得（FolderStoreとの共有用）
   */
  getStore(): Store<{
    connections: Connection[]
    folders: string[]
    folderInfos: FolderInfo[]
  }> {
    return this.store
  }

  /**
   * 接続データを正規化
   */
  private sanitizeConnection(connection: Connection | any): Connection {
    const sanitizedAuth =
      connection.auth.type === 'password'
        ? { type: 'password' as const }
        : { type: 'key' as const, keyPath: connection.auth.keyPath }

    // 旧データの移行: titleプロパティがある場合はnameに変換
    let name = connection.name
    if (!name && 'title' in connection) {
      name = connection.title
    }

    return {
      id: connection.id,
      name: name || 'Unnamed Connection',
      host: connection.host,
      port: connection.port,
      username: connection.username,
      folderPath: PathResolver.normalizeFolderPath(connection.folderPath),
      auth: sanitizedAuth,
      order: connection.order,
      createdAt: connection.createdAt,
      updatedAt: connection.updatedAt
    }
  }

  /**
   * フォルダリストを正規化
   */
  private sanitizeFolderList(folders: string[]): string[] {
    const normalizedSet = new Set<string>()
    
    folders.forEach((folderPath) => {
      const normalized = PathResolver.normalizeFolderPath(folderPath)
      if (!normalized) return

      const segments = normalized.split('/')
      let current = ''
      segments.forEach((segment) => {
        current = current ? `${current}/${segment}` : segment
        normalizedSet.add(current)
      })
    })

    return Array.from(normalizedSet).sort((a, b) => a.localeCompare(b, 'ja'))
  }

  /**
   * フォルダパスを追加
   */
  private addFolderPath(folderPath?: string): void {
    const normalized = PathResolver.normalizeFolderPath(folderPath)
    if (!normalized) return

    const existingFolders = this.store.get('folders', [])
    const updatedFolders = this.sanitizeFolderList([...existingFolders, normalized])
    this.store.set('folders', updatedFolders)

    // folderInfosも更新
    const existingInfos = this.store.get('folderInfos', [])
    const infoExists = existingInfos.some((info) => info.path === normalized)
    if (!infoExists) {
      const newInfos = [...existingInfos, { path: normalized }]
      this.store.set('folderInfos', newInfos)
    }
  }

  /**
   * ストアの状態を構築
   */
  buildStoreState(): ConnectionStoreState {
    const connections = this.store.get('connections', [])
    const sanitizedConnections = connections.map((conn) => this.sanitizeConnection(conn))
    const sanitizedFolders = this.sanitizeFolderList(this.store.get('folders', []))
    const folderInfos = this.store.get('folderInfos', [])

    // folderInfosを正規化（存在しないフォルダを削除）
    const validInfos = folderInfos.filter((info) => sanitizedFolders.includes(info.path))

    // 新しいフォルダにはinfoを追加
    const infoMap = new Map(validInfos.map((info) => [info.path, info]))
    const updatedInfos = sanitizedFolders.map((path) => infoMap.get(path) || { path })

    // マイグレーション後のデータを永続化
    this.store.set('connections', sanitizedConnections)
    this.store.set('folders', sanitizedFolders)
    this.store.set('folderInfos', updatedInfos)

    return {
      connections: sanitizedConnections,
      folders: sanitizedFolders,
      folderInfos: updatedInfos
    }
  }

  /**
   * 全接続を取得
   */
  getConnections(): ConnectionStoreState {
    try {
      return this.buildStoreState()
    } catch (error) {
      throw new DatabaseError('データの読み込みに失敗しました', ErrorCodes.DB_READ_FAILED, {
        originalError: error
      })
    }
  }

  /**
   * 接続を保存
   */
  saveConnection(connection: Connection): ConnectionStoreState {
    try {
      const connections = this.store.get('connections', [])
      const now = new Date().toISOString()
      const sanitizedIncoming = this.sanitizeConnection(connection)

      if (connection.id) {
        // 既存の接続を更新
        const index = connections.findIndex((c) => c.id === connection.id)
        if (index !== -1) {
          connections[index] = { ...connections[index], ...sanitizedIncoming, updatedAt: now }
        }
      } else {
        // 新規接続を作成
        const newConnection = {
          ...sanitizedIncoming,
          id: uuidv4(),
          createdAt: now,
          updatedAt: now
        }
        connections.push(newConnection)
      }

      this.store.set('connections', connections)
      this.addFolderPath(sanitizedIncoming.folderPath)
      return this.buildStoreState()
    } catch (error) {
      throw new DatabaseError('接続の保存に失敗しました', ErrorCodes.DB_WRITE_FAILED, {
        connectionId: connection.id,
        originalError: error
      })
    }
  }

  /**
   * 接続を削除
   */
  deleteConnection(id: string): ConnectionStoreState {
    try {
      let connections = this.store.get('connections', [])
      const connectionExists = connections.some((c) => c.id === id)

      if (!connectionExists) {
        throw new DatabaseError('削除する接続が見つかりません', ErrorCodes.DB_NOT_FOUND, {
          connectionId: id
        })
      }

      connections = connections.filter((c) => c.id !== id)
      this.store.set('connections', connections)
      return this.buildStoreState()
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('接続の削除に失敗しました', ErrorCodes.DB_DELETE_FAILED, {
        connectionId: id,
        originalError: error
      })
    }
  }

  /**
   * 接続を移動
   */
  moveConnection(id: string, folderPath: string | null): ConnectionStoreState {
    try {
      const connections = this.store.get('connections', [])
      const index = connections.findIndex((conn) => conn.id === id)

      if (index === -1) {
        throw new DatabaseError('移動する接続が見つかりません', ErrorCodes.DB_NOT_FOUND, {
          connectionId: id
        })
      }

      const normalizedFolder = PathResolver.normalizeFolderPath(folderPath || undefined)
      const now = new Date().toISOString()
      connections[index] = {
        ...connections[index],
        folderPath: normalizedFolder,
        updatedAt: now
      }

      this.store.set('connections', connections)
      if (normalizedFolder) {
        this.addFolderPath(normalizedFolder)
      }
      return this.buildStoreState()
    } catch (error) {
      if (error instanceof DatabaseError) {
        throw error
      }
      throw new DatabaseError('接続の移動に失敗しました', ErrorCodes.DB_WRITE_FAILED, {
        connectionId: id,
        originalError: error
      })
    }
  }

  /**
   * 接続の順序を変更
   */
  reorderConnections(connectionIds: string[], folderPath?: string): ConnectionStoreState {
    try {
      const connections = this.store.get('connections', [])
      const now = new Date().toISOString()
      const normalizedFolder = PathResolver.normalizeFolderPath(folderPath)

      // 新しい順序を設定
      const orderMap = new Map<string, number>()
      connectionIds.forEach((id, index) => {
        orderMap.set(id, index)
      })

      // 接続を更新（指定されたフォルダ内の接続のみ）
      const updatedConnections = connections.map((conn) => {
        const connNormalizedFolder = PathResolver.normalizeFolderPath(conn.folderPath)
        
        // 同じフォルダ内の接続のみ更新
        if (connNormalizedFolder === normalizedFolder && orderMap.has(conn.id)) {
          return {
            ...conn,
            order: orderMap.get(conn.id),
            updatedAt: now
          }
        }
        return conn
      })

      this.store.set('connections', updatedConnections)
      return this.buildStoreState()
    } catch (error) {
      throw new DatabaseError('接続の並び替えに失敗しました', ErrorCodes.DB_WRITE_FAILED, {
        folderPath,
        originalError: error
      })
    }
  }

  /**
   * フォルダパス内の接続を更新
   */
  updateConnectionsInFolder(
    sourcePath: string,
    destinationPath: string
  ): void {
    const connections = this.store.get('connections', []).map((conn) => {
      if (!conn.folderPath) return conn
      if (
        conn.folderPath === sourcePath ||
        conn.folderPath.startsWith(`${sourcePath}/`)
      ) {
        const newPath = PathResolver.replaceFolderPath(
          conn.folderPath,
          sourcePath,
          destinationPath
        )
        return { ...conn, folderPath: newPath }
      }
      return conn
    })
    this.store.set('connections', connections)
  }
}

// Made with Bob
