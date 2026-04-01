let gestoes = [];

try {
    const saved = localStorage.getItem('gestoes_modernas');
    if (saved) gestoes = JSON.parse(saved);
} catch (e) {
    console.error('Erro ao carregar gestões:', e);
    gestoes = [];
}

function showFeedback(msg, type = 'success') {
    const el = document.getElementById('msgFeedback');
    if (!el) return;
    el.textContent = msg;
    el.className = type === 'error' ? 'feedback-error' : 'feedback-success';
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function salvar() {
    try {
        localStorage.setItem('gestoes_modernas', JSON.stringify(gestoes));
    } catch (e) {
        console.error('Erro ao salvar gestões:', e);
        showFeedback('Erro ao salvar no navegador', 'error');
    }
}

function showList() {
    document.getElementById('viewList').style.display = 'block';
    document.getElementById('viewDetails').style.display = 'none';
    renderLista();
}

window.showList = showList;

function showDetails(id) {
    const g = gestoes.find(x => x.id === id);
    if (!g) return;

    if (!g.statusDias) g.statusDias = {};
    if (!g.valoresPersonalizados) g.valoresPersonalizados = {};

    document.getElementById('viewList').style.display = 'none';
    document.getElementById('viewDetails').style.display = 'block';
    document.getElementById('detalheTitulo').textContent = g.nome;

    const res = document.getElementById('statsResumo');
    res.innerHTML = `
        <div style="background:#222; padding:8px; border-radius:4px; text-align:center;">
            <div style="font-size:9px; color:#888;">BANCA INICIAL</div>
            <div style="color:#fff; font-weight:bold;">R$ ${parseFloat(g.valor).toFixed(2)}</div>
        </div>
        <div style="background:#222; padding:8px; border-radius:4px; text-align:center;">
            <div style="font-size:9px; color:#888;">META DIÁRIA</div>
            <div style="color:#00ff41; font-weight:bold;">${g.percentual}%</div>
        </div>
    `;

    renderTabelaDias(g);
}

function renderTabelaDias(g) {
    const tbody = document.querySelector('#tabelaDias tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    let bancaBase = parseFloat(g.valor);
    
    for(let i = 1; i <= g.dias; i++) {
        // Se houver valor personalizado para este dia, usa ele
        if (g.valoresPersonalizados[i] !== undefined) {
            bancaBase = parseFloat(g.valoresPersonalizados[i]);
        }

        let metaValor = bancaBase * (g.percentual / 100);
        let proximaBanca = bancaBase + metaValor;
        
        const tr = document.createElement('tr');
        const status = g.statusDias[i]; 
        
        if (status === 'concluido') tr.className = 'row-concluido';
        if (status === 'falhou') tr.className = 'row-nao-concluido';

        // Lógica de ativação/bloqueio:
        const diaAnteriorTemStatus = i === 1 || g.statusDias[i-1] !== undefined;
        const jaTemStatus = g.statusDias[i] !== undefined;
        const botoesDisabled = !diaAnteriorTemStatus || jaTemStatus;

        // A edição do valor (input) só é permitida se:
        // 1. For o Dia 1 e ainda não tem status.
        // 2. O dia anterior foi marcado como FALHA (X) e este dia ainda não tem status.
        const diaAnteriorFalhou = i > 1 && g.statusDias[i-1] === 'falhou';
        const podeEditar = (i === 1 && !jaTemStatus) || (diaAnteriorFalhou && !jaTemStatus);
        
        const tdDia = document.createElement('td');
        tdDia.textContent = `${i}º`;

        const tdBanca = document.createElement('td');
        if (podeEditar) {
            const inputBanca = document.createElement('input');
            inputBanca.type = 'number';
            inputBanca.step = '0.01';
            inputBanca.value = bancaBase.toFixed(2);
            inputBanca.style.cssText = 'width: 70px; padding: 2px; font-size: 10px; background: #222; border: 1px solid #444; color: #fff;';
            inputBanca.addEventListener('change', (e) => {
                g.valoresPersonalizados[i] = parseFloat(e.target.value);
                salvar();
                renderTabelaDias(g);
            });
            tdBanca.appendChild(inputBanca);
        } else {
            // Se não pode editar, apenas exibe o valor (ou o input desabilitado para manter o layout se preferir)
            tdBanca.textContent = `R$ ${bancaBase.toFixed(2)}`;
            tdBanca.style.fontSize = '11px';
            tdBanca.style.color = '#ccc';
        }

        const tdMeta = document.createElement('td');
        tdMeta.textContent = `R$ ${metaValor.toFixed(2)}`;

        const tdTotal = document.createElement('td');
        tdTotal.className = 'win';
        tdTotal.textContent = `R$ ${proximaBanca.toFixed(2)}`;

        const tdStatus = document.createElement('td');
        const divStatus = document.createElement('div');
        divStatus.style.display = 'flex';
        divStatus.style.gap = '4px';

        const btnV = document.createElement('button');
        btnV.className = 'btn-status btn-check';
        btnV.textContent = '✓';
        if (botoesDisabled) btnV.disabled = true;
        btnV.addEventListener('click', () => {
            g.statusDias[i] = 'concluido';
            salvar();
            renderTabelaDias(g);
        });

        const btnX = document.createElement('button');
        btnX.className = 'btn-status btn-cross';
        btnX.textContent = '✗';
        if (botoesDisabled) btnX.disabled = true;
        btnX.addEventListener('click', () => {
            g.statusDias[i] = 'falhou';
            salvar();
            renderTabelaDias(g);
        });

        divStatus.appendChild(btnV);
        divStatus.appendChild(btnX);
        tdStatus.appendChild(divStatus);

        tr.appendChild(tdDia);
        tr.appendChild(tdBanca);
        tr.appendChild(tdMeta);
        tr.appendChild(tdTotal);
        tr.appendChild(tdStatus);

        tbody.appendChild(tr);

        // ATUALIZAÇÃO DA BANCA PARA O PRÓXIMO DIA:
        // Sempre projeta o valor (bancaBase + meta) para o próximo dia,
        // EXCETO se o usuário definiu um valor manual para o próximo dia (via input).
        bancaBase = proximaBanca;
    }
}

window.showDetails = showDetails;

function criarGestao() {
    const nomeEl = document.getElementById('nome');
    const valorEl = document.getElementById('valor');
    const percentualEl = document.getElementById('percentual');
    const diasEl = document.getElementById('dias');

    const nome = nomeEl.value.trim();
    const valor = parseFloat(valorEl.value);
    const percentual = parseFloat(percentualEl.value);
    const dias = parseInt(diasEl.value);

    if(!nome || isNaN(valor) || isNaN(percentual) || isNaN(dias)) {
        showFeedback('Preencha todos os campos corretamente!', 'error');
        return;
    }

    const nova = {
        id: Date.now(),
        nome,
        valor,
        percentual,
        dias,
        statusDias: {},
        valoresPersonalizados: {}
    };

    gestoes.push(nova);
    salvar();
    renderLista();
    
    nomeEl.value = '';
    valorEl.value = '';
    percentualEl.value = '';
    diasEl.value = '';
    showFeedback('Gestão criada com sucesso!');
}

function excluir(id) {
    if(!confirm('Deseja excluir esta gestão?')) return;
    gestoes = gestoes.filter(x => x.id !== id);
    salvar();
    renderLista();
    showFeedback('Gestão excluída');
}

window.excluir = excluir;

function renderLista() {
    const lista = document.getElementById('listaGestoes');
    if (!lista) return;
    lista.innerHTML = '';
    
    if (gestoes.length === 0) {
        lista.innerHTML = '<div style="text-align:center; color:#666; font-style:italic; padding:10px;">Nenhuma gestão criada</div>';
        return;
    }

    gestoes.forEach(g => {
        const div = document.createElement('div');
        div.className = 'gestao-item';
        
        const infoDiv = document.createElement('div');
        infoDiv.style.flex = '1';
        infoDiv.style.overflow = 'hidden';
        
        const nameDiv = document.createElement('div');
        nameDiv.className = 'info-main';
        nameDiv.style.whiteSpace = 'nowrap';
        nameDiv.style.overflow = 'hidden';
        nameDiv.style.textOverflow = 'ellipsis';
        nameDiv.textContent = g.nome;
        
        const subDiv = document.createElement('div');
        subDiv.className = 'info-sub';
        subDiv.textContent = `R$ ${g.valor} | ${g.percentual}% meta`;
        
        infoDiv.appendChild(nameDiv);
        infoDiv.appendChild(subDiv);
        
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';
        
        const btnOpen = document.createElement('button');
        btnOpen.className = 'btn-sm btn-open';
        btnOpen.textContent = 'ABRIR';
        btnOpen.addEventListener('click', () => showDetails(g.id));
        
        const btnDel = document.createElement('button');
        btnDel.className = 'btn-sm btn-del';
        btnDel.textContent = 'X';
        btnDel.addEventListener('click', () => excluir(g.id));
        
        actionsDiv.appendChild(btnOpen);
        actionsDiv.appendChild(btnDel);
        
        div.appendChild(infoDiv);
        div.appendChild(actionsDiv);
        lista.appendChild(div);
    });
}

const btnCriar = document.getElementById('btnCriarGestao');
if (btnCriar) {
    btnCriar.addEventListener('click', criarGestao);
}

const btnVoltar = document.getElementById('btnVoltar');
if (btnVoltar) {
    btnVoltar.addEventListener('click', showList);
}

renderLista();
