import { sha256 } from '@noble/hashes/sha2';
import { randomInteger, randomShuffle, type SolvedSudoku, type SudokuBoard } from './sudoku';

export type Challenge =
  | { kind: 'row'; index: number }
  | { kind: 'column'; index: number }
  | { kind: 'subgrid'; index: number }
  | { kind: 'clues'; index: 0 };

export interface RevealedCell {
  row: number;
  col: number;
  value: number;
  nonce: string;
}

export interface VerificationResult {
  passed: boolean;
  stage: 'commitments' | 'constraint';
  reason: string;
  failedCells?: Array<[number, number]>;
}

export interface PrivateRound {
  commitments: string[][];
  openings: Array<Array<{ value: number; nonce: Uint8Array }>>;
}

export interface PublicRound {
  roundNumber: number;
  commitments: string[][];
  challenge: Challenge;
  revealedCells: RevealedCell[];
  result: VerificationResult;
}

const NONCE_LENGTH = 16;
const CHALLENGE_COUNT = 28;
const ALL_DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const makeRandomBytes = (length: number): Uint8Array => {
  return Uint8Array.from({ length }, () => Math.floor(Math.random() * 256));
};

const toHex = (bytes: Uint8Array): string => {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(hex)) {
    throw new Error('Invalid hexadecimal nonce.');
  }
  return new Uint8Array(hex.match(/.{2}/g)?.map((byte) => Number.parseInt(byte, 16)) ?? []);
};

const hashCommitment = (
  row: number,
  col: number,
  value: number,
  nonce: Uint8Array,
): string => {
  if (nonce.length < NONCE_LENGTH) {
    throw new Error('Commitments require a nonce of at least 128 bits.');
  }
  if (row < 0 || row > 8 || col < 0 || col > 8 || value < 1 || value > 9) {
    throw new Error('Commitment coordinates and digit are out of range.');
  }

  const payload = new Uint8Array(1 + 1 + nonce.length + 1);
  let offset = 0;
  payload[offset++] = row;
  payload[offset++] = col;
  payload.set(nonce, offset);
  offset += nonce.length;
  payload[offset] = value;

  return toHex(sha256(payload));
};

export const createPrivateRound = (board: SolvedSudoku): PrivateRound => {
  if (board.length !== 9 || board.some((row) => row.length !== 9 || row.some((value) => !Number.isInteger(value) || value < 1 || value > 9))) {
    throw new Error('A complete Sudoku board with digits 1 through 9 is required to commit.');
  }
  const permutation = randomShuffle(ALL_DIGITS);
  const commitments: string[][] = Array.from({ length: 9 }, () => Array<string>(9));
  const openings: Array<Array<{ value: number; nonce: Uint8Array }>> = Array.from({ length: 9 }, () => Array<{ value: number; nonce: Uint8Array }>(9));

  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const value = permutation[board[row][col] - 1];
      const nonce = makeRandomBytes(NONCE_LENGTH);
      commitments[row][col] = hashCommitment(row, col, value, nonce);
      openings[row][col] = { value, nonce };
    }
  }

  return { commitments, openings };
};

export const chooseChallenge = (): Challenge => {
  const selected = randomInteger(CHALLENGE_COUNT);
  if (selected < 9) return { kind: 'row', index: selected };
  if (selected < 18) return { kind: 'column', index: selected - 9 };
  if (selected < 27) return { kind: 'subgrid', index: selected - 18 };
  return { kind: 'clues', index: 0 };
};

export const getChallengeCells = (puzzle: SudokuBoard, challenge: Challenge): Array<[number, number]> => {
  switch (challenge.kind) {
    case 'row':
      return Array.from({ length: 9 }, (_, col) => [challenge.index, col]);
    case 'column':
      return Array.from({ length: 9 }, (_, row) => [row, challenge.index]);
    case 'subgrid': {
      const startRow = Math.floor(challenge.index / 3) * 3;
      const startCol = (challenge.index % 3) * 3;
      return Array.from({ length: 9 }, (_, index) => [startRow + Math.floor(index / 3), startCol + index % 3]);
    }
    case 'clues':
      return puzzle.flatMap((row, rowIndex) => row.flatMap((value, colIndex) => value === null ? [] : [[rowIndex, colIndex] as [number, number]]));
  }
};

export const revealChallenge = (
  privateRound: PrivateRound,
  puzzle: SudokuBoard,
  challenge: Challenge,
): RevealedCell[] => {
  return getChallengeCells(puzzle, challenge).map(([row, col]) => {
    const opening = privateRound.openings[row][col];
    return { row, col, value: opening.value, nonce: toHex(opening.nonce) };
  });
};

export const verifyChallenge = (
  puzzle: SudokuBoard,
  commitments: string[][],
  challenge: Challenge,
  revealedCells: RevealedCell[],
  onCommitmentsVerified?: () => void,
): VerificationResult => {
  const requestedCells = getChallengeCells(puzzle, challenge);
  const expectedKeys = new Set(requestedCells.map(([row, col]) => `${row}-${col}`));
  const revealedByKey = new Map(revealedCells.map((cell) => [`${cell.row}-${cell.col}`, cell]));

  if (
    commitments.length !== 9
    || commitments.some((row) => row.length !== 9)
    || revealedCells.length !== requestedCells.length
    || revealedByKey.size !== revealedCells.length
    || revealedCells.some((cell) => !expectedKeys.has(`${cell.row}-${cell.col}`))
  ) {
    return {
      passed: false,
      stage: 'commitments',
      reason: 'The prover revealed a missing, duplicate, or unauthorized cell.',
    };
  }

  for (const [row, col] of requestedCells) {
    const opening = revealedByKey.get(`${row}-${col}`);
    if (!opening) {
      return { passed: false, stage: 'commitments', reason: 'A requested commitment opening is missing.', failedCells: [[row, col]] };
    }
    if (!Number.isInteger(opening.value) || opening.value < 1 || opening.value > 9) {
      return { passed: false, stage: 'commitments', reason: 'A revealed value is not a Sudoku digit.', failedCells: [[row, col]] };
    }

    let nonce: Uint8Array;
    try {
      nonce = fromHex(opening.nonce);
    } catch {
      return { passed: false, stage: 'commitments', reason: 'A revealed nonce is malformed.', failedCells: [[row, col]] };
    }
    if (nonce.length < NONCE_LENGTH) {
      return { passed: false, stage: 'commitments', reason: 'A revealed nonce is shorter than 128 bits.', failedCells: [[row, col]] };
    }

    const recomputed = hashCommitment(row, col, opening.value, nonce);
    if (recomputed !== commitments[row][col]) {
      return { passed: false, stage: 'commitments', reason: `Commitment opening mismatch at row ${row + 1}, column ${col + 1}.`, failedCells: [[row, col]] };
    }
  }

  onCommitmentsVerified?.();

  if (challenge.kind !== 'clues') {
    const values = requestedCells.map(([row, col]) => revealedByKey.get(`${row}-${col}`)!.value);
    if (new Set(values).size !== 9 || values.some((value) => !ALL_DIGITS.includes(value))) {
      const firstByValue = new Map<number, [number, number]>();
      const failedCells: Array<[number, number]> = [];
      for (const [row, col] of requestedCells) {
        const value = revealedByKey.get(`${row}-${col}`)!.value;
        const previous = firstByValue.get(value);
        if (previous) failedCells.push(previous, [row, col]);
        else firstByValue.set(value, [row, col]);
      }
      return {
        passed: false,
        stage: 'constraint',
        reason: `The revealed ${challenge.kind} does not contain each digit from 1 to 9 exactly once.`,
        failedCells,
      };
    }
  } else {
    const originalToRevealed = new Map<number, number>();
    const revealedToOriginal = new Map<number, number>();
    for (const [row, col] of requestedCells) {
      const original = puzzle[row][col]!;
      const revealed = revealedByKey.get(`${row}-${col}`)!.value;
      const existingReveal = originalToRevealed.get(original);
      const existingOriginal = revealedToOriginal.get(revealed);

      if (
        (existingReveal !== undefined && existingReveal !== revealed)
        || (existingOriginal !== undefined && existingOriginal !== original)
      ) {
        return {
          passed: false,
          stage: 'constraint',
          reason: 'The revealed clue values do not preserve the original clues’ equality relationships.',
          failedCells: [[row, col]],
        };
      }

      originalToRevealed.set(original, revealed);
      revealedToOriginal.set(revealed, original);
    }
  }

  return {
    passed: true,
    stage: 'constraint',
    reason: 'All authorized commitment openings and the selected Sudoku constraint are valid.',
  };
};

export const challengeLabel = (challenge: Challenge): string => {
  switch (challenge.kind) {
    case 'row':
      return `Row ${challenge.index + 1}`;
    case 'column':
      return `Column ${challenge.index + 1}`;
    case 'subgrid':
      return `3x3 subgrid ${challenge.index + 1}`;
    case 'clues':
      return 'Original filled-in clues';
  }
};

export const calcConfidence = (successfulRounds: number): number => {
  if (!Number.isInteger(successfulRounds) || successfulRounds < 0) {
    throw new Error('Successful round count must be a non-negative integer.');
  }
  return 1 - (27 / 28) ** successfulRounds;
};
