const SUPABASE_URL = 'https://vfmzxgznrgwnzghqaaau.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbXp4Z3pucmd3bnpnaHFhYWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAxNTUzNiwiZXhwIjoyMDgxNTkxNTM2fQ.t-MCR6v0onhFLDAk9KgpzK_9NdT3NZ2SirQP2QV-h2k';

async function fazerRequisicao(tabela, metodo = 'GET', dados = null) {
    const url = `${SUPABASE_URL}/rest/v1/${tabela}`;
    const opcoes = {
        method: metodo,
        headers: {
            'Content-Type': 'application/json',
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    };
    
    if (dados) opcoes.body = JSON.stringify(dados);
    
    const res = await fetch(url, opcoes);
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return await res.json();
}

function gerarToken() {
    const token = 'FRT-' + Math.random().toString(36).substr(2, 9) + '-' + Math.random().toString(36).substr(2, 9);
    document.getElementById('tokenDisplay').textContent = token;
}

function copiarToken() {
    const token = document.getElementById('tokenDisplay').textContent;
    navigator.clipboard.writeText(token);
}

function criarUsuario() {
    alert('Crie usuários no Supabase Dashboard → Authentication → Users');
}

function aplicarTokenNosArquivos() {
    alert('Em desenvolvimento');
}

async function carregarDados() {
    try {
        const usuarios = await fazerRequisicao('auth.users');
        const estrategias = await fazerRequisicao('estrategias');
        
        exibirUsuarios(usuarios);
        exibirEstrategias(estrategias);
    } catch (erro) {
        console.error('Erro:', erro);
        document.getElementById('usersList').innerHTML = `<div class="empty-state">❌ ${erro.message}</div>`;
    }
}

function exibirUsuarios(usuarios) {
    const container = document.getElementById('usersList');
    if (!usuarios.length) {
        container.innerHTML = '<div class="empty-state">Nenhum usuário</div>';
        return;
    }
    
    container.innerHTML = `<h3 style="color: #cc0000;">👥 Usuários (${usuarios.length}):</h3>` +
        usuarios.map(u => `
            <div class="user-card">
                <div class="user-info">
                    <div class="info-item">
                        <span class="info-label">Email</span>
                        <span class="info-value">${u.email}</span>
                    </div>
                </div>
            </div>
        `).join('');
}

function exibirEstrategias(estrategias) {
    const container = document.getElementById('estrategiasList') || document.createElement('div');
    if (!document.getElementById('estrategiasList')) {
        container.id = 'estrategiasList';
        document.body.appendChild(container);
    }
    
    if (!estrategias.length) {
        container.innerHTML = '<div class="empty-state">Nenhuma estratégia</div>';
        return;
    }
    
    container.innerHTML = `<h3 style="color: #cc0000;">⚙️ Estratégias (${estrategias.length}):</h3>` +
        estrategias.map(e => `
            <div class="user-card">
                <div class="user-info">
                    <div class="info-item">
                        <span class="info-label">Estratégia</span>
                        <span class="info-value">${e.nome}</span>
                    </div>
                </div>
            </div>
        `).join('');
}

document.addEventListener('DOMContentLoaded', carregarDados);
