import { create } from 'zustand';
import { Project } from '@/lib/types';
import { getProject, listProjects, saveProject } from '@/lib/db';

const initialProject: Project = {
  id: 'default',
  title: 'مشروع جديد',
  surah: 36,
  ayahFrom: 1,
  ayahTo: 5,
  reciter: 'ar.alafasy',
  ayahs: [],
  translation: '',
  subtitlePreset: 'glow',
  subtitleWords: [],
  backgroundType: 'gradient',
  overlayOpacity: 0.35,
  blur: 0,
  zoom: 1,
  timeline: [],
  trimStart: 0,
  trimEnd: 0,
  bitrate: '8M',
  lowMemoryMode: false,
  updatedAt: Date.now(),
};

type S = {
  project: Project;
  drafts: Project[];
  setProject: (project: Project) => void;
  patchProject: (patch: Partial<Project>) => void;
  autoSave: () => Promise<void>;
  loadSaved: () => Promise<void>;
  loadDrafts: () => Promise<void>;
};

export const useEditorStore = create<S>((set, get) => ({
  project: initialProject,
  drafts: [],
  setProject: (project) => set({ project: { ...project, updatedAt: Date.now() } }),
  patchProject: (patch) => set({ project: { ...get().project, ...patch, updatedAt: Date.now() } }),
  autoSave: async () => {
    const project = get().project;
    await saveProject(project);
    localStorage.setItem('nourverse-last', JSON.stringify(project));
  },
  loadSaved: async () => {
    const fromLocal = localStorage.getItem('nourverse-last');
    if (fromLocal) {
      set({ project: JSON.parse(fromLocal) as Project });
      return;
    }
    const dbProject = await getProject('default');
    if (dbProject) set({ project: dbProject });
  },
  loadDrafts: async () => {
    const drafts = await listProjects();
    set({ drafts: drafts.sort((a, b) => b.updatedAt - a.updatedAt) });
  },
}));
