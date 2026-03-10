'use client';

import { useEffect, useState } from 'react';
import ComicCardPublic from '@/components/ComicCardPublic';
import ComicSearch from '@/components/ComicSearch';
import { Comic, getComics, searchComics } from '@/lib/comics';
import Link from 'next/link';

export default function Home() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load comics on mount
  useEffect(() => {
    loadComics();
  }, []);

  const loadComics = async () => {
    try {
      setIsLoading(true);
      const data = await getComics();
      setComics(data);
    } catch (error) {
      console.error('Failed to load comics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredComics = searchComics(comics, searchQuery);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <header className="border-b-4 border-orange-600 bg-white shadow-md">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 tracking-tight">
                ComicDB
              </h1>
              <p className="mt-1 text-gray-600">
                Your searchable database of vintage comic books for sale
              </p>
            </div>
            <div className="hidden sm:block text-orange-600 text-4xl font-bold">
              📚
            </div>
          </div>
          <div className="mt-4">
            <Link
              href="/admin"
              className="inline-block bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded transition-colors"
            >
              Admin Panel
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Search Bar */}
        <div className="mb-8">
          <ComicSearch
            value={searchQuery}
            onChange={setSearchQuery}
            resultCount={filteredComics.length}
          />
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 inline-block animate-spin rounded-full border-4 border-gray-300 border-t-orange-600 h-12 w-12"></div>
              <p className="text-gray-600">Loading comics...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredComics.length === 0 && (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 py-12 text-center">
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
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              {searchQuery ? 'No comics found' : 'No comics available'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              {searchQuery ? 'Try a different search term' : 'Check back soon!'}
            </p>
          </div>
        )}

        {/* Comics Grid */}
        {!isLoading && filteredComics.length > 0 && (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredComics.map((comic) => (
              <ComicCardPublic key={comic.id} comic={comic} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <p className="text-center text-gray-600 text-sm">
            © 2024 ComicDB. Your trusted platform for buying and selling vintage
            comic books.
          </p>
        </div>
      </footer>
    </div>
  );
}
