/**
 * SSH関連の定数定義
 */

// デフォルト設定
export const SSH_DEFAULTS = {
  PORT: 22,
  KEEPALIVE_INTERVAL_MS: 15000,
  KEEPALIVE_COUNT_MAX: 3,
  READY_TIMEOUT_MS: 10000,
  SESSION_CLEANUP_TIMEOUT_MS: 10000,
} as const;

// ターミナルサイズのデフォルト
export const TERMINAL_SIZE = {
  DEFAULT_ROWS: 24,
  DEFAULT_COLS: 80,
  DEFAULT_HEIGHT: 0,
  DEFAULT_WIDTH: 0,
} as const;

// 認証タイプ
export const AUTH_TYPE = {
  PASSWORD: 'password',
  KEY: 'key',
} as const;

// 接続状態
export const CONNECTION_STATE = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const;

// Made with Bob
