import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type AppRole = "admin" | "lab_manager" | "member";

export function useRoles() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<AppRole[]> => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data ?? []).map((r) => r.role as AppRole);
    },
  });

  const roles = query.data ?? [];
  return {
    roles,
    loading: query.isLoading,
    isAdmin: roles.includes("admin"),
    isManager: roles.includes("admin") || roles.includes("lab_manager"),
  };
}
