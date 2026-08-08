import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarCheck, FlaskConical, Sparkles, ShieldCheck, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useRoles } from "@/hooks/useRole";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_STYLES } from "./bookings";
import { formatINR } from "@/lib/labsync";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "My dashboard — LabSync" },
      {
        name: "description",
        content:
          "Your LabSync overview: upcoming instrument reservations, approval status, sample progress and spend across partner labs.",
      },
      { property: "og:title", content: "My dashboard — LabSync" },
      {
        property: "og:description",
        content: "Upcoming reservations, approvals and spend across partner labs.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UserDashboard,
});

type BookingRow = {
  id: string;
  booking_code: string;
  starts_at: string;
  ends_at: string;
  status: string;
  sample_status: string;
  price: number;
  equipment: { name: string; category: string; institutions: { name: string } | null } | null;
};

function UserDashboard() {
  const { user } = useAuth();
  const { isManager } = useRoles();

  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BookingRow[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, booking_code, starts_at, ends_at, status, sample_status, price, equipment(name, category, institutions(name))",
        )
        .order("starts_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as BookingRow[];
    },
  });

  const now = Date.now();
  const upcoming = bookings
    .filter(
      (b) =>
        new Date(b.starts_at).getTime() >= now &&
        b.status !== "rejected" &&
        b.status !== "cancelled",
    )
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  const spend = bookings
    .filter((b) => b.status === "approved" || b.status === "completed")
    .reduce((sum, b) => sum + Number(b.price), 0);

  const stats = [
    { label: "Upcoming sessions", value: String(upcoming.length) },
    {
      label: "Awaiting approval",
      value: String(bookings.filter((b) => b.status === "pending").length),
    },
    { label: "Completed", value: String(bookings.filter((b) => b.status === "completed").length) },
    { label: "Approved spend", value: formatINR(spend) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-semibold tracking-tight">My dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Your instrument time at a glance — {user?.email}
        </p>

        {isManager && (
          <div className="panel mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-medium">You manage a facility</p>
                <p className="text-xs text-muted-foreground">
                  Approvals, revenue and maintenance live in the admin console.
                </p>
              </div>
            </div>
            <Button asChild size="sm">
              <Link to="/admin">Open admin console</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="panel p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="panel mt-8 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-3">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Upcoming reservations</h2>
          </div>
          <div className="divide-y divide-border">
            {isLoading && <Skeleton className="m-5 h-20 rounded-lg" />}
            {!isLoading && upcoming.length === 0 && (
              <div className="p-10 text-center">
                <CalendarCheck className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Nothing booked yet. Find an instrument and reserve a slot.
                </p>
                <Button asChild className="mt-4" size="sm">
                  <Link to="/">Browse instruments</Link>
                </Button>
              </div>
            )}
            {upcoming.slice(0, 6).map((b) => (
              <div key={b.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {b.booking_code}
                    </span>
                    <Badge variant="outline" className={STATUS_STYLES[b.status]}>
                      {b.status}
                    </Badge>
                  </div>
                  <p className="mt-1.5 text-sm font-medium">{b.equipment?.name}</p>
                  <p className="text-xs text-muted-foreground">{b.equipment?.institutions?.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm">
                    {format(new Date(b.starts_at), "EEE d MMM, HH:mm")} –{" "}
                    {format(new Date(b.ends_at), "HH:mm")}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">{formatINR(b.price)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Button asChild variant="outline" className="h-auto justify-start gap-3 p-5">
            <Link to="/">
              <FlaskConical className="h-4 w-4" />
              Discover instruments
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start gap-3 p-5">
            <Link to="/recommend">
              <Sparkles className="h-4 w-4" />
              AI recommendations
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start gap-3 p-5">
            <Link to="/bookings">
              <CalendarCheck className="h-4 w-4" />
              All my bookings
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
