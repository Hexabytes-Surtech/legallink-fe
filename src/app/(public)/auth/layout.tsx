import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { Logo } from '@/components/shared/logo';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { LanguageToggle } from '@/components/shared/language-toggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuroraBackground className="min-h-screen">
      <div className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-4 py-5 sm:px-6">
          <Logo markSize="size-12" textClassName="text-2xl" />
          <div className="flex items-center gap-2">
            <LanguageToggle className="hidden sm:inline-flex" />
            <ThemeToggle />
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">
            {children}
          </div>
        </main>

        <footer className="px-4 py-6 text-center">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> Back to home
          </Link>
        </footer>
      </div>
    </AuroraBackground>
  );
}
