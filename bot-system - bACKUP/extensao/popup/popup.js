const URL_MESA = 'https://big.bet.br/live-casino/game/3783645?provider=Playtech&from=%2Flive-casino';
const URL_LOGIN_CASA = 'https://big.bet.br/casino?cmd=signin&path=phone';

document.addEventListener('DOMContentLoaded', () => {
  // Verificar se já está logado ao abrir o popup
  chrome.storage.local.get(['botAtivo', 'casaEmail', 'botConfig', 'wsConectado'], (result) => {
    if (result.botAtivo && result.casaEmail) {
      mostrarStatusPanel(result.casaEmail, result.botConfig, result.wsConectado);
    }
  });

  // Botão entrar na mesa
  document.getElementById('btnEntrar').addEventListener('click', entrarNaCasa);

  // Botão ir para a mesa
  document.getElementById('btnIrMesa').addEventListener('click', irParaMesa);

  // Botão sair
  document.getElementById('btnSair').addEventListener('click', deslogar);

  // Enter no campo de senha
  document.getElementById('senhaCasa').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') entrarNaCasa();
  });

  // Atualizar status periodicamente
  setInterval(() => {
    chrome.storage.local.get(['botConfig', 'wsConectado'], (result) => {
      if (document.getElementById('statusPanel').style.display !== 'none') {
        atualizarStatusUI(result.botConfig || {}, result.wsConectado);
      }
    });
  }, 2000);
});

async function entrarNaCasa() {
  const email = document.getElementById('emailCasa').value.trim();
  const senha = document.getElementById('senhaCasa').value;
  const errEl = document.getElementById('errMsg');
  errEl.style.display = 'none';

  if (!email || !senha) {
    errEl.textContent = 'Preencha email e senha da casa de aposta.';
    errEl.style.display = 'block';
    return;
  }

  // Salvar credenciais da casa para o background usar
  await chrome.storage.local.set({
    casaEmail: email,
    casaSenha: senha,
    botAtivo: true
  });

  // Abrir ou focar aba da big.bet.br e ir para login
  const tabs = await chrome.tabs.query({ url: 'https://big.bet.br/*' });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true, url: URL_LOGIN_CASA });
  } else {
    await chrome.tabs.create({ url: URL_LOGIN_CASA });
  }

  // Mostrar painel de status
  mostrarStatusPanel(email, null, false);
}

function mostrarStatusPanel(email, config, wsConectado) {
  document.getElementById('loginPanel').style.display = 'none';
  document.getElementById('statusPanel').style.display = 'block';
  atualizarStatusUI(config || {}, wsConectado);
}

function atualizarStatusUI(config, wsConectado) {
  const dotServidor = document.getElementById('dotServidor');
  const txtServidor = document.getElementById('txtServidor');
  const dotBot = document.getElementById('dotBot');
  const txtBot = document.getElementById('txtBot');

  if (wsConectado) {
    dotServidor.className = 'dot dot-green';
    txtServidor.textContent = 'Conectado';
    dotBot.className = 'dot dot-green';
    txtBot.textContent = 'Ativo';
  } else {
    dotServidor.className = 'dot dot-red';
    txtServidor.textContent = 'Desconectado';
    dotBot.className = 'dot dot-yellow';
    txtBot.textContent = 'Aguardando servidor';
  }

  document.getElementById('txtEstrategia').textContent = config.estrategia || '—';
  document.getElementById('txtFicha').textContent = config.valor_ficha ? `R$ ${config.valor_ficha}` : '—';
  document.getElementById('txtStopWin').textContent = config.stop_win ? `R$ ${config.stop_win}` : '—';
  document.getElementById('txtStopLoss').textContent = config.stop_loss ? `R$ ${config.stop_loss}` : '—';
}

async function irParaMesa() {
  const tabs = await chrome.tabs.query({ url: 'https://big.bet.br/*' });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id, { active: true, url: URL_MESA });
  } else {
    await chrome.tabs.create({ url: URL_MESA });
  }
}

async function deslogar() {
  await chrome.storage.local.remove(['casaEmail', 'casaSenha', 'botAtivo', 'botConfig', 'wsConectado']);
  document.getElementById('loginPanel').style.display = 'block';
  document.getElementById('statusPanel').style.display = 'none';
  document.getElementById('emailCasa').value = '';
  document.getElementById('senhaCasa').value = '';
  document.getElementById('errMsg').style.display = 'none';
}
