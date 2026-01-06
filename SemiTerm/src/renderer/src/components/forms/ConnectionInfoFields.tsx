import React from 'react';
import { Input } from '@renderer/components/ui/input';
import { Label } from '@renderer/components/ui/label';

interface ConnectionInfoFieldsProps {
  name: string;
  folderPath: string;
  host: string;
  port: number;
  username: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const ConnectionInfoFields = React.memo<ConnectionInfoFieldsProps>(({
  name,
  folderPath,
  host,
  port,
  username,
  onChange
}) => {
  return (
    <>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="name">接続名</Label>
        <Input
          id="name"
          name="name"
          value={name}
          onChange={onChange}
          className="bg-gray-800 border-gray-600"
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="folderPath">フォルダ (例: Production/DB)</Label>
        <Input
          id="folderPath"
          name="folderPath"
          placeholder="任意"
          value={folderPath || ''}
          onChange={onChange}
          className="bg-gray-800 border-gray-600"
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="host">Host</Label>
        <Input
          id="host"
          name="host"
          value={host}
          onChange={onChange}
          className="bg-gray-800 border-gray-600"
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="port">Port</Label>
        <Input
          id="port"
          name="port"
          type="number"
          value={port}
          onChange={onChange}
          className="bg-gray-800 border-gray-600"
        />
      </div>
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="username">Username</Label>
        <Input
          id="username"
          name="username"
          value={username}
          onChange={onChange}
          className="bg-gray-800 border-gray-600"
        />
      </div>
    </>
  );
});

ConnectionInfoFields.displayName = 'ConnectionInfoFields';

// Made with Bob
