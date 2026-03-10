'use client';

import { ChangeEvent } from 'react';

interface ComicSearchProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
}

export default function ComicSearch({
  value,
  onChange,
  resultCount,
}: ComicSearchProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="w-full rounded-lg border-2 border-gray-300 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by name, company, issue, year, condition, or description..."
            value={value}
            onChange={handleChange}
            className="w-full rounded-md border border-gray-300 bg-white pl-10 pr-10 py-3 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
          />
          {value && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg
                className="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Found <span className="font-semibold text-orange-600">{resultCount}</span>{' '}
            comic{resultCount !== 1 ? 's' : ''}
          </span>
          {value && (
            <span className="text-gray-500">
              Searching for: <span className="font-medium">{value}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
