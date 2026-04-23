'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { normalizeImageUrl } from '@/lib/googleDrive';
import GoogleDrivePicker from '@/components/GoogleDrivePicker';

interface ImageDropZoneProps {
  comicId: string;
  existingImages: { id: number; imageUrl: string }[];
  onImagesChanged: () => void;
}

export default function ImageDropZone({ comicId, existingImages, onImagesChanged }: ImageDropZoneProps) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  const addImages = useCallback(async (urls: string[]) => {
    if (urls.length === 0) return;
    setUploading(true);
    try {
      const res = await fetch('/api/comic-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comicId, imageUrls: urls }),
      });
      if (res.ok) {
        onImagesChanged();
      }
    } catch (err) {
      console.error('Failed to add images:', err);
    } finally {
      setUploading(false);
    }
  }, [comicId, onImagesChanged]);

  const handleDelete = async (imageId: number) => {
    try {
      await fetch(`/api/comic-images?id=${imageId}`, { method: 'DELETE' });
      onImagesChanged();
    } catch (err) {
      console.error('Failed to delete image:', err);
    }
  };

  const handleAddUrl = () => {
    const normalized = normalizeImageUrl(urlInput);
    if (normalized) {
      addImages([normalized]);
      setUrlInput('');
    }
  };

  return (
    <div className="space-y-3">
      {/* Existing images */}
      {existingImages.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingImages.map((img) => (
            <div key={img.id} className="relative group">
              <div className="h-16 w-12 overflow-hidden rounded border border-gray-200 relative">
                <Image src={img.imageUrl} alt="" fill className="object-cover" sizes="48px" />
              </div>
              <button
                onClick={() => handleDelete(img.id)}
                className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                x
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
        <p className="text-xs text-blue-800">
          Add more images using Google Drive Picker or by pasting a URL below.
        </p>
        <GoogleDrivePicker
          allowMultiSelect
          onSelectImageUrls={addImages}
          onSelectImageUrl={(url) => addImages([url])}
        />
      </div>

      {/* Manual URL input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          placeholder="Paste image URL or Google Drive link"
          className="flex-1 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-900 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddUrl(); } }}
        />
        <button
          onClick={handleAddUrl}
          disabled={!urlInput.trim()}
          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
