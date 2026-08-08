export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.15";
  };
  public: {
    Tables: {
      bookings: {
        Row: {
          booking_code: string;
          created_at: string;
          ends_at: string;
          equipment_id: string;
          id: string;
          price: number;
          purpose: string;
          requester_tier: string;
          sample_details: string | null;
          starts_at: string;
          status: Database["public"]["Enums"]["booking_status"];
          user_id: string;
        };
        Insert: {
          booking_code?: string;
          created_at?: string;
          ends_at: string;
          equipment_id: string;
          id?: string;
          price?: number;
          purpose: string;
          requester_tier?: string;
          sample_details?: string | null;
          starts_at: string;
          status?: Database["public"]["Enums"]["booking_status"];
          user_id: string;
        };
        Update: {
          booking_code?: string;
          created_at?: string;
          ends_at?: string;
          equipment_id?: string;
          id?: string;
          price?: number;
          purpose?: string;
          requester_tier?: string;
          sample_details?: string | null;
          starts_at?: string;
          status?: Database["public"]["Enums"]["booking_status"];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bookings_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment: {
        Row: {
          capabilities: string[];
          category: string;
          created_at: string;
          description: string;
          id: string;
          institution_id: string;
          manufacturer: string;
          model: string | null;
          name: string;
          rate_industry: number;
          rate_researcher: number;
          rate_startup: number;
          rate_student: number;
          resolution: string | null;
          specs: Json;
          status: Database["public"]["Enums"]["equipment_status"];
          total_hours_used: number;
        };
        Insert: {
          capabilities?: string[];
          category: string;
          created_at?: string;
          description?: string;
          id?: string;
          institution_id: string;
          manufacturer: string;
          model?: string | null;
          name: string;
          rate_industry?: number;
          rate_researcher?: number;
          rate_startup?: number;
          rate_student?: number;
          resolution?: string | null;
          specs?: Json;
          status?: Database["public"]["Enums"]["equipment_status"];
          total_hours_used?: number;
        };
        Update: {
          capabilities?: string[];
          category?: string;
          created_at?: string;
          description?: string;
          id?: string;
          institution_id?: string;
          manufacturer?: string;
          model?: string | null;
          name?: string;
          rate_industry?: number;
          rate_researcher?: number;
          rate_startup?: number;
          rate_student?: number;
          resolution?: string | null;
          specs?: Json;
          status?: Database["public"]["Enums"]["equipment_status"];
          total_hours_used?: number;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_institution_id_fkey";
            columns: ["institution_id"];
            isOneToOne: false;
            referencedRelation: "institutions";
            referencedColumns: ["id"];
          },
        ];
      };
      institutions: {
        Row: {
          city: string;
          created_at: string;
          id: string;
          kind: string;
          lat: number;
          lng: number;
          name: string;
          short_name: string | null;
          state: string;
        };
        Insert: {
          city: string;
          created_at?: string;
          id?: string;
          kind?: string;
          lat: number;
          lng: number;
          name: string;
          short_name?: string | null;
          state: string;
        };
        Update: {
          city?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          lat?: number;
          lng?: number;
          name?: string;
          short_name?: string | null;
          state?: string;
        };
        Relationships: [];
      };
      maintenance_windows: {
        Row: {
          ends_at: string;
          equipment_id: string;
          id: string;
          note: string | null;
          starts_at: string;
        };
        Insert: {
          ends_at: string;
          equipment_id: string;
          id?: string;
          note?: string | null;
          starts_at: string;
        };
        Update: {
          ends_at?: string;
          equipment_id?: string;
          id?: string;
          note?: string | null;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "maintenance_windows_equipment_id_fkey";
            columns: ["equipment_id"];
            isOneToOne: false;
            referencedRelation: "equipment";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          organization: string | null;
          user_type: string;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          organization?: string | null;
          user_type?: string;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          organization?: string | null;
          user_type?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_busy_slots: {
        Args: { _equipment_id: string };
        Returns: {
          ends_at: string;
          kind: string;
          starts_at: string;
        }[];
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "lab_manager" | "member";
      booking_status: "pending" | "approved" | "rejected" | "completed" | "cancelled";
      equipment_status: "available" | "maintenance" | "offline";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "lab_manager", "member"],
      booking_status: ["pending", "approved", "rejected", "completed", "cancelled"],
      equipment_status: ["available", "maintenance", "offline"],
    },
  },
} as const;
