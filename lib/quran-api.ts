import { Ayah, Reciter } from './types';
import { z } from 'zod';
import { ayahSchema } from './schemas';

const BASE = 'https://api.alquran.cloud/v1';

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس' },
  { id: 'ar.husary', name: 'الحصري' },
  { id: 'ar.minshawi', name: 'المنشاوي' },
];

export async function fetchAyahs(surah: number, from: number, to: number, reciter: string): Promise<Ayah[]> {
  const data = await fetch(`${BASE}/surah/${surah}/${reciter}`, { cache: 'no-store' }).then((r) => r.json());
  const normalized = (data.data.ayahs as any[])
    .slice(from - 1, to)
    .map((a) => ({ number: a.number, text: a.text, audio: a.audio, surah: a.surah, numberInSurah: a.numberInSurah }));
  return z.array(ayahSchema).parse(normalized);
}

export async function fetchTranslation(surah: number, from: number, to: number): Promise<string> {
  const data = await fetch(`${BASE}/surah/${surah}/en.asad`, { cache: 'no-store' }).then((r) => r.json());
  return (data.data.ayahs as any[])
    .slice(from - 1, to)
    .map((a) => a.text)
    .join(' ');
}
