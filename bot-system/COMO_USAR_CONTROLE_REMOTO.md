# 🎮 Como Usar o Controle Remoto do Bot

## 🚀 Fluxo Completo

### 1. Configurar Credenciais da Casa

1. Acesse o painel no celular: `http://SEU_IP:3000/painel-usuario/index.html`
2. **Faça login com seu email/senha do Supabase** (mesma conta criada pelo admin)
3. Preencha os campos:
   - **URL da Casa**: `https://big.bet.br` (URL fixa)
   - **Email/Usuário da Casa**: Seu login na big.bet.br
   - **Senha da Casa**: Sua senha na big.bet.br
4. **Clique em "🎯 Ver Todas as Estratégias Disponíveis"** para ver as estratégias
5. Selecione uma estratégia e configure:
   - Stop win/loss
   - Gales (0-2)
   - Parâmetros específicos da estratégia (quentes/frios/vizinhos)
6. Clique em **💾 Salvar e Enviar para Extensão**

### 2. Instalar a Extensão no PC

1. Abra `chrome://extensions`
2. Ative **Modo do desenvolvedor**
3. Clique em **Carregar sem compactação**
4. Selecione a pasta `bot-system/extensao`
5. A extensão vai conectar automaticamente no servidor

### 3. Fazer Login na Extensão (Opcional)

A extensão não precisa de login manual. Ela se conecta automaticamente ao servidor quando você:
- Salva as configurações no painel do usuário
- Liga o bot remotamente

O login é feito automaticamente na casa de apostas usando as credenciais que você configurou.

### 4. Ligar o Bot Remotamente

1. No celular, clique em **▶️ LIGAR BOT**
2. O bot vai automaticamente:
   - ✅ Abrir uma nova aba com a casa de aposta
   - ✅ Fazer login automático com suas credenciais
   - ✅ Redirecionar para a mesa de roleta
   - ✅ Iniciar as apostas conforme a estratégia

### 5. Acompanhar em Tempo Real

O painel no celular mostra:
- 📊 Greens e Reds
- 💰 Saldo atual
- 📈 Lucro/Perda
- ⏱️ Status do bot (inicializando, na mesa, desligando)

### 6. Desligar o Bot

1. No celular, clique em **⏹️ DESLIGAR BOT**
2. O bot vai:
   - ✅ Sair da mesa e ir para página principal
   - ✅ Clicar no botão de perfil
   - ✅ Clicar em "Deslogar"
   - ✅ Confirmar logout clicando em "OK"
   - ✅ Redirecionar para google.com
   - ✅ Atualizar o status para "deslogado"

## 🔄 Fluxo Técnico

```
┌─────────────┐
│   Celular   │
│   (Painel)  │
└──────┬──────┘
       │ 1. Clica "LIGAR BOT"
       ▼
┌──────────────┐
│   Servidor   │ ← HTTP POST /api/comando { acao: 'ligar' }
│   Node.js    │
└──────┬───────┘
       │ 2. Envia via WebSocket
       ▼
┌─────────────┐
│  Extensão   │ ← WS: { tipo: 'comando', acao: 'ligar' }
│  (Background)│
└──────┬──────┘
       │ 3. Executa iniciarBotRemoto()
       ▼
┌─────────────┐
│ Chrome Tab  │ ← chrome.tabs.create({ url: casa_url })
│ Casa Aposta │
└──────┬──────┘
       │ 4. Página carrega
       ▼
┌─────────────┐
│   Content   │ ← { action: 'fazer_login_automatico' }
│   Script    │
└──────┬──────┘
       │ 5. Preenche email/senha e clica login
       ▼
┌─────────────┐
│   Logado    │ ← Redireciona para mesa
│   na Casa   │
└──────┬──────┘
       │ 6. Inicia apostas
       ▼
┌─────────────┐
│  Apostando  │ ← Envia stats para servidor
│  na Mesa    │
└─────────────┘
```

## 📱 Recursos do Painel Mobile

### Controles
- ▶️ **LIGAR BOT** - Inicia o bot remotamente
- ⏹️ **DESLIGAR BOT** - Para o bot e fecha abas
- 🔄 **Reiniciar Página da Roleta** - Dá F5 na mesa
- 🔄 **Resetar Placar** - Zera greens/reds

### Estatísticas em Tempo Real
- 📊 Greens vs Reds
- 📈 Assertividade (%)
- 💰 Saldo atual
- 💵 Lucro/Perda

### Banners de Status
- ⏳ **Inicializando** - Bot está abrindo a casa e fazendo login
- 🎰 **Na Mesa** - Bot está apostando
- 🔄 **Desligando** - Bot está parando e fechando abas

## ⚙️ Configurações Disponíveis

### Configurações Disponíveis

### Credenciais da Casa
No painel do usuário, você deve configurar:
- **URL da Casa**: `https://big.bet.br` (URL fixa, não precisa alterar)
- **Email/Usuário da Casa**: Seu email de login na big.bet.br
- **Senha da Casa**: Sua senha na big.bet.br

Essas credenciais são armazenadas no banco de dados Supabase e usadas pela extensão para fazer login automático.

### URLs Importantes
- **Login**: `https://big.bet.br/casino?cmd=signin&path=phone`
- **Mesa**: `https://big.bet.br/live-casino/game/3783645?provider=Playtech&from=%2Flive-casino`
- **Home**: `https://big.bet.br/pt`

### Estratégias
- 🔥 Números Quentes
- ❄️ Números Frios
- 🔥❄️ Quentes e Frios
- 🎯 Estratégias customizadas (criadas no admin)

### Gestão de Banca
- 💰 Valor da ficha base
- 🎯 Stop Win (quantidade de greens)
- 🛑 Stop Loss (quantidade de reds)
- 🔄 Gales (0, 1 ou 2)
- 💵 Fichas para cada gale

### Parâmetros Dinâmicos
- 🔥 Quantidade de números quentes
- ❄️ Quantidade de números frios
- 🎯 Vizinhos na racetrack
- 📊 Rodadas para análise (50-500)

## 🔐 Segurança

### Credenciais
- ✅ Credenciais da casa são salvas no Supabase (criptografadas)
- ✅ Apenas você tem acesso aos seus dados
- ✅ RLS (Row Level Security) ativo no Supabase

### Comunicação
- ✅ WebSocket local (ws://localhost:3000)
- ✅ Servidor roda no seu PC
- ✅ Nenhum dado sai da sua rede local

## 🐛 Troubleshooting

### "Extensão não conectada"
1. Verifique se o servidor está rodando (`npm start`)
2. Verifique se a extensão está instalada
3. Faça login na extensão com o mesmo email do painel
4. Abra o console da extensão: `chrome://extensions` → Detalhes → Inspecionar visualizações

### "Login automático não funciona"
1. Verifique se as credenciais estão corretas no painel do usuário
2. Verifique se o servidor está rodando
3. Abra o console da aba (F12) para ver os logs do script de login
4. Os seletores CSS podem ter mudado no site da big.bet.br

### "Logout não funciona"
1. Verifique se a página principal (https://big.bet.br/pt) carregou corretamente
2. Abra o console da aba (F12) para ver os logs do script de logout
3. Os seletores CSS do botão de perfil/deslogar podem ter mudado
4. Verifique se o usuário está realmente logado antes de tentar deslogar

### "Bot não inicia apostas"
1. Verifique se a estratégia está configurada
2. Verifique se o stop win/loss não foi atingido
3. Abra o console da extensão para ver logs

### "Stats não atualizam"
1. Verifique se o servidor está rodando
2. Verifique a conexão WebSocket no console
3. Verifique se o email está correto

## 📝 Notas Importantes

1. **Servidor deve estar rodando** no PC para o controle remoto funcionar
2. **Mesma rede** - Celular e PC devem estar na mesma rede WiFi
3. **Firewall** - Pode ser necessário liberar a porta 3000
4. **IP do PC** - Use `ipconfig` (Windows) ou `ifconfig` (Mac/Linux) para descobrir
5. **HTTPS** - Para usar fora da rede local, configure HTTPS e domínio

## 🎯 Próximos Passos

- [ ] Adicionar suporte para mais casas de aposta
- [ ] Melhorar detecção de campos de login
- [ ] Adicionar notificações push no celular
- [ ] Adicionar histórico de sessões
- [ ] Adicionar gráficos de performance
