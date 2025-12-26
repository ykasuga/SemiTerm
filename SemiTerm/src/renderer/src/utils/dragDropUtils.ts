export type DragItem =
  | { type: "connection"; id: string }
  | { type: "folder"; path: string };

export type DropPosition = {
  type: 'before' | 'after' | 'inside';
  targetId: string; // connection.id or folder.path
} | null;

/**
 * ドロップ位置を計算する
 * 要素の上部1/3なら'before'、下部1/3なら'after'、中央なら'inside'
 */
export const calculateDropPosition = (
  event: React.DragEvent,
  targetRect: DOMRect,
  targetId: string,
  allowInside: boolean = true
): DropPosition => {
  const mouseY = event.clientY;
  const targetTop = targetRect.top;
  const targetHeight = targetRect.height;
  const relativeY = mouseY - targetTop;
  const ratio = relativeY / targetHeight;

  if (allowInside) {
    // フォルダの場合: 上部1/3、中央1/3、下部1/3で判定
    if (ratio < 0.33) {
      return { type: 'before', targetId };
    } else if (ratio > 0.67) {
      return { type: 'after', targetId };
    } else {
      return { type: 'inside', targetId };
    }
  } else {
    // 接続の場合: 上半分か下半分で判定
    if (ratio < 0.5) {
      return { type: 'before', targetId };
    } else {
      return { type: 'after', targetId };
    }
  }
};

/**
 * ドロップが有効かどうかを判定する
 */
export const isValidDropTarget = (
  draggingItem: DragItem | null,
  targetItem: DragItem | null
): boolean => {
  if (!draggingItem || !targetItem) {
    return false;
  }

  // 自分自身にはドロップできない
  if (draggingItem.type === targetItem.type) {
    if (draggingItem.type === 'connection' && targetItem.type === 'connection') {
      return draggingItem.id !== targetItem.id;
    }
    if (draggingItem.type === 'folder' && targetItem.type === 'folder') {
      return draggingItem.path !== targetItem.path;
    }
  }

  // フォルダを自分の子孫にはドロップできない
  if (draggingItem.type === 'folder' && targetItem.type === 'folder') {
    return !targetItem.path.startsWith(draggingItem.path + '/');
  }

  return true;
};

// Made with Bob
