const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// ===== ROTAS API DEVEM VIR ANTES DO STATIC =====

// ===== BANCO DE DADOS (JSON) =====
const DB_PATH = path.join(__dirname, 'db.json');

function lerDB() {
  if (!fs.existsSync(DB_PATH)) return { usuarios: [], estrategias: [] };
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function salvarDB(db) {
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

// Inicializar DB com dados padrão
let db = lerDB();

if (!db.estrategias) db.estrategias = [];

if (!db.usuarios) db.usuarios = [];

// Criar admin padrão se não existir
if (!db.usuarios.find(u => u.email === 'admin@reidosbots.com')) {
  db.usuarios.push({
    id: 1,
    email: 'admin@reidosbots.com',
    senha: bcrypt.hashSync('admin123', 10),
    ativo: true,
    config: {}
  });
  console.log('✅ Admin criado: admin@reidosbots.com / admin123');
}

salvarDB(db);

function proximoId(lista) {
  return lista.length === 0 ? 1 : Math.max(...lista.map(i => i.id)) + 1;
}

// ===== WEBSOCKET =====
const conexoesUsuario = new Map();

wss.on('connection', (ws) => {
  let emailConectado = null;

  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      if (msg.tipo === 'identificar') {
        emailConectado = msg.email;
        conexoesUsuario.set(emailConectado, ws);
        console.log(`🔌 Extensão conectada: ${emailConectado}`);

        const db = lerDB();
        const usuario = db.usuarios.find(u => u.email === emailConectado);
        if (usuario && usuario.config && usuario.config.estrategia) {
          const est = db.estrategias.find(e => e.chave === usuario.config.estrategia);
          
          // Buscar config completa igual ao endpoint GET /api/config/:email
          const config = usuario.config || {};
          if (!config.gatilhos || config.gatilhos.length === 0) {
            config.gatilhos = est ? est.gatilhos : [];
          }
          if (!config.nome) {
            config.nome = est ? est.nome : config.estrategia;
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
      }

      if (msg.tipo === 'status_bot') {
        const db = lerDB();
        const usuario = db.usuarios.find(u => u.email === msg.email || u.email === emailConectado);
        if (usuario) {
          usuario.statusBot = msg.status;
          salvarDB(db);
          console.log(`📍 Status do bot de ${usuario.email}: ${msg.status}`);
        }
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

// Login usuário
app.post('/api/login', (req, res) => {
  const { email, senha } = req.body;
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === email && u.ativo);
  if (!usuario || !bcrypt.compareSync(senha, usuario.senha)) {
    return res.status(401).json({ erro: 'Email ou senha inválidos' });
  }
  res.json({ ok: true, email: usuario.email, id: usuario.id });
});

// Buscar config do usuário (com gatilhos inclusos)
app.get('/api/config/:email', (req, res) => {
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === req.params.email);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });
  
  const config = JSON.parse(JSON.stringify(usuario.config || {}));
  const est = db.estrategias.find(e => e.chave === config.estrategia);
  
  // Garantir gatilhos e nome
  if (!config.gatilhos || config.gatilhos.length === 0) {
    config.gatilhos = est ? est.gatilhos : [];
  }
  if (!config.nome) {
    config.nome = est ? est.nome : (config.estrategia || '');
  }

  res.json({ ...config, botLigado: usuario.botLigado || false });
});

// Salvar config do usuário
app.post('/api/config', (req, res) => {
  const { email, estrategia, valor_ficha, stop_win, stop_loss, gales, gatilhos } = req.body;
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === email);
  if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado' });

  // Buscar estratégia para garantir gatilhos se não vierem no body
  const est = db.estrategias.find(e => e.chave === estrategia);
  const gatilhosFinais = (gatilhos && gatilhos.length > 0) ? gatilhos : (est ? est.gatilhos : []);

  usuario.config = { 
    estrategia, 
    valor_ficha, 
    stop_win, 
    stop_loss, 
    gales, 
    gatilhos: gatilhosFinais,
    nome: est ? est.nome : estrategia
  };
  salvarDB(db);

  // Enviar para extensão se conectada
  const ws = conexoesUsuario.get(email);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      tipo: 'config',
      ...usuario.config
    }));
    console.log(`📤 Config enviada para ${email}`);
  }

  res.json({ ok: true });
});

// Listar estratégias
app.get('/api/estrategias', (req, res) => {
  const db = lerDB();
  res.json(db.estrategias.filter(e => e.ativa));
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

app.get('/api/admin/usuarios', (req, res) => {
  const db = lerDB();
  const lista = db.usuarios
    .filter(u => u.email !== 'admin@reidosbots.com')
    .map(u => ({ id: u.id, email: u.email, ativo: u.ativo, ...u.config }));
  res.json(lista);
});

app.post('/api/admin/usuarios', (req, res) => {
  const { email, senha } = req.body;
  if (!email || !senha) return res.status(400).json({ erro: 'Email e senha obrigatórios' });
  const db = lerDB();
  if (db.usuarios.find(u => u.email === email)) return res.status(400).json({ erro: 'Email já cadastrado' });
  const novo = { id: proximoId(db.usuarios), email, senha: bcrypt.hashSync(senha, 10), ativo: true, config: {} };
  db.usuarios.push(novo);
  salvarDB(db);
  res.json({ ok: true, id: novo.id });
});

app.patch('/api/admin/usuarios/:id', (req, res) => {
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.id === parseInt(req.params.id));
  if (!usuario) return res.status(404).json({ erro: 'Não encontrado' });
  usuario.ativo = req.body.ativo;
  salvarDB(db);
  res.json({ ok: true });
});

app.delete('/api/admin/usuarios/:id', (req, res) => {
  const db = lerDB();
  db.usuarios = db.usuarios.filter(u => u.id !== parseInt(req.params.id));
  salvarDB(db);
  res.json({ ok: true });
});

app.get('/api/admin/estrategias', (req, res) => {
  const db = lerDB();
  res.json(db.estrategias);
});

app.post('/api/admin/estrategias', (req, res) => {
  const { nome, chave, numeros, descricao, gatilhos } = req.body;
  const db = lerDB();
  if (db.estrategias.find(e => e.chave === chave)) return res.status(400).json({ erro: 'Chave já existe' });
  const nova = { id: proximoId(db.estrategias), nome, chave, numeros: numeros || [], descricao: descricao || '', gatilhos: gatilhos || [], ativa: true };
  db.estrategias.push(nova);
  salvarDB(db);
  res.json({ ok: true, id: nova.id });
});

app.patch('/api/admin/estrategias/:id', (req, res) => {
  const db = lerDB();
  const est = db.estrategias.find(e => e.id === parseInt(req.params.id));
  if (!est) return res.status(404).json({ erro: 'Não encontrada' });
  Object.assign(est, req.body);
  salvarDB(db);
  res.json({ ok: true });
});

app.delete('/api/admin/estrategias/:id', (req, res) => {
  const db = lerDB();
  db.estrategias = db.estrategias.filter(e => e.id !== parseInt(req.params.id));
  salvarDB(db);
  res.json({ ok: true });
});

// Comando remoto (ligar/desligar bot pelo celular)
app.post('/api/comando', (req, res) => {
  const { email, acao } = req.body;
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === email);
  // Salvar estado no db
  if (usuario) {
    usuario.botLigado = acao === 'ligar';
    usuario.statusBot = acao === 'ligar' ? 'inicializando' : 'desligando';
    salvarDB(db);
  }
  const ws = conexoesUsuario.get(email);
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ tipo: 'comando', acao }));
    console.log(`📱 Comando '${acao}' enviado para ${email}`);
    res.json({ ok: true, enviado: true });
  } else {
    res.json({ ok: true, enviado: false, aviso: 'Extensão não conectada' });
  }
});

// Status do bot (greens, reds, saldo)
app.post('/api/stats', (req, res) => {
  const { email, greens, reds, saldo, saldoInicial } = req.body;
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === email);
  if (usuario) {
    usuario.stats = { greens, reds, saldo, saldoInicial, atualizado: Date.now() };
    salvarDB(db);
  }
  res.json({ ok: true });
});

app.get('/api/stats/:email', (req, res) => {
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === req.params.email);
  res.json(usuario?.stats || { greens: 0, reds: 0, saldo: null, saldoInicial: null });
});

// Status do bot (inicializando, na_mesa, desligando, deslogado)
app.get('/api/status/:email', (req, res) => {
  const db = lerDB();
  const usuario = db.usuarios.find(u => u.email === req.params.email);
  res.json({ statusBot: usuario?.statusBot || 'deslogado' });
});

app.use('/admin', express.static(path.join(__dirname, '../painel-admin')));
app.use(express.static(path.join(__dirname, '../painel-usuario')));

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📊 Painel usuário: http://localhost:${PORT}`);
  console.log(`🔧 Painel admin:   http://localhost:${PORT}/admin`);
  console.log(`🔌 WebSocket:      ws://localhost:${PORT}`);
  console.log(`\n👤 Admin: admin@reidosbots.com / admin123\n`);
});
