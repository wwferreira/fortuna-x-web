#!/usr/bin/env node

/**
 * Script para aplicar token automaticamente nos arquivos do bot
 * Bot Fortuna X - Sistema de Autenticação com Token
 * 
 * Uso:
 * node aplicar_token.js FRT-seu-token-aqui nome_cliente
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');
let JavaScriptObfuscator = null;

// Cores para o terminal
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function ensureObfuscator() {
    if (JavaScriptObfuscator) return true;
    try {
        JavaScriptObfuscator = require('javascript-obfuscator');
        return true;
    } catch (e) {
        log('⚠️ Módulo "javascript-obfuscator" não encontrado. Ofuscação será pulada.', 'yellow');
        return false;
    }
}

// Pegar token e nome do argumento
const token = process.argv[2];
const nomeCliente = process.argv[3];

if (!token) {
    log('❌ ERRO: Token não fornecido!', 'red');
    log('', 'reset');
    log('Uso:', 'yellow');
    log('  node aplicar_token.js FRT-seu-token-aqui nome_cliente', 'cyan');
    log('', 'reset');
    log('Exemplo:', 'yellow');
    log('  node aplicar_token.js FRT-a1b2c3d4-e5f6-4789 Joao_Silva', 'cyan');
    process.exit(1);
}

// Validar formato do token
if (!token.startsWith('FRT-')) {
    log('❌ ERRO: Token deve começar com "FRT-"', 'red');
    process.exit(1);
}

log('', 'reset');
log('🎯 Preparando arquivos para o cliente...', 'blue');
log(`🎫 Token: ${token}`, 'cyan');
if (nomeCliente) {
    log(`👤 Cliente: ${nomeCliente}`, 'cyan');
}
log('', 'reset');

// Resolver pasta de origem de forma flexível
function detectarPastaOriginal() {
    const base = path.join(__dirname, '..', 'Originais');
    const candidatos = [
        path.join(base, 'Fortuna X'),
        path.join(base, 'Bot_Fortuna_X'),
        path.join(base, 'Fortuna_X'),
        path.join(base, 'Bot_FortunaX')
    ];
    for (const p of candidatos) {
        if (fs.existsSync(p)) return p;
    }
    return null;
}

let pastaOriginal = detectarPastaOriginal();
const pastaCliente = path.join(__dirname, '..', 'Clientes', 'Bot_Cliente_Temp');

log('📋 Criando cópia dos arquivos originais...', 'cyan');

// Se não encontrou, pedir caminho manual
if (!pastaOriginal) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    log('⚠️ Pasta de origem não encontrada automaticamente.', 'yellow');
    rl.question('📁 Informe o caminho da pasta original do bot (ex: C:\\caminho\\Bot_Fortuna_X): ', (resp) => {
        rl.close();
        const candidato = resp && resp.trim() ? resp.trim() : '';
        if (!candidato || !fs.existsSync(candidato)) {
            log('❌ ERRO: Pasta original não encontrada!', 'red');
            log('Dicas:', 'yellow');
            log('- Crie a pasta Originais/Fortuna X e coloque os arquivos do bot', 'cyan');
            log('- Ou informe um caminho absoluto válido na pergunta acima', 'cyan');
            process.exit(1);
        }
        pastaOriginal = candidato;
        continuarProcesso();
    });
} else {
    continuarProcesso();
}

function continuarProcesso() {
    // Remover pasta temporária se existir
    if (fs.existsSync(pastaCliente)) {
        fs.rmSync(pastaCliente, { recursive: true, force: true });
    }

    copiarPasta(pastaOriginal, pastaCliente);
    log('✅ Cópia criada com sucesso!', 'green');
    log('', 'reset');

    processarArquivosToken();
}

// Copiar pasta recursivamente
function copiarPasta(origem, destino) {
    if (!fs.existsSync(destino)) {
        fs.mkdirSync(destino, { recursive: true });
    }
    
    const itens = fs.readdirSync(origem);
    
    itens.forEach(item => {
        const origemItem = path.join(origem, item);
        const destinoItem = path.join(destino, item);
        
        if (fs.statSync(origemItem).isDirectory()) {
            copiarPasta(origemItem, destinoItem);
        } else {
            fs.copyFileSync(origemItem, destinoItem);
        }
    });
}

function listarArquivosJsRecursivo(dir) {
    const encontrados = [];
    const itens = fs.readdirSync(dir, { withFileTypes: true });
    itens.forEach((item) => {
        const caminhoAtual = path.join(dir, item.name);
        if (item.isDirectory()) {
            encontrados.push(...listarArquivosJsRecursivo(caminhoAtual));
        } else if (item.isFile() && item.name.endsWith('.js')) {
            encontrados.push(caminhoAtual);
        }
    });
    return encontrados;
}

function processarArquivosToken() {
    const pastaTemp = path.join(__dirname, '..', 'Clientes', 'Bot_Cliente_Temp');
    const regexToken = /const\s+USER_NEKOT\s*=\s*'[^']*';/g;
    let sucessos = 0;
    let erros = 0;
    let arquivosComToken = 0;
    
    const arquivosJs = listarArquivosJsRecursivo(pastaTemp);

    arquivosJs.forEach((caminhoCompleto) => {
        try {
            const conteudo = fs.readFileSync(caminhoCompleto, 'utf8');
            const matches = conteudo.match(regexToken);

            if (!matches) {
                return;
            }

            arquivosComToken++;
            const conteudoNovo = conteudo.replace(regexToken, `const USER_NEKOT = '${token}';`);

            if (conteudoNovo !== conteudo) {
                fs.writeFileSync(caminhoCompleto, conteudoNovo, 'utf8');
                const relativo = path.relative(pastaTemp, caminhoCompleto);
                log(`✅ Token aplicado em: ${relativo}`, 'green');
                sucessos++;
            }
        } catch (error) {
            const relativo = path.relative(pastaTemp, caminhoCompleto);
            log(`❌ Erro ao processar ${relativo}: ${error.message}`, 'red');
            erros++;
        }
    });

    log('', 'reset');
    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'blue');
    log(`📊 Resultado: ${sucessos} sucessos, ${erros} erros, ${arquivosComToken} arquivos com USER_NEKOT`, 'cyan');

    if (arquivosComToken === 0) {
        log('', 'reset');
        log('❌ Nenhum arquivo com USER_NEKOT foi encontrado na cópia do bot.', 'red');
        log('💡 Verifique se os arquivos do bot estão corretos na pasta de origem indicada', 'yellow');
        process.exit(1);
    }

    if (erros === 0 && sucessos > 0) {
        log('', 'reset');
        log('🎉 SUCESSO! Token aplicado em todos os arquivos!', 'green');
        log('', 'reset');
        
        // Perguntar se deseja ofuscar
        perguntarOfuscacao();
    } else {
        log('', 'reset');
        log('⚠️  Alguns arquivos não foram modificados. Verifique os erros acima.', 'yellow');
        log('', 'reset');
        process.exit(1);
    }
}

// Função para perguntar se deseja ofuscar
function perguntarOfuscacao() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    log('🔒 Deseja ofuscar o código JavaScript? (s/n): ', 'yellow');
    
    rl.question('', (resposta) => {
        rl.close();
        
        const desejaOfuscar = resposta.toLowerCase() === 's' || resposta.toLowerCase() === 'sim';
        
        if (desejaOfuscar) {
            ofuscarCodigo();
        } else {
            log('', 'reset');
            log('⏭️  Ofuscação ignorada.', 'cyan');
        }
        
        // Compactar automaticamente
        compactarPasta(nomeCliente);
    });
}

// Função para ofuscar o código
function ofuscarCodigo() {
    if (!ensureObfuscator()) {
        return;
    }
    log('', 'reset');
    log('🔒 Ofuscando código JavaScript...', 'blue');
    log('⚠️  Proteção anti-deofuscação ativada!', 'yellow');
    
    const pastaTemp = path.join(__dirname, '..', 'Clientes', 'Bot_Cliente_Temp');
    
    // Arquivos JavaScript SEGUROS para ofuscar (não quebram o bot)
    const arquivosParaOfuscar = [
        'sidepanel.js',
        'background.js',
        'content/contentScript.js',
        'inserir-estrategias.js'
    ];
    
    // Arquivos que NÃO devem ser ofuscados (podem quebrar ou já estão ofuscados)
    // - background/worker.js (service worker sensível - NUNCA ofuscar)
    // - libs/service.js (JÁ ESTÁ OFUSCADO MANUALMENTE - não ofuscar novamente)
    // - libs/auth.js (contém validação crítica - não ofuscar)
    // - libs/* (bibliotecas críticas - podem quebrar)
    
    let ofuscados = 0;
    let errosOfuscacao = 0;
    
    arquivosParaOfuscar.forEach(arquivo => {
        const caminhoCompleto = path.join(pastaTemp, arquivo);
        
        try {
            if (!fs.existsSync(caminhoCompleto)) {
                log(`⚠️  Arquivo não encontrado: ${arquivo}`, 'yellow');
                return;
            }
            
            const codigo = fs.readFileSync(caminhoCompleto, 'utf8');
            
            // Configurações BALANCEADAS de ofuscação
            // Protege o código mas não quebra funcionalidade
            const codigoOfuscado = JavaScriptObfuscator.obfuscate(codigo, {
                compact: true,
                controlFlowFlattening: false,  // Desativado - pode quebrar async/await
                controlFlowFlatteningThreshold: 0,
                deadCodeInjection: false,  // Desativado - pode aumentar muito o tamanho
                deadCodeInjectionThreshold: 0,
                debugProtection: false,  // Desativado - pode causar problemas no Chrome
                debugProtectionInterval: 0,
                disableConsoleOutput: false,
                identifierNamesGenerator: 'hexadecimal',  // Mais seguro que mangled
                identifiersPrefix: '',
                ignoreImports: true,  // Importante para imports
                log: false,
                numbersToExpressions: true,
                renameGlobals: false,  // Não renomear globais - pode quebrar
                renameProperties: false,  // Não renomear propriedades - pode quebrar
                reservedNames: [],
                reservedStrings: [],
                seed: 0,
                selfDefending: false,  // Desativado - pode causar problemas
                simplify: true,
                sourceMap: false,
                splitStrings: true,
                splitStringsChunkLength: 10,
                stringArray: true,
                stringArrayCallsTransform: true,
                stringArrayCallsTransformThreshold: 0.75,
                stringArrayEncoding: ['base64'],  // Mais compatível que rc4
                stringArrayIndexesType: ['hexadecimal-number'],
                stringArrayIndexShift: true,
                stringArrayRotate: true,
                stringArrayShuffle: true,
                stringArrayWrappersCount: 2,
                stringArrayWrappersChainedCalls: true,
                stringArrayWrappersParametersMaxCount: 4,
                stringArrayWrappersType: 'function',
                stringArrayThreshold: 0.75,
                target: 'browser',
                transformObjectKeys: false,  // Desativado - pode quebrar
                unicodeEscapeSequence: false
            }).getObfuscatedCode();
            
            fs.writeFileSync(caminhoCompleto, codigoOfuscado, 'utf8');
            log(`✅ Ofuscado: ${arquivo}`, 'green');
            ofuscados++;
            
        } catch (error) {
            log(`❌ Erro ao ofuscar ${arquivo}: ${error.message}`, 'red');
            errosOfuscacao++;
        }
    });
    
    log('', 'reset');
    log(`📊 Ofuscação: ${ofuscados} arquivos ofuscados, ${errosOfuscacao} erros`, 'cyan');
    
    if (ofuscados > 0) {
        log('✅ Código ofuscado com sucesso!', 'green');
        log('🛡️  Proteção aplicada sem quebrar funcionalidade!', 'magenta');
        log('⚠️  Arquivos críticos preservados (worker.js, libs/*)!', 'yellow');
    }
}

// Função para compactar a pasta
function compactarPasta(nomeClienteParam) {
    // Se não tem nome do cliente, perguntar
    if (!nomeClienteParam) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        rl.question('👤 Digite o nome do cliente (ex: Joao_Silva): ', (nome) => {
            rl.close();
            executarCompactacao(nome || 'Cliente');
        });
    } else {
        executarCompactacao(nomeClienteParam);
    }
}

function executarCompactacao(nomeCliente) {
    log('', 'reset');
    log('📦 Compactando pasta...', 'blue');
    
    const pastaOrigem = path.join(__dirname, '..', 'Clientes', 'Bot_Cliente_Temp');
    
    // Limpar nome do cliente (remover caracteres especiais)
    const nomeClienteLimpo = nomeCliente.replace(/[^a-zA-Z0-9_]/g, '_');
    
    // Criar pasta Clientes se não existir
    const pastaBotClientes = path.join(__dirname, '..', 'Clientes');
    if (!fs.existsSync(pastaBotClientes)) {
        fs.mkdirSync(pastaBotClientes, { recursive: true });
        log('📁 Pasta Clientes criada!', 'cyan');
    }
    
    const nomeZip = `Bot_Fortuna_X_${nomeClienteLimpo}.zip`;
    const caminhoZip = path.join(pastaBotClientes, nomeZip);
    
    try {
        // Remover ZIP antigo se existir
        if (fs.existsSync(caminhoZip)) {
            log('🗑️  Removendo ZIP antigo...', 'yellow');
            fs.unlinkSync(caminhoZip);
        }
        
        // Tentar usar archiver primeiro (mais confiável)
        let archiverDisponivel = false;
        try {
            const archiver = require('archiver');
            archiverDisponivel = true;
            
            log('🔄 Usando archiver para compactar...', 'cyan');
            
            const output = fs.createWriteStream(caminhoZip);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Máxima compressão
            });
            
            // Eventos do archiver
            output.on('close', function() {
                const stats = fs.statSync(caminhoZip);
                const tamanhoMB = (stats.size / (1024 * 1024)).toFixed(2);
                
                // Limpar pasta temporária
                log('🧹 Limpando arquivos temporários...', 'cyan');
                fs.rmSync(pastaOrigem, { recursive: true, force: true });
                
                log('', 'reset');
                log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
                log('🎉 ARQUIVO ZIP CRIADO COM SUCESSO!', 'green');
                log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
                log('', 'reset');
                log(`📁 Arquivo: ${nomeZip}`, 'cyan');
                log(`📍 Local: Clientes/`, 'cyan');
                log(`📊 Tamanho: ${tamanhoMB} MB`, 'cyan');
                log(`👤 Cliente: ${nomeClienteLimpo}`, 'cyan');
                log(`🎫 Token: ${token}`, 'cyan');
                log(`✅ Originais preservados em Originais/!`, 'green');
                log('', 'reset');
                log('✅ Próximo passo:', 'yellow');
                log(`  Envie o arquivo "${nomeZip}" para o cliente`, 'cyan');
                log('', 'reset');
            });
            
            archive.on('error', function(err) {
                throw err;
            });
            
            // Pipe do archive para o arquivo de saída
            archive.pipe(output);
            
            // Adicionar todos os arquivos da pasta temporária
            archive.directory(pastaOrigem, false);
            
            // Finalizar o arquivo
            archive.finalize();
            
        } catch (errArchiver) {
            // Se archiver não estiver disponível, usar PowerShell/zip
            if (!archiverDisponivel) {
                log('⚠️  Archiver não disponível, usando método alternativo...', 'yellow');
                
                const isWindows = process.platform === 'win32';
                
                if (isWindows) {
                    // Windows: usar PowerShell com caminhos absolutos
                    log('🔄 Usando PowerShell para compactar...', 'cyan');
                    
                    // Converter para caminhos absolutos e normalizar
                    const pastaOrigemAbs = path.resolve(pastaOrigem);
                    const caminhoZipAbs = path.resolve(caminhoZip);
                    
                    // Criar script PowerShell temporário
                    const scriptPS = path.join(__dirname, 'temp_compress.ps1');
                    const scriptContent = `
$ErrorActionPreference = "Stop"
$source = "${pastaOrigemAbs}"
$destination = "${caminhoZipAbs}"

Write-Host "Compactando: $source"
Write-Host "Destino: $destination"

if (Test-Path $destination) {
    Remove-Item $destination -Force
}

Compress-Archive -Path "$source\\*" -DestinationPath $destination -CompressionLevel Optimal -Force

if (Test-Path $destination) {
    Write-Host "ZIP criado com sucesso!"
    exit 0
} else {
    Write-Host "Erro: ZIP nao foi criado"
    exit 1
}
`;
                    
                    fs.writeFileSync(scriptPS, scriptContent, 'utf8');
                    
                    try {
                        execSync(`powershell -NoProfile -ExecutionPolicy Bypass -File "${scriptPS}"`, { 
                            stdio: 'inherit',
                            encoding: 'utf8'
                        });
                        
                        // Remover script temporário
                        fs.unlinkSync(scriptPS);
                        
                    } catch (errPS) {
                        // Remover script temporário mesmo com erro
                        if (fs.existsSync(scriptPS)) {
                            fs.unlinkSync(scriptPS);
                        }
                        throw errPS;
                    }
                    
                } else {
                    // Linux/Mac: usar zip
                    log('🔄 Usando zip para compactar...', 'cyan');
                    
                    const comando = `cd "${path.dirname(pastaOrigem)}" && zip -r "${caminhoZip}" "${path.basename(pastaOrigem)}"`;
                    execSync(comando, { stdio: 'inherit' });
                }
                
                // Verificar se o arquivo foi criado
                if (fs.existsSync(caminhoZip)) {
                    const stats = fs.statSync(caminhoZip);
                    const tamanhoMB = (stats.size / (1024 * 1024)).toFixed(2);
                    
                    // Limpar pasta temporária
                    log('🧹 Limpando arquivos temporários...', 'cyan');
                    fs.rmSync(pastaOrigem, { recursive: true, force: true });
                    
                    log('', 'reset');
                    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
                    log('🎉 ARQUIVO ZIP CRIADO COM SUCESSO!', 'green');
                    log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'green');
                    log('', 'reset');
                    log(`📁 Arquivo: ${nomeZip}`, 'cyan');
                    log(`📍 Local: Clientes/`, 'cyan');
                    log(`📊 Tamanho: ${tamanhoMB} MB`, 'cyan');
                    log(`👤 Cliente: ${nomeClienteLimpo}`, 'cyan');
                    log(`🎫 Token: ${token}`, 'cyan');
                    log(`✅ Originais preservados em Originais/!`, 'green');
                    log('', 'reset');
                    log('✅ Próximo passo:', 'yellow');
                    log(`  Envie o arquivo "${nomeZip}" para o cliente`, 'cyan');
                    log('', 'reset');
                } else {
                    throw new Error('Arquivo ZIP não foi criado');
                }
            } else {
                throw errArchiver;
            }
        }
        
    } catch (error) {
        log('', 'reset');
        log('❌ ERRO ao compactar:', 'red');
        log(error.message, 'red');
        log('', 'reset');
        log('💡 Solução:', 'yellow');
        log('  1. Instale o archiver: npm install archiver', 'cyan');
        log('  2. Ou compacte manualmente a pasta "Bot_Cliente_Temp"', 'cyan');
        log('', 'reset');
        
        // Tentar limpar pasta temporária mesmo com erro
        try {
            if (fs.existsSync(pastaOrigem)) {
                fs.rmSync(pastaOrigem, { recursive: true, force: true });
            }
        } catch (e) {
            // Ignorar erro de limpeza
        }
    }
}
