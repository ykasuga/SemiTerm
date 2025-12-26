import { TabItem } from '../../types';

interface TabContextMenuProps {
  tabId: string;
  tabs: TabItem[];
  position: { x: number; y: number };
  menuRef: React.RefObject<HTMLDivElement>;
  onCloseTab: () => void;
  onCloseOthers: () => void;
  onCloseToRight: () => void;
  onCloseAll: () => void;
}

export function TabContextMenu({
  tabId,
  tabs,
  position,
  menuRef,
  onCloseTab,
  onCloseOthers,
  onCloseToRight,
  onCloseAll
}: TabContextMenuProps) {
  const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
  const tabsToRight = tabIndex === -1 ? [] : tabs.slice(tabIndex + 1);
  const otherTabs = tabs.filter((tab) => tab.id !== tabId);
  
  const closeDisabled = tabIndex === -1;
  const closeAllDisabled = tabs.length === 0;
  const closeRightDisabled = tabsToRight.length === 0;
  const closeOthersDisabled = otherTabs.length === 0;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      <div
        ref={menuRef}
        className="absolute pointer-events-auto w-56 bg-[#1e293b] border border-gray-700 rounded-md shadow-lg py-1"
        style={{ top: position.y, left: position.x }}
      >
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={closeDisabled}
          onClick={onCloseTab}
        >
          タブを閉じる
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={closeAllDisabled}
          onClick={onCloseAll}
        >
          全てのタブを閉じる
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={closeRightDisabled}
          onClick={onCloseToRight}
        >
          右のタブを閉じる
        </button>
        <button
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
          disabled={closeOthersDisabled}
          onClick={onCloseOthers}
        >
          他のタブを閉じる
        </button>
      </div>
    </div>
  );
}

// Made with Bob
