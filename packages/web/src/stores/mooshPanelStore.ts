import { create } from 'zustand';

interface MooshPanelState {
  isOpen: boolean;
  initialMessage: string;
  open: (initialMessage?: string) => void;
  close: () => void;
  clearInitialMessage: () => void;
}

export const useMooshPanelStore = create<MooshPanelState>((set) => ({
  isOpen: false,
  initialMessage: '',
  open: (initialMessage = '') => set({ isOpen: true, initialMessage }),
  close: () => set({ isOpen: false, initialMessage: '' }),
  clearInitialMessage: () => set({ initialMessage: '' }),
}));
