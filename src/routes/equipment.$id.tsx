import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Building2, MapPin, Cpu } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/AppHeader";
import { StatusDot } from "@/components/EquipmentCard";
import { AvailabilityCalendar } from "@/components/AvailabilityCalendar";
import { useBusySlots, useCatalogItem } from "@/hooks/useCatalog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  TIERS,
  formatINR,
  rateFor,
  utilisationPct,
  type EquipmentWithInstitution,
  type TierId,
} from "@/lib/labsync";

export const Route = createFileRoute("/equipment/$id")({
  head: () => ({
    meta: [
      { title: "Instrument details & booking — LabSync" },
      {
        name: "description",
        content:
          "View instrument specifications, capabilities, hourly pricing by user tier and live slot availability, then request a booking.",
      },
      { property: "og:title", content: "Instrument details & booking — LabSync" },
      {
        property: "og:description",
        content: "Specifications, live availability and tiered pricing for shared lab instruments.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EquipmentDetail,
});

function EquipmentDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [tier, setTier] = useState<TierId>("student");
  const [selected, setSelected] = useState<{ date: Date; hour: number } | null>(null);
  const [hours, setHours] = useState("1");
  const [purpose, setPurpose] = useState("");
  const [sample, setSample] = useState("");
  const [open, setOpen] = useState(false);
  const [busySubmit, setBusySubmit] = useState(false);

  const { data: eq, isLoading, ratesVisible } = useCatalogItem(id);

  const { data: busy = [] } = useBusySlots(id);

  if (isLoading || !eq) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="mx-auto max-w-7xl space-y-4 px-6 py-10">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  const inst = eq.institutions;
  const durationHours = Number(hours);
  const price = rateFor(eq, tier) * durationHours;

  function openBooking(date: Date, hour: number) {
    setSelected({ date, hour });
    setOpen(true);
  }

  async function submit() {
    if (!user) {
      navigate({ to: "/auth", search: { redirect: `/equipment/${id}` } });
      return;
    }
    if (!selected || purpose.trim().length < 10) {
      toast.error("Describe your experiment in at least 10 characters.");
      return;
    }
    const startsAt = new Date(selected.date);
    startsAt.setHours(selected.hour, 0, 0, 0);
    const endsAt = new Date(startsAt.getTime() + durationHours * 3600_000);

    setBusySubmit(true);
    const { data, error } = await supabase
      .from("bookings")
      .insert({
        equipment_id: id,
        user_id: user.id,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        purpose: purpose.trim().slice(0, 1000),
        sample_details: sample.trim().slice(0, 1000) || null,
        requester_tier: tier,
        // `price` is intentionally omitted — the database trigger computes the
        // authoritative price server-side from the equipment's rate card, so a
        // client-supplied value can't be trusted or used to under-pay.
      })
      .select("booking_code")
      .single();
    setBusySubmit(false);

    if (error) {
      toast.error(error.message);
      return;
    }
    setOpen(false);
    setPurpose("");
    setSample("");
    qc.invalidateQueries({ queryKey: ["busy-slots", id] });
    toast.success(`Booking requested — ${data.booking_code}`, {
      description: "Awaiting lab approval. Track it under My bookings.",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to discovery
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div className="panel p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Badge variant="secondary" className="mb-2 font-mono text-[11px]">
                    {eq.category}
                  </Badge>
                  <h1 className="text-2xl font-semibold tracking-tight">{eq.name}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {eq.manufacturer}
                    {eq.model ? ` · ${eq.model}` : ""}
                  </p>
                </div>
                <StatusDot status={eq.status} />
              </div>

              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{eq.description}</p>

              <div className="mt-6 flex flex-wrap gap-4 border-t border-border pt-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  {inst?.name}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4" />
                  {inst?.city}, {inst?.state}
                </span>
                {ratesVisible && (
                  <span className="flex items-center gap-1.5">
                    <Cpu className="h-4 w-4" />
                    {utilisationPct(eq.total_hours_used)}% utilised
                  </span>
                )}
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="panel p-6">
                <h2 className="text-sm font-semibold">Key specifications</h2>
                <dl className="mt-4 space-y-2.5 text-sm">
                  {eq.resolution && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">Resolution</dt>
                      <dd className="font-mono">{eq.resolution}</dd>
                    </div>
                  )}
                  {Object.entries(eq.specs ?? {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4">
                      <dt className="capitalize text-muted-foreground">{k.replace(/_/g, " ")}</dt>
                      <dd className="text-right font-mono">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="panel p-6">
                <h2 className="text-sm font-semibold">Capabilities</h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {eq.capabilities.map((c) => (
                    <li key={c} className="flex items-start gap-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <AvailabilityCalendar busy={busy} onSelect={openBooking} selected={selected} />
          </div>

          <aside className="space-y-6">
            {ratesVisible ? (
              <div className="panel p-6">
                <h2 className="text-sm font-semibold">Pricing per hour</h2>
                <div className="mt-4 space-y-1.5">
                  {TIERS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTier(t.id)}
                      className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        tier === t.id
                          ? "border-primary bg-accent"
                          : "border-border hover:bg-secondary"
                      }`}
                    >
                      <span>{t.label}</span>
                      <span className="font-mono font-medium">{formatINR(rateFor(eq, t.id))}</span>
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Institutional billing and research grant accounts are settled monthly against your
                  approved booking IDs.
                </p>
              </div>
            ) : (
              <div className="panel p-6">
                <h2 className="text-sm font-semibold">Pricing per hour</h2>
                <p className="mt-3 text-sm text-muted-foreground">
                  Rate cards for student, scholar, startup and industry tiers are visible to
                  registered users.
                </p>
                <Button asChild className="mt-4 w-full">
                  <Link to="/auth" search={{ redirect: `/equipment/${id}` }}>
                    Sign in to see rates
                  </Link>
                </Button>
              </div>
            )}

            <div className="panel p-6">
              <h2 className="text-sm font-semibold">How booking works</h2>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                {[
                  "Pick a free hour on the availability board",
                  "Describe your experiment and sample",
                  "Lab manager approves and issues a booking ID",
                  "Track sample status through to report",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary font-mono text-[11px] text-secondary-foreground">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          </aside>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request instrument time</DialogTitle>
            <DialogDescription>
              {selected
                ? `${eq.name} · ${format(selected.date, "EEE d MMM")} at ${String(selected.hour).padStart(2, "0")}:00`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select value={hours} onValueChange={setHours}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4].map((h) => (
                      <SelectItem key={h} value={String(h)}>
                        {h} hour{h > 1 ? "s" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Your tier</Label>
                <Select value={tier} onValueChange={(v) => setTier(v as TierId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIERS.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Experiment details</Label>
              <Textarea
                id="purpose"
                maxLength={1000}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="What are you measuring and why?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sample">Sample details (optional)</Label>
              <Textarea
                id="sample"
                maxLength={1000}
                value={sample}
                onChange={(e) => setSample(e.target.value)}
                placeholder="Material, quantity, hazards, preparation done"
              />
            </div>

            <div className="flex items-center justify-between rounded-lg bg-secondary px-4 py-3 text-sm">
              <span className="text-muted-foreground">Estimated cost</span>
              <span className="font-mono text-base font-medium">{formatINR(price)}</span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={busySubmit}>
              {user ? "Request booking" : "Sign in to book"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
