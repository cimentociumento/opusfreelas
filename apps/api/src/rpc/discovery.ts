import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";
import { getAuthUser } from "../middleware/clerk.js";
import { 
  providerSearchSchema, 
  ProviderResult,
  serviceCategorySchema
} from "@amauc/shared";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  }
  return createClient(url, serviceRoleKey);
}

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
