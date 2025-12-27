import log from 'electron-log';
import { AppError, SshError } from './AppError';

/**
 * エラーがAppErrorのインスタンスかチェック
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * エラーが操作可能なエラーかチェック
 */
export function isOperationalError(error: unknown): boolean {
  if (isAppError(error)) {
    return error.isOperational;
  }
  return false;
}

/**
 * エラーをAppErrorに変換
 */
export function toAppError(error: unknown, defaultCode = 'UNKNOWN_ERROR'): AppError {
  // すでにAppErrorの場合はそのまま返す
  if (isAppError(error)) {
    return error;
  }

  // Errorオブジェクトの場合
  if (error instanceof Error) {
    return new AppError(
      error.message,
      defaultCode,
      true,
      { originalError: error.name, stack: error.stack }
    );
  }

  // その他の場合
  const message = typeof error === 'string' ? error : 'Unknown error occurred';
  return new AppError(message, defaultCode, true, { originalError: error });
}

/**
 * SSH2エラーをSshErrorに変換
 */
export function toSshError(error: unknown, context?: Record<string, unknown>): SshError {
  if (error instanceof SshError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // エラーメッセージから適切なエラーコードを判定
    if (message.includes('authentication') || message.includes('auth')) {
      return new SshError('Authentication failed', 'SSH_AUTH_FAILED', { ...context, originalError: error.message });
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return new SshError('Connection timeout', 'SSH_TIMEOUT', { ...context, originalError: error.message });
    }
    if (message.includes('enotfound') || message.includes('getaddrinfo')) {
      return new SshError('Host not found', 'SSH_CONNECTION_FAILED', { ...context, originalError: error.message });
    }
    if (message.includes('econnrefused')) {
      return new SshError('Connection refused', 'SSH_CONNECTION_FAILED', { ...context, originalError: error.message });
    }
    if (message.includes('key') && message.includes('not found')) {
      return new SshError('Private key not found', 'SSH_KEY_NOT_FOUND', { ...context, originalError: error.message });
    }
    if (message.includes('key') && (message.includes('invalid') || message.includes('parse'))) {
      return new SshError('Invalid private key', 'SSH_KEY_INVALID', { ...context, originalError: error.message });
    }

    // デフォルトのSSHエラー
    return new SshError(error.message, 'SSH_CONNECTION_FAILED', { ...context, originalError: error.message });
  }

  const message = typeof error === 'string' ? error : 'SSH connection failed';
  return new SshError(message, 'SSH_CONNECTION_FAILED', context);
}

/**
 * エラーをログに記録
 */
export function logError(error: unknown, context?: Record<string, unknown>): void {
  const appError = toAppError(error);
  
  const logContext = {
    ...appError.context,
    ...context,
    code: appError.code,
    timestamp: appError.timestamp.toISOString(),
    isOperational: appError.isOperational
  };

  if (appError.isOperational) {
    log.error(`[${appError.code}] ${appError.message}`, logContext);
  } else {
    log.error(`[CRITICAL] [${appError.code}] ${appError.message}`, logContext);
    if (appError.stack) {
      log.error('Stack trace:', appError.stack);
    }
  }
}

/**
 * エラーをユーザーフレンドリーなメッセージに変換
 */
export function formatErrorForUser(error: unknown): string {
  if (isAppError(error)) {
    return error.getUserMessage();
  }

  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : '予期しないエラーが発生しました';
}

/**
 * エラーハンドリングのラッパー関数
 * 非同期関数をラップしてエラーを適切に処理
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorTransformer?: (error: unknown) => AppError
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      const appError = errorTransformer ? errorTransformer(error) : toAppError(error);
      logError(appError);
      throw appError;
    }
  }) as T;
}

/**
 * 同期関数用のエラーハンドリングラッパー
 */
export function withErrorHandlingSync<T extends (...args: any[]) => any>(
  fn: T,
  errorTransformer?: (error: unknown) => AppError
): T {
  return ((...args: Parameters<T>): ReturnType<T> => {
    try {
      return fn(...args);
    } catch (error) {
      const appError = errorTransformer ? errorTransformer(error) : toAppError(error);
      logError(appError);
      throw appError;
    }
  }) as T;
}

/**
 * エラーを安全に処理（エラーを投げずにログのみ）
 */
export function handleErrorSafely(error: unknown, context?: Record<string, unknown>): void {
  try {
    logError(error, context);
  } catch (loggingError) {
    // ログ記録自体が失敗した場合はコンソールに出力
    console.error('Failed to log error:', loggingError);
    console.error('Original error:', error);
  }
}

/**
 * エラーレスポンスの作成（IPC通信用）
 */
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    userMessage: string;
    timestamp: string;
    context?: Record<string, unknown>;
  };
}

export function createErrorResponse(error: unknown): ErrorResponse {
  const appError = toAppError(error);
  
  return {
    success: false,
    error: {
      message: appError.message,
      code: appError.code,
      userMessage: appError.getUserMessage(),
      timestamp: appError.timestamp.toISOString(),
      context: appError.context
    }
  };
}

/**
 * 成功レスポンスの作成（IPC通信用）
 */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

export function createSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data
  };
}

export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

// Made with Bob
