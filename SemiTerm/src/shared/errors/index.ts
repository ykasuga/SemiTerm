/**
 * エラーハンドリング関連のエクスポート
 */

// エラークラス
export {
  AppError,
  SshError,
  DatabaseError,
  FileSystemError,
  ValidationError,
  ProgrammingError,
  ErrorCodes,
  type ErrorCode
} from './AppError';

// エラーハンドリングユーティリティ
export {
  isAppError,
  isOperationalError,
  toAppError,
  toSshError,
  logError,
  formatErrorForUser,
  withErrorHandling,
  withErrorHandlingSync,
  handleErrorSafely,
  createErrorResponse,
  createSuccessResponse,
  type ErrorResponse,
  type SuccessResponse,
  type ApiResponse
} from './errorHandler';

// Made with Bob
