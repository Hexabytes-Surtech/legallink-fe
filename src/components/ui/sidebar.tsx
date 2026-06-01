'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { PanelLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_ICON = '3.75rem';
const STORAGE_KEY = 'll_sidebar_open';

/** Track viewport <768px. */
function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)');
    const onChange = () => setIsMobile(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return isMobile;
}

type SidebarState = 'expanded' | 'collapsed';
interface SidebarCtx {
  state: SidebarState;
  open: boolean;
  setOpen: (v: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (v: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
}
const SidebarContext = React.createContext<SidebarCtx | null>(null);
export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebar must be used within SidebarProvider');
  return ctx;
}

export function SidebarProvider({ children, className }: { children: React.ReactNode; className?: string }) {
  const isMobile = useIsMobile();
  const [open, setOpenState] = React.useState(true);
  const [openMobile, setOpenMobile] = React.useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved != null) setOpenState(saved === '1');
  }, []);

  const setOpen = React.useCallback((v: boolean) => {
    setOpenState(v);
    localStorage.setItem(STORAGE_KEY, v ? '1' : '0');
  }, []);

  const toggleSidebar = React.useCallback(() => {
    if (isMobile) setOpenMobile((o) => !o);
    else setOpen(!open);
  }, [isMobile, open, setOpen]);

  const value: SidebarCtx = {
    state: open ? 'expanded' : 'collapsed',
    open, setOpen, openMobile, setOpenMobile, isMobile, toggleSidebar,
  };

  return (
    <SidebarContext.Provider value={value}>
      <TooltipProvider delayDuration={0}>
        <div
          className={cn('flex w-full', className)}
          style={{ '--sidebar-width': SIDEBAR_WIDTH, '--sidebar-width-icon': SIDEBAR_WIDTH_ICON } as React.CSSProperties}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

export function Sidebar({ children, className }: { children: React.ReactNode; className?: string }) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent side="left" className="w-[var(--sidebar-width)] max-w-[80vw] p-0">
          <SheetHeader className="sr-only"><SheetTitle>Navigation</SheetTitle></SheetHeader>
          <div className="flex h-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      data-state={state}
      className="group sticky top-16 hidden h-[calc(100svh-4rem)] shrink-0 transition-[width] duration-200 ease-in-out md:block"
      style={{ width: state === 'expanded' ? 'var(--sidebar-width)' : 'var(--sidebar-width-icon)' }}
    >
      <div className={cn('flex h-full flex-col border-r border-border bg-card', className)}>{children}</div>
    </aside>
  );
}

export function SidebarTrigger({ className }: { className?: string }) {
  const { toggleSidebar } = useSidebar();
  return (
    <Button variant="ghost" size="icon-sm" className={className} onClick={toggleSidebar} aria-label="Toggle sidebar">
      <PanelLeft className="size-4" />
    </Button>
  );
}

export function SidebarHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col gap-2 border-b border-border p-3', className)}>{children}</div>;
}
export function SidebarFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-auto border-t border-border p-3', className)}>{children}</div>;
}
export function SidebarContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex-1 overflow-y-auto overflow-x-hidden py-2', className)}>{children}</div>;
}
export function SidebarMenu({ children, className }: { children: React.ReactNode; className?: string }) {
  return <ul className={cn('flex flex-col gap-1 px-2', className)}>{children}</ul>;
}
export function SidebarMenuItem({ children }: { children: React.ReactNode }) {
  return <li className="relative">{children}</li>;
}

export function SidebarMenuButton({
  asChild, isActive, tooltip, className, children,
}: {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
}) {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed' && !isMobile;
  const Comp = asChild ? Slot : 'button';

  const button = (
    <Comp
      data-active={isActive}
      data-collapsed={collapsed}
      className={cn(
        'flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm font-medium outline-none transition-colors',
        'text-foreground/75 hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
        'data-[active=true]:bg-gold/12 data-[active=true]:font-semibold data-[active=true]:text-primary',
        '[&_svg]:size-[18px] [&_svg]:shrink-0',
        'data-[collapsed=true]:justify-center data-[collapsed=true]:px-0 data-[collapsed=true]:[&_[data-sb-hide]]:hidden',
        className,
      )}
    >
      {children}
    </Comp>
  );

  if (collapsed && tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right">{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return button;
}

/** Main content area beside the sidebar. */
export function SidebarInset({ children, className }: { children: React.ReactNode; className?: string }) {
  return <main className={cn('flex min-h-[calc(100svh-4rem)] min-w-0 flex-1 flex-col', className)}>{children}</main>;
}
