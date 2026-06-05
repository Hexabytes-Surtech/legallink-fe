import { cn } from '@/lib/utils';

/**
 * Loading placeholder with a subtle sliding shimmer (works in both themes).
 *   <Skeleton className="h-4 w-32" />
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn(
        'relative overflow-hidden rounded-md bg-muted/70',
        'before:absolute before:inset-0 before:animate-shimmer',
        'before:bg-gradient-to-r before:from-transparent before:via-foreground/[0.07] before:to-transparent',
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
