'use client';

import { Comic } from '@/lib/comics';
import Image from 'next/image';
import { getCbdbUrl } from '@/lib/cbdb';

interface ComicCardPublicProps {
  comic: Comic;
}

export default function ComicCardPublic({ comic }: ComicCardPublicProps) {
  return (
    <div className="group relative overflow-hidden rounded-xl border-2 border-[#1f1b18] bg-[#fff9eb] shadow-[6px_6px_0px_#1f1b18] transition-all duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0px_#1f1b18]">
      <div className="absolute right-3 top-3 z-20 rounded-full border-2 border-[#1f1b18] bg-[#ffcd00] px-2 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#1f1b18]">
        Issue #{comic.issueNumber}
      </div>

      {/* Image Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden border-b-2 border-[#1f1b18] bg-[#f3e8cf]">
        {comic.imageUrl ? (
          <Image
            src={comic.imageUrl}
            alt={comic.name}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_30%,#f7d46b_0%,#f59e0b_45%,#9a3412_100%)]">
            <svg
              className="h-24 w-24 text-white/80"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 2.5 4 4-4 2.5 4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-comic-display mb-1 text-2xl leading-tight text-[#1f1b18] line-clamp-2">
          {comic.name}
        </h3>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#7c2d12]">
          {comic.company}
        </p>
        <div className="mb-3 flex items-center gap-2 text-xs text-[#4a4134]">
          <span className="rounded border border-[#1f1b18] bg-white px-2 py-1 font-semibold">{comic.year}</span>
          <span className="inline-block rounded border border-[#1f1b18] bg-[#ffdca8] px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-[#7c2d12]">
            {comic.condition}
          </span>
        </div>
        <p className="text-sm text-[#4a4134] line-clamp-3">
          {comic.description}
        </p>

        <a
          href={getCbdbUrl(comic)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-block w-full rounded border-2 border-[#1f1b18] bg-[#2563eb] py-2 px-3 text-center text-sm font-bold text-white transition-colors duration-200 hover:bg-[#1d4ed8]"
        >
          View on CBDB
        </a>
      </div>
    </div>
  );
}
