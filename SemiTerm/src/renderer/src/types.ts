// From design doc: 5. 接続情報フォーマット（JSON）
export interface Connection {
  id: string;
  title: string;
  folderPath?: string;
  host: string;
  port: number;
  username: string;
  auth: {
    type: 'password' | 'key';
    password?: string;
    keyPath?: string;
  };
  createdAt: string;
  updatedAt: string;
  order?: number; // 同一フォルダ内での並び順
}

export interface FolderInfo {
  path: string;
  order?: number; // 同一親フォルダ内での並び順
}

export interface ConnectionStoreState {
  connections: Connection[];
  folders: string[]; // 後方互換性のため文字列配列も保持
  folderInfos?: FolderInfo[]; // 新しいフォルダ情報（order付き）
}

// ドラッグ&ドロップ関連
export type DragItem =
  | { type: "connection"; id: string }
  | { type: "folder"; path: string };

export type DropPosition = {
  type: 'before' | 'after' | 'inside';
  targetId: string;
} | null;

export interface DragState {
  draggingItem: DragItem | null;
  dropTargetFolder: string | null;
  isRootDropTarget: boolean;
  dropPosition: DropPosition;
}

// タブ関連
export interface TabItem {
  id: string;
  label: string;
}

export interface TabStatus {
  state: "connecting" | "connected" | "error" | "disconnected";
  host?: string;
  username?: string;
  errorMessage?: string;
}

// コンテキストメニュー関連
export interface ContextMenuState {
  x: number;
  y: number;
  connection: Connection;
}

export interface TabContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

export interface ListContextMenuState {
  x: number;
  y: number;
}

// 接続ツリー関連
export interface ConnectionFolderNode {
  id: string;
  name: string;
  path: string;
  children: ConnectionFolderNode[];
  connections: Connection[];
}
