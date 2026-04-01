# Q-Learning Cliff Walking Visualizer

An interactive browser-based visualization of Q-learning applied to the Cliff Walking problem (Sutton & Barto *Reinforcement Learning*, Example 6.6).

![screenshot placeholder](docs/screenshot.png)

## Features

- **Live Q-table heatmap** — each grid cell shows four color-coded triangles representing Q-values for N/S/W/E actions (blue = low/worse, red-orange = high/better)
- **Best-action arrows** — arrow in each cell shows the current greedy action (↑↓←→)
- **Greedy path highlight** — yellow overlay traces the path the trained agent would follow
- **Demo mode** — after training, click "Demo Path" to animate the agent walking the greedy policy step-by-step
- **Episode reward chart** — plots raw and smoothed (rolling average) episode rewards over time
- **Adjustable hyperparameters** via sliders:
  - **α (Alpha)** — learning rate
  - **γ (Gamma)** — discount factor
  - **ε (Epsilon)** — exploration rate (ε-greedy)
  - **Episodes** — total training episodes
  - **Error Prob** — stochastic slip probability (agent takes a random action instead)
- **Multiple world types** — Classic bottom-edge, Top-edge, Diagonal, Wide cliff (2-row)
- **Configurable grid size** — rows (3–8) and columns (4–16)
- **Pause / Resume / Reset** — full control over the training animation
- **Animation speed** — 1–100 episodes per animation frame

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm (comes with Node.js)

### Install & run

```bash
cd qlearning-viz
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for production

```bash
npm run build
npm run preview
```

## Project Structure

```
qlearning-viz/
├── index.html
├── package.json
├── vite.config.js
├── LICENSE
├── README.md
├── .gitignore
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx               # Root component & training loop
    ├── index.css             # Global dark-theme styles
    ├── utils/
    │   ├── rng.js            # Mulberry32 seeded PRNG
    │   └── qlearning.js      # Q-learning core (JS port of QLearningProblem.java)
    └── components/
        ├── Controls.jsx      # Sidebar: sliders, world picker, buttons
        ├── GridWorld.jsx     # SVG grid with Q-value triangles & path highlight
        └── RewardChart.jsx   # SVG episode-reward line chart
```

## Algorithm

The visualizer is a faithful JavaScript port of `QLearningProblem.java`, implementing **off-policy TD (Q-learning)**:

```
Q(s, a) ← Q(s, a) + α [r + γ · max_a' Q(s', a') − Q(s, a)]
```

- Actions: North, South, West, East
- Reward: −1 per step, −100 for stepping off a cliff (resets to start, episode continues)
- Episode ends only on reaching the goal

### Error probability

Setting **Error Prob > 0** makes the environment stochastic: with that probability the agent slips to a uniformly random action. Higher error → cliff edges become riskier → the agent learns a safer detour rather than the optimal but risky cliff-edge path.

## Keyboard Shortcuts (planned)

| Key | Action |
|-----|--------|
| `Space` | Train / Pause / Resume |
| `R`     | Reset |
| `D`     | Demo path |

## License

MIT
