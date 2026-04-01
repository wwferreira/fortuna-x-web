# 🚀 Instalação do Sistema com Supabase

## 1. Configurar Supabase

### 1.1. Criar a tabela no Supabase

1. Acesse seu projeto no Supabase: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Cole o conteúdo do arquivo `server/supabase-schema.sql`
4. Clique em **Run** para executar

### 1.2. Criar usuários no Supabase Auth

Você tem 2 opções:

**Opção A: Via Dashboard (Recomendado)**
1. Vá em **Authentication** > **Users**
2. Clique em **Add user**
3. Preencha:
   - Email: `usuario@exemplo.com`
   - Password: `senha123`
   - Auto Confirm User: ✅ (marque esta opção)
4. Clique em **Create user**

**Opção B: Via SQL**
```sql
-- Criar usuário admin
SELECT auth.create_user(
  email := 'admin@reidosbots.com',
  password := 'admin123',
  email_confirm := true
);

-- Criar usuário teste
SELECT auth.create_user(
  email := 'teste@teste.com',
  password := 'senha123',
  email_confirm := true
);
```

### 1.3. Inserir dados na tabela usuarios_bot

Após criar os usuários no Auth, insira os dados na tabela:

```sql
-- Inserir dados do usuário teste
INSERT INTO usuarios_bot (email, ativo, config)
VALUES (
  'teste@teste.com',
  true,
  '{
    "estrategia": "QUENTES",
    "valor_ficha": 1,
    "stop_win": 50,
    "stop_loss": 50,
    "gales": 0,
    "qtd_hot": 5,
    "qtd_cold": 5,
    "vizinhos": 1,
    "qtd_analise": 100
  }'::jsonb
)
ON CONFLICT (email) DO NOTHING;
```

## 2. Instalar Dependências do Servidor

```bash
cd bot-system/server
npm install
```

Isso vai instalar:
- express
- ws (WebSocket)
- bcryptjs
- cors
- @supabase/supabase-js ✨ (NOVO)

## 3. Iniciar o Servidor

```bash
npm start
```

O servidor vai rodar em `http://localhost:3000`

## 4. Testar o Sistema

### 4.1. Painel Usuário (Mobile)

1. Abra no celular ou navegador: `http://SEU_IP:3000/painel`
   - Exemplo: `http://192.168.1.100:3000/painel`
2. Faça login com:
   - Email: `teste@teste.com`
   - Senha: `senha123`
3. Configure a estratégia, stop win/loss
4. Clique em **LIGAR BOT**

### 4.2. Extensão do Chrome

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `bot-system/extensao`
5. A extensão vai conectar automaticamente no servidor via WebSocket

### 4.3. Verificar Conexão

No console do servidor você deve ver:
```
🔌 Extensão conectada: teste@teste.com
📤 Config completa enviada via WS para teste@teste.com
```

## 5. Como Funciona

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Celular   │         │   Servidor   │         │  Extensão   │
│   (Painel)  │◄───────►│   Node.js    │◄───────►│   Chrome    │
└─────────────┘  HTTP   │  + WebSocket │  WS     └─────────────┘
                         └──────┬───────┘
                                │
                                ▼
                         ┌─────────────┐
                         │  Supabase   │
                         │   (Auth +   │
                         │    Data)    │
                         └─────────────┘
```

1. **Usuário loga no painel** → Supabase Auth valida
2. **Usuário configura estratégia** → Salva no Supabase
3. **Usuário clica "LIGAR BOT"** → Servidor envia comando via WebSocket
4. **Extensão recebe comando** → Inicia apostas automaticamente
5. **Stats em tempo real** → Extensão → Servidor → Supabase → Painel

## 6. Credenciais do Supabase

As credenciais já estão configuradas em:
- `server/server.js`
- `extensao/background.js`
- `extensao/sidepanel.js`

```javascript
SUPABASE_URL: 'https://vfmzxgznrgwnzghqaaau.supabase.co'
SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' (apenas servidor)
```

## 7. Troubleshooting

### Erro: "Email ou senha inválidos"
- Verifique se o usuário foi criado no Supabase Auth
- Verifique se marcou "Auto Confirm User"

### Erro: "Extensão não conectada"
- Verifique se o servidor está rodando
- Verifique se a extensão está instalada
- Abra o console da extensão (chrome://extensions → Detalhes → Inspecionar visualizações)

### Erro: "Cannot find module '@supabase/supabase-js'"
```bash
cd bot-system/server
npm install
```

## 8. Próximos Passos

✅ Sistema de login com Supabase funcionando
✅ Painel mobile para controlar o bot
✅ WebSocket para comunicação em tempo real
✅ Stats atualizadas automaticamente

Agora você pode:
- Criar estratégias no painel admin
- Cadastrar mais usuários
- Testar o bot em diferentes cassinos
