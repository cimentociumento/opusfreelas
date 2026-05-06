import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Context } from "hono";
import { getAuthUser } from "../middleware/clerk.js";

const rolesUpdateSchema = z.object({
  isContractor: z.boolean(),
  isProvider: z.boolean(),
});

const serviceCategories = [
  "Roçada / Capina",
  "Diarista / Faxina",
  "Operador de Máquina Agrícola",
  "Serviços Gerais / Pequenos Reparos",
  "Pedreiro / Servente",
  "Pintura",
  "Eletricista / Encanador",
  "Cuidado com Animais",
] as const;

const updateProviderProfileSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  serviceCategories: z.array(z.enum(serviceCategories)),
});

const providerOnlyInputSchema = z.object({
  message: z.string().optional(),
});

type ProfileRow = {
  clerk_user_id: string;
  is_contractor: boolean;
  is_provider: boolean;
};

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, serviceRoleKey);
}

async function getProfileByClerkUserId(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("profiles")
    .select("clerk_user_id, is_contractor, is_provider")
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
    }
  );
}

async function upsertRoles(userId: string, payload: z.infer<typeof rolesUpdateSchema>) {
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

export const identityHandlers = {
  "identity.getProfile": async (c: Context) => {
    const auth = getAuthUser(c);
    const profile = await getProfileByClerkUserId(auth.userId);
    return c.json({
      clerkUserId: profile.clerk_user_id,
      isContractor: profile.is_contractor,
      isProvider: profile.is_provider,
    });
  },
  "identity.updateRoles": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = rolesUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const profile = await upsertRoles(auth.userId, parsed.data);
    return c.json({
      clerkUserId: profile.clerk_user_id,
      isContractor: profile.is_contractor,
      isProvider: profile.is_provider,
    });
  },

  "identity.updateProviderProfile": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = updateProviderProfileSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { latitude, longitude, serviceCategories } = parsed.data;
    const supabase = getSupabaseAdmin();

    // Verify user is a provider
    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("is_provider")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (fetchError || !profile?.is_provider) {
      return c.json({ error: "Only providers can update discovery profile" }, 403);
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        location: `POINT(${longitude} ${latitude})`,
        service_categories: serviceCategories,
        updated_at: new Date().toISOString()
      })
      .eq("clerk_user_id", auth.userId)
      .select()
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({
      clerkUserId: data.clerk_user_id,
      isProvider: data.is_provider,
      serviceCategories: data.service_categories
    });
  },

  "identity.providerOnlyPing": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = providerOnlyInputSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const profile = await getProfileByClerkUserId(auth.userId);
    if (!profile.is_provider) {
      return c.json({ error: "Forbidden", reason: "Provider role required" }, 403);
    }

    return c.json({ ok: true, message: parsed.data.message ?? "provider-access-granted" });
  },
};