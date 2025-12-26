import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Connection } from '../../types';

interface PasswordPromptDialogProps {
  connection: Connection | null;
  password: string;
  onPasswordChange: (password: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PasswordPromptDialog({
  connection,
  password,
  onPasswordChange,
  onConfirm,
  onCancel
}: PasswordPromptDialogProps) {
  if (!connection) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && password) {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <Dialog open={!!connection} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent
        className="sm:max-w-[400px] bg-[#1e293b] text-white border-gray-700"
        onKeyDown={handleKeyDown}
      >
        <DialogHeader>
          <DialogTitle>パスワードを入力</DialogTitle>
          <DialogDescription>
            {connection.username}@{connection.host} に接続するためのパスワードを入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Input
            type="password"
            value={password}
            autoFocus
            placeholder="Password"
            onChange={(e) => onPasswordChange(e.target.value)}
            className="bg-gray-800 border-gray-600"
          />
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            className="border-white text-white hover:bg-white/10"
            onClick={onCancel}
          >
            キャンセル
          </Button>
          <Button
            variant="outline"
            className="border-white text-white hover:bg-white/10 disabled:opacity-50"
            onClick={onConfirm}
            disabled={!password}
          >
            接続
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Made with Bob
