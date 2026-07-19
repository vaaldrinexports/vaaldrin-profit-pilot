export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          created_at: string
          org_id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event: string
          id: string
          metadata: Json
          org_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event: string
          id?: string
          metadata?: Json
          org_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event?: string
          id?: string
          metadata?: Json
          org_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          token: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mi_countries: {
        Row: {
          currency: string | null
          iso2: string
          name: string
          org_id: string
          region: string | null
        }
        Insert: {
          currency?: string | null
          iso2: string
          name: string
          org_id: string
          region?: string | null
        }
        Update: {
          currency?: string | null
          iso2?: string
          name?: string
          org_id?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mi_countries_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mi_news: {
        Row: {
          captured_at: string
          country_iso2: string | null
          headline: string
          id: string
          org_id: string
          product_id: string | null
          published_at: string | null
          sentiment: string | null
          source: string | null
          summary: string | null
          url: string | null
        }
        Insert: {
          captured_at?: string
          country_iso2?: string | null
          headline: string
          id?: string
          org_id: string
          product_id?: string | null
          published_at?: string | null
          sentiment?: string | null
          source?: string | null
          summary?: string | null
          url?: string | null
        }
        Update: {
          captured_at?: string
          country_iso2?: string | null
          headline?: string
          id?: string
          org_id?: string
          product_id?: string | null
          published_at?: string | null
          sentiment?: string | null
          source?: string | null
          summary?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mi_news_country_iso2_fkey"
            columns: ["country_iso2"]
            isOneToOne: false
            referencedRelation: "mi_countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "mi_news_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mi_news_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mi_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mi_products: {
        Row: {
          category: string | null
          code: string
          created_at: string
          hs_code: string | null
          id: string
          name: string
          org_id: string
        }
        Insert: {
          category?: string | null
          code: string
          created_at?: string
          hs_code?: string | null
          id?: string
          name: string
          org_id: string
        }
        Update: {
          category?: string | null
          code?: string
          created_at?: string
          hs_code?: string | null
          id?: string
          name?: string
          org_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mi_products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      mi_scores: {
        Row: {
          ai_recommendation: string | null
          avg_price_usd: number | null
          competition: string | null
          computed_at: string
          country_iso2: string | null
          demand_score: number | null
          evidence: Json
          id: string
          opportunity_score: number | null
          org_id: string
          price_trend: string | null
          product_id: string
          supply_situation: string | null
        }
        Insert: {
          ai_recommendation?: string | null
          avg_price_usd?: number | null
          competition?: string | null
          computed_at?: string
          country_iso2?: string | null
          demand_score?: number | null
          evidence?: Json
          id?: string
          opportunity_score?: number | null
          org_id: string
          price_trend?: string | null
          product_id: string
          supply_situation?: string | null
        }
        Update: {
          ai_recommendation?: string | null
          avg_price_usd?: number | null
          competition?: string | null
          computed_at?: string
          country_iso2?: string | null
          demand_score?: number | null
          evidence?: Json
          id?: string
          opportunity_score?: number | null
          org_id?: string
          price_trend?: string | null
          product_id?: string
          supply_situation?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mi_scores_country_iso2_fkey"
            columns: ["country_iso2"]
            isOneToOne: false
            referencedRelation: "mi_countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "mi_scores_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mi_scores_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mi_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mi_signals: {
        Row: {
          captured_at: string
          country_iso2: string | null
          id: string
          meta: Json
          org_id: string
          product_id: string | null
          signal_type: string
          source: string | null
          source_url: string | null
          value: number | null
        }
        Insert: {
          captured_at?: string
          country_iso2?: string | null
          id?: string
          meta?: Json
          org_id: string
          product_id?: string | null
          signal_type: string
          source?: string | null
          source_url?: string | null
          value?: number | null
        }
        Update: {
          captured_at?: string
          country_iso2?: string | null
          id?: string
          meta?: Json
          org_id?: string
          product_id?: string | null
          signal_type?: string
          source?: string | null
          source_url?: string | null
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "mi_signals_country_iso2_fkey"
            columns: ["country_iso2"]
            isOneToOne: false
            referencedRelation: "mi_countries"
            referencedColumns: ["iso2"]
          },
          {
            foreignKeyName: "mi_signals_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mi_signals_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "mi_products"
            referencedColumns: ["id"]
          },
        ]
      }
      mi_source_health: {
        Row: {
          category: string
          data_type: string
          duration_ms: number | null
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_success_at: string | null
          org_id: string
          records_last_run: number | null
          refresh_interval_minutes: number
          source_key: string
          source_name: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          data_type: string
          duration_ms?: number | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          org_id: string
          records_last_run?: number | null
          refresh_interval_minutes?: number
          source_key: string
          source_name: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          data_type?: string
          duration_ms?: number | null
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_success_at?: string | null
          org_id?: string
          records_last_run?: number | null
          refresh_interval_minutes?: number
          source_key?: string
          source_name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mi_source_health_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          created_at: string
          org_id: string
          role: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          org_id: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          org_id?: string
          role?: Database["public"]["Enums"]["org_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_environment: string
          cancel_at_period_end: boolean
          company_address: string | null
          company_gstin: string | null
          created_at: string
          created_by: string | null
          current_period_end: string | null
          id: string
          logo_url: string | null
          name: string
          paddle_customer_id: string | null
          paddle_price_id: string | null
          paddle_subscription_id: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          billing_environment?: string
          cancel_at_period_end?: boolean
          company_address?: string | null
          company_gstin?: string | null
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          id?: string
          logo_url?: string | null
          name: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          billing_environment?: string
          cancel_at_period_end?: boolean
          company_address?: string | null
          company_gstin?: string | null
          created_at?: string
          created_by?: string | null
          current_period_end?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          paddle_customer_id?: string | null
          paddle_price_id?: string | null
          paddle_subscription_id?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          slug?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: Database["public"]["Enums"]["subscription_status"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_admins: {
        Row: {
          granted_at: string
          granted_by: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      quotes: {
        Row: {
          buyer_company: string | null
          contract_currency: string | null
          created_at: string
          id: string
          net_profit_inr: number | null
          org_id: string
          product_name: string | null
          profit_pct: number | null
          quantity: number | null
          quotation_number: string | null
          saved_at: string
          state: Json
          total_contract_value: number | null
          unit_price: number | null
          uom: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          buyer_company?: string | null
          contract_currency?: string | null
          created_at?: string
          id?: string
          net_profit_inr?: number | null
          org_id: string
          product_name?: string | null
          profit_pct?: number | null
          quantity?: number | null
          quotation_number?: string | null
          saved_at?: string
          state?: Json
          total_contract_value?: number | null
          unit_price?: number | null
          uom?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          buyer_company?: string | null
          contract_currency?: string | null
          created_at?: string
          id?: string
          net_profit_inr?: number | null
          org_id?: string
          product_name?: string | null
          profit_pct?: number | null
          quantity?: number | null
          quotation_number?: string | null
          saved_at?: string
          state?: Json
          total_contract_value?: number | null
          unit_price?: number | null
          uom?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_counters: {
        Row: {
          mi_refreshes: number
          org_id: string
          period_start: string
          quotes_created: number
          updated_at: string
        }
        Insert: {
          mi_refreshes?: number
          org_id: string
          period_start: string
          quotes_created?: number
          updated_at?: string
        }
        Update: {
          mi_refreshes?: number
          org_id?: string
          period_start?: string
          quotes_created?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_counters_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_org_access: {
        Args: {
          _org: string
          _roles?: Database["public"]["Enums"]["org_role"][]
        }
        Returns: boolean
      }
      increment_quote_usage: { Args: { _org: string }; Returns: number }
      is_platform_admin: { Args: { _user?: string }; Returns: boolean }
      my_org_ids: { Args: never; Returns: string[] }
      org_has_active_plan: { Args: { _org: string }; Returns: boolean }
    }
    Enums: {
      org_role: "owner" | "admin" | "member" | "viewer"
      subscription_plan: "free" | "pro" | "business" | "enterprise"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "canceled"
        | "paused"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      org_role: ["owner", "admin", "member", "viewer"],
      subscription_plan: ["free", "pro", "business", "enterprise"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "canceled",
        "paused",
      ],
    },
  },
} as const
