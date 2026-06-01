'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

export function Toaster(props: ToasterProps) {
  const { theme = 'dark' } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      position="top-center"
      richColors
      toastOptions={{
        classNames: {
          toast:
            'group toast glass-strong !rounded-xl !border-border !text-foreground !shadow-lift',
          description: '!text-muted-foreground',
          actionButton: '!bg-primary !text-primary-foreground',
          cancelButton: '!bg-muted !text-muted-foreground',
        },
      }}
      {...props}
    />
  );
}
