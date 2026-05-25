import { Ayah } from './types';
export async function fetchAyahs(surah=36,from=1,to=5,reciter='ar.alafasy'){
  const data=await fetch(`https://api.alquran.cloud/v1/surah/${surah}/${reciter}`).then(r=>r.json());
  return (data.data.ayahs as any[]).slice(from-1,to).map((a)=>({number:a.number,text:a.text,audio:a.audio,surah:a.surah,numberInSurah:a.numberInSurah})) as Ayah[];
}
export async function fetchTranslation(surah=36,from=1,to=5){
  const data=await fetch(`https://api.alquran.cloud/v1/surah/${surah}/en.asad`).then(r=>r.json());
  return (data.data.ayahs as any[]).slice(from-1,to).map(a=>a.text).join(' ');
}
