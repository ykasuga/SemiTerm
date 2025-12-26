import { useState, useCallback } from 'react';
import { Connection } from '../types';

export interface UsePasswordPromptReturn {
  pendingConnection: Connection | null;
  passwordInput: string;
  setPasswordInput: (password: string) => void;
  handleConnectRequest: (connection: Connection) => void;
  closePasswordPrompt: () => void;
  confirmPasswordAndConnect: () => void;
}

export const usePasswordPrompt = (
  openSshTab: (connection: Connection) => void,
  setConnections: React.Dispatch<React.SetStateAction<Connection[]>>
): UsePasswordPromptReturn => {
  const [pendingConnection, setPendingConnection] = useState<Connection | null>(null);
  const [passwordInput, setPasswordInput] = useState("");

  // 接続リクエストを処理
  const handleConnectRequest = useCallback((connection: Connection) => {
    if (connection.auth.type === "password" && !connection.auth.password) {
      setPendingConnection(connection);
      setPasswordInput("");
      return;
    }
    openSshTab(connection);
  }, [openSshTab]);

  // パスワードプロンプトを閉じる
  const closePasswordPrompt = useCallback(() => {
    setPendingConnection(null);
    setPasswordInput("");
  }, []);

  // パスワードを確認して接続
  const confirmPasswordAndConnect = useCallback(() => {
    if (!pendingConnection || !passwordInput) return;
    
    const updatedConnection: Connection = {
      ...pendingConnection,
      auth: { ...pendingConnection.auth, password: passwordInput },
    };
    
    setConnections((prev) => 
      prev.map((conn) => 
        conn.id === updatedConnection.id ? updatedConnection : conn
      )
    );
    
    closePasswordPrompt();
    openSshTab(updatedConnection);
  }, [pendingConnection, passwordInput, setConnections, closePasswordPrompt, openSshTab]);

  return {
    pendingConnection,
    passwordInput,
    setPasswordInput,
    handleConnectRequest,
    closePasswordPrompt,
    confirmPasswordAndConnect
  };
};

// Made with Bob
