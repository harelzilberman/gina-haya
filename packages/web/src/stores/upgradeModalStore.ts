import { create } from 'zustand';

interface UpgradeModalState {
  isOpen:        boolean;
  trigger:       string | null;
  billingPeriod: 'monthly' | 'annual';
  targetTier:    string | null;   // pre-selected tier from the entry point; null = show picker
  open:  (trigger?: string, billingPeriod?: 'monthly' | 'annual', targetTier?: string | null) => void;
  close: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  isOpen:        false,
  trigger:       null,
  billingPeriod: 'monthly',
  targetTier:    null,
  open:  (trigger, billingPeriod = 'monthly', targetTier = null) =>
    set({ isOpen: true, trigger: trigger ?? null, billingPeriod, targetTier }),
  close: () => set({ isOpen: false, trigger: null, billingPeriod: 'monthly', targetTier: null }),
}));
