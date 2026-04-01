-- Tabela para armazenar estratégias de apostas
CREATE TABLE IF NOT EXISTS estrategias (
  id BIGSERIAL PRIMARY KEY,
  chave TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  numeros JSONB DEFAULT '[]'::jsonb,
  gatilhos JSONB DEFAULT '[]'::jsonb,
  legendas JSONB DEFAULT '[]'::jsonb,
  ativa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para busca rápida por chave
CREATE INDEX IF NOT EXISTS idx_estrategias_chave ON estrategias(chave);
CREATE INDEX IF NOT EXISTS idx_estrategias_ativa ON estrategias(ativa);

-- Habilitar RLS (Row Level Security)
ALTER TABLE estrategias ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem ler estratégias ativas
CREATE POLICY "Todos podem ver estratégias ativas"
  ON estrategias
  FOR SELECT
  USING (ativa = true);

-- Política: Service role pode fazer tudo (para o servidor/admin)
CREATE POLICY "Service role tem acesso total às estratégias"
  ON estrategias
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_estrategias_updated_at
  BEFORE UPDATE ON estrategias
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Inserir estratégias de exemplo (opcional)
INSERT INTO estrategias (chave, nome, descricao, numeros, gatilhos, legendas, ativa)
VALUES 
  ('QUENTES', '🔥 Números Quentes', 'Aposta nos números que mais saíram recentemente', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true),
  ('FRIOS', '❄️ Números Frios', 'Aposta nos números que menos saíram recentemente', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true),
  ('AMBOS', '🔥❄️ Quentes e Frios', 'Combina números quentes e frios', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, true)
ON CONFLICT (chave) DO NOTHING;
