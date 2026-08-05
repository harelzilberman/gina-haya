import { create } from 'zustand';

interface UpgradeModalState {
  isOpen:        boolean;
  trigger:       string | null;
  billingPeriod: 'monthly' | 'annual';
  open:  (trigger?: string, billingPeriod?: 'monthly' | 'annual') => void;
  close: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  isOpen:        false,
  trigger:       null,
  billingPeriod: 'monthly',
  open:  (trigger, billingPeriod = 'monthly') =>
    set({ isOpen: true, trigger: trigger ?? null, billingPeriod }),
  close: () => set({ isOpen: false, trigger: null, billingPeriod: 'monthly' }),
}));
