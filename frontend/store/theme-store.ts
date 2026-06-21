import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ColorTheme = 'violet' | 'ocean' | 'sunset' | 'forest' | 'candy' | 'cyberpunk' | 'aurora' | 'gold';

interface ThemeStore {
  colorTheme: ColorTheme;
  setColorTheme: (theme: ColorTheme) => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      colorTheme: 'violet',
      setColorTheme: (colorTheme: ColorTheme) => set({ colorTheme }),
    }),
    {
      name: 'theme-store',
    },
  ),
);
