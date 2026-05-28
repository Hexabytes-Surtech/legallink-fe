import { Navbar } from '@/components/layout/Navbar';

export default function PublicNavLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  );
}
