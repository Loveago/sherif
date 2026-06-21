'use client';

import { useState, useMemo } from 'react';
import { Palette } from 'lucide-react';
import { useThemeStore, type ColorTheme } from '@/store/theme-store';

export function ThemeSwitcher() {
  const { colorTheme, setColorTheme } = useThemeStore();
  const [open, setOpen] = useState(false);

  const themes: { value: ColorTheme; label: string; gradient: string }[] = useMemo(
    () => [
      { value: 'violet', label: 'Violet', gradient: 'from-violet-500 to-purple-600' },
      { value: 'ocean', label: 'Ocean', gradient: 'from-sky-500 to-cyan-400' },
      { value: 'sunset', label: 'Sunset', gradient: 'from-orange-500 to-pink-500' },
      { value: 'forest', label: 'Forest', gradient: 'from-emerald-500 to-green-600' },
      { value: 'candy', label: 'Candy', gradient: 'from-pink-500 to-rose-500' },
      { value: 'cyberpunk', label: 'Cyberpunk', gradient: 'from-fuchsia-500 to-cyan-400' },
      { value: 'aurora', label: 'Aurora', gradient: 'from-green-400 to-blue-500' },
      { value: 'gold', label: 'Gold', gradient: 'from-amber-400 to-orange-500' },
    ],
    [],
  );

  const currentTheme = useMemo(
    () => themes.find((t) => t.value === colorTheme) ?? themes[0],
    [colorTheme, themes],
  );

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-900 text-gray-200 shadow-sm hover:border-gray-500 hover:text-white transition-colors"
        aria-label="Change theme"
      >
        <div className="relative flex h-6 w-6 items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full bg-gradient-to-br ${currentTheme.gradient} opacity-80`}
          />
          <Palette className="relative h-4 w-4 text-white" />
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-64 rounded-2xl border border-gray-800 bg-[#020617] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-[11px] font-medium text-gray-400">
            <span>Themes</span>
            <span className="text-gray-500">Pick your vibe</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => {
                  setColorTheme(t.value);
                  setOpen(false);
                }}
                className={`group flex flex-col items-center gap-1 rounded-xl p-1.5 transition-colors ${
                  colorTheme === t.value ? 'bg-white/5 ring-1 ring-[var(--color-primary)]' : 'hover:bg-white/5'
                }`}
              >
                <div
                  className={`h-7 w-7 rounded-full bg-gradient-to-br ${t.gradient} shadow-sm group-hover:scale-105 transition-transform`}
                />
                <span className="text-[10px] text-gray-400 group-hover:text-gray-200">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
