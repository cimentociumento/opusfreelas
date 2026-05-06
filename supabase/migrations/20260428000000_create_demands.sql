-- Create postgis extension if not exists (usually enabled by default in Supabase, but good to be explicit)
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums for demand lifecycle
CREATE TYPE public.demand_status AS ENUM ('aberta', 'em_contato', 'encerrada');
CREATE TYPE public.demand_urgency AS ENUM ('baixa', 'media', 'alta', 'urgente_hoje');

-- Demands table
CREATE TABLE public.demands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id text NOT NULL REFERENCES public.profiles(clerk_user_id),
  service_type text NOT NULL,
  description text NOT NULL,
  municipality text NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  urgency public.demand_urgency NOT NULL DEFAULT 'media',
  visibility_radius integer NOT NULL DEFAULT 10, -- in km
  status public.demand_status NOT NULL DEFAULT 'aberta',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Spatial index for radius queries
CREATE INDEX demands_location_idx ON public.demands USING GIST (location);
CREATE INDEX demands_contractor_id_idx ON public.demands (contractor_id);
CREATE INDEX demands_status_idx ON public.demands (status);

-- RLS
ALTER TABLE public.demands ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can see open demands (discovery)
CREATE POLICY "demands_select_all_active"
  ON public.demands
  FOR SELECT
  TO authenticated
  USING (status != 'encerrada' OR contractor_id = (auth.jwt()->>'sub'));

-- Contractors can insert their own demands
CREATE POLICY "demands_insert_own"
  ON public.demands
  FOR INSERT
  TO authenticated
  WITH CHECK (contractor_id = (auth.jwt()->>'sub'));

-- Contractors can update their own demands
CREATE POLICY "demands_update_own"
  ON public.demands
  FOR UPDATE
  TO authenticated
  USING (contractor_id = (auth.jwt()->>'sub'))
  WITH CHECK (contractor_id = (auth.jwt()->>'sub'));

-- Updated at trigger (optional but recommended)
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_demands_updated
  BEFORE UPDATE ON public.demands
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Function for visible demands discovery
CREATE OR REPLACE FUNCTION public.get_visible_demands(
  user_lat float8,
  user_lng float8,
  filter_municipality text DEFAULT NULL
)
RETURNS SETOF public.demands
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.demands
  WHERE 
    status = 'aberta'
    AND ST_DWithin(
      location,
      ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
      visibility_radius * 1000
    )
    AND (filter_municipality IS NULL OR municipality = filter_municipality)
  ORDER BY 
    location <-> ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography ASC;
END;
$$;
