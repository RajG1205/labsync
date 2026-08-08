import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatINR } from "@/lib/labsync";

export const Route = createFileRoute("/_authenticated/bookings")({
  head: () => ({
    meta: [
      { title: "My bookings — LabSync" },
      {
        name: "description",
        content:
          "Track your instrument reservations, approval status, sample progress and billing across every partner lab.",
      },
      { property: "og:title", content: "My bookings — LabSync" },
      { property: "og:description", content: "Track instrument reservations and sample progress." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Bookings,
});

type BookingRow = {
  id: string;
  booking_code: string;
  starts_at: string;
  ends_at: string;
  status: string;
  sample_status: string;
  purpose: string;
  price: number;
  equipment: {
    id: string;
    name: string;
    category: string;
    institutions: { name: string } | null;
  } | null;
};

export const STATUS_STYLES: Record<string, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-success/15 text-success-foreground border-success/30",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  cancelled: "bg-muted text-muted-foreground border-border",
  completed: "bg-primary/10 text-primary border-primary/30",
};

const SAMPLE_STEPS = ["submitted", "received", "in_progress", "analysis", "report_ready"];

function Bookings() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BookingRow[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, equipment(id, name, category, institutions(name))")
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingRow[];
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">My bookings</h1>
        <p className="mt-2 text-muted-foreground">
          Every reservation you've requested, with approval and sample status.
        </p>

        <div className="mt-8 space-y-4">
          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}

          {!isLoading && (data ?? []).length === 0 && (
            <div className="panel p-12 text-center">
              <CalendarCheck className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No bookings yet. Find an instrument and reserve a slot.
              </p>
              <Button asChild className="mt-4">
                <Link to="/">Browse instruments</Link>
              </Button>
            </div>
          )}

          {(data ?? []).map((b) => (
            <div key={b.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {b.booking_code}
                    </span>
                    <Badge variant="outline" className={STATUS_STYLES[b.status]}>
                      {b.status}
                    </Badge>
                  </div>
                  <h2 className="mt-1.5 text-base font-semibold">{b.equipment?.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {b.equipment?.institutions?.name} · {b.equipment?.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium">
                    {format(new Date(b.starts_at), "EEE d MMM, HH:mm")} –{" "}
                    {format(new Date(b.ends_at), "HH:mm")}
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">{formatINR(b.price)}</p>
                </div>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{b.purpose}</p>

              <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-border pt-4">
                {SAMPLE_STEPS.map((step, i) => {
                  const idx = SAMPLE_STEPS.indexOf(b.sample_status);
                  const done = idx >= i && b.status === "approved";
                  return (
                    <span
                      key={step}
                      className={`rounded-md px-2 py-1 text-[11px] capitalize ${
                        done
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {step.replace(/_/g, " ")}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
