<?php
// Arquivo de teste para verificar se o PHP está funcionando

echo "<html>";
echo "<head>";
echo "<title>Teste PHP - Rei dos Bots</title>";
echo "<style>
    body {
        font-family: Arial, sans-serif;
        background: #0a0a0a;
        color: #00ff41;
        padding: 40px;
        text-align: center;
    }
    .success {
        background: rgba(0, 255, 65, 0.1);
        border: 2px solid #00ff41;
        padding: 30px;
        border-radius: 15px;
        max-width: 600px;
        margin: 0 auto;
    }
    h1 { font-size: 48px; margin-bottom: 20px; }
    p { font-size: 18px; line-height: 1.6; }
    .info { color: #fff; margin: 10px 0; }
    a {
        display: inline-block;
        margin-top: 20px;
        padding: 15px 30px;
        background: #00cc33;
        color: #000;
        text-decoration: none;
        border-radius: 10px;
        font-weight: bold;
    }
    a:hover { background: #00ff41; }
</style>";
echo "</head>";
echo "<body>";

echo "<div class='success'>";
echo "<h1>✅ PHP Funcionando!</h1>";
echo "<p>Parabéns! O servidor PHP está configurado corretamente.</p>";

echo "<div class='info'>";
echo "<p><strong>Versão do PHP:</strong> " . phpversion() . "</p>";
echo "<p><strong>Servidor:</strong> " . $_SERVER['SERVER_SOFTWARE'] . "</p>";
echo "<p><strong>Data/Hora:</strong> " . date('d/m/Y H:i:s') . "</p>";
echo "</div>";

echo "<p style='margin-top: 30px;'>Agora você pode testar o sistema completo!</p>";
echo "<a href='index.html'>Ir para o Site</a>";
echo "</div>";

echo "</body>";
echo "</html>";
?>
