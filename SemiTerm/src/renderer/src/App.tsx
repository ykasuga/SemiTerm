import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@renderer/components/ui/tabs";
import { Connection } from "./types";
import ConnectionEditor from "./ConnectionEditor";
import TerminalComponent from "./Terminal";

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
import { WelcomeScreen } from "./components/screens/WelcomeScreen";
import { ErrorScreen } from "./components/screens/ErrorScreen";
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

  // エディター関連のハンドラー
  const openNewConnectionEditor = () => {
    setEditingConnection(null);
    setEditorOpen(true);
  };

  const openEditConnectionEditor = (connection: Connection) => {
    setEditingConnection(connection);
    setEditorOpen(true);
  };

  const handleSaveConnection = async (connection: Connection) => {
    await saveConnection(connection);
    setEditorOpen(false);
    setEditingConnection(null);
  };

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
        <div className="h-12 bg-[#1e293b] border-b border-gray-700 flex items-center px-4 overflow-hidden">
          <div className="w-full h-full overflow-x-auto overflow-y-hidden scrollable-tabs">
            <TabsList className="bg-transparent h-full p-0 flex-nowrap w-max">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  draggable
                  onDragStart={(event) => dragAndDrop.handleTabDragStart(event, tab.id)}
                  onDragOver={(event) => {
                    if (!dragAndDrop.draggingTabId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={() => {
                    if (dragAndDrop.draggingTabId && dragAndDrop.draggingTabId !== tab.id) {
                      dragAndDrop.setDragOverTabId(tab.id);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    dragAndDrop.handleTabDrop(tab.id);
                  }}
                  onDragEnd={dragAndDrop.resetTabDragState}
                  className={`h-full shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-700 ${
                    dragAndDrop.dragOverTabId === tab.id && dragAndDrop.draggingTabId !== tab.id ? "border-blue-400" : ""
                  } ${dragAndDrop.draggingTabId === tab.id ? "opacity-60" : ""}`}
                  onContextMenu={(event) => contextMenu.handleTabContextMenu(event, tab.id)}
                >
                  <span className="mr-2">{tab.label}</span>
                  <button
                    className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                    aria-label="タブを閉じる"
                  >
                    <span className="text-xs">×</span>
                  </button>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 bg-[#0f172a] overflow-y-hidden relative">
          {tabs.map((tab) => (
            <TabsContent
              key={tab.id}
              value={tab.id}
              forceMount
              className="h-full p-0 m-0"
              style={{ display: 'block' }}
            >
              <div
                className={`absolute inset-0 transition-opacity duration-150 ${
                  activeTab === tab.id ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                {tab.id === "welcome" ? (
                  <WelcomeScreen onNewConnection={openNewConnectionEditor} />
                ) : tabStatuses[tab.id]?.state === "error" ? (
                  <ErrorScreen
                    errorMessage={tabStatuses[tab.id]?.errorMessage || '接続に失敗しました。'}
                    onClose={() => closeTab(tab.id)}
                    onReconnect={() => {
                      const connection = tabConnections[tab.id];
                      if (connection) {
                        openSshTab(connection, tab.id);
                      }
                    }}
                  />
                ) : (
                  <TerminalComponent
                    connectionId={tab.id}
                    isActive={activeTab === tab.id}
                    resetToken={tabSessionTokens[tab.id] ?? 0}
                  />
                )}
              </div>
            </TabsContent>
          ))}
        </div>

        {/* Status Bar */}
        <StatusBar status={tabStatuses[activeTab]} />
      </Tabs>

      {/* Context Menus */}
      {contextMenu.contextMenuState && (
        <ConnectionContextMenu
          connection={contextMenu.contextMenuState.connection}
          position={{ x: contextMenu.contextMenuState.x, y: contextMenu.contextMenuState.y }}
          menuRef={contextMenu.contextMenuRef}
          onEdit={() => {
            openEditConnectionEditor(contextMenu.contextMenuState!.connection);
            contextMenu.closeContextMenu();
          }}
          onDelete={() => {
            contextMenu.closeContextMenu();
            deleteConnection(contextMenu.contextMenuState!.connection.id);
          }}
        />
      )}

      {contextMenu.listContextMenuState && (
        <ListContextMenu
          position={{ x: contextMenu.listContextMenuState.x, y: contextMenu.listContextMenuState.y }}
          menuRef={contextMenu.listContextMenuRef}
          onAddFolder={() => {
            contextMenu.closeListContextMenu();
            folderDialog.openFolderDialog();
          }}
        />
      )}

      {contextMenu.tabContextMenuState && (
        <TabContextMenu
          tabId={contextMenu.tabContextMenuState.tabId}
          position={{ x: contextMenu.tabContextMenuState.x, y: contextMenu.tabContextMenuState.y }}
          tabs={tabs}
          menuRef={contextMenu.tabContextMenuRef}
          onCloseTab={() => {
            closeTab(contextMenu.tabContextMenuState!.tabId);
            contextMenu.closeTabContextMenu();
          }}
          onCloseOthers={() => {
            closeOtherTabs(contextMenu.tabContextMenuState!.tabId);
            contextMenu.closeTabContextMenu();
          }}
          onCloseToRight={() => {
            closeTabsToRight(contextMenu.tabContextMenuState!.tabId);
            contextMenu.closeTabContextMenu();
          }}
          onCloseAll={() => {
            closeAllTabs();
            contextMenu.closeTabContextMenu();
          }}
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
