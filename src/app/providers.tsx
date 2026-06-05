'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AvatarViewerProvider } from '@/contexts/AvatarViewerContext';
import { PwaInstallProvider } from '@/contexts/PwaInstallContext';
import { ThemeProvider } from '@/components/theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <LanguageProvider>
        <AuthProvider>
          <AvatarViewerProvider>
            <PwaInstallProvider>{children}</PwaInstallProvider>
          </AvatarViewerProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
