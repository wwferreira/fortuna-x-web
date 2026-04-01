# 🚀 Instruções Rápidas - Hostoo

## ⚡ Resumo do que Você Precisa Fazer

### 1. **Conseguir um Servidor para a API** (Obrigatório)
A Hostoo só hospeda sites HTML/PHP. O servidor Node.js precisa rodar em outro lugar.

**Opções Gratuitas:**
- **Render.com** (Recomendado - Gratuito)
- **Railway.app** (Gratuito com limites)
- **Heroku** (Pago - $7/mês)

**Opções Pagas:**
- **DigitalOcean** ($5/mês - VPS)
- **AWS/Google Cloud** (Variável)

### 2. **Configurar o Servidor**

1. **Criar conta** no Render.com (ou outro)
2. **Fazer upload** da pasta `bot-system/server/`
3. **Configurar** as variáveis de ambiente (Supabase)
4. **Anotar a URL** do servidor (ex: `https://meubot.onrender.com`)

### 3. **Atualizar o Painel**

No arquivo `bot-system/painel-usuario/index.html`, linha 532:

```javascript
// 🔧 ALTERE APENAS ESTA LINHA:
const SERVIDOR_API = 'https://meubot.onrender.com'; // Sua URL do servidor
```

### 4. **Upload na Hostoo**

1. **Fazer upload** das pastas:
   - `painel-usuario/` → `public_html/painel/`
   - `painel-admin/` → `public_html/admin/`

2. **Acessar:**
   - `https://seudominio.com/painel/` (Mobile)
   - `https://seudominio.com/admin/` (Admin)

## 🔧 Exemplo Prático

Se seu servidor ficar em: `https://meubot.onrender.com`

Altere a linha 532 para:
```javascript
const SERVIDOR_API = 'https://meubot.onrender.com';
```

## ⚠️ Importante

- **Extensão Chrome:** Continua local (não hospeda)
- **Servidor Node.js:** Precisa rodar 24/7 em VPS/Cloud
- **Painéis Web:** Esses sim vão para a Hostoo

## 🆘 Precisa de Ajuda?

Se quiser que eu configure tudo passo a passo, me avise:
1. Qual provedor escolheu (Render, Railway, etc.)
2. Qual o domínio da sua Hostoo
3. Se conseguiu criar o servidor