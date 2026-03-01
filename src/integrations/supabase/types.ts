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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: string | null
          id: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: string | null
          id?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string | null
          id: string
          image_url: string
          is_active: boolean | null
          link_path: string | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url: string
          is_active?: boolean | null
          link_path?: string | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          link_path?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          created_at: string
          id: string
          is_ai: boolean | null
          message: string
          sender: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_ai?: boolean | null
          message: string
          sender?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_ai?: boolean | null
          message?: string
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          country_code: string
          created_at: string | null
          flag_emoji: string | null
          id: string
          is_active: boolean | null
          name: string
          phone_digits: number | null
          sort_order: number | null
          validation_enabled: boolean | null
        }
        Insert: {
          country_code: string
          created_at?: string | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone_digits?: number | null
          sort_order?: number | null
          validation_enabled?: boolean | null
        }
        Update: {
          country_code?: string
          created_at?: string | null
          flag_emoji?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone_digits?: number | null
          sort_order?: number | null
          validation_enabled?: boolean | null
        }
        Relationships: []
      }
      faq_items: {
        Row: {
          answer: string
          created_at: string | null
          id: string
          is_active: boolean | null
          question: string
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          answer: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          answer?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          question?: string
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      gift_rewards: {
        Row: {
          created_at: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          money_value: number
          name: string
          points_required: number
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          money_value?: number
          name: string
          points_required?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          money_value?: number
          name?: string
          points_required?: number
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      info_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          image_url: string | null
          is_active: boolean | null
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_methods: {
        Row: {
          country: string
          country_id: string | null
          created_at: string | null
          external_url: string | null
          holder_name: string | null
          id: string
          instructions: string | null
          is_active: boolean | null
          logo_url: string | null
          name: string
          payment_type: string
          phone: string | null
          sort_order: number | null
        }
        Insert: {
          country?: string
          country_id?: string | null
          created_at?: string | null
          external_url?: string | null
          holder_name?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name: string
          payment_type?: string
          phone?: string | null
          sort_order?: number | null
        }
        Update: {
          country?: string
          country_id?: string | null
          created_at?: string | null
          external_url?: string | null
          holder_name?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean | null
          logo_url?: string | null
          name?: string
          payment_type?: string
          phone?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_methods_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      point_exchanges: {
        Row: {
          created_at: string
          id: string
          money_credited: number
          points_spent: number
          reward_id: string | null
          reward_name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          money_credited: number
          points_spent: number
          reward_id?: string | null
          reward_name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          money_credited?: number
          points_spent?: number
          reward_id?: string | null
          reward_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_exchanges_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "gift_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      popup_messages: {
        Row: {
          button_cancel: string | null
          button_confirm: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          message: string
          sort_order: number | null
          tabs: Json | null
          title: string
          trigger_key: string
          updated_at: string | null
        }
        Insert: {
          button_cancel?: string | null
          button_confirm?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message: string
          sort_order?: number | null
          tabs?: Json | null
          title: string
          trigger_key: string
          updated_at?: string | null
        }
        Update: {
          button_cancel?: string | null
          button_confirm?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          message?: string
          sort_order?: number | null
          tabs?: Json | null
          title?: string
          trigger_key?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      product_series: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          min_active_members: number | null
          min_personal_investment: number | null
          min_team_investment: number | null
          min_vip_level: number | null
          name: string
          sort_order: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          min_active_members?: number | null
          min_personal_investment?: number | null
          min_team_investment?: number | null
          min_vip_level?: number | null
          name: string
          sort_order?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          min_active_members?: number | null
          min_personal_investment?: number | null
          min_team_investment?: number | null
          min_vip_level?: number | null
          name?: string
          sort_order?: number | null
        }
        Relationships: []
      }
      products: {
        Row: {
          created_at: string | null
          cycles: number | null
          daily_revenue: number | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          is_new: boolean | null
          max_purchases: number | null
          name: string
          price: number | null
          return_percent: number | null
          series_id: string
          sort_order: number | null
          total_revenue: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          cycles?: number | null
          daily_revenue?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          max_purchases?: number | null
          name: string
          price?: number | null
          return_percent?: number | null
          series_id: string
          sort_order?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          cycles?: number | null
          daily_revenue?: number | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new?: boolean | null
          max_purchases?: number | null
          name?: string
          price?: number | null
          return_percent?: number | null
          series_id?: string
          sort_order?: number | null
          total_revenue?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "product_series"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          balance: number | null
          country_code: string | null
          created_at: string | null
          deposit_balance: number | null
          earnings_balance: number | null
          full_name: string | null
          gift_points: number | null
          id: string
          is_suspended: boolean | null
          phone: string | null
          referral_balance: number | null
          referral_code: string | null
          referred_by: string | null
          spins_balance: number
          updated_at: string | null
          user_id: string
          vip_level: number | null
        }
        Insert: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          deposit_balance?: number | null
          earnings_balance?: number | null
          full_name?: string | null
          gift_points?: number | null
          id?: string
          is_suspended?: boolean | null
          phone?: string | null
          referral_balance?: number | null
          referral_code?: string | null
          referred_by?: string | null
          spins_balance?: number
          updated_at?: string | null
          user_id: string
          vip_level?: number | null
        }
        Update: {
          balance?: number | null
          country_code?: string | null
          created_at?: string | null
          deposit_balance?: number | null
          earnings_balance?: number | null
          full_name?: string | null
          gift_points?: number | null
          id?: string
          is_suspended?: boolean | null
          phone?: string | null
          referral_balance?: number | null
          referral_code?: string | null
          referred_by?: string | null
          spins_balance?: number
          updated_at?: string | null
          user_id?: string
          vip_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recharges: {
        Row: {
          admin_note: string | null
          amount: number
          country_code: string
          created_at: string | null
          id: string
          payment_method: string | null
          phone: string
          status: string
          transaction_ref: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          amount: number
          country_code?: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          phone: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          country_code?: string
          created_at?: string | null
          id?: string
          payment_method?: string | null
          phone?: string
          status?: string
          transaction_ref?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          category: string
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          category?: string
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          category?: string
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      social_links: {
        Row: {
          id: string
          is_active: boolean | null
          key: string
          label: string
          updated_at: string | null
          url: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          updated_at?: string | null
          url?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          updated_at?: string | null
          url?: string | null
        }
        Relationships: []
      }
      user_products: {
        Row: {
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_collected_at: string | null
          product_id: string
          purchased_at: string | null
          total_collected: number | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_collected_at?: string | null
          product_id: string
          purchased_at?: string | null
          total_collected?: number | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_collected_at?: string | null
          product_id?: string
          purchased_at?: string | null
          total_collected?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          country_code: string
          created_at: string | null
          holder_name: string | null
          id: string
          label: string | null
          network: string
          phone: string
          user_id: string
        }
        Insert: {
          country_code?: string
          created_at?: string | null
          holder_name?: string | null
          id?: string
          label?: string | null
          network?: string
          phone: string
          user_id: string
        }
        Update: {
          country_code?: string
          created_at?: string | null
          holder_name?: string | null
          id?: string
          label?: string | null
          network?: string
          phone?: string
          user_id?: string
        }
        Relationships: []
      }
      vip_conditions: {
        Row: {
          condition_logic: string | null
          created_at: string | null
          id: string
          image_url: string | null
          level: number
          level_name: string
          min_active_members: number | null
          min_investment: number | null
          min_products_bought: number | null
          min_purchases: number | null
          min_team_investment: number | null
          updated_at: string | null
        }
        Insert: {
          condition_logic?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          level: number
          level_name: string
          min_active_members?: number | null
          min_investment?: number | null
          min_products_bought?: number | null
          min_purchases?: number | null
          min_team_investment?: number | null
          updated_at?: string | null
        }
        Update: {
          condition_logic?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          level?: number
          level_name?: string
          min_active_members?: number | null
          min_investment?: number | null
          min_products_bought?: number | null
          min_purchases?: number | null
          min_team_investment?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vip_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          id: string
          new_level: number
          old_level: number
          reason: string | null
          user_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_level?: number
          old_level?: number
          reason?: string | null
          user_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          id?: string
          new_level?: number
          old_level?: number
          reason?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wheel_prizes: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          is_winnable: boolean
          label: string
          prize_type: string
          probability: number
          sort_order: number
          updated_at: string | null
          value: number
          vip_level: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_winnable?: boolean
          label: string
          prize_type?: string
          probability?: number
          sort_order?: number
          updated_at?: string | null
          value?: number
          vip_level?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_winnable?: boolean
          label?: string
          prize_type?: string
          probability?: number
          sort_order?: number
          updated_at?: string | null
          value?: number
          vip_level?: number | null
        }
        Relationships: []
      }
      wheel_spins: {
        Row: {
          created_at: string | null
          id: string
          prize_id: string | null
          prize_label: string
          prize_type: string
          prize_value: number
          status: string
          updated_at: string | null
          user_id: string
          vip_level: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          prize_id?: string | null
          prize_label: string
          prize_type?: string
          prize_value?: number
          status?: string
          updated_at?: string | null
          user_id: string
          vip_level?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          prize_id?: string | null
          prize_label?: string
          prize_type?: string
          prize_value?: number
          status?: string
          updated_at?: string | null
          user_id?: string
          vip_level?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "wheel_spins_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "wheel_prizes"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          country_code: string
          created_at: string | null
          fee_amount: number
          id: string
          net_amount: number
          network: string
          phone: string
          status: string
          updated_at: string | null
          user_id: string
          wallet_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          country_code?: string
          created_at?: string | null
          fee_amount?: number
          id?: string
          net_amount?: number
          network?: string
          phone: string
          status?: string
          updated_at?: string | null
          user_id: string
          wallet_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          country_code?: string
          created_at?: string | null
          fee_amount?: number
          id?: string
          net_amount?: number
          network?: string
          phone?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "user_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_recent_winners: {
        Args: { lim?: number }
        Returns: {
          created_at: string
          id: string
          masked_phone: string
          prize_label: string
          prize_type: string
          prize_value: number
          vip_level: number
        }[]
      }
      get_team_profile_ids: { Args: { _user_id: string }; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_referral_code: { Args: { code: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
