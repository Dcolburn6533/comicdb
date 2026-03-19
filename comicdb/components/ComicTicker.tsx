'use client';

import { Comic } from '@/lib/comics';

interface ComicTickerProps {
  comics: Comic[];
}

const SEPARATOR = '★';

export default function ComicTicker({ comics }: ComicTickerProps) {
  if (comics.length === 0) return null;

  const base = comics.map(
    (c) => `${c.name.toUpperCase()}  No. ${c.issueNumber}  —  ${c.company.toUpperCase()}`
  );
  const items = [...base, ...base, ...base, ...base];

  const track = (
    <>
      {items.map((item, i) => (
        <span key={i} className="font-comic-display text-base text-black whitespace-nowrap shrink-0 pl-8">
          {item}
          <span className="mx-5 text-red-700">{SEPARATOR}</span>
        </span>
      ))}
    </>
  );

  return (
    <div className="overflow-hidden border-y-4 border-black bg-yellow-400 py-2.5 select-none">
      {/* Two identical halves — animate shifts by exactly one half (-50%) for a seamless loop */}
      <div className="flex w-max animate-marquee">
        <div className="flex shrink-0">{track}</div>
        <div className="flex shrink-0" aria-hidden="true">{track}</div>
      </div>
    </div>
  );
}
