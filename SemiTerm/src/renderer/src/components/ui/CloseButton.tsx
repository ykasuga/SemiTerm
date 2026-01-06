import React from 'react';

interface CloseButtonProps {
  onClick: (e: React.MouseEvent) => void;
  ariaLabel?: string;
  className?: string;
}

export const CloseButton = React.memo<CloseButtonProps>(({
  onClick,
  ariaLabel = 'Close',
  className = ''
}) => {
  return (
    <button
      className={`flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-600 ${className}`}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <span className="text-xs">×</span>
    </button>
  );
});

CloseButton.displayName = 'CloseButton';

// Made with Bob
