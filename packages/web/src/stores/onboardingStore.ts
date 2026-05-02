import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SoilType } from '@gina-haya/shared';

type Step = 0 | 1 | 2 | 3;

export interface OnboardingGardenData {
  name: string;
  locationRegion: string;
  soilType: SoilType | null;
  plantIds: string[];
}

interface OnboardingState {
  step: Step;
  gardenData: OnboardingGardenData;
  isComplete: boolean;
  showWelcomeScreen: boolean;
  nextStep: () => void;
  prevStep: () => void;
  updateGardenData: (data: Partial<OnboardingGardenData>) => void;
  complete: () => void;
  setShowWelcomeScreen: (v: boolean) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      step: 0,
      gardenData: {
        name: 'הגינה שלי',
        locationRegion: '',
        soilType: null,
        plantIds: [],
      },
      isComplete: false,
      showWelcomeScreen: false,

      nextStep: () =>
        set((s) => ({ step: (Math.min(s.step + 1, 3) as Step) })),

      prevStep: () =>
        set((s) => ({ step: (Math.max(s.step - 1, 0) as Step) })),

      updateGardenData: (data) =>
        set((s) => ({ gardenData: { ...s.gardenData, ...data } })),

      complete: () => set({ isComplete: true }),

      setShowWelcomeScreen: (v) => set({ showWelcomeScreen: v }),
    }),
    {
      name: 'gina-haya-onboarding',
      partialize: (state) => ({
        step: state.step,
        gardenData: state.gardenData,
        isComplete: state.isComplete,
      }),
    }
  )
);
