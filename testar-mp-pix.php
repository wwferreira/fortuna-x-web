<?php
header('Content-Type: application/json');
require_once 'mercadopago-config.php';

echo "<h1>Teste de Configuração Mercado Pago - PIX</h1>";
echo "<hr>";

echo "<h2>1. Credenciais Configuradas:</h2>";
echo "<p><strong>Modo:</strong> " . (MP_PRODUCTION ? "PRODUÇÃO" : "TESTE") . "</p>";
echo "<p><strong>Access Token:</strong> " . substr(MP_ACCESS_TOKEN, 0, 20) . "...</p>";
echo "<p><strong>Public Key:</strong> " . substr(MP_PUBLIC_KEY, 0, 20) . "...</p>";
echo "<hr>";

echo "<h2>2. Testando Criação de Preferência com PIX:</h2>";

// Criar preferência de teste
$preference = [
    'items' => [
        [
            'title' => 'Teste PIX - Fortuna Bot',
            'description' => 'Teste de pagamento com PIX',
            'quantity' => 1,
            'currency_id' => 'BRL',
            'unit_price' => 1.00
        ]
    ],
    'payer' => [
        'name' => 'Teste',
        'email' => 'teste@teste.com',
        'phone' => [
            'number' => '11999999999'
        ],
        'identification' => [
            'type' => 'CPF',
            'number' => '12345678909'
        ]
    ],
    'back_urls' => [
        'success' => MP_SUCCESS_URL,
        'failure' => MP_FAILURE_URL,
        'pending' => MP_PENDING_URL
    ],
    'auto_return' => 'approved',
    'statement_descriptor' => 'REI DOS BOTS',
    'external_reference' => 'TESTE_PIX_' . time(),
    'binary_mode' => false,
    'payment_methods' => [
        'excluded_payment_types' => [],
        'excluded_payment_methods' => [],
        'installments' => 12,
        'default_installments' => 1
    ],
    'purpose' => 'wallet_purchase'
];

echo "<p><strong>Dados da preferência:</strong></p>";
echo "<pre>" . json_encode($preference, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
echo "<hr>";

// Fazer requisição
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
$error = curl_error($ch);
curl_close($ch);

echo "<h2>3. Resposta da API:</h2>";
echo "<p><strong>HTTP Code:</strong> $httpCode</p>";

if ($error) {
    echo "<p style='color: red;'><strong>Erro CURL:</strong> $error</p>";
}

if ($httpCode === 201) {
    $result = json_decode($response, true);
    echo "<p style='color: green;'><strong>✓ Preferência criada com sucesso!</strong></p>";
    echo "<p><strong>ID da Preferência:</strong> " . $result['id'] . "</p>";
    echo "<p><strong>Link de Pagamento:</strong></p>";
    echo "<p><a href='" . $result['init_point'] . "' target='_blank' style='background: #009ee3; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;'>🔗 Abrir Checkout (Testar PIX)</a></p>";
    
    echo "<hr>";
    echo "<h2>4. Métodos de Pagamento Disponíveis:</h2>";
    if (isset($result['payment_methods'])) {
        echo "<pre>" . json_encode($result['payment_methods'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
    } else {
        echo "<p>Informação não retornada pela API. Abra o link acima para verificar se PIX está disponível.</p>";
    }
    
    echo "<hr>";
    echo "<h2>5. Resposta Completa:</h2>";
    echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
} else {
    $result = json_decode($response, true);
    echo "<p style='color: red;'><strong>✗ Erro ao criar preferência!</strong></p>";
    echo "<pre>" . json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "</pre>";
}

echo "<hr>";
echo "<h2>6. Instruções:</h2>";
echo "<ol>";
echo "<li>Se o HTTP Code for 201, clique no link azul acima</li>";
echo "<li>Verifique se o PIX aparece como opção de pagamento</li>";
echo "<li>Se não aparecer, pode ser que sua conta do Mercado Pago não tenha PIX habilitado</li>";
echo "<li>Acesse o painel do Mercado Pago e verifique se PIX está ativo na sua conta</li>";
echo "</ol>";
?>
