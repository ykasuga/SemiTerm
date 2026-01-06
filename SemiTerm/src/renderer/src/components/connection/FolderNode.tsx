import { memo } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { ChevronRight, Folder, FolderOpen } from 'lucide-react';
import { Connection, DragItem, DropPosition } from '../../types';
import { ConnectionFolderNode } from '../../utils/connectionTreeUtils';
import { ConnectionItem } from './ConnectionItem';
import { DropIndicator } from './DropIndicator';

interface FolderNodeProps {
  node: ConnectionFolderNode;
  depth: number;
  isExpanded: boolean;
  draggingItem: DragItem | null;
  dropTargetFolder: string | null;
  dropPosition: DropPosition;
  onToggle: () => void;
  onConnect: (connection: Connection) => void;
  onConnectionContextMenu: (event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => void;
  onSidebarContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  onFolderDragStart: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  onFolderDragOver: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  onFolderDrop: (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => void;
  onConnectionDragStart: (event: ReactDragEvent<HTMLDivElement>, connectionId: string) => void;
  onConnectionDragOver: (event: ReactDragEvent<HTMLDivElement>, connectionId: string) => void;
  onConnectionDragLeave: () => void;
  onConnectionDrop: (event: ReactDragEvent<HTMLDivElement>, targetConnectionId: string) => void;
  onStructureDragEnd: () => void;
}

const FolderNodeComponent = ({
  node,
  depth,
  isExpanded,
  draggingItem,
  dropTargetFolder,
  dropPosition,
  onToggle,
  onConnect,
  onConnectionContextMenu,
  onSidebarContextMenu,
  onFolderDragStart,
  onFolderDragOver,
  onFolderDrop,
  onConnectionDragStart,
  onConnectionDragOver,
  onConnectionDragLeave,
  onConnectionDrop,
  onStructureDragEnd
}: FolderNodeProps) => {
  // 無効なドロップターゲットかどうかを判定
  const isInvalidDropTarget = draggingItem?.type === "folder" &&
    (node.path === draggingItem.path || node.path.startsWith(`${draggingItem.path}/`));

  return (
    <div className="space-y-1">
      <div className="relative">
        {dropPosition?.type === 'before' && dropPosition.targetId === node.path && (
          <DropIndicator position="before" />
        )}
        
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer text-gray-200 transition-all duration-150 ${
            dropTargetFolder === node.path
              ? "bg-blue-500/20 border-2 border-blue-400 ring-2 ring-blue-400/50"
              : "border-2 border-transparent hover:bg-gray-700"
          } ${
            isInvalidDropTarget
              ? "opacity-40 cursor-not-allowed bg-red-500/10"
              : ""
          } ${
            draggingItem?.type === "folder" && draggingItem.path === node.path
              ? "opacity-60"
              : ""
          }`}
          style={{ marginLeft: depth * 16 }}
          onClick={onToggle}
          onContextMenu={onSidebarContextMenu}
          draggable
          onDragStart={(event) => onFolderDragStart(event, node.path)}
          onDragEnd={onStructureDragEnd}
          onDragOver={(event) => onFolderDragOver(event, node.path)}
          onDrop={(event) => onFolderDrop(event, node.path)}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-gray-300" />
          ) : (
            <Folder className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        
        {dropPosition?.type === 'after' && dropPosition.targetId === node.path && (
          <DropIndicator position="after" />
        )}
      </div>
      
      {isExpanded && (
        <div
          className="space-y-1"
          onDragOver={(event) => onFolderDragOver(event, node.path)}
          onDrop={(event) => onFolderDrop(event, node.path)}
        >
          {node.connections.map((conn) => (
            <ConnectionItem
              key={conn.id}
              connection={conn}
              onConnect={onConnect}
              onContextMenu={onConnectionContextMenu}
              depth={depth + 1}
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
          {node.children.map((child) => (
            <FolderNode
              key={child.path}
              node={child}
              depth={depth + 1}
              isExpanded={isExpanded}
              draggingItem={draggingItem}
              dropTargetFolder={dropTargetFolder}
              dropPosition={dropPosition}
              onToggle={onToggle}
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
      )}
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const FolderNode = memo(FolderNodeComponent, (prevProps, nextProps) => {
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
  
  return (
    prevProps.node.path === nextProps.node.path &&
    prevProps.node.name === nextProps.node.name &&
    prevProps.node.connections.length === nextProps.node.connections.length &&
    prevProps.node.children.length === nextProps.node.children.length &&
    prevProps.depth === nextProps.depth &&
    prevProps.isExpanded === nextProps.isExpanded &&
    draggingItemEqual &&
    prevProps.dropTargetFolder === nextProps.dropTargetFolder &&
    prevProps.dropPosition?.type === nextProps.dropPosition?.type &&
    prevProps.dropPosition?.targetId === nextProps.dropPosition?.targetId
  );
});

FolderNode.displayName = 'FolderNode';

// Made with Bob
