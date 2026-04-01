<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'mercadopago-config.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['token']) || !isset($data['amount'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dados inválidos']);
    exit;
}

// Dados do pagamento
$payment_data = [
    'transaction_amount' => (float)$data['amount'],
    'token' => $data['token'],
    'description' => $data['bot'] . ' - ' . $data['plan'],
    'installments' => (int)$data['installments'],
    'payment_method_id' => 'credit_card',
    'payer' => [
        'email' => $data['email']
    ],
    'external_reference' => 'REIDOBOTS_' . time(),
    'notification_url' => MP_NOTIFICATION_URL,
    'statement_descriptor' => 'REI DOS BOTS'
];

// Fazer requisição para API do Mercado Pago
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'https://api.mercadopago.com/v1/payments');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payment_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . MP_ACCESS_TOKEN
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

// Log
$logData = "=== PAGAMENTO TRANSPARENTE ===\n";
$logData .= "Data: " . date('d/m/Y H:i:s') . "\n";
$logData .= "Bot: " . $data['bot'] . "\n";
$logData .= "Plano: " . $data['plan'] . "\n";
$logData .= "Valor: R$ " . $data['amount'] . "\n";
$logData .= "Status HTTP: " . $httpCode . "\n";
$logData .= "Resposta: " . print_r($result, true) . "\n";
$logData .= "====================\n\n";
file_put_contents('pagamentos-transparente.log', $logData, FILE_APPEND);

if ($httpCode === 201 && isset($result['status'])) {
    if ($result['status'] === 'approved') {
        echo json_encode([
            'success' => true,
            'payment_id' => $result['id'],
            'status' => $result['status']
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'error' => 'Pagamento não aprovado: ' . $result['status_detail']
        ]);
    }
} else {
    echo json_encode([
        'success' => false,
        'error' => isset($result['message']) ? $result['message'] : 'Erro ao processar pagamento'
    ]);
}
?>
