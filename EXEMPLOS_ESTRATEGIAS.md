# 🎯 Exemplos de Estratégias com Legendas e Gatilhos

## 📚 Biblioteca de Legendas Prontas

### Setores da Roleta Europeia

```
VIZINHOS_ZERO
Números: 0, 3, 12, 15, 26, 32, 35
Descrição: Setor dos vizinhos do zero (7 números)

ORFAOS
Números: 1, 6, 9, 14, 17, 20, 31, 34
Descrição: Órfãos - números que não pertencem aos outros setores (8 números)

TIER
Números: 5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36
Descrição: Tier do cilindro - terceiro setor (12 números)
```

### Dúzias

```
D1
Números: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
Descrição: Primeira dúzia (12 números)

D2
Números: 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24
Descrição: Segunda dúzia (12 números)

D3
Números: 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36
Descrição: Terceira dúzia (12 números)
```

### Colunas

```
C1
Números: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
Descrição: Primeira coluna (12 números)

C2
Números: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
Descrição: Segunda coluna (12 números)

C3
Números: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
Descrição: Terceira coluna (12 números)
```

### Cores

```
VERMELHO
Números: 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
Descrição: Números vermelhos (18 números)

PRETO
Números: 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35
Descrição: Números pretos (18 números)
```

### Par/Ímpar e Alto/Baixo

```
PAR
Números: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36
Descrição: Números pares (18 números)

IMPAR
Números: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35
Descrição: Números ímpares (18 números)

BAIXO
Números: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18
Descrição: Números baixos 1-18 (18 números)

ALTO
Números: 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36
Descrição: Números altos 19-36 (18 números)
```

---

## 🎲 Estratégias Prontas para Usar

### Estratégia 1: Vizinhos Alternados

**Conceito:** Quando VIZINHOS_ZERO sai 2 vezes, aposta em ORFAOS

**Legendas:**
```
VIZINHOS_ZERO: 0, 3, 12, 15, 26, 32, 35
ORFAOS: 1, 6, 9, 14, 17, 20, 31, 34
```

**Gatilho:**
```
Tipo: Normal
Sequência: VIZINHOS_ZERO VIZINHOS_ZERO
Aposta em: ORFAOS
Repetições: 2
Gale: 3 níveis
Fichas: 1, 2, 4
```

**Lógica:** Após dois números do setor vizinhos, há tendência de sair órfãos.

---

### Estratégia 2: Dúzias em Sequência

**Conceito:** Quando D1 sai 3 vezes, aposta em D2 e D3

**Legendas:**
```
D1: 1-12
D2: 13-24
D3: 25-36
```

**Gatilho:**
```
Tipo: Normal
Sequência: D1 D1 D1
Aposta em: D2 D3
Repetições: 3
Ciclo: 2 níveis
Fichas: 1, 2
```

**Lógica:** Após 3 saídas na mesma dúzia, as outras tendem a sair.

---

### Estratégia 3: Cores Alternadas

**Conceito:** Quando VERMELHO sai 4 vezes, aposta em PRETO

**Legendas:**
```
VERMELHO: 1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36
PRETO: 2, 4, 6, 8, 10, 11, 13, 15, 17, 20, 22, 24, 26, 28, 29, 31, 33, 35
```

**Gatilho:**
```
Tipo: Normal
Sequência: VERMELHO VERMELHO VERMELHO VERMELHO
Aposta em: PRETO
Repetições: 4
Gale: 5 níveis
Fichas: 1, 2, 4, 8, 16
```

**Lógica:** Martingale clássico em cores após sequência longa.

---

### Estratégia 4: Colunas Cruzadas

**Conceito:** Quando C1 e C2 saem alternados, aposta em C3

**Legendas:**
```
C1: 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34
C2: 2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35
C3: 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36
```

**Gatilho:**
```
Tipo: Normal
Sequência: C1 C2 C1 C2
Aposta em: C3
Repetições: 4
Gale: 2 níveis
Fichas: 2, 4
```

**Lógica:** Padrão alternado indica mudança para terceira coluna.

---

### Estratégia 5: Setores Completos

**Conceito:** Cobertura de todos os setores com gatilhos diferentes

**Legendas:**
```
VIZINHOS_ZERO: 0, 3, 12, 15, 26, 32, 35
ORFAOS: 1, 6, 9, 14, 17, 20, 31, 34
TIER: 5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36
```

**Gatilho 1:**
```
Sequência: VIZINHOS_ZERO VIZINHOS_ZERO
Aposta em: ORFAOS
```

**Gatilho 2:**
```
Sequência: ORFAOS ORFAOS
Aposta em: TIER
```

**Gatilho 3:**
```
Sequência: TIER TIER
Aposta em: VIZINHOS_ZERO
```

**Lógica:** Rotação entre setores baseada em padrões.

---

### Estratégia 6: Par/Ímpar Inteligente

**Conceito:** Após 3 pares, aposta em ímpar com proteção

**Legendas:**
```
PAR: 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30, 32, 34, 36
IMPAR: 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31, 33, 35
```

**Gatilho:**
```
Tipo: Normal
Sequência: PAR PAR PAR
Aposta em: IMPAR
Repetições: 3
Gale: 4 níveis
Fichas: 1, 2, 3, 5
```

**Lógica:** Probabilidade de alternância após sequência.

---

### Estratégia 7: Alto/Baixo Balanceado

**Conceito:** Quando BAIXO domina, aposta em ALTO

**Legendas:**
```
BAIXO: 1-18
ALTO: 19-36
```

**Gatilho:**
```
Tipo: Normal
Sequência: BAIXO BAIXO BAIXO BAIXO BAIXO
Aposta em: ALTO
Repetições: 5
Gale: 6 níveis
Fichas: 1, 2, 4, 8, 16, 32
```

**Lógica:** Regressão à média após sequência extrema.

---

### Estratégia 8: Números Quentes (Dinâmica)

**Conceito:** IA identifica números quentes automaticamente

**Gatilho:**
```
Tipo: Dinâmico
IA: Números Quentes
Aposta em: (automático)
Ciclo: 3 níveis
Fichas: 1, 1, 2
```

**Lógica:** Sistema analisa histórico e aposta nos mais frequentes.

---

### Estratégia 9: Funcionário do Mês

**Conceito:** Aposta no número com melhor performance recente

**Gatilho:**
```
Tipo: Dinâmico
IA: Funcionário do Mês
Aposta em: (automático)
Gale: 5 níveis
Fichas: 1, 2, 3, 5, 8
```

**Lógica:** Algoritmo identifica número mais consistente.

---

### Estratégia 10: Mix Completo

**Conceito:** Combina múltiplas legendas e gatilhos

**Legendas:**
```
VIZINHOS_ZERO: 0, 3, 12, 15, 26, 32, 35
D1: 1-12
D2: 13-24
VERMELHO: (números vermelhos)
PRETO: (números pretos)
```

**Gatilho 1:**
```
Sequência: VIZINHOS_ZERO VIZINHOS_ZERO
Aposta em: D2
Gale: 2
```

**Gatilho 2:**
```
Sequência: D1 D1 D1
Aposta em: D2
Gale: 3
```

**Gatilho 3:**
```
Sequência: VERMELHO VERMELHO VERMELHO
Aposta em: PRETO
Gale: 4
```

**Lógica:** Múltiplas oportunidades de entrada.

---

## 💡 Dicas para Criar Suas Estratégias

### 1. Comece Simples
- Use 2-3 legendas
- Crie 1-2 gatilhos
- Teste com valores baixos

### 2. Analise Padrões
- Observe o histórico da mesa
- Identifique sequências comuns
- Crie legendas baseadas nisso

### 3. Gestão de Banca
- Sempre configure Stop Win e Stop Loss
- Use gales com moderação (máx 3-5)
- Comece com fichas pequenas

### 4. Teste Antes
- Use modo virtual/demo
- Anote resultados
- Ajuste conforme necessário

### 5. Combine Estratégias
- Use múltiplos gatilhos
- Cubra diferentes cenários
- Diversifique apostas

---

## 📊 Tabela de Cobertura

| Legenda | Números | Cobertura | Pagamento |
|---------|---------|-----------|-----------|
| Número Pleno | 1 | 2.7% | 35:1 |
| Vizinhos (5) | 5 | 13.5% | 7:1 |
| Setor (7) | 7 | 18.9% | 5:1 |
| Dúzia/Coluna | 12 | 32.4% | 2:1 |
| Cor/Par/Alto | 18 | 48.6% | 1:1 |

---

## 🎯 Estratégias por Perfil

### Conservador
- Cores (VERMELHO/PRETO)
- Dúzias (D1/D2/D3)
- Gale máximo: 3
- Fichas: 1, 2, 4

### Moderado
- Colunas (C1/C2/C3)
- Setores (VIZINHOS/ORFAOS/TIER)
- Gale máximo: 5
- Fichas: 1, 2, 4, 8, 16

### Agressivo
- Números Plenos
- IA Dinâmica
- Gale máximo: 7
- Fichas: 1, 2, 4, 8, 16, 32, 64

---

## 📝 Template de Estratégia

```
Nome: [Nome da Estratégia]
Descrição: [Breve descrição]

Legendas:
- [NOME1]: [números]
- [NOME2]: [números]

Gatilhos:
1. Sequência: [LEGENDA LEGENDA]
   Aposta em: [LEGENDA]
   Repetições: [número]
   Gale/Ciclo: [tipo] x [quantidade]
   Fichas: [valores]

Gestão:
- Stop Win: R$ [valor]
- Stop Loss: R$ [valor]
- Ficha Base: R$ [valor]

Observações:
[Notas importantes]
```

---

## 🚀 Como Implementar

1. Acesse: http://localhost:3000/admin
2. Clique em "Gerenciar Estratégias"
3. Crie as legendas da estratégia escolhida
4. Configure os gatilhos
5. Salve e teste!

---

*Lembre-se: Jogue com responsabilidade. Estas são estratégias de exemplo e não garantem lucro.*
