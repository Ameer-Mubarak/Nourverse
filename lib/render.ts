import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { Project } from './types';

function escapeDrawtext(text: string) {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/:/g, '\\:')
    .replace(/'/g, "\\'")
    .replace(/,/g, '\\,')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]');
}

function buildSubtitleFilter(project: Project) {
  return project.ayahs
    .map((a, i) => {
      const y = 1400 + i * 90;
      const text = escapeDrawtext(a.text);
      return `drawtext=text='${text}':fontcolor=white:fontsize=52:x=(w-text_w)/2:y=${y}:shadowcolor=black:shadowx=3:shadowy=3`;
    })
    .join(',');
}

function buildBackgroundFilter(project: Project, duration: number) {
  const blurPx = Math.max(0, Math.round(project.blur));
  const zoom = Math.max(1, Math.min(2, project.zoom));

  if (project.backgroundType === 'gradient' || !project.backgroundUrl) {
    return `color=c=0x020817:s=1080x1920:d=${duration}`;
  }

  const base = 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920';
  const zoomFilter = zoom > 1 ? `,scale=iw*${zoom}:ih*${zoom},crop=1080:1920` : '';
  const blurFilter = blurPx > 0 ? `,boxblur=${blurPx}:1` : '';
  const overlay = `,drawbox=x=0:y=0:w=iw:h=ih:color=black@${project.overlayOpacity}:t=fill`;

  if (project.backgroundType === 'video') {
    return `[1:v]${base},trim=duration=${duration}${zoomFilter}${blurFilter}${overlay}[bg]`;
  }

  return `[1:v]loop=loop=-1:size=1:start=0,trim=duration=${duration},${base}${zoomFilter}${blurFilter}${overlay}[bg]`;
}

export async function renderMp4(project: Project, onProgress?: (p: number) => void) {
  const ffmpeg = new FFmpeg();
  ffmpeg.on('progress', ({ progress }) => onProgress?.(Math.round(progress * 100)));
  await ffmpeg.load();

  const audio = project.ayahs[0]?.audio;
  if (!audio) throw new Error('No recitation selected');

  await ffmpeg.writeFile('audio.mp3', await fetchFile(audio));

  const duration = Math.max(5, project.trimEnd > project.trimStart ? project.trimEnd - project.trimStart : 20);
  const subtitles = buildSubtitleFilter(project);

  const args: string[] = ['-ss', `${project.trimStart}`, '-i', 'audio.mp3'];

  if (project.backgroundUrl && project.backgroundType !== 'gradient') {
    const ext = project.backgroundType === 'video' ? 'mp4' : 'jpg';
    const bgName = `bg.${ext}`;
    await ffmpeg.writeFile(bgName, await fetchFile(project.backgroundUrl));
    args.push('-stream_loop', project.backgroundType === 'image' ? '-1' : '0', '-i', bgName);

    const bgFilter = buildBackgroundFilter(project, duration);
    const filter = `${bgFilter};[bg]${subtitles ? `,${subtitles}` : ''}[v]`;

    args.push(
      '-filter_complex',
      filter,
      '-map', '1:v:0',
      '-map', '0:a:0',
      '-t', `${duration}`,
      '-c:v', 'libx264',
      '-b:v', project.bitrate,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      'out.mp4',
    );
  } else {
    const vf = `color=c=0x020817:s=1080x1920:d=${duration}${subtitles ? `,${subtitles}` : ''}`;
    args.push(
      '-f', 'lavfi',
      '-i', vf,
      '-shortest',
      '-map', '1:v:0',
      '-map', '0:a:0',
      '-c:v', 'libx264',
      '-b:v', project.bitrate,
      '-pix_fmt', 'yuv420p',
      '-c:a', 'aac',
      '-movflags', '+faststart',
      'out.mp4',
    );
  }

  await ffmpeg.exec(args);

  const out = (await ffmpeg.readFile('out.mp4')) as Uint8Array;
  return new Blob([new Uint8Array(out)], { type: 'video/mp4' });
}
