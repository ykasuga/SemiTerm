import type { IpcRendererEvent } from 'electron';
import type { Connection, ConnectionStoreState } from './types';

// API Response types
interface SuccessResponse<T> {
  success: true;
  data: T;
}

interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    userMessage: string;
    timestamp: string;
    context?: Record<string, unknown>;
  };
}

type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send(channel: string, ...args: unknown[]): void;
        on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void;
        removeAllListeners(channel: string): void;
        removeListener(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void;
      };
    };
    api: {
      // From Main to Renderer
      onSshData: (callback: (id: string, data: Uint8Array) => void) => void;
      onSshError: (callback: (id: string, error: Error) => void) => void;
      onSshClose: (callback: (id: string) => void) => void;

      // From Renderer to Main
      getConnections: () => Promise<ConnectionStoreState>;
      saveConnection: (connection: Connection) => Promise<ConnectionStoreState>;
      deleteConnection: (id: string) => Promise<ConnectionStoreState>;
      createFolder: (folderPath: string) => Promise<ConnectionStoreState>;
      moveConnection: (id: string, folderPath: string | null) => Promise<ConnectionStoreState>;
      moveFolder: (sourcePath: string, targetFolderPath: string | null) => Promise<ConnectionStoreState>;
      reorderConnections: (connectionIds: string[], folderPath?: string) => Promise<ConnectionStoreState>;
      reorderFolders: (folderPaths: string[], parentFolderPath?: string) => Promise<ConnectionStoreState>;
      openKeyFileDialog: () => Promise<ApiResponse<string | null>>;
      
      // SSH Operations
      sshConnect: (connection: Connection, sessionId: string) => void;
      sshWrite: (id: string, data: string) => void;
      sshResize: (id: string, cols: number, rows: number, height: number, width: number) => void;
      sshClose: (id: string) => void;
    };
  }
}
