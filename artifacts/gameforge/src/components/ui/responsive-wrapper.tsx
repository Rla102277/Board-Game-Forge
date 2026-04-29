import { useState, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

interface ResponsiveWrapperProps {
  children: React.ReactNode;
  mobileSidebar?: React.ReactNode;
  desktopSidebar?: React.ReactNode;
}

export function ResponsiveWrapper({ children, mobileSidebar, desktopSidebar }: ResponsiveWrapperProps) {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isMobile) {
    return (
      <div className="h-screen flex flex-col">
        <div className="flex items-center justify-between p-4 border-b bg-card">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5" />
          </Button>
        </div>
        
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="w-80">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            {mobileSidebar}
          </SheetContent>
        </Sheet>

        <div className="flex-1 overflow-auto">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex">
      {desktopSidebar}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  );
}

interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: number;
}

export function ResponsiveGrid({ children, cols = { mobile: 1, tablet: 2, desktop: 3 }, gap = 4 }: ResponsiveGridProps) {
  return (
    <div 
      className={`grid gap-${gap} grid-cols-${cols.mobile} md:grid-cols-${cols.tablet} lg:grid-cols-${cols.desktop}`}
    >
      {children}
    </div>
  );
}

interface MobileSafeAreaProps {
  children: React.ReactNode;
}

export function MobileSafeArea({ children }: MobileSafeAreaProps) {
  return (
    <div className="pb-safe-bottom pt-safe-top">
      {children}
    </div>
  );
}

export function useResponsiveBreakpoints() {
  const [breakpoint, setBreakpoint] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');

  useEffect(() => {
    const checkBreakpoint = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setBreakpoint('mobile');
      } else if (width < 1024) {
        setBreakpoint('tablet');
      } else {
        setBreakpoint('desktop');
      }
    };

    checkBreakpoint();
    window.addEventListener('resize', checkBreakpoint);
    return () => window.removeEventListener('resize', checkBreakpoint);
  }, []);

  return breakpoint;
}
