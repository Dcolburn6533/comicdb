export interface Comic {
  id: string;
  name: string;
  company: string;
  issueNumber: number;
  year: number;
  condition: string;
  description: string;
  imageUrl: string;
  cbdbUrl?: string;
  createdAt: string;
  hidden?: boolean;
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
    id: Date.now().toString(),
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

  const lowerQuery = query.toLowerCase();
  return comics.filter(
    (comic) =>
      comic.name.toLowerCase().includes(lowerQuery) ||
      comic.company.toLowerCase().includes(lowerQuery) ||
      comic.description.toLowerCase().includes(lowerQuery) ||
      comic.year.toString().includes(lowerQuery) ||
      comic.issueNumber.toString().includes(lowerQuery) ||
      comic.condition.toLowerCase().includes(lowerQuery)
  );
}
