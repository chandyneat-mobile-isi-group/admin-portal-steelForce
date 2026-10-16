'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="w-10 h-10" />;
  }

  const cycle = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('system');
    else setTheme('light');
  };

  const isDark = resolvedTheme === 'dark';

  return (
    <button
      onClick={cycle}
      className="w-10 h-10 flex items-center justify-center rounded-xl text-muted-foreground hover:text-primary hover:bg-accent/50 transition-all duration-200"
      title={`Theme: ${theme}`}
    >
      {theme === 'system' ? (
        <Monitor size={19} strokeWidth={1.8} />
      ) : isDark ? (
        <Moon size={19} strokeWidth={1.8} />
      ) : (
        <Sun size={19} strokeWidth={1.8} />
      )}
    </button>
  );
}
