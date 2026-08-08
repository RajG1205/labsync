export const TIERS = [
  { id: "student", label: "Student", rateKey: "rate_student" },
  { id: "researcher", label: "Research Scholar / Faculty", rateKey: "rate_researcher" },
  { id: "startup", label: "Startup", rateKey: "rate_startup" },
  { id: "industry", label: "Industry / Government", rateKey: "rate_industry" },
] as const;

export type TierId = (typeof TIERS)[number]["id"];

export type EquipmentRow = {
  id: string;
  institution_id: string;
  name: string;
  category: string;
  manufacturer: string;
  model: string | null;
  description: string;
  capabilities: string[];
  specs: Record<string, unknown>;
  resolution: string | null;
  status: "available" | "maintenance" | "offline";
  rate_student: number;
  rate_researcher: number;
  rate_startup: number;
  rate_industry: number;
  total_hours_used: number;
};

export type InstitutionRow = {
  id: string;
  name: string;
  short_name: string | null;
  city: string;
  state: string;
  kind: string;
  lat: number;
  lng: number;
};

export type EquipmentWithInstitution = EquipmentRow & { institutions: InstitutionRow | null };

export function rateFor(equipment: EquipmentRow, tier: TierId): number {
  switch (tier) {
    case "student":
      return Number(equipment.rate_student);
    case "researcher":
      return Number(equipment.rate_researcher);
    case "startup":
      return Number(equipment.rate_startup);
    default:
      return Number(equipment.rate_industry);
  }
}

export function formatINR(value: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)));
}

/**
 * Hybrid search helpers: extract structured filters (location/radius,
 * resolution ceiling) out of a free-text query, leaving the remainder for
 * plain keyword matching. This is deliberately NOT semantic/vector search —
 * it's regex-based structured extraction layered on top of keyword search,
 * documented as such (see README).
 */
export type ParsedSearchQuery = {
  /** Remaining free text, for keyword matching against name/description/etc. */
  keywords: string;
  /** City name extracted from "near X" / "within N km of X". */
  originCity?: string;
  /** Search radius in km, if the query specified one. */
  radiusKm?: number;
  /** Best-resolution-required-in-nm ceiling, e.g. "1 nm resolution" -> 1. */
  maxResolutionNm?: number;
};

export function parseSearchQuery(query: string): ParsedSearchQuery {
  let text = query;
  let originCity: string | undefined;
  let radiusKm: number | undefined;
  let maxResolutionNm: number | undefined;

  const radiusMatch = text.match(/within\s+(\d+(?:\.\d+)?)\s*km\s+of\s+([a-z\s]+?)(?:[,.]|$)/i);
  if (radiusMatch?.[1] && radiusMatch[2]) {
    radiusKm = Number(radiusMatch[1]);
    originCity = radiusMatch[2].trim();
    text = text.replace(radiusMatch[0], " ");
  } else {
    const nearMatch = text.match(/\bnear\s+([a-z\s]+?)(?:[,.]|$)/i);
    if (nearMatch?.[1]) {
      originCity = nearMatch[1].trim();
      text = text.replace(nearMatch[0], " ");
    }
  }

  const resMatch = text.match(/(\d+(?:\.\d+)?)\s*nm\b/i);
  if (resMatch?.[1]) {
    maxResolutionNm = Number(resMatch[1]);
    text = text.replace(resMatch[0], " ");
  }

  return {
    keywords: text.replace(/\s+/g, " ").trim(),
    ...(originCity !== undefined ? { originCity } : {}),
    ...(radiusKm !== undefined ? { radiusKm } : {}),
    ...(maxResolutionNm !== undefined ? { maxResolutionNm } : {}),
  };
}

/** Parses a leading numeric nm value out of stored resolution strings like "0.2 nm". */
export function parseResolutionNm(resolution: string | null | undefined): number | null {
  if (!resolution) return null;
  const m = resolution.match(/(\d+(?:\.\d+)?)\s*nm/i);
  return m?.[1] ? Number(m[1]) : null;
}

export const DAY_START_HOUR = 9;
export const DAY_END_HOUR = 18;

export function hourSlots(): number[] {
  return Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);
}

export function utilisationPct(hoursUsed: number): number {
  // 9h/day x 30 days as the reference capacity window
  return Math.min(100, Math.round((hoursUsed / (9 * 30 * 4)) * 100));
}
