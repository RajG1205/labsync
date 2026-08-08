import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, Sparkles, ArrowRight } from "lucide-react";
import { useCatalog } from "@/hooks/useCatalog";
import { AppHeader } from "@/components/AppHeader";
import { EquipmentCard } from "@/components/EquipmentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TIERS,
  parseSearchQuery,
  parseResolutionNm,
  haversineKm,
  type TierId,
} from "@/lib/labsync";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "LabSync — Book research equipment across institutions" },
      {
        name: "description",
        content:
          "Discover SEM, TEM, AFM, XRD, HPLC, CNC and more across universities and national labs. See live availability and reserve instrument time in minutes.",
      },
      { property: "og:title", content: "LabSync — National research equipment network" },
      {
        property: "og:description",
        content: "Find, compare and reserve laboratory instruments across institutions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Discover,
});

function Discover() {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [city, setCity] = useState("all");
  const [tier, setTier] = useState<TierId>("student");
  const [onlyAvailable, setOnlyAvailable] = useState(false);

  const { data, isLoading, ratesVisible } = useCatalog();

  const categories = useMemo(
    () => Array.from(new Set((data ?? []).map((e) => e.category))).sort(),
    [data],
  );
  const cities = useMemo(
    () =>
      Array.from(
        new Set((data ?? []).map((e) => e.institutions?.city).filter(Boolean) as string[]),
      ).sort(),
    [data],
  );

  const results = useMemo(() => {
    const parsed = parseSearchQuery(q);
    const needle = parsed.keywords.trim().toLowerCase();

    // Resolve "near X" / "within N km of X" against the institutions we
    // actually have data for — no external geocoding, so only cities present
    // in the catalog can be used as an origin point.
    const origin = parsed.originCity
      ? (data ?? [])
          .map((e) => e.institutions)
          .filter((i): i is NonNullable<typeof i> => !!i)
          .find((i) => i.city.toLowerCase().includes(parsed.originCity!.toLowerCase()))
      : undefined;

    const filtered = (data ?? []).filter((e) => {
      if (category !== "all" && e.category !== category) return false;
      if (city !== "all" && e.institutions?.city !== city) return false;
      if (onlyAvailable && e.status !== "available") return false;

      if (parsed.maxResolutionNm != null) {
        const resNm = parseResolutionNm(e.resolution);
        if (resNm == null || resNm > parsed.maxResolutionNm) return false;
      }

      if (origin && parsed.radiusKm != null && e.institutions) {
        const dist = haversineKm(origin, e.institutions);
        if (dist > parsed.radiusKm) return false;
      }

      if (!needle) return true;
      const hay = [
        e.name,
        e.category,
        e.manufacturer,
        e.model ?? "",
        e.description,
        e.resolution ?? "",
        e.capabilities.join(" "),
        e.institutions?.name ?? "",
        e.institutions?.city ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return needle.split(/\s+/).every((token) => hay.includes(token));
    });

    if (origin) {
      return [...filtered].sort((a, b) => {
        if (!a.institutions || !b.institutions) return 0;
        return haversineKm(origin, a.institutions) - haversineKm(origin, b.institutions);
      });
    }
    return filtered;
  }, [data, q, category, city, onlyAvailable]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <section className="border-b border-border bg-surface grid-backdrop">
        <div className="mx-auto max-w-7xl px-6 py-16 md:py-20">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">
            National research equipment network
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight md:text-5xl">
            Crores of idle instruments. One place to find and book them.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Search every registered SEM, XRD, HPLC and CNC machine by capability, resolution and
            location — then reserve a slot with live availability and faculty approval built in.
          </p>

          <div className="mt-8 flex max-w-3xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                maxLength={160}
                onChange={(e) => setQ(e.target.value)}
                placeholder="SEM 1 nm resolution, Chennai, thin film XRD…"
                className="h-12 bg-card pl-9 text-base shadow-[var(--shadow-soft)]"
              />
            </div>
            <Button asChild variant="outline" size="lg" className="h-12">
              <Link to="/recommend">
                <Sparkles className="h-4 w-4" />
                Describe your experiment
              </Link>
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Try "SEM within 150 km of Mumbai" or "1 nm resolution" — hybrid search combines keyword,
            location-radius and resolution filters. For open-ended requirements, use "Describe your
            experiment" instead.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </span>

          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-[170px] bg-card">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locations</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={tier} onValueChange={(v) => setTier(v as TierId)}>
            <SelectTrigger className="w-[230px] bg-card">
              <SelectValue placeholder="Pricing tier" />
            </SelectTrigger>
            <SelectContent>
              {TIERS.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.label} pricing
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant={onlyAvailable ? "default" : "outline"}
            onClick={() => setOnlyAvailable((v) => !v)}
          >
            Available only
          </Button>

          <span className="ml-auto text-sm text-muted-foreground">
            {isLoading ? "Loading" : `${results.length} instruments`}
          </span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))
            : results.map((e) => (
                <EquipmentCard key={e.id} equipment={e} tier={tier} showRates={ratesVisible} />
              ))}
        </div>

        {!isLoading && results.length === 0 && (
          <div className="panel mt-6 p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No instruments match that search. Try fewer keywords or describe your experiment
              instead.
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link to="/recommend">
                Ask the AI assistant
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto max-w-7xl px-6 text-xs text-muted-foreground">
          LabSync — shared research infrastructure for students, scholars, startups and industry.
        </div>
      </footer>
    </div>
  );
}
