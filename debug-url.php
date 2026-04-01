<?php
$protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? "https" : "http";
$host = $_SERVER['HTTP_HOST'];
$script = $_SERVER['PHP_SELF'];
$dir = dirname($script);
// Remover barras extras se necessário
$dir = ($dir === '\\' || $dir === '/') ? '' : $dir;

$full_url = $protocol . "://" . $host . $dir . "/infinitepay-webhook.php";

echo "Protocolo: $protocol\n";
echo "Host: $host\n";
echo "Script: $script\n";
echo "Dir: $dir\n";
echo "Webhook URL Sugerida: $full_url\n";
?>
