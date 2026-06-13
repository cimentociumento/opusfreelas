-- Update demand_status enum
ALTER TYPE public.demand_status ADD VALUE 'concluida';
ALTER TYPE public.demand_status ADD VALUE 'cancelada';

-- Note: We don't remove 'encerrada' immediately to avoid breaking existing data if any, 
-- but we should map it to 'concluida' or 'cancelada' in the future.

-- Update RLS policy for selecting demands
-- Allow seeing 'concluida' and 'cancelada' only for the owner
DROP POLICY IF EXISTS "demands_select_all_active" ON public.demands;
CREATE POLICY "demands_select_all_active"
  ON public.demands
  FOR SELECT
  TO authenticated
  USING (
    (status NOT IN ('concluida', 'cancelada', 'encerrada')) 
    OR contractor_id = (auth.jwt()->>'sub')
  );
