'use client';

import { useEffect, useState } from 'react';
import { useThemeStore } from '@/store/theme-store';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const { colorTheme } = useThemeStore();

  useEffect(() => {
    setMounted(true);
    const htmlElement = document.documentElement;

    // Remove all theme classes
    htmlElement.classList.remove(
      'theme-violet',
      'theme-ocean',
      'theme-sunset',
      'theme-forest',
      'theme-candy',
      'theme-cyberpunk',
      'theme-aurora',
      'theme-gold',
    );

    // Add current theme class
    htmlElement.classList.add(`theme-${colorTheme}`);
  }, [colorTheme]);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
