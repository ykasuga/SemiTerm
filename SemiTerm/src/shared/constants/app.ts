/**
 * アプリケーション設定の定数定義
 */

// アプリケーション情報
export const APP_INFO = {
  NAME: 'SemiTerm',
  VERSION: '0.1.0',
  DESCRIPTION: 'Lightweight SSH',
} as const;

// タブ管理
export const TAB = {
  INITIAL_SERIAL: 0,
  INITIAL_LABEL_SERIAL: 1,
  ID_PREFIX: 'ssh-tab-',
} as const;

// 配列操作
export const ARRAY = {
  NOT_FOUND_INDEX: -1,
  FIRST_INDEX: 0,
  EMPTY_LENGTH: 0,
  SINGLE_ITEM: 1,
} as const;

// パス操作
export const PATH = {
  SEPARATOR: '/',
  HOME_PREFIX: '~',
  PARENT_INDICATOR: '..',
} as const;

// ログ設定
export const LOG = {
  DATE_FORMAT_LENGTH: 10, // YYYY-MM-DD
} as const;

// ファイル選択
export const FILE_DIALOG = {
  CANCELED_RESULT_LENGTH: 0,
  FIRST_FILE_INDEX: 0,
} as const;

// 数値計算
export const MATH = {
  HALF: 0.5,
  PERCENTAGE_100: 100,
} as const;

// 文字列操作
export const STRING = {
  EMPTY: '',
  MIN_LENGTH: 0,
  FIRST_CHAR: 0,
  SECOND_CHAR: 1,
} as const;

// Made with Bob
