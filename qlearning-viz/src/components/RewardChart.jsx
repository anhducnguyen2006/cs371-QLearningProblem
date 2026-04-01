const PAD = { top: 16, right: 16, bottom: 36, left: 56 };
const SMOOTH_WIN = 20;

function rollingAvg(arr, win) {
  return arr.map((_, i) => {
    const slice = arr.slice(Math.max(0, i - win + 1), i + 1);
    return slice.reduce((s, v) => s + v, 0) / slice.length;
  });
}

export function RewardChart({ rewards, totalEpisodes }) {
  const W = 640, H = 200;
  const iW = W - PAD.left - PAD.right;
  const iH = H - PAD.top - PAD.bottom;

  if (!rewards || rewards.length === 0) {
    return (
      <svg width={W} height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: W, display: 'block' }}>
        <rect width={W} height={H} fill="#1e293b" rx={8} />
        <text x={W / 2} y={H / 2} textAnchor="middle" dominantBaseline="central"
          fill="#475569" fontSize={14}>
          No data yet — click Train to start
        </text>
      </svg>
    );
  }

  const smoothed = rollingAvg(rewards, SMOOTH_WIN);

  const yMin = Math.floor(Math.min(...rewards, -14) / 20) * 20;
  const yMax = 0;
  const xMax = Math.max(totalEpisodes, rewards.length);

  const xS = ep  => PAD.left + (ep  / xMax)          * iW;
  const yS = val => PAD.top  + (1 - (val - yMin) / (yMax - yMin)) * iH;

  // Build SVG path strings
  const rawPts  = rewards .map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ');
  const smPts   = smoothed.map((v, i) => `${i === 0 ? 'M' : 'L'}${xS(i).toFixed(1)},${yS(v).toFixed(1)}`).join(' ');

  // Y-axis: ~5 ticks using a nice interval scaled to the actual reward range
  const yRange   = yMax - yMin;
  const yRawStep = yRange / 4;
  const yMag     = Math.pow(10, Math.floor(Math.log10(yRawStep)));
  const yStep    = Math.ceil(yRawStep / yMag) * yMag;
  const yTicks   = [];
  for (let v = Math.ceil(yMin / yStep) * yStep; v <= yMax; v += yStep) yTicks.push(v);

  // X-axis: exactly 5 evenly-spaced ticks (0%, 25%, 50%, 75%, 100%)
  const xTicks = [0, 0.25, 0.5, 0.75, 1].map(t => Math.round(t * xMax));

  // Latest smoothed reward for display
  const latestSmooth = smoothed[smoothed.length - 1];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: W, display: 'block' }}
    >
      <rect width={W} height={H} fill="#1e293b" rx={8} />

      {/* Grid lines */}
      {yTicks.map(v => (
        <line key={v}
          x1={PAD.left} x2={PAD.left + iW}
          y1={yS(v)}    y2={yS(v)}
          stroke="#334155" strokeWidth={1} strokeDasharray={v === 0 ? '0' : '4 3'} />
      ))}

      {/* Raw rewards (faint) */}
      <path d={rawPts} fill="none" stroke="#3b82f6" strokeWidth={1} opacity={0.25} />

      {/* Smoothed rewards */}
      <path d={smPts} fill="none" stroke="#60a5fa" strokeWidth={2} strokeLinejoin="round" />

      {/* Current progress bar */}
      <line
        x1={xS(rewards.length - 1)} x2={xS(rewards.length - 1)}
        y1={PAD.top} y2={PAD.top + iH}
        stroke="#f59e0b" strokeWidth={1} opacity={0.5} />

      {/* Y axis */}
      <line x1={PAD.left} x2={PAD.left}
        y1={PAD.top} y2={PAD.top + iH}
        stroke="#475569" />
      {yTicks.map(v => (
        <g key={v}>
          <line x1={PAD.left - 4} x2={PAD.left}
            y1={yS(v)} y2={yS(v)}
            stroke="#475569" />
          <text x={PAD.left - 8} y={yS(v)}
            textAnchor="end" dominantBaseline="central"
            fill="#64748b" fontSize={11}>
            {v}
          </text>
        </g>
      ))}

      {/* X axis */}
      <line x1={PAD.left} x2={PAD.left + iW}
        y1={PAD.top + iH} y2={PAD.top + iH}
        stroke="#475569" />
      {xTicks.map(ep => (
        <g key={ep}>
          <line x1={xS(ep)} x2={xS(ep)}
            y1={PAD.top + iH} y2={PAD.top + iH + 4}
            stroke="#475569" />
          <text x={xS(ep)} y={PAD.top + iH + 16}
            textAnchor="middle" fill="#64748b" fontSize={11}>
            {ep}
          </text>
        </g>
      ))}

      {/* Axis labels */}
      <text
        x={PAD.left - 42} y={PAD.top + iH / 2}
        textAnchor="middle" fill="#64748b" fontSize={12}
        transform={`rotate(-90,${PAD.left - 42},${PAD.top + iH / 2})`}>
        Reward
      </text>
      <text x={PAD.left + iW / 2} y={H - 4}
        textAnchor="middle" fill="#64748b" fontSize={12}>
        Episode
      </text>

      {/* Latest smoothed value label */}
      {rewards.length > 1 && (
        <text
          x={PAD.left + iW - 4} y={yS(latestSmooth) - 6}
          textAnchor="end" fill="#93c5fd" fontSize={11}>
          avg: {latestSmooth.toFixed(1)}
        </text>
      )}

      {/* Legend */}
      <line x1={PAD.left + 8} x2={PAD.left + 28}
        y1={PAD.top + 10} y2={PAD.top + 10}
        stroke="#3b82f6" strokeWidth={1} opacity={0.4} />
      <text x={PAD.left + 32} y={PAD.top + 10}
        dominantBaseline="central" fill="#64748b" fontSize={11}>raw</text>
      <line x1={PAD.left + 60} x2={PAD.left + 80}
        y1={PAD.top + 10} y2={PAD.top + 10}
        stroke="#60a5fa" strokeWidth={2} />
      <text x={PAD.left + 84} y={PAD.top + 10}
        dominantBaseline="central" fill="#64748b" fontSize={11}>
        avg({SMOOTH_WIN})
      </text>
    </svg>
  );
}
