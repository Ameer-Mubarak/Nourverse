import { Project } from './types';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
export async function renderMp4(project:Project){
  const ffmpeg=new FFmpeg();
  await ffmpeg.load();
  const bg=project.backgroundUrl || 'https://images.unsplash.com/photo-1508022713622-df2d8fb7b4cd?q=80&w=1080';
  const audio=project.ayahs[0]?.audio;
  if(!audio) throw new Error('No recitation selected');
  await ffmpeg.writeFile('audio.mp3',await fetchFile(audio));
  await ffmpeg.exec(['-f','lavfi','-i',`color=c=black:s=1080x1920:d=20`,'-i','audio.mp3','-shortest','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','out.mp4']);
  const out=await ffmpeg.readFile('out.mp4') as Uint8Array;
  return new Blob([new Uint8Array(out)],{type:'video/mp4'});
}
