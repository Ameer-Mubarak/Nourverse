'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Download, Upload, Play, Save, FolderOpen, ListVideo, FileJson, GripVertical, Pause } from 'lucide-react';
import { fetchAyahs, fetchTranslation, RECITERS } from '@/lib/quran-api';
import { listDriveFiles, uploadToDriveResumable } from '@/lib/google-drive';
import { renderMp4 } from '@/lib/render';
import { useEditorStore } from '@/store/use-editor-store';
import { pickVerticalVideoLink, searchPexelsPhotos, searchPexelsVideos } from '@/lib/pexels';

export function EditorShell() {
  const { project, drafts, patchProject, autoSave, loadSaved, loadDrafts, setProject, exportProject, importProject } = useEditorStore();
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<any[]>([]);
  const [pexelsQuery, setPexelsQuery] = useState('islamic night city');
  const [pexelsPhotos, setPexelsPhotos] = useState<any[]>([]);
  const [pexelsVideos, setPexelsVideos] = useState<any[]>([]);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const waveRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => { loadSaved(); loadDrafts(); }, [loadSaved, loadDrafts]);
  useEffect(() => { autoSave(); }, [project, autoSave]);

  useEffect(() => {
    if (!project.ayahs[0]?.audio || !waveRef.current) return;
    const ws = WaveSurfer.create({ container: waveRef.current, waveColor: '#22D3EE', progressColor: '#14B8A6', url: project.ayahs[0].audio, height: 70 });
    return () => ws.destroy();
  }, [project.ayahs]);

  useEffect(() => {
    if (!project.ayahs[0]?.audio) return;
    const audio = new Audio(project.ayahs[0].audio);
    audioRef.current = audio;
    const update = () => setPlayhead(audio.currentTime);
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener('timeupdate', update);
    audio.addEventListener('ended', onEnd);

    return () => {
      audio.pause();
      audio.removeEventListener('timeupdate', update);
      audio.removeEventListener('ended', onEnd);
      audioRef.current = null;
      setIsPlaying(false);
      setPlayhead(0);
    };
  }, [project.ayahs]);

  const timeline = project.timeline.length
    ? project.timeline
    : project.ayahs.map((a, idx) => ({ id: `${a.number}-${idx}`, ayahNumber: a.numberInSurah, start: idx * 5, end: (idx + 1) * 5, layer: 0 }));

  useEffect(() => {
    if (!project.timeline.length && project.ayahs.length) patchProject({ timeline });
  }, [project.ayahs.length]);

  const subtitleClass = useMemo(() => {
    if (project.subtitlePreset === 'glow') return 'text-white drop-shadow-[0_0_12px_#22D3EE]';
    if (project.subtitlePreset === 'karaoke') return 'text-slate-100';
    return 'text-white';
  }, [project.subtitlePreset]);

  const activeWordIndex = useMemo(() => {
    if (!project.subtitleWords.length) return -1;
    return project.subtitleWords.findIndex((word) => playhead >= word.start && playhead <= word.end);
  }, [project.subtitleWords, playhead]);

  const loadQuran = async () => {
    try {
      if (project.ayahFrom > project.ayahTo) {
        toast.error('نطاق الآيات غير صحيح');
        return;
      }
      const ayahs = await fetchAyahs(project.surah, project.ayahFrom, project.ayahTo, project.reciter);
      const translation = await fetchTranslation(project.surah, project.ayahFrom, project.ayahTo);
      const duration = Math.max(20, ayahs.length * 5);
      const allWords = ayahs.flatMap((a) => a.text.split(/\s+/).filter(Boolean));
      const step = allWords.length ? duration / allWords.length : 0;
      const subtitleWords = allWords.map((text, i) => ({ text, start: i * step, end: (i + 1) * step }));

      patchProject({ ayahs, translation, subtitleWords, trimEnd: duration });
      toast.success('تم جلب التلاوة والآيات بنجاح');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر جلب بيانات القرآن'); }
  };

  const toggleAudio = async () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }
    audioRef.current.currentTime = playhead;
    await audioRef.current.play();
    setIsPlaying(true);
  };

  const updateClip = (id: string, field: 'start' | 'end' | 'layer', value: number) => {
    const updated = timeline.map((clip) => clip.id === id ? { ...clip, [field]: value } : clip)
      .map((clip) => clip.end <= clip.start ? { ...clip, end: clip.start + 0.5 } : clip);
    patchProject({ timeline: updated });
  };


  const loadPexels = async () => {
    try {
      const [photos, videos] = await Promise.all([
        searchPexelsPhotos(pexelsQuery),
        searchPexelsVideos(pexelsQuery),
      ]);
      setPexelsPhotos(photos);
      setPexelsVideos(videos);
      toast.success('تم تحميل خلفيات Pexels');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذر تحميل Pexels');
    }
  };

  const onRender = async () => {
    try {
      setRendering(true);
      setProgress(0);
      let blob: Blob;
      if (project.lowMemoryMode && typeof Worker !== 'undefined') {
        blob = await new Promise<Blob>((resolve, reject) => {
          const worker = new Worker(new URL('../workers/render-worker.ts', import.meta.url));
          worker.onmessage = (event: MessageEvent) => {
            const data = event.data;
            if (data.type === 'progress') setProgress(data.progress);
            if (data.type === 'done') {
              worker.terminate();
              resolve(data.blob as Blob);
            }
            if (data.type === 'error') {
              worker.terminate();
              reject(new Error(data.message));
            }
          };
          worker.postMessage({ project });
        });
      } else {
        blob = await renderMp4(project, setProgress);
      }

      const url = URL.createObjectURL(blob);
      patchProject({ lastRenderedUrl: url });
      toast.success('اكتمل تصدير الفيديو');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'فشل التصدير'); }
    finally { setRendering(false); }
  };

  const onDriveUpload = async () => {
    if (!project.lastRenderedUrl) return toast.error('قم بالتصدير أولاً');
    setUploadProgress(0);
    const blob = await (await fetch(project.lastRenderedUrl)).blob();
    const result = await uploadToDriveResumable(blob, `nourverse-${Date.now()}.mp4`, setUploadProgress);
    toast.success(`تم الرفع: ${result.id}`);
  };

  return <main className='p-4 md:p-8 space-y-4 max-w-7xl mx-auto'>
    <div className='flex items-center justify-between'><h1 className='text-3xl font-bold text-primary'>NOURVERSE</h1><span className='text-muted text-sm'>جاهز بدون تسجيل دخول</span></div>

    <section className='glass rounded-2xl p-4 grid md:grid-cols-4 gap-3'>
      <input type='number' value={project.surah} onChange={(e) => patchProject({ surah: Number(e.target.value) })} className='bg-slate-900 rounded p-2' placeholder='السورة' />
      <input type='number' value={project.ayahFrom} onChange={(e) => patchProject({ ayahFrom: Number(e.target.value) })} className='bg-slate-900 rounded p-2' placeholder='من آية' />
      <input type='number' value={project.ayahTo} onChange={(e) => patchProject({ ayahTo: Number(e.target.value) })} className='bg-slate-900 rounded p-2' placeholder='إلى آية' />
      <select value={project.reciter} onChange={(e) => patchProject({ reciter: e.target.value })} className='bg-slate-900 rounded p-2'>{RECITERS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
      <button onClick={loadQuran} className='px-4 py-2 bg-primary text-black rounded-xl md:col-span-4'>تحميل المحتوى</button>
    </section>

    <section className='glass rounded-2xl p-4 space-y-2'>
      <div className='flex items-center justify-between gap-3'>
        <button onClick={toggleAudio} className='px-3 py-2 bg-white/10 rounded-lg flex items-center gap-2'>{isPlaying ? <Pause size={15} /> : <Play size={15} />} معاينة التلاوة</button>
        <input type='range' min={0} max={Math.max(project.trimEnd, 1)} step={0.1} value={playhead} onChange={(e) => {
          const t = Number(e.target.value);
          setPlayhead(t);
          if (audioRef.current) audioRef.current.currentTime = t;
        }} className='w-full' />
      </div>

      {project.subtitlePreset === 'karaoke' ? (
        <div className='text-2xl leading-loose'>
          {project.subtitleWords.length ? project.subtitleWords.map((word, idx) => (
            <span key={`${word.text}-${idx}`} className={idx === activeWordIndex ? 'text-primary drop-shadow-[0_0_12px_#22D3EE] transition-all' : 'text-slate-300'}>{word.text} </span>
          )) : 'النص العربي سيظهر هنا'}
        </div>
      ) : (
        <div className={subtitleClass + ' text-2xl leading-loose'}>{project.ayahs.map(a => a.text).join(' ۝ ') || 'النص العربي سيظهر هنا'}</div>
      )}

      <p className='text-muted'>{project.translation || 'الترجمة الإنجليزية ستظهر هنا'}</p>
      <div ref={waveRef} className='w-full' />
    </section>

    <section className='glass rounded-2xl p-4'>
      <h2 className='mb-3 text-lg'>الخط الزمني</h2>
      <input type='range' min={0} max={120} value={project.trimStart} onChange={(e) => patchProject({ trimStart: Number(e.target.value) })} className='w-full' />
      <input type='range' min={1} max={180} value={project.trimEnd} onChange={(e) => patchProject({ trimEnd: Number(e.target.value) })} className='w-full' />
      <div className='text-sm text-muted'>البداية: {project.trimStart}s | النهاية: {project.trimEnd}s | الرأس: {playhead.toFixed(1)}s</div>
      <div className='space-y-2 mt-3'>
        {timeline.map((clip, i) => <div key={clip.id} className='bg-slate-900 rounded p-2 space-y-2'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2 text-sm'><GripVertical size={14}/> آية {clip.ayahNumber} ({clip.start.toFixed(1)}s → {clip.end.toFixed(1)}s)</div>
            <div className='flex gap-2'>
              <button onClick={() => { if (i === 0) return; const t = [...timeline]; [t[i - 1], t[i]] = [t[i], t[i - 1]]; patchProject({ timeline: t }); }} className='text-xs px-2 py-1 bg-white/10 rounded'>↑</button>
              <button onClick={() => { if (i === timeline.length - 1) return; const t = [...timeline]; [t[i + 1], t[i]] = [t[i], t[i + 1]]; patchProject({ timeline: t }); }} className='text-xs px-2 py-1 bg-white/10 rounded'>↓</button>
            </div>
          </div>
          <div className='grid md:grid-cols-3 gap-2'>
            <label className='text-xs'>البداية
              <input type='range' min={0} max={180} step={0.1} value={clip.start} onChange={(e) => updateClip(clip.id, 'start', Number(e.target.value))} className='w-full' />
            </label>
            <label className='text-xs'>النهاية
              <input type='range' min={0.5} max={180} step={0.1} value={clip.end} onChange={(e) => updateClip(clip.id, 'end', Number(e.target.value))} className='w-full' />
            </label>
            <label className='text-xs'>الطبقة
              <input type='number' value={clip.layer} onChange={(e) => updateClip(clip.id, 'layer', Number(e.target.value) || 0)} className='w-full bg-slate-800 rounded p-1 mt-1' />
            </label>
          </div>
        </div>)}
      </div>
    </section>

    <section className='glass rounded-2xl p-4 grid md:grid-cols-4 gap-3'>
      <select value={project.subtitlePreset} onChange={(e) => patchProject({ subtitlePreset: e.target.value as any })} className='bg-slate-900 rounded p-2'><option value='glow'>Glow</option><option value='classic'>Classic</option><option value='karaoke'>Karaoke</option></select>
      <select value={project.bitrate} onChange={(e) => patchProject({ bitrate: e.target.value as any })} className='bg-slate-900 rounded p-2'><option value='4M'>4 Mbps</option><option value='8M'>8 Mbps</option><option value='12M'>12 Mbps</option></select>
      <label className='flex items-center gap-2'><input type='checkbox' checked={project.lowMemoryMode} onChange={(e)=>patchProject({lowMemoryMode:e.target.checked})} /> Low memory mode</label>
      <input type='file' accept='image/*,video/*' onChange={(e)=>{const f=e.target.files?.[0]; if(!f) return; patchProject({backgroundUrl:URL.createObjectURL(f),backgroundType:f.type.startsWith('video')?'video':'image'});}} className='bg-slate-900 rounded p-2' />
      <input type='range' min={0} max={1} step={0.05} value={project.overlayOpacity} onChange={(e)=>patchProject({overlayOpacity:Number(e.target.value)})} className='w-full md:col-span-2'/>
      <input type='range' min={0} max={24} step={1} value={project.blur} onChange={(e)=>patchProject({blur:Number(e.target.value)})} className='w-full md:col-span-1'/>
      <input type='range' min={1} max={2} step={0.05} value={project.zoom} onChange={(e)=>patchProject({zoom:Number(e.target.value)})} className='w-full md:col-span-1'/>
    </section>


    <section className='glass rounded-2xl p-4 space-y-3'>
      <h2 className='text-lg'>Pexels الخلفيات (صور + فيديو Drone)</h2>
      <div className='flex gap-2'>
        <input value={pexelsQuery} onChange={(e)=>setPexelsQuery(e.target.value)} className='flex-1 bg-slate-900 rounded p-2' placeholder='ابحث عن خلفية مثل: mosque drone night' />
        <button onClick={loadPexels} className='px-4 py-2 bg-primary text-black rounded-xl'>تحميل</button>
      </div>
      <div className='grid md:grid-cols-4 gap-3'>
        {pexelsPhotos.map((photo) => (
          <button key={`p-${photo.id}`} onClick={() => patchProject({ backgroundUrl: photo.src.portrait || photo.src.large2x, backgroundType: 'image' })} className='text-left'>
            <img src={photo.src.portrait || photo.src.large2x} alt='pexels' className='w-full h-40 object-cover rounded-lg' />
            <div className='text-xs text-muted mt-1'>Photo: {photo.photographer}</div>
          </button>
        ))}
        {pexelsVideos.map((video) => {
          const link = pickVerticalVideoLink(video);
          if (!link) return null;
          return (
            <button key={`v-${video.id}`} onClick={() => patchProject({ backgroundUrl: link, backgroundType: 'video' })} className='text-left'>
              <img src={video.image} alt='pexels video' className='w-full h-40 object-cover rounded-lg' />
              <div className='text-xs text-muted mt-1'>Video: {video.user?.name || 'Pexels'}</div>
            </button>
          );
        })}
      </div>
    </section>

    <section className='glass rounded-2xl p-4 flex flex-wrap gap-2 items-center'>
      <button onClick={onRender} disabled={rendering} className='px-4 py-2 rounded-xl bg-secondary text-black flex gap-2 items-center'><Play size={16} /> {rendering ? `Rendering ${progress}%` : 'تصدير MP4'}</button>
      <a href={project.lastRenderedUrl} download='nourverse.mp4' className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><Download size={16} /> تنزيل</a>
      <button onClick={onDriveUpload} className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><Upload size={16} /> رفع Drive ({uploadProgress}%)</button>
      <button onClick={() => autoSave().then(()=>toast.success('تم حفظ المسودة'))} className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><Save size={16}/> حفظ</button>
      <button onClick={async () => { const r = await listDriveFiles(); setFiles(r.files || []); }} className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><ListVideo size={16}/> ملفاتي في Drive</button>
      <button onClick={() => drafts[0] && setProject(drafts[0])} className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><FolderOpen size={16}/> استعادة آخر مسودة</button>
      <button onClick={() => { const data = exportProject(); const blob = new Blob([data], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download='nourverse-project.json'; a.click(); }} className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center'><FileJson size={16}/> تصدير JSON</button>
      <label className='px-4 py-2 rounded-xl bg-white/10 flex gap-2 items-center cursor-pointer'><FileJson size={16}/> استيراد JSON<input type='file' accept='application/json' className='hidden' onChange={async (e)=>{const f=e.target.files?.[0]; if(!f) return; const ok=importProject(await f.text()); ok?toast.success('تم استيراد المشروع'):toast.error('ملف غير صالح');}} /></label>
    </section>

    <div className='grid md:grid-cols-2 gap-3'>
      {files.map((f) => <motion.a initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={f.id} href={f.webViewLink} target='_blank' className='glass p-3 rounded-xl block'>{f.name}</motion.a>)}
      {project.lastRenderedUrl && <video src={project.lastRenderedUrl} controls className='w-full rounded-xl' />}
    </div>
  </main>;
}
