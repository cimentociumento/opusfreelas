-- Bucket de fotos de portfólio do prestador. Leitura pública (as fotos
-- aparecem na busca do contratante); escrita só do dono, sob seu próprio
-- prefixo {clerk_user_id}/ — mesmo padrão de ownership das policies de profiles.
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio', 'portfolio', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "portfolio_read_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'portfolio');

CREATE POLICY "portfolio_insert_own"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')
  );

CREATE POLICY "portfolio_update_own"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')
  );

CREATE POLICY "portfolio_delete_own"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'portfolio'
    AND (storage.foldername(name))[1] = (auth.jwt()->>'sub')
  );
