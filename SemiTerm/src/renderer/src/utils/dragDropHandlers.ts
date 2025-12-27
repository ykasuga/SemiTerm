import type { DragEvent as ReactDragEvent } from 'react';
import type { Connection, FolderInfo, DragItem, DropPosition } from '../types';
import {
  extractParentPath,
  isSameParent,
  reorderConnections,
  reorderFolders
} from './dragDropUtils';

/**
 * ドラッグ開始ハンドラーを作成するファクトリ関数
 */
export const createDragStartHandler = (
  setDraggingItem: (item: DragItem) => void
) => {
  return (event: ReactDragEvent, item: DragItem) => {
    event.dataTransfer.effectAllowed = "move";
    const data = item.type === 'connection' ? item.id : item.path;
    event.dataTransfer.setData("text/plain", data);
    setDraggingItem(item);
  };
};

/**
 * 接続のドラッグオーバーハンドラー
 */
export const handleConnectionDragOver = (
  event: ReactDragEvent<HTMLDivElement>,
  connectionId: string,
  draggingItem: DragItem | null,
  setDropPosition: (position: DropPosition) => void,
  setDropTargetFolder: (folder: string | null) => void,
  setRootDropTarget: (isRoot: boolean) => void
) => {
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
};

/**
 * フォルダのドラッグオーバーハンドラー
 */
export const handleFolderDragOver = (
  event: ReactDragEvent<HTMLDivElement>,
  folderPath: string,
  draggingItem: DragItem | null,
  setDropPosition: (position: DropPosition) => void,
  setDropTargetFolder: (folder: string | null) => void,
  setRootDropTarget: (isRoot: boolean) => void
) => {
  if (!draggingItem) return;
  
  // フォルダを自分自身または子孫にドロップしようとしている場合は無効
  if (draggingItem.type === "folder") {
    if (folderPath === draggingItem.path || folderPath.startsWith(`${draggingItem.path}/`)) {
      return;
    }
    
    // 同じ親フォルダ内のフォルダ同士の並び替えを検出
    if (isSameParent(draggingItem.path, folderPath)) {
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
};

/**
 * 接続の並び替え処理
 */
export const handleConnectionReorder = async (
  draggedConnectionId: string,
  targetConnectionId: string,
  position: 'before' | 'after',
  connections: Connection[],
  applyConnectionState: (state: any) => void
): Promise<void> => {
  const targetConnection = connections.find(c => c.id === targetConnectionId);
  if (!targetConnection) return;
  
  const targetFolderPath = targetConnection.folderPath;
  const newOrder = reorderConnections(
    connections,
    draggedConnectionId,
    targetConnectionId,
    position,
    targetFolderPath
  );
  
  const state = await window.api.reorderConnections(newOrder, targetFolderPath || undefined);
  applyConnectionState(state);
};

/**
 * フォルダの並び替え処理
 */
export const handleFolderReorder = async (
  draggedFolderPath: string,
  targetFolderPath: string,
  position: 'before' | 'after',
  folders: string[],
  folderInfos: FolderInfo[],
  applyConnectionState: (state: any) => void
): Promise<void> => {
  const parentPath = extractParentPath(draggedFolderPath);
  const newOrder = reorderFolders(
    folders,
    folderInfos,
    draggedFolderPath,
    targetFolderPath,
    position,
    parentPath || undefined
  );
  
  const state = await window.api.reorderFolders(newOrder, parentPath || undefined);
  applyConnectionState(state);
};

/**
 * 接続のドロップハンドラー
 */
export const handleConnectionDrop = async (
  event: ReactDragEvent<HTMLDivElement>,
  targetConnectionId: string,
  draggingItem: DragItem | null,
  dropPosition: DropPosition,
  connections: Connection[],
  moveConnectionToFolder: (connectionId: string, targetFolderPath?: string) => Promise<void>,
  moveFolderToTarget: (folderPath: string, targetFolderPath?: string) => Promise<void>,
  applyConnectionState: (state: any) => void,
  resetStructureDragState: () => void
): Promise<void> => {
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
      await handleConnectionReorder(
        draggingItem.id,
        targetConnectionId,
        dropPosition.type as 'before' | 'after',
        connections,
        applyConnectionState
      );
    } else {
      // 異なるフォルダへの移動
      await moveConnectionToFolder(draggingItem.id, targetFolderPath);
    }
  } else if (draggingItem.type === "folder") {
    await moveFolderToTarget(draggingItem.path, targetFolderPath);
  }
  
  resetStructureDragState();
};

/**
 * フォルダのドロップハンドラー
 */
export const handleFolderDrop = async (
  event: ReactDragEvent<HTMLDivElement>,
  folderPath: string,
  draggingItem: DragItem | null,
  dropPosition: DropPosition,
  folders: string[],
  folderInfos: FolderInfo[],
  moveConnectionToFolder: (connectionId: string, targetFolderPath?: string) => Promise<void>,
  moveFolderToTarget: (folderPath: string, targetFolderPath?: string) => Promise<void>,
  applyConnectionState: (state: any) => void,
  resetStructureDragState: () => void
): Promise<void> => {
  if (!draggingItem) return;
  
  // フォルダを自分自身または子孫にドロップしようとしている場合は無効
  if (draggingItem.type === "folder" && 
      (folderPath === draggingItem.path || folderPath.startsWith(`${draggingItem.path}/`))) {
    return;
  }
  
  event.preventDefault();
  event.stopPropagation();
  
  if (draggingItem.type === "connection") {
    await moveConnectionToFolder(draggingItem.id, folderPath);
  } else if (draggingItem.type === "folder") {
    // 同じ親フォルダ内のフォルダ同士の並び替え
    if (isSameParent(draggingItem.path, folderPath) && dropPosition) {
      await handleFolderReorder(
        draggingItem.path,
        folderPath,
        dropPosition.type as 'before' | 'after',
        folders,
        folderInfos,
        applyConnectionState
      );
    } else {
      // 異なるフォルダへの移動
      await moveFolderToTarget(draggingItem.path, folderPath);
    }
  }
  
  resetStructureDragState();
};

/**
 * ルートのドロップハンドラー
 */
export const handleRootDrop = async (
  event: ReactDragEvent<HTMLDivElement>,
  draggingItem: DragItem | null,
  moveConnectionToFolder: (connectionId: string, targetFolderPath?: string) => Promise<void>,
  moveFolderToTarget: (folderPath: string, targetFolderPath?: string) => Promise<void>,
  resetStructureDragState: () => void
): Promise<void> => {
  if (!draggingItem) return;
  event.preventDefault();
  event.stopPropagation();
  
  if (draggingItem.type === "connection") {
    await moveConnectionToFolder(draggingItem.id, undefined);
  } else if (draggingItem.type === "folder") {
    await moveFolderToTarget(draggingItem.path, undefined);
  }
  
  resetStructureDragState();
};

// Made with Bob