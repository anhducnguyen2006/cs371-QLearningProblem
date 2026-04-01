function Slider({ label, hint, min, max, step, value, onChange, format }) {
  const display = format ? format(value) : (Number.isInteger(value) ? value : value.toFixed(2));
  return (
    <div className="param-row">
      <div className="param-header">
        <span className="param-label">{label}</span>
        <span className="param-value">{display}</span>
      </div>
      {hint && <div className="param-hint">{hint}</div>}
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="slider"
      />
    </div>
  );
}

export function Controls({
  params, onParamChange,
  onTrain, onPause, onResume, onReset, onDemo,
  onRandomCliff, onClearCliff, hasCustomCliff,
  status,
  speed, onSpeedChange,
  currentEpisode,
  pathLength,
}) {
  const isRunning  = status === 'running';
  const isPaused   = status === 'paused';
  const isComplete = status === 'complete';
  const canResume  = isPaused;
  const progress   = Math.min(1, currentEpisode / Math.max(1, params.episodes));

  return (
    <aside className="controls">
      {/* ── Hyperparameters ── */}
      <section className="ctrl-section">
        <h3 className="ctrl-title">Hyperparameters</h3>
        <Slider label="α  Alpha"   hint="Learning rate"
          min={0.01} max={1}   step={0.01} value={params.alpha}
          onChange={v => onParamChange('alpha', v)} />
        <Slider label="γ  Gamma"   hint="Discount factor"
          min={0}    max={1}   step={0.01} value={params.gamma}
          onChange={v => onParamChange('gamma', v)} />
        <Slider label="ε  Epsilon" hint="Exploration rate"
          min={0}    max={1}   step={0.01} value={params.epsilon}
          onChange={v => onParamChange('epsilon', v)} />
        <Slider label="Episodes"   hint="Training episodes"
          min={10}   max={2000} step={10}  value={params.episodes}
          format={v => v.toFixed(0)}
          onChange={v => onParamChange('episodes', v)} />
        <Slider label="Error Prob" hint="Action slip probability"
          min={0}    max={0.8} step={0.05} value={params.errorProb}
          onChange={v => onParamChange('errorProb', v)} />
        <div className="param-row">
          <div className="param-header">
            <span className="param-label">Seed</span>
            <span className="param-value">{params.seed}</span>
          </div>
          <div className="param-hint">RNG seed for reproducibility</div>
          <input
            type="number"
            className="ctrl-input"
            value={params.seed}
            min={0} max={999999} step={1}
            onChange={e => {
              const v = parseInt(e.target.value, 10);
              if (!isNaN(v) && v >= 0) onParamChange('seed', v);
            }}
          />
        </div>
      </section>

      {/* ── World ── */}
      <section className="ctrl-section">
        <h3 className="ctrl-title">World</h3>
        <div className="param-row">
          <div className="param-label" style={{ marginBottom: 6 }}>Type</div>
          <select
            className="ctrl-select"
            value={params.worldType}
            onChange={e => onParamChange('worldType', e.target.value)}
          >
            <option value="bottomEdge">Classic Bottom-Edge</option>
            <option value="topEdge">Top-Edge</option>
            <option value="wideCliff">Wide Cliff (2-row)</option>
          </select>
        </div>
        <Slider label="Rows" min={3} max={8}  step={1} value={params.rows}
          format={v => v.toFixed(0)}
          onChange={v => onParamChange('rows', v)} />
        <Slider label="Cols" min={4} max={16} step={1} value={params.cols}
          format={v => v.toFixed(0)}
          onChange={v => onParamChange('cols', v)} />
        <div className="cliff-buttons">
          <button className="btn btn-cliff" onClick={onRandomCliff} title="Generate a random cliff between Start and Goal">
            🎲 Random Cliff
          </button>
          {hasCustomCliff && (
            <button className="btn btn-cliff-clear" onClick={onClearCliff} title="Restore the default cliff for this world type">
              ✕ Clear
            </button>
          )}
        </div>
      </section>

      {/* ── Animation ── */}
      <section className="ctrl-section">
        <h3 className="ctrl-title">Animation</h3>
        <Slider label="Speed (ep/frame)" hint="Higher = faster training"
          min={1} max={100} step={1} value={speed}
          format={v => v.toFixed(0)}
          onChange={onSpeedChange} />
      </section>

      {/* ── Progress ── */}
      <section className="ctrl-section">
        <div className="progress-label">
          <span>Episode</span>
          <span>{currentEpisode} / {params.episodes}</span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        {isComplete && pathLength != null && (
          <div className="path-info">
            Greedy path: <strong>{pathLength}</strong> step{pathLength !== 1 ? 's' : ''}
          </div>
        )}
      </section>

      {/* ── Buttons ── */}
      <section className="ctrl-section ctrl-buttons">
        {!isRunning && !isPaused && (
          <button className="btn btn-primary" onClick={onTrain}>
            {isComplete ? '↺ Retrain' : '▶ Train'}
          </button>
        )}
        {isRunning && (
          <button className="btn btn-secondary" onClick={onPause}>
            ⏸ Pause
          </button>
        )}
        {canResume && (
          <>
            <button className="btn btn-primary" onClick={onResume}>
              ▶ Resume
            </button>
            <button className="btn btn-primary" onClick={onTrain}
              style={{ background: 'var(--accent-dim)' }}>
              ↺ Restart
            </button>
          </>
        )}
        {isComplete && (
          <button className="btn btn-demo" onClick={onDemo}>
            🎬 Demo Path
          </button>
        )}
        <button className="btn btn-danger" onClick={onReset}>
          ✕ Reset
        </button>
      </section>
    </aside>
  );
}
