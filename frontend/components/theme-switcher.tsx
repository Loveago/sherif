'use client';

import { useThemeStore, type ColorTheme } from '@/store/theme-store';

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useThemeStore();

  const themes: { value: ColorTheme; label: string; color: string }[] = [
    { value: 'violet', label: 'Violet', color: 'from-violet-500 to-purple-600' },
    { value: 'ocean', label: 'Ocean', color: 'from-blue-500 to-cyan-500' },
    { value: 'sunset', label: 'Sunset', color: 'from-orange-500 to-pink-500' },
    { value: 'forest', label: 'Forest', color: 'from-green-500 to-emerald-600' },
    { value: 'candy', label: 'Candy', color: 'from-pink-500 to-rose-500' },
    { value: 'cyberpunk', label: 'Cyberpunk', color: 'from-fuchsia-500 to-cyan-500' },
    { value: 'aurora', label: 'Aurora', color: 'from-green-400 to-blue-500' },
    { value: 'gold', label: 'Gold', color: 'from-yellow-500 to-orange-500' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setColorTheme(t.value)}
          className={`relative h-10 w-10 rounded-full transition-all ${
            colorTheme === t.value ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950' : ''
          }`}
          style={{
            background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))`,
          }}
          title={t.label}
        >
          {colorTheme === t.value && (
            <div className="absolute inset-0 flex items-center justify-center rounded-full">
              <div className="h-2 w-2 rounded-full bg-white" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}
