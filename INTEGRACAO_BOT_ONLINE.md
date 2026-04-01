# Integração Bot Online - Rei dos Bots

## 📋 O que foi feito

Foi criada uma integração completa do sistema bot-system no site principal, permitindo que os usuários acessem o painel de controle do bot diretamente pelo site.

## ✨ Funcionalidades Implementadas

### 1. **Aba "Bot Online" no Menu**
- Novo link no menu de navegação principal com ícone 🤖
- Ao clicar, abre um modal com o painel de login

### 2. **Modal de Login**
- Interface moderna e responsiva
- Login com email e senha
- Validação de credenciais via API
- Mensagens de erro amigáveis
- Sessão persistente (localStorage)

### 3. **Painel de Controle do Bot**
Após o login, o usuário tem acesso a:

#### 📊 Estatísticas em Tempo Real
- Greens (vitórias)
- Reds (derrotas)
- Taxa de assertividade
- Saldo atual
- Lucro/Perda

#### ⚙️ Configurações
- Seleção de estratégia de aposta
- Valor da ficha
- Quantidade de gales
- Stop Win (limite de ganho)
- Stop Loss (limite de perda)

#### 🎮 Controles
- Botão Ligar/Desligar Bot
- Status do servidor (online/offline)
- Banners de status (inicializando/desligando)
- Salvar configurações

## 🚀 Como Usar

### 1. **Iniciar o Servidor**
```bash
cd bot-system/server
npm install
node server.js
```

O servidor estará rodando em `http://localhost:3000`

### 2. **Acessar o Site**
Abra o arquivo `index.html` no navegador ou configure um servidor local.

### 3. **Fazer Login**
- Clique em "🤖 Bot Online" no menu
- Use as credenciais:
  - **Admin**: admin@reidosbots.com / admin123
  - Ou crie novos usuários pelo painel admin

### 4. **Configurar o Bot**
1. Selecione a estratégia desejada
2. Configure os valores (ficha, gales, stops)
3. Clique em "💾 Salvar e Enviar para Extensão"
4. Clique em "▶️ LIGAR BOT" para iniciar

## 📁 Arquivos Modificados

### `index.html`
- Adicionado link "Bot Online" no menu de navegação
- Adicionado modal completo com painel de login e configuração

### `style.css`
- Estilos completos para o modal Bot Online
- Design responsivo e moderno
- Animações e transições suaves

### `script.js`
- Lógica de abertura/fechamento do modal
- Integração com API do servidor
- Gerenciamento de sessão
- Polling de estatísticas em tempo real
- Controle de status do bot

## 🔧 Configuração da API

O sistema se conecta ao servidor em `http://localhost:3000/api`

### Endpoints Utilizados:
- `POST /api/login` - Autenticação
- `GET /api/config/:email` - Buscar configurações
- `POST /api/config` - Salvar configurações
- `GET /api/estrategias` - Listar estratégias
- `POST /api/comando` - Ligar/desligar bot
- `GET /api/stats/:email` - Estatísticas
- `GET /api/status/:email` - Status do bot
- `WebSocket ws://localhost:3000` - Verificação de servidor

## 🎨 Design

O modal segue o mesmo padrão visual do site:
- Fundo escuro (#0f0f1a)
- Cor primária roxa (#a855f7)
- Verde para sucesso (#22c55e)
- Vermelho para erros (#ef4444)
- Animações suaves
- Totalmente responsivo

## 📱 Responsividade

O modal se adapta perfeitamente a:
- Desktop (max-width: 500px)
- Tablet (max-width: 768px)
- Mobile (95% da largura)

## 🔐 Segurança

- Senhas criptografadas com bcrypt
- Sessão armazenada localmente
- Validação de credenciais no servidor
- Proteção contra acesso não autorizado

## 🐛 Troubleshooting

### Servidor Offline
Se aparecer "Servidor offline":
1. Verifique se o servidor está rodando
2. Confirme que está na porta 3000
3. Verifique o console do navegador para erros

### Extensão Não Conectada
Se aparecer "Extensão não conectada":
1. Instale a extensão Chrome do bot-system
2. Certifique-se de que está conectada ao servidor
3. Verifique o WebSocket no console

### Configurações Não Salvam
1. Verifique se o servidor está online
2. Confirme que está logado
3. Verifique o console para erros de API

## 📞 Suporte

Para dúvidas ou problemas:
- Email: suporte@reidosbots.net.br
- WhatsApp: +55 (55) 99934-4071
- Telegram: @ReidosBotsFortuna

## 🎯 Próximos Passos

Possíveis melhorias futuras:
- [ ] Histórico de apostas no modal
- [ ] Gráficos de performance
- [ ] Notificações push
- [ ] Modo escuro/claro
- [ ] Múltiplos perfis de configuração
- [ ] Exportar/importar configurações
