import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let adminClient:
  | SupabaseClient
  | null = null;

export function getSupabaseAdmin() {
  if (adminClient) {
    return adminClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL;

  const secretKey =
    process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "SUPABASE_URL is missing."
    );
  }

  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY is missing."
    );
  }

  adminClient =
    createClient(
      supabaseUrl,
      secretKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      }
    );

  return adminClient;
}