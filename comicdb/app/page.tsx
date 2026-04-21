'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
import { Comic, getComics, searchComics } from '@/lib/comics';
import ComicDetail from '@/components/ComicDetail';
import MakeOffer from '@/components/MakeOffer';

const PAGE_SIZE = 25;

export default function Home() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);
  const [activeOfferComic, setActiveOfferComic] = useState<Comic | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredComicId, setHoveredComicId] = useState<string | null>(null);

  useEffect(() => {
    getComics()
      .then(setComics)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  // Reset to page 1 whenever search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const filteredComics = useMemo(
    () => searchComics(comics, searchQuery),
    [comics, searchQuery]
  );

  const totalPages = Math.max(1, Math.ceil(filteredComics.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const pagedComics = filteredComics.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const openOffer = (comic: Comic) => setActiveOfferComic(comic);
  const closeOffer = () => setActiveOfferComic(null);

  if (selectedComic) {
    return (
      <>
        <ComicDetail
          comic={selectedComic}
          onBack={() => setSelectedComic(null)}
          offerComics={[]}
          onAddComicToOffer={() => {}}
          onOpenOffer={() => openOffer(selectedComic)}
        />
        {activeOfferComic && (
          <MakeOffer
            selectedComics={[activeOfferComic]}
            onSelectedComicsChange={() => {}}
            onClose={closeOffer}
            onBackToBrowse={() => { closeOffer(); setSelectedComic(null); }}
          />
        )}
      </>
    );
  }

  const PaginationControls = () =>
    totalPages > 1 ? (
      <div className="flex items-center justify-between px-1 py-2">
        <span className="text-xs text-gray-500">
          Page {safePage} of {totalPages}
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Previous
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            Next
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-slate-950 px-4 py-5 border-b-2 border-amber-500">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-2xl font-bold tracking-tight text-white">Marketplace Comics</h1>
          <p className="mt-0.5 text-xs text-slate-400 tracking-wide">Browse listings below</p>
        </div>
      </header>

      {/* Search */}
      <div className="sticky top-0 z-10 border-b border-stone-200 bg-stone-100/95 backdrop-blur px-4 py-3 shadow-sm">
        <div className="mx-auto max-w-4xl">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search comics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {!isLoading && (
            <p className="mt-1 text-xs text-gray-500">
              {filteredComics.length} comic{filteredComics.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          )}
        </div>
      </div>

      {/* Comic List */}
      <main className="mx-auto max-w-4xl px-4 py-4">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          </div>
        )}

        {!isLoading && filteredComics.length === 0 && (
          <div className="py-20 text-center">
            <p className="text-gray-500">
              {searchQuery ? 'No comics found.' : 'No comics listed yet.'}
            </p>
          </div>
        )}

        {!isLoading && filteredComics.length > 0 && (
          <>
            <PaginationControls />

            <div className="overflow-hidden rounded-xl border border-stone-200 shadow-md divide-y divide-stone-100">
              {pagedComics.map((comic, index) => (
                <div
                  key={comic.id}
                  className={`flex items-center gap-3 px-3 py-3 transition-colors ${
                    index % 2 === 0 ? 'bg-white' : 'bg-stone-50'
                  }`}
                >
                  {/* Thumbnail with hover enlarge */}
                  <div
                    className="relative h-16 w-11 shrink-0"
                    onMouseEnter={() => setHoveredComicId(comic.id)}
                    onMouseLeave={() => setHoveredComicId(null)}
                  >
                    <div className="h-16 w-11 overflow-hidden rounded bg-gray-100 relative">
                      {comic.imageUrl ? (
                        <Image
                          src={comic.imageUrl}
                          alt={comic.name}
                          fill
                          className="object-cover"
                          sizes="44px"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <svg className="h-5 w-5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 2.5 4 4-4 2.5 4z" />
                          </svg>
                        </div>
                      )}
                    </div>
                    {/* Hover enlarge preview */}
                    {hoveredComicId === comic.id && comic.imageUrl && (
                      <div className="absolute left-12 top-0 z-20 w-40 h-56 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl pointer-events-none">
                        <Image
                          src={comic.imageUrl}
                          alt={comic.name}
                          fill
                          className="object-cover"
                          sizes="160px"
                        />
                      </div>
                    )}
                  </div>

                  {/* Info — clicking opens detail */}
                  <button
                    onClick={() => setSelectedComic(comic)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {comic.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {comic.company} &middot; #{comic.issueNumber} &middot; {comic.year} &middot; {comic.condition}
                        {typeof comic.price === 'number' ? ` · $${comic.price.toFixed(2)}` : ''}
                      </p>
                    </div>
                  </button>

                  {/* Action buttons */}
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => openOffer(comic)}
                      className="rounded border border-emerald-600 bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors"
                    >
                      Buy It
                    </button>
                    <button
                      onClick={() => openOffer(comic)}
                      className="rounded border border-slate-400 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      Make Offer
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2">
              <PaginationControls />
            </div>
          </>
        )}
      </main>

      {activeOfferComic && (
        <MakeOffer
          selectedComics={[activeOfferComic]}
          onSelectedComicsChange={() => {}}
          onClose={closeOffer}
          onBackToBrowse={closeOffer}
        />
      )}
    </div>
  );
}
