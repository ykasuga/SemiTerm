import React from 'react';
import { Button } from '@renderer/components/ui/button';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@renderer/components/ui/select';

interface AuthenticationFieldsProps {
  authType: 'password' | 'key';
  password?: string;
  keyPath?: string;
  onAuthTypeChange: (value: 'password' | 'key') => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyPathChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBrowseKeyFile: () => void;
}

export const AuthenticationFields = React.memo<AuthenticationFieldsProps>(({
  authType,
  password,
  keyPath,
  onAuthTypeChange,
  onPasswordChange,
  onKeyPathChange,
  onBrowseKeyFile
}) => {
  return (
    <>
      <div className="grid w-full items-center gap-1.5">
        <Label>認証方式</Label>
        <Select onValueChange={onAuthTypeChange} value={authType}>
          <SelectTrigger className="bg-gray-800 border-gray-600">
            <SelectValue placeholder="認証方式を選択" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 text-white border-gray-600">
            <SelectItem value="password">パスワード</SelectItem>
            <SelectItem value="key">秘密鍵</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {authType === 'password' ? (
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            value={password || ''}
            onChange={onPasswordChange}
            className="bg-gray-800 border-gray-600"
          />
        </div>
      ) : (
        <div className="grid w-full items-center gap-1.5">
          <Label htmlFor="keyPath">Key Path</Label>
          <div className="flex gap-2">
            <Input
              id="keyPath"
              name="keyPath"
              value={keyPath || ''}
              onChange={onKeyPathChange}
              className="bg-gray-800 border-gray-600"
            />
            <Button
              type="button"
              variant="outline"
              className="border-white text-white hover:bg-white/10"
              onClick={onBrowseKeyFile}
            >
              参照
            </Button>
          </div>
        </div>
      )}
      <p className="text-xs text-gray-500 pt-2">
        パスワードは保存されません（毎回入力が必要です）。
      </p>
    </>
  );
});

AuthenticationFields.displayName = 'AuthenticationFields';

// Made with Bob
