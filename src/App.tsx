import { useRef, useState } from 'react';
import {
  createCheatingBoard,
  generateSudokuPuzzle,
  getInvalidSudokuCells,
  isValidSolvedSudoku,
  solveSudoku,
  type SolvedSudoku,
  type SudokuBoard,
} from '@/logic/sudoku';
import {
  chooseChallenge,
  createPrivateRound,
  getChallengeCells,
  revealChallenge,
  calcConfidence,
  verifyChallenge,
  type PublicRound,
} from '@/logic/zkp';
import type { ProverMode, SessionStatus } from '@/types/protocol';
import ProtocolSummary from '@/components/Zkp/ProtocolSummary';
import ProverPanel from '@/components/Zkp/ProverPanel';
import SessionControls from '@/components/Zkp/SessionControls';
import VerifierPanel from '@/components/Zkp/VerifierPanel';

function App() {
  const [puzzle, setPuzzle] = useState<SudokuBoard>(() => generateSudokuPuzzle());
  const [proverMode, setProverMode] = useState<ProverMode>('honest');
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('ready');
  const [submittedBoard, setSubmittedBoard] = useState<SolvedSudoku | null>(null);
  const [currentRound, setCurrentRound] = useState<PublicRound | null>(null);
  const [verifierCommitments, setVerifierCommitments] = useState<string[][] | null>(null);
  const [successfulRounds, setSuccessfulRounds] = useState(0);
  const [stageIndex, setStageIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stopAfterRound = useRef(false);

  const confidence = calcConfidence(successfulRounds);
  const invalidCells = submittedBoard ? getInvalidSudokuCells(submittedBoard) : new Set<string>();
  const boardIsValid = submittedBoard !== null && isValidSolvedSudoku(submittedBoard);
  const highlightedCells = currentRound
    ? getChallengeCells(puzzle, currentRound.challenge)
    : [];
  const roundNumber = currentRound?.roundNumber ?? 0;
  const canContinue = sessionStatus === 'active' && currentRound?.result.passed === true;

  async function executeRound(board: SolvedSudoku, nextRound: number): Promise<void> {
    setStageIndex(1);
    const privateRound = createPrivateRound(board);
    setStageIndex(2);
    setVerifierCommitments(privateRound.commitments);
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    setStageIndex(3);

    const challenge = chooseChallenge();
    setStageIndex(4);
    const revealedCells = revealChallenge(privateRound, puzzle, challenge);
    setStageIndex(5);
    setStageIndex(6);

    const result = verifyChallenge(
      puzzle,
      privateRound.commitments,
      challenge,
      revealedCells,
      () => setStageIndex(7),
    );
    setCurrentRound({
      roundNumber: nextRound,
      commitments: privateRound.commitments,
      challenge,
      revealedCells,
      result,
    });

    if (!result.passed) {
      setSessionStatus('caught');
      setStageIndex(8);
      stopAfterRound.current = false;
      return;
    }

    setSuccessfulRounds((rounds) => rounds + 1);
    setStageIndex(8);
    if (stopAfterRound.current) {
      stopAfterRound.current = false;
      setSessionStatus('stopped');
    }
  }

  async function startVerification(): Promise<void> {
    setBusy(true);
    setError(null);
    setCurrentRound(null);
    setVerifierCommitments(null);
    setSubmittedBoard(null);
    setSuccessfulRounds(0);
    stopAfterRound.current = false;
    setSessionStatus('active');
    setStageIndex(0);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const solution = solveSudoku(puzzle);
      if (!solution) throw new Error('The puzzle has no valid solution.');

      const board = proverMode === 'honest' ? solution : createCheatingBoard(solution, puzzle);
      setSubmittedBoard(board);
      await executeRound(board, 1);
    } catch (caught) {
      setSessionStatus('ready');
      setError(caught instanceof Error ? caught.message : 'The round could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  async function runNextRound(): Promise<void> {
    if (!submittedBoard || sessionStatus !== 'active' || busy) return;

    setBusy(true);
    setError(null);
    try {
      await executeRound(submittedBoard, successfulRounds + 1);
    } catch (caught) {
      setSessionStatus('stopped');
      setError(caught instanceof Error ? caught.message : 'The round could not be completed.');
    } finally {
      setBusy(false);
    }
  }

  function stopVerification(): void {
    if (busy) {
      stopAfterRound.current = true;
      setError('The current round will finish before verification stops.');
      return;
    }
    setSessionStatus('stopped');
    setError(null);
  }

  async function generatePuzzle(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      setPuzzle(generateSudokuPuzzle());
      setSessionStatus('ready');
      setSubmittedBoard(null);
      setCurrentRound(null);
      setVerifierCommitments(null);
      setSuccessfulRounds(0);
      setStageIndex(0);
      stopAfterRound.current = false;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'A new puzzle could not be generated.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-white px-4 py-6 text-slate-900 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="border-b border-slate-200 pb-4">
          <p className="text-sm text-slate-500">Advanced Topics in Cryptography · Assignment 1</p>
          <h1 className="mt-1 text-2xl font-bold">Sudoku Zero-Knowledge Proof</h1>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            The prover commits to a solved board. The verifier checks a random row, column, box, or the original clues without seeing the solution.
          </p>
        </header>

        <SessionControls
          mode={proverMode}
          status={sessionStatus}
          busy={busy}
          canContinue={canContinue}
          onModeChange={setProverMode}
          onGeneratePuzzle={generatePuzzle}
          onStart={startVerification}
          onNextRound={runNextRound}
          onStop={stopVerification}
        />

        <div className="grid gap-8 py-6 md:grid-cols-2">
          <ProverPanel
            puzzle={puzzle}
            board={submittedBoard}
            mode={proverMode}
            busy={busy}
            stageIndex={stageIndex}
            roundNumber={roundNumber}
            invalidCells={invalidCells}
            boardIsValid={boardIsValid}
          />
          <VerifierPanel
            puzzle={puzzle}
            round={currentRound}
            highlighted={highlightedCells}
            commitments={verifierCommitments}
          />
        </div>

        <ProtocolSummary
          stageIndex={stageIndex}
          successfulRounds={successfulRounds}
          roundNumber={roundNumber}
          confidence={confidence}
        />

        {sessionStatus === 'caught' && currentRound && (
          <div role="alert" className="border-t border-red-200 py-4 text-sm text-red-800">
            <p className="font-semibold">The verifier found an invalid response.</p>
            {currentRound.result.failedCells?.length ? (
              <p className="mt-1">
                Affected cells: {currentRound.result.failedCells.map(([row, col]) => `R${row + 1}C${col + 1}`).join(', ')}.
              </p>
            ) : null}
          </div>
        )}
        {sessionStatus === 'stopped' && !error && (
          <p className="border-t border-slate-200 py-4 text-sm text-slate-600">Verification stopped.</p>
        )}
        {error && <p role="alert" className="border-t border-amber-200 py-4 text-sm text-amber-800">{error}</p>}
      </div>
    </main>
  );
}

export default App;
