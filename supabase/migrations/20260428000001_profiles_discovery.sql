-- Migration for Phase 3: Local Discovery
-- Adds categories and location to profiles for provider discovery

-- Add columns to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location geography(POINT, 4326);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS service_categories text[] DEFAULT '{}';

-- Create spatial index for radius queries
CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles USING GIST (location);

-- Create GIN index for category array searches
CREATE INDEX IF NOT EXISTS profiles_service_categories_idx ON public.profiles USING GIN (service_categories);

-- Function for provider discovery
-- Finds providers within a radius that have a specific category
CREATE OR REPLACE FUNCTION public.search_providers(
  user_lat float8,
  user_lng float8,
  search_category text DEFAULT NULL,
  radius_km integer DEFAULT 50
)
RETURNS TABLE (
  clerk_user_id text,
  is_provider boolean,
  service_categories text[],
  distance_meters float8
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.clerk_user_id,
    p.is_provider,
    p.service_categories,
    ST_Distance(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography
    ) as distance_meters
  FROM public.profiles p
  WHERE 
    p.is_provider = true
    AND (search_category IS NULL OR search_category = ANY(p.service_categories))
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      radius_km * 1000
    )
  ORDER BY distance_meters ASC;
END;
$$;
