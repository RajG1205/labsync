import { Link, useRouterState } from "@tanstack/react-router";
import {
  FlaskConical,
  Sparkles,
  LayoutDashboard,
  CalendarCheck,
  LogIn,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Discover", icon: FlaskConical },
  { to: "/recommend", label: "AI Assistant", icon: Sparkles },
  { to: "/bookings", label: "My bookings", icon: CalendarCheck },
  { to: "/dashboard", label: "My dashboard", icon: LayoutDashboard },
] as const;

const ADMIN_NAV = { to: "/admin", label: "Admin", icon: ShieldCheck } as const;

export function AppHeader() {
  const { user } = useAuth();
  const { isManager } = useRoles();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = isManager ? [...NAV, ADMIN_NAV] : NAV;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <FlaskConical className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight">LabSync</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {items.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
                pathname === item.to && "bg-secondary text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <span className="hidden text-sm text-muted-foreground sm:block">{user.email}</span>
              <Button variant="outline" size="sm" onClick={() => supabase.auth.signOut()}>
                Sign out
              </Button>
            </>
          ) : (
            <Button asChild size="sm">
              <Link to="/auth">
                <LogIn className="h-4 w-4" />
                Sign in
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
