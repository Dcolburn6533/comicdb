'use client';

import { Comic } from '@/lib/comics';
import { FormEvent, useState, useRef } from 'react';
import { isGoogleDriveLikeInput, normalizeImageUrl } from '@/lib/googleDrive';
import GoogleDrivePicker from '@/components/GoogleDrivePicker';

interface ComicFormProps {
  onSubmit: (comic: Omit<Comic, 'id' | 'createdAt'>) => Promise<void>;
}

export default function ComicForm({ onSubmit }: ComicFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [imageInputValue, setImageInputValue] = useState('');
  const [additionalImageUrls, setAdditionalImageUrls] = useState<string[]>([]);
  const formRef = useRef<HTMLFormElement>(null);

  const addAdditionalImage = (url: string) => {
    setAdditionalImageUrls((prev) => {
      if (prev.includes(url)) return prev;
      return [...prev, url];
    });
  };

  const addAdditionalImages = (urls: string[]) => {
    setAdditionalImageUrls((prev) => {
      const merged = [...prev];
      for (const url of urls) {
        if (!merged.includes(url)) {
          merged.push(url);
        }
      }
      return merged;
    });
  };

  const removeAdditionalImage = (url: string) => {
    setAdditionalImageUrls((prev) => prev.filter((entry) => entry !== url));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const rawImageUrl = (formData.get('imageUrl') as string) ?? '';
      const normalizedImageUrl = normalizeImageUrl(rawImageUrl);
      const rawPrice = ((formData.get('price') as string) ?? '').trim();
      const parsedPrice = rawPrice ? Number.parseFloat(rawPrice) : undefined;

      if (
        rawImageUrl.trim() &&
        isGoogleDriveLikeInput(rawImageUrl) &&
        normalizedImageUrl === rawImageUrl.trim()
      ) {
        setError('Could not parse this Google Drive link. Use a file share link or file ID.');
        return;
      }

      const comic: Omit<Comic, 'id' | 'createdAt'> = {
        name: formData.get('name') as string,
        company: formData.get('company') as string,
        issueNumber: parseInt(formData.get('issueNumber') as string, 10),
        year: parseInt(formData.get('year') as string, 10),
        condition: formData.get('condition') as string,
        description: formData.get('description') as string,
        price: parsedPrice,
        imageUrl: normalizedImageUrl,
        cbdbUrl: formData.get('cbdbUrl') as string,
        additionalImages: additionalImageUrls,
      };

      // Only name and price are required
      if (!comic.name.trim()) {
        setError('Comic name is required');
        return;
      }
      if (typeof comic.price !== 'number' || !Number.isFinite(comic.price) || comic.price < 0) {
        setError('Price is required and must be a valid positive number');
        return;
      }

      await onSubmit(comic);
      setSuccess(true);
      formRef.current?.reset();
      setImageInputValue('');
      setAdditionalImageUrls([]);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add comic');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-orange-500 bg-orange-50 p-6 shadow-md">
      <h2 className="mb-4 text-2xl font-bold text-gray-900">List a Comic for Sale</h2>

      {error && (
        <div className="mb-4 rounded-md border border-red-400 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-md border border-green-400 bg-green-50 p-4 text-sm text-green-700">
          Comic added successfully!
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Comic Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-1">
              Comic Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              placeholder="e.g., Amazing Fantasy"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>

          {/* Issue Number */}
          <div>
            <label htmlFor="issueNumber" className="block text-sm font-semibold text-gray-700 mb-1">
              Issue Number
            </label>
            <input
              type="number"
              id="issueNumber"
              name="issueNumber"
              placeholder="e.g., 15"
              min="1"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-1">
              Company
            </label>
            <input
              type="text"
              id="company"
              name="company"
              placeholder="e.g., Marvel"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Year */}
          <div>
            <label htmlFor="year" className="block text-sm font-semibold text-gray-700 mb-1">
              Year Published
            </label>
            <input
              type="number"
              id="year"
              name="year"
              placeholder="e.g., 1962"
              min="1900"
              max={new Date().getFullYear()}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>

          {/* Price */}
          <div>
            <label htmlFor="price" className="block text-sm font-semibold text-gray-700 mb-1">
              Price *
            </label>
            <input
              type="number"
              id="price"
              name="price"
              placeholder="e.g., 24.99"
              min="0"
              step="0.01"
              required
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Condition */}
        <div>
          <label htmlFor="condition" className="block text-sm font-semibold text-gray-700 mb-1">
            Condition
          </label>
          <select
            id="condition"
            name="condition"
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          >
            <option value="">Select condition...</option>
            <option value="Poor">Poor (Heavy wear, significant damage)</option>
            <option value="Fair">Fair (Moderate wear, some damage)</option>
            <option value="Good">Good (Light wear, readable)</option>
            <option value="Very Good">Very Good (Minimal wear)</option>
            <option value="Fine">Fine (Minor surface wear)</option>
            <option value="Very Fine">Very Fine (Excellent condition)</option>
            <option value="Near Mint">Near Mint (Nearly perfect)</option>
            <option value="Mint">Mint (Perfect condition)</option>
          </select>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Details about the comic condition, grade, artist, etc."
            rows={4}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          ></textarea>
        </div>

        {/* Image URL */}
        <div>
          <label htmlFor="imageUrl" className="block text-sm font-semibold text-gray-700 mb-1">
            Image URL or Google Drive Link
          </label>
          <input
            type="url"
            id="imageUrl"
            name="imageUrl"
            placeholder="https://drive.google.com/file/d/.../view"
            value={imageInputValue}
            onChange={(event) => setImageInputValue(event.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />

          <GoogleDrivePicker onSelectImageUrl={setImageInputValue} />
        </div>

        {/* Additional Images */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Additional Images
          </label>
          <GoogleDrivePicker
            allowMultiSelect
            onSelectImageUrls={addAdditionalImages}
            onSelectImageUrl={addAdditionalImage}
          />

          {additionalImageUrls.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {additionalImageUrls.map((url) => (
                <div key={url} className="flex items-center justify-between gap-2 rounded border border-gray-200 bg-white px-2.5 py-1.5">
                  <span className="truncate text-xs text-gray-700">{url}</span>
                  <button
                    type="button"
                    onClick={() => removeAdditionalImage(url)}
                    className="shrink-0 rounded bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700 hover:bg-red-200"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-1 text-xs text-gray-600">
            Add extra cover/back/spine images from Google Drive.
          </p>
        </div>


        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-md bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white font-bold py-3 px-4 transition-colors duration-200"
        >
          {isLoading ? 'Adding Comic...' : 'Add Comic to Listing'}
        </button>
      </form>
    </div>
  );
}
