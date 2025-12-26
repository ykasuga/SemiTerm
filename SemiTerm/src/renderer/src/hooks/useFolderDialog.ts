import { useState, useCallback } from 'react';

export interface UseFolderDialogReturn {
  isFolderDialogOpen: boolean;
  folderNameInput: string;
  setFolderNameInput: (name: string) => void;
  openFolderDialog: () => void;
  closeFolderDialog: () => void;
  handleCreateFolder: () => Promise<void>;
}

export const useFolderDialog = (
  applyConnectionState: (state: any) => void
): UseFolderDialogReturn => {
  const [isFolderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderNameInput, setFolderNameInput] = useState("");

  // フォルダダイアログを開く
  const openFolderDialog = useCallback(() => {
    setFolderNameInput("");
    setFolderDialogOpen(true);
  }, []);

  // フォルダダイアログを閉じる
  const closeFolderDialog = useCallback(() => {
    setFolderDialogOpen(false);
    setFolderNameInput("");
  }, []);

  // フォルダを作成
  const handleCreateFolder = useCallback(async () => {
    if (!folderNameInput.trim()) return;
    
    try {
      const state = await window.api.createFolder(folderNameInput.trim());
      applyConnectionState(state);
      closeFolderDialog();
    } catch (error) {
      console.error(error);
      alert("フォルダの作成に失敗しました");
    }
  }, [folderNameInput, applyConnectionState, closeFolderDialog]);

  return {
    isFolderDialogOpen,
    folderNameInput,
    setFolderNameInput,
    openFolderDialog,
    closeFolderDialog,
    handleCreateFolder
  };
};

// Made with Bob
