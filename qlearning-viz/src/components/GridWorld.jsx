import { argmax, cellType, NUM_ACTIONS, ACTION_ARROWS } from '../utils/qlearning.js';

const CELL = 50;

/** Map a Q-value in [qMin, qMax] to a color string.
 *  Dark indigo (worst) → bright orange (best).
 *  Interpolated in RGB so the path goes through purple/brown — no green. */
function qToColor(q, qMin, qMax) {
  if (qMin === qMax) return '#1e293b';
  const t = Math.max(0, Math.min(1, (q - qMin) / (qMax - qMin)));
  // rgb(49, 46, 129)  = indigo-900  (low / bad)
  // rgb(251, 146, 22) = orange-400  (high / good)
  const r = Math.round(49  + t * (251 - 49));
  const g = Math.round(46  + t * (146 - 46));
  const b = Math.round(129 + t * (22  - 129));
  return `rgb(${r},${g},${b})`;
}

function NormalCell({ x, y, Q, r, c, qMin, qMax, onPath, agentHere }) {
  const cs = CELL;
  const mx = x + cs / 2;
  const my = y + cs / 2;
  const best = argmax(Q, r, c);

  // Four triangles: N, S, W, E
  const triangles = [
    { action: 0, pts: `${x},${y} ${x+cs},${y} ${mx},${my}` },
    { action: 1, pts: `${x},${y+cs} ${x+cs},${y+cs} ${mx},${my}` },
    { action: 2, pts: `${x},${y} ${x},${y+cs} ${mx},${my}` },
    { action: 3, pts: `${x+cs},${y} ${x+cs},${y+cs} ${mx},${my}` },
  ];

  return (
    <g>
      {triangles.map(({ action, pts }) => (
        <polygon
          key={action}
          points={pts}
          fill={qToColor(Q[r][c][action], qMin, qMax)}
          stroke="#0f172a"
          strokeWidth={0.5}
        />
      ))}

      {/* Path highlight */}
      {onPath && (
        <rect x={x} y={y} width={cs} height={cs}
          fill="rgba(250,204,21,0.22)" pointerEvents="none" />
      )}

      {/* Cell border */}
      <rect x={x} y={y} width={cs} height={cs}
        fill="none" stroke="#1e293b" strokeWidth={1} />

      {/* Best-action arrow */}
      <text
        x={mx} y={my}
        textAnchor="middle" dominantBaseline="central"
        fill={onPath ? '#fde68a' : '#94a3b8'}
        fontSize={17}
        fontWeight={onPath ? 'bold' : 'normal'}
        style={{ userSelect: 'none' }}
      >
        {ACTION_ARROWS[best]}
      </text>

      {/* Agent sprite */}
      {agentHere && (
        <image href="/agent.png"
          x={mx - cs * 0.42} y={my - cs * 0.42}
          width={cs * 0.84} height={cs * 0.84} />
      )}
    </g>
  );
}

export function GridWorld({ world, Q, greedyPath, agentPos }) {
  if (!world || !Q) return null;

  // Global Q bounds (exclude cliff/goal cells from normalization)
  let qMin = Infinity, qMax = -Infinity;
  for (let r = 0; r < world.rows; r++) {
    for (let c = 0; c < world.cols; c++) {
      const ct = cellType(world, r, c);
      if (ct === 'normal' || ct === 'start') {
        for (let a = 0; a < NUM_ACTIONS; a++) {
          const v = Q[r][c][a];
          if (v < qMin) qMin = v;
          if (v > qMax) qMax = v;
        }
      }
    }
  }
  if (qMin === Infinity) { qMin = 0; qMax = 0; }

  const pathSet = new Set(
    (greedyPath || []).map(([r, c]) => `${r},${c}`)
  );

  const W = world.cols * CELL;
  const H = world.rows * CELL;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', height: 'auto', maxWidth: W, display: 'block' }}
    >
      {Array.from({ length: world.rows }, (_, r) =>
        Array.from({ length: world.cols }, (_, c) => {
          const x = c * CELL;
          const y = r * CELL;
          const type = cellType(world, r, c);
          const onPath = pathSet.has(`${r},${c}`);
          const agentHere = agentPos != null && agentPos[0] === r && agentPos[1] === c;
          const cx = x + CELL / 2;
          const cy = y + CELL / 2;

          if (type === 'cliff') {
            return (
              <g key={`${r}-${c}`}>
                <rect x={x} y={y} width={CELL} height={CELL}
                  fill="#7f1d1d" stroke="#0f172a" strokeWidth={1} />
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                  fill="#fca5a5" fontSize={10} fontWeight="bold"
                  style={{ userSelect: 'none' }}>
                  CLIFF
                </text>
              </g>
            );
          }

          if (type === 'goal') {
            return (
              <g key={`${r}-${c}`}>
                <rect x={x} y={y} width={CELL} height={CELL}
                  fill="#78350f" stroke="#0f172a" strokeWidth={1} />
                {onPath && (
                  <rect x={x} y={y} width={CELL} height={CELL}
                    fill="rgba(250,204,21,0.35)" pointerEvents="none" />
                )}
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                  fill="#fcd34d" fontSize={18} fontWeight="bold"
                  style={{ userSelect: 'none' }}>
                  G
                </text>
                {agentHere && (
                  <image href="/agent.png"
                    x={cx - CELL * 0.42} y={cy - CELL * 0.42}
                    width={CELL * 0.84} height={CELL * 0.84} />
                )}
              </g>
            );
          }

          if (type === 'start') {
            return (
              <g key={`${r}-${c}`}>
                <rect x={x} y={y} width={CELL} height={CELL}
                  fill="#14532d" stroke="#0f172a" strokeWidth={1} />
                {onPath && (
                  <rect x={x} y={y} width={CELL} height={CELL}
                    fill="rgba(250,204,21,0.22)" pointerEvents="none" />
                )}
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central"
                  fill="#86efac" fontSize={18} fontWeight="bold"
                  style={{ userSelect: 'none' }}>
                  S
                </text>
                {agentHere && (
                  <image href="/agent.png"
                    x={cx - CELL * 0.42} y={cy - CELL * 0.42}
                    width={CELL * 0.84} height={CELL * 0.84} />
                )}
              </g>
            );
          }

          // Normal cell
          return (
            <NormalCell
              key={`${r}-${c}`}
              x={x} y={y} Q={Q} r={r} c={c}
              qMin={qMin} qMax={qMax}
              onPath={onPath}
              agentHere={agentHere}
            />
          );
        })
      )}

      {/* Color scale legend (right edge) */}
      <defs>
        <linearGradient id="qscale" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%"   stopColor="hsl(12,85%,50%)" />
          <stop offset="100%" stopColor="hsl(230,60%,22%)" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Horizontal color-scale bar shown below the grid */
export function QColorScale({ qMin, qMax }) {
  const W = 240, H = 18;
  return (
    <svg width={W} height={H + 14} style={{ display: 'block' }}>
      <defs>
        <linearGradient id="hbar" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%"   stopColor="rgb(49,46,129)" />
          <stop offset="100%" stopColor="rgb(251,146,22)" />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={W} height={H} fill="url(#hbar)" rx={3} />
      <text x={0}   y={H+12} fill="#64748b" fontSize={11} textAnchor="start">
        {qMin === qMax ? '0' : qMin.toFixed(1)}
      </text>
      <text x={W/2} y={H+12} fill="#64748b" fontSize={11} textAnchor="middle">Q-value</text>
      <text x={W}   y={H+12} fill="#64748b" fontSize={11} textAnchor="end">
        {qMax.toFixed(1)}
      </text>
    </svg>
  );
}
