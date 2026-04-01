<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Receber dados do formulário
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Dados inválidos']);
    exit;
}

// Configurações do e-mail
$para = 'wwferreira@hotmail.com'; // SEU E-MAIL
$assunto = 'Novo Cadastro - Rei dos Bots';

// Montar o corpo do e-mail
$mensagem = "
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #00cc33, #00aa2b); color: white; padding: 20px; text-align: center; }
        .content { background: #f4f4f4; padding: 20px; }
        .info-box { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #00cc33; }
        .label { font-weight: bold; color: #00cc33; }
        .value { color: #333; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>🤖 Novo Cadastro - Rei dos Bots</h1>
        </div>
        <div class='content'>
            <h2>Informações do Cliente</h2>
            
            <div class='info-box'>
                <p><span class='label'>Nome:</span> <span class='value'>{$data['nome']}</span></p>
            </div>
            
            <div class='info-box'>
                <p><span class='label'>E-mail:</span> <span class='value'>{$data['email']}</span></p>
            </div>
            
            <div class='info-box'>
                <p><span class='label'>Telefone:</span> <span class='value'>{$data['telefone']}</span></p>
            </div>
            
            <div class='info-box'>
                <p><span class='label'>CPF:</span> <span class='value'>{$data['cpf']}</span></p>
            </div>
            
            <h2>Detalhes da Compra</h2>
            
            <div class='info-box'>
                <p><span class='label'>Bot:</span> <span class='value'>{$data['bot']}</span></p>
            </div>
            
            <div class='info-box'>
                <p><span class='label'>Plano:</span> <span class='value'>{$data['plano']}</span></p>
            </div>
            
            <div class='info-box'>
                <p><span class='label'>Valor:</span> <span class='value'>R$ {$data['valor']}</span></p>
            </div>
            
            <p style='margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107;'>
                ⚠️ <strong>Importante:</strong> O CPF informado deve ser o mesmo do comprovante PIX.
            </p>
        </div>
        <div class='footer'>
            <p>Este é um e-mail automático do sistema Rei dos Bots - Fortuna</p>
            <p>Data: " . date('d/m/Y H:i:s') . "</p>
        </div>
    </div>
</body>
</html>
";

// Headers do e-mail
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type:text/html;charset=UTF-8" . "\r\n";
$headers .= "From: Rei dos Bots <noreply@hypersecurity.com.br>" . "\r\n";
$headers .= "Reply-To: wwferreira@hotmail.com" . "\r\n";

// Enviar e-mail
if (mail($para, $assunto, $mensagem, $headers)) {
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'E-mail enviado com sucesso']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao enviar e-mail']);
}
?>
