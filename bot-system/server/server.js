const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// ===== SUPABASE CLIENT =====
// Usando as chaves diretamente para evitar erros de configuração no Render
const SUPABASE_URL = 'https://vfmzxgznrgwnzghqaaau.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbXp4Z3pucmd3bnpnaHFhYWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAxNTUzNiwiZXhwIjoyMDgxNTkxNTM2fQ.t-MCR6v0onhFLDAk9KgpzK_9NdT3NZ2SirQP2QV-h2k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ===== ROTAS API DEVEM VIR ANTES DO STATIC =====

// ===== BANCO DE DADOS (JSON LOCAL + SUPABASE) =====
const DB_PATH = path.join(__dirname, 'db.json');

function lerDB() {
  try {
    if (!fs.existsSync(DB_PATH)) {
      console.log('⚠️ db.json não encontrado, criando um novo...');
      const defaultDB = { usuarios: [], estrategias: [] };
      fs.writeFileSync(DB_PATH, JSON.stringify(defaultDB, null, 2));
      return defaultDB;
    }
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  } catch (e) {
    console.error('❌ Erro ao ler db.json:', e.message);
    return { usuarios: [], estrategias: [] };
  }
}

function salvarDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Inicializar DB local (apenas para estratégias e cache)
let db = lerDB();

if (!db.estrategias) db.estrategias = [];
if (!db.usuarios) db.usuarios = [];

// Criar admin padrão no Supabase se não existir
async function inicializarAdmin() {
  try {
    const { data: adminExiste } = await supabase.auth.admin.listUsers();
    const temAdmin = adminExiste?.users?.some(u => u.email === 'admin@reidosbots.com');
    
    if (!temAdmin) {
      await supabase.auth.admin.createUser({
        email: 'admin@reidosbots.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });
      console.log('✅ Admin criado no Supabase: admin@reidosbots.com / admin123');
    }
  } catch (e) {
    console.error('❌ Erro ao criar admin:', e.message);
  }
}

inicializarAdmin();
salvarDB(db);

function proximoId(lista) {
  return lista.length === 0 ? 1 : Math.max(...lista.map(i => i.id)) + 1;
}

// ===== WEBSOCKET =====
const conexoesUsuario = new Map();

wss.on('connection', (ws) => {
  let emailConectado = null;

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.tipo === 'identificar') {
        emailConectado = msg.email;
        conexoesUsuario.set(emailConectado, ws);
        console.log(`🔌 Extensão conectada: ${emailConectado}`);

        // Buscar config do usuário no Supabase
        const { data: userData } = await supabase
          .from('usuarios_bot')
          .select('*')
          .eq('email', emailConectado)
          .single();

        if (userData && userData.config) {
          const config = userData.config;
          
          // Buscar estratégia se houver
          if (config.estrategia) {
            let est = db.estrategias.find(e => e.chave === config.estrategia);
            
            // Se não achou no JSON local, buscar no Supabase
            if (!est) {
              const { data: estSupabase } = await supabase
                .from('estrategias')
                .select('*')
                .eq('chave', config.estrategia)
                .maybeSingle();
              
              if (estSupabase) est = estSupabase;
            }

            if (est) {
              config.gatilhos = est.gatilhos || [];
              config.legendas = est.legendas || [];
              config.nome = est.nome;
            }
          }

          ws.send(JSON.stringify({
            tipo: 'config',
            ...config
          }));
          console.log(`📤 Config completa enviada via WS para ${emailConectado}`);
        }
      }

      if (msg.tipo === 'resultado') {
        console.log(`📊 Resultado de ${emailConectado}: número ${msg.numero}`);
        
        // Salvar histórico dentro do objeto config para garantir compatibilidade
        if (msg.historico && Array.isArray(msg.historico)) {
          const { data: user } = await supabase.from('usuarios_bot').select('config').eq('email', emailConectado).single();
          let currentConfig = user?.config || {};
          currentConfig.historico_rodadas = msg.historico;

          await supabase
            .from('usuarios_bot')
            .update({ 
              config: currentConfig,
              updated_at: new Date().toISOString()
            })
            .eq('email', emailConectado);
          
          console.log(`📜 Histórico de ${msg.historico.length} números salvo para ${emailConectado}`);
        }
      }

      if (msg.tipo === 'status_bot') {
        // Atualizar status no Supabase
        await supabase
          .from('usuarios_bot')
          .update({ status_bot: msg.status })
          .eq('email', msg.email || emailConectado);
        
        console.log(`📍 Status do bot de ${msg.email || emailConectado}: ${msg.status}`);
      }

      if (msg.tipo === 'rodadas_aguardando') {
        // Atualizar informações de rodadas aguardando
        const { data: userData } = await supabase
          .from('usuarios_bot')
          .select('stats')
          .eq('email', emailConectado)
          .single();

        let stats = userData?.stats || {};
        stats.rodadasAguardando = msg.rodadas;
        stats.statusBot = msg.statusBot || 'Aguardando';

        await supabase
          .from('usuarios_bot')
          .update({ stats })
          .eq('email', emailConectado);
        
        console.log(`⏳ Rodadas aguardando de ${emailConectado}: ${msg.rodadas}`);
      }

      if (msg.tipo === 'status_aposta') {
        // Atualizar status de aposta em andamento
        const { data: userData } = await supabase
          .from('usuarios_bot')
          .select('stats')
          .eq('email', emailConectado)
          .single();

        let stats = userData?.stats || {};
        stats.statusBot = msg.statusBot || 'Aguardando';
        stats.tipoAposta = msg.tipoAposta || '';
        stats.estrategiaAtiva = msg.estrategia || '';
        
        // Se a aposta finalizou, limpar informações de aposta
        if (msg.tipoAposta === 'Finalizada') {
          stats.tipoAposta = '';
          stats.rodadasAguardando = 0;
        }

        await supabase
          .from('usuarios_bot')
          .update({ stats })
          .eq('email', emailConectado);
        
        console.log(`🎯 Status de aposta de ${emailConectado}: ${msg.statusBot} (${msg.tipoAposta})`);
      }

    } catch (e) {
      console.error('Erro WS:', e.message);
    }
  });

  ws.on('close', () => {
    if (emailConectado) {
      conexoesUsuario.delete(emailConectado);
      console.log(`🔌 Desconectado: ${emailConectado}`);
    }
  });
});

// ===== API =====

// Login usuário (Supabase Auth)
app.post('/api/login', async (req, res) => {
  const { email, senha } = req.body;
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      return res.status(401).json({ erro: 'Email ou senha inválidos' });
    }

    // Verificar se usuário está ativo e se pode usar o Bot Online
    const { data: userData, error: userError } = await supabase
      .from('usuarios_bot')
      .select('ativo, bot_online')
      .eq('email', email)
      .maybeSingle();

    if (userError) {
      console.error('Erro ao buscar dados do usuário:', userError);
    }

    if (userData && userData.ativo === false) {
      return res.status(401).json({ erro: 'Conta inativa. Contate o administrador.' });
    }

    // Verificar se é uma requisição do site e se tem permissão (bloqueia apenas se for explicitamente false)
    const isBrowserRequest = req.headers.origin || req.headers.referer;
    if (isBrowserRequest && userData && userData.bot_online === false) {
      console.log(`🚫 Acesso negado para ${email}: bot_online está como false`);
      return res.status(403).json({ erro: 'Acesso ao Bot Online não autorizado para esta conta.' });
    }

    // Se não encontrou na usuarios_bot, vamos verificar nos metadados do Auth (fallback)
    if (!userData) {
      const userMeta = data.user.user_metadata || {};
      if (userMeta.ativo === false) {
        return res.status(401).json({ erro: 'Conta inativa. Contate o administrador.' });
      }
      if (isBrowserRequest && userMeta.bot_online === false) {
        console.log(`🚫 Acesso negado para ${email} via Auth Metadata: bot_online está como false`);
        return res.status(403).json({ erro: 'Acesso ao Bot Online não autorizado para esta conta.' });
      }
    }

    res.json({ 
      ok: true, 
      email: data.user.email,
      token: data.session.access_token 
    });
  } catch (e) {
    console.error('Erro no login:', e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Buscar config do usuário (com gatilhos inclusos)
app.get('/api/config/:email', async (req, res) => {
  try {
    const { data: userData } = await supabase
      .from('usuarios_bot')
      .select('*')
      .eq('email', req.params.email)
      .single();

    if (!userData) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }
    
    const config = userData.config || {};
    let est = db.estrategias.find(e => e.chave === config.estrategia);
    
    // Se não achou no JSON local, buscar no Supabase
    if (!est && config.estrategia) {
      const { data: estSupabase } = await supabase
        .from('estrategias')
        .select('*')
        .eq('chave', config.estrategia)
        .maybeSingle();
      
      if (estSupabase) est = estSupabase;
    }
    
    // Garantir gatilhos e nome
    if (!config.gatilhos || config.gatilhos.length === 0) {
      config.gatilhos = est ? est.gatilhos : [];
    }
    if (!config.legendas || config.legendas.length === 0) {
      config.legendas = est ? est.legendas : [];
    }
    if (!config.nome) {
      config.nome = est ? est.nome : (config.estrategia || '');
    }
    if (!config.estrategia_nome && est) {
      config.estrategia_nome = est.nome;
    }

    res.json({ ...config, botLigado: userData.bot_ligado || false });
  } catch (e) {
    console.error('Erro ao buscar config:', e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Salvar config do usuário
app.post('/api/config', async (req, res) => {
  const { 
    email, estrategia, estrategia_id, estrategia_nome, gatilhos, valor_ficha, stop_win, stop_loss, gales, 
    qtd_hot, qtd_cold, vizinhos, qtd_analise, ficha_g1, ficha_g2,
    tipo_progressao, gales_multiplicadores, ciclo_multiplicadores,
    // Novos campos do Funcionário do Mês
    numeros_fixos_fm, tipo_progressao_fm, gales_multiplicadores_fm, ciclo_multiplicadores_fm,
    // Modo IA Fortuna
    modo_ia
  } = req.body;
  
  try {
    const config = { 
      estrategia: estrategia || '',
      estrategia_id: estrategia_id || null,
      estrategia_nome: estrategia_nome || '',
      gatilhos: gatilhos || [],
      valor_ficha: valor_ficha || 1,
      stop_win: stop_win || 0,
      stop_loss: stop_loss || 0,
      gales: gales || 0,
      qtd_hot: (qtd_hot !== undefined && qtd_hot !== null) ? qtd_hot : 5,
      qtd_cold: (qtd_cold !== undefined && qtd_cold !== null) ? qtd_cold : 5,
      vizinhos: (vizinhos !== undefined && vizinhos !== null) ? vizinhos : 0,
      qtd_analise: qtd_analise ?? 100,
      ficha_g1: ficha_g1 ?? 0,
      ficha_g2: ficha_g2 ?? 0,
      tipo_progressao: tipo_progressao || 'simples',
      gales_multiplicadores: gales_multiplicadores || [],
      ciclo_multiplicadores: ciclo_multiplicadores || [],
      // Funcionário do Mês
      numeros_fixos_fm: numeros_fixos_fm || '',
      tipo_progressao_fm: tipo_progressao_fm || 'simples',
      gales_multiplicadores_fm: gales_multiplicadores_fm || [],
      ciclo_multiplicadores_fm: ciclo_multiplicadores_fm || [],
      // IA Fortuna
      modo_ia: modo_ia || 'moderado'
    };

    console.log('💾 Salvando config para', email, ':', config);

    // Atualizar no Supabase usando update ou insert para ser mais robusto
    const { data: userExistente, error: searchError } = await supabase
      .from('usuarios_bot')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (searchError) throw searchError;

    let result;
    if (userExistente) {
      result = await supabase
        .from('usuarios_bot')
        .update({ 
          config,
          updated_at: new Date().toISOString()
        })
        .eq('id', userExistente.id);
    } else {
      result = await supabase
        .from('usuarios_bot')
        .insert({ 
          email, 
          config,
          ativo: true
        });
    }

    if (result.error) throw result.error;

    // Enviar para extensão se conectada
    const ws = conexoesUsuario.get(email);
    if (ws && ws.readyState === WebSocket.OPEN) {
      const mensagem = {
        tipo: 'config',
        ...config
      };
      ws.send(JSON.stringify(mensagem));
      console.log(`📤 Config enviada via WebSocket para ${email}:`, mensagem);
    } else {
      console.log(`⚠️ Extensão não conectada para ${email}. WebSocket status:`, ws ? ws.readyState : 'não existe');
    }

    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Erro ao salvar config:', e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Listar estratégias do usuário (do Supabase) - SIMPLIFICADO
app.get('/api/estrategias/:email?', async (req, res) => {
  try {
    const email = req.params.email;
    console.log('📋 Buscando estratégias para:', email);
    
    const { data: estrategias, error } = await supabase
      .from('estrategias')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) {
      console.error('❌ Erro ao buscar estratégias:', error);
      throw error;
    }
    
    // Garantir que todas as estratégias tenham uma 'chave'
    const listaTratada = (estrategias || []).map(e => {
      if (!e.chave) {
        e.chave = e.nome.toLowerCase()
          .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '_').replace(/_+/g, '_');
      }
      return e;
    });
    
    console.log('✅ Estratégias encontradas:', listaTratada.length);
    res.json(listaTratada);
    
  } catch (e) {
    console.error('❌ Erro ao buscar estratégias:', e);
    res.status(500).json({ erro: 'Erro ao buscar estratégias' });
  }
});

// ===== ADMIN API =====

app.post('/api/admin/login', (req, res) => {
  const { email, senha } = req.body;
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === email);
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha) || email !== 'admin@reidosbots.com') {
    return res.status(401).json({ erro: 'Credenciais inválidas' });
  }
  res.json({ ok: true });
});

app.get('/api/admin/usuarios', async (req, res) => {
  try {
    const { data: usuarios, error } = await supabase
      .from('usuarios_bot')
      .select('*')
      .neq('email', 'admin@reidosbots.com');
    
    if (error) throw error;
    
    const lista = usuarios.map(u => ({ 
      id: u.id, 
      email: u.email, 
      ativo: u.ativo, 
      ...u.config 
    }));
    res.json(lista);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.post('/api/admin/usuarios', async (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });
  
  try {
    // Criar no Supabase Auth
    const { data, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true
    });

    if (authError) throw authError;

    // Criar na tabela usuarios_bot
    const { error: dbError } = await supabase
      .from('usuarios_bot')
      .insert({ 
        email, 
        ativo: true, 
        config: {} 
      });

    if (dbError) throw dbError;

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.patch('/api/admin/usuarios/:id', async (req, res) => {
  const { ativo, senha, config } = req.body;
  const id = req.params.id;

  try {
    const updateData = {};
    if (ativo !== undefined) updateData.ativo = ativo;
    if (config) updateData.config = config;

    const { error } = await supabase
      .from('usuarios_bot')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    // Se tiver senha, atualizar no Supabase Auth (precisa do email)
    if (senha) {
      const { data: user } = await supabase
        .from('usuarios_bot')
        .select('email')
        .eq('id', id)
        .single();
      
      if (user) {
        // Para atualizar senha via admin, precisamos do ID do Auth
        const { data: authUsers } = await supabase.auth.admin.listUsers();
        const authUser = authUsers.users.find(u => u.email === user.email);
        if (authUser) {
          await supabase.auth.admin.updateUserById(authUser.id, { password: senha });
        }
      }
    }

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.delete('/api/admin/usuarios/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { data: user } = await supabase
      .from('usuarios_bot')
      .select('email')
      .eq('id', id)
      .single();

    if (user) {
      // Deletar do Auth
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      const authUser = authUsers.users.find(u => u.email === user.email);
      if (authUser) {
        await supabase.auth.admin.deleteUser(authUser.id);
      }
    }

    const { error } = await supabase
      .from('usuarios_bot')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.get('/api/admin/estrategias', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('estrategias')
      .select('*')
      .order('nome', { ascending: true });
    
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.post('/api/admin/estrategias', async (req, res) => {
  const { nome, chave, numeros, descricao, gatilhos, legendas } = req.body;
  try {
    const { data, error } = await supabase
      .from('estrategias')
      .insert({ 
        nome, 
        chave, 
        numeros: numeros || [], 
        descricao: descricao || '', 
        gatilhos: gatilhos || [], 
        legendas: legendas || [],
        ativa: true 
      })
      .select()
      .single();

    if (error) throw error;
    res.json({ ok: true, id: data.id });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.patch('/api/admin/estrategias/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { error } = await supabase
      .from('estrategias')
      .update(req.body)
      .eq('id', id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.delete('/api/admin/estrategias/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const { error } = await supabase
      .from('estrategias')
      .delete()
      .eq('id', id);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// Comando de simulação (ativar/desativar modo simulação)
app.post('/api/comando-simulacao', async (req, res) => {
  const { email, modoSimulacao } = req.body;
  
  try {
    console.log(`🧪 [SIMULAÇÃO] ${email}: ${modoSimulacao ? 'Ativando' : 'Desativando'} modo simulação`);
    
    // Salvar no Supabase
    await supabase
      .from('usuarios_bot')
      .update({ 
        modo_simulacao: modoSimulacao,
        updated_at: new Date().toISOString()
      })
      .eq('email', email);
    
    // Enviar para extensão se conectada
    const ws = conexoesUsuario.get(email);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        tipo: 'comando_simulacao',
        modoSimulacao: modoSimulacao
      }));
      console.log(`📤 Comando simulação enviado via WebSocket para ${email}`);
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ Erro ao processar comando simulação:', e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Comando remoto (ligar/desligar bot pelo celular)
app.post('/api/comando', async (req, res) => {
  const { email, acao } = req.body;
  
  try {
    // Salvar estado no Supabase
    if (acao === 'ligar' || acao === 'desligar') {
      await supabase
        .from('usuarios_bot')
        .update({ 
          bot_ligado: acao === 'ligar',
          status_bot: acao === 'ligar' ? 'inicializando' : 'desligando'
        })
        .eq('email', email);
    }
    
    const ws = conexoesUsuario.get(email);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ tipo: 'comando', acao }));
      console.log(`📱 Comando '${acao}' enviado para ${email}`);
      res.json({ ok: true, enviado: true });
    } else {
      res.json({ ok: true, enviado: false, aviso: 'Extensão não conectada' });
    }
  } catch (e) {
    console.error('Erro ao enviar comando:', e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Status do bot (greens, reds, saldo)
app.post('/api/stats', async (req, res) => {
  const { email, greens, reds, saldo, saldoInicial, modo_simulacao, estrategia_nome } = req.body;
  if (!email) return res.status(400).json({ erro: 'Email obrigatório' });

  try {
    // Buscar dados atuais do usuário para obter o saldoInicial gravado
    const { data: userData } = await supabase
      .from('usuarios_bot')
      .select('stats')
      .eq('email', email)
      .single();

    const statsAtuais = userData?.stats || {};
    let saldoInicialFinal = statsAtuais.saldoInicial;

    // Lógica para determinar o saldo inicial:
    // 1. Se for enviado um saldo inicial válido (maior que 0), priorizamos ele (útil para Simulação)
    if (saldoInicial !== undefined && saldoInicial !== null && parseFloat(saldoInicial) > 0) {
      saldoInicialFinal = parseFloat(saldoInicial);
    } 
    // 2. Se não houver um saldo inicial gravado (ou for 0) e recebermos um saldo atual válido, capturamos como inicial
    else if ((!saldoInicialFinal || parseFloat(saldoInicialFinal) === 0) && saldo !== null && saldo !== undefined && parseFloat(saldo) > 0) {
      saldoInicialFinal = parseFloat(saldo);
      console.log(`💡 [STATS] Capturando saldo inicial para ${email}: R$ ${saldoInicialFinal}`);
    }

    const statsParaSalvar = {
      greens: greens !== undefined ? greens : (statsAtuais.greens || 0),
      reds: reds !== undefined ? reds : (statsAtuais.reds || 0),
      saldo: saldo !== undefined ? saldo : (statsAtuais.saldo || null),
      saldoInicial: saldoInicialFinal,
      atualizado: Date.now()
    };

    const updateData = {
      stats: statsParaSalvar,
      updated_at: new Date().toISOString()
    };

    if (modo_simulacao !== undefined) updateData.modo_simulacao = modo_simulacao;
    
    // Buscar config atual para não perder outros dados (ex: estrategia_nome)
    const { data: user } = await supabase.from('usuarios_bot').select('config').eq('email', email).single();
    let newConfig = user?.config || {};
    
    if (estrategia_nome) newConfig.estrategia_nome = estrategia_nome;
    updateData.config = newConfig;

    const { error } = await supabase
      .from('usuarios_bot')
      .update(updateData)
      .eq('email', email);

    if (error) throw error;
    res.json({ ok: true });
  } catch (e) {
    console.error('❌ [STATS] Erro ao salvar stats:', e);
    res.status(500).json({ erro: e.message });
  }
});

app.get('/api/stats/:email', async (req, res) => {
  try {
    console.log('📊 [STATS] Buscando stats para:', req.params.email);
    
    const { data } = await supabase
      .from('usuarios_bot')
      .select('stats')
      .eq('email', req.params.email)
      .single();
    
    const stats = data?.stats || { greens: 0, reds: 0, saldo: null, saldoInicial: null };
    console.log('📊 [STATS] Stats encontradas:', stats);
    
    res.json(stats);
  } catch (e) {
    console.error('❌ [STATS] Erro ao buscar stats:', e);
    res.json({ greens: 0, reds: 0, saldo: null, saldoInicial: null });
  }
});

// Status do bot (inicializando, na_mesa, desligando, deslogado)
app.get('/api/status/:email', async (req, res) => {
  try {
    const { data } = await supabase
      .from('usuarios_bot')
      .select('status_bot, modo_simulacao')
      .eq('email', req.params.email)
      .single();
    
    res.json({ 
      statusBot: data?.status_bot || 'deslogado',
      modoSimulacao: data?.modo_simulacao ?? true // true por padrão
    });
  } catch (e) {
    res.json({ statusBot: 'deslogado', modoSimulacao: true });
  }
});

// Limpar placar
app.post('/api/reset-stats', async (req, res) => {
  const { email, resetarSaldo } = req.body;
  
  try {
    const { data: userData } = await supabase
      .from('usuarios_bot')
      .select('stats, modo_simulacao')
      .eq('email', email)
      .single();
    
    // Obter saldo atual (Real ou Simulado)
    const saldoAtual = userData?.stats?.saldo || 0;
    
    // Se for modo real, o 'resetarSaldo' na verdade significa 'resetar lucro',
    // então o novo saldoInicial deve ser o saldoAtual.
    // Se for modo simulação e resetarSaldo for true, podemos manter a lógica de voltar pro inicial se preferir,
    // mas o pedido do usuário é focar no 'base 0'.
    
    const novoSaldoInicial = (saldoAtual > 0) ? saldoAtual : (userData?.stats?.saldoInicial || 0);

    console.log(`🔄 [RESET] ${email}: Resetando placar. Novo saldo de base: ${novoSaldoInicial}`);

    await supabase
      .from('usuarios_bot')
      .update({ 
        stats: { 
          greens: 0, 
          reds: 0, 
          saldo: saldoAtual, 
          saldoInicial: novoSaldoInicial, 
          atualizado: Date.now() 
        }
      })
      .eq('email', email);
    
    const ws = conexoesUsuario.get(email);
    if (ws && ws.readyState === WebSocket.OPEN) {
      // O comando reset_stats deve ser obedecido pela extensão independentemente do modo
      ws.send(JSON.stringify({ 
        tipo: 'comando', 
        acao: 'reset_stats', 
        novoSaldo: novoSaldo,
        resetarSaldo: !!resetarSaldo 
      }));
    }
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro ao resetar stats:', e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Buscar user_metadata (salvo na tabela usuarios_bot)
app.get('/api/user-metadata/:email', async (req, res) => {
  try {
    const { data } = await supabase
      .from('usuarios_bot')
      .select('casa_url, casa_email, casa_senha')
      .eq('email', req.params.email)
      .single();
    
    res.json(data || {});
  } catch (e) {
    console.error('Erro ao buscar user_metadata:', e);
    res.json({});
  }
});

// Salvar user_metadata (na tabela usuarios_bot)
app.post('/api/user-metadata', async (req, res) => {
  const { email, casa_url, casa_email, casa_senha } = req.body;
  
  try {
    const { error } = await supabase
      .from('usuarios_bot')
      .upsert({ 
        email,
        casa_url,
        casa_email,
        casa_senha,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });
    
    if (error) throw error;
    
    res.json({ ok: true });
  } catch (e) {
    console.error('Erro ao salvar user_metadata:', e);
    res.status(500).json({ erro: 'Erro no servidor' });
  }
});

// Rota de teste WebSocket
app.get('/test-ws', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head><title>Teste WebSocket</title></head>
    <body>
        <h1>Teste de Conexão WebSocket</h1>
        <div id="status">Conectando...</div>
        <div id="logs"></div>
        <script>
            const logs = document.getElementById('logs');
            const status = document.getElementById('status');
            function log(msg) {
                console.log(msg);
                logs.innerHTML += '<p>' + msg + '</p>';
            }
            log('🔌 Tentando conectar em ws://localhost:3000...');
            const ws = new WebSocket('ws://localhost:3000');
            ws.onopen = () => {
                log('✅ Conectado!');
                status.textContent = 'Conectado!';
                status.style.color = 'green';
                ws.send(JSON.stringify({ tipo: 'identificar', email: 'teste@teste.com' }));
                log('📤 Mensagem enviada');
            };
            ws.onmessage = (event) => {
                log('📨 Mensagem recebida: ' + event.data);
            };
            ws.onerror = (error) => {
                log('❌ Erro: ' + error);
                status.textContent = 'Erro na conexão';
                status.style.color = 'red';
            };
            ws.onclose = () => {
                log('🔌 Desconectado');
                status.textContent = 'Desconectado';
                status.style.color = 'orange';
            };
        </script>
    </body>
    </html>
  `);
});

app.use('/admin', express.static(path.join(__dirname, '../painel-admin')));
app.use('/painel', express.static(path.join(__dirname, '../painel-usuario')));
app.use(express.static(path.join(__dirname, '../../')));

app.get('/api/historico/:email', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('usuarios_bot')
      .select('config')
      .eq('email', req.params.email)
      .single();
    
    if (error) throw error;
    // Retornar o histórico de rodadas guardado dentro do config
    res.json(data?.config?.historico_rodadas || []);
  } catch (e) {
    res.json([]);
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando na porta: ${PORT}`);
  console.log(`📊 Painel usuário: /painel`);
  console.log(`🔧 Painel admin:   /admin`);
  console.log(`🔌 WebSocket:      ws://localhost:${PORT}`);
  console.log(`\n👤 Admin: admin@reidosbots.com / admin123\n`);
});
