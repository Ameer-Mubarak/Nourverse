export type Reciter = { id: string; name: string };

export type Ayah = {
  number: number;
  numberInSurah: number;
  text: string;
  audio: string;
  surah: { name: string; englishName: string };
};

export type SubtitleWord = { text: string; start: number; end: number };

export type TimelineClip = {
  id: string;
  ayahNumber: number;
  start: number;
  end: number;
  layer: number;
};

export type Project = {
  id: string;
  title: string;
  surah: number;
  ayahFrom: number;
  ayahTo: number;
  reciter: string;
  ayahs: Ayah[];
  translation: string;
  subtitlePreset: 'glow' | 'classic' | 'karaoke';
  subtitleWords: SubtitleWord[];
  backgroundUrl?: string;
  backgroundType: 'image' | 'video' | 'gradient';
  overlayOpacity: number;
  blur: number;
  zoom: number;
  timeline: TimelineClip[];
  trimStart: number;
  trimEnd: number;
  bitrate: '4M' | '8M' | '12M';
  lowMemoryMode: boolean;
  lastRenderedUrl?: string;
  updatedAt: number;
};
