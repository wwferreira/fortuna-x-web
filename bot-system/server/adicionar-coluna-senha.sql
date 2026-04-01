-- Adicionar coluna senha na tabela usuarios_bot
ALTER TABLE usuarios_bot 
ADD COLUMN IF NOT EXISTS senha TEXT;

-- Atualizar usuário de teste com senha
UPDATE usuarios_bot 
SET senha = 'teste123' 
WHERE email = 'teste@teste.com';

-- Você pode adicionar mais usuários aqui
-- INSERT INTO usuarios_bot (email, senha, ativo, config)
-- VALUES ('seu@email.com', 'suasenha', true, '{}'::jsonb)
-- ON CONFLICT (email) DO UPDATE SET senha = EXCLUDED.senha;
