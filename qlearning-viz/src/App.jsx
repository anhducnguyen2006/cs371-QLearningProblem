import { useState, useRef, useCallback, useEffect } from 'react';
import { Controls } from './components/Controls.jsx';
import { GridWorld, QColorScale } from './components/GridWorld.jsx';
import { RewardChart } from './components/RewardChart.jsx';
import {
  makeWorld, makeQ, copyQ, runEpisode, getGreedyPath, buildDemoSteps,
  randomCliff, NUM_ACTIONS,
} from './utils/qlearning.js';
import { mulberry32 } from './utils/rng.js';
import './index.css';

const DEFAULT_PARAMS = {
  alpha:     0.5,
  gamma:     1.0,
  epsilon:   0.1,
  episodes:  500,
  errorProb: 0.0,
  worldType: 'bottomEdge',
  rows:      4,
  cols:      12,
  seed:      42,
};

function buildInitialDisplay(params, customCliff = null) {
  const world = makeWorld(params.worldType, params.rows, params.cols, customCliff);
  return {
    world,
    Q:          makeQ(world),
    episode:    0,
    rewards:    [],
    greedyPath: [],
    agentPos:   null,
    status:     'idle',
  };
}

function qBounds(world, Q) {
  let qMin = 0, qMax = 0;
  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      for (let a = 0; a < NUM_ACTIONS; a++) {
        const v = Q[r][c][a];
        if (v < qMin) qMin = v;
        if (v > qMax) qMax = v;
      }
    }
  }
  return { qMin, qMax };
}

export default function App() {
  const [params,      setParams]      = useState(DEFAULT_PARAMS);
  const [speed,       setSpeed]       = useState(5);
  const [customCliff, setCustomCliff] = useState(null); // null = use world default
  const [disp,        setDisp]        = useState(() => buildInitialDisplay(DEFAULT_PARAMS));

  const train   = useRef(null);
  const animRef = useRef(null);
  const speedRef = useRef(speed);
  useEffect(() => { speedRef.current = speed; }, [speed]);

  const demoRef = useRef(null);

  // ----- Animation frame loop -----
  const runFrame = useCallback(() => {
    const t = train.current;
    if (!t || !t.isRunning) return;

    const batch = speedRef.current;
    for (let i = 0; i < batch && t.episode < t.params.episodes; i++) {
      const reward = runEpisode(t.world, t.Q, t.params, t.rng);
      t.rewards.push(reward);
      t.episode++;
    }

    const done = t.episode >= t.params.episodes;
    if (done) t.isRunning = false;

    const qCopy = copyQ(t.Q);
    const path  = getGreedyPath(t.world, t.Q);

    setDisp({
      world:      t.world,
      Q:          qCopy,
      episode:    t.episode,
      rewards:    [...t.rewards],
      greedyPath: path,
      agentPos:   null,
      status:     done ? 'complete' : 'running',
    });

    if (!done) animRef.current = requestAnimationFrame(runFrame);
  }, []);

  // ----- Handlers -----
  const handleTrain = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (demoRef.current) clearInterval(demoRef.current);

    const world = makeWorld(params.worldType, params.rows, params.cols, customCliff);
    const Q     = makeQ(world);
    const rng   = mulberry32(params.seed);

    train.current = { Q, rng, world, episode: 0, rewards: [], params: { ...params }, isRunning: true };

    setDisp({
      world,
      Q:          copyQ(Q),
      episode:    0,
      rewards:    [],
      greedyPath: [],
      agentPos:   null,
      status:     'running',
    });

    animRef.current = requestAnimationFrame(runFrame);
  }, [params, customCliff, runFrame]);

  const handlePause = useCallback(() => {
    if (train.current) train.current.isRunning = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setDisp(prev => ({ ...prev, status: 'paused' }));
  }, []);

  const handleResume = useCallback(() => {
    if (!train.current) return;
    train.current.isRunning = true;
    setDisp(prev => ({ ...prev, status: 'running' }));
    animRef.current = requestAnimationFrame(runFrame);
  }, [runFrame]);

  const handleReset = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (demoRef.current) clearInterval(demoRef.current);
    train.current = null;
    setCustomCliff(null);
    setDisp(buildInitialDisplay(params, null));
  }, [params]);

  const handleDemo = useCallback(() => {
    if (!train.current) return;
    if (demoRef.current) clearInterval(demoRef.current);

    const steps = buildDemoSteps(train.current.world, train.current.Q);
    let idx = 0;
    demoRef.current = setInterval(() => {
      if (idx >= steps.length) {
        clearInterval(demoRef.current);
        demoRef.current = null;
        setDisp(prev => ({ ...prev, agentPos: null }));
        return;
      }
      const { r, c } = steps[idx];
      setDisp(prev => ({ ...prev, agentPos: [r, c] }));
      idx++;
    }, 300);
  }, []);

  const handleRandomCliff = useCallback(() => {
    // Use a fresh seeded rng offset by a timestamp so each click differs
    const rng = mulberry32(Date.now() ^ 0xdeadbeef);
    const previewWorld = makeWorld(params.worldType, params.rows, params.cols);
    const cliff = randomCliff(previewWorld, rng);
    setCustomCliff(cliff);
  }, [params.worldType, params.rows, params.cols]);

  const handleClearCliff = useCallback(() => {
    setCustomCliff(null);
  }, []);

  const handleParamChange = useCallback((key, value) => {
    setParams(prev => ({ ...prev, [key]: value }));
  }, []);

  // Preview world shape changes when not training
  useEffect(() => {
    setDisp(prev => {
      if (prev.status === 'running') return prev;
      const world = makeWorld(params.worldType, params.rows, params.cols, customCliff);
      return {
        world,
        Q:          makeQ(world),
        episode:    0,
        rewards:    [],
        greedyPath: [],
        agentPos:   null,
        status:     'idle',
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.worldType, params.rows, params.cols, customCliff]);

  useEffect(() => () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    if (demoRef.current) clearInterval(demoRef.current);
  }, []);

  const { world, Q, episode, rewards, greedyPath, agentPos, status } = disp;
  const { qMin, qMax } = qBounds(world, Q);
  const pathLen = greedyPath.length > 0 ? greedyPath.length - 1 : null;

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <h1 className="header-title">Q-Learning Cliff Walking</h1>
          <p className="header-sub">
            Sutton &amp; Barto <em>Reinforcement Learning</em> — Example 6.6
          </p>
        </div>
      </header>

      <div className="app-body">
        <Controls
          params={params}
          onParamChange={handleParamChange}
          onTrain={handleTrain}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          onDemo={handleDemo}
          onRandomCliff={handleRandomCliff}
          onClearCliff={handleClearCliff}
          hasCustomCliff={customCliff !== null}
          status={status}
          speed={speed}
          onSpeedChange={setSpeed}
          currentEpisode={episode}
          pathLength={pathLen}
        />

        <main className="app-content">
          {/* Grid world */}
          <div className="card grid-card">
            <div className="card-header">
              <h2 className="card-title">{world.name}</h2>
              <div className="card-badges">
                {status === 'running'  && <span className="badge badge-running">Training…</span>}
                {status === 'complete' && <span className="badge badge-done">Complete</span>}
                {status === 'paused'   && <span className="badge badge-paused">Paused</span>}
                {customCliff           && <span className="badge badge-custom">Custom Cliff</span>}
              </div>
            </div>

            <div className="grid-scroll">
              <GridWorld world={world} Q={Q} greedyPath={greedyPath} agentPos={agentPos} />
            </div>

            <div className="grid-footer">
              <div className="legend">
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#14532d' }} />Start (S)
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#78350f' }} />Goal (G)
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: '#7f1d1d' }} />Cliff
                </span>
                <span className="legend-item">
                  <span className="legend-dot" style={{ background: 'rgba(250,204,21,0.5)', border: '1px solid #fde68a' }} />
                  Greedy path
                </span>
                <span className="legend-item">
                  <img src="/agent.png" style={{ width: 14, height: 14, imageRendering: 'pixelated' }} alt="agent" />
                  Agent
                </span>
                <span className="legend-item" style={{ color: '#64748b' }}>↑↓←→ Best action</span>
              </div>
              <div className="scale-wrap">
                <QColorScale qMin={qMin} qMax={qMax} />
              </div>
            </div>
          </div>

          {/* Reward chart */}
          <div className="card chart-card">
            <div className="card-header">
              <h2 className="card-title">Episode Rewards</h2>
            </div>
            <RewardChart rewards={rewards} totalEpisodes={params.episodes} />
          </div>

          {/* Info strip */}
          <div className="card info-card">
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">α</span>
                <span className="info-val">{params.alpha.toFixed(2)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">γ</span>
                <span className="info-val">{params.gamma.toFixed(2)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">ε</span>
                <span className="info-val">{params.epsilon.toFixed(2)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Error prob</span>
                <span className="info-val">{params.errorProb.toFixed(2)}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Seed</span>
                <span className="info-val">{params.seed}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Episode</span>
                <span className="info-val">{episode} / {params.episodes}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Path length</span>
                <span className="info-val">{pathLen != null ? `${pathLen} steps` : '—'}</span>
              </div>
              {rewards.length > 0 && (
                <div className="info-item">
                  <span className="info-label">Last reward</span>
                  <span className="info-val">{rewards[rewards.length - 1]}</span>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
