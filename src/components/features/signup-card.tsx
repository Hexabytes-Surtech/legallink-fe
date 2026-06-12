'use client';

import * as React from 'react';
import Link from 'next/link';
import { User, Scale } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthOtpForm } from '@/components/features/auth-otp-form';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type Role = 'citizen' | 'advocate';

/**
 * Unified signup card with a segmented Citizen | Advocate toggle pinned to the
 * top. The role is an explicit, always-visible, switchable choice — so an
 * advocate can't silently register as a citizen (and vice-versa). The toggle
 * drives the OTP form's mode, the copy, and the post-signup destination.
 */
export function SignupCard({
  initialRole = 'citizen',
  returnTo,
}: {
  initialRole?: Role;
  returnTo?: string;
}) {
  const { t } = useLanguage();
  const [role, setRole] = React.useState<Role>(initialRole);
  const isAdvocate = role === 'advocate';

  const mode = isAdvocate ? 'advocate-signup' : 'signup';
  const redirectTo = isAdvocate ? '/advocate/onboarding' : returnTo;
  const loginHref = returnTo ? `/auth/login?returnTo=${encodeURIComponent(returnTo)}` : '/auth/login';

  return (
    <Card className="relative overflow-hidden glass-strong shadow-lift duration-500 animate-in fade-in zoom-in-95">
      {/* Animated gradient hairline along the top edge */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px animate-border-rotate"
        style={{ background: 'conic-gradient(from var(--ll-angle), transparent, var(--gold), var(--gold-bright), transparent)' }}
      />

      <CardHeader className="relative space-y-4 text-center">
        <RoleToggle role={role} onChange={setRole} />
        <div className="space-y-1.5">
          <CardTitle className="font-display text-2xl">
            {isAdvocate ? t('auth.advocate.title') : t('auth.signup.title')}
          </CardTitle>
          <CardDescription>
            {isAdvocate ? t('auth.advocate.subtitle') : t('auth.signup.subtitle')}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-5">
        {/* key={mode}: switching role resets the flow back to the email step. */}
        <AuthOtpForm key={mode} mode={mode} redirectTo={redirectTo} />
        <p className="text-center text-sm text-muted-foreground">
          {t('auth.haveAccount')}{' '}
          <Link href={loginHref} className="font-semibold text-primary hover:underline">{t('nav.login')}</Link>
        </p>
      </CardContent>
    </Card>
  );
}

function RoleToggle({ role, onChange }: { role: Role; onChange: (r: Role) => void }) {
  const { t } = useLanguage();
  const isAdvocate = role === 'advocate';
  const hint = isAdvocate ? t('auth.role.advocate.hint') : t('auth.role.citizen.hint');

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{t('auth.role.prompt')}</p>
      <div
        role="tablist"
        aria-label={t('auth.role.prompt')}
        className="relative flex rounded-xl border border-border bg-muted/40 p-1"
      >
        {/* Sliding selection pill — gold-tinted so it stands out in both themes */}
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-lg border border-gold/40 bg-gold/15 shadow-soft transition-transform duration-300 ease-out"
          style={{ transform: isAdvocate ? 'translateX(100%)' : 'translateX(0)' }}
        />
        <RoleTab
          selected={!isAdvocate}
          onClick={() => onChange('citizen')}
          icon={<User className="size-4" />}
          label={t('auth.role.citizen')}
        />
        <RoleTab
          selected={isAdvocate}
          onClick={() => onChange('advocate')}
          icon={<Scale className="size-4" />}
          label={t('auth.role.advocate')}
        />
      </div>
      <p className="min-h-4 text-xs text-muted-foreground transition-colors">{hint}</p>
    </div>
  );
}

function RoleTab({
  selected, onClick, icon, label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        'relative z-10 flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold transition-colors',
        selected ? 'text-gold' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {icon}
      {label}
    </button>
  );
}
