import type { IpcRendererEvent } from 'electron';
import type { Connection } from './types';

declare global {
  interface Window {
    electron: {
      ipcRenderer: {
        send(channel: string, ...args: unknown[]): void;
        on(channel: string, listener: (event: IpcRendererEvent, ...args: any[]) => void): void;
        removeAllListeners(channel: string): void;
      };
    };
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
      sshConnect: (connection: Connection, sessionId: string) => void;
      sshWrite: (id: string, data: string) => void;
      sshResize: (id: string, cols: number, rows: number, height: number, width: number) => void;
      sshClose: (id: string) => void;
    };
  }
}
