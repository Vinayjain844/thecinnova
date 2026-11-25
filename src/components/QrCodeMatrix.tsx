import React, { useMemo } from 'react';

interface QrCodeMatrixProps {
  value: string;
  size?: number;
  className?: string;
}

export const QrCodeMatrix: React.FC<QrCodeMatrixProps> = ({
  value,
  size = 132,
  className = '',
}) => {
  const gridSize = 21;

  const matrix = useMemo(() => {
    const cells: boolean[][] = Array.from({ length: gridSize }, () =>
      Array.from({ length: gridSize }, () => false)
    );

    const drawFinder = (startRow: number, startCol: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          const isBorder = r === 0 || r === 6 || c === 0 || c === 6;
          const isInner = r >= 2 && r <= 4 && c >= 2 && c <= 4;
          cells[startRow + r][startCol + c] = isBorder || isInner;
        }
      }
    };

    drawFinder(0, 0);
    drawFinder(0, gridSize - 7);
    drawFinder(gridSize - 7, 0);

    // Deterministic pseudo-random fill from booking string
    let seed = 2166136261;
    for (let i = 0; i < value.length; i++) {
      seed ^= value.charCodeAt(i);
      seed = Math.imul(seed, 16777619);
    }

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const inTopLeft = r < 8 && c < 8;
        const inTopRight = r < 8 && c >= gridSize - 8;
        const inBottomLeft = r >= gridSize - 8 && c < 8;
        if (inTopLeft || inTopRight || inBottomLeft) continue;

        if (r === 6 || c === 6) {
          cells[r][c] = (r + c) % 2 === 0;
          continue;
        }

        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        cells[r][c] = (seed >>> 0) % 100 < 48;
      }
    }

    return cells;
  }, [value]);

  const cellSize = 100 / gridSize;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-white p-2.5 shadow-xs ring-1 ring-slate-200 ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        role="img"
        aria-label={`QR Ticket Code for ${value}`}
      >
        <rect width="100" height="100" fill="#FFFFFF" />
        {matrix.map((row, r) =>
          row.map((filled, c) =>
            filled ? (
              <rect
                key={`${r}-${c}`}
                x={c * cellSize}
                y={r * cellSize}
                width={cellSize + 0.15}
                height={cellSize + 0.15}
                fill="#0F172A"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
