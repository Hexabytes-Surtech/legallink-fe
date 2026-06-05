import { Navbar } from '@/components/shared/navbar';

/** Standalone settings page (no console sidebar) keeps the global top navbar. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <Navbar />
      {children}
    </div>
  );
}
