import { memo } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { Connection, DragItem, DropPosition } from '../../types';
import { ConnectionFolderNode } from '../../utils/connectionTreeUtils';
import { ConnectionItem } from '../connection/ConnectionItem';
import { FolderNode } from '../connection/FolderNode';
import appIcon from '../../../../../resources/icon.png?asset';

interface SidebarProps {
  connectionTree: ConnectionFolderNode;
  expandedFolders: Record<string, boolean>;
  draggingItem: DragItem | null;
  dropTargetFolder: string | null;
  isRootDropTarget: boolean;
  dropPosition: DropPosition;
  onNewConnection: () => void;
  onConnect: (connection: Connection) => void;
  onToggleFolder: (path: string) => void;
  onConnectionContextMenu: (event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => void;
  onSidebarContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  onConnectionDragStart: (event: ReactDragEvent<HTMLDivElement>, connectionId: string) => void;
  onConnectionDragOver: (event: ReactDragEvent<HTMLDivElement>, connectionId: string) => void;
  onConnectionDragLeave: () => void;
  onConnectionDrop: (event: ReactDragEvent<HTMLDivElement>, targetConnectionId: string) => void;
  onFolderDragStart: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  onFolderDragOver: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  onFolderDrop: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  onRootDragOver: (event: ReactDragEvent<HTMLDivElement>) => void;
  onRootDrop: (event: ReactDragEvent<HTMLDivElement>) => void;
  onStructureDragEnd: () => void;
}

const SidebarComponent = ({
  connectionTree,
  expandedFolders,
  draggingItem,
  dropTargetFolder,
  isRootDropTarget,
  dropPosition,
  onNewConnection,
  onConnect,
  onToggleFolder,
  onConnectionContextMenu,
  onSidebarContextMenu,
  onConnectionDragStart,
  onConnectionDragOver,
  onConnectionDragLeave,
  onConnectionDrop,
  onFolderDragStart,
  onFolderDragOver,
  onFolderDrop,
  onRootDragOver,
  onRootDrop,
  onStructureDragEnd
}: SidebarProps) => {
  return (
    <div className="w-64 bg-[#1e293b] border-r border-gray-700 p-4 flex flex-col">
      <div className="flex items-center space-x-3 mb-6">
        <img src={appIcon} alt="SemiTerm ロゴ" className="w-8 h-8 rounded-lg" draggable={false} />
        <div>
          <div className="text-lg font-bold leading-tight">SemiTerm</div>
          <div className="text-xs text-gray-400 leading-tight">Lightweight SSH</div>
        </div>
      </div>
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">接続先</h2>
        <Button variant="ghost" size="icon" onClick={onNewConnection}>
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      <div
        className={`space-y-1 flex-1 overflow-y-auto rounded-md transition-all duration-150 ${
          isRootDropTarget
            ? "bg-blue-500/10 border-2 border-dashed border-blue-400"
            : "border-2 border-transparent"
        }`}
        onContextMenu={onSidebarContextMenu}
        onDragOver={onRootDragOver}
        onDrop={onRootDrop}
      >
        {connectionTree.connections.map(conn => (
          <ConnectionItem
            key={conn.id}
            connection={conn}
            onConnect={onConnect}
            onContextMenu={onConnectionContextMenu}
            draggable
            onDragStart={(event) => onConnectionDragStart(event, conn.id)}
            onDragEnd={onStructureDragEnd}
            onDragOver={(event) => onConnectionDragOver(event, conn.id)}
            onDragLeave={onConnectionDragLeave}
            onDrop={(event) => onConnectionDrop(event, conn.id)}
            isDragging={draggingItem?.type === "connection" && draggingItem.id === conn.id}
            dropPosition={dropPosition}
          />
        ))}
        {connectionTree.children.map(folder => (
          <FolderNode
            key={folder.path}
            node={folder}
            depth={0}
            isExpanded={expandedFolders[folder.path] ?? true}
            draggingItem={draggingItem}
            dropTargetFolder={dropTargetFolder}
            dropPosition={dropPosition}
            onToggle={() => onToggleFolder(folder.path)}
            onConnect={onConnect}
            onConnectionContextMenu={onConnectionContextMenu}
            onSidebarContextMenu={onSidebarContextMenu}
            onFolderDragStart={onFolderDragStart}
            onFolderDragOver={onFolderDragOver}
            onFolderDrop={onFolderDrop}
            onConnectionDragStart={onConnectionDragStart}
            onConnectionDragOver={onConnectionDragOver}
            onConnectionDragLeave={onConnectionDragLeave}
            onConnectionDrop={onConnectionDrop}
            onStructureDragEnd={onStructureDragEnd}
          />
        ))}
      </div>

      <div className="text-xs text-gray-500 mt-4">SemiTerm v0.1.0</div>
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const Sidebar = memo(SidebarComponent, (prevProps, nextProps) => {
  // カスタム比較関数で不要な再レンダリングを防ぐ
  
  // draggingItemの比較
  const draggingItemEqual = (() => {
    if (prevProps.draggingItem === nextProps.draggingItem) return true;
    if (!prevProps.draggingItem || !nextProps.draggingItem) return false;
    if (prevProps.draggingItem.type !== nextProps.draggingItem.type) return false;
    
    if (prevProps.draggingItem.type === 'connection' && nextProps.draggingItem.type === 'connection') {
      return prevProps.draggingItem.id === nextProps.draggingItem.id;
    }
    if (prevProps.draggingItem.type === 'folder' && nextProps.draggingItem.type === 'folder') {
      return prevProps.draggingItem.path === nextProps.draggingItem.path;
    }
    return false;
  })();
  
  // connectionTreeの比較（参照が変わっていなければ同じとみなす）
  const connectionTreeEqual = prevProps.connectionTree === nextProps.connectionTree;
  
  // expandedFoldersの比較（浅い比較）
  const expandedFoldersEqual = (() => {
    const prevKeys = Object.keys(prevProps.expandedFolders);
    const nextKeys = Object.keys(nextProps.expandedFolders);
    if (prevKeys.length !== nextKeys.length) return false;
    return prevKeys.every(key => prevProps.expandedFolders[key] === nextProps.expandedFolders[key]);
  })();
  
  return (
    connectionTreeEqual &&
    expandedFoldersEqual &&
    draggingItemEqual &&
    prevProps.dropTargetFolder === nextProps.dropTargetFolder &&
    prevProps.isRootDropTarget === nextProps.isRootDropTarget &&
    prevProps.dropPosition?.type === nextProps.dropPosition?.type &&
    prevProps.dropPosition?.targetId === nextProps.dropPosition?.targetId
  );
});

Sidebar.displayName = 'Sidebar';

// Made with Bob
