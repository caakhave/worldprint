export type ProfileRow = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type UserStatsRow = {
  user_id: string;
  maps_played: number;
  daily_runs_completed: number;
  correct_answers: number;
  total_score: number;
  best_round_score: number;
  current_daily_streak: number;
  best_daily_streak: number;
  last_played_daily_date: string | null;
  updated_at: string;
};

export type EntitlementRow = {
  user_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_status: string | null;
  current_period_end: string | null;
  updated_at: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: {
          id: string;
          display_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_stats: {
        Row: UserStatsRow;
        Insert: {
          user_id: string;
          maps_played?: number;
          daily_runs_completed?: number;
          correct_answers?: number;
          total_score?: number;
          best_round_score?: number;
          current_daily_streak?: number;
          best_daily_streak?: number;
          last_played_daily_date?: string | null;
          updated_at?: string;
        };
        Update: {
          maps_played?: number;
          daily_runs_completed?: number;
          correct_answers?: number;
          total_score?: number;
          best_round_score?: number;
          current_daily_streak?: number;
          best_daily_streak?: number;
          last_played_daily_date?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      entitlements: {
        Row: EntitlementRow;
        Insert: {
          user_id: string;
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          stripe_status?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Update: {
          plan?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          stripe_status?: string | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
