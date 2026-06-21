'use client';

import { useThemeStore } from '@/store/theme-store';

export function useTheme() {
  const { colorTheme, setColorTheme } = useThemeStore();

  return {
    colorTheme,
    setColorTheme,
  };
}
