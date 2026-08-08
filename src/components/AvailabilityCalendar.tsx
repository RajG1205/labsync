import { useMemo, useState } from "react";
import { addDays, format, isSameDay, startOfDay } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hourSlots } from "@/lib/labsync";
import { cn } from "@/lib/utils";

export type BusySlot = { starts_at: string; ends_at: string; kind: string };

export function slotState(busy: BusySlot[], date: Date, hour: number) {
  const start = new Date(date);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const hit = busy.find((b) => new Date(b.starts_at) < end && new Date(b.ends_at) > start);
  if (hit) return hit.kind;
  if (end.getTime() < Date.now()) return "past";
  return "free";
}

const LEGEND = [
  { key: "free", label: "Free", cls: "bg-card border-border" },
  { key: "pending", label: "Pending", cls: "bg-warning/20 border-warning/40" },
  { key: "reserved", label: "Reserved", cls: "bg-primary/15 border-primary/30" },
  { key: "maintenance", label: "Maintenance", cls: "bg-destructive/15 border-destructive/30" },
];

export function AvailabilityCalendar({
  busy,
  onSelect,
  selected,
}: {
  busy: BusySlot[];
  onSelect: (date: Date, hour: number) => void;
  selected: { date: Date; hour: number } | null;
}) {
  const [offset, setOffset] = useState(0);
  const days = useMemo(
    () => Array.from({ length: 5 }, (_, i) => addDays(startOfDay(new Date()), offset + i)),
    [offset],
  );
  const hours = hourSlots();

  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div>
          <h3 className="text-sm font-semibold">Live availability</h3>
          <p className="text-xs text-muted-foreground">Pick a free hour to request the slot</p>
        </div>
        <div className="flex gap-1">
          <Button
            variant="outline"
            size="icon"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - 5))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => setOffset((o) => o + 5)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto p-5">
        <div className="grid min-w-[560px] grid-cols-[64px_repeat(5,1fr)] gap-1.5">
          <div />
          {days.map((d) => (
            <div key={d.toISOString()} className="pb-1 text-center">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {format(d, "EEE")}
              </div>
              <div className="text-sm font-medium">{format(d, "d MMM")}</div>
            </div>
          ))}

          {hours.map((h) => (
            <>
              <div
                key={`h-${h}`}
                className="pr-2 text-right font-mono text-[11px] leading-8 text-muted-foreground"
              >
                {String(h).padStart(2, "0")}:00
              </div>
              {days.map((d) => {
                const state = slotState(busy, d, h);
                const isSelected = selected && isSameDay(selected.date, d) && selected.hour === h;
                const disabled = state !== "free";
                return (
                  <button
                    key={`${d.toISOString()}-${h}`}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSelect(d, h)}
                    className={cn(
                      "h-8 rounded-md border text-[11px] transition-colors",
                      state === "free" &&
                        "border-border bg-card hover:border-primary hover:bg-accent",
                      state === "pending" && "border-warning/40 bg-warning/20",
                      state === "reserved" && "border-primary/30 bg-primary/15",
                      state === "maintenance" && "border-destructive/30 bg-destructive/15",
                      state === "past" && "border-transparent bg-muted/60",
                      isSelected && "border-primary bg-primary text-primary-foreground",
                    )}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-4 border-t border-border px-5 py-3">
        {LEGEND.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("h-3 w-3 rounded border", l.cls)} />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
