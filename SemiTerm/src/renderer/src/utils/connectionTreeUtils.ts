import { Connection, FolderInfo } from '../types';

export interface ConnectionFolderNode {
  id: string;
  name: string;
  path: string;
  children: ConnectionFolderNode[];
  connections: Connection[];
}

/**
 * 接続とフォルダからツリー構造を構築する
 */
export const buildConnectionTree = (
  connections: Connection[],
  folders: string[],
  folderInfos?: FolderInfo[]
): ConnectionFolderNode => {
  const root: ConnectionFolderNode = {
    id: '__root__',
    name: '',
    path: '',
    children: [],
    connections: []
  };
  const folderMap = new Map<string, ConnectionFolderNode>();
  folderMap.set('', root);

  const ensureFolderNode = (path?: string): ConnectionFolderNode => {
    if (!path) {
      return root;
    }
    const segments = path
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (!segments.length) {
      return root;
    }
    let parent = root;
    let currentPath = '';
    segments.forEach((segment) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let node = folderMap.get(currentPath);
      if (!node) {
        node = {
          id: currentPath,
          name: segment,
          path: currentPath,
          children: [],
          connections: []
        };
        folderMap.set(currentPath, node);
        parent.children.push(node);
      }
      parent = node;
    });
    return parent;
  };

  folders.forEach((folderPath) => {
    ensureFolderNode(folderPath);
  });

  connections.forEach((connection) => {
    const targetNode = ensureFolderNode(connection.folderPath);
    targetNode.connections.push(connection);
  });

  sortNode(root, folderInfos);
  return root;
};

/**
 * ノードを再帰的にソートする
 */
export const sortNode = (node: ConnectionFolderNode, folderInfos?: FolderInfo[]): void => {
  // フォルダをorder順にソート（orderがない場合はname順）
  const folderOrderMap = new Map<string, number>();
  if (folderInfos) {
    folderInfos.forEach(info => {
      if (info.order !== undefined) {
        folderOrderMap.set(info.path, info.order);
      }
    });
  }
  
  node.children.sort((a, b) => {
    const orderA = folderOrderMap.get(a.path) ?? Number.MAX_SAFE_INTEGER;
    const orderB = folderOrderMap.get(b.path) ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name, 'ja');
  });
  
  // 接続はorder順にソート（orderがない場合はtitle順）
  node.connections.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.name.localeCompare(b.name, 'ja');
  });
  
  node.children.forEach(child => sortNode(child, folderInfos));
};

// Made with Bob
