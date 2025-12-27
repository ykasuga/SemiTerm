import { homedir } from 'os'
import { join } from 'path'

/**
 * パス解決ユーティリティクラス
 * ファイルパスの解決と正規化を担当
 */
export class PathResolver {
  /**
   * チルダ（~）を含むパスをホームディレクトリに展開
   * @param keyPath - 解決するパス
   * @returns 解決されたパス
   */
  static resolveKeyPath(keyPath: string): string {
    if (keyPath.startsWith('~')) {
      const suffix = keyPath.slice(1).replace(/^[/\\]/, '')
      if (!suffix) {
        return homedir()
      }
      return join(homedir(), suffix)
    }
    return keyPath
  }

  /**
   * フォルダパスを正規化
   * @param folderPath - 正規化するフォルダパス
   * @returns 正規化されたパス（空の場合はundefined）
   */
  static normalizeFolderPath(folderPath?: string): string | undefined {
    if (!folderPath) return undefined
    
    const normalized = folderPath
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join('/')
    
    return normalized || undefined
  }

  /**
   * フォルダパスを置換
   * @param value - 置換対象の値
   * @param sourcePath - 置換元のパス
   * @param destinationPath - 置換先のパス
   * @returns 置換後の値
   */
  static replaceFolderPath(
    value: string,
    sourcePath: string,
    destinationPath: string
  ): string {
    if (value === sourcePath) return destinationPath
    
    const prefix = `${sourcePath}/`
    if (value.startsWith(prefix)) {
      const suffix = value.slice(prefix.length)
      return `${destinationPath}/${suffix}`
    }
    
    return value
  }
}

// Made with Bob
