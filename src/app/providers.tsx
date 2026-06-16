'use client';

import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { AvatarViewerProvider } from '@/contexts/AvatarViewerContext';
import { PwaInstallProvider } from '@/contexts/PwaInstallContext';
import { CallProvider } from '@/contexts/CallContext';
import { RealtimeProvider } from '@/contexts/RealtimeContext';
import { ThemeProvider } from '@/components/theme-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <LanguageProvider>
        <AuthProvider>
          {/* One shared /notify connection feeding live refetches + sidebar badges. */}
          <RealtimeProvider>
            <AvatarViewerProvider>
              <PwaInstallProvider>
                <CallProvider>{children}</CallProvider>
              </PwaInstallProvider>
            </AvatarViewerProvider>
          </RealtimeProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
