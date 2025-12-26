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

interface FolderDialogProps {
  isOpen: boolean;
  folderName: string;
  onFolderNameChange: (name: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function FolderDialog({
  isOpen,
  folderName,
  onFolderNameChange,
  onConfirm,
  onCancel
}: FolderDialogProps) {
  const sanitizedFolderInput = folderName
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

  const isFolderNameValid = sanitizedFolderInput.length > 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isFolderNameValid) {
      onConfirm();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>新しいフォルダを作成</DialogTitle>
          <DialogDescription>
            フォルダ名を入力してください。スラッシュ(/)で階層を区切ることができます。
          </DialogDescription>
        </DialogHeader>
        <Input
          placeholder="例: プロジェクト/開発環境"
          value={folderName}
          onChange={(e) => onFolderNameChange(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            キャンセル
          </Button>
          <Button onClick={onConfirm} disabled={!isFolderNameValid}>
            作成
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Made with Bob
