'use client';

import { useMemo, useState, useEffect } from 'react';
import Image from 'next/image';
import { Comic } from '@/lib/comics';

interface ComicDetailProps {
  comic: Comic;
  onBack: () => void;
  offerComics: Comic[];
  onAddComicToOffer: (comic: Comic) => void;
  onOpenOffer: () => void;
}

export default function ComicDetail({ comic, onBack, offerComics, onAddComicToOffer, onOpenOffer }: ComicDetailProps) {
  const inOffer = useMemo(() => offerComics.some((c) => c.id === comic.id), [offerComics, comic.id]);
  const offerButtonLabel = offerComics.length === 0
    ? 'Make Offer'
    : inOffer
      ? 'View Offer'
      : 'Add Comic to Offer';

  // All images: main + additional
  const allImages = useMemo(
    () => Array.from(new Set([comic.imageUrl, ...(comic.additionalImages ?? [])].filter(Boolean))),
    [comic.imageUrl, comic.additionalImages]
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = allImages[selectedIndex] ?? '';

  useEffect(() => {
    setSelectedIndex(0);
  }, [comic.id, allImages.length]);

  const goToPreviousImage = () => {
    if (allImages.length < 2) return;
    setSelectedIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const goToNextImage = () => {
    if (allImages.length < 2) return;
    setSelectedIndex((prev) => (prev + 1) % allImages.length);
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-stone-50 to-slate-100">
      {/* Top bar */}
      <div className="border-b border-slate-800 bg-slate-950 px-4 py-3">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-slate-200 hover:text-white"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Listings
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="flex flex-col gap-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:p-6">
          {/* Left: Images */}
          <div className="md:w-1/2">
            {/* Main image */}
            <div className="relative aspect-2/3 w-full overflow-hidden rounded-lg bg-gray-100">
              {selectedImage ? (
                <Image
                  src={selectedImage}
                  alt={comic.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <svg className="h-20 w-20 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 2.5 4 4-4 2.5 4z" />
                  </svg>
                </div>
              )}

              {allImages.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={goToPreviousImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/65 transition-colors"
                    aria-label="Previous image"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={goToNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/65 transition-colors"
                    aria-label="Next image"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            {allImages.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {allImages.map((url, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedIndex(i)}
                    className={`relative h-16 w-12 shrink-0 overflow-hidden rounded border-2 ${
                      selectedIndex === i ? 'border-blue-500' : 'border-gray-200'
                    }`}
                  >
                    <Image src={url} alt="" fill className="object-cover" sizes="48px" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Info */}
          <div className="md:w-1/2">
            <h1 className="text-2xl font-bold text-gray-900">{comic.name}</h1>

            {typeof comic.price === 'number' && (
              <p className="mt-2 text-xl font-semibold text-emerald-700">${comic.price.toFixed(2)}</p>
            )}

            <div className="mt-2 flex flex-wrap gap-2 text-sm text-gray-600">
              <span className="rounded bg-gray-100 px-2 py-0.5">{comic.company}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5">#{comic.issueNumber}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5">{comic.year}</span>
              <span className="rounded bg-gray-100 px-2 py-0.5">{comic.condition}</span>
            </div>

            {/* Description */}
            <div className="mt-6 rounded-lg border border-slate-200 bg-stone-50 p-4">
              <h2 className="mb-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">Description</h2>
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{comic.description}</p>
            </div>

            {/* Make Offer button */}
            <button
              onClick={() => {
                if (!inOffer) {
                  onAddComicToOffer(comic);
                }
                onOpenOffer();
              }}
              className="mt-6 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              {offerButtonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
