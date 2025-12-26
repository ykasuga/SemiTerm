import { useEffect, useCallback } from 'react';
import { Connection, TabStatus } from '../types';

export interface UseSshSessionReturn {
  startSshSession: (connection: Connection, tabId: string) => void;
}

export const useSshSession = (
  setTabConnection: (tabId: string, connection: Connection) => void,
  updateTabStatus: (tabId: string, status: Partial<TabStatus>) => void,
  incrementSessionToken: (tabId: string) => void
): UseSshSessionReturn => {
  
  // SSH接続を開始
  const startSshSession = useCallback((connection: Connection, tabId: string) => {
    setTabConnection(tabId, connection);
    updateTabStatus(tabId, {
      state: "connecting",
      host: connection.host,
      username: connection.username
    });
    incrementSessionToken(tabId);
    window.api.sshConnect(connection, tabId);
  }, [setTabConnection, updateTabStatus, incrementSessionToken]);

  // SSHイベントリスナーの設定
  useEffect(() => {
    const handleError = (_event: unknown, id: string, error: { message: string }) => {
      updateTabStatus(id, {
        state: "error",
        errorMessage: error.message
      });
    };

    const handleClose = (_event: unknown, id: string) => {
      updateTabStatus(id, {
        state: "disconnected"
      });
    };

    const handleConnected = (_event: unknown, id: string) => {
      updateTabStatus(id, {
        state: "connected",
        errorMessage: undefined
      });
    };

    window.electron.ipcRenderer.on("ssh:error", handleError);
    window.electron.ipcRenderer.on("ssh:close", handleClose);
    window.electron.ipcRenderer.on("ssh:connected", handleConnected);

    return () => {
      window.electron.ipcRenderer.removeListener("ssh:error", handleError);
      window.electron.ipcRenderer.removeListener("ssh:close", handleClose);
      window.electron.ipcRenderer.removeListener("ssh:connected", handleConnected);
    };
  }, [updateTabStatus]);

  return {
    startSshSession
  };
};

// Made with Bob
