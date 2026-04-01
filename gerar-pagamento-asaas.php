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
$log_file = 'asaas-debug.log';
function log_debug($msg) {
    global $log_file;
    file_put_contents($log_file, date('Y-m-d H:i:s') . ' - ' . $msg . "\n", FILE_APPEND);
}

log_debug('=== INÍCIO REQUISIÇÃO ASAAS ===');

// Configuração do Asaas
$ASAAS_API_KEY = '$aact_prod_000MzkwODA2MWY2OGM3MWRlMDU2NWM3MzJlNzZmNGZhZGY6OmU3ZjJlMjQ4LWVhZTYtNDJmYy1hMGYyLTY0NzY2MjMwMWU5Zjo6JGFhY2hfOGJjMDUzZDItOTY0Zi00NmI5LWExMTgtN2MzYzBkNDFjZTgy';
$ASAAS_API_URL = 'https://api.asaas.com/v3';

log_debug('API Key configurada');
log_debug('API URL: ' . $ASAAS_API_URL);

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
$cpf = $input['cpf'] ?? '';
$bot = $input['bot'] ?? '';
$plano = $input['plano'] ?? '';
$valor = floatval($input['valor'] ?? 0);
$parcelas = intval($input['parcelas'] ?? 1);

log_debug("Dados recebidos: Nome=$nome, Email=$email, Valor=$valor, Parcelas=$parcelas");

// Validar dados
if (!$nome || !$email || !$telefone || !$cpf || !$bot || !$plano || $valor <= 0) {
    log_debug('Erro: Dados incompletos');
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dados incompletos']);
    exit;
}

// Limpar dados
$cpf_limpo = preg_replace('/\D/', '', $cpf);
$telefone_limpo = preg_replace('/\D/', '', $telefone);

// Extrair DDD e número
$ddd = substr($telefone_limpo, 0, 2);
$numero = substr($telefone_limpo, 2);

log_debug("CPF limpo: $cpf_limpo, Telefone: $ddd$numero");

// Criar cliente no Asaas
$customer_data = [
    'name' => $nome,
    'email' => $email,
    'cpfCnpj' => $cpf_limpo,
    'phone' => $ddd . $numero,
    'mobilePhone' => $ddd . $numero,
    'address' => 'Não informado',
    'addressNumber' => '0',
    'city' => 'Não informado',
    'state' => 'SP',
    'postalCode' => '00000000'
];

log_debug('Criando cliente: ' . json_encode($customer_data));

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $ASAAS_API_URL . '/customers');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($customer_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'access_token: ' . $ASAAS_API_KEY
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

log_debug("Resposta cliente - HTTP Code: $http_code");
log_debug("Resposta cliente: $response");
if ($curl_error) log_debug("Curl Error: $curl_error");

$customer_result = json_decode($response, true);
$customer_id = null;

if ($http_code === 200 || $http_code === 201) {
    $customer_id = $customer_result['id'] ?? null;
    log_debug("Cliente criado com ID: $customer_id");
} else {
    // Tentar encontrar cliente existente
    log_debug('Tentando encontrar cliente existente...');
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $ASAAS_API_URL . '/customers?email=' . urlencode($email));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'access_token: ' . $ASAAS_API_KEY
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    log_debug("Resposta busca cliente: $response");
    
    $search_result = json_decode($response, true);
    
    if (isset($search_result['data']) && count($search_result['data']) > 0) {
        $customer_id = $search_result['data'][0]['id'];
        log_debug("Cliente encontrado com ID: $customer_id");
    }
}

if (!$customer_id) {
    log_debug('Erro: Não foi possível criar/encontrar cliente');
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Erro ao criar/encontrar cliente']);
    exit;
}

// Criar cobrança no Asaas
$payment_data = [
    'customer' => $customer_id,
    'billingType' => 'CREDIT_CARD',
    'value' => $valor,
    'dueDate' => date('Y-m-d', strtotime('+1 day')),
    'description' => "Bot: $bot - Plano: $plano",
    'externalReference' => uniqid('bot_'),
    'installmentCount' => $parcelas,
    'installmentValue' => round($valor / $parcelas, 2),
    'notificationUrl' => 'https://admin.hypersecurity.com.br/rei-dos-bots/webhook-asaas.php'
];

log_debug('Criando pagamento: ' . json_encode($payment_data));

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $ASAAS_API_URL . '/payments');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'POST');
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payment_data));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'access_token: ' . $ASAAS_API_KEY
]);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);

$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

log_debug("Resposta pagamento - HTTP Code: $http_code");
log_debug("Resposta pagamento: $response");
if ($curl_error) log_debug("Curl Error: $curl_error");

if ($http_code === 200 || $http_code === 201) {
    $payment_result = json_decode($response, true);
    $payment_id = $payment_result['id'] ?? null;
    
    log_debug("Pagamento criado com ID: $payment_id");
    
    if ($payment_id) {
        // Gerar link de pagamento direto
        $checkout_url = 'https://www.asaas.com/checkout/' . $payment_id;
        
        log_debug("Checkout URL: $checkout_url");
        log_debug('=== FIM REQUISIÇÃO ASAAS (SUCESSO) ===');
        
        echo json_encode([
            'success' => true,
            'payment_id' => $payment_id,
            'checkout_url' => $checkout_url,
            'installment_count' => $parcelas,
            'installment_value' => round($valor / $parcelas, 2)
        ]);
    } else {
        log_debug('Erro: Não foi possível obter ID do pagamento');
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'Erro ao obter ID do pagamento']);
    }
} else {
    log_debug('Erro: HTTP Code ' . $http_code);
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Erro ao criar pagamento',
        'details' => $response
    ]);
}

log_debug('=== FIM REQUISIÇÃO ASAAS ===');
?>
