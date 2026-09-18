/**
 * Hand-written types mirroring the Supabase schema (supabase/migrations).
 * Keep in sync manually, or regenerate with `supabase gen types typescript`.
 *
 * NOTE: every shape below uses `type X = {...}` rather than `interface X`.
 * This isn't stylistic — @supabase/supabase-js's generic client requires
 * `Database['public']` to structurally satisfy `GenericSchema`, whose
 * `Tables[T].Row` etc. are typed as `Record<string, unknown>`. TypeScript
 * only allows that implicit-index-signature match for plain object type
 * literals, not for `interface` declarations (which are "sealed"); using
 * `interface` here silently makes every query resolve to `never`.
 */

export type NodeType = "metro" | "bus_stop" | "transport_hub" | "other";
export type RouteType = "bus" | "express_bus" | "metro" | "walking" | "other";
export type CrowdLevel = 0 | 1 | 2;
export type UserRole = "user" | "admin";

export type TransportNode = {
  id: string;
  name_az: string;
  name_ru: string;
  slug: string;
  type: NodeType;
  latitude: number;
  longitude: number;
  active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type Route = {
  id: string;
  code: string;
  name_az: string;
  name_ru: string;
  type: RouteType;
  active: boolean;
  is_demo: boolean;
  created_at: string;
  updated_at: string;
};

export type RouteNode = {
  id: string;
  route_id: string;
  node_id: string;
  sequence: number;
  estimated_minutes_from_previous: number;
  created_at: string;
};

export type CrowdReport = {
  id: string;
  user_id: string;
  node_id: string;
  route_id: string | null;
  level: CrowdLevel;
  verified_near_node: boolean;
  distance_to_node_m: number | null;
  created_at: string;
};

export type Profile = {
  id: string;
  display_name: string | null;
  language: "az" | "ru" | "en";
  trust_score: number;
  role: UserRole;
  created_at: string;
  updated_at: string;
};

export type TripRequest = {
  id: string;
  user_id: string | null;
  anonymous_session_id: string | null;
  origin_node_id: string;
  destination_node_id: string;
  desired_arrival: string | null;
  created_at: string;
};

export type Favorite = {
  id: string;
  user_id: string;
  title: string;
  origin_node_id: string;
  destination_node_id: string;
  created_at: string;
};

/** Returned by the `get_node_crowd_aggregates` SQL function. */
export type NodeCrowdAggregate = {
  node_id: string;
  crowd_score: number | null;
  crowd_level: "green" | "yellow" | "red" | "unknown";
  report_count: number;
  confidence: "unknown" | "low" | "medium" | "high";
  last_report_at: string | null;
};

export type Database = {
  public: {
    Tables: {
      transport_nodes: {
        Row: TransportNode;
        Insert: Partial<TransportNode> &
          Pick<TransportNode, "name_az" | "name_ru" | "slug" | "type" | "latitude" | "longitude">;
        Update: Partial<TransportNode>;
        Relationships: [];
      };
      routes: {
        Row: Route;
        Insert: Partial<Route> & Pick<Route, "code" | "name_az" | "name_ru" | "type">;
        Update: Partial<Route>;
        Relationships: [];
      };
      route_nodes: {
        Row: RouteNode;
        Insert: Partial<RouteNode> & Pick<RouteNode, "route_id" | "node_id" | "sequence">;
        Update: Partial<RouteNode>;
        Relationships: [];
      };
      crowd_reports: {
        Row: CrowdReport;
        Insert: Partial<CrowdReport> & Pick<CrowdReport, "user_id" | "node_id" | "level">;
        Update: Partial<CrowdReport>;
        Relationships: [];
      };
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      trip_requests: {
        Row: TripRequest;
        Insert: Partial<TripRequest> &
          Pick<TripRequest, "origin_node_id" | "destination_node_id">;
        Update: Partial<TripRequest>;
        Relationships: [];
      };
      favorites: {
        Row: Favorite;
        Insert: Partial<Favorite> &
          Pick<Favorite, "user_id" | "title" | "origin_node_id" | "destination_node_id">;
        Update: Partial<Favorite>;
        Relationships: [];
      };
      node_crowd_status: {
        Row: NodeCrowdAggregate & { updated_at: string };
        Insert: Record<string, never>;
        Update: Record<string, never>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
      get_node_crowd_aggregates: {
        Args: { node_ids: string[] | null };
        Returns: NodeCrowdAggregate[];
      };
      get_node_recent_reports: {
        Args: { p_node_id: string };
        Returns: Array<{
          level: CrowdLevel;
          created_at: string;
          verified_near_node: boolean;
          trust_score: number;
        }>;
      };
      get_my_last_crowd_report_at: {
        Args: { p_node_id: string };
        Returns: string | null;
      };
      admin_reports_today: { Args: Record<string, never>; Returns: number };
      admin_active_users_today: { Args: Record<string, never>; Returns: number };
      admin_most_crowded_nodes: {
        Args: { p_limit?: number };
        Returns: Array<NodeCrowdAggregate & { name_az: string; name_ru: string }>;
      };
      admin_top_origins: {
        Args: { p_limit?: number };
        Returns: Array<{ node_id: string; name_az: string; name_ru: string; searches: number }>;
      };
      admin_top_destinations: {
        Args: { p_limit?: number };
        Returns: Array<{ node_id: string; name_az: string; name_ru: string; searches: number }>;
      };
      admin_top_od_pairs: {
        Args: { p_limit?: number };
        Returns: Array<{
          origin_id: string;
          origin_name_az: string;
          origin_name_ru: string;
          destination_id: string;
          destination_name_az: string;
          destination_name_ru: string;
          searches: number;
        }>;
      };
      admin_peak_search_windows: {
        Args: { p_limit?: number };
        Returns: Array<{ window_start: string; searches: number }>;
      };
    };
  };
};
