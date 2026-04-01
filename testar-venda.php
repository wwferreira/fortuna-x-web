<?php
/**
 * testar-venda.php
 * Script para testar manualmente se o sistema de registro de vendas está funcionando.
 */

require_once 'registrar-venda.php';

$dadosTeste = [
    'nome' => 'Teste Manual',
    'email' => 'teste@exemplo.com',
    'telefone' => '(11) 99999-9999',
    'cpf' => '000.000.000-00',
    'bot' => 'Bot Teste',
    'plano' => 'Plano Teste',
    'valor' => '1.00',
    'metodo' => 'TESTE MANUAL',
    'id_transacao' => 'TESTE_' . time()
];

echo "<h1>Teste de Registro de Venda</h1>";
echo "<p>Tentando registrar uma venda de teste...</p>";

$resultado = registrarVendaConfirmada($dadosTeste);

if ($resultado) {
    echo "<p style='color: green; font-weight: bold;'>✅ SUCESSO! A venda foi registrada.</p>";
    echo "<p>Verifique agora o painel em: <a href='admin-vendas.php'>admin-vendas.php</a></p>";
} else {
    echo "<p style='color: red; font-weight: bold;'>❌ ERRO! Não foi possível registrar a venda.</p>";
    echo "<p>Certifique-se de que o arquivo <strong>vendas-confirmadas.json</strong> tem permissão de escrita.</p>";
}
?>
