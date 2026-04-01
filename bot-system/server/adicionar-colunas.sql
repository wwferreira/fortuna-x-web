-- Adicionar colunas para credenciais da casa
ALTER TABLE usuarios_bot ADD COLUMN IF NOT EXISTS casa_url TEXT;
ALTER TABLE usuarios_bot ADD COLUMN IF NOT EXISTS casa_email TEXT;
ALTER TABLE usuarios_bot ADD COLUMN IF NOT EXISTS casa_senha TEXT;
