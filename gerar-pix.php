<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ==============================
// Configuração do PIX
// ==============================
$PIX_KEY  = '72472ea5-3170-410a-ae08-29c9cd9bcdf3'; // Chave PIX (Aleatória)
$PIX_NAME = 'REI DOS BOTS';   // Nome do recebedor (máx 25 chars)
$PIX_CITY = 'SAO PAULO';      // Cidade do recebedor (máx 15 chars)

// ==============================
// Receber dados do frontend
// ==============================
$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Dados inválidos']);
    exit;
}

$valor = floatval($input['valor'] ?? 0);

if ($valor <= 0) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Valor inválido']);
    exit;
}

// ==============================
// Funções auxiliares EMV
// ==============================

/**
 * Monta um campo TLV (Tag-Length-Value) do padrão EMV.
 */
function emv_field($id, $value) {
    return $id . str_pad(strlen($value), 2, '0', STR_PAD_LEFT) . $value;
}

/**
 * Calcula o CRC-16/CCITT-FALSE conforme especificação PIX.
 */
function crc16_ccitt($payload) {
    $crc = 0xFFFF;
    $polynomial = 0x1021;

    for ($i = 0; $i < strlen($payload); $i++) {
        $crc ^= (ord($payload[$i]) << 8);
        for ($j = 0; $j < 8; $j++) {
            if (($crc & 0x8000) !== 0) {
                $crc = (($crc << 1) ^ $polynomial) & 0xFFFF;
            } else {
                $crc = ($crc << 1) & 0xFFFF;
            }
        }
    }

    return strtoupper(str_pad(dechex($crc), 4, '0', STR_PAD_LEFT));
}

// ==============================
// Construir Payload PIX EMV
// ==============================

// ID 00 - Payload Format Indicator
$payload  = emv_field('00', '01');

// ID 26 - Merchant Account Information (PIX)
$gui      = emv_field('00', 'br.gov.bcb.pix');  // GUI padrão PIX
$chave    = emv_field('01', $PIX_KEY);           // Chave PIX
$payload .= emv_field('26', $gui . $chave);

// ID 52 - Merchant Category Code
$payload .= emv_field('52', '0000');

// ID 53 - Transaction Currency (986 = BRL)
$payload .= emv_field('53', '986');

// ID 54 - Transaction Amount
$payload .= emv_field('54', number_format($valor, 2, '.', ''));

// ID 58 - Country Code
$payload .= emv_field('58', 'BR');

// ID 59 - Merchant Name
$payload .= emv_field('59', $PIX_NAME);

// ID 60 - Merchant City
$payload .= emv_field('60', $PIX_CITY);

// ID 62 - Additional Data Field (txid)
// Para Pix Estático (sem API de cobrança), o padrão recomendado é '***'
$txid = '***';
$payload .= emv_field('62', emv_field('05', $txid));

// ID 63 - CRC16 (adicionar placeholder para calcular)
$payload .= '6304';
$crc = crc16_ccitt($payload);
$payload .= $crc;

// ==============================
// Gerar QR Code
// ==============================
$qr_code_url = 'https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' .
               urlencode($payload);

echo json_encode([
    'success'    => true,
    'qr_code_url' => $qr_code_url,
    'pix_code'   => $payload,
    'valor'      => $valor,
    'pix_key'    => $PIX_KEY
]);
?>
