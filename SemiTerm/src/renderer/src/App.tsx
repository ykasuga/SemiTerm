import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, DragEvent as ReactDragEvent } from "react";
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
import { Plus, Server, Trash2, Pencil, X, Folder, FolderOpen, ChevronRight, FolderPlus } from "lucide-react";
import { Connection, ConnectionStoreState } from "./types";
import ConnectionEditor from "./ConnectionEditor";
import TerminalComponent from "./Terminal";
import appIcon from "../../../resources/icon.png?asset";

type ConnectionContextMenuHandler = (event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => void;

type TabItem = {
  id: string;
  label: string;
};

type ConnectionFolderNode = {
  id: string;
  name: string;
  path: string;
  children: ConnectionFolderNode[];
  connections: Connection[];
};

type DragItem =
  | { type: "connection"; id: string }
  | { type: "folder"; path: string };

const buildConnectionTree = (connections: Connection[], folders: string[]): ConnectionFolderNode => {
  const root: ConnectionFolderNode = {
    id: '__root__',
    name: '',
    path: '',
    children: [],
    connections: []
  };
  const folderMap = new Map<string, ConnectionFolderNode>();
  folderMap.set('', root);

  const ensureFolderNode = (path?: string): ConnectionFolderNode => {
    if (!path) {
      return root;
    }
    const segments = path
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (!segments.length) {
      return root;
    }
    let parent = root;
    let currentPath = '';
    segments.forEach((segment) => {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment;
      let node = folderMap.get(currentPath);
      if (!node) {
        node = {
          id: currentPath,
          name: segment,
          path: currentPath,
          children: [],
          connections: []
        };
        folderMap.set(currentPath, node);
        parent.children.push(node);
      }
      parent = node;
    });
    return parent;
  };

  folders.forEach((folderPath) => {
    ensureFolderNode(folderPath);
  });

  connections.forEach((connection) => {
    const targetNode = ensureFolderNode(connection.folderPath);
    targetNode.connections.push(connection);
  });

  const sortNode = (node: ConnectionFolderNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name, 'ja'));
    node.connections.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    node.children.forEach(sortNode);
  };
  sortNode(root);
  return root;
};

// Sidebar item
function ConnectionItem({
  connection,
  onConnect,
  onContextMenu,
  depth = 0,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false
}: {
  connection: Connection,
  onConnect: (c: Connection) => void,
  onContextMenu: ConnectionContextMenuHandler,
  depth?: number,
  draggable?: boolean,
  onDragStart?: (event: ReactDragEvent<HTMLDivElement>) => void,
  onDragEnd?: (event: ReactDragEvent<HTMLDivElement>) => void,
  isDragging?: boolean
}) {
  return (
    <div
      className={`py-2 px-3 group hover:bg-gray-700 rounded-md cursor-pointer flex items-center gap-3 ${isDragging ? "opacity-60" : ""}`}
      style={{ marginLeft: depth * 16 }}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onConnect(connection)}
      onContextMenu={(event) => onContextMenu(event, connection)}
    >
      <Server className="w-5 h-5 text-gray-400" />
      <div className="flex-1 leading-tight">
        <div className="font-medium text-gray-100 text-sm truncate">{connection.title}</div>
        <div className="text-gray-400 text-xs">{connection.username}@{connection.host}</div>
      </div>
    </div>
  );
}

export default function App() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [folders, setFolders] = useState<string[]>([]);
  const [tabs, setTabs] = useState<TabItem[]>([{ id: "welcome", label: "Welcome" }]);
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
  const [tabContextMenuState, setTabContextMenuState] = useState<{ x: number; y: number; tabId: string } | null>(null);
  const tabSerialRef = useRef(0);
  const tabLabelSerialRef = useRef(1);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const tabContextMenuRef = useRef<HTMLDivElement | null>(null);
  const listContextMenuRef = useRef<HTMLDivElement | null>(null);
  const [draggingTabId, setDraggingTabId] = useState<string | null>(null);
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [listContextMenuState, setListContextMenuState] = useState<{ x: number; y: number } | null>(null);
  const [isFolderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");
  const [draggingItem, setDraggingItem] = useState<DragItem | null>(null);
  const [dropTargetFolder, setDropTargetFolder] = useState<string | null>(null);
  const [isRootDropTarget, setRootDropTarget] = useState(false);

  const createTabId = () => {
    tabSerialRef.current += 1;
    return `ssh-tab-${tabSerialRef.current}`;
  };

  const applyConnectionState = useCallback((state: ConnectionStoreState) => {
    setConnections(state.connections);
    setFolders(state.folders);
  }, []);

  const moveConnectionToFolder = useCallback(async (connectionId: string, targetFolderPath?: string) => {
    try {
      const state = await window.api.moveConnection(connectionId, targetFolderPath ?? null);
      applyConnectionState(state);
    } catch (error) {
      console.error(error);
      alert("接続先を移動できませんでした");
    }
  }, [applyConnectionState]);

  const moveFolderToTarget = useCallback(async (folderPath: string, targetFolderPath?: string) => {
    try {
      const state = await window.api.moveFolder(folderPath, targetFolderPath ?? null);
      applyConnectionState(state);
    } catch (error) {
      console.error(error);
      alert("フォルダを移動できませんでした");
    }
  }, [applyConnectionState]);

  const resetStructureDragState = useCallback(() => {
    setDraggingItem(null);
    setDropTargetFolder(null);
    setRootDropTarget(false);
  }, []);

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
    window.api.getConnections().then(applyConnectionState);
  }, [applyConnectionState]);

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
    const updatedState = await window.api.saveConnection(connection);
    const updatedConnections = updatedState.connections;
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
    setFolders(updatedState.folders);
    setEditorOpen(false);
    setEditingConnection(null);
  };

  const handleDeleteConnection = async (id: string) => {
    if (confirm('この接続設定を削除してもよろしいですか？')) {
      const updatedState = await window.api.deleteConnection(id);
      setConnections(updatedState.connections);
      setFolders(updatedState.folders);
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
      const newTab: TabItem = { id: resolvedTabId, label: `${serial} - ${connection.host}` };
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

  const closeTab = useCallback((tabId: string) => {
    closeTabsByIds([tabId]);
  }, [closeTabsByIds]);

  const closeOtherTabs = useCallback((tabId: string) => {
    const otherIds = tabs.filter((tab) => tab.id !== tabId).map((tab) => tab.id);
    closeTabsByIds(otherIds);
  }, [tabs, closeTabsByIds]);

  const closeTabsToRight = useCallback((tabId: string) => {
    const index = tabs.findIndex((tab) => tab.id === tabId);
    if (index === -1) return;
    const idsToClose = tabs.slice(index + 1).map((tab) => tab.id);
    closeTabsByIds(idsToClose);
  }, [tabs, closeTabsByIds]);

  const closeAllTabs = useCallback(() => {
    closeTabsByIds(tabs.map((tab) => tab.id));
  }, [tabs, closeTabsByIds]);

  const closeContextMenu = useCallback(() => {
    setContextMenuState(null);
  }, []);

  const closeTabContextMenu = useCallback(() => {
    setTabContextMenuState(null);
  }, []);

  const closeListContextMenu = useCallback(() => {
    setListContextMenuState(null);
  }, []);

  const reorderTabs = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;
    setTabs((prevTabs) => {
      const sourceIndex = prevTabs.findIndex(tab => tab.id === sourceId);
      const targetIndex = prevTabs.findIndex(tab => tab.id === targetId);
      if (sourceIndex === -1 || targetIndex === -1) {
        return prevTabs;
      }
      const updatedTabs = [...prevTabs];
      const [movedTab] = updatedTabs.splice(sourceIndex, 1);
      updatedTabs.splice(targetIndex, 0, movedTab);
      return updatedTabs;
    });
  }, []);

  const handleTabDragStart = useCallback((event: ReactDragEvent<HTMLButtonElement>, tabId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tabId);
    setDraggingTabId(tabId);
  }, []);

  const handleTabDrop = useCallback((tabId: string) => {
    if (draggingTabId) {
      reorderTabs(draggingTabId, tabId);
    }
    setDragOverTabId(null);
    setDraggingTabId(null);
  }, [draggingTabId, reorderTabs]);

  const resetTabDragState = useCallback(() => {
    setDragOverTabId(null);
    setDraggingTabId(null);
  }, []);

  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [path]: !(prev[path] ?? true)
    }));
  }, []);

  const handleConnectionDragStart = useCallback((event: ReactDragEvent<HTMLDivElement>, connectionId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", connectionId);
    setDraggingItem({ type: "connection", id: connectionId });
  }, []);

  const handleFolderDragStart = useCallback((event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", folderPath);
    setDraggingItem({ type: "folder", path: folderPath });
  }, []);

  const handleStructureDragEnd = useCallback(() => {
    resetStructureDragState();
  }, [resetStructureDragState]);

  const handleFolderDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    if (!draggingItem) return;
    if (draggingItem.type === "folder") {
      if (folderPath === draggingItem.path || folderPath.startsWith(`${draggingItem.path}/`)) {
        return;
      }
    }
    event.preventDefault();
    event.stopPropagation();
    setDropTargetFolder(folderPath);
    setRootDropTarget(false);
  }, [draggingItem]);

  const handleFolderDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>, folderPath: string) => {
    if (!draggingItem) return;
    if (draggingItem.type === "folder" && (folderPath === draggingItem.path || folderPath.startsWith(`${draggingItem.path}/`))) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (draggingItem.type === "connection") {
      await moveConnectionToFolder(draggingItem.id, folderPath);
    } else if (draggingItem.type === "folder") {
      await moveFolderToTarget(draggingItem.path, folderPath);
    }
    resetStructureDragState();
  }, [draggingItem, moveConnectionToFolder, moveFolderToTarget, resetStructureDragState]);

  const handleRootDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    if (!draggingItem) return;
    event.preventDefault();
    setDropTargetFolder(null);
    setRootDropTarget(true);
  }, [draggingItem]);

  const handleRootDrop = useCallback(async (event: ReactDragEvent<HTMLDivElement>) => {
    if (!draggingItem) return;
    event.preventDefault();
    event.stopPropagation();
    if (draggingItem.type === "connection") {
      await moveConnectionToFolder(draggingItem.id, undefined);
    } else if (draggingItem.type === "folder") {
      await moveFolderToTarget(draggingItem.path, undefined);
    }
    resetStructureDragState();
  }, [draggingItem, moveConnectionToFolder, moveFolderToTarget, resetStructureDragState]);

  const handleConnectionContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>, connection: Connection) => {
    event.preventDefault();
    event.stopPropagation();
    setListContextMenuState(null);
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

  const handleTabContextMenu = useCallback((event: ReactMouseEvent<HTMLButtonElement>, tabId: string) => {
    event.preventDefault();
    event.stopPropagation();
    setListContextMenuState(null);
    const padding = 12;
    const menuWidth = 220;
    const menuHeight = 160;
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
    setTabContextMenuState({ tabId, x, y });
  }, []);

  const handleSidebarContextMenu = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenuState(null);
    setTabContextMenuState(null);
    const padding = 12;
    const menuWidth = 220;
    const menuHeight = 60;
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
    setListContextMenuState({ x, y });
  }, []);

  const openFolderDialog = useCallback(() => {
    closeListContextMenu();
    setFolderDialogOpen(true);
    setFolderNameInput("");
  }, [closeListContextMenu]);

  const closeFolderDialog = useCallback(() => {
    setFolderDialogOpen(false);
    setFolderNameInput("");
  }, []);

  const renderFolder = (node: ConnectionFolderNode, depth: number): JSX.Element => {
    const isExpanded = expandedFolders[node.path] ?? true;
    return (
      <div key={node.path} className="space-y-1">
        <div
          className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer hover:bg-gray-700 text-gray-200 ${dropTargetFolder === node.path ? "bg-gray-600/50" : ""} ${draggingItem?.type === "folder" && draggingItem.path === node.path ? "opacity-60" : ""}`}
          style={{ marginLeft: depth * 16 }}
          onClick={() => toggleFolder(node.path)}
          onContextMenu={handleSidebarContextMenu}
          draggable
          onDragStart={(event) => handleFolderDragStart(event, node.path)}
          onDragEnd={handleStructureDragEnd}
          onDragOver={(event) => handleFolderDragOver(event, node.path)}
          onDrop={(event) => handleFolderDrop(event, node.path)}
        >
          <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
          {isExpanded ? (
            <FolderOpen className="w-4 h-4 text-gray-300" />
          ) : (
            <Folder className="w-4 h-4 text-gray-400" />
          )}
          <span className="text-sm font-medium">{node.name}</span>
        </div>
        {isExpanded && (
          <div className="space-y-1">
            {node.connections.map((conn) => (
              <ConnectionItem
                key={conn.id}
                connection={conn}
                onConnect={handleConnectRequest}
                onContextMenu={handleConnectionContextMenu}
                depth={depth + 1}
                draggable
                onDragStart={(event) => handleConnectionDragStart(event, conn.id)}
                onDragEnd={handleStructureDragEnd}
                isDragging={draggingItem?.type === "connection" && draggingItem.id === conn.id}
              />
            ))}
            {node.children.map((child) => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

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
    if (!contextMenuState && !tabContextMenuState && !listContextMenuState) return;
    const handleMouseDown = (event: MouseEvent) => {
      const targetNode = event.target as Node;
      if (contextMenuRef.current && contextMenuRef.current.contains(targetNode)) {
        return;
      }
      if (tabContextMenuRef.current && tabContextMenuRef.current.contains(targetNode)) {
        return;
      }
      if (listContextMenuRef.current && listContextMenuRef.current.contains(targetNode)) {
        return;
      }
      setContextMenuState(null);
      setTabContextMenuState(null);
      setListContextMenuState(null);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setContextMenuState(null);
        setTabContextMenuState(null);
        setListContextMenuState(null);
      }
    };
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [contextMenuState, tabContextMenuState, listContextMenuState]);

  const sanitizedFolderInput = useMemo(() => {
    return folderNameInput
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .join('/');
  }, [folderNameInput]);

  const isFolderNameValid = sanitizedFolderInput.length > 0;

  const handleCreateFolder = useCallback(async () => {
    if (!sanitizedFolderInput) return;
    try {
      const state = await window.api.createFolder(sanitizedFolderInput);
      applyConnectionState(state);
      closeFolderDialog();
    } catch (error) {
      console.error(error);
      alert('フォルダを作成できませんでした');
    }
  }, [sanitizedFolderInput, applyConnectionState, closeFolderDialog]);

  const connectionTree = useMemo(() => buildConnectionTree(connections, folders), [connections, folders]);
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

        <div
          className={`space-y-1 flex-1 overflow-y-auto rounded-md ${isRootDropTarget ? "bg-gray-700/40" : ""}`}
          onContextMenu={handleSidebarContextMenu}
          onDragOver={handleRootDragOver}
          onDrop={handleRootDrop}
        >
          {connectionTree.connections.map(conn => (
            <ConnectionItem
              key={conn.id}
              connection={conn}
              onConnect={handleConnectRequest}
              onContextMenu={handleConnectionContextMenu}
              draggable
              onDragStart={(event) => handleConnectionDragStart(event, conn.id)}
              onDragEnd={handleStructureDragEnd}
              isDragging={draggingItem?.type === "connection" && draggingItem.id === conn.id}
            />
          ))}
          {connectionTree.children.map(folder => renderFolder(folder, 0))}
        </div>

        <div className="text-xs text-gray-500 mt-4">SemiTerm v0.1.0</div>
      </div>

      {/* Main */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <div className="h-12 bg-[#1e293b] border-b border-gray-700 flex items-center px-4 overflow-hidden">
          <div className="w-full h-full overflow-x-auto overflow-y-hidden scrollable-tabs">
            <TabsList className="bg-transparent h-full p-0 flex-nowrap w-max">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  draggable
                  onDragStart={(event) => handleTabDragStart(event, tab.id)}
                  onDragOver={(event) => {
                    if (!draggingTabId) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={() => {
                    if (draggingTabId && draggingTabId !== tab.id) {
                      setDragOverTabId(tab.id);
                    }
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleTabDrop(tab.id);
                  }}
                  onDragEnd={resetTabDragState}
                  className={`h-full shrink-0 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-gray-700 ${
                    dragOverTabId === tab.id && draggingTabId !== tab.id ? "border-blue-400" : ""
                  } ${draggingTabId === tab.id ? "opacity-60" : ""}`}
                  onContextMenu={(event) => handleTabContextMenu(event, tab.id)}
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
                    <X className="w-3 h-3" />
                  </button>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
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
      {listContextMenuState && (
        <div className="fixed inset-0 z-40 pointer-events-none">
          <div
            ref={listContextMenuRef}
            className="absolute pointer-events-auto w-48 bg-[#1e293b] border border-gray-700 rounded-md shadow-lg py-1"
            style={{ top: listContextMenuState.y, left: listContextMenuState.x }}
          >
            <button
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 flex items-center space-x-2"
              onClick={openFolderDialog}
            >
              <FolderPlus className="w-4 h-4" />
              <span>フォルダを追加</span>
            </button>
          </div>
        </div>
      )}
      {tabContextMenuState && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div
            ref={tabContextMenuRef}
            className="absolute pointer-events-auto w-56 bg-[#1e293b] border border-gray-700 rounded-md shadow-lg py-1"
            style={{ top: tabContextMenuState.y, left: tabContextMenuState.x }}
          >
            {(() => {
              const tabIndex = tabs.findIndex((tab) => tab.id === tabContextMenuState.tabId);
              const tabsToRight = tabIndex === -1 ? [] : tabs.slice(tabIndex + 1);
              const otherTabs = tabs.filter((tab) => tab.id !== tabContextMenuState.tabId);
              const closeDisabled = tabIndex === -1;
              const closeAllDisabled = tabs.length === 0;
              const closeRightDisabled = tabsToRight.length === 0;
              const closeOthersDisabled = otherTabs.length === 0;
              return (
                <>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
                    disabled={closeDisabled}
                    onClick={() => {
                      closeTab(tabContextMenuState.tabId);
                      closeTabContextMenu();
                    }}
                  >
                    タブを閉じる
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
                    disabled={closeAllDisabled}
                    onClick={() => {
                      closeAllTabs();
                      closeTabContextMenu();
                    }}
                  >
                    全てのタブを閉じる
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
                    disabled={closeRightDisabled}
                    onClick={() => {
                      closeTabsToRight(tabContextMenuState.tabId);
                      closeTabContextMenu();
                    }}
                  >
                    右のタブを閉じる
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-gray-700 disabled:opacity-50 disabled:hover:bg-transparent"
                    disabled={closeOthersDisabled}
                    onClick={() => {
                      closeOtherTabs(tabContextMenuState.tabId);
                      closeTabContextMenu();
                    }}
                  >
                    他のタブを閉じる
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
      {isFolderDialogOpen && (
        <Dialog open onOpenChange={(open) => !open && closeFolderDialog()}>
          <DialogContent className="sm:max-w-[400px] bg-[#1e293b] text-white border-gray-700">
            <DialogHeader>
              <DialogTitle>フォルダを作成</DialogTitle>
              <DialogDescription>新しく追加するフォルダ名を入力してください。階層は / で区切れます。</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Input
                value={folderNameInput}
                onChange={(event) => setFolderNameInput(event.target.value)}
                placeholder="例: Production/DB"
                className="bg-gray-800 border-gray-600"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" className="border-white text-white hover:bg-white/10" onClick={closeFolderDialog}>キャンセル</Button>
              <Button
                variant="outline"
                className="border-white text-white hover:bg-white/10 disabled:opacity-50"
                onClick={handleCreateFolder}
                disabled={!isFolderNameValid}
              >
                作成
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
