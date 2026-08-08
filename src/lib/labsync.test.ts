import { describe, expect, it } from "vitest";
import {
  formatINR,
  haversineKm,
  parseResolutionNm,
  parseSearchQuery,
  rateFor,
  utilisationPct,
  type EquipmentRow,
} from "./labsync";

const equipment: EquipmentRow = {
  id: "eq-1",
  institution_id: "inst-1",
  name: "Field Emission SEM",
  category: "SEM",
  manufacturer: "JEOL",
  model: "JSM-7600F",
  description: "",
  capabilities: [],
  specs: {},
  resolution: "1 nm",
  status: "available",
  rate_student: 600,
  rate_researcher: 1200,
  rate_startup: 3500,
  rate_industry: 6000,
  total_hours_used: 0,
};

describe("rateFor", () => {
  it("returns the correct hourly rate per tier", () => {
    expect(rateFor(equipment, "student")).toBe(600);
    expect(rateFor(equipment, "researcher")).toBe(1200);
    expect(rateFor(equipment, "startup")).toBe(3500);
    expect(rateFor(equipment, "industry")).toBe(6000);
  });
});

describe("formatINR", () => {
  it("formats a number as a whole-rupee currency string", () => {
    expect(formatINR(600)).toContain("600");
    expect(formatINR(600)).toContain("₹");
  });
});

describe("haversineKm", () => {
  it("returns ~0 for the same point", () => {
    const p = { lat: 19.1334, lng: 72.9133 };
    expect(haversineKm(p, p)).toBe(0);
  });

  it("returns the approximate real-world distance between Mumbai and Pune", () => {
    const mumbai = { lat: 19.076, lng: 72.8777 };
    const pune = { lat: 18.5204, lng: 73.8567 };
    const dist = haversineKm(mumbai, pune);
    // Real road/straight-line distance is ~120-150 km.
    expect(dist).toBeGreaterThan(100);
    expect(dist).toBeLessThan(160);
  });
});

describe("utilisationPct", () => {
  it("caps at 100", () => {
    expect(utilisationPct(999999)).toBe(100);
  });

  it("is 0 for unused equipment", () => {
    expect(utilisationPct(0)).toBe(0);
  });
});

describe("parseSearchQuery", () => {
  it("extracts a radius and origin city", () => {
    const parsed = parseSearchQuery("SEM within 150 km of Mumbai");
    expect(parsed.radiusKm).toBe(150);
    expect(parsed.originCity).toBe("Mumbai");
    expect(parsed.keywords).toContain("SEM");
  });

  it("extracts a bare 'near <city>' without a radius", () => {
    const parsed = parseSearchQuery("XRD near Chennai");
    expect(parsed.originCity).toBe("Chennai");
    expect(parsed.radiusKm).toBeUndefined();
  });

  it("extracts a resolution ceiling in nm", () => {
    const parsed = parseSearchQuery("1 nm resolution SEM");
    expect(parsed.maxResolutionNm).toBe(1);
  });

  it("leaves plain keyword queries untouched", () => {
    const parsed = parseSearchQuery("HPLC Agilent");
    expect(parsed.keywords).toBe("HPLC Agilent");
    expect(parsed.originCity).toBeUndefined();
    expect(parsed.radiusKm).toBeUndefined();
    expect(parsed.maxResolutionNm).toBeUndefined();
  });
});

describe("parseResolutionNm", () => {
  it("parses a leading numeric nm value", () => {
    expect(parseResolutionNm("0.2 nm")).toBe(0.2);
    expect(parseResolutionNm("1 nm")).toBe(1);
  });

  it("returns null for non-nm or missing resolution", () => {
    expect(parseResolutionNm(null)).toBeNull();
    expect(parseResolutionNm(undefined)).toBeNull();
    expect(parseResolutionNm("0.0001 deg")).toBeNull();
  });
});
