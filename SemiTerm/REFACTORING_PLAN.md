# App.tsx リファクタリング計画

## 現状分析

### 問題点
1. **巨大なコンポーネント**: 1409行の単一ファイル
2. **状態管理の複雑さ**: 20以上のuseStateフック
3. **責務の混在**: 接続管理、タブ管理、ドラッグ&ドロップ、UI表示が全て1つのコンポーネントに集中
4. **テスト困難**: ロジックとUIが密結合
5. **再利用性の欠如**: 他のコンポーネントでロジックを再利用できない

### 主要な機能領域
1. **接続管理** (lines 210-302, 344-371)
   - 接続の取得、保存、削除
   - 接続ツリーの構築
   - フォルダ管理

2. **タブ管理** (lines 213-226, 383-492)
   - タブの作成、削除、並び替え
   - アクティブタブの管理
   - タブステータスの追跡

3. **SSH セッション管理** (lines 280-342)
   - SSH接続の開始
   - 接続状態の監視
   - エラーハンドリング

4. **ドラッグ&ドロップ** (lines 231-240, 547-782)
   - 接続のドラッグ&ドロップ
   - フォルダのドラッグ&ドロップ
   - タブの並び替え

5. **コンテキストメニュー** (lines 224-225, 784-849)
   - 接続のコンテキストメニュー
   - タブのコンテキストメニュー
   - サイドバーのコンテキストメニュー

6. **キーボードショートカット** (lines 942-989)
   - タブ切り替え (Cmd/Ctrl+Tab)
   - タブを閉じる (Cmd/Ctrl+W)
   - 新規接続 (Cmd/Ctrl+T)
   - 再接続 (Cmd/Ctrl+R)

## リファクタリング戦略

### フェーズ1: カスタムフックの抽出

#### 1.1 `useConnections` フック
**目的**: 接続とフォルダの状態管理を分離

**抽出する状態**:
- `connections`
- `folders`
- `folderInfos`
- `expandedFolders`

**抽出する関数**:
- `applyConnectionState`
- `moveConnectionToFolder`
- `moveFolderToTarget`
- `handleSaveConnection`
- `handleDeleteConnection`
- `toggleFolder`

**ファイル**: `src/renderer/src/hooks/useConnections.ts`

#### 1.2 `useTabManager` フック
**目的**: タブの状態管理とライフサイクルを分離

**抽出する状態**:
- `tabs`
- `activeTab`
- `tabConnections`
- `tabStatuses`
- `tabSessionTokens`

**抽出する関数**:
- `createTabId`
- `openSshTab`
- `closeTab`
- `closeTabsByIds`
- `closeOtherTabs`
- `closeTabsToRight`
- `closeAllTabs`
- `reorderTabs`

**ファイル**: `src/renderer/src/hooks/useTabManager.ts`

#### 1.3 `useSshSession` フック
**目的**: SSH接続の管理を分離

**抽出する関数**:
- `startSshSession`
- SSH イベントリスナー (ssh:error, ssh:close, ssh:connected)

**ファイル**: `src/renderer/src/hooks/useSshSession.ts`

#### 1.4 `useDragAndDrop` フック
**目的**: ドラッグ&ドロップのロジックを分離

**抽出する状態**:
- `draggingItem`
- `dropTargetFolder`
- `isRootDropTarget`
- `dropPosition`
- `draggingTabId`
- `dragOverTabId`

**抽出する関数**:
- `handleConnectionDragStart`
- `handleConnectionDragOver`
- `handleConnectionDragLeave`
- `handleConnectionDrop`
- `handleFolderDragStart`
- `handleFolderDragOver`
- `handleFolderDrop`
- `handleRootDragOver`
- `handleRootDrop`
- `handleTabDragStart`
- `handleTabDrop`
- `resetStructureDragState`
- `resetTabDragState`

**ファイル**: `src/renderer/src/hooks/useDragAndDrop.ts`

#### 1.5 `useContextMenu` フック
**目的**: コンテキストメニューの状態管理を分離

**抽出する状態**:
- `contextMenuState`
- `tabContextMenuState`
- `listContextMenuState`

**抽出する関数**:
- `handleConnectionContextMenu`
- `handleTabContextMenu`
- `handleSidebarContextMenu`
- `closeContextMenu`
- `closeTabContextMenu`
- `closeListContextMenu`

**ファイル**: `src/renderer/src/hooks/useContextMenu.ts`

#### 1.6 `useKeyboardShortcuts` フック
**目的**: キーボードショートカットの処理を分離

**抽出する関数**:
- キーボードイベントハンドラー

**ファイル**: `src/renderer/src/hooks/useKeyboardShortcuts.ts`

#### 1.7 `useFolderDialog` フック
**目的**: フォルダ作成ダイアログの状態管理を分離

**抽出する状態**:
- `isFolderDialogOpen`
- `folderNameInput`

**抽出する関数**:
- `openFolderDialog`
- `closeFolderDialog`
- `handleCreateFolder`

**ファイル**: `src/renderer/src/hooks/useFolderDialog.ts`

#### 1.8 `usePasswordPrompt` フック
**目的**: パスワードプロンプトの状態管理を分離

**抽出する状態**:
- `pendingConnection`
- `passwordInput`

**抽出する関数**:
- `closePasswordPrompt`
- `confirmPasswordAndConnect`

**ファイル**: `src/renderer/src/hooks/usePasswordPrompt.ts`

### フェーズ2: UIコンポーネントの分離

#### 2.1 `Sidebar` コンポーネント
**責務**: サイドバー全体の表示

**Props**:
- `connectionTree: ConnectionFolderNode`
- `onConnect: (connection: Connection) => void`
- `onNewConnection: () => void`
- `dragHandlers: DragHandlers`
- `contextMenuHandlers: ContextMenuHandlers`

**ファイル**: `src/renderer/src/components/Sidebar.tsx`

#### 2.2 `ConnectionTree` コンポーネント
**責務**: 接続ツリーの表示

**Props**:
- `tree: ConnectionFolderNode`
- `onConnect: (connection: Connection) => void`
- `expandedFolders: Record<string, boolean>`
- `onToggleFolder: (path: string) => void`
- `dragState: DragState`
- `dragHandlers: DragHandlers`

**ファイル**: `src/renderer/src/components/ConnectionTree.tsx`

#### 2.3 `FolderNode` コンポーネント
**責務**: フォルダノードの表示

**Props**:
- `node: ConnectionFolderNode`
- `depth: number`
- `isExpanded: boolean`
- `onToggle: () => void`
- `dragState: DragState`
- `dragHandlers: DragHandlers`

**ファイル**: `src/renderer/src/components/FolderNode.tsx`

#### 2.4 `TabBar` コンポーネント
**責務**: タブバーの表示と管理

**Props**:
- `tabs: TabItem[]`
- `activeTab: string`
- `onTabChange: (tabId: string) => void`
- `onTabClose: (tabId: string) => void`
- `onTabContextMenu: (event, tabId) => void`
- `dragHandlers: TabDragHandlers`

**ファイル**: `src/renderer/src/components/TabBar.tsx`

#### 2.5 `StatusBar` コンポーネント
**責務**: ステータスバーの表示

**Props**:
- `status: TabStatus`

**ファイル**: `src/renderer/src/components/StatusBar.tsx`

#### 2.6 `ConnectionContextMenu` コンポーネント
**責務**: 接続のコンテキストメニュー

**Props**:
- `connection: Connection`
- `position: { x: number; y: number }`
- `onEdit: () => void`
- `onDelete: () => void`
- `onClose: () => void`

**ファイル**: `src/renderer/src/components/ConnectionContextMenu.tsx`

#### 2.7 `TabContextMenu` コンポーネント
**責務**: タブのコンテキストメニュー

**Props**:
- `tabId: string`
- `position: { x: number; y: number }`
- `tabs: TabItem[]`
- `onClose: () => void`
- `onCloseTab: () => void`
- `onCloseOthers: () => void`
- `onCloseToRight: () => void`
- `onCloseAll: () => void`

**ファイル**: `src/renderer/src/components/TabContextMenu.tsx`

#### 2.8 `FolderDialog` コンポーネント
**責務**: フォルダ作成ダイアログ

**Props**:
- `isOpen: boolean`
- `folderName: string`
- `onFolderNameChange: (name: string) => void`
- `onConfirm: () => void`
- `onCancel: () => void`

**ファイル**: `src/renderer/src/components/FolderDialog.tsx`

#### 2.9 `PasswordPromptDialog` コンポーネント
**責務**: パスワード入力ダイアログ

**Props**:
- `connection: Connection`
- `password: string`
- `onPasswordChange: (password: string) => void`
- `onConfirm: () => void`
- `onCancel: () => void`

**ファイル**: `src/renderer/src/components/PasswordPromptDialog.tsx`

#### 2.10 `WelcomeScreen` コンポーネント
**責務**: ウェルカム画面の表示

**Props**:
- `onNewConnection: () => void`

**ファイル**: `src/renderer/src/components/WelcomeScreen.tsx`

#### 2.11 `ErrorScreen` コンポーネント
**責務**: エラー画面の表示

**Props**:
- `errorMessage: string`
- `onClose: () => void`
- `onReconnect: () => void`

**ファイル**: `src/renderer/src/components/ErrorScreen.tsx`

### フェーズ3: ユーティリティ関数の抽出

#### 3.1 `connectionTreeUtils.ts`
**関数**:
- `buildConnectionTree(connections, folders, folderInfos): ConnectionFolderNode`
- `sortNode(node: ConnectionFolderNode, folderInfos: FolderInfo[]): void`

**ファイル**: `src/renderer/src/utils/connectionTreeUtils.ts`

#### 3.2 `contextMenuUtils.ts`
**関数**:
- `calculateMenuPosition(event, menuWidth, menuHeight): { x: number; y: number }`

**ファイル**: `src/renderer/src/utils/contextMenuUtils.ts`

#### 3.3 `dragDropUtils.ts`
**関数**:
- `calculateDropPosition(event, targetRect): DropPosition`
- `isValidDropTarget(draggingItem, targetItem): boolean`

**ファイル**: `src/renderer/src/utils/dragDropUtils.ts`

### フェーズ4: 型定義の整理と拡張

#### 4.1 `types.ts` の拡張
**追加する型**:
```typescript
// ドラッグ&ドロップ関連
export type DragItem = 
  | { type: "connection"; id: string }
  | { type: "folder"; path: string };

export type DropPosition = {
  type: 'before' | 'after' | 'inside';
  targetId: string;
} | null;

export interface DragState {
  draggingItem: DragItem | null;
  dropTargetFolder: string | null;
  isRootDropTarget: boolean;
  dropPosition: DropPosition;
}

// タブ関連
export interface TabItem {
  id: string;
  label: string;
}

export interface TabStatus {
  state: "connecting" | "connected" | "error" | "disconnected";
  host?: string;
  username?: string;
  errorMessage?: string;
}

// コンテキストメニュー関連
export interface ContextMenuState {
  x: number;
  y: number;
  connection: Connection;
}

export interface TabContextMenuState {
  x: number;
  y: number;
  tabId: string;
}

export interface ListContextMenuState {
  x: number;
  y: number;
}

// 接続ツリー関連
export interface ConnectionFolderNode {
  id: string;
  name: string;
  path: string;
  children: ConnectionFolderNode[];
  connections: Connection[];
}
```

### フェーズ5: リファクタリング後のディレクトリ構造

```
src/renderer/src/
├── components/
│   ├── ui/                          # 既存のUIコンポーネント
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── label.tsx
│   │   ├── select.tsx
│   │   └── tabs.tsx
│   ├── connection/                  # 接続関連コンポーネント
│   │   ├── ConnectionItem.tsx       # 既存のConnectionItem
│   │   ├── ConnectionTree.tsx       # 新規
│   │   ├── FolderNode.tsx          # 新規
│   │   └── DropIndicator.tsx       # 既存のDropIndicator
│   ├── layout/                      # レイアウトコンポーネント
│   │   ├── Sidebar.tsx             # 新規
│   │   ├── TabBar.tsx              # 新規
│   │   └── StatusBar.tsx           # 新規
│   ├── dialogs/                     # ダイアログコンポーネント
│   │   ├── FolderDialog.tsx        # 新規
│   │   └── PasswordPromptDialog.tsx # 新規
│   ├── menus/                       # コンテキストメニュー
│   │   ├── ConnectionContextMenu.tsx # 新規
│   │   ├── TabContextMenu.tsx       # 新規
│   │   └── ListContextMenu.tsx      # 新規
│   └── screens/                     # 画面コンポーネント
│       ├── WelcomeScreen.tsx       # 新規
│       └── ErrorScreen.tsx         # 新規
├── hooks/                           # カスタムフック
│   ├── useConnections.ts           # 新規
│   ├── useTabManager.ts            # 新規
│   ├── useSshSession.ts            # 新規
│   ├── useDragAndDrop.ts           # 新規
│   ├── useContextMenu.ts           # 新規
│   ├── useKeyboardShortcuts.ts     # 新規
│   ├── useFolderDialog.ts          # 新規
│   └── usePasswordPrompt.ts        # 新規
├── utils/                           # ユーティリティ関数
│   ├── connectionTreeUtils.ts      # 新規
│   ├── contextMenuUtils.ts         # 新規
│   └── dragDropUtils.ts            # 新規
├── types.ts                         # 型定義（拡張）
├── App.tsx                          # リファクタリング後（約200-300行）
├── ConnectionEditor.tsx             # 既存
├── Terminal.tsx                     # 既存
├── globals.d.ts                     # 既存
├── index.css                        # 既存
└── main.tsx                         # 既存
```

## 実装順序

### ステップ1: ユーティリティ関数の抽出（影響範囲が小さい）
1. `connectionTreeUtils.ts` を作成
2. `contextMenuUtils.ts` を作成
3. `dragDropUtils.ts` を作成
4. `types.ts` を拡張

### ステップ2: カスタムフックの抽出（段階的に）
1. `useConnections.ts` を作成
2. `useTabManager.ts` を作成
3. `useSshSession.ts` を作成
4. `useDragAndDrop.ts` を作成
5. `useContextMenu.ts` を作成
6. `useKeyboardShortcuts.ts` を作成
7. `useFolderDialog.ts` を作成
8. `usePasswordPrompt.ts` を作成

### ステップ3: UIコンポーネントの抽出（ボトムアップ）
1. 小さなコンポーネントから開始:
   - `DropIndicator.tsx`（既存を移動）
   - `ConnectionItem.tsx`（既存を移動）
   - `WelcomeScreen.tsx`
   - `ErrorScreen.tsx`
   - `StatusBar.tsx`

2. 中規模コンポーネント:
   - `FolderNode.tsx`
   - `ConnectionTree.tsx`
   - `FolderDialog.tsx`
   - `PasswordPromptDialog.tsx`

3. コンテキストメニュー:
   - `ConnectionContextMenu.tsx`
   - `TabContextMenu.tsx`
   - `ListContextMenu.tsx`

4. 大規模コンポーネント:
   - `TabBar.tsx`
   - `Sidebar.tsx`

### ステップ4: App.tsx のリファクタリング
1. 抽出したフックとコンポーネントを統合
2. 不要なコードを削除
3. プロップスの受け渡しを整理

### ステップ5: テストと検証
1. 各機能が正常に動作することを確認
2. パフォーマンスの検証
3. コードレビュー

## 期待される効果

### コード品質の向上
- **可読性**: 1409行 → 約200-300行（App.tsx）
- **保守性**: 責務が明確に分離され、変更の影響範囲が限定される
- **テスト容易性**: 各フックとコンポーネントを独立してテスト可能

### 開発効率の向上
- **再利用性**: フックとコンポーネントを他の場所で再利用可能
- **並行開発**: 複数の開発者が異なるコンポーネントを同時に開発可能
- **デバッグ**: 問題の特定と修正が容易

### パフォーマンスの最適化
- **メモ化**: 各コンポーネントで適切なメモ化が可能
- **レンダリング最適化**: 不要な再レンダリングを削減

## リスクと対策

### リスク1: 既存機能の破壊
**対策**: 段階的なリファクタリングと各ステップでの動作確認

### リスク2: パフォーマンスの低下
**対策**: React DevTools Profilerでパフォーマンスを監視

### リスク3: 複雑性の増加
**対策**: 適切な抽象化レベルを維持し、過度な分割を避ける

## 次のステップ

1. このリファクタリング計画をレビュー
2. 優先順位の高い部分から実装開始
3. 各ステップで動作確認とコミット
4. ドキュメントの更新