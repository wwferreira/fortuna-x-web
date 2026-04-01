// Script de teste para verificar conexão com Supabase
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://vfmzxgznrgwnzghqaaau.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmbXp4Z3pucmd3bnpnaHFhYWF1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NjAxNTUzNiwiZXhwIjoyMDgxNTkxNTM2fQ.t-MCR6v0onhFLDAk9KgpzK_9NdT3NZ2SirQP2QV-h2k';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testarConexao() {
  console.log('🧪 Testando conexão com Supabase...\n');

  try {
    // 1. Testar listagem de usuários Auth
    console.log('1️⃣ Testando Auth - Listar usuários...');
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authError) {
      console.error('❌ Erro ao listar usuários Auth:', authError.message);
    } else {
      console.log(`✅ ${authUsers.users.length} usuários encontrados no Auth:`);
      authUsers.users.forEach(u => {
        console.log(`   - ${u.email} (criado em ${new Date(u.created_at).toLocaleDateString()})`);
      });
    }

    console.log('');

    // 2. Testar tabela usuarios_bot
    console.log('2️⃣ Testando tabela usuarios_bot...');
    const { data: botUsers, error: tableError } = await supabase
      .from('usuarios_bot')
      .select('*');
    
    if (tableError) {
      console.error('❌ Erro ao buscar tabela usuarios_bot:', tableError.message);
      console.log('\n⚠️  A tabela ainda não foi criada! Execute o SQL em supabase-schema.sql');
    } else {
      console.log(`✅ ${botUsers.length} usuários encontrados na tabela usuarios_bot:`);
      botUsers.forEach(u => {
        console.log(`   - ${u.email} (ativo: ${u.ativo}, bot_ligado: ${u.bot_ligado})`);
      });
    }

    console.log('');

    // 3. Testar login
    console.log('3️⃣ Testando login com usuário teste...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: 'teste@teste.com',
      password: 'senha123'
    });

    if (loginError) {
      console.error('❌ Erro no login:', loginError.message);
      console.log('\n⚠️  Crie o usuário teste@teste.com no Supabase Auth!');
    } else {
      console.log('✅ Login bem-sucedido!');
      console.log(`   - Email: ${loginData.user.email}`);
      console.log(`   - Token: ${loginData.session.access_token.substring(0, 20)}...`);
    }

    console.log('');

    // 4. Testar inserção/atualização
    console.log('4️⃣ Testando inserção na tabela usuarios_bot...');
    const { data: upsertData, error: upsertError } = await supabase
      .from('usuarios_bot')
      .upsert({
        email: 'teste@teste.com',
        ativo: true,
        config: {
          estrategia: 'QUENTES',
          valor_ficha: 1,
          stop_win: 50,
          stop_loss: 50
        }
      }, { onConflict: 'email' });

    if (upsertError) {
      console.error('❌ Erro ao inserir:', upsertError.message);
    } else {
      console.log('✅ Dados inseridos/atualizados com sucesso!');
    }

    console.log('\n✅ Todos os testes concluídos!\n');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
  }
}

// Executar testes
testarConexao();
