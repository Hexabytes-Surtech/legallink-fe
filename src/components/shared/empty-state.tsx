import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Friendly empty/zero-data panel with an optional action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="grid size-12 place-items-center rounded-full bg-gold/10 text-gold">
          <Icon className="size-6" />
        </span>
      )}
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
