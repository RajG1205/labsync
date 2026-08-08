import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Activity, Check, X, Wrench, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useRoles } from "@/hooks/useRole";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_STYLES } from "./bookings";
import { formatINR, utilisationPct, type EquipmentWithInstitution } from "@/lib/labsync";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin console — LabSync" },
      {
        name: "description",
        content:
          "Lab manager console: approve booking requests, monitor instrument utilisation and maintenance, and track facility revenue.",
      },
      { property: "og:title", content: "Admin console — LabSync" },
      {
        property: "og:description",
        content: "Approvals, revenue and instrument maintenance for lab managers.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminConsole,
});

type Pending = {
  id: string;
  booking_code: string;
  starts_at: string;
  ends_at: string;
  status: string;
  purpose: string;
  price: number;
  equipment: { name: string } | null;
};

function AdminConsole() {
  const qc = useQueryClient();
  const { isManager, loading: rolesLoading } = useRoles();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["all-bookings"],
    enabled: isManager,
    queryFn: async (): Promise<Pending[]> => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, starts_at, ends_at, status, purpose, price, equipment(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Pending[];
    },
  });

  const { data: equipment = [] } = useQuery({
    queryKey: ["equipment"],
    enabled: isManager,
    queryFn: async (): Promise<EquipmentWithInstitution[]> => {
      const { data, error } = await supabase
        .from("equipment")
        .select("*, institutions(*)")
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as EquipmentWithInstitution[];
    },
  });

  const { data: maintenance = [] } = useQuery({
    queryKey: ["maintenance-windows"],
    enabled: isManager,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_windows")
        .select("id, starts_at, ends_at, note, equipment(name)")
        .order("starts_at", { ascending: true })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        starts_at: string;
        ends_at: string;
        note: string | null;
        equipment: { name: string } | null;
      }[];
    },
  });

  async function decide(id: string, status: "approved" | "rejected") {
    const { error } = await supabase.from("bookings").update({ status }).eq("id", id);
    if (error) {
      toast.error("Only lab managers for this instrument can change a request.");
      return;
    }
    qc.invalidateQueries({ queryKey: ["all-bookings"] });
    toast.success(`Request ${status}`);
  }

  if (!rolesLoading && !isManager) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-xl px-6 py-24 text-center">
          <ShieldAlert className="mx-auto h-8 w-8 text-warning" />
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">Manager access only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This console is restricted to lab managers and administrators. Your account doesn't have
            that role yet.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">Back to my dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const revenue = requests
    .filter((r) => r.status === "approved" || r.status === "completed")
    .reduce((sum, r) => sum + Number(r.price), 0);

  const stats = [
    { label: "Pending approvals", value: String(pending.length) },
    { label: "Instruments listed", value: String(equipment.length) },
    {
      label: "Needs maintenance",
      value: String(equipment.filter((e) => e.status !== "available").length),
    },
    { label: "Approved revenue", value: formatINR(revenue) },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Admin console</h1>
          <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
            Lab manager
          </Badge>
        </div>
        <p className="mt-2 text-muted-foreground">
          Approve requests, track revenue and keep an eye on instrument health across your facility.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="panel p-5">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
              <p className="mt-2 font-mono text-2xl font-semibold">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="panel overflow-hidden">
            <div className="border-b border-border px-5 py-3">
              <h2 className="text-sm font-semibold">Booking requests</h2>
            </div>
            <div className="divide-y divide-border">
              {isLoading && <Skeleton className="m-5 h-24 rounded-lg" />}
              {!isLoading && requests.length === 0 && (
                <p className="p-8 text-center text-sm text-muted-foreground">
                  No requests visible for your role yet.
                </p>
              )}
              {requests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">
                        {r.booking_code}
                      </span>
                      <Badge variant="outline" className={STATUS_STYLES[r.status]}>
                        {r.status}
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm font-medium">{r.equipment?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(r.starts_at), "d MMM, HH:mm")} –{" "}
                      {format(new Date(r.ends_at), "HH:mm")} · {formatINR(r.price)}
                    </p>
                    <p className="mt-1.5 line-clamp-2 max-w-xl text-xs text-muted-foreground">
                      {r.purpose}
                    </p>
                  </div>
                  {r.status === "pending" && (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => decide(r.id, "approved")}>
                        <Check className="h-4 w-4" />
                        Approve
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide(r.id, "rejected")}>
                        <X className="h-4 w-4" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Equipment health</h2>
              </div>
              <div className="max-h-[420px] space-y-4 overflow-y-auto p-5">
                {equipment.map((e) => {
                  const pct = utilisationPct(e.total_hours_used);
                  return (
                    <div key={e.id}>
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="truncate">{e.name}</span>
                        <span className="font-mono text-xs text-muted-foreground">{pct}%</span>
                      </div>
                      <Progress value={pct} className="mt-1.5 h-1.5" />
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                        {e.status !== "available" && <Wrench className="h-3 w-3 text-warning" />}
                        {e.status === "available"
                          ? `${e.institutions?.city} · operational`
                          : `${e.institutions?.city} · ${e.status}`}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="panel overflow-hidden">
              <div className="flex items-center gap-2 border-b border-border px-5 py-3">
                <Wrench className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Maintenance schedule</h2>
              </div>
              <div className="space-y-3 p-5">
                {maintenance.length === 0 && (
                  <p className="text-sm text-muted-foreground">No maintenance windows scheduled.</p>
                )}
                {maintenance.map((m) => (
                  <div key={m.id} className="text-sm">
                    <p className="font-medium">{m.equipment?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(m.starts_at), "d MMM HH:mm")} –{" "}
                      {format(new Date(m.ends_at), "d MMM HH:mm")}
                      {m.note ? ` · ${m.note}` : ""}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
