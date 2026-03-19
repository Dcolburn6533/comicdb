'use client';

import { Comic } from '@/lib/comics';
import { getPublisherColor } from '@/lib/publisherColors';
import Image from 'next/image';

interface ComicCardPublicProps {
  comic: Comic;
  onClick: () => void;
}

const CONDITION_STYLE: Record<string, { bg: string; text: string }> = {
  'Poor':      { bg: '#6b7280', text: '#fff' },
  'Fair':      { bg: '#9ca3af', text: '#000' },
  'Good':      { bg: '#16a34a', text: '#fff' },
  'Very Good': { bg: '#15803d', text: '#fff' },
  'Fine':      { bg: '#0891b2', text: '#fff' },
  'Very Fine': { bg: '#2563eb', text: '#fff' },
  'Near Mint': { bg: '#7c3aed', text: '#fff' },
  'Mint':      { bg: '#ca8a04', text: '#000' },
};

export default function ComicCardPublic({ comic, onClick }: ComicCardPublicProps) {
  const pub = getPublisherColor(comic.company);
  const cond = CONDITION_STYLE[comic.condition] ?? { bg: '#6b7280', text: '#fff' };

  return (
    <div
      className="group flex flex-col overflow-hidden border-[3px] border-black bg-white cursor-pointer comic-shadow comic-shadow-hover transition-all duration-200"
      onClick={onClick}
    >
      {/* Publisher banner */}
      <div
        className="relative flex items-center justify-between px-3 py-2 overflow-hidden"
        style={{ backgroundColor: pub.bg }}
      >
        <div className="absolute inset-0 bg-halftone-dark" />
        <span
          className="relative font-comic-display text-lg leading-none uppercase tracking-wide truncate"
          style={{ color: pub.text, textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}
        >
          {comic.company}
        </span>
        <span
          className="relative shrink-0 ml-2 border-2 border-black px-2 py-0.5 font-comic-display text-sm leading-none bg-black/30"
          style={{ color: pub.text }}
        >
          #{comic.issueNumber}
        </span>
      </div>

      {/* Cover */}
      <div className="relative aspect-2/3 w-full overflow-hidden border-b-[3px] border-black">
        {comic.imageUrl ? (
          <Image
            src={comic.imageUrl}
            alt={comic.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-110"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center bg-halftone-light"
            style={{ backgroundColor: pub.bg + '18' }}
          >
            <svg className="h-16 w-16 opacity-20" fill={pub.bg} viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 2.5 4 4-4 2.5 4z" />
            </svg>
            <p className="mt-3 font-comic-display text-xs uppercase tracking-widest opacity-30">No Cover</p>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all duration-200">
          <span
            className="font-comic-display text-lg uppercase tracking-wide text-white border-[3px] border-white px-4 py-2 opacity-0 group-hover:opacity-100 transition-all duration-200 scale-90 group-hover:scale-100 bg-speed-lines"
            style={{ boxShadow: '3px 3px 0 rgba(0,0,0,0.8)', textShadow: '2px 2px 0 #000' }}
          >
            View Details
          </span>
        </div>

        {/* Condition corner badge */}
        <div
          className="absolute bottom-0 left-0 px-2 py-1 font-comic-display text-[11px] uppercase tracking-wide border-t-[3px] border-r-[3px] border-black"
          style={{ backgroundColor: cond.bg, color: cond.text }}
        >
          {comic.condition}
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-comic-display mb-2 text-xl leading-tight text-gray-900 line-clamp-2">
          {comic.name}
        </h3>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="border-2 border-black bg-yellow-300 px-2 py-0.5 text-[11px] font-black text-gray-800">
            {comic.year}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-gray-600 line-clamp-3 flex-1">
          {comic.description}
        </p>
      </div>

      {/* Bottom action strip */}
      <div
        className="flex items-center justify-between px-4 py-2 border-t-[3px] border-black"
        style={{ backgroundColor: pub.bg }}
      >
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-400 border border-black" />
          <span
            className="font-comic-display text-xs uppercase tracking-wide"
            style={{ color: pub.text, opacity: 0.9 }}
          >
            Available
          </span>
        </div>
        <span
          className="font-comic-display text-xs uppercase tracking-widest group-hover:underline"
          style={{ color: pub.text }}
        >
          More Info →
        </span>
      </div>
    </div>
  );
}
