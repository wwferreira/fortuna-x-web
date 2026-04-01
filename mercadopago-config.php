<?php
// Configurações do Mercado Pago

// Para testes (Sandbox)
define('MP_ACCESS_TOKEN_TEST', 'APP_USR-4360662655391278-022509-3c3b037c81a4a45f56d1b82328e64180-3227172718');
define('MP_PUBLIC_KEY_TEST', 'APP_USR-4983c7d7-caf8-4060-8784-884dc6427750');

// Para produção (NOVA API COM PIX)
define('MP_ACCESS_TOKEN_PROD', 'APP_USR-785989303543825-022510-283debb9d2531852d87b797e67c82f4e-3161868267');
define('MP_PUBLIC_KEY_PROD', 'APP_USR-e63d69c2-f021-40fc-bb82-597a9a81a057');
define('MP_CLIENT_ID', '785989303543825');
define('MP_CLIENT_SECRET', 'gdoUgxZaNtBooT18oe827CjwOXBTFlRb');

// Usar teste ou produção
define('MP_PRODUCTION', true); // true = PRODUÇÃO | false = TESTE

// Access Token e Public Key atuais
define('MP_ACCESS_TOKEN', MP_PRODUCTION ? MP_ACCESS_TOKEN_PROD : MP_ACCESS_TOKEN_TEST);
define('MP_PUBLIC_KEY', MP_PRODUCTION ? MP_PUBLIC_KEY_PROD : MP_PUBLIC_KEY_TEST);

// Detectar Base URL dinamicamente
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
$base_url = $protocol . "://" . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']);

// URL de notificação (webhook)
define('MP_NOTIFICATION_URL', $base_url . '/mercadopago-webhook.php');

// URL de retorno após pagamento
define('MP_SUCCESS_URL', $base_url . '/pagamento-sucesso.html');
define('MP_FAILURE_URL', $base_url . '/pagamento-falha.html');
define('MP_PENDING_URL', $base_url . '/pagamento-pendente.html');
?>
