'use client';

import { useEffect } from 'react';
import Image from 'next/image';
import { Comic } from '@/lib/comics';
import { getPublisherColor } from '@/lib/publisherColors';

const CONDITION_META: Record<string, { bg: string; text: string; stars: number; label: string }> = {
  'Poor':      { bg: '#6b7280', text: '#fff', stars: 1, label: 'Poor'      },
  'Fair':      { bg: '#9ca3af', text: '#000', stars: 2, label: 'Fair'      },
  'Good':      { bg: '#16a34a', text: '#fff', stars: 3, label: 'Good'      },
  'Very Good': { bg: '#15803d', text: '#fff', stars: 4, label: 'Very Good' },
  'Fine':      { bg: '#0891b2', text: '#fff', stars: 5, label: 'Fine'      },
  'Very Fine': { bg: '#2563eb', text: '#fff', stars: 6, label: 'Very Fine' },
  'Near Mint': { bg: '#7c3aed', text: '#fff', stars: 7, label: 'Near Mint' },
  'Mint':      { bg: '#ca8a04', text: '#000', stars: 8, label: 'Mint ✦'   },
};

const GRADE_MAX = 8;

interface ComicModalProps {
  comic: Comic;
  onClose: () => void;
}

export default function ComicModal({ comic, onClose }: ComicModalProps) {
  const pub = getPublisherColor(comic.company);
  const cond = CONDITION_META[comic.condition] ?? { bg: '#6b7280', text: '#fff', stars: 1, label: comic.condition };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-3xl max-h-[92vh] flex flex-col border-[4px] border-black bg-white overflow-hidden"
        style={{ boxShadow: '12px 12px 0px 0px #000' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HERO HEADER ─────────────────────────── */}
        <div
          className="relative overflow-hidden px-5 pt-5 pb-4 shrink-0"
          style={{ backgroundColor: pub.bg }}
        >
          {/* Halftone overlay */}
          <div className="absolute inset-0 bg-halftone-dark" />
          {/* Speed lines in corner */}
          <div className="absolute right-0 top-0 h-full w-40 opacity-10"
            style={{
              background: 'repeating-linear-gradient(-60deg, transparent, transparent 3px, rgba(255,255,255,0.8) 3px, rgba(255,255,255,0.8) 4px)'
            }}
          />

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 border-[3px] border-black bg-white w-8 h-8 flex items-center justify-center font-black text-sm hover:bg-yellow-300 transition-colors"
            style={{ boxShadow: '2px 2px 0 #000' }}
          >
            ✕
          </button>

          <div className="relative z-10">
            {/* Publisher + issue row */}
            <div className="flex items-center gap-3 mb-2">
              <span
                className="font-comic-display text-sm uppercase tracking-widest px-3 py-1 border-[2px]"
                style={{
                  color: pub.text,
                  borderColor: pub.text + '60',
                  backgroundColor: 'rgba(0,0,0,0.3)',
                }}
              >
                {comic.company}
              </span>
              <span
                className="font-comic-display text-sm px-3 py-1 border-[2px] border-black bg-yellow-400 text-black"
                style={{ boxShadow: '2px 2px 0 #000' }}
              >
                ISSUE #{comic.issueNumber}
              </span>
              <span
                className="font-comic-display text-sm px-3 py-1 border-[2px] border-black bg-white text-black"
                style={{ boxShadow: '2px 2px 0 #000' }}
              >
                {comic.year}
              </span>
            </div>

            {/* Title */}
            <h2
              className="font-comic-display text-3xl sm:text-4xl leading-none pr-10"
              style={{
                color: pub.text,
                textShadow: '3px 3px 0px rgba(0,0,0,0.4)',
              }}
            >
              {comic.name}
            </h2>
          </div>
        </div>

        {/* ── BODY ────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden border-t-[4px] border-black min-h-0">

          {/* Cover column */}
          <div className="sm:w-52 shrink-0 border-b-[4px] sm:border-b-0 sm:border-r-[4px] border-black relative">
            <div className="relative w-full aspect-2/3 sm:aspect-auto sm:h-full min-h-48">
              {comic.imageUrl ? (
                <Image
                  src={comic.imageUrl}
                  alt={comic.name}
                  fill
                  className="object-cover object-top"
                />
              ) : (
                <div
                  className="flex h-full w-full flex-col items-center justify-center bg-halftone-light"
                  style={{ backgroundColor: pub.bg + '22' }}
                >
                  <svg className="h-16 w-16 opacity-20" fill={pub.bg} viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 2.5 4 4-4 2.5 4z" />
                  </svg>
                  <p className="mt-3 font-comic-display text-xs uppercase tracking-widest opacity-40">No Cover</p>
                </div>
              )}
            </div>
          </div>

          {/* Info column */}
          <div className="flex flex-1 flex-col overflow-y-auto">

            {/* Condition splash */}
            <div
              className="relative overflow-hidden px-5 py-4 border-b-[3px] border-black shrink-0 bg-speed-lines"
              style={{ backgroundColor: cond.bg + '18' }}
            >
              <div className="flex items-center gap-4">
                {/* Starburst badge */}
                <div
                  className="starburst w-16 h-16 shrink-0 flex items-center justify-center"
                  style={{ backgroundColor: cond.bg }}
                >
                  <span
                    className="font-comic-display text-[9px] text-center leading-none uppercase"
                    style={{ color: cond.text, textShadow: '1px 1px 0 rgba(0,0,0,0.3)' }}
                  >
                    {cond.label.replace(' ', '\n')}
                  </span>
                </div>

                <div className="flex-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Condition Grade</p>
                  <p
                    className="font-comic-display text-2xl leading-none"
                    style={{ color: cond.bg, textShadow: '1px 1px 0 rgba(0,0,0,0.15)' }}
                  >
                    {comic.condition}
                  </p>

                  {/* Grade bar */}
                  <div className="mt-2 flex gap-1">
                    {Array.from({ length: GRADE_MAX }).map((_, i) => (
                      <div
                        key={i}
                        className="h-2 flex-1 border border-black"
                        style={{
                          backgroundColor: i < cond.stars ? cond.bg : '#e5e7eb',
                        }}
                      />
                    ))}
                  </div>
                  <p className="mt-0.5 text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {cond.stars}/{GRADE_MAX} grade
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="px-5 py-4 flex-1">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3"
                  style={{ backgroundColor: pub.bg }}
                />
                About This Issue
              </p>
              <p className="text-sm leading-relaxed text-gray-700">{comic.description}</p>
            </div>

            {/* Footer bar */}
            <div className="shrink-0 border-t-[3px] border-black">

              <div className="flex items-center justify-between px-5 py-2.5 bg-stone-100">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-gray-600">Available Now</span>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">
                  Listed {new Date(comic.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
