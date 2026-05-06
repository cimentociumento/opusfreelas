import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import type { Context } from "hono";

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

const providerSearchSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  category: z.enum(serviceCategories).optional(),
  radius: z.number().int().min(1).max(200).default(50),
});

type ProviderResult = {
  clerkUserId: string;
  isProvider: boolean;
  serviceCategories: string[];
  distanceMeters: number;
};

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
