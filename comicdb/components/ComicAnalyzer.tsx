'use client';

import { useState, useCallback, useRef } from 'react';
import { Comic } from '@/lib/comics';
import { buildGoogleDriveImageUrl } from '@/lib/googleDrive';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface AnalyzedItem {
  imagePreviewUrl: string;
  name: string;
  company: string;
  issueNumber: string;
  year: string;
  condition: string;
  description: string;
  cbdbUrl: string;
  imageUrl: string;
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

interface ComicAnalyzerProps {
  onSave: (comic: Omit<Comic, 'id' | 'createdAt'>) => Promise<void>;
}

const CONDITIONS = ['Poor', 'Fair', 'Good', 'Very Good', 'Fine', 'Very Fine', 'Near Mint', 'Mint'];

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

export default function ComicAnalyzer({ onSave }: ComicAnalyzerProps) {
  const [selectedImages, setSelectedImages] = useState<SelectedImage[]>([]);
  const [isLoadingDrive, setIsLoadingDrive] = useState(false);
  const [driveError, setDriveError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingIndex, setAnalyzingIndex] = useState(0);
  const [analyzedItems, setAnalyzedItems] = useState<AnalyzedItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsAnalyzing(true);
    setAnalyzingIndex(0);
    const results: AnalyzedItem[] = [];

    for (let i = 0; i < selectedImages.length; i++) {
      setAnalyzingIndex(i + 1);
      const img = selectedImages[i];

      try {
        const res = await fetch('/api/analyze-comic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: img.base64, mimeType: img.mimeType }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Analysis failed');

        const ext = data.data;
        results.push({
          imagePreviewUrl: img.previewUrl,
          name: ext.name || '',
          company: ext.company || '',
          issueNumber: String(ext.issue_number || 1),
          year: String(ext.year_published || new Date().getFullYear()),
          condition: CONDITIONS.includes(ext.condition) ? ext.condition : 'Good',
          description: ext.description || '',
          cbdbUrl: '',
          imageUrl: img.storeUrl,
          saved: false,
          saving: false,
          saveError: '',
        });
      } catch {
        results.push({
          imagePreviewUrl: img.previewUrl,
          name: '',
          company: '',
          issueNumber: '1',
          year: String(new Date().getFullYear()),
          condition: 'Good',
          description: '',
          cbdbUrl: '',
          imageUrl: img.storeUrl,
          saved: false,
          saving: false,
          saveError: 'Analysis failed — please fill in details manually.',
        });
      }
    }

    setAnalyzedItems((prev) => [...results, ...prev]);
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
    setAnalyzedItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, saving: true, saveError: '' } : it))
    );

    try {
      await onSave({
        name: item.name.trim(),
        company: item.company.trim(),
        issueNumber: parseInt(item.issueNumber, 10) || 1,
        year: parseInt(item.year, 10) || new Date().getFullYear(),
        condition: item.condition,
        description: item.description.trim(),
        imageUrl: item.imageUrl,
        cbdbUrl: item.cbdbUrl,
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

  const discardItem = (index: number) => {
    setAnalyzedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const pendingItems = analyzedItems.filter((it) => !it.saved);
  const savedCount = analyzedItems.filter((it) => it.saved).length;

  return (
    <div className="bg-white p-5 space-y-6">
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
            className="w-full rounded border-2 border-black bg-blue-600 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-blue-700 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
          >
            {isLoadingDrive ? 'Connecting to Drive...' : 'Choose from Google Drive'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAnalyzing}
            className="w-full rounded border-2 border-black bg-white py-2.5 text-sm font-bold uppercase tracking-wide text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-gray-50 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
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

      {/* Selected Thumbnails */}
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
                <button
                  onClick={() => removeSelected(i)}
                  className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-black bg-red-600 text-xs font-bold text-white hover:bg-red-700"
                >
                  x
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={analyzeAll}
            disabled={isAnalyzing}
            className="w-full rounded border-2 border-black bg-slate-800 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-slate-900 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-60 transition-all"
          >
            {isAnalyzing
              ? `Analyzing ${analyzingIndex} of ${selectedImages.length}...`
              : `Analyze ${selectedImages.length} Comic${selectedImages.length > 1 ? 's' : ''}`}
          </button>
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

          {pendingItems.length === 0 && savedCount > 0 && (
            <div className="rounded border-2 border-green-600 bg-green-50 p-3 text-center text-sm font-bold text-green-700 uppercase tracking-wide">
              All comics saved
            </div>
          )}

          {analyzedItems.map((item, index) =>
            item.saved ? null : (
              <div
                key={index}
                className="rounded border-2 border-black bg-stone-50 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
              >
                {/* Cover image */}
                <div className="border-b-2 border-black p-3 flex gap-3 items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imagePreviewUrl}
                    alt="Comic cover"
                    className="h-32 w-22 shrink-0 rounded border-2 border-black object-cover shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
                    style={{ width: '5.5rem' }}
                  />
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
                      className="mt-2 text-xs text-red-600 hover:text-red-800 font-semibold underline"
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
                        className="w-full rounded border-2 border-gray-300 px-2 py-1.5 text-sm text-gray-900 focus:border-black focus:outline-none"
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
                  </div>

                  <button
                    onClick={() => saveItem(index)}
                    disabled={item.saving || !item.name.trim() || !item.company.trim() || !item.description.trim()}
                    className="w-full rounded border-2 border-black bg-green-700 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-green-800 active:shadow-none active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-50 transition-all"
                  >
                    {item.saving ? 'Saving...' : 'Save Comic'}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
