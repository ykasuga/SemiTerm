import { useState, useCallback, useRef, useEffect } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { Connection, ContextMenuState, TabContextMenuState, ListContextMenuState } from '../types';
import { calculateMenuPosition } from '../utils/contextMenuUtils';

export interface UseContextMenuReturn {
  contextMenuState: ContextMenuState | null;
  tabContextMenuState: TabContextMenuState | null;
  listContextMenuState: ListContextMenuState | null;
  contextMenuRef: React.RefObject<HTMLDivElement>;
  tabContextMenuRef: React.RefObject<HTMLDivElement>;
  listContextMenuRef: React.RefObject<HTMLDivElement>;
  handleConnectionContextMenu: (event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => void;
  handleTabContextMenu: (event: ReactMouseEvent<HTMLButtonElement>, tabId: string) => void;
  handleSidebarContextMenu: (event: ReactMouseEvent<HTMLElement>) => void;
  closeContextMenu: () => void;
  closeTabContextMenu: () => void;
  closeListContextMenu: () => void;
}

export const useContextMenu = (): UseContextMenuReturn => {
  const [contextMenuState, setContextMenuState] = useState<ContextMenuState | null>(null);
  const [tabContextMenuState, setTabContextMenuState] = useState<TabContextMenuState | null>(null);
  const [listContextMenuState, setListContextMenuState] = useState<ListContextMenuState | null>(null);
  
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const tabContextMenuRef = useRef<HTMLDivElement | null>(null);
  const listContextMenuRef = useRef<HTMLDivElement | null>(null);

  // 接続のコンテキストメニューを開く
  const handleConnectionContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => {
    event.preventDefault();
    event.stopPropagation();
    setListContextMenuState(null);
    
    const menuWidth = 200;
    const menuHeight = 100;
    const { x, y } = calculateMenuPosition(event, menuWidth, menuHeight);
    
    setContextMenuState({ connection, x, y });
  }, []);

  // タブのコンテキストメニューを開く
  const handleTabContextMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>, tabId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setListContextMenuState(null);
    
    const menuWidth = 220;
    const menuHeight = 160;
    const { x, y } = calculateMenuPosition(event, menuWidth, menuHeight);
    
    setTabContextMenuState({ tabId, x, y });
  }, []);

  // サイドバーのコンテキストメニューを開く
  const handleSidebarContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuState(null);
    setTabContextMenuState(null);
    
    const menuWidth = 220;
    const menuHeight = 60;
    const { x, y } = calculateMenuPosition(event, menuWidth, menuHeight);
    
    setListContextMenuState({ x, y });
  }, []);

  // コンテキストメニューを閉じる
  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const closeTabContextMenu = useCallback(() => {
    setTabContextMenuState(null);
  }, []);

  const closeListContextMenu = useCallback(() => {
    setListContextMenuState(null);
  }, []);

  // 外部クリックでメニューを閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
      if (tabContextMenuRef.current && !tabContextMenuRef.current.contains(event.target as Node)) {
        closeTabContextMenu();
      }
      if (listContextMenuRef.current && !listContextMenuRef.current.contains(event.target as Node)) {
        closeListContextMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [closeContextMenu, closeTabContextMenu, closeListContextMenu]);

  return {
    contextMenuState,
    tabContextMenuState,
    listContextMenuState,
    contextMenuRef,
    tabContextMenuRef,
    listContextMenuRef,
    handleConnectionContextMenu,
    handleTabContextMenu,
    handleSidebarContextMenu,
    closeContextMenu,
    closeTabContextMenu,
    closeListContextMenu
  };
};

// Made with Bob
