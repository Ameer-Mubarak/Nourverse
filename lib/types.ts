export type Ayah={number:number;text:string;audio:string;surah:{name:string;englishName:string};numberInSurah:number;};
export type Project={id:string;title:string;ayahs:Ayah[];backgroundUrl?:string;translation?:string;subtitlePreset:'glow'|'classic';};
