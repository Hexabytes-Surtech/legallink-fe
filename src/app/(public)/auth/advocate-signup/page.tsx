'use client';

import { SignupCard } from '@/components/features/signup-card';

// Advocate entry point ("For Advocates" in the nav). Renders the unified signup
// card with the Citizen | Advocate toggle preset to Advocate — so the role is
// still explicit and switchable, never silently assumed.
export default function AdvocateSignupPage() {
  return <SignupCard initialRole="advocate" />;
}
