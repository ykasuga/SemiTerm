import { FolderPlus } from 'lucide-react';

interface ListContextMenuProps {
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement>;
  onAddFolder: () => void;
}

export function ListContextMenu({
  position,
  menuRef,
  onAddFolder
}: ListContextMenuProps) {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      <div
        ref={menuRef}
        className="absolute pointer-events-auto w-48 bg-[#1e293b] border border-gray-700 rounded-md shadow-lg py-1"
        style={{ top: position.y, left: position.x }}
      >
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center space-x-2"
          onClick={onAddFolder}
        >
          <FolderPlus className="w-4 h-4" />
          <span>フォルダを追加</span>
        </button>
      </div>
    </div>
  );
}

// Made with Bob
