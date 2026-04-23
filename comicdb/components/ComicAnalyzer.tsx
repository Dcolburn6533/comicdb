'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Comic } from '@/lib/comics';
import { buildGoogleDriveImageUrl } from '@/lib/googleDrive';
import GoogleDrivePicker from '@/components/GoogleDrivePicker';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface AnalyzedItem {
  imagePreviewUrl: string;
  imageBase64: string;
  imageMimeType: string;
  name: string;
  company: string;
  issueNumber: string;
  year: string;
  price: string;
  condition: string;
  description: string;
  cbdbUrl: string;
  imageUrl: string;
  additionalImageUrls: string[];
  saved: boolean;
  saving: boolean;
  saveError: string;
}

interface SelectedImage {
  previewUrl: string;
  storeUrl: string;
  base64: string;
  mimeType: string;
}

type AnalysisStatus = 'pending' | 'analyzing' | 'done' | 'error';

interface ComicAnalyzerProps {
  onSave: (comic: Omit<Comic, 'id' | 'createdAt'>) => Promise<void>;
}

const CONDITIONS = ['Poor', 'Fair', 'Good', 'Very Good', 'Fine', 'Very Fine', 'Near Mint', 'Mint'];
const STORAGE_KEY = 'comicdb-analyzed-items';
const ANALYSIS_CONCURRENCY = 30;
const SAVE_CONCURRENCY = 5;

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const GAPI_SCRIPT = 'https://apis.google.com/js/api.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) { resolve(); return; }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load: ${src}`));
    document.body.appendChild(script);
  });
}

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function base64ToBlob(base64: string, mimeType: string): Blob {
  const bytes = atob(base64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type: mimeType });
}

/** Run async tasks with a concurrency limit */
async function runWithConcurrency<T>(
  tasks: (() => Promise<T>)[],
  limit: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  const worker = async () => {
    while (nextIndex < tasks.length) {
      const i = nextIndex++;
      results[i] = await tasks[i]();
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(limit, tasks.length) }, () => worker())
  );
  return results;
}

export default function ComicAnalyzer({ onSave }: ComicAnalyzerProps) {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatuses, setAnalysisStatuses] = useState<AnalysisStatus[]>([]);
  const [analysisTotalCount, setAnalysisTotalCount] = useState(0);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const [isSavingAll, setIsSavingAll] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const items: AnalyzedItem[] = JSON.parse(stored);
        const pending = items.filter((item) => !item.saved);
        if (pending.length > 0) {
          // Regenerate blob URLs from stored base64
          const restored = pending.map((item) => {
            if (item.imageBase64 && item.imageMimeType) {
              const blob = base64ToBlob(item.imageBase64, item.imageMimeType);
              return {
                ...item,
                imagePreviewUrl: URL.createObjectURL(blob),
                additionalImageUrls: Array.isArray(item.additionalImageUrls)
                  ? item.additionalImageUrls
                  : [],
                saving: false,
                saveError: '',
              };
            }
            return {
              ...item,
              imagePreviewUrl: '',
              additionalImageUrls: Array.isArray(item.additionalImageUrls)
                ? item.additionalImageUrls
                : [],
              saving: false,
              saveError: '',
            };
          });
          setAnalyzedItems(restored);
        }
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Persist to localStorage whenever analyzedItems changes
  useEffect(() => {
    const pending = analyzedItems.filter((item) => !item.saved);
    if (pending.length > 0) {
      // Store without blob URLs (they don't survive serialization)
      const toStore = pending.map((item) => ({ ...item, imagePreviewUrl: '', saving: false, saveError: '' }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [analyzedItems]);

  const driveConfig = {
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID,
  };

  const openGoogleDrivePicker = useCallback(async () => {
    setDriveError('');
    if (!driveConfig.apiKey || !driveConfig.clientId || !driveConfig.appId) {
      setDriveError('Google Drive is not configured. Add NEXT_PUBLIC_GOOGLE_ environment variables.');
      return;
    }

    setIsLoadingDrive(true);
    try {
      await Promise.all([loadScript(GIS_SCRIPT), loadScript(GAPI_SCRIPT)]);
      await new Promise<void>((resolve) => window.gapi.load('picker', () => resolve()));

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: driveConfig.clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: async (response: any) => {
          if (!response?.access_token) {
            setDriveError('Google authorization was cancelled or failed.');
            setIsLoadingDrive(false);
            return;
          }
          const accessToken = response.access_token;

          const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
            .setIncludeFolders(false)
            .setSelectFolderEnabled(false)
            .setMimeTypes('image/png,image/jpeg,image/jpg,image/webp,image/gif');

          const picker = new window.google.picker.PickerBuilder()
            .addView(view)
            .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
            .setOAuthToken(accessToken)
            .setDeveloperKey(driveConfig.apiKey)
            .setAppId(driveConfig.appId)
            .setTitle('Select comic cover images from Google Drive')
            .setCallback(async (data: any) => {
              if (data.action !== window.google.picker.Action.PICKED) return;
              const docs: any[] = data.docs || [];
              if (!docs.length) return;

              setIsLoadingDrive(true);
              const images: SelectedImage[] = [];

              for (const doc of docs) {
                try {
                  const res = await fetch(
                    `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`,
                    { headers: { Authorization: `Bearer ${accessToken}` } }
                  );
                  if (!res.ok) throw new Error(`HTTP ${res.status}`);
                  const blob = await res.blob();
                  const base64 = await blobToBase64(blob);
                  const storeUrl = buildGoogleDriveImageUrl(doc.id);
                  const previewUrl = URL.createObjectURL(blob);
                  images.push({ previewUrl, storeUrl, base64, mimeType: blob.type || 'image/jpeg' });
                } catch (err) {
                  console.error(`Failed to fetch Drive file ${doc.id}:`, err);
                  setDriveError(`Could not load "${doc.name}". Make sure the file is accessible.`);
                }
              }

              setSelectedImages((prev) => [...prev, ...images]);
              setIsLoadingDrive(false);
              setDriveError('');
            })
            .build();

          picker.setVisible(true);
          setIsLoadingDrive(false);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      setDriveError(err instanceof Error ? err.message : 'Failed to open Google Drive picker.');
      setIsLoadingDrive(false);
    }
  }, [driveConfig.apiKey, driveConfig.clientId, driveConfig.appId]);

  const handleLocalFiles = useCallback(async (files: FileList) => {
    const images: SelectedImage[] = [];
    for (const file of Array.from(files)) {
      const base64 = await fileToBase64(file);
      const previewUrl = URL.createObjectURL(file);
      images.push({ previewUrl, storeUrl: '', base64, mimeType: file.type });
    }
    setSelectedImages((prev) => [...prev, ...images]);
  }, []);

  const removeSelected = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeAll = async () => {
    const images = [...selectedImages];
    const total = images.length;

    setIsAnalyzing(true);
    setAnalysisTotalCount(total);
    setAnalysisStatuses(new Array(total).fill('pending'));

    const tasks = images.map((img, i) => async (): Promise<AnalyzedItem> => {
      // Mark as analyzing
      setAnalysisStatuses((prev) => {
        const next = [...prev];
        next[i] = 'analyzing';
        return next;
      });

      try {
        const res = await fetch('/api/analyze-comic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: img.base64, mimeType: img.mimeType }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');

        const ext = data.data;
        const item: AnalyzedItem = {
          imagePreviewUrl: img.previewUrl,
          imageBase64: img.base64,
          imageMimeType: img.mimeType,
          name: ext.name || '',
          company: ext.company || '',
          issueNumber: String(ext.issue_number || 1),
          year: String(ext.year_published || new Date().getFullYear()),
          price: '',
          condition: CONDITIONS.includes(ext.condition) ? ext.condition : 'Good',
          description: ext.description || '',
          cbdbUrl: '',
          imageUrl: img.storeUrl,
          additionalImageUrls: [],
          saved: false,
          saving: false,
          saveError: '',
        };

        setAnalysisStatuses((prev) => {
          const next = [...prev];
          next[i] = 'done';
          return next;
        });

        // Append result immediately
        setAnalyzedItems((prev) => [item, ...prev]);
        return item;
      } catch {
        const item: AnalyzedItem = {
          imagePreviewUrl: img.previewUrl,
          imageBase64: img.base64,
          imageMimeType: img.mimeType,
          name: '',
          company: '',
          issueNumber: '1',
          year: String(new Date().getFullYear()),
          price: '',
          condition: 'Good',
          description: '',
          cbdbUrl: '',
          imageUrl: img.storeUrl,
          additionalImageUrls: [],
          saved: false,
          saving: false,
          saveError: 'Analysis failed — please fill in details manually.',
        };

        setAnalysisStatuses((prev) => {
          const next = [...prev];
          next[i] = 'error';
          return next;
        });

        setAnalyzedItems((prev) => [item, ...prev]);
        return item;
      }
    });

    await runWithConcurrency(tasks, ANALYSIS_CONCURRENCY);

    setSelectedImages([]);
    setIsAnalyzing(false);
  };

  const updateItem = (index: number, field: keyof AnalyzedItem, value: string) => {
    setAnalyzedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const saveItem = async (index: number) => {
    const item = analyzedItems[index];
    if (!item || item.saved || item.saving) return;

    let parsedPrice: number | null = null;
    if (item.price.trim()) {
      const numericPrice = Number.parseFloat(item.price);
      if (!Number.isFinite(numericPrice) || numericPrice < 0) {
        setAnalyzedItems((prev) =>
          prev.map((it, i) =>
            i === index ? { ...it, saveError: 'Price must be a valid positive number.' } : it
          )
        );
        return;
      }
      parsedPrice = numericPrice;
    }

    setAnalyzedItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, saving: true, saveError: '' } : it))
    );

    try {
      await onSave({
        name: item.name.trim(),
        company: item.company.trim(),
        issueNumber: parseInt(item.issueNumber, 10) || 1,
        year: parseInt(item.year, 10) || new Date().getFullYear(),
        price: parsedPrice ?? undefined,
        condition: item.condition,
        description: item.description.trim(),
        imageUrl: item.imageUrl,
        cbdbUrl: item.cbdbUrl,
        additionalImages: item.additionalImageUrls,
      });
      setAnalyzedItems((prev) =>
        prev.map((it, i) => (i === index ? { ...it, saving: false, saved: true } : it))
      );
    } catch (err) {
      setAnalyzedItems((prev) =>
        prev.map((it, i) =>
          i === index
            ? { ...it, saving: false, saveError: err instanceof Error ? err.message : 'Save failed' }
            : it
        )
      );
    }
  };

  const saveAllThrottled = async () => {
    setIsSavingAll(true);

    const pendingIndices = analyzedItems
      .map((item, index) => (!item.saved && !item.saving && item.name.trim() && item.company.trim() && item.description.trim() ? index : -1))
      .filter((i) => i !== -1);

    const tasks = pendingIndices.map((idx) => () => saveItem(idx));
    await runWithConcurrency(tasks, SAVE_CONCURRENCY);

    setIsSavingAll(false);
  };

  const discardItem = (index: number) => {
    setAnalyzedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const addAdditionalImageToItem = (index: number, url: string) => {
    setAnalyzedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (item.additionalImageUrls.includes(url)) return item;
        return { ...item, additionalImageUrls: [...item.additionalImageUrls, url] };
      })
    );
  };

  const addAdditionalImagesToItem = (index: number, urls: string[]) => {
    setAnalyzedItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const merged = [...item.additionalImageUrls];
        for (const url of urls) {
          if (!merged.includes(url)) {
            merged.push(url);
          }
        }
        return { ...item, additionalImageUrls: merged };
      })
    );
  };

  const removeAdditionalImageFromItem = (index: number, url: string) => {
    setAnalyzedItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, additionalImageUrls: item.additionalImageUrls.filter((entry) => entry !== url) }
          : item
      )
    );
  };

  const clearAllRecovered = () => {
    setAnalyzedItems([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const pendingItems = analyzedItems.filter((it) => !it.saved);
  const savedCount = analyzedItems.filter((it) => it.saved).length;

  // Derived analysis progress
  const doneCount = analysisStatuses.filter((s) => s === 'done').length;
  const errorCount = analysisStatuses.filter((s) => s === 'error').length;
  const inProgressCount = analysisStatuses.filter((s) => s === 'analyzing').length;

  return (
    <div className="bg-white p-5 space-y-6">
      {/* Recovered data banner */}
      {!isAnalyzing && pendingItems.length > 0 && savedCount === 0 && selectedImages.length === 0 && analysisTotalCount === 0 && (
        <div className="rounded border-2 border-amber-500 bg-amber-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-700 mb-1">
            Recovered {pendingItems.length} unsaved comic{pendingItems.length > 1 ? 's' : ''} from last session
          </p>
          <p className="text-xs text-amber-600 mb-2">
            These were analyzed but not saved before the page closed.
          </p>
          <button
            onClick={clearAllRecovered}
            className="text-xs text-red-600 hover:text-red-800 font-semibold underline cursor-pointer"
          >
            Discard all recovered items
          </button>
        </div>
      )}

      {/* Selection */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
          Select Comic Images
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={openGoogleDrivePicker}
            disabled={isLoadingDrive || isAnalyzing}
            className="w-full rounded border-2 border-black bg-blue-600 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
          >
            {isLoadingDrive ? 'Connecting to Drive...' : 'Choose from Google Drive'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="w-full rounded border-2 border-black bg-white py-2.5 text-sm font-bold uppercase tracking-wide text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
          >
            Upload from Computer
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleLocalFiles(e.target.files)}
          />
        </div>

        {driveError && (
          <p className="mt-2 text-xs text-red-700 font-medium">{driveError}</p>
        )}
      </div>

      {/* Selected Thumbnails with status overlays */}
      {selectedImages.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-2">
            {selectedImages.length} image{selectedImages.length > 1 ? 's' : ''} selected
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedImages.map((img, i) => (
              <div key={i} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.previewUrl}
                  alt={`Selected ${i + 1}`}
                  className="h-24 w-16 rounded border-2 border-black object-cover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                />

                {/* Status overlay during analysis */}
                {isAnalyzing && analysisStatuses[i] && (
                  <div className={`absolute inset-0 rounded flex items-center justify-center ${
                    analysisStatuses[i] === 'analyzing' ? 'bg-blue-600/60' :
                    analysisStatuses[i] === 'done' ? 'bg-green-600/60' :
                    analysisStatuses[i] === 'error' ? 'bg-red-600/60' :
                    'bg-black/30'
                  }`}>
                    {analysisStatuses[i] === 'analyzing' && (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    )}
                    {analysisStatuses[i] === 'done' && (
                      <span className="text-white text-lg font-black">✓</span>
                    )}
                    {analysisStatuses[i] === 'error' && (
                      <span className="text-white text-lg font-black">✕</span>
                    )}
                  </div>
                )}

                {/* Remove button (only before analysis starts) */}
                {!isAnalyzing && (
                  <button
                    onClick={() => removeSelected(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-red-600 text-xs font-bold text-white hover:bg-red-700 cursor-pointer"
                  >
                    x
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Analyze button / Progress bar */}
          {!isAnalyzing ? (
            <button
              onClick={analyzeAll}
              className="w-full rounded border-2 border-black bg-slate-800 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all cursor-pointer"
            >
              Analyze {selectedImages.length} Comic{selectedImages.length > 1 ? 's' : ''}
            </button>
          ) : (
            <div className="space-y-2">
              {/* Progress bar */}
              <div className="w-full rounded border-2 border-black overflow-hidden bg-gray-200 h-7 relative">
                <div
                  className="h-full bg-green-600 transition-all duration-300"
                  style={{ width: `${((doneCount + errorCount) / analysisTotalCount) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black uppercase tracking-wide text-black drop-shadow-[0_0_2px_rgba(255,255,255,0.8)]">
                    {doneCount + errorCount} / {analysisTotalCount} analyzed
                    {inProgressCount > 0 && ` — ${inProgressCount} in progress`}
                    {errorCount > 0 && ` — ${errorCount} failed`}
                  </span>
                </div>
              </div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 text-center">
                Processing {ANALYSIS_CONCURRENCY} at a time — results appear as they finish
              </p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {analyzedItems.length > 0 && (
        <div className="space-y-5 border-t-2 border-gray-200 pt-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
              Review Results
            </p>
            {savedCount > 0 && (
              <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
                {savedCount} saved
              </span>
            )}
          </div>

          {pendingItems.length > 1 && (
            <button
              onClick={saveAllThrottled}
              disabled={isSavingAll || pendingItems.some((it) => it.saving) || pendingItems.every((it) => !it.name.trim() || !it.company.trim() || !it.description.trim())}
              className="w-full rounded border-2 border-black bg-slate-800 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isSavingAll
                ? `Saving... (${SAVE_CONCURRENCY} at a time)`
                : `Save All (${pendingItems.length} Comics)`}
            </button>
          )}

          {pendingItems.length === 0 && savedCount > 0 && (
            <div className="rounded border-2 border-green-600 bg-green-50 p-3 text-center text-sm font-bold text-green-700 uppercase tracking-wide">
              All comics saved
            </div>
          )}

          <div className="max-h-[62vh] overflow-y-auto pr-1 space-y-5">
            {analyzedItems.map((item, index) =>
              item.saved ? null : (
                <div
                  key={index}
                  className="rounded border-2 border-black bg-stone-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                >
                {/* Cover image */}
                <div className="border-b-2 border-black p-3 flex gap-3 items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {item.imagePreviewUrl ? (
                    <img
                      src={item.imagePreviewUrl}
                      alt="Comic cover"
                      className="h-32 w-22 shrink-0 rounded border-2 border-black object-cover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      style={{ width: '5.5rem' }}
                    />
                  ) : (
                    <div
                      className="h-32 shrink-0 rounded border-2 border-black bg-gray-200 flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                      style={{ width: '5.5rem' }}
                    >
                      <span className="text-[9px] font-bold text-gray-400 uppercase text-center px-1">No Preview</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">
                      Claude extracted
                    </p>
                    <p className="text-sm font-bold text-gray-900 leading-tight">
                      {item.name || <span className="text-gray-400 italic font-normal">Unknown title</span>}
                    </p>
                    {item.company && (
                      <p className="text-xs text-gray-600 mt-0.5">{item.company}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.issueNumber && `#${item.issueNumber}`}{item.year && ` · ${item.year}`}
                    </p>
                    <button
                      onClick={() => discardItem(index)}
                      className="mt-2 text-xs text-red-600 hover:text-red-800 font-semibold underline cursor-pointer"
                    >
                      Discard
                    </button>
                  </div>
                </div>

                {/* Editable form */}
                <div className="p-3 space-y-2.5">
                  {item.saveError && (
                    <p className="rounded bg-red-50 border border-red-300 px-2 py-1.5 text-xs text-red-700 font-medium">
                      {item.saveError}
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Comic Name
                      </label>
                      <input
                        type="text"
                        value={item.name}
                        onChange={(e) => updateItem(index, 'name', e.target.value)}
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Issue No.
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.issueNumber}
                        onChange={(e) => updateItem(index, 'issueNumber', e.target.value)}
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Year
                      </label>
                      <input
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        value={item.year}
                        onChange={(e) => updateItem(index, 'year', e.target.value)}
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Price (Optional)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.price}
                        onChange={(e) => updateItem(index, 'price', e.target.value)}
                        placeholder="Leave blank if unknown"
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Publisher
                      </label>
                      <input
                        type="text"
                        value={item.company}
                        onChange={(e) => updateItem(index, 'company', e.target.value)}
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Condition
                      </label>
                      <select
                        value={item.condition}
                        onChange={(e) => updateItem(index, 'condition', e.target.value)}
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none cursor-pointer"
                      >
                        {CONDITIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Description
                      </label>
                      <textarea
                        rows={3}
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none resize-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Image URL
                      </label>
                      <input
                        type="text"
                        value={item.imageUrl}
                        onChange={(e) => updateItem(index, 'imageUrl', e.target.value)}
                        placeholder="Auto-filled for Google Drive"
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wide text-gray-600 mb-1">
                        Additional Images
                      </label>
                      <GoogleDrivePicker
                        allowMultiSelect
                        onSelectImageUrls={(urls) => addAdditionalImagesToItem(index, urls)}
                        onSelectImageUrl={(url) => addAdditionalImageToItem(index, url)}
                      />

                      {item.additionalImageUrls.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          {item.additionalImageUrls.map((url) => (
                            <div key={url} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2 py-1">
                              <span className="truncate text-xs text-gray-700">{url}</span>
                              <button
                                type="button"
                                onClick={() => removeAdditionalImageFromItem(index, url)}
                                className="shrink-0 rounded bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-200"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => saveItem(index)}
                    disabled={item.saving || !item.name.trim() || !item.company.trim() || !item.description.trim()}
                    className="w-full rounded border-2 border-black bg-green-700 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-green-800 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all cursor-pointer"
                  >
                    {item.saving ? 'Saving...' : 'Save Comic'}
                  </button>
                </div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
