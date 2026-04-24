export function OddsSparkline({ points }: { points: { ts: number; value: number }[] }) {
  if (points.length < 2) {
    return <div className="text-oracle-mute text-xs h-32 flex items-center justify-center">waiting for evidence...</div>;
  }
  const w = 640;
  const h = 120;
  const xs = points.map(p => p.ts);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const span = Math.max(1, maxX - minX);

  const path = points
    .map((p, i) => {
      const x = ((p.ts - minX) / span) * w;
      const y = h - p.value * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const last = points[points.length - 1];
  const lastX = ((last.ts - minX) / span) * w;
  const lastY = h - last.value * h;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-32">
      <line x1={0} x2={w} y1={h / 2} y2={h / 2} stroke="#1b2130" strokeDasharray="2 4" />
      <path d={path} fill="none" stroke="#6aa6ff" strokeWidth={1.5} />
      <circle cx={lastX} cy={lastY} r={3} fill="#6aa6ff" />
      <text x={lastX + 6} y={lastY - 4} fontSize={10} fill="#6aa6ff">
        {(last.value * 100).toFixed(0)}%
      </text>
    </svg>
  );
}
