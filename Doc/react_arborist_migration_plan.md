# react-arborist 移行計画

## 概要

現在のカスタムツリー実装を`react-arborist`ライブラリに置き換える詳細な移行計画です。

---

## 1. 移行の目標

### 達成したいこと
- ✅ コード量の削減（約60%削減見込み）
- ✅ メンテナンスコストの削減
- ✅ パフォーマンスの向上（仮想化による）
- ✅ 既存機能の完全な維持
- ✅ 将来的な拡張性の向上

### 維持すべき機能
1. フォルダとコネクションの階層構造表示
2. ドラッグ&ドロップによる並び替え
3. フォルダの展開/折りたたみ
4. カスタムソート（order値による）
5. コンテキストメニュー
6. カスタムスタイリング（Tailwind CSS）
7. ドロップインジケーター

---

## 2. データ構造の変換設計

### 現在のデータ構造

```typescript
// 現在の型定義（types.ts）
export interface Connection {
  id: string;
  name: string;
  folderPath?: string;
  host: string;
  port: number;
  username: string;
  auth: { type: 'password' | 'key'; password?: string; keyPath?: string; };
  createdAt: string;
  updatedAt: string;
  order?: number;
}

export interface ConnectionFolderNode {
  id: string;
  name: string;
  path: string;
  children: ConnectionFolderNode[];
  connections: Connection[];
}
```

### react-arborist用のデータ構造

```typescript
// 新しい型定義（追加）
export interface ArboristNodeData {
  id: string;
  name: string;
  type: 'folder' | 'connection';
  
  // フォルダの場合
  path?: string;
  
  // コネクションの場合
  connection?: Connection;
  
  // 共通
  order?: number;
  children?: ArboristNodeData[];
}
```

### 変換関数の設計

```typescript
// utils/arboristDataConverter.ts（新規作成）

/**
 * ConnectionFolderNodeをreact-arborist用のデータに変換
 */
export function convertToArboristData(
  node: ConnectionFolderNode,
  folderInfos?: FolderInfo[]
): ArboristNodeData[] {
  const result: ArboristNodeData[] = [];
  
  // フォルダを追加
  node.children.forEach(child => {
    const folderInfo = folderInfos?.find(f => f.path === child.path);
    result.push({
      id: child.path,
      name: child.name,
      type: 'folder',
      path: child.path,
      order: folderInfo?.order,
      children: convertToArboristData(child, folderInfos)
    });
  });
  
  // コネクションを追加
  node.connections.forEach(conn => {
    result.push({
      id: conn.id,
      name: conn.name,
      type: 'connection',
      connection: conn,
      order: conn.order
    });
  });
  
  // order順にソート
  return result.sort((a, b) => {
    const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
    const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
    if (orderA !== orderB) return orderA - orderB;
    return a.name.localeCompare(b.name, 'ja');
  });
}

/**
 * フラットなデータ構造に変換（react-arboristが内部で使用）
 */
export function flattenArboristData(
  nodes: ArboristNodeData[],
  parentId: string | null = null
): ArboristNodeData[] {
  const result: ArboristNodeData[] = [];
  
  nodes.forEach(node => {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenArboristData(node.children, node.id));
    }
  });
  
  return result;
}
```

---

## 3. コンポーネント実装計画

### 3.1 新しいファイル構成

```
SemiTerm/src/renderer/src/
├── components/
│   ├── connection/
│   │   ├── ArboristConnectionTree.tsx    # 新規: react-arboristのラッパー
│   │   ├── ArboristNode.tsx              # 新規: カスタムノードコンポーネント
│   │   ├── ConnectionItem.tsx            # 既存: 再利用（一部修正）
│   │   ├── DropIndicator.tsx             # 既存: 再利用
│   │   ├── FolderNode.tsx                # 削除予定
│   │   └── ...
│   └── layout/
│       ├── Sidebar.tsx                    # 既存: 修正
│       └── ...
├── hooks/
│   ├── useArboristTree.ts                # 新規: react-arborist用フック
│   ├── useConnections.ts                 # 既存: 一部修正
│   ├── useDragAndDrop.ts                 # 既存: 大幅修正
│   └── ...
├── utils/
│   ├── arboristDataConverter.ts          # 新規: データ変換ユーティリティ
│   ├── connectionTreeUtils.ts            # 既存: 保持（後方互換性）
│   └── ...
└── types.ts                               # 既存: 型追加
```

### 3.2 ArboristConnectionTree コンポーネント

```typescript
// components/connection/ArboristConnectionTree.tsx

import { Tree, NodeRendererProps } from 'react-arborist';
import { ArboristNode } from './ArboristNode';
import { ArboristNodeData } from '../../types';

interface ArboristConnectionTreeProps {
  data: ArboristNodeData[];
  onConnect: (connection: Connection) => void;
  onConnectionContextMenu: (event: React.MouseEvent, connection: Connection) => void;
  onSidebarContextMenu: (event: React.MouseEvent) => void;
  onMove: (args: { dragIds: string[]; parentId: string | null; index: number }) => void;
  width: number;
  height: number;
}

export function ArboristConnectionTree({
  data,
  onConnect,
  onConnectionContextMenu,
  onSidebarContextMenu,
  onMove,
  width,
  height
}: ArboristConnectionTreeProps) {
  return (
    <Tree
      data={data}
      openByDefault={false}
      width={width}
      height={height}
      indent={16}
      rowHeight={36}
      overscanCount={5}
      onMove={onMove}
      disableDrag={(node) => false}
      disableDrop={(args) => {
        // フォルダを自分自身や子孫にドロップできないようにする
        if (args.dragNodes.some(n => n.data.type === 'folder')) {
          const dragNode = args.dragNodes[0];
          if (args.parentNode?.id === dragNode.id) return true;
          if (args.parentNode?.id.startsWith(`${dragNode.id}/`)) return true;
        }
        return false;
      }}
    >
      {(props: NodeRendererProps<ArboristNodeData>) => (
        <ArboristNode
          {...props}
          onConnect={onConnect}
          onConnectionContextMenu={onConnectionContextMenu}
          onSidebarContextMenu={onSidebarContextMenu}
        />
      )}
    </Tree>
  );
}
```

### 3.3 ArboristNode コンポーネント

```typescript
// components/connection/ArboristNode.tsx

import { NodeRendererProps } from 'react-arborist';
import { ChevronRight, Folder, FolderOpen, Server } from 'lucide-react';
import { ArboristNodeData, Connection } from '../../types';

interface ArboristNodeProps extends NodeRendererProps<ArboristNodeData> {
  onConnect: (connection: Connection) => void;
  onConnectionContextMenu: (event: React.MouseEvent, connection: Connection) => void;
  onSidebarContextMenu: (event: React.MouseEvent) => void;
}

export function ArboristNode({
  node,
  style,
  dragHandle,
  onConnect,
  onConnectionContextMenu,
  onSidebarContextMenu
}: ArboristNodeProps) {
  const { data } = node;
  const isFolder = data.type === 'folder';
  
  const handleClick = () => {
    if (isFolder) {
      node.toggle();
    } else if (data.connection) {
      onConnect(data.connection);
    }
  };
  
  const handleContextMenu = (event: React.MouseEvent) => {
    event.preventDefault();
    if (isFolder) {
      onSidebarContextMenu(event);
    } else if (data.connection) {
      onConnectionContextMenu(event, data.connection);
    }
  };
  
  return (
    <div
      ref={dragHandle}
      style={style}
      className={`flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer text-gray-200 transition-all duration-150 ${
        node.state.isDragging
          ? 'opacity-40 scale-95 ring-2 ring-blue-400 bg-blue-500/10'
          : 'hover:bg-gray-700'
      } ${
        node.state.isSelected ? 'bg-blue-500/20' : ''
      }`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {isFolder && (
        <>
          <ChevronRight
            className={`w-4 h-4 transition-transform ${
              node.isOpen ? 'rotate-90' : ''
            }`}
          />
          {node.isOpen ? (
            <FolderOpen className="w-4 h-4 text-gray-300" />
          ) : (
            <Folder className="w-4 h-4 text-gray-400" />
          )}
        </>
      )}
      
      {!isFolder && (
        <Server className="w-5 h-5 text-gray-400 ml-4" />
      )}
      
      <div className="flex-1 leading-tight">
        <div className="font-medium text-gray-100 text-sm truncate">
          {data.name}
        </div>
        {!isFolder && data.connection && (
          <div className="text-gray-400 text-xs">
            {data.connection.username}@{data.connection.host}
          </div>
        )}
      </div>
    </div>
  );
}
```

### 3.4 useArboristTree フック

```typescript
// hooks/useArboristTree.ts

import { useCallback, useMemo } from 'react';
import { Connection, ConnectionStoreState, ArboristNodeData } from '../types';
import { convertToArboristData } from '../utils/arboristDataConverter';
import { buildConnectionTree } from '../utils/connectionTreeUtils';

interface UseArboristTreeProps {
  connections: Connection[];
  folders: string[];
  folderInfos: FolderInfo[];
  moveConnectionToFolder: (connectionId: string, targetFolderPath?: string) => Promise<void>;
  moveFolderToTarget: (folderPath: string, targetFolderPath?: string) => Promise<void>;
  applyConnectionState: (state: ConnectionStoreState) => void;
}

export function useArboristTree({
  connections,
  folders,
  folderInfos,
  moveConnectionToFolder,
  moveFolderToTarget,
  applyConnectionState
}: UseArboristTreeProps) {
  // ツリーデータの構築
  const treeData = useMemo(() => {
    const tree = buildConnectionTree(connections, folders, folderInfos);
    return convertToArboristData(tree, folderInfos);
  }, [connections, folders, folderInfos]);
  
  // ドラッグ&ドロップハンドラー
  const handleMove = useCallback(async ({
    dragIds,
    parentId,
    index
  }: {
    dragIds: string[];
    parentId: string | null;
    index: number;
  }) => {
    const dragId = dragIds[0]; // 単一アイテムのみサポート
    
    // ドラッグしているアイテムの種類を判定
    const connection = connections.find(c => c.id === dragId);
    const isFolder = folders.includes(dragId);
    
    if (connection) {
      // コネクションの移動
      await moveConnectionToFolder(dragId, parentId || undefined);
    } else if (isFolder) {
      // フォルダの移動
      await moveFolderToTarget(dragId, parentId || undefined);
    }
    
    // 並び順の更新
    // TODO: index を使用して order を更新する処理を実装
    // この部分は既存のバックエンドAPIに order 更新機能が必要
  }, [connections, folders, moveConnectionToFolder, moveFolderToTarget]);
  
  return {
    treeData,
    handleMove
  };
}
```

---

## 4. 段階的移行手順

### フェーズ1: 準備（1日目）

#### ステップ1.1: ライブラリのインストール
```bash
cd SemiTerm
npm install react-arborist
npm install --save-dev @types/react-arborist
```

#### ステップ1.2: 型定義の追加
- [ ] `types.ts`に`ArboristNodeData`型を追加
- [ ] 既存の型定義との互換性を確認

#### ステップ1.3: ユーティリティ関数の作成
- [ ] `utils/arboristDataConverter.ts`を作成
- [ ] `convertToArboristData`関数を実装
- [ ] `flattenArboristData`関数を実装
- [ ] ユニットテストを作成（オプション）

### フェーズ2: コンポーネント実装（1日目〜2日目）

#### ステップ2.1: 基本コンポーネントの作成
- [ ] `components/connection/ArboristNode.tsx`を作成
- [ ] 基本的なレンダリングを実装
- [ ] スタイリングを適用（Tailwind CSS）

#### ステップ2.2: ツリーコンポーネントの作成
- [ ] `components/connection/ArboristConnectionTree.tsx`を作成
- [ ] react-arboristの基本設定を実装
- [ ] ドラッグ&ドロップの制約を設定

#### ステップ2.3: カスタムフックの作成
- [ ] `hooks/useArboristTree.ts`を作成
- [ ] データ変換ロジックを実装
- [ ] ドラッグ&ドロップハンドラーを実装

### フェーズ3: 統合とテスト（2日目）

#### ステップ3.1: Sidebarコンポーネントの修正
- [ ] `Sidebar.tsx`を修正して新しいツリーコンポーネントを使用
- [ ] 既存のpropsを新しいコンポーネントに適合させる
- [ ] 条件付きレンダリングで新旧を切り替え可能にする（フィーチャーフラグ）

```typescript
// Sidebar.tsx の修正例
const USE_ARBORIST = true; // フィーチャーフラグ

return (
  <div className="w-64 bg-[#1e293b] border-r border-gray-700 p-4 flex flex-col">
    {/* ヘッダー部分は変更なし */}
    
    {USE_ARBORIST ? (
      <ArboristConnectionTree
        data={arboristTreeData}
        onConnect={onConnect}
        onConnectionContextMenu={onConnectionContextMenu}
        onSidebarContextMenu={onSidebarContextMenu}
        onMove={handleArboristMove}
        width={256}
        height={600}
      />
    ) : (
      // 既存の実装
      <div className="space-y-1 flex-1 overflow-y-auto">
        {/* 既存のツリー */}
      </div>
    )}
  </div>
);
```

#### ステップ3.2: 機能テスト
- [ ] フォルダの展開/折りたたみ
- [ ] コネクションのクリック
- [ ] ドラッグ&ドロップ（コネクション）
- [ ] ドラッグ&ドロップ（フォルダ）
- [ ] コンテキストメニュー
- [ ] ソート順の維持

#### ステップ3.3: パフォーマンステスト
- [ ] 大量データ（100+接続）での動作確認
- [ ] メモリ使用量の確認
- [ ] レンダリングパフォーマンスの測定

### フェーズ4: 最適化と仕上げ（3日目）

#### ステップ4.1: 細かい調整
- [ ] アニメーションの調整
- [ ] スタイリングの微調整
- [ ] アクセシビリティの確認

#### ステップ4.2: 並び順の永続化
- [ ] ドラッグ&ドロップ後のorder値更新
- [ ] バックエンドAPIの拡張（必要に応じて）
- [ ] 並び順の保存と復元

#### ステップ4.3: クリーンアップ
- [ ] 古いコンポーネントの削除
  - `FolderNode.tsx`
  - `useDragAndDrop.ts`の大部分
  - `dragDropHandlers.ts`
  - `dragDropUtils.ts`
- [ ] 未使用のimportの削除
- [ ] コードの整理とコメント追加

### フェーズ5: ドキュメントと完了（3日目）

#### ステップ5.1: ドキュメント更新
- [ ] README.mdの更新
- [ ] コンポーネントのJSDocコメント追加
- [ ] 移行ガイドの作成（このドキュメント）

#### ステップ5.2: 最終確認
- [ ] 全機能の動作確認
- [ ] エッジケースのテスト
- [ ] パフォーマンスの最終確認

---

## 5. リスクと対策

### リスク1: データ変換の複雑さ
**リスク**: 既存のデータ構造からreact-arborist形式への変換が複雑

**対策**:
- 変換関数を独立したユーティリティとして実装
- 十分なテストケースを用意
- 段階的に実装し、各ステップで動作確認

### リスク2: ドラッグ&ドロップの挙動の違い
**リスク**: react-arboristのドラッグ&ドロップが既存の挙動と異なる可能性

**対策**:
- `disableDrag`と`disableDrop`で細かく制御
- カスタムドラッグハンドラーで既存の挙動を再現
- ユーザーフィードバックを収集して調整

### リスク3: パフォーマンスの問題
**リスク**: 仮想化により予期しないパフォーマンス問題が発生

**対策**:
- `overscanCount`を調整
- `rowHeight`を最適化
- React DevTools Profilerで測定

### リスク4: スタイリングの不一致
**リスク**: 既存のTailwind CSSスタイルが適用されない

**対策**:
- ヘッドレスUIアプローチを活用
- カスタムNodeコンポーネントで完全制御
- 既存のスタイルを再利用

---

## 6. テスト計画

### 6.1 単体テスト

```typescript
// utils/arboristDataConverter.test.ts

describe('convertToArboristData', () => {
  it('should convert empty tree', () => {
    const input = createEmptyTree();
    const result = convertToArboristData(input);
    expect(result).toEqual([]);
  });
  
  it('should convert tree with connections only', () => {
    const input = createTreeWithConnections();
    const result = convertToArboristData(input);
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('connection');
  });
  
  it('should convert tree with folders', () => {
    const input = createTreeWithFolders();
    const result = convertToArboristData(input);
    expect(result[0].type).toBe('folder');
    expect(result[0].children).toBeDefined();
  });
  
  it('should maintain order', () => {
    const input = createTreeWithOrder();
    const result = convertToArboristData(input);
    expect(result[0].order).toBeLessThan(result[1].order);
  });
});
```

### 6.2 統合テスト

**テストシナリオ:**

1. **基本表示**
   - [ ] ツリーが正しく表示される
   - [ ] フォルダとコネクションが区別される
   - [ ] アイコンが正しく表示される

2. **展開/折りたたみ**
   - [ ] フォルダをクリックすると展開/折りたたみされる
   - [ ] 状態が保持される

3. **ドラッグ&ドロップ**
   - [ ] コネクションをフォルダにドロップできる
   - [ ] フォルダを別のフォルダにドロップできる
   - [ ] 無効なドロップが防止される
   - [ ] ドロップ後にデータが更新される

4. **コンテキストメニュー**
   - [ ] 右クリックでメニューが表示される
   - [ ] メニュー項目が正しく動作する

5. **パフォーマンス**
   - [ ] 100個の接続でスムーズに動作する
   - [ ] スクロールが滑らか
   - [ ] メモリリークがない

### 6.3 手動テスト チェックリスト

```markdown
## 機能テスト

- [ ] 空のツリーが正しく表示される
- [ ] コネクションのみのツリーが表示される
- [ ] フォルダ付きのツリーが表示される
- [ ] 深い階層（3階層以上）が正しく表示される
- [ ] フォルダの展開/折りたたみが動作する
- [ ] コネクションをクリックすると接続される
- [ ] コネクションを別のフォルダにドラッグできる
- [ ] フォルダを別のフォルダにドラッグできる
- [ ] フォルダを自分自身にドロップできない
- [ ] フォルダを子孫にドロップできない
- [ ] ドロップ後に並び順が保持される
- [ ] 右クリックメニューが表示される
- [ ] 新しい接続を追加できる
- [ ] 接続を編集できる
- [ ] 接続を削除できる
- [ ] フォルダを作成できる
- [ ] フォルダを削除できる

## UI/UXテスト

- [ ] ホバー時のスタイルが適用される
- [ ] ドラッグ中のスタイルが適用される
- [ ] ドロップインジケーターが表示される
- [ ] アニメーションがスムーズ
- [ ] スクロールが滑らか
- [ ] レスポンシブ（ウィンドウサイズ変更）

## パフォーマンステスト

- [ ] 10個の接続で動作確認
- [ ] 50個の接続で動作確認
- [ ] 100個の接続で動作確認
- [ ] 深い階層（5階層）で動作確認
- [ ] メモリ使用量が適切
```

---

## 7. ロールバック計画

万が一、移行に問題が発生した場合のロールバック手順:

### 即座のロールバック（フィーチャーフラグ使用）

```typescript
// Sidebar.tsx
const USE_ARBORIST = false; // falseに変更するだけ
```

### 完全なロールバック

1. 新しいファイルを削除:
   - `ArboristConnectionTree.tsx`
   - `ArboristNode.tsx`
   - `useArboristTree.ts`
   - `arboristDataConverter.ts`

2. `package.json`から`react-arborist`を削除:
   ```bash
   npm uninstall react-arborist
   ```

3. 修正したファイルをGitで元に戻す:
   ```bash
   git checkout -- SemiTerm/src/renderer/src/components/layout/Sidebar.tsx
   git checkout -- SemiTerm/src/renderer/src/types.ts
   ```

---

## 8. 成功の指標

移行が成功したと判断する基準:

### 必須条件
- ✅ 全ての既存機能が動作する
- ✅ パフォーマンスが維持または向上している
- ✅ バグが発生していない
- ✅ コードが読みやすく保守しやすい

### 望ましい条件
- ✅ コード量が60%以上削減されている
- ✅ レンダリング速度が向上している
- ✅ メモリ使用量が削減されている
- ✅ 将来的な機能追加が容易になっている

### 測定可能な指標

| 指標 | 現在 | 目標 | 測定方法 |
|------|------|------|----------|
| コード行数 | ~500行 | ~200行 | `cloc`コマンド |
| バンドルサイズ | - | +15KB以下 | webpack-bundle-analyzer |
| 初期レンダリング | - | <100ms | React DevTools Profiler |
| 100個の接続表示 | - | <200ms | React DevTools Profiler |
| メモリ使用量 | - | 現状維持 | Chrome DevTools |

---

## 9. 次のステップ

### 移行後の改善案

1. **検索機能の追加**
   - react-arboristの検索機能を活用
   - フィルタリング機能の実装

2. **キーボードナビゲーション**
   - 矢印キーでの移動
   - Enterキーで接続
   - Deleteキーで削除

3. **複数選択**
   - Ctrl+クリックで複数選択
   - 一括操作（移動、削除）

4. **アニメーション強化**
   - 展開/折りたたみのアニメーション
   - ドラッグ&ドロップのフィードバック改善

5. **アクセシビリティ向上**
   - ARIA属性の追加
   - スクリーンリーダー対応

---

## 10. まとめ

この移行計画に従うことで、以下を達成できます:

1. **コードの簡素化**: カスタム実装からライブラリへの移行
2. **パフォーマンス向上**: 仮想化による高速レンダリング
3. **保守性の向上**: 標準的なライブラリの使用
4. **将来の拡張性**: 豊富な機能を活用可能

**推定工数**: 2-3日  
**リスクレベル**: 低（段階的移行とロールバック計画により）  
**推奨開始時期**: 即座に開始可能

---

## 付録A: react-arborist API リファレンス

### 主要なProps

```typescript
interface TreeProps<T> {
  data: T[];                    // ツリーデータ
  openByDefault?: boolean;      // デフォルトで展開するか
  width: number;                // 幅
  height: number;               // 高さ
  indent?: number;              // インデント幅（デフォルト: 24）
  rowHeight?: number;           // 行の高さ（デフォルト: 32）
  overscanCount?: number;       // オーバースキャン数（デフォルト: 1）
  onMove?: (args: MoveArgs) => void;  // ドラッグ&ドロップハンドラー
  disableDrag?: (node: Node<T>) => boolean;  // ドラッグ無効化
  disableDrop?: (args: DropArgs<T>) => boolean;  // ドロップ無効化
  children: (props: NodeRendererProps<T>) => React.ReactNode;  // ノードレンダラー
}
```

### NodeRendererProps

```typescript
interface NodeRendererProps<T> {
  node: Node<T>;                // ノードオブジェクト
  style: React.CSSProperties;   // スタイル（必須）
  dragHandle: React.Ref;        // ドラッグハンドル（必須）
}
```

### Node API

```typescript
interface Node<T> {
  id: string;
  data: T;
  level: number;
  isOpen: boolean;
  isSelected: boolean;
  state: {
    isDragging: boolean;
    isDropTarget: boolean;
  };
  toggle(): void;
  select(): void;
  // ... その他のメソッド
}
```

---

## 付録B: トラブルシューティング

### 問題1: ツリーが表示されない

**原因**: データ構造が正しくない

**解決策**:
```typescript
// データが正しい形式か確認
console.log('Tree data:', treeData);

// 各ノードにidとchildrenがあるか確認
treeData.forEach(node => {
  console.log('Node:', node.id, 'Children:', node.children?.length);
});
```

### 問題2: ドラッグ&ドロップが動作しない

**原因**: `dragHandle`が正しく設定されていない

**解決策**:
```typescript
// ArboristNode.tsx
<div ref={dragHandle} ...>  // dragHandleを必ず設定
```

### 問題3: パフォーマンスが悪い

**原因**: 仮想化の設定が不適切

**解決策**:
```typescript
<Tree
  overscanCount={3}  // 増やす
  rowHeight={36}     // 固定値を設定
  // ...
/>
```

### 問題4: スタイルが適用されない

**原因**: `style`プロパティが設定されていない

**解決策**:
```typescript
// ArboristNode.tsx
<div style={style} ...>  // styleを必ず設定
```

---

**作成日**: 2026-01-06  
**最終更新**: 2026-01-06  
**バージョン**: 1.0