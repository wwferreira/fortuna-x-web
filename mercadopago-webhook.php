<?php
require_once 'mercadopago-config.php';
require_once 'admin/registrar-venda.php';

// Receber notificação
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Log da notificação
$logData = "=== WEBHOOK MERCADO PAGO ===\n";
$logData .= "Data: " . date('d/m/Y H:i:s') . "\n";
$logData .= "Dados: " . print_r($data, true) . "\n";
$logData .= "====================\n\n";
file_put_contents('webhook-mp.log', $logData, FILE_APPEND);

// Verificar tipo de notificação
if (isset($data['type']) && $data['type'] === 'payment') {
    $paymentId = $data['data']['id'];
    
    // Buscar informações do pagamento
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://api.mercadopago.com/v1/payments/$paymentId");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . MP_ACCESS_TOKEN
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode === 200) {
        $payment = json_decode($response, true);
        
        // Log do pagamento
        $logData = "=== PAGAMENTO RECEBIDO ===\n";
        $logData .= "Data: " . date('d/m/Y H:i:s') . "\n";
        $logData .= "ID: " . $payment['id'] . "\n";
        $logData .= "Status: " . $payment['status'] . "\n";
        $logData .= "Valor: R$ " . $payment['transaction_amount'] . "\n";
        $logData .= "Email: " . $payment['payer']['email'] . "\n";
        $logData .= "Referência: " . $payment['external_reference'] . "\n";
        $logData .= "====================\n\n";
        file_put_contents('pagamentos-confirmados.log', $logData, FILE_APPEND);
        
        // Aqui você pode:
        // 1. Enviar e-mail de confirmação
        // 2. Liberar acesso ao bot
        // 3. Atualizar banco de dados
        
        if ($payment['status'] === 'approved') {
            // PAGAMENTO APROVADO
            
            // Tentar extrair Bot e Plano da descrição se não houver external_reference estruturado
            $descricao = $payment['description'] ?? '';
            $bot = 'Bot';
            $plano = 'Plano';
            
            if (strpos($descricao, ' - ') !== false) {
                $partes = explode(' - ', $descricao);
                $bot = trim($partes[0]);
                $plano = trim($partes[1]);
            }

            $dadosVenda = [
                'nome' => $payment['payer']['first_name'] . ' ' . $payment['payer']['last_name'],
                'email' => $payment['payer']['email'],
                'telefone' => $payment['payer']['phone']['number'] ?? '',
                'cpf' => $payment['payer']['identification']['number'] ?? '',
                'bot' => $bot,
                'plano' => $plano,
                'valor' => $payment['transaction_amount'],
                'metodo' => 'Mercado Pago',
                'id_transacao' => $payment['id']
            ];

            registrarVendaConfirmada($dadosVenda);
        }
    }
}

http_response_code(200);
echo json_encode(['success' => true]);
?>
