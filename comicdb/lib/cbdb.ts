import { Comic } from '@/lib/comics';

const CBDB_SEARCH_ENDPOINT = 'https://cbdb.com/search_results.lasso';

function cleanComicTitle(name: string): string {
  return name.replace(/#\s*\d+.*/g, '').trim();
}

export function getCbdbUrl(comic: Comic): string {
  if (comic.cbdbUrl && comic.cbdbUrl.trim().length > 0) {
    return comic.cbdbUrl.trim();
  }

  const params = new URLSearchParams({
    book_title_op: 'begins with',
    book_title: cleanComicTitle(comic.name),
    issue_number_op: 'equals',
    issue_number: String(comic.issueNumber),
  });

  return `${CBDB_SEARCH_ENDPOINT}?${params.toString()}`;
}
