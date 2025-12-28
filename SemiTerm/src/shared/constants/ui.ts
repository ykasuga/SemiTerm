/**
 * UI関連の定数定義
 */

// ウィンドウサイズ
export const WINDOW = {
  DEFAULT_WIDTH: 1280,
  DEFAULT_HEIGHT: 720,
} as const;

// レイアウト
export const LAYOUT = {
  SIDEBAR_WIDTH: 256, // w-64 = 16rem = 256px
  STATUSBAR_HEIGHT: 24, // h-6 = 1.5rem = 24px
  TABBAR_HEIGHT: 48, // h-12 = 3rem = 48px
} as const;

// スペーシング
export const SPACING = {
  MENU_PADDING: 10,
  FOLDER_INDENT: 16,
  MIN_POSITION: 10,
} as const;

// メニューサイズ
export const MENU = {
  CONNECTION_CONTEXT: {
    WIDTH: 200,
    HEIGHT: 100,
  },
  LIST_CONTEXT: {
    WIDTH: 220,
    HEIGHT: 160,
  },
  TAB_CONTEXT: {
    WIDTH: 220,
    HEIGHT: 60,
  },
} as const;

// ドラッグ&ドロップ
export const DRAG_DROP = {
  FOLDER_TOP_RATIO: 0.33,
  FOLDER_BOTTOM_RATIO: 0.67,
  ITEM_MIDDLE_RATIO: 0.5,
} as const;

// アニメーション
export const ANIMATION = {
  RESIZE_DEBOUNCE_MS: 50,
  TRANSITION_DURATION_MS: 150,
} as const;

// ターミナル設定
export const TERMINAL = {
  FONT_SIZE: 14,
  SCROLLBACK: 10000,
  CURSOR_BLINK: true,
  FONT_FAMILY:
    '"JetBrains Mono", "Fira Code", Menlo, "DejaVu Sans Mono", Consolas, "Lucida Console", monospace',
} as const;

// ターミナルテーマ
export const TERMINAL_THEME = {
  DARK: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    selectionBackground: '#555555',
  },
  LIGHT: {
    background: '#ffffff',
    foreground: '#000000',
    cursor: '#000000',
    selectionBackground: '#e0e0e0',
  },
} as const;

// アイコンサイズ
export const ICON = {
  SMALL: 16, // w-4 h-4
  MEDIUM: 20, // w-5 h-5
} as const;

// Z-Index
export const Z_INDEX = {
  CONTEXT_MENU: 40,
  DIALOG: 50,
  DROP_INDICATOR: 50,
} as const;

// ダイアログサイズ
export const DIALOG = {
  CONNECTION_EDITOR_MAX_WIDTH: 480,
  PASSWORD_PROMPT_MAX_WIDTH: 400,
} as const;

// Made with Bob
