import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@renderer/components/ui/tabs";
import { Button } from "@renderer/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@renderer/components/ui/dialog";
import { Input } from "@renderer/components/ui/input";
import { Plus, Server, Trash2, Pencil, X } from "lucide-react";
import { Connection } from "./types";
import ConnectionEditor from "./ConnectionEditor";
import TerminalComponent from "./Terminal";
import appIcon from "../../../resources/icon.png?asset";

type ConnectionContextMenuHandler = (event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => void;

// Sidebar item
function ConnectionItem({ connection, onConnect, onContextMenu }: { connection: Connection, onConnect: (c: Connection) => void, onContextMenu: ConnectionContextMenuHandler }) {
  return (
    <div 
      className="p-3 group hover:bg-gray-700 rounded-lg cursor-pointer flex items-center"
      onClick={() => onConnect(connection)}
      onContextMenu={(event) => onContextMenu(event, connection)}
    >
      <Server className="w-6 h-6 mr-4 text-gray-400" />
      <div className="flex-1">
        <div className="font-semibold text-gray-100 truncate">{connection.title}</div>
        <div className="text-gray-400 text-sm">{connection.username}@{connection.host}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [tabs, setTabs] = useState([{ id: "welcome", label: "Welcome" }]);
  const [activeTab, setActiveTab] = useState("welcome");
  const [isEditorOpen, setEditorOpen] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [passwordInput, setPasswordInput] = useState("");
  const [tabConnections, setTabConnections] = useState<Record<string, Connection>>({});
  const [tabStatuses, setTabStatuses] = useState<Record<string, { state: "connecting" | "connected" | "error" | "disconnected"; host?: string; username?: string; errorMessage?: string }>>({
    welcome: { state: "disconnected" }
  });
  const [tabSessionTokens, setTabSessionTokens] = useState<Record<string, number>>({});
  const [contextMenuState, setContextMenuState] = useState<{ x: number; y: number; connection: Connection } | null>(null);
  const tabSerialRef = useRef(0);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);

  const createTabId = () => {
    tabSerialRef.current += 1;
    return `ssh-tab-${tabSerialRef.current}`;
  };

  const startSshSession = useCallback((connection: Connection, tabId: string) => {
    setTabConnections((prev) => ({
      ...prev,
      [tabId]: connection
    }));
    setTabStatuses((prev) => ({
      ...prev,
      [tabId]: {
        state: "connecting",
        host: connection.host,
        username: connection.username
      }
    }));
    setTabSessionTokens((prev) => ({
      ...prev,
      [tabId]: (prev[tabId] ?? 0) + 1
    }));
    window.api.sshConnect(connection, tabId);
  }, []);

  useEffect(() => {
    window.api.getConnections().then(setConnections);
  }, []);

  useEffect(() => {
    const handleError = (_event: unknown, id: string, error: { message: string }) => {
      setTabStatuses((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          state: "error",
          errorMessage: error.message
        }
      }));
    };
    const handleClose = (_event: unknown, id: string) => {
      setTabStatuses((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          state: "disconnected"
        }
      }));
    };
    const handleConnected = (_event: unknown, id: string) => {
      setTabStatuses((prev) => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          state: "connected",
          errorMessage: undefined
        }
      }));
    };
    window.electron.ipcRenderer.on("ssh:error", handleError);
    window.electron.ipcRenderer.on("ssh:close", handleClose);
    window.electron.ipcRenderer.on("ssh:connected", handleConnected);
    return () => {
      window.electron.ipcRenderer.removeListener("ssh:error", handleError);
      window.electron.ipcRenderer.removeListener("ssh:close", handleClose);
      window.electron.ipcRenderer.removeListener("ssh:connected", handleConnected);
    };
  }, []);

  const handleSaveConnection = async (connection: Connection) => {
    const prevIds = new Set(connections.map((c) => c.id));
    const updatedConnections = await window.api.saveConnection(connection);
    let savedId = connection.id;
    if (!savedId) {
      const created = updatedConnections.find(conn => !prevIds.has(conn.id));
      if (created) savedId = created.id;
    }
    const enrichedConnections = updatedConnections.map((conn) => {
      if (savedId && conn.id === savedId && connection.auth.type === "password") {
        return { ...conn, auth: { ...conn.auth, password: connection.auth.password } };
      }
      return conn;
    });
    setConnections(enrichedConnections);
    setEditorOpen(false);
    setEditingConnection(null);
  };

  const handleDeleteConnection = async (id: string) => {
    if (confirm('この接続設定を削除してもよろしいですか？')) {
      const updatedConnections = await window.api.deleteConnection(id);
      setConnections(updatedConnections);
    }
  };

  const openNewConnectionEditor = useCallback(() => {
    setEditingConnection(null);
    setEditorOpen(true);
  }, []);
  
  const openEditConnectionEditor = (connection: Connection) => {
    setEditingConnection(connection);
    setEditorOpen(true);
  };

  const openSshTab = useCallback((connection: Connection, tabId?: string) => {
    const resolvedTabId = tabId || createTabId();
    setTabs((prevTabs) => {
      if (prevTabs.find(tab => tab.id === resolvedTabId)) {
        return prevTabs;
      }
      const newTabIndex = prevTabs.length;
      const newTab = { id: resolvedTabId, label: `${newTabIndex} - ${connection.host}` };
      return [...prevTabs, newTab];
    });
    setActiveTab(resolvedTabId);
    startSshSession(connection, resolvedTabId);
  }, [startSshSession]);

  const handleConnectRequest = useCallback((connection: Connection) => {
    if (connection.auth.type === "password" && !connection.auth.password) {
      setPendingConnection(connection);
      setPasswordInput("");
      return;
    }
    openSshTab(connection);
  }, [openSshTab]);

  const closePasswordPrompt = () => {
    setPendingConnection(null);
    setPasswordInput("");
  };

  const confirmPasswordAndConnect = () => {
    if (!pendingConnection || !passwordInput) return;
    const updatedConnection: Connection = {
      ...pendingConnection,
      auth: { ...pendingConnection.auth, password: passwordInput },
    };
    setConnections((prev) => prev.map((conn) => conn.id === updatedConnection.id ? updatedConnection : conn));
    closePasswordPrompt();
    openSshTab(updatedConnection);
  };

  const closeTab = useCallback((tabId: string) => {
    if (tabId === "welcome") return;
    setTabs((prevTabs) => {
      const tabIndex = prevTabs.findIndex(tab => tab.id === tabId);
      if (tabIndex === -1) return prevTabs;
      const newTabs = prevTabs.filter(tab => tab.id !== tabId);
      if (activeTab === tabId) {
        const fallbackTab = newTabs[tabIndex - 1 >= 0 ? tabIndex - 1 : 0];
        setActiveTab(fallbackTab ? fallbackTab.id : "welcome");
      }
      return newTabs;
    });
    setTabStatuses((prev) => {
      const { [tabId]: _removed, ...rest } = prev;
      return rest;
    });
    setTabConnections((prev) => {
      const { [tabId]: _removed, ...rest } = prev;
      return rest;
    });
    setTabSessionTokens((prev) => {
      const { [tabId]: _removed, ...rest } = prev;
      return rest;
    });
    window.api.sshClose(tabId);
  }, [activeTab]);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const handleConnectionContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => {
    event.preventDefault();
    event.stopPropagation();
    const padding = 12;
    const menuWidth = 200;
    const menuHeight = 100;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    let x = event.clientX;
    let y = event.clientY;
    if (x + menuWidth > viewportWidth - padding) {
      x = viewportWidth - menuWidth - padding;
    }
    if (y + menuHeight > viewportHeight - padding) {
      y = viewportHeight - menuHeight - padding;
    }
    x = Math.max(padding, x);
    y = Math.max(padding, y);
    setContextMenuState({ connection, x, y });
  }, []);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const isModifierPressed = event.metaKey || event.ctrlKey;
      if (!isModifierPressed) return;

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

      if (key === "w") {
        event.preventDefault();
        event.stopPropagation();
        closeTab(activeTab);
        return;
      }

      if (key === "t") {
        event.preventDefault();
        event.stopPropagation();
        openNewConnectionEditor();
        return;
      }

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
  }, [activeTab, tabs, tabConnections, closeTab, openNewConnectionEditor, startSshSession]);

  useEffect(() => {
    if (!contextMenuState) return;
    const handleMouseDown = (event: MouseEvent) => {
      if (contextMenuRef.current && contextMenuRef.current.contains(event.target as Node)) {
        return;
      }
      setContextMenuState(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenuState(null);
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenuState]);

  const activeStatus = useMemo(() => tabStatuses[activeTab], [tabStatuses, activeTab]);

  return (
    <div className="flex w-screen h-screen bg-[#0f172a] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e293b] border-r border-gray-700 p-4 flex flex-col">
        <div className="flex items-center space-x-3 mb-6">
          <img src={appIcon} alt="SemiTerm ロゴ" className="w-8 h-8 rounded-lg" draggable={false} />
          <div>
            <div className="text-lg font-bold leading-tight">SemiTerm</div>
            <div className="text-xs text-gray-400 leading-tight">Lightweight SSH</div>
          </div>
        </div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">接続先</h2>
          <Button variant="ghost" size="icon" onClick={openNewConnectionEditor}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        <div className="space-y-2 flex-1 overflow-y-auto">
          {connections.map(conn => (
            <ConnectionItem 
              key={conn.id} 
              connection={conn}
              onConnect={handleConnectRequest}
              onContextMenu={handleConnectionContextMenu}
            />
          ))}
        </div>

        <div className="text-xs text-gray-500 mt-4">SemiTerm v0.1.0</div>
      </div>

      {/* Main */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
        <div className="h-12 bg-[#1e293b] border-b border-gray-700 flex items-center px-4">
            <TabsList className="bg-transparent h-full p-0">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-700"
                >
                  <span className="mr-2">{tab.label}</span>
                  {tab.id !== "welcome" && (
                    <button
                      className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      aria-label="タブを閉じる"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
        </div>

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
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <div className="text-5xl mb-4">&gt;_</div>
                    <div className="text-xl mb-6">SemiTerm 軽量 SSH ターミナル</div>
                    <Button onClick={openNewConnectionEditor}>新しい接続を作成</Button>
                  </div>
                ) : tabStatuses[tab.id]?.state === "error" ? (
                  <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                    <div className="text-red-400 text-2xl">⚠ 接続エラー</div>
                    <p className="text-gray-300">{tabStatuses[tab.id]?.errorMessage || '接続に失敗しました。'}</p>
                    <div className="flex space-x-3">
                      <Button variant="outline" onClick={() => closeTab(tab.id)}>タブを閉じる</Button>
                      <Button
                        onClick={() => {
                          const connection = tabConnections[tab.id];
                          if (connection) {
                            openSshTab(connection, tab.id);
                          }
                        }}
                      >再接続</Button>
                    </div>
                  </div>
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

        <div className="h-6 bg-[#1e293b] border-t border-gray-700 flex items-center justify-between px-4 text-xs">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  activeStatus?.state === "connected"
                    ? "bg-green-400"
                    : activeStatus?.state === "error"
                      ? "bg-red-400"
                      : activeStatus?.state === "connecting"
                        ? "bg-yellow-400"
                        : "bg-gray-500"
                }`}
              />
              <span>
                {activeStatus?.state === "connected"
                  ? "接続中"
                  : activeStatus?.state === "connecting"
                    ? "接続中..."
                    : activeStatus?.state === "error"
                      ? `エラー: ${activeStatus.errorMessage}`
                      : "切断"}
              </span>
            </div>
            <div>
              {activeStatus?.username ? `${activeStatus.username}@${activeStatus.host}` : "--"}
            </div>
          </div>
          <div>Log Level: debug</div>
        </div>
      </Tabs>
      {contextMenuState && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            ref={contextMenuRef}
            className="absolute pointer-events-auto w-48 bg-[#1e293b] border border-gray-700 rounded-md shadow-lg py-1"
            style={{ top: contextMenuState.y, left: contextMenuState.x }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center space-x-2"
              onClick={() => {
                openEditConnectionEditor(contextMenuState.connection);
                closeContextMenu();
              }}
            >
              <Pencil className="w-4 h-4" />
              <span>編集</span>
            </button>
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center space-x-2 text-red-400"
              onClick={() => {
                closeContextMenu();
                handleDeleteConnection(contextMenuState.connection.id);
              }}
            >
              <Trash2 className="w-4 h-4" />
              <span>削除</span>
            </button>
          </div>
        </div>
      )}
      {isEditorOpen && <ConnectionEditor connection={editingConnection} onSave={handleSaveConnection} onCancel={() => setEditorOpen(false)} />}
      {pendingConnection && (
        <Dialog open onOpenChange={(open) => !open && closePasswordPrompt()}>
          <DialogContent
            className="sm:max-w-[400px] bg-[#1e293b] text-white border-gray-700"
            onKeyDown={(e) => {
              if (e.key === "Enter" && passwordInput) {
                e.preventDefault();
                confirmPasswordAndConnect();
              }
            }}
          >
            <DialogHeader>
              <DialogTitle>パスワードを入力</DialogTitle>
              <DialogDescription>
                {pendingConnection.username}@{pendingConnection.host} に接続するためのパスワードを入力してください。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                type="password"
                value={passwordInput}
                autoFocus
                placeholder="Password"
                onChange={(e) => setPasswordInput(e.target.value)}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white text-white hover:bg-white/10" onClick={closePasswordPrompt}>キャンセル</Button>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10 disabled:opacity-50"
                onClick={confirmPasswordAndConnect}
                disabled={!passwordInput}
              >
                接続
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
