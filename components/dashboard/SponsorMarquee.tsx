const SPONSORS = [
  { name: 'Ghost.build', tag: 'warm store', color: 'bg-oracle-mint' },
  { name: 'TinyFish', tag: 'live browsing', color: 'bg-oracle-pink' },
  { name: 'InsForge', tag: 'narratives', color: 'bg-oracle-sky' },
  { name: 'Chainguard', tag: 'signed digest', color: 'bg-oracle-yellow' },
  { name: 'Redis Cloud', tag: 'hot bus', color: 'bg-oracle-peach' },
  { name: 'Guild.ai', tag: 'agent catalog', color: 'bg-oracle-lavender' },
  { name: 'Cosmo', tag: 'federation', color: 'bg-oracle-mint' },
  { name: 'x402', tag: 'paper payments', color: 'bg-oracle-pink' }
];

export function SponsorMarquee() {
  const loop = [...SPONSORS, ...SPONSORS];
  return (
    <div className="panel bg-oracle-ink text-oracle-bg overflow-hidden py-3 my-8">
      <div className="flex gap-6 animate-marquee whitespace-nowrap w-max">
        {loop.map((s, i) => (
          <span key={i} className="font-display text-xs md:text-sm uppercase tracking-widest flex items-center gap-2">
            <span className="pulse-dot" />
            <span>{s.name}</span>
            <span className={`chip ${s.color} text-oracle-ink border-oracle-ink/0`}>{s.tag}</span>
            <span className="opacity-40">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
