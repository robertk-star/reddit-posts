import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "build-time-placeholder";

export function getSupabaseEnvStatus() {
  const hasUrl = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const hasKey = Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  const urlLooksValid = hasUrl && /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(process.env.NEXT_PUBLIC_SUPABASE_URL || "");

  return {
    hasUrl,
    hasKey,
    urlLooksValid,
    usingPlaceholderUrl: supabaseUrl === "https://example.supabase.co",
    usingPlaceholderKey: serviceRoleKey === "build-time-placeholder"
  };
}

export function assertSupabaseRuntimeEnv() {
  const status = getSupabaseEnvStatus();
  if (!status.hasUrl) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL in Vercel environment variables");
  if (!status.urlLooksValid) throw new Error("NEXT_PUBLIC_SUPABASE_URL does not look like a valid Supabase project URL");
  if (!status.hasKey) throw new Error("Missing SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables");
}

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});