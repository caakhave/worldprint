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

export type GameRunRow = {
  id: string;
  user_id: string | null;
  anonymous_id: string | null;
  client_run_key: string | null;
  mode: string;
  game_key: string;
  daily_date: string | null;
  challenge_code: string | null;
  content_version: string | null;
  tier: string | null;
  total_score: number;
  maps_played: number;
  correct_count: number;
  best_round_score: number;
  completed_at: string | null;
  created_at: string;
};

export type RoundResultRow = {
  id: string;
  run_id: string;
  round_index: number;
  indicator_id: string | null;
  guessed_indicator_id: string | null;
  correct: boolean;
  score: number;
  investigations_used: number;
  unit_clue_used: boolean;
  created_at: string;
};

export type EntitlementRow = {
  user_id: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  stripe_status: string | null;
  cancel_at_period_end: boolean | null;
  current_period_end: string | null;
  updated_at: string;
};

export type StripeWebhookEventRow = {
  event_id: string;
  type: string;
  status: string;
  user_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  received_at: string;
  processed_at: string | null;
  error: string | null;
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
      game_runs: {
        Row: GameRunRow;
        Insert: {
          id?: string;
          user_id?: string | null;
          anonymous_id?: string | null;
          client_run_key?: string | null;
          mode: string;
          game_key?: string;
          daily_date?: string | null;
          challenge_code?: string | null;
          content_version?: string | null;
          tier?: string | null;
          total_score?: number;
          maps_played?: number;
          correct_count?: number;
          best_round_score?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          user_id?: string | null;
          anonymous_id?: string | null;
          client_run_key?: string | null;
          mode?: string;
          game_key?: string;
          daily_date?: string | null;
          challenge_code?: string | null;
          content_version?: string | null;
          tier?: string | null;
          total_score?: number;
          maps_played?: number;
          correct_count?: number;
          best_round_score?: number;
          completed_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      round_results: {
        Row: RoundResultRow;
        Insert: {
          id?: string;
          run_id: string;
          round_index: number;
          indicator_id?: string | null;
          guessed_indicator_id?: string | null;
          correct?: boolean;
          score?: number;
          investigations_used?: number;
          unit_clue_used?: boolean;
          created_at?: string;
        };
        Update: {
          run_id?: string;
          round_index?: number;
          indicator_id?: string | null;
          guessed_indicator_id?: string | null;
          correct?: boolean;
          score?: number;
          investigations_used?: number;
          unit_clue_used?: boolean;
          created_at?: string;
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
          cancel_at_period_end?: boolean | null;
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
          cancel_at_period_end?: boolean | null;
          current_period_end?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      stripe_webhook_events: {
        Row: StripeWebhookEventRow;
        Insert: {
          event_id: string;
          type: string;
          status: string;
          user_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          received_at?: string;
          processed_at?: string | null;
          error?: string | null;
        };
        Update: {
          type?: string;
          status?: string;
          user_id?: string | null;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          received_at?: string;
          processed_at?: string | null;
          error?: string | null;
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
