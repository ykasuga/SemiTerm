import React, { useCallback } from 'react';
import { TabsList, TabsTrigger } from '@renderer/components/ui/tabs';
import { CloseButton } from '../ui/CloseButton';

interface Tab {
  id: string;
  label: string;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  draggingTabId: string | null;
  dragOverTabId: string | null;
  onTabDragStart: (event: React.DragEvent<HTMLButtonElement>, tabId: string) => void;
  onTabDragOver: (event: React.DragEvent<HTMLButtonElement>) => void;
  onTabDragEnter: (tabId: string) => void;
  onTabDrop: (event: React.DragEvent<HTMLButtonElement>, tabId: string) => void;
  onTabDragEnd: () => void;
  onTabClose: (e: React.MouseEvent, tabId: string) => void;
  onTabContextMenu: (event: React.MouseEvent<HTMLButtonElement>, tabId: string) => void;
}

export const TabBar = React.memo<TabBarProps>(({
  tabs,
  draggingTabId,
  dragOverTabId,
  onTabDragStart,
  onTabDragOver,
  onTabDragEnter,
  onTabDrop,
  onTabDragEnd,
  onTabClose,
  onTabContextMenu
}) => {
  const getTabClassName = useCallback((tabId: string) => {
    const baseClass = "h-full shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-700";
    const dragOverClass = dragOverTabId === tabId && draggingTabId !== tabId ? "border-blue-400" : "";
    const draggingClass = draggingTabId === tabId ? "opacity-60" : "";
    return `${baseClass} ${dragOverClass} ${draggingClass}`;
  }, [dragOverTabId, draggingTabId]);

  return (
    <div className="h-12 bg-[#1e293b] border-b border-gray-700 flex items-center px-4 overflow-hidden">
      <div className="w-full h-full overflow-x-auto overflow-y-hidden scrollable-tabs">
        <TabsList className="bg-transparent h-full p-0 flex-nowrap w-max">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              draggable
              onDragStart={(event) => onTabDragStart(event, tab.id)}
              onDragOver={onTabDragOver}
              onDragEnter={() => onTabDragEnter(tab.id)}
              onDrop={(event) => onTabDrop(event, tab.id)}
              onDragEnd={onTabDragEnd}
              className={getTabClassName(tab.id)}
              onContextMenu={(event) => onTabContextMenu(event, tab.id)}
            >
              <span className="mr-2">{tab.label}</span>
              <CloseButton
                onClick={(e) => onTabClose(e, tab.id)}
                ariaLabel="タブを閉じる"
              />
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.tabs === nextProps.tabs &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.draggingTabId === nextProps.draggingTabId &&
    prevProps.dragOverTabId === nextProps.dragOverTabId
  );
});

TabBar.displayName = 'TabBar';

// Made with Bob
