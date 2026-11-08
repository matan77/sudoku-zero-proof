import { LockKeyhole } from 'lucide-react';
import type { PublicRound } from '@/logic/zkp';
import type { SudokuBoard } from '@/logic/sudoku';

interface SudokuGridProps {
  board: SudokuBoard;
  label: string;
  givenBoard?: SudokuBoard;
  revealed?: PublicRound['revealedCells'];
  highlighted?: Array<[number, number]>;
  invalidCells?: Set<string>;
  concealed?: boolean;
}

export default function SudokuGrid({
  board,
  label,
  givenBoard = board,
  revealed = [],
  highlighted = [],
  invalidCells = new Set<string>(),
  concealed = false,
}: SudokuGridProps) {
  const revealedByKey = new Map(revealed.map((cell) => [`${cell.row}-${cell.col}`, cell.value]));
  const highlightedCells = new Set(highlighted.map(([row, col]) => `${row}-${col}`));

  return (
    <div role="grid" aria-label={label} className="grid grid-cols-9 border border-slate-400 bg-white">
      {board.map((row, rowIndex) => row.map((value, colIndex) => {
        const key = `${rowIndex}-${colIndex}`;
        const revealedValue = revealedByKey.get(key);
        const isInvalid = invalidCells.has(key);
        const isHighlighted = highlightedCells.has(key);
        const isGiven = givenBoard[rowIndex][colIndex] !== null;
        const displayedValue = concealed
          ? <LockKeyhole aria-label="Committed and hidden" size={13} className="text-slate-500" />
          : revealedValue ?? value;

        return (
          <div
            role="gridcell"
            aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}${concealed ? ', committed and hidden' : displayedValue ? `, ${displayedValue}` : ', empty'}`}
            key={key}
            className={[
              'flex aspect-square items-center justify-center border-b border-r border-slate-200 text-sm sm:text-base',
              colIndex % 3 === 2 && colIndex !== 8 ? 'border-r-2 border-r-slate-500' : '',
              rowIndex % 3 === 2 && rowIndex !== 8 ? 'border-b-2 border-b-slate-500' : '',
              isInvalid ? 'bg-red-100 text-red-800' : revealedValue ? 'bg-green-100 text-green-900' : '',
              isHighlighted && !revealedValue && !isInvalid ? 'bg-amber-50' : '',
              isGiven && !revealedValue && !isInvalid ? 'bg-slate-100 font-semibold' : '',
              concealed ? 'bg-slate-50' : '',
            ].join(' ')}
          >
            {displayedValue}
          </div>
        );
      }))}
    </div>
  );
}
