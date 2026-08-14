import type { Context } from "hono";
import { assertCanActAs } from "@amauc/shared";
import { getAuthUser } from "../middleware/clerk.js";
import { getSupabaseAdmin } from "./supabase.js";

export type ProfileRow = {
  clerk_user_id: string;
  is_contractor: boolean;
  is_provider: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  service_categories?: string[];
  display_name?: string | null;
  avatar_url?: string | null;
  municipality?: string | null;
  bio?: string | null;
  years_experience?: number | null;
  portfolio_urls?: string[] | null;
};

export async function getProfileByClerkUserId(userId: string): Promise<ProfileRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
<<<<<<< HEAD
    .select(
      "clerk_user_id, is_contractor, is_provider, service_categories, display_name, avatar_url, municipality, bio, years_experience, portfolio_urls"
    )
=======
    .select("clerk_user_id, is_contractor, is_provider, display_name, avatar_url, service_categories")
>>>>>>> origin/feat/nativewind-piloto
    .eq("clerk_user_id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  return (
    data ?? {
      clerk_user_id: userId,
      is_contractor: true,
      is_provider: false,
      display_name: null,
      avatar_url: null,
      service_categories: [],
      display_name: null,
      avatar_url: null,
      municipality: null,
      bio: null,
      years_experience: null,
      portfolio_urls: [],
    }
  );
}

export async function ensureProfileInDb(userId: string): Promise<ProfileRow> {
  const existing = await getProfileByClerkUserId(userId);
  const supabase = getSupabaseAdmin();

  const { data: row } = await supabase
    .from("profiles")
    .select("clerk_user_id, is_contractor, is_provider")
    .eq("clerk_user_id", userId)
    .maybeSingle<ProfileRow>();

  if (row) {
    return row;
  }

  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        clerk_user_id: userId,
        is_contractor: existing.is_contractor,
        is_provider: existing.is_provider,
      },
      { onConflict: "clerk_user_id" }
    )
    .select("clerk_user_id, is_contractor, is_provider")
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function upsertRoles(
  userId: string,
  payload: { isContractor: boolean; isProvider: boolean }
): Promise<ProfileRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        clerk_user_id: userId,
        is_contractor: payload.isContractor,
        is_provider: payload.isProvider,
      },
      { onConflict: "clerk_user_id" }
    )
    .select("clerk_user_id, is_contractor, is_provider")
    .single<ProfileRow>();

  if (error) {
    throw error;
  }

  return data;
}

export async function requireContractorRole(c: Context): Promise<Response | null> {
  const auth = getAuthUser(c);
  const profile = await getProfileByClerkUserId(auth.userId);

  try {
    assertCanActAs(
      {
        roles: {
          isContractor: profile.is_contractor,
          isProvider: profile.is_provider,
        },
      },
      "contractor"
    );
  } catch {
    return c.json({ error: "Forbidden", reason: "Contractor role required" }, 403);
  }

  return null;
}

export async function requireProviderRole(c: Context): Promise<Response | null> {
  const auth = getAuthUser(c);
  const profile = await getProfileByClerkUserId(auth.userId);

  try {
    assertCanActAs(
      {
        roles: {
          isContractor: profile.is_contractor,
          isProvider: profile.is_provider,
        },
      },
      "provider"
    );
  } catch {
    return c.json({ error: "Forbidden", reason: "Provider role required" }, 403);
  }

  return null;
}
