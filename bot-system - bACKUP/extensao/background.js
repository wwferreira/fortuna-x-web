const WS_URL = 'ws://localhost:3000';
const URL_MESA = 'https://big.bet.br/live-casino/game/3783645?provider=Playtech&from=%2Flive-casino';
const URL_LOGIN_CASA = 'https://big.bet.br/casino?cmd=signin&path=phone';

let ws = null;
let emailUsuario = null;
let reconectarTimer = null;

async function carregarConfigDoServidor(email) {
  if (!email) return;
  try {
    const res = await fetch(`http://localhost:3000/api/config/${encodeURIComponent(email)}`);
    if (res.ok) {
      const config = await res.json();
      console.log('📡 Config completa baixada do servidor:', config);
      chrome.storage.local.set({ botConfig: config, botAtivo: config.botLigado });
      enviarConfigParaContentScript(config);
    }
  } catch (e) {
    console.error('❌ Erro ao baixar config do servidor:', e);
  }
}

// ===== WEBSOCKET =====
function conectarWS() {
  if (ws && ws.readyState === WebSocket.OPEN) return;

  chrome.storage.local.get(['casaEmail'], (result) => {
    if (!result.casaEmail) return;
    emailUsuario = result.casaEmail;

    // Baixar config logo ao conectar
    carregarConfigDoServidor(emailUsuario);

    try {
      ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('✅ WS conectado ao servidor');
        chrome.storage.local.set({ wsConectado: true });
        // Identificar usuário no servidor
        ws.send(JSON.stringify({ tipo: 'identificar', email: emailUsuario }));
        if (reconectarTimer) { clearInterval(reconectarTimer); reconectarTimer = null; }
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          // Sempre que receber config ou comando de ligar, força o download completo
          if (msg.tipo === 'config' || (msg.tipo === 'comando' && msg.acao === 'ligar')) {
            carregarConfigDoServidor(emailUsuario);
          }

          if (msg.tipo === 'comando') {
            console.log('📱 Comando remoto recebido:', msg.acao);
            chrome.storage.local.set({ botAtivo: msg.acao === 'ligar' });
            // Repassar para o content script
            chrome.tabs.query({ url: 'https://big.bet.br/live-casino/*' }, (tabs) => {
              tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, { tipo: 'comando_remoto', acao: msg.acao }).catch(() => {});
              });
            });
            // Se LIGAR: abrir big.bet.br e fazer login automático (igual ao popup)
            if (msg.acao === 'ligar') {
              // Garantir que não há logout pendente ao ligar
              // E marcar que o login está em curso para redirecionar depois
              chrome.storage.local.set({ 
                logoutPendente: false,
                botAtivo: true,
                loginEmCurso: true 
              });

              // Notificar servidor que está inicializando
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ tipo: 'status_bot', status: 'inicializando', email: emailUsuario }));
              }
              chrome.storage.local.get(['casaEmail', 'casaSenha'], (result) => {
                if (result.casaEmail && result.casaSenha) {
                  chrome.tabs.query({ url: 'https://big.bet.br/*' }, (tabs) => {
                    if (tabs.length > 0) {
                      chrome.tabs.update(tabs[0].id, { active: true, url: URL_LOGIN_CASA });
                    } else {
                      chrome.tabs.create({ url: URL_LOGIN_CASA });
                    }
                  });
                }
              });
            }
            // Se DESLIGAR: redirecionar para home e iniciar fluxo de logout
            if (msg.acao === 'desligar') {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ tipo: 'status_bot', status: 'desligando', email: emailUsuario }));
              }
              // Marcar no storage que o logout deve ser feito
              chrome.storage.local.set({ logoutPendente: true });
              
              chrome.tabs.query({ url: 'https://big.bet.br/*' }, (tabs) => {
                if (tabs.length > 0) {
                  chrome.tabs.update(tabs[0].id, { url: 'https://big.bet.br/pt' });
                } else {
                  chrome.tabs.create({ url: 'https://big.bet.br/pt' });
                }
              });
            }
          }
        } catch (e) {
          console.error('Erro ao processar mensagem WS:', e);
        }
      };

      ws.onclose = () => {
        console.log('🔌 WS desconectado');
        chrome.storage.local.set({ wsConectado: false });
        ws = null;
        // Tentar reconectar a cada 5 segundos
        if (!reconectarTimer) {
          reconectarTimer = setInterval(conectarWS, 5000);
        }
      };

      ws.onerror = () => {
        ws = null;
        chrome.storage.local.set({ wsConectado: false });
      };

    } catch (e) {
      console.error('Erro ao criar WebSocket:', e);
    }
  });
}

async function enviarConfigParaContentScript(config) {
  const tabs = await chrome.tabs.query({ url: 'https://big.bet.br/live-casino/*' });
  for (const tab of tabs) {
    try {
      await chrome.tabs.sendMessage(tab.id, { tipo: 'nova_config', config });
    } catch (e) {
      // Tab pode não ter o content script ainda
    }
  }
}

// ===== MENSAGENS DO CONTENT SCRIPT =====
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.tipo === 'resultado_numero') {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ tipo: 'resultado', numero: msg.numero, email: emailUsuario }));
    }
  }

  if (msg.tipo === 'stats') {
    chrome.storage.local.set({ botStats: { greens: msg.greens, reds: msg.reds, saldo: msg.saldo, saldoInicial: msg.saldoInicial } });
    // Usar emailUsuario da memória ou buscar do storage
    const enviar = (email) => {
      if (!email) return;
      fetch('http://localhost:3000/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, greens: msg.greens, reds: msg.reds, saldo: msg.saldo, saldoInicial: msg.saldoInicial })
      }).catch(() => {});
    };
    if (emailUsuario) {
      enviar(emailUsuario);
    } else {
      chrome.storage.local.get(['casaEmail'], (result) => {
        emailUsuario = result.casaEmail || null;
        enviar(emailUsuario);
      });
    }
  }

  if (msg.tipo === 'solicitar_config') {
    chrome.storage.local.get(['botConfig'], (result) => {
      sendResponse({ config: result.botConfig || null });
    });
    return true;
  }

  if (msg.tipo === 'login_concluido') {
    chrome.tabs.update(sender.tab.id, { url: URL_MESA });
  }
});

// ===== AUTO-LOGIN: detectar página de login =====
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status !== 'complete') return;

  // Página de login da casa (URL com cmd=signin ou /login)
  if (tab.url && tab.url.includes('big.bet.br') && (tab.url.includes('cmd=signin') || tab.url.includes('/login'))) {
    chrome.storage.local.get(['casaEmail', 'casaSenha', 'botAtivo'], (result) => {
      if (result.botAtivo && result.casaEmail && result.casaSenha) {
        // PASSO 1 — aguardar 3s para a página renderizar, depois injetar script
        setTimeout(() => {
          chrome.scripting.executeScript({
            target: { tabId },
            func: preencherLogin,
            args: [result.casaEmail, result.casaSenha]
          });
        }, 3000);
      }
    });
  }

  // Chegou na home logado (pós-login) — redirecionar para mesa imediatamente
  if (tab.url && tab.url.includes('big.bet.br')) {
    const isLoginPage = tab.url.includes('cmd=signin') || tab.url.includes('/login');

    if (!isLoginPage) {
      chrome.storage.local.get(['botAtivo', 'loginEmCurso', 'logoutPendente'], (result) => {
        // Se o bot está ativo, o login estava em curso e não é um logout...
        if (result.botAtivo && result.loginEmCurso && !result.logoutPendente) {
          console.log('🚀 Login em curso detectado! Redirecionando para a mesa...');
          chrome.storage.local.set({ loginEmCurso: false }); // Limpa a flag
          chrome.tabs.update(tabId, { url: URL_MESA });
        }
      });
    }
  }

  // Chegou na mesa — avisar servidor que bot está ativo
  if (tab.url && tab.url.includes('big.bet.br/live-casino')) {
    chrome.storage.local.set({ loginEmCurso: false }); // Garante limpeza ao chegar na mesa
    chrome.storage.local.get(['botConfig', 'casaEmail'], (result) => {
      if (result.botConfig) {
        setTimeout(() => {
          chrome.tabs.sendMessage(tabId, { tipo: 'nova_config', config: result.botConfig }).catch(() => {});
        }, 3000);
      }
      // Notificar servidor que chegou na mesa
      if (result.casaEmail && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ tipo: 'status_bot', status: 'na_mesa', email: result.casaEmail }));
      }
    });
  }

  // Chegou na página principal após logout — avisar servidor
  if (tab.url && (tab.url === 'https://big.bet.br/pt' || tab.url === 'https://big.bet.br/pt/') ) {
    chrome.storage.local.get(['casaEmail', 'logoutPendente'], (result) => {
      // Se não tem logout pendente e está na home, significa que já deslogou
      if (!result.logoutPendente) {
        if (result.casaEmail && ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ tipo: 'status_bot', status: 'deslogado', email: result.casaEmail }));
        }
      }
    });
  }
});

// Função injetada na página de login para preencher os campos
// Cada passo tem 3 segundos de delay entre si
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

// Iniciar conexão WS quando o service worker acordar
chrome.storage.local.get(['botAtivo', 'casaEmail'], (result) => {
  if (result.casaEmail) {
    emailUsuario = result.casaEmail;
    conectarWS(); // conectar sempre que tiver email salvo
  }
});

// Keep-alive do service worker
setInterval(() => {
  chrome.runtime.getPlatformInfo(() => {});
  // Tentar reconectar WS se necessário
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    chrome.storage.local.get(['casaEmail'], (result) => {
      if (result.casaEmail) conectarWS();
    });
  }
}, 20000);
