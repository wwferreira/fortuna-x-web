// ===== CONSTANTES =====
const WS_URL = 'wss://fortuna-x-web.onrender.com';
const URL_MESA = 'https://big.bet.br/live-casino/game/3783645?provider=Playtech&from=%2Flive-casino';
const URL_LOGIN_CASA = 'https://big.bet.br/casino?cmd=signin&path=phone';
const URL_HOME_CASA = 'https://big.bet.br/pt';

// ===== SUPABASE CLIENT (MIGRADO PARA BACKGROUND) =====
const SUPABASE_URL = 'https://vfmzxgznrgwnzghqaaau.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbXp4Z3pucmd3bnpnaHFhYWF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwMTU1MzYsImV4cCI6MjA4MTU5MTUzNn0.wqPeHz7fMd8S2erj0KtVYd3BgKqRdi7ymxFkoUae-ck';

class SupabaseClient {
  constructor(url, key) {
    this.url = url;
    this.key = key;
    this.auth = new AuthClient(this);
  }

  from(table) {
    return new QueryBuilder(this, table);
  }

  async rpc(functionName, params) {
    const { data: sessionData } = await this.auth.getSession();
    const token = sessionData?.session?.access_token || this.key;

    const response = await fetch(`${this.url}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': this.key
      },
      body: JSON.stringify(params)
    });

    const data = await response.json();
    if (response.status === 401 && data.message === 'JWT expired') {
        const refreshed = await this.auth.refreshSession();
        if (refreshed) return this.rpc(functionName, params);
    }

    if (!response.ok) {
      return { data: null, error: data };
    }
    return { data, error: null };
  }
}

class AuthClient {
  constructor(client) {
    this.client = client;
    this.session = null;
  }

  async getSession() {
    return new Promise((resolve) => {
      chrome.storage.local.get(['supabase_token', 'supabase_user', 'supabase_refresh_token'], (result) => {
        if (result.supabase_token && result.supabase_user) {
          this.session = {
            access_token: result.supabase_token,
            refresh_token: result.supabase_refresh_token,
            user: JSON.parse(result.supabase_user)
          };
          resolve({ data: { session: this.session }, error: null });
        } else {
          resolve({ data: { session: null }, error: null });
        }
      });
    });
  }

  async refreshSession() {
    const { data: sessionData } = await this.getSession();
    if (!sessionData?.session?.refresh_token) return false;

    try {
      const response = await fetch(`${this.client.url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': this.client.key
        },
        body: JSON.stringify({ refresh_token: sessionData.session.refresh_token })
      });

      const data = await response.json();
      if (!response.ok) throw data;

      await this.saveSession(data);
      console.log('🔄 [BACKGROUND] Token renovado com sucesso!');
      return true;
    } catch (e) {
      console.error('❌ [BACKGROUND] Falha no refresh do token:', e);
      return false;
    }
  }

  async saveSession(data) {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        'supabase_token': data.access_token,
        'supabase_refresh_token': data.refresh_token,
        'supabase_user': JSON.stringify(data.user)
      }, () => {
        this.session = data;
        resolve();
      });
    });
  }
}

class QueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.filters = [];
    this.orderBy = null;
    this.selectColumns = '*';
  }

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  async execute() {
    const { data: sessionData } = await this.client.auth.getSession();
    const token = sessionData?.session?.access_token;

    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.client.key
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${this.client.url}/rest/v1/${this.table}?select=${this.selectColumns}`;
    for (const filter of this.filters) {
      url += `&${filter.column}=${filter.operator}.${encodeURIComponent(filter.value)}`;
    }

    const response = await fetch(url, { headers });
    const data = await response.json();

    if (response.status === 401 && data.message === 'JWT expired') {
        const refreshed = await this.client.auth.refreshSession();
        if (refreshed) return this.execute();
    }

    if (!response.ok) {
      return { data: null, error: data };
    }
    return { data, error: null };
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function gerarInstallationId() {
    try {
        const platformInfo = await new Promise((resolve) => chrome.runtime.getPlatformInfo(resolve));
        const os = platformInfo?.os || '';
        const arch = platformInfo?.arch || '';
        const lang = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';
        const tz = (typeof Intl !== 'undefined' && Intl.DateTimeFormat && Intl.DateTimeFormat().resolvedOptions().timeZone) ? Intl.DateTimeFormat().resolvedOptions().timeZone : '';
        const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) ? String(navigator.hardwareConcurrency) : '';
        const base = [os, arch, lang, tz, cores].join('|');
        const enc = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
        if (!enc || !crypto?.subtle) throw new Error('no-subtle');
        const data = enc.encode(base);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return `FRT-MACH-${hashHex.slice(0, 16)}`;
    } catch (_) {
        if (crypto && crypto.randomUUID) return `FRT-MACH-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
        return `FRT-MACH-${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`.slice(0, 16 + 8);
    }
}

function garantirInstallationId(callback) {
    chrome.storage.local.get(['installation_id'], async (result) => {
        if (result.installation_id) {
            if (callback) callback(result.installation_id);
            return;
        }
        const novoId = await gerarInstallationId();
        chrome.storage.local.set({ installation_id: novoId }, () => {
            console.log('🆔 [BACKGROUND] Installation ID criado:', novoId);
            if (callback) callback(novoId);
        });
    });
}

chrome.runtime.onInstalled.addListener(() => {
    garantirInstallationId();
});

garantirInstallationId();

// ESTADO GLOBAL DO BOT NO BACKGROUND
let botState = {
    wins: 0,
    losses: 0,
    historicoRodadas: [],
    gatilhos: [],
    estrategiaSelecionada: '',
    apostaAtiva: null,
    aguardandoProximaRodada: false,
    stopAtivado: false,
    pauseWinAtivo: false,
    rodasAguardando: 0,
    numerosFixosFuncionario: '',
    configQuentesFrios: { qtdQuentes: 3, qtdFrios: 3, qtdVizinhos: 2 },
    stopWin: 0,
    stopLoss: 0,
    saldoInicial: 0,
    ultimoSaldoPush: 0,
    sequenciaAtual: [],
    iaRodadasSessao: 0,
    maxRodadasHistorico: 500
};

// NOVO: Estado isolado para o contador para evitar que o Sidepanel sobrescreva
let botCountdownState = {
    rodadasRestantes: null
};

// CONFIGURAÇÃO INTERNA
const USER_NEKOT = 'FRT-6MBE4FM9P-MMPILUIE';

const TAMANHO_SEQUENCIA_MAX = 20;
const RACETRACK = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];

// Variáveis de Simulação (Background)
let modoSimulacaoAtivo = false;
let saldoSimulacao = 1000.00;
let valorFichaSimulacao = 1.00;
let placarSimulacao = { wins: 0, losses: 0 };

let stateLoaded = false;
const stateLoadedPromise = new Promise((resolve) => {
    chrome.storage.local.get(['rouletteState', 'historicoRodadas', 'apostaAtiva', 'botCountdownState', 'modoSimulacaoAtivo', 'saldoSimulacao', 'valorFichaSimulacao', 'placarSimulacao'], (result) => {
        if (result.rouletteState) {
            botState = { ...botState, ...result.rouletteState };
        }
        if (result.historicoRodadas) {
            botState.historicoRodadas = result.historicoRodadas;
        }
        if (result.apostaAtiva) {
            botState.apostaAtiva = result.apostaAtiva;
        }
        if (result.botCountdownState) {
            botCountdownState = result.botCountdownState;
        }
        
        // Simulação
        modoSimulacaoAtivo = result.modoSimulacaoAtivo || false;
        saldoSimulacao = result.saldoSimulacao !== undefined ? result.saldoSimulacao : 1000.00;
        valorFichaSimulacao = result.valorFichaSimulacao !== undefined ? result.valorFichaSimulacao : 1.00;
        placarSimulacao = result.placarSimulacao || { wins: 0, losses: 0 };

        console.log('📦 [BACKGROUND] Estado carregado do storage:', botState.wins, 'wins', botState.losses, 'losses');
        stateLoaded = true;
        resolve();
    });
});

// HEARTBEAT para manter o Service Worker ativo (MV3)
function keepAlive() {
    chrome.runtime.getPlatformInfo(() => {
        // Apenas para manter o SW ativo
    });
}
setInterval(keepAlive, 20000); // Heartbeat a cada 20 segundos

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        if (changes.modoSimulacaoAtivo) modoSimulacaoAtivo = changes.modoSimulacaoAtivo.newValue;
        if (changes.saldoSimulacao) saldoSimulacao = changes.saldoSimulacao.newValue;
        if (changes.valorFichaSimulacao) valorFichaSimulacao = changes.valorFichaSimulacao.newValue;
        if (changes.placarSimulacao) placarSimulacao = changes.placarSimulacao.newValue;
        
        if (changes.rouletteState) {
            const oldEstrategia = botState.estrategiaSelecionada;
            botState = { ...botState, ...changes.rouletteState.newValue };
            
            // Resetar contador se a estratégia mudou
            if (oldEstrategia !== botState.estrategiaSelecionada) {
                console.log('🔄 [BACKGROUND] Estratégia mudou, resetando contador de rodadas.');
                botCountdownState.rodadasRestantes = null;
                chrome.storage.local.set({ botCountdownState });
                
                // Forçar atualização do painel de quentes/frios na mesa
                enviarDadosQuentesFriosParaMesa();
            }
            
        // Sempre enviar se a config mudar (mesmo sem mudar o nome da estratégia)
        if (JSON.stringify(changes.rouletteState.oldValue?.configQuentesFrios) !== JSON.stringify(changes.rouletteState.newValue?.configQuentesFrios) ||
            changes.rouletteState.oldValue?.maxRodadasHistorico !== changes.rouletteState.newValue?.maxRodadasHistorico) {
            enviarDadosQuentesFriosParaMesa();
        }
    }
        if (changes.historicoRodadas) botState.historicoRodadas = changes.historicoRodadas.newValue;
        if (changes.apostaAtiva) {
            botState.apostaAtiva = changes.apostaAtiva.newValue;
            console.log('📬 [BACKGROUND] apostaAtiva sincronizada:', botState.apostaAtiva ? 'ATIVA' : 'NULL');
        }
    }
});

// FUNÇÕES DE LÓGICA (MIGRADAS)

function verificarStopGestao() {
    if (botState.stopAtivado) return;
    
    const stopWinCount = parseInt(botState.stopWin) || 0;
    const stopLossCount = parseInt(botState.stopLoss) || 0;
    
    if (stopWinCount <= 0 && stopLossCount <= 0) return;
    
    const currentWins = modoSimulacaoAtivo ? placarSimulacao.wins : botState.wins;
    const currentLosses = modoSimulacaoAtivo ? placarSimulacao.losses : botState.losses;
    
    console.log(`📊 [BACKGROUND-GESTÃO] Verificando Stop: Wins=${currentWins}/${stopWinCount}, Losses=${currentLosses}/${stopLossCount}`);

    let stopAtingido = false;
    let motivoStop = '';

    if (stopWinCount > 0 && currentWins >= stopWinCount) {
        stopAtingido = true;
        motivoStop = 'STOP WIN';
    } else if (stopLossCount > 0 && currentLosses >= stopLossCount) {
        stopAtingido = true;
        motivoStop = 'STOP LOSS';
    }

    if (stopAtingido) {
        pararApostasBG(motivoStop);
        const msg = `🛑 ${motivoStop} ATINGIDO! Placar: ${motivoStop === 'STOP WIN' ? currentWins : currentLosses}. Bot pausado!`;
        const classe = motivoStop === 'STOP WIN' ? 'sucesso' : 'erro';
        chrome.runtime.sendMessage({ tipo: 'mostrar_notificacao', texto: msg, classe: classe, tempo: 8000 });
        sendTelegramMessageBG(`🏁 <b>${motivoStop} ATINGIDO!</b>\nPlacar: ${currentWins} X ${currentLosses}\nBot pausado.`);
    }

    // Sincronizar o mini painel com o novo placar e status ATUALIZADO
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            chrome.tabs.sendMessage(tab.id, {
                action: 'atualizarStatusPainel',
                ativo: !botState.stopAtivado,
                estrategia: botState.nomeEstrategiaSelecionada || 'Manual',
                placar: { wins: botState.wins, losses: botState.losses },
                stopWin: botState.stopWin || 0,
                stopLoss: botState.stopLoss || 0
            }).catch(() => {});
        });
    });
}

function pararApostasBG(motivo) {
    botState.stopAtivado = true;
    botState.apostaAtiva = null;
    botState.aguardandoProximaRodada = true;
    
    chrome.storage.local.set({ 
        rouletteState: botState, 
        apostaAtiva: null 
    });

    // Redirecionar TODAS as abas de apostas para sair da página
    chrome.tabs.query({}, (tabs) => {
        tabs.forEach(tab => {
            const url = tab.url || "";
            const isAposta = [
                'bet365.com', 'bet365.bet.br', 'bet365.com.br', 'bet365.net.br',
                'onegameslink.com', 'twogameslink.com', 'gambling-malta.com',
                'c365play.com', 'bfcdl.com'
            ].some(dom => url.includes(dom));

            if (isAposta) {
                // 1. Tentar notificar o mini-painel
                chrome.tabs.sendMessage(tab.id, {
                    action: 'atualizarStatusPainel',
                    ativo: false,
                    estrategia: botState.nomeEstrategiaSelecionada || 'Manual',
                    placar: { wins: botState.wins, losses: botState.losses },
                    stopWin: botState.stopWin || 0,
                    stopLoss: botState.stopLoss || 0
                }).catch(() => {});

                // 2. Redirecionar
                chrome.tabs.update(tab.id, { url: 'https://www.reidosbots.net.br' });
            }
        });
    });
    
    console.log(`🔴 [BACKGROUND-GESTÃO] Bot parado e abas redirecionadas por: ${motivo}`);
}

async function sendTelegramMessageBG(message) {
    const state = botState;
    if (!state.telegramToken || !state.telegramChatId) return false;

    const url = `https://api.telegram.org/bot${state.telegramToken}/sendMessage`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: state.telegramChatId,
                text: message,
                parse_mode: 'HTML'
            })
        });
        return true;
    } catch (error) {
        console.error('❌ [BACKGROUND] Erro ao enviar Telegram:', error);
        return false;
    }
}

function calcularVizinhos(numerosPivos, quantidadeVizinhos) {
    let alvos = [];
    numerosPivos.forEach(pivo => {
        const idx = RACETRACK.indexOf(parseInt(pivo));
        if (idx === -1) return;
        alvos.push(RACETRACK[idx]);
        for (let i = 1; i <= quantidadeVizinhos; i++) {
            let idxDir = (idx + i) % RACETRACK.length;
            alvos.push(RACETRACK[idxDir]);
            let idxEsq = (idx - i) % RACETRACK.length;
            if (idxEsq < 0) idxEsq += RACETRACK.length;
            alvos.push(RACETRACK[idxEsq]);
        }
    });
    return [...new Set(alvos)].sort((a, b) => a - b);
}

function enviarDadosQuentesFriosParaMesa() {
    const maxRodadas = botState.maxRodadasHistorico || 500;
    const historicoRecortado = botState.historicoRodadas.slice(0, maxRodadas);
    
    // Forçar carregamento da config mais recente antes de enviar
    chrome.storage.local.get(['rouletteState'], (result) => {
        const state = result.rouletteState || botState;
        const config = state.configQuentesFrios || { qtdQuentes: 3, qtdFrios: 3, qtdVizinhos: 2 };
        
        const contagem = {};
        for (let i = 0; i <= 36; i++) contagem[i] = 0;

        historicoRecortado.forEach(n => {
            if (n >= 0 && n <= 36) contagem[n] = (contagem[n] || 0) + 1;
        });

        const ranking = Object.keys(contagem).map(numStr => ({
            numero: parseInt(numStr),
            freq: contagem[numStr]
        }));

        const quentes = [...ranking].sort((a, b) => b.freq - a.freq).slice(0, config.qtdQuentes || 3); 
        const frios = [...ranking].sort((a, b) => a.freq - b.freq).slice(0, config.qtdFrios || 3); 

        // Enviar para TODAS as abas para evitar que filtros de URL bloqueiem o painel (ex: big.bet.br)
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    tipo: 'atualizar_quentes_frios',
                    quentes: quentes,
                    frios: frios,
                    estrategiaAtual: state.nomeEstrategiaSelecionada || '',
                    maxRodadas: maxRodadas
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        // Silenciar erro se a aba não tiver o content script
                    }
                });
            });
        });
    });
}

function calcularQuentesFrios(tipo) {
    const maxRodadas = botState.maxRodadasHistorico || 500;
    const historicoRecortado = botState.historicoRodadas.slice(0, maxRodadas);
    if (historicoRecortado.length === 0) return [];

    const config = botState.configQuentesFrios || { qtdQuentes: 3, qtdFrios: 3, qtdVizinhos: 2 };
    const contagem = {};
    for (let i = 0; i <= 36; i++) contagem[i] = 0;

    historicoRecortado.forEach(n => {
        if (n >= 0 && n <= 36) contagem[n] = (contagem[n] || 0) + 1;
    });

    const ranking = Object.keys(contagem).map(numStr => ({
        numero: parseInt(numStr),
        freq: contagem[numStr]
    }));

    const rankingQuentes = [...ranking].sort((a, b) => b.freq - a.freq);
    const rankingFrios = [...ranking].sort((a, b) => a.freq - b.freq);

    let pivos = [];
    if (tipo === 'QUENTES' || tipo === 'AMBOS' || tipo.includes('Quentes')) {
        pivos = pivos.concat(rankingQuentes.slice(0, config.qtdQuentes).map(item => item.numero));
    }
    if (tipo === 'FRIOS' || tipo === 'AMBOS' || tipo.includes('Frios')) {
        pivos = pivos.concat(rankingFrios.slice(0, config.qtdFrios).map(item => item.numero));
    }

    if (config.qtdVizinhos === 0) return [...new Set(pivos)].sort((a, b) => a - b);
    return calcularVizinhos(pivos, config.qtdVizinhos);
}

function isNumeroNaLegenda(numero, legendaObj) {
     if (!legendaObj || !legendaObj.numeros) return false;
     
     const areas = obterAreasDoNumero(numero);
     return legendaObj.numeros.some(item => {
         if (typeof item === 'number') {
             return item === numero;
         }
         if (typeof item === 'string') {
             const u = item.toUpperCase();
             // Se for apenas um número em string
             const n = parseInt(u);
             if (!isNaN(n) && String(n) === u) return n === numero;
             
             return areas.includes(u);
         }
         return false;
     });
 }
 
 // Função global para expandir legendas/áreas em uma lista de números puros (para conferência de Green/Loss)
 function expandirItemParaNumeros(item) {
     if (typeof item === 'number') return [item];
     const u = String(item).toUpperCase();
     
     // Áreas Padrão
     if (u === 'D1') return [1,2,3,4,5,6,7,8,9,10,11,12];
     if (u === 'D2') return [13,14,15,16,17,18,19,20,21,22,23,24];
     if (u === 'D3') return [25,26,27,28,29,30,31,32,33,34,35,36];
     if (u === 'C1') return [1,4,7,10,13,16,19,22,25,28,31,34];
     if (u === 'C2') return [2,5,8,11,14,17,20,23,26,29,32,35];
     if (u === 'C3') return [3,6,9,12,15,18,21,24,27,30,33,36];
     if (u === 'VERMELHO') return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
     if (u === 'PRETO') return [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
     if (u === 'PAR') return [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36];
     if (u === 'IMPAR') return [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35];
     if (u === 'BAIXO') return [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
     if (u === 'ALTO') return [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36];
     if (u === 'VIZINHOS DO ZERO') return [22,18,29,7,28,12,35,3,26,0,32,15,19,4,21,2,25];
     if (u === 'ORFAOS') return [1,20,14,31,9,17,34,6];
     
     if (u.startsWith('PLENO ')) {
         const n = parseInt(u.split(' ')[1]);
         if (!isNaN(n)) return [n];
     }
     
     // Se for apenas um número em string
     const numParsed = parseInt(u);
     if (!isNaN(numParsed) && String(numParsed) === u) {
         return [numParsed];
     }

     // Tenta achar se é uma legenda customizada
     if (botState.legendas) {
         const legenda = botState.legendas.find(l => l.nome.toUpperCase() === u);
         if (legenda && legenda.numeros) {
             let nums = [];
             legenda.numeros.forEach(lnum => {
                 nums = nums.concat(expandirItemParaNumeros(lnum));
             });
             return nums;
         }
     }
     return [];
  }
  
  // Função para resolver legendas customizadas mantendo áreas padrão (para cliques e custo)
  function resolverItensAposta(itens) {
      if (!Array.isArray(itens)) return [];
      let resolved = [];
      itens.forEach(item => {
          if (typeof item === 'number') {
              resolved.push(item);
          } else {
              const u = String(item).toUpperCase();
              // Áreas Padrão: mantemos como string (custam 1 ficha e o content script sabe clicar)
              if (['D1', 'D2', 'D3', 'C1', 'C2', 'C3', 'VERMELHO', 'PRETO', 'PAR', 'IMPAR', 'BAIXO', 'ALTO', 'VIZINHOS DO ZERO', 'ORFAOS'].includes(u) || u.startsWith('PLENO ')) {
                  resolved.push(u);
              } else {
                  // Se for apenas um número em string, converte para número
                  const numParsed = parseInt(u);
                  if (!isNaN(numParsed) && String(numParsed) === u) {
                      resolved.push(numParsed);
                  } else {
                      // Tenta achar se é uma legenda customizada
                      if (botState.legendas) {
                          const legenda = botState.legendas.find(l => l.nome.toUpperCase() === u);
                          if (legenda && legenda.numeros) {
                              resolved = resolved.concat(resolverItensAposta(legenda.numeros));
                          } else {
                              // Fallback: se não é nada conhecido, ignora ou mantém?
                              // Vamos manter para debug, mas o ideal é que o Sidepanel já valide
                              resolved.push(item);
                          }
                      } else {
                          resolved.push(item);
                      }
                  }
              }
          }
      });
      return resolved;
  }
  
  function obterAreasDoNumero(numero) {
    const areas = [];
    if (numero >= 1 && numero <= 12) areas.push('D1');
    else if (numero >= 13 && numero <= 24) areas.push('D2');
    else if (numero >= 25 && numero <= 36) areas.push('D3');
    if (numero % 3 === 1) areas.push('C1');
    else if (numero % 3 === 2) areas.push('C2');
    else if (numero % 3 === 0 && numero !== 0) areas.push('C3');
    return areas;
}

function enviarApostaParaMesa(gatilho, numeroAcionador, galeIndex = 0) {
    console.log(`[GALE-DEBUG] Iniciando enviarApostaParaMesa para ${gatilho.nome}. GaleIndex: ${galeIndex}`);
    console.log(`[GALE-DEBUG] Gatilho completo:`, JSON.stringify(gatilho, null, 2));
    
    // Verificar se foi explicitamente configurado como SIMPLES (sem gale/ciclo)
    const isSimplesExplicito = gatilho.estrategia === 'SIMPLES' || 
                               gatilho.tipo === 'SIMPLES' ||
                               (gatilho.multiplicadores && gatilho.multiplicadores.length === 1 && gatilho.multiplicadores[0] === 1) ||
                               (gatilho.gales && gatilho.gales.length === 1 && gatilho.gales[0] === 1) ||
                               (gatilho.ciclos && gatilho.ciclos.length === 1 && gatilho.ciclos[0] === 1);
    
    console.log(`[GALE-DEBUG] isSimplesExplicito:`, isSimplesExplicito);
    
    // Fallback absoluto para multiplicadores
    let listaMult = gatilho.multiplicadores || gatilho.gales || gatilho.ciclos || (isSimplesExplicito ? [1] : [1, 3]);
    
    console.log(`[GALE-DEBUG] Lista de multiplicadores ANTES das regras:`, listaMult);
    
    // Regras Específicas solicitadas pelo Usuário
    const apostaEmTags = Array.isArray(gatilho.apostaEm) ? gatilho.apostaEm : [];
    const isFuncionario = apostaEmTags.includes('FUNCIONARIO_MES') || apostaEmTags.includes('DYNAMIC_FUNCIONARIO');
    const isHotCold = apostaEmTags.some(tag => ['QUENTES', 'FRIOS', 'AMBOS'].includes(tag));
    const isIAPleno = gatilho.tipo === 'IA_PLENO_ENGINE';

    if (isFuncionario) {
        // Usar multiplicadores da nova configuração se disponível
        if (botState.configFuncionarioMes && botState.configFuncionarioMes.multiplicadores && botState.configFuncionarioMes.multiplicadores.length > 0) {
            listaMult = [1, ...botState.configFuncionarioMes.multiplicadores]; // Adicionar entrada inicial
            console.log(`[GALE-DEBUG] Funcionário do Mês - usando multiplicadores da nova config:`, listaMult);
        } else if (!gatilho.multiplicadores && !gatilho.gales && !gatilho.ciclos && !isSimplesExplicito) {
            // Fallback para configuração padrão
            listaMult = [1, 3];
        }
        console.log(`[GALE-DEBUG] É Funcionário do Mês, multiplicadores finais:`, listaMult);
    } else if (isHotCold) {
        if (!gatilho.multiplicadores && !gatilho.gales && !gatilho.ciclos && !isSimplesExplicito) {
            listaMult = [1, 3];
        }
        console.log(`[GALE-DEBUG] É Quentes/Frios, multiplicadores:`, listaMult);
    } else if (isIAPleno) {
        // IA PLENO: Usa a lista que veio da estratégia (respeitando o limite do Admin)
        // Se por algum motivo não houver lista, usa um fallback seguro
        if (gatilho.multiplicadores && gatilho.multiplicadores.length > 0) {
            listaMult = gatilho.multiplicadores;
        } else {
            listaMult = [1, 1, 1, 2, 2]; 
        }
        console.log(`[GALE-DEBUG] É IA Pleno, usando multiplicadores da estratégia:`, listaMult);
    }

    const multiplicador = listaMult[galeIndex] !== undefined ? listaMult[galeIndex] : (listaMult[listaMult.length-1] || 1);

    console.log(`[GALE-DEBUG] Multiplicador para esta rodada (galeIndex=${galeIndex}): ${multiplicador}x (Lista: ${JSON.stringify(listaMult)})`);

    let numerosParaApostar = [];

    // --- LÓGICA DE DEFINIÇÃO DE NÚMEROS ---
    const isDinamicoRecalculo = apostaEmTags.some(tag => ['QUENTES', 'FRIOS', 'AMBOS'].includes(tag));
    
    if (galeIndex > 0 && !isDinamicoRecalculo) {
        const isFuncionario = apostaEmTags.includes('FUNCIONARIO_MES') || apostaEmTags.includes('DYNAMIC_FUNCIONARIO');

        // Funcionario do Mes faz EXPANSÃO em seus ciclos/gales.
        if (isFuncionario) {
            console.log(`[CICLO-DEBUG] Expandindo aposta no nível ${galeIndex} (Funcionario). Adicionando número ${numeroAcionador} + 2 vizinhos.`);
            let numerosAnteriores = [];
            if (botState.apostaAtiva && botState.apostaAtiva.numeros) {
                numerosAnteriores = botState.apostaAtiva.numeros;
            }
            // Funcionário do Mês sempre usa 2 vizinhos (fixo)
            const novosVizinhos = calcularVizinhos([numeroAcionador], 2);
            numerosParaApostar = [...new Set([...numerosAnteriores, ...novosVizinhos])].sort((a, b) => a - b);
        } else {
            // COMPORTAMENTO GALE PADRÃO ou CICLO COMUM: Repetir o que foi apostado antes
            if (botState.apostaAtiva && botState.apostaAtiva.numeros && botState.apostaAtiva.numeros.length > 0) {
                console.log(`[GALE-DEBUG] Nível ${galeIndex} de ${gatilho.nome}: Repetindo ${botState.apostaAtiva.numeros.length} números.`);
                numerosParaApostar = botState.apostaAtiva.numeros;
            } else {
                console.warn('[GALE-DEBUG] Alerta: botState.apostaAtiva sem números para Gale/Ciclo! Calculando alvos a partir do gatilho.');
                numerosParaApostar = resolverItensAposta(gatilho.apostaEm || gatilho.numeros || []);
            }
        }
    } else {
        // Aposta Inicial ou Recalculo de Quentes/Frios
        const isDinamico = apostaEmTags.some(tag => ['QUENTES', 'FRIOS', 'AMBOS', 'FUNCIONARIO_MES', 'DYNAMIC_FUNCIONARIO'].includes(tag));

        if (isDinamico) {
            console.log(`[GALE-DEBUG] Calculando números dinâmicos inciais/ciclo para ${gatilho.nome}`);
            if (apostaEmTags.includes('FUNCIONARIO_MES') || apostaEmTags.includes('DYNAMIC_FUNCIONARIO')) {
                let ultimosUnicos = [];
                for (let num of botState.historicoRodadas) {
                    if (!ultimosUnicos.includes(num)) {
                        ultimosUnicos.push(num);
                        if (ultimosUnicos.length === 7) break;
                    }
                }
                numerosParaApostar = calcularVizinhos(ultimosUnicos, 2);
                // Usar números fixos da nova configuração
                if (botState.configFuncionarioMes && botState.configFuncionarioMes.numerosFixos) {
                    const fixos = botState.configFuncionarioMes.numerosFixos.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 0 && n <= 36);
                    numerosParaApostar = [...new Set([...numerosParaApostar, ...fixos])].sort((a, b) => a - b);
                } else if (botState.numerosFixosFuncionario) {
                    // Fallback para configuração antiga
                    const fixos = botState.numerosFixosFuncionario.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 0 && n <= 36);
                    numerosParaApostar = [...new Set([...numerosParaApostar, ...fixos])].sort((a, b) => a - b);
                }
            } else if (apostaEmTags.includes('QUENTES') || apostaEmTags.includes('FRIOS') || apostaEmTags.includes('AMBOS')) {
                const tipo = apostaEmTags.find(t => ['QUENTES', 'FRIOS', 'AMBOS'].includes(t));
                numerosParaApostar = calcularQuentesFrios(tipo);
            }
        } else if (apostaEmTags.includes('ZONAS')) {
            numerosParaApostar = [0, 32, 15, 12, 35, 3, 26, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20];
        } else if (apostaEmTags.includes('VIZINHOS_C1')) {
            numerosParaApostar = calcularVizinhos([1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34], 2);
        } else if (apostaEmTags.includes('VIZINHOS_C2')) {
            numerosParaApostar = calcularVizinhos([2, 5, 8, 11, 14, 17, 20, 23, 26, 29, 32, 35], 2);
        } else if (apostaEmTags.includes('VIZINHOS_C3')) {
            numerosParaApostar = calcularVizinhos([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36], 2);
        } else if (apostaEmTags.includes('VIZINHO_30')) {
            numerosParaApostar = calcularVizinhos([30], 2);
        } else {
            // Gatilho normal: resolver legendas personalizadas para áreas/números clicáveis
            numerosParaApostar = resolverItensAposta(gatilho.apostaEm || gatilho.numeros || []);
        }
    }

    botState.apostaAtiva = {
        gatilho: gatilho,
        nomeEstrategia: (botState.nomeEstrategiaSelecionada === 'Gatilhos' || !botState.nomeEstrategiaSelecionada) ? (gatilho.nome || 'Gatilhos') : botState.nomeEstrategiaSelecionada,
        numeros: numerosParaApostar,
        multiplicador: multiplicador,
        galeIndex: galeIndex,
        timestamp: Date.now(),
        apostaId: Date.now(), // ID único para rastrear esta aposta
        historicoGales: [] // Array para guardar info de cada gale
    };

    chrome.storage.local.set({ apostaAtiva: botState.apostaAtiva });
    
    // Salvar informações desta aposta/gale para usar no resultado
    if (!botState.apostaAtiva.historicoGales) {
        botState.apostaAtiva.historicoGales = [];
    }
    
    const infoGale = {
        quantidadeNumeros: numerosParaApostar.length,
        multiplicador: multiplicador,
        galeIndex: galeIndex,
        tipo: gatilho.tipo || (galeIndex > 0 ? 'GALE' : 'SIMPLES')
    };
    
    botState.apostaAtiva.historicoGales.push(infoGale);
    
    // Salvar no storage também
    chrome.storage.local.set({ apostaAtiva: botState.apostaAtiva });
    
    console.log(`📝 [BACKGROUND] Salvou gale ${galeIndex}: ${JSON.stringify(infoGale)}`);
    
    console.log(`📝 [BACKGROUND] Salvando info gale ${galeIndex}: qtd=${infoGale.quantidadeNumeros}, mult=${infoGale.multiplicador}`);

    // Enviar comando de clique após 4s
    let segundosRestantes = 4;
    
    // Notificação inicial imediata
    const prefixoStatus = modoSimulacaoAtivo ? 'Simulando' : 'Apostando';
    const isTipoCiclo = gatilho.tipo === 'CICLO' || gatilho.tipo === 'ciclo' || gatilho.estrategia === 'CICLO';
    const tipoEntrada = galeIndex > 0 ? (isTipoCiclo ? `ciclo ${galeIndex}` : `gale ${galeIndex}`) : 'entrada inicial';
    const labelAposta = `${prefixoStatus} ${tipoEntrada}`;
    
    // Calcular probabilidade (se disponível no gatilho ou IA)
    let probMsg = '';
    if (gatilho.probabilidade) {
        probMsg = ` | ${gatilho.probabilidade.toFixed(1)}% prob.`;
    } else if (gatilho.nome && gatilho.nome.includes('%')) {
        // Tentar extrair da string do nome se for IA
        const match = gatilho.nome.match(/(\d+)%/);
        if (match) probMsg = ` | ${match[1]}.0% prob.`;
    }

    // Enviar para o Telegram conforme layout solicitado (com delay de 2s para garantir saldo atualizado)
    setTimeout(() => {
        const saldoFormatado = (botState.ultimoSaldoPush || 0).toFixed(2).replace('.', ',');
        const msgTelegram = `🎰 <b>FORTUNA X — ${labelAposta}</b>\n` +
                            `📋 Estratégia: ${botState.nomeEstrategiaSelecionada || 'Manual'}\n` +
                            `🔢 ${numerosParaApostar.length} números${probMsg}\n` +
                            `🔙 Número anterior: ${numeroAcionador}\n` +
                            `💰 Saldo: R$ ${saldoFormatado}\n\n` +
                            `💰 <b>Saldo Atual: R$ ${saldoFormatado}</b>`;
        
        sendTelegramMessageBG(msgTelegram);
    }, 2000);

    chrome.runtime.sendMessage({ 
        tipo: 'aposta_contagem', 
        segundos: segundosRestantes,
        numeros: numerosParaApostar,
        nomeEstrategia: `${labelAposta}: ${botState.apostaAtiva?.nomeEstrategia || 'Estratégia'}`
    });

    const intervalCountdown = setInterval(() => {
        // Se o bot for pausado durante a contagem, cancela a aposta
        if (botState.stopAtivado) {
            console.log('🛑 [BACKGROUND] Aposta cancelada: Bot entrou em STOP durante o countdown.');
            clearInterval(intervalCountdown);
            return;
        }

        segundosRestantes--;
        
        // Notificar UI sobre o countdown (para o painel interno)
        chrome.runtime.sendMessage({ 
            tipo: 'aposta_contagem', 
            segundos: segundosRestantes,
            numeros: numerosParaApostar,
            nomeEstrategia: `${labelAposta}: ${botState.apostaAtiva?.nomeEstrategia || 'Estratégia'}`
        });

        if (segundosRestantes <= 0) {
            clearInterval(intervalCountdown);
            
            if (modoSimulacaoAtivo) {
                console.log('🧪 [BACKGROUND] Modo Simulação Ativo: Aposta fictícia registrada. Sem cliques reais.');
                // Na simulação, o saldo "sai" da banca no momento da aposta
                const custoAposta = valorFichaSimulacao * numerosParaApostar.length * multiplicador;
                saldoSimulacao -= custoAposta;
                chrome.storage.local.set({ saldoSimulacao });
                
                // Notificar painel para atualizar saldo simulado
                chrome.runtime.sendMessage({
                    tipo: 'atualizar_simulacao',
                    saldo: saldoSimulacao,
                    placar: placarSimulacao
                });
            } else {
                const timestamp = Date.now();
                chrome.storage.local.set({
                    numerosParaApostar: numerosParaApostar,
                    multiplicadorFichas: multiplicador,
                    nomeEstrategiaParaAviso: `${labelAposta}: ${botState.apostaAtiva?.nomeEstrategia || 'Estratégia'}`,
                    timestamp: timestamp
                });
                console.log('🚀 [BACKGROUND] Comando de aposta enviado para o Content Script');
            }
        }
    }, 1000);
}

function verificarGatilhosParaApostar(numero) {
    if (botState.pauseWinAtivo || botState.stopAtivado) return;

    // 1. Verificar se existe estratégia de IA ativa
    const gatilhoIA = botState.gatilhos.find(g => g.configEspecial && (g.configEspecial.tipo === 'IA_ENGINE' || g.configEspecial.tipo === 'IA_PLENO'));
    if (gatilhoIA) {
        if (botState.stopAtivado) {
            console.log('🛑 [BACKGROUND-IA] Bot em STOP, ignorando motor de IA.');
            return;
        }
        if (gatilhoIA.configEspecial.tipo === 'IA_ENGINE') {
            processarMotorIA(gatilhoIA, numero);
        } else if (gatilhoIA.configEspecial.tipo === 'IA_PLENO') {
            processarMotorIAPleno(gatilhoIA, numero);
        }
        return;
    }

    // 2. Filtrar gatilhos da estratégia atual que são dinâmicos/autônomos (FUNCIONARIO_MES, QUENTES, FRIOS, AMBOS)
    // Esses precisam aguardar as 5 rodadas de análise
    const gatilhosDinamicos = botState.gatilhos.filter(g => 
        (g.apostaEm && Array.isArray(g.apostaEm) && g.apostaEm.some(a => 
            ['FUNCIONARIO_MES', 'QUENTES', 'FRIOS', 'AMBOS'].includes(a)
        )) || (g.configEspecial && g.configEspecial.tipo === 'AUTONOMO' && !g.isSequencia && !g.numeros)
    );

    if (gatilhosDinamicos.length > 0) {
        if (botState.stopAtivado) {
            console.log('🛑 [BACKGROUND-DINAMICO] Bot em STOP, ignorando análise dinâmica.');
            return;
        }
        // Decrementar rodadas ANTES de verificar se está aguardando próxima rodada ou apostaAtiva
        const rodadasParaEsperar = (gatilhosDinamicos[0].configEspecial && gatilhosDinamicos[0].configEspecial.esperarRodadas) || 5;

        if (botCountdownState.rodadasRestantes === undefined || botCountdownState.rodadasRestantes === null || botCountdownState.rodadasRestantes <= 0) {
            botCountdownState.rodadasRestantes = rodadasParaEsperar;
        }

        botCountdownState.rodadasRestantes--;
        chrome.storage.local.set({ botCountdownState });

        // Se houver aposta ativa, não processamos novos disparos dinâmicos
        if (botState.apostaAtiva) return;

        if (botCountdownState.rodadasRestantes > 0) {
            console.log(`⏳ [BACKGROUND] Aguardando ${botCountdownState.rodadasRestantes} rodadas para estratégia especial...`);
            chrome.runtime.sendMessage({ 
                tipo: 'aposta_contagem_rodadas', 
                rodadas: botCountdownState.rodadasRestantes,
                estrategia: botState.nomeEstrategiaSelecionada
            }).catch(() => {});
            return;
        }

        // Chegou a ZERO: Disparar apostas dinâmicas
        console.log(`🚀 [BACKGROUND] Ciclo de análise finalizado. Disparando apostas automáticas.`);
        gatilhosDinamicos.forEach(g => enviarApostaParaMesa(g, numero, g.cicloAtual || 0));
        return; 
    }

    // 2. Verificar gatilhos normais (Manuais/Sequências/Vizinhos da C2)
    // Esses NÃO precisam aguardar 5 rodadas, são baseados em legendas e repetições
    if (botState.stopAtivado || botState.aguardandoProximaRodada || botState.apostaAtiva) return;

    const gatilhosAtivos = botState.gatilhos.filter(gatilho => {
        if (gatilho.ativo === false) return false;

        // --- NOVO SISTEMA DE SEQUÊNCIAS (Ex: SOL SOL -> APOSTAR) ---
        if (gatilho.isSequencia && gatilho.legendasObjetos && gatilho.legendasObjetos.length > 0) {
            const seqLen = gatilho.legendasObjetos.length;
            if (botState.sequenciaAtual.length < seqLen) return false;

            // O histórico botState.sequenciaAtual[0] é o MAIS RECENTE (extrema esquerda da mesa).
            // Se o usuário cadastrou "DZ1 DZ2 DZ3" seguindo a ordem da mesa (Esquerda para Direita):
            // DZ1 (1º item) -> Deve ser o mais recente (idx 0 no histórico)
            // DZ2 (2º item) -> Deve ser o anterior (idx 1 no histórico)
            // DZ3 (3º item) -> Deve ser o mais antigo (idx 2 no histórico)
            const condicaoSequencia = gatilho.legendasObjetos.every((legendaObj, idx) => {
                const numHistorico = botState.sequenciaAtual[idx];
                return isNumeroNaLegenda(numHistorico, legendaObj);
            });

            if (condicaoSequencia) {
                console.log(`✅ [SEQUÊNCIA] Gatilho "${gatilho.nome}" detectado! Apostando em: ${gatilho.apostaEm.join(', ')}`);
                return true;
            }
            return false;
        }

        // --- SISTEMA LEGADO / ADMIN (REPETIÇÕES) ---
        // Determinar o conjunto de acionadores (pode vir de acionadores ou numeros legados)
        const acionadoresConfigurados = gatilho.acionadores || (gatilho.legenda ? gatilho.legenda.split(/[\s,]+/) : []);
        
        if (acionadoresConfigurados.length === 0) return false;

        // Se for por repetição (ex: Vizinhos da C2 com 2 repetições)
        const repeticoesNecessarias = parseInt(gatilho.repeticoes) || 1;
        
        if (botState.sequenciaAtual.length < repeticoesNecessarias) return false;
        
        // Pega os últimos N números (conforme repetições)
        const ultimosNumeros = botState.sequenciaAtual.slice(0, repeticoesNecessarias);
        
        // Verifica se TODOS os últimos N números estão no conjunto de acionadores
        const condicaoBatida = ultimosNumeros.every(num => {
            const numStr = String(num);
            
            // 1. Tenta achar se o número ou área está nos acionadores
            const estaNosAcionadores = acionadoresConfigurados.some(a => String(a) === numStr || obterAreasDoNumero(num).includes(a));
            if (estaNosAcionadores) return true;

            // 2. Tenta achar se o número pertence a alguma legenda configurada que tenha o nome igual a um dos acionadores
            if (botState.legendas) {
                const legendasCompativeis = botState.legendas.filter(l => acionadoresConfigurados.includes(l.nome));
                return legendasCompativeis.some(l => isNumeroNaLegenda(num, l));
            }

            return false;
        });

        if (condicaoBatida) {
            console.log(`✅ [REPETIÇÃO] Gatilho "${gatilho.nome || gatilho.legenda}" detectado! (Repetições: ${repeticoesNecessarias}). Apostando em: ${gatilho.apostaEm.join(', ')}`);
            return true;
        }

        return false;
    });

    gatilhosAtivos.forEach(g => enviarApostaParaMesa(g, numero, g.cicloAtual || 0));
}

// --- MOTOR DE IA PLENO (Straight Up) ---
function processarMotorIAPleno(gatilhoIA, numero) {
    if (botState.apostaAtiva) return;

    const modo = botState.modoIAPleno || 'moderado';
    const totalRodadasAnalise = botState.maxRodadasHistorico || 500;
    const historico = botState.historicoRodadas.slice(0, totalRodadasAnalise);

    if (historico.length < 10) {
        chrome.runtime.sendMessage({
            tipo: 'status_ia_atualizar',
            texto: `🎯 I.A Fortuna X: Aguardando dados (${historico.length}/10)`
        }).catch(() => {});
        return;
    }

    // 1. Identificar Números Quentes e Sequências
    const contagem = {};
    historico.forEach(n => contagem[n] = (contagem[n] || 0) + 1);
    
    const sequencias = {};
    for (let i = 0; i < historico.length - 1; i++) {
        if (historico[i+1] === numero) {
            const posterior = historico[i];
            sequencias[posterior] = (sequencias[posterior] || 0) + 1;
        }
    }

    // 2. Calcular Score
    const candidatos = Object.keys(contagem).map(n => ({
        num: parseInt(n),
        score: (contagem[n] * 2.0) + (sequencias[n] || 0) * 8
    })).sort((a,b) => b.score - a.score);

    const melhorCandidato = candidatos[0];
    const scoreAtual = Math.floor(melhorCandidato?.score || 0);

    // 3. Definir Alvos de Pontuação por Modo
    let gatilhoAposta = 15; 
    if (modo === 'moderado') gatilhoAposta = 20; 
    if (modo === 'intermediario') gatilhoAposta = 15;
    if (modo === 'agressivo') gatilhoAposta = 12;

    const statusBase = `🎯 I.A Fortuna X: ${scoreAtual}/${gatilhoAposta}${scoreAtual >= gatilhoAposta * 1.5 ? ' 🔥' : ''}`;

    // --- SISTEMA DE PAUSA OBRIGATÓRIA (ADMIN) ---
    if (botCountdownState.rodadasRestantes === undefined || botCountdownState.rodadasRestantes === null) {
        const configEspecial = gatilhoIA.configEspecial || {};
        botCountdownState.rodadasRestantes = configEspecial.esperarRodadas || 0;
    }

    if (botCountdownState.rodadasRestantes > 0) {
        botCountdownState.rodadasRestantes--;
        chrome.storage.local.set({ botCountdownState });
        
        chrome.runtime.sendMessage({
            tipo: 'status_ia_atualizar',
            texto: `${statusBase} | ⏳ Pausa: ${botCountdownState.rodadasRestantes} rod.`
        }).catch(() => {});
        return;
    }

    // 4. LÓGICA DE DECISÃO: IA DECIDE QUANDO APOSTAR PELO SCORE
    if (scoreAtual >= gatilhoAposta) {
        let qtdPivos = 4; 
        if (modo === 'moderado') qtdPivos = 6;
        if (modo === 'intermediario') qtdPivos = 9;
        if (modo === 'agressivo') qtdPivos = 15;

        const pivosSelecionados = candidatos.slice(0, qtdPivos).map(c => c.num);
        
        let numerosApostar = [];
        pivosSelecionados.forEach(pivo => {
            const idx = RACETRACK.indexOf(pivo);
            if (idx !== -1) {
                numerosApostar.push(pivo);
                let idxDir = (idx + 1) % RACETRACK.length;
                numerosApostar.push(RACETRACK[idxDir]);
                let idxEsq = (idx - 1 + RACETRACK.length) % RACETRACK.length;
                numerosApostar.push(RACETRACK[idxEsq]);
            }
        });
        numerosApostar = [...new Set(numerosApostar)];

        const gatilhoTemp = {
            ...gatilhoIA,
            apostaEm: numerosApostar.map(n => `PLENO ${n}`),
            numeros: numerosApostar,
            nome: `I.A Fortuna X (${modo.toUpperCase()}): ${pivosSelecionados.length} Bases`,
            tipo: 'IA_PLENO_ENGINE'
        };
        
        console.log(`🎯 [IA-DEBUG] ENTRADA! Score: ${scoreAtual} (Alvo: ${gatilhoAposta})`);
        
        chrome.runtime.sendMessage({
            tipo: 'status_ia_atualizar',
            texto: `🚀 I.A Fortuna X: Apostando em ${pivosSelecionados.length} Bases...`
        }).catch(() => {});

        enviarApostaParaMesa(gatilhoTemp, numero);
    } else {
        // IA ANALISANDO LIVREMENTE
        chrome.runtime.sendMessage({
            tipo: 'status_ia_atualizar',
            texto: statusBase
        }).catch(() => {});
    }
}

// --- MOTOR DE IA ---
function processarMotorIA(gatilhoIA, numero) {
    if (botState.apostaAtiva) return;

    // Usar botState diretamente para evitar latência do storage
    const totalRodadasAnalise = botState.maxRodadasHistorico || 500;
    const historico = botState.historicoRodadas.slice(0, totalRodadasAnalise);

    if (historico.length < 5) {
        chrome.runtime.sendMessage({
            tipo: 'debug_alerta',
            mensagem: `🧠 IA: Aguardando histórico (${historico.length}/5)`
        }).catch(() => {});
        return;
    }

    const config = gatilhoIA.configEspecial;
    const areasPermitidas = config.areasPermitidas || ['COLUNAS', 'DUZIAS'];
    const assertividadeMinima = config.assertividadeMinima || 75;

    // Analisar probabilidades para as áreas permitidas
    let melhorAposta = null;
    let maiorProbabilidade = 0;

    const analisarArea = (nome, numeros) => {
        const ocorrencias = historico.filter(n => numeros.includes(n)).length;
        const probabilidade = (ocorrencias / historico.length) * 100;
        
        if (probabilidade > maiorProbabilidade) {
            maiorProbabilidade = probabilidade;
            melhorAposta = { nome, numeros };
        }
    };

    if (areasPermitidas.includes('COLUNAS')) {
        analisarArea('C1', [1,4,7,10,13,16,19,22,25,28,31,34]);
        analisarArea('C2', [2,5,8,11,14,17,20,23,26,29,32,35]);
        analisarArea('C3', [3,6,9,12,15,18,21,24,27,30,33,36]);
    }
    if (areasPermitidas.includes('DUZIAS')) {
        analisarArea('D1', [1,2,3,4,5,6,7,8,9,10,11,12]);
        analisarArea('D2', [13,14,15,16,17,18,19,20,21,22,23,24]);
        analisarArea('D3', [25,26,27,28,29,30,31,32,33,34,35,36]);
    }
    if (areasPermitidas.includes('CORES')) {
        analisarArea('VERMELHO', [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
        analisarArea('PRETO', [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]);
    }
    if (areasPermitidas.includes('VIZINHOS_ZERO')) {
        analisarArea('VIZINHOS DO ZERO', [22,18,29,7,28,12,35,3,26,0,32,15,19,4,21,2,25]);
    }
    if (areasPermitidas.includes('ORFAOS')) {
        analisarArea('ORFAOS', [1,20,14,31,9,17,34,6]);
    }
    if (areasPermitidas.includes('PLENOS')) {
        // Analisar os 5 números mais quentes individualmente
        const contagem = {};
        historico.forEach(n => contagem[n] = (contagem[n] || 0) + 1);
        const quentes = Object.keys(contagem).sort((a,b) => contagem[b] - contagem[a]).slice(0, 5);
        quentes.forEach(n => analisarArea(`PLENO ${n}`, [parseInt(n)]));
    }

    if (melhorAposta && maiorProbabilidade >= assertividadeMinima) {
        console.log(`🤖 IA detectou oportunidade: ${melhorAposta.nome} com ${maiorProbabilidade.toFixed(1)}%`);
        
        const gatilhoTemp = {
            ...gatilhoIA,
            apostaEm: [melhorAposta.nome],
            numeros: melhorAposta.numeros,
            nome: `IA: ${melhorAposta.nome} (${maiorProbabilidade.toFixed(0)}%)`
        };
        
        enviarApostaParaMesa(gatilhoTemp, numero);
    } else {
        chrome.runtime.sendMessage({
            tipo: 'debug_alerta',
            mensagem: `🧠 IA: ${melhorAposta?.nome || 'Analisando'} (${maiorProbabilidade.toFixed(1)}%) - Meta: ${assertividadeMinima}%`
        }).catch(() => {});
    }
}

function registrarNoHistorico(aposta, numeroSaiu, resultado) {
    if (!aposta) return;

    // Aguardar um pouco para garantir que o saldo foi atualizado pelo push da mesa
    setTimeout(() => {
        chrome.storage.local.get(['historicoApostas', 'modoSimulacaoAtivo', 'saldoSimulacao', 'rouletteState'], (result) => {
            const historico = result.historicoApostas || [];
            const isSimulacao = result.modoSimulacaoAtivo || false;
            
            // Obter saldo atual (Real ou Simulado)
            let saldoAtual = 0;
            if (isSimulacao) {
                saldoAtual = result.saldoSimulacao || 0;
            } else {
                // Em modo real, o saldo vem do botState (objeto em memória mais atualizado)
                // Se o botState.ultimoSaldoPush for 0, tenta pegar do rouletteState
                saldoAtual = botState.ultimoSaldoPush || result.rouletteState?.ultimoSaldoPush || 0;
            }

            console.log(`📊 [BACKGROUND] Registrando histórico. Saldo capturado: ${saldoAtual}`);

            const novoRegistro = {
                id: aposta.apostaId || Date.now(),
                timestamp: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                gatilho: aposta.gatilho?.nome || aposta.nomeEstrategia || 'Desconhecido',
                numeroSaiu: numeroSaiu,
                resultado: resultado.toUpperCase(),
                gale: aposta.galeIndex || 0,
                modo: isSimulacao ? 'SIMULAÇÃO' : 'REAL',
                saldo: saldoAtual
            };

            historico.unshift(novoRegistro);
            if (historico.length > 100) historico.pop();

            chrome.storage.local.set({ historicoApostas: historico }, () => {
                console.log(`📊 [HISTÓRICO] Registro adicionado: ${resultado} no número ${numeroSaiu} com Saldo: ${saldoAtual}`);
                // Notificar Sidepanel para atualizar a lista se estiver aberta
                chrome.runtime.sendMessage({ tipo: 'atualizar_historico_apostas' }).catch(() => {});
            });
        });
    }, 1500); // 1.5 segundos de delay para o saldo da mesa atualizar após o resultado
}

function expandirItemParaNumeros(item) {
    if (typeof item === 'number') return [item];
    
    // Se for string de número ("12")
    const pInt = parseInt(item);
    if (!isNaN(pInt) && pInt >= 0 && pInt <= 36) {
        // Garantir que não seja uma área externa que "acidentalmente" virou NaN etc, mas aqui já passamos
    }
    
    const str = String(item).toUpperCase();
    if (str === 'D1') return [1,2,3,4,5,6,7,8,9,10,11,12];
    if (str === 'D2') return [13,14,15,16,17,18,19,20,21,22,23,24];
    if (str === 'D3') return [25,26,27,28,29,30,31,32,33,34,35,36];
    if (str === 'C1') return [1,4,7,10,13,16,19,22,25,28,31,34];
    if (str === 'C2') return [2,5,8,11,14,17,20,23,26,29,32,35];
    if (str === 'C3') return [3,6,9,12,15,18,21,24,27,30,33,36];
    if (str === 'VERMELHO') return [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];
    if (str === 'PRETO') return [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35];
    if (str === 'PAR') return [2,4,6,8,10,12,14,16,18,20,22,24,26,28,30,32,34,36];
    if (str === 'IMPAR') return [1,3,5,7,9,11,13,15,17,19,21,23,25,27,29,31,33,35];
    if (str === 'MAIOR' || str === 'ALTO') return [19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36];
    if (str === 'MENOR' || str === 'BAIXO') return [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18];
    
    if (str.startsWith('PLENO ')) {
        const num = parseInt(str.split(' ')[1]);
        if (!isNaN(num)) return [num];
    }
    
    if (!isNaN(pInt)) return [pInt];
    return [];
}

function verificarResultado(numeroSaiu) {
    if (!botState.apostaAtiva) return;
    
    // Verificação de segurança: se a aposta foi feita há mais de 4 minutos, provavelmente é lixo de estado
    const agora = Date.now();
    const tempoAposta = botState.apostaAtiva.timestamp ? new Date(botState.apostaAtiva.timestamp).getTime() : agora;
    if (agora - tempoAposta > 240000) { 
        console.warn('🕒 [BACKGROUND] Aposta ativa expirada (mais de 4 min). Limpando estado.');
        botState.apostaAtiva = null;
        chrome.storage.local.set({ apostaAtiva: null });
        return;
    }

    const aposta = botState.apostaAtiva;
    let apostados = [];

    // Expandir cada item apostado para números puros
    aposta.numeros.forEach(item => {
        apostados = apostados.concat(expandirItemParaNumeros(item));
    });

    const numerosUnicosApostados = [...new Set(apostados)];
    const numeroSaiuInt = parseInt(numeroSaiu);
    const ganhou = numerosUnicosApostados.includes(numeroSaiuInt);
    
    console.log(`🔍 [CONFERÊNCIA] Número que saiu: ${numeroSaiuInt}`);
    console.log(`🔍 [CONFERÊNCIA] Itens na aposta ativa: ${JSON.stringify(aposta.numeros)}`);
    console.log(`🔍 [CONFERÊNCIA] Números cobertos: ${numerosUnicosApostados.join(', ')}`);
    console.log(`🔍 [CONFERÊNCIA] Resultado: ${ganhou ? 'WIN ✅' : 'LOSS ❌'}`);

    // Notificar página para feedback visual
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const msg = ganhou ? `✅ GANHOU NO ${numeroSaiuInt}` : `❌ PERDEU NO ${numeroSaiuInt}`;
            chrome.tabs.sendMessage(tabs[0].id, {
                tipo: 'debug_alerta',
                mensagem: msg
            }).catch(() => {});
        }
    });

    if (ganhou) {
        // --- LOGICA DE GANHO ---
        const placarW = modoSimulacaoAtivo ? placarSimulacao.wins : botState.wins + 1;
        const placarL = modoSimulacaoAtivo ? placarSimulacao.losses : botState.losses;
        const tipoFinal = aposta.galeIndex > 0 ? (aposta.gatilho?.tipo === 'CICLO' || aposta.gatilho?.estrategia === 'CICLO' ? `Ciclo ${aposta.galeIndex}` : `GALE ${aposta.galeIndex}`) : 'Entrada';

        // Enviar para o Telegram com delay de 2s para o saldo atualizar
        setTimeout(() => {
            const saldoF = (botState.ultimoSaldoPush || 0).toFixed(2).replace('.', ',');
            const msgTelegram = `✅ <b>FORTUNA X — GREEN (${tipoFinal})</b>\n` +
                                `📋 Estratégia: ${botState.nomeEstrategiaSelecionada || 'Manual'}\n` +
                                `🎲 Número que caiu: ${numeroSaiuInt}\n` +
                                `📊 Placar: ✅ ${placarW} x ❌ ${placarL}\n` +
                                `💰 Saldo: R$ ${saldoF}\n\n` +
                                `💰 <b>Saldo Atual: R$ ${saldoF}</b>`;
            sendTelegramMessageBG(msgTelegram);
        }, 2000);

        if (modoSimulacaoAtivo) {
            placarSimulacao.wins++;
            let ganhoTotalSimulado = 0;
            // Calcular o ganho baseado nos itens apostados
            aposta.numeros.forEach(item => {
                let payoutRatio = 36; 
                const u = String(item).toUpperCase();
                if (u === 'D1' || u === 'D2' || u === 'D3' || u === 'C1' || u === 'C2' || u === 'C3') {
                    payoutRatio = 3;
                } else if (u === 'VERMELHO' || u === 'PRETO' || u === 'PAR' || u === 'IMPAR' || u === 'BAIXO' || u === 'ALTO') {
                    payoutRatio = 2;
                }
                const numerosDesteItem = expandirItemParaNumeros(item);
                if (numerosDesteItem.includes(numeroSaiuInt)) {
                    ganhoTotalSimulado += valorFichaSimulacao * aposta.multiplicador * payoutRatio;
                }
            });
            saldoSimulacao += ganhoTotalSimulado;
            chrome.storage.local.set({ placarSimulacao, saldoSimulacao });
            
            // Sincronizar mini painel
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, { tipo: 'atualizar_simulacao', saldo: saldoSimulacao, placar: placarSimulacao }).catch(() => {});
                });
            });
        } else {
            botState.wins++;
        }
        
        verificarStopGestao();
        
        // Cooldown pós-green
        const configEspecial = aposta?.gatilho?.configEspecial;
        const esperarAposGreen = configEspecial?.esperarRodadasAposGreen || configEspecial?.esperarRodadas || 0;
        if (esperarAposGreen > 0) {
            botCountdownState.rodadasRestantes = esperarAposGreen;
        } else {
            botCountdownState.rodadasRestantes = null;
        }

        // Registrar HISTÓRICO (WIN)
        if (aposta.apostaId) {
            const apostaIdAtual = aposta.apostaId;
            setTimeout(() => {
                chrome.storage.local.get(['apostaAtiva'], (storageResult) => {
                    const apostaHistorico = aposta; 
                    if (!apostaHistorico) return;
                    const nomeEstrategia = apostaHistorico.nomeEstrategia;
                    const historicoGales = apostaHistorico.historicoGales || [];

                    const processarWin = (numeroFinal) => {
                        chrome.storage.local.get(['rouletteState', 'historicoApostas'], (result) => {
                            const valorFicha = modoSimulacaoAtivo ? valorFichaSimulacao : (result.rouletteState?.valorFicha || 1.00);
                            const historicoApostas = result.historicoApostas || [];
                            
                            const isTipoCiclo = apostaHistorico.gatilho?.tipo === 'CICLO' || apostaHistorico.gatilho?.tipo === 'ciclo' || apostaHistorico.gatilho?.estrategia === 'CICLO';
                            const tipoProg = (apostaHistorico.galeIndex > 0) ? (isTipoCiclo ? 'CICLO' : 'GALE') : 'ENTRADA';
                            
                            const novaAposta = {
                                id: apostaIdAtual,
                                timestamp: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                                gatilho: botState.nomeEstrategiaSelecionada || apostaHistorico.gatilho?.nome || nomeEstrategia,
                                numeroSaiu: numeroFinal,
                                resultado: 'WIN',
                                gale: apostaHistorico.galeIndex || 0,
                                tipoProgressao: tipoProg,
                                modo: modoSimulacaoAtivo ? 'SIMULAÇÃO' : 'REAL',
                                saldo: modoSimulacaoAtivo ? saldoSimulacao : (botState.ultimoSaldoPush || result.rouletteState?.ultimoSaldoPush || 0)
                            };
                            historicoApostas.unshift(novaAposta);
                            if (historicoApostas.length > 100) historicoApostas.splice(100);
                            chrome.storage.local.set({ historicoApostas }, () => {
                                chrome.runtime.sendMessage({ tipo: 'atualizar_historico_apostas' }).catch(() => {});
                            });
                        });
                    };

                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, { tipo: 'obter_ultimo_numero' }, (response) => {
                                if (chrome.runtime.lastError) {} 
                                processarWin(response?.numero || numeroSaiuInt);
                            });
                        } else {
                            processarWin(numeroSaiuInt);
                        }
                    });
                });
            }, 3000);
        }

        botState.apostaAtiva = null;
        botState.aguardandoProximaRodada = true;
        if (botState.gatilhos) {
            botState.gatilhos.forEach(g => {
                if (aposta && aposta.gatilho && g.nome === aposta.gatilho.nome) g.cicloAtual = 0;
            });
        }
        chrome.storage.local.set({ botCountdownState, apostaAtiva: null });

    } else {
        // --- LOGICA DE PERDA ---
        const gatilho = aposta.gatilho;
        const proximoGaleIndex = (aposta.galeIndex || 0) + 1;
        
        // Verificar se foi explicitamente configurado como SIMPLES (sem gale/ciclo)
        const isSimplesExplicito = gatilho.estrategia === 'SIMPLES' || 
                                   gatilho.tipo === 'SIMPLES' ||
                                   (gatilho.multiplicadores && gatilho.multiplicadores.length === 1 && gatilho.multiplicadores[0] === 1);
        
        console.log(`[LOSS-DEBUG] Perda detectada. isSimplesExplicito: ${isSimplesExplicito}, tipo: ${gatilho.tipo}, estrategia: ${gatilho.estrategia}, multiplicadores:`, gatilho.multiplicadores);
        
        // Se for SIMPLES explícito, não entra em gale/ciclo
        if (isSimplesExplicito) {
            console.log(`[LOSS-DEBUG] Modo SIMPLES detectado - não entrará em gale/ciclo`);
            // RED FINAL - pula direto para o final
            const placarW = modoSimulacaoAtivo ? placarSimulacao.wins : botState.wins;
            const placarL = modoSimulacaoAtivo ? placarSimulacao.losses : botState.losses + 1;
            const tipoFinal = 'Entrada';
            
            // Enviar para o Telegram com delay de 2s para o saldo atualizar
            setTimeout(() => {
                const saldoAtual = modoSimulacaoAtivo ? placarSimulacao.saldo : (botState.saldo || 0);
                enviarMensagemTelegram(`❌ RED - ${tipoFinal}\n💰 Saldo: R$ ${saldoAtual.toFixed(2)}\n📊 Placar: ${placarW}W / ${placarL}L`);
            }, 2000);
            
            // Registrar no histórico
            setTimeout(() => {
                chrome.storage.local.get(['historicoApostas'], (result) => {
                    const historicoApostas = result.historicoApostas || [];
                    const apostaHistorico = historicoApostas.find(a => a.apostaId === aposta.apostaId);
                    
                    if (apostaHistorico) {
                        const numeroFinal = numeroSaiu;
                        const saldoAtual = modoSimulacaoAtivo ? placarSimulacao.saldo : (botState.saldo || 0);
                        
                        const novaAposta = {
                            estrategia: apostaHistorico.estrategia,
                            numeros: apostaHistorico.numeros,
                            fichas: apostaHistorico.fichas,
                            numeroSaiu: numeroFinal,
                            resultado: 'LOSS',
                            gale: apostaHistorico.galeIndex || 0,
                            tipoProgressao: 'ENTRADA',
                            modo: modoSimulacaoAtivo ? 'SIMULAÇÃO' : 'REAL',
                            saldo: saldoAtual,
                            timestamp: Date.now()
                        };
                        
                        chrome.storage.local.get(['historicoCompleto'], (res2) => {
                            const historicoCompleto = res2.historicoCompleto || [];
                            historicoCompleto.push(novaAposta);
                            chrome.storage.local.set({ historicoCompleto });
                        });
                    }
                });
            }, 1500);
            
            // Limpar aposta ativa
            botState.apostaAtiva = null;
            botState.aguardandoProximaRodada = true;
            chrome.storage.local.set({ apostaAtiva: null });
            
            if (modoSimulacaoAtivo) {
                placarSimulacao.losses++;
                chrome.storage.local.set({ placarSimulacao });
            } else {
                botState.losses++;
                chrome.storage.local.set({ rouletteState: botState });
            }
            
            return; // Sai da função aqui
        }
        
        let multiplicadores = gatilho.multiplicadores || gatilho.gales || gatilho.ciclos || (gatilho.tipo === 'GALE' || gatilho.estrategia === 'GALE' ? [1, 3] : null);
        
        // Reforço para dinâmicos etc
        const tags = Array.isArray(gatilho.apostaEm) ? gatilho.apostaEm : [];
        // Removido fallback hardcoded para FUNCIONARIO_MES - agora respeita configuração do usuário
        if (tags.some(t => ['QUENTES', 'FRIOS', 'AMBOS'].includes(t)) && (!multiplicadores || multiplicadores.length === 0)) {
            multiplicadores = [1, 3];
        }

        if (multiplicadores && proximoGaleIndex < multiplicadores.length) {
            // AINDA TEM GALE/CICLO DISPONÍVEL
            console.log(`⚠️ [BACKGROUND] Perdeu no Gale/Ciclo ${aposta.galeIndex}. Próximo: ${proximoGaleIndex}...`);
            const isCiclo = gatilho.tipo === 'CICLO' || (gatilho.ciclos && gatilho.ciclos.length > 0) || gatilho.estrategia === 'CICLO';

            if (isCiclo && !(tags.includes('FUNCIONARIO_MES') || tags.includes('DYNAMIC_FUNCIONARIO'))) {
                // Modo CICLO puro: aguarda gatilho de novo
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { tipo: 'debug_alerta', mensagem: `⏳ Ciclo ${proximoGaleIndex} armando... Aguardando de novo` }).catch(() => {});
                });
                if (botState.gatilhos) {
                    botState.gatilhos.forEach(g => { if (g.nome === aposta.gatilho.nome) g.cicloAtual = proximoGaleIndex; });
                    chrome.storage.local.set({ rouletteState: botState });
                }
                setTimeout(() => {
                    botState.apostaAtiva = null;
                    botState.aguardandoProximaRodada = true;
                    chrome.storage.local.set({ apostaAtiva: null });
                }, 1000);
            } else {
                // Modo GALE ou Funcionario (Ciclo direto): aposta agora
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { tipo: 'debug_alerta', mensagem: `⚠️ Perdeu Gale ${aposta.galeIndex}. Indo para Gale ${proximoGaleIndex}` }).catch(() => {});
                });
                setTimeout(() => { enviarApostaParaMesa(gatilho, numeroSaiu, proximoGaleIndex); }, 500);
            }
        } else {
            // RED FINAL
            const placarW = modoSimulacaoAtivo ? placarSimulacao.wins : botState.wins;
            const placarL = modoSimulacaoAtivo ? placarSimulacao.losses : botState.losses + 1;

            setTimeout(() => {
                const saldoF = (botState.ultimoSaldoPush || 0).toFixed(2).replace('.', ',');
                const msgTelegram = `❌ <b>FORTUNA X — RED FINAL</b>\n` +
                                    `📋 Estratégia: ${botState.nomeEstrategiaSelecionada || 'Manual'}\n` +
                                    `🎲 Número que caiu: ${numeroSaiuInt}\n` +
                                    `📊 Placar: ✅ ${placarW} x ❌ ${placarL}\n` +
                                    `💰 Saldo: R$ ${saldoF}\n\n` +
                                    `💰 <b>Saldo Atual: R$ ${saldoF}</b>`;
                sendTelegramMessageBG(msgTelegram);
            }, 2000);

            if (modoSimulacaoAtivo) {
                placarSimulacao.losses++;
                chrome.storage.local.set({ placarSimulacao });
                chrome.tabs.query({}, (tabs) => {
                    tabs.forEach(tab => {
                        chrome.tabs.sendMessage(tab.id, { tipo: 'atualizar_simulacao', saldo: saldoSimulacao, placar: placarSimulacao }).catch(() => {});
                    });
                });
            } else {
                botState.losses++;
            }
            
            verificarStopGestao();
            
            // Registrar HISTÓRICO (LOSS)
            if (aposta.apostaId) {
                const apostaIdAtual = aposta.apostaId;
                setTimeout(() => {
                    chrome.storage.local.get(['apostaAtiva'], (storageResult) => {
                        const apostaHistorico = aposta; 
                        if (!apostaHistorico) return;
                        const nomeEstrategia = apostaHistorico.nomeEstrategia;
                        const historicoGales = apostaHistorico.historicoGales || [];

                        const processarLoss = (numeroFinal) => {
                            chrome.storage.local.get(['rouletteState', 'historicoApostas'], (result) => {
                                const valorFicha = modoSimulacaoAtivo ? valorFichaSimulacao : (result.rouletteState?.valorFicha || 1.00);
                                const historicoApostas = result.historicoApostas || [];
                                
                                const isTipoCiclo = apostaHistorico.gatilho?.tipo === 'CICLO' || apostaHistorico.gatilho?.tipo === 'ciclo' || apostaHistorico.gatilho?.estrategia === 'CICLO';
                                const tipoProg = (apostaHistorico.galeIndex > 0) ? (isTipoCiclo ? 'CICLO' : 'GALE') : 'ENTRADA';
                                
                                const novaAposta = {
                                    id: apostaIdAtual,
                                    timestamp: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                                    gatilho: botState.nomeEstrategiaSelecionada || apostaHistorico.gatilho?.nome || nomeEstrategia,
                                    numeroSaiu: numeroFinal,
                                    resultado: 'LOSS',
                                    gale: apostaHistorico.galeIndex || 0,
                                    tipoProgressao: tipoProg,
                                    modo: modoSimulacaoAtivo ? 'SIMULAÇÃO' : 'REAL',
                                    saldo: modoSimulacaoAtivo ? saldoSimulacao : (botState.ultimoSaldoPush || result.rouletteState?.ultimoSaldoPush || 0)
                                };
                                historicoApostas.unshift(novaAposta);
                                if (historicoApostas.length > 100) historicoApostas.splice(100);
                                chrome.storage.local.set({ historicoApostas }, () => {
                                    chrome.runtime.sendMessage({ tipo: 'atualizar_historico_apostas' }).catch(() => {});
                                });
                            });
                        };

                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs[0]) {
                                chrome.tabs.sendMessage(tabs[0].id, { tipo: 'obter_ultimo_numero' }, (response) => {
                                    if (chrome.runtime.lastError) {} 
                                    processarLoss(response?.numero || numeroSaiuInt);
                                });
                            } else {
                                processarLoss(numeroSaiuInt);
                            }
                        });
                    });
                }, 3000);
            }

            // Cooldown pós-loss
            const configEspecial = aposta?.gatilho?.configEspecial;
            const esperarPadrao = configEspecial?.esperarRodadas || 0;
            if (esperarPadrao > 0) {
                botCountdownState.rodadasRestantes = esperarPadrao;
            } else {
                botCountdownState.rodadasRestantes = null;
            }

            botState.apostaAtiva = null;
            botState.aguardandoProximaRodada = true;
            chrome.storage.local.set({ botCountdownState, apostaAtiva: null });
        }
    }
    
    chrome.storage.local.set({ 
        rouletteState: botState,
        apostaAtiva: botState.apostaAtiva
    });
}

// HANDLER DE MENSAGENS
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('📨 [BACKGROUND] Mensagem recebida:', request.tipo);

    // Envolver todo o processamento em um async para esperar o carregamento do estado
    const handleMessage = async () => {
        if (!stateLoaded) {
            console.log('⏳ [BACKGROUND] Aguardando carregamento do estado antes de processar:', request.tipo);
            await stateLoadedPromise;
        }

        if (request.tipo === 'config_simulacao_alterada') {
            modoSimulacaoAtivo = request.ativo;
            saldoSimulacao = request.saldo;
            valorFichaSimulacao = request.ficha;
            console.log('🛠️ [BACKGROUND] Configuração de Simulação Atualizada:', { modoSimulacaoAtivo, saldoSimulacao, valorFichaSimulacao });
            sendResponse({ sucesso: true });
            return;
        }

        if (request.tipo === 'novoNumero' || request.tipo === 'novo_numero_roleta') {
            const numero = request.numero;
            const agora = Date.now();
            
            // Se for o mesmo número do anterior, só ignorar se foi recebido há menos de 5 segundos
            // (Isso evita duplicidade de mensagens mas permite repetição legítima da roleta)
            if (botState.historicoRodadas.length > 0 && 
                botState.historicoRodadas[0] === numero && 
                botState.ultimoUpdateTimestamp && (agora - botState.ultimoUpdateTimestamp < 5000)) {
                console.log('⚠️ [BACKGROUND] Número ignorado (provável duplicata):', numero);
                sendResponse({ sucesso: true });
                return;
            }

            botState.ultimoUpdateTimestamp = agora;
            
            // Incrementar contador de sessão da IA
            if (!botState.iaRodadasSessao) botState.iaRodadasSessao = 0;
            botState.iaRodadasSessao++;

            botState.historicoRodadas.unshift(numero);
            if (botState.historicoRodadas.length > 1000) botState.historicoRodadas.pop();
            
            // Atualizar sequência para conferência de gatilhos do Admin
            botState.sequenciaAtual = botState.historicoRodadas.slice(0, TAMANHO_SEQUENCIA_MAX);
            
            chrome.storage.local.set({ 
                historicoRodadas: botState.historicoRodadas,
                rouletteState: botState 
            }, () => {
                // Primeiro verificar o resultado da aposta anterior
                verificarResultado(numero);
                
                // AGORA resetar a trava apenas se o bot NÃO estiver em STOP
                if (!botState.stopAtivado) {
                    botState.aguardandoProximaRodada = false; 
                }
                
                verificarGatilhosParaApostar(numero);
                
                // Notificar TODOS os componentes do novo número (Sidepanel E Mini-Painel na mesa)
            chrome.runtime.sendMessage({ tipo: 'atualizarHistorico', numero }).catch(() => {
                // Silenciar erro se o sidepanel estiver fechado
            });
            
            chrome.tabs.query({ url: ["*://*.bet365.com/*", "*://*.bet365.bet.br/*", "*://*.bet365.com.br/*", "*://*.bet365.net.br/*", "*://*.onegameslink.com/*", "*://*.twogameslink.com/*", "*://*.gambling-malta.com/*", "*://*.c365play.com/*", "*://*.bfcdl.com/*"] }, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'atualizarStatusPainel',
                        ativo: !botState.stopAtivado,
                        estrategia: botState.nomeEstrategiaSelecionada || 'Manual',
                        placar: { wins: botState.wins, losses: botState.losses },
                        stopWin: botState.stopWin || 0,
                        stopLoss: botState.stopLoss || 0
                    }).catch(() => {
                        // Silenciar erro se a aba não estiver pronta para receber
                    });
                });
            });
            enviarDadosQuentesFriosParaMesa();
            });
            sendResponse({ sucesso: true });
            return;
        }
        
        else if (request.tipo === 'historico_500' || request.tipo === 'historico_12') {
            console.log(`📊 [BACKGROUND] Recebendo histórico (${request.numeros.length} números)`);
            const numeros = request.numeros;
            
            if (request.limpar || request.tipo === 'historico_500') {
                botState.historicoRodadas = numeros;
            } else {
                // Adicionar apenas os que não temos (simplificado)
                const novos = numeros.filter(n => !botState.historicoRodadas.includes(n));
                botState.historicoRodadas = [...novos, ...botState.historicoRodadas].slice(0, 1000);
            }

            // Atualizar sequenciaAtual com os mais recentes para não quebrar estratégias de sequência
            botState.sequenciaAtual = botState.historicoRodadas.slice(0, TAMANHO_SEQUENCIA_MAX);
            
            chrome.storage.local.set({ 
                historicoRodadas: botState.historicoRodadas,
                rouletteState: botState 
            });
            
            // Notificar Sidepanel para atualizar UI
            chrome.runtime.sendMessage({ tipo: 'historico_carregado', total: botState.historicoRodadas.length }).catch(() => {});
            sendResponse({ sucesso: true });
            return;
        }
        
        else if (request.tipo === 'nome_mesa') {
            const mesaAnterior = botState.nomeMesa;
            botState.nomeMesa = request.nome;
            
            // --- TRAVA DE SEGURANÇA AO ENTRAR NA MESA ---
            // Se a mesa mudou OU se é a primeira vez que recebemos o nome (abriu o bot agora)
            if (!mesaAnterior || mesaAnterior !== request.nome) {
                console.log(`🔄 [BACKGROUND] Nova mesa detectada ou Bot iniciado: ${request.nome}. Aplicando trava de segurança.`);
                
                // 1. Limpar aposta ativa para evitar disparos involuntários do cache
                botState.apostaAtiva = null;
                botState.aguardandoProximaRodada = true;
                
                // 2. Forçar aguardar 3 rodadas para estabilizar a leitura, independente da estratégia
                botCountdownState.rodadasRestantes = 3; 
                
                chrome.storage.local.set({ 
                    apostaAtiva: null,
                    botCountdownState: botCountdownState,
                    // Limpar também o comando de aposta do cache do content script
                    numerosParaApostar: null,
                    timestamp: 0 
                });

                chrome.runtime.sendMessage({
                    tipo: 'status_ia_atualizar',
                    texto: `🛡️ Segurança: Aguardando 3 rodadas iniciais...`
                }).catch(() => {});
            }
            
            chrome.storage.local.set({ rouletteState: botState });
            enviarDadosQuentesFriosParaMesa();
            sendResponse({ sucesso: true });
            return;
        }
        
        else if (request.tipo === 'atualizar_saldo') {
            botState.ultimoSaldoPush = request.saldo;
            
            // Se a gestão estiver ativa e ainda não tivermos saldo inicial, capturar agora
            if (botState.stopWin > 0 || botState.stopLoss > 0) {
                if (botState.saldoInicial === 0) {
                    botState.saldoInicial = request.saldo;
                    console.log('💰 [BACKGROUND] Saldo inicial capturado via push:', botState.saldoInicial);
                }
            }
            
            chrome.storage.local.set({ rouletteState: botState });
            sendResponse({ sucesso: true });
            return;
        }

        else if (request.tipo === 'atualizar_paineis_quentes_frios') {
            console.log('🔄 [BACKGROUND] Comando manual para atualizar painéis Quentes/Frios');
            enviarDadosQuentesFriosParaMesa();
            sendResponse({ sucesso: true });
            return;
        }
        
        else if (request.tipo === 'reset_placar') {
            botState.wins = 0;
            botState.losses = 0;
            botState.iaRodadasSessao = 0;
            botState.saldoInicial = 0;
            
            // Resetar também o placar de simulação
            placarSimulacao = { wins: 0, losses: 0 };
            saldoSimulacao = 1000.00; // Resetar saldo simulado também
            
            chrome.storage.local.set({ 
                rouletteState: botState,
                placarSimulacao: placarSimulacao,
                saldoSimulacao: saldoSimulacao
            });

            // Notificar TODOS os componentes do reset
            chrome.runtime.sendMessage({
                tipo: 'atualizar_simulacao',
                saldo: saldoSimulacao,
                placar: placarSimulacao
            }).catch(() => {});

            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        action: 'atualizarStatusPainel',
                        ativo: !botState.stopAtivado,
                        estrategia: botState.nomeEstrategiaSelecionada || 'Manual',
                        placar: { wins: 0, losses: 0 },
                        stopWin: botState.stopWin || 0,
                        stopLoss: botState.stopLoss || 0
                    }).catch(() => {});
                    
                    // Também avisar o reset da simulação para as abas
                    chrome.tabs.sendMessage(tab.id, {
                        tipo: 'atualizar_simulacao',
                        saldo: saldoSimulacao,
                        placar: placarSimulacao
                    }).catch(() => {});
                });
            });

            sendResponse({ sucesso: true });
            return;
        }
    };

    handleMessage();
    return true; // Manter o canal aberto para respostas assíncronas
});

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});


// ===== CONEXÃO COM SERVIDOR LOCAL (WebSocket) =====
let wsServidor = null;
let emailUsuarioLogado = null;
let tentativasReconexao = 0;
const MAX_TENTATIVAS = 999; // Tentar reconectar indefinidamente

function conectarServidorLocal() {
    const WS_URL = 'wss://fortuna-x-web.onrender.com';
    
    console.log('🔌 [WS-SERVIDOR] Função conectarServidorLocal() chamada');
    
    // Buscar email do usuário logado
    chrome.storage.local.get(['supabase_user'], (result) => {
        console.log('🔍 [WS-SERVIDOR] Verificando usuário logado...', result);
        
        if (!result.supabase_user) {
            console.log('⚠️ [WS-SERVIDOR] Usuário não logado, aguardando...');
            setTimeout(conectarServidorLocal, 5000);
            return;
        }
        
        const user = JSON.parse(result.supabase_user);
        emailUsuarioLogado = user.email;
        
        console.log(`🔌 [WS-SERVIDOR] Conectando ao servidor para ${emailUsuarioLogado}...`);
        
        try {
            wsServidor = new WebSocket(WS_URL);
            
            wsServidor.onopen = () => {
                console.log('✅ [WS-SERVIDOR] Conectado ao servidor!');
                tentativasReconexao = 0;
                
                // Identificar-se com o servidor
                wsServidor.send(JSON.stringify({
                    tipo: 'identificar',
                    email: emailUsuarioLogado
                }));
                console.log('📤 [WS-SERVIDOR] Mensagem de identificação enviada');
            };
            
            wsServidor.onmessage = async (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    console.log('📨 [WS-SERVIDOR] Mensagem recebida:', msg.tipo);
                    
                    if (msg.tipo === 'config') {
                        // Recebeu configuração do servidor
                        console.log('⚙️ [WS-SERVIDOR] Config recebida:', msg);
                        
                        // Salvar config no storage
                        botState.estrategiaId = msg.estrategia_id;
                        botState.estrategiaSelecionada = msg.estrategia_nome;
                        botState.nomeEstrategiaSelecionada = msg.estrategia_nome;
                        botState.gatilhos = msg.gatilhos || [];
                        botState.legendas = msg.legendas || [];
                        botState.stopWin = msg.stop_win || 0;
                        botState.stopLoss = msg.stop_loss || 0;
                        botState.valorFicha = msg.valor_ficha || 1;
                        botState.gales = msg.gales || 0;
                        botState.fichaG1 = msg.ficha_g1 || 0;
                        botState.fichaG2 = msg.ficha_g2 || 0;
                        botState.qtdHot = msg.qtd_hot || 5;
                        botState.qtdCold = msg.qtd_cold || 5;
                        botState.vizinhos = msg.vizinhos || 0;
                        botState.qtdAnalise = msg.qtd_analise || 100;
                        
                        // Atualizar configurações específicas de Quentes e Frios
                        if (!botState.configQuentesFrios) {
                            botState.configQuentesFrios = {};
                        }
                        botState.configQuentesFrios.qtdQuentes = msg.qtd_hot || 5;
                        botState.configQuentesFrios.qtdFrios = msg.qtd_cold || 5;
                        botState.configQuentesFrios.qtdVizinhos = msg.vizinhos || 0;
                        botState.configQuentesFrios.tipo = msg.tipo_progressao || 'simples';
                        
                        // Configurar multiplicadores se houver
                        if (msg.gales_multiplicadores && msg.gales_multiplicadores.length > 0) {
                            botState.configQuentesFrios.multiplicadores = msg.gales_multiplicadores;
                        } else if (msg.ciclo_multiplicadores && msg.ciclo_multiplicadores.length > 0) {
                            botState.configQuentesFrios.multiplicadores = msg.ciclo_multiplicadores;
                        }
                        
                        // Configurações específicas do Funcionário do Mês
                        if (!botState.configFuncionarioMes) {
                            botState.configFuncionarioMes = {};
                        }
                        botState.configFuncionarioMes.numerosFixos = msg.numeros_fixos_fm || '';
                        botState.configFuncionarioMes.tipo = msg.tipo_progressao_fm || 'simples';
                        
                        if (msg.gales_multiplicadores_fm && msg.gales_multiplicadores_fm.length > 0) {
                            botState.configFuncionarioMes.multiplicadores = msg.gales_multiplicadores_fm;
                        } else if (msg.ciclo_multiplicadores_fm && msg.ciclo_multiplicadores_fm.length > 0) {
                            botState.configFuncionarioMes.multiplicadores = msg.ciclo_multiplicadores_fm;
                        }
                        
                        chrome.storage.local.set({ rouletteState: botState });
                        
                        console.log('✅ [WS-SERVIDOR] Config aplicada ao botState:', {
                            qtdHot: botState.qtdHot,
                            qtdCold: botState.qtdCold,
                            vizinhos: botState.vizinhos,
                            configQuentesFrios: botState.configQuentesFrios,
                            configFuncionarioMes: botState.configFuncionarioMes
                        });
                        
                        // Notificar sidepanel
                        chrome.runtime.sendMessage({
                            tipo: 'config_atualizada',
                            config: msg
                        }).catch(() => {});
                    }
                    
                    else if (msg.tipo === 'comando') {
                        console.log('🎮 [WS-SERVIDOR] Comando recebido:', msg.acao);
                        
                        if (msg.acao === 'ligar') {
                            await iniciarBotRemoto();
                        }
                        else if (msg.acao === 'desligar') {
                            await pararBotRemoto();
                        }
                        else if (msg.acao === 'refresh') {
                            await refreshPaginaMesa();
                        }
                        else if (msg.acao === 'reset_stats') {
                            // Resetar stats
                            botState.wins = 0;
                            botState.losses = 0;
                            botState.saldoInicial = 0;
                            chrome.storage.local.set({ rouletteState: botState });
                        }
                    }
                    
                    else if (msg.tipo === 'comando_simulacao') {
                        console.log('🧪 [WS-SERVIDOR] Comando simulação recebido:', msg.modoSimulacao);
                        
                        // Atualizar modo simulação
                        chrome.storage.local.set({ 
                            modoSimulacaoAtivo: msg.modoSimulacao 
                        });
                        
                        // Notificar sidepanel
                        chrome.runtime.sendMessage({
                            tipo: 'simulacao_alterada',
                            modoSimulacao: msg.modoSimulacao
                        }).catch(() => {});
                        
                        console.log('✅ [WS-SERVIDOR] Modo simulação atualizado:', msg.modoSimulacao ? 'Ativo' : 'Desativo');
                    }
                    
                } catch (e) {
                    console.error('❌ [WS-SERVIDOR] Erro ao processar mensagem:', e);
                }
            };
            
            wsServidor.onerror = (error) => {
                console.error('❌ [WS-SERVIDOR] Erro na conexão:', error);
                console.error('❌ [WS-SERVIDOR] URL tentada:', WS_URL);
                console.error('❌ [WS-SERVIDOR] ReadyState:', wsServidor?.readyState);
            };
            
            wsServidor.onclose = () => {
                console.log('🔌 [WS-SERVIDOR] Desconectado do servidor');
                wsServidor = null;
                
                // Tentar reconectar
                if (tentativasReconexao < MAX_TENTATIVAS) {
                    tentativasReconexao++;
                    const delay = Math.min(1000 * Math.pow(2, tentativasReconexao), 30000);
                    console.log(`🔄 [WS-SERVIDOR] Reconectando em ${delay/1000}s... (tentativa ${tentativasReconexao}/${MAX_TENTATIVAS})`);
                    setTimeout(conectarServidorLocal, delay);
                }
            };
            
        } catch (e) {
            console.error('❌ [WS-SERVIDOR] Erro ao criar WebSocket:', e);
            setTimeout(conectarServidorLocal, 5000);
        }
    });
}

// Função para iniciar o bot remotamente
async function iniciarBotRemoto() {
    console.log('🚀 [WS-SERVIDOR] Iniciando bot remotamente...');
    
    // Garantir que o sidepanel esteja aberto (necessário para algumas funções)
    try {
        const windows = await chrome.windows.getAll({ windowTypes: ['normal'] });
        for (const window of windows) {
            await chrome.sidePanel.open({ windowId: window.id }).catch(() => {});
        }
    } catch (e) {
        console.log('⚠️ [WS-SERVIDOR] Erro ao abrir sidepanel:', e.message);
    }
    
    // Atualizar status no servidor
    if (wsServidor && wsServidor.readyState === WebSocket.OPEN) {
        wsServidor.send(JSON.stringify({
            tipo: 'status_bot',
            email: emailUsuarioLogado,
            status: 'inicializando'
        }));
    }
    
    // Buscar credenciais da casa de aposta do servidor
    try {
        const response = await fetch(`https://fortuna-x-web.onrender.com/api/user-metadata/${encodeURIComponent(emailUsuarioLogado)}`);
        const userData = await response.json();
        
        const casaEmail = userData.casa_email;
        const casaSenha = userData.casa_senha;
        
        if (!casaEmail || !casaSenha) {
            console.error('❌ [WS-SERVIDOR] Credenciais da casa não configuradas');
            return;
        }
        
        // Salvar credenciais no storage para o listener usar
        chrome.storage.local.set({ 
            casaEmail,
            casaSenha,
            botAtivo: true,
            loginEmCurso: true,
            logoutPendente: false
        });
        
        console.log('🌐 [WS-SERVIDOR] Abrindo página de login...');
        
        // Verificar se já existe aba da big.bet.br
        chrome.tabs.query({ url: 'https://big.bet.br/*' }, (tabs) => {
            if (tabs.length > 0) {
                // Focar e redirecionar aba existente
                chrome.tabs.update(tabs[0].id, { active: true, url: URL_LOGIN_CASA });
            } else {
                // Criar nova aba
                chrome.tabs.create({ url: URL_LOGIN_CASA });
            }
        });
        
    } catch (e) {
        console.error('❌ [WS-SERVIDOR] Erro ao buscar credenciais:', e);
    }
}

// Função para parar o bot remotamente
async function pararBotRemoto() {
    console.log('🛑 [WS-SERVIDOR] Parando bot remotamente...');
    
    // Atualizar status no servidor
    if (wsServidor && wsServidor.readyState === WebSocket.OPEN) {
        wsServidor.send(JSON.stringify({
            tipo: 'status_bot',
            email: emailUsuarioLogado,
            status: 'desligando'
        }));
    }
    
    // Parar todas as apostas ativas
    botState.stopAtivado = true;
    botState.apostaAtiva = null;
    botState.aguardandoProximaRodada = false;
    
    // Marcar que o logout está pendente
    chrome.storage.local.set({ 
        botAtivo: false,
        logoutPendente: true,
        loginEmCurso: false,
        rouletteState: botState
    });
    
    console.log('🌐 [WS-SERVIDOR] Enviando comando de logout para todas as abas...');
    
    // Enviar comando de logout para todas as abas da casa de aposta
    chrome.tabs.query({}, (tabs) => {
        const abasCasa = tabs.filter(tab => {
            const url = tab.url || "";
            return [
                'bet365.com', 'bet365.bet.br', 'bet365.com.br', 'bet365.net.br',
                'big.bet.br', 'onegameslink.com', 'twogameslink.com', 
                'gambling-malta.com', 'c365play.com', 'bfcdl.com'
            ].some(dom => url.includes(dom));
        });
        
        if (abasCasa.length > 0) {
            // Enviar comando de logout para a primeira aba
            chrome.tabs.sendMessage(abasCasa[0].id, {
                action: 'logout_remoto'
            }).catch(() => {
                // Se falhar, redirecionar diretamente
                chrome.tabs.update(abasCasa[0].id, { 
                    url: 'https://www.reidosbots.net.br',
                    active: true 
                });
            });
            
            // Fechar outras abas da casa se houver
            abasCasa.slice(1).forEach(tab => {
                chrome.tabs.remove(tab.id);
            });
        }
    });
    
    // Atualizar status final
    setTimeout(() => {
        if (wsServidor && wsServidor.readyState === WebSocket.OPEN) {
            wsServidor.send(JSON.stringify({
                tipo: 'status_bot',
                email: emailUsuarioLogado,
                status: 'deslogado'
            }));
        }
        console.log('✅ [WS-SERVIDOR] Bot parado e logout realizado!');
    }, 3000);
}

// Função injetada na página de login para preencher os campos
function preencherLogin(email, senha) {
    function aguardarElemento(seletor, callback, tentativa = 0) {
        const el = document.querySelector(seletor);
        if (el) {
            callback(el);
        } else if (tentativa < 20) {
            setTimeout(() => aguardarElemento(seletor, callback, tentativa + 1), 500);
        }
    }

    function dispararEventos(el) {
        el.dispatchEvent(new Event('input',  { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur',   { bubbles: true }));
    }

    // PASSO 1 — aguardar campo de email e preencher
    aguardarElemento('#EMAIL', (emailInput) => {
        emailInput.focus();
        emailInput.value = email;
        dispararEventos(emailInput);

        // PASSO 2 — 2s depois, preencher senha
        setTimeout(() => {
            aguardarElemento('#PASSWORD', (senhaInput) => {
                senhaInput.focus();
                senhaInput.value = senha;
                dispararEventos(senhaInput);

                // PASSO 3 — 2s depois, clicar no botão "Entrar"
                setTimeout(() => {
                    const btn = document.querySelector('#signIn') || 
                                document.querySelector('button[type="submit"]') ||
                                Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Entrar'));
                    
                    if (btn) {
                        btn.click();
                        console.log('✅ Botão entrar clicado');
                    } else {
                        console.log('⚠️ Botão entrar não encontrado');
                    }
                }, 2000);
            });
        }, 2000);
    });
}

// Função injetada na página principal para fazer logout
async function executarLogout() {
    console.log('🚪 Iniciando sequência de logout assistido...');

    try {
        // Passo 1: Abrir dropdown do perfil
        const btnPerfil = document.querySelector('.dropdown-button.active') || 
                          document.querySelector('.dropdown-button');
        
        if (btnPerfil) {
            btnPerfil.click();
            console.log('✅ Menu perfil aberto');
            await new Promise(r => setTimeout(r, 1500));
        } else {
            console.log('⚠️ Botão de perfil não encontrado. Talvez já esteja deslogado?');
            // Se não achar o botão de perfil, talvez já esteja deslogado
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
            
            // Limpar flag e redirecionar
            setTimeout(() => {
                chrome.storage.local.set({ logoutPendente: false }, () => {
                    console.log('🌐 Redirecionando para Google...');
                    window.location.href = 'https://www.google.com';
                });
            }, 2000);
        } else {
            // Se não achou o OK, verificar se deslogou
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

// Função para dar refresh na página da mesa
async function refreshPaginaMesa() {
    console.log('🔄 [WS-SERVIDOR] Dando refresh na página da mesa...');
    
    chrome.tabs.query({ url: 'https://big.bet.br/live-casino/*' }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.reload(tabs[0].id);
            console.log('✅ [WS-SERVIDOR] Página recarregada');
        } else {
            console.log('⚠️ [WS-SERVIDOR] Nenhuma aba da mesa encontrada');
        }
    });
}

// Listener para detectar navegação e fazer auto-login
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;

    // Página de login da casa
    if (tab.url && tab.url.includes('big.bet.br') && (tab.url.includes('cmd=signin') || tab.url.includes('/login'))) {
        chrome.storage.local.get(['casaEmail', 'casaSenha', 'botAtivo'], (result) => {
            if (result.botAtivo && result.casaEmail && result.casaSenha) {
                console.log('🔐 [WS-SERVIDOR] Página de login detectada, injetando script...');
                // Aguardar 3s para a página renderizar
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: preencherLogin,
                        args: [result.casaEmail, result.casaSenha]
                    }).then(() => {
                        console.log('✅ [WS-SERVIDOR] Script de login injetado');
                    }).catch((e) => {
                        console.error('❌ [WS-SERVIDOR] Erro ao injetar script:', e);
                    });
                }, 3000);
            }
        });
    }

    // Chegou na home logado (pós-login) — redirecionar para mesa
    if (tab.url && tab.url.includes('big.bet.br')) {
        const isLoginPage = tab.url.includes('cmd=signin') || tab.url.includes('/login');

        if (!isLoginPage) {
            chrome.storage.local.get(['botAtivo', 'loginEmCurso', 'logoutPendente'], (result) => {
                if (result.botAtivo && result.loginEmCurso && !result.logoutPendente) {
                    console.log('🚀 [WS-SERVIDOR] Login concluído! Redirecionando para a mesa...');
                    chrome.storage.local.set({ loginEmCurso: false });
                    chrome.tabs.update(tabId, { url: URL_MESA });
                }
            });
        }
    }

    // Chegou na mesa — avisar servidor
    if (tab.url && tab.url.includes('big.bet.br/live-casino')) {
        chrome.storage.local.set({ loginEmCurso: false });
        console.log('✅ [WS-SERVIDOR] Bot na mesa!');
        
        if (wsServidor && wsServidor.readyState === WebSocket.OPEN) {
            wsServidor.send(JSON.stringify({
                tipo: 'status_bot',
                email: emailUsuarioLogado,
                status: 'na_mesa'
            }));
        }
    }

    // Chegou na página principal (home) — verificar se precisa fazer logout
    if (tab.url && (tab.url === 'https://big.bet.br/pt' || tab.url === 'https://big.bet.br/pt/')) {
        chrome.storage.local.get(['logoutPendente'], (result) => {
            if (result.logoutPendente) {
                console.log('🚪 [WS-SERVIDOR] Logout pendente detectado, injetando script de logout...');
                // Aguardar 3s para a página renderizar
                setTimeout(() => {
                    chrome.scripting.executeScript({
                        target: { tabId },
                        func: executarLogout
                    }).then(() => {
                        console.log('✅ [WS-SERVIDOR] Script de logout injetado');
                    }).catch((e) => {
                        console.error('❌ [WS-SERVIDOR] Erro ao injetar script de logout:', e);
                    });
                }, 3000);
            }
        });
    }

    // Chegou na home após logout
    if (tab.url && (tab.url === 'https://big.bet.br/pt' || tab.url === 'https://big.bet.br/pt/')) {
        chrome.storage.local.get(['logoutPendente'], (result) => {
            if (!result.logoutPendente) {
                console.log('✅ [WS-SERVIDOR] Bot deslogado');
                
                if (wsServidor && wsServidor.readyState === WebSocket.OPEN) {
                    wsServidor.send(JSON.stringify({
                        tipo: 'status_bot',
                        email: emailUsuarioLogado,
                        status: 'deslogado'
                    }));
                }
            }
        });
    }
});

// Função injetada na página para preencher login
function preencherLogin(email, senha) {
    function aguardarElemento(seletor, callback, tentativa = 0) {
        const el = document.querySelector(seletor);
        if (el) {
            callback(el);
        } else if (tentativa < 20) {
            setTimeout(() => aguardarElemento(seletor, callback, tentativa + 1), 500);
        }
    }

    function dispararEventos(el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
    }

    // Preencher email
    aguardarElemento('#EMAIL', (emailInput) => {
        emailInput.focus();
        emailInput.value = email;
        dispararEventos(emailInput);

        // Preencher senha
        setTimeout(() => {
            aguardarElemento('#PASSWORD', (senhaInput) => {
                senhaInput.focus();
                senhaInput.value = senha;
                dispararEventos(senhaInput);

                // Clicar no botão
                setTimeout(() => {
                    const btn = document.querySelector('#signIn') ||
                        document.querySelector('button[type="submit"]') ||
                        Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Entrar'));

                    if (btn) {
                        btn.click();
                        console.log('✅ Botão entrar clicado');
                    }
                }, 2000);
            });
        }, 2000);
    });
}

// Função para parar o bot remotamente
async function pararBotRemoto() {
    console.log('🛑 [WS-SERVIDOR] Parando bot remotamente...');
    
    // Atualizar status
    if (wsServidor && wsServidor.readyState === WebSocket.OPEN) {
        wsServidor.send(JSON.stringify({
            tipo: 'status_bot',
            email: emailUsuarioLogado,
            status: 'desligando'
        }));
    }
    
    // Marcar logout pendente
    chrome.storage.local.set({ 
        logoutPendente: true,
        botAtivo: false
    });
    
    // Redirecionar para home
    chrome.tabs.query({ url: 'https://big.bet.br/*' }, (tabs) => {
        if (tabs.length > 0) {
            chrome.tabs.update(tabs[0].id, { url: 'https://big.bet.br/pt' });
        } else {
            chrome.tabs.create({ url: 'https://big.bet.br/pt' });
        }
    });
    
    console.log('✅ [WS-SERVIDOR] Bot parado!');
}

// Função para redirecionar para a mesa
async function redirecionarParaMesa(tabId) {
    console.log('🎰 [WS-SERVIDOR] Redirecionando para a mesa...');
    await chrome.tabs.update(tabId, { url: URL_MESA });
}

// Enviar stats para o servidor a cada 5 segundos
setInterval(() => {
    if (emailUsuarioLogado) {
        // Tentar pegar stats do storage primeiro, depois do botState
        chrome.storage.local.get(['rouletteState', 'modoSimulacaoAtivo', 'placarSimulacao', 'saldoSimulacao'], (result) => {
            let wins = 0;
            let losses = 0;
            let saldo = null;
            let saldoInicial = null;
            
            const isSimulacao = result.modoSimulacaoAtivo || false;
            
            if (isSimulacao) {
                // Usar dados da simulação
                const placarSim = result.placarSimulacao || { wins: 0, losses: 0 };
                wins = placarSim.wins || 0;
                losses = placarSim.losses || 0;
                saldo = result.saldoSimulacao || 1000.00;
                saldoInicial = 1000.00; // Saldo inicial padrão da simulação
                console.log('📊 [STATS] Modo Simulação - usando dados simulados:', {wins, losses, saldo});
            } else {
                // Usar dados reais - priorizar storage do sidepanel
                if (result.rouletteState && (result.rouletteState.wins !== undefined || result.rouletteState.losses !== undefined)) {
                    wins = result.rouletteState.wins || 0;
                    losses = result.rouletteState.losses || 0;
                    saldo = result.rouletteState.ultimoSaldoPush || botState.ultimoSaldoPush || null;
                    saldoInicial = result.rouletteState.saldoInicial || botState.saldoInicial || null;
                    console.log('📊 [STATS] Modo Real - usando dados do storage:', {wins, losses, saldo});
                } else {
                    // Fallback para dados do background
                    wins = botState.wins || 0;
                    losses = botState.losses || 0;
                    saldo = botState.ultimoSaldoPush || null;
                    saldoInicial = botState.saldoInicial || null;
                    console.log('📊 [STATS] Modo Real - usando dados do botState:', {wins, losses, saldo});
                }
            }
            
            const statsData = {
                email: emailUsuarioLogado,
                greens: wins,
                reds: losses,
                saldo: saldo,
                saldoInicial: saldoInicial
            };
            
            console.log('📊 [STATS] Enviando para servidor:', statsData);
            
            // Enviar via HTTP
            fetch('https://fortuna-x-web.onrender.com/api/stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(statsData)
            }).then(response => {
                if (response.ok) {
                    console.log('✅ [STATS] Enviado com sucesso');
                } else {
                    console.error('❌ [STATS] Erro:', response.status);
                }
            }).catch(error => {
                console.error('❌ [STATS] Erro de conexão:', error);
            });
        });
    }
}, 3000); // Atualizado para 3 segundos conforme solicitação do usuário bilateralmente

// Iniciar conexão quando a extensão carregar
console.log('🎯 [WS-SERVIDOR] Aguardando 2 segundos para iniciar conexão...');
setTimeout(() => {
    console.log('🎯 [WS-SERVIDOR] Iniciando conexão com servidor...');
    conectarServidorLocal();
}, 2000);

console.log('🎯 [WS-SERVIDOR] Sistema de controle remoto inicializado!');
