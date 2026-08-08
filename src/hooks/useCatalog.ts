import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { getPublicCatalog, getPublicBusySlots } from "@/lib/catalog.functions";
import type { EquipmentWithInstitution } from "@/lib/labsync";

type PublicRow = Awaited<ReturnType<typeof getPublicCatalog>>[number];

function toEquipment(row: PublicRow): EquipmentWithInstitution {
  return {
    ...(row as unknown as EquipmentWithInstitution),
    rate_student: 0,
    rate_researcher: 0,
    rate_startup: 0,
    rate_industry: 0,
    total_hours_used: 0,
  };
}

/**
 * Equipment catalog. Signed-in users read the full table (rates, utilisation);
 * visitors get a public projection without pricing or usage data.
 */
export function useCatalog() {
  const { user, loading } = useAuth();
  const publicCatalog = useServerFn(getPublicCatalog);
  const signedIn = Boolean(user);

  const query = useQuery({
    queryKey: ["equipment", signedIn],
    enabled: !loading,
    queryFn: async (): Promise<EquipmentWithInstitution[]> => {
      if (signedIn) {
        const { data, error } = await supabase
          .from("equipment")
          .select("*, institutions(*)")
          .order("name");
        if (error) throw error;
        return (data ?? []) as unknown as EquipmentWithInstitution[];
      }
      const rows = await publicCatalog();
      return rows.map(toEquipment);
    },
  });

  return { ...query, ratesVisible: signedIn };
}

export function useCatalogItem(id: string) {
  const { user, loading } = useAuth();
  const publicCatalog = useServerFn(getPublicCatalog);
  const signedIn = Boolean(user);

  const query = useQuery({
    queryKey: ["equipment", signedIn, id],
    enabled: !loading,
    queryFn: async (): Promise<EquipmentWithInstitution | null> => {
      if (signedIn) {
        const { data, error } = await supabase
          .from("equipment")
          .select("*, institutions(*)")
          .eq("id", id)
          .single();
        if (error) throw error;
        return data as unknown as EquipmentWithInstitution;
      }
      const rows = await publicCatalog();
      const row = rows.find((r) => r.id === id);
      return row ? toEquipment(row) : null;
    },
  });

  return { ...query, ratesVisible: signedIn };
}

export function useBusySlots(equipmentId: string) {
  const busy = useServerFn(getPublicBusySlots);
  return useQuery({
    queryKey: ["busy-slots", equipmentId],
    queryFn: () => busy({ data: { equipmentId } }),
  });
}
