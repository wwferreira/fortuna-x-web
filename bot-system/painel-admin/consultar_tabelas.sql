-- EXECUTE ESTE SQL NO SUPABASE SQL EDITOR

-- 1. Criar uma view para acessar os usuários via API
CREATE OR REPLACE VIEW public.usuarios_view AS
SELECT 
    id,
    email,
    raw_user_meta_data->>'nome' as nome,
    raw_user_meta_data->>'token' as token,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY email;

-- 2. Habilitar RLS (Row Level Security) na view
ALTER VIEW public.usuarios_view SET (security_invoker = true);

-- 3. Dar permissão de leitura para todos
GRANT SELECT ON public.usuarios_view TO anon, authenticated, service_role;

-- 4. Verificar se funcionou
SELECT * FROM public.usuarios_view;


-- Se ainda der erro 404, execute também:

-- Garantir que a view está no schema public
DROP VIEW IF EXISTS public.usuarios_view;

CREATE VIEW public.usuarios_view AS
SELECT 
    id,
    email,
    raw_user_meta_data->>'nome' as nome,
    raw_user_meta_data->>'token' as token,
    created_at,
    last_sign_in_at
FROM auth.users
ORDER BY email;

-- Garantir permissões
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON public.usuarios_view TO anon, authenticated, service_role;

-- Verificar se a view está acessível
SELECT * FROM public.usuarios_view LIMIT 5;

-- Ver estrutura da tabela estrategias
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'estrategias'
ORDER BY ordinal_position;

-- Ver dados das estratégias
SELECT * FROM estrategias;
