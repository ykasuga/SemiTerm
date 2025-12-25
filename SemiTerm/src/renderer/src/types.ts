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
