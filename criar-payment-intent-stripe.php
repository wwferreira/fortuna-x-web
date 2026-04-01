<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'stripe-config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dados inválidos']);
    exit;
}

// Converter para centavos (Stripe usa centavos)
$amount = (int)($data['amount'] * 100);

// Criar linha de item para o checkout
$lineItems = [
    [
        'price_data' => [
            'currency' => 'brl',
            'product_data' => [
                'name' => $data['bot'],
                'description' => 'Plano ' . ucfirst($data['plan'])
            ],
            'unit_amount' => $amount
        ],
        'quantity' => 1
    ]
];

// Dados da sessão de checkout
$checkoutData = [
    'payment_method_types' => ['card'],
    'line_items' => $lineItems,
    'mode' => 'payment',
    'success_url' => STRIPE_SUCCESS_URL . '?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => STRIPE_CANCEL_URL,
    'customer_email' => $data['email'],
    'metadata' => [
        'bot' => $data['bot'],
        'plan' => $data['plan'],
        'nome' => $data['nome'],
        'email' => $data['email'],
        'cpf' => $data['cpf'],
        'telefone' => isset($data['telefone']) ? $data['telefone'] : ''
    ],
    'locale' => 'pt-BR'
];

// Fazer requisição para API do Stripe (Checkout Session)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.stripe.com/v1/checkout/sessions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($checkoutData));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . STRIPE_SECRET_KEY
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

// Log
$logData = "=== STRIPE CHECKOUT SESSION ===\n";
$logData .= "Data: " . date('d/m/Y H:i:s') . "\n";
$logData .= "Bot: " . $data['bot'] . "\n";
$logData .= "Plano: " . $data['plan'] . "\n";
$logData .= "Valor: R$ " . $data['amount'] . "\n";
$logData .= "Status HTTP: " . $httpCode . "\n";
$logData .= "Resposta: " . print_r($result, true) . "\n";
$logData .= "====================\n\n";
file_put_contents('pagamentos-stripe.log', $logData, FILE_APPEND);

if ($httpCode === 200 && isset($result['url'])) {
    echo json_encode([
        'success' => true,
        'checkout_url' => $result['url'],
        'session_id' => $result['id']
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => isset($result['error']['message']) ? $result['error']['message'] : 'Erro ao criar sessão de pagamento'
    ]);
}
?>
