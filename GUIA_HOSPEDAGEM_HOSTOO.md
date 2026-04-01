# 🌐 Guia de Hospedagem na Hostoo

## 📁 Arquivos para Hospedar

### ✅ **HOSPEDAR (Upload na Hostoo):**
- `bot-system/painel-usuario/` → Painel mobile
- `bot-system/painel-admin/` → Painel administrativo

### ❌ **NÃO HOSPEDAR:**
- `bot-system/extensao/` → Fica local no Chrome
- `bot-system/server/` → Precisa de servidor Node.js (VPS)

## 🔧 Configurações Necessárias

### 1. **Servidor Node.js (Obrigatório)**
O servidor Node.js (`bot-system/server/`) **NÃO PODE** rodar na Hostoo (hospedagem compartilhada).

**Opções:**
- **VPS/Cloud:** DigitalOcean, AWS, Google Cloud, Vultr
- **Heroku:** Para deploy gratuito/pago
- **Railway:** Alternativa moderna ao Heroku
- **Render:** Outra opção gratuita

### 2. **URLs a Configurar**

Atualmente o sistema usa:
- **Servidor API:** `localhost:3000` (precisa virar sua VPS)
- **WebSocket:** `ws://localhost:3000` (precisa virar sua VPS)

## 📋 Passo a Passo

### **Etapa 1: Configurar Servidor Node.js**

1. **Escolher provedor VPS** (ex: DigitalOcean $5/mês)
2. **Instalar Node.js** no servidor
3. **Upload da pasta** `bot-system/server/`
4. **Instalar dependências:** `npm install`
5. **Rodar servidor:** `node server.js`
6. **Anotar IP/domínio** do servidor (ex: `123.456.789.0:3000`)

### **Etapa 2: Atualizar URLs nos Painéis**

Substituir `localhost:3000` pelo IP/domínio do seu servidor VPS.

### **Etapa 3: Upload na Hostoo**

1. **Fazer upload** das pastas:
   - `painel-usuario/` → `public_html/painel/`
   - `painel-admin/` → `public_html/admin/`

2. **Acessar via browser:**
   - Painel Mobile: `https://seudominio.com/painel/`
   - Painel Admin: `https://seudominio.com/admin/`

## ⚠️ Limitações da Hostoo

- **Não suporta Node.js:** Apenas HTML/PHP/MySQL
- **Não suporta WebSocket:** Apenas HTTP
- **Servidor separado obrigatório:** Para API e WebSocket

## 💡 Alternativa Simples

Se não quiser VPS, pode usar:
- **Ngrok:** Para expor localhost temporariamente
- **Replit:** Para hospedar o servidor Node.js gratuitamente
- **Glitch:** Outra opção gratuita para Node.js

## 🔗 URLs Finais

Após configurar tudo:
- **Painel Mobile:** `https://seudominio.com/painel/`
- **Painel Admin:** `https://seudominio.com/admin/`
- **Servidor API:** `https://seu-vps.com:3000/api`
- **WebSocket:** `wss://seu-vps.com:3000`