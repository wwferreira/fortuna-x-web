console.log('%c 🤖 Rei dos Bots — SISTEMA INICIALIZADO ', 'background: #a855f7; color: #fff; font-size: 20px; font-weight: bold;');

let botConfig = null;
let ultimoNumero = null;
let numerosJaApostados = new Set();
let processandoAposta = false;
let saldoInicial = null;
let saldoAtual = null;
let stopAtingido = false;
let greens = 0;
let reds = 0;
let apostaAtiva = null; // { numeros, galeAtual }
let historicoNumeros = [];

// Solicitar config ao iniciar e monitorar mudanças no storage
// Solicitar config ao iniciar e monitorar mudanças no storage
function carregarConfigDoStorage() {
  chrome.storage.local.get(['botConfig', 'botAtivo'], (res) => {
    if (res.botConfig) {
      botConfig = res.botConfig;
      
      // LOG CRÍTICO PARA DEBUG
      console.log('📦 [DADOS RECEBIDOS]:', {
        estrategia: botConfig.estrategia,
        nome: botConfig.nome,
        temGatilhos: !!(botConfig.gatilhos && botConfig.gatilhos.length > 0),
        qtdGatilhos: botConfig.gatilhos ? botConfig.gatilhos.length : 0,
        gatilhosRaw: botConfig.gatilhos
      });

      const gatilhos = botConfig.gatilhos || [];
      if (gatilhos.length > 0) {
        console.log(`✅ %c ${gatilhos.length} GATILHOS PRONTOS PARA APOSTA! `, 'background: #22c55e; color: #fff; font-weight: bold; font-size: 14px;');
        atualizarDebug(null, 'PRONTO PARA APOSTAR');
      } else {
        console.warn('⚠️ %c ESTRATÉGIA CARREGADA, MAS SEM GATILHOS! ', 'background: #f59e0b; color: #000; font-weight: bold;');
        console.log('Objeto completo no storage:', JSON.stringify(botConfig, null, 2));
        atualizarDebug(null, 'ERRO: SEM GATILHOS');
      }
    } else {
      console.log('⏳ %c AGUARDANDO CONFIGURAÇÃO... ', 'color: #888;');
      atualizarDebug(null, 'AGUARDANDO PAINEL');
    }
    
    if (res.botAtivo !== undefined) {
      stopAtingido = !res.botAtivo;
    }
  });
}

// Ouvir mudanças no storage (quando o usuário salva no painel)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.botConfig) {
    botConfig = changes.botConfig.newValue;
    console.log('📥 %c CONFIG ATUALIZADA VIA STORAGE: ', 'color: #a855f7; font-weight: bold;', botConfig);
  }
  if (changes.botAtivo) {
    stopAtingido = !changes.botAtivo.newValue;
  }
});

// Chamar ao iniciar
carregarConfigDoStorage();

// ===== RECEBER COMANDOS DIRETOS DO BACKGROUND =====
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.tipo === 'comando_remoto') {
    if (msg.acao === 'ligar') {
      stopAtingido = false;
      console.log('▶️ Bot LIGADO remotamente');
      mostrarAlerta('▶️ Bot LIGADO remotamente', '#22c55e', 4000);
    } else if (msg.acao === 'desligar') {
      stopAtingido = true;
      console.log('⏹️ Bot DESLIGADO remotamente');
      mostrarAlerta('⏹️ Bot DESLIGADO remotamente', '#ef4444', 4000);
    }
  }
});

// ===== ALERTA VISUAL NA PÁGINA =====
let alertaAtual = null;
function mostrarAlerta(mensagem, cor = '#a855f7', duracao = 3000) {
  if (alertaAtual) alertaAtual.remove();
  const el = document.createElement('div');
  el.style.cssText = `
    position: fixed; bottom: 20px; right: 20px;
    background: ${cor}; color: white;
    padding: 8px 14px; border-radius: 8px;
    font-size: 12px; font-weight: bold;
    z-index: 999999; box-shadow: 0 2px 8px rgba(0,0,0,0.4);
    max-width: 320px; word-wrap: break-word;
  `;
  el.textContent = mensagem;
  document.body.appendChild(el);
  alertaAtual = el;
  setTimeout(() => { if (el.parentNode) el.remove(); if (alertaAtual === el) alertaAtual = null; }, duracao);
}

// ===== DETECÇÃO DE NÚMERO =====
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

function detectarHistorico() {
  let nums = [];
  
  // Função interna para coletar de um documento
  function coletarDeDoc(doc) {
    const seletores = [
      '.history-item-value__text--H6oCX',
      '.history-item-value__text--n5cYB',
      '[class*="history-item-value__text"]'
    ];
    let elementos = [];
    for (const seletor of seletores) {
      const achados = doc.querySelectorAll(seletor);
      if (achados.length > 0) {
        elementos = achados;
        break;
      }
    }
    const encontrados = [];
    for (let i = 0; i < elementos.length; i++) {
      const num = parseInt(elementos[i].textContent.trim());
      if (!isNaN(num) && num >= 0 && num <= 36) encontrados.push(num);
    }
    return encontrados;
  }

  // 1. Tentar no documento principal
  nums = coletarDeDoc(document);

  // 2. Se não achou, tentar em todos os iframes
  if (nums.length === 0) {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        const deIframe = coletarDeDoc(iframeDoc);
        if (deIframe.length > 0) {
          nums = deIframe;
          break;
        }
      } catch (e) {}
    }
  }

  return nums;
}

function detectarUltimoNumero() {
  // 1. Tentar no documento principal
  let num = encontrarUltimoNumeroNoDOM(document);

  // 2. Se não achou, tentar nos iframes
  if (num === null) {
    const iframes = document.querySelectorAll('iframe');
    for (const iframe of iframes) {
      try {
        const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        num = encontrarUltimoNumeroNoDOM(iframeDoc);
        if (num !== null) break;
      } catch (e) {}
    }
  }
  return num;
}

function enviarStats() {
  chrome.runtime.sendMessage({
    tipo: 'stats',
    greens,
    reds,
    saldo: saldoAtual,
    saldoInicial
  }).catch(() => {});
}

// ===== MONITORAR SALDO =====
function detectarSaldo() {
  // Seletor estável via data-automation-locator
  const el = document.querySelector('[data-automation-locator="footer.balance"]');
  if (el) {
    const texto = (el.innerText || el.textContent || '')
      .replace(/R\$|R\u00a0\$|\u00a0|\s/g, '')
      .replace(',', '.')
      .trim();
    const val = parseFloat(texto);
    if (!isNaN(val) && val >= 0) return val;
  }
  // Fallback: classe balance__value
  const el2 = document.querySelector('.balance__value');
  if (el2) {
    const texto = (el2.innerText || el2.textContent || '')
      .replace(/R\$|R\u00a0\$|\u00a0|\s/g, '')
      .replace(',', '.')
      .trim();
    const val = parseFloat(texto);
    if (!isNaN(val) && val >= 0) return val;
  }
  // Fallback 2: qualquer elemento com classe contendo fit-container__content
  const el3 = document.querySelector('[class*="fit-container__content"]');
  if (el3) {
    const texto = (el3.innerText || el3.textContent || '')
      .replace(/R\$|R\u00a0\$|\u00a0|\s/g, '')
      .replace(',', '.')
      .trim();
    const val = parseFloat(texto);
    if (!isNaN(val) && val >= 0 && val < 1000000) return val;
  }
  return null;
}

// ===== CLICAR EM NÚMERO =====
function simularClick(x, y) {
  const el = document.elementFromPoint(x, y);
  if (!el) return false;
  ['mousedown', 'mouseup', 'click'].forEach(tipo => {
    el.dispatchEvent(new MouseEvent(tipo, { view: window, bubbles: true, cancelable: true, clientX: x, clientY: y }));
  });
  return true;
}

function clicarNumero(numero) {
  const sel = `[data-automation-locator="betPlace.straight-${numero}"]`;
  const el = document.querySelector(sel);
  if (el) {
    const r = el.getBoundingClientRect();
    return simularClick(Math.trunc(r.x + r.width / 2), Math.trunc(r.y + r.height / 2));
  }
  return false;
}

function clicarAreaExterna(sigla) {
  const mapa = {
    'D1': ['betPlace.dozen-1st12', 'betPlace.dozen-1'],
    'D2': ['betPlace.dozen-2nd12', 'betPlace.dozen-2'],
    'D3': ['betPlace.dozen-3rd12', 'betPlace.dozen-3'],
    'C1': ['betPlace.column-1', 'betPlace.column2to1-1'],
    'C2': ['betPlace.column-2', 'betPlace.column2to1-2'],
    'C3': ['betPlace.column-3', 'betPlace.column2to1-3']
  };
  const locators = mapa[sigla.toUpperCase()];
  if (!locators) return false;
  for (const loc of locators) {
    const el = document.querySelector(`[data-automation-locator="${loc}"]`);
    if (el) {
      const r = el.getBoundingClientRect();
      simularClick(Math.trunc(r.x + r.width / 2), Math.trunc(r.y + r.height / 2));
      return true;
    }
  }
  return false;
}

function apostar(numeros, multiplicador = 1) {
  if (!numeros || numeros.length === 0) return;
  const paraApostar = numeros.filter(n => !numerosJaApostados.has(n));
  if (paraApostar.length === 0) return;

  mostrarAlerta(`🎯 Apostando em: ${paraApostar.join(', ')} (${multiplicador}x)`, '#2196F3', 35000);

  paraApostar.forEach((item, idx) => {
    setTimeout(() => {
      numerosJaApostados.add(item);
      const isArea = typeof item === 'string' && /^[DC][123]$/i.test(item);
      for (let i = 0; i < multiplicador; i++) {
        setTimeout(() => {
          if (isArea) clicarAreaExterna(item);
          else clicarNumero(item);
        }, i * 30);
      }
    }, idx * 80);
  });
}

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
// ===== OBSERVER =====
const observer = new MutationObserver((mutations) => {
  // Sempre que houver mudança, tenta detectar o número
  const num = detectarUltimoNumero();
  if (num !== null) {
    processarNovoNumero(num);
  }
});

// Tentar observar o corpo inteiro para não perder nada
if (document.body) {
  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true 
  });
  console.log('👀 Observer global ativado!');
}

// Intervalo de segurança (mais frequente)
setInterval(() => {
  const num = detectarUltimoNumero();
  if (num !== null) processarNovoNumero(num);
}, 300);

// Criar um pequeno painel visual de depuração na página
function criarPainelDebug() {
  if (document.getElementById('bot-debug-panel')) return;
  
  // REGRA: Só criar o painel se encontrar números (ou seja, se for o frame do jogo)
  const temNumeros = detectarUltimoNumero() !== null;
  if (!temNumeros) return;

  const div = document.createElement('div');
  div.id = 'bot-debug-panel';
  div.style.cssText = `
    position: fixed; top: 5px; left: 5px;
    background: rgba(0,0,0,0.85); color: #00ff00;
    padding: 8px; border-radius: 4px;
    font-family: 'Courier New', monospace; font-size: 11px;
    z-index: 2147483647; border: 1.5px solid #a855f7;
    pointer-events: none; line-height: 1.4;
    box-shadow: 0 0 10px rgba(168,85,247,0.5);
  `;
  
  div.innerHTML = `
    <div style="font-weight:bold;color:#a855f7;border-bottom:1px solid #333;margin-bottom:4px;padding-bottom:2px;">🤖 REI DOS BOTS</div>
    <div>STATUS: <span id="debug-bot-status" style="color:#fff">ATIVO</span></div>
    <div>ÚLTIMO: <span id="debug-last-num" style="color:#fff;font-weight:bold">-</span></div>
    <div>ESTRAT: <span id="debug-strategy" style="color:#fff">-</span></div>
    <div>HISTOR: <span id="debug-history" style="font-size:9px;color:#888">-</span></div>
  `;
  (document.body || document.documentElement).appendChild(div);
  console.log('✅ Painel Debug criado no Frame do Jogo:', window.location.href);
}

function atualizarDebug(num, status) {
  const elStatus = document.getElementById('debug-bot-status');
  const elNum = document.getElementById('debug-last-num');
  const elStrat = document.getElementById('debug-strategy');
  const elHist = document.getElementById('debug-history');
  
  if (elStatus) elStatus.textContent = status || (botConfig ? 'ATIVO' : 'SEM CONFIG');
  if (elNum) elNum.textContent = num !== null ? num : '-';
  if (elStrat && botConfig) elStrat.textContent = botConfig.nome || botConfig.estrategia;
  if (elHist) elHist.textContent = historicoNumeros.slice(0, 8).join(', ');
}

// Iniciar painel e observer com retentativas (caso o DOM não esteja pronto)
function inicializarBot() {
  if (!document.body) {
    setTimeout(inicializarBot, 500);
    return;
  }
  
  criarPainelDebug();
  
  const observer = new MutationObserver(() => {
    const num = detectarUltimoNumero();
    if (num !== null) processarNovoNumero(num);
  });

  observer.observe(document.body, { 
    childList: true, 
    subtree: true,
    characterData: true 
  });
  
  console.log('👀 Observer e Painel ativos no frame:', window.location.href);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inicializarBot);
} else {
  inicializarBot();
}

// Intervalo de segurança (mais agressivo)
setInterval(() => {
  if (!document.getElementById('bot-debug-panel')) criarPainelDebug();
  const num = detectarUltimoNumero();
  
  if (num !== null) {
    processarNovoNumero(num);
  } else {
    const statusTxt = botConfig ? '🔎 PROCURANDO NÚMERO...' : '⏳ AGUARDANDO CONFIG...';
    atualizarDebug(null, statusTxt);
    
    // Log de ajuda a cada 10s se não encontrar nada
    if (!window._lastScan || Date.now() - window._lastScan > 10000) {
      window._lastScan = Date.now();
      console.log('🔎 %c SCANNER DE ELEMENTOS: ', 'color: cyan; font-weight: bold;');
      const probaveis = document.querySelectorAll('[class*="history"],[class*="recent"],[class*="last"]');
      probaveis.forEach(el => {
        console.log(`- Classe: .${el.className} | Texto: "${el.innerText || el.textContent}"`);
      });
    }
  }
}, 500);

function processarNovoNumero(numero) {
  if (numero === ultimoNumero) return;
  ultimoNumero = numero;
  
  atualizarDebug(numero);

  if (!botConfig || stopAtingido) {
    console.log('🚫 Bot ignorando número (Sem config ou Stop atingido)');
    return;
  }

  console.log('%c 🎰 NOVO NÚMERO DETECTADO: ' + numero + ' ', 'background: #22c55e; color: #fff; font-weight: bold;');
  chrome.runtime.sendMessage({ tipo: 'resultado_numero', numero });

  // Atualizar histórico interno (sempre o mais recente na frente)
  historicoNumeros = detectarHistorico();
  console.log('📊 Histórico atual:', historicoNumeros);

  // Verificar stop gain/loss
  const saldo = detectarSaldo();
  if (saldo !== null) {
    if (saldoInicial === null) {
      saldoInicial = saldo;
      console.log('💰 Saldo inicial fixado:', saldoInicial);
    }
    saldoAtual = saldo;
    
    const lucroLiquido = saldoAtual - saldoInicial;
    
    console.log(`💰 Saldo Atual: R$ ${saldoAtual.toFixed(2)} | Inicial: R$ ${saldoInicial.toFixed(2)} | Lucro: R$ ${lucroLiquido.toFixed(2)}`);
    console.log(`🎯 Stop Win: R$ ${botConfig.stop_win} | Stop Loss: R$ ${botConfig.stop_loss}`);

    if (botConfig.stop_win > 0 && lucroLiquido >= botConfig.stop_win) {
      stopAtingido = true;
      console.log('%c 🎯 STOP WIN ATINGIDO! ', 'background: #22c55e; color: #fff; font-size: 20px;');
      mostrarAlerta(`🎯 STOP WIN atingido! +R$ ${lucroLiquido.toFixed(2)}`, '#22c55e', 30000);
      atualizarDebug(numero, 'STOP WIN!');
      enviarStats();
      return;
    }
    
    if (botConfig.stop_loss > 0 && lucroLiquido <= (botConfig.stop_loss * -1)) {
      stopAtingido = true;
      console.log('%c ⚠️ STOP LOSS ATINGIDO! ', 'background: #ef4444; color: #fff; font-size: 20px;');
      mostrarAlerta(`⚠️ STOP LOSS atingido! R$ ${lucroLiquido.toFixed(2)}`, '#ef4444', 30000);
      atualizarDebug(numero, 'STOP LOSS!');
      enviarStats();
      return;
    }
  }

  // Contabilizar resultado da aposta anterior
  if (apostaAtiva) {
    const acertou = apostaAtiva.numeros.includes(numero);
    if (acertou) { 
      greens++; 
      mostrarAlerta(`✅ GREEN! Total: ${greens}G / ${reds}R`, '#22c55e', 3000); 
      apostaAtiva = null; // Ganhou, limpa aposta
    } else {
      // Perdeu, verificar se tem Gale
      if (apostaAtiva.galeAtual < apostaAtiva.maxGales) {
        apostaAtiva.galeAtual++;
        const multiplicador = apostaAtiva.fichasGale[apostaAtiva.galeAtual - 1] || Math.pow(2, apostaAtiva.galeAtual);
        console.log(`🔄 RED! Iniciando Gale ${apostaAtiva.galeAtual} (Mult: ${multiplicador}x)`);
        mostrarAlerta(`🔄 Gale ${apostaAtiva.galeAtual}...`, '#f59e0b', 3000);
        apostar(apostaAtiva.numeros, multiplicador);
        enviarStats();
        return; // Não limpa apostaAtiva, pois o gale continua nela
      } else {
        reds++;
        mostrarAlerta(`❌ RED FINAL! Total: ${greens}G / ${reds}R`, '#ef4444', 3000);
        apostaAtiva = null;
      }
    }
    enviarStats();
  }

  // Limpar apostas anteriores
  numerosJaApostados.clear();

  // VERIFICAR GATILHOS
  const gatilhos = botConfig.gatilhos || [];
  
  if (gatilhos.length === 0) {
    console.warn('⚠️ Nenhuma estratégia (gatilho) encontrada dentro de botConfig.');
    return;
  }

  for (const gat of gatilhos) {
    let disparou = false;

    if (gat.modo === 'NORMAL') {
      // Garantir que os números do gatilho sejam comparáveis (int)
      const opcoesGatilho = (gat.numeros || []).map(n => parseInt(n)).filter(n => !isNaN(n));
      const repeticoesNecessarias = parseInt(gat.repeticoes) || 1;

      if (opcoesGatilho.length === 0) continue;

      // Pegar os últimos resultados
      const ultimosResultados = historicoNumeros.slice(0, repeticoesNecessarias);
      
      console.log(`🧐 Analisando: [${opcoesGatilho.length} números] | Repetições: ${repeticoesNecessarias}x | Últimos da mesa: [${ultimosResultados}]`);

      if (ultimosResultados.length === repeticoesNecessarias) {
        disparou = ultimosResultados.every(res => opcoesGatilho.includes(res));
      }
    }

    if (disparou) {
      console.log('🚀 GATILHO DISPARADO!', gat.aposta);
      
      // Converter string de aposta "1 3 7" em array [1, 3, 7]
      const numerosParaApostar = gat.aposta.split(/[\s,]+/).filter(Boolean).map(n => {
        const num = parseInt(n);
        return isNaN(num) ? n.toUpperCase() : num;
      });

      // Configurar nova aposta ativa com Gale
      apostaAtiva = {
        numeros: numerosParaApostar,
        galeAtual: 0,
        maxGales: gat.qtdSecundario || 0,
        fichasGale: gat.fichas || []
      };

      apostar(numerosParaApostar, 1);
      break; // Dispara apenas um gatilho por vez
    }
  }
}

function enviarStats() {
  chrome.runtime.sendMessage({
    tipo: 'stats',
    greens,
    reds,
    saldo: saldoAtual,
    saldoInicial
  }).catch(() => {});
}

// Enviar saldo inicial após 5s (aguardar página carregar)
setTimeout(() => {
  const s = detectarSaldo();
  console.log('💰 Saldo detectado na inicialização:', s);
  if (s !== null) {
    saldoInicial = s;
    saldoAtual = s;
    enviarStats();
  }
}, 5000);

console.log('✅ Content script pronto!');
