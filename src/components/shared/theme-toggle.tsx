'use client';

import * as React from 'react';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Dark/light toggle. Avoids hydration mismatch by rendering after mount. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      {/* Render a neutral icon until mounted to prevent SSR mismatch */}
      {!mounted ? (
        <Sun className="size-5 opacity-0" />
      ) : isDark ? (
        <Sun className="size-5 transition-transform" />
      ) : (
        <Moon className="size-5 transition-transform" />
      )}
    </Button>
  );
}
