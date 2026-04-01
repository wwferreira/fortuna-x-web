<?php
/**
 * infinitepay-webhook.php
 * Webhook para processar confirmações de pagamento da InfinitePay.
 */

require_once 'admin/registrar-venda.php';

// Receber notificação
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Log detalhado de toda requisição
$logData = "--- NOVO HIT WEBHOOK [" . date('d/m/Y H:i:s') . "] ---\n";
$logData .= "IP: " . $_SERVER['REMOTE_ADDR'] . "\n";
$logData .= "HEADERS: " . json_encode(getallheaders()) . "\n";
$logData .= "PAYLOAD: " . $input . "\n";
$logData .= "------------------------------------------\n\n";
file_put_contents('webhook-infinitepay.log', $logData, FILE_APPEND);

// Verificar se o pagamento foi aprovado
if (isset($data['status']) && ($data['status'] === 'paid' || $data['status'] === 'approved' || $data['data']['status'] === 'paid')) {
    
    // Extrair dados (ajustar conforme o payload real da InfinitePay)
    // Normalmente os metadados estão em 'metadata' ou 'external_reference'
    $metadata = $data['metadata'] ?? $data['data']['metadata'] ?? [];
    
    // Tentar pegar valor de diferentes estruturas possíveis
    $amount = $data['amount'] ?? $data['data']['amount'] ?? 0;
    
    $dadosVenda = [
        'nome' => $metadata['nome'] ?? $data['customer']['name'] ?? $data['data']['customer']['name'] ?? 'Cliente InfinitePay',
        'email' => $metadata['email'] ?? $data['customer']['email'] ?? $data['data']['customer']['email'] ?? '',
        'telefone' => $metadata['telefone'] ?? $data['data']['metadata']['telefone'] ?? '',
        'cpf' => $metadata['cpf'] ?? $data['data']['metadata']['cpf'] ?? '',
        'bot' => $metadata['bot'] ?? 'Bot',
        'plano' => $metadata['plano'] ?? 'Plano',
        'valor' => $amount / 100, // Centavos para Real
        'metodo' => 'InfinitePay',
        'id_transacao' => $data['id'] ?? $data['data']['id'] ?? uniqid(),
    ];

    $success = registrarVendaConfirmada($dadosVenda);
    
    $logResult = "--- RESULTADO REGISTRO ---\n";
    $logResult .= "Sucesso: " . ($success ? "SIM" : "NÃO") . "\n";
    $logResult .= "--------------------------\n\n";
    file_put_contents('webhook-infinitepay.log', $logResult, FILE_APPEND);
}

// Sempre responder 200 OK para a API
http_response_code(200);
echo json_encode(['success' => true]);
?>
