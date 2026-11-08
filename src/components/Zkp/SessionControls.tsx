import type { ProverMode, SessionStatus } from '@/types/protocol';

interface SessionControlsProps {
  mode: ProverMode;
  status: SessionStatus;
  busy: boolean;
  canContinue: boolean;
  onModeChange: (mode: ProverMode) => void;
  onGeneratePuzzle: () => void;
  onStart: () => void;
  onNextRound: () => void;
  onStop: () => void;
}

export default function SessionControls({
  mode,
  status,
  busy,
  canContinue,
  onModeChange,
  onGeneratePuzzle,
  onStart,
  onNextRound,
  onStop,
}: SessionControlsProps) {
  const buttonClass = 'rounded border border-slate-300 px-3 py-2 text-sm hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50';
  const primaryClass = 'rounded bg-slate-800 px-3 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50';

  return (
    <section className="flex flex-col gap-4 border-b border-slate-200 py-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="mb-2 text-sm font-medium">Prover mode</p>
        <div className="flex gap-2">
          {(['honest', 'cheating'] as const).map((option) => (
            <button
              key={option}
              type="button"
              disabled={busy || status === 'active'}
              onClick={() => onModeChange(option)}
              className={option === mode ? primaryClass : buttonClass}
            >
              {option === 'honest' ? 'Honest' : 'Cheating'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onGeneratePuzzle} disabled={busy} className={buttonClass}>
          New puzzle
        </button>
        {(status === 'ready' || status === 'stopped') && (
          <button type="button" onClick={onStart} disabled={busy} className={primaryClass}>
            {status === 'stopped' ? 'Restart' : 'Start verification'}
          </button>
        )}
        {status === 'active' && (
          <>
            <button type="button" onClick={onNextRound} disabled={!canContinue || busy} className={primaryClass}>
              {busy ? 'Verifying…' : 'Next round'}
            </button>
            <button type="button" onClick={onStop} className={buttonClass}>Stop</button>
          </>
        )}
      </div>
    </section>
  );
}
