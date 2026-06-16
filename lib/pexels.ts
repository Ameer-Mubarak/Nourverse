const PEXELS_KEY = process.env.NEXT_PUBLIC_PEXELS_API_KEY;
const BASE = 'https://api.pexels.com';

export type PexelsPhoto = { id: number; src: { large2x: string; portrait: string }; photographer: string };
export type PexelsVideo = { id: number; image: string; video_files: { link: string; width: number; height: number }[]; user: { name: string } };

async function pexelsFetch(path: string) {
  if (!PEXELS_KEY) throw new Error('Pexels API key missing. Set NEXT_PUBLIC_PEXELS_API_KEY');
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: PEXELS_KEY },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Failed to fetch from Pexels');
  return res.json();
}

export async function searchPexelsPhotos(query: string): Promise<PexelsPhoto[]> {
  const data = await pexelsFetch(`/v1/search?query=${encodeURIComponent(query)}&per_page=12&orientation=portrait`);
  return (data.photos || []) as PexelsPhoto[];
}

export async function searchPexelsVideos(query: string): Promise<PexelsVideo[]> {
  const data = await pexelsFetch(`/videos/search?query=${encodeURIComponent(query)}&per_page=8&orientation=portrait`);
  return (data.videos || []) as PexelsVideo[];
}

export function pickVerticalVideoLink(video: PexelsVideo): string | null {
  const sorted = [...video.video_files].sort((a, b) => (b.height * b.width) - (a.height * a.width));
  return sorted[0]?.link || null;
}
