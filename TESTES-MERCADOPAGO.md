# Dados para Testes - Mercado Pago

## Credenciais de Teste (já configuradas)
- **Access Token**: APP_USR-4360662655391278-022509-3c3b037c81a4a45f56d1b82328e64180-3227172718
- **Public Key**: APP_USR-4983c7d7-caf8-4060-8784-884dc6427750

## Dados para Testar Pagamentos

### Informações da Aplicação
- **N.º da aplicação**: 4360662655391278
- **User ID**: 3227172718

### Usuário de Teste
- **Usuário**: TESTUSER2620424421071923064
- **Senha**: kJ6nKMKqRn
- **Código de verificação**: 172718

## Como Testar

1. Acesse o site e escolha um plano
2. Preencha o formulário com seus dados
3. Será redirecionado para o Mercado Pago
4. Use o usuário de teste acima para fazer login
5. Complete o pagamento

## Cartões de Teste

### Cartão Aprovado
- **Número**: 5031 4332 1540 6351
- **CVV**: 123
- **Validade**: 11/25
- **Nome**: APRO (qualquer nome)

### Cartão Recusado
- **Número**: 5031 4332 1540 6351
- **CVV**: 123
- **Validade**: 11/25
- **Nome**: OTHE (para simular recusa)

### Outros Status
- **Nome CONT**: Pagamento pendente
- **Nome CALL**: Recusado, ligar para autorizar
- **Nome FUND**: Recusado por saldo insuficiente
- **Nome SECU**: Recusado por código de segurança
- **Nome EXPI**: Recusado por data de validade
- **Nome FORM**: Recusado por erro no formulário

## Documentos de Teste (CPF)
- **CPF válido para teste**: 123.456.789-09

## URLs de Retorno
- **Sucesso**: https://admin.hypersecurity.com.br/pagamento-sucesso.html
- **Pendente**: https://admin.hypersecurity.com.br/pagamento-pendente.html
- **Falha**: https://admin.hypersecurity.com.br/pagamento-falha.html

## Webhook
- **URL**: https://admin.hypersecurity.com.br/mercadopago-webhook.php

## Logs
Os pagamentos são registrados em:
- `pagamentos-mp.log` - Todos os pagamentos iniciados
- `webhook-mp.log` - Notificações recebidas
- `pagamentos-confirmados.log` - Pagamentos confirmados

## Importante
⚠️ Estas são credenciais de TESTE. Para produção, você precisa:
1. Completar o cadastro no Mercado Pago
2. Obter credenciais de produção
3. Alterar `MP_PRODUCTION` para `true` no arquivo `mercadopago-config.php`
