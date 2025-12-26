import { useState, useCallback, useEffect } from 'react';
import { Connection, ConnectionStoreState, FolderInfo } from '../types';
import { buildConnectionTree, ConnectionFolderNode } from '../utils/connectionTreeUtils';

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
    window.api.getConnections().then(applyConnectionState);
  }, [applyConnectionState]);

  // 接続ツリーの構築
  const connectionTree = buildConnectionTree(connections, folders, folderInfos);

  // 接続をフォルダに移動
  const moveConnectionToFolder = useCallback(async (connectionId: string, targetFolderPath?: string) => {
    try {
      const state = await window.api.moveConnection(connectionId, targetFolderPath ?? null);
      applyConnectionState(state);
    } catch (error) {
      console.error(error);
      alert("接続先を移動できませんでした");
    }
  }, [applyConnectionState]);

  // フォルダを移動
  const moveFolderToTarget = useCallback(async (folderPath: string, targetFolderPath?: string) => {
    try {
      const state = await window.api.moveFolder(folderPath, targetFolderPath ?? null);
      applyConnectionState(state);
    } catch (error) {
      console.error(error);
      alert("フォルダを移動できませんでした");
    }
  }, [applyConnectionState]);

  // 接続を保存
  const handleSaveConnection = useCallback(async (connection: Connection) => {
    const prevIds = new Set(connections.map((c) => c.id));
    const updatedState = await window.api.saveConnection(connection);
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
  }, [connections]);

  // 接続を削除
  const handleDeleteConnection = useCallback(async (id: string) => {
    if (confirm('この接続設定を削除してもよろしいですか？')) {
      const updatedState = await window.api.deleteConnection(id);
      setConnections(updatedState.connections);
      setFolders(updatedState.folders);
      setFolderInfos(updatedState.folderInfos || []);
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
