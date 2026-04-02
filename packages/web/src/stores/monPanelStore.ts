import { create } from 'zustand';

interface MonPanelState {
  isOpen: boolean;
  initialMessage: string;
  open: (initialMessage?: string) => void;
  close: () => void;
  clearInitialMessage: () => void;
}

export const useMonPanelStore = create<MonPanelState>((set) => ({
  isOpen: false,
  initialMessage: '',
  open: (initialMessage = '') => set({ isOpen: true, initialMessage }),
  close: () => set({ isOpen: false, initialMessage: '' }),
  clearInitialMessage: () => set({ initialMessage: '' }),
}));
