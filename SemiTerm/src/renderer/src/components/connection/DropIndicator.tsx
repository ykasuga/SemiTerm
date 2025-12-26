interface DropIndicatorProps {
  position: 'before' | 'after';
}

export function DropIndicator({ position }: DropIndicatorProps) {
  return (
    <div
      className={`absolute left-0 right-0 h-0.5 bg-blue-400 ${
        position === 'before' ? '-top-0.5' : '-bottom-0.5'
      }`}
      style={{ zIndex: 50 }}
    >
      <div className="absolute left-0 w-2 h-2 bg-blue-400 rounded-full -translate-y-1/2 top-1/2" />
    </div>
  );
}

// Made with Bob
