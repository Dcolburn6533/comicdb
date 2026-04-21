export interface Comic {
  id: string;
  name: string;
  company: string;
  issueNumber: number;
  year: number;
  condition: string;
  description: string;
  price?: number;
  imageUrl: string;
  cbdbUrl?: string;
  createdAt: string;
  hidden?: boolean;
  additionalImages?: string[];
}

const COMICS_FILE = 'comics.json';

// In-memory storage for development
let comicsData: Comic[] = [];

// Initialize comics data
export async function initializeComics() {
  try {
    const response = await fetch('/api/comics');
    const data = await response.json();
    comicsData = data.comics || [];
  } catch (error) {
    console.log('Initializing with empty comics list');
    comicsData = [];
  }
}

export async function getComics(includeHidden = false): Promise<Comic[]> {
  try {
    const url = includeHidden ? '/api/comics?includeHidden=true' : '/api/comics';
    const response = await fetch(url);
    const data = await response.json();
    return data.comics || [];
  } catch (error) {
    console.error('Error fetching comics:', error);
    return [];
  }
}

export async function addComic(comic: Omit<Comic, 'id' | 'createdAt'>): Promise<Comic> {
  const newComic: Comic = {
    ...comic,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  try {
    const response = await fetch('/api/comics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newComic),
    });

    if (!response.ok) {
      throw new Error('Failed to add comic');
    }

    return newComic;
  } catch (error) {
    console.error('Error adding comic:', error);
    throw error;
  }
}

export async function setComicVisibility(id: string, hidden: boolean): Promise<void> {
  try {
    const response = await fetch('/api/comics', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, hidden }),
    });
    if (!response.ok) {
      throw new Error('Failed to update comic visibility');
    }
  } catch (error) {
    console.error('Error updating comic visibility:', error);
    throw error;
  }
}

export async function updateComic(id: string, updates: Partial<Omit<Comic, 'id' | 'createdAt' | 'additionalImages'>>): Promise<void> {
  try {
    const response = await fetch('/api/comics', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!response.ok) {
      throw new Error('Failed to update comic');
    }
  } catch (error) {
    console.error('Error updating comic:', error);
    throw error;
  }
}

export async function deleteComic(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/comics?id=${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      throw new Error('Failed to delete comic');
    }
  } catch (error) {
    console.error('Error deleting comic:', error);
    throw error;
  }
}

export function searchComics(comics: Comic[], query: string): Comic[] {
  if (!query.trim()) return comics;

  // Split on whitespace and common punctuation; each token is OR'd
  const tokens = query
    .toLowerCase()
    .split(/[\s\-,;:.!?#&()/\\|]+/)
    .filter(Boolean);

  if (tokens.length === 0) return comics;

  return comics.filter((comic) =>
    tokens.some(
      (token) =>
        comic.name.toLowerCase().includes(token) ||
        comic.company.toLowerCase().includes(token) ||
        comic.description.toLowerCase().includes(token) ||
        comic.year.toString().includes(token) ||
        comic.issueNumber.toString().includes(token) ||
        comic.condition.toLowerCase().includes(token)
    )
  );
}
