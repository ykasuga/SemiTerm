import { useState, useCallback } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import { Connection, FolderInfo, DragItem, DropPosition } from '../types';

export interface UseDragAndDropReturn {
  // 構造ドラッグ状態
  draggingItem: DragItem | null;
  dropTargetFolder: string | null;
  isRootDropTarget: boolean;
  dropPosition: DropPosition;
  
  // タブドラッグ状態
  draggingTabId: string | null;
  dragOverTabId: string | null;
  
  // 接続のドラッグハンドラー
  handleConnectionDragStart: (event: ReactDragEvent<HTMLDivElement>, connectionId: string) => void;
  handleConnectionDragOver: (event: ReactDragEvent<HTMLDivElement>, connectionId: string) => void;
  handleConnectionDragLeave: () => void;
  handleConnectionDrop: (event: ReactDragEvent<HTMLDivElement>, targetConnectionId: string) => Promise<void>;
  
  // フォルダのドラッグハンドラー
  handleFolderDragStart: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  handleFolderDragOver: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  handleFolderDrop: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => Promise<void>;
  
  // ルートのドラッグハンドラー
  handleRootDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  handleRootDrop: (event: ReactDragEvent<HTMLDivElement>) => Promise<void>;
  
  // タブのドラッグハンドラー
  handleTabDragStart: (event: ReactDragEvent<HTMLButtonElement>, tabId: string) => void;
  handleTabDrop: (tabId: string) => void;
  setDragOverTabId: (tabId: string | null) => void;
  
  // ドラッグ終了ハンドラー
  handleStructureDragEnd: () => void;
  resetTabDragState: () => void;
  resetStructureDragState: () => void;
}

export const useDragAndDrop = (
  connections: Connection[],
  folders: string[],
  folderInfos: FolderInfo[],
  moveConnectionToFolder: (connectionId: string, targetFolderPath?: string) => Promise<void>,
  moveFolderToTarget: (folderPath: string, targetFolderPath?: string) => Promise<void>,
  applyConnectionState: (state: any) => void,
  reorderTabs: (fromIndex: number, toIndex: number) => void,
  tabs: any[]
): UseDragAndDropReturn => {
  // 構造ドラッグ状態
  const [draggingItem, setDraggingItem] = useState<DragItem | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [isRootDropTarget, setRootDropTarget] = useState(false);
  const [dropPosition, setDropPosition] = useState<DropPosition>(null);
  
  // タブドラッグ状態
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);

  // 構造ドラッグ状態をリセット
  const resetStructureDragState = useCallback(() => {
    setDraggingItem(null);
    setDropTargetFolder(null);
    setRootDropTarget(false);
    setDropPosition(null);
  }, []);

  // タブドラッグ状態をリセット
  const resetTabDragState = useCallback(() => {
    setDragOverTabId(null);
    setDraggingTabId(null);
  }, []);

  // 接続のドラッグ開始
  const handleConnectionDragStart = useCallback((event: ReactDragEvent<HTMLDivElement>, connectionId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", connectionId);
    setDraggingItem({ type: "connection", id: connectionId });
  }, []);

  // 接続の上でドラッグ
  const handleConnectionDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>, connectionId: string) => {
    if (!draggingItem) return;
    event.preventDefault();
    event.stopPropagation();
    
    const rect = event.currentTarget.getBoundingClientRect();
    const mouseY = event.clientY - rect.top;
    const height = rect.height;
    
    // 接続アイテムは上半分でbefore、下半分でafter
    if (mouseY < height / 2) {
      setDropPosition({ type: 'before', targetId: connectionId });
    } else {
      setDropPosition({ type: 'after', targetId: connectionId });
    }
    
    setDropTargetFolder(null);
    setRootDropTarget(false);
  }, [draggingItem]);

  // 接続からドラッグが離れた
  const handleConnectionDragLeave = useCallback(() => {
    setDropPosition(null);
  }, []);

  // 接続にドロップ
  const handleConnectionDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>, targetConnectionId: string) => {
    if (!draggingItem || !dropPosition) return;
    event.preventDefault();
    event.stopPropagation();
    
    const targetConnection = connections.find(c => c.id === targetConnectionId);
    if (!targetConnection) return;
    
    const targetFolderPath = targetConnection.folderPath;
    
    if (draggingItem.type === "connection") {
      const draggedConnection = connections.find(c => c.id === draggingItem.id);
      if (!draggedConnection) return;
      
      const draggedFolderPath = draggedConnection.folderPath;
      const normalizedDraggedFolder = draggedFolderPath || undefined;
      const normalizedTargetFolder = targetFolderPath || undefined;
      
      // 同じフォルダ内での並び替え
      if (normalizedDraggedFolder === normalizedTargetFolder) {
        const folderConnections = connections
          .filter(c => (c.folderPath || undefined) === normalizedTargetFolder)
          .sort((a, b) => {
            const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.title.localeCompare(b.title, 'ja');
          });
        
        const withoutDragged = folderConnections.filter(c => c.id !== draggingItem.id);
        const targetIndex = withoutDragged.findIndex(c => c.id === targetConnectionId);
        if (targetIndex === -1) return;
        
        const insertIndex = dropPosition.type === 'before' ? targetIndex : targetIndex + 1;
        const reordered = [
          ...withoutDragged.slice(0, insertIndex),
          draggedConnection,
          ...withoutDragged.slice(insertIndex)
        ];
        
        const newOrder = reordered.map(c => c.id);
        const state = await window.api.reorderConnections(newOrder, normalizedTargetFolder);
        applyConnectionState(state);
      } else {
        // 異なるフォルダへの移動
        await moveConnectionToFolder(draggingItem.id, targetFolderPath);
      }
    } else if (draggingItem.type === "folder") {
      await moveFolderToTarget(draggingItem.path, targetFolderPath);
    }
    
    resetStructureDragState();
  }, [draggingItem, dropPosition, connections, moveConnectionToFolder, moveFolderToTarget, resetStructureDragState, applyConnectionState]);

  // フォルダのドラッグ開始
  const handleFolderDragStart = useCallback((event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", folderPath);
    setDraggingItem({ type: "folder", path: folderPath });
  }, []);

  // フォルダの上でドラッグ
  const handleFolderDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    if (!draggingItem) return;
    if (draggingItem.type === "folder") {
      if (folderPath === draggingItem.path || folderPath.startsWith(`${draggingItem.path}/`)) {
        return;
      }
      
      // 同じ親フォルダ内のフォルダ同士の並び替えを検出
      const draggedParent = draggingItem.path.includes('/')
        ? draggingItem.path.substring(0, draggingItem.path.lastIndexOf('/'))
        : '';
      const targetParent = folderPath.includes('/')
        ? folderPath.substring(0, folderPath.lastIndexOf('/'))
        : '';
      
      if (draggedParent === targetParent) {
        const rect = event.currentTarget.getBoundingClientRect();
        const mouseY = event.clientY - rect.top;
        const height = rect.height;
        
        if (mouseY < height / 2) {
          setDropPosition({ type: 'before', targetId: folderPath });
        } else {
          setDropPosition({ type: 'after', targetId: folderPath });
        }
        setDropTargetFolder(null);
        setRootDropTarget(false);
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    
    event.preventDefault();
    event.stopPropagation();
    setDropPosition(null);
    setDropTargetFolder(folderPath);
    setRootDropTarget(false);
  }, [draggingItem]);

  // フォルダにドロップ
  const handleFolderDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    if (!draggingItem) return;
    if (draggingItem.type === "folder" && (folderPath === draggingItem.path || folderPath.startsWith(`${draggingItem.path}/`))) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    
    if (draggingItem.type === "connection") {
      await moveConnectionToFolder(draggingItem.id, folderPath);
    } else if (draggingItem.type === "folder") {
      const draggedParent = draggingItem.path.includes('/')
        ? draggingItem.path.substring(0, draggingItem.path.lastIndexOf('/'))
        : '';
      const targetParent = folderPath.includes('/')
        ? folderPath.substring(0, folderPath.lastIndexOf('/'))
        : '';
      
      if (draggedParent === targetParent && dropPosition) {
        // 同じ親フォルダ内のフォルダを取得
        const parentFolders = folders
          .filter(f => {
            const parent = f.includes('/') ? f.substring(0, f.lastIndexOf('/')) : '';
            return parent === draggedParent && !f.includes('/', draggedParent ? draggedParent.length + 1 : 0);
          })
          .map(path => {
            const info = folderInfos.find(fi => fi.path === path);
            return { path, order: info?.order };
          })
          .sort((a, b) => {
            const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
            const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
            if (orderA !== orderB) {
              return orderA - orderB;
            }
            return a.path.localeCompare(b.path, 'ja');
          });
        
        const withoutDragged = parentFolders.filter(f => f.path !== draggingItem.path);
        const targetIndex = withoutDragged.findIndex(f => f.path === folderPath);
        if (targetIndex === -1) return;
        
        const insertIndex = dropPosition.type === 'before' ? targetIndex : targetIndex + 1;
        const reordered = [
          ...withoutDragged.slice(0, insertIndex),
          { path: draggingItem.path, order: undefined },
          ...withoutDragged.slice(insertIndex)
        ];
        
        const newOrder = reordered.map(f => f.path);
        const state = await window.api.reorderFolders(newOrder, draggedParent || undefined);
        applyConnectionState(state);
      } else {
        await moveFolderToTarget(draggingItem.path, folderPath);
      }
    }
    resetStructureDragState();
  }, [draggingItem, dropPosition, folders, folderInfos, moveConnectionToFolder, moveFolderToTarget, resetStructureDragState, applyConnectionState]);

  // ルートの上でドラッグ
  const handleRootDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!draggingItem) return;
    event.preventDefault();
    setDropTargetFolder(null);
    setRootDropTarget(true);
  }, [draggingItem]);

  // ルートにドロップ
  const handleRootDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>) => {
    if (!draggingItem) return;
    event.preventDefault();
    event.stopPropagation();
    if (draggingItem.type === "connection") {
      await moveConnectionToFolder(draggingItem.id, undefined);
    } else if (draggingItem.type === "folder") {
      await moveFolderToTarget(draggingItem.path, undefined);
    }
    resetStructureDragState();
  }, [draggingItem, moveConnectionToFolder, moveFolderToTarget, resetStructureDragState]);

  // タブのドラッグ開始
  const handleTabDragStart = useCallback((event: ReactDragEvent<HTMLButtonElement>, tabId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tabId);
    setDraggingTabId(tabId);
  }, []);

  // タブにドロップ
  const handleTabDrop = useCallback((targetTabId: string) => {
    if (draggingTabId && draggingTabId !== targetTabId) {
      // タブのインデックスを取得して並び替え
      const sourceIndex = tabs.findIndex(t => t.id === draggingTabId);
      const targetIndex = tabs.findIndex(t => t.id === targetTabId);
      if (sourceIndex !== -1 && targetIndex !== -1) {
        reorderTabs(sourceIndex, targetIndex);
      }
    }
    setDragOverTabId(null);
    setDraggingTabId(null);
  }, [draggingTabId, tabs, reorderTabs]);

  // 構造ドラッグ終了
  const handleStructureDragEnd = useCallback(() => {
    resetStructureDragState();
  }, [resetStructureDragState]);

  return {
    draggingItem,
    dropTargetFolder,
    isRootDropTarget,
    dropPosition,
    draggingTabId,
    dragOverTabId,
    handleConnectionDragStart,
    handleConnectionDragOver,
    handleConnectionDragLeave,
    handleConnectionDrop,
    handleFolderDragStart,
    handleFolderDragOver,
    handleFolderDrop,
    handleRootDragOver,
    handleRootDrop,
    handleTabDragStart,
    handleTabDrop,
    setDragOverTabId,
    handleStructureDragEnd,
    resetTabDragState,
    resetStructureDragState
  };
};

// Made with Bob
