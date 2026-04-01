import java.util.Random;

/**
 * Cliff Walking with Q-learning on dynamic 2D worlds.
 * Based on Example 6.6 from Sutton & Barto "Reinforcement Learning".
 *
 * Worlds are parameterized via the World class:
 *   - Any grid size (rows x cols)
 *   - Start / goal placed at any two corners
 *   - Cliff is a rectangular zone between them (inclusive bounds)
 *
 * Error motion model:
 *   With probability errorProb the agent slips to a uniformly random action
 *   instead of the intended one. Low error → learns the risky optimal path.
 *   High error → cliff slips become costly, agent prefers the safer detour.
 */
public class QLearningProblem {

    // Actions: 0=N, 1=S, 2=W, 3=E
    static final int       NUM_ACTIONS  = 4;
    static final int[][]   MOVES        = {{-1,0},{1,0},{0,-1},{0,1}};
    static final String[]  ACTION_SYM   = {"N","S","W","E"};

    static final double ALPHA    = 0.5;
    static final double GAMMA    = 1.0;
    static final double EPSILON  = 0.1;
    static final int    EPISODES = 500;

    // Error levels to demonstrate
    static final double[] ERROR_LEVELS = {0.0, 0.2, 0.4, 0.6, 0.8};

    static final int REWARD_STEP  = -1;
    static final int REWARD_CLIFF = -100;

    static Random random = new Random(42);

    // ---------------------------------------------------------------
    // World definition
    // ---------------------------------------------------------------

    static class World {
        final String name;
        final int rows, cols;
        final int[] start, goal;
        // Cliff rectangle (all four bounds inclusive)
        final int cliffR1, cliffC1, cliffR2, cliffC2;

        World(String name, int rows, int cols,
              int[] start, int[] goal,
              int cliffR1, int cliffC1, int cliffR2, int cliffC2) {
            this.name = name;
            this.rows = rows; this.cols = cols;
            this.start = start; this.goal = goal;
            this.cliffR1 = cliffR1; this.cliffC1 = cliffC1;
            this.cliffR2 = cliffR2; this.cliffC2 = cliffC2;
        }

        /** Classic: start = bottom-left, goal = bottom-right, cliff along bottom edge. */
        static World bottomEdge(int rows, int cols) {
            return new World("Classic bottom-edge " + rows + "x" + cols, rows, cols,
                new int[]{rows-1, 0}, new int[]{rows-1, cols-1},
                rows-1, 1, rows-1, cols-2);
        }

        /** Start = top-left, goal = top-right, cliff along top edge. */
        static World topEdge(int rows, int cols) {
            return new World("Top-edge " + rows + "x" + cols, rows, cols,
                new int[]{0, 0}, new int[]{0, cols-1},
                0, 1, 0, cols-2);
        }

        /** Start = bottom-left, goal = top-right, cliff along bottom edge (diagonal traverse). */
        static World diagonal(int rows, int cols) {
            return new World("Diagonal " + rows + "x" + cols, rows, cols,
                new int[]{rows-1, 0}, new int[]{0, cols-1},
                rows-1, 1, rows-1, cols-2);
        }

        /** Wide cliff: two rows tall, forces a longer detour. */
        static World wideCliff(int rows, int cols) {
            return new World("Wide-cliff (2-row) " + rows + "x" + cols, rows, cols,
                new int[]{rows-1, 0}, new int[]{rows-1, cols-1},
                rows-2, 1, rows-1, cols-2);
        }

        boolean isCliff(int r, int c) {
            return r >= cliffR1 && r <= cliffR2 && c >= cliffC1 && c <= cliffC2;
        }

        boolean isGoal(int r, int c) {
            return r == goal[0] && c == goal[1];
        }

        boolean isStart(int r, int c) {
            return r == start[0] && c == start[1];
        }
    }

    // ---------------------------------------------------------------
    // Environment
    // ---------------------------------------------------------------

    /** Stochastic step: with probability errorProb the action slips to a random one. */
    static int[] step(World w, int r, int c, int action, double errorProb) {
        if (random.nextDouble() < errorProb) {
            action = random.nextInt(NUM_ACTIONS);
        }
        int nr = Math.max(0, Math.min(w.rows - 1, r + MOVES[action][0]));
        int nc = Math.max(0, Math.min(w.cols - 1, c + MOVES[action][1]));
        if (w.isCliff(nr, nc)) {
            return new int[]{w.start[0], w.start[1], REWARD_CLIFF, 0};
        }
        if (w.isGoal(nr, nc)) {
            return new int[]{nr, nc, REWARD_STEP, 1};
        }
        return new int[]{nr, nc, REWARD_STEP, 0};
    }

    // ---------------------------------------------------------------
    // Q-learning helpers
    // ---------------------------------------------------------------

    static int epsilonGreedy(double[][][] Q, int r, int c) {
        if (random.nextDouble() < EPSILON) return random.nextInt(NUM_ACTIONS);
        return argmax(Q, r, c);
    }

    static int argmax(double[][][] Q, int r, int c) {
        int best = 0;
        for (int a = 1; a < NUM_ACTIONS; a++) {
            if (Q[r][c][a] > Q[r][c][best]) best = a;
        }
        return best;
    }

    // ---------------------------------------------------------------
    // Q-learning (off-policy TD)
    // ---------------------------------------------------------------

    /** Train and return per-episode total rewards. */
    static double[] runQLearning(World w, double errorProb) {
        double[][][] Q = new double[w.rows][w.cols][NUM_ACTIONS];
        double[] rewards = new double[EPISODES];
        for (int ep = 0; ep < EPISODES; ep++) {
            int r = w.start[0], c = w.start[1];
            double total = 0;
            while (true) {
                int action = epsilonGreedy(Q, r, c);
                int[] res = step(w, r, c, action, errorProb);
                int nr = res[0], nc = res[1], reward = res[2], done = res[3];
                double maxNext = Q[nr][nc][argmax(Q, nr, nc)];
                // Bellman update (Q-learning):
                Q[r][c][action] += ALPHA * (reward + GAMMA * maxNext - Q[r][c][action]);
                total += reward;
                r = nr; c = nc;
                if (done == 1) break;
            }
            rewards[ep] = total;
        }
        return rewards;
    }

    /** Train and return the final Q-table (for policy display). */
    static double[][][] trainQLearning(World w, double errorProb) {
        double[][][] Q = new double[w.rows][w.cols][NUM_ACTIONS];
        for (int ep = 0; ep < EPISODES; ep++) {
            int r = w.start[0], c = w.start[1];
            while (true) {
                int action = epsilonGreedy(Q, r, c);
                int[] res = step(w, r, c, action, errorProb);
                int nr = res[0], nc = res[1], reward = res[2], done = res[3];
                double maxNext = Q[nr][nc][argmax(Q, nr, nc)];
                Q[r][c][action] += ALPHA * (reward + GAMMA * maxNext - Q[r][c][action]);
                r = nr; c = nc;
                if (done == 1) break;
            }
        }
        return Q;
    }

    // ---------------------------------------------------------------
    // Display
    // ---------------------------------------------------------------

    static void printPolicy(String label, World w, double[][][] Q) {
        StringBuilder sep = new StringBuilder("+");
        for (int c = 0; c < w.cols; c++) sep.append("----+");

        System.out.println("\n" + label + " — greedy policy:");
        System.out.println(sep);
        for (int row = 0; row < w.rows; row++) {
            System.out.print("|");
            for (int col = 0; col < w.cols; col++) {
                if      (w.isGoal(row, col))  System.out.print(" G  |");
                else if (w.isCliff(row, col)) System.out.print(" C  |");
                else if (w.isStart(row, col)) System.out.print(" S  |");
                else System.out.print("  " + ACTION_SYM[argmax(Q, row, col)] + " |");
            }
            System.out.println();
        }
        System.out.println(sep);
    }

    static void printGreedyPath(String label, World w, double[][][] Q) {
        int r = w.start[0], c = w.start[1];
        StringBuilder path = new StringBuilder();
        path.append("(").append(r).append(",").append(c).append(")");
        int steps = 0;
        while (!w.isGoal(r, c) && steps < w.rows * w.cols * 2) {
            int a = argmax(Q, r, c);
            int nr = Math.max(0, Math.min(w.rows - 1, r + MOVES[a][0]));
            int nc = Math.max(0, Math.min(w.cols - 1, c + MOVES[a][1]));
            path.append(" → (").append(nr).append(",").append(nc).append(")");
            if (w.isCliff(nr, nc)) { path.append(" [CLIFF!]"); break; }
            r = nr; c = nc;
            steps++;
        }
        System.out.println("\n" + label + " — greedy path (" + steps + " steps):");
        System.out.println(path);
    }

    // ---------------------------------------------------------------
    // Main
    // ---------------------------------------------------------------

    public static void main(String[] args) {
        World[] worlds = {
            World.bottomEdge(4, 12),   // classic 4x12
            World.bottomEdge(6, 16),   // larger grid
            World.topEdge(4, 12),      // cliff on top edge
            World.diagonal(5, 12),     // start bottom-left, goal top-right
            World.wideCliff(6, 12),    // 2-row tall cliff
        };

        for (World world : worlds) {
            System.out.println("\n" + "=".repeat(64));
            System.out.println("World : " + world.name);
            System.out.printf("Start : (%d,%d)   Goal  : (%d,%d)%n",
                world.start[0], world.start[1], world.goal[0], world.goal[1]);
            System.out.printf("Cliff : rows[%d..%d] x cols[%d..%d]%n",
                world.cliffR1, world.cliffR2, world.cliffC1, world.cliffC2);
            System.out.println("=".repeat(64));

            int window = 100;
            System.out.printf("  %-12s  %-14s%n", "Error Prob", "Avg Reward (last " + window + " eps)");
            System.out.println("  " + "-".repeat(30));

            for (double errorProb : ERROR_LEVELS) {
                double[] rewards = runQLearning(world, errorProb);
                double[][][] Q   = trainQLearning(world, errorProb);

                double avg = 0;
                for (int i = EPISODES - window; i < EPISODES; i++) avg += rewards[i];
                avg /= window;

                String tag = String.format("error=%.1f", errorProb);
                System.out.printf("  %-12.1f  %.2f%n", errorProb, avg);
                printGreedyPath(tag, world, Q);
                printPolicy(tag, world, Q);
            }
        }

        System.out.println("\n" + "=".repeat(64));
        System.out.println("Interpretation:");
        System.out.println("  error=0.0 -> deterministic -> optimal (risky) cliff-edge path.");
        System.out.println("  error>0   -> slipping into cliff is costly -> safer detour learned.");
        System.out.println("  Wider/repositioned cliffs force longer detours regardless of error.");
    }
}
