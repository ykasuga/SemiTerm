// globals.d.ts
export {};

// From design doc: 5. 接続情報フォーマット（JSON）
export interface Connection {
  id: string;
  title: string;
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

declare global {
  interface Window {
    // Expose some Api to the Renderer process
    api: {
      // From Main to Renderer
      onSshData: (callback: (id: string, data: Uint8Array) => void) => void;
      onSshError: (callback: (id: string, error: Error) => void) => void;
      onSshClose: (callback: (id: string) => void) => void;

      // From Renderer to Main
      getConnections: () => Promise<Connection[]>;
      saveConnection: (connection: Connection) => Promise<Connection[]>;
      deleteConnection: (id: string) => Promise<Connection[]>;
      
      // SSH Operations
      sshConnect: (connection: Connection) => void;
      sshWrite: (id: string, data: string) => void;
      sshResize: (id: string, cols: number, rows: number, height: number, width: number) => void;
      sshClose: (id: string) => void;
    };
  }
}
