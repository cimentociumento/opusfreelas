import { z } from "zod";
import type { Context } from "hono";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { toPortfolioPublicUrls, getContactWithClerkFallback } from "../lib/profile.js";
import {
  providerSearchSchema,
  getProviderProfileSchema,
  type ProviderResult,
  type ProviderProfile,
} from "@amauc/shared";

export const discoveryHandlers = {
  "discovery.searchProviders": async (c: Context, input: unknown) => {
    const parsed = providerSearchSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { latitude, longitude, category, municipality, radius } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("search_providers", {
      user_lat: latitude,
      user_lng: longitude,
      search_category: category || null,
      radius_km: radius,
      filter_municipality: municipality || null
    });

    if (error) {
      console.error("[discovery.searchProviders] Database error:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    const results: ProviderResult[] = (data || []).map((row: any) => ({
      clerkUserId: row.clerk_user_id,
      isProvider: row.is_provider,
      displayName: row.display_name ?? null,
      avatarUrl: row.avatar_url ?? null,
      municipality: row.municipality ?? null,
      bio: row.bio ?? null,
      yearsExperience: row.years_experience ?? null,
      portfolioUrls: toPortfolioPublicUrls(supabase, row.portfolio_urls ?? []),
      serviceCategories: row.service_categories,
      phone: row.phone ?? null,
      completedServicesCount: row.completed_services_count ?? 0,
      ratingAverage: row.rating_average ?? 5.0,
      ratingCount: row.rating_count ?? 0,
      distanceMeters: row.distance_meters
    }));

    return c.json(results);
  },

  "discovery.getProviderProfile": async (c: Context, input: unknown) => {
    const parsed = getProviderProfileSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const supabase = getSupabaseAdmin();
    const { data: row, error } = await supabase
      .from("profiles")
      .select(
        "clerk_user_id, is_provider, display_name, avatar_url, municipality, bio, years_experience, portfolio_urls, service_categories, phone, completed_services_count, rating_average, rating_count"
      )
      .eq("clerk_user_id", parsed.data.clerkUserId)
      .eq("is_provider", true)
      .maybeSingle();

    if (error) {
      console.error("[discovery.getProviderProfile] Database error:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }
    if (!row) {
      return c.json({ error: "Provider not found" }, 404);
    }

    const phone = row.phone ?? (await getContactWithClerkFallback(supabase, row.clerk_user_id)).phone;

    const profile: ProviderProfile = {
      clerkUserId: row.clerk_user_id,
      isProvider: row.is_provider,
      displayName: row.display_name ?? null,
      avatarUrl: row.avatar_url ?? null,
      municipality: row.municipality ?? null,
      bio: row.bio ?? null,
      yearsExperience: row.years_experience ?? null,
      portfolioUrls: toPortfolioPublicUrls(supabase, row.portfolio_urls ?? []),
      serviceCategories: row.service_categories,
      phone: phone ?? null,
      completedServicesCount: row.completed_services_count ?? 0,
      ratingAverage: row.rating_average ?? 5.0,
      ratingCount: row.rating_count ?? 0,
    };

    return c.json(profile);
  }
};
