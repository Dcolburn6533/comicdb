'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import ComicForm from '@/components/ComicForm';
import ComicAnalyzer from '@/components/ComicAnalyzer';
import AdminLogin from '@/components/AdminLogin';
import ImageDropZone from '@/components/ImageDropZone';
import { Comic, getComics, addComic, deleteComic, setComicVisibility, searchComics, updateComic } from '@/lib/comics';

interface OfferComic {
  id: string;
  name: string;
  issueNumber: number;
  year: number;
}

interface Offer {
  id: number;
  comicId: string;
  comicName: string;
  comics: OfferComic[];
  senderName: string;
  senderPhone: string;
  senderEmail: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

interface OfferComicDetail {
  id: string;
  name: string;
  issueNumber: number;
  year: number;
  company: string;
  condition: string;
  imageUrl: string;
  hidden: boolean;
  deleted: boolean;
}

interface ComicImage {
  id: number;
  comicId: string;
  imageUrl: string;
  sortOrder: number;
}

interface ComicEditDraft {
  name: string;
  company: string;
  issueNumber: string;
  year: string;
  price: string;
  condition: string;
  description: string;
  imageUrl: string;
  cbdbUrl: string;
  hidden: boolean;
}

type Tab = 'manual' | 'scan' | 'manage' | 'messages';

const CONDITIONS = ['Poor', 'Fair', 'Good', 'Very Good', 'Fine', 'Very Fine', 'Near Mint', 'Mint'];

export default function AdminPanel() {
  const [comics, setComics] = useState<Comic[]>([]);
  const [manageQuery, setManageQuery] = useState('');
  const [manageFilter, setManageFilter] = useState<'all' | 'visible' | 'hidden'>('all');
  const [managePage, setManagePage] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('manage');

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');

  const [offers, setOffers] = useState<Offer[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const [messageSearch, setMessageSearch] = useState('');

  const [comicImages, setComicImages] = useState<Map<string, ComicImage[]>>(new Map());
  const [editingComicId, setEditingComicId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ComicEditDraft | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => res.json())
      .then((data) => {
        if (data.authenticated) {
          setIsAuthenticated(true);
          setAdminUsername(data.username);
        }
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadComics();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && activeTab === 'messages') {
      loadOffers();
    }
  }, [isAuthenticated, activeTab]);

  useEffect(() => {
    setManagePage(1);
  }, [manageQuery, manageFilter]);

  const loadComics = async () => {
    try {
      const data = await getComics(true);
      setComics(data);
    } catch (error) {
      console.error('Failed to load comics:', error);
    }
  };

  const loadOffers = async () => {
    setOffersLoading(true);
    try {
      const res = await fetch('/api/offers');
      const data = await res.json();
      setOffers(data.offers ?? []);
    } catch (err) {
      console.error('Failed to load offers:', err);
    } finally {
      setOffersLoading(false);
    }
  };

  const loadComicImages = useCallback(async (comicId: string) => {
    try {
      const res = await fetch(`/api/comic-images?comicId=${comicId}`);
      const data = await res.json();
      setComicImages((prev) => {
        const next = new Map(prev);
        next.set(comicId, data.images ?? []);
        return next;
      });
    } catch (err) {
      console.error('Failed to load comic images:', err);
    }
  }, []);

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
      setComics(comics.map((c) => (c.id === id ? { ...c, hidden } : c)));
    } catch (error) {
      console.error('Failed to update visibility:', error);
    }
  };

  const openEdit = (comic: Comic) => {
    setEditingComicId(comic.id);
    setEditError('');
    setEditDraft({
      name: comic.name,
      company: comic.company,
      issueNumber: String(comic.issueNumber),
      year: String(comic.year),
      price: typeof comic.price === 'number' ? String(comic.price) : '',
      condition: comic.condition,
      description: comic.description,
      imageUrl: comic.imageUrl,
      cbdbUrl: comic.cbdbUrl ?? '',
      hidden: Boolean(comic.hidden),
    });
    void loadComicImages(comic.id);
  };

  const cancelEdit = () => {
    setEditingComicId(null);
    setEditDraft(null);
    setEditError('');
  };

  const saveEdit = async (comicId: string) => {
    if (!editDraft) return;

    // Only name and price are required
    if (!editDraft.name.trim()) {
      setEditError('Name is required.');
      return;
    }

    const priceInput = editDraft.price.trim();
    const parsedPrice = priceInput ? Number.parseFloat(priceInput) : null;
    if (!priceInput) {
      setEditError('Price is required.');
      return;
    }
    if (!Number.isFinite(parsedPrice) || (parsedPrice ?? 0) < 0) {
      setEditError('Price must be a valid positive number.');
      return;
    }

    const issueNumber = editDraft.issueNumber.trim() ? parseInt(editDraft.issueNumber, 10) : 0;
    const year = editDraft.year.trim() ? parseInt(editDraft.year, 10) : 0;

    try {
      setSavingEdit(true);
      setEditError('');
      await updateComic(comicId, {
        name: editDraft.name.trim(),
        ...(editDraft.company.trim() && { company: editDraft.company.trim() }),
        ...(issueNumber > 0 && { issueNumber }),
        ...(year > 0 && { year }),
        price: parsedPrice ?? undefined,
        ...(editDraft.condition && { condition: editDraft.condition }),
        ...(editDraft.description.trim() && { description: editDraft.description.trim() }),
        imageUrl: editDraft.imageUrl.trim(),
        cbdbUrl: editDraft.cbdbUrl.trim(),
        hidden: editDraft.hidden,
      });

      setComics((prev) => prev.map((comic) =>
        comic.id === comicId
          ? {
              ...comic,
              name: editDraft.name.trim(),
              ...(editDraft.company.trim() && { company: editDraft.company.trim() }),
              ...(issueNumber > 0 && { issueNumber }),
              ...(year > 0 && { year }),
              price: parsedPrice ?? undefined,
              ...(editDraft.condition && { condition: editDraft.condition }),
              ...(editDraft.description.trim() && { description: editDraft.description.trim() }),
              imageUrl: editDraft.imageUrl.trim(),
              cbdbUrl: editDraft.cbdbUrl.trim() || undefined,
              hidden: editDraft.hidden,
            }
          : comic
      ));

      cancelEdit();
    } catch (error) {
      console.error('Failed to save comic edits:', error);
      setEditError('Failed to save changes. Please try again.');
    } finally {
      setSavingEdit(false);
    }
  };

  const markOfferRead = async (id: number) => {
    try {
      await fetch('/api/offers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, isRead: true }),
      });
      setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, isRead: true } : o)));
    } catch (err) {
      console.error('Failed to mark offer read:', err);
    }
  };

  const handleDeleteOffer = async (id: number) => {
    try {
      await fetch(`/api/offers?id=${id}`, { method: 'DELETE' });
      setOffers(offers.filter((o) => o.id !== id));
      if (selectedOffer?.id === id) {
        setSelectedOffer(null);
      }
    } catch (err) {
      console.error('Failed to delete offer:', err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setIsAuthenticated(false);
    setAdminUsername('');
  };

  const handleLogin = (username: string) => {
    setIsAuthenticated(true);
    setAdminUsername(username);
  };

  const getOfferComicDetails = (offer: Offer): OfferComicDetail[] => {
    const baseComics = offer.comics?.length > 0
      ? offer.comics
      : [{ id: offer.comicId, name: offer.comicName, issueNumber: 0, year: 0 }];

    return baseComics.map((c) => {
      const full = comics.find((comic) => comic.id === c.id);
      return {
        id: c.id,
        name: full?.name ?? c.name,
        issueNumber: full?.issueNumber ?? c.issueNumber,
        year: full?.year ?? c.year,
        company: full?.company ?? 'Unknown Publisher',
        condition: full?.condition ?? 'Unknown',
        imageUrl: full?.imageUrl ?? '',
        hidden: full?.hidden ?? false,
        deleted: !full,
      };
    });
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <AdminLogin onLogin={handleLogin} />;
  }

  const baseManaged = searchComics(comics, manageQuery);
  const managedComics = manageFilter === 'visible'
    ? baseManaged.filter((c) => !c.hidden)
    : manageFilter === 'hidden'
      ? baseManaged.filter((c) => c.hidden)
      : baseManaged;

  const MANAGE_PAGE_SIZE = 25;
  const manageTotalPages = Math.max(1, Math.ceil(managedComics.length / MANAGE_PAGE_SIZE));
  const safeManagePage = Math.min(managePage, manageTotalPages);
  const pagedManagedComics = managedComics.slice(
    (safeManagePage - 1) * MANAGE_PAGE_SIZE,
    safeManagePage * MANAGE_PAGE_SIZE
  );

  const unreadCount = offers.filter((o) => !o.isRead).length;

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 via-stone-50 to-slate-100">
      <header className="border-b border-slate-800 bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Marketplace Comics</h1>
              <p className="text-xs uppercase tracking-[0.18em] text-slate-300">
                Admin Panel · Signed in as <span className="font-semibold text-amber-300">{adminUsername}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/"
                className="rounded border border-slate-500 bg-slate-900 px-3 py-1.5 text-sm text-slate-100 hover:bg-slate-800 transition-colors"
              >
                Back to Store
              </Link>
              <button
                onClick={handleLogout}
                className="rounded border border-rose-400 bg-slate-900 px-3 py-1.5 text-sm text-rose-200 hover:bg-rose-900/30 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4">
          <div className="flex gap-0 overflow-x-auto">
            {([
              { key: 'manage' as Tab, label: 'Manage' },
              { key: 'manual' as Tab, label: 'Add Comic' },
              { key: 'scan' as Tab, label: 'Claude AI Scan' },
              { key: 'messages' as Tab, label: `Messages${unreadCount > 0 ? ` (${unreadCount})` : ''}` },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-4 py-6">
        {activeTab === 'manual' && <ComicForm onSubmit={handleAddComic} />}

        {activeTab === 'scan' && <ComicAnalyzer onSave={handleAddComic} />}

        {activeTab === 'manage' && (
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search comics..."
                value={manageQuery}
                onChange={(e) => setManageQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {/* Filter + count row */}
            <div className="flex items-center gap-2">
              {(['all', 'visible', 'hidden'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setManageFilter(f)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors capitalize ${
                    manageFilter === f
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
              <span className="ml-auto text-xs text-gray-500">
                {managedComics.length} of {comics.length} comics
                {comics.filter((c) => c.hidden).length > 0 && (
                  <span className="ml-1 text-gray-400">({comics.filter((c) => c.hidden).length} hidden)</span>
                )}
              </span>
            </div>

            {/* Pagination top */}
            {manageTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Page {safeManagePage} of {manageTotalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setManagePage((p) => Math.max(1, p - 1))}
                    disabled={safeManagePage === 1}
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >Previous</button>
                  <button
                    onClick={() => setManagePage((p) => Math.min(manageTotalPages, p + 1))}
                    disabled={safeManagePage === manageTotalPages}
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >Next</button>
                </div>
              </div>
            )}

            {/* Comic rows */}
            <div className="overflow-hidden rounded-xl border border-stone-200 shadow-sm divide-y divide-stone-100">
              {pagedManagedComics.length === 0 && (
                <p className="py-8 text-center text-sm text-gray-400">No results</p>
              )}
              {pagedManagedComics.map((comic, index) => (
                <div
                  key={comic.id}
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-stone-50'} ${comic.hidden ? 'opacity-60' : ''}`}
                >
                  {/* Collapsed row */}
                  <div className="flex items-center gap-3 px-3 py-3">
                    {/* Thumbnail */}
                    <div className="h-16 w-11 shrink-0 overflow-hidden rounded bg-gray-100 relative">
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
                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${comic.hidden ? 'text-gray-400 line-through' : 'text-slate-900'}`}>
                        {comic.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {comic.company} &middot; #{comic.issueNumber} &middot; {comic.year} &middot; {comic.condition}
                        {typeof comic.price === 'number' ? ` · $${comic.price.toFixed(2)}` : ''}
                      </p>
                    </div>
                    {/* Admin actions */}
                    <div className="flex shrink-0 gap-1">
                      <button
                        onClick={() => openEdit(comic)}
                        className="rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleVisibility(comic.id, !comic.hidden)}
                        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                          comic.hidden
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        }`}
                      >
                        {comic.hidden ? 'Restore' : 'Hide'}
                      </button>
                      <button
                        onClick={() => handleDeleteComic(comic.id)}
                        className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Inline edit panel */}
                  {editingComicId === comic.id && editDraft && (
                    <div className="border-t border-gray-100 px-3 py-3 space-y-3">
                      {editError && (
                        <p className="rounded border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-700">
                          {editError}
                        </p>
                      )}
                      <div className="grid gap-2 md:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Name *</label>
                          <input
                            type="text"
                            value={editDraft.name}
                            onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Company</label>
                          <input
                            type="text"
                            value={editDraft.company}
                            onChange={(e) => setEditDraft({ ...editDraft, company: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Issue Number</label>
                          <input
                            type="number"
                            min="1"
                            value={editDraft.issueNumber}
                            onChange={(e) => setEditDraft({ ...editDraft, issueNumber: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Year</label>
                          <input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={editDraft.year}
                            onChange={(e) => setEditDraft({ ...editDraft, year: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Price *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editDraft.price}
                            onChange={(e) => setEditDraft({ ...editDraft, price: e.target.value })}
                            placeholder="Required"
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Condition</label>
                          <select
                            value={editDraft.condition}
                            onChange={(e) => setEditDraft({ ...editDraft, condition: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          >
                            {CONDITIONS.map((condition) => (
                              <option key={condition} value={condition}>{condition}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Main Image URL</label>
                          <input
                            type="text"
                            value={editDraft.imageUrl}
                            onChange={(e) => setEditDraft({ ...editDraft, imageUrl: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">CBDB URL</label>
                          <input
                            type="text"
                            value={editDraft.cbdbUrl}
                            onChange={(e) => setEditDraft({ ...editDraft, cbdbUrl: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="mb-1 block text-[11px] font-medium text-gray-600">Description</label>
                          <textarea
                            rows={4}
                            value={editDraft.description}
                            onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                            className="w-full rounded border border-gray-300 px-2.5 py-1.5 text-sm text-gray-900"
                          />
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2">
                          <input
                            id={`hidden-${comic.id}`}
                            type="checkbox"
                            checked={editDraft.hidden}
                            onChange={(e) => setEditDraft({ ...editDraft, hidden: e.target.checked })}
                          />
                          <label htmlFor={`hidden-${comic.id}`} className="text-xs text-gray-700">Hide this comic from storefront</label>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Additional Images</p>
                        <ImageDropZone
                          comicId={comic.id}
                          existingImages={comicImages.get(comic.id) ?? []}
                          onImagesChanged={() => loadComicImages(comic.id)}
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(comic.id)}
                          disabled={savingEdit}
                          className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60 transition-colors"
                        >
                          {savingEdit ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Pagination bottom */}
            {manageTotalPages > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Page {safeManagePage} of {manageTotalPages}</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => setManagePage((p) => Math.max(1, p - 1))}
                    disabled={safeManagePage === 1}
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >Previous</button>
                  <button
                    onClick={() => setManagePage((p) => Math.min(manageTotalPages, p + 1))}
                    disabled={safeManagePage === manageTotalPages}
                    className="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors"
                  >Next</button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-3">
            {/* Search bar */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search messages..."
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
              />
            </div>

            {offersLoading ? (
              <div className="flex justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
              </div>
            ) : offers.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white py-12 text-center">
                <p className="text-sm text-gray-500">No messages yet.</p>
              </div>
            ) : (
              <div className="space-y-1">
                {offers
                  .filter((offer) => {
                    if (!messageSearch.trim()) return true;
                    const q = messageSearch.toLowerCase();
                    return (
                      offer.senderName.toLowerCase().includes(q) ||
                      offer.senderEmail.toLowerCase().includes(q) ||
                      offer.message.toLowerCase().includes(q)
                    );
                  })
                  .map((offer) => (
                    <div
                      key={offer.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => { setSelectedOffer(offer); if (!offer.isRead) markOfferRead(offer.id); }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedOffer(offer);
                          if (!offer.isRead) markOfferRead(offer.id);
                        }
                      }}
                      className={`w-full rounded-lg border p-2.5 text-left transition-all hover:shadow-sm cursor-pointer ${
                        offer.isRead
                          ? 'border-slate-200 bg-white hover:border-slate-300'
                          : 'border-red-200 bg-red-50 hover:border-red-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-gray-900">{offer.senderName}</span>
                        {offer.senderEmail && <span className="text-xs text-gray-500">{offer.senderEmail}</span>}
                        {!offer.isRead && (
                          <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">New</span>
                        )}
                        <span className="ml-auto text-xs text-gray-400">{new Date(offer.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-gray-600 whitespace-pre-line">{offer.message}</p>
                      <div className="mt-1.5 flex gap-1.5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteOffer(offer.id);
                          }}
                          className="rounded bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-200 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </main>

      {selectedOffer && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-3 sm:items-center"
          onClick={() => setSelectedOffer(null)}
        >
          <div
            className="w-full max-w-3xl rounded-xl border border-slate-200 bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Offer Message</p>
                <h3 className="text-lg font-semibold text-slate-900">{selectedOffer.senderName}</h3>
                <p className="text-xs text-slate-500">
                  {selectedOffer.senderPhone}
                  {selectedOffer.senderEmail ? ` · ${selectedOffer.senderEmail}` : ''}
                  {' · '}
                  {new Date(selectedOffer.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedOffer(null)}
                className="rounded border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-4 p-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Customer Message</p>
                <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-line">
                  {selectedOffer.message}
                </p>
              </div>

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Referenced Comics</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {getOfferComicDetails(selectedOffer).map((comic) => (
                    <div key={comic.id} className="flex gap-3 rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded bg-slate-100">
                        {comic.imageUrl ? (
                          <Image
                            src={comic.imageUrl}
                            alt={comic.name}
                            fill
                            className="object-cover"
                            sizes="56px"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <svg className="h-5 w-5 text-slate-300" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 2.5 4 4-4 2.5 4z" />
                            </svg>
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{comic.name}</p>
                        <p className="text-xs text-slate-500">
                          {comic.company} &middot; #{comic.issueNumber > 0 ? comic.issueNumber : '?'} &middot; {comic.year > 0 ? comic.year : 'Unknown'}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {!comic.deleted && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600">
                              {comic.condition}
                            </span>
                          )}
                          {comic.hidden && (
                            <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
                              Hidden
                            </span>
                          )}
                          {comic.deleted && (
                            <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
                              Deleted Listing
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => handleDeleteOffer(selectedOffer.id)}
                  className="rounded bg-red-100 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-200 transition-colors"
                >
                  Delete Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
