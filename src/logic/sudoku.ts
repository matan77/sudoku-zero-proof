export type SudokuBoard = (number | null)[][];
export type SolvedSudoku = number[][];

const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const SIZE = DIGITS.length;

export const randomInteger = (maxExclusive: number): number => {
  if (!Number.isInteger(maxExclusive) || maxExclusive < 1) {
    throw new Error('Random integer bound must be a positive integer.');
  }

  return Math.floor(Math.random() * maxExclusive);
};

export const randomShuffle = <T,>(items: T[]): T[] => {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInteger(index + 1);
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
};

const isSafe = (board: SudokuBoard, row: number, col: number, digit: number): boolean => {
  // Check if the digit is already present in the same row or column
  for (let index = 0; index < SIZE; index += 1) {
    if (board[row][index] === digit || board[index][col] === digit) return false;
  }

  // Check if the digit is already present in the same 3x3 subgrid
  const startRow = Math.floor(row / 3) * 3;
  const startCol = Math.floor(col / 3) * 3;
  for (let r = startRow; r < startRow + 3; r += 1) {
    for (let c = startCol; c < startCol + 3; c += 1) {
      if (board[r][c] === digit) return false;
    }
  }

  return true;
};

const findBestEmptyCell = (board: SudokuBoard): { row: number; col: number; candidates: number[] } | null => {
  let best: { row: number; col: number; candidates: number[] } | null = null;

  for (let row = 0; row < SIZE; row += 1) {
    for (let col = 0; col < SIZE; col += 1) {
      if (board[row][col] !== null) continue;
      const candidates = DIGITS.filter((digit) => isSafe(board, row, col, digit));

      if (candidates.length === 0) return { row, col, candidates };

      if (best === null || candidates.length < best.candidates.length) {
        best = { row, col, candidates };

        if (candidates.length === 1) return best;
      }
    }
  }

  return best;
};

const searchSolutions = (board: SudokuBoard, limit: number, randomized: boolean): SolvedSudoku[] => {
  const solutions: SolvedSudoku[] = [];

  const search = (): void => {
    if (solutions.length >= limit) return;
    const empty = findBestEmptyCell(board);
    if (empty === null) {
      solutions.push(board.map((row) => row.map((value) => value as number)));
      return;
    }
    if (empty.candidates.length === 0) return;

    const candidates = randomized ? randomShuffle(empty.candidates) : empty.candidates;
    for (const digit of candidates) {
      board[empty.row][empty.col] = digit;
      search();
      board[empty.row][empty.col] = null;
      if (solutions.length >= limit) return;
    }
  };

  search();
  return solutions;
};

const validateBoardShape = (board: SudokuBoard): void => {
  if (board.length !== SIZE || board.some((row) => row.length !== SIZE)) {
    throw new Error('A Sudoku board must contain exactly 9 rows and 9 columns.');
  }
  for (const row of board) {
    for (const value of row) {
      if (value !== null && (!Number.isInteger(value) || value < 1 || value > 9)) {
        throw new Error('Sudoku cells must be empty or contain a digit from 1 to 9.');
      }
    }
  }
};

export const solveSudoku = (board: SudokuBoard, randomized = false): SolvedSudoku | null => {
  validateBoardShape(board);
  return searchSolutions(board.map((row) => [...row]), 1, randomized)[0] ?? null;
};

export const countSudokuSolutions = (board: SudokuBoard, limit = 2): number => {
  validateBoardShape(board);
  if (!Number.isInteger(limit) || limit < 1) {
    throw new Error('Solution-count limit must be a positive integer.');
  }
  return searchSolutions(board.map((row) => [...row]), limit, false).length;
};

export const isValidSolvedSudoku = (board: SudokuBoard): board is SolvedSudoku => {
  if (board.length !== SIZE || board.some((row) => row.length !== SIZE)) return false;
  const expected = new Set(DIGITS);
  const units: number[][] = [];
  for (let index = 0; index < SIZE; index += 1) {
    units.push(board[index] as number[]);
    units.push(board.map((row) => row[index] as number));
  }
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const unit: number[] = [];
      for (let row = boxRow * 3; row < boxRow * 3 + 3; row += 1) {
        for (let col = boxCol * 3; col < boxCol * 3 + 3; col += 1) {
          unit.push(board[row][col] as number);
        }
      }
      units.push(unit);
    }
  }
  return units.every((unit) => unit.length === 9 && unit.every(Number.isInteger) && new Set(unit).size === 9
    && unit.every((digit) => expected.has(digit)));
};

export const generateSudokuPuzzle = (): SudokuBoard => {
  const solved = solveSudoku(Array.from({ length: SIZE }, () => Array<number | null>(SIZE).fill(null)), true);
  if (!solved) throw new Error('Unable to generate a valid Sudoku solution.');

  const puzzle: SudokuBoard = solved.map((row) => [...row]);
  const cells = randomShuffle(Array.from({ length: SIZE * SIZE }, (_, index) => [Math.floor(index / SIZE), index % SIZE] as [number, number]));
  let removed = 0;
  const targetEmptyCells = 45;

  for (const [row, col] of cells) {
    if (removed >= targetEmptyCells) break;

    const saved = puzzle[row][col];
    puzzle[row][col] = null;
    if (countSudokuSolutions(puzzle, 2) === 1) removed += 1;
    else puzzle[row][col] = saved;
  }

  if (countSudokuSolutions(puzzle, 2) !== 1) {
    throw new Error('Generated puzzle did not have a unique solution.');
  }
  return puzzle;
};

export const createCheatingBoard = (solution: SolvedSudoku, puzzle: SudokuBoard): SolvedSudoku => {
  const emptyCells = randomShuffle(
    puzzle.flatMap((row, rowIndex) => row.flatMap((value, colIndex) => value === null ? [[rowIndex, colIndex] as [number, number]] : [])),
  );
  if (emptyCells.length < 3) throw new Error('The puzzle needs at least three empty cells for the cheating demonstration.');

  const corrupted = solution.map((row) => [...row]);
  const targets = emptyCells.slice(0, 3);
  const targetKeys = new Set(targets.map(([row, col]) => `${row}-${col}`));
  for (const [row, col] of targets) {
    const sourceCol = DIGITS
      .map((_, index) => index)
      .find((candidateCol) => candidateCol !== col && !targetKeys.has(`${row}-${candidateCol}`));
    if (sourceCol === undefined) {
      throw new Error('Could not create a duplicate in the selected row.');
    }
    corrupted[row][col] = solution[row][sourceCol];
  }

  if (isValidSolvedSudoku(corrupted)) {
    throw new Error('Cheating-board corruption unexpectedly produced a valid Sudoku.');
  }
  return corrupted;
};

export const getInvalidSudokuCells = (board: SudokuBoard): Set<string> => {
  const invalid = new Set<string>();
  const inspectUnit = (cells: Array<[number, number]>) => {
    const seen = new Map<number, [number, number]>();
    for (const [row, col] of cells) {
      const digit = board[row][col];
      if (digit === null) continue;
      const previous = seen.get(digit);
      if (previous) {
        invalid.add(`${previous[0]}-${previous[1]}`);
        invalid.add(`${row}-${col}`);
      } else {
        seen.set(digit, [row, col]);
      }
    }
  };

  for (let index = 0; index < SIZE; index += 1) {
    inspectUnit(Array.from({ length: SIZE }, (_, col) => [index, col]));
    inspectUnit(Array.from({ length: SIZE }, (_, row) => [row, index]));
  }
  for (let startRow = 0; startRow < SIZE; startRow += 3) {
    for (let startCol = 0; startCol < SIZE; startCol += 3) {
      inspectUnit(Array.from({ length: 9 }, (_, index) => [startRow + Math.floor(index / 3), startCol + (index % 3)]));
    }
  }
  return invalid;
};
