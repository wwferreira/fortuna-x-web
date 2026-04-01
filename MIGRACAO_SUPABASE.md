# 🚀 Guia de Migração para Supabase

## 📋 Visão Geral

O sistema foi preparado para funcionar tanto com servidor local (localhost) quanto com Supabase. A migração é simples e pode ser feita alterando apenas uma configuração.

## 🔧 Configuração Atual

**Modo Atual:** Servidor Local (localhost:3000)

O arquivo `bot-system/painel-admin/config.js` controla qual API usar:

```javascript
const CONFIG = {
    USE_SUPABASE: false, // ← Mude para true quando migrar
    
    SUPABASE: {
        URL: 'https://vfmzxgznrgwnzghqaaau.supabase.co',
        KEY: 'sua_chave_aqui'
    },
    
    LOCAL: {
        URL: 'http://localhost:3000/api/admin'
    }
};
```

## 📊 Estrutura do Banco Supabase

### Tabela: `estrategias`

```sql
CREATE TABLE estrategias (
  id BIGSERIAL PRIMARY KEY,
  nome TEXT NOT NULL,
  chave TEXT UNIQUE NOT NULL,
  descricao TEXT,
  legendas JSONB DEFAULT '[]',
  gatilhos JSONB DEFAULT '[]',
  numeros INTEGER[] DEFAULT '{}',
  ativa BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_estrategias_chave ON estrategias(chave);
CREATE INDEX idx_estrategias_ativa ON estrategias(ativa);
```

### Tabela: `usuarios`

```sql
CREATE TABLE usuarios (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  senha TEXT NOT NULL,
  ativo BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  status_bot TEXT DEFAULT 'deslogado',
  bot_ligado BOOLEAN DEFAULT false,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_ativo ON usuarios(ativo);
```

## 🔄 Passo a Passo da Migração

### 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Crie uma conta (se não tiver)
3. Clique em "New Project"
4. Preencha:
   - Nome do projeto: `rei-dos-bots`
   - Database Password: (escolha uma senha forte)
   - Region: South America (São Paulo)
5. Aguarde a criação (2-3 minutos)

### 2. Criar as Tabelas

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **New Query**
3. Cole o SQL acima (tabelas `estrategias` e `usuarios`)
4. Clique em **Run** para executar

### 3. Obter as Credenciais

1. Vá em **Settings** → **API**
2. Copie:
   - **Project URL** (ex: https://xxxxx.supabase.co)
   - **anon/public key** (chave pública)
   - **service_role key** (chave de serviço - use esta!)

### 4. Atualizar config.js

Abra `bot-system/painel-admin/config.js` e atualize:

```javascript
const CONFIG = {
    USE_SUPABASE: true, // ← Mude para true
    
    SUPABASE: {
        URL: 'https://SEU_PROJETO.supabase.co', // ← Cole sua URL
        KEY: 'SUA_SERVICE_ROLE_KEY_AQUI' // ← Cole sua chave
    },
    
    LOCAL: {
        URL: 'http://localhost:3000/api/admin'
    }
};
```

### 5. Configurar Políticas de Segurança (RLS)

Por padrão, o Supabase tem Row Level Security (RLS) ativado. Para desenvolvimento, você pode desativar:

```sql
-- Desativar RLS (apenas para desenvolvimento)
ALTER TABLE estrategias DISABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios DISABLE ROW LEVEL SECURITY;
```

**Para produção**, configure políticas adequadas:

```sql
-- Habilitar RLS
ALTER TABLE estrategias ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política: Admin pode fazer tudo
CREATE POLICY "Admin full access" ON estrategias
  FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Política: Usuários podem ler estratégias ativas
CREATE POLICY "Users can read active strategies" ON estrategias
  FOR SELECT
  USING (ativa = true);
```

### 6. Migrar Dados Existentes

Se você já tem dados no servidor local, exporte e importe:

**Exportar do Local:**
```bash
# No servidor local, acesse:
http://localhost:3000/api/admin/estrategias

# Copie o JSON retornado
```

**Importar no Supabase:**
```javascript
// No console do navegador (com Supabase configurado):
const estrategias = [/* cole o JSON aqui */];

for (const est of estrategias) {
    await fetch('https://SEU_PROJETO.supabase.co/rest/v1/estrategias', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'apikey': 'SUA_KEY',
            'Authorization': 'Bearer SUA_KEY'
        },
        body: JSON.stringify(est)
    });
}
```

### 7. Testar a Migração

1. Abra o painel admin: http://localhost:3000/admin
2. Vá em "Gerenciar Estratégias"
3. Verifique o badge no canto superior direito:
   - ☁️ Supabase (Online) = Conectado ao Supabase
   - 💻 Servidor Local = Conectado ao localhost
4. Crie uma estratégia de teste
5. Verifique no Supabase se foi salva (Table Editor)

## 🔀 Alternando Entre Local e Supabase

Você pode alternar facilmente entre os dois modos:

**Usar Servidor Local:**
```javascript
USE_SUPABASE: false
```

**Usar Supabase:**
```javascript
USE_SUPABASE: true
```

## 📱 Atualizando Outros Painéis

### Painel de Usuário

Crie `bot-system/painel-usuario/config.js` similar:

```javascript
const CONFIG = {
    USE_SUPABASE: false,
    SUPABASE: {
        URL: 'https://SEU_PROJETO.supabase.co',
        KEY: 'SUA_KEY'
    },
    LOCAL: {
        URL: 'http://localhost:3000/api'
    }
};
```

### Site Principal (Bot Online)

Atualize `script.js`:

```javascript
const BOT_API = CONFIG.USE_SUPABASE 
    ? `${CONFIG.SUPABASE.URL}/rest/v1` 
    : 'http://localhost:3000/api';
```

## 🌐 Vantagens do Supabase

✅ **Hospedagem na Nuvem**
- Acesse de qualquer lugar
- Não precisa manter servidor rodando

✅ **Escalabilidade**
- Suporta milhares de usuários
- Backup automático

✅ **Segurança**
- SSL/HTTPS automático
- Autenticação integrada
- Row Level Security

✅ **Recursos Extras**
- Realtime (WebSocket automático)
- Storage para arquivos
- Edge Functions
- Dashboard de administração

## 💰 Planos Supabase

**Free Tier (Gratuito):**
- 500 MB de banco de dados
- 1 GB de storage
- 2 GB de transferência
- Perfeito para começar!

**Pro ($25/mês):**
- 8 GB de banco de dados
- 100 GB de storage
- 50 GB de transferência
- Suporte prioritário

## 🐛 Troubleshooting

### Erro: "Failed to fetch"
- Verifique se a URL do Supabase está correta
- Confirme que a chave API está correta
- Verifique se as tabelas foram criadas

### Erro: "Row Level Security"
- Desative RLS para desenvolvimento
- Configure políticas adequadas para produção

### Dados não aparecem
- Verifique no Table Editor do Supabase
- Confirme que `USE_SUPABASE: true`
- Veja o console do navegador para erros

## 📞 Suporte

Dúvidas sobre migração:
- Documentação Supabase: https://supabase.com/docs
- Email: suporte@reidosbots.net.br

## 🎯 Checklist de Migração

- [ ] Criar projeto no Supabase
- [ ] Criar tabelas (estrategias, usuarios)
- [ ] Copiar credenciais (URL e KEY)
- [ ] Atualizar config.js
- [ ] Configurar RLS (desativar para dev)
- [ ] Migrar dados existentes
- [ ] Testar criação de estratégia
- [ ] Testar login de usuário
- [ ] Verificar badge "☁️ Supabase"
- [ ] Atualizar outros painéis
- [ ] Documentar credenciais (seguro!)

## 🔐 Segurança

**IMPORTANTE:**
- Nunca commite a `service_role key` no Git
- Use variáveis de ambiente em produção
- Configure RLS adequadamente
- Use HTTPS sempre
- Rotacione chaves periodicamente

## 🚀 Próximos Passos

Após migrar para Supabase:
1. Configure autenticação de usuários
2. Implemente realtime para stats
3. Adicione storage para logs
4. Configure Edge Functions para lógica complexa
5. Monitore uso no dashboard Supabase
