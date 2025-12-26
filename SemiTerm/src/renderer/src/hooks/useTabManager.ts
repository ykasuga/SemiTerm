import { useState, useCallback, useRef } from 'react';
import { Connection, TabItem, TabStatus } from '../types';

export interface UseTabManagerReturn {
  tabs: TabItem[];
  activeTab: string;
  tabConnections: Record<string, Connection>;
  tabStatuses: Record<string, TabStatus>;
  tabSessionTokens: Record<string, number>;
  setActiveTab: (tabId: string) => void;
  openSshTab: (connection: Connection, tabId?: string) => void;
  closeTab: (tabId: string) => void;
  closeTabsByIds: (tabIds: string[]) => void;
  closeOtherTabs: (tabId: string) => void;
  closeTabsToRight: (tabId: string) => void;
  closeAllTabs: () => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;
  updateTabStatus: (tabId: string, status: Partial<TabStatus>) => void;
  setTabConnection: (tabId: string, connection: Connection) => void;
  incrementSessionToken: (tabId: string) => void;
}

export const useTabManager = (
  onStartSshSession: (connection: Connection, tabId: string) => void
): UseTabManagerReturn => {
  const [tabs, setTabs] = useState<TabItem[]>([{ id: "welcome", label: "Welcome" }]);
  const [activeTab, setActiveTab] = useState("welcome");
  const [tabConnections, setTabConnections] = useState<Record<string, Connection>>({});
  const [tabStatuses, setTabStatuses] = useState<Record<string, TabStatus>>({
    welcome: { state: "disconnected" }
  });
  const [tabSessionTokens, setTabSessionTokens] = useState<Record<string, number>>({});
  
  const tabSerialRef = useRef(0);
  const tabLabelSerialRef = useRef(1);

  // タブIDを生成
  const createTabId = useCallback(() => {
    tabSerialRef.current += 1;
    return `ssh-tab-${tabSerialRef.current}`;
  }, []);

  // SSHタブを開く
  const openSshTab = useCallback((connection: Connection, tabId?: string) => {
    const resolvedTabId = tabId || createTabId();
    let assignedSerial: number | null = null;
    
    setTabs((prevTabs) => {
      if (prevTabs.find(tab => tab.id === resolvedTabId)) {
        return prevTabs;
      }
      if (assignedSerial === null) {
        assignedSerial = tabLabelSerialRef.current;
        tabLabelSerialRef.current += 1;
      }
      const serial = assignedSerial;
      const newTab: TabItem = { id: resolvedTabId, label: `${serial} - ${connection.title}` };
      return [...prevTabs, newTab];
    });
    
    setActiveTab(resolvedTabId);
    onStartSshSession(connection, resolvedTabId);
  }, [createTabId, onStartSshSession]);

  // 複数のタブを閉じる
  const closeTabsByIds = useCallback((tabIds: string[]) => {
    const uniqueIds = Array.from(new Set(tabIds));
    if (uniqueIds.length === 0) return;
    
    setTabs((prevTabs) => {
      const toRemove = new Set(uniqueIds);
      if (prevTabs.every((tab) => !toRemove.has(tab.id))) {
        return prevTabs;
      }
      const newTabs = prevTabs.filter(tab => !toRemove.has(tab.id));
      
      if (toRemove.has(activeTab)) {
        const removedIndex = prevTabs.findIndex(tab => tab.id === activeTab);
        const fallbackIndex = newTabs.length === 0
          ? -1
          : Math.min(removedIndex, newTabs.length - 1);
        const fallbackTab = fallbackIndex >= 0 ? newTabs[fallbackIndex] : undefined;
        setActiveTab(fallbackTab ? fallbackTab.id : "");
      }
      
      return newTabs;
    });
    
    setTabStatuses((prev) => {
      const next = { ...prev };
      uniqueIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    
    setTabConnections((prev) => {
      const next = { ...prev };
      uniqueIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    
    setTabSessionTokens((prev) => {
      const next = { ...prev };
      uniqueIds.forEach((id) => {
        delete next[id];
      });
      return next;
    });
    
    uniqueIds.forEach((id) => {
      if (id !== "welcome") {
        window.api.sshClose(id);
      }
    });
  }, [activeTab]);

  // 単一のタブを閉じる
  const closeTab = useCallback((tabId: string) => {
    closeTabsByIds([tabId]);
  }, [closeTabsByIds]);

  // 他のタブを閉じる
  const closeOtherTabs = useCallback((tabId: string) => {
    const otherIds = tabs.filter((tab) => tab.id !== tabId).map((tab) => tab.id);
    closeTabsByIds(otherIds);
  }, [tabs, closeTabsByIds]);

  // 右側のタブを閉じる
  const closeTabsToRight = useCallback((tabId: string) => {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    const idsToClose = tabs.slice(index + 1).map((tab) => tab.id);
    closeTabsByIds(idsToClose);
  }, [tabs, closeTabsByIds]);

  // すべてのタブを閉じる
  const closeAllTabs = useCallback(() => {
    closeTabsByIds(tabs.map((tab) => tab.id));
  }, [tabs, closeTabsByIds]);

  // タブを並び替え
  const reorderTabs = useCallback((fromIndex: number, toIndex: number) => {
    setTabs((prevTabs) => {
      const newTabs = [...prevTabs];
      const [movedTab] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, movedTab);
      return newTabs;
    });
  }, []);

  // タブステータスを更新
  const updateTabStatus = useCallback((tabId: string, status: Partial<TabStatus>) => {
    setTabStatuses((prev) => ({
      ...prev,
      [tabId]: {
        ...(prev[tabId] || { state: "disconnected" }),
        ...status
      }
    }));
  }, []);

  // タブの接続情報を設定
  const setTabConnection = useCallback((tabId: string, connection: Connection) => {
    setTabConnections((prev) => ({
      ...prev,
      [tabId]: connection
    }));
  }, []);

  // セッショントークンをインクリメント
  const incrementSessionToken = useCallback((tabId: string) => {
    setTabSessionTokens((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] ?? 0) + 1
    }));
  }, []);

  return {
    tabs,
    activeTab,
    tabConnections,
    tabStatuses,
    tabSessionTokens,
    setActiveTab,
    openSshTab,
    closeTab,
    closeTabsByIds,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    reorderTabs,
    updateTabStatus,
    setTabConnection,
    incrementSessionToken
  };
};

// Made with Bob
