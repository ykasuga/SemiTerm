import { Connection, FolderInfo, ArboristNodeData, ConnectionFolderNode } from '../types';
import { buildConnectionTree } from './connectionTreeUtils';

/**
 * ConnectionFolderNodeをreact-arborist用のデータに変換
 */
export function convertToArboristData(
  node: ConnectionFolderNode,
  folderInfos?: FolderInfo[]
): ArboristNodeData[] {
  const result: ArboristNodeData[] = [];
  
  // フォルダを追加
  node.children.forEach(child => {
    const folderInfo = folderInfos?.find(f => f.path === child.path);
    result.push({
      id: child.path,
      name: child.name,
      type: 'folder',
      path: child.path,
      order: folderInfo?.order,
      children: convertToArboristData(child, folderInfos)
    });
  });
  
  // コネクションを追加
  node.connections.forEach(conn => {
    result.push({
      id: conn.id,
      name: conn.name,
      type: 'connection',
      connection: conn,
      order: conn.order
    });
  });
  
  // order順にソート
  return result.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'ja');
  });
}

/**
 * フラットなデータ構造に変換（react-arboristが内部で使用）
 */
export function flattenArboristData(
  nodes: ArboristNodeData[],
  _parentId: string | null = null
): ArboristNodeData[] {
  const result: ArboristNodeData[] = [];
  
  nodes.forEach(node => {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenArboristData(node.children, node.id));
    }
  });
  
  return result;
}

/**
 * 接続とフォルダからreact-arborist用のツリーデータを直接構築
 */
export function buildArboristTreeData(
  connections: Connection[],
  folders: string[],
  folderInfos?: FolderInfo[]
): ArboristNodeData[] {
  const tree = buildConnectionTree(connections, folders, folderInfos);
  return convertToArboristData(tree, folderInfos);
}

// Made with Bob
