import React from 'react';
import { TabsContent } from '@renderer/components/ui/tabs';
import TerminalComponent from '../../Terminal';
import { WelcomeScreen } from '../screens/WelcomeScreen';
import { ErrorScreen } from '../screens/ErrorScreen';

interface Tab {
  id: string;
  label: string;
}

interface TabStatus {
  state: 'connecting' | 'connected' | 'disconnected' | 'error';
  errorMessage?: string;
}

interface TabContentAreaProps {
  tabs: Tab[];
  activeTab: string;
  tabStatuses: Record<string, TabStatus>;
  tabSessionTokens: Record<string, number>;
  onNewConnection: () => void;
  onCloseTab: (tabId: string) => void;
  onReconnect: (tabId: string) => void;
}

export const TabContentArea = React.memo<TabContentAreaProps>(({
  tabs,
  activeTab,
  tabStatuses,
  tabSessionTokens,
  onNewConnection,
  onCloseTab,
  onReconnect
}) => {
  return (
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
              <WelcomeScreen onNewConnection={onNewConnection} />
            ) : tabStatuses[tab.id]?.state === "error" ? (
              <ErrorScreen
                errorMessage={tabStatuses[tab.id]?.errorMessage || '接続に失敗しました。'}
                onClose={() => onCloseTab(tab.id)}
                onReconnect={() => onReconnect(tab.id)}
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
  );
}, (prevProps, nextProps) => {
  // タブの変更、アクティブタブの変更、ステータスの変更のみで再レンダリング
  return (
    prevProps.tabs === nextProps.tabs &&
    prevProps.activeTab === nextProps.activeTab &&
    prevProps.tabStatuses === nextProps.tabStatuses &&
    prevProps.tabSessionTokens === nextProps.tabSessionTokens
  );
});

TabContentArea.displayName = 'TabContentArea';

// Made with Bob
