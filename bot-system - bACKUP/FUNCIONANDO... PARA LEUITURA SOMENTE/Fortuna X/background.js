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
    const historico = Array.isArray(botState.historicoRodadas) ? botState.historicoRodadas : [];
    const historicoRecortado = historico.slice(0, maxRodadas);
    
    // Forçar carregamento da config mais recente antes de enviar
    chrome.storage.local.get(['rouletteState'], (result) => {
        const state = result.rouletteState || botState;
        const config = (state && state.configQuentesFrios) ? state.configQuentesFrios : { qtdQuentes: 3, qtdFrios: 3, qtdVizinhos: 2 };
        
        const contagem = {};
        for (let i = 0; i <= 36; i++) contagem[i] = 0;

        historicoRecortado.forEach(n => {
            const num = parseInt(n);
            if (!isNaN(num) && num >= 0 && num <= 36) {
                contagem[num] = (contagem[num] || 0) + 1;
            }
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
                    estrategiaAtual: (state && state.nomeEstrategiaSelecionada) ? state.nomeEstrategiaSelecionada : '',
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
    const historico = Array.isArray(botState.historicoRodadas) ? botState.historicoRodadas : [];
    const historicoRecortado = historico.slice(0, maxRodadas);
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
    
    // Fallback absoluto para multiplicadores
    let listaMult = gatilho.multiplicadores || gatilho.gales || gatilho.ciclos || [1, 3];
    
    console.log(`[GALE-DEBUG] Lista de multiplicadores ANTES das regras:`, listaMult);
    
    // Regras Específicas solicitadas pelo Usuário
    const apostaEmTags = Array.isArray(gatilho.apostaEm) ? gatilho.apostaEm : [];
    const isFuncionario = apostaEmTags.includes('FUNCIONARIO_MES') || apostaEmTags.includes('DYNAMIC_FUNCIONARIO');
    const isHotCold = apostaEmTags.some(tag => ['QUENTES', 'FRIOS', 'AMBOS'].includes(tag));
    const isIAPleno = gatilho.tipo === 'IA_PLENO_ENGINE';

    if (isFuncionario) {
        listaMult = [1, 3]; // Somente 1 ciclo x3
        console.log(`[GALE-DEBUG] É Funcionário do Mês, forçando multiplicadores:`, listaMult);
    } else if (isHotCold) {
        listaMult = [1, 3]; // Somente 1 gale x3 (repetição)
        console.log(`[GALE-DEBUG] É Quentes/Frios, forçando multiplicadores:`, listaMult);
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
    if (galeIndex > 0) {
        const apostaEmTags = Array.isArray(gatilho.apostaEm) ? gatilho.apostaEm : [];
        const isFuncionario = apostaEmTags.includes('FUNCIONARIO_MES') || apostaEmTags.includes('DYNAMIC_FUNCIONARIO');

        if (isFuncionario) {
            // COMPORTAMENTO CICLO: Expandir aposta adicionando o número que saiu + vizinhos
            console.log(`[CICLO-DEBUG] Expandindo Funcionário do Mês no nível ${galeIndex}. Adicionando número ${numeroAcionador} + vizinhos.`);
            let numerosAnteriores = [];
            if (botState.apostaAtiva && botState.apostaAtiva.numeros) {
                numerosAnteriores = botState.apostaAtiva.numeros;
            }
            const novosVizinhos = calcularVizinhos([numeroAcionador], 2);
            numerosParaApostar = [...new Set([...numerosAnteriores, ...novosVizinhos])].sort((a, b) => a - b);
        } else {
            // COMPORTAMENTO GALE PADRÃO: Repetir o que foi apostado antes
            if (botState.apostaAtiva && botState.apostaAtiva.numeros && botState.apostaAtiva.numeros.length > 0) {
                console.log(`[GALE-DEBUG] Nível ${galeIndex} de ${gatilho.nome}: Repetindo ${botState.apostaAtiva.numeros.length} números.`);
                numerosParaApostar = botState.apostaAtiva.numeros;
            } else {
                console.warn('[GALE-DEBUG] Alerta: botState.apostaAtiva sem números para Gale! Usando números do gatilho.');
                numerosParaApostar = gatilho.numeros || [];
            }
        }
    } else {
        // Aposta Inicial: Calcular números dinâmicos se necessário
        const apostaEmTags = Array.isArray(gatilho.apostaEm) ? gatilho.apostaEm : [];
        const isDinamico = apostaEmTags.some(tag => ['QUENTES', 'FRIOS', 'AMBOS', 'FUNCIONARIO_MES', 'DYNAMIC_FUNCIONARIO'].includes(tag));

        if (isDinamico) {
            console.log(`[GALE-DEBUG] Calculando números dinâmicos iniciais para ${gatilho.nome}`);
            if (apostaEmTags.includes('FUNCIONARIO_MES') || apostaEmTags.includes('DYNAMIC_FUNCIONARIO')) {
                let ultimosUnicos = [];
                for (let num of botState.historicoRodadas) {
                    if (!ultimosUnicos.includes(num)) {
                        ultimosUnicos.push(num);
                        if (ultimosUnicos.length === 7) break;
                    }
                }
                numerosParaApostar = calcularVizinhos(ultimosUnicos, 2);
                if (botState.numerosFixosFuncionario) {
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
    const prefixoStatus = modoSimulacaoAtivo ? 'SIMULANDO' : 'APOSTANDO';
    const tipoEntrada = galeIndex > 0 ? (gatilho.tipo === 'ciclo' ? `Ciclo ${galeIndex}` : `GALE ${galeIndex}`) : 'Entrada';
    const labelAposta = `${prefixoStatus} — ${tipoEntrada}`;
    
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
                    nomeEstrategiaParaAviso: botState.apostaAtiva?.nomeEstrategia || 'Estratégia',
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
        gatilhosDinamicos.forEach(g => enviarApostaParaMesa(g, numero));
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

    gatilhosAtivos.forEach(g => enviarApostaParaMesa(g, numero));
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

function verificarResultado(numeroSaiu) {
    if (!botState.apostaAtiva) return;
    
    // Verificação de segurança: se a aposta foi feita há mais de 2 minutos, provavelmente é lixo de estado
    const agora = Date.now();
    const tempoAposta = botState.apostaAtiva.timestamp ? new Date(botState.apostaAtiva.timestamp).getTime() : agora;
    if (agora - tempoAposta > 240000) { // Aumentar para 4 minutos (rodadas lentas da Bet365)
        console.warn('🕒 [BACKGROUND] Aposta ativa expirada (mais de 4 min). Limpando estado.');
        botState.apostaAtiva = null;
        chrome.storage.local.set({ apostaAtiva: null });
        return;
    }

    const aposta = botState.apostaAtiva;
    let apostados = [];

    // Expandir cada item apostado (que já foi resolvido em enviarApostaParaMesa) para números puros
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
            const cor = ganhou ? '#4CAF50' : '#f44336';
            const msg = ganhou ? `✅ GANHOU NO ${numeroSaiuInt}` : `❌ PERDEU NO ${numeroSaiuInt}`;
            chrome.tabs.sendMessage(tabs[0].id, {
                tipo: 'debug_alerta',
                mensagem: msg
            }).catch(() => {});
        }
    });

    if (ganhou) {
            const placarW = modoSimulacaoAtivo ? placarSimulacao.wins : botState.wins + 1;
            const placarL = modoSimulacaoAtivo ? placarSimulacao.losses : botState.losses;
            const tipoFinal = aposta.galeIndex > 0 ? (aposta.gatilho?.tipo === 'ciclo' ? `Ciclo ${aposta.galeIndex}` : `GALE ${aposta.galeIndex}`) : 'Entrada';

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
            
            // Lógica de Pagamento Simulado:
            // Cada item em aposta.numeros representa uma ficha.
            // Precisamos saber o multiplicador de ganho de cada ficha.
            let ganhoTotalSimulado = 0;
            const numeroSaiuInt = parseInt(numeroSaiu);

            aposta.numeros.forEach(item => {
                 let payoutRatio = 36; // Padrão: Pleno (35+1 = 36)
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
            
            // Sincronizar mini painel no modo simulação
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        tipo: 'atualizar_simulacao',
                        saldo: saldoSimulacao,
                        placar: placarSimulacao
                    }).catch(() => {});
                });
            });
        } else {
            botState.wins++;
            // No modo real, o verificarStopGestao já cuida de enviar o placar
        }
        
        console.log(`✅ [BACKGROUND] GANHOU! Número: ${numeroSaiuInt} (${modoSimulacaoAtivo ? 'SIMULAÇÃO' : 'REAL'})`);
        
        // Verificar Stop Gestão (Quantidade de Greens)
        verificarStopGestao();
        
        // Registrar no histórico após 3 segundos
        // setTimeout(() => registrarNoHistorico(aposta, numeroSaiuInt, 'WIN'), 3000);
        const configEspecial = aposta?.gatilho?.configEspecial;
        const esperarAposGreen = configEspecial?.esperarRodadasAposGreen || configEspecial?.esperarRodadas || 0;
        
        if (esperarAposGreen > 0) {
            botCountdownState.rodadasRestantes = esperarAposGreen;
            console.log(`⏳ [BACKGROUND] Configurando cooldown de ${esperarAposGreen} rodadas após o GREEN.`);
        } else {
            botCountdownState.rodadasRestantes = null;
        }

        // Aguardar 3 segundos e registrar TUDO no histórico
        if (aposta && aposta.apostaId) {
            const apostaIdAtual = aposta.apostaId;
            
            setTimeout(() => {
                // Carregar apostaAtiva do storage para pegar historicoGales atualizado
                chrome.storage.local.get(['apostaAtiva'], (storageResult) => {
                    // Usar a aposta que já capturamos no início da função
                    const apostaHistorico = aposta; 
                    if (!apostaHistorico) return;
                    
                    const nomeEstrategia = apostaHistorico.nomeEstrategia;
                    const historicoGales = apostaHistorico.historicoGales || [];
                    
                    console.log(`📊 [BACKGROUND] Histórico de gales: ${JSON.stringify(historicoGales)}`);
                    
                    // Pegar o último número que saiu na mesa
                    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                        if (tabs[0]) {
                            chrome.tabs.sendMessage(tabs[0].id, { tipo: 'obter_ultimo_numero' }, (response) => {
                                const numeroFinal = response?.numero || numeroSaiuInt;
                                
                                console.log(`🎯 [BACKGROUND] Número final: ${numeroFinal}`);
                                
                                // Obter valor da ficha e criar registro completo
                                chrome.storage.local.get(['rouletteState', 'historicoApostas'], (result) => {
                                const valorFicha = result.rouletteState?.valorFicha || 1.00;
                                const historicoApostas = result.historicoApostas || [];
                                
                                // Calcular valores
                                const primeiraAposta = historicoGales[0] || {};
                                const quantidadeNumeros = primeiraAposta.quantidadeNumeros || 0;
                                const multiplicador = primeiraAposta.multiplicador || 1;
                                const valorApostaInicial = valorFicha * quantidadeNumeros * multiplicador;
                                
                                // Criar array de gales (se houver)
                                const gales = [];
                                let valorTotalInvestido = valorApostaInicial;
                                
                                for (let i = 1; i < historicoGales.length; i++) {
                                    const gale = historicoGales[i];
                                    const valorGale = valorFicha * gale.quantidadeNumeros * gale.multiplicador;
                                    valorTotalInvestido += valorGale;
                                    
                                    gales.push({
                                        numero: i,
                                        valorFicha: valorFicha,
                                        quantidadeNumeros: gale.quantidadeNumeros,
                                        multiplicador: gale.multiplicador,
                                        valorAposta: valorGale
                                    });
                                }
                                
                                // Calcular retorno
                                const valorGanho = valorFicha * 35;
                                const retorno = valorGanho - valorTotalInvestido;
                                
                                    // Criar registro completo
                                    const novaAposta = {
                                        id: apostaIdAtual,
                                        timestamp: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                                        gatilho: botState.nomeEstrategiaSelecionada || apostaHistorico.gatilho?.nome || nomeEstrategia,
                                        numeroSaiu: numeroFinal,
                                        resultado: 'WIN',
                                        gale: apostaHistorico.galeIndex || 0,
                                        modo: modoSimulacaoAtivo ? 'SIMULAÇÃO' : 'REAL',
                                        saldo: botState.ultimoSaldoPush || result.rouletteState?.ultimoSaldoPush || 0
                                    };
                                
                                historicoApostas.unshift(novaAposta);
                                
                                // Limitar a 100 apostas
                                if (historicoApostas.length > 100) {
                                    historicoApostas.splice(100);
                                }
                                
                                chrome.storage.local.set({ historicoApostas }, () => {
                                    console.log(`💾 [BACKGROUND] Histórico registrado: ${JSON.stringify(novaAposta)}`);
                                    // Notificar Sidepanel para atualizar a lista
                                    chrome.runtime.sendMessage({ tipo: 'atualizar_historico_apostas' }).catch(() => {});
                                });
                            });
                        });
                    }
                });
                });
            }, 3000);
        }
        
        botState.apostaAtiva = null;
        botState.aguardandoProximaRodada = true;
        chrome.storage.local.set({ botCountdownState, apostaAtiva: null });
        
        // Notificar content script para limpar alertas visuais
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { tipo: 'limpar_alertas' }).catch(() => {});
            }
        });

        console.log('✅ [BACKGROUND] GANHOU! Resetando estado.');
    } else {
        const gatilho = aposta.gatilho;
        const proximoGaleIndex = (aposta.galeIndex || 0) + 1;
        
        let multiplicadores = gatilho.multiplicadores || gatilho.gales || gatilho.ciclos || (gatilho.tipo === 'GALE' || gatilho.estrategia === 'GALE' ? [1, 3] : null);
        
        // Reforçar regras de multiplicadores para dinâmicos
        const tags = Array.isArray(gatilho.apostaEm) ? gatilho.apostaEm : [];
        if (tags.includes('FUNCIONARIO_MES') || tags.includes('DYNAMIC_FUNCIONARIO')) {
            multiplicadores = [1, 3];
        } else if (tags.some(t => ['QUENTES', 'FRIOS', 'AMBOS'].includes(t))) {
            // Usar multiplicadores do gatilho (definidos no painel admin) se disponíveis,
            // senão fallback para [1, 3] (1 gale com x3)
            if (!multiplicadores || multiplicadores.length === 0) {
                multiplicadores = [1, 3];
            }
        }
        
        // Se ainda houver Gale disponível, não conta o Loss no placar geral ainda
        if (multiplicadores && proximoGaleIndex < multiplicadores.length) {
            console.log(`⚠️ [BACKGROUND] Perdeu no Gale ${aposta.galeIndex}. Tentando Gale ${proximoGaleIndex}...`);
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        tipo: 'debug_alerta', 
                        mensagem: `⚠️ Perdeu Gale ${aposta.galeIndex}. Indo para Gale ${proximoGaleIndex}` 
                    }).catch(() => {});
                }
            });

            setTimeout(() => {
                enviarApostaParaMesa(gatilho, numeroSaiu, proximoGaleIndex);
            }, 500);
            return;
        } else {
            // Acabaram TODOS os gales/ciclos - agora sim conta como 1 LOSS FINAL
            const placarW = modoSimulacaoAtivo ? placarSimulacao.wins : botState.wins;
            const placarL = modoSimulacaoAtivo ? placarSimulacao.losses : botState.losses + 1;

            // Enviar para o Telegram com delay de 2s para o saldo atualizar
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
            
            // Sincronizar mini painel no modo simulação (Loss)
            chrome.tabs.query({}, (tabs) => {
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        tipo: 'atualizar_simulacao',
                        saldo: saldoSimulacao,
                        placar: placarSimulacao
                    }).catch(() => {});
                });
            });
        } else {
            botState.losses++;
            // No modo real, o verificarStopGestao já cuida de enviar o placar
        }
        console.log(`❌ [BACKGROUND] PERDEU FINAL! (${modoSimulacaoAtivo ? 'SIMULAÇÃO' : 'REAL'})`);
        
        // Verificar Stop Gestão (Quantidade de Reds)
        verificarStopGestao();
        
        // Registrar no histórico após 3 segundos
        // setTimeout(() => registrarNoHistorico(aposta, numeroSaiuInt, 'LOSS'), 3000);
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, { tipo: 'limpar_alertas' }).catch(() => {});
            }
        });

        // Aguardar 3 segundos e registrar TUDO no histórico
            if (aposta && aposta.apostaId) {
                const apostaIdAtual = aposta.apostaId;
                
                setTimeout(() => {
                    // Carregar apostaAtiva do storage para pegar historicoGales atualizado
                    chrome.storage.local.get(['apostaAtiva'], (storageResult) => {
                        // Usar a aposta que já capturamos no início da função
                        const apostaHistorico = aposta; 
                        if (!apostaHistorico) return;
                        
                        const nomeEstrategia = apostaHistorico.nomeEstrategia;
                        const historicoGales = apostaHistorico.historicoGales || [];
                        
                        console.log(`📊 [BACKGROUND] Histórico de gales: ${JSON.stringify(historicoGales)}`);
                        
                        // Pegar o último número que saiu na mesa
                        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                            if (tabs[0]) {
                                chrome.tabs.sendMessage(tabs[0].id, { tipo: 'obter_ultimo_numero' }, (response) => {
                                    const numeroFinal = response?.numero || numeroSaiuInt;
                                    
                                    console.log(`🎯 [BACKGROUND] Número final: ${numeroFinal}`);
                                    
                                    // Obter valor da ficha e criar registro completo
                                    chrome.storage.local.get(['rouletteState', 'historicoApostas'], (result) => {
                                    const valorFicha = result.rouletteState?.valorFicha || 1.00;
                                    const historicoApostas = result.historicoApostas || [];
                                    
                                    // Calcular valores
                                    const primeiraAposta = historicoGales[0] || {};
                                    const quantidadeNumeros = primeiraAposta.quantidadeNumeros || 0;
                                    const multiplicador = primeiraAposta.multiplicador || 1;
                                    const valorApostaInicial = valorFicha * quantidadeNumeros * multiplicador;
                                    
                                    // Criar array de gales (se houver)
                                    const gales = [];
                                    let valorTotalInvestido = valorApostaInicial;
                                    
                                    for (let i = 1; i < historicoGales.length; i++) {
                                        const gale = historicoGales[i];
                                        const valorGale = valorFicha * gale.quantidadeNumeros * gale.multiplicador;
                                        valorTotalInvestido += valorGale;
                                        
                                        gales.push({
                                            numero: i,
                                            valorFicha: valorFicha,
                                            quantidadeNumeros: gale.quantidadeNumeros,
                                            multiplicador: gale.multiplicador,
                                            valorAposta: valorGale
                                        });
                                    }
                                    
                                    // Criar registro completo
                                    const novaAposta = {
                                        id: apostaIdAtual,
                                        timestamp: new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }),
                                        gatilho: botState.nomeEstrategiaSelecionada || apostaHistorico.gatilho?.nome || nomeEstrategia,
                                        numeroSaiu: numeroFinal,
                                        resultado: 'LOSS',
                                        gale: apostaHistorico.galeIndex || 0,
                                        modo: modoSimulacaoAtivo ? 'SIMULAÇÃO' : 'REAL',
                                        saldo: botState.ultimoSaldoPush || result.rouletteState?.ultimoSaldoPush || 0
                                    };
                                    
                                    historicoApostas.unshift(novaAposta);
                                    
                                    // Limitar a 100 apostas
                                    if (historicoApostas.length > 100) {
                                        historicoApostas.splice(100);
                                    }
                                    
                                    chrome.storage.local.set({ historicoApostas }, () => {
                                        console.log(`💾 [BACKGROUND] Histórico registrado: ${JSON.stringify(novaAposta)}`);
                                        // Notificar Sidepanel para atualizar a lista
                                        chrome.runtime.sendMessage({ tipo: 'atualizar_historico_apostas' }).catch(() => {});
                                    });
                                });
                            });
                        }
                    });
                    });
                }, 3000);
            }
            
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0]) {
                    chrome.tabs.sendMessage(tabs[0].id, { 
                        tipo: 'debug_alerta', 
                        mensagem: `❌ LOSS FINAL no ${numeroSaiu}` 
                    }).catch(() => {});
                }
            });

            // --- SISTEMA DE COOLDOWN PÓS-LOSS ---
            const configEspecial = aposta?.gatilho?.configEspecial;
            const esperarPadrao = configEspecial?.esperarRodadas || 0;
            
            if (esperarPadrao > 0) {
                botCountdownState.rodadasRestantes = esperarPadrao;
                console.log(`⏳ [BACKGROUND] Configurando cooldown de ${esperarPadrao} rodadas após o LOSS.`);
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
            
            // Garantir que historicoRodadas seja um array
            if (!Array.isArray(botState.historicoRodadas)) {
                botState.historicoRodadas = [];
            }
            
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
            const novos = Array.isArray(request.numeros) ? request.numeros : [];
            console.log(`📊 [BACKGROUND] Recebendo histórico (${novos.length} números). Tipo: ${request.tipo}`);
            
            if (request.tipo === 'historico_500') {
                // Para o histórico completo (500), sempre resetamos para garantir a base limpa da mesa
                botState.historicoRodadas = novos;
            } else if (request.tipo === 'historico_12') {
                // Para a coleta rápida (12), só resetamos se o histórico atual estiver muito pequeno ou vazio
                // Isso evita que a coleta de 12 limpe uma coleta anterior de 500
                if (botState.historicoRodadas.length < 20) {
                    botState.historicoRodadas = novos;
                } else {
                    // Caso contrário, apenas adicionamos os que não temos (preservando o histórico de 500)
                    const numerosAtuaisSet = new Set(botState.historicoRodadas.slice(0, 50));
                    const filtrados = novos.filter(n => !numerosAtuaisSet.has(n));
                    botState.historicoRodadas = [...filtrados, ...botState.historicoRodadas].slice(0, 1000);
                }
            }
            
            botState.sequenciaAtual = botState.historicoRodadas.slice(0, TAMANHO_SEQUENCIA_MAX);
            
            chrome.storage.local.set({ 
                historicoRodadas: botState.historicoRodadas,
                rouletteState: botState 
            });
            
            // Notificar Sidepanel imediatamente
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
