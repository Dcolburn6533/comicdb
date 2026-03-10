'use client';

import { useCallback, useMemo, useState } from 'react';
import { buildGoogleDriveImageUrl } from '@/lib/googleDrive';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

interface GoogleDrivePickerProps {
  onSelectImageUrl: (imageUrl: string) => void;
}

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const GAPI_SCRIPT = 'https://apis.google.com/js/api.js';

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.body.appendChild(script);
  });
}

export default function GoogleDrivePicker({ onSelectImageUrl }: GoogleDrivePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const config = useMemo(
    () => ({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
      clientId: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
      appId: process.env.NEXT_PUBLIC_GOOGLE_APP_ID,
    }),
    []
  );

  const openPicker = useCallback(
    async (token: string) => {
      if (!window.google?.picker) {
        throw new Error('Google Picker API not loaded');
      }

      const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setIncludeFolders(false)
        .setSelectFolderEnabled(false)
        .setMimeTypes('image/png,image/jpeg,image/jpg,image/webp,image/gif');

      const picker = new window.google.picker.PickerBuilder()
        .addView(view)
        .setOAuthToken(token)
        .setDeveloperKey(config.apiKey)
        .setAppId(config.appId)
        .setTitle('Select comic image from Google Drive')
        .setCallback((data: any) => {
          if (data.action !== window.google.picker.Action.PICKED) {
            return;
          }

          const doc = data.docs?.[0];
          if (!doc?.id) {
            setError('Could not read selected file ID from Google Drive.');
            return;
          }

          const imageUrl = buildGoogleDriveImageUrl(doc.id);
          onSelectImageUrl(imageUrl);
          setError('');
        })
        .build();

      picker.setVisible(true);
    },
    [config.apiKey, config.appId, onSelectImageUrl]
  );

  const handleConnectAndPick = useCallback(async () => {
    setError('');

    if (!config.apiKey || !config.clientId || !config.appId) {
      setError(
        'Google Picker is not configured. Add NEXT_PUBLIC_GOOGLE_API_KEY, NEXT_PUBLIC_GOOGLE_CLIENT_ID, and NEXT_PUBLIC_GOOGLE_APP_ID.'
      );
      return;
    }

    try {
      setIsLoading(true);

      await Promise.all([loadScript(GIS_SCRIPT), loadScript(GAPI_SCRIPT)]);

      await new Promise<void>((resolve) => {
        window.gapi.load('picker', () => resolve());
      });

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: config.clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: (response: any) => {
          if (!response?.access_token) {
            setError('Google authorization was cancelled or failed.');
            return;
          }
          void openPicker(response.access_token);
        },
      });

      tokenClient.requestAccessToken({ prompt: 'consent' });
    } catch (pickerError) {
      setError(pickerError instanceof Error ? pickerError.message : 'Google Picker failed to initialize.');
    } finally {
      setIsLoading(false);
    }
  }, [config.apiKey, config.appId, config.clientId, openPicker]);

  return (
    <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-blue-900">Google Drive Picker</p>
          <p className="text-xs text-blue-800">
            Connect your Google account and choose an image directly from Drive.
          </p>
        </div>
        <button
          type="button"
          onClick={handleConnectAndPick}
          disabled={isLoading}
          className="rounded-md border border-blue-700 bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:bg-blue-400"
        >
          {isLoading ? 'Connecting...' : 'Choose from Drive'}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
    </div>
  );
}
