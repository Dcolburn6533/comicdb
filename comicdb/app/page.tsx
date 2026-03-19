'use client';

import { useEffect, useState, useMemo } from 'react';
import ComicCardPublic from '@/components/ComicCardPublic';
import ComicModal from '@/components/ComicModal';
import ComicTicker from '@/components/ComicTicker';
import { Comic, getComics, searchComics } from '@/lib/comics';
import { getPublisherColor } from '@/lib/publisherColors';

const CONDITIONS = ['Poor', 'Fair', 'Good', 'Very Good', 'Fine', 'Very Fine', 'Near Mint', 'Mint'];

const GRADE_COLORS: Record<string, string> = {
  'Poor': '#6b7280', 'Fair': '#9ca3af', 'Good': '#16a34a',
  'Very Good': '#15803d', 'Fine': '#0891b2', 'Very Fine': '#2563eb',
  'Near Mint': '#7c3aed', 'Mint': '#ca8a04',
};

type SortKey = 'newest' | 'oldest' | 'name-az' | 'name-za' | 'year-new' | 'year-old';

const WHAT_WE_DO = [
  {
    icon: '📚',
    title: 'Browse Our Collection',
    body: 'Hundreds of carefully curated back issues spanning decades of comic history — from golden age classics to modern keys.',
    cta: 'Browse Now',
  },
  {
    icon: '⭐',
    title: 'Condition Graded',
    body: 'Every single issue is graded across 8 conditions from Poor to Mint so you know exactly what you\'re getting before you buy.',
    cta: 'Grade Guide',
  },
  {
    icon: '🔍',
    title: 'Search & Filter',
    body: 'Drill down by publisher, year range, condition grade, or keyword. Finding that missing issue has never been easier.',
    cta: 'Start Searching',
  },
  {
    icon: '👆',
    title: 'Full Issue Details',
    body: 'Click any comic card to expand the full cover image, condition grade, description, and complete issue details.',
    cta: 'View Details',
  },
];

const HOW_IT_WORKS = [
  { step: '1', color: '#DC2626', icon: '🔎', title: 'Browse', body: 'Search our full catalog of back issues. Filter by publisher, condition, or year to find exactly what you want.' },
  { step: '2', color: '#D97706', icon: '👆', title: 'Preview', body: 'Click any comic card to see the full cover image, condition grade, description, and complete issue details.' },
  { step: '3', color: '#1D4ED8', icon: '🤝', title: 'Connect', body: 'Reach out to arrange your pickup. Simple, local, and personal — no complicated checkout process.' },
];

export default function Home() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedCondition, setSelectedCondition] = useState('');
  const [yearFrom, setYearFrom] = useState('');
  const [yearTo, setYearTo] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [selectedComic, setSelectedComic] = useState<Comic | null>(null);

  useEffect(() => {
    getComics()
      .then(setComics)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const companies = useMemo(
    () => Array.from(new Set(comics.map((c) => c.company))).sort(),
    [comics]
  );

  const filteredComics = useMemo(() => {
    let result = searchComics(comics, searchQuery);
    if (selectedCompany) result = result.filter((c) => c.company === selectedCompany);
    if (selectedCondition) result = result.filter((c) => c.condition === selectedCondition);
    if (yearFrom) result = result.filter((c) => c.year >= parseInt(yearFrom));
    if (yearTo) result = result.filter((c) => c.year <= parseInt(yearTo));
    switch (sortBy) {
      case 'oldest':   return [...result].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      case 'name-az':  return [...result].sort((a, b) => a.name.localeCompare(b.name));
      case 'name-za':  return [...result].sort((a, b) => b.name.localeCompare(a.name));
      case 'year-new': return [...result].sort((a, b) => b.year - a.year);
      case 'year-old': return [...result].sort((a, b) => a.year - b.year);
      default:         return [...result].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
  }, [comics, searchQuery, selectedCompany, selectedCondition, yearFrom, yearTo, sortBy]);

  const activeFilterCount = [selectedCompany, selectedCondition, yearFrom, yearTo].filter(Boolean).length;

  const clearFilters = () => {
    setSelectedCompany(''); setSelectedCondition('');
    setYearFrom(''); setYearTo('');
    setSearchQuery(''); setSortBy('newest');
  };

  const scrollToCollection = () => {
    document.getElementById('collection')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b-4 border-black" style={{ backgroundColor: '#DC2626' }}>
        <div className="absolute inset-0 bg-halftone-dark pointer-events-none opacity-40" />

        {/* Blue side panels */}
        <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-28" style={{ backgroundColor: '#1D4ED8', borderRight: '4px solid black' }} />
        <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-28" style={{ backgroundColor: '#1D4ED8', borderLeft: '4px solid black' }} />

        <div className="relative z-10 mx-auto max-w-4xl px-20 sm:px-32 py-8 text-center">

          {/* Title */}
          <h1
            className="font-comic-display leading-none text-white"
            style={{ fontSize: 'clamp(2.2rem, 7vw, 5rem)', textShadow: '4px 4px 0 #000, 7px 7px 0 rgba(0,0,0,0.3)' }}
          >
            MARKETPLACE
            <br />
            <span className="text-yellow-400" style={{ textShadow: '3px 3px 0 #000' }}>COMICS</span>
          </h1>

          <p
            className="mt-2 font-comic-display text-base sm:text-lg text-white uppercase tracking-widest"
            style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}
          >
            Buy &nbsp;◆&nbsp; Browse &nbsp;◆&nbsp; Collect
          </p>

          {/* Stat row + CTA */}
          <div className="mt-5 flex items-center justify-center gap-3 flex-wrap">
            {[
              { value: isLoading ? '—' : `${comics.length}+`, label: 'In Stock' },
              { value: isLoading ? '—' : `${companies.length}`, label: 'Publishers' },
              { value: '8', label: 'Grades' },
            ].map((stat) => (
              <div
                key={stat.label}
                className="border-4 border-black bg-white px-4 py-2 text-center"
                style={{ boxShadow: '3px 3px 0 #000', minWidth: '80px' }}
              >
                <div className="font-comic-display text-2xl leading-none text-black">{stat.value}</div>
                <div className="mt-0.5 text-[9px] font-black uppercase tracking-widest text-gray-500">{stat.label}</div>
              </div>
            ))}
            <button
              onClick={scrollToCollection}
              className="border-4 border-black bg-yellow-400 px-7 py-2 font-comic-display text-xl uppercase tracking-wide text-black transition-all hover:bg-yellow-300 hover:-translate-y-0.5"
              style={{ boxShadow: '4px 4px 0 #000' }}
            >
              Shop Now!
            </button>
          </div>
        </div>
      </header>

      {/* ── TICKER ───────────────────────────────────────────────── */}
      <div className="border-b-4 border-black">
        <ComicTicker comics={comics} />
      </div>

      {/* ── WHAT WE DO ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-4 border-black" style={{ backgroundColor: '#FCD34D' }}>
        <div className="absolute inset-0 bg-halftone-light pointer-events-none opacity-50" />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2
            className="font-comic-display text-center mb-10"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', textShadow: '3px 3px 0 rgba(0,0,0,0.15)' }}
          >
            — WHAT WE DO —
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {WHAT_WE_DO.map((item) => (
              <div
                key={item.title}
                className="border-4 border-black bg-white p-5 flex flex-col"
                style={{ boxShadow: '5px 5px 0 #000' }}
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-comic-display text-lg uppercase leading-tight mb-2 text-black">{item.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed flex-1">{item.body}</p>
                <button
                  onClick={scrollToCollection}
                  className="mt-4 border-2 border-black bg-red-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-red-500 transition-colors"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                >
                  {item.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-4 border-black" style={{ backgroundColor: '#1D4ED8' }}>
        <div className="absolute inset-0 bg-halftone-dark pointer-events-none opacity-30" />
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{ background: 'repeating-linear-gradient(-45deg, transparent, transparent 5px, rgba(255,255,255,0.3) 5px, rgba(255,255,255,0.3) 6px)' }}
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <h2
            className="font-comic-display text-center text-white mb-10"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', textShadow: '3px 3px 0 rgba(0,0,0,0.4)' }}
          >
            — HOW IT WORKS —
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 max-w-3xl mx-auto">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="border-4 border-black bg-white p-5 text-center"
                style={{ boxShadow: '5px 5px 0 #000' }}
              >
                <div
                  className="inline-flex items-center justify-center w-14 h-14 border-4 border-black font-comic-display text-2xl text-white mb-4"
                  style={{ backgroundColor: item.color, boxShadow: '3px 3px 0 #000' }}
                >
                  {item.step}
                </div>
                <div className="text-3xl mb-2">{item.icon}</div>
                <h3 className="font-comic-display text-xl uppercase mb-2 text-black">{item.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SHOP BY PUBLISHER ────────────────────────────────────── */}
      {companies.length > 0 && (
        <section className="relative overflow-hidden border-b-4 border-black" style={{ backgroundColor: '#FCD34D' }}>
          <div className="absolute inset-0 bg-halftone-light pointer-events-none opacity-50" />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
            <h2
              className="font-comic-display text-center mb-10"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', textShadow: '3px 3px 0 rgba(0,0,0,0.15)' }}
            >
              — SHOP BY PUBLISHER —
            </h2>

            <div className="flex flex-wrap justify-center gap-4">
              {companies.map((company) => {
                const pub = getPublisherColor(company);
                return (
                  <button
                    key={company}
                    onClick={() => {
                      setSelectedCompany(company);
                      scrollToCollection();
                    }}
                    className="border-4 border-black px-6 py-4 font-comic-display text-xl uppercase tracking-wide transition-all hover:-translate-y-1 hover:scale-105"
                    style={{
                      backgroundColor: pub.bg,
                      color: pub.text,
                      boxShadow: '4px 4px 0 #000',
                    }}
                  >
                    {company}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── CTA BANNER ───────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-b-4 border-black" style={{ backgroundColor: '#DC2626' }}>
        <div className="absolute inset-0 bg-halftone-dark pointer-events-none opacity-40" />
        <div
          className="absolute inset-0 pointer-events-none opacity-10"
          style={{ background: 'repeating-linear-gradient(45deg, transparent, transparent 8px, rgba(0,0,0,0.4) 8px, rgba(0,0,0,0.4) 9px)' }}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-4 sm:px-6 py-14 text-center">
          <h2
            className="font-comic-display text-white leading-none"
            style={{ fontSize: 'clamp(2.5rem, 8vw, 5rem)', textShadow: '4px 4px 0 #000' }}
          >
            START YOUR<br />
            <span className="text-yellow-400" style={{ textShadow: '4px 4px 0 #000' }}>ADVENTURE!</span>
          </h2>
          <p className="mt-4 font-comic-display text-xl text-white/80 uppercase tracking-widest" style={{ textShadow: '1px 1px 0 rgba(0,0,0,0.5)' }}>
            Thousands of comics &mdash; one marketplace &mdash; your story
          </p>
          <button
            onClick={scrollToCollection}
            className="mt-8 border-4 border-black bg-yellow-400 px-12 py-4 font-comic-display text-2xl uppercase tracking-wide text-black transition-all hover:bg-yellow-300 hover:-translate-y-0.5"
            style={{ boxShadow: '5px 5px 0 #000' }}
          >
            Shop the Marketplace Now!
          </button>
        </div>
      </section>

      {/* ── COLLECTION ANCHOR ────────────────────────────────────── */}
      <div id="collection" />

      {/* ── STICKY FILTER BAR ────────────────────────────────────── */}
      <div className="sticky top-0 z-30 border-b-4 border-black" style={{ backgroundColor: '#1D4ED8' }}>
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8 space-y-2.5">

          {/* Search */}
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-yellow-400"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search titles, publishers, years, conditions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border-2 border-black bg-white py-2.5 pl-9 pr-9 text-sm font-bold text-black placeholder-gray-400 focus:outline-none focus:border-yellow-400 transition-colors"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>

          {/* Publisher pills */}
          {companies.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <span className="shrink-0 text-[9px] font-black uppercase tracking-widest text-yellow-300/70 mr-1">Publisher:</span>
              <button
                onClick={() => setSelectedCompany('')}
                className={`shrink-0 border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wide transition-all ${
                  !selectedCompany
                    ? 'bg-yellow-400 text-black'
                    : 'bg-white/20 text-white hover:bg-white/30'
                }`}
              >
                All
              </button>
              {companies.map((company) => {
                const pub = getPublisherColor(company);
                const active = selectedCompany === company;
                return (
                  <button
                    key={company}
                    onClick={() => setSelectedCompany(active ? '' : company)}
                    className="shrink-0 border-2 border-black px-3 py-1 text-xs font-black uppercase tracking-wide transition-all"
                    style={active
                      ? { backgroundColor: pub.bg, color: pub.text, boxShadow: '2px 2px 0 #000' }
                      : { backgroundColor: pub.bg + '55', color: '#fff' }
                    }
                  >
                    {company}
                  </button>
                );
              })}
            </div>
          )}

          {/* Condition / Year / Sort / Count row */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-800 focus:outline-none focus:border-yellow-400 transition-colors"
            >
              <option value="">All Conditions</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>

            <div className="flex items-center gap-1.5">
              <span className="text-[9px] font-black uppercase tracking-widest text-yellow-300/70">Year:</span>
              <input type="number" placeholder="From" value={yearFrom}
                onChange={(e) => setYearFrom(e.target.value)}
                className="w-20 border-2 border-black bg-white px-2 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-yellow-400 transition-colors"
              />
              <span className="text-xs text-white/50">—</span>
              <input type="number" placeholder="To" value={yearTo}
                onChange={(e) => setYearTo(e.target.value)}
                className="w-20 border-2 border-black bg-white px-2 py-1.5 text-xs font-bold text-gray-800 focus:outline-none focus:border-yellow-400 transition-colors"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="border-2 border-black bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-800 focus:outline-none focus:border-yellow-400 transition-colors"
            >
              <option value="newest">Newest Listed</option>
              <option value="oldest">Oldest Listed</option>
              <option value="name-az">Title A–Z</option>
              <option value="name-za">Title Z–A</option>
              <option value="year-new">Year: Newest</option>
              <option value="year-old">Year: Oldest</option>
            </select>

            <div className="ml-auto flex items-center gap-3">
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="border-2 border-black bg-red-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white hover:bg-red-500 transition-colors"
                  style={{ boxShadow: '2px 2px 0 #000' }}
                >
                  ✕ Clear ({activeFilterCount})
                </button>
              )}
              <div
                className="border-2 border-black bg-yellow-400 px-3 py-1.5 text-center"
                style={{ boxShadow: '2px 2px 0 #000' }}
              >
                <span className="font-comic-display text-lg text-black leading-none">
                  {filteredComics.length}
                </span>
                <span className="font-sans text-[9px] font-black uppercase tracking-widest text-black/60 ml-1">results</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SECTION BANNER ───────────────────────────────────────── */}
      {!isLoading && (
        <div className="relative overflow-hidden border-b-4 border-black bg-yellow-400">
          <div className="absolute inset-0 bg-halftone-light opacity-30 pointer-events-none" />
          <div className="relative mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="hidden sm:block w-1.5 h-8 bg-black" />
              <h2
                className="font-comic-display text-2xl sm:text-3xl text-black uppercase tracking-wide"
                style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.15)' }}
              >
                {searchQuery || activeFilterCount > 0 ? '— Search Results —' : '— Now Available —'}
              </h2>
            </div>
            <span
              className="font-comic-display text-xl border-4 border-black bg-red-600 px-4 py-1 text-white"
              style={{ boxShadow: '3px 3px 0 #000' }}
            >
              {filteredComics.length} Comics
            </span>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8" style={{ backgroundColor: '#f5f0e8' }}>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div
              className="border-4 border-black bg-yellow-400 px-12 py-10 text-center"
              style={{ boxShadow: '8px 8px 0 #000' }}
            >
              <div className="mb-5 inline-block h-12 w-12 animate-spin rounded-full border-4 border-black border-t-red-600" />
              <p className="font-comic-display text-2xl uppercase tracking-widest text-black">Loading Comics...</p>
              <p className="mt-1 text-[10px] font-black uppercase tracking-widest text-black/40">Scanning the vaults</p>
            </div>
          </div>
        )}

        {/* Empty */}
        {!isLoading && filteredComics.length === 0 && (
          <div className="flex flex-col items-center justify-center py-32">
            <div
              className="border-4 border-black bg-white px-14 py-12 text-center bg-halftone-light"
              style={{ boxShadow: '8px 8px 0 #000' }}
            >
              <p className="font-comic-display text-5xl uppercase tracking-wide text-gray-800">
                {searchQuery || activeFilterCount > 0 ? 'No Results!' : 'Coming Soon!'}
              </p>
              <p className="mt-3 text-sm text-gray-500 max-w-xs mx-auto leading-relaxed">
                {searchQuery || activeFilterCount > 0
                  ? 'Try adjusting your search or clearing some filters.'
                  : 'New issues hitting the shelves soon — check back!'}
              </p>
              {(searchQuery || activeFilterCount > 0) && (
                <button
                  onClick={clearFilters}
                  className="mt-7 border-4 border-black bg-yellow-400 px-8 py-3 font-comic-display text-xl uppercase tracking-wide text-black hover:bg-yellow-300 transition-colors"
                  style={{ boxShadow: '5px 5px 0 #000' }}
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filteredComics.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredComics.map((comic) => (
              <ComicCardPublic key={comic.id} comic={comic} onClick={() => setSelectedComic(comic)} />
            ))}
          </div>
        )}
      </main>

      {selectedComic && (
        <ComicModal comic={selectedComic} onClose={() => setSelectedComic(null)} />
      )}

      {/* ── CONDITION GUIDE STRIP ────────────────────────────────── */}
      <section className="border-t-4 border-b-4 border-black" style={{ backgroundColor: '#FCD34D' }}>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
          <h2 className="font-comic-display text-center text-2xl sm:text-3xl mb-8" style={{ textShadow: '2px 2px 0 rgba(0,0,0,0.1)' }}>
            — CONDITION GUIDE —
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {Object.entries(GRADE_COLORS).map(([grade, color]) => (
              <div
                key={grade}
                className="flex items-center gap-2.5 border-4 border-black bg-white px-4 py-2.5"
                style={{ boxShadow: '3px 3px 0 #000' }}
              >
                <div
                  className="w-5 h-5 border-2 border-black shrink-0"
                  style={{ backgroundColor: color }}
                />
                <span className="font-comic-display text-base uppercase tracking-wide text-black">{grade}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <footer className="relative overflow-hidden bg-[#0d1117] border-t-4 border-black">
        <div className="absolute inset-0 bg-halftone-dark pointer-events-none" />

        {/* Red accent bar */}
        <div className="relative z-10 h-2 bg-red-600" />

        {/* Ticker */}
        <ComicTicker comics={comics} />

        {/* Footer columns */}
        <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12">

            {/* Brand */}
            <div>
              <p
                className="font-comic-display text-5xl leading-none text-white"
                style={{ textShadow: '4px 4px 0 #DC2626' }}
              >
                MARKET<br />
                <span className="text-yellow-400">PLACE</span><br />
                COMICS
              </p>
              <div className="mt-5 w-12 h-1 bg-yellow-400" />
              <p className="mt-4 text-xs text-gray-600 leading-relaxed uppercase tracking-wider">
                Your trusted source for<br />vintage &amp; collectible comics.
              </p>
            </div>

            {/* Browse by Publisher */}
            <div>
              <h3 className="font-comic-display text-lg uppercase tracking-widest text-yellow-400 mb-1">
                Browse Publishers
              </h3>
              <div className="mb-4 w-8 h-0.5 bg-yellow-400/40" />
              {companies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {companies.map((c) => {
                    const pub = getPublisherColor(c);
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          setSelectedCompany(c);
                          scrollToCollection();
                        }}
                        className="border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide transition-all hover:scale-105"
                        style={{ borderColor: pub.bg + '60', color: pub.bg, backgroundColor: pub.bg + '15' }}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-700">No publishers listed yet.</p>
              )}
            </div>

            {/* Condition Guide */}
            <div>
              <h3 className="font-comic-display text-lg uppercase tracking-widest text-yellow-400 mb-1">
                Condition Guide
              </h3>
              <div className="mb-4 w-8 h-0.5 bg-yellow-400/40" />
              <div className="space-y-2">
                {Object.entries(GRADE_COLORS).map(([grade, color]) => (
                  <div key={grade} className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 border-2 border-black/40 shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{grade}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* Bottom bar */}
          <div className="mt-14 border-t border-white/8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-700">
              © {new Date().getFullYear()} Marketplace Comics — All rights reserved.
            </p>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">
                Open for Business
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
