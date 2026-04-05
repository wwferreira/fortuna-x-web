// ===== SUPABASE CLIENT (EMBUTIDO) =====
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
      if (!response.ok) {
        if (data.error === 'invalid_grant' || data.message === 'refresh_token_not_found') {
          console.warn('⚠️ Refresh token inválido ou expirado. Deslogando...');
          await this.signOut();
        }
        throw data;
      }

      await this.saveSession(data);
      console.log('✅ Sessão renovada com sucesso.');
      return true;
    } catch (e) {
      console.error('❌ Falha no refresh do token:', e);
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

  async signInWithPassword({ email, password }) {
    const response = await fetch(`${this.client.url}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.client.key
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      return { data: null, error: data };
    }

    await this.saveSession(data);
    return { data, error: null };
  }

  async signOut() {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['supabase_token', 'supabase_refresh_token', 'supabase_user'], () => {
        this.session = null;
        resolve({ error: null });
      });
    });
  }
  
  async getUser() {
    const { data: sessionData } = await this.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { data: null, error: { message: 'No session' } };
    const response = await fetch(`${this.client.url}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.client.key,
        'Authorization': `Bearer ${token}`
      }
    });
    const data = await response.json();
    if (!response.ok) return { data: null, error: data };
    return { data, error: null };
  }
  
  async updateUserMetadata(meta) {
    const { data: sessionData } = await this.getSession();
    const token = sessionData?.session?.access_token;
    if (!token) return { data: null, error: { message: 'No session' } };
    const response = await fetch(`${this.client.url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.client.key,
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ data: meta })
    });
    const data = await response.json();
    if (!response.ok) return { data: null, error: data };
    // persist returned session user if present
    if (data) {
      await this.saveSession({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user: data
      });
    }
    return { data, error: null };
  }
}

class QueryBuilder {
  constructor(client, table) {
    this.client = client;
    this.table = table;
    this.filters = [];
    this.orderBy = null;
    this.selectColumns = '*';
    this.insertData = null;
    this.updateData = null;
    this.isDelete = false;
  }

  select(columns = '*') {
    this.selectColumns = columns;
    return this;
  }

  eq(column, value) {
    this.filters.push({ column, operator: 'eq', value });
    return this;
  }

  in(column, values) {
    const formattedValues = values.map(v => typeof v === 'string' ? `"${v}"` : v).join(',');
    this.filters.push({ column, operator: 'in', value: `(${formattedValues})` });
    return this;
  }

  order(column, options = {}) {
    this.orderBy = { column, ascending: options.ascending !== false };
    return this;
  }

  insert(data) {
    this.insertData = data;
    return this;
  }

  update(data) {
    this.updateData = data;
    return this;
  }

  delete() {
    this.isDelete = true;
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

    if (this.orderBy) {
      url += `&order=${this.orderBy.column}.${this.orderBy.ascending ? 'asc' : 'desc'}`;
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

  async then(onFulfilled, onRejected) {
    try {
      let result;

      if (this.insertData) {
        result = await this._executeInsert();
      } else if (this.updateData) {
        result = await this._executeUpdate();
      } else if (this.isDelete) {
        result = await this._executeDelete();
      } else {
        result = await this.execute();
      }

      return onFulfilled(result);
    } catch (error) {
      return onRejected ? onRejected(error) : Promise.reject(error);
    }
  }

  async _executeInsert() {
    const { data: sessionData } = await this.client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.client.key,
      'Prefer': 'return=representation,resolution=merge-duplicates'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.client.url}/rest/v1/${this.table}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(this.insertData)
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result };
    }

    return { data: result, error: null };
  }

  async _executeUpdate() {
    const { data: sessionData } = await this.client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.client.key,
      'Prefer': 'return=representation'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${this.client.url}/rest/v1/${this.table}`;
    let first = true;
    for (const filter of this.filters) {
      url += (first ? '?' : '&') + `${filter.column}=${filter.operator}.${encodeURIComponent(filter.value)}`;
      first = false;
    }

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(this.updateData)
    });

    const result = await response.json();

    if (!response.ok) {
      return { data: null, error: result };
    }

    return { data: result, error: null };
  }

  async _executeDelete() {
    const { data: sessionData } = await this.client.auth.getSession();
    const token = sessionData?.session?.access_token;
    const headers = {
      'Content-Type': 'application/json',
      'apikey': this.client.key
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = `${this.client.url}/rest/v1/${this.table}`;
    let first = true;
    for (const filter of this.filters) {
      url += (first ? '?' : '&') + `${filter.column}=${filter.operator}.${encodeURIComponent(filter.value)}`;
      first = false;
    }

    const response = await fetch(url, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const error = await response.json();
      return { error };
    }

    return { error: null };
  }
}

const supabase = new SupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===== ELEMENTOS DO DOM (INICIALIZADOS NO TOPO PARA EVITAR ERROS) =====
const legenda = document.getElementById('legenda');
const numeros = document.getElementById('numeros');
const btnAdicionarLegenda = document.getElementById('btnAdicionarLegenda');
const listaLegendas = document.getElementById('listaLegendas');
const gatilhoLegendas = document.getElementById('gatilhoLegendas');
const apostaLegendas = document.getElementById('apostaLegendas');
const btnAdicionarGatilhoLegendas = document.getElementById('btnAdicionarGatilhoLegendas');
const listaGatilhosLegendas = document.getElementById('listaGatilhosLegendas');
const tipoGatilho = document.getElementById('tipoGatilho');
const configGaleCiclo = document.getElementById('configGaleCiclo');
const sliderQuantidade = document.getElementById('sliderQuantidade');
const quantidadeGaleCicloSpan = document.getElementById('quantidadeGaleCiclo');
const slidersFichas = document.getElementById('slidersFichas');
const pauseWinInput = document.getElementById('pauseWin');
const configNumerosFixos = document.getElementById('configNumerosFixos');
const inputNumerosFixos = document.getElementById('inputNumerosFixos');
const btnAdicionarNumerosFixos = document.getElementById('btnAdicionarNumerosFixos');
const listaNumerosFixos = document.getElementById('listaNumerosFixos');
const configFuncionarioMes = document.getElementById('configFuncionarioMes');
const tipoProgressaoFM = document.getElementById('tipoProgressaoFM');
const configGaleCicloFM = document.getElementById('configGaleCicloFM');
const sliderQuantidadeFM = document.getElementById('sliderQuantidadeFM');
const quantidadeGaleCicloSpanFM = document.getElementById('quantidadeGaleCicloFM');
const slidersFichasFM = document.getElementById('slidersFichasFM');
const btnSalvarFuncionarioMes = document.getElementById('btnSalvarFuncionarioMes');
const btnSalvarQuentesFrios = document.getElementById('btnSalvarQuentesFrios');
const inputQtdQuentes = document.getElementById('inputQtdQuentes');
const inputQtdFrios = document.getElementById('inputQtdFrios');
const inputQtdVizinhos = document.getElementById('inputQtdVizinhos');
const tipoProgressaoQF = document.getElementById('tipoProgressaoQF');
const configGaleCicloQF = document.getElementById('configGaleCicloQF');
const sliderQuantidadeQF = document.getElementById('sliderQuantidadeQF');
const quantidadeGaleCicloSpanQF = document.getElementById('quantidadeGaleCicloQF');
const slidersFichasQF = document.getElementById('slidersFichasQF');
const resetBtn = document.getElementById('resetBtn');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');
const saveBtn = document.getElementById('saveBtn');
const btnTelegram = document.getElementById('btnTelegram');
const modalTelegram = document.getElementById('modalTelegram');
const btnFecharModalTelegram = document.getElementById('btnFecharModalTelegram');
const telegramTokenInput = document.getElementById('telegramTokenInput');
const telegramChatIdInput = document.getElementById('telegramChatIdInput');
const btnTestarTelegram = document.getElementById('btnTestarTelegram');
const btnSalvarTelegram = document.getElementById('btnSalvarTelegram');
const selecaoEstrategia = document.getElementById('selecaoEstrategia');
const notificacoesContainer = document.getElementById('notificacoes');
const telaPrincipal = document.getElementById('telaPrincipal');
const listaHistorico = document.getElementById('listaHistorico');
const btnLimparHistorico = document.getElementById('btnLimparHistorico');
const btnCopiarHistorico = document.getElementById('btnCopiarHistorico');
const btnExportarHistorico = document.getElementById('btnExportarHistorico');
const sliderHistorico = document.getElementById('sliderHistorico');
const valorSliderHistorico = document.getElementById('valorSliderHistorico');
const statusIA = document.getElementById('statusIA');
const modoIAPlenoInput = document.getElementById('modoIAPleno');
const btnAbrirHistorico = document.getElementById('btnAbrirHistorico');
const btnFecharModal = document.getElementById('btnFecharModal');
const modalHistorico = document.getElementById('modalHistorico');
const modalIA = document.getElementById('modalIA');
const btnFecharModalIA = document.getElementById('btnFecharModalIA');
const conteudoIA = document.getElementById('conteudoIA');
const containerIAPleno = document.getElementById('containerIAPleno');
const btnEstrategias = document.getElementById('btnEstrategias');
const modalEstrategias = document.getElementById('modalEstrategias');
const btnFecharModalEstrategias = document.getElementById('btnFecharModalEstrategias');
const btnPlanilhasMain = document.getElementById('btnPlanilhasMain');
const btnGestao = document.getElementById('btnGestao');
const modalGestao = document.getElementById('modalGestao');
const btnFecharModalGestao = document.getElementById('btnFecharModalGestao');
const stopWinInput = document.getElementById('stopWinInput');
const stopLossInput = document.getElementById('stopLossInput');
const btnSalvarGestao = document.getElementById('btnSalvarGestao');
const btnLimparGestao = document.getElementById('btnLimparGestao');
const btnGestaoMain = document.getElementById('btnGestaoMain');
const modalArquivosGestao = document.getElementById('modalArquivosGestao');
const btnFecharModalArquivos = document.getElementById('btnFecharModalArquivos');
const iframeGestao = document.getElementById('iframeGestao');
const btnVerPlanilha = document.getElementById('btnVerPlanilha');
const btnVerGestao = document.getElementById('btnVerGestao');
const saldoAtual = document.getElementById('saldoAtual');
const btnReativarGestao = null; // Removido botão de reativar individual

// Theme Modal
const btnTema = document.getElementById('btnTema');
const modalTema = document.getElementById('modalTema');
const btnFecharModalTema = document.getElementById('btnFecharModalTema');

// Novos Elementos para o Histórico de Apostas
const btnHistoricoApostas = document.getElementById('btnHistoricoApostas');
const modalHistoricoApostas = document.getElementById('modalHistoricoApostas');
const btnFecharModalApostas = document.getElementById('btnFecharModalApostas');
const btnLimparHistoricoApostas = document.getElementById('btnLimparHistoricoApostas');
const listaHistoricoApostas = document.getElementById('listaHistoricoApostas');

// Controle de Pausas e Estados de Aposta Dinâmica
let aguardandoProximaRodada = false;
let pauseWinAtivo = false;
let rodasAguardando = 0;
let rodadasEsperaFuncionario = 5; // A estratégia do Funcionário do Mês exige 5 rodadas de análise na mesa antes do 1º gatilho
let rodadaAlvoFuncionario = null;

// ===== SISTEMA DE AUTENTICAÇÃO =====
let usuarioLogado = null;
let heartbeatTimer = null;

async function tentarLoginComRetry(email, senha) {
  let tentativa = 0;
  let ultimoErro = null;
  while (tentativa < 3) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) {
        const msg = (error?.error_description || error?.message || '').toLowerCase();
        if (msg.includes('invalid') || msg.includes('credenciais') || msg.includes('senha')) {
          throw new Error('Erro 7002');
        }
        ultimoErro = error;
      } else {
        return { data };
      }
    } catch (e) {
      ultimoErro = e;
    }
    await new Promise(r => setTimeout(r, 400 * (tentativa + 1)));
    tentativa += 1;
  }
  if (ultimoErro && typeof ultimoErro.message === 'string' && ultimoErro.message.startsWith('Erro 7002')) {
    throw ultimoErro;
  }
  throw new Error('Erro 7002');
}

// Função para testar conectividade com Supabase
async function testarConectividadeSupabase() {
  try {
    console.log('🔍 Testando conectividade com Supabase...');
    
    // Teste simples: Verificar se a URL base está acessível
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📡 Status da resposta:', response.status);
    
    if (response.ok || response.status === 404) {
      // 404 é normal para a rota raiz, significa que o servidor está respondendo
      console.log('✅ Conectividade com Supabase OK');
      return true;
    } else {
      console.warn('⚠️ Problema de conectividade com Supabase:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro de conectividade com Supabase:', error);
    
    // Verificar se é erro de CORS ou rede
    if (error.message.includes('Failed to fetch')) {
      console.error('❌ Erro de rede ou CORS detectado');
    }
    
    return false;
  }
}

async function startHeartbeat(user, clientInstanceId) {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  
  // Testar conectividade antes de iniciar
  const conectividade = await testarConectividadeSupabase();
  if (!conectividade) {
    console.warn('⚠️ Conectividade com Supabase falhou. Tentando novamente em 30s...');
    setTimeout(() => startHeartbeat(user, clientInstanceId), 30000);
    return;
  }
  
  heartbeatTimer = setInterval(async () => {
    try {
      // 1. Verificar se a sessão ainda pertence a esta instância
      const { data, error } = await supabase
        .from('usuarios')
        .select('active_client_id')
        .eq('id', user.id);
      
      if (error) {
        console.warn('⚠️ Erro ao verificar sessão no heartbeat:', error);
        return;
      }

      const res = Array.isArray(data) ? data : (data ? [data] : []);
      const dbClientId = res[0]?.active_client_id;
      
      if (dbClientId && dbClientId !== clientInstanceId) {
        console.warn('⚠️ Sessão assumida por outro local. Deslogando...');
        if (heartbeatTimer) clearInterval(heartbeatTimer);
        await supabase.auth.signOut();
        usuarioLogado = null;
        
        // Limpar storage local para garantir que não tente auto-login
        chrome.storage.local.remove(['supabase_token', 'supabase_user', 'supabase_refresh_token'], () => {
          window.location.reload(); // Recarrega para forçar tela de login limpa
        });
        return;
      }

      // 2. Atualizar pulsação
      const now = new Date().toISOString();
      
      // Tentar atualizar metadata do usuário
      const metaResult = await supabase.auth.updateUserMetadata({ active_updated_at: now });
      if (metaResult.error) {
        console.warn('⚠️ Erro ao atualizar metadata do usuário:', metaResult.error);
      }
      
      // Tentar atualizar tabela de usuários
      const updateResult = await supabase.from('usuarios').update({ active_updated_at: now }).eq('id', user.id);
      if (updateResult.error) {
        console.warn('⚠️ Erro ao atualizar tabela de usuários:', updateResult.error);
      }
      
    } catch (e) {
      console.error('❌ Erro no heartbeat:', e);
      
      // Se for erro de conectividade, tentar reconectar na próxima iteração
      if (e.message && e.message.includes('Failed to fetch')) {
        console.warn('⚠️ Problema de conectividade detectado. Tentando novamente em 15s...');
      }
    }
  }, 15000); // A cada 15 segundos
}

async function executarValidacoesSeguranca(user) {
  try {
    const installationId = await obterOuCriarInstallationIdLocal();
    const clientInstanceId = await obterOuCriarClientInstanceIdLocal();

    let userStatus = null;
    let installationFeatureAtiva = true;

    // 1. Verificar status do usuário e ID de Máquina (HWID)
    const { data: userData, error: userStatusError } = await supabase
      .from('usuarios')
      .select('active, installation_id, active_client_id, active_updated_at, data_vencimento')
      .eq('id', user.id);

    if (userStatusError) {
      const erroTexto = `${userStatusError.message || JSON.stringify(userStatusError)}`.toLowerCase();
      if (erroTexto.includes('installation_id') || erroTexto.includes('column') || erroTexto.includes('does not exist') || erroTexto.includes('coluna')) {
        installationFeatureAtiva = false;
        console.warn('⚠️ Colunas de segurança não encontradas no Supabase.');
      } else {
        throw new Error('Erro 7008');
      }
    }

    const uData = Array.isArray(userData) ? userData : (userData ? [userData] : []);
    userStatus = uData.length > 0 ? uData[0] : null;

    // Trava: Usuário Inativo
    if (userStatus && userStatus.active === false) {
      await supabase.auth.signOut();
      throw new Error('Erro 7008');
    }

    // Trava: ID de Máquina Diferente
    if (installationFeatureAtiva && userStatus && userStatus.installation_id && userStatus.installation_id !== installationId) {
      console.warn('⚠️ HWID Bloqueado. DB:', userStatus.installation_id, 'Local:', installationId);
      await supabase.auth.signOut();
      throw new Error('Erro 7008');
    }

    // Trava: Local Simultâneo (active_client_id)
    if (userStatus && userStatus.active_client_id && userStatus.active_client_id !== clientInstanceId) {
      if (userStatus.active_updated_at) {
        const ultimaBatida = new Date(userStatus.active_updated_at).getTime();
        const agora = new Date().getTime();
        const diferencaSegundos = (agora - ultimaBatida) / 1000;

        console.log('🔄 Verificando simultaneidade. Diff segs:', diferencaSegundos);

        // Se a última atividade foi há menos de 45 segundos, bloqueamos
        if (diferencaSegundos < 45) {
          console.warn('⚠️ Acesso simultâneo detectado. Bloqueando instância atual.');
          await supabase.auth.signOut();
          throw new Error('Erro 7008');
        }
      }
    }

    // Trava: Data de Vencimento
    const dataVencimento = userStatus?.data_vencimento;
    if (dataVencimento) {
      const hoje = new Date();
      const vencimento = new Date(dataVencimento.includes('T') ? dataVencimento : dataVencimento + 'T23:59:59');
      if (hoje > vencimento) {
        console.warn('⚠️ Acesso expirado. Vencimento:', dataVencimento);
        await supabase.auth.signOut();
        throw new Error('Erro 7009'); // Código customizado para expirado
      }
    }

    // 2. Se passou nas travas, atualizar IDs para esta instância
    const nowIso = new Date().toISOString();
    const payload = { 
      active_client_id: clientInstanceId, 
      active_updated_at: nowIso 
    };
    
    if (installationFeatureAtiva && (!userStatus || !userStatus.installation_id)) {
      payload.installation_id = installationId;
    }

    const { data: updRes, error: updErr } = await supabase
      .from('usuarios')
      .update(payload)
      .eq('id', user.id);

    // Se o registro não existir na tabela 'usuarios', criar
    const nadaAtualizado = !updErr && (!updRes || (Array.isArray(updRes) && updRes.length === 0));
    if (nadaAtualizado || updErr) {
      await supabase
        .from('usuarios')
        .insert({ 
          id: user.id, 
          email: user.email || null, 
          installation_id: installationId, 
          active_client_id: clientInstanceId, 
          active_updated_at: nowIso 
        });
    }

    // 3. Atualizar user_metadata para redundância
    await supabase.auth.updateUserMetadata({
      active_client_id: clientInstanceId,
      active_installation_id: installationId,
      active_updated_at: nowIso
    });

    return { success: true, clientInstanceId, installationFeatureAtiva };
  } catch (e) {
    console.error('❌ Falha na validação de segurança:', e);
    throw e;
  }
}

async function verificarAutenticacao() {
  const { data } = await supabase.auth.getSession();
  const user = data.session?.user;

  if (!user) {
    mostrarTelaLogin();
  } else {
    try {
      // Tentar renovar a sessão proativamente ao abrir o bot
      console.log('🔄 Renovando sessão proativa...');
      await supabase.auth.refreshSession();
      
      // EXECUTAR VALIDAÇÃO RÍGIDA ANTES DE ABRIR O BOT
      const { clientInstanceId, installationFeatureAtiva } = await executarValidacoesSeguranca(user);
      
      usuarioLogado = user;
      mostrarTelaPrincipal();
      carregarEstrategiasUI();
      startHeartbeat(usuarioLogado, clientInstanceId);

      if (!installationFeatureAtiva) {
        mostrarNotificacao('⚠️ Segurança Simultânea desativada: Execute o script SQL no Supabase.', 'aviso', 8000);
      }
    } catch (erro) {
      console.error('Sessão inválida:', erro);
      mostrarTelaLogin();
      
      const msg = document.getElementById('loginMensagem');
      if (msg) {
        msg.textContent = 'Login feito em outro dispositivo. Por favor contacte o suporte';
        msg.classList.add('erro');
      }
    }
  }
}

async function carregarEstrategiasUI() {
  // Carregar e popular as estratégias liberadas para o usuário
  const estrategiasLiberadas = await carregarEstrategias();
  if (estrategiasLiberadas && estrategiasLiberadas.length > 0) {
    if (modoIAPlenoInput) {
  modoIAPlenoInput.addEventListener('change', (e) => {
    state.modoIAPleno = e.target.value;
    saveState();
    mostrarNotificacao(`🎯 I.A Fortuna X: Modo ${e.target.value.toUpperCase()} ativado`, 'sucesso', 2000);
  });
}

if (btnFecharModalSimulacao) {
  btnFecharModalSimulacao.addEventListener('click', () => {
    if (modalSimulacao) modalSimulacao.style.display = 'none';
  });
}

if (selecaoEstrategia) {
      selecaoEstrategia.innerHTML = ''; // Limpar
      
      // Adicionar Desativada em cima
      const optDesativada = document.createElement('option');
      optDesativada.value = 'manual';
      optDesativada.textContent = '🔴 Desativada';
      selecaoEstrategia.appendChild(optDesativada);
      
      // Adicionar Gatilhos de aposta
      const optGatilhos = document.createElement('option');
      optGatilhos.value = '';
      optGatilhos.textContent = '🔴 Gatilhos de aposta';
      selecaoEstrategia.appendChild(optGatilhos);
      
      // Ordem específica desejada
      const ordemEspecifica = [
        '3, 2, 1',
        'Funcionário do Mês',
        'Números Quentes',
        'Números Frios',
        'Números Quentes e Frios',
        'Vizinhos da C2',
        'Vizinho dos 30',
        'Zonas 1, 2, 3, 4'
      ];
      
      // Separar estratégias na ordem específica
      const estrategiasOrdenadas = [];
      
      // Adicionar na ordem específica
      ordemEspecifica.forEach(nomeDesejado => {
        const est = estrategiasLiberadas.find(e => e.nome.includes(nomeDesejado));
        if (est) {
          estrategiasOrdenadas.push(est);
        }
      });
      
      // Adicionar estratégias restantes (que não estão na ordem específica)
      estrategiasLiberadas.forEach(est => {
        if (!estrategiasOrdenadas.includes(est)) {
          estrategiasOrdenadas.push(est);
        }
      });
      
      estrategiasOrdenadas.forEach(est => {
        const option = document.createElement('option');
        option.value = est.id;

        // Armazenar os dados brutos da estratégia no dataset para fácil acesso posterior
        option.dataset.nome = est.nome;
        option.dataset.legendas = JSON.stringify(est.legendas || []);
        option.dataset.gatilhos = JSON.stringify(est.gatilhos || []);

        option.textContent = est.nome;
        selecaoEstrategia.appendChild(option);
      });

      // Restaurar estratégia previamente salva no Local Storage
      const savedStrategy = state.estrategiaSelecionada;
      const existeNaLista = Array.from(selecaoEstrategia.options).some(opt => opt.value === savedStrategy);

      if (savedStrategy !== undefined && existeNaLista) {
        selecaoEstrategia.value = savedStrategy;
      } else {
        selecaoEstrategia.value = ''; // Deixar em Gatilhos de aposta
      }

      const event = new Event('change');
      selecaoEstrategia.dispatchEvent(event);

      // Restaurar parâmetros de Quentes/Frios se existirem
      if (state.configQuentesFrios) {
        if (inputQtdQuentes) inputQtdQuentes.value = state.configQuentesFrios.qtdQuentes || 0;
        if (inputQtdFrios) inputQtdFrios.value = state.configQuentesFrios.qtdFrios || 0;
        if (inputQtdVizinhos) inputQtdVizinhos.value = state.configQuentesFrios.qtdVizinhos || 0;
        
        if (tipoProgressaoQF && state.configQuentesFrios.tipo) {
            tipoProgressaoQF.value = state.configQuentesFrios.tipo.toLowerCase();
            tipoProgressaoQF.dispatchEvent(new Event('change'));
            
            if (state.configQuentesFrios.multiplicadores && state.configQuentesFrios.multiplicadores.length > 0) {
                if (sliderQuantidadeQF) {
                    sliderQuantidadeQF.value = state.configQuentesFrios.multiplicadores.length;
                    sliderQuantidadeQF.dispatchEvent(new Event('input'));
                    
                    setTimeout(() => {
                        state.configQuentesFrios.multiplicadores.forEach((mult, index) => {
                            const slider = document.querySelector(`#slidersFichasQF div:nth-child(${index+1}) input`);
                            const span = document.getElementById(`valorFichaQF${index}`);
                            if (slider && span) {
                                slider.value = mult;
                                span.textContent = `X${mult}`;
                                window.valoresFichasQF[index] = mult;
                            }
                        });
                    }, 50);
                }
            }
        }
      }
    }
    
    // Carregar estratégias manuais para seleção múltipla
    carregarEstrategiasMultiplas(estrategiasLiberadas);
    
    // Atualizar destaque das estratégias múltiplas
    atualizarDestaqueEstrategiasMultiplas();
  } else {
    mostrarNotificacao('Nenhuma estratégia liberada para sua conta.', 'aviso', 5000);
    if (selecaoEstrategia) {
      selecaoEstrategia.innerHTML = '<option value="">Nenhuma estratégia disponível</option>';
    }
  }
}

// Carregar estratégias manuais (excluindo as dinâmicas e I.A)
function carregarEstrategiasMultiplas(estrategiasLiberadas) {
  const estrategiasPrecriadas = ['👔 Funcionário do Mês', '🔥 Números Quentes', '❄️ Números Frios', '🔥❄️ Números Quentes e Frios', 'I.A Fortuna X', 'IA Engine'];
  
  // Filtrar apenas estratégias COMUNS (baseadas em gatilhos de sequência)
  const estrategiasManuals = estrategiasLiberadas.filter(est => {
    // 1. Excluir pré-criadas por nome
    if (estrategiasPrecriadas.some(nome => est.nome.includes(nome))) return false;
    
    // 2. Verificar se a estratégia é dinâmica ou I.A via gatilhos
    const gatilhos = est.gatilhos || [];
    const isDinamica = gatilhos.some(g => {
      // Caso 1: Estrutura do modal de admin.html
      const isIA_Admin = g.configEspecial && (g.configEspecial.tipo === 'IA_ENGINE' || g.configEspecial.tipo === 'IA_PLENO');
      const apostaEm = Array.isArray(g.apostaEm) ? g.apostaEm : [];
      const isAuto_Admin = apostaEm.some(tag => ['IA_DYNAMIC', 'DYNAMIC_FUNCIONARIO', 'QUENTES', 'FRIOS', 'AMBOS', 'FUNCIONARIO_MES'].includes(tag));
      
      // Caso 2: Estrutura da página estrategias.html
      const isDinamica_Page = g.modo === 'DINAMICA';
      const isIA_Page = g.tipoEspecial && ['IA_ENGINE', 'IA_PLENO', 'IA_FORTUNA_X'].includes(g.tipoEspecial);
      
      return isIA_Admin || isAuto_Admin || isDinamica_Page || isIA_Page;
    });
    
    return !isDinamica; // Retorna true apenas se NÃO for dinâmica
  });
  
  const containerMultiplas = document.getElementById('listaEstrategiasMultiplas');
  const configMultiplas = document.getElementById('configEstrategiasMultiplas');
  
  if (!containerMultiplas || !configMultiplas) return;
  
  // Mostrar/esconder a seção de múltiplas estratégias
  if (estrategiasManuals.length > 0) {
    configMultiplas.style.display = 'block';
    containerMultiplas.innerHTML = '';
    
    estrategiasManuals.forEach((est, index) => {
      const labelWrapper = document.createElement('div');
      labelWrapper.id = `estrategia-multipla-${est.id}`;
      labelWrapper.style.cssText = 'display: flex; align-items: center; margin-bottom: 8px; cursor: pointer; color: #fff; padding: 5px; border-radius: 4px; transition: all 0.3s;';
      
      const label = document.createElement('label');
      label.style.cssText = 'display: flex; align-items: center; margin: 0; cursor: pointer; color: #fff; width: 100%;';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = est.id;
      checkbox.dataset.nome = est.nome;
      checkbox.dataset.estrategiaId = est.id;
      checkbox.style.cssText = 'margin-right: 8px; cursor: pointer; width: 16px; height: 16px;';
      
      // Restaurar seleção anterior se existir
      if (state.estrategiasMultiplasIds && state.estrategiasMultiplasIds.includes(est.id)) {
        checkbox.checked = true;
      }
      
      checkbox.addEventListener('change', () => {
        salvarEstrategiasMultiplas();
      });
      
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(est.nome));
      labelWrapper.appendChild(label);
      containerMultiplas.appendChild(labelWrapper);
    });
  } else {
    configMultiplas.style.display = 'none';
  }
}


// Salvar estratégias múltiplas selecionadas
function salvarEstrategiasMultiplas() {
  const checkboxes = document.querySelectorAll('#listaEstrategiasMultiplas input[type="checkbox"]');
  const selecionadas = [];
  const nomesSelecionados = [];
  
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      selecionadas.push(checkbox.value);
      nomesSelecionados.push(checkbox.dataset.nome);
    }
  });
  
  state.estrategiasMultiplasIds = selecionadas;
  state.estrategiasMultiplasNomes = nomesSelecionados;
  
  saveState();
  
  // Se há estratégias múltiplas selecionadas, ir para Desativada (manual)
  if (selecionadas.length > 0) {
    selecaoEstrategia.value = 'manual'; // Ir para Desativada
    selecaoEstrategia.disabled = true; // Desabilitar select
    state.estrategiaSelecionada = 'manual';
    saveState();
    
    // Disparar evento de mudança para atualizar visibilidade
    const event = new Event('change');
    selecaoEstrategia.dispatchEvent(event);
  } else {
    // Se não há selecionadas, habilitar o select
    selecaoEstrategia.disabled = false;
  }
  
  console.log('✅ Estratégias múltiplas salvas:', nomesSelecionados);
  mostrarNotificacao(`✅ ${selecionadas.length} estratégia(s) selecionada(s)`, 'sucesso', 2000);
}

function mostrarTelaLogin() {
  document.getElementById('telaLogin').style.display = 'flex';
  document.querySelector('.container').style.display = 'none';
}

function mostrarTelaPrincipal() {
  document.getElementById('telaLogin').style.display = 'none';
  document.querySelector('.container').style.display = 'flex';
  document.getElementById('btnLogout').style.display = 'block';
}

async function gerarInstallationIdLocal() {
  try {
    const platformInfo = await new Promise((resolve) => chrome.runtime.getPlatformInfo(resolve));
    const os = platformInfo?.os || '';
    const arch = platformInfo?.arch || '';
    const lang = navigator.language || '';
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || '';
    const cores = (navigator.hardwareConcurrency || 0).toString();
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

function obterOuCriarInstallationIdLocal() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['installation_id'], async (result) => {
      if (result.installation_id) {
        resolve(result.installation_id);
        return;
      }
      const novoId = await gerarInstallationIdLocal();
      chrome.storage.local.set({ installation_id: novoId }, () => resolve(novoId));
    });
  });
}

function gerarClientInstanceIdLocal() {
  if (crypto && crypto.randomUUID) return `FRT-CLIENT-${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
  return `FRT-CLIENT-${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`.slice(0, 16 + 8);
}

function obterOuCriarClientInstanceIdLocal() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['client_instance_id'], (result) => {
      if (result.client_instance_id) {
        resolve(result.client_instance_id);
        return;
      }
      const novoId = gerarClientInstanceIdLocal();
      chrome.storage.local.set({ client_instance_id: novoId }, () => resolve(novoId));
    });
  });
}

// removido: exibição de perfil do usuário no sidepanel

// Função de visibilidade consolidada movida para o final do arquivo (linha 1817+)

// Verificar autenticação ao carregar
verificarAutenticacao();

// Re-verificar segurança quando o painel ganha foco (opcional, mas reforça)
window.addEventListener('focus', () => {
  if (usuarioLogado) {
    verificarAutenticacao();
  }
});

// ===== EVENTOS DE LOGIN =====
document.getElementById('formLogin').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const senha = document.getElementById('loginSenha').value;
  const msg = document.getElementById('loginMensagem');

  try {
    const { data } = await tentarLoginComRetry(email, senha);
    const user = data.user;

    // EXECUTAR TODAS AS VALIDAÇÕES DE SEGURANÇA (HWID E SIMULTÂNEO)
    const { clientInstanceId, installationFeatureAtiva } = await executarValidacoesSeguranca(user);

    usuarioLogado = user;
    msg.textContent = 'Login realizado!';
    msg.classList.remove('erro');
    msg.classList.add('sucesso');

    console.log('✅ Tudo verificado com sucesso!');

    setTimeout(async () => {
      mostrarTelaPrincipal();
      carregarEstrategiasUI();
      startHeartbeat(usuarioLogado, clientInstanceId);
      
      if (!installationFeatureAtiva) {
        mostrarNotificacao('⚠️ Segurança Simultânea desativada: Execute o script SQL no Supabase.', 'aviso', 8000);
      }
    }, 1000);
  } catch (erro) {
    const raw = typeof erro?.message === 'string' ? erro.message : '';
    const match = raw.match(/7\d{3}/);
    const codigoErro = match ? match[0] : '7000';
    if (codigoErro === '7008') {
      mostrarNotificacao('Login feito em outro dispositivo. Por favor contacte o suporte', 'erro', 8000);
      msg.textContent = 'Acesso simultâneo bloqueado';
      msg.classList.remove('sucesso');
      msg.classList.add('erro');
    } else if (codigoErro === '7009') {
      mostrarNotificacao('Acesso expirado. Renove sua assinatura.', 'erro', 8000);
      msg.textContent = 'Assinatura Expirada';
      msg.classList.remove('sucesso');
      msg.classList.add('erro');
    } else {
      msg.textContent = codigoErro;
      msg.classList.remove('sucesso');
      msg.classList.add('erro');
    }
  }
});

document.getElementById('btnLogout').addEventListener('click', async () => {
  await supabase.auth.signOut();
  usuarioLogado = null;
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
  }
  mostrarTelaLogin();
});

// Event listener para atualizar dados do banco
const btnAtualizarDados = document.getElementById('btnAtualizarDados');
if (btnAtualizarDados) {
  btnAtualizarDados.addEventListener('click', async () => {
    // Adicionar animação de rotação
    btnAtualizarDados.style.animation = 'spin 1s linear';
    
    try {
      // Recarregar estratégias do banco
      await carregarEstrategiasUI();
      mostrarNotificacao('✅ Dados atualizados com sucesso!', 'sucesso', 2000);
    } catch (erro) {
      console.error('Erro ao atualizar dados:', erro);
      mostrarNotificacao('❌ Erro ao atualizar dados', 'erro', 3000);
    } finally {
      // Remover animação
      btnAtualizarDados.style.animation = 'none';
    }
  });
}

// ===== CARREGAR ESTRATÉGIAS =====
async function carregarEstrategias() {
  try {
    // 1. Garantir que a sessão está válida
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
    if (sessionErr || !sessionData?.session) {
      console.warn('⚠️ Sessão inválida ou expirada. Redirecionando para login.');
      mostrarTelaLogin();
      return [];
    }
    usuarioLogado = sessionData.session.user;

    // 2. Buscar as relações na tabela usuario_estrategias (usando QueryBuilder para auto-refresh)
    console.log('🔄 Buscando estratégias liberadas para o usuário...', usuarioLogado.id);
    const relResponse = await supabase
      .from('usuario_estrategias')
      .select('estrategia_id')
      .eq('usuario_id', usuarioLogado.id)
      .execute();

    if (relResponse.error) {
      console.error("❌ Erro ao buscar permissões:", relResponse.error);
      throw relResponse.error;
    }

    const relacoes = Array.isArray(relResponse.data) ? relResponse.data : (relResponse.data ? [relResponse.data] : []);
    if (relacoes.length === 0) {
      console.log('ℹ️ Nenhuma estratégia liberada para este usuário.');
      return [];
    }

    // 3. Obter os IDs das estratégias autorizadas
    const estrategiaIds = relacoes.map(r => r.estrategia_id);
    console.log('🔑 IDs autorizados:', estrategiaIds);

    // 4. Buscar detalhes das estratégias (usando QueryBuilder.in para auto-refresh)
    const estrategiasResponse = await supabase
      .from('estrategias')
      .select('*')
      .in('id', estrategiaIds)
      .order('nome', { ascending: true })
      .execute();

    if (estrategiasResponse.error) {
      console.error("❌ Erro ao buscar detalhes das estratégias:", estrategiasResponse.error);
      throw estrategiasResponse.error;
    }

    const estrategias = estrategiasResponse.data || [];
    console.log('📥 Estratégias detalhadas carregadas:', estrategias.length);
    return estrategias;

  } catch (erro) {
    console.error('❌ Erro crítico ao carregar estratégias:', erro);
    // Se for erro de autenticação, o QueryBuilder já tentou refresh e falhou.
    return [];
  }
}

// ===== SALVAR ESTRATÉGIA =====
async function salvarEstrategia(nome, legendas, gatilhos) {
  try {
    const { data, error } = await supabase
      .from('estrategias')
      .insert([{ usuario_id: usuarioLogado.id, nome, legendas, gatilhos }]);

    if (error) throw error;
    console.log('✅ Estratégia salva:', data);
    return data;
  } catch (erro) {
    console.error('Erro ao salvar estratégia:', erro);
  }
}

// ===== CONFIGURAÇÃO DE SEGURANÇA =====
const USER_NEKOT = 'FRT-6MBE4FM9P-MMPILUIE';

// ===== ATUALIZAR ESTRATÉGIA =====
async function atualizarEstrategia(id, nome, legendas, gatilhos) {
  try {
    const { data, error } = await supabase
      .from('estrategias')
      .update({ nome, legendas, gatilhos })
      .eq('id', id);

    if (error) throw error;
    console.log('✅ Estratégia atualizada:', data);
    return data;
  } catch (erro) {
    console.error('Erro ao atualizar estratégia:', erro);
  }
}

// ===== DELETAR ESTRATÉGIA =====
async function deletarEstrategia(id) {
  try {
    const { error } = await supabase
      .from('estrategias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('✅ Estratégia deletada');
  } catch (erro) {
    console.error('Erro ao deletar estratégia:', erro);
  }
}

// ===== DELETAR ESTRATÉGIA =====
async function deletarEstrategia(id) {
  try {
    const { error } = await supabase
      .from('estrategias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    console.log('✅ Estratégia deletada');
  } catch (erro) {
    console.error('Erro ao deletar estratégia:', erro);
  }
}

// Variáveis globais para compartilhamento com outros scripts
window.historicoRodadasGlobal = [];

// Armazenar valores dos sliders de fichas
let valoresFichas = [];

// Rastreamento de apostas ativas
let apostaAtiva = null; // Armazena a aposta atual em processamento
let galeAtual = 0; // Qual GALE/CICLO estamos (0 = primeira aposta, 1 = segundo gale, etc)

// Rastreamento de sequências para gatilhos
let sequenciaAtual = []; // Últimos números que saíram
const TAMANHO_SEQUENCIA_MAX = 10; // Manter histórico dos últimos 10 números

// PAUSE WIN
let pauseWinConfig = 1; // Configuração de quantas rodadas aguardar (padrão 1)

// Estado da aplicação
let state = {
  wins: 0,
  losses: 0,
  placar: 'WIN',
  legendas: [],
  gatilhos: [],
  manualLegendas: [],
  manualGatilhos: [],
  estrategiaSelecionada: '',
  nomeEstrategiaSelecionada: '',
  numerosFixosFuncionario: '',
  configQuentesFrios: {
    qtdQuentes: 3,
    qtdFrios: 3,
    qtdVizinhos: 2
  },
  telegramToken: '',
  telegramChatId: '',
  stopWin: 0,
  stopLoss: 0,
  valorFicha: 1.00, // Valor da ficha em R$
  maxRodadasHistorico: 500, // Limite de análise do histórico
  modoIAPleno: 'moderado', // moderado, intermediario, agressivo
  historicoRodadas: [], // Array de números que saíram
  estrategiasMultiplasIds: [], // IDs das estratégias selecionadas
  estrategiasMultiplasNomes: [] // Nomes das estratégias selecionadas
};

let stateAnterior = JSON.parse(JSON.stringify(state));
let temAlteracoes = false;
let editandoLegenda = null;
let editandoGatilho = null;

// Carregar estado salvo
chrome.storage.local.get(['rouletteState', 'historicoRodadas'], (result) => {
  if (result.rouletteState) {
    state = { ...state, ...result.rouletteState };
    stateAnterior = JSON.parse(JSON.stringify(state));
    updateDisplay();
    atualizarListaLegendas();
    atualizarListaGatilhos();
    atualizarListaNumerosFixos();
    atualizarListaHistorico();
    
    if (state.estrategiaSelecionada && selecaoEstrategia) {
      selecaoEstrategia.value = state.estrategiaSelecionada;
      atualizarVisibilidadeEstrategia(state.nomeEstrategiaSelecionada || '');
    }
    
    // Desabilitar select se houver estratégias múltiplas selecionadas
    if (state.estrategiasMultiplasIds && state.estrategiasMultiplasIds.length > 0) {
      selecaoEstrategia.disabled = true;
      selecaoEstrategia.value = '';
    }
    
    // Carregar config Quentes Frios
    if (result.rouletteState.configQuentesFrios) {
        if (inputQtdQuentes) inputQtdQuentes.value = result.rouletteState.configQuentesFrios.qtdQuentes || 0;
        if (inputQtdFrios) inputQtdFrios.value = result.rouletteState.configQuentesFrios.qtdFrios || 0;
        if (inputQtdVizinhos) inputQtdVizinhos.value = result.rouletteState.configQuentesFrios.qtdVizinhos || 0;
        
        if (tipoProgressaoQF && result.rouletteState.configQuentesFrios.tipo) {
            tipoProgressaoQF.value = result.rouletteState.configQuentesFrios.tipo.toLowerCase();
            tipoProgressaoQF.dispatchEvent(new Event('change'));
            
            if (result.rouletteState.configQuentesFrios.multiplicadores && result.rouletteState.configQuentesFrios.multiplicadores.length > 0) {
                if (sliderQuantidadeQF) {
                    sliderQuantidadeQF.value = result.rouletteState.configQuentesFrios.multiplicadores.length;
                    sliderQuantidadeQF.dispatchEvent(new Event('input'));
                    
                    setTimeout(() => {
                        result.rouletteState.configQuentesFrios.multiplicadores.forEach((mult, index) => {
                            const slider = document.querySelector(`#slidersFichasQF div:nth-child(${index+1}) input`);
                            const span = document.getElementById(`valorFichaQF${index}`);
                            if (slider && span) {
                                slider.value = mult;
                                span.textContent = `X${mult}`;
                                window.valoresFichasQF[index] = mult;
                            }
                        });
                    }, 50);
                }
            }
        }
    }

    // Carregar PAUSE WIN se existir
    if (result.rouletteState.pauseWin && pauseWinInput) {
      pauseWinConfig = result.rouletteState.pauseWin;
      pauseWinInput.value = pauseWinConfig;
    }

    // Carregar Números Fixos (Funcionário) se existir
    if (result.rouletteState.numerosFixosFuncionario !== undefined && inputNumerosFixos) {
      inputNumerosFixos.value = result.rouletteState.numerosFixosFuncionario;
    }

    // Carregar Seletor de Rodadas (Slider)
    if (state.maxRodadasHistorico !== undefined && sliderHistorico) {
      sliderHistorico.value = state.maxRodadasHistorico;
      if (valorSliderHistorico) {
        valorSliderHistorico.textContent = state.maxRodadasHistorico;
      }
    }

    // Carregar config do Telegram
    if (result.rouletteState.telegramToken !== undefined && telegramTokenInput) {
      telegramTokenInput.value = result.rouletteState.telegramToken;
      state.telegramToken = result.rouletteState.telegramToken;
    }
    if (result.rouletteState.telegramChatId !== undefined && telegramChatIdInput) {
      telegramChatIdInput.value = result.rouletteState.telegramChatId;
      state.telegramChatId = result.rouletteState.telegramChatId;
    }
  }

  // Carregar histórico de rodadas se existir
  if (result.historicoRodadas && result.historicoRodadas.length > 0) {
    console.log('📊 Carregando histórico de rodadas:', result.historicoRodadas.length);
    state.historicoRodadas = result.historicoRodadas;
    atualizarListaHistorico();
  }
  
  // Sempre ativar modo simulação ao inicializar o bot
  chrome.storage.local.get(['modoSimulacaoAtivo', 'saldoSimulacao', 'valorFichaSimulacao'], (simResult) => {
    const saldoAtual = simResult.saldoSimulacao !== undefined ? simResult.saldoSimulacao : 100.00;
    const fichaAtual = simResult.valorFichaSimulacao !== undefined ? simResult.valorFichaSimulacao : 0.50;
    
    chrome.storage.local.set({
      modoSimulacaoAtivo: true,
      saldoSimulacao: saldoAtual,
      valorFichaSimulacao: fichaAtual
    }, () => {
      // Atualizar o toggle do header após salvar
      const toggleSimulacaoHeader = document.getElementById('toggleSimulacaoHeader');
      if (toggleSimulacaoHeader) {
        toggleSimulacaoHeader.checked = true;
      }
      console.log('🧪 Modo simulação ativado automaticamente ao inicializar');
    });
  });
});

// Listener para PAUSE WIN
if (pauseWinInput) {
  pauseWinInput.addEventListener('change', (e) => {
    pauseWinConfig = parseInt(e.target.value) || 1;
    state.pauseWin = pauseWinConfig;
    marcarAlteracao();
    saveState();
    console.log(`⏸️ [PAUSE WIN] Configurado para ${pauseWinConfig} rodada(s) (visual) = ${pauseWinConfig + 1} (lógica)`);
    mostrarNotificacao(`⏸️ PAUSE WIN configurado para ${pauseWinConfig} rodada(s)`, 'sucesso', 2000);
  });
}

// Receber mensagens do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('📨 [SIDEPANEL] Mensagem recebida:', request);

  if (request.tipo === 'atualizarHistorico' || request.tipo === 'novo_numero_roleta') {
    adicionarNumeroAoHistorico(request.numero);
    mostrarNotificacao(`🎲 Número ${request.numero} adicionado ao histórico`, 'sucesso', 2000);
    if (document.getElementById('modalHistorico')?.style.display === 'flex') {
      atualizarListaHistorico();
    }
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'aposta_contagem_rodadas') {
    mostrarNotificacao(`⏳ Aguardando ${request.rodadas} rodada(s)...`, 'aviso', 2000);
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, request).catch(() => {});
      }
    });
    updateDisplay();
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'status_ia_atualizar') {
    if (statusIA) {
      statusIA.style.display = 'block';
      statusIA.textContent = request.texto;
    }
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'aposta_contagem') {
    if (request.segundos > 0) {
      mostrarNotificacao(`🚀 Apostando em ${request.segundos}s...`, 'sucesso', 1500);
    }
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, request).catch(() => {});
      }
    });
    updateDisplay();
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'debug_alerta') {
    mostrarNotificacao(request.mensagem, 'aviso', 3000);
    // Tentar atualizar o status na UI principal se houver um campo para isso
    const statusIA = document.getElementById('statusIA');
    if (statusIA) {
      statusIA.textContent = request.mensagem;
      statusIA.style.display = 'block';
    }
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'historico_carregado' || request.tipo === 'historico_500') {
    chrome.storage.local.get(['historicoRodadas'], (result) => {
      if (result.historicoRodadas) {
        state.historicoRodadas = result.historicoRodadas;
        atualizarListaHistorico();
        mostrarNotificacao(`✅ Histórico carregado com ${result.historicoRodadas.length} números!`, 'sucesso', 3000);
      }
    });
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'mostrar_notificacao') {
    mostrarNotificacao(request.texto, request.classe, request.tempo);
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'atualizar_simulacao') {
    // Se estivermos em modo simulação, o placar do sidepanel deve refletir o simulado
    chrome.storage.local.get(['modoSimulacaoAtivo'], (result) => {
      if (result.modoSimulacaoAtivo) {
        state.wins = request.placar.wins;
        state.losses = request.placar.losses;
        updateDisplay();
      }
    });
    sendResponse({ recebido: true });
    return;
  }

  if (request.tipo === 'atualizar_saldo') {
    const saldoRecebido = request.saldo;
    if (!saldoRecebido || saldoRecebido <= 0) {
      sendResponse({ recebido: true });
      return;
    }
    ultimoSaldoPush = saldoRecebido;
    
    // Atualizar UI de saldo
    const saldoAtualEl = document.getElementById('saldoAtual');
    if (saldoAtualEl) {
      saldoAtualEl.textContent = `R$ ${saldoRecebido.toFixed(2).replace('.', ',')}`;
    }
    
    sendResponse({ recebido: true });
    return;
  }

  sendResponse({ recebido: true });
  return;

});

// Listener para atualizar histórico em tempo real
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes.historicoRodadas) {
    console.log('📊 [SIDEPANEL] Histórico atualizado no storage:', changes.historicoRodadas.newValue.length);
    state.historicoRodadas = changes.historicoRodadas.newValue || [];
    atualizarListaHistorico();

    // Se o modal está aberto, atualizar também
    const modalHistorico = document.getElementById('modalHistorico');
    if (modalHistorico && modalHistorico.style.display === 'flex') {
      console.log('📊 [SIDEPANEL] Atualizando modal em tempo real...');
      atualizarListaHistorico();
    }
  }
});

// ============================================
// TELEGRAM INTEGRATION
// ============================================

async function sendTelegramMessage(message) {
  if (!state.telegramToken || !state.telegramChatId) return false;

  // Obter saldo atual e adicionar à mensagem
  const saldoAtual = await obterSaldoAtual();
  let mensagemComSaldo = message;
  
  if (saldoAtual > 0) {
    mensagemComSaldo += `\n\n💰 <b>Saldo Atual:</b> R$ ${saldoAtual.toFixed(2)}`;
  }
  
  return await enviarTelegramInterno(mensagemComSaldo);
}

async function enviarTelegramInterno(message) {
  if (!state.telegramToken || !state.telegramChatId) return false;

  const url = `https://api.telegram.org/bot${state.telegramToken}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chat_id: state.telegramChatId,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Falha ao enviar mensagem para Telegram:', errorText);
      mostrarNotificacao('❌ Erro API Telegram. Verifique Token e Chat ID.', 'erro', 4000);
      return false;
    }
    return true;
  } catch (error) {
    console.error('❌ Erro na requisição do Telegram:', error);
    mostrarNotificacao('❌ Erro de Conexão com Telegram.', 'erro', 4000);
    return false;
  }
}

if (btnTelegram && modalTelegram && btnFecharModalTelegram) {
  btnTelegram.addEventListener('click', () => {
    // Preencher campos com dados salvos
    if (telegramTokenInput) telegramTokenInput.value = state.telegramToken || "";
    if (telegramChatIdInput) telegramChatIdInput.value = state.telegramChatId || "";
    
    modalTelegram.style.display = 'flex';
  });

  btnFecharModalTelegram.addEventListener('click', () => {
    modalTelegram.style.display = 'none';
  });

  // Fechar ao clicar fora do modal
  modalTelegram.addEventListener('click', (e) => {
    if (e.target === modalTelegram) {
      modalTelegram.style.display = 'none';
    }
  });
}

if (btnTestarTelegram) {
  btnTestarTelegram.addEventListener('click', async () => {
    const token = telegramTokenInput ? telegramTokenInput.value.trim() : "";
    const chatId = telegramChatIdInput ? telegramChatIdInput.value.trim() : "";

    if (!token || !chatId) {
      mostrarNotificacao('❌ Preencha Token e Chat ID.', 'erro', 3000);
      return;
    }

    const oldToken = state.telegramToken;
    const oldChatId = state.telegramChatId;
    
    // Temporariamente define no state para o teste
    state.telegramToken = token;
    state.telegramChatId = chatId;

    mostrarNotificacao('⏳ Enviando teste pro Telegram...', 'info', 2000);
    
    try {
      const success = await sendTelegramMessage('🤖 <b>Fortuna X</b>: Conexão do Telegram estabelecida com sucesso!\nStatus: 🟢 ONLINE');

      if (success) {
        mostrarNotificacao('✅ Mensagem de teste enviada com sucesso!', 'sucesso', 3000);
      }
    } catch (e) {
      console.error('Erro no teste de Telegram:', e);
    } finally {
      // Restaura o estado anterior (importante para não salvar sem o clique no botão salvar)
      state.telegramToken = oldToken;
      state.telegramChatId = oldChatId;
    }
  });
}

if (btnSalvarTelegram) {
  btnSalvarTelegram.addEventListener('click', () => {
    if (telegramTokenInput && telegramChatIdInput) {
      state.telegramToken = telegramTokenInput.value.trim();
      state.telegramChatId = telegramChatIdInput.value.trim();
      marcarAlteracao();
      saveState();
      mostrarNotificacao('✅ Configurações do Telegram Salvas!', 'sucesso', 3000);
      modalTelegram.style.display = 'none';
    }
  });
}

// ============================================
// SISTEMA DE NOTIFICAÇÕES
// ============================================

function mostrarNotificacao(mensagem, tipo = 'info', duracao = 3000) {
  if (!notificacoesContainer) return;
  const notif = document.createElement('div');
  notif.className = `notificacao ${tipo}`;
  notif.textContent = mensagem;

  notificacoesContainer.appendChild(notif);

  setTimeout(() => {
    notif.classList.add('removendo');
    setTimeout(() => {
      notif.remove();
    }, 300);
  }, duracao);
}

// ============================================
// DETECTAR ALTERAÇÕES
// ============================================

function marcarAlteracao() {
  temAlteracoes = true;
}

function limparAlteracoes() {
  temAlteracoes = false;
  stateAnterior = JSON.parse(JSON.stringify(state));
}

// Auxiliares de Lógica Especial: Quentes/Frios
function calcularQuentesFrios(tipoDadoNoGatilho) { // Ex: 'QUENTES', 'FRIOS', 'AMBOS'
  const slider = document.getElementById('sliderHistorico');
  const maxRodadas = slider ? parseInt(slider.value) : 500;
  const historicoRecortado = state.historicoRodadas.slice(0, maxRodadas);

  if (historicoRecortado.length === 0) return [];

  // Pegar config do painel da extensão
  const inputQtdQuentes = document.getElementById('inputQtdQuentes');
  const inputQtdFrios = document.getElementById('inputQtdFrios');
  const inputQtdVizinhos = document.getElementById('inputQtdVizinhos');
  
  console.log('🔍 DEBUG - inputQtdQuentes value:', inputQtdQuentes?.value);
  console.log('🔍 DEBUG - inputQtdFrios value:', inputQtdFrios?.value);
  console.log('🔍 DEBUG - inputQtdVizinhos value:', inputQtdVizinhos?.value);
  console.log('🔍 DEBUG - state.configQuentesFrios:', state.configQuentesFrios);
  
  // Usar o valor do input se estiver preenchido (mesmo que seja 0), senão usar o state
  let confQtdQuentes = inputQtdQuentes?.value !== '' ? parseInt(inputQtdQuentes?.value) : (state.configQuentesFrios ? state.configQuentesFrios.qtdQuentes : 3);
  let confQtdFrios = inputQtdFrios?.value !== '' ? parseInt(inputQtdFrios?.value) : (state.configQuentesFrios ? state.configQuentesFrios.qtdFrios : 3);
  let confQtdViz = inputQtdVizinhos?.value !== '' ? parseInt(inputQtdVizinhos?.value) : (state.configQuentesFrios ? state.configQuentesFrios.qtdVizinhos : 2);

  console.log('🔥❄️ DEBUG - confQtdQuentes:', confQtdQuentes);
  console.log('🔥❄️ DEBUG - confQtdFrios:', confQtdFrios);
  console.log('🔥❄️ DEBUG - confQtdViz:', confQtdViz);

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

  let pivosFormatados = [];

  if (tipoDadoNoGatilho === 'QUENTES' || tipoDadoNoGatilho === 'AMBOS') {
    const pivosQuentes = rankingQuentes.slice(0, confQtdQuentes).map(item => item.numero);
    pivosFormatados = pivosFormatados.concat(pivosQuentes);
  }

  if (tipoDadoNoGatilho === 'FRIOS' || tipoDadoNoGatilho === 'AMBOS') {
    const pivosFrios = rankingFrios.slice(0, confQtdFrios).map(item => item.numero);
    pivosFormatados = pivosFormatados.concat(pivosFrios);
  }

  console.log('🔥❄️ DEBUG - pivosFormatados:', pivosFormatados);
  console.log('🔥❄️ DEBUG - confQtdViz antes de retornar:', confQtdViz);

  // Se não há vizinhos, retornar apenas os pivôs
  if (confQtdViz === 0) {
    console.log(`🔥❄️ Gerados ${pivosFormatados.length} números (sem vizinhos) a partir de um range de ${maxRodadas} rodadas.`);
    return [...new Set(pivosFormatados)].sort((a, b) => a - b);
  }

  const apostasFinais = calcularVizinhos(pivosFormatados, confQtdViz);
  console.log(`🔥❄️ Gerados ${apostasFinais.length} números a partir de ${pivosFormatados.length} pivôs extraídos de um range de ${maxRodadas} rodadas.`);

  return apostasFinais;
}

// Detectar alterações ao sair
window.addEventListener('beforeunload', (e) => {
  if (temAlteracoes) {
    e.preventDefault();
    e.returnValue = '';
    mostrarNotificacao('⚠️ Existem alterações sem ser salvas. Deseja realmente sair?', 'aviso', 5000);
  }
});

// Atualizar display
function updateDisplay() {
  const winsEl = document.getElementById('wins');
  const lossesEl = document.getElementById('losses');
  const placarEl = document.getElementById('placar');
  if (winsEl) winsEl.textContent = state.wins;
  if (lossesEl) lossesEl.textContent = state.losses;
  if (placarEl) placarEl.textContent = state.placar;
  
  // Enviar dados para o painel flutuante na mesa
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, {
        action: 'atualizarStatusPainel',
        ativo: !stopAtivado,
        estrategia: state.nomeEstrategiaSelecionada || 'Manual',
        placar: { wins: state.wins, losses: state.losses },
        stopWin: state.stopWin || 0,
        stopLoss: state.stopLoss || 0
      }).catch(() => {
        // Ignorar erros se a aba não responder
      });
    }
  });
}

// ============================================
// LEGENDAS
// ============================================

function atualizarListaLegendas() {
  if (!listaLegendas) return;
  listaLegendas.innerHTML = '';

  const isEstrategiaBanco = state.estrategiaSelecionada && state.estrategiaSelecionada !== '';

  state.legendas.forEach((item, index) => {
    const li = document.createElement('li');
    let conteudoHTML = '';
    if (isEstrategiaBanco) {
      conteudoHTML = `<strong>${item.nome}</strong>`;
    } else {
      conteudoHTML = `<strong>${item.nome}</strong>: ${item.numeros.join(', ')}`;
    }

    li.innerHTML = `
      ${conteudoHTML}
      <div style="float: right; display: ${isEstrategiaBanco ? 'none' : 'flex'}; gap: 5px;" class="botoes-acao-legenda">
        <button class="btn-editar-legenda" style="background: #4444ff; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Editar</button>
        <button class="btn-deletar-legenda" style="background: #ff4444; color: white; border: none; padding: 3px 8px; border-radius: 3px; cursor: pointer; font-size: 11px;">Deletar</button>
      </div>
    `;

    li.querySelector('.btn-editar-legenda').addEventListener('click', (ev) => {
      ev.stopPropagation();
      editandoLegenda = index;
      if (legenda) legenda.value = item.nome;
      if (numeros) numeros.value = item.numeros.join(' ');
      if (legenda) legenda.focus();
      mostrarNotificacao('✏️ Editando legenda. Clique em ADICIONAR para salvar.', 'info', 3000);
    });

    li.querySelector('.btn-deletar-legenda').addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (confirm('Deseja realmente deletar esta legenda?')) {
        state.legendas.splice(index, 1);
        marcarAlteracao();
        saveState();
        atualizarListaLegendas();
        mostrarNotificacao('🗑️ Legenda deletada', 'sucesso', 2000);
      }
    });

    listaLegendas.appendChild(li);
  });

  atualizarVisibilidadeEstrategia(state.estrategiaSelecionada);
}

function adicionarLegenda() {
  const nomeLegenda = legenda ? legenda.value.trim() : "";
  const numerosStr = numeros ? numeros.value.trim() : "";

  if (!nomeLegenda || !numerosStr) {
    mostrarNotificacao('❌ Preencha nome e números/áreas', 'erro', 2000);
    return;
  }

  // Aceitar números, dúzias (D1, D2, D3) e colunas (C1, C2, C3)
  const itensArray = numerosStr
    .split(/[\s,]+/) // Dividir por espaço ou vírgula
    .map(item => {
      item = item.trim();
      // Tentar converter para número
      const num = parseInt(item);
      if (!isNaN(num) && num >= 0 && num <= 36) {
        return num; // Retornar como número inteiro
      }
      // Retornar como string (para D1, D2, D3, C1, C2, C3)
      return item.toUpperCase();
    })
    .filter(item => {
      // Validar números (0-36)
      if (typeof item === 'number') {
        return item >= 0 && item <= 36;
      }
      // Validar dúzias (D1, D2, D3)
      if (/^D[123]$/.test(item)) {
        return true;
      }
      // Validar colunas (C1, C2, C3)
      if (/^C[123]$/.test(item)) {
        return true;
      }
      return false;
    });

  if (itensArray.length === 0) {
    mostrarNotificacao('❌ Números/áreas inválidos. Use: 0-36, D1-D3, C1-C3', 'erro', 3000);
    return;
  }

  console.log('📝 [LEGENDA] Adicionando legenda:', {
    nome: nomeLegenda,
    itens: itensArray,
    tipos: itensArray.map(i => typeof i)
  });

  if (editandoLegenda !== null) {
    state.legendas[editandoLegenda] = { nome: nomeLegenda, numeros: itensArray };
    mostrarNotificacao('✅ Legenda atualizada', 'sucesso', 2000);
    editandoLegenda = null;
  } else {
    state.legendas.push({ nome: nomeLegenda, numeros: itensArray });
    mostrarNotificacao('✅ Legenda adicionada', 'sucesso', 2000);
  }

  marcarAlteracao();
  saveState();
  atualizarListaLegendas();
  
  // Limpar campos
  if (legenda) legenda.value = '';
  if (numeros) numeros.value = '';
  
  // Manter a visibilidade dos campos de legenda e gatilho
  const configLegendas = document.getElementById('configLegendas');
  const configGatilhos = document.getElementById('configGatilhos');
  if (configLegendas) configLegendas.style.display = 'block';
  if (configGatilhos) configGatilhos.style.display = 'block';
}

// ============================================
// GATILHOS DE LEGENDAS
// ============================================

function atualizarListaGatilhos() {
  if (!listaGatilhosLegendas) return;
  listaGatilhosLegendas.innerHTML = '';

  const isEstrategiaBanco = state.estrategiaSelecionada && state.estrategiaSelecionada !== '';

  state.gatilhos.forEach((item, index) => {
    const li = document.createElement('li');
    const conteudo = document.createElement('span');
    const estrategia = item.estrategia || 'SIMPLES';
    let multiplicadoresInfo = '';

    // Mostrar multiplicadores se for GALE ou CICLO
    if (item.estrategia === 'GALE' && item.gales && item.gales.length > 0) {
      multiplicadoresInfo = ` [${item.gales.map(f => `X${f}`).join(', ')}]`;
    } else if (item.estrategia === 'CICLO' && item.ciclos && item.ciclos.length > 0) {
      multiplicadoresInfo = ` [${item.ciclos.map(f => `X${f}`).join(', ')}]`;
    }

    // Mostrar aposta em
    const apostaEmTexto = item.apostaEm ? item.apostaEm.join(', ') : 'N/A';

    // Obter o nome do gatilho (fallback para propriedades antigas/diferentes do Admin Panel)
    const nomeGatilho = item.nome ||
      (item.legendas && Array.isArray(item.legendas) ? item.legendas.join(' ') : null) ||
      item.legenda ||
      'Gatilho Customizado';

    if (isEstrategiaBanco) {
      conteudo.innerHTML = `<strong>Gatilho:</strong> ${nomeGatilho}`;
    } else {
      conteudo.innerHTML = `<strong>Gatilho:</strong> ${nomeGatilho} → <strong>Aposta em:</strong> ${apostaEmTexto} [${estrategia}]${multiplicadoresInfo}`;
    }

    const botoes = document.createElement('div');
    botoes.style.display = isEstrategiaBanco ? 'none' : 'flex';
    botoes.style.gap = '5px';
    botoes.className = 'botoes-acao-gatilho';

    const btnEditar = document.createElement('button');
    btnEditar.className = 'btn-editar-gatilho';
    btnEditar.textContent = 'Editar';
    btnEditar.style.background = '#4444ff';
    btnEditar.style.color = 'white';
    btnEditar.style.border = 'none';
    btnEditar.style.padding = '3px 8px';
    btnEditar.style.borderRadius = '3px';
    btnEditar.style.cursor = 'pointer';
    btnEditar.style.fontSize = '11px';

    const btnDeletar = document.createElement('button');
    btnDeletar.className = 'btn-deletar-gatilho';
    btnDeletar.textContent = 'Deletar';
    btnDeletar.style.background = '#ff4444';
    btnDeletar.style.color = 'white';
    btnDeletar.style.border = 'none';
    btnDeletar.style.padding = '3px 8px';
    btnDeletar.style.borderRadius = '3px';
    btnDeletar.style.cursor = 'pointer';
    btnDeletar.style.fontSize = '11px';

    botoes.appendChild(btnEditar);
    botoes.appendChild(btnDeletar);

    li.appendChild(conteudo);
    li.appendChild(botoes);

    // ✅ ADICIONAR CLASSE DE ESTADO VISUAL
    if (apostaAtiva && apostaAtiva.gatilho.nome === item.nome) {
      // Gatilho está em aposta - VERDE
      li.classList.add('gatilho-apostando');
    } else if (item.ativo !== false) {
      // Gatilho está ativo - DOURADO
      li.classList.add('gatilho-ativo');
    } else {
      // Gatilho está inativo - APAGADO
      li.classList.add('gatilho-inativo');
    }

    // ✅ ADICIONAR CLICK HANDLER PARA ATIVAR/DESATIVAR
    conteudo.addEventListener('click', (ev) => {
      ev.stopPropagation();

      // Toggle ativo/inativo
      item.ativo = item.ativo === false ? true : false;
      marcarAlteracao();
      saveState();
      atualizarListaGatilhos();

      const status = item.ativo ? '✅ Ativado' : '❌ Desativado';
      mostrarNotificacao(`${status}: ${item.nome}`, 'info', 2000);
      
      // Manter a visibilidade dos campos de legenda e gatilho
      const configLegendas = document.getElementById('configLegendas');
      const configGatilhos = document.getElementById('configGatilhos');
      if (configLegendas) configLegendas.style.display = 'block';
      if (configGatilhos) configGatilhos.style.display = 'block';
    });

    btnEditar.addEventListener('click', (ev) => {
      ev.stopPropagation();
      editandoGatilho = index;
      if (gatilhoLegendas) gatilhoLegendas.value = item.nome;
      if (apostaLegendas) apostaLegendas.value = item.apostaEm.join(', ');
      if (tipoGatilho) tipoGatilho.value = item.estrategia.toLowerCase();

      // Mostrar configuração se for Gale ou Ciclo
      if (item.estrategia === 'GALE' || item.estrategia === 'CICLO') {
        if (configGaleCiclo) configGaleCiclo.style.display = 'block';
        const multiplicadores = item.estrategia === 'GALE' ? item.gales : item.ciclos;
        const quantidade = multiplicadores ? multiplicadores.length : 1;
        if (sliderQuantidade) sliderQuantidade.value = quantidade;
        if (quantidadeGaleCicloSpan) quantidadeGaleCicloSpan.textContent = quantidade;
        atualizarSlidersFichas(quantidade);

        // Restaurar valores dos multiplicadores
        if (multiplicadores) {
          multiplicadores.forEach((valor, i) => {
            const slider = slidersFichas ? slidersFichas.querySelectorAll('input[type="range"]')[i] : null;
            if (slider) {
              slider.value = valor;
              valoresFichas[i] = valor;
              const valorFichaSpan = document.getElementById(`valorFicha${i}`);
              if (valorFichaSpan) valorFichaSpan.textContent = `X${valor}`;
            }
          });
        }
      } else {
        if (configGaleCiclo) configGaleCiclo.style.display = 'none';
      }

      if (gatilhoLegendas) gatilhoLegendas.focus();
      mostrarNotificacao('✏️ Editando gatilho. Clique em ADICIONAR GATILHO para salvar.', 'info', 3000);
    });

    btnDeletar.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (confirm('Deseja realmente deletar este gatilho?')) {
        state.gatilhos.splice(index, 1);
        marcarAlteracao();
        saveState();
        atualizarListaGatilhos();
        mostrarNotificacao('🗑️ Gatilho deletado', 'sucesso', 2000);
      }
    });

    listaGatilhosLegendas.appendChild(li);
  });

  // Não chamar atualizarVisibilidadeEstrategia aqui para não esconder os campos
  // Se for modo Gatilhos, manter sempre visível
  const estrategiaSelecionada = state.estrategiaSelecionada || '';
  if (estrategiaSelecionada.includes('Gatilhos') || estrategiaSelecionada.includes('Manual')) {
    const configLegendas = document.getElementById('configLegendas');
    const configGatilhos = document.getElementById('configGatilhos');
    if (configLegendas) configLegendas.style.display = 'block';
    if (configGatilhos) configGatilhos.style.display = 'block';
  }
}

// ============================================
// NÚMEROS FIXOS (FUNCIONÁRIO DO MÊS)
// ============================================

function atualizarListaNumerosFixos() {
  if (!listaNumerosFixos) return;
  listaNumerosFixos.innerHTML = '';

  if (!state.numerosFixosFuncionario || state.numerosFixosFuncionario.trim() === '') {
    return; // Lista vazia
  }

  const li = document.createElement('li');
  li.style.display = 'flex';
  li.style.justifyContent = 'space-between';
  li.style.alignItems = 'center';
  li.style.padding = '8px';
  li.style.background = '#444';
  li.style.borderRadius = '4px';
  li.style.marginBottom = '5px';
  li.style.borderLeft = '3px solid #ff9800';

  const span = document.createElement('span');
  span.innerHTML = `<strong>Apostando em Todas as Rodadas:</strong> ${state.numerosFixosFuncionario}`;

  const botoes = document.createElement('div');
  const btnDeletar = document.createElement('button');
  btnDeletar.textContent = 'Deletar';
  btnDeletar.style.background = '#ff4444';
  btnDeletar.style.color = 'white';
  btnDeletar.style.border = 'none';
  btnDeletar.style.padding = '3px 8px';
  btnDeletar.style.borderRadius = '3px';
  btnDeletar.style.cursor = 'pointer';
  btnDeletar.style.fontSize = '11px';

  btnDeletar.addEventListener('click', (ev) => {
    ev.stopPropagation();
    state.numerosFixosFuncionario = '';
    marcarAlteracao();
    saveState();
    atualizarListaNumerosFixos();
    mostrarNotificacao('🗑️ Números fixos removidos', 'sucesso', 2000);
    if (inputNumerosFixos) inputNumerosFixos.value = '';
  });

  botoes.appendChild(btnDeletar);
  li.appendChild(span);
  li.appendChild(botoes);

  listaNumerosFixos.appendChild(li);
}

function adicionarNumerosFixos() {
  const strNumeros = inputNumerosFixos ? inputNumerosFixos.value.trim() : "";
  if (!strNumeros) {
    mostrarNotificacao('❌ Digite os números (ex: 0 32 15)', 'erro', 2000);
    return;
  }

  // Extrair números baseados em regex para separar garantidamente e não falhar na conversão
  const numCheck = strNumeros.split(/[\s,]+/).map(n => parseInt(n)).filter(n => !isNaN(n) && n >= 0 && n <= 36);
  if (numCheck.length === 0) {
    mostrarNotificacao('❌ Números inválidos. Devem ser de 0 a 36.', 'erro', 3000);
    return;
  }

  // Salva no formato bonito apenas com os números válidos
  state.numerosFixosFuncionario = numCheck.join(', ');
  marcarAlteracao();
  saveState();
  atualizarListaNumerosFixos();

  if (inputNumerosFixos) inputNumerosFixos.value = '';
  mostrarNotificacao(`✅ Salvos ${numCheck.length} número(s) fixo(s)`, 'sucesso', 2000);
}

if (btnAdicionarNumerosFixos) {
  btnAdicionarNumerosFixos.addEventListener('click', adicionarNumerosFixos);
}

function adicionarGatilho() {
  const gatilhoNome = gatilhoLegendas ? gatilhoLegendas.value.trim() : "";
  const apostaEm = apostaLegendas ? apostaLegendas.value.trim() : "";
  const tipo = tipoGatilho ? tipoGatilho.value : "simples";

  if (!gatilhoNome || !apostaEm) {
    mostrarNotificacao('❌ Preencha legenda(s) e aposta em', 'erro', 2000);
    return;
  }

  // Permitir múltiplas legendas separadas por espaço (ex: "DZ1 DZ2 DZ1")
  const legendasNomes = gatilhoNome
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  if (legendasNomes.length === 0) {
    mostrarNotificacao('❌ Preencha pelo menos uma legenda', 'erro', 2000);
    return;
  }

  // Validar que todas as legendas existem
  const legendasEncontradas = [];
  for (const nomeLegenda of legendasNomes) {
    console.log(`🔍 Procurando legenda: "${nomeLegenda}"`);
    console.log(`📋 Legendas disponíveis:`, state.legendas.map(l => `"${l.nome}"`));

    const legendaObj = state.legendas.find(leg => leg.nome === nomeLegenda);
    if (!legendaObj) {
      mostrarNotificacao(`❌ Legenda "${nomeLegenda}" não encontrada`, 'erro', 2000);
      console.log('❌ Legendas disponíveis:', state.legendas.map(l => l.nome));
      return;
    }
    legendasEncontradas.push(legendaObj);
    console.log(`✅ Legenda encontrada: ${nomeLegenda} com números: ${legendaObj.numeros}`);
  }

  // Validar apostaEm - pode ser D1, D2, D3, C1, C2, C3, números ou nomes de legendas
  const apostaEmArray = apostaEm
    .split(/[\s,]+/)
    .map(item => item.trim())
    .filter(item => {
      if (!item) return false;
      // Validar dúzias
      if (/^D[123]$/i.test(item)) return true;
      // Validar colunas
      if (/^C[123]$/i.test(item)) return true;
      // Validar números
      const num = parseInt(item);
      if (!isNaN(num) && num >= 0 && num <= 36) return true;
      // Validar se é uma legenda existente
      const legendaExiste = state.legendas.some(leg => leg.nome.toUpperCase() === item.toUpperCase());
      if (legendaExiste) return true;

      return false;
    });

  if (apostaEmArray.length === 0) {
    mostrarNotificacao('❌ Aposta em inválida. Use: D1-D3, C1-C3, ou números 0-36', 'erro', 3000);
    return;
  }

  console.log('📝 [GATILHO] Criando gatilho com sequência:', {
    legendas: legendasNomes,
    apostaEm: apostaEmArray,
    estrategia: tipo
  });

  // Criar novo gatilho com estrutura de sequência
  const novoGatilho = {
    id: 'gatilho-' + Date.now(),
    nome: legendasNomes.join(' '), // Nome da sequência (ex: "DZ1 DZ2 DZ1")
    legendas: legendasNomes, // Array de nomes de legendas na sequência
    legendasObjetos: legendasEncontradas, // Array de objetos legenda com números
    apostaEm: apostaEmArray, // O que apostar (D1, D2, D3, C1, C2, C3, ou números)
    estrategia: tipo.toUpperCase(),
    ativo: true,
    isSequencia: true // Flag para indicar que é uma sequência
  };

  // Se for Gale ou Ciclo, adicionar os multiplicadores
  if (tipo === 'gale' && valoresFichas.length > 0) {
    novoGatilho.gales = [...valoresFichas];
  } else if (tipo === 'ciclo' && valoresFichas.length > 0) {
    novoGatilho.ciclos = [...valoresFichas];
  }

  if (editandoGatilho !== null) {
    state.gatilhos[editandoGatilho] = novoGatilho;
    mostrarNotificacao('✅ Gatilho atualizado', 'sucesso', 2000);
    editandoGatilho = null;
  } else {
    state.gatilhos.push(novoGatilho);
    mostrarNotificacao('✅ Gatilho adicionado', 'sucesso', 2000);
  }

  marcarAlteracao();
  saveState();
  atualizarListaGatilhos();
  
  // Limpar campos
  if (gatilhoLegendas) gatilhoLegendas.value = '';
  if (apostaLegendas) apostaLegendas.value = '';
  if (tipoGatilho) tipoGatilho.value = 'simples';
  if (configGaleCiclo) configGaleCiclo.style.display = 'none';
  valoresFichas = [];
  
  // Manter a visibilidade dos campos de legenda e gatilho
  const configLegendas = document.getElementById('configLegendas');
  const configGatilhos = document.getElementById('configGatilhos');
  if (configLegendas) configLegendas.style.display = 'block';
  if (configGatilhos) configGatilhos.style.display = 'block';
}

// ============================================
// CONTROLAR VISIBILIDADE POR ESTRATÉGIA
// ============================================

function atualizarVisibilidadeEstrategia(nomeEstrategia) {
  console.log('👁️ [UI] Atualizando visibilidade para:', nomeEstrategia);
  
  const configLegendas = document.getElementById('configLegendas');
  const configGatilhos = document.getElementById('configGatilhos');
  const configNumerosFixos = document.getElementById('configNumerosFixos');
  const configQuentesFrios = document.getElementById('configQuentesFrios');
  const containerQtdQuentes = document.getElementById('containerQtdQuentes');
  const containerQtdFrios = document.getElementById('containerQtdFrios');

  // Habilitar opção SIMPLES por padrão
  const tipoProgressaoQFReset = document.getElementById('tipoProgressaoQF');
  if (tipoProgressaoQFReset) {
    const optSimplesReset = tipoProgressaoQFReset.querySelector('option[value="simples"]');
    if (optSimplesReset) optSimplesReset.disabled = false;
  }
  
  // Esconder tudo primeiro por padrão
  if (configLegendas) configLegendas.style.display = 'none';
  if (configGatilhos) configGatilhos.style.display = 'none';
  if (configNumerosFixos) configNumerosFixos.style.display = 'none';
  if (configFuncionarioMes) configFuncionarioMes.style.display = 'none';
  if (configQuentesFrios) configQuentesFrios.style.display = 'none';
  if (containerQtdQuentes) containerQtdQuentes.style.display = 'none';
  if (containerQtdFrios) containerQtdFrios.style.display = 'none';

  // Se for Modo Manual (Gatilhos de aposta)
  if (nomeEstrategia === 'Gatilhos' || nomeEstrategia === 'Manual' || nomeEstrategia.includes('Gatilhos de aposta')) {
    if (configLegendas) configLegendas.style.display = 'block';
    if (configGatilhos) configGatilhos.style.display = 'block';
    return;
  }

  // Se for Desativada, não mostra nada extra
  if (nomeEstrategia === 'manual' || nomeEstrategia.includes('Desativada')) {
    return;
  }

  // Estratégias Dinâmicas
  if (nomeEstrategia.includes('Funcionário do Mês')) {
    if (configNumerosFixos) configNumerosFixos.style.display = 'block';
    if (configFuncionarioMes) configFuncionarioMes.style.display = 'block';
  } else if (nomeEstrategia.includes('Quentes e Frios')) {
    if (configQuentesFrios) configQuentesFrios.style.display = 'block';
    if (containerQtdQuentes) containerQtdQuentes.style.display = 'block';
    if (containerQtdFrios) containerQtdFrios.style.display = 'block';
    const tipoProgressaoQF = document.getElementById('tipoProgressaoQF');
    if (tipoProgressaoQF) {
      const optSimples = tipoProgressaoQF.querySelector('option[value="simples"]');
      if (optSimples) optSimples.disabled = true;
      if (tipoProgressaoQF.value === 'simples') tipoProgressaoQF.value = 'gale';
    }
  } else if (nomeEstrategia.includes('Quentes')) {
    if (configQuentesFrios) configQuentesFrios.style.display = 'block';
    if (containerQtdQuentes) containerQtdQuentes.style.display = 'block';
    const tipoProgressaoQF = document.getElementById('tipoProgressaoQF');
    if (tipoProgressaoQF) {
      const optSimples = tipoProgressaoQF.querySelector('option[value="simples"]');
      if (optSimples) optSimples.disabled = true;
      if (tipoProgressaoQF.value === 'simples') tipoProgressaoQF.value = 'gale';
    }
  } else if (nomeEstrategia.includes('Frios')) {
    if (configQuentesFrios) configQuentesFrios.style.display = 'block';
    if (containerQtdFrios) containerQtdFrios.style.display = 'block';
    const tipoProgressaoQF = document.getElementById('tipoProgressaoQF');
    if (tipoProgressaoQF) {
      const optSimples = tipoProgressaoQF.querySelector('option[value="simples"]');
      if (optSimples) optSimples.disabled = true;
      if (tipoProgressaoQF.value === 'simples') tipoProgressaoQF.value = 'gale';
    }
  }
}

// Função para monitorar progresso dos gatilhos e destacar estratégias prestes a apostar
function atualizarDestaqueEstrategiasMultiplas() {
  if (!state.estrategiasMultiplasIds || state.estrategiasMultiplasIds.length === 0) return;
  
  // Limpar todos os destaques primeiro
  document.querySelectorAll('[id^="estrategia-multipla-"]').forEach(el => {
    el.classList.remove('estrategia-pronta');
  });
  
  // Verificar cada estratégia múltipla selecionada
  state.estrategiasMultiplasIds.forEach(estrategiaId => {
    const elementoEstrategia = document.getElementById(`estrategia-multipla-${estrategiaId}`);
    if (!elementoEstrategia) return;
    
    const gatilhosDaEstrategia = state.gatilhos.filter(g => g.estrategiaId === estrategiaId || g.nomeEstrategia === estrategiaId);
    let temGatilhoProximo = false;
    
    gatilhosDaEstrategia.forEach(gatilho => {
      if (!gatilho.ativo || !gatilho.isSequencia || !gatilho.legendas) return;
      
      const tamanhoSequencia = gatilho.legendas.length;
      const progressoSequencia = sequenciaAtual.length;
      
      if (progressoSequencia === tamanhoSequencia - 1) {
        let sequenciaCorretaAteAgora = true;
        for (let i = 0; i < progressoSequencia; i++) {
          const numeroSequencia = sequenciaAtual[i];
          const legendaEsperada = gatilho.legendasObjetos[i];
          if (!legendaEsperada || !legendaEsperada.numeros || !legendaEsperada.numeros.includes(numeroSequencia)) {
            sequenciaCorretaAteAgora = false;
            break;
          }
        }
        if (sequenciaCorretaAteAgora) temGatilhoProximo = true;
      }
    });
    
    if (temGatilhoProximo) elementoEstrategia.classList.add('estrategia-pronta');
  });
}

// ============================================
// HISTÓRICO DE RODADAS
// ============================================

// Cores dos números na roleta
const coresNumeros = {
  0: '#00aa00',   // Verde
  1: '#ff0000', 2: '#000000', 3: '#ff0000', 4: '#000000', 5: '#ff0000',
  6: '#000000', 7: '#ff0000', 8: '#000000', 9: '#ff0000', 10: '#000000',
  11: '#000000', 12: '#ff0000', 13: '#000000', 14: '#ff0000', 15: '#000000',
  16: '#ff0000', 17: '#000000', 18: '#ff0000', 19: '#ff0000', 20: '#000000',
  21: '#ff0000', 22: '#000000', 23: '#ff0000', 24: '#000000', 25: '#ff0000',
  26: '#000000', 27: '#ff0000', 28: '#000000', 29: '#000000', 30: '#ff0000',
  31: '#000000', 32: '#ff0000', 33: '#000000', 34: '#ff0000', 35: '#000000',
  36: '#ff0000'
};

// O background script agora é o responsável por verificar gatilhos e resultados.
// O sidepanel apenas escuta as mudanças de estado via chrome.storage.onChanged.
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        if (changes.rouletteState) {
            const newState = changes.rouletteState.newValue;
            // Sincronizar variáveis globais do sidepanel com o estado do background
            state.wins = newState.wins;
            state.losses = newState.losses;
            state.stopAtivado = newState.stopAtivado; // Atualizar o objeto state também!
            state.aguardandoProximaRodada = newState.aguardandoProximaRodada;
            
            pauseWinAtivo = newState.pauseWinAtivo;
            rodasAguardando = newState.rodasAguardando;
            stopAtivado = newState.stopAtivado;
            updateDisplay();
        }
        if (changes.apostaAtiva) {
            apostaAtiva = changes.apostaAtiva.newValue;
            atualizarListaGatilhos();
        }
        if (changes.historicoRodadas) {
            state.historicoRodadas = changes.historicoRodadas.newValue;
            atualizarListaHistorico();
        }
    }
});

function adicionarNumeroAoHistorico(numero) {
  if (numero < 0 || numero > 36) return;
  console.log('➕ [SIDEPANEL] Número recebido:', numero);
  // O background cuida de tudo, apenas logamos aqui se necessário.
}

function atualizarListaHistorico() {
  if (!listaHistorico) return;
  listaHistorico.innerHTML = '';

  // Sincronizar com a variável global para a IA
  window.historicoRodadasGlobal = state.historicoRodadas || [];

  if (state.historicoRodadas.length === 0) {
    listaHistorico.innerHTML = '<p style="text-align: center; color: #888; padding: 20px; grid-column: 1 / -1;">Aguardando números...</p>';
    const totalRodadasEl = document.getElementById('totalRodadas');
    const numerosUnicosEl = document.getElementById('numerosUnicos');
    if (totalRodadasEl) totalRodadasEl.textContent = '0';
    if (numerosUnicosEl) numerosUnicosEl.textContent = '0';
    return;
  }

  const slider = document.getElementById('sliderHistorico');
  const maxRodadas = slider ? parseInt(slider.value) : 500;
  const rodadasExibidas = state.historicoRodadas.slice(0, maxRodadas);

  // Exibir em ordem direta (mais recentes já estão no início do array)
  rodadasExibidas.forEach((numero) => {
    const div = document.createElement('div');
    div.className = 'historico-item';
    div.dataset.numero = numero;

    const cor = coresNumeros[numero] || '#666';
    const corTexto = (numero === 0) ? '#000' : '#fff';

    div.innerHTML = `
      <span style="
        display: flex;
        width: 100%;
        height: 20px;
        background: ${cor};
        color: ${corTexto};
        border-radius: 50%;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        font-size: 9px;
      ">${numero}</span>
    `;

    // Adicionar evento de mouse para destacar números repetidos
    div.addEventListener('mouseenter', (e) => {
      const numeroAtual = e.currentTarget.dataset.numero;
      const todosItems = document.querySelectorAll('.historico-item');
      todosItems.forEach(item => {
        if (item.dataset.numero === numeroAtual) {
          item.classList.add('destaque');
        }
      });
    });

    div.addEventListener('mouseleave', () => {
      const todosItems = document.querySelectorAll('.historico-item');
      todosItems.forEach(item => {
        item.classList.remove('destaque');
      });
    });

    listaHistorico.appendChild(div);
  });

  // Atualizar estatísticas baseadas na seleção do slider
  const totalRodadasEl = document.getElementById('totalRodadas');
  if (totalRodadasEl) totalRodadasEl.textContent = rodadasExibidas.length;

  // Contar números únicos
  const numerosUnicos = new Set(rodadasExibidas).size;
  const numerosUnicosEl = document.getElementById('numerosUnicos');
  if (numerosUnicosEl) numerosUnicosEl.textContent = numerosUnicos;

  // Atualizar Análises Temáticas
  const vermelhosDef = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
  let counts = {
    d1: 0, d2: 0, d3: 0,
    c1: 0, c2: 0, c3: 0,
    alto: 0, baixo: 0,
    par: 0, impar: 0,
    red: 0, black: 0
  };

  let validSpins = 0; // Exclui o Zero (0) para contabilizar as métricas padrão de D/C/Cores

  rodadasExibidas.forEach(num => {
    if (num === 0) return;
    validSpins++;

    // Dúzias
    if (num <= 12) counts.d1++;
    else if (num <= 24) counts.d2++;
    else counts.d3++;

    // Colunas
    if (num % 3 === 1) counts.c1++;
    else if (num % 3 === 2) counts.c2++;
    else counts.c3++;

    // Altos/Baixos
    if (num <= 18) counts.baixo++;
    else counts.alto++;

    // Par/Ímpar
    if (num % 2 === 0) counts.par++;
    else counts.impar++;

    // Cores
    if (vermelhosDef.includes(num)) counts.red++;
    else counts.black++;
  });

  const calcPerc = (count) => validSpins > 0 ? Math.round((count / validSpins) * 100) + '%' : '0%';

  const updateStat = (eltId, count) => {
    const el = document.getElementById(eltId);
    if (el) el.textContent = calcPerc(count);
  };

  updateStat('statD1', counts.d1);
  updateStat('statD2', counts.d2);
  updateStat('statD3', counts.d3);
  updateStat('statC1', counts.c1);
  updateStat('statC2', counts.c2);
  updateStat('statC3', counts.c3);
  updateStat('statPreto', counts.black);
  updateStat('statVermelho', counts.red);
  updateStat('statAlto', counts.alto);
  updateStat('statBaixo', counts.baixo);
  updateStat('statPar', counts.par);
  updateStat('statImpar', counts.impar);
}

function limparHistorico() {
  if (confirm('Deseja realmente limpar todo o histórico de rodadas?')) {
    state.historicoRodadas = [];
    marcarAlteracao();
    saveState();
    atualizarListaHistorico();
    mostrarNotificacao('🗑️ Histórico limpo', 'sucesso', 2000);
  }
}

function copiarHistorico() {
  const numeros = state.historicoRodadas || [];
  if (numeros.length === 0) {
    mostrarNotificacao('⚠️ Histórico vazio', 'aviso', 2000);
    return;
  }
  const texto = numeros.join(', ');
  navigator.clipboard.writeText(texto).then(() => {
    mostrarNotificacao('📋 Histórico copiado!', 'sucesso', 2000);
  });
}

function exportarHistorico() {
  const numeros = state.historicoRodadas || [];
  if (numeros.length === 0) {
    mostrarNotificacao('⚠️ Histórico vazio', 'aviso', 2000);
    return;
  }
  const texto = numeros.join('\n');
  const blob = new Blob([texto], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `historico_fortuna_x_${new Date().getTime()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  mostrarNotificacao('📥 Histórico exportado!', 'sucesso', 2000);
}

// ============================================
// TROCAR DE TELA
// ============================================

function trocarTela(tela) {
  // Função removida - não há múltiplas telas
}

// ============================================
// EVENT LISTENERS - HISTÓRICO
// ============================================

// Modal Estratégias
if (btnEstrategias) {
  btnEstrategias.addEventListener('click', () => {
    if (modalEstrategias) {
      modalEstrategias.style.display = 'flex';
      // Atualizar visibilidade dos campos baseado na estratégia atual
      atualizarVisibilidadeEstrategia(state.nomeEstrategiaSelecionada || '');
    }
  });
}

if (btnFecharModalEstrategias) {
  btnFecharModalEstrategias.addEventListener('click', () => {
    if (modalEstrategias) modalEstrategias.style.display = 'none';
  });
}

if (modalEstrategias) {
  modalEstrategias.addEventListener('click', (e) => {
    if (e.target === modalEstrategias) {
      modalEstrategias.style.display = 'none';
    }
  });
}

if (statusIA) {
  statusIA.addEventListener('click', () => {
    abrirRelatorioIA();
  });
}

function abrirRelatorioIA() {
  if (!modalIA || !conteudoIA) return;
  
  const historico = state.historicoRodadas || [];
  const amostra = state.maxRodadasHistorico || 500;
  const dados = historico.slice(0, amostra);
  
  if (dados.length === 0) {
    mostrarNotificacao('⚠️ Sem dados no histórico para análise', 'aviso', 3000);
    return;
  }

  modalIA.style.display = 'flex';
  
  const calcular = (numeros) => {
    const total = dados.filter(n => numeros.includes(n)).length;
    return ((total / dados.length) * 100).toFixed(1);
  };

  const stats = [
    { nome: '🔴 Vermelho', prob: calcular([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]) },
    { nome: '⚫ Preto', prob: calcular([2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]) },
    { nome: '📊 C1 (Coluna 1)', prob: calcular([1,4,7,10,13,16,19,22,25,28,31,34]) },
    { nome: '📊 C2 (Coluna 2)', prob: calcular([2,5,8,11,14,17,20,23,26,29,32,35]) },
    { nome: '📊 C3 (Coluna 3)', prob: calcular([3,6,9,12,15,18,21,24,27,30,33,36]) },
    { nome: '📦 D1 (1ª Dúzia)', prob: calcular([1,2,3,4,5,6,7,8,9,10,11,12]) },
    { nome: '📦 D2 (2ª Dúzia)', prob: calcular([13,14,15,16,17,18,19,20,21,22,23,24]) },
    { nome: '📦 D3 (3ª Dúzia)', prob: calcular([25,26,27,28,29,30,31,32,33,34,35,36]) },
    { nome: '⭕ Vizinhos do Zero', prob: calcular([22,18,29,7,28,12,35,3,26,0,32,15,19,4,21,2,25]) },
    { nome: '🎭 Órfãos', prob: calcular([1,20,14,31,9,17,34,6]) }
  ];

  let html = `
    <div style="background: #1a1a1a; padding: 15px; border-radius: 8px; border: 1px solid #ff9800; margin-bottom: 15px;">
        <h4 style="color: #ff9800; margin-top: 0; display: flex; justify-content: space-between;">
            Tendência Atual <span>(Amostra: ${dados.length})</span>
        </h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
  `;

  stats.forEach(s => {
    const cor = s.prob > 60 ? '#4caf50' : (s.prob > 45 ? '#ff9800' : '#888');
    html += `
        <div style="background: #252525; padding: 10px; border-radius: 4px; border-left: 3px solid ${cor};">
            <div style="color: #ccc; font-size: 11px;">${s.nome}</div>
            <div style="color: ${cor}; font-size: 16px; font-weight: bold;">${s.prob}%</div>
        </div>
    `;
  });

  html += `
        </div>
    </div>
    <div style="background: rgba(255,152,0,0.1); padding: 10px; border-radius: 4px; border: 1px dashed #ff9800; font-style: italic; font-size: 12px; color: #ff9800; text-align: center;">
        💡 Dica: Configure sua IA no Admin com assertividade próxima aos valores em verde acima para entradas mais rápidas.
    </div>
  `;

  conteudoIA.innerHTML = html;
}

if (btnFecharModalIA) {
  btnFecharModalIA.addEventListener('click', () => {
    if (modalIA) modalIA.style.display = 'none';
  });
}

if (modalIA) {
  modalIA.addEventListener('click', (e) => {
    if (e.target === modalIA) {
      modalIA.style.display = 'none';
    }
  });
}

if (sliderHistorico) {
  sliderHistorico.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    if (valorSliderHistorico) {
      valorSliderHistorico.textContent = val;
    }
    state.maxRodadasHistorico = val;
    saveState();
    atualizarListaHistorico();
  });
}

if (btnAbrirHistorico) {
  btnAbrirHistorico.addEventListener('click', () => {
    atualizarListaHistorico();
    if (modalHistorico) modalHistorico.style.display = 'flex';
  });
}

if (btnFecharModal) {
  btnFecharModal.addEventListener('click', () => {
    if (modalHistorico) modalHistorico.style.display = 'none';
  });
}

// Fechar modal ao clicar fora
if (modalHistorico) {
  modalHistorico.addEventListener('click', (e) => {
    if (e.target === modalHistorico) {
      modalHistorico.style.display = 'none';
    }
  });
}

if (btnLimparHistorico) {
  btnLimparHistorico.addEventListener('click', () => {
    limparHistorico();
  });
}

if (btnCopiarHistorico) {
  btnCopiarHistorico.addEventListener('click', () => {
    copiarHistorico();
  });
}

if (btnExportarHistorico) {
  btnExportarHistorico.addEventListener('click', () => {
    exportarHistorico();
  });
}

// ============================================
// EVENT LISTENERS - GERAIS
// ============================================

if (selecaoEstrategia) {
  selecaoEstrategia.addEventListener('change', (e) => {
    const estrategiaId = e.target.value;

    // Antes de aplicar a nova seleção, se a antiga era Manual, vamos CACHEAR a configuração atual
    if (!state.estrategiaSelecionada || state.estrategiaSelecionada === '') {
      state.manualLegendas = JSON.parse(JSON.stringify(state.legendas || []));
      state.manualGatilhos = JSON.parse(JSON.stringify(state.gatilhos || []));
      console.log('💾 Configuração manual salva em cache de navegação.');
    }

    state.estrategiaSelecionada = estrategiaId;

    // Obter os dados da estratégia a partir da opção selecionada
    const selectedOption = e.target.options[e.target.selectedIndex];

    // Armazenar o nome da estratégia selecionada
    if (selectedOption) {
      state.nomeEstrategiaSelecionada = (selectedOption.dataset.nome || selectedOption.textContent).trim();
    }

    // Resetar status da IA ao trocar de estratégia
    if (statusIA) statusIA.style.display = 'none';
    if (containerIAPleno) containerIAPleno.style.display = 'none';

    // Mostrar IA se o nome contiver "Fortuna" ou "Forttuna"
    if (state.nomeEstrategiaSelecionada.toLowerCase().includes('fortuna') || 
        state.nomeEstrategiaSelecionada.toLowerCase().includes('forttuna')) {
      if (containerIAPleno) containerIAPleno.style.display = 'block';
      if (modoIAPlenoInput) modoIAPlenoInput.value = state.modoIAPleno || 'moderado';
    }

    // Se for modo manual (selecionado vazio), restaurar os arrays do cache manual
    if (!estrategiaId) {
      console.log('✅ [ESTRATÉGIA] Modo Manual ativado. Nenhuma estratégia do banco rodando.');
      state.legendas = Array.isArray(state.manualLegendas) ? JSON.parse(JSON.stringify(state.manualLegendas)) : [];
      state.gatilhos = Array.isArray(state.manualGatilhos) ? JSON.parse(JSON.stringify(state.manualGatilhos)) : [];
      state.nomeEstrategiaSelecionada = 'Gatilhos';
      atualizarListaLegendas();
      atualizarListaGatilhos();
      marcarAlteracao();
      saveState();
      atualizarVisibilidadeEstrategia('Gatilhos');
      return;
    }

    if (selectedOption && selectedOption.dataset) {
      try {
        const legendas = JSON.parse(selectedOption.dataset.legendas || '[]');
        let gatilhosRaw = JSON.parse(selectedOption.dataset.gatilhos || '[]');

        // Normalizar gatilhos originados do banco para a extensão
        const gatilhos = gatilhosRaw.map((g, index) => {
          // Se o gatilho já veio no formato da extensão (já tem .numeros), preserva
          if (g.numeros && Array.isArray(g.numeros)) return g;

          // Transformar legenda listada com espaço/vírgula numa matriz de "numeros" (condição OR - GATILHO)
          let numerosGatilho = [];
          if (g.legenda && typeof g.legenda === 'string') {
            numerosGatilho = g.legenda.split(/[\s,]+/).map(item => {
              let n = parseInt(item);
              if (!isNaN(n) && n >= 0 && n <= 36) return n;
              return item.toUpperCase();
            }).filter(x => x !== undefined && x !== "");
          }

          // Transformar apostaEm em números para apostar (ONDE APOSTAR)
          let numerosApostar = [];
          if (g.apostaEm && Array.isArray(g.apostaEm)) {
            numerosApostar = g.apostaEm.map(item => {
              if (typeof item === 'number') return item;
              let n = parseInt(item);
              if (!isNaN(n) && n >= 0 && n <= 36) return n;
              return String(item).toUpperCase();
            }).filter(x => x !== undefined && x !== "");
          }

          // CONVERTER tipoEspecial do Admin para apostaEm (para estratégias dinâmicas criadas no Admin)
          if (g.tipoEspecial && !g.apostaEm) {
            g.apostaEm = [g.tipoEspecial];
          }

          // Verificar se é um gatilho dinâmico (baseado em tags especiais)
          let isDinamico = false;
          let apostaEmFinal = undefined;
          
          if (Array.isArray(g.apostaEm)) {
            const joinTexto = g.apostaEm.join(' ').toUpperCase();
            // Verificar se contém tags dinâmicas
            if (['FUNCIONARIO_MES', 'QUENTES', 'FRIOS', 'AMBOS', 'VIZINHOS_C1', 'VIZINHOS_C2', 'VIZINHOS_C3', 'VIZINHO_30', 'ZONAS'].some(tag => joinTexto.includes(tag))) {
              isDinamico = true;
              apostaEmFinal = g.apostaEm; // Manter as tags dinâmicas
            } else {
              // Não é dinâmico, usar os números de apostaEm
              apostaEmFinal = numerosApostar;
            }
          }

          let isGale = g.tipo === 'GALE' || g.tipoSecundario === 'GALE';
          let isCiclo = g.tipo === 'CICLO' || g.tipoSecundario === 'CICLO';
          let isIA = g.configEspecial && g.configEspecial.tipo === 'IA_ENGINE';
          let isIAPleno = g.configEspecial && g.configEspecial.tipo === 'IA_PLENO';

          if (isIA && statusIA) {
            statusIA.style.display = 'block';
            statusIA.textContent = '🧠 I.A Fortuna X: Analisando mesas...';
          }
          
          if (isIAPleno) {
            if (statusIA) {
                statusIA.style.display = 'block';
                statusIA.textContent = '🎯 I.A Fortuna X: Analisando mesas...';
            }
            if (containerIAPleno) {
                containerIAPleno.style.display = 'block';
                if (modoIAPlenoInput) modoIAPlenoInput.value = state.modoIAPleno || 'moderado';
            }
          }

          // Fallback para estratégias antigas que só tinham "repeticoes"
          if (!g.tipo && !g.tipoSecundario && g.repeticoes && g.repeticoes > 1) {
            isGale = true;
          }

          return {
            ...g,
            id: 'db-gatilho-' + index,
            nome: g.legenda || 'Gatilho ' + index,
            ativo: true,
            isSequencia: false, // Força a ser OR Condition e não Sequência Linear
            numeros: numerosGatilho, // Números que ACIONAM o gatilho
            apostaEm: apostaEmFinal, // Números onde APOSTAR
            estrategia: (isGale ? 'GALE' : (isCiclo ? 'CICLO' : 'SIMPLES')),
            gales: (isGale || isCiclo) ? (g.multiplicadores || g.fichas || (g.repeticoes ? Array(g.repeticoes).fill(1) : undefined)) : undefined,
            ciclos: isCiclo ? (g.multiplicadores || g.fichas || undefined) : undefined,
            multiplicadores: g.multiplicadores || g.fichas || undefined,
            configEspecial: g.configEspecial || null
          };
        });

        // Atualizar o estado da aplicação com os dados da estratégia
        state.legendas = legendas;
        state.gatilhos = gatilhos;

        // RE-APLICAR configurações locais salvas de Quentes/Frios (Gales, Ciclos, Multiplicadores)
        if (state.configQuentesFrios && state.configQuentesFrios.tipo) {
            state.gatilhos.forEach(g => {
                const tags = Array.isArray(g.apostaEm) ? g.apostaEm : (g.apostaEm ? [g.apostaEm] : []);
                const isDinamico = tags.some(t => ['QUENTES', 'FRIOS', 'AMBOS'].includes(t));
                if (isDinamico) {
                    const tipoUpper = state.configQuentesFrios.tipo.toUpperCase();
                    g.tipo = tipoUpper;
                    g.estrategia = tipoUpper;
                    if (tipoUpper !== 'SIMPLES' && state.configQuentesFrios.multiplicadores) {
                        const arrayMult = [1, ...state.configQuentesFrios.multiplicadores];
                        g.multiplicadores = arrayMult;
                        if (tipoUpper === 'GALE') g.gales = arrayMult;
                        if (tipoUpper === 'CICLO') g.ciclos = arrayMult;
                    } else {
                        g.multiplicadores = null;
                        g.gales = null;
                        g.ciclos = null;
                    }
                }
            });
        }

        // RE-APLICAR configurações locais salvas de Funcionário do Mês
        if (state.configFuncionarioMes && state.configFuncionarioMes.tipo) {
            state.gatilhos.forEach(g => {
                const tags = Array.isArray(g.apostaEm) ? g.apostaEm : (g.apostaEm ? [g.apostaEm] : []);
                const isFuncionario = tags.some(t => ['FUNCIONARIO_MES', 'DYNAMIC_FUNCIONARIO'].includes(t));
                if (isFuncionario) {
                    const tipoUpper = state.configFuncionarioMes.tipo.toUpperCase();
                    g.tipo = tipoUpper;
                    g.estrategia = tipoUpper;
                    if (tipoUpper !== 'SIMPLES' && state.configFuncionarioMes.multiplicadores && state.configFuncionarioMes.multiplicadores.length > 0) {
                        const arrayMult = [1, ...state.configFuncionarioMes.multiplicadores];
                        g.multiplicadores = arrayMult;
                        if (tipoUpper === 'GALE') g.gales = arrayMult;
                        if (tipoUpper === 'CICLO') g.ciclos = arrayMult;
                    } else {
                        g.multiplicadores = tipoUpper === 'SIMPLES' ? [1] : null;
                        g.gales = null;
                        g.ciclos = null;
                    }
                }
            });
        }

        console.log(`✅ [ESTRATÉGIA] Carregada estratégia: ${selectedOption.dataset.nome}`);
        console.log(`   Legendas: ${legendas.length}, Gatilhos: ${gatilhos.length}`);

        // Atualizar UI
        atualizarListaLegendas();
        atualizarListaGatilhos();
        mostrarNotificacao(`Estratégia "${selectedOption.dataset.nome}" ativada!`, 'sucesso', 3000);
      } catch (error) {
        console.error('❌ Erro ao parsear dados da estratégia:', error);
      }
    }

    marcarAlteracao();
    saveState();

    // Mostrar/esconder campos dinâmicos baseado na estratégia selecionada
    console.log('📋 Nome para visibilidade:', state.nomeEstrategiaSelecionada);
    atualizarVisibilidadeEstrategia(state.nomeEstrategiaSelecionada || '');
  });
}

if (btnAdicionarLegenda) btnAdicionarLegenda.addEventListener('click', adicionarLegenda);
if (btnAdicionarGatilhoLegendas) btnAdicionarGatilhoLegendas.addEventListener('click', adicionarGatilho);

// Controlar visibilidade da configuração de Gale/Ciclo
if (tipoGatilho) {
  tipoGatilho.addEventListener('change', (e) => {
    const tipo = e.target.value;

    if (tipo === 'simples') {
      if (configGaleCiclo) configGaleCiclo.style.display = 'none';
      valoresFichas = [];
    } else {
      if (configGaleCiclo) configGaleCiclo.style.display = 'block';
      if (sliderQuantidade) {
        sliderQuantidade.value = 1;
        if (quantidadeGaleCicloSpan) quantidadeGaleCicloSpan.textContent = '1';
        atualizarSlidersFichas(1);
      }
    }
  });
}

// Atualizar sliders de fichas quando quantidade muda
if (sliderQuantidade) {
  sliderQuantidade.addEventListener('input', (e) => {
    const quantidade = parseInt(e.target.value);
    if (quantidadeGaleCicloSpan) quantidadeGaleCicloSpan.textContent = quantidade;
    atualizarSlidersFichas(quantidade);
  });
}

// Controlar visibilidade da configuração de Gale/Ciclo Dinamico
window.valoresFichasQF = [];
if (tipoProgressaoQF) {
  tipoProgressaoQF.addEventListener('change', (e) => {
    const tipo = e.target.value;
    if (tipo === 'simples') {
      if (configGaleCicloQF) configGaleCicloQF.style.display = 'none';
      window.valoresFichasQF = [];
    } else {
      if (configGaleCicloQF) configGaleCicloQF.style.display = 'block';
      if (sliderQuantidadeQF) {
        sliderQuantidadeQF.value = 1;
        if (quantidadeGaleCicloSpanQF) quantidadeGaleCicloSpanQF.textContent = '1';
        atualizarSlidersFichasQF(1);
      }
    }
  });
}

if (sliderQuantidadeQF) {
  sliderQuantidadeQF.addEventListener('input', (e) => {
    const quantidade = parseInt(e.target.value);
    if (quantidadeGaleCicloSpanQF) quantidadeGaleCicloSpanQF.textContent = quantidade;
    atualizarSlidersFichasQF(quantidade);
  });
}

function atualizarSlidersFichasQF(quantidade) {
  if (!slidersFichasQF) return;
  slidersFichasQF.innerHTML = '';
  window.valoresFichasQF = [];

  const tipo = tipoProgressaoQF ? tipoProgressaoQF.value : "simples";
  const labels = tipo === 'gale' ? 'GALE' : 'CICLO';

  for (let i = 0; i < quantidade; i++) {
    const div = document.createElement('div');
    div.style.marginBottom = '8px';

    const label = document.createElement('label');
    label.style.fontSize = '11px';
    label.style.color = '#ccc';
    label.textContent = `${labels} ${i + 1}: `;

    const span = document.createElement('span');
    span.id = `valorFichaQF${i}`;
    span.style.color = '#fff';
    span.style.fontWeight = 'bold';
    span.textContent = 'X1';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '100';
    slider.value = '1';
    slider.style.width = '100%';
    slider.style.cursor = 'pointer';
    slider.style.marginTop = '3px';

    slider.addEventListener('input', (e) => {
      const valor = parseInt(e.target.value);
      window.valoresFichasQF[i] = valor;
      span.textContent = `X${valor}`;
    });

    window.valoresFichasQF[i] = 1;

    div.appendChild(label);
    div.appendChild(span);
    div.appendChild(slider);
    slidersFichasQF.appendChild(div);
  }
}

// ===== FUNCIONÁRIO DO MÊS - CONFIGURAÇÃO =====
window.valoresFichasFM = [];
if (tipoProgressaoFM) {
  tipoProgressaoFM.addEventListener('change', (e) => {
    const tipo = e.target.value;
    if (tipo === 'simples') {
      if (configGaleCicloFM) configGaleCicloFM.style.display = 'none';
      window.valoresFichasFM = [];
    } else {
      if (configGaleCicloFM) configGaleCicloFM.style.display = 'block';
      if (sliderQuantidadeFM) {
        sliderQuantidadeFM.value = 1;
        if (quantidadeGaleCicloSpanFM) quantidadeGaleCicloSpanFM.textContent = '1';
        atualizarSlidersFichasFM(1);
      }
    }
  });
}

if (sliderQuantidadeFM) {
  sliderQuantidadeFM.addEventListener('input', (e) => {
    const quantidade = parseInt(e.target.value);
    if (quantidadeGaleCicloSpanFM) quantidadeGaleCicloSpanFM.textContent = quantidade;
    atualizarSlidersFichasFM(quantidade);
  });
}

function atualizarSlidersFichasFM(quantidade) {
  if (!slidersFichasFM) return;
  slidersFichasFM.innerHTML = '';
  window.valoresFichasFM = [];

  const tipo = tipoProgressaoFM ? tipoProgressaoFM.value : "simples";
  const labels = tipo === 'gale' ? 'GALE' : 'CICLO';

  for (let i = 0; i < quantidade; i++) {
    const div = document.createElement('div');
    div.style.marginBottom = '8px';

    const label = document.createElement('label');
    label.style.fontSize = '11px';
    label.style.color = '#ccc';
    label.textContent = `${labels} ${i + 1}: `;

    const span = document.createElement('span');
    span.id = `valorFichaFM${i}`;
    span.style.color = '#fff';
    span.style.fontWeight = 'bold';
    span.textContent = 'X1';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '100';
    slider.value = '1';
    slider.style.width = '100%';
    slider.style.cursor = 'pointer';
    slider.style.marginTop = '3px';

    slider.addEventListener('input', (e) => {
      const valor = parseInt(e.target.value);
      window.valoresFichasFM[i] = valor;
      span.textContent = `X${valor}`;
    });

    window.valoresFichasFM[i] = 1;

    div.appendChild(label);
    div.appendChild(span);
    div.appendChild(slider);
    slidersFichasFM.appendChild(div);
  }
}

if (btnSalvarFuncionarioMes) {
  btnSalvarFuncionarioMes.addEventListener('click', () => {
    const tipo = tipoProgressaoFM ? tipoProgressaoFM.value.toUpperCase() : 'SIMPLES';
    const multiplicadores = tipo !== 'SIMPLES' ? window.valoresFichasFM : [];
    
    console.log(`[CONFIG-FM] Salvando: tipo=${tipo}, multiplicadores=`, multiplicadores);
    
    // Salvar configuração no state
    state.configFuncionarioMes = {
      tipo: tipo,
      multiplicadores: multiplicadores
    };
    
    // Aplicar aos gatilhos da estratégia Funcionário do Mês
    state.gatilhos.forEach(g => {
      const tags = Array.isArray(g.apostaEm) ? g.apostaEm : (g.apostaEm ? [g.apostaEm] : []);
      if (tags.includes('FUNCIONARIO_MES') || tags.includes('DYNAMIC_FUNCIONARIO')) {
        g.tipo = tipo;
        g.estrategia = tipo;
        if (tipo !== 'SIMPLES' && multiplicadores.length > 0) {
          const arrayMult = [1, ...multiplicadores];
          g.multiplicadores = arrayMult;
          if (tipo === 'GALE') g.gales = arrayMult;
          if (tipo === 'CICLO') g.ciclos = arrayMult;
          console.log(`[CONFIG-FM] Gatilho ${g.nome}: multiplicadores=`, arrayMult);
        } else {
          g.multiplicadores = [1]; // SEMPRE [1] para SIMPLES
          g.gales = null;
          g.ciclos = null;
          console.log(`[CONFIG-FM] Gatilho ${g.nome}: SIMPLES (multiplicadores=[1])`);
        }
      }
    });
    
    saveState();
    mostrarNotificacao(`👔 Funcionário do Mês: ${tipo} configurado!`, 'sucesso', 2000);
  });
}

function atualizarSlidersFichas(quantidade) {
  if (!slidersFichas) return;
  slidersFichas.innerHTML = '';
  valoresFichas = [];

  const tipo = tipoGatilho ? tipoGatilho.value : "simples";
  const labels = tipo === 'gale' ? 'GALE' : 'CICLO';

  for (let i = 0; i < quantidade; i++) {
    const div = document.createElement('div');
    div.style.marginBottom = '8px';

    const label = document.createElement('label');
    label.style.fontSize = '11px';
    label.style.color = '#ccc';
    label.textContent = `${labels} ${i + 1}: `;

    const span = document.createElement('span');
    span.id = `valorFicha${i}`;
    span.style.color = '#fff';
    span.style.fontWeight = 'bold';
    span.textContent = 'X1';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '1';
    slider.max = '100';
    slider.value = '1';
    slider.style.width = '100%';
    slider.style.cursor = 'pointer';
    slider.style.marginTop = '3px';

    slider.addEventListener('input', (e) => {
      const valor = parseInt(e.target.value);
      valoresFichas[i] = valor;
      span.textContent = `X${valor}`;
    });

    valoresFichas[i] = 1;

    div.appendChild(label);
    div.appendChild(span);
    div.appendChild(slider);
    slidersFichas.appendChild(div);
  }
}

if (modoIAPlenoInput) {
  modoIAPlenoInput.addEventListener('change', (e) => {
    state.modoIAPleno = e.target.value;
    saveState();
    marcarAlteracao();
  });
}

if (resetBtn) {
  resetBtn.addEventListener('click', () => {
    // 1. Atualizar estado local imediatamente
    state.wins = 0;
    state.losses = 0;
    state.placar = 'WIN';
    state.stopAtivado = false;
    state.aguardandoProximaRodada = false;
    
    // 2. Sincronizar variáveis de controle locais do sidepanel
    stopAtivado = false;
    
    // 3. Notificar background para resetar TUDO (placar real, simulação, IA)
    // O background cuidará de resetar o storage e notificar todos os componentes
    chrome.runtime.sendMessage({ tipo: 'reset_placar' }).catch(() => {});
    
    // 4. Salvar localmente para garantir consistência imediata
    saveState();
    chrome.storage.local.set({ 
        placarSimulacao: { wins: 0, losses: 0 },
        saldoSimulacao: 1000.00
    });
    
    // 5. Atualizar UI local e enviar comando para o mini-painel
    updateDisplay();
    atualizarStatusGestao();
    
    mostrarNotificacao('🔄 Placar resetado e Bot reativado!', 'sucesso', 2000);
  });
}

if (exportBtn) {
  exportBtn.addEventListener('click', () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'fortuna-config.json';
    link.click();
    URL.revokeObjectURL(url);
    mostrarNotificacao('📥 Configuração exportada', 'sucesso', 2000);
  });
}

if (importBtn) {
  importBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          state = { ...state, ...imported };
          updateDisplay();
          atualizarListaLegendas();
          atualizarListaGatilhos();
          if (state.estrategiaSelecionada && selecaoEstrategia) {
            selecaoEstrategia.value = state.estrategiaSelecionada;
            atualizarVisibilidadeEstrategia(state.estrategiaSelecionada);
          }
          marcarAlteracao();
          saveState();
          mostrarNotificacao('✅ Configuração importada com sucesso!', 'sucesso', 3000);
        } catch (error) {
          mostrarNotificacao('❌ Erro ao importar: ' + error.message, 'erro', 3000);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

if (saveBtn) {
  saveBtn.addEventListener('click', () => {
    // Salvar parâmetros de Quentes/Frios se a estratégia estiver selecionada
    const inputQtdQuentes = document.getElementById('inputQtdQuentes');
    const inputQtdFrios = document.getElementById('inputQtdFrios');
    const inputQtdVizinhos = document.getElementById('inputQtdVizinhos');
    
    if (inputQtdQuentes || inputQtdFrios || inputQtdVizinhos) {
      const valsFichas = [...(window.valoresFichasQF || [])];
      state.configQuentesFrios = {
        qtdQuentes: parseInt(inputQtdQuentes?.value) || 0,
        qtdFrios: parseInt(inputQtdFrios?.value) || 0,
        qtdVizinhos: parseInt(inputQtdVizinhos?.value) || 0,
        tipo: tipoProgressaoQF ? tipoProgressaoQF.value : 'simples',
        multiplicadores: valsFichas.length > 0 ? valsFichas : undefined
      };
      
      // Atualizar os gatilhos dinâmicos em cache na hora para que o background já utilize o novo multiplicador
      if (state.gatilhos && state.gatilhos.length > 0) {
        state.gatilhos.forEach(g => {
            const tags = Array.isArray(g.apostaEm) ? g.apostaEm : (g.apostaEm ? [g.apostaEm] : []);
            const isDinamico = tags.some(t => ['QUENTES', 'FRIOS', 'AMBOS', 'FUNCIONARIO_MES', 'DYNAMIC_FUNCIONARIO'].includes(t));
            if (isDinamico) {
                const tipoUpper = state.configQuentesFrios.tipo.toUpperCase();
                g.tipo = tipoUpper;
                g.estrategia = tipoUpper;
                if (tipoUpper !== 'SIMPLES' && valsFichas.length > 0) {
                    const arrayMult = [1, ...valsFichas];
                    g.multiplicadores = arrayMult;
                    if (tipoUpper === 'GALE') g.gales = arrayMult;
                    if (tipoUpper === 'CICLO') g.ciclos = arrayMult;
                } else {
                    g.multiplicadores = null;
                    g.gales = null;
                    g.ciclos = null;
                }
            }
        });
      }
    }
    
    saveState();
    limparAlteracoes();
    
    // Notificar background para atualizar painéis de quentes/frios na mesa imediatamente
    chrome.runtime.sendMessage({ tipo: 'atualizar_paineis_quentes_frios' }).catch(() => {});

    mostrarNotificacao('💾 Configuração salva!', 'sucesso', 2000);
    
    // Enviar dados atualizados para o painel flutuante
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'atualizarStatusPainel',
          ativo: !stopAtivado,
          estrategia: state.nomeEstrategiaSelecionada || 'Manual',
          placar: { wins: state.wins, losses: state.losses },
          stopWin: state.stopWin || 0,
          stopLoss: state.stopLoss || 0
        }).catch(() => {
          // Ignorar erros se a aba não responder
        });
      }
    });
  });
}

if (btnLimparHistorico) {
  btnLimparHistorico.addEventListener('click', () => {
    limparHistorico();
  });
}

// Botão de encolher/expandir estratégias múltiplas
const btnEncolherMultiplas = document.getElementById('btnEncolherMultiplas');
const listaEstrategiasMultiplas = document.getElementById('listaEstrategiasMultiplas');

if (btnEncolherMultiplas && listaEstrategiasMultiplas) {
  let estaEncolhido = true;
  
  btnEncolherMultiplas.addEventListener('click', () => {
    estaEncolhido = !estaEncolhido;
    
    if (estaEncolhido) {
      listaEstrategiasMultiplas.style.display = 'none';
      btnEncolherMultiplas.textContent = '▶';
    } else {
      listaEstrategiasMultiplas.style.display = 'block';
      btnEncolherMultiplas.textContent = '▼';
    }
  });
}

// ===== MODO SIMULAÇÃO (DESAFIO) =====
const btnSimulacao = document.getElementById('btnSimulacao');
const modalSimulacao = document.getElementById('modalSimulacao');
const btnFecharModalSimulacao = document.getElementById('btnFecharModalSimulacao');
const btnSalvarSimulacao = document.getElementById('btnSalvarSimulacao');
const btnResetPlacarSimulacao = document.getElementById('btnResetPlacarSimulacao');
const toggleSimulacaoBot = document.getElementById('toggleSimulacaoBot');
const saldoSimulacaoInput = document.getElementById('saldoSimulacaoInput');
const fichaSimulacaoInput = document.getElementById('fichaSimulacaoInput');
const txtStatusSimulacao = document.getElementById('txtStatusSimulacao');

if (btnSimulacao) {
  btnSimulacao.addEventListener('click', () => {
    chrome.storage.local.get(['modoSimulacaoAtivo', 'saldoSimulacao', 'valorFichaSimulacao'], (result) => {
      if (toggleSimulacaoBot) {
        toggleSimulacaoBot.checked = result.modoSimulacaoAtivo || false;
        atualizarTextoStatusSim(toggleSimulacaoBot.checked);
      }
      if (saldoSimulacaoInput) saldoSimulacaoInput.value = result.saldoSimulacao !== undefined ? result.saldoSimulacao : 100.00;
      if (fichaSimulacaoInput) fichaSimulacaoInput.value = result.valorFichaSimulacao !== undefined ? result.valorFichaSimulacao : 0.50;
      
      if (modalSimulacao) modalSimulacao.style.display = 'flex';
    });
  });
}

if (btnHistoricoApostas) {
  btnHistoricoApostas.addEventListener('click', () => {
    renderizarHistoricoApostas();
    if (modalHistoricoApostas) modalHistoricoApostas.style.display = 'flex';
  });
}

if (btnFecharModalApostas) {
  btnFecharModalApostas.addEventListener('click', () => {
    if (modalHistoricoApostas) modalHistoricoApostas.style.display = 'none';
  });
}

if (modalHistoricoApostas) {
  modalHistoricoApostas.addEventListener('click', (e) => {
    if (e.target === modalHistoricoApostas) {
      modalHistoricoApostas.style.display = 'none';
    }
  });
}

if (btnLimparHistoricoApostas) {
  btnLimparHistoricoApostas.addEventListener('click', () => {
    if (confirm('Deseja limpar todo o histórico de apostas?')) {
      chrome.storage.local.set({ historicoApostas: [] }, () => {
        renderizarHistoricoApostas();
      });
    }
  });
}

if (toggleSimulacaoBot) {
  toggleSimulacaoBot.addEventListener('change', (e) => {
    const ativo = e.target.checked;
    atualizarTextoStatusSim(ativo);
    
    // Sincronizar com o toggle do header
    if (toggleSimulacaoHeader) {
      toggleSimulacaoHeader.checked = ativo;
    }
    
    // Salvar no storage
    chrome.storage.local.set({ modoSimulacaoAtivo: ativo });
  });
}

// Toggle de Simulação no Header
const toggleSimulacaoHeader = document.getElementById('toggleSimulacaoHeader');

if (toggleSimulacaoHeader) {
  // Sincronizar estado inicial após um pequeno delay para garantir que o storage foi atualizado
  setTimeout(() => {
    chrome.storage.local.get(['modoSimulacaoAtivo'], (result) => {
      const ativo = result.modoSimulacaoAtivo !== false; // true por padrão
      toggleSimulacaoHeader.checked = ativo;
    });
  }, 100);
  
  // Listener para mudanças
  toggleSimulacaoHeader.addEventListener('change', (e) => {
    const ativo = e.target.checked;
    chrome.storage.local.set({ modoSimulacaoAtivo: ativo });
    
    // Sincronizar com o toggle do modal se existir
    if (toggleSimulacaoBot) {
      toggleSimulacaoBot.checked = ativo;
      atualizarTextoStatusSim(ativo);
    }
    
    // Mostrar notificação
    const msg = ativo ? '🧪 Modo Simulação ATIVADO' : '💰 Modo Real ATIVADO';
    const tipo = ativo ? 'sucesso' : 'aviso';
    mostrarNotificacao(msg, tipo, 2000);
  });
}

function atualizarTextoStatusSim(ativo) {
  if (!txtStatusSimulacao) return;
  txtStatusSimulacao.textContent = ativo ? 'ATIVADO' : 'DESATIVADO';
  txtStatusSimulacao.style.color = ativo ? '#00bcd4' : '#888';
}

if (btnSalvarSimulacao) {
  btnSalvarSimulacao.addEventListener('click', () => {
    const ativo = toggleSimulacaoBot.checked;
    const saldo = parseFloat(saldoSimulacaoInput.value) || 100.00;
    const ficha = parseFloat(fichaSimulacaoInput.value) || 0.50;
    
    chrome.storage.local.set({
      modoSimulacaoAtivo: ativo,
      saldoSimulacao: saldo,
      valorFichaSimulacao: ficha
    }, () => {
      mostrarNotificacao(`✅ Simulação ${ativo ? 'Ativada' : 'Desativada'}!`, 'sucesso', 3000);
      if (modalSimulacao) modalSimulacao.style.display = 'none';
      
      // Notificar background
      chrome.runtime.sendMessage({ 
        tipo: 'config_simulacao_alterada', 
        ativo: ativo,
        saldo: saldo,
        ficha: ficha
      });
    });
  });
}

if (btnResetPlacarSimulacao) {
  btnResetPlacarSimulacao.addEventListener('click', () => {
    if (confirm('Deseja zerar o placar e o saldo da simulação?')) {
      chrome.storage.local.set({
        placarSimulacao: { wins: 0, losses: 0 },
        saldoSimulacao: 1000.00
      }, () => {
        if (saldoSimulacaoInput) saldoSimulacaoInput.value = 1000.00;
        mostrarNotificacao('🔄 Simulação resetada!', 'sucesso', 2000);
      });
    }
  });
}

// Fechar ao clicar fora
if (modalSimulacao) {
  modalSimulacao.addEventListener('click', (e) => {
    if (e.target === modalSimulacao) {
      modalSimulacao.style.display = 'none';
    }
  });
}

// ============================================
// SALVAR ESTADO
// ============================================
// MODAL GESTÃO (STOP WIN / STOP LOSS)
// ============================================

if (btnGestao) {
  const abrirGestao = () => {
    modalGestao.style.display = 'flex';
    // Carregar valores salvos
    if (state.stopWin) stopWinInput.value = state.stopWin;
    if (state.stopLoss) stopLossInput.value = state.stopLoss;
    // Mostrar/esconder botão reativar
    const btnReativarEl = document.getElementById('btnReativarGestao');
    if (btnReativarEl) btnReativarEl.style.display = stopAtivado ? 'block' : 'none';
    // Atualizar saldo atual da mesa
    atualizarSaldoModal();
  };
  btnGestao.addEventListener('click', abrirGestao);
  if (btnGestaoMain) btnGestaoMain.addEventListener('click', abrirGestao);
}

if (btnFecharModalGestao) {
  btnFecharModalGestao.addEventListener('click', () => {
    modalGestao.style.display = 'none';
  });
}

if (btnSalvarGestao) {
  btnSalvarGestao.addEventListener('click', () => {
    state.stopWin = parseInt(stopWinInput.value) || 0;
    state.stopLoss = parseInt(stopLossInput.value) || 0;
    
    // Reativar bot automaticamente ao mudar configurações
    reativarApostas();
    
    saveState();

    // Notificar background para atualizar painéis de quentes/frios na mesa imediatamente
    chrome.runtime.sendMessage({ tipo: 'atualizar_paineis_quentes_frios' }).catch(() => {});

    mostrarNotificacao('✅ Gestão salva! Bot reativado.', 'sucesso', 2000);
    modalGestao.style.display = 'none';
  });
}

if (btnLimparGestao) {
  btnLimparGestao.addEventListener('click', () => {
    stopWinInput.value = '';
    stopLossInput.value = '';
    state.stopWin = 0;
    state.stopLoss = 0;
    stopAtivado = false;
    saveState();
    atualizarStatusGestao();

    const btnReativarGestao = document.getElementById('btnReativarGestao');
    if (btnReativarGestao) btnReativarGestao.style.display = 'none';

    mostrarNotificacao('🗑️ Gestão de banca desativada!', 'sucesso', 2000);
  });
}

if (btnPlanilhasMain) {
  btnPlanilhasMain.addEventListener('click', () => {
    if (iframeGestao) iframeGestao.src = 'Gestão/planilha_moderna.html';
    if (modalArquivosGestao) modalArquivosGestao.style.display = 'flex';
  });
}

if (btnVerPlanilha) {
  btnVerPlanilha.addEventListener('click', () => {
    if (iframeGestao) iframeGestao.src = 'Gestão/planilha_moderna.html';
  });
}

if (btnVerGestao) {
  btnVerGestao.addEventListener('click', () => {
    if (iframeGestao) iframeGestao.src = 'Gestão/gestao.html';
  });
}

if (btnFecharModalArquivos) {
  btnFecharModalArquivos.addEventListener('click', () => {
    if (modalArquivosGestao) modalArquivosGestao.style.display = 'none';
    if (iframeGestao) iframeGestao.src = '';
  });
}

if (modalArquivosGestao) {
  modalArquivosGestao.addEventListener('click', (e) => {
    if (e.target === modalArquivosGestao) {
      modalArquivosGestao.style.display = 'none';
      if (iframeGestao) iframeGestao.src = '';
    }
  });
}

// Fechar modal ao clicar fora
if (modalGestao) {
  modalGestao.addEventListener('click', (e) => {
    if (e.target === modalGestao) {
      modalGestao.style.display = 'none';
    }
  });
}

// Função para atualizar saldo do modal (ao abrir) — usa ultimo push recebido
function atualizarSaldoModal() {
  const saldoAtualEl = document.getElementById('saldoAtual');
  const infoPlacarSessao = document.getElementById('infoPlacarSessao');

  const saldo = ultimoSaldoPush;

  if (saldo > 0 && saldoAtualEl) {
    saldoAtualEl.textContent = `R$ ${saldo.toFixed(2).replace('.', ',')}`;
    saldoAtualEl.style.color = '#00ff00';
  } else if (saldoAtualEl) {
    saldoAtualEl.textContent = 'Aguardando...';
    saldoAtualEl.style.color = '#888';
  }

  // Mostrar placar atual da sessão
  if (infoPlacarSessao) {
    infoPlacarSessao.textContent = `${state.wins} X ${state.losses}`;
    infoPlacarSessao.style.color = state.wins >= state.losses ? '#00ff00' : '#ff4444';
  }
}

// ===== MONITORAR SALDO EM TEMPO REAL =====

let ultimoSaldoPush = 0;      // Último saldo recebido via push do contentScript
let stopAtivado = false;        // Flag permanente: para o bot completamente quando stop é acionado

// ===================================================
// ATUALIZAR BADGE DE STATUS DE GESTÃO NA SIDEBAR
// ===================================================
function atualizarStatusGestao() {
  const btnGestaoEl = document.getElementById('btnGestao');
  if (!btnGestaoEl) return;

  const temConfig = (state.stopWin > 0 || state.stopLoss > 0);

  // No novo layout de cinto lateral (belt), mantemos apenas o emoji e mudamos a cor da borda
  if (stopAtivado) {
    btnGestaoEl.style.borderColor = '#cc0000';
    btnGestaoEl.title = '🛑 GESTÃO - STOP ATIVO';
  } else if (temConfig) {
    btnGestaoEl.style.borderColor = '#007700';
    btnGestaoEl.title = '🟢 GESTÃO - ATIVA';
  } else {
    btnGestaoEl.style.borderColor = '#ff9800';
    btnGestaoEl.title = 'Configurar Gestão';
  }
}

// Para o bot PERMANENTEMENTE até o usuário reiniciar manualmente
function pararApostas(motivo) {
  stopAtivado = true;
  apostaAtiva = null;             // Cancela qualquer aposta em andamento
  aguardandoProximaRodada = true; // Impede próximas apostas imediatas

  // Sincronizar stopAtivado com o background para que ele pare de disparar apostas
  chrome.storage.local.get(['rouletteState'], (result) => {
    const bgState = result.rouletteState || {};
    bgState.stopAtivado = true;
    bgState.apostaAtiva = null;
    bgState.aguardandoProximaRodada = true;
    chrome.storage.local.set({ rouletteState: bgState, apostaAtiva: null });
  });

  const btnReativarGestaoBtn = document.getElementById('btnReativarGestao');
  if (btnReativarGestaoBtn) btnReativarGestaoBtn.style.display = 'none';

  atualizarListaGatilhos();
  atualizarStatusGestao();
  updateDisplay();
  console.log(`🔴 [GESTÃO] Bot parado por: ${motivo}`);
}

// Reativar apostas manualmente
function reativarApostas() {
  stopAtivado = false;
  aguardandoProximaRodada = false;

  // Atualizar o estado local
  state.stopAtivado = false;
  state.aguardandoProximaRodada = false;
  
  // Salvar no storage (isso já notifica o background via storage.onChanged)
  saveState();

  const btnReativarGestaoBtn = document.getElementById('btnReativarGestao');
  if (btnReativarGestaoBtn) btnReativarGestaoBtn.style.display = 'none';

  atualizarStatusGestao();
  updateDisplay();
  mostrarNotificacao('✅ Bot reativado!', 'sucesso', 4000);
  console.log('✅ [GESTÃO] Bot reativado pelo usuário');
}

function obterSaldoAtual() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs || !tabs[0]) {
        console.log('❌ Nenhuma aba ativa encontrada');
        resolve(0);
        return;
      }

      const tabId = tabs[0].id;

      chrome.tabs.sendMessage(tabId, { action: 'obterSaldo' }, (response) => {
        if (chrome.runtime.lastError) {
          console.log('⚠️ Erro ao enviar mensagem:', chrome.runtime.lastError.message);
          resolve(0);
          return;
        }

        if (response && response.saldoNumerico !== undefined) {
          resolve(response.saldoNumerico);
        } else {
          console.log('❌ Resposta inválida:', response);
          resolve(0);
        }
      });
    });
  });
}

// Iniciar monitoramento quando uma estratégia for selecionada
const selecaoEstrategiaElement = document.getElementById('selecaoEstrategia');
if (selecaoEstrategiaElement) {
  selecaoEstrategiaElement.addEventListener('change', () => {
    atualizarStatusGestao();
  });
}

// Inicializar status de gestão ao carregar
atualizarStatusGestao();

// ============================================

function saveState() {
  chrome.storage.local.set({ rouletteState: state });
}

// ============================================
// HISTÓRICO DE APOSTAS
// ============================================

let historicoApostas = [];

// Carregar histórico do storage
chrome.storage.local.get(['historicoApostas'], (result) => {
  if (result.historicoApostas) {
    historicoApostas = result.historicoApostas;
  }
});

// Função para registrar uma aposta
function registrarAposta(dadosAposta) {
  const aposta = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    estrategia: dadosAposta.estrategia || 'Manual',
    valorFicha: dadosAposta.valorFicha || 0,
    quantidadeNumeros: dadosAposta.quantidadeNumeros || 0,
    multiplicador: dadosAposta.multiplicador || 1,
    valorAposta: dadosAposta.valorAposta || 0,
    tipo: dadosAposta.tipo || 'SIMPLES', // GALE, CICLO, SIMPLES
    gales: dadosAposta.gales || [],
    resultado: dadosAposta.resultado || 'pendente', // 'win', 'loss', 'pendente'
    numeroSaiu: dadosAposta.numeroSaiu || null,
    retorno: dadosAposta.retorno || 0
  };
  
  historicoApostas.unshift(aposta);
  
  // Limitar a 100 apostas
  if (historicoApostas.length > 100) {
    historicoApostas = historicoApostas.slice(0, 100);
  }
  
  chrome.storage.local.set({ historicoApostas });
}

// Atualizar resultado de uma aposta
function atualizarResultadoAposta(apostaId, resultado, numeroSaiu, valorGanho) {
  console.log(`📥 [SIDEPANEL] Recebeu atualização: apostaId=${apostaId}, resultado=${resultado}, numeroSaiu=${numeroSaiu}, valorGanho=${valorGanho}`);
  
  chrome.storage.local.get(['historicoApostas'], (result) => {
    const historicoApostas = result.historicoApostas || [];
    const apostaIndex = historicoApostas.findIndex(a => a.id === apostaId);
    
    console.log(`🔍 [SIDEPANEL] Procurando aposta ${apostaId}, encontrado no índice: ${apostaIndex}`);
    
    if (apostaIndex !== -1) {
      const aposta = historicoApostas[apostaIndex];
      
      // Calcular valor total investido
      let valorTotalInvestido = aposta.valorAposta || 0;
      if (aposta.gales && aposta.gales.length > 0) {
        aposta.gales.forEach(g => {
          valorTotalInvestido += (g.valorAposta || 0);
        });
      }
      
      // Calcular retorno
      const retorno = resultado === 'win' ? (valorGanho - valorTotalInvestido) : -valorTotalInvestido;
      
      // Atualizar aposta
      historicoApostas[apostaIndex].resultado = resultado;
      historicoApostas[apostaIndex].numeroSaiu = numeroSaiu;
      historicoApostas[apostaIndex].retorno = retorno;
      
      console.log(`💾 [SIDEPANEL] Salvando: numeroSaiu=${numeroSaiu}, resultado=${resultado}, retorno=${retorno}`);
      
      chrome.storage.local.set({ historicoApostas }, () => {
        console.log(`✅ [SIDEPANEL] Aposta atualizada com sucesso!`);
      });
    } else {
      console.log(`❌ [SIDEPANEL] Aposta ${apostaId} não encontrada no histórico`);
    }
  });
}

// Adicionar gale a uma aposta
function adicionarGaleAposta(apostaId, dadosGale) {
  const aposta = historicoApostas.find(a => a.id === apostaId);
  if (aposta) {
    aposta.gales.push({
      numero: dadosGale.numero,
      valorFicha: dadosGale.valorFicha,
      quantidadeNumeros: dadosGale.quantidadeNumeros,
      multiplicador: dadosGale.multiplicador,
      valorAposta: dadosGale.valorAposta
    });
    chrome.storage.local.set({ historicoApostas });
  }
}

// Renderizar lista de apostas
function renderizarHistoricoApostas() {
  const listaApostas = document.getElementById('listaApostas');
  const totalApostasEl = document.getElementById('totalApostas');
  const saldoApostasEl = document.getElementById('saldoApostas');
  
  if (!listaApostas) return;
  
  // SEMPRE carregar do storage antes de renderizar
  chrome.storage.local.get(['historicoApostas'], (result) => {
    const historicoApostas = result.historicoApostas || [];
    
    if (historicoApostas.length === 0) {
      listaApostas.innerHTML = '<p style="text-align: center; color: #888; padding: 40px;">Nenhuma aposta registrada ainda</p>';
      if (totalApostasEl) totalApostasEl.textContent = '0';
      if (saldoApostasEl) saldoApostasEl.textContent = 'R$ 0';
      return;
    }
    
    // Calcular totais
    const totalApostas = historicoApostas.length;
    
    if (totalApostasEl) totalApostasEl.textContent = totalApostas;
    if (saldoApostasEl) {
      // Usar o saldo real da mesa (mesmo da gestão)
      if (ultimoSaldoPush > 0) {
        saldoApostasEl.textContent = `R$ ${ultimoSaldoPush.toFixed(2)}`;
        saldoApostasEl.style.color = '#4caf50';
      } else {
        saldoApostasEl.textContent = 'Aguardando...';
        saldoApostasEl.style.color = '#888';
      }
    }
    
    // Renderizar lista
    let html = '';
    historicoApostas.forEach(aposta => {
      const data = new Date(aposta.timestamp);
      const dataFormatada = data.toLocaleString('pt-BR');
      const statusIcon = aposta.resultado === 'win' ? '✅' : aposta.resultado === 'loss' ? '❌' : '⏳';
      const statusColor = aposta.resultado === 'win' ? '#4caf50' : aposta.resultado === 'loss' ? '#f44336' : '#888';
      
      // APOSTA INICIAL
      html += `
        <div style="background: #2a2a2a; border-radius: 8px; padding: 15px; margin-bottom: 10px; border-left: 4px solid ${statusColor};">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <span style="color: #0088cc; font-weight: bold; font-size: 14px;">${aposta.estrategia}</span>
              <span style="color: #666; font-size: 11px; margin-left: 10px;">${dataFormatada}</span>
            </div>
            <div style="font-size: 20px;">${statusIcon}</div>
          </div>
          
          <!-- APOSTA INICIAL -->
          <div style="background: #1a1a1a; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
            <div style="color: #4caf50; font-size: 11px; font-weight: bold; margin-bottom: 8px;">🎯 APOSTA INICIAL</div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
              <div>
                <div style="color: #888; font-size: 10px;">Qtd Números</div>
                <div style="color: #fff; font-size: 12px; font-weight: bold;">${aposta.quantidadeNumeros || 0}</div>
              </div>
              <div>
                <div style="color: #888; font-size: 10px;">Multiplicador</div>
                <div style="color: #fff; font-size: 12px; font-weight: bold;">${aposta.multiplicador || 1}x</div>
              </div>
              <div>
                <div style="color: #888; font-size: 10px;">Valor Apostado</div>
                <div style="color: #ff9800; font-size: 12px; font-weight: bold;">R$ ${(aposta.valorAposta || 0).toFixed(2)}</div>
              </div>
              <div>
                <div style="color: #888; font-size: 10px;">Número Saiu</div>
                <div style="color: #fff; font-size: 14px; font-weight: bold; background: #333; padding: 2px 6px; border-radius: 4px; text-align: center;">${aposta.numeroSaiu !== null && aposta.numeroSaiu !== undefined ? aposta.numeroSaiu : '--'}</div>
              </div>
            </div>
          </div>
          
          ${aposta.gales && aposta.gales.length > 0 ? aposta.gales.map((gale, idx) => `
            <div style="background: #1a1a1a; padding: 10px; border-radius: 6px; margin-bottom: 8px;">
              <div style="color: #ff9800; font-size: 11px; font-weight: bold; margin-bottom: 8px;">⚠️ ${aposta.tipo === 'CICLO' ? 'CICLO' : 'GALE'} ${idx + 1}</div>
              <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                <div>
                  <div style="color: #888; font-size: 10px;">Qtd Números</div>
                  <div style="color: #fff; font-size: 12px; font-weight: bold;">${gale.quantidadeNumeros || 0}</div>
                </div>
                <div>
                  <div style="color: #888; font-size: 10px;">Multiplicador</div>
                  <div style="color: #fff; font-size: 12px; font-weight: bold;">${gale.multiplicador || 1}x</div>
                </div>
                <div>
                  <div style="color: #888; font-size: 10px;">Valor Apostado</div>
                  <div style="color: #ff9800; font-size: 12px; font-weight: bold;">R$ ${(gale.valorAposta || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div style="color: #888; font-size: 10px;">Número Saiu</div>
                  <div style="color: #fff; font-size: 14px; font-weight: bold; background: #333; padding: 2px 6px; border-radius: 4px; text-align: center;">${aposta.numeroSaiu !== null && aposta.numeroSaiu !== undefined ? aposta.numeroSaiu : '--'}</div>
                </div>
              </div>
            </div>
          `).join('') : ''}
          
          ${aposta.resultado !== 'pendente' ? `
            <div style="display: flex; justify-content: space-between; padding-top: 10px; border-top: 1px solid #333;">
              <div>
                <span style="color: #888; font-size: 11px;">Retorno: </span>
                <span style="color: ${(aposta.retorno || 0) >= 0 ? '#4caf50' : '#f44336'}; font-weight: bold; font-size: 14px;">R$ ${(aposta.retorno || 0) >= 0 ? '+' : ''}${(aposta.retorno || 0).toFixed(2)}</span>
              </div>
            </div>
          ` : ''}
        </div>
      `;
    });
    
    listaApostas.innerHTML = html;
  });
}

function renderizarHistoricoApostas() {
  if (!listaHistoricoApostas) return;

  chrome.storage.local.get(['historicoApostas'], (result) => {
    const historico = result.historicoApostas || [];
    
    if (historico.length === 0) {
      listaHistoricoApostas.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #888;">Nenhuma aposta registrada</td></tr>';
      return;
    }

    let html = '';
    historico.forEach(item => {
      const corResultado = item.resultado === 'WIN' ? '#00ff00' : '#ff4444';
      const badgeResultado = `<span style="background: ${corResultado}; color: #000; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 9px;">${item.resultado}</span>`;
      
      html += `
        <tr style="border-bottom: 1px solid #222;">
          <td style="padding: 8px; color: #aaa;">${item.timestamp}</td>
          <td style="padding: 8px; font-weight: bold;">${item.gatilho}</td>
          <td style="padding: 8px; text-align: center;"><span style="background: #333; padding: 2px 6px; border-radius: 4px;">${item.numeroSaiu}</span></td>
          <td style="padding: 8px;">${badgeResultado}</td>
          <td style="padding: 8px; text-align: center;">${item.gale > 0 ? `${item.tipoProgressao === 'CICLO' ? 'Ciclo' : 'Gale'} ${item.gale}` : '-'}</td>
          <td style="padding: 8px; color: #888; font-size: 9px;">${item.modo}</td>
          <td style="padding: 8px; font-weight: bold; color: #00ff00;">R$ ${parseFloat(item.saldo || 0).toFixed(2).replace('.', ',')}</td>
        </tr>
      `;
    });

    listaHistoricoApostas.innerHTML = html;
  });
}

// Event Listeners para o Histórico de Apostas
if (btnHistoricoApostas) {
  btnHistoricoApostas.addEventListener('click', () => {
    renderizarHistoricoApostas();
    if (modalHistoricoApostas) modalHistoricoApostas.style.display = 'flex';
  });
}

if (btnFecharModalApostas) {
  btnFecharModalApostas.addEventListener('click', () => {
    if (modalHistoricoApostas) modalHistoricoApostas.style.display = 'none';
  });
}

if (modalHistoricoApostas) {
  modalHistoricoApostas.addEventListener('click', (e) => {
    if (e.target === modalHistoricoApostas) {
      modalHistoricoApostas.style.display = 'none';
    }
  });
}

if (btnLimparHistoricoApostas) {
  btnLimparHistoricoApostas.addEventListener('click', () => {
    if (confirm('Deseja limpar todo o histórico de apostas?')) {
      chrome.storage.local.set({ historicoApostas: [] }, () => {
        renderizarHistoricoApostas();
      });
    }
  });
}

// Ouvir mensagens para atualizar o histórico em tempo real
chrome.runtime.onMessage.addListener((request) => {
  if (request.tipo === 'atualizar_historico_apostas') {
    if (modalHistoricoApostas && modalHistoricoApostas.style.display === 'flex') {
      renderizarHistoricoApostas();
    }
  }
});

// ===== THEME SYSTEM =====
// Load saved theme on startup
chrome.storage.local.get(['selectedTheme'], (result) => {
  const theme = result.selectedTheme || 'black';
  applyTheme(theme);
});

// Apply theme to body
function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme);
  chrome.storage.local.set({ selectedTheme: theme });
}

// Theme button - open modal
if (btnTema) {
  btnTema.addEventListener('click', () => {
    if (modalTema) modalTema.style.display = 'flex';
  });
}

// Close theme modal
if (btnFecharModalTema) {
  btnFecharModalTema.addEventListener('click', () => {
    if (modalTema) modalTema.style.display = 'none';
  });
}

// Close modal when clicking outside
if (modalTema) {
  modalTema.addEventListener('click', (e) => {
    if (e.target === modalTema) {
      modalTema.style.display = 'none';
    }
  });
}

// Theme color buttons
document.querySelectorAll('.theme-color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const theme = btn.getAttribute('data-theme');
    applyTheme(theme);
    if (modalTema) modalTema.style.display = 'none';
    
    // Show notification
    const notificacoes = document.getElementById('notificacoes');
    if (notificacoes) {
      const notif = document.createElement('div');
      notif.className = 'notificacao sucesso';
      notif.textContent = `✅ Tema ${btn.querySelector('span').textContent} aplicado!`;
      notificacoes.appendChild(notif);
      
      setTimeout(() => {
        notif.classList.add('removendo');
        setTimeout(() => notif.remove(), 300);
      }, 2000);
    }
  });
});

// Listener para mensagens do background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.tipo === 'registrar_aposta') {
    registrarAposta(request.dados);
    sendResponse({ sucesso: true });
  } else if (request.tipo === 'adicionar_gale') {
    adicionarGaleAposta(request.apostaId, request.dados);
    sendResponse({ sucesso: true });
  } else if (request.tipo === 'atualizar_resultado_aposta') {
    atualizarResultadoAposta(request.apostaId, request.resultado, request.numeroSaiu, request.valorGanho || 0);
    sendResponse({ sucesso: true });
  }
});

// ============================================
// LISTENER PARA MENSAGENS DO BACKGROUND
// ============================================

// Escutar mensagens do background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('📨 [SIDEPANEL] Mensagem recebida do background:', message);
  
  if (message.tipo === 'config_atualizada') {
    console.log('⚙️ [SIDEPANEL] Config atualizada recebida:', message.config);
    
    // Atualizar o dropdown de estratégias se a estratégia mudou
    if (message.config.estrategia_nome) {
      const selecaoEstrategia = document.getElementById('selecaoEstrategia');
      if (selecaoEstrategia) {
        // Procurar a opção que corresponde à nova estratégia
        for (let option of selecaoEstrategia.options) {
          if (option.textContent.includes(message.config.estrategia_nome) || 
              option.value === message.config.estrategia_id) {
            selecaoEstrategia.value = option.value;
            console.log('✅ [SIDEPANEL] Estratégia atualizada para:', message.config.estrategia_nome);
            
            // Disparar evento change para atualizar a interface
            selecaoEstrategia.dispatchEvent(new Event('change'));
            
            // Mostrar notificação
            mostrarNotificacao(`🎯 Estratégia alterada: ${message.config.estrategia_nome}`, 'sucesso', 3000);
            break;
          }
        }
      }
    }
    
    // Atualizar modo IA Fortuna
    if (message.config.modo_ia !== undefined && modoIAPlenoInput) {
      modoIAPlenoInput.value = message.config.modo_ia;
      state.modoIAPleno = message.config.modo_ia;
      console.log('✅ [SIDEPANEL] Modo IA atualizado para:', message.config.modo_ia);
    }
    
    // Atualizar campos específicos de Quentes e Frios
    const inputQtdQuentes = document.getElementById('inputQtdQuentes');
    const inputQtdFrios = document.getElementById('inputQtdFrios');
    const inputQtdVizinhos = document.getElementById('inputQtdVizinhos');
    
    if (message.config.qtd_hot !== undefined && inputQtdQuentes) {
      inputQtdQuentes.value = message.config.qtd_hot;
      console.log('✅ [SIDEPANEL] Quantidade de quentes atualizada para:', message.config.qtd_hot);
    }
    
    if (message.config.qtd_cold !== undefined && inputQtdFrios) {
      inputQtdFrios.value = message.config.qtd_cold;
      console.log('✅ [SIDEPANEL] Quantidade de frios atualizada para:', message.config.qtd_cold);
    }
    
    if (message.config.vizinhos !== undefined && inputQtdVizinhos) {
      inputQtdVizinhos.value = message.config.vizinhos;
      console.log('✅ [SIDEPANEL] Quantidade de vizinhos atualizada para:', message.config.vizinhos);
    }

    if (message.config.qtd_analise !== undefined) {
      const sliderHistorico = document.getElementById('sliderHistorico');
      const valorSliderHistorico = document.getElementById('valorSliderHistorico');
      if (sliderHistorico) sliderHistorico.value = message.config.qtd_analise;
      if (valorSliderHistorico) valorSliderHistorico.textContent = message.config.qtd_analise;
      state.maxRodadasHistorico = message.config.qtd_analise;
      console.log('✅ [SIDEPANEL] Quantidade de análise atualizada para:', message.config.qtd_analise);
    }

    // Sincronizar Legendas e Gatilhos do Servidor
    if (message.config.legendas) {
      state.legendas = message.config.legendas;
      atualizarListaLegendas();
      console.log('📚 [SIDEPANEL] Legendas sincronizadas:', Object.keys(state.legendas).length);
    }
    if (message.config.gatilhos) {
      state.gatilhos = message.config.gatilhos;
      atualizarListaGatilhos();
      console.log('🎯 [SIDEPANEL] Gatilhos sincronizados:', state.gatilhos.length);
    }
    
    // Atualizar campos específicos do Funcionário do Mês
    const inputNumerosFixos = document.getElementById('inputNumerosFixos');
    const tipoProgressaoFM = document.getElementById('tipoProgressaoFM');
    
    if (message.config.numeros_fixos_fm !== undefined && inputNumerosFixos) {
      inputNumerosFixos.value = message.config.numeros_fixos_fm;
      console.log('✅ [SIDEPANEL] Números fixos FM atualizados para:', message.config.numeros_fixos_fm);
    }
    
    if (message.config.tipo_progressao_fm !== undefined && tipoProgressaoFM) {
      tipoProgressaoFM.value = message.config.tipo_progressao_fm;
      console.log('✅ [SIDEPANEL] Tipo progressão FM atualizado para:', message.config.tipo_progressao_fm);
      
      // Disparar evento change para atualizar interface
      tipoProgressaoFM.dispatchEvent(new Event('change'));
    }
    
    // Atualizar o state local também
    if (typeof state !== 'undefined') {
      if (!state.configQuentesFrios) state.configQuentesFrios = {};
      
      if (message.config.qtd_hot !== undefined) {
        state.configQuentesFrios.qtdQuentes = message.config.qtd_hot;
      }
      if (message.config.qtd_cold !== undefined) {
        state.configQuentesFrios.qtdFrios = message.config.qtd_cold;
      }
      if (message.config.vizinhos !== undefined) {
        state.configQuentesFrios.qtdVizinhos = message.config.vizinhos;
      }
      if (message.config.qtd_analise !== undefined) {
        state.maxRodadasHistorico = message.config.qtd_analise;
      }
      
      // Atualizar configurações do Funcionário do Mês
      if (!state.configFuncionarioMes) state.configFuncionarioMes = {};
      
      if (message.config.numeros_fixos_fm !== undefined) {
        state.configFuncionarioMes.numerosFixos = message.config.numeros_fixos_fm;
      }
      if (message.config.tipo_progressao_fm !== undefined) {
        state.configFuncionarioMes.tipo = message.config.tipo_progressao_fm;
      }
      if (message.config.gales_multiplicadores_fm) {
        state.configFuncionarioMes.multiplicadores = message.config.gales_multiplicadores_fm;
      } else if (message.config.ciclo_multiplicadores_fm) {
        state.configFuncionarioMes.multiplicadores = message.config.ciclo_multiplicadores_fm;
      }
      
      // Salvar no storage
      chrome.storage.local.set({ rouletteState: state });
      console.log('✅ [SIDEPANEL] State local atualizado:', {
        configQuentesFrios: state.configQuentesFrios,
        configFuncionarioMes: state.configFuncionarioMes
      });
    }
    
    // Atualizar outros campos se necessário
    if (message.config.valor_ficha) {
      const valorFichaInput = document.getElementById('valorFicha');
      if (valorFichaInput) {
        valorFichaInput.value = message.config.valor_ficha;
      }
    }
    
    if (message.config.gales !== undefined) {
      const galesInput = document.getElementById('gales');
      if (galesInput) {
        galesInput.value = message.config.gales;
      }
    }
  }
  
  // Novo: Processar alteração do modo simulação
  if (message.tipo === 'simulacao_alterada') {
    console.log('🧪 [SIDEPANEL] Modo simulação alterado:', message.modoSimulacao);
    
    // Atualizar toggle de simulação se existir
    const toggleSimulacao = document.getElementById('toggleSimulacao');
    if (toggleSimulacao) {
      toggleSimulacao.checked = message.modoSimulacao;
      console.log('✅ [SIDEPANEL] Toggle simulação atualizado:', message.modoSimulacao);
    }
    
    // Mostrar notificação
    const statusTexto = message.modoSimulacao ? 'Simulação Ativa' : 'Modo Real';
    mostrarNotificacao(`🧪 ${statusTexto}`, message.modoSimulacao ? 'aviso' : 'sucesso', 2000);
  }

  // Novo: Resetar interface de placar
  if (message.tipo === 'reset_stats_ui') {
    console.log('🔄 [SIDEPANEL] Comando de reset UI recebido');
    
    // Resetar placar visual (botState local)
    botState.wins = 0;
    botState.losses = 0;
    botState.lucro = 0;
    botState.assertividade = 0;
    
    if (message.novoSaldo !== undefined) {
      botState.saldo = message.novoSaldo;
      botState.saldoInicial = message.novoSaldo;
    }

    // Se houver placarSimulacao local
    if (typeof placarSimulacao !== 'undefined') {
        placarSimulacao.wins = 0;
        placarSimulacao.losses = 0;
        placarSimulacao.lucro = 0;
        placarSimulacao.saldo = 0;
    }

    // Forçar atualização do minipainel
    atualizarMiniPainel();
    renderizarHistoricoApostas();
    
    mostrarNotificacao('🔄 Placar e saldo resetados', 'sucesso', 2000);
  }
  
  return true; // Manter o canal de mensagem aberto
});

console.log('🎧 [SIDEPANEL] Listener de mensagens registrado');