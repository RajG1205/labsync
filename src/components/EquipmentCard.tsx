import { Link } from "@tanstack/react-router";
import { MapPin, Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatINR, rateFor, type EquipmentWithInstitution, type TierId } from "@/lib/labsync";

export function EquipmentCard({
  equipment,
  tier,
  distanceKm,
  showRates = true,
}: {
  equipment: EquipmentWithInstitution;
  tier: TierId;
  distanceKm?: number | undefined;
  showRates?: boolean;
}) {
  const inst = equipment.institutions;
  return (
    <Link
      to="/equipment/$id"
      params={{ id: equipment.id }}
      className="group panel flex flex-col gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Badge variant="secondary" className="mb-2 font-mono text-[11px]">
            {equipment.category}
          </Badge>
          <h3 className="text-base font-semibold leading-tight tracking-tight">{equipment.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {equipment.manufacturer}
            {equipment.model ? ` · ${equipment.model}` : ""}
          </p>
        </div>
        <StatusDot status={equipment.status} />
      </div>

      <p className="line-clamp-2 text-sm text-muted-foreground">{equipment.description}</p>

      <div className="flex flex-wrap gap-1.5">
        {equipment.capabilities.slice(0, 3).map((c) => (
          <span
            key={c}
            className="rounded-md bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground"
          >
            {c}
          </span>
        ))}
      </div>

      <div className="mt-auto space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Building2 className="h-3.5 w-3.5" />
          <span className="truncate">{inst?.short_name ?? inst?.name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            {inst?.city}
            {distanceKm !== undefined ? ` · ${distanceKm} km` : ""}
          </span>
          {showRates ? (
            <span className="font-mono text-sm font-medium text-foreground">
              {formatINR(rateFor(equipment, tier))}
              <span className="text-xs font-normal text-muted-foreground">/hr</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">Sign in for rates</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function StatusDot({ status }: { status: EquipmentWithInstitution["status"] }) {
  const map = {
    available: { label: "Available", cls: "bg-success" },
    maintenance: { label: "Maintenance", cls: "bg-warning" },
    offline: { label: "Offline", cls: "bg-destructive" },
  } as const;
  const s = map[status];
  return (
    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-muted-foreground">
      <span className={`h-1.5 w-1.5 rounded-full ${s.cls}`} />
      {s.label}
    </span>
  );
}
