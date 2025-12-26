import { useEffect } from 'react';
import { Connection, TabItem } from '../types';

export interface UseKeyboardShortcutsProps {
  tabs: TabItem[];
  activeTab: string;
  tabConnections: Record<string, Connection>;
  setActiveTab: (tabId: string) => void;
  closeTab: (tabId: string) => void;
  openNewConnectionEditor: () => void;
  startSshSession: (connection: Connection, tabId: string) => void;
}

export const useKeyboardShortcuts = ({
  tabs,
  activeTab,
  tabConnections,
  setActiveTab,
  closeTab,
  openNewConnectionEditor,
  startSshSession
}: UseKeyboardShortcutsProps): void => {
  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed) return;

      // Cmd/Ctrl+Tab: タブ切り替え
      if (event.key === "Tab") {
        event.preventDefault();
        event.stopPropagation();
        if (!tabs.length) return;
        const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
        const safeIndex = currentIndex === -1 ? 0 : currentIndex;
        const direction = event.shiftKey ? -1 : 1;
        const nextIndex = (safeIndex + direction + tabs.length) % tabs.length;
        setActiveTab(tabs[nextIndex].id);
        return;
      }

      const key = event.key.toLowerCase();

      // Cmd/Ctrl+W: タブを閉じる
      if (key === "w") {
        event.preventDefault();
        event.stopPropagation();
        closeTab(activeTab);
        return;
      }

      // Cmd/Ctrl+T: 新規接続
      if (key === "t") {
        event.preventDefault();
        event.stopPropagation();
        openNewConnectionEditor();
        return;
      }

      // Cmd/Ctrl+R: 再接続
      if (key === "r") {
        if (activeTab === "welcome") return;
        const connection = tabConnections[activeTab];
        if (connection) {
          event.preventDefault();
          event.stopPropagation();
          startSshSession(connection, activeTab);
        }
      }
    };

    window.addEventListener("keydown", handleKeydown, true);
    return () => {
      window.removeEventListener("keydown", handleKeydown, true);
    };
  }, [activeTab, tabs, tabConnections, setActiveTab, closeTab, openNewConnectionEditor, startSshSession]);
};

// Made with Bob
