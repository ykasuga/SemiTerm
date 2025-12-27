import Store from 'electron-store'
import type { Connection, FolderInfo } from '../../shared/types'
import { PathResolver } from '../utils/PathResolver'
import { DatabaseError, ErrorCodes } from '../../shared/errors'

/**
 * フォルダデータストアクラス
 * フォルダ情報の管理を担当
 */
export class FolderStore {
  private store: Store<{
    connections: Connection[]
    folders: string[]
    folderInfos: FolderInfo[]
  }>

  constructor(
    store: Store<{
      connections: Connection[]
      folders: string[]
      folderInfos: FolderInfo[]
    }>
  ) {
    this.store = store
  }

  /**
   * フォルダを作成
   */
  createFolder(folderPath: string): void {
    if (!folderPath || !folderPath.trim()) {
      throw new DatabaseError('フォルダパスが無効です', ErrorCodes.DB_VALIDATION_FAILED, {
        folderPath
      })
    }

    const normalized = PathResolver.normalizeFolderPath(folderPath)
    if (!normalized) {
      throw new DatabaseError('フォルダパスが無効です', ErrorCodes.DB_VALIDATION_FAILED, {
        folderPath
      })
    }

    const existingFolders = this.store.get('folders', [])
    const existingInfos = this.store.get('folderInfos', [])

    // フォルダパスを追加
    if (!existingFolders.includes(normalized)) {
      this.store.set('folders', [...existingFolders, normalized])
    }

    // フォルダ情報を追加
    const infoExists = existingInfos.some((info) => info.path === normalized)
    if (!infoExists) {
      this.store.set('folderInfos', [...existingInfos, { path: normalized }])
    }
  }

  /**
   * フォルダを移動
   */
  moveFolder(sourcePath: string, targetFolderPath: string | null): string {
    const normalizedSource = PathResolver.normalizeFolderPath(sourcePath)

    if (!normalizedSource) {
      throw new DatabaseError('ソースフォルダパスが無効です', ErrorCodes.DB_VALIDATION_FAILED, {
        sourcePath
      })
    }

    const normalizedTargetParent = PathResolver.normalizeFolderPath(targetFolderPath || undefined)

    // 自分自身または子フォルダへの移動を防ぐ
    if (
      normalizedTargetParent &&
      (normalizedTargetParent === normalizedSource ||
        normalizedTargetParent.startsWith(`${normalizedSource}/`))
    ) {
      throw new DatabaseError(
        'フォルダを自分自身または子フォルダに移動できません',
        ErrorCodes.DB_VALIDATION_FAILED,
        { sourcePath, targetFolderPath }
      )
    }

    const folderName = normalizedSource.split('/').pop() || normalizedSource
    const destinationPath = normalizedTargetParent
      ? `${normalizedTargetParent}/${folderName}`
      : folderName
    const normalizedDestination = PathResolver.normalizeFolderPath(destinationPath)

    if (!normalizedDestination || normalizedDestination === normalizedSource) {
      throw new DatabaseError('移動先フォルダパスが無効です', ErrorCodes.DB_VALIDATION_FAILED, {
        destinationPath
      })
    }

    // フォルダリストを更新
    const folders = this.store.get('folders', [])
    const updatedFolders = folders
      .map((folderEntry) => {
        const normalizedEntry = PathResolver.normalizeFolderPath(folderEntry)
        if (!normalizedEntry) return null
        if (
          normalizedEntry === normalizedSource ||
          normalizedEntry.startsWith(`${normalizedSource}/`)
        ) {
          return PathResolver.replaceFolderPath(
            normalizedEntry,
            normalizedSource,
            normalizedDestination
          )
        }
        return normalizedEntry
      })
      .filter((value): value is string => Boolean(value))

    this.store.set('folders', updatedFolders)

    // フォルダ情報を更新
    const folderInfos = this.store.get('folderInfos', [])
    const updatedInfos = folderInfos
      .map((info) => {
        if (info.path === normalizedSource || info.path.startsWith(`${normalizedSource}/`)) {
          return {
            ...info,
            path: PathResolver.replaceFolderPath(info.path, normalizedSource, normalizedDestination)
          }
        }
        return info
      })

    this.store.set('folderInfos', updatedInfos)

    return normalizedDestination
  }

  /**
   * フォルダの順序を変更
   */
  reorderFolders(folderPaths: string[]): void {
    const folderInfos = this.store.get('folderInfos', [])

    // 新しい順序を設定
    const orderMap = new Map<string, number>()
    folderPaths.forEach((path, index) => {
      const normalized = PathResolver.normalizeFolderPath(path)
      if (normalized) {
        orderMap.set(normalized, index)
      }
    })

    // フォルダ情報を更新
    const updatedInfos = folderInfos.map((info) => {
      if (orderMap.has(info.path)) {
        return {
          ...info,
          order: orderMap.get(info.path)
        }
      }
      return info
    })

    this.store.set('folderInfos', updatedInfos)
  }

  /**
   * フォルダの折りたたみ状態を更新
   */
  updateFolderCollapsed(folderPath: string, isCollapsed: boolean): void {
    const normalized = PathResolver.normalizeFolderPath(folderPath)
    if (!normalized) return

    const folderInfos = this.store.get('folderInfos', [])
    const updatedInfos = folderInfos.map((info) => {
      if (info.path === normalized) {
        return { ...info, isCollapsed }
      }
      return info
    })

    this.store.set('folderInfos', updatedInfos)
  }
}

// Made with Bob
