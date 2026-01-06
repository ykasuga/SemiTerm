import { memo } from 'react';
import type { DragEvent as ReactDragEvent, MouseEvent as ReactMouseEvent } from 'react';
import { Server } from 'lucide-react';
import { Connection, DropPosition } from '../../types';
import { DropIndicator } from './DropIndicator';

interface ConnectionItemProps {
  connection: Connection;
  onConnect: (connection: Connection) => void;
  onContextMenu: (event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => void;
  depth?: number;
  draggable?: boolean;
  onDragStart?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragEnd?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: ReactDragEvent<HTMLDivElement>) => void;
  onDragLeave?: () => void;
  onDrop?: (event: ReactDragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  dropPosition?: DropPosition;
}

const ConnectionItemComponent = ({
  connection,
  onConnect,
  onContextMenu,
  depth = 0,
  draggable = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragging = false,
  dropPosition = null
}: ConnectionItemProps) => {
  return (
    <div className="relative">
      {dropPosition?.type === 'before' && dropPosition.targetId === connection.id && (
        <DropIndicator position="before" />
      )}
      
      <div
        className={`py-2 px-3 group hover:bg-gray-700 rounded-md cursor-pointer flex items-center gap-3 transition-all duration-150 ${
          isDragging
            ? "opacity-40 scale-95 ring-2 ring-blue-400 bg-blue-500/10"
            : ""
        }`}
        style={{ marginLeft: depth * 16 }}
        draggable={draggable}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => onConnect(connection)}
        onContextMenu={(event) => onContextMenu(event, connection)}
      >
        <Server className="w-5 h-5 text-gray-400" />
        <div className="flex-1 leading-tight">
          <div className="font-medium text-gray-100 text-sm truncate">{connection.name}</div>
          <div className="text-gray-400 text-xs">{connection.username}@{connection.host}</div>
        </div>
      </div>
      
      {dropPosition?.type === 'after' && dropPosition.targetId === connection.id && (
        <DropIndicator position="after" />
      )}
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const ConnectionItem = memo(ConnectionItemComponent, (prevProps, nextProps) => {
  // カスタム比較関数で不要な再レンダリングを防ぐ
  return (
    prevProps.connection.id === nextProps.connection.id &&
    prevProps.connection.name === nextProps.connection.name &&
    prevProps.connection.username === nextProps.connection.username &&
    prevProps.connection.host === nextProps.connection.host &&
    prevProps.depth === nextProps.depth &&
    prevProps.draggable === nextProps.draggable &&
    prevProps.isDragging === nextProps.isDragging &&
    prevProps.dropPosition?.type === nextProps.dropPosition?.type &&
    prevProps.dropPosition?.targetId === nextProps.dropPosition?.targetId
  );
});

ConnectionItem.displayName = 'ConnectionItem';

// Made with Bob
