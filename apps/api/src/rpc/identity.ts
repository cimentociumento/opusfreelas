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
  updateIdentityProfileSchema,
<<<<<<< HEAD
  updateProviderSocialProfileSchema,
  uploadPortfolioImageSchema,
=======
>>>>>>> origin/feat/nativewind-piloto
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
      displayName: profile.display_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      serviceCategories: profile.service_categories ?? [],
      displayName: profile.display_name ?? null,
      avatarUrl: profile.avatar_url ?? null,
      municipality: profile.municipality ?? null,
      bio: profile.bio ?? null,
      yearsExperience: profile.years_experience ?? null,
      portfolioUrls: profile.portfolio_urls ?? [],
    });
  },
  "identity.updateProfile": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = updateIdentityProfileSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        { clerk_user_id: auth.userId, display_name: parsed.data.displayName, updated_at: new Date().toISOString() },
        { onConflict: "clerk_user_id" },
      )
      .select("clerk_user_id, display_name")
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({
      clerkUserId: data.clerk_user_id,
      displayName: data.display_name,
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

  "identity.updateProfile": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = updateIdentityProfileSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          clerk_user_id: auth.userId,
          display_name: parsed.data.displayName,
          municipality: parsed.data.municipality,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "clerk_user_id" }
      )
      .select("clerk_user_id, display_name, municipality")
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({
      clerkUserId: data.clerk_user_id,
      displayName: data.display_name,
      municipality: data.municipality,
    });
  },

  "identity.updateProviderSocialProfile": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = updateProviderSocialProfileSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("is_provider")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (fetchError || !profile?.is_provider) {
      return c.json({ error: "Only providers can update social profile" }, 403);
    }

    const { bio, yearsExperience, portfolioUrls } = parsed.data;
    // Anti-fraud gate: only paths minted by identity.uploadPortfolioImage (prefixed
    // with the caller's own userId) count — never trust caller-supplied strings here.
    const ownershipPrefix = `${auth.userId}/`;
    if (!portfolioUrls.every((url) => url.startsWith(ownershipPrefix))) {
      return c.json({ error: "Invalid portfolio paths" }, 400);
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        bio,
        years_experience: yearsExperience,
        portfolio_urls: portfolioUrls,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_user_id", auth.userId)
      .select("clerk_user_id, bio, years_experience, portfolio_urls")
      .single();

    if (error) {
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    return c.json({
      clerkUserId: data.clerk_user_id,
      bio: data.bio,
      yearsExperience: data.years_experience,
      portfolioUrls: data.portfolio_urls,
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

  "identity.uploadPortfolioImage": async (c: Context, input: unknown) => {
    const auth = getAuthUser(c);
    const parsed = uploadPortfolioImageSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();

    const { data: profile, error: fetchError } = await supabase
      .from("profiles")
      .select("is_provider")
      .eq("clerk_user_id", auth.userId)
      .single();

    if (fetchError || !profile?.is_provider) {
      return c.json({ error: "Only providers can upload portfolio images" }, 403);
    }

    const { imageBase64, contentType } = parsed.data;
    const ext = contentType === "image/png" ? "png" : contentType === "image/webp" ? "webp" : "jpg";
    // Ownership prefix from the JWT subject — never from the request body.
    const path = `${auth.userId}/${Date.now()}.${ext}`;
    const buffer = Buffer.from(imageBase64, "base64");

    const { error } = await supabase.storage
      .from("portfolio")
      .upload(path, buffer, { contentType, upsert: false });

    if (error) {
      return c.json({ error: "Upload failed", details: error.message }, 500);
    }

    return c.json({ path });
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