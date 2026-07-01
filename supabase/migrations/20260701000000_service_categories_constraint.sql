-- service_categories era validado apenas no Zod (@amauc/shared serviceCategorySchema).
-- Sem constraint no Postgres, um insert/update direto via RPC/SQL podia gravar
-- qualquer string arbitraria na coluna. Espelha a mesma lista de valores aqui
-- como ultima linha de defesa (mesmo padrao ja usado pelas RLS policies).
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_service_categories_allowed_values
  CHECK (
    service_categories <@ ARRAY[
      'Roçada / Capina',
      'Diarista / Faxina',
      'Operador de Máquina Agrícola',
      'Serviços Gerais / Pequenos Reparos',
      'Pedreiro / Servente',
      'Pintura',
      'Eletricista / Encanador',
      'Cuidado com Animais'
    ]::text[]
  );
