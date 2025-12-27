/**
 * アプリケーション全体で使用する基底エラークラス
 */
export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly timestamp: Date;
  public readonly context?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    isOperational = true,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.isOperational = isOperational;
    this.timestamp = new Date();
    this.context = context;

    // スタックトレースを正しく保持
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * エラーをJSON形式にシリアライズ
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      isOperational: this.isOperational,
      timestamp: this.timestamp.toISOString(),
      context: this.context,
      stack: this.stack
    };
  }

  /**
   * ユーザーフレンドリーなエラーメッセージを取得
   */
  getUserMessage(): string {
    return this.message;
  }
}

/**
 * SSH接続関連のエラー
 */
export class SshError extends AppError {
  constructor(
    message: string,
    code: string = 'SSH_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, true, context);
  }

  getUserMessage(): string {
    const codeMessages: Record<string, string> = {
      SSH_CONNECTION_FAILED: 'SSH接続に失敗しました。ホスト名、ポート、認証情報を確認してください。',
      SSH_AUTH_FAILED: '認証に失敗しました。ユーザー名とパスワード/鍵を確認してください。',
      SSH_TIMEOUT: '接続がタイムアウトしました。ネットワーク接続を確認してください。',
      SSH_KEY_NOT_FOUND: '秘密鍵ファイルが見つかりません。パスを確認してください。',
      SSH_KEY_INVALID: '秘密鍵が無効です。正しい形式の鍵ファイルを指定してください。',
      SSH_SHELL_FAILED: 'シェルの起動に失敗しました。',
      SSH_DISCONNECTED: 'SSH接続が切断されました。'
    };

    return codeMessages[this.code] || this.message;
  }
}

/**
 * データベース操作関連のエラー
 */
export class DatabaseError extends AppError {
  constructor(
    message: string,
    code: string = 'DATABASE_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, true, context);
  }

  getUserMessage(): string {
    const codeMessages: Record<string, string> = {
      DB_READ_FAILED: 'データの読み込みに失敗しました。',
      DB_WRITE_FAILED: 'データの保存に失敗しました。',
      DB_DELETE_FAILED: 'データの削除に失敗しました。',
      DB_VALIDATION_FAILED: 'データの検証に失敗しました。入力内容を確認してください。',
      DB_NOT_FOUND: '指定されたデータが見つかりません。'
    };

    return codeMessages[this.code] || this.message;
  }
}

/**
 * ファイルシステム操作関連のエラー
 */
export class FileSystemError extends AppError {
  constructor(
    message: string,
    code: string = 'FS_ERROR',
    context?: Record<string, unknown>
  ) {
    super(message, code, true, context);
  }

  getUserMessage(): string {
    const codeMessages: Record<string, string> = {
      FS_FILE_NOT_FOUND: 'ファイルが見つかりません。',
      FS_PERMISSION_DENIED: 'ファイルへのアクセス権限がありません。',
      FS_READ_FAILED: 'ファイルの読み込みに失敗しました。',
      FS_WRITE_FAILED: 'ファイルの書き込みに失敗しました。'
    };

    return codeMessages[this.code] || this.message;
  }
}

/**
 * バリデーションエラー
 */
export class ValidationError extends AppError {
  public readonly field?: string;

  constructor(
    message: string,
    field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', true, context);
    this.field = field;
  }

  getUserMessage(): string {
    if (this.field) {
      return `${this.field}: ${this.message}`;
    }
    return this.message;
  }
}

/**
 * プログラミングエラー（バグ）
 */
export class ProgrammingError extends AppError {
  constructor(
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'PROGRAMMING_ERROR', false, context);
  }

  getUserMessage(): string {
    return '予期しないエラーが発生しました。アプリケーションを再起動してください。';
  }
}

/**
 * エラーコード定数
 */
export const ErrorCodes = {
  // SSH関連
  SSH_CONNECTION_FAILED: 'SSH_CONNECTION_FAILED',
  SSH_AUTH_FAILED: 'SSH_AUTH_FAILED',
  SSH_TIMEOUT: 'SSH_TIMEOUT',
  SSH_KEY_NOT_FOUND: 'SSH_KEY_NOT_FOUND',
  SSH_KEY_INVALID: 'SSH_KEY_INVALID',
  SSH_SHELL_FAILED: 'SSH_SHELL_FAILED',
  SSH_DISCONNECTED: 'SSH_DISCONNECTED',

  // データベース関連
  DB_READ_FAILED: 'DB_READ_FAILED',
  DB_WRITE_FAILED: 'DB_WRITE_FAILED',
  DB_DELETE_FAILED: 'DB_DELETE_FAILED',
  DB_VALIDATION_FAILED: 'DB_VALIDATION_FAILED',
  DB_NOT_FOUND: 'DB_NOT_FOUND',

  // ファイルシステム関連
  FS_FILE_NOT_FOUND: 'FS_FILE_NOT_FOUND',
  FS_PERMISSION_DENIED: 'FS_PERMISSION_DENIED',
  FS_READ_FAILED: 'FS_READ_FAILED',
  FS_WRITE_FAILED: 'FS_WRITE_FAILED',

  // バリデーション関連
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // プログラミングエラー
  PROGRAMMING_ERROR: 'PROGRAMMING_ERROR'
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

// Made with Bob
