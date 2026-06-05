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

  // Until mounted, the resolved theme is unknown on the client and would not
  // match the server-rendered HTML — keep everything (label, handler, icon)
  // in a neutral state to avoid a hydration mismatch.
  const isDark = mounted && resolvedTheme === 'dark';

  return (
    <Button
      variant="ghost"
      size="icon"
      className={className}
      aria-label={!mounted ? 'Toggle theme' : isDark ? 'Switch to light theme' : 'Switch to dark theme'}
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
