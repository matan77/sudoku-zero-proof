import { useState } from 'react';
import type { SolvedSudoku, SudokuBoard } from '@/logic/sudoku';
import type { ProverMode } from '@/types/protocol';
import SudokuGrid from './SudokuGrid';

interface ProverPanelProps {
  puzzle: SudokuBoard;
  board: SolvedSudoku | null;
  mode: ProverMode;
  busy: boolean;
  stageIndex: number;
  roundNumber: number;
  invalidCells: Set<string>;
  boardIsValid: boolean;
}

export default function ProverPanel({
  puzzle,
  board,
  mode,
  busy,
  stageIndex,
  roundNumber,
  invalidCells,
  boardIsValid,
}: ProverPanelProps) {
  const [showBoard, setShowBoard] = useState(false);

  return (
    <section className="space-y-3" aria-labelledby="prover-heading">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="prover-heading" className="text-lg font-semibold">Prover</h2>
        {board && <span className="text-sm text-slate-500">{mode === 'honest' ? 'Honest' : 'Cheating'}</span>}
      </div>
      <p className="min-h-10 text-sm leading-5 text-slate-600">
        {board ? 'The board stays hidden. Only cells needed for the current challenge are opened.' : 'Start a round to solve the puzzle and create commitments.'}
      </p>
      <SudokuGrid
        board={board ? puzzle.map((row) => row.map(() => null)) : puzzle}
        label="Prover commitments"
        givenBoard={puzzle}
        concealed={board !== null}
      />
      <p className="text-xs text-slate-500">
        {board ? (busy && stageIndex < 3 ? 'Creating commitments…' : '81 SHA-256 commitments') : 'No commitments yet'}
        {board && roundNumber > 0 && ` · Round ${roundNumber}`}
      </p>
      {board && (
        <div>
          <button type="button" onClick={() => setShowBoard((visible) => !visible)} className="text-sm underline underline-offset-2">
            {showBoard ? 'Hide full board' : 'Reveal full board'}
          </button>
          {showBoard && (
            <div className="mt-3 space-y-2">
              <p className={`text-sm ${boardIsValid ? 'text-green-800' : 'text-red-800'}`}>
                {boardIsValid ? 'Valid Sudoku solution' : 'Invalid Sudoku solution'}
              </p>
              <SudokuGrid board={board} givenBoard={puzzle} label="Revealed Prover board" invalidCells={invalidCells} />
              <p className="text-xs text-slate-500">Red cells have a duplicate in their row, column, or box.</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
