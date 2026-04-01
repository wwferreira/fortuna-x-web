// Script de teste para verificar conexão WebSocket
console.log('🧪 [TEST] Iniciando teste de conexão...');

// Simular que tem usuário logado
chrome.storage.local.set({
    supabase_user: JSON.stringify({ email: 'teste@teste.com' })
}, () => {
    console.log('✅ [TEST] Usuário simulado salvo');
    
    // Tentar conectar
    const ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
        console.log('✅ [TEST] WebSocket conectado!');
        ws.send(JSON.stringify({
            tipo: 'identificar',
            email: 'teste@teste.com'
        }));
    };
    
    ws.onmessage = (event) => {
        console.log('📨 [TEST] Mensagem recebida:', event.data);
    };
    
    ws.onerror = (error) => {
        console.error('❌ [TEST] Erro:', error);
    };
    
    ws.onclose = () => {
        console.log('🔌 [TEST] Desconectado');
    };
});
