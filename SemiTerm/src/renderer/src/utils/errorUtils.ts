/**
 * Renderer プロセス用のエラーハンドリングユーティリティ
 */

import { ErrorResponse } from '../../../shared/errors/errorHandler';

/**
 * エラーレスポンスの型ガード
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === false &&
    'error' in response
  );
}

/**
 * API レスポンスからデータを安全に取得
 */
export function unwrapResponse<T>(response: unknown): T {
  if (isErrorResponse(response)) {
    throw new Error(response.error.userMessage || response.error.message);
  }
  
  if (
    typeof response === 'object' &&
    response !== null &&
    'success' in response &&
    response.success === true &&
    'data' in response
  ) {
    return (response as { data: T }).data;
  }
  
  // 後方互換性のため、直接データが返される場合も処理
  return response as T;
}

/**
 * エラーメッセージを取得
 */
export function getErrorMessage(error: unknown): string {
  // ErrorResponse の場合
  if (isErrorResponse(error)) {
    return error.error.userMessage || error.error.message;
  }
  
  // SSH エラーイベントの場合
  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    // userMessage があればそれを優先
    if ('userMessage' in error && typeof error.userMessage === 'string') {
      return error.userMessage;
    }
    return error.message;
  }
  
  // Error オブジェクトの場合
  if (error instanceof Error) {
    return error.message;
  }
  
  // 文字列の場合
  if (typeof error === 'string') {
    return error;
  }
  
  return '予期しないエラーが発生しました';
}

/**
 * エラーコードを取得
 */
export function getErrorCode(error: unknown): string | undefined {
  if (isErrorResponse(error)) {
    return error.error.code;
  }
  
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  
  return undefined;
}

/**
 * エラーをコンソールに記録
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const message = getErrorMessage(error);
  const code = getErrorCode(error);
  
  console.error('[Error]', {
    message,
    code,
    context,
    error
  });
}

/**
 * エラーハンドリング付きの非同期関数ラッパー
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  onError?: (error: unknown) => void
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      logError(error, { function: fn.name, args });
      if (onError) {
        onError(error);
      }
      throw error;
    }
  }) as T;
}

/**
 * エラーを安全に処理（エラーを投げない）
 */
export function handleErrorSafely(
  error: unknown,
  context?: Record<string, unknown>
): void {
  try {
    logError(error, context);
  } catch (loggingError) {
    console.error('Failed to log error:', loggingError);
    console.error('Original error:', error);
  }
}

/**
 * ユーザーフレンドリーなエラーメッセージのマッピング
 */
const ERROR_MESSAGES: Record<string, string> = {
  // SSH関連
  SSH_CONNECTION_FAILED: 'SSH接続に失敗しました。ホスト名、ポート、認証情報を確認してください。',
  SSH_AUTH_FAILED: '認証に失敗しました。ユーザー名とパスワード/鍵を確認してください。',
  SSH_TIMEOUT: '接続がタイムアウトしました。ネットワーク接続を確認してください。',
  SSH_KEY_NOT_FOUND: '秘密鍵ファイルが見つかりません。パスを確認してください。',
  SSH_KEY_INVALID: '秘密鍵が無効です。正しい形式の鍵ファイルを指定してください。',
  SSH_SHELL_FAILED: 'シェルの起動に失敗しました。',
  SSH_DISCONNECTED: 'SSH接続が切断されました。',
  
  // データベース関連
  DB_READ_FAILED: 'データの読み込みに失敗しました。',
  DB_WRITE_FAILED: 'データの保存に失敗しました。',
  DB_DELETE_FAILED: 'データの削除に失敗しました。',
  DB_VALIDATION_FAILED: 'データの検証に失敗しました。入力内容を確認してください。',
  DB_NOT_FOUND: '指定されたデータが見つかりません。',
  
  // ファイルシステム関連
  FS_FILE_NOT_FOUND: 'ファイルが見つかりません。',
  FS_PERMISSION_DENIED: 'ファイルへのアクセス権限がありません。',
  FS_READ_FAILED: 'ファイルの読み込みに失敗しました。',
  FS_WRITE_FAILED: 'ファイルの書き込みに失敗しました。'
};

/**
 * エラーコードからユーザーフレンドリーなメッセージを取得
 */
export function getUserFriendlyMessage(error: unknown): string {
  const code = getErrorCode(error);
  
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  
  return getErrorMessage(error);
}

// Made with Bob
