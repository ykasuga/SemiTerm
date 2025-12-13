import { useState, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@renderer/components/ui/tabs";
import { Button } from "@renderer/components/ui/button";
import { Plus, Server, Trash2, Pencil } from "lucide-react";
import { Connection } from "./types";
import ConnectionEditor from "./ConnectionEditor";
import TerminalComponent from "./Terminal";

// Sidebar item
function ConnectionItem({ connection, onConnect, onEdit, onDelete }: { connection: Connection, onConnect: (c: Connection) => void, onEdit: (c: Connection) => void, onDelete: (id: string) => void }) {
  return (
    <div 
      className="p-3 group hover:bg-gray-700 rounded-lg cursor-pointer flex items-center"
      onClick={() => onConnect(connection)}
    >
      <Server className="w-6 h-6 mr-4 text-gray-400" />
      <div className="flex-1">
        <div className="font-semibold text-gray-100 truncate">{connection.title}</div>
        <div className="text-gray-400 text-sm">{connection.username}@{connection.host}</div>
      </div>
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="mr-1" onClick={(e) => { e.stopPropagation(); onEdit(connection); }}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); onDelete(connection.id); }}>
          <Trash2 className="w-4 h-4 text-red-500" />
        </Button>
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

  useEffect(() => {
    window.api.getConnections().then(setConnections);
  }, []);

  const handleSaveConnection = async (connection: Connection) => {
    const updatedConnections = await window.api.saveConnection(connection);
    setConnections(updatedConnections);
    setEditorOpen(false);
    setEditingConnection(null);
  };

  const handleDeleteConnection = async (id: string) => {
    if (confirm('この接続設定を削除してもよろしいですか？')) {
      const updatedConnections = await window.api.deleteConnection(id);
      setConnections(updatedConnections);
    }
  };

  const openNewConnectionEditor = () => {
    setEditingConnection(null);
    setEditorOpen(true);
  };
  
  const openEditConnectionEditor = (connection: Connection) => {
    setEditingConnection(connection);
    setEditorOpen(true);
  };

  const addSshTab = (connection: Connection) => {
    const newTabId = `ssh-${connection.id}`;
    // Avoid opening duplicate tabs
    if (tabs.find(tab => tab.id === newTabId)) {
      setActiveTab(newTabId);
      return;
    }
    const newTab = { id: newTabId, label: `${tabs.length} - ${connection.host}` };
    setTabs([...tabs, newTab]);
    setActiveTab(newTabId);
    window.api.sshConnect(connection, newTabId);
  };

  return (
    <div className="flex w-screen h-screen bg-[#0f172a] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e293b] border-r border-gray-700 p-4 flex flex-col">
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
              onConnect={addSshTab}
              onEdit={openEditConnectionEditor}
              onDelete={handleDeleteConnection}
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
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
        </div>

        <div className="flex-1 bg-[#0f172a] overflow-y-hidden">
          {tabs.map((tab) => (
            <TabsContent key={tab.id} value={tab.id} className="h-full p-0 m-0">
              {tab.id === "welcome" ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300">
                  <div className="text-5xl mb-4">&gt;_</div>
                  <div className="text-xl mb-6">SemiTerm 軽量 SSH ターミナル</div>
                  <Button onClick={openNewConnectionEditor}>新しい接続を作成</Button>
                </div>
              ) : (
                <TerminalComponent connectionId={tab.id} isActive={activeTab === tab.id} />
              )}
            </TabsContent>
          ))}
        </div>
      </Tabs>
      {isEditorOpen && <ConnectionEditor connection={editingConnection} onSave={handleSaveConnection} onCancel={() => setEditorOpen(false)} />}
    </div>
  );
}
