const DRIVE_FILE_ID_REGEX = /^[a-zA-Z0-9_-]{20,}$/;

export function isGoogleDriveLikeInput(input: string): boolean {
  const value = input.trim().toLowerCase();
  return (
    value.includes('drive.google.com') ||
    value.includes('docs.google.com') ||
    value.includes('googleusercontent.com')
  );
}

export function extractGoogleDriveFileId(input: string): string | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  // Allow entering file ID directly.
  if (DRIVE_FILE_ID_REGEX.test(value)) {
    return value;
  }

  try {
    const url = new URL(value);

    // https://drive.google.com/file/d/<id>/view
    const filePathMatch = url.pathname.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (filePathMatch?.[1]) {
      return filePathMatch[1];
    }

    // https://lh3.googleusercontent.com/d/<id>=w...
    const googleusercontentMatch = url.pathname.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (googleusercontentMatch?.[1]) {
      return googleusercontentMatch[1];
    }

    // https://drive.google.com/open?id=<id>
    // https://drive.google.com/uc?id=<id>
    const idParam = url.searchParams.get('id');
    if (idParam && DRIVE_FILE_ID_REGEX.test(idParam)) {
      return idParam;
    }
  } catch {
    return null;
  }

  return null;
}

export function buildGoogleDriveImageUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w2000`;
}

export function normalizeImageUrl(input: string): string {
  const value = input.trim();
  if (!value) {
    return '';
  }

  const fileId = extractGoogleDriveFileId(value);
  if (fileId) {
    return buildGoogleDriveImageUrl(fileId);
  }

  return value;
}
