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
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsLoading(true);

    try {
      const formData = new FormData(e.currentTarget);
      const rawImageUrl = (formData.get('imageUrl') as string) ?? '';
      const normalizedImageUrl = normalizeImageUrl(rawImageUrl);

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
        imageUrl: normalizedImageUrl,
        cbdbUrl: formData.get('cbdbUrl') as string,
      };

      // Validation
      if (!comic.name.trim()) {
        setError('Comic name is required');
        return;
      }
      if (!comic.company.trim()) {
        setError('Company is required');
        return;
      }
      if (!comic.issueNumber || comic.issueNumber < 1) {
        setError('Please enter a valid issue number');
        return;
      }
      if (!comic.year || comic.year < 1900 || comic.year > new Date().getFullYear()) {
        setError('Please enter a valid year');
        return;
      }
      if (!comic.condition.trim()) {
        setError('Condition is required');
        return;
      }
      if (!comic.description.trim()) {
        setError('Description is required');
        return;
      }

      await onSubmit(comic);
      setSuccess(true);
      formRef.current?.reset();
      setImageInputValue('');
      
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
              Issue Number *
            </label>
            <input
              type="number"
              id="issueNumber"
              name="issueNumber"
              placeholder="e.g., 15"
              min="1"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>

          {/* Company */}
          <div>
            <label htmlFor="company" className="block text-sm font-semibold text-gray-700 mb-1">
              Company *
            </label>
            <input
              type="text"
              id="company"
              name="company"
              placeholder="e.g., Marvel"
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>

          {/* Year */}
          <div>
            <label htmlFor="year" className="block text-sm font-semibold text-gray-700 mb-1">
              Year Published *
            </label>
            <input
              type="number"
              id="year"
              name="year"
              placeholder="e.g., 1962"
              min="1900"
              max={new Date().getFullYear()}
              className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              required
            />
          </div>
        </div>

        {/* Condition */}
        <div>
          <label htmlFor="condition" className="block text-sm font-semibold text-gray-700 mb-1">
            Condition *
          </label>
          <select
            id="condition"
            name="condition"
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            required
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
            Description *
          </label>
          <textarea
            id="description"
            name="description"
            placeholder="Details about the comic condition, grade, artist, etc."
            rows={4}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
            required
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
          <p className="mt-2 text-xs text-gray-600">
            <strong>Image sources:</strong>
          </p>
          <ul className="mt-1 text-xs text-gray-600 space-y-1 list-disc list-inside">
            <li>Direct image URL (e.g., jpg, png)</li>
            <li>Google Drive native input: paste share link and we auto-convert it</li>
            <li>You can also paste only the Google Drive file ID</li>
            <li>Unsplash or other stock photos</li>
            <li>Leave blank to use a placeholder</li>
          </ul>

          <GoogleDrivePicker onSelectImageUrl={setImageInputValue} />
        </div>

        {/* CBDB URL Override */}
        <div>
          <label htmlFor="cbdbUrl" className="block text-sm font-semibold text-gray-700 mb-1">
            CBDB URL (Optional)
          </label>
          <input
            type="url"
            id="cbdbUrl"
            name="cbdbUrl"
            placeholder="https://cbdb.com/..."
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-500 focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <p className="mt-1 text-xs text-gray-600">
            Leave blank to auto-generate a CBDB search link from title, issue, and year.
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
