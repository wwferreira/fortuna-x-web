# Painel Admin - Legendas e Gatilhos

## 📋 Melhorias Implementadas

Foi adicionado um sistema completo de **Legendas** e **Gatilhos** no painel administrativo de estratégias.

## ✨ Novas Funcionalidades

### 1. **Seção de Legendas** 🏷️

Agora você pode criar legendas personalizadas que são grupos de números da roleta.

#### Como usar:
1. Digite o **nome da legenda** (ex: VIZINHOS, QUENTES, FRIOS)
2. Digite os **números** separados por espaço ou vírgula (ex: 0 3 12 15)
3. Clique em **"+ ADICIONAR LEGENDA"**

#### Exemplos de Legendas:
- **VIZINHOS**: 0, 3, 12, 15, 26, 32, 35
- **ORFAOS**: 1, 6, 9, 14, 17, 20, 31, 34
- **TIER**: 5, 8, 10, 11, 13, 16, 23, 24, 27, 30, 33, 36
- **QUENTES**: (números que mais saíram recentemente)
- **FRIOS**: (números que menos saíram)

#### Validação:
- Aceita apenas números de 0 a 36
- Remove números duplicados automaticamente
- Mostra quantos números cada legenda possui

### 2. **Seção de Gatilhos Melhorada** ⚡

Os gatilhos agora podem usar as legendas criadas ou números diretos.

#### Tipos de Gatilho:

**A) Gatilho Normal (Baseado em Sequência)**
- Use legendas ou números para definir quando apostar
- Configure repetições (quantas vezes o padrão deve aparecer)
- Exemplo: "VIZINHOS VIZINHOS" = aposta quando VIZINHOS sair 2 vezes seguidas

**B) Gatilho Dinâmico (Automático pela Mesa)**
- IA Engine (Tendência)
- IA Fortuna X (Straight Up)
- Funcionário do Mês
- Números Quentes/Frios

#### Configurações Adicionais:
- **Gale/Ciclo**: Configure martingale ou ciclos de apostas
- **Fichas**: Defina quantas fichas para cada gale/ciclo
- **Aposta**: Onde apostar quando o gatilho ativar

### 3. **Campo de Descrição**

Adicionado campo opcional para descrever a estratégia, facilitando a organização.

## 🎯 Fluxo de Criação de Estratégia

### Passo 1: Informações Básicas
```
Nome: Estratégia Vizinhos
Descrição: Aposta em vizinhos quando aparecem padrões
```

### Passo 2: Criar Legendas
```
Legenda 1:
  Nome: VIZINHOS
  Números: 0 3 12 15 26 32 35

Legenda 2:
  Nome: ORFAOS
  Números: 1 6 9 14 17 20 31 34
```

### Passo 3: Criar Gatilhos
```
Gatilho 1:
  Tipo: Normal
  Sequência: VIZINHOS VIZINHOS
  Aposta em: ORFAOS
  Repetições: 2
  Gale: 3 níveis (1, 2, 4 fichas)

Gatilho 2:
  Tipo: Dinâmico
  IA: Números Quentes
  Aposta em: (automático)
  Ciclo: 2 níveis (1, 2 fichas)
```

### Passo 4: Salvar
Clique em **"✅ Salvar Estratégia"**

## 📊 Visualização

A lista de estratégias agora mostra:
- Nome da estratégia
- Quantidade de legendas criadas
- Quantidade de gatilhos configurados
- Botão para excluir

## 🔧 Integração com API

### Estrutura de Dados Salva:

```json
{
  "nome": "Estratégia Vizinhos",
  "chave": "estrategia_vizinhos",
  "descricao": "Aposta em vizinhos quando aparecem padrões",
  "legendas": [
    {
      "nome": "VIZINHOS",
      "numeros": [0, 3, 12, 15, 26, 32, 35]
    },
    {
      "nome": "ORFAOS",
      "numeros": [1, 6, 9, 14, 17, 20, 31, 34]
    }
  ],
  "gatilhos": [
    {
      "modo": "NORMAL",
      "legenda": "VIZINHOS VIZINHOS",
      "aposta": "ORFAOS",
      "repeticoes": 2,
      "tipoSecundario": "GALE",
      "qtdSecundario": 3,
      "fichas": [1, 2, 4]
    }
  ]
}
```

## 🚀 Como Acessar

1. Abra o navegador
2. Acesse: http://localhost:3000/admin
3. Clique em **"Gerenciar Estratégias"**
4. Crie suas legendas e gatilhos!

## 📝 Dicas de Uso

### Legendas Comuns:

**Setores da Roleta:**
- VIZINHOS DO ZERO: 0,3,12,15,26,32,35
- ÓRFÃOS: 1,6,9,14,17,20,31,34
- TIER DO CILINDRO: 5,8,10,11,13,16,23,24,27,30,33,36

**Dúzias:**
- D1: 1,2,3,4,5,6,7,8,9,10,11,12
- D2: 13,14,15,16,17,18,19,20,21,22,23,24
- D3: 25,26,27,28,29,30,31,32,33,34,35,36

**Colunas:**
- C1: 1,4,7,10,13,16,19,22,25,28,31,34
- C2: 2,5,8,11,14,17,20,23,26,29,32,35
- C3: 3,6,9,12,15,18,21,24,27,30,33,36

**Cores:**
- VERMELHO: 1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36
- PRETO: 2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35

### Estratégias Populares:

**1. Vizinhos Alternados**
```
Legendas: VIZINHOS, ORFAOS
Gatilho: VIZINHOS ORFAOS VIZINHOS → Aposta em ORFAOS
```

**2. Dúzias em Sequência**
```
Legendas: D1, D2, D3
Gatilho: D1 D1 → Aposta em D2
```

**3. Quentes e Frios**
```
Legendas: QUENTES (números que mais saíram), FRIOS (números que menos saíram)
Gatilho: QUENTES QUENTES QUENTES → Aposta em FRIOS
```

## 🐛 Validações

O sistema valida automaticamente:
- ✅ Números devem estar entre 0 e 36
- ✅ Nome da estratégia é obrigatório
- ✅ Legendas precisam ter nome e números
- ✅ Gatilhos precisam ter configuração completa
- ✅ Remove duplicatas de números

## 📞 Suporte

Se tiver dúvidas sobre como criar estratégias:
- Email: suporte@reidosbots.net.br
- WhatsApp: +55 (55) 99934-4071

## 🎯 Próximos Passos

Possíveis melhorias futuras:
- [ ] Importar/exportar legendas
- [ ] Biblioteca de legendas pré-definidas
- [ ] Visualização gráfica da roleta
- [ ] Simulador de gatilhos
- [ ] Histórico de performance por estratégia
