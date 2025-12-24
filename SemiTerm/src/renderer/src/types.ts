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
}

export interface ConnectionStoreState {
  connections: Connection[];
  folders: string[];
}
