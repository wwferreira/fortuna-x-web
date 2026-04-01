# 📋 Resumo das Mudanças - Integração com Supabase

## ✅ O que foi feito

### 1. Servidor (server.js)
- ✅ Adicionado cliente Supabase com SERVICE_KEY
- ✅ Login agora usa Supabase Auth (`signInWithPassword`)
- ✅ Busca de usuários agora vem do Supabase (tabela `usuarios_bot`)
- ✅ Config, stats e status salvos no Supabase
- ✅ WebSocket continua funcionando para comunicação em tempo real
- ✅ Estratégias continuam no JSON local (db.json)

### 2. Package.json
- ✅ Adicionada dependência `@supabase/supabase-js`

### 3. Arquivos Criados
- ✅ `supabase-schema.sql` - Script para criar tabela no Supabase
- ✅ `INSTALACAO_SUPABASE.md` - Guia completo de instalação
- ✅ `RESUMO_MUDANCAS.md` - Este arquivo

## 🔄 Como funciona agora

### Fluxo de Login
```
1. Usuário digita email/senha no painel
2. Painel envia POST /api/login
3. Servidor valida com Supabase Auth
4. Se válido, retorna token + email
5. Painel salva sessão e abre tela principal
```

### Fluxo de Configuração
```
1. Usuário escolhe estratégia, stop win/loss
2. Painel envia POST /api/config
3. Servidor salva no Supabase (tabela usuarios_bot)
4. Servidor envia via WebSocket para extensão
5. Extensão recebe e aplica config
```

### Fluxo de Comando (Ligar/Desligar)
```
1. Usuário clica "LIGAR BOT" no celular
2. Painel envia POST /api/comando { acao: 'ligar' }
3. Servidor atualiza status no Supabase
4. Servidor envia comando via WebSocket
5. Extensão recebe e inicia apostas
```

### Fluxo de Stats
```
1. Extensão envia stats a cada rodada
2. Servidor salva no Supabase
3. Painel busca stats a cada 3 segundos
4. Painel atualiza greens, reds, saldo em tempo real
```

## 📊 Estrutura do Supabase

### Tabela: usuarios_bot
```sql
- id (bigserial)
- email (text, unique) ← Mesmo email do Auth
- ativo (boolean)
- config (jsonb) ← Estratégia, stops, gales, etc
- stats (jsonb) ← Greens, reds, saldo
- bot_ligado (boolean)
- status_bot (text) ← 'inicializando', 'na_mesa', 'desligando'
- created_at (timestamp)
- updated_at (timestamp)
```

### Auth Users (Supabase Auth)
```
- Gerenciado pelo Supabase
- Cria usuários com email/senha
- Gera tokens JWT automaticamente
```

## 🔐 Segurança

### RLS (Row Level Security)
- ✅ Usuários só veem seus próprios dados
- ✅ Service role (servidor) tem acesso total
- ✅ Tokens JWT validados automaticamente

### Políticas
```sql
-- Usuário só vê seus dados
WHERE auth.email() = email

-- Servidor tem acesso total
WHERE auth.role() = 'service_role'
```

## 🎯 Próximos Passos

### Para você fazer:

1. **Executar SQL no Supabase**
   - Copiar `supabase-schema.sql`
   - Colar no SQL Editor
   - Executar

2. **Criar usuários no Supabase Auth**
   - Dashboard → Authentication → Users
   - Add user (marcar Auto Confirm)

3. **Instalar dependências**
   ```bash
   cd bot-system/server
   npm install
   ```

4. **Iniciar servidor**
   ```bash
   npm start
   ```

5. **Testar no celular**
   - Acessar `http://SEU_IP:3000/painel`
   - Fazer login
   - Configurar e ligar bot

## 🐛 Troubleshooting

### "Cannot find module '@supabase/supabase-js'"
```bash
cd bot-system/server
rm -rf node_modules package-lock.json
npm install
```

### "Email ou senha inválidos"
- Verificar se usuário existe no Supabase Auth
- Verificar se marcou "Auto Confirm User"

### "Extensão não conectada"
- Verificar se servidor está rodando
- Verificar console da extensão
- Verificar se WebSocket conectou

## 📝 Notas Importantes

1. **Estratégias continuam no JSON local**
   - Não foram migradas para Supabase
   - Admin cria estratégias normalmente
   - Usuários escolhem estratégias disponíveis

2. **WebSocket continua local**
   - Servidor roda em localhost:3000
   - Extensão conecta via ws://localhost:3000
   - Comunicação em tempo real mantida

3. **Painel Admin não foi alterado**
   - Continua usando sistema local
   - Pode ser migrado depois se necessário

4. **Compatibilidade**
   - Sistema antigo (JSON) ainda funciona
   - Migração gradual possível
   - Rollback fácil se necessário
