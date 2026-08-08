import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Public catalog: safe columns only (no pricing, no usage stats, no PII). */
export const getPublicCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("equipment")
    .select(
      "id, institution_id, name, category, manufacturer, model, description, capabilities, specs, resolution, status, institutions(id, name, short_name, city, state, kind, lat, lng)",
    )
    .order("name");
  if (error) throw new Error(error.message);
  return data ?? [];
});

/** Public availability: only busy time ranges and their kind — never booking details. */
export const getPublicBusySlots = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ equipmentId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: slots, error } = await supabaseAdmin.rpc("get_busy_slots", {
      _equipment_id: data.equipmentId,
    });
    if (error) throw new Error(error.message);
    return (slots ?? []).map((s) => ({
      starts_at: s.starts_at,
      ends_at: s.ends_at,
      kind: s.kind,
    }));
  });
