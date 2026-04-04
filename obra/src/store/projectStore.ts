import { create } from "zustand"

interface ProjectStore {
  wizardStep: number
  setWizardStep: (step: number) => void
  isGenerating: boolean
  setIsGenerating: (v: boolean) => void
}

export const useProjectStore = create<ProjectStore>((set) => ({
  wizardStep: 0,
  setWizardStep: (step) => set({ wizardStep: step }),
  isGenerating: false,
  setIsGenerating: (v) => set({ isGenerating: v }),
}))
