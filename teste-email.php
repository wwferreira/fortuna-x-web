<?php
// Teste simples de envio de e-mail

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>Testando envio de e-mail...</h2>";

$para = 'wwferreira@hotmail.com';
$assunto = 'TESTE - Rei dos Bots';
$mensagem = 'Este é um e-mail de teste. Se você recebeu, o sistema está funcionando!';
$headers = "From: noreply@hypersecurity.com.br\r\n";
$headers .= "Reply-To: wwferreira@hotmail.com\r\n";
$headers .= "Content-type: text/plain; charset=UTF-8\r\n";

echo "<p>Enviando para: <strong>$para</strong></p>";

$resultado = mail($para, $assunto, $mensagem, $headers);

if ($resultado) {
    echo "<h3 style='color: green;'>✅ E-mail enviado com sucesso!</h3>";
    echo "<p>Verifique sua caixa de entrada e SPAM</p>";
} else {
    echo "<h3 style='color: red;'>❌ Erro ao enviar e-mail</h3>";
    echo "<p>O servidor não conseguiu enviar.</p>";
}

echo "<hr>";
echo "<p>PHP Version: " . phpversion() . "</p>";
echo "<p>Host: " . $_SERVER['HTTP_HOST'] . "</p>";
?>
