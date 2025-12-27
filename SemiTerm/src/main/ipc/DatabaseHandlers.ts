import { ipcMain, dialog } from 'electron'
import { homedir } from 'os'
import { join } from 'path'
import type { Connection } from '../../shared/types'
import { ConnectionStore } from '../database/ConnectionStore'
import { FolderStore } from '../database/FolderStore'
import { FileSystemError, ErrorCodes, withErrorHandling, createSuccessResponse } from '../../shared/errors'

/**
 * データベース関連のIPCハンドラーを登録
 */
export function registerDatabaseHandlers(
  connectionStore: ConnectionStore,
  folderStore: FolderStore
): void {
  // 接続一覧を取得
  ipcMain.handle(
    'db:get-connections',
    withErrorHandling(async () => {
      return createSuccessResponse(connectionStore.getConnections())
    })
  )

  // 接続を保存
  ipcMain.handle(
    'db:save-connection',
    withErrorHandling(async (_event, connection: Connection) => {
      return createSuccessResponse(connectionStore.saveConnection(connection))
    })
  )

  // 接続を削除
  ipcMain.handle(
    'db:delete-connection',
    withErrorHandling(async (_event, id: string) => {
      return createSuccessResponse(connectionStore.deleteConnection(id))
    })
  )

  // フォルダを作成
  ipcMain.handle(
    'db:create-folder',
    withErrorHandling(async (_event, folderPath: string) => {
      folderStore.createFolder(folderPath)
      return createSuccessResponse(connectionStore.buildStoreState())
    })
  )

  // 接続を移動
  ipcMain.handle(
    'db:move-connection',
    withErrorHandling(async (_event, payload: { id: string; folderPath: string | null }) => {
      return createSuccessResponse(
        connectionStore.moveConnection(payload.id, payload.folderPath)
      )
    })
  )

  // フォルダを移動
  ipcMain.handle(
    'db:move-folder',
    withErrorHandling(async (_event, payload: { sourcePath: string; targetFolderPath: string | null }) => {
      const destinationPath = folderStore.moveFolder(payload.sourcePath, payload.targetFolderPath)
      
      // 接続のフォルダパスも更新
      connectionStore.updateConnectionsInFolder(payload.sourcePath, destinationPath)
      
      return createSuccessResponse(connectionStore.buildStoreState())
    })
  )

  // 接続の順序を変更
  ipcMain.handle(
    'db:reorder-connections',
    withErrorHandling(async (_event, payload: { connectionIds: string[]; folderPath?: string }) => {
      return createSuccessResponse(
        connectionStore.reorderConnections(payload.connectionIds, payload.folderPath)
      )
    })
  )

  // フォルダの順序を変更
  ipcMain.handle(
    'db:reorder-folders',
    withErrorHandling(async (_event, payload: { folderPaths: string[]; parentFolderPath?: string }) => {
      folderStore.reorderFolders(payload.folderPaths)
      return createSuccessResponse(connectionStore.buildStoreState())
    })
  )

  // 秘密鍵ファイル選択ダイアログ
  ipcMain.handle(
    'dialog:open-key-file',
    withErrorHandling(async () => {
      try {
        const result = await dialog.showOpenDialog({
          title: '秘密鍵を選択',
          defaultPath: join(homedir(), '.ssh'),
          properties: ['openFile'],
          filters: [
            {
              name: 'SSH Private Keys',
              extensions: ['pem', 'ppk', 'key', 'rsa', '']
            },
            {
              name: 'All Files',
              extensions: ['*']
            }
          ]
        })

        if (result.canceled || result.filePaths.length === 0) {
          return createSuccessResponse(null)
        }

        return createSuccessResponse(result.filePaths[0])
      } catch (error) {
        throw new FileSystemError(
          'ファイル選択ダイアログの表示に失敗しました',
          ErrorCodes.FS_READ_FAILED,
          { originalError: error }
        )
      }
    })
  )
}

// Made with Bob
