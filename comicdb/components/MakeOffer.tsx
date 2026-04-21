'use client';

import { useState, FormEvent } from 'react';
import { Comic } from '@/lib/comics';

interface MakeOfferProps {
  selectedComics: Comic[];
  onSelectedComicsChange: (comics: Comic[]) => void;
  onClose: () => void;
  onBackToBrowse?: () => void;
}

function comicLabel(c: Comic) {
  return `${c.name} · #${c.issueNumber} · ${c.year}`;
}

export default function MakeOffer({ selectedComics, onClose, onBackToBrowse }: MakeOfferProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/offers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comicIds: selectedComics.map((c) => c.id),
          senderName: name.trim(),
          senderPhone: '',
          senderEmail: email.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to send');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40" />

      <div
        className="relative z-10 w-full max-w-md bg-white rounded-t-lg sm:rounded-lg shadow-lg border border-gray-200 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2.5">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
            {sent ? 'Message Sent' : 'Make an Offer'}
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {sent ? (
          <div className="px-4 py-8 text-center">
            <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-green-100">
              <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700">Message sent. We&apos;ll be in touch!</p>
            <button
              onClick={onClose}
              className="mt-4 rounded border border-gray-300 px-4 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 space-y-3">
            {/* Items section */}
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1.5">
                Items
              </p>
              <div className="space-y-1">
                {selectedComics.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center rounded border border-gray-200 bg-gray-50 px-2.5 py-1.5"
                  >
                    <span className="text-xs text-gray-800 leading-tight">{comicLabel(c)}</span>
                  </div>
                ))}
              </div>
            </div>

            {error && (
              <div className="rounded border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Your name"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1">
                Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
                rows={3}
                placeholder="I'm interested in these items..."
                className="w-full resize-none rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={sending || selectedComics.length === 0}
              className="w-full rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {sending ? 'Sending...' : 'Send Message'}
            </button>

            {onBackToBrowse && (
              <button
                type="button"
                onClick={onBackToBrowse}
                className="w-full rounded border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Back to Listings
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
