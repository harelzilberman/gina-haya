import { create } from 'zustand';

interface UpgradeModalState {
  isOpen: boolean;
  trigger: string | null;
  open: (trigger?: string) => void;
  close: () => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  isOpen: false,
  trigger: null,
  open: (trigger) => set({ isOpen: true, trigger: trigger ?? null }),
  close: () => set({ isOpen: false, trigger: null }),
}));
