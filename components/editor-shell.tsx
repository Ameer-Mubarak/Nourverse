'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Download, Upload, Play, Save, FolderOpen, ListVideo, FileJson, GripVertical } from 'lucide-react';
import { fetchAyahs, fetchTranslation, RECITERS } from '@/lib/quran-api';
import { listDriveFiles, uploadToDriveResumable } from '@/lib/google-drive';
import { renderMp4 } from '@/lib/render';
import { useEditorStore } from '@/store/use-editor-store';

export function EditorShell() {
  const { project, drafts, patchProject, autoSave, loadSaved, loadDrafts, setProject, exportProject, importProject } = useEditorStore();
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<any[]>([]);
  const waveRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadSaved(); loadDrafts(); }, [loadSaved, loadDrafts]);
  useEffect(() => { autoSave(); }, [project, autoSave]);

  useEffect(() => {
    if (!project.ayahs[0]?.audio || !waveRef.current) return;
    const ws = WaveSurfer.create({ container: waveRef.current, waveColor: '#22D3EE', progressColor: '#14B8A6', url: project.ayahs[0].audio, height: 70 });
    return () => ws.destroy();
  }, [project.ayahs]);

  const subtitleClass = useMemo(() => project.subtitlePreset === 'glow' ? 'text-white drop-shadow-[0_0_12px_#22D3EE]' : project.subtitlePreset === 'karaoke' ? 'text-primary animate-pulse' : 'text-white', [project.subtitlePreset]);

  const timeline = project.timeline.length ? project.timeline : project.ayahs.map((a, idx) => ({ id: `${a.number}-${idx}`, ayahNumber: a.numberInSurah, start: idx * 5, end: (idx + 1) * 5, layer: 0 }));
  useEffect(() => { if (!project.timeline.length && project.ayahs.length) patchProject({ timeline }); }, [project.ayahs.length]);


  const loadQuran = async () => {
    try {
      if (project.ayahFrom > project.ayahTo) {
        toast.error('نطاق الآيات غير صحيح');
        return;
      }
      const ayahs = await fetchAyahs(project.surah, project.ayahFrom, project.ayahTo, project.reciter);
      const translation = await fetchTranslation(project.surah, project.ayahFrom, project.ayahTo);
      patchProject({ ayahs, translation, trimEnd: Math.max(20, ayahs.length * 5) });
      toast.success('تم جلب التلاوة والآيات بنجاح');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'تعذر جلب بيانات القرآن'); }
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
      <div className={subtitleClass + ' text-2xl leading-loose'}>{project.ayahs.map(a => a.text).join(' ۝ ') || 'النص العربي سيظهر هنا'}</div>
      <p className='text-muted'>{project.translation || 'الترجمة الإنجليزية ستظهر هنا'}</p>
      <div ref={waveRef} className='w-full' />
    </section>

    <section className='glass rounded-2xl p-4'>
      <h2 className='mb-3 text-lg'>الخط الزمني</h2>
      <input type='range' min={0} max={120} value={project.trimStart} onChange={(e) => patchProject({ trimStart: Number(e.target.value) })} className='w-full' />
      <input type='range' min={1} max={180} value={project.trimEnd} onChange={(e) => patchProject({ trimEnd: Number(e.target.value) })} className='w-full' />
      <div className='text-sm text-muted'>البداية: {project.trimStart}s | النهاية: {project.trimEnd}s</div>
      <div className='space-y-2 mt-3'>
        {timeline.map((clip, i) => <div key={clip.id} className='bg-slate-900 rounded p-2 flex items-center justify-between'>
          <div className='flex items-center gap-2 text-sm'><GripVertical size={14}/> آية {clip.ayahNumber} ({clip.start}s → {clip.end}s)</div>
          <div className='flex gap-2'>
            <button onClick={() => { if(i===0) return; const t=[...timeline]; [t[i-1],t[i]]=[t[i],t[i-1]]; patchProject({timeline:t}); }} className='text-xs px-2 py-1 bg-white/10 rounded'>↑</button>
            <button onClick={() => { if(i===timeline.length-1) return; const t=[...timeline]; [t[i+1],t[i]]=[t[i],t[i+1]]; patchProject({timeline:t}); }} className='text-xs px-2 py-1 bg-white/10 rounded'>↓</button>
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
