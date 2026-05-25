import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { Project } from './types';

export async function renderMp4(project: Project, onProgress?: (p: number) => void) {
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => onProgress?.(Math.round(progress * 100)));
  await ffmpeg.load();

  const audio = project.ayahs[0]?.audio;
  if (!audio) throw new Error('No recitation selected');

  await ffmpeg.writeFile('audio.mp3', await fetchFile(audio));

  const duration = Math.max(5, project.trimEnd > project.trimStart ? project.trimEnd - project.trimStart : 20);
  const draw = project.ayahs.map((a, i) => {
    const y = 1400 + i * 90;
    const text = a.text.replace(/:/g, '\\:').replace(/'/g, "\\'");
    return `drawtext=text='${text}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=${y}:shadowcolor=black:shadowx=3:shadowy=3`;
  }).join(',');

  const vf = `color=c=0x020817:s=1080x1920:d=${duration},${draw}`;

  await ffmpeg.exec([
    '-ss', `${project.trimStart}`,
    '-i', 'audio.mp3',
    '-f', 'lavfi', '-i', vf,
    '-shortest',
    '-map', '1:v:0',
    '-map', '0:a:0',
    '-c:v', 'libx264',
    '-b:v', project.bitrate,
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac',
    '-movflags', '+faststart',
    'out.mp4',
  ]);

  const out = (await ffmpeg.readFile('out.mp4')) as Uint8Array;
  return new Blob([new Uint8Array(out)], { type: 'video/mp4' });
}
