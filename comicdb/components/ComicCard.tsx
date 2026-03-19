'use client';

import { Comic } from '@/lib/comics';
import { getPublisherColor } from '@/lib/publisherColors';
import Image from 'next/image';

interface ComicCardProps {
  comic: Comic;
  onDelete: (id: string) => void;
  onToggleVisibility: (id: string, hidden: boolean) => void;
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

export default function ComicCard({ comic, onDelete, onToggleVisibility }: ComicCardProps) {
  const pub = getPublisherColor(comic.company);
  const cond = CONDITION_STYLE[comic.condition] ?? { bg: '#6b7280', text: '#fff' };

  return (
    <div className="group flex flex-col overflow-hidden border-[3px] border-black bg-white transition-all duration-200 comic-shadow comic-shadow-hover">

      {/* Publisher banner */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ backgroundColor: pub.bg }}
      >
        <span
          className="font-comic-display text-lg leading-none uppercase tracking-wide truncate"
          style={{ color: pub.text }}
        >
          {comic.company}
        </span>
        <span
          className="shrink-0 ml-2 border-2 px-2 py-0.5 font-comic-display text-sm leading-none"
          style={{
            borderColor: pub.text + '70',
            color: pub.text,
            backgroundColor: 'rgba(0,0,0,0.25)',
          }}
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
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="flex h-full w-full flex-col items-center justify-center bg-halftone-light"
            style={{ backgroundColor: pub.bg + '18' }}
          >
            <svg className="h-16 w-16 opacity-20" fill={pub.bg} viewBox="0 0 20 20">
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 2.5 4 4-4 2.5 4z" />
            </svg>
            <p className="mt-3 font-comic-display text-xs uppercase tracking-widest opacity-30">
              No Cover
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-comic-display mb-2 text-xl leading-tight text-gray-900 line-clamp-2">
          {comic.name}
        </h3>

        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className="border-2 border-black bg-stone-100 px-2 py-0.5 text-[11px] font-bold text-gray-700">
            {comic.year}
          </span>
          <span
            className="border-2 border-black px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{ backgroundColor: cond.bg, color: cond.text }}
          >
            {comic.condition}
          </span>
        </div>

        <p className="mb-4 flex-1 text-sm leading-relaxed text-gray-600 line-clamp-3">
          {comic.description}
        </p>

        <button
          onClick={() => onDelete(comic.id)}
          className="w-full border-[3px] border-black bg-red-600 py-2 font-bold uppercase tracking-wide text-white hover:bg-red-700 comic-shadow transition-colors"
        >
          Remove Listing
        </button>
        <button
          onClick={() => onToggleVisibility(comic.id, !comic.hidden)}
          className={`mt-2 w-full border-[3px] border-black py-2 font-bold uppercase tracking-wide transition-colors comic-shadow ${
            comic.hidden
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-amber-500 text-white hover:bg-amber-600'
          }`}
        >
          {comic.hidden ? 'Restore Listing' : 'Hide Listing'}
        </button>
      </div>
    </div>
  );
}
