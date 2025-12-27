import type { DragItem, DropPosition } from '../types';
import type { Connection, FolderInfo } from '../types';

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

/**
 * パスから親フォルダパスを抽出する
 * @param path フォルダパス
 * @returns 親フォルダパス（ルートの場合は空文字列）
 */
export const extractParentPath = (path: string): string => {
  if (!path.includes('/')) {
    return '';
  }
  return path.substring(0, path.lastIndexOf('/'));
};

/**
 * 2つのパスが同じ親フォルダを持つか判定する
 */
export const isSameParent = (path1: string, path2: string): boolean => {
  return extractParentPath(path1) === extractParentPath(path2);
};

/**
 * あるパスが別のパスの子孫かどうかを判定する
 */
export const isDescendant = (ancestorPath: string, descendantPath: string): boolean => {
  if (ancestorPath === descendantPath) {
    return false;
  }
  return descendantPath.startsWith(`${ancestorPath}/`);
};

/**
 * フォルダパスを正規化する（undefinedを空文字列に変換）
 */
export const normalizeFolderPath = (folderPath?: string): string | undefined => {
  return folderPath || undefined;
};

/**
 * アイテムをorder値でソートする
 * @param items ソート対象のアイテム配列
 * @param getOrder order値を取得する関数
 * @param getName 名前を取得する関数（order値が同じ場合の比較用）
 * @returns ソートされたアイテム配列
 */
export const sortItemsByOrder = <T>(
  items: T[],
  getOrder: (item: T) => number | undefined,
  getName: (item: T) => string
): T[] => {
  return [...items].sort((a, b) => {
    const orderA = getOrder(a) ?? Number.MAX_SAFE_INTEGER;
    const orderB = getOrder(b) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return getName(a).localeCompare(getName(b), 'ja');
  });
};

/**
 * アイテムを並び替える
 * @param items 元のアイテム配列
 * @param draggedItem ドラッグされたアイテム
 * @param targetItem ターゲットアイテム
 * @param position 挿入位置（'before' または 'after'）
 * @param getId アイテムのIDを取得する関数
 * @returns 並び替え後のアイテム配列
 */
export const reorderItems = <T>(
  items: T[],
  draggedItem: T,
  targetItem: T,
  position: 'before' | 'after',
  getId: (item: T) => string
): T[] => {
  const draggedId = getId(draggedItem);
  const targetId = getId(targetItem);
  
  const withoutDragged = items.filter(item => getId(item) !== draggedId);
  const targetIndex = withoutDragged.findIndex(item => getId(item) === targetId);
  
  if (targetIndex === -1) {
    return items;
  }
  
  const insertIndex = position === 'before' ? targetIndex : targetIndex + 1;
  
  return [
    ...withoutDragged.slice(0, insertIndex),
    draggedItem,
    ...withoutDragged.slice(insertIndex)
  ];
};

/**
 * 接続を並び替えてIDの配列を返す
 */
export const reorderConnections = (
  connections: Connection[],
  draggedConnectionId: string,
  targetConnectionId: string,
  position: 'before' | 'after',
  folderPath?: string
): string[] => {
  const normalizedFolder = normalizeFolderPath(folderPath);
  
  // 同じフォルダ内の接続のみをフィルタリング
  const folderConnections = connections.filter(
    c => normalizeFolderPath(c.folderPath) === normalizedFolder
  );
  
  // order値でソート
  const sortedConnections = sortItemsByOrder(
    folderConnections,
    c => c.order,
    c => c.title
  );
  
  const draggedConnection = sortedConnections.find(c => c.id === draggedConnectionId);
  const targetConnection = sortedConnections.find(c => c.id === targetConnectionId);
  
  if (!draggedConnection || !targetConnection) {
    return sortedConnections.map(c => c.id);
  }
  
  const reordered = reorderItems(
    sortedConnections,
    draggedConnection,
    targetConnection,
    position,
    c => c.id
  );
  
  return reordered.map(c => c.id);
};

/**
 * フォルダを並び替えてパスの配列を返す
 */
export const reorderFolders = (
  folders: string[],
  folderInfos: FolderInfo[],
  draggedFolderPath: string,
  targetFolderPath: string,
  position: 'before' | 'after',
  parentPath?: string
): string[] => {
  const normalizedParent = parentPath || '';
  
  // 同じ親フォルダ内のフォルダのみをフィルタリング
  const parentFolders = folders.filter(f => {
    const parent = extractParentPath(f);
    // 直接の子フォルダのみ（孫フォルダは除外）
    return parent === normalizedParent && !f.includes('/', normalizedParent ? normalizedParent.length + 1 : 0);
  });
  
  // FolderInfo配列に変換してorder値でソート
  const foldersWithOrder = parentFolders.map(path => {
    const info = folderInfos.find(fi => fi.path === path);
    return { path, order: info?.order };
  });
  
  const sortedFolders = sortItemsByOrder(
    foldersWithOrder,
    f => f.order,
    f => f.path
  );
  
  const draggedFolder = sortedFolders.find(f => f.path === draggedFolderPath);
  const targetFolder = sortedFolders.find(f => f.path === targetFolderPath);
  
  if (!draggedFolder || !targetFolder) {
    return sortedFolders.map(f => f.path);
  }
  
  const reordered = reorderItems(
    sortedFolders,
    draggedFolder,
    targetFolder,
    position,
    f => f.path
  );
  
  return reordered.map(f => f.path);
};

// Made with Bob
