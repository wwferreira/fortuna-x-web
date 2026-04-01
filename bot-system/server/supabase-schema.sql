-- Tabela para armazenar usuários do bot
CREATE TABLE IF NOT EXISTS usuarios_bot (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}'::jsonb,
  stats JSONB DEFAULT '{}'::jsonb,
  bot_ligado BOOLEAN DEFAULT false,
  status_bot TEXT DEFAULT 'deslogado',
  casa_url TEXT,
  casa_email TEXT,
  casa_senha TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por email
CREATE INDEX IF NOT EXISTS idx_usuarios_bot_email ON usuarios_bot(email);

-- Habilitar RLS (Row Level Security)
ALTER TABLE usuarios_bot ENABLE ROW LEVEL SECURITY;

-- Política: Usuários podem ver e editar apenas seus próprios dados
CREATE POLICY "Usuários podem ver seus próprios dados"
  ON usuarios_bot
  FOR SELECT
  USING (auth.email() = email);

CREATE POLICY "Usuários podem atualizar seus próprios dados"
  ON usuarios_bot
  FOR UPDATE
  USING (auth.email() = email);

-- Política: Service role pode fazer tudo (para o servidor)
CREATE POLICY "Service role tem acesso total"
  ON usuarios_bot
  FOR ALL
  USING (auth.role() = 'service_role');

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_usuarios_bot_updated_at
  BEFORE UPDATE ON usuarios_bot
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuário de teste (opcional)
INSERT INTO usuarios_bot (email, ativo, config)
VALUES ('teste@teste.com', true, '{"estrategia": "QUENTES", "valor_ficha": 1, "stop_win": 50, "stop_loss": 50}'::jsonb)
ON CONFLICT (email) DO NOTHING;
