import { useState, useCallback } from 'react';
import type { DragItem, DropPosition, DragState } from '../types';

/**
 * ドラッグ&ドロップの状態管理フック
 * 構造ドラッグ（接続・フォルダ）とタブドラッグの状態を管理
 */
export interface UseDragStateReturn {
  // 構造ドラッグ状態
  structureDragState: DragState;
  setDraggingItem: (item: DragItem | null) => void;
  setDropTargetFolder: (folder: string | null) => void;
  setDropPosition: (position: DropPosition) => void;
  setRootDropTarget: (isRoot: boolean) => void;
  resetStructureDragState: () => void;
  
  // タブドラッグ状態
  draggingTabId: string | null;
  dragOverTabId: string | null;
  setDraggingTabId: (id: string | null) => void;
  setDragOverTabId: (id: string | null) => void;
  resetTabDragState: () => void;
}

export const useDragState = (): UseDragStateReturn => {
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

  // 構造ドラッグ状態をまとめたオブジェクト
  const structureDragState: DragState = {
    draggingItem,
    dropTargetFolder,
    isRootDropTarget,
    dropPosition
  };

  return {
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
  };
};

// Made with Bob