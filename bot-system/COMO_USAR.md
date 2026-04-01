# Como usar o Bot System

## 1. Instalar dependências do servidor

```bash
cd bot-system/server
npm install
```

## 2. Iniciar o servidor

```bash
node server.js
```

O servidor sobe em `http://localhost:3000`

## 3. Acessar os painéis

- **Painel Usuário**: http://localhost:3000
- **Painel Admin**: http://localhost:3000/admin
  - Login padrão: `admin@reidosbots.com` / `admin123`

## 4. Instalar a extensão no Chrome

1. Abra `chrome://extensions`
2. Ative o "Modo do desenvolvedor"
3. Clique em "Carregar sem compactação"
4. Selecione a pasta `bot-system/extensao`

## 5. Usar

1. No **Painel Admin**: crie usuários e configure estratégias globais
2. No **Painel Usuário**: o usuário faz login, escolhe estratégia, ficha e stops
3. Na **Extensão**: o usuário coloca email e senha da big.bet.br → o bot faz login automático e vai para a mesa
4. A extensão recebe a config via WebSocket e começa a apostar automaticamente
