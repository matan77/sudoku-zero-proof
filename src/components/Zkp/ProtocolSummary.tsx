import { CircleHelp } from 'lucide-react';

const STAGES = [
  'Solve puzzle',
  'Apply random permutation',
  'Create 81 commitments',
  'Wait for challenge',
  'Select challenge',
  'Reveal requested cells',
  'Verify commitments',
  'Check Sudoku constraint',
  'Round passed',
];

interface ProtocolSummaryProps {
  stageIndex: number;
  successfulRounds: number;
  roundNumber: number;
  confidence: number;
}

export default function ProtocolSummary({
  stageIndex,
  successfulRounds,
  roundNumber,
  confidence,
}: ProtocolSummaryProps) {
  const confidencePercent = confidence * 100;

  return (
    <section className="grid gap-6 border-t border-slate-200 py-5 md:grid-cols-2">
      <div>
        <h2 className="font-semibold">Round process</h2>
        <ol className="mt-3 space-y-2">
          {STAGES.map((stage, index) => (
            <li key={stage} className={`flex gap-2 text-sm ${index === stageIndex ? 'font-medium text-slate-900' : 'text-slate-500'}`}>
              <span className="w-5 text-right">{index < stageIndex ? '✓' : index + 1}</span>
              {stage}
            </li>
          ))}
        </ol>
      </div>

      <div>
        <h2 className="font-semibold">Confidence estimate</h2>
        <p className="mt-1 text-sm text-slate-600">
          Round {roundNumber} · {successfulRounds} successful round{successfulRounds === 1 ? '' : 's'}
        </p>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span>Against a fixed invalid board</span>
          <strong>{confidencePercent.toFixed(2)}%</strong>
        </div>
        <div
          className="mt-1 h-2 overflow-hidden bg-slate-200"
          role="progressbar"
          aria-label="Theoretical confidence against cheating"
          aria-valuenow={confidencePercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="h-full bg-slate-700" style={{ width: `${confidencePercent}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Cheating success chance: {((1 - confidence) * 100).toFixed(2)}%. 45 successful rounds exceed the 80% target.
        </p>
        <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500">
          <CircleHelp size={15} className="mt-0.5 shrink-0" />
          The estimate is 1 - (27/28)<sup>k</sup>. It assumes independent, uniform challenges and does not cover adaptive attacks.
        </p>
      </div>
    </section>
  );
}
