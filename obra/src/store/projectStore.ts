import { create } from 'zustand';
import type { ProjectStatus } from '../components/dashboard/ProjectCard';

export type ProductType = 'ebook' | 'guide' | 'manual';
export type ProjectLanguage = 'es' | 'pt';
export type ProjectTone = 'professional' | 'friendly' | 'inspiring';
export type ContentMode = 'ai' | 'paste' | 'upload';

interface WizardData {
  topic: string;
  avatar: string;
  problem: string;
  productType: ProductType;
  chaptersCount: 5 | 7 | 10 | 12;
  contentMode: ContentMode | null;
  language: ProjectLanguage;
  tone: ProjectTone;
}

interface ProjectStore {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  projectId: string | null;
  status: ProjectStatus;
  wizard: WizardData;
  setStep: (step: 1 | 2 | 3 | 4 | 5 | 6) => void;
  nextStep: () => void;
  previousStep: () => void;
  setProjectContext: (projectId: string | null, status?: ProjectStatus) => void;
  updateWizard: (patch: Partial<WizardData>) => void;
  resetWizard: () => void;
}

const initialWizardData: WizardData = {
  topic: '',
  avatar: '',
  problem: '',
  productType: 'ebook',
  chaptersCount: 5,
  contentMode: null,
  language: 'es',
  tone: 'professional',
};

export const useProjectStore = create<ProjectStore>((set) => ({
  step: 1,
  projectId: null,
  status: 'draft',
  wizard: initialWizardData,
  setStep: (step) => set({ step }),
  nextStep: () => set((state) => ({ step: Math.min(6, state.step + 1) as 1 | 2 | 3 | 4 | 5 | 6 })),
  previousStep: () => set((state) => ({ step: Math.max(1, state.step - 1) as 1 | 2 | 3 | 4 | 5 | 6 })),
  setProjectContext: (projectId, status = 'draft') => set({ projectId, status }),
  updateWizard: (patch) => set((state) => ({ wizard: { ...state.wizard, ...patch } })),
  resetWizard: () =>
    set({
      step: 1,
      projectId: null,
      status: 'draft',
      wizard: initialWizardData,
    }),
}));
