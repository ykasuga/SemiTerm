import { useState, useEffect } from 'react';
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
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';

interface ConnectionEditorProps {
  connection: Connection | null;
  onSave: (connection: Connection) => void;
  onCancel: () => void;
}

const initialConnectionState: Omit<Connection, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  folderPath: '',
  host: '',
  port: 22,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value) || 0 : value }));
  };

  const handleAuthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, auth: { ...prev.auth, [name]: value } }));
  };
  
  const handleAuthTypeChange = (value: 'password' | 'key') => {
    setFormData(prev => ({
      ...prev,
      auth: value === 'password'
        ? { type: 'password', password: prev.auth.type === 'password' ? prev.auth.password : '' }
        : { type: 'key', keyPath: prev.auth.type === 'key' ? prev.auth.keyPath : '' }
    }));
  };

  const handleBrowseKeyFile = async () => {
    const selectedPath = await window.api.openKeyFileDialog();
    if (selectedPath) {
      setFormData(prev => ({
        ...prev,
        auth: { type: 'key', keyPath: selectedPath }
      }));
    }
  };

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
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="name">接続名</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} className="bg-gray-800 border-gray-600" />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="folderPath">フォルダ (例: Production/DB)</Label>
            <Input id="folderPath" name="folderPath" placeholder="任意" value={formData.folderPath || ''} onChange={handleChange} className="bg-gray-800 border-gray-600" />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="host">Host</Label>
            <Input id="host" name="host" value={formData.host} onChange={handleChange} className="bg-gray-800 border-gray-600" />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="port">Port</Label>
            <Input id="port" name="port" type="number" value={formData.port} onChange={handleChange} className="bg-gray-800 border-gray-600" />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label htmlFor="username">Username</Label>
            <Input id="username" name="username" value={formData.username} onChange={handleChange} className="bg-gray-800 border-gray-600" />
          </div>
          <div className="grid w-full items-center gap-1.5">
            <Label>認証方式</Label>
            <Select onValueChange={handleAuthTypeChange} value={formData.auth.type}>
              <SelectTrigger className="bg-gray-800 border-gray-600">
                <SelectValue placeholder="認証方式を選択" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-600">
                <SelectItem value="password">パスワード</SelectItem>
                <SelectItem value="key">秘密鍵</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.auth.type === 'password' ? (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" value={formData.auth.password || ''} onChange={handleAuthChange} className="bg-gray-800 border-gray-600" />
            </div>
          ) : (
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="keyPath">Key Path</Label>
              <div className="flex gap-2">
                <Input
                  id="keyPath"
                  name="keyPath"
                  value={formData.auth.keyPath || ''}
                  onChange={handleAuthChange}
                  className="bg-gray-800 border-gray-600"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="border-white text-white hover:bg-white/10"
                  onClick={handleBrowseKeyFile}
                >
                  参照
                </Button>
              </div>
            </div>
          )}
           <p className="text-xs text-gray-500 pt-2">パスワードは保存されません（毎回入力が必要です）。</p>
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
