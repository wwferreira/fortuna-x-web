<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Receber dados
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos']);
    exit;
}

// ===== CONFIGURE SEU E-MAIL HOTMAIL AQUI =====
$smtp_host = 'smtp-mail.outlook.com';
$smtp_port = 587;
$smtp_user = 'wwferreira@hotmail.com'; // SEU E-MAIL HOTMAIL
$smtp_pass = 'SUA_SENHA_AQUI'; // SUA SENHA DO HOTMAIL
$email_destino = 'wwferreira@hotmail.com'; // ONDE RECEBER
// =============================================

// Montar mensagem
$assunto = 'Novo Cadastro - Rei dos Bots';
$mensagem = "
NOVO CADASTRO RECEBIDO!

=== DADOS DO CLIENTE ===
Nome: {$data['nome']}
E-mail: {$data['email']}
Telefone: {$data['telefone']}
CPF: {$data['cpf']}

=== DADOS DA COMPRA ===
Bot: {$data['bot']}
Plano: {$data['plano']}
Valor: R$ {$data['valor']}

Data: " . date('d/m/Y H:i:s') . "

IMPORTANTE: O CPF informado deve ser o mesmo do comprovante PIX.
";

// Tentar enviar via socket SMTP
$resultado = enviarEmailSMTP($smtp_host, $smtp_port, $smtp_user, $smtp_pass, $email_destino, $assunto, $mensagem);

if ($resultado['success']) {
    // Também salvar em arquivo como backup
    $logFile = 'admin/cadastros.json';
    $novaVenda = [
        'data' => date('d/m/Y H:i:s'),
        'nome' => $data['nome'] ?? 'N/A',
        'email' => $data['email'] ?? 'N/A',
        'telefone' => $data['telefone'] ?? 'N/A',
        'cpf' => $data['cpf'] ?? 'N/A',
        'bot' => $data['bot'] ?? 'N/A',
        'plano' => $data['plano'] ?? 'N/A',
        'valor' => $data['valor'] ?? '0.00'
    ];

    $leads = [];
    if (file_exists($logFile)) {
        $leads = json_decode(file_get_contents($logFile), true) ?: [];
    }
    $leads[] = $novaVenda;
    file_put_contents($logFile, json_encode($leads, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'E-mail enviado com sucesso!']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao enviar e-mail: ' . $resultado['error']]);
}

function enviarEmailSMTP($host, $port, $user, $pass, $to, $subject, $message) {
    try {
        $socket = fsockopen($host, $port, $errno, $errstr, 30);
        if (!$socket) {
            return ['success' => false, 'error' => "Conexão falhou: $errstr ($errno)"];
        }
        
        // Ler resposta inicial
        fgets($socket);
        
        // EHLO
        fputs($socket, "EHLO " . $_SERVER['HTTP_HOST'] . "\r\n");
        fgets($socket);
        
        // STARTTLS
        fputs($socket, "STARTTLS\r\n");
        fgets($socket);
        stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT | STREAM_CRYPTO_METHOD_TLSv1_2_CLIENT);
        
        // EHLO novamente
        fputs($socket, "EHLO " . $_SERVER['HTTP_HOST'] . "\r\n");
        fgets($socket);
        
        // AUTH LOGIN
        fputs($socket, "AUTH LOGIN\r\n");
        fgets($socket);
        fputs($socket, base64_encode($user) . "\r\n");
        fgets($socket);
        fputs($socket, base64_encode($pass) . "\r\n");
        $auth_response = fgets($socket);
        
        if (strpos($auth_response, '235') === false) {
            fclose($socket);
            return ['success' => false, 'error' => 'Autenticação falhou. Verifique usuário e senha.'];
        }
        
        // MAIL FROM
        fputs($socket, "MAIL FROM: <$user>\r\n");
        fgets($socket);
        
        // RCPT TO
        fputs($socket, "RCPT TO: <$to>\r\n");
        fgets($socket);
        
        // DATA
        fputs($socket, "DATA\r\n");
        fgets($socket);
        
        // Headers e mensagem
        $email_content = "From: Rei dos Bots <$user>\r\n";
        $email_content .= "To: <$to>\r\n";
        $email_content .= "Subject: $subject\r\n";
        $email_content .= "Content-Type: text/plain; charset=UTF-8\r\n";
        $email_content .= "\r\n";
        $email_content .= $message;
        $email_content .= "\r\n.\r\n";
        
        fputs($socket, $email_content);
        fgets($socket);
        
        // QUIT
        fputs($socket, "QUIT\r\n");
        fclose($socket);
        
        return ['success' => true];
        
    } catch (Exception $e) {
        return ['success' => false, 'error' => $e->getMessage()];
    }
}
?>
