import { z } from "zod";
import type { Context } from "hono";
import { getAuthUser } from "../middleware/clerk.js";
import { getSupabaseAdmin } from "../lib/supabase.js";
import {
  getProfileByClerkUserId,
  upsertRoles,
} from "../lib/profile.js";
import {
  profileRoleFlagsSchema,
  updateProviderProfileSchema,
} from "@amauc/shared";

const providerOnlyInputSchema = z.object({
  message: z.string().optional(),
});

export const identityHandlers = {
  "identity.getProfile": async (c: Context) => {
    const auth = getAuthUser(c);
    const profile = await getProfileByClerkUserId(auth.userId);
    return c.json({
      clerkUserId: profile.clerk_user_id,
      isContractor: profile.is_contractor,
      isProvider: profile.is_provider,
      serviceCategories: profile.service_categories ?? [],
    });
  },
  "identity.updateRoles": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = profileRoleFlagsSchema.safeParse(input);
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