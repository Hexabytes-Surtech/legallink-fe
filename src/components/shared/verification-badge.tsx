import { BadgeCheck, Clock, ShieldX, FileClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { VerificationStatus } from '@/types';
import { cn } from '@/lib/utils';

const MAP: Record<
  VerificationStatus,
  { label: string; variant: 'success' | 'warning' | 'muted' | 'destructive'; Icon: typeof BadgeCheck }
> = {
  verified: { label: 'Verified', variant: 'success', Icon: BadgeCheck },
  submitted: { label: 'Under review', variant: 'warning', Icon: FileClock },
  pending: { label: 'Pending', variant: 'muted', Icon: Clock },
  rejected: { label: 'Rejected', variant: 'destructive', Icon: ShieldX },
};

export function VerificationBadge({
  status,
  className,
  showIcon = true,
}: {
  status: VerificationStatus;
  className?: string;
  showIcon?: boolean;
}) {
  const cfg = MAP[status] ?? MAP.pending;
  const { label, variant, Icon } = cfg;
  return (
    <Badge variant={variant} className={cn(className)}>
      {showIcon && <Icon />}
      {label}
    </Badge>
  );
}
