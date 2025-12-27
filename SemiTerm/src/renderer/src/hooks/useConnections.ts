import { useState, useCallback, useEffect } from 'react';
import { Connection, ConnectionStoreState, FolderInfo } from '../types';
import { buildConnectionTree, ConnectionFolderNode } from '../utils/connectionTreeUtils';
import { unwrapResponse, getUserFriendlyMessage, logError } from '../utils/errorUtils';

export interface UseConnectionsReturn {
  connections: Connection[];
  folders: string[];
  folderInfos: FolderInfo[];
  expandedFolders: Record<string, boolean>;
  connectionTree: ConnectionFolderNode;
  applyConnectionState: (state: ConnectionStoreState) => void;
  moveConnectionToFolder: (connectionId: string, targetFolderPath?: string) => Promise<void>;
  moveFolderToTarget: (folderPath: string, targetFolderPath?: string) => Promise<void>;
  handleSaveConnection: (connection: Connection) => Promise<void>;
  handleDeleteConnection: (id: string) => Promise<void>;
  toggleFolder: (path: string) => void;
}

export const useConnections = (): UseConnectionsReturn => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [folderInfos, setFolderInfos] = useState<FolderInfo[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // 接続状態を適用
  const applyConnectionState = useCallback((state: ConnectionStoreState) => {
    setConnections(state.connections);
    setFolders(state.folders);
    setFolderInfos(state.folderInfos || []);
  }, []);

  // 初期ロード
  useEffect(() => {
    window.api.getConnections()
      .then(response => {
        const state = unwrapResponse<ConnectionStoreState>(response);
        applyConnectionState(state);
      })
      .catch(error => {
        logError(error, { context: 'Initial connection load' });
        console.error('接続データの読み込みに失敗しました:', getUserFriendlyMessage(error));
      });
  }, [applyConnectionState]);

  // 接続ツリーの構築
  const connectionTree = buildConnectionTree(connections, folders, folderInfos);

  // 接続をフォルダに移動
  const moveConnectionToFolder = useCallback(async (connectionId: string, targetFolderPath?: string) => {
    try {
      const response = await window.api.moveConnection(connectionId, targetFolderPath ?? null);
      const state = unwrapResponse<ConnectionStoreState>(response);
      applyConnectionState(state);
    } catch (error) {
      logError(error, { connectionId, targetFolderPath });
      const message = getUserFriendlyMessage(error);
      alert(`接続の移動に失敗しました: ${message}`);
    }
  }, [applyConnectionState]);

  // フォルダを移動
  const moveFolderToTarget = useCallback(async (folderPath: string, targetFolderPath?: string) => {
    try {
      const response = await window.api.moveFolder(folderPath, targetFolderPath ?? null);
      const state = unwrapResponse<ConnectionStoreState>(response);
      applyConnectionState(state);
    } catch (error) {
      logError(error, { folderPath, targetFolderPath });
      const message = getUserFriendlyMessage(error);
      alert(`フォルダの移動に失敗しました: ${message}`);
    }
  }, [applyConnectionState]);

  // 接続を保存
  const handleSaveConnection = useCallback(async (connection: Connection) => {
    try {
      const prevIds = new Set(connections.map((c) => c.id));
      const response = await window.api.saveConnection(connection);
      const updatedState = unwrapResponse<ConnectionStoreState>(response);
      const updatedConnections = updatedState.connections;
      
      let savedId = connection.id;
      if (!savedId) {
        const created = updatedConnections.find(conn => !prevIds.has(conn.id));
        if (created) savedId = created.id;
      }
      
      const enrichedConnections = updatedConnections.map((conn) => {
        if (savedId && conn.id === savedId && connection.auth.type === "password") {
          return { ...conn, auth: { ...conn.auth, password: connection.auth.password } };
        }
        return conn;
      });
      
      setConnections(enrichedConnections);
      setFolders(updatedState.folders);
      setFolderInfos(updatedState.folderInfos || []);
    } catch (error) {
      logError(error, { connection });
      const message = getUserFriendlyMessage(error);
      alert(`接続の保存に失敗しました: ${message}`);
      throw error;
    }
  }, [connections]);

  // 接続を削除
  const handleDeleteConnection = useCallback(async (id: string) => {
    if (confirm('この接続設定を削除してもよろしいですか？')) {
      try {
        const response = await window.api.deleteConnection(id);
        const updatedState = unwrapResponse<ConnectionStoreState>(response);
        setConnections(updatedState.connections);
        setFolders(updatedState.folders);
        setFolderInfos(updatedState.folderInfos || []);
      } catch (error) {
        logError(error, { connectionId: id });
        const message = getUserFriendlyMessage(error);
        alert(`接続の削除に失敗しました: ${message}`);
      }
    }
  }, []);

  // フォルダの展開/折りたたみ
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !prev[path]
    }));
  }, []);

  return {
    connections,
    folders,
    folderInfos,
    expandedFolders,
    connectionTree,
    applyConnectionState,
    moveConnectionToFolder,
    moveFolderToTarget,
    handleSaveConnection,
    handleDeleteConnection,
    toggleFolder
  };
};

// Made with Bob
