import Link from 'next/link';
import { Home, Search } from 'lucide-react';
import { AuroraBackground } from '@/components/aceternity/aurora-background';
import { Logo } from '@/components/shared/logo';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <AuroraBackground className="min-h-screen">
      <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <Logo href="/" />
        <p className="mt-10 font-display text-7xl font-semibold text-gradient-gold sm:text-8xl">404</p>
        <h1 className="mt-4 font-display text-2xl font-semibold">Page not found</h1>
        <p className="mt-2 max-w-sm text-muted-foreground">
          The page you’re looking for doesn’t exist or may have moved.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild><Link href="/"><Home className="size-4" /> Back to home</Link></Button>
          <Button asChild variant="outline"><Link href="/advocates"><Search className="size-4" /> Find advocates</Link></Button>
        </div>
      </div>
    </AuroraBackground>
  );
}
