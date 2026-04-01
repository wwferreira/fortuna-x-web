<?php
// Configurações do Stripe

// Chaves de TESTE
define('STRIPE_SECRET_KEY_TEST', getenv('STRIPE_SECRET_KEY_TEST') ?: 'sk_test_...sua_chave_aqui');
define('STRIPE_PUBLISHABLE_KEY_TEST', getenv('STRIPE_PUBLISHABLE_KEY_TEST') ?: 'pk_test_...sua_chave_aqui');

// Chaves de PRODUÇÃO (adicionar depois)
define('STRIPE_SECRET_KEY_PROD', '');
define('STRIPE_PUBLISHABLE_KEY_PROD', '');

// Usar teste ou produção
define('STRIPE_PRODUCTION', false); // true = PRODUÇÃO | false = TESTE

// Chaves atuais
define('STRIPE_SECRET_KEY', STRIPE_PRODUCTION ? STRIPE_SECRET_KEY_PROD : STRIPE_SECRET_KEY_TEST);
define('STRIPE_PUBLISHABLE_KEY', STRIPE_PRODUCTION ? STRIPE_PUBLISHABLE_KEY_PROD : STRIPE_PUBLISHABLE_KEY_TEST);

// URLs de retorno
define('STRIPE_SUCCESS_URL', 'https://admin.hypersecurity.com.br/pagamento-sucesso.html');
define('STRIPE_CANCEL_URL', 'https://admin.hypersecurity.com.br/pagamento-falha.html');
define('STRIPE_WEBHOOK_SECRET', ''); // Configurar depois no painel do Stripe
?>
