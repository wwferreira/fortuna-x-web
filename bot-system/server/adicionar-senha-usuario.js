const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vfmzxgznrgwnzghqaaau.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbXp4Z3pucmd3bnpnaHFhYWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAxNTUzNiwiZXhwIjoyMDgxNTkxNTM2fQ.t-MCR6v0onhFLDAk9KgpzK_9NdT3NZ2SirQP2QV-h2k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function adicionarUsuario() {
  console.log('🔐 Configurando usuário no Supabase...');
  
  try {
    // Primeiro, vamos verificar se a coluna senha existe
    console.log('📝 Verificando estrutura da tabela...');
    
    // Adicionar/atualizar usuário com senha
    const email = 'teste@teste.com'; // MUDE AQUI para seu email
    const senha = 'teste123';        // MUDE AQUI para sua senha
    
    const { data, error } = await supabase
      .from('usuarios_bot')
      .upsert({
        email: email,
        senha: senha,
        ativo: true,
        config: {},
        bot_ligado: false,
        status_bot: 'deslogado',
        stats: { greens: 0, reds: 0, saldo: null, saldoInicial: null }
      }, { onConflict: 'email' });

    if (error) {
      console.error('❌ Erro:', error.message);
      if (error.message.includes('column "senha" of relation "usuarios_bot" does not exist')) {
        console.log('\n⚠️  A coluna "senha" não existe na tabela!');
        console.log('Execute este SQL no Supabase SQL Editor:');
        console.log('\nALTER TABLE usuarios_bot ADD COLUMN IF NOT EXISTS senha TEXT;\n');
      }
      return;
    }

    console.log('✅ Usuário configurado com sucesso!');
    console.log('\n📋 CREDENCIAIS:');
    console.log('   Email:', email);
    console.log('   Senha:', senha);
    console.log('\n🌐 Acesse: http://192.168.1.10:3000/painel');
    
  } catch (e) {
    console.error('❌ Erro geral:', e.message);
  }
}

adicionarUsuario();
