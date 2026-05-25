import { Ayah, Reciter } from './types';
import { z } from 'zod';
import { alquranResponseSchema, ayahSchema, translationAyahSchema } from './schemas';

const BASE = 'https://api.alquran.cloud/v1';

export const RECITERS: Reciter[] = [
  { id: 'ar.alafasy', name: 'مشاري العفاسي' },
  { id: 'ar.abdurrahmaansudais', name: 'عبد الرحمن السديس' },
  { id: 'ar.husary', name: 'الحصري' },
  { id: 'ar.minshawi', name: 'المنشاوي' },
];

function validateRange(from: number, to: number) {
  if (from < 1 || to < 1 || from > to) {
    throw new Error('Invalid ayah range');
  }
}

export async function fetchAyahs(surah: number, from: number, to: number, reciter: string): Promise<Ayah[]> {
  validateRange(from, to);
  const raw = await fetch(`${BASE}/surah/${surah}/${reciter}`, { cache: 'no-store' }).then((r) => r.json());
  const parsed = alquranResponseSchema(z.any()).parse(raw);
  const normalized = parsed.data.ayahs
    .slice(from - 1, to)
    .map((a: any) => ({ number: a.number, text: a.text, audio: a.audio, surah: a.surah, numberInSurah: a.numberInSurah }));
  return z.array(ayahSchema).parse(normalized);
}

export async function fetchTranslation(surah: number, from: number, to: number): Promise<string> {
  validateRange(from, to);
  const raw = await fetch(`${BASE}/surah/${surah}/en.asad`, { cache: 'no-store' }).then((r) => r.json());
  const parsed = alquranResponseSchema(translationAyahSchema).parse(raw);
  return parsed.data.ayahs
    .slice(from - 1, to)
    .map((a) => a.text)
    .join(' ');
}
