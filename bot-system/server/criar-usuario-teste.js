const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vfmzxgznrgwnzghqaaau.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbXp4Z3pucmd3bnpnaHFhYWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAxNTUzNiwiZXhwIjoyMDgxNTkxNTM2fQ.t-MCR6v0onhFLDAk9KgpzK_9NdT3NZ2SirQP2QV-h2k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function criarUsuario() {
  console.log('🔐 Verificando usuário admin no Supabase...');
  
  try {
    // Verificar se usuário existe no Auth
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Erro ao listar usuários:', listError.message);
      return;
    }
    
    const adminUser = users.users.find(u => u.email === 'admin@reidosbots.com');
    
    if (!adminUser) {
      console.log('📝 Criando usuário no Auth...');
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: 'admin@reidosbots.com',
        password: 'admin123',
        email_confirm: true,
        user_metadata: { role: 'admin' }
      });

      if (authError) {
        console.error('❌ Erro ao criar usuário no Auth:', authError.message);
        return;
      }
      console.log('✅ Usuário criado no Auth:', authData.user.email);
    } else {
      console.log('✅ Usuário já existe no Auth');
    }

    // Criar/atualizar registro na tabela usuarios_bot
    console.log('📝 Atualizando tabela usuarios_bot...');
    const { data: botData, error: botError } = await supabase
      .from('usuarios_bot')
      .upsert({
        email: 'admin@reidosbots.com',
        ativo: true,
        config: {},
        bot_ligado: false,
        status_bot: 'deslogado',
        stats: { greens: 0, reds: 0, saldo: null, saldoInicial: null }
      }, { onConflict: 'email' });

    if (botError) {
      console.error('❌ Erro ao atualizar tabela usuarios_bot:', botError.message);
    } else {
      console.log('✅ Registro atualizado na tabela usuarios_bot');
    }

    console.log('\n✅ USUÁRIO PRONTO PARA USO:');
    console.log('   Email: admin@reidosbots.com');
    console.log('   Senha: admin123');
    
  } catch (e) {
    console.error('❌ Erro geral:', e.message);
  }
}

criarUsuario();
