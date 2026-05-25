'use client';
import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '@/store/use-editor-store';
import { fetchAyahs, fetchTranslation } from '@/lib/quran-api';
import { renderMp4 } from '@/lib/render';
import { uploadToDrive } from '@/lib/google-drive';
import WaveSurfer from 'wavesurfer.js';
import { toast } from 'sonner';
import { Download, Upload, Play } from 'lucide-react';
export function EditorShell(){
  const {project,setProject,autoSave}=useEditorStore();
  const [loading,setLoading]=useState(false); const [videoUrl,setVideoUrl]=useState('');
  const waveRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(project.ayahs[0]?.audio && waveRef.current){const ws=WaveSurfer.create({container:waveRef.current,waveColor:'#22D3EE',progressColor:'#14B8A6',url:project.ayahs[0].audio});return()=>ws.destroy();}},[project.ayahs]);
  const load=async()=>{setLoading(true);const ayahs=await fetchAyahs();const tr=await fetchTranslation();setProject({...project,ayahs,translation:tr});setLoading(false);toast.success('تم تحميل الآيات');};
  const exportVideo=async()=>{setLoading(true);try{const blob=await renderMp4(project);const url=URL.createObjectURL(blob);setVideoUrl(url);autoSave();toast.success('تم إنشاء الفيديو');}catch(e){toast.error('فشل التصدير');}setLoading(false);};
  const drive=async()=>{if(!videoUrl) return toast.error('قم بالتصدير أولاً'); const blob=await (await fetch(videoUrl)).blob(); const f=await uploadToDrive(blob,`nourverse-${Date.now()}.mp4`); toast.success(`رفع ناجح: ${f.id}`);};
  return <main className='p-4 md:p-8 space-y-4'>
    <h1 className='text-3xl font-bold text-primary'>NOURVERSE</h1>
    <section className='glass rounded-2xl p-4 space-y-3'>
      <button onClick={load} className='px-4 py-2 bg-primary text-black rounded-xl'>{loading?'...':'تحميل آيات وتجهيز التلاوة'}</button>
      <div className='text-muted'>{project.translation}</div>
      <div className='text-2xl leading-loose'>{project.ayahs.map(a=>a.text).join(' ۝ ')}</div>
      <div ref={waveRef} className='w-full h-20'/>
    </section>
    <section className='glass rounded-2xl p-4 flex flex-wrap gap-2'>
      <button onClick={exportVideo} className='px-4 py-2 rounded-xl bg-secondary text-black flex gap-2 items-center'><Play size={16}/> تصدير MP4</button>
      <a href={videoUrl} download='nourverse.mp4' className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><Download size={16}/> تنزيل</a>
      <button onClick={drive} className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><Upload size={16}/> رفع إلى Drive</button>
    </section>
    {videoUrl && <video src={videoUrl} controls className='w-full max-w-sm rounded-xl'/>}
  </main>;
}
