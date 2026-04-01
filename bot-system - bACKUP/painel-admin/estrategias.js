const SUPABASE_URL = 'https://vfmzxgznrgwnzghqaaau.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbXp4Z3pucmd3bnpnaHFhYWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAxNTUzNiwiZXhwIjoyMDgxNTkxNTM2fQ.t-MCR6v0onhFLDAk9KgpzK_9NdT3NZ2SirQP2QV-h2k';

let gatilhosTemp = [];

async function fazerRequisicao(tabela, metodo = 'GET', dados = null) {
    const url = `${SUPABASE_URL}/rest/v1/${tabela}`;
    const opcoes = {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Prefer': 'return=representation'
        }
    };
    if (dados) opcoes.body = JSON.stringify(dados);
    const res = await fetch(url, opcoes);
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return await res.json();
}

function showAlert(msg, type = 'success') {
    const box = document.getElementById('alertBox');
    box.textContent = msg;
    box.className = `alert alert-${type}`;
    box.style.display = 'block';
    setTimeout(() => box.style.display = 'none', 5000);
}

// Lógica de campos dinâmicos para Gale/Ciclo
document.getElementById('qtdSecundario').addEventListener('input', atualizarCamposFichas);
document.getElementById('tipoSecundario').addEventListener('change', atualizarCamposFichas);

function atualizarCamposFichas() {
    const tipo = document.getElementById('tipoSecundario').value;
    const qtd = parseInt(document.getElementById('qtdSecundario').value) || 0;
    const container = document.getElementById('containerFichasSecundarias');
    
    container.innerHTML = '';
    
    if (tipo === 'NENHUM' || qtd <= 0) return;
    
    const prefixo = tipo === 'GALE' ? 'G' : 'C';
    
    for (let i = 1; i <= qtd; i++) {
        const div = document.createElement('div');
        div.className = 'ficha-input-box';
        div.innerHTML = `
            <label>${prefixo}${i}</label>
            <input type="number" class="input-ficha-dinamica" data-index="${i}" placeholder="X Fichas" value="1" min="1">
        `;
        container.appendChild(div);
    }
}

function adicionarGatilho() {
    const modo = document.getElementById('modoGatilho').value;
    const nomeEstrategia = document.getElementById('nomeEstrategia').value;
    
    if (!nomeEstrategia) {
        showAlert('Preencha o nome da estratégia primeiro!', 'error');
        return;
    }

    let novoGatilho = {
        modo: modo,
        tipoSecundario: document.getElementById('tipoSecundario').value,
        qtdSecundario: parseInt(document.getElementById('qtdSecundario').value) || 0,
        fichas: Array.from(document.querySelectorAll('.input-ficha-dinamica')).map(input => parseInt(input.value) || 1)
    };

    if (modo === 'NORMAL') {
        const legendaInput = document.getElementById('legendaGatilho').value;
        const apostaInput = document.getElementById('apostaGatilho').value;

        // Aceita espaço ou vírgula como separador
        novoGatilho.legenda = legendaInput;
        novoGatilho.aposta = apostaInput;
        novoGatilho.repeticoes = parseInt(document.getElementById('repeticoesGatilho').value) || 1;
        
        if (!novoGatilho.legenda || !novoGatilho.aposta) {
            showAlert('Preencha a legenda e a aposta!', 'error');
            return;
        }
    } else {
        novoGatilho.tipoEspecial = document.getElementById('tipoEspecial').value;
    }

    gatilhosTemp.push(novoGatilho);
    renderizarGatilhosTemp();
    limparCamposGatilho();
}

function limparCamposGatilho() {
    document.getElementById('legendaGatilho').value = '';
    document.getElementById('repeticoesGatilho').value = '1';
    document.getElementById('apostaGatilho').value = '';
    document.getElementById('qtdSecundario').value = '';
    document.getElementById('tipoSecundario').value = 'NENHUM';
    document.getElementById('containerFichasSecundarias').innerHTML = '';
}

function renderizarGatilhosTemp() {
    const list = document.getElementById('gatilhosList');
    list.innerHTML = gatilhosTemp.map((g, i) => `
        <div class="gatilho-item">
            <div>
                <strong>#${i+1} [${g.modo}]</strong> - 
                ${g.modo === 'NORMAL' ? g.legenda : g.tipoEspecial} | 
                ${g.tipoSecundario !== 'NENHUM' ? `${g.tipoSecundario} x${g.qtdSecundario} (${g.fichas.join(', ')})` : 'Sem Gale/Ciclo'}
            </div>
            <button class="btn-remover" onclick="removerGatilho(${i})">Remover</button>
        </div>
    `).join('');
}

function removerGatilho(index) {
    gatilhosTemp.splice(index, 1);
    renderizarGatilhosTemp();
}

async function salvarEstrategia() {
    const nome = document.getElementById('nomeEstrategia').value;
    if (!nome || gatilhosTemp.length === 0) {
        showAlert('Preencha o nome e adicione pelo menos um gatilho!', 'error');
        return;
    }

    const loading = document.getElementById('loading');
    loading.style.display = 'block';

    try {
        await fazerRequisicao('estrategias', 'POST', {
            nome: nome,
            gatilhos: gatilhosTemp,
            criado_em: new Date().toISOString()
        });
        
        showAlert('Estratégia salva com sucesso!');
        gatilhosTemp = [];
        document.getElementById('nomeEstrategia').value = '';
        renderizarGatilhosTemp();
        carregarEstrategias();
    } catch (error) {
        showAlert('Erro ao salvar: ' + error.message, 'error');
    } finally {
        loading.style.display = 'none';
    }
}

async function carregarEstrategias() {
    try {
        const dados = await fazerRequisicao('estrategias');
        const list = document.getElementById('estrategiasList');
        
        if (!dados.length) {
            list.innerHTML = '<div class="empty-state">Nenhuma estratégia criada.</div>';
            return;
        }

        list.innerHTML = dados.map(e => `
            <div class="estrategia-card">
                <div class="estrategia-nome">${e.nome}</div>
                <div class="estrategia-gatilhos">
                    ${e.gatilhos.length} gatilhos configurados
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn btn-primary btn-small" onclick="deletarEstrategia('${e.id}')">Excluir</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Erro ao carregar estratégias:', error);
    }
}

async function deletarEstrategia(id) {
    if (!confirm('Deseja realmente excluir esta estratégia?')) return;
    try {
        await fazerRequisicao(`estrategias?id=eq.${id}`, 'DELETE');
        showAlert('Estratégia excluída!');
        carregarEstrategias();
    } catch (error) {
        showAlert('Erro ao excluir: ' + error.message, 'error');
    }
}

document.addEventListener('DOMContentLoaded', carregarEstrategias);

// Alternar visualização de campos NORMAL/DINAMICA
document.getElementById('modoGatilho').addEventListener('change', (e) => {
    const modo = e.target.value;
    document.getElementById('linhaNormal').style.display = modo === 'NORMAL' ? 'flex' : 'none';
    document.getElementById('linhaDinamica').style.display = modo === 'DINAMICA' ? 'flex' : 'none';
});
