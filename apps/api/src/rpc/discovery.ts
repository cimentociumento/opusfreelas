import { z } from "zod";
import type { Context } from "hono";
import { getSupabaseAdmin } from "../lib/supabase.js";
import { providerSearchSchema } from "@amauc/shared";

type ProviderResult = {
  clerkUserId: string;
  isProvider: boolean;
  serviceCategories: string[];
  distanceMeters: number;
};

export const discoveryHandlers = {
  "discovery.searchProviders": async (c: Context, input: unknown) => {
    const parsed = providerSearchSchema.safeParse(input);
    if (!parsed.success) {
      return c.json({ error: "Invalid input", details: parsed.error.flatten() }, 400);
    }

    const { latitude, longitude, category, radius } = parsed.data;
    const supabase = getSupabaseAdmin();

    const { data, error } = await supabase.rpc("search_providers", {
      user_lat: latitude,
      user_lng: longitude,
      search_category: category || null,
      radius_km: radius
    });

    if (error) {
      console.error("Error searching providers:", error);
      return c.json({ error: "Database error", details: error.message }, 500);
    }

    const results: ProviderResult[] = (data || []).map((row: any) => ({
      clerkUserId: row.clerk_user_id,
      isProvider: row.is_provider,
      serviceCategories: row.service_categories,
      distanceMeters: row.distance_meters
    }));

    return c.json(results);
  }
};
