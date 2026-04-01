# 🚀 Guia Rápido - Criar Estratégias

## 📋 Fluxo Simplificado

### 1️⃣ LEGENDAS
Crie grupos de números que serão usados nos gatilhos.

**Campos:**
- **Nome da Legenda**: Ex: VIZINHOS, QUENTES, D1
- **Números**: Ex: 0 3 12 15 (separados por espaço ou vírgula)
- Clique em **"✅ Salvar Legenda"**

**Exemplo:**
```
Nome: VIZINHOS
Números: 0 3 12 15 26 32 35
```

---

### 2️⃣ GATILHOS
Configure quando e onde apostar usando as legendas.

**Campos:**
- **Nome da Legenda**: Use o nome da legenda criada (ex: VIZINHOS ou VIZINHOS VIZINHOS para sequência)
- **Apostas**: Onde apostar quando ativar (ex: ORFAOS ou 1 2 3 4)
- **Quantidade de Gales**: Ex: 3 (0 = sem gale)
- **Fichas por Gale**: Ex: 1 2 4 8 (quantidade deve ser gales + 1)
- Clique em **"✅ Salvar Gatilho"**

**Exemplo:**
```
Nome da Legenda: VIZINHOS VIZINHOS
Apostas: ORFAOS
Quantidade de Gales: 3
Fichas: 1 2 4 8
```
*Isso significa: quando VIZINHOS sair 2 vezes seguidas, aposta em ORFAOS com 3 gales (1, 2, 4, 8 fichas)*

---

### 3️⃣ FINALIZAR
Salve a estratégia completa.

**Campos:**
- **Nome da Estratégia**: Ex: Estratégia Vizinhos
- **Descrição**: (opcional) Ex: Aposta em órfãos após vizinhos
- Clique em **"✅ Salvar Estratégia"**

---

## 💡 Exemplo Completo

### Estratégia: Vizinhos e Órfãos

**1. Criar Legendas:**

```
Legenda 1:
  Nome: VIZINHOS
  Números: 0 3 12 15 26 32 35
  [Salvar Legenda]

Legenda 2:
  Nome: ORFAOS
  Números: 1 6 9 14 17 20 31 34
  [Salvar Legenda]
```

**2. Criar Gatilho:**

```
Nome da Legenda: VIZINHOS VIZINHOS
Apostas: ORFAOS
Quantidade de Gales: 3
Fichas: 1 2 4 8
[Salvar Gatilho]
```

**3. Finalizar:**

```
Nome da Estratégia: Estratégia Vizinhos
Descrição: Aposta em órfãos após 2 vizinhos
[Salvar Estratégia]
```

---

## 📊 Entendendo as Fichas

### Sem Gale (0 gales)
```
Fichas: 1
```
Aposta 1 ficha apenas.

### Com 1 Gale
```
Fichas: 1 2
```
- Entrada: 1 ficha
- Gale 1: 2 fichas

### Com 3 Gales
```
Fichas: 1 2 4 8
```
- Entrada: 1 ficha
- Gale 1: 2 fichas
- Gale 2: 4 fichas
- Gale 3: 8 fichas

### Com 5 Gales
```
Fichas: 1 2 4 8 16 32
```
- Entrada: 1 ficha
- Gale 1: 2 fichas
- Gale 2: 4 fichas
- Gale 3: 8 fichas
- Gale 4: 16 fichas
- Gale 5: 32 fichas

---

## 🎯 Entendendo Sequências

### Sequência Simples
```
Nome da Legenda: VIZINHOS
```
Ativa quando VIZINHOS sair 1 vez.

### Sequência Dupla
```
Nome da Legenda: VIZINHOS VIZINHOS
```
Ativa quando VIZINHOS sair 2 vezes seguidas.

### Sequência Tripla
```
Nome da Legenda: D1 D1 D1
```
Ativa quando D1 sair 3 vezes seguidas.

### Sequência Alternada
```
Nome da Legenda: VERMELHO PRETO VERMELHO
```
Ativa quando sair VERMELHO, depois PRETO, depois VERMELHO.

---

## ✅ Validações Automáticas

O sistema valida:
- ✅ Números devem estar entre 0 e 36
- ✅ Quantidade de fichas deve corresponder aos gales + 1
- ✅ Nome da legenda não pode repetir
- ✅ Campos obrigatórios preenchidos

---

## 🔍 Ver Detalhes

Após salvar, você pode:
- **Ver Detalhes**: Mostra todas as legendas e gatilhos da estratégia
- **Excluir**: Remove a estratégia

---

## 📱 Acesso

```
http://localhost:3000/admin
→ Clique em "Gerenciar Estratégias"
```

---

## 🎨 Legendas Prontas

### Dúzias
```
D1: 1 2 3 4 5 6 7 8 9 10 11 12
D2: 13 14 15 16 17 18 19 20 21 22 23 24
D3: 25 26 27 28 29 30 31 32 33 34 35 36
```

### Colunas
```
C1: 1 4 7 10 13 16 19 22 25 28 31 34
C2: 2 5 8 11 14 17 20 23 26 29 32 35
C3: 3 6 9 12 15 18 21 24 27 30 33 36
```

### Cores
```
VERMELHO: 1 3 5 7 9 12 14 16 18 19 21 23 25 27 30 32 34 36
PRETO: 2 4 6 8 10 11 13 15 17 20 22 24 26 28 29 31 33 35
```

### Setores
```
VIZINHOS: 0 3 12 15 26 32 35
ORFAOS: 1 6 9 14 17 20 31 34
TIER: 5 8 10 11 13 16 23 24 27 30 33 36
```

---

## 💡 Dicas

1. **Comece simples**: Crie 2-3 legendas e 1 gatilho
2. **Teste com valores baixos**: Use fichas pequenas no início
3. **Use sequências curtas**: 2-3 repetições são suficientes
4. **Combine legendas**: Crie estratégias com múltiplos gatilhos
5. **Anote resultados**: Veja o que funciona melhor

---

## ⚠️ Importante

- Sempre configure Stop Win e Stop Loss no painel do usuário
- Jogue com responsabilidade
- Estratégias não garantem lucro
- Teste antes de usar valores altos

---

*Sistema pronto para uso! Servidor rodando em http://localhost:3000* 🚀
