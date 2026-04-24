export function OddsSparkline({ points }: { points: { ts: number; value: number }[] }) {
  if (points.length < 2) {
    return (
      <div className="font-mono text-xs text-oracle-ink/70 h-40 flex flex-col items-center justify-center gap-2 pattern-dots rounded-lg">
        <span className="sticker bg-oracle-sky">…</span>
        <span>Waiting for evidence. Start the pipeline to see odds move.</span>
      </div>
    );
  }

  const w = 720;
  const h = 160;
  const pad = 24;

  const xs = points.map(p => p.ts);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = Math.max(1, maxX - minX);

  const toX = (ts: number) => pad + ((ts - minX) / span) * (w - pad * 2);
  const toY = (v: number) => pad + (1 - v) * (h - pad * 2);

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.ts).toFixed(1)} ${toY(p.value).toFixed(1)}`).join(' ');

  // Area under curve
  const areaPath = `${path} L ${toX(maxX).toFixed(1)} ${h - pad} L ${pad} ${h - pad} Z`;

  const last = points[points.length - 1];
  const lastX = toX(last.ts);
  const lastY = toY(last.value);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
      {/* Midline */}
      <line
        x1={pad}
        x2={w - pad}
        y1={h / 2}
        y2={h / 2}
        stroke="#0A0A0A"
        strokeWidth={1.5}
        strokeDasharray="4 4"
        opacity={0.3}
      />
      {/* Filled area */}
      <path d={areaPath} fill="#FF90E8" opacity={0.3} />
      {/* Line */}
      <path d={path} fill="none" stroke="#0A0A0A" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
      {/* Dots at each sample */}
      {points.map((p, i) => (
        <circle key={i} cx={toX(p.ts)} cy={toY(p.value)} r={3} fill="#0A0A0A" />
      ))}
      {/* Live head */}
      <circle cx={lastX} cy={lastY} r={6} fill="#FF90E8" stroke="#0A0A0A" strokeWidth={2} />
      <circle cx={lastX} cy={lastY} r={12} fill="none" stroke="#FF90E8" strokeWidth={2} opacity={0.6}>
        <animate attributeName="r" from="6" to="18" dur="1.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" from="0.8" to="0" dur="1.5s" repeatCount="indefinite" />
      </circle>
      {/* Current value label */}
      <g transform={`translate(${lastX + 10}, ${Math.max(20, lastY - 10)})`}>
        <rect x={0} y={-14} width={60} height={22} fill="#FFEB3B" stroke="#0A0A0A" strokeWidth={2} rx={4} />
        <text x={30} y={2} textAnchor="middle" fontFamily="Archivo Black, sans-serif" fontSize={13} fill="#0A0A0A">
          {(last.value * 100).toFixed(0)}%
        </text>
      </g>
    </svg>
  );
}
