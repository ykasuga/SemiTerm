import { useState, useEffect, useCallback } from 'react';
import { Connection } from './types';
import { Button } from '@renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@renderer/components/ui/dialog';
import { ConnectionInfoFields } from './components/forms/ConnectionInfoFields';
import { AuthenticationFields } from './components/forms/AuthenticationFields';
import { SSH_DEFAULTS } from '../../shared/constants';

interface ConnectionEditorProps {
  connection: Connection | null;
  onSave: (connection: Connection) => void;
  onCancel: () => void;
}

const initialConnectionState: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  folderPath: '',
  host: '',
  port: SSH_DEFAULTS.PORT,
  username: '',
  auth: { type: 'password', password: '' },
};

export default function ConnectionEditor({ connection, onSave, onCancel }: ConnectionEditorProps) {
  const [formData, setFormData] = useState(initialConnectionState);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    if (connection) {
      setFormData({
        name: connection.name,
        folderPath: connection.folderPath || '',
        host: connection.host,
        port: connection.port,
        username: connection.username,
        auth: { ...connection.auth },
      });
    } else {
      setFormData(initialConnectionState);
    }
  }, [connection]);

  useEffect(() => {
    // Validation logic from design doc
    const { name, host, username, auth } = formData;
    const isAuthValid = auth.type === 'password' ? auth.password : auth.keyPath;
    setIsValid(!!(name && host && username && isAuthValid));
  }, [formData]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value) || 0 : value }));
  }, []);

  const handleAuthChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, auth: { ...prev.auth, [name]: value } }));
  }, []);
  
  const handleAuthTypeChange = useCallback((value: 'password' | 'key') => {
    setFormData(prev => ({
      ...prev,
      auth: value === 'password'
        ? { type: 'password', password: prev.auth.type === 'password' ? prev.auth.password : '' }
        : { type: 'key', keyPath: prev.auth.type === 'key' ? prev.auth.keyPath : '' }
    }));
  }, []);

  const handleBrowseKeyFile = useCallback(async () => {
    const response = await window.api.openKeyFileDialog();
    if (response && response.success && response.data) {
      setFormData(prev => ({
        ...prev,
        auth: { type: 'key', keyPath: response.data as string }
      }));
    }
  }, []);

  const handleSave = () => {
    onSave({
      ...formData,
      folderPath: (formData.folderPath || '').split('/').map((segment) => segment.trim()).filter(Boolean).join('/'),
      id: connection?.id || '', // ID is handled by main process if empty
      createdAt: connection?.createdAt || '',
      updatedAt: connection?.updatedAt || '',
    });
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[480px] bg-[#1e293b] text-white border-gray-700">
        <DialogHeader>
          <DialogTitle>{connection ? '接続情報を編集' : '新しい接続'}</DialogTitle>
          <DialogDescription>
            SSHサーバーへの接続情報を入力してください。
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ConnectionInfoFields
            name={formData.name}
            folderPath={formData.folderPath || ''}
            host={formData.host}
            port={formData.port}
            username={formData.username}
            onChange={handleChange}
          />
          <AuthenticationFields
            authType={formData.auth.type}
            password={formData.auth.type === 'password' ? formData.auth.password || '' : ''}
            keyPath={formData.auth.type === 'key' ? formData.auth.keyPath || '' : ''}
            onAuthTypeChange={handleAuthTypeChange}
            onPasswordChange={handleAuthChange}
            onKeyPathChange={handleAuthChange}
            onBrowseKeyFile={handleBrowseKeyFile}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" className="border-white text-white hover:bg-white/10" onClick={onCancel}>Cancel</Button>
          <Button
            variant="outline"
            className="border-white text-white hover:bg-white/10 disabled:opacity-50"
            onClick={handleSave}
            disabled={!isValid}
          >
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
