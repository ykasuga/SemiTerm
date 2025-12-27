import { useEffect, useCallback } from 'react';
import { Connection, TabStatus } from '../types';
import { getUserFriendlyMessage, logError } from '../utils/errorUtils';

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
    try {
      setTabConnection(tabId, connection);
      updateTabStatus(tabId, {
        state: "connecting",
        host: connection.host,
        username: connection.username
      });
      incrementSessionToken(tabId);
      window.api.sshConnect(connection, tabId);
    } catch (error) {
      logError(error, { connection, tabId });
      updateTabStatus(tabId, {
        state: "error",
        errorMessage: getUserFriendlyMessage(error)
      });
    }
  }, [setTabConnection, updateTabStatus, incrementSessionToken]);

  // SSHイベントリスナーの設定
  useEffect(() => {
    const handleError = (_event: unknown, id: string, error: unknown) => {
      logError(error, { sessionId: id, event: 'ssh:error' });
      
      const errorMessage = getUserFriendlyMessage(error);
      
      updateTabStatus(id, {
        state: "error",
        errorMessage
      });
    };

    const handleClose = (_event: unknown, id: string) => {
      console.log(`[SSH] Connection closed: ${id}`);
      updateTabStatus(id, {
        state: "disconnected"
      });
    };

    const handleConnected = (_event: unknown, id: string) => {
      console.log(`[SSH] Connection established: ${id}`);
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
