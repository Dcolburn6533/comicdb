'use client';

import { useEffect, useState } from 'react';
import ComicCard from '@/components/ComicCard';
import ComicForm from '@/components/ComicForm';
import ComicAnalyzer from '@/components/ComicAnalyzer';
import ComicSearch from '@/components/ComicSearch';
import { Comic, getComics, addComic, deleteComic, setComicVisibility, searchComics } from '@/lib/comics';
import Link from 'next/link';

type Tab = 'manual' | 'scan' | 'manage';

export default function AdminPanel() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [manageQuery, setManageQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('manual');

  useEffect(() => {
    loadComics();
  }, []);

  const loadComics = async () => {
    try {
      setIsLoading(true);
      const data = await getComics(true);
      setComics(data);
    } catch (error) {
      console.error('Failed to load comics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddComic = async (comic: Omit<Comic, 'id' | 'createdAt'>) => {
    try {
      const newComic = await addComic(comic);
      setComics([newComic, ...comics]);
    } catch (error) {
      console.error('Failed to add comic:', error);
      throw error;
    }
  };

  const handleDeleteComic = async (id: string) => {
    try {
      await deleteComic(id);
      setComics(comics.filter((c) => c.id !== id));
    } catch (error) {
      console.error('Failed to delete comic:', error);
    }
  };

  const handleToggleVisibility = async (id: string, hidden: boolean) => {
    try {
      await setComicVisibility(id, hidden);
      setComics(comics.map((c) => c.id === id ? { ...c, hidden } : c));
    } catch (error) {
      console.error('Failed to update visibility:', error);
    }
  };

  const filteredComics = searchComics(comics.filter((c) => !c.hidden), searchQuery);
  const managedComics = searchComics(comics, manageQuery);

  return (
    <div className="min-h-screen bg-stone-100">
      {/* Header */}
      <header className="bg-slate-900 border-b-4 border-black shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1
                className="text-5xl tracking-wide text-white"
                style={{ fontFamily: 'var(--font-comic-display)' }}
              >
                Marketplace Comics
              </h1>
              <p className="mt-1 text-slate-400 text-sm font-medium tracking-wide uppercase">
                Admin Panel
              </p>
            </div>
            <Link
              href="/"
              className="hidden sm:inline-block border-2 border-slate-400 text-slate-200 font-bold py-2 px-5 rounded hover:border-white hover:text-white transition-colors text-sm tracking-wide uppercase"
            >
              Back to Store
            </Link>
          </div>
          <div className="mt-3 sm:hidden">
            <Link
              href="/"
              className="inline-block border-2 border-slate-400 text-slate-200 font-bold py-2 px-4 rounded text-sm uppercase tracking-wide"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">

          {/* Left Column — Add Comics */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              {/* Tab Bar */}
              <div className="flex border-2 border-black rounded-t-lg overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                <button
                  onClick={() => setActiveTab('manual')}
                  className={`flex-1 py-3 text-sm font-bold tracking-wide uppercase transition-colors border-r-2 border-black ${
                    activeTab === 'manual'
                      ? 'bg-red-700 text-white'
                      : 'bg-white text-gray-600 hover:bg-red-50'
                  }`}
                >
                  Manual Entry
                </button>
                <button
                  onClick={() => setActiveTab('scan')}
                  className={`flex-1 py-3 text-sm font-bold tracking-wide uppercase transition-colors border-r-2 border-black ${
                    activeTab === 'scan'
                      ? 'bg-slate-800 text-white'
                      : 'bg-white text-gray-600 hover:bg-slate-50'
                  }`}
                >
                  Scan
                </button>
                <button
                  onClick={() => setActiveTab('manage')}
                  className={`flex-1 py-3 text-sm font-bold tracking-wide uppercase transition-colors ${
                    activeTab === 'manage'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-amber-50'
                  }`}
                >
                  Manage
                </button>
              </div>

              {/* Tab Content */}
              <div className="border-2 border-t-0 border-black rounded-b-lg overflow-hidden shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {activeTab === 'manual' && <ComicForm onSubmit={handleAddComic} />}
                {activeTab === 'scan' && <ComicAnalyzer onSave={handleAddComic} />}
                {activeTab === 'manage' && (
                  <div className="bg-white p-4 flex flex-col gap-3">
                    <div className="relative">
                      <svg
                        className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <input
                        type="text"
                        placeholder="Search database..."
                        value={manageQuery}
                        onChange={(e) => setManageQuery(e.target.value)}
                        className="w-full rounded border-2 border-black pl-9 pr-8 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-amber-500"
                      />
                      {manageQuery && (
                        <button
                          onClick={() => setManageQuery('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-amber-600">{managedComics.length}</span> of {comics.length} comics
                      {comics.filter((c) => c.hidden).length > 0 && (
                        <span className="ml-2 text-gray-400">
                          ({comics.filter((c) => c.hidden).length} hidden)
                        </span>
                      )}
                    </p>
                    <div className="flex flex-col gap-2 max-h-120 overflow-y-auto pr-1">
                      {managedComics.length === 0 && (
                        <p className="py-8 text-center text-sm text-gray-400">No results</p>
                      )}
                      {managedComics.map((comic) => (
                        <div
                          key={comic.id}
                          className={`flex items-center justify-between gap-2 rounded border-2 border-black px-3 py-2 ${
                            comic.hidden ? 'bg-gray-100 opacity-60' : 'bg-stone-50'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <p className={`truncate text-sm font-bold ${comic.hidden ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                              {comic.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {comic.company} #{comic.issueNumber} &middot; {comic.year} &middot; {comic.condition}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              onClick={() => handleToggleVisibility(comic.id, !comic.hidden)}
                              className={`border-2 border-black px-2 py-1 text-xs font-bold uppercase transition-colors ${
                                comic.hidden
                                  ? 'bg-green-600 text-white hover:bg-green-700'
                                  : 'bg-amber-500 text-white hover:bg-amber-600'
                              }`}
                            >
                              {comic.hidden ? 'Restore' : 'Hide'}
                            </button>
                            <button
                              onClick={() => handleDeleteComic(comic.id)}
                              className="border-2 border-black bg-red-600 px-2 py-1 text-xs font-bold uppercase text-white hover:bg-red-700 transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column — Search & Comics Grid */}
          <div className="lg:col-span-2 space-y-6">
            <ComicSearch
              value={searchQuery}
              onChange={setSearchQuery}
              resultCount={filteredComics.length}
            />

            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <div className="mb-4 inline-block animate-spin rounded-full border-4 border-gray-300 border-t-red-700 h-12 w-12"></div>
                  <p className="text-gray-600 font-medium">Loading comics...</p>
                </div>
              </div>
            )}

            {!isLoading && filteredComics.length === 0 && (
              <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white py-16 text-center shadow-sm">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-bold text-gray-900">
                  {searchQuery ? 'No comics found' : 'No comics yet'}
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  {searchQuery
                    ? 'Try a different search term'
                    : 'Add your first comic using the panel on the left'}
                </p>
              </div>
            )}

            {!isLoading && filteredComics.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {filteredComics.map((comic) => (
                  <ComicCard key={comic.id} comic={comic} onDelete={handleDeleteComic} onToggleVisibility={handleToggleVisibility} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="border-t-4 border-black bg-slate-900 mt-16">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p
            className="text-center text-2xl text-white tracking-wide"
            style={{ fontFamily: 'var(--font-comic-display)' }}
          >
            Marketplace Comics
          </p>
          <p className="mt-1 text-center text-gray-400 text-xs uppercase tracking-widest">
            Your trusted source for vintage &amp; collectible comic books
          </p>
        </div>
      </footer>
    </div>
  );
}
