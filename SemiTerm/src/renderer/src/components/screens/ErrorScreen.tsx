import { Button } from '../ui/button';

interface ErrorScreenProps {
  errorMessage?: string;
  onClose: () => void;
  onReconnect: () => void;
}

export function ErrorScreen({ errorMessage, onClose, onReconnect }: ErrorScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
      <div className="text-red-400 text-2xl">⚠ 接続エラー</div>
      <p className="text-gray-300">{errorMessage || '接続に失敗しました。'}</p>
      <div className="flex space-x-3">
        <Button variant="outline" onClick={onClose}>タブを閉じる</Button>
        <Button onClick={onReconnect}>再接続</Button>
      </div>
    </div>
  );
}

// Made with Bob
