import { memo } from 'react';
import { TabStatus } from '../../types';

interface StatusBarProps {
  status?: TabStatus;
}

const StatusBarComponent = ({ status }: StatusBarProps) => {
  return (
    <div className="h-6 bg-[#1e293b] border-t border-gray-700 flex items-center justify-between px-4 text-xs">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1">
          <span
            className={`w-2 h-2 rounded-full ${
              status?.state === "connected"
                ? "bg-green-400"
                : status?.state === "error"
                  ? "bg-red-400"
                  : status?.state === "connecting"
                    ? "bg-yellow-400"
                    : "bg-gray-500"
            }`}
          />
          <span>
            {status?.state === "connected"
              ? "接続中"
              : status?.state === "connecting"
                ? "接続中..."
                : status?.state === "error"
                  ? `エラー: ${status.errorMessage}`
                  : "切断"}
          </span>
        </div>
        <div>
          {status?.username ? `${status.username}@${status.host}` : "--"}
        </div>
      </div>
      <div>Log Level: debug</div>
    </div>
  );
};

// メモ化されたコンポーネントをエクスポート
export const StatusBar = memo(StatusBarComponent, (prevProps, nextProps) => {
  // statusの比較
  if (prevProps.status === nextProps.status) return true;
  if (!prevProps.status || !nextProps.status) return false;
  
  return (
    prevProps.status.state === nextProps.status.state &&
    prevProps.status.username === nextProps.status.username &&
    prevProps.status.host === nextProps.status.host &&
    prevProps.status.errorMessage === nextProps.status.errorMessage
  );
});

StatusBar.displayName = 'StatusBar';

// Made with Bob
