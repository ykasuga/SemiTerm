import { useCallback } from 'react';
import type { DragEvent as ReactDragEvent } from 'react';
import type { Connection, FolderInfo, DragItem, DropPosition } from '../types';
import { useDragState } from './useDragState';
import {
  createDragStartHandler,
  handleConnectionDragOver as handleConnectionDragOverUtil,
  handleFolderDragOver as handleFolderDragOverUtil,
  handleConnectionDrop as handleConnectionDropUtil,
  handleFolderDrop as handleFolderDropUtil,
  handleRootDrop as handleRootDropUtil
} from '../utils/dragDropHandlers';

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
  // 状態管理フックを使用
  const {
    structureDragState,
    setDraggingItem,
    setDropTargetFolder,
    setDropPosition,
    setRootDropTarget,
    resetStructureDragState,
    draggingTabId,
    dragOverTabId,
    setDraggingTabId,
    setDragOverTabId,
    resetTabDragState
  } = useDragState();

  const { draggingItem, dropTargetFolder, isRootDropTarget, dropPosition } = structureDragState;

  // ドラッグ開始ハンドラーのファクトリを使用
  const dragStartHandler = createDragStartHandler(setDraggingItem);

  // 接続のドラッグ開始
  const handleConnectionDragStart = useCallback((event: ReactDragEvent<HTMLDivElement>, connectionId: string) => {
    dragStartHandler(event, { type: "connection", id: connectionId });
  }, [dragStartHandler]);

  // 接続の上でドラッグ
  const handleConnectionDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>, connectionId: string) => {
    handleConnectionDragOverUtil(
      event,
      connectionId,
      draggingItem,
      setDropPosition,
      setDropTargetFolder,
      setRootDropTarget
    );
  }, [draggingItem, setDropPosition, setDropTargetFolder, setRootDropTarget]);

  // 接続からドラッグが離れた
  const handleConnectionDragLeave = useCallback(() => {
    setDropPosition(null);
  }, [setDropPosition]);

  // 接続にドロップ
  const handleConnectionDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>, targetConnectionId: string) => {
    await handleConnectionDropUtil(
      event,
      targetConnectionId,
      draggingItem,
      dropPosition,
      connections,
      moveConnectionToFolder,
      moveFolderToTarget,
      applyConnectionState,
      resetStructureDragState
    );
  }, [draggingItem, dropPosition, connections, moveConnectionToFolder, moveFolderToTarget, applyConnectionState, resetStructureDragState]);

  // フォルダのドラッグ開始
  const handleFolderDragStart = useCallback((event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    dragStartHandler(event, { type: "folder", path: folderPath });
  }, [dragStartHandler]);

  // フォルダの上でドラッグ
  const handleFolderDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    handleFolderDragOverUtil(
      event,
      folderPath,
      draggingItem,
      setDropPosition,
      setDropTargetFolder,
      setRootDropTarget
    );
  }, [draggingItem, setDropPosition, setDropTargetFolder, setRootDropTarget]);

  // フォルダにドロップ
  const handleFolderDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    await handleFolderDropUtil(
      event,
      folderPath,
      draggingItem,
      dropPosition,
      folders,
      folderInfos,
      moveConnectionToFolder,
      moveFolderToTarget,
      applyConnectionState,
      resetStructureDragState
    );
  }, [draggingItem, dropPosition, folders, folderInfos, moveConnectionToFolder, moveFolderToTarget, applyConnectionState, resetStructureDragState]);

  // ルートの上でドラッグ
  const handleRootDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!draggingItem) return;
    event.preventDefault();
    setDropTargetFolder(null);
    setRootDropTarget(true);
  }, [draggingItem, setDropTargetFolder, setRootDropTarget]);

  // ルートにドロップ
  const handleRootDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>) => {
    await handleRootDropUtil(
      event,
      draggingItem,
      moveConnectionToFolder,
      moveFolderToTarget,
      resetStructureDragState
    );
  }, [draggingItem, moveConnectionToFolder, moveFolderToTarget, resetStructureDragState]);

  // タブのドラッグ開始
  const handleTabDragStart = useCallback((event: ReactDragEvent<HTMLButtonElement>, tabId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tabId);
    setDraggingTabId(tabId);
  }, [setDraggingTabId]);

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
  }, [draggingTabId, tabs, reorderTabs, setDragOverTabId, setDraggingTabId]);

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
