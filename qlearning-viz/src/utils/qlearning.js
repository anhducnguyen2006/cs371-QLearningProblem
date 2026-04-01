/**
 * Q-Learning core logic — JavaScript port of QLearningProblem.java.
 * Actions: 0=N(up), 1=S(down), 2=W(left), 3=E(right)
 */

export const NUM_ACTIONS = 4;
export const MOVES = [[-1, 0], [1, 0], [0, -1], [0, 1]];
export const ACTION_LABELS = ['N', 'S', 'W', 'E'];
export const ACTION_ARROWS = ['↑', '↓', '←', '→'];

// ---------------------------------------------------------------------------
// World construction
// ---------------------------------------------------------------------------

export function makeWorld(type, rows, cols, customCliff = null) {
  rows = Math.max(3, Math.floor(rows));
  cols = Math.max(4, Math.floor(cols));

  let base;
  switch (type) {
    case 'topEdge':
      base = {
        name: `Top-edge ${rows}×${cols}`,
        type, rows, cols,
        start: [0, 0],
        goal:  [0, cols - 1],
        cliffR1: 0, cliffC1: 1, cliffR2: 0, cliffC2: cols - 2,
      };
      break;
    case 'wideCliff':
      base = {
        name: `Wide-cliff (2-row) ${rows}×${cols}`,
        type, rows, cols,
        start: [rows - 1, 0],
        goal:  [rows - 1, cols - 1],
        cliffR1: rows - 2, cliffC1: 1, cliffR2: rows - 1, cliffC2: cols - 2,
      };
      break;
    case 'bottomEdge':
    default:
      base = {
        name: `Classic bottom-edge ${rows}×${cols}`,
        type: 'bottomEdge', rows, cols,
        start: [rows - 1, 0],
        goal:  [rows - 1, cols - 1],
        cliffR1: rows - 1, cliffC1: 1, cliffR2: rows - 1, cliffC2: cols - 2,
      };
  }

  if (customCliff) {
    return {
      ...base,
      name: `Custom cliff ${rows}×${cols}`,
      cliffR1: customCliff.r1, cliffC1: customCliff.c1,
      cliffR2: customCliff.r2, cliffC2: customCliff.c2,
    };
  }
  return base;
}

/**
 * Generate a random cliff rectangle that lies strictly between start and goal.
 * The cliff never touches the start or goal cell.
 * Uses the provided rng function (seeded) for reproducibility.
 */
export function randomCliff(world, rng) {
  const { rows, start, goal, cliffR2 } = world;

  // Columns: strictly between start-col and goal-col
  const cLo = Math.min(start[1], goal[1]) + 1;
  const cHi = Math.max(start[1], goal[1]) - 1;
  if (cHi < cLo) return null;

  // Random column range within [cLo, cHi]
  const c1 = cLo + Math.floor(rng() * (cHi - cLo + 1));
  const c2 = c1  + Math.floor(rng() * (cHi - c1  + 1));

  // Stick cliff to the same edge as the world's default cliff.
  // Max cliff height = half the grid (so there's always room to navigate around).
  const maxH = Math.max(1, Math.floor(rows / 2));
  const height = 1 + Math.floor(rng() * maxH);

  let r1, r2;
  if (cliffR2 === rows - 1) {
    // Bottom-edge worlds: anchor at bottom, grow upward
    r2 = rows - 1;
    r1 = Math.max(0, r2 - height + 1);
  } else {
    // Top-edge worlds: anchor at top, grow downward
    r1 = 0;
    r2 = Math.min(rows - 1, r1 + height - 1);
  }

  return { r1, c1, r2, c2 };
}

// ---------------------------------------------------------------------------
// Cell classification
// ---------------------------------------------------------------------------

export function isCliff(world, r, c) {
  return r >= world.cliffR1 && r <= world.cliffR2 &&
         c >= world.cliffC1 && c <= world.cliffC2;
}

export function isGoal(world, r, c) {
  return r === world.goal[0] && c === world.goal[1];
}

export function isStart(world, r, c) {
  return r === world.start[0] && c === world.start[1];
}

export function cellType(world, r, c) {
  if (isGoal(world, r, c))  return 'goal';
  if (isCliff(world, r, c)) return 'cliff';
  if (isStart(world, r, c)) return 'start';
  return 'normal';
}

// ---------------------------------------------------------------------------
// Q-table helpers
// ---------------------------------------------------------------------------

export function makeQ(world) {
  return Array.from({ length: world.rows }, () =>
    Array.from({ length: world.cols }, () => [0, 0, 0, 0])
  );
}

export function copyQ(Q) {
  return Q.map(row => row.map(cell => [...cell]));
}

export function argmax(Q, r, c) {
  let best = 0;
  for (let a = 1; a < NUM_ACTIONS; a++) {
    if (Q[r][c][a] > Q[r][c][best]) best = a;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Environment step  (mirrors Java's `step` method)
// ---------------------------------------------------------------------------

function envStep(world, r, c, action, errorProb, rng) {
  if (rng() < errorProb) {
    action = Math.floor(rng() * NUM_ACTIONS);
  }
  const nr = Math.max(0, Math.min(world.rows - 1, r + MOVES[action][0]));
  const nc = Math.max(0, Math.min(world.cols - 1, c + MOVES[action][1]));
  if (isCliff(world, nr, nc)) {
    return { r: world.start[0], c: world.start[1], reward: -100, done: false };
  }
  if (isGoal(world, nr, nc)) {
    return { r: nr, c: nc, reward: -1, done: true };
  }
  return { r: nr, c: nc, reward: -1, done: false };
}

function epsilonGreedy(Q, r, c, epsilon, rng) {
  if (rng() < epsilon) return Math.floor(rng() * NUM_ACTIONS);
  return argmax(Q, r, c);
}

// ---------------------------------------------------------------------------
// Q-learning episode  (mutates Q in-place for performance)
// ---------------------------------------------------------------------------

export function runEpisode(world, Q, { alpha, gamma, epsilon, errorProb }, rng) {
  let r = world.start[0], c = world.start[1];
  let totalReward = 0;
  const maxSteps = world.rows * world.cols * 20;

  for (let i = 0; i < maxSteps; i++) {
    const action = epsilonGreedy(Q, r, c, epsilon, rng);
    const res = envStep(world, r, c, action, errorProb, rng);
    const maxNext = Q[res.r][res.c][argmax(Q, res.r, res.c)];
    // Bellman update (off-policy Q-learning)
    Q[r][c][action] += alpha * (res.reward + gamma * maxNext - Q[r][c][action]);
    totalReward += res.reward;
    r = res.r;
    c = res.c;
    if (res.done) break;
  }
  return totalReward;
}

// ---------------------------------------------------------------------------
// Greedy path extraction
// ---------------------------------------------------------------------------

export function getGreedyPath(world, Q) {
  const path = [[world.start[0], world.start[1]]];
  const visited = new Set();
  let r = world.start[0], c = world.start[1];

  while (true) {
    if (isGoal(world, r, c)) break;
    const key = `${r},${c}`;
    if (visited.has(key)) break; // cycle detected
    visited.add(key);

    const a = argmax(Q, r, c);
    const nr = Math.max(0, Math.min(world.rows - 1, r + MOVES[a][0]));
    const nc = Math.max(0, Math.min(world.cols - 1, c + MOVES[a][1]));

    if (isCliff(world, nr, nc)) {
      path.push([nr, nc]);
      break;
    }
    r = nr; c = nc;
    path.push([r, c]);
  }
  return path;
}

// ---------------------------------------------------------------------------
// Demo path: step sequence including agent position for animation
// ---------------------------------------------------------------------------

export function buildDemoSteps(world, Q) {
  const steps = [];
  let r = world.start[0], c = world.start[1];
  const visited = new Set();
  steps.push({ r, c, action: null, type: 'start' });

  while (true) {
    if (isGoal(world, r, c)) break;
    const key = `${r},${c}`;
    if (visited.has(key)) { steps.push({ r, c, action: null, type: 'cycle' }); break; }
    visited.add(key);

    const a = argmax(Q, r, c);
    const nr = Math.max(0, Math.min(world.rows - 1, r + MOVES[a][0]));
    const nc = Math.max(0, Math.min(world.cols - 1, c + MOVES[a][1]));

    if (isCliff(world, nr, nc)) {
      steps.push({ r: nr, c: nc, action: a, type: 'cliff' });
      break;
    }
    r = nr; c = nc;
    const t = isGoal(world, r, c) ? 'goal' : 'move';
    steps.push({ r, c, action: a, type: t });
  }
  return steps;
}
