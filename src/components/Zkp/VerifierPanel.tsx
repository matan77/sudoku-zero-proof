import { Check, X } from 'lucide-react';
import { challengeLabel, type PublicRound } from '@/logic/zkp';
import type { SudokuBoard } from '@/logic/sudoku';
import SudokuGrid from './SudokuGrid';

interface VerifierPanelProps {
  puzzle: SudokuBoard;
  round: PublicRound | null;
  highlighted: Array<[number, number]>;
  commitments: string[][] | null;
}

export default function VerifierPanel({ puzzle, round, highlighted, commitments }: VerifierPanelProps) {
  return (
    <section className="space-y-3" aria-labelledby="verifier-heading">
      <h2 id="verifier-heading" className="text-lg font-semibold">Verifier</h2>
      <p className="min-h-10 text-sm leading-5 text-slate-600">The Verifier sees the puzzle and the requested openings, not the solution or digit mapping.</p>
      <SudokuGrid
        board={puzzle}
        label="Verifier Sudoku puzzle"
        revealed={round?.revealedCells}
        highlighted={highlighted}
      />
      {commitments && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium">
            Commitments received: {commitments.flat().length} SHA-256 hashes
          </summary>
          <div className="mt-2 overflow-x-auto">
            <table className="min-w-[720px] table-fixed border-collapse font-mono text-[9px]">
              <tbody>
                {commitments.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {row.map((hash, colIndex) => (
                      <td
                        key={`${rowIndex}-${colIndex}`}
                        aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1} commitment`}
                        className="break-all border border-slate-200 p-1 text-slate-600"
                      >
                        {hash}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1 text-xs text-slate-500">These are the public hashes, not the hidden committed digits.</p>
          </div>
        </details>
      )}
      {round ? (
        <div className="space-y-1 text-sm">
          <p><span className="text-slate-500">Round {round.roundNumber} challenge:</span> {challengeLabel(round.challenge)}</p>
          <p className="flex items-center gap-1">
            {round.result.passed
              ? <Check size={16} className="text-green-700" />
              : <X size={16} className="text-red-700" />}
            {round.result.passed ? 'Passed' : 'Failed'} — {round.result.reason}
          </p>
          <p className="text-xs text-slate-500">{round.revealedCells.length} cell openings checked</p>
        </div>
      ) : (
        <p className="text-sm text-slate-500">The verifier will choose one of 28 challenges after the commitments are created.</p>
      )}
    </section>
  );
}
