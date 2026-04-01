-- EXECUTE ESTE SCRIPT NO SQL EDITOR DO SEU SUPABASE
-- Isso vai criar as colunas necessárias para a trava de segurança simultânea

ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS active_client_id TEXT,
ADD COLUMN IF NOT EXISTS active_updated_at TIMESTAMP WITH TIME ZONE;

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_usuarios_active_client_id ON public.usuarios(active_client_id);

-- Garantir que a tabela permite update pela API
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- Criar política que permite usuários atualizarem seus próprios dados
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios dados" ON public.usuarios;
CREATE POLICY "Usuários podem atualizar seus próprios dados" 
ON public.usuarios FOR ALL 
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Dar permissões para as roles do Supabase
GRANT ALL ON public.usuarios TO authenticated;
GRANT ALL ON public.usuarios TO service_role;
