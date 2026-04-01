<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Log para debug
$log_file = 'infinitepay-debug.log';
function log_debug($msg) {
    global $log_file;
    file_put_contents($log_file, date('Y-m-d H:i:s') . ' - ' . $msg . "\n", FILE_APPEND);
}

log_debug('=== INÍCIO REQUISIÇÃO INFINITEPAY ===');

// Receber dados
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    log_debug('Erro: Dados inválidos');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dados inválidos']);
    exit;
}

$nome = $input['nome'] ?? '';
$email = $input['email'] ?? '';
$telefone = $input['telefone'] ?? '';
$bot = $input['bot'] ?? '';
$plano = $input['plano'] ?? '';
$valor = floatval($input['valor'] ?? 0);
$cpf = $input['cpf'] ?? '';

log_debug("Dados recebidos: Nome=$nome, Email=$email, Valor=$valor, Bot=$bot, Plano=$plano");

// Validar dados
if (!$nome || !$email || !$telefone || !$bot || !$plano || $valor <= 0) {
    log_debug('Erro: Dados incompletos');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dados incompletos']);
    exit;
}

// Configuração InfinitePay
$INFINITEPAY_HANDLE = 'reidosbotsfortuna'; // InfiniteTag (API Key) - SEM o símbolo $
$API_URL = 'https://api.infinitepay.io/invoices/public/checkout/links';

// Preparar Payload
$valor_centavos = intval(round($valor * 100));
$order_nsu = uniqid('order_');

$payload = [
    'handle' => $INFINITEPAY_HANDLE,
    'items' => [
        [
            'quantity' => 1,
            'price' => $valor_centavos,
            'description' => "Bot: $bot - Plano: $plano"
        ]
    ],
    'metadata' => [
        'nome' => $nome,
        'email' => $email,
        'telefone' => $telefone,
        'cpf' => $cpf,
        'bot' => $bot,
        'plano' => $plano
    ],
    'order_nsu' => $order_nsu,
    'redirect_url' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/pagamento-sucesso.html',
    'webhook_url' => (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/infinitepay-webhook.php',
    'customer' => [
        'name' => $nome,
        'email' => $email,
        'phone_number' => $telefone
    ]
];

log_debug('Payload: ' . json_encode($payload));

// Fazer requisição POST
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $API_URL);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

log_debug("Resposta InfinitePay - HTTP Code: $http_code");
log_debug("Resposta: $response");
if ($curl_error) log_debug("Curl Error: $curl_error");

$result = json_decode($response, true);

if ($http_code === 200 || $http_code === 201) {
    if (isset($result['url'])) {
        log_debug('Checkout URL gerada com sucesso: ' . $result['url']);
        echo json_encode([
            'success' => true,
            'checkout_url' => $result['url'],
            'order_nsu' => $order_nsu
        ]);
    } else {
        log_debug('Erro: URL não encontrada na resposta');
        echo json_encode(['success' => false, 'error' => 'Erro ao gerar link de pagamento']);
    }
} else {
    $error_msg = $result['message'] ?? ($result['error'] ?? 'Erro desconhecido na API InfinitePay');
    log_debug('Erro ao processar pagamento na InfinitePay: ' . $error_msg);
    echo json_encode([
        'success' => false, 
        'error' => $error_msg,
        'details' => $result
    ]);
}

log_debug('=== FIM REQUISIÇÃO INFINITEPAY ===');
?>
