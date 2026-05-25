import { create } from 'zustand';
import { Project } from '@/lib/types';
import { saveProject } from '@/lib/db';
type S={project:Project;setProject:(p:Project)=>void;autoSave:()=>Promise<void>};
export const useEditorStore=create<S>((set,get)=>({
project:{id:'default',title:'مشروع جديد',ayahs:[],subtitlePreset:'glow'},
setProject:(project)=>set({project}),
autoSave:async()=>{await saveProject(get().project);localStorage.setItem('nourverse-last',JSON.stringify(get().project));}
}));
