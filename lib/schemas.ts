import { z } from 'zod';

export const ayahSchema = z.object({
  number: z.number(),
  numberInSurah: z.number(),
  text: z.string(),
  audio: z.string().url(),
  surah: z.object({ name: z.string(), englishName: z.string() }),
});

export const translationAyahSchema = z.object({
  text: z.string(),
});

export const alquranResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    code: z.number(),
    status: z.string(),
    data: z.object({
      ayahs: z.array(itemSchema),
    }),
  });

export const driveFileSchema = z.object({
  id: z.string(),
  name: z.string(),
  webViewLink: z.string().optional(),
  webContentLink: z.string().optional(),
});

export const driveListResponseSchema = z.object({
  files: z.array(driveFileSchema),
});

export const projectSchema = z.object({
  id: z.string(),
  title: z.string(),
  surah: z.number().min(1).max(114),
  ayahFrom: z.number().min(1),
  ayahTo: z.number().min(1),
  reciter: z.string(),
  ayahs: z.array(ayahSchema),
  translation: z.string(),
  subtitlePreset: z.enum(['glow', 'classic', 'karaoke']),
  subtitleWords: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
  backgroundUrl: z.string().optional(),
  backgroundType: z.enum(['image', 'video', 'gradient']),
  overlayOpacity: z.number().min(0).max(1),
  blur: z.number().min(0).max(24),
  zoom: z.number().min(1).max(2),
  timeline: z.array(z.object({ id: z.string(), ayahNumber: z.number(), start: z.number(), end: z.number(), layer: z.number() })),
  trimStart: z.number().min(0),
  trimEnd: z.number().min(1),
  bitrate: z.enum(['4M', '8M', '12M']),
  lowMemoryMode: z.boolean(),
  lastRenderedUrl: z.string().optional(),
  updatedAt: z.number(),
}).refine((value) => value.ayahFrom <= value.ayahTo, {
  message: 'ayahFrom must be less than or equal to ayahTo',
  path: ['ayahFrom'],
});

export type ProjectInput = z.infer<typeof projectSchema>;
