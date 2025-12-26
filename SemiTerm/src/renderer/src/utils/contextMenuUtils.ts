/**
 * コンテキストメニューの位置を計算する
 * 画面外に出ないように調整する
 */
export const calculateMenuPosition = (
  event: React.MouseEvent,
  menuWidth: number,
  menuHeight: number
): { x: number; y: number } => {
  const { clientX, clientY } = event;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  let x = clientX;
  let y = clientY;

  // 右端を超える場合は左側に表示
  if (x + menuWidth > windowWidth) {
    x = windowWidth - menuWidth - 10;
  }

  // 下端を超える場合は上側に表示
  if (y + menuHeight > windowHeight) {
    y = windowHeight - menuHeight - 10;
  }

  // 最小値の確保
  x = Math.max(10, x);
  y = Math.max(10, y);

  return { x, y };
};

// Made with Bob
