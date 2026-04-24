import Link from 'next/link';

const NAV = [
  { href: '/', label: 'Markets' },
  { href: '/audit', label: 'Audit' },
  { href: '/new', label: 'New' }
];

export function Navbar() {
  return (
    <nav className="sticky top-0 z-50 bg-oracle-bg border-b-3 border-oracle-line">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2.5 no-underline">
          <span className="sticker font-display text-base">O</span>
          <span className="font-display text-lg tracking-tight">Oracle</span>
          <span className="chip chip-ink hidden md:inline-flex">v0.1</span>
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          {NAV.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className="px-3 py-1.5 font-display text-xs uppercase tracking-wider border-2 border-transparent rounded-full no-underline transition hover:bg-oracle-card hover:border-oracle-line"
            >
              {item.label}
            </Link>
          ))}
          <a
            href="http://localhost:3002"
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex px-3 py-1.5 font-display text-xs uppercase tracking-wider border-2 border-transparent hover:border-oracle-line hover:bg-oracle-card rounded-full no-underline transition"
            title="Cosmo Router GraphiQL playground"
          >
            Cosmo ↗
          </a>
        </div>
      </div>
    </nav>
  );
}
