import { Button } from '../ui/button';

interface WelcomeScreenProps {
  onNewConnection: () => void;
}

export function WelcomeScreen({ onNewConnection }: WelcomeScreenProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-300">
      <div className="text-5xl mb-4">{'>'}_</div>
      <div className="text-xl mb-6">SemiTerm 軽量 SSH ターミナル</div>
      <Button onClick={onNewConnection}>新しい接続を作成</Button>
    </div>
  );
}

// Made with Bob
