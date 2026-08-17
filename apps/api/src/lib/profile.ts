import type { Context } from "hono";
import { assertCanActAs } from "@amauc/shared";
import { getAuthUser, getClerkClient } from "../middleware/clerk.js";
import { getSupabaseAdmin } from "./supabase.js";

export type ProfileRow = {
  clerk_user_id: string;
  is_contractor: boolean;
  is_provider: boolean;
  display_name?: string | null;
  avatar_url?: string | null;
  service_categories?: string[];
  municipality?: string | null;
  bio?: string | null;
  years_experience?: number | null;
  portfolio_urls?: string[] | null;
  phone?: string | null;
  completed_services_count?: number;
  rating_average?: number;
  rating_count?: number;
};

// portfolio_urls guarda o path bruto do storage (ex.: "{clerk_user_id}/123.png"),
// não a URL — o bucket "portfolio" é público (20260813000001_portfolio_storage.sql),
// então getPublicUrl é síncrono e não bate na rede.
export function toPortfolioPublicUrls(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  paths: string[]
): string[] {
  return paths.map((path) => supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl);
}

// profiles.phone só é preenchido quando alguém digita manualmente num campo
// "Telefone/WhatsApp" (hoje só existe em profile/provider-setup.tsx) — um
// contratante que se cadastra por OTP de telefone nunca passa por lá, então
// o Clerk tem o número verificado e o Supabase nunca recebe cópia. Aqui a
// gente busca uma vez no Clerk quando falta e grava de volta, pra próximas
// leituras não precisarem mais dessa chamada extra.
export async function getContactWithClerkFallback(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  clerkUserId: string
): Promise<{ displayName: string | null; phone: string | null }> {
  const { data } = await supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  const displayName = data?.display_name ?? null;
  if (data?.phone) {
    return { displayName, phone: data.phone };
  }

  try {
    const clerk = getClerkClient();
    const user = await clerk.users.getUser(clerkUserId);
    const primary = user.phoneNumbers.find((p) => p.id === user.primaryPhoneNumberId);
    const phone = primary?.phoneNumber ?? user.phoneNumbers[0]?.phoneNumber ?? null;

    if (phone) {
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ phone })
        .eq("clerk_user_id", clerkUserId);
      if (updateError) {
        console.error("[profile.getContactWithClerkFallback] falha ao gravar phone:", updateError);
      }
    }

    return { displayName, phone };
  } catch (error) {
    console.error("[profile.getContactWithClerkFallback] busca no Clerk falhou:", error);
    return { displayName, phone: null };
  }
}

export async function getProfileByClerkUserId(userId: string): Promise<ProfileRow> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "clerk_user_id, is_contractor, is_provider, service_categories, display_name, avatar_url, municipality, bio, years_experience, portfolio_urls, phone, completed_services_count, rating_average, rating_count"
    )
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
      municipality: null,
      bio: null,
      years_experience: null,
      portfolio_urls: [],
      phone: null,
      completed_services_count: 0,
      rating_average: 5.0,
      rating_count: 0,
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
