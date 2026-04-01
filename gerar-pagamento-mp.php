<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'mercadopago-config.php';

// Receber dados
$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['valor']) || !isset($data['nome']) || !isset($data['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos']);
    exit;
}

// Dados do pagamento
$valor = (float)$data['valor'];
$nome = $data['nome'];
$email = $data['email'];
$telefone = $data['telefone'] ?? '';
$cpf = $data['cpf'] ?? '';
$bot = $data['bot'] ?? 'Bot';
$plano = $data['plano'] ?? 'Plano';

// Criar preferência de pagamento
$preference = [
    'items' => [
        [
            'title' => $bot . ' - ' . $plano,
            'description' => 'Acesso ao bot ' . $bot . ' - ' . $plano,
            'quantity' => 1,
            'currency_id' => 'BRL',
            'unit_price' => $valor
        ]
    ],
    'payer' => [
        'name' => $nome,
        'email' => $email,
        'phone' => [
            'number' => preg_replace('/\D/', '', $telefone)
        ],
        'identification' => [
            'type' => 'CPF',
            'number' => preg_replace('/\D/', '', $cpf)
        ]
    ],
    'back_urls' => [
        'success' => MP_SUCCESS_URL,
        'failure' => MP_FAILURE_URL,
        'pending' => MP_PENDING_URL
    ],
    'auto_return' => 'approved',
    'notification_url' => MP_NOTIFICATION_URL,
    'statement_descriptor' => 'REI DOS BOTS',
    'external_reference' => 'REIDOBOTS_' . time(),
    'binary_mode' => false,
    'payment_methods' => [
        'excluded_payment_types' => [
            ['id' => 'ticket'],        // Excluir boleto
            ['id' => 'bank_transfer'], // Excluir transferência
            ['id' => 'atm']            // Excluir caixa eletrônico
        ],
        'excluded_payment_methods' => [],
        'installments' => 12,
        'default_installments' => 1
    ],
    'purpose' => 'wallet_purchase',
    'marketplace' => 'NONE',
    'operation_type' => 'regular_payment'
];

// Fazer requisição para API do Mercado Pago
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.mercadopago.com/checkout/preferences');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($preference));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . MP_ACCESS_TOKEN
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 201) {
    $result = json_decode($response, true);
    
    // Salvar log
    $logData = "=== PAGAMENTO MERCADO PAGO ===\n";
    $logData .= "Data: " . date('d/m/Y H:i:s') . "\n";
    $logData .= "Nome: $nome\n";
    $logData .= "Email: $email\n";
    $logData .= "CPF: $cpf\n";
    $logData .= "Bot: $bot\n";
    $logData .= "Plano: $plano\n";
    $logData .= "Valor: R$ $valor\n";
    $logData .= "ID Preferência: " . $result['id'] . "\n";
    $logData .= "====================\n\n";
    file_put_contents('pagamentos-mp.log', $logData, FILE_APPEND);
    
    echo json_encode([
        'success' => true,
        'init_point' => $result['init_point'], // URL para pagamento
        'preference_id' => $result['id']
    ]);
} else {
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar pagamento',
        'details' => json_decode($response, true)
    ]);
}
?>
