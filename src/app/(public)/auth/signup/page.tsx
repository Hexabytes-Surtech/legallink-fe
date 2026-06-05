'use client';

import * as React from 'react';
import { useSearchParams } from 'next/navigation';
import { SignupCard } from '@/components/features/signup-card';

function SignupInner() {
  const searchParams = useSearchParams();
  // After signup we default to the user's own dashboard. We only RESUME a specific
  // matter (returnTo=/matter/…) so new users finishing the anonymous-intake funnel land
  // back on their matter; other targets drop to the dashboard.
  const raw = searchParams.get('returnTo');
  const returnTo = raw && raw.startsWith('/matter/') ? raw : undefined;
  // Allow ?role=advocate to deep-link into the advocate lane with the toggle preset.
  const initialRole = searchParams.get('role') === 'advocate' ? 'advocate' : 'citizen';

  return <SignupCard initialRole={initialRole} returnTo={returnTo} />;
}

export default function SignupPage() {
  return (
    <React.Suspense fallback={<SignupCard />}>
      <SignupInner />
    </React.Suspense>
  );
}
