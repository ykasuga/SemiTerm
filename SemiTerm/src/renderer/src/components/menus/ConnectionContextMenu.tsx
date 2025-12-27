import { Pencil, Trash2 } from 'lucide-react';
import { Connection } from '../../types';

interface ConnectionContextMenuProps {
  connection: Connection;
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement>;
  onEdit: () => void;
  onDelete: () => void;
}

export function ConnectionContextMenu({
  connection: _connection,
  position,
  menuRef,
  onEdit,
  onDelete
}: ConnectionContextMenuProps) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={menuRef}
        className="absolute pointer-events-auto w-48 bg-[#1e293b] border border-gray-700 rounded-md shadow-lg py-1"
        style={{ top: position.y, left: position.x }}
      >
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center space-x-2"
          onClick={onEdit}
        >
          <Pencil className="w-4 h-4" />
          <span>編集</span>
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center space-x-2 text-red-400"
          onClick={onDelete}
        >
          <Trash2 className="w-4 h-4" />
          <span>削除</span>
        </button>
      </div>
    </div>
  );
}

// Made with Bob
