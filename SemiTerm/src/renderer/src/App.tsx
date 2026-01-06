import { useState, useCallback } from "react";
import { Tabs } from "@renderer/components/ui/tabs";
import { Connection } from "./types";
import ConnectionEditor from "./ConnectionEditor";

// カスタムフックのインポート
import { useConnections } from "./hooks/useConnections";
import { useTabManager } from "./hooks/useTabManager";
import { useSshSession } from "./hooks/useSshSession";
import { useDragAndDrop } from "./hooks/useDragAndDrop";
import { useContextMenu } from "./hooks/useContextMenu";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useFolderDialog } from "./hooks/useFolderDialog";
import { usePasswordPrompt } from "./hooks/usePasswordPrompt";

// コンポーネントのインポート
import { Sidebar } from "./components/layout/Sidebar";
import { StatusBar } from "./components/layout/StatusBar";
import { TabBar } from "./components/layout/TabBar";
import { TabContentArea } from "./components/layout/TabContentArea";
import { ConnectionContextMenu } from "./components/menus/ConnectionContextMenu";
import { TabContextMenu } from "./components/menus/TabContextMenu";
import { ListContextMenu } from "./components/menus/ListContextMenu";
import { FolderDialog } from "./components/dialogs/FolderDialog";
import { PasswordPromptDialog } from "./components/dialogs/PasswordPromptDialog";

export default function App() {
  // エディター状態
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);

  // 接続管理フック
  const {
    connections,
    folders,
    folderInfos,
    expandedFolders,
    connectionTree,
    applyConnectionState,
    moveConnectionToFolder,
    moveFolderToTarget,
    handleSaveConnection: saveConnection,
    handleDeleteConnection: deleteConnection,
    toggleFolder
  } = useConnections();

  // タブ管理フック（SSH セッション開始関数は後で渡す）
  const tabManager = useTabManager((connection: Connection, tabId: string) => {
    // この関数はsshSessionが定義された後に実際の処理を行う
    sshSession.startSshSession(connection, tabId);
  });

  const {
    tabs,
    activeTab,
    tabConnections,
    tabStatuses,
    tabSessionTokens,
    setActiveTab,
    openSshTab,
    closeTab,
    closeOtherTabs,
    closeTabsToRight,
    closeAllTabs,
    reorderTabs: reorderTabsByIndex,
    updateTabStatus,
    setTabConnection,
    incrementSessionToken
  } = tabManager;

  // SSH セッション管理フック
  const sshSession = useSshSession(
    setTabConnection,
    updateTabStatus,
    incrementSessionToken
  );

  // ドラッグ&ドロップフック
  const dragAndDrop = useDragAndDrop(
    connections,
    folders,
    folderInfos,
    moveConnectionToFolder,
    moveFolderToTarget,
    applyConnectionState,
    reorderTabsByIndex,
    tabs
  );

  // コンテキストメニューフック
  const contextMenu = useContextMenu();

  // フォルダダイアログフック
  const folderDialog = useFolderDialog(applyConnectionState);

  // パスワードプロンプトフック
  const passwordPrompt = usePasswordPrompt(openSshTab, () => {
    // connectionsの更新は不要（メモリ内のみで使用）
  });

  // キーボードショートカットフック
  useKeyboardShortcuts({
    tabs,
    activeTab,
    tabConnections,
    setActiveTab,
    closeTab,
    openNewConnectionEditor: () => setEditorOpen(true),
    startSshSession: (connection: Connection, tabId: string) => {
      openSshTab(connection, tabId);
    }
  });

  // エディター関連のハンドラー（メモ化）
  const openNewConnectionEditor = useCallback(() => {
    setEditingConnection(null);
    setEditorOpen(true);
  }, []);

  const openEditConnectionEditor = useCallback((connection: Connection) => {
    setEditingConnection(connection);
    setEditorOpen(true);
  }, []);

  const handleSaveConnection = useCallback(async (connection: Connection) => {
    await saveConnection(connection);
    setEditorOpen(false);
    setEditingConnection(null);
  }, [saveConnection]);

  // コンテキストメニューハンドラー（メモ化）
  const handleEditConnection = useCallback(() => {
    if (contextMenu.contextMenuState) {
      openEditConnectionEditor(contextMenu.contextMenuState.connection);
      contextMenu.closeContextMenu();
    }
  }, [contextMenu.contextMenuState, openEditConnectionEditor, contextMenu]);

  const handleDeleteConnection = useCallback(() => {
    if (contextMenu.contextMenuState) {
      contextMenu.closeContextMenu();
      deleteConnection(contextMenu.contextMenuState.connection.id);
    }
  }, [contextMenu.contextMenuState, contextMenu, deleteConnection]);

  const handleAddFolder = useCallback(() => {
    contextMenu.closeListContextMenu();
    folderDialog.openFolderDialog();
  }, [contextMenu, folderDialog]);

  // タブコンテキストメニューハンドラー（メモ化）
  const handleCloseTab = useCallback(() => {
    if (contextMenu.tabContextMenuState) {
      closeTab(contextMenu.tabContextMenuState.tabId);
      contextMenu.closeTabContextMenu();
    }
  }, [contextMenu.tabContextMenuState, closeTab, contextMenu]);

  const handleCloseOtherTabs = useCallback(() => {
    if (contextMenu.tabContextMenuState) {
      closeOtherTabs(contextMenu.tabContextMenuState.tabId);
      contextMenu.closeTabContextMenu();
    }
  }, [contextMenu.tabContextMenuState, closeOtherTabs, contextMenu]);

  const handleCloseTabsToRight = useCallback(() => {
    if (contextMenu.tabContextMenuState) {
      closeTabsToRight(contextMenu.tabContextMenuState.tabId);
      contextMenu.closeTabContextMenu();
    }
  }, [contextMenu.tabContextMenuState, closeTabsToRight, contextMenu]);

  const handleCloseAllTabs = useCallback(() => {
    closeAllTabs();
    contextMenu.closeTabContextMenu();
  }, [closeAllTabs, contextMenu]);

  // 再接続ハンドラー（メモ化）
  const handleReconnect = useCallback((tabId: string) => {
    const connection = tabConnections[tabId];
    if (connection) {
      openSshTab(connection, tabId);
    }
  }, [tabConnections, openSshTab]);

  // タブドラッグハンドラー（メモ化）
  const handleTabDragStart = useCallback((event: React.DragEvent<HTMLButtonElement>, tabId: string) => {
    dragAndDrop.handleTabDragStart(event, tabId);
  }, [dragAndDrop]);

  const handleTabDragOver = useCallback((event: React.DragEvent<HTMLButtonElement>) => {
    if (!dragAndDrop.draggingTabId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, [dragAndDrop.draggingTabId]);

  const handleTabDragEnter = useCallback((tabId: string) => {
    if (dragAndDrop.draggingTabId && dragAndDrop.draggingTabId !== tabId) {
      dragAndDrop.setDragOverTabId(tabId);
    }
  }, [dragAndDrop]);

  const handleTabDrop = useCallback((event: React.DragEvent<HTMLButtonElement>, tabId: string) => {
    event.preventDefault();
    dragAndDrop.handleTabDrop(tabId);
  }, [dragAndDrop]);

  const handleTabClose = useCallback((e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  }, [closeTab]);

  return (
    <div className="flex w-screen h-screen bg-[#0f172a] text-white">
      {/* Sidebar */}
      <Sidebar
        connectionTree={connectionTree}
        expandedFolders={expandedFolders}
        draggingItem={dragAndDrop.draggingItem}
        dropTargetFolder={dragAndDrop.dropTargetFolder}
        isRootDropTarget={dragAndDrop.isRootDropTarget}
        dropPosition={dragAndDrop.dropPosition}
        onNewConnection={openNewConnectionEditor}
        onConnect={passwordPrompt.handleConnectRequest}
        onToggleFolder={toggleFolder}
        onConnectionContextMenu={contextMenu.handleConnectionContextMenu}
        onSidebarContextMenu={contextMenu.handleSidebarContextMenu}
        onConnectionDragStart={dragAndDrop.handleConnectionDragStart}
        onConnectionDragOver={dragAndDrop.handleConnectionDragOver}
        onConnectionDragLeave={dragAndDrop.handleConnectionDragLeave}
        onConnectionDrop={dragAndDrop.handleConnectionDrop}
        onFolderDragStart={dragAndDrop.handleFolderDragStart}
        onFolderDragOver={dragAndDrop.handleFolderDragOver}
        onFolderDrop={dragAndDrop.handleFolderDrop}
        onRootDragOver={dragAndDrop.handleRootDragOver}
        onRootDrop={dragAndDrop.handleRootDrop}
        onStructureDragEnd={dragAndDrop.handleStructureDragEnd}
      />

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        {/* Tab Bar */}
        <TabBar
          tabs={tabs}
          activeTab={activeTab}
          draggingTabId={dragAndDrop.draggingTabId}
          dragOverTabId={dragAndDrop.dragOverTabId}
          onTabDragStart={handleTabDragStart}
          onTabDragOver={handleTabDragOver}
          onTabDragEnter={handleTabDragEnter}
          onTabDrop={handleTabDrop}
          onTabDragEnd={dragAndDrop.resetTabDragState}
          onTabClose={handleTabClose}
          onTabContextMenu={contextMenu.handleTabContextMenu}
        />

        {/* Tab Content */}
        <TabContentArea
          tabs={tabs}
          activeTab={activeTab}
          tabStatuses={tabStatuses}
          tabSessionTokens={tabSessionTokens}
          onNewConnection={openNewConnectionEditor}
          onCloseTab={closeTab}
          onReconnect={handleReconnect}
        />

        {/* Status Bar */}
        <StatusBar status={tabStatuses[activeTab]} />
      </Tabs>

      {/* Context Menus */}
      {contextMenu.contextMenuState && (
        <ConnectionContextMenu
          connection={contextMenu.contextMenuState.connection}
          position={{ x: contextMenu.contextMenuState.x, y: contextMenu.contextMenuState.y }}
          menuRef={contextMenu.contextMenuRef}
          onEdit={handleEditConnection}
          onDelete={handleDeleteConnection}
        />
      )}

      {contextMenu.listContextMenuState && (
        <ListContextMenu
          position={{ x: contextMenu.listContextMenuState.x, y: contextMenu.listContextMenuState.y }}
          menuRef={contextMenu.listContextMenuRef}
          onAddFolder={handleAddFolder}
        />
      )}

      {contextMenu.tabContextMenuState && (
        <TabContextMenu
          tabId={contextMenu.tabContextMenuState.tabId}
          position={{ x: contextMenu.tabContextMenuState.x, y: contextMenu.tabContextMenuState.y }}
          tabs={tabs}
          menuRef={contextMenu.tabContextMenuRef}
          onCloseTab={handleCloseTab}
          onCloseOthers={handleCloseOtherTabs}
          onCloseToRight={handleCloseTabsToRight}
          onCloseAll={handleCloseAllTabs}
        />
      )}

      {/* Dialogs */}
      {folderDialog.isFolderDialogOpen && (
        <FolderDialog
          isOpen={folderDialog.isFolderDialogOpen}
          folderName={folderDialog.folderNameInput}
          onFolderNameChange={folderDialog.setFolderNameInput}
          onConfirm={folderDialog.handleCreateFolder}
          onCancel={folderDialog.closeFolderDialog}
        />
      )}

      {isEditorOpen && (
        <ConnectionEditor
          connection={editingConnection}
          onSave={handleSaveConnection}
          onCancel={() => setEditorOpen(false)}
        />
      )}

      {passwordPrompt.pendingConnection && (
        <PasswordPromptDialog
          connection={passwordPrompt.pendingConnection}
          password={passwordPrompt.passwordInput}
          onPasswordChange={passwordPrompt.setPasswordInput}
          onConfirm={passwordPrompt.confirmPasswordAndConnect}
          onCancel={passwordPrompt.closePasswordPrompt}
        />
      )}
    </div>
  );
}

// Made with Bob
