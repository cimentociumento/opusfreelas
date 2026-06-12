-- Permite que o contratante dono exclua suas próprias demandas via cliente Supabase autenticado.
-- A API Hono usa service role e valida ownership no servidor; esta política cobre acesso direto.
CREATE POLICY "demands_delete_own"
  ON public.demands
  FOR DELETE
  TO authenticated
  USING (contractor_id = (auth.jwt()->>'sub'));
