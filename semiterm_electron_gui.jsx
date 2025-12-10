import { useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Menu, Plus } from "lucide-react";

// Sidebar item
function ConnectionItem({ name, user, host, port }) {
  return (
    <div className="p-3 hover:bg-gray-700 rounded-lg cursor-pointer">
      <div className="font-semibold text-gray-100">{name}</div>
      <div className="text-gray-400 text-sm">{user}@{host}</div>
      <div className="text-gray-500 text-xs">Port: {port}</div>
    </div>
  );
}

export default function App() {
  const [tabs, setTabs] = useState([{ id: "welcome", label: "Welcome" }]);
  const [activeTab, setActiveTab] = useState("welcome");

  const addTab = () => {
    const id = `tab-${tabs.length + 1}`;
    setTabs([...tabs, { id, label: `Terminal ${tabs.length}` }]);
    setActiveTab(id);
  };

  return (
    <div className="flex w-screen h-screen bg-[#0f172a] text-white">
      {/* Sidebar */}
      <div className="w-64 bg-[#1e293b] border-r border-gray-700 p-4 flex flex-col">
        <h2 className="text-lg font-semibold mb-4">接続先</h2>

        <div className="space-y-2 flex-1 overflow-y-auto">
          <ConnectionItem name="Dev Server" user="dev" host="192.168.1.100" port="22" />
          <ConnectionItem name="Production" user="admin" host="prod.example.com" port="22" />
          <ConnectionItem name="Test Environment" user="test" host="10.0.0.50" port="22" />
        </div>

        <div className="text-xs text-gray-500 mt-4">SemiTerm v1.0.0</div>
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="h-12 bg-[#1e293b] border-b border-gray-700 flex items-center px-4">
          <Menu className="mr-3" />

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
            <TabsList className="bg-transparent">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="data-[state=active]:bg-gray-700 rounded-lg"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="h-full">
                {tab.id === "welcome" ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300">
                    <div className="text-5xl mb-4">&gt;_</div>
                    <div className="text-xl mb-6">SemiTerm 軽量 SSH ターミナル</div>
                    <Button onClick={addTab}>新しい接続を作成</Button>
                  </div>
                ) : (
                  <div className="p-4 text-gray-400">SSHターミナル (未実装)</div>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <Button variant="ghost" className="ml-2" onClick={addTab}>
            <Plus />
          </Button>
        </div>

        {/* Terminal area */}
        <div className="flex-1 bg-[#0f172a]"></div>
      </div>
    </div>
  );
}
