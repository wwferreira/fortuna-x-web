console.log('🚀 CONTENT SCRIPT INICIADO!');
console.log('🌐 URL:', window.location.href);
console.log('🖼️ É iframe?', window !== window.top);
console.log('⏰ Timestamp:', new Date().toLocaleTimeString());

let ultimoNumeroEnviado = null;
let ultimaSequenciaHash = ""; // Hash das últimas rodadas para detectar repetições legítimas
let numerosJaApostados = new Set();
let ultimaApostaTimestamp = 0;

// SISTEMA DE VALIDAÇÃO DE DOMÍNIO
const DOMINIOS_AUTORIZADOS = [
    'bet365.com',
    'bet365.bet.br',
    'bet365.com.br',
    'bet365.net.br',
    'onegameslink.com',
    'twogameslink.com',
    'gambling-malta.com',
    'c365play.com',
    'bfcdl.com'
];

function isPaginaAutorizada() {
    const hostname = window.location.hostname;
    return DOMINIOS_AUTORIZADOS.some(dominio => hostname.includes(dominio));
}

// LIMPEZA EM NAVEGAÇÃO
window.addEventListener('popstate', () => {
    if (alertaAtual) {
        alertaAtual.remove();
        alertaAtual = null;
    }
});

// Cache do estado de autorização
const PAGINA_VALIDA = isPaginaAutorizada();

if (!PAGINA_VALIDA) {
    console.log('🛑 [FORTUNA X] Script carregado em página não autorizada. Funcionalidades de UI desativadas.');
}

// COLETAR 12 NUMEROS E NOME DA MESA
setTimeout(function() {
    // Ao iniciar o script, limpar qualquer alerta residual que possa ter ficado no DOM
    const alertasAntigos = document.querySelectorAll('div[style*="z-index: 999999"]');
    alertasAntigos.forEach(a => a.remove());

    var elementos = document.querySelectorAll('.history-item-value__text--H6oCX');
    var numeros = [];
    
    for (var i = 0; i < Math.min(12, elementos.length); i++) {
        var num = parseInt(elementos[i].textContent.trim());
        if (!isNaN(num) && num >= 0 && num <= 36) {
            numeros.push(num);
        }
    }
    
    // Pegar nome da mesa
    var nomeMesaElement = document.querySelector('.table-info__name--supqO');
    var nomeMesa = nomeMesaElement ? nomeMesaElement.textContent.trim() : 'Roleta';
    
    if (numeros.length > 0 && chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
            tipo: 'historico_12',
            numeros: numeros
        });
    }
    
    // Enviar nome da mesa
    if (chrome.runtime && chrome.runtime.id) {
        chrome.runtime.sendMessage({
            tipo: 'nome_mesa',
            nome: nomeMesa
        });
    }
}, 10000);

// ===== FUNÇÕES AUXILIARES =====

let alertaAtual = null;

function mostrarAlertaNaPagina(mensagem, cor = '#4CAF50', duracao = 3000) {
    // 🛑 Bloquear se não for página autorizada
    if (!PAGINA_VALIDA) return;

    // Remover alerta anterior se existir
    if (alertaAtual) {
        alertaAtual.remove();
        alertaAtual = null;
    }

    const alerta = document.createElement('div');
    alerta.style.cssText = `
        position: fixed;
        top: 3%;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, ${cor} 0%, #1a1a1a 100%);
        color: white;
        padding: 6px 14px;
        border-radius: 8px;
        font-size: 13px;
        font-weight: 700;
        z-index: 999999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        opacity: 0;
        max-width: 90%;
        width: auto;
        min-width: 120px;
        word-wrap: break-word;
        text-align: center;
        border: 1px solid rgba(255,215,0,0.5);
        text-shadow: 1px 1px 2px rgba(0,0,0,0.6);
        transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    `;
    alerta.textContent = mensagem;
    document.body.appendChild(alerta);

    // Animação de entrada
    setTimeout(() => {
        alerta.style.opacity = '1';
        alerta.style.top = '5%';
    }, 10);

    alertaAtual = alerta;

    setTimeout(() => {
        if (alerta.parentNode) {
            alerta.remove();
        }
        if (alertaAtual === alerta) {
            alertaAtual = null;
        }
    }, duracao);
}

// ===== SISTEMA DE CLIQUES =====

function simularClick(x, y) {
    const elemento = document.elementFromPoint(x, y);
    if (!elemento) return false;

    const eventos = ['mousedown', 'mouseup', 'click'];
    eventos.forEach(tipoEvento => {
        const evento = new MouseEvent(tipoEvento, {
            view: window,
            bubbles: true,
            cancelable: true,
            clientX: x,
            clientY: y
        });
        elemento.dispatchEvent(evento);
    });

    return true;
}

function clicarNumero(numero) {
    try {
        console.log(`🎯 Tentando clicar no número: ${numero}`);
        const seletor = `[data-automation-locator="betPlace.straight-${numero}"]`;
        const elemento = document.querySelector(seletor);

        if (elemento) {
            console.log(`✅ Elemento encontrado para ${numero}, clicando...`);
            const rect = elemento.getBoundingClientRect();
            const x = Math.trunc(rect.x + rect.width / 2);
            const y = Math.trunc(rect.y + rect.height / 2);
            const resultado = simularClick(x, y);
            console.log(`${resultado ? '✅' : '❌'} Clique no número ${numero}: ${resultado ? 'sucesso' : 'falhou'}`);
            return resultado;
        }

        console.log(`⚠️ Elemento não encontrado com seletor, tentando busca por texto...`);
        const todosGs = document.querySelectorAll('g[class*="table-cell"]');
        for (let g of todosGs) {
            const textElement = g.querySelector('text');
            if (textElement && textElement.textContent.trim() === numero.toString()) {
                console.log(`✅ Encontrado por texto para ${numero}, clicando...`);
                const rect = g.getBoundingClientRect();
                const x = Math.trunc(rect.x + rect.width / 2);
                const y = Math.trunc(rect.y + rect.height / 2);
                const resultado = simularClick(x, y);
                console.log(`${resultado ? '✅' : '❌'} Clique no número ${numero}: ${resultado ? 'sucesso' : 'falhou'}`);
                return resultado;
            }
        }

        console.log(`❌ Número ${numero} não encontrado na mesa`);
        return false;
    } catch (error) {
        console.log(`❌ Erro ao clicar no número ${numero}:`, error);
        return false;
    }
}

// Função para clicar em áreas externas (Dúzias e Colunas)
function clicarAreaExterna(sigla) {
    return new Promise((resolve) => {
        const tentarClicar = (tentativa = 0) => {
            try {
                // Mapeamento para diferentes tipos de roleta
                const mapeamento = {
                    // Immersive Roulette
                    'D1': ['betPlace.dozen-1st12', 'betPlace.dozen-1', 'dozen-1st12'],
                    'D2': ['betPlace.dozen-2nd12', 'betPlace.dozen-2', 'dozen-2nd12'],
                    'D3': ['betPlace.dozen-3rd12', 'betPlace.dozen-3', 'dozen-3rd12'],
                    'C1': ['betPlace.column-1', 'betPlace.column2to1-1', 'column-1'],
                    'C2': ['betPlace.column-2', 'betPlace.column2to1-2', 'column-2'],
                    'C3': ['betPlace.column-3', 'betPlace.column2to1-3', 'column-3']
                };

                const siglaUpper = String(sigla).toUpperCase();
                const locators = mapeamento[siglaUpper];
                
                if (!locators) {
                    resolve(false);
                    return;
                }

                // Tentar todos os seletores possíveis
                let elemento = null;
                
                for (const locator of locators) {
                    const seletor = `[data-automation-locator="${locator}"]`;
                    elemento = document.querySelector(seletor);
                    if (elemento) break;
                }
                
                // Se não encontrou, tentar buscar em iframes
                if (!elemento) {
                    const iframes = document.querySelectorAll('iframe');
                    for (const iframe of iframes) {
                        try {
                            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                            for (const locator of locators) {
                                const seletor = `[data-automation-locator="${locator}"]`;
                                elemento = iframeDoc.querySelector(seletor);
                                if (elemento) break;
                            }
                            if (elemento) break;
                        } catch (e) {
                            // Ignorar erros de cross-origin
                        }
                    }
                }

                if (elemento) {
                    const rect = elemento.getBoundingClientRect();
                    const x = Math.trunc(rect.x + rect.width / 2);
                    const y = Math.trunc(rect.y + rect.height / 2);
                    simularClick(x, y);
                    resolve(true);
                } else {
                    // Tentar novamente até 3 vezes com delay (SILENCIOSO)
                    if (tentativa < 2) {
                        setTimeout(() => {
                            tentarClicar(tentativa + 1);
                        }, 200);
                    } else {
                        // Falhou mas não mostra erro (pode ter apostado antes)
                        resolve(true); // Retorna true para não bloquear
                    }
                }
            } catch (error) {
                resolve(false);
            }
        };
        
        tentarClicar();
    });
}

function clicarNosNumeros(numeros, multiplicador = 1) {
    console.log('🔧 clicarNosNumeros chamada com:', numeros, 'multiplicador:', multiplicador);
    
    if (!Array.isArray(numeros) || numeros.length === 0) {
        console.error('❌ Números inválidos ou vazios');
        return;
    }

    // Remover duplicados APENAS de números diretos (0-36)
    // Áreas externas (D1, D2, D3, C1, C2, C3) podem ser repetidas
    const numerosProcessados = [];
    const numerosDirectosUnicos = new Set();
    
    numeros.forEach(item => {
        const isAreaExterna = typeof item === 'string' && /^[DC][123]$/i.test(item);
        
        if (isAreaExterna) {
            // Áreas externas: permitir repetição
            numerosProcessados.push(item);
        } else {
            // Números diretos ou formato "PLENO X": extrair o número
            let numInt = NaN;
            if (typeof item === 'string' && item.toUpperCase().startsWith('PLENO ')) {
                numInt = parseInt(item.split(' ')[1]);
            } else {
                numInt = parseInt(item);
            }

            if (!isNaN(numInt) && numInt >= 0 && numInt <= 36) {
                if (!numerosDirectosUnicos.has(numInt)) {
                    numerosDirectosUnicos.add(numInt);
                    numerosProcessados.push(numInt); // Salvar apenas o número puro
                }
            }
        }
    });
    
    console.log('📋 Números processados:', numerosProcessados);

    // Filtrar apenas números diretos que já foram apostados
    // Áreas externas (D1, D2, D3, C1, C2, C3) podem ser repetidas
    const numerosParaApostar = numerosProcessados.filter(num => {
        const isAreaExterna = typeof num === 'string' && /^[DC][123]$/i.test(num);
        if (isAreaExterna) {
            return true; // Permitir áreas externas mesmo que já apostadas
        }
        
        // EXCEÇÃO IA PLENO: Permitir apostar no mesmo número se for uma nova rodada (timestamp mudou)
        // O numerosJaApostados serve para evitar cliques duplicados NA MESMA RODADA (ao clicar 3x para fazer gale)
        return !numerosJaApostados.has(num); 
    });
    
    console.log('✅ Números para apostar (após filtro):', numerosParaApostar);
    console.log('📝 Números já apostados:', Array.from(numerosJaApostados));

    if (numerosParaApostar.length === 0) {
        console.log('⚠️ Todos os números já foram apostados');
        mostrarAlertaNaPagina('Todos os números já foram apostados', '#FF9800');
        return;
    }

    console.log(`🎯 Apostando em ${numerosParaApostar.length} itens:`, numerosParaApostar);
    console.log(`💰 Multiplicador: ${multiplicador}x`);

    // Obter nome da estratégia para o aviso
    if (chrome.runtime && chrome.runtime.id) {
        chrome.storage.local.get(['nomeEstrategiaParaAviso'], (res) => {
            if (!chrome.runtime || !chrome.runtime.id) return;
            const nomeEst = res.nomeEstrategiaParaAviso || 'Estratégia';
            
            // Se a mensagem já contiver "GALE", não precisamos adicionar "Apostando Xx"
            let mensagem = nomeEst;
            if (!mensagem.toUpperCase().includes('GALE') && !mensagem.toUpperCase().includes('APOSTANDO')) {
                mensagem = multiplicador > 1 
                    ? `GALE ${multiplicador - 1}: ${nomeEst}` 
                    : `Apostando em: ${nomeEst}`;
            }
            mostrarAlertaNaPagina(mensagem, '#2196F3', 40000); // 40 segundos - duração da rodada
        });
    }

    numerosParaApostar.forEach((item, index) => {
        setTimeout(() => {
            const isAreaExterna = typeof item === 'string' && /^[DC][123]$/i.test(item);
            
            // Verificar novamente se já foi apostado (apenas para números diretos)
            if (!isAreaExterna && numerosJaApostados.has(item)) {
                return;
            }

    // Marcar como apostado ANTES de clicar (apenas números diretos)
    if (!isAreaExterna) {
        numerosJaApostados.add(item);
    }
    
    // Clicar múltiplas vezes se multiplicador > 1
    // Usar loop rápido com timeout mínimo para não travar
    for (let i = 0; i < multiplicador; i++) {
        setTimeout(() => {
            if (isAreaExterna) {
                clicarAreaExterna(item);
            } else {
                clicarNumero(item);
            }
        }, i * 30); // 30ms entre cliques no mesmo número
    }
}, index * 20); // 20ms entre números diferentes (rápido)
    });
}

// ========================================
// MONITOR DE NÚMEROS EM TEMPO REAL (ROBUSTO)
// ========================================

function encontrarUltimoNumeroNoDOM(documento) {
    // Tentar seletores específicos para o ÚLTIMO número (o que acabou de sair)
    const seletoresUltimo = [
        '.history-item-value_last--XYoZX .history-item-value__text--n5cYB',
        '.history-item-value_last--sIPUy .history-item-value__text--H6oCX',
        '[class*="history-item-value_last"] [class*="history-item-value__text"]',
        '[data-automation-locator="field.lastHistoryItem"] [class*="history-item-value__text"]',
        '.roulette-history--YYD3E .history-item-value:first-child .history-item-value__text--n5cYB',
        '.roulette-history--k1il_ .history-item-value:first-child .history-item-value__text--H6oCX'
    ];

    for (const seletor of seletoresUltimo) {
        const el = documento.querySelector(seletor);
        if (el) {
            const num = parseInt(el.textContent.trim());
            if (!isNaN(num) && num >= 0 && num <= 36) return num;
        }
    }

    // Tentar seletores genéricos e pegar o primeiro (assumindo que o primeiro é o mais recente)
    const seletoresGenericos = [
        '.history-item-value__text--H6oCX',
        '.history-item-value__text--n5cYB',
        '[class*="history-item-value__text"]',
        '.history-item-value:first-child',
        '[data-test*="history"]:first-child'
    ];

    for (const seletor of seletoresGenericos) {
        const elementos = documento.querySelectorAll(seletor);
        if (elementos.length > 0) {
            const num = parseInt(elementos[0].textContent.trim());
            if (!isNaN(num) && num >= 0 && num <= 36) return num;
        }
    }

    return null;
}

// Função para gerar um hash único das últimas rodadas (detectar repetições)
function gerarHashHistorico(doc) {
    const seletores = [
        '.history-item-value__text--H6oCX',
        '.history-item-value__text--n5cYB',
        '[class*="history-item-value__text"]'
    ];
    for (const seletor of seletores) {
        const elementos = doc.querySelectorAll(seletor);
        if (elementos.length >= 2) {
            // Pegar os 4 primeiros para formar um "ID" único do momento da mesa
            return Array.from(elementos).slice(0, 4).map(el => el.textContent.trim()).join('|');
        }
    }
    return "";
}

function processarDeteccaoNumeros() {
    try {
        // 1. Procurar no documento atual
        let numeroDetectado = encontrarUltimoNumeroNoDOM(document);
        let hashAtual = gerarHashHistorico(document);

        // 2. Se não achou, procurar em todos os iframes acessíveis
        if (numeroDetectado === null) {
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    numeroDetectado = encontrarUltimoNumeroNoDOM(iframeDoc);
                    if (numeroDetectado !== null) {
                       hashAtual = gerarHashHistorico(iframeDoc);
                       break;
                    }
                } catch (e) { }
            }
        }

        // 3. Lógica de detecção: NOVO NÚMERO ou REPETIÇÃO (Hash mudou)
        const isNovoNumero = (numeroDetectado !== null && numeroDetectado !== ultimoNumeroEnviado);
        const isRepeticaoLegitima = (numeroDetectado !== null && numeroDetectado === ultimoNumeroEnviado && hashAtual !== "" && hashAtual !== ultimaSequenciaHash);

        if (isNovoNumero || isRepeticaoLegitima) {
            console.log('🎰 [FORTUNA X] NOVO EVENTO RECONHECIDO:', isRepeticaoLegitima ? `REPETIÇÃO DO ${numeroDetectado}` : `NOVO NÚMERO ${numeroDetectado}`);
            
            ultimoNumeroEnviado = numeroDetectado;
            ultimaSequenciaHash = hashAtual;
            
            if (chrome.runtime && chrome.runtime.id) {
                // Notificar usuário na página (apenas se autorizado)
                mostrarAlertaNaPagina(`🎲 Número: ${numeroDetectado}`, '#4CAF50', 3000);

                chrome.runtime.sendMessage({
                    tipo: 'novoNumero',
                    numero: numeroDetectado,
                    timestamp: Date.now(),
                    source: 'realtime_loop'
                }).catch(() => {
                    console.warn('⚠️ [FORTUNA X] Falha ao enviar número (Background pode estar inativo)');
                });
            }
        }
    } catch (error) {
        // Silencioso
    }
}

// Iniciar loops de detecção
if (chrome && chrome.runtime && chrome.runtime.id) {
    setInterval(processarDeteccaoNumeros, 500);
}

// Observer para reagir a mudanças no DOM (mais rápido que o setInterval)
const observationObserver = new MutationObserver(() => {
    processarDeteccaoNumeros();
});

if (document.body) {
    observationObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ===== VERIFICAR STORAGE PARA APOSTAS =====

// Iniciar com o timestamp atual para ignorar apostas que ficaram no cache do navegador
let ultimoTimestampProcessado = Date.now();
let processandoAposta = false;
let contadorVerificacoes = 0;

function verificarApostasNoStorage() {
    contadorVerificacoes++;
    
    try {
        if (!chrome || !chrome.storage || !chrome.runtime || !chrome.runtime.id) {
            return;
        }

        if (processandoAposta) {
            console.log('⏳ Já processando uma aposta, aguardando...');
            return;
        }

        chrome.storage.local.get(['numerosParaApostar', 'multiplicadorFichas', 'timestamp'], (result) => {
            if (!chrome.runtime || !chrome.runtime.id) {
                console.warn('⚠️ Chrome runtime perdido durante get');
                return;
            }
            
            if (chrome.runtime.lastError) {
                console.error('❌ Erro ao acessar storage:', chrome.runtime.lastError);
                return;
            }

            if (result.numerosParaApostar && result.timestamp) {
                console.log('📊 Storage check - Timestamp:', result.timestamp, 'Último processado:', ultimoTimestampProcessado);
                
                if (result.timestamp > ultimoTimestampProcessado) {
                    const multiplicador = parseInt(result.multiplicadorFichas) || 1;
                    console.log(`[STORAGE-DEBUG] Nova aposta detectada! Multiplicador: ${multiplicador}x`);
                    console.log('📋 Números:', result.numerosParaApostar);
                    console.log('💰 Multiplicador:', multiplicador + 'x');

                    // Nova aposta - limpar lista de números já apostados
                    numerosJaApostados.clear();

                    ultimoTimestampProcessado = result.timestamp;
                    processandoAposta = true;

                    // Executar aposta
                    try {
                        clicarNosNumeros(result.numerosParaApostar, multiplicador);
                        console.log('✅ Cliques iniciados com sucesso');
                    } catch (clickError) {
                        console.error('❌ Erro ao clicar nos números:', clickError);
                    }

                    // Liberar após todos os cliques
                    const tempoEspera = result.numerosParaApostar.length * 150 + 1000;
                    setTimeout(() => {
                        processandoAposta = false;
                        console.log('✅ Aposta finalizada, liberado para próxima');
                    }, tempoEspera);
                }
            }
        });
    } catch (error) {
        console.error('❌ Erro em verificarApostasNoStorage:', error);
        processandoAposta = false;
    }
}

if (chrome && chrome.runtime && chrome.runtime.id) {
    console.log('✅ INICIANDO VERIFICAÇÃO DE APOSTAS NO STORAGE');
    console.log('   Frequência: 300ms');
    
    // Verificar a cada 300ms (mais frequente) para não perder apostas
    setInterval(verificarApostasNoStorage, 300);
    setTimeout(verificarApostasNoStorage, 500);
    
    // Reconectar periodicamente em caso de perda de conexão
    setInterval(() => {
        try {
            if (!chrome.runtime || !chrome.runtime.id) {
                location.reload();
            }
        } catch (e) {
            // Ignorar erros de acesso ao chrome.runtime
        }
    }, 30000); // A cada 30 segundos
}

console.log('✅ Content script pronto!');
console.log('🌐 Rodando em:', window.location.href);

// ========================================

// Monitorar a cada 500ms (mais frequente)
if (typeof processarDeteccaoNumeros === 'function') {
    setInterval(processarDeteccaoNumeros, 500);
}


// ========================================
// FUNCIONALIDADE: ABRIR HISTÓRICO E COLETAR 500 NÚMEROS
// ========================================

function abrirHistoricoAutomaticamente() {
    // Procurar pelo li com data-automation-locator exato
    let botao = document.querySelector('li[data-automation-locator="button.extenededHistory"]');
    
    if (!botao) {
        // Procurar em iframes
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                botao = iframeDoc.querySelector('li[data-automation-locator="button.extenededHistory"]');
                if (botao) {
                    console.log('✅ Botão encontrado em iframe!');
                    break;
                }
            } catch (e) {}
        }
    }
    
    if (botao) {
        console.log('✅ Botão encontrado! Clicando...');
        botao.click();
        return true;
    }
    
    return false;
}

// Tentar abrir após 5 segundos
setTimeout(() => {
    console.log('🎰 Tentando abrir histórico...');
    
    let tentativas = 0;
    const intervalo = setInterval(() => {
        tentativas++;
        
        if (abrirHistoricoAutomaticamente()) {
            clearInterval(intervalo);
            console.log('🎉 Histórico aberto!');
            
            // Coletar após 5 segundos
            setTimeout(() => {
                coletarHistorico();
            }, 5000);
        } else if (tentativas >= 30) {
            clearInterval(intervalo);
            console.log('❌ Não encontrou o botão');
        }
    }, 500);
}, 5000);

// ========================================
// FUNCIONALIDADE: COLETAR NÚMEROS DO HISTÓRICO
// ========================================

function coletarHistorico() {
    console.log('📊 Coletando números do histórico...');
    
    let tentativas = 0;
    const intervalo = setInterval(() => {
        tentativas++;
        
        // Procurar elementos no documento principal
        // Tentar múltiplos seletores para encontrar todos os números
        let elementos = document.querySelectorAll('.history-item-value__text--n5cYB');
        
        // Se não encontrou, tentar outro seletor
        if (elementos.length === 0) {
            elementos = document.querySelectorAll('.history-item-value__text--H6oCX');
        }
        
        // Se ainda não encontrou, tentar seletor mais genérico
        if (elementos.length === 0) {
            elementos = document.querySelectorAll('[class*="history-item-value__text"]');
        }
        
        console.log(`🔄 Tentativa ${tentativas}: Doc principal = ${elementos.length} elementos`);
        
        // Se não achou, procurar em iframes
        if (elementos.length === 0) {
            const iframes = document.querySelectorAll('iframe');
            console.log(`   🔍 Procurando em ${iframes.length} iframes...`);
            
            for (const iframe of iframes) {
                try {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    
                    // Tentar múltiplos seletores
                    elementos = iframeDoc.querySelectorAll('.history-item-value__text--n5cYB');
                    if (elementos.length === 0) {
                        elementos = iframeDoc.querySelectorAll('.history-item-value__text--H6oCX');
                    }
                    if (elementos.length === 0) {
                        elementos = iframeDoc.querySelectorAll('[class*="history-item-value__text"]');
                    }
                    
                    if (elementos.length > 0) {
                        console.log(`   ✅ Encontrados ${elementos.length} elementos em iframe!`);
                        break;
                    }
                } catch (e) {
                    console.log(`   ⚠️ Iframe bloqueado (cross-origin)`);
                }
            }
        }
        
        // Se achou elementos, coletar
        if (elementos.length > 0) {
            clearInterval(intervalo);
            
            const numeros = [];
            elementos.forEach(el => {
                const num = parseInt(el.textContent.trim());
                if (!isNaN(num) && num >= 0 && num <= 36) {
                    numeros.push(num);
                }
            });
            
            console.log(`✅ ${numeros.length} números coletados!`);
            console.log('📋 TODOS OS NÚMEROS:', numeros);
            console.log('📋 Primeiros 20:', numeros.slice(0, 20));
            console.log('📋 Últimos 20:', numeros.slice(-20));
            
            // Enviar com mensagem para LIMPAR histórico existente
            if (chrome.runtime && chrome.runtime.id) {
                chrome.runtime.sendMessage({
                    tipo: 'historico_500',
                    numeros: numeros,
                    limpar: true  // Flag para indicar que deve limpar histórico existente
                });
            }
        } else if (tentativas >= 20) {
            clearInterval(intervalo);
            console.log('❌ Não encontrou números após 20 tentativas');
        }
    }, 1000);
}


// ===== LISTENER DE MENSAGENS =====
// Responder a requisições do sidepanel

// ===== MONITORAMENTO DE SALDO (PUSH ATIVO) =====
let ultimoSaldoMonitorado = null;

function parseSaldoPagina(texto) {
    return parseFloat(
        texto
          .replace(/R\$/g, '')
          .replace(/[\u00a0\u200b\s]/g, '') // remove &nbsp; e espaços
          .replace(/,/g, '.')
          .trim()
    );
}

function lerSaldoDaPagina() {
    try {
        // Seletores robustos para o saldo na bet365 e outros provedores
        const seletores = [
            '.fit-container__content', // Bet365/Evolution
            '.balance-amount',
            '.user-balance',
            '.total-balance',
            '.balance-value',
            '.balance-amount__value',
            '[class*="balance"]',
            '[class*="fit-container__content"]'
        ];

        for (const seletor of seletores) {
            const elementos = document.querySelectorAll(seletor);
            for (let el of elementos) {
                // EXCLUSÃO: Ignorar se estiver dentro da área de fichas/chips
                if (el.closest('[class*="chip"], [class*="chips"], [class*="selector"]')) continue;
                
                const txt = el.textContent || '';
                // Melhorado: detectar qualquer sequência de números que pareça saldo
                if (txt.includes('R$') || txt.match(/\d+,\d{2}/) || txt.match(/\d+\.\d{2}/)) {
                    const num = parseSaldoPagina(txt);
                    // Adensar: o saldo real costuma ser maior que os valores das fichas comuns (0.50, 1.00, etc)
                    // mas não podemos bloquear valores pequenos se o usuário tiver pouco dinheiro.
                    // A regra de exclusão 'closest' acima já resolve 90% dos casos.
                    if (!isNaN(num) && num > 0) return num;
                }
            }
        }

        // Se não encontrar por seletor, procurar por texto em todos os elementos pequenos
        // Isso é mais lento, mas serve como fallback
        const spans = document.querySelectorAll('span, div');
        for (let i = 0; i < Math.min(spans.length, 500); i++) { // Limitar busca por performance
            const txt = spans[i].textContent || '';
            if (txt.includes('R$') && txt.length < 30) {
                const num = parseSaldoPagina(txt);
                if (!isNaN(num) && num > 0) return num;
            }
        }

    } catch (e) {}
    return null;
}

function monitorarEEnviarSaldo() {
    var saldo = lerSaldoDaPagina();
    // Ignorar null (elemento não encontrado) e 0 (momentâneo durante rodada)
    if (saldo !== null && saldo > 0 && saldo !== ultimoSaldoMonitorado) {
            console.log(`💰 [FORTUNA X] SALDO ATUALIZADO: R$ ${saldo}`);
            ultimoSaldoMonitorado = saldo;
            
            // Atualizar variáveis do mini painel
            statusBancaAtual = saldo;
            
            // Atualizar display do mini painel
            atualizarPainelStatus();
            
            try {
                if (chrome.runtime && chrome.runtime.id) {
                    chrome.runtime.sendMessage({ tipo: 'atualizar_saldo', saldo: saldo })
                        .catch(() => {}); // Silenciar erros quando sidepanel não está aberto
                }
            } catch (e) {}
        } else if (saldo === null) {
            // Log periódico discreto para debug se não encontrar saldo
            if (Math.random() < 0.05) console.log('🔍 [FORTUNA X] Procurando saldo na página...');
        }
}

if (chrome && chrome.runtime && chrome.runtime.id) {
    setInterval(monitorarEEnviarSaldo, 2000);
    setTimeout(monitorarEEnviarSaldo, 3000);
}

// ===== PAINEL FLUTUANTE DE STATUS =====

let painelStatus = null;
let painelQuentes = null;
let painelFrios = null;
let statusBotAtivo = false;
let statusEstrategia = 'Nenhuma';
let statusPlacar = { wins: 0, losses: 0 };
let statusBancaAtual = 0;
let statusBancaInicial = 0;
let statusStopGain = 0;
let statusStopLoss = 0;
let stopWinValor = 0;  // Quanto quer ganhar
let stopLossValor = 0; // Quanto pode perder

// Variáveis de Simulação
let modoSimulacaoAtivo = false;
let saldoSimulacao = 1000.00;
let valorFichaSimulacao = 1.00;
let placarSimulacao = { wins: 0, losses: 0 };

function criarPainelStatus() {
  if (painelStatus) return;
  if (!chrome.runtime || !chrome.runtime.id) return;
  
  // Carregar configurações de simulação e estado real salvas
  chrome.storage.local.get(['modoSimulacaoAtivo', 'saldoSimulacao', 'valorFichaSimulacao', 'placarSimulacao', 'rouletteState'], (result) => {
    if (!chrome.runtime || !chrome.runtime.id) return;
    modoSimulacaoAtivo = result.modoSimulacaoAtivo || false;
    saldoSimulacao = result.saldoSimulacao !== undefined ? result.saldoSimulacao : 1000.00;
    valorFichaSimulacao = result.valorFichaSimulacao !== undefined ? result.valorFichaSimulacao : 1.00;
    placarSimulacao = result.placarSimulacao || { wins: 0, losses: 0 };
    
    // Sincronizar com estado real também
    if (result.rouletteState) {
      const rs = result.rouletteState;
      statusBotAtivo = !rs.stopAtivado;
      statusPlacar = { wins: rs.wins || 0, losses: rs.losses || 0 };
      stopWinValor = rs.stopWin || 0;
      stopLossValor = rs.stopLoss || 0;
      statusEstrategia = rs.nomeEstrategiaSelecionada || 'Manual';
      statusBancaInicial = rs.saldoInicial || 0;
      statusBancaAtual = rs.ultimoSaldoPush || 0;
      
      // Se for estratégia de Quentes/Frios, pedir dados ao background
      const nomeEstrat = (statusEstrategia || "").toUpperCase();
      if (nomeEstrat.includes('QUENTE') || nomeEstrat.includes('FRIO') || nomeEstrat.includes('AMBOS')) {
          chrome.runtime.sendMessage({ tipo: 'atualizar_paineis_quentes_frios' }).catch(() => {});
      }
    }
    
    if (painelStatus) atualizarPainelStatus();
  });
  
  // Verificar se está na mesa da roleta
  const mesaRoleta = document.querySelector('.game-table');
  if (!mesaRoleta) {
    console.log('⚠️ Painel não criado - não está na mesa da roleta');
    return;
  }
  
  painelStatus = document.createElement('div');
  painelStatus.id = 'painel-status-bot';
  painelStatus.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 260px;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 1px solid rgba(255,215,0,0.5);
    border-radius: 12px;
    padding: 10px;
    color: #fff;
    font-family: Arial, sans-serif;
    z-index: 10000;
    box-shadow: 0 6px 20px rgba(255, 215, 0, 0.2);
    font-size: 11px;
    cursor: move;
  `;
  
  painelStatus.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; border-bottom: 1px solid rgba(255,215,0,0.3); padding-bottom: 5px;">
      <div style="font-size: 12px; font-weight: bold; color: #ffd700;">⚙️ STATUS Bot Fortuna X</div>
    </div>
    
    <div style="background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; margin-bottom: 8px;">
      <div style="color: #ffd700; font-weight: bold; margin-bottom: 3px; font-size: 11px;" id="status-estrategia">👔 Funcionário do Mês</div>
      <div style="color: #00bcd4; font-weight: bold; margin-bottom: 3px; display: none; font-size: 10px;" id="status-ia-painel">🎯 I.A Fortuna X: Analisando...</div>
      <div style="color: #ff9800; font-weight: bold; font-size: 11px; margin-top: 3px; margin-bottom: 3px; display: none;" id="status-countdown">⏳ Aguardando...</div>
      <div style="color: #00ff00; margin-bottom: 3px; font-size: 11px;" id="status-ativo">🟢 Ativo (MODO REAL)</div>
    </div>
    
    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
      <div style="text-align: center; flex: 1;">
        <div style="color: #00ff00; font-weight: bold; font-size: 14px;" id="status-wins">0</div>
        <div style="color: #aaa; font-size: 9px;">Green</div>
      </div>
      <div style="text-align: center; flex: 1;">
        <div style="color: #ff4444; font-weight: bold; font-size: 14px;" id="status-losses">0</div>
        <div style="color: #aaa; font-size: 9px;">Red</div>
      </div>
    </div>
    
    <div style="border-top: 1px solid #ffd700; padding-top: 8px; margin-bottom: 8px;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span style="color: #ffd700;">💰 Banca:</span>
        <span style="color: #00ff00; font-weight: bold;" id="status-banca-atual">R$ 0.00</span>
      </div>
      <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
        <span style="color: #aaa;">🎯 Stop G:</span>
        <span style="color: #00ff00;" id="status-stop-gain">0 G</span>
      </div>
      <div style="display: flex; justify-content: space-between;">
        <span style="color: #aaa;">🛑 Stop L:</span>
        <span style="color: #ff4444;" id="status-stop-loss">0 R</span>
      </div>
    </div>
    
    <button id="btn-atualizar-saldo-painel" style="
      width: 100%;
      padding: 6px;
      background: linear-gradient(135deg, #ffd700 0%, #ffed4e 100%);
      border: none;
      border-radius: 6px;
      color: #000;
      font-weight: bold;
      cursor: pointer;
      font-size: 11px;
      transition: all 0.3s;
    ">
      🔃 Atualizar Saldo
    </button>
  `;

  // Estilos para o switch do modo simulação
  const style = document.createElement('style');
  style.innerHTML = `
    .switch-sim { position: relative; display: inline-block; width: 40px; height: 20px; }
    .switch-sim input { opacity: 0; width: 0; height: 0; }
    .slider-sim { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #ccc; transition: .4s; border-radius: 20px; }
    .slider-sim:before { position: absolute; content: ""; height: 14px; width: 14px; left: 3px; bottom: 3px; background-color: white; transition: .4s; border-radius: 50%; }
    input:checked + .slider-sim { background-color: #00bcd4; }
    input:checked + .slider-sim:before { transform: translateX(20px); }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(painelStatus);
  
  // --- EVENTOS DO MODO SIMULAÇÃO ---
  
  // Resetar Placar Simulação
  if (document.getElementById('btn-reset-placar-sim')) {
    document.getElementById('btn-reset-placar-sim').addEventListener('click', () => {
      placarSimulacao = { wins: 0, losses: 0 };
      if (chrome.runtime && chrome.runtime.id) {
        chrome.storage.local.set({ placarSimulacao });
      }
      atualizarPainelStatus();
    });
  }
  
  // Evento do botão atualizar saldo
  if (document.getElementById('btn-atualizar-saldo-painel')) {
    document.getElementById('btn-atualizar-saldo-painel').addEventListener('click', () => {
      atualizarSaldoInicial();
    });
  }
  
  // Funcionalidade de arrastar o painel
  let isDragging = false;
  let offsetX = 0;
  let offsetY = 0;
  
  painelStatus.addEventListener('mousedown', (e) => {
    if (e.target.id === 'btn-atualizar-saldo-painel') return;
    isDragging = true;
    offsetX = e.clientX - painelStatus.offsetLeft;
    offsetY = e.clientY - painelStatus.offsetTop;
  });
  
  document.addEventListener('mousemove', (e) => {
    if (isDragging && painelStatus) {
      painelStatus.style.left = (e.clientX - offsetX) + 'px';
      painelStatus.style.top = (e.clientY - offsetY) + 'px';
      painelStatus.style.right = 'auto';
    }
  });
  
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  
  // Adicionar botão X para fechar
  const btnFechar = document.createElement('button');
  btnFechar.textContent = '✕';
  btnFechar.style.cssText = `
    position: absolute;
    top: 5px;
    right: 5px;
    background: #ff4444;
    border: none;
    color: white;
    width: 25px;
    height: 25px;
    border-radius: 50%;
    cursor: pointer;
    font-weight: bold;
    font-size: 16px;
  `;
  btnFechar.addEventListener('click', () => {
    painelStatus.remove();
    painelStatus = null;
  });
  painelStatus.appendChild(btnFechar);
}

// Escutar mudanças no storage para sincronizar saldo e placar de simulação
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (!chrome.runtime || !chrome.runtime.id) return;
  if (areaName === 'local') {
    if (changes.modoSimulacaoAtivo) {
      modoSimulacaoAtivo = changes.modoSimulacaoAtivo.newValue;
      atualizarPainelStatus();
    }
    if (changes.saldoSimulacao) {
      saldoSimulacao = changes.saldoSimulacao.newValue;
      if (modoSimulacaoAtivo) atualizarPainelStatus();
    }
    if (changes.placarSimulacao) {
      placarSimulacao = changes.placarSimulacao.newValue;
      if (modoSimulacaoAtivo) atualizarPainelStatus();
    }
  }
});

function atualizarPainelQuentesFrios(quentes, frios, estrategia, maxRodadas) {
  if (!chrome.runtime || !chrome.runtime.id) return;

  const nomeEstrat = (estrategia || "").toUpperCase();
  const mostrarQuentes = nomeEstrat.includes('QUENTE') || nomeEstrat.includes('AMBOS') || nomeEstrat.includes('FIXOS') || nomeEstrat.includes('IA');
  const mostrarFrios = nomeEstrat.includes('FRIO') || nomeEstrat.includes('AMBOS') || nomeEstrat.includes('IA');

  // Painel Quentes
  if (mostrarQuentes) {
    if (!painelQuentes) criarPainelQuentes();
    const labelRodadas = maxRodadas ? ` (${maxRodadas}r)` : '';
    const headerQuentes = document.getElementById('header-quentes');
    if (headerQuentes) headerQuentes.textContent = `🔥 Quentes${labelRodadas}`;
    if (quentes && quentes.length > 0) {
      const lista = document.getElementById('lista-quentes');
      if (lista) {
        lista.innerHTML = quentes.map(n => `
          <div style="background:#222;border:1px solid #444;border-radius:4px;padding:4px 8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <span style="color:${obterCorNumero(n.numero)};font-weight:bold;font-size:12px;">${n.numero}</span>
            <span style="color:#00ff00;font-size:10px;font-weight:bold;">${n.freq}x</span>
          </div>
        `).join('');
      }
    }
    if (painelQuentes) painelQuentes.style.display = 'block';
  } else {
    if (painelQuentes) painelQuentes.style.display = 'none';
  }

  // Painel Frios
  if (mostrarFrios) {
    if (!painelFrios) criarPainelFrios();
    const labelRodadas = maxRodadas ? ` (${maxRodadas}r)` : '';
    const headerFrios = document.getElementById('header-frios');
    if (headerFrios) headerFrios.textContent = `❄️ Frios${labelRodadas}`;
    if (frios && frios.length > 0) {
      const lista = document.getElementById('lista-frios');
      if (lista) {
        lista.innerHTML = frios.map(n => `
          <div style="background:#222;border:1px solid #444;border-radius:4px;padding:4px 8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">
            <span style="color:${obterCorNumero(n.numero)};font-weight:bold;font-size:12px;">${n.numero}</span>
            <span style="color:#ff4444;font-size:10px;font-weight:bold;">${n.freq}x</span>
          </div>
        `).join('');
      }
    }
    if (painelFrios) painelFrios.style.display = 'block';
  } else {
    if (painelFrios) painelFrios.style.display = 'none';
  }
}
function criarPainelQuentes() {
  if (document.getElementById('painel-quentes')) {
    painelQuentes = document.getElementById('painel-quentes');
    return;
  }
  painelQuentes = document.createElement('div');
  painelQuentes.id = 'painel-quentes';
  painelQuentes.style.cssText = `
    position: fixed; top: 280px; right: 10px; z-index: 2147483647;
    background: rgba(0,0,0,0.9); border: 2px solid #ff6600;
    border-radius: 8px; padding: 10px; min-width: 130px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.8); font-family: sans-serif;
    user-select: none; cursor: grab; display: none;
  `;
  painelQuentes.innerHTML = `
    <div id="header-quentes" style="color:#ff6600;font-size:11px;font-weight:bold;margin-bottom:8px;text-align:center;text-transform:uppercase;border-bottom:1px solid #333;padding-bottom:5px;">🔥 Quentes</div>
    <div id="lista-quentes" style="display:flex;flex-direction:column;gap:4px;"></div>
  `;
  document.body.appendChild(painelQuentes);
  tornarArrastavel(painelQuentes);
}

function criarPainelFrios() {
  if (document.getElementById('painel-frios')) {
    painelFrios = document.getElementById('painel-frios');
    return;
  }
  painelFrios = document.createElement('div');
  painelFrios.id = 'painel-frios';
  painelFrios.style.cssText = `
    position: fixed; top: 280px; right: 150px; z-index: 2147483647;
    background: rgba(0,0,0,0.9); border: 2px solid #00aaff;
    border-radius: 8px; padding: 10px; min-width: 130px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.8); font-family: sans-serif;
    user-select: none; cursor: grab; display: none;
  `;
  painelFrios.innerHTML = `
    <div id="header-frios" style="color:#00aaff;font-size:11px;font-weight:bold;margin-bottom:8px;text-align:center;text-transform:uppercase;border-bottom:1px solid #333;padding-bottom:5px;">❄️ Frios</div>
    <div id="lista-frios" style="display:flex;flex-direction:column;gap:4px;"></div>
  `;
  document.body.appendChild(painelFrios);
  tornarArrastavel(painelFrios);
}

function tornarArrastavel(el) {
  let isDragging = false, ox = 0, oy = 0;
  el.addEventListener('mousedown', (e) => {
    isDragging = true;
    ox = e.clientX - el.offsetLeft;
    oy = e.clientY - el.offsetTop;
    el.style.cursor = 'grabbing';
  });
  document.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    el.style.left = (e.clientX - ox) + 'px';
    el.style.top = (e.clientY - oy) + 'px';
    el.style.right = 'auto';
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
    el.style.cursor = 'grab';
  });
}
function obterCorNumero(n) {
  const vermelhos = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  if (n === 0) return '#00ff00';
  return vermelhos.includes(n) ? '#ff4444' : '#ffffff';
}

function atualizarPainelStatus() {
  if (!painelStatus) criarPainelStatus();
  
  // Atualizar status
  const statusAtivoEl = document.getElementById('status-ativo');
  const countdownEl = document.getElementById('status-countdown');
  
  const el = (id) => document.getElementById(id);

  if (!statusBotAtivo) {
    if (statusAtivoEl) { statusAtivoEl.textContent = '🔴 Pausado'; statusAtivoEl.style.color = '#ff4444'; }
    if (countdownEl) countdownEl.style.display = 'none';
  } else if (modoSimulacaoAtivo) {
    if (statusAtivoEl) { statusAtivoEl.textContent = '🔵 Simulando...'; statusAtivoEl.style.color = '#00bcd4'; }
    if (el('status-wins')) el('status-wins').textContent = placarSimulacao.wins;
    if (el('status-losses')) el('status-losses').textContent = placarSimulacao.losses;
    if (el('status-banca-atual')) el('status-banca-atual').textContent = `R$ ${saldoSimulacao.toFixed(2)}`;
    if (el('label-banca-atual')) el('label-banca-atual').textContent = '💰 Banca Simulação:';
    if (el('status-banca-inicial')) el('status-banca-inicial').parentElement.style.display = 'none';
    if (el('status-stop-gain')) el('status-stop-gain').parentElement.style.display = 'none';
    if (el('status-stop-loss')) el('status-stop-loss').parentElement.style.display = 'none';
    if (el('btn-atualizar-saldo-painel')) el('btn-atualizar-saldo-painel').style.display = 'none';
  } else {
    if (statusAtivoEl) { statusAtivoEl.textContent = '🟢 Ativo (MODO REAL)'; statusAtivoEl.style.color = '#00ff00'; }
    if (el('status-wins')) el('status-wins').textContent = statusPlacar.wins;
    if (el('status-losses')) el('status-losses').textContent = statusPlacar.losses;
    if (el('status-banca-atual')) el('status-banca-atual').textContent = `R$ ${statusBancaAtual.toFixed(2)}`;
    if (el('label-banca-atual')) el('label-banca-atual').textContent = '💰 Banca Atual:';
    if (el('status-banca-inicial')) { el('status-banca-inicial').parentElement.style.display = 'flex'; el('status-banca-inicial').textContent = `R$ ${statusBancaInicial.toFixed(2)}`; }
    if (el('status-stop-gain')) { el('status-stop-gain').parentElement.style.display = 'flex'; el('status-stop-gain').textContent = `${stopWinValor} Green(s)`; }
    if (el('status-stop-loss')) { el('status-stop-loss').parentElement.style.display = 'flex'; el('status-stop-loss').textContent = `${stopLossValor} Red(s)`; }
    if (el('btn-atualizar-saldo-painel')) el('btn-atualizar-saldo-painel').style.display = 'block';
  }
  if (el('status-estrategia')) el('status-estrategia').textContent = `👔 ${statusEstrategia}`;
}

function atualizarSaldoInicial() {
  console.log('🔃 [MINI PAINEL] Tentando atualizar saldo inicial...');
  
  // Lista de seletores mais específicos para saldo da conta
  const seletoresEspecificos = [
    // Seletores específicos para saldo da conta (não fichas ou outros valores)
    "#root > div > div.app-container > div.games-slots--bcT1C > div > div.game-node--Lwk1Y > div > div > div.game-table > div.game-table__controls-panel > div > div.controls-panel__account > div > div.account-panel__section.account-panel__balance-section > div.balance > div.balance__value > div > div.fit-container__content--PZA2L",
    
    // Seletores para área de conta/balance
    '.account-panel__balance-section .fit-container__content',
    '.balance-section .fit-container__content',
    '.account-panel .balance .fit-container__content',
    '.controls-panel__account .balance .fit-container__content',
    
    // Seletores mais genéricos mas ainda específicos para balance
    '.balance__value .fit-container__content',
    '.account-balance .fit-container__content',
    '.user-balance .fit-container__content'
  ];
  
  let saldoElement = null;
  let seletorUsado = '';
  
  // Tentar seletores específicos primeiro
  for (let seletor of seletoresEspecificos) {
    try {
      saldoElement = document.querySelector(seletor);
      if (saldoElement && saldoElement.textContent && saldoElement.textContent.includes('R$')) {
        const texto = saldoElement.textContent.trim();
        // Verificar se não é um valor muito baixo (provavelmente ficha ou outro elemento)
        const valorTeste = parseFloat(texto.replace(/[^\d,\.]/g, '').replace(',', '.'));
        if (!isNaN(valorTeste) && valorTeste >= 0) { // Aceitar até saldo zero
          seletorUsado = seletor;
          console.log(`🔃 [MINI PAINEL] Saldo encontrado com seletor específico: ${seletor}`);
          break;
        }
      }
    } catch (e) {
      // Ignorar erros de seletor inválido
    }
  }
  
  // Se não encontrou com seletores específicos, procurar na área de conta
  if (!saldoElement) {
    console.log('🔃 [MINI PAINEL] Procurando na área de conta...');
    
    // Procurar primeiro por elementos que contenham "account" ou "balance" na classe
    const elementosAccount = document.querySelectorAll('[class*="account"], [class*="balance"]');
    for (let el of elementosAccount) {
      const texto = el.textContent || '';
      if (texto.includes('R$') && texto.match(/\d+[,\.]\d{2}/) && texto.length < 50) {
        // Verificar se é um valor razoável (não muito baixo como 0,50 de ficha)
        const valorTeste = parseFloat(texto.replace(/[^\d,\.]/g, '').replace(',', '.'));
        if (!isNaN(valorTeste) && valorTeste !== 0.5 && valorTeste !== 0.50) { // Ignorar 0,50 especificamente
          saldoElement = el;
          seletorUsado = 'busca por account/balance';
          console.log(`🔃 [MINI PAINEL] Saldo encontrado na área de conta: "${texto}"`);
          break;
        }
      }
    }
  }
  
  // Se ainda não encontrou, busca mais ampla mas com filtros
  if (!saldoElement) {
    console.log('🔃 [MINI PAINEL] Busca ampla com filtros...');
    const todosElementos = document.querySelectorAll('*');
    const candidatos = [];
    
    for (let el of todosElementos) {
      const texto = el.textContent || '';
      if (texto.includes('R$') && texto.match(/\d+[,\.]\d{2}/) && texto.length < 50) {
        const valorTeste = parseFloat(texto.replace(/[^\d,\.]/g, '').replace(',', '.'));
        if (!isNaN(valorTeste) && valorTeste !== 0.5 && valorTeste !== 0.50) {
          candidatos.push({ elemento: el, valor: valorTeste, texto: texto });
        }
      }
    }
    
    // Ordenar candidatos por valor (maior primeiro, assumindo que saldo da conta é maior que fichas)
    candidatos.sort((a, b) => b.valor - a.valor);
    
    if (candidatos.length > 0) {
      saldoElement = candidatos[0].elemento;
      seletorUsado = 'busca ampla filtrada';
      console.log(`🔃 [MINI PAINEL] Melhor candidato encontrado: "${candidatos[0].texto}" (valor: ${candidatos[0].valor})`);
      console.log('🔍 [DEBUG] Outros candidatos encontrados:', candidatos.slice(1, 3));
    }
  }
  
  if (saldoElement) {
    var textoSaldo = saldoElement.textContent.trim();
    console.log(`🔃 [MINI PAINEL] Texto do saldo encontrado: "${textoSaldo}" (seletor: ${seletorUsado})`);
    
    // Melhorar a limpeza do texto
    var saldoLimpo = textoSaldo
      .replace(/R\$/g, '')           // Remove R$
      .replace(/&nbsp;/g, ' ')       // Substitui &nbsp; por espaço
      .replace(/\s+/g, '')           // Remove todos os espaços
      .replace(/[^\d,\.]/g, '')      // Remove tudo exceto números, vírgulas e pontos
      .trim();
    
    console.log(`🔃 [MINI PAINEL] Saldo limpo: "${saldoLimpo}"`);
    
    // Tentar diferentes formatos de número
    let saldoNumerico = NaN;
    
    // Formato brasileiro: 1.234,56
    if (saldoLimpo.includes(',') && saldoLimpo.lastIndexOf(',') > saldoLimpo.lastIndexOf('.')) {
      saldoNumerico = parseFloat(saldoLimpo.replace(/\./g, '').replace(',', '.'));
    }
    // Formato americano: 1,234.56 ou apenas 1234.56
    else if (saldoLimpo.includes('.')) {
      saldoNumerico = parseFloat(saldoLimpo.replace(/,/g, ''));
    }
    // Apenas números com vírgula: 1234,56
    else if (saldoLimpo.includes(',')) {
      saldoNumerico = parseFloat(saldoLimpo.replace(',', '.'));
    }
    // Apenas números: 1234
    else {
      saldoNumerico = parseFloat(saldoLimpo);
    }
    
    console.log(`🔃 [MINI PAINEL] Saldo numérico calculado: ${saldoNumerico}`);
    
    // Verificar se é um valor válido (não NaN e não 0,50)
    if (!isNaN(saldoNumerico) && saldoNumerico !== 0.5 && saldoNumerico !== 0.50) {
      statusBancaInicial = saldoNumerico;
      statusBancaAtual = saldoNumerico;
      ultimoSaldoMonitorado = saldoNumerico;
      
      atualizarPainelStatus();
      mostrarAlertaNaPagina('✅ Saldo inicial atualizado!', '#4CAF50', 2000);
      
      console.log(`🔃 [MINI PAINEL] ✅ Saldo atualizado para: R$ ${saldoNumerico.toFixed(2)}`);
    } else {
      mostrarAlertaNaPagina('❌ Erro: Saldo inválido (0,50 ignorado)', '#f44336', 3000);
      console.log(`🔃 [MINI PAINEL] ❌ Erro: Saldo inválido (${saldoNumerico}) - provavelmente valor de ficha`);
    }
  } else {
    mostrarAlertaNaPagina('❌ Erro: Saldo da conta não encontrado', '#f44336', 3000);
    console.log('🔃 [MINI PAINEL] ❌ Erro: Saldo da conta não encontrado');
    
    // Debug: mostrar elementos que contêm R$ para ajudar a identificar o seletor correto
    console.log('🔍 [DEBUG] Elementos que contêm R$ na página:');
    const elementosComRS = document.querySelectorAll('*');
    let count = 0;
    for (let el of elementosComRS) {
      if (el.textContent && el.textContent.includes('R$') && count < 10) {
        const valor = parseFloat(el.textContent.replace(/[^\d,\.]/g, '').replace(',', '.'));
        console.log(`  - ${el.tagName}.${el.className}: "${el.textContent.trim()}" (valor: ${valor})`);
        count++;
      }
    }
  }
}

// Criar painel ao carregar - APENAS NA MESA DA ROLETA
setTimeout(() => {
  const mesaRoleta = document.querySelector('.game-table');
  if (mesaRoleta) {
    criarPainelStatus();
    atualizarPainelStatus();
  }
}, 2000);

// Monitorar mudanças de página e recriar painel se necessário
setInterval(() => {
  const mesaRoleta = document.querySelector('.game-table');
  
  if (mesaRoleta && !painelStatus) {
    // Está na mesa e painel não existe - criar
    criarPainelStatus();
    atualizarPainelStatus();
  } else if (!mesaRoleta) {
    // Saiu da mesa - remover painéis
    if (painelStatus) {
      painelStatus.remove();
      painelStatus = null;
    }
    if (typeof painelQuentes !== 'undefined' && painelQuentes) {
      painelQuentes.remove();
      painelQuentes = null;
    }
    if (typeof painelFrios !== 'undefined' && painelFrios) {
        painelFrios.remove();
        painelFrios = null;
    }
  }
}, 1000);

// Atualizar painel a cada 2 segundos (apenas se existir)
setInterval(() => {
  if (painelStatus) {
    // Obter saldo atual
    var saldoElement = document.querySelector("#root > div > div.app-container > div.games-slots--bcT1C > div > div.game-node--Lwk1Y > div > div > div.game-table > div.game-table__controls-panel > div > div.controls-panel__account > div > div.account-panel__section.account-panel__balance-section > div.balance > div.balance__value > div > div.fit-container__content--PZA2L");
    
    if (saldoElement) {
      var textoSaldo = saldoElement.textContent.trim();
      var saldoLimpo = textoSaldo.replace(/R\$/g, '').replace(/&nbsp;/g, '').replace(/\s/g, '').trim();
      var saldoNumerico = parseFloat(saldoLimpo.replace(',', '.'));
      
      if (!isNaN(saldoNumerico)) {
        statusBancaAtual = saldoNumerico;
        atualizarPainelStatus();
      }
    }
  }
}, 2000);

// Listener para receber atualizações do sidepanel e background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (!chrome.runtime || !chrome.runtime.id) return;

  if (request.action === 'atualizarStatusPainel') {
    const statusDot = document.getElementById('status-bot-dot');
    const statusEstrat = document.getElementById('status-estrategia');
    const statusIAHighlight = document.getElementById('status-ia-painel');
    const countdownEl = document.getElementById('status-countdown');
    const saldoEl = document.getElementById('status-banca-atual');
    const winsEl = document.getElementById('status-wins');
    const lossesEl = document.getElementById('status-losses');
    
    if (statusDot) statusDot.style.background = request.ativo ? '#00ff00' : '#ff0000';
    if (statusEstrat) statusEstrat.textContent = `👔 ${request.estrategia}`;
    
    if (request.statusIA) {
        if (statusIAHighlight) {
            statusIAHighlight.style.display = 'block';
            statusIAHighlight.textContent = `🎯 ${request.statusIA}`;
        }
    } else {
        if (statusIAHighlight) statusIAHighlight.style.display = 'none';
    }

    if (saldoEl && request.saldo) saldoEl.textContent = request.saldo;
    if (winsEl && request.placar) winsEl.textContent = request.placar.wins;
    if (lossesEl && request.placar) lossesEl.textContent = request.placar.losses;
    return;
  }

  if (request.tipo === 'atualizar_quentes_frios') {
    atualizarPainelQuentesFrios(request.quentes, request.frios, request.estrategiaAtual, request.maxRodadas);
  }

  if (request.tipo === 'atualizar_simulacao') {
    saldoSimulacao = request.saldo;
    placarSimulacao = request.placar;
    atualizarPainelStatus();
  }

  if (request.action === 'atualizarStatusPainel') {
    statusBotAtivo = request.ativo || false;
    statusEstrategia = request.estrategia || 'Nenhuma';
    statusPlacar = request.placar || { wins: 0, losses: 0 };
    stopWinValor = request.stopWin || 0;  // Quanto quer ganhar
    stopLossValor = request.stopLoss || 0; // Quanto pode perder
    
    // Se não for IA, esconder o status da IA
    if (!statusEstrategia.includes('I.A')) {
      const statusIAEl = document.getElementById('status-ia-painel');
      if (statusIAEl) statusIAEl.style.display = 'none';
    }
    
    atualizarPainelStatus();
  }

  // Processar comando de logout remoto
  if (request.action === 'logout_remoto') {
    console.log('🚪 [CONTENT] Processando logout remoto...');
    executarLogout();
  }

  if (request.tipo === 'status_ia_atualizar') {
    const statusIAEl = document.getElementById('status-ia-painel');
    if (statusIAEl) {
      statusIAEl.style.display = 'block';
      statusIAEl.textContent = request.texto;
    }
  }

  if (request.tipo === 'aposta_contagem_rodadas') {
    const countdownEl = document.getElementById('status-countdown');
    if (countdownEl) {
      countdownEl.style.display = 'block';
      countdownEl.innerHTML = `⏳ Aguardando <b style="color: #ff9800;">${request.rodadas}</b> rodada(s)...`;
      countdownEl.style.color = '#ff9800';
    }
  }

  if (request.tipo === 'aposta_contagem') {
    const countdownEl = document.getElementById('status-countdown');
    const labelAcao = request.nomeEstrategia || 'Apostando';
    
    if (countdownEl) {
      if (request.segundos > 0) {
        countdownEl.style.display = 'block';
        const icone = labelAcao.includes('Simulando') ? '🧪' : '🚀';
        const cor = labelAcao.includes('Simulando') ? '#00bcd4' : '#00ff00';
        countdownEl.innerHTML = `${icone} ${labelAcao} em <b style="color: ${cor};">${request.segundos}s</b>...`;
        countdownEl.style.color = cor;

        // Mostrar alerta grande também para apostas reais
        if (request.segundos === 4 && !labelAcao.includes('Simulando')) {
            mostrarAlertaNaPagina(`🚀 ${labelAcao}`, '#ff9800', 5000);
        }
      } else {
        const msgFinal = labelAcao.includes('Simulando') ? '🧪 Simulação registrada!' : '🎰 Apostando agora!';
        countdownEl.innerHTML = msgFinal;
        setTimeout(() => {
          if (countdownEl) countdownEl.style.display = 'none';
        }, 3000);
      }
    }
  }

  if (request.tipo === 'debug_alerta') {
    console.log('🔍 [DEBUG-BG]:', request.mensagem);
    mostrarAlertaNaPagina(request.mensagem, request.mensagem.includes('✅') ? '#4CAF50' : '#f44336', 10000);
  }

  if (request.tipo === 'limpar_alertas') {
    if (alertaAtual) {
        alertaAtual.remove();
        alertaAtual = null;
    }
    const alertasAntigos = document.querySelectorAll('div[style*="z-index: 999999"]');
    alertasAntigos.forEach(a => a.remove());
  }

  if (request.action === 'obterSaldo') {
    var saldo = lerSaldoDaPagina();
    if (saldo !== null) {
      console.log('💰 Saldo encontrado:', saldo);
      sendResponse({ saldo: 'R$ ' + saldo.toFixed(2), saldoNumerico: saldo });
    } else {
      console.log('❌ Saldo não encontrado na página');
      sendResponse({ saldo: 'R$ 0,00', saldoNumerico: 0 });
    }
    return;
  }

  if (request.tipo === 'obter_ultimo_numero') {
    // Procurar o último número no DOM
    let numeroDetectado = encontrarUltimoNumeroNoDOM(document);
    
    // Se não achou, procurar em iframes
    if (numeroDetectado === null) {
        const iframes = document.querySelectorAll('iframe');
        for (const iframe of iframes) {
            try {
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                numeroDetectado = encontrarUltimoNumeroNoDOM(iframeDoc);
                if (numeroDetectado !== null) break;
            } catch (e) {
                // Ignorar iframes inacessíveis
            }
        }
    }
    
    console.log(`🎯 [CONTENT] Último número capturado: ${numeroDetectado}`);
    sendResponse({ numero: numeroDetectado });
    return true; // Manter o canal aberto para resposta assíncrona
  }

  // ===== LOGIN AUTOMÁTICO (CONTROLE REMOTO) =====
  if (request.action === 'fazer_login_automatico') {
    console.log('🔐 [CONTENT] Fazendo login automático...');
    
    const email = request.email;
    const senha = request.senha;
    
    // Aguardar 2 segundos para a página carregar completamente
    setTimeout(() => {
      try {
        // Tentar encontrar campos de login (ajuste os seletores conforme a casa)
        const emailInput = document.querySelector('input[type="email"], input[name="username"], input[id="username"]');
        const senhaInput = document.querySelector('input[type="password"], input[name="password"], input[id="password"]');
        const btnLogin = document.querySelector('button[type="submit"], input[type="submit"], button.login-btn');
        
        if (emailInput && senhaInput) {
          console.log('✅ [CONTENT] Campos de login encontrados');
          
          // Preencher campos
          emailInput.value = email;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          senhaInput.value = senha;
          senhaInput.dispatchEvent(new Event('input', { bubbles: true }));
          senhaInput.dispatchEvent(new Event('change', { bubbles: true }));
          
          // Clicar no botão de login
          setTimeout(() => {
            if (btnLogin) {
              btnLogin.click();
              console.log('✅ [CONTENT] Login automático executado!');
            } else {
              // Se não achou botão, tentar submit do form
              const form = emailInput.closest('form');
              if (form) {
                form.submit();
                console.log('✅ [CONTENT] Form de login submetido!');
              }
            }
          }, 500);
          
        } else {
          console.warn('⚠️ [CONTENT] Campos de login não encontrados');
        }
      } catch (e) {
        console.error('❌ [CONTENT] Erro no login automático:', e);
      }
    }, 2000);
    
    sendResponse({ sucesso: true });
    return true;
  }
});
// ===== LOGOUT ASSISTIDO =====
async function executarLogout() {
  console.log('🚪 Iniciando sequência de logout assistido...');

  try {
    // Passo 1: Abrir dropdown do perfil
    // O seletor .dropdown-button.active parece ser o que o usuário indicou
    const btnPerfil = document.querySelector('.dropdown-button.active') || 
                      document.querySelector('.dropdown-button');
    
    if (btnPerfil) {
      btnPerfil.click();
      console.log('✅ Menu perfil aberto');
      await new Promise(r => setTimeout(r, 1500));
    } else {
      console.log('⚠️ Botão de perfil não encontrado. Talvez já esteja deslogado?');
      // Se não achar o botão de perfil, talvez já esteja deslogado.
      // Vamos conferir se o botão de Login existe.
      if (document.body.innerText.includes('Entrar') || document.body.innerText.includes('Login')) {
         console.log('✅ Usuário parece já estar deslogado.');
         chrome.storage.local.set({ logoutPendente: false }, () => {
           window.location.href = 'https://www.google.com';
         });
         return;
      }
    }

    // Passo 2: Clicar em Deslogar
    const items = document.querySelectorAll('.dropdown-list-item');
    let btnDeslogar = null;
    items.forEach(item => {
      if (item.textContent.toLowerCase().includes('deslogar')) {
        btnDeslogar = item;
      }
    });

    if (btnDeslogar) {
      btnDeslogar.click();
      console.log('✅ Botão Deslogar clicado');
      await new Promise(r => setTimeout(r, 1500));
    }

    // Passo 3: Clicar no OK da confirmação
    const btnOK = document.querySelector('.btn.medium.primary.primary.block') || 
                  document.querySelector('button.btn.primary span');
    
    if (btnOK) {
      const elParaClicar = btnOK.tagName === 'SPAN' ? btnOK.parentElement : btnOK;
      elParaClicar.click();
      console.log('✅ Confirmação OK clicada');
      
      // Limpar flag e redirecionar apenas se conseguimos clicar em OK
      setTimeout(() => {
        chrome.storage.local.set({ logoutPendente: false }, () => {
          console.log('🌐 Redirecionando para Google...');
          window.location.href = 'https://www.google.com';
        });
      }, 2000);
    } else {
      // Se chegamos aqui e não achamos o OK, mas clicamos em deslogar, 
      // pode ser que a página já tenha mudado.
      console.log('⚠️ Botão OK não encontrado. Verificando se deslogou...');
      setTimeout(() => {
        if (!document.querySelector('.dropdown-button')) {
           chrome.storage.local.set({ logoutPendente: false }, () => {
             window.location.href = 'https://www.google.com';
           });
        }
      }, 3000);
    }

  } catch (e) {
    console.error('❌ Erro no logout:', e);
  }
}

// Verificar se há logout pendente ou redirecionamento de login ao carregar qualquer página do site
if (window.location.href.includes('big.bet.br')) {
  const isLoginPage = window.location.href.includes('cmd=signin') || window.location.href.includes('/login');
  const path = window.location.pathname;

  if (!isLoginPage) {
    chrome.storage.local.get(['logoutPendente', 'botAtivo', 'loginEmCurso'], (res) => {
      // Caso 1: Logout pendente (Fluxo de Saída)
      if (res.logoutPendente) {
        console.log('🔔 Logout pendente detectado. Iniciando em 3s...');
        setTimeout(executarLogout, 3000);
      }
      // Caso 2: Login em curso e não está na mesa (Fluxo de Entrada)
      else if (res.botAtivo && res.loginEmCurso && !window.location.href.includes('/live-casino')) {
        console.log('🚀 Login em curso detectado pelo Content Script. Forçando redirecionamento para mesa...');
        chrome.storage.local.set({ loginEmCurso: false });
        window.location.href = 'https://big.bet.br/live-casino/game/3783645?provider=Playtech&from=%2Flive-casino';
      }
    });
  }
}

console.log('✅ Content script pronto!');
console.log('🌐 Rodando em:', window.location.href);