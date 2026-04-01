// Navegação suave
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Atualizar link ativo na navegação
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');

window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
});

// Dados dos bots
const botsData = {
    bacbo: {
        title: '🎲 Fortuna Bacbo',
        video: 'fortuna_bacbo.mp4',
        description: 'Extensão Chrome avançada para automação do jogo Bacbo, com sistema de inteligência artificial e gestão inteligente de banca. Compatível com múltiplas casas de apostas incluindo Betano, Stake, Reals Bet, BigBet, Betwinner e Segurobet.',
        sections: [
            {
                title: '🎯 SISTEMA DE GATILHOS',
                features: [
                    { name: 'Gatilhos Personalizados', desc: 'Crie múltiplos gatilhos com padrões específicos de sequências' },
                    { name: 'Gatilho Inteligente', desc: 'Sistema detecta automaticamente padrões favoráveis no histórico' },
                    { name: 'Múltiplos Gatilhos Simultâneos', desc: 'Adicione e gerencie vários gatilhos ao mesmo tempo' },
                    { name: 'Configuração de Apostas', desc: 'Defina valores e estratégias para cada gatilho' },
                    { name: 'Ativação Individual', desc: 'Controle cada gatilho separadamente conforme necessidade' },
                    { name: 'Prioridade de Gatilhos', desc: 'Organize ordem de execução dos gatilhos' },
                    { name: 'Importar/Exportar', desc: 'Salve e compartilhe suas estratégias de gatilhos' },
                    { name: 'Histórico de Gatilhos', desc: 'Acompanhe performance de cada gatilho criado' }
                ]
            },
            {
                title: '🧠 INTELIGÊNCIA ARTIFICIAL',
                features: [
                    { name: 'Análise de Histórico', desc: 'Analisa de 10 a 125 rodadas anteriores para identificar padrões' },
                    { name: 'IA Mínima', desc: 'Define percentual mínimo de confiança (0-99%) para filtrar entradas' },
                    { name: 'IA Máxima', desc: 'Define percentual máximo de confiança (1-100%) para entrada' },
                    { name: 'Análise de Padrões', desc: 'Identifica tendências e sequências em tempo real' },
                    { name: 'Assertividade Calculada', desc: 'Mostra taxa de acerto baseada em dados históricos' },
                    { name: 'Predição Inteligente', desc: 'Calcula probabilidades para próximas jogadas' },
                    { name: 'Aprendizado Contínuo', desc: 'Melhora análises conforme acumula dados' },
                    { name: 'Filtro de Confiança', desc: 'Entra apenas quando IA atinge níveis configurados' }
                ]
            },
            {
                title: '💰 GESTÃO DE BANCA AVANÇADA',
                features: [
                    { name: 'Stop Gain', desc: 'Define limite de lucro de 1 a 5000 para proteção de ganhos' },
                    { name: 'Stop Loss', desc: 'Define limite de perda de -1 a 5000 para proteção de banca' },
                    { name: 'Modo Surf', desc: 'Proteção inteligente de banca com ajustes automáticos' },
                    { name: 'Gestão Automática de Fichas', desc: '8 níveis de valores de aposta progressivos' },
                    { name: 'Controle de Ciclos', desc: 'Configure até 10 ciclos de apostas diferentes' },
                    { name: 'Gales por Ciclo', desc: 'Defina quantidade de gales para cada ciclo' },
                    { name: 'Proteção de Saldo', desc: 'Sistema evita apostas que comprometam banca' },
                    { name: 'Ajuste Dinâmico', desc: 'Valores se ajustam conforme saldo disponível' }
                ]
            },
            {
                title: '🎰 SISTEMA MARTINGALE COMPLETO',
                features: [
                    { name: 'Gale Configurável', desc: 'Configure até 10 níveis de martingale progressivo' },
                    { name: 'Gale Virtual', desc: 'Simula apostas sem arriscar dinheiro (0-11 níveis)' },
                    { name: 'Gale Alternado', desc: 'Alterna estratégias automaticamente entre 3 modos diferentes' },
                    { name: 'Contagem Gale Alternado', desc: 'Controle fino de 0-12 repetições antes de alternar' },
                    { name: 'Repetir Aposta no Gale', desc: 'Mantém mesma aposta por até 11 gales consecutivos' },
                    { name: 'Gales por Ciclo', desc: 'Configure gales diferentes para cada ciclo de apostas' },
                    { name: 'Progressão Personalizada', desc: 'Crie sequências únicas de martingale' },
                    { name: 'Proteção Anti-Loss', desc: 'Sistema inteligente evita perdas excessivas' }
                ]
            },
            {
                title: '🎨 ANÁLISE DE CORES (PLAYER/BANKER)',
                features: [
                    { name: 'Porcentagem Vermelho Máxima', desc: 'Define limite máximo de Banker (0-100%)' },
                    { name: 'Porcentagem Vermelho Mínima', desc: 'Define limite mínimo de Banker (0-100%)' },
                    { name: 'Porcentagem Azul Máxima', desc: 'Define limite máximo de Player (0-100%)' },
                    { name: 'Porcentagem Azul Mínima', desc: 'Define limite mínimo de Player (0-100%)' },
                    { name: 'Limites de Segurança Vermelho', desc: 'Limites máximo e mínimo ajustáveis para Banker' },
                    { name: 'Limites de Segurança Azul', desc: 'Limites máximo e mínimo ajustáveis para Player' },
                    { name: 'Análise em Tempo Real', desc: 'Calcula probabilidades baseadas no histórico atual' },
                    { name: 'Balanceamento Automático', desc: 'Ajusta apostas conforme distribuição de cores' }
                ]
            },
            {
                title: '⚖️ SISTEMA DE EMPATE E EVENTOS',
                features: [
                    { name: 'Ficha Empate', desc: 'Configure valor de aposta em empate (8 níveis)' },
                    { name: 'Porcentagem Empate', desc: 'Ajuste probabilidade de aposta em empate (0-100%)' },
                    { name: 'Aposta Automática TIE', desc: 'Sistema aposta em empate quando detecta padrão favorável' },
                    { name: 'Evento Mínimo', desc: 'Define quantidade mínima de eventos (0-125) antes de entrar' },
                    { name: 'Evento Máximo', desc: 'Define quantidade máxima de eventos (1-125) para filtrar' },
                    { name: 'Contagem Automática', desc: 'Rastreia e conta eventos em tempo real' },
                    { name: 'Ajuste de Histórico', desc: 'Sistema ajusta análise conforme eventos acumulados' },
                    { name: 'Filtro de Momento', desc: 'Entra apenas quando quantidade de eventos é ideal' }
                ]
            },
            {
                title: '🔄 PÓS-LOSS, PÓS-GAIN E TELEGRAM',
                features: [
                    { name: 'Pós Loss', desc: 'Aguarda de 0-10 rodadas após perda antes de nova entrada' },
                    { name: 'Pós Gain', desc: 'Aguarda de 0-10 rodadas após vitória para consolidar lucro' },
                    { name: 'Proteção Emocional', desc: 'Evita apostas impulsivas após resultados' },
                    { name: 'Cooldown Inteligente', desc: 'Pausa estratégica para análise de padrões' },
                    { name: 'Notificações Telegram', desc: 'Receba alertas de entradas, vitórias e perdas' },
                    { name: 'Token Bot', desc: 'Configure seu bot do Telegram para mensagens' },
                    { name: 'Chat ID', desc: 'Envie notificações para grupo ou chat privado' },
                    { name: 'Mensagens Detalhadas', desc: 'Acompanhe tudo pelo celular em tempo real' }
                ]
            },
            {
                title: '📈 PLACAR, ESTATÍSTICAS E CASAS',
                features: [
                    { name: 'Placar em Tempo Real', desc: 'Visualize Wins, Losses e Saldo atualizado constantemente' },
                    { name: 'Histórico Completo', desc: 'Registra todas as rodadas com detalhes de cada jogada' },
                    { name: 'Reset de Placar', desc: 'Zere estatísticas quando quiser recomeçar contagem' },
                    { name: 'Taxa de Assertividade', desc: 'Percentual de acerto calculado automaticamente' },
                    { name: 'BigBet', desc: 'Suporte completo para plataforma BigBet' },
                    { name: 'Betwinner', desc: 'Compatível com Betwinner e suas mesas' },
                    { name: 'Stake', desc: 'Funciona perfeitamente na Stake' },
                    { name: 'Outras Casas', desc: 'Segurobet, Betano, Reals Bet e plataformas Evolution Gaming' }
                ]
            }
        ],
        specs: [
            { label: 'Plataforma', value: 'Chrome Extension' },
            { label: 'Compatibilidade', value: 'Windows' },
            { label: 'Provider', value: 'Evolution Gaming' },
            { label: 'Atualizações', value: 'Automáticas' }
        ]
    },
    fortuna2: {
        title: '🎰 Fortuna Roulette 2.0',
        video: 'fortuna_legend.mp4',
        description: 'Extensão Chrome especializada em automação de roleta ao vivo, com suporte a mais de 50 mesas diferentes incluindo roletas normais e multiplicadoras (Quantum, Mega Fire Blaze). Sistema avançado de IA, gestão de banca e integração com Telegram.',
        sections: [
            {
                title: '🎰 SISTEMA DE MESAS (50+ ROLETAS)',
                features: [
                    { name: 'Roleta Brasileira', desc: 'Roleta Brasileira, Speed Roleta Brasileira, Roleta Canarinho e Roleta Brasileira Betano' },
                    { name: 'Roletas Internacionais', desc: 'Arabic Roulette, Hindi Roulette, Turkish Roulette, Greek Roulette, Deutsches Roulette' },
                    { name: 'Roletas Premium', desc: 'Elite Roulette, Prestige Roulette, UK Roulette, Brussels Roulette' },
                    { name: 'Roletas bet365', desc: 'bet365 Roulette, bet365 Dutch Roulette, Roleta Brasileira bet365' },
                    { name: 'Mesas Quantum', desc: 'Quantum Ruleta España, x1000 Quantum Roulette, Greek Quantum Roulette, Quantum Auto Roulette' },
                    { name: 'Mesas Mega Fire Blaze', desc: 'Roleta Brasileira Mega Fire Blaze, Mega Fire Blaze Roulette Italiana, Mega Fire Blaze Ruleta España' },
                    { name: 'Mesas Temáticas', desc: 'Sticky Bandits Roulette, Age Of The Gods Bonus Roulette, Cash Collect Roulette' },
                    { name: 'Controle de Mesas', desc: 'Seleção múltipla, marcar todas, identificação automática de fichas mínimas R$ 0,50' }
                ]
            },
            {
                title: '🎯 SISTEMA DE GATILHOS E LEGENDAS',
                features: [
                    { name: 'Gatilhos Personalizados', desc: 'Crie padrões específicos de entrada com sequências customizadas' },
                    { name: 'Apostas por Gatilho', desc: 'Defina números específicos para cada gatilho criado' },
                    { name: 'Controle Individual', desc: 'Ative ou desative cada gatilho separadamente conforme necessidade' },
                    { name: 'Ativar Todos', desc: 'Botão para ativar/desativar todos os gatilhos de uma vez' },
                    { name: 'Legendas Personalizadas', desc: 'Crie nomes customizados para grupos de números' },
                    { name: 'Associação de Números', desc: 'Vincule múltiplos números a cada legenda criada' },
                    { name: 'Organização Visual', desc: 'Facilita identificação rápida de padrões e estratégias' },
                    { name: 'Importar/Exportar', desc: 'Compartilhe estratégias completas com outros usuários' }
                ]
            },
            {
                title: '🧠 INTELIGÊNCIA ARTIFICIAL',
                features: [
                    { name: 'Histórico Extenso', desc: 'Analisa de 10 até 490 rodadas anteriores para identificar padrões' },
                    { name: 'IA Máxima', desc: 'Define percentual máximo de confiança (1-100%) para entrada' },
                    { name: 'IA Mínima', desc: 'Define percentual mínimo de confiança (0-99%) para filtrar entradas' },
                    { name: 'Análise Preditiva', desc: 'Calcula probabilidades em tempo real baseadas em padrões históricos' },
                    { name: 'Assertividade Dinâmica', desc: 'Taxa de acerto calculada e atualizada automaticamente' },
                    { name: 'Filtro Inteligente', desc: 'Sistema decide o melhor momento para entrar baseado em dados' },
                    { name: 'Aprendizado Contínuo', desc: 'Melhora análises conforme acumula mais dados históricos' },
                    { name: 'Múltiplos Padrões', desc: 'Identifica diversos tipos de sequências e tendências' }
                ]
            },
            {
                title: '💰 GESTÃO DE BANCA PROFISSIONAL',
                features: [
                    { name: '17 Níveis de Fichas', desc: 'Valores progressivos de R$ 0,50 até valores altos' },
                    { name: 'Stop Gain', desc: 'Define limite de lucro de 1 até 500 para proteção de ganhos' },
                    { name: 'Stop Loss', desc: 'Define limite de perda de 1 até 500 para proteção de banca' },
                    { name: 'Loss Virtual', desc: 'Simula perdas sem arriscar dinheiro real (0-10 níveis)' },
                    { name: 'Pause Win', desc: 'Pausa automática após vitórias (0-10 rodadas) para consolidar lucros' },
                    { name: 'Controle de Saldo', desc: 'Monitora saldo em tempo real e ajusta estratégias' },
                    { name: 'Proteção de Banca', desc: 'Sistema inteligente evita perdas excessivas automaticamente' },
                    { name: 'Gestão Automática', desc: 'Ajusta valores de aposta conforme saldo disponível' }
                ]
            },
            {
                title: '🎲 MARTINGALE E CICLOS AVANÇADOS',
                features: [
                    { name: 'Gale Configurável', desc: 'Configure até 10 níveis de martingale progressivo' },
                    { name: 'Multiplicador Gale 1-5', desc: 'Defina multiplicador de 1x a 500x para cada um dos 5 primeiros gales' },
                    { name: 'Multiplicador Gale 6-10', desc: 'Defina multiplicador de 1x a 500x para cada um dos 5 últimos gales' },
                    { name: 'Progressão Personalizada', desc: 'Crie sequências únicas de martingale conforme sua estratégia' },
                    { name: 'Ciclos Configuráveis', desc: 'Configure até 10 ciclos diferentes de apostas' },
                    { name: 'Multiplicador Ciclo 1-5', desc: 'Defina multiplicador de 1x a 500x para cada um dos 5 primeiros ciclos' },
                    { name: 'Multiplicador Ciclo 6-10', desc: 'Defina multiplicador de 1x a 500x para cada um dos 5 últimos ciclos' },
                    { name: 'Estratégias Progressivas', desc: 'Combine gales e ciclos para criar estratégias complexas' }
                ]
            },
            {
                title: '📊 CONTROLE DE EVENTOS E TURNOS',
                features: [
                    { name: 'Evento Mínimo', desc: 'Define quantidade mínima de eventos (0-480) antes de entrar' },
                    { name: 'Evento Máximo', desc: 'Define quantidade máxima de eventos (0-480) para filtrar entradas' },
                    { name: 'Contagem Automática', desc: 'Rastreia e conta eventos em tempo real automaticamente' },
                    { name: 'Filtro de Momento', desc: 'Entra apenas quando condições de eventos são ideais' },
                    { name: 'Sistema de Turnos', desc: 'Configure múltiplos horários de início e fim de operação' },
                    { name: 'Turnos Ativos', desc: 'Visualize e gerencie todos os turnos configurados' },
                    { name: 'Automação por Horário', desc: 'Bot opera automaticamente apenas nos horários definidos' },
                    { name: 'Rotina Flexível', desc: 'Trabalhe, durma ou faça outras atividades enquanto bot opera' }
                ]
            },
            {
                title: '📱 TELEGRAM E MONITORAMENTO',
                features: [
                    { name: 'Notificações em Tempo Real', desc: 'Receba alertas instantâneos de entradas, vitórias e perdas' },
                    { name: 'Configuração Token', desc: 'Configure seu bot do Telegram para receber mensagens' },
                    { name: 'Chat ID Personalizado', desc: 'Envie notificações para grupo ou chat privado' },
                    { name: 'Mensagens Detalhadas', desc: 'Informações completas sobre cada jogada e resultado' },
                    { name: 'Placar Visual', desc: 'Acompanhe Wins, Losses e Saldo em tempo real' },
                    { name: 'Histórico Completo', desc: 'Registra até 100 últimas atividades com detalhes' },
                    { name: 'Reset de Placar', desc: 'Zere estatísticas quando quiser recomeçar contagem' },
                    { name: 'Acompanhamento Remoto', desc: 'Monitore tudo de qualquer lugar pelo celular' }
                ]
            },
            {
                title: '💾 BACKUP E CONFIGURAÇÕES',
                features: [
                    { name: 'Exportar Configurações', desc: 'Salve todas as configurações em arquivo .json ou .prime' },
                    { name: 'Importar Configurações', desc: 'Restaure configurações salvas rapidamente' },
                    { name: 'Backup Completo', desc: 'Inclui gatilhos, legendas, gestão, turnos e todas configurações' },
                    { name: 'Compartilhamento', desc: 'Envie estratégias completas para outros usuários' },
                    { name: 'Múltiplos Perfis', desc: 'Mantenha diferentes configurações para diferentes estratégias' },
                    { name: 'Restauração Rápida', desc: 'Importe e ative configurações com poucos cliques' },
                    { name: 'Segurança de Dados', desc: 'Suas configurações ficam salvas localmente' },
                    { name: 'Versionamento', desc: 'Mantenha diferentes versões de suas estratégias' }
                ]
            }
        ],
        specs: [
            { label: 'Plataforma', value: 'Chrome Extension' },
            { label: 'Compatibilidade', value: 'Windows' },
            { label: 'Mesas Suportadas', value: '50+ Roletas (Normais e Multiplicadoras)' },
            { label: 'Provider', value: 'Playtech Live Casino' }
        ]
    },
    fortunax: {
        title: '⚡ Fortuna X',
        video: 'Fortuna X.mp4',
        description: 'Bot PREMIUM de roleta ao vivo com tecnologia de ponta. Suporta 50+ mesas Playtech (clássicas, automáticas, Betano, bet365, Quantum, Mega Fire Blaze). IA Fortuna com 3 modos de aposta (Moderado, Intermediário e Agressivo), Modo Carrossel para alternar entre mesas automaticamente e 15 estratégias profissionais.',
        sections: [
            {
                title: '🎰 SISTEMA DE MESAS E MODO CARROSSEL — Em fase de implantação',
                features: [
                    { name: '50+ Roletas Playtech', desc: 'Suporte completo: Roleta Brasileira, Speed Roleta Brasileira, Arabic, Hindi, Turkish, Greek, Elite, Prestige, UK, Deutsches, Brussels, Roulette Italiana, Bucharest e muitas outras. Cada mesa com características únicas de velocidade, limites e dealers.' },
                    { name: 'Roletas Automáticas', desc: 'Mesas sem dealer humano para jogadas ultra-rápidas: Speed Auto Roulette (rodadas em 25 segundos), Auto Roulette (padrão), Auto Roulette 2 (otimizada) e Quantum Auto Roulette (com multiplicadores). Perfeito para alto volume de jogadas e estratégias agressivas.' },
                    { name: 'Roletas Exclusivas Betano', desc: 'Acesso a mesas VIP Betano: Roleta Brasileira Betano (dealers BR), Ruleta Betano en Español, Betano Bulgarian Roulette, Roleta Brasileira Mega Fire Blaze Betano (multiplicadores até 500x), Mega Fire Blaze Roulette Betano. Limites diferenciados e promoções exclusivas.' },
                    { name: 'Roletas Exclusivas bet365', desc: 'Mesas exclusivas bet365: bet365 Roulette 1 e 2, bet365 Roulette Ελληνική (grego), bet365 Roulette العربية (árabe), bet365 Dutch Roulette, Ruleta Latinoamérica bet365, Roleta Brasileira bet365, bet365 Boost Roulette Live (boost multiplicadores). Variedade internacional premium.' },
                    { name: '🔄 Modo Carrossel — Em fase de implantação', desc: 'Sistema que alterna automaticamente entre múltiplas mesas selecionadas em sequência. O bot opera em cada mesa por um número configurável de greens e avança para a próxima, criando um ciclo contínuo. Maximiza oportunidades distribuindo operações entre várias roletas. Funcionalidade em desenvolvimento ativo.' },
                    { name: 'Greens por Mesa (1-10)', desc: 'Configure quantos greens consecutivos o bot deve conquistar em cada mesa antes de avançar para a próxima no ciclo do Modo Carrossel.' },
                    { name: 'Seleção Múltipla de Mesas', desc: 'Selecione quantas mesas desejar para o circuito de rotação. Visualize todas as mesas selecionadas em tempo real e gerencie com um clique.' },
                    { name: 'Controle Multi-Mesa', desc: 'Sistema rastreia performance individual por mesa: conta greens separadamente, monitora histórico específico de cada roleta e protege dados durante a alternância.' }
                ]
            },
            {
                title: '🤖 IA FORTUNA E ESTRATÉGIAS',
                features: [
                    { name: 'IA Fortuna', desc: 'Sistema de inteligência artificial proprietário que analisa padrões complexos em tempo real. Processa o histórico da mesa para identificar tendências, calcular probabilidades e selecionar os números com maior chance de saída. Considera frequência, intervalos e setores físicos da roleta. Tecnologia exclusiva do Fortuna X.' },
                    { name: 'Modo Moderado', desc: 'Perfil CONSERVADOR: a IA seleciona poucos números de alta probabilidade, priorizando qualidade sobre quantidade. Ideal para quem prefere entrar menos vezes mas com maior confiança em cada aposta. Recomendado para bancas menores ou jogadores que buscam consistência e menor exposição ao risco.' },
                    { name: 'Modo Intermediário', desc: 'Perfil EQUILIBRADO: a IA amplia a seleção de números, balanceando cobertura e retorno. É o modo recomendado para a maioria dos jogadores — combina uma taxa de acerto razoável com bom potencial de lucro. Funciona bem em diferentes condições de mesa e perfis de banca.' },
                    { name: 'Modo Agressivo', desc: 'Perfil OFENSIVO: a IA cobre uma faixa maior da mesa, aumentando a frequência de greens. Indicado para bancas robustas e jogadores que preferem volume de vitórias. O retorno por aposta é menor, mas a quantidade de acertos compensa. Exige atenção à gestão de banca para manter o resultado positivo.' },
                    { name: 'Vizinhos Configuráveis (0-5)', desc: 'Adicione de 0 até 5 números vizinhos na ordem física da roleta para cada número selecionado pela IA. Aumenta a cobertura geográfica da roda, capturando tendências de setores físicos além dos números individuais.' },
                    { name: '15 Estratégias Profissionais', desc: 'Biblioteca completa: 1)Números Quentes 2)Números Frios 3)Quentes & Frios 4)Linhas Inteligentes 5)Linhas Intermediário 6)Funcionário do Mês 7)Números que se Puxam 8)Duzias e Ruas 9)Duzias/Colunas Inteligente 10)Grupos (H/L/R/B/O/P) 11)Gatilhos de Legendas 12)IA Fortuna 13)Números Quentes Tendência 14)Inversão 12 15)Fortuna. Cada uma com lógica única e aplicação específica.' },
                    { name: 'Funcionário do Mês', desc: 'Identifica o número com melhor performance recente considerando frequência, intervalos e consistência temporal. Premia números consistentes com algoritmo de ranking dinâmico que se atualiza a cada rodada.' }
                ]
            },
            {
                title: '🎯 GATILHOS DE LEGENDAS AVANÇADO',
                features: [
                    { name: 'Legendas Personalizadas', desc: 'Crie nomes customizados (letras A-Z, números 0-9) para representar grupos específicos de números. Exemplo: legenda "V" = vizinhos do zero (0,3,12,15,26,32,35), legenda "O" = órfãos (1,6,9,14,17,20,31,34), legenda "T" = tier do cilindro. Sistema permite criar QUANTAS legendas precisar, cada uma com nome único e conjunto próprio.' },
                    { name: 'Associação Múltipla', desc: 'Vincule múltiplos números da roleta (0 a 36) a cada legenda. Digite números separados por espaço. Exemplo: legenda "T" = "7 11 17 20 32". Uma legenda pode conter de 1 até 37 números. Sistema VALIDA automaticamente, previne duplicatas, mostra erros. Edite ou remova legendas a qualquer momento sem perder outras configurações.' },
                    { name: 'Gatilhos de Sequência', desc: 'Configure SEQUÊNCIAS de legendas como gatilho de entrada. Formato: nomes separados por espaço. Exemplo: "V O V O" = quando aparecer Vizinhos, depois Órfãos, depois Vizinhos, depois Órfãos novamente, gatilho ATIVA. Crie padrões simples (2 eventos) ou complexos (até 20 eventos). Sistema detecta automaticamente no histórico em tempo real.' },
                    { name: 'Apostas por Gatilho', desc: 'Defina EXATAMENTE onde apostar quando cada gatilho ativar. Use legendas (D1, D2, D3 para dúzias) ou números diretos (5 17 23). Exemplo: gatilho "V V" aposta em "O" (órfãos). Estratégia: quando padrão X aparecer, aposte em Y. Cada gatilho tem configuração de aposta INDEPENDENTE. Lógica condicional avançada.' },
                    { name: 'Lista Completa', desc: 'Visualize TODOS os gatilhos configurados em lista organizada. Cada item mostra: nome do gatilho, sequência de legendas que ativa, apostas configuradas, status (ativo/inativo), performance histórica. Interface permite editar, remover, duplicar gatilhos. Sistema SALVA automaticamente. Exporte/importe configurações completas entre dispositivos ou compartilhe com outros usuários.' },
                    { name: 'Ativação Individual', desc: 'Controle cada gatilho separadamente com toggle on/off. Ative APENAS gatilhos que fazem sentido para momento atual da mesa. Desative temporariamente sem perder configuração. Sistema respeita PRIORIDADE: se múltiplos gatilhos ativarem simultaneamente, usa o PRIMEIRO da lista. Flexibilidade total de gestão em tempo real.' },
                    { name: 'Padrões Complexos', desc: 'Crie estratégias SOFISTICADAS combinando múltiplas legendas em sequências longas. Exemplo: "A B C A B C D" (padrão de 7 eventos). Sistema suporta gatilhos com até 20 legendas em sequência. Quanto mais ESPECÍFICO o padrão, maior a assertividade quando ativado (menos falsos positivos). Ideal para estratégias profissionais avançadas de padrões raros.' },
                    { name: 'Organização Visual', desc: 'Interface INTUITIVA com cores e ícones facilita identificação rápida. Legendas com cores distintas, gatilhos agrupados por tipo, status visual claro (verde=ativo, cinza=inativo, amarelo=aguardando). Busca e filtros para encontrar gatilhos rapidamente. Sistema de tags para categorizar estratégias. Experiência otimizada para gestão de MÚLTIPLOS gatilhos simultaneamente.' }
                ]
            },
            {
                title: '💰 GESTÃO DE BANCA PROFISSIONAL',
                features: [
                    { name: '17 Níveis de Fichas', desc: 'Sistema COMPLETO de valores: R$ 0,50 / R$ 1,00 / R$ 2,50 / R$ 5,00 / R$ 10,00 / R$ 15,00 / R$ 20,00 / R$ 25,00 / R$ 50,00 / R$ 100,00 / R$ 125,00 / R$ 500,00 / R$ 2.000 / R$ 2.500 / R$ 5.000 / R$ 25.000. Atende desde INICIANTES (R$ 0,50) até HIGH-ROLLERS (R$ 25k). Sistema detecta automaticamente fichas disponíveis na mesa e ALERTA se ficha configurada não está disponível.' },
                    { name: 'Modo Real/Percentual', desc: 'Escolha como definir limites: MODO REAL usa valores fixos em reais (ex: Stop Win R$ 500 fixo). MODO PERCENTUAL usa porcentagem da banca (ex: Stop Win 20% da banca inicial). Modo % se ajusta DINAMICAMENTE conforme banca cresce ou diminui. Ideal para gestão proporcional profissional. Alterne entre modos a qualquer momento sem perder configurações.' },
                    { name: 'Stop Win Inteligente', desc: 'Proteção AUTOMÁTICA de lucros. Configure valor em R$ ou % que ao ser atingido, bot PARA automaticamente e SAI da mesa. Exemplo: Stop Win R$ 1.000 = ao lucrar R$ 1.000, bot encerra sessão protegendo ganho. Evita devolver lucros por ganância. Sistema calcula em tempo real considerando apostas EM ANDAMENTO. Essencial para disciplina.' },
                    { name: 'Stop Loss Protetor', desc: 'Proteção AUTOMÁTICA contra perdas excessivas. Configure valor máximo de perda em R$ ou %. Ao atingir limite, bot PARA imediatamente e SAI da mesa. Exemplo: Stop Loss R$ 500 ou 10% da banca. FUNDAMENTAL para preservar capital. Sistema considera perdas virtuais E reais. NUNCA opere sem Stop Loss configurado. Proteção psicológica e financeira.' }
                ]
            },
            {
                title: '🧪 MODO SIMULADOR INTELIGENTE',
                features: [
                    { name: 'Simulação com Valores Reais', desc: 'Execute simulações completas usando os mesmos algoritmos da operação real, com valores monetários reais calculados a cada rodada. Veja exatamente quanto teria ganho ou perdido sem arriscar dinheiro.' },
                    { name: 'Análise de Rentabilidade', desc: 'O simulador calcula ROI, taxa de acerto, drawdown máximo e lucro líquido estimado para qualquer estratégia configurada, com base no histórico real da mesa.' },
                    { name: 'Teste de Estratégias', desc: 'Valide gatilhos, configurações de gale, ciclos e IA antes de ativar a operação real. Identifique estratégias lucrativas e descarte as deficitárias sem perder dinheiro.' },
                    { name: 'Histórico de Simulações', desc: 'Todas as simulações ficam salvas com data, configuração utilizada e resultado. Consulte o histórico a qualquer momento para embasar suas decisões estratégicas.' }
                ]
            },
            {
                title: '🎲 MARTINGALE E CICLOS COMPLETOS',
                features: [
                    { name: 'Sistema de Gale (0-10)', desc: 'Martingale COMPLETO configurável até 10 níveis progressivos. Cada nível = tentativa de recuperação após loss. Configure quantos níveis usar (0 a 10). Sistema aplica multiplicadores em cada nível. Após esgotar gales, inicia novo ciclo ou para conforme configuração. FUNDAMENTAL para gestão de recuperação. 0 gales = sem martingale (aposta única).' },
                    { name: 'Multiplicadores Gale 1-5', desc: 'Configure multiplicador INDIVIDUAL para cada um dos 5 primeiros gales. Valores de 0x até 250x. Exemplo: Gale1=2x, Gale2=3x, Gale3=5x, Gale4=8x, Gale5=13x (progressão Fibonacci). Ou Gale1=2x, Gale2=4x, Gale3=8x, Gale4=16x, Gale5=32x (progressão geométrica). Crie sua própria sequência IDEAL. Flexibilidade TOTAL.' },
                    { name: 'Multiplicadores Gale 6-10', desc: 'Configure multiplicador INDIVIDUAL para cada um dos 5 últimos gales (6 ao 10). Valores de 0x até 250x. Gales AVANÇADOS para recuperação profunda. Exemplo: Gale6=21x, Gale7=34x, Gale8=55x, Gale9=89x, Gale10=144x (Fibonacci avançado). Use com CAUTELA - requer banca ROBUSTA. Ideal para estratégias agressivas de recuperação total.' },
                    { name: 'Progressão Personalizada', desc: 'Crie sequências de martingale TOTALMENTE customizadas. NÃO precisa seguir padrões tradicionais (2x, 4x, 8x). Exemplo criativo: 1x, 1x, 2x, 3x, 5x, 8x, 13x (Fibonacci puro). Ou: 1x, 1.5x, 2x, 3x, 5x, 8x (progressão suave). Adapte à sua banca e perfil de risco. Sistema VALIDA e previne configurações impossíveis (ex: multiplicador maior que banca).' },
                    { name: 'Sistema de Ciclos (0-10)', desc: 'Ciclos representam tentativas COMPLETAS de estratégia. Após esgotar TODOS os gales de um ciclo sem sucesso, inicia ciclo 2 (se configurado). Configure até 10 ciclos. Cada ciclo pode ter multiplicador PRÓPRIO. Exemplo: Ciclo1 normal, Ciclo2 dobrado, Ciclo3 triplicado. Recuperação em MÚLTIPLAS camadas. Estratégia profissional de gestão de risco distribuído.' },
                    { name: 'Multiplicadores Ciclo 1-5', desc: 'Configure multiplicador BASE para cada um dos 5 primeiros ciclos. Valores de 0x até 250x. Multiplicador do ciclo afeta TODAS as apostas daquele ciclo (incluindo gales). Exemplo: Ciclo1=1x (normal), Ciclo2=2x (dobrado), Ciclo3=3x (triplicado). Estratégia para recuperação progressiva entre ciclos completos. Cada ciclo é uma nova tentativa com base maior.' },
                    { name: 'Multiplicadores Ciclo 6-10', desc: 'Configure multiplicador BASE para cada um dos 5 últimos ciclos (6 ao 10). Valores de 0x até 250x. Ciclos AVANÇADOS para recuperação extrema. Use com EXTREMA cautela - requer banca MUITO robusta. Exemplo: Ciclo6=5x, Ciclo7=8x, Ciclo8=13x. Apenas para jogadores PROFISSIONAIS com gestão rigorosa. Último recurso de recuperação.' },
                    { name: 'Estratégias Progressivas', desc: 'Combine gales e ciclos para criar sistemas SOFISTICADOS. Exemplo: 5 gales por ciclo, 3 ciclos totais = 15 tentativas de recuperação. Ou: 3 gales suaves + 5 ciclos = recuperação distribuída. Sistema calcula automaticamente valor TOTAL necessário e ALERTA se banca insuficiente. Simulador integrado para testar estratégias antes de usar real.' }
                ]
            },
            {
                title: '📊 ANÁLISE E CONFIGURAÇÕES AVANÇADAS',
                features: [
                    { name: 'Histórico Extenso (10-500)', desc: 'Analise de 10 até 500 rodadas anteriores da mesa. Quanto MAIOR o histórico, mais dados para IA processar. 50-100 rodadas = ideal para padrões RECENTES. 200-500 rodadas = tendências de LONGO prazo. Sistema processa INSTANTANEAMENTE. Histórico maior = análise mais precisa, mas menos reativa a mudanças. Ajuste conforme estratégia (curto/médio/longo prazo).' },
                    { name: 'IA Máxima (0-100%)', desc: 'Define percentual MÁXIMO de confiança da IA para entrada. Exemplo: IA Máxima 80% = bot só entra se IA calcular ATÉ 80% de confiança. Valores altos (90-100%) = entradas RARAS mas muito confiáveis. Valores médios (60-80%) = equilíbrio. Combine com IA Mínima para criar JANELA de entrada. Filtro SUPERIOR de qualidade. Evita entradas com confiança excessiva (overfit).' },
                    { name: 'IA Mínima (0-100%)', desc: 'Define percentual MÍNIMO de confiança da IA para entrada. Exemplo: IA Mínima 40% = bot só entra se IA calcular PELO MENOS 40% de confiança. Valores baixos (20-40%) = mais entradas, menos seletivo. Valores altos (60-80%) = poucas entradas, MUITO seletivo. Filtro INFERIOR de qualidade. Combine com IA Máxima para janela ideal (ex: 40-80% = janela de 40%).' },
                    { name: 'Evento Mínimo (0-480)', desc: 'Quantidade MÍNIMA de eventos (rodadas) que devem ocorrer antes do bot começar a operar. Exemplo: Evento Mínimo 20 = bot AGUARDA 20 rodadas para coletar dados antes de primeira entrada. Útil para evitar entradas precipitadas. Permite IA acumular dados SUFICIENTES. Valores típicos: 10-30 para início rápido, 50-100 para análise robusta. Paciência = lucro.' },
                    { name: 'Evento Máximo (0-480)', desc: 'Quantidade MÁXIMA de eventos para considerar na análise. Exemplo: Evento Máximo 100 = após 100 rodadas sem entrada, bot RESETA análise ou muda estratégia. Previne espera INFINITA por padrão perfeito. Força entrada dentro de janela temporal. Valores típicos: 50-150. Combine com Evento Mínimo para janela de operação (ex: Min=20, Max=100 = janela de 80 rodadas).' },
                    { name: 'Números Quentes', desc: 'Configure análise de números quentes (mais frequentes): QUANTIDADE (0-30) = quantos números quentes considerar. REPETIÇÕES (0-15) = quantas vezes número deve aparecer para ser "quente". Exemplo: Qtd=5, Rep=3 = considera os 5 números que apareceram PELO MENOS 3 vezes. Sistema ranqueia automaticamente. Atualiza em TEMPO REAL a cada rodada.' },
                    { name: 'Números Frios', desc: 'Configure análise de números frios (menos frequentes): QUANTIDADE (0-30) = quantos números frios considerar. REPETIÇÕES (0-15) = MÁXIMO de aparições para ser "frio". Exemplo: Qtd=8, Rep=1 = considera 8 números que apareceram NO MÁXIMO 1 vez. Estratégia: números frios "devem" sair (regressão à média). Sistema identifica automaticamente.' },
                    { name: 'Configuração Ruas', desc: 'Análise de ruas (linhas de 3 números): CONFIG RUAS (0-50) = sensibilidade de detecção de padrões em ruas. HIST RUAS (0-100) = quantidade de rodadas para análise de ruas. Exemplo: Config=10, Hist=50 = analisa 50 rodadas buscando padrões em ruas com sensibilidade 10. Sistema identifica ruas quentes/frias automaticamente. Estratégia de cobertura por linhas.' }
                ]
            },
        ],
        specs: [
            { label: 'Plataforma', value: 'Chrome Extension' },
            { label: 'Compatibilidade', value: 'Windows' },
            { label: 'Provider', value: 'Playtech Live Casino' }
        ]
    },
    botexterno: {
        title: '🔗 Bot Externo',
        video: 'Video-Externo.mp4',
        description: 'Bot externo para automação com funcionalidades essenciais. Sistema de análise por porcentagem baseado em histórico, apostas automáticas e gale configurável.',
        sections: [
            {
                title: '🎯 ANÁLISE POR PORCENTAGEM',
                features: [
                    { name: 'Análise de Histórico', desc: 'Analisa últimas rodadas e calcula porcentagem de aparição de cada área' },
                    { name: 'Dúzias (D1, D2, D3)', desc: 'Calcula % de cada dúzia no histórico e identifica as mais prováveis' },
                    { name: 'Colunas (C1, C2, C3)', desc: 'Calcula % de cada coluna e detecta tendências' },
                    { name: 'Cores (Vermelho/Preto)', desc: 'Porcentagem de vermelho vs preto baseado em histórico' },
                    { name: 'Alto/Baixo (1-18 vs 19-36)', desc: 'Calcula % de números baixos e altos' },
                    { name: 'Par/Ímpar', desc: 'Porcentagem de números pares vs ímpares' },
                    { name: 'Confiança Mínima Configurável', desc: 'Define % mínima necessária para bot entrar (ex: só aposta se ≥ 70%)' },
                    { name: 'Histórico de até 500 Números', desc: 'Armazena e analisa até 500 últimas rodadas da mesa' }
                ]
            },
            {
                title: '🤖 APOSTA AUTOMÁTICA',
                features: [
                    { name: 'Sistema Totalmente Automatizado', desc: 'Executa apostas automaticamente quando atinge % configurada' },
                    { name: 'Detecção Automática de Números', desc: 'Captura números em tempo real sem necessidade de input manual' },
                    { name: 'Múltiplos Tipos de Apostas', desc: 'Aposta em Dúzias, Colunas, Cores, Alto/Baixo e Par/Ímpar' },
                    { name: 'Execução Precisa', desc: 'Cliques automáticos nas áreas corretas da mesa' },
                    { name: 'Validação de Apostas', desc: 'Confirma execução antes de prosseguir' },
                    { name: 'Modo Seguro', desc: 'Proteções contra apostas duplicadas ou erros' }
                ]
            },
            {
                title: '🎲 SISTEMA DE GALE',
                features: [
                    { name: 'Gale Configurável', desc: 'Configure até 10 níveis de martingale progressivo' },
                    { name: 'Multiplicadores Personalizáveis', desc: 'Defina multiplicador para cada nível (1x até 500x)' },
                    { name: 'Gale para Dúzias/Colunas', desc: 'Sistema de gale específico para apostas internas' },
                    { name: 'Gale para Áreas Externas', desc: 'Sistema independente para Cores, Alto/Baixo e Par/Ímpar' },
                    { name: 'Reset Automático', desc: 'Zera contadores após vitória para recomeçar ciclo' },
                    { name: 'Visualização em Tempo Real', desc: 'Acompanhe nível de gale atual e próximo multiplicador' }
                ]
            },
            {
                title: '📊 PLACAR E ESTATÍSTICAS',
                features: [
                    { name: 'Contador de GREEN (Vitórias)', desc: 'Registra todas as apostas vencedoras' },
                    { name: 'Contador de RED (Derrotas)', desc: 'Registra todas as apostas perdedoras' },
                    { name: 'Cálculo de Assertividade (%)', desc: 'Percentual de acerto calculado automaticamente' },
                    { name: 'Estatísticas por Tipo', desc: 'Performance separada para cada tipo de aposta' },
                    { name: 'Reset de Placar', desc: 'Limpe estatísticas quando quiser recomeçar' }
                ]
            },
            {
                title: '📱 INTEGRAÇÃO COM TELEGRAM',
                features: [
                    { name: 'Envio Automático de Sinais', desc: 'Notificações quando bot identifica oportunidade' },
                    { name: 'Notificações de GREEN e RED', desc: 'Alertas de vitórias e derrotas em tempo real' },
                    { name: 'Relatórios de Gale', desc: 'Notificações quando entrar em gale e qual nível' },
                    { name: 'Configuração Simples', desc: 'Configure Token e Chat ID facilmente' },
                    { name: 'Mensagens Formatadas', desc: 'Notificações organizadas e fáceis de ler' }
                ]
            },
            {
                title: '🎮 COMO FUNCIONA',
                features: [
                    { name: 'Passo 1: Captura de Dados', desc: 'Bot monitora a mesa e captura números em tempo real, armazenando histórico de até 500 rodadas' },
                    { name: 'Passo 2: Cálculo de Porcentagens', desc: 'Sistema calcula % de aparição de cada área (Dúzias, Colunas, Cores, etc) baseado no histórico configurado' },
                    { name: 'Passo 3: Identificação de Oportunidades', desc: 'Bot compara % calculadas com confiança mínima configurada. Exemplo: se D1 está em 45% e você configurou 40%, bot aposta' },
                    { name: 'Passo 4: Execução Automática', desc: 'Quando % atinge o mínimo: envia notificação visual, executa apostas automaticamente, envia sinal para Telegram e aguarda resultado' }
                ]
            }
        ],
        specs: [
            { label: 'Plataforma', value: 'Chrome Extension' },
            { label: 'Compatibilidade', value: 'Windows' },
            { label: 'Licença', value: 'PAGO' },
            { label: 'Provider', value: 'Playtech Live Casino' }
        ]
    },
    fortunafree: {
        title: '🆓 Fortuna Free',
        video: 'Fortuna Free.mp4',
        description: 'Versão GRATUITA do bot de roleta com funcionalidades essenciais. Sistema de análise por porcentagem baseado em histórico, apostas automáticas em Dúzias e Colunas com gale configurável.',
        sections: [
            {
                title: '🎯 ANÁLISE POR PORCENTAGEM',
                features: [
                    { name: 'Análise de Histórico', desc: 'Analisa últimas rodadas e calcula porcentagem de aparição de cada área' },
                    { name: 'Dúzias (D1, D2, D3)', desc: 'Calcula % de cada dúzia no histórico e identifica as mais prováveis' },
                    { name: 'Colunas (C1, C2, C3)', desc: 'Calcula % de cada coluna e detecta tendências' },
                    { name: 'Confiança Mínima Configurável', desc: 'Define % mínima necessária para bot entrar (ex: só aposta se ≥ 70%)' },
                    { name: 'Histórico de até 500 Números', desc: 'Armazena e analisa até 500 últimas rodadas da mesa' }
                ]
            },
            {
                title: '🤖 APOSTA AUTOMÁTICA',
                features: [
                    { name: 'Sistema Totalmente Automatizado', desc: 'Executa apostas automaticamente quando atinge % configurada' },
                    { name: 'Detecção Automática de Números', desc: 'Captura números em tempo real sem necessidade de input manual' },
                    { name: 'Apostas em Dúzias e Colunas', desc: 'Aposta nas dúzias e colunas com maior probabilidade calculada' },
                    { name: 'Execução Precisa', desc: 'Cliques automáticos nas áreas corretas da mesa' }
                ]
            },
            {
                title: '🎲 SISTEMA DE GALE',
                features: [
                    { name: 'Gale Configurável', desc: 'Configure até 10 níveis de martingale progressivo' },
                    { name: 'Multiplicadores Personalizáveis', desc: 'Defina multiplicador para cada nível (1x até 500x)' },
                    { name: 'Gale para Dúzias/Colunas', desc: 'Sistema de gale específico para apostas em dúzias e colunas' },
                    { name: 'Reset Automático', desc: 'Zera contadores após vitória para recomeçar ciclo' },
                    { name: 'Visualização em Tempo Real', desc: 'Acompanhe nível de gale atual e próximo multiplicador' }
                ]
            },
            {
                title: '📊 PLACAR E ESTATÍSTICAS',
                features: [
                    { name: 'Contador de GREEN (Vitórias)', desc: 'Registra todas as apostas vencedoras' },
                    { name: 'Contador de RED (Derrotas)', desc: 'Registra todas as apostas perdedoras' },
                    { name: 'Cálculo de Assertividade (%)', desc: 'Percentual de acerto calculado automaticamente' },
                    { name: 'Reset de Placar', desc: 'Limpe estatísticas quando quiser recomeçar' }
                ]
            },
            {
                title: '📱 INTEGRAÇÃO COM TELEGRAM',
                features: [
                    { name: 'Envio Automático de Sinais', desc: 'Notificações quando bot identifica oportunidade' },
                    { name: 'Notificações de GREEN e RED', desc: 'Alertas de vitórias e derrotas em tempo real' },
                    { name: 'Relatórios de Gale', desc: 'Notificações quando entrar em gale e qual nível' },
                    { name: 'Configuração Simples', desc: 'Configure Token e Chat ID facilmente' }
                ]
            },
            {
                title: '🎮 COMO FUNCIONA',
                features: [
                    { name: 'Passo 1: Captura de Dados', desc: 'Bot monitora a mesa e captura números em tempo real, armazenando histórico de até 500 rodadas' },
                    { name: 'Passo 2: Cálculo de Porcentagens', desc: 'Sistema calcula % de aparição de cada dúzia e coluna baseado no histórico configurado' },
                    { name: 'Passo 3: Identificação de Oportunidades', desc: 'Bot compara % calculadas com confiança mínima. Exemplo: se D1 está em 45% e você configurou 40%, bot aposta' },
                    { name: 'Passo 4: Execução Automática', desc: 'Quando % atinge o mínimo: executa apostas automaticamente, envia sinal para Telegram e aguarda resultado' }
                ]
            }
        ],
        specs: [
            { label: 'Plataforma', value: 'Chrome Extension' },
            { label: 'Compatibilidade', value: 'Windows' },
            { label: 'Licença', value: 'GRATUITA' },
            { label: 'Provider', value: 'Playtech Live Casino' }
        ]
    }
};

// Sistema de Modal
const modal = document.getElementById('botModal');
const modalBody = document.getElementById('modalBody');
const modalClose = document.querySelector('.modal-close');
const modalOverlay = document.querySelector('.modal-overlay');

// Abrir modal ao clicar no bot
document.querySelectorAll('.bot-item').forEach(item => {
    item.addEventListener('click', function() {
        const botId = this.getAttribute('data-bot');
        const botData = botsData[botId];
        
        console.log('Bot clicado:', botId);
        console.log('Dados do bot:', botData);
        
        if (botData) {
            openModal(botData);
        } else {
            console.error('Dados do bot não encontrados para:', botId);
        }
    });
});

function openModal(data) {
    // Criar seções de funcionalidades em grid
    let sectionsHTML = '';
    if (data.sections) {
        sectionsHTML = data.sections.map(section => `
            <div class="features-section">
                <h3 class="features-section-title">${section.title}</h3>
                <div class="features-grid">
                    ${section.features.map(f => `
                        <div class="feature-card">
                            <div class="feature-card-title">${f.name}</div>
                            <div class="feature-card-desc">${f.desc}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    } else if (data.features) {
        // Formato antigo para compatibilidade
        sectionsHTML = `
            <div class="features-section">
                <h3 class="features-section-title">Principais Funcionalidades</h3>
                <div class="features-grid">
                    ${data.features.map(f => `
                        <div class="feature-card">
                            <div class="feature-card-title">${f.title}</div>
                            <div class="feature-card-desc">${f.desc}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Criar conteúdo do modal
    const content = `
        <div class="modal-video-container">
            <video autoplay loop muted playsinline class="modal-video">
                <source src="${data.video}" type="video/mp4">
            </video>
        </div>
        <h3 class="modal-title">${data.title}</h3>
        <p class="modal-description">${data.description}</p>
        
        ${sectionsHTML}

        <div class="bot-specs">
            ${data.specs.map(s => `
                <div class="spec-item">
                    <span class="spec-label">${s.label}:</span>
                    <span class="spec-value">${s.value}</span>
                </div>
            `).join('')}
        </div>
    `;
    
    modalBody.innerHTML = content;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Fechar modal
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', closeModal);

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeModal();
    }
});

// Animação de entrada dos elementos
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observa elementos para animação
document.querySelectorAll('.bot-item, .contact-item').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.6s ease';
    observer.observe(el);
});

// Header transparente/sólido ao rolar
const header = document.querySelector('.header');
let lastScroll = 0;

window.addEventListener('scroll', () => {
    const currentScroll = window.pageYOffset;
    
    if (currentScroll > 100) {
        header.style.background = 'rgba(10, 10, 10, 0.98)';
        header.style.boxShadow = '0 5px 20px rgba(0, 0, 0, 0.5)';
    } else {
        header.style.background = 'rgba(10, 10, 10, 0.95)';
        header.style.boxShadow = 'none';
    }
    
    lastScroll = currentScroll;
});

// Inicializar vídeos
document.addEventListener('DOMContentLoaded', () => {
    // Garantir que o vídeo hero está tocando
    const heroVideo = document.querySelector('.hero-video');
    if (heroVideo) {
        heroVideo.play();
    }
});

// Sistema de Pagamento - Declarações globais
let paymentModal, paymentOverlay, paymentClose;
let formModal, formOverlay, formClose;
let pixModal, pixOverlay, pixClose;
let selectedPurchase = {};
let customerData = {};

// Função para escolher método de pagamento (GLOBAL - acessível pelo onclick)
window.escolherMetodoPagamento = function(metodo) {
    console.log('=== INÍCIO escolherMetodoPagamento ===');
    console.log('Método escolhido:', metodo);
    console.log('selectedPurchase:', selectedPurchase);
    
    // Validar campos do formulário
    const nome = document.getElementById('nome');
    const email = document.getElementById('email');
    const telefone = document.getElementById('telefone');
    const cpf = document.getElementById('cpf');
    
    console.log('Elementos encontrados:', {
        nome: nome ? 'OK' : 'ERRO',
        email: email ? 'OK' : 'ERRO',
        telefone: telefone ? 'OK' : 'ERRO',
        cpf: cpf ? 'OK' : 'ERRO'
    });
    
    if (!nome || !email || !telefone || !cpf) {
        alert('Erro: Elementos do formulário não encontrados!');
        return;
    }
    
    const nomeVal = nome.value;
    const emailVal = email.value;
    const telefoneVal = telefone.value;
    const cpfVal = cpf.value.replace(/\D/g, '');
    
    console.log('Valores:', { nomeVal, emailVal, telefoneVal, cpfVal });
    
    if (!nomeVal || !emailVal || !telefoneVal || !cpfVal) {
        alert('Por favor, preencha todos os campos!');
        return;
    }
    
    if (!validarCPF(cpfVal)) {
        alert('Por favor, insira um CPF válido!');
        return;
    }
    
    customerData = {
        nome: nomeVal,
        email: emailVal,
        telefone: telefoneVal,
        cpf: cpf.value,
        bot: selectedPurchase.bot,
        plano: selectedPurchase.plan,
        valor: selectedPurchase.price
    };
    
    console.log('customerData criado:', customerData);
    
    // REGISTRAR INTERESSE NO BANCO DE DADOS (ADMIN)
    registrarInteresse(customerData);
    
    // Mostrar loading
    const loadingMsg = document.createElement('div');
    loadingMsg.id = 'loadingPayment';
    loadingMsg.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: #00ff41; padding: 30px; border-radius: 10px; z-index: 99999; text-align: center; font-size: 18px;';
    loadingMsg.innerHTML = '<div style="margin-bottom: 15px;">⏳ Gerando pagamento...</div><div style="font-size: 14px; color: #888;">Aguarde alguns segundos</div>';
    document.body.appendChild(loadingMsg);
    
    if (metodo === 'pix') {
        console.log('Chamando gerarPix...');
        gerarPix(customerData.valor);
    } else if (metodo === 'mercadopago') {
        console.log('Chamando gerarPagamentoMercadoPago...');
        gerarPagamentoMercadoPago(customerData);
    } else if (metodo === 'infinitepay') {
        console.log('Chamando gerarPagamentoInfinitePay...');
        gerarPagamentoInfinitePay(customerData);
    } else if (metodo === 'stripe') {
        console.log('Criando sessão de checkout Stripe...');
        gerarPagamentoStripe(customerData);
    }
    
    console.log('=== FIM escolherMetodoPagamento ===');
};

// Aguardar DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado! Iniciando sistema de pagamento...');
    
    paymentModal = document.getElementById('paymentModal');
    console.log('paymentModal:', paymentModal);
    paymentOverlay = document.getElementById('paymentOverlay');
    paymentClose = document.getElementById('paymentClose');

    formModal = document.getElementById('formModal');
    formOverlay = document.getElementById('formOverlay');
    formClose = document.getElementById('formClose');

    pixModal = document.getElementById('pixModal');
    pixOverlay = document.getElementById('pixOverlay');
    pixClose = document.getElementById('pixClose');

    // Abrir modal de pagamento ao clicar no botão do plano
    const selectPlanButtons = document.querySelectorAll('.btn-select-plan');
    console.log('Botões encontrados:', selectPlanButtons.length);

    selectPlanButtons.forEach(btn => {
        console.log('Adicionando evento ao botão:', btn);
        btn.addEventListener('click', function(e) {
            console.log('Botão selecionar plano clicado!');
            e.preventDefault();
            e.stopPropagation();
            const planCard = this.closest('.plano-card');
            const planType = planCard.getAttribute('data-plan-type');
            console.log('Tipo de plano:', planType);
            openPaymentModal(planType);
        });
    });
    
    // Fechar modais
    paymentClose.addEventListener('click', closePaymentModal);
    paymentOverlay.addEventListener('click', closePaymentModal);
    formClose.addEventListener('click', closeFormModal);
    formOverlay.addEventListener('click', closeFormModal);
    pixClose.addEventListener('click', closePixModal);
    pixOverlay.addEventListener('click', closePixModal);

    // Ao clicar em uma opção de pagamento
    document.querySelectorAll('.payment-btn, .payment-btn-large').forEach(btn => {
        btn.addEventListener('click', function() {
            selectedPurchase = {
                bot: this.getAttribute('data-bot'),
                plan: this.getAttribute('data-plan'),
                price: this.getAttribute('data-price')
            };
            openFormModal();
        });
    });

    // Máscaras e validações
    initMasksAndValidations();
    initFormSubmit();
});

function openPaymentModal(planType) {
    console.log('Abrindo modal de pagamento para:', planType);
    const individualContent = document.getElementById('individualContent');
    const completoContent = document.getElementById('completoContent');
    
    if (planType === 'teste') {
        // Plano de teste - ir direto para o formulário com valor de R$ 1,00
        selectedPurchase = {
            bot: 'Teste de Pagamento',
            plan: 'teste',
            price: '1'
        };
        paymentModal.classList.remove('active');
        openFormModal();
        return;
    }
    
    if (planType === 'individual') {
        document.getElementById('planType').textContent = 'PLANO INDIVIDUAL - Escolha 1 Bot';
        individualContent.style.display = 'block';
        completoContent.style.display = 'none';
    } else {
        document.getElementById('planType').textContent = 'PLANO COMPLETO - 3 Bots Inclusos';
        individualContent.style.display = 'none';
        completoContent.style.display = 'block';
    }
    
    console.log('Adicionando classe active ao modal');
    paymentModal.classList.add('active');
    document.body.style.overflow = 'hidden';
    console.log('Modal deve estar visível agora');
}

function closePaymentModal() {
    paymentModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openFormModal() {
    closePaymentModal();
    const info = `${selectedPurchase.bot} - ${selectedPurchase.plan} - R$ ${selectedPurchase.price}`;
    document.getElementById('selectedPlanInfo').textContent = info;
    formModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeFormModal() {
    formModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function openPixModal() {
    closeFormModal();
    pixModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePixModal() {
    pixModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Função para inicializar máscaras e validações
function initMasksAndValidations() {
    // Máscaras para os campos
    document.getElementById('telefone').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
            value = value.replace(/(\d)(\d{4})$/, '$1-$2');
        }
        e.target.value = value;
    });

    document.getElementById('cpf').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        e.target.value = value;
        
        // Validar CPF em tempo real
        validarCPF(value.replace(/\D/g, ''));
    });
}

// Função para inicializar submit do formulário
function initFormSubmit() {
    // Remover o submit padrão do formulário
    const form = document.getElementById('cadastroForm');
    if (form) {
        form.onsubmit = function(e) {
            e.preventDefault();
            return false;
        };
    }
}


// Função para gerar pagamento com Mercado Pago
async function gerarPagamentoMercadoPago(dados) {
    console.log('Gerando pagamento Mercado Pago...');
    
    try {
        const response = await fetch('gerar-pagamento-mp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        
        // Remover loading
        const loading = document.getElementById('loadingPayment');
        if (loading) loading.remove();
        
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        
        const data = await response.json();
        console.log('Resposta Mercado Pago:', data);
        
        if (data.success) {
            // Redirecionar para página de pagamento do Mercado Pago
            console.log('Redirecionando para:', data.init_point);
            window.location.href = data.init_point;
        } else {
            console.error('Erro:', data);
            alert('Erro ao gerar pagamento: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao gerar pagamento:', error);
        alert('⚠️ ATENÇÃO: Os arquivos precisam estar no SERVIDOR para funcionar!\n\n' +
              'Você está abrindo o arquivo localmente (file:///).\n' +
              'Faça upload dos arquivos para: https://admin.hypersecurity.com.br/\n\n' +
              'Erro técnico: ' + error.message);
    }
}

// Função para gerar pagamento com Stripe (Checkout Hosted)
async function gerarPagamentoStripe(dados) {
    console.log('Criando sessão de checkout Stripe...');
    
    try {
        const response = await fetch('criar-payment-intent-stripe.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: dados.valor,
                bot: dados.bot,
                plan: dados.plano,
                nome: dados.nome,
                email: dados.email,
                cpf: dados.cpf,
                telefone: dados.telefone
            })
        });
        
        // Remover loading
        const loading = document.getElementById('loadingPayment');
        if (loading) loading.remove();
        
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        
        const data = await response.json();
        console.log('Resposta Stripe:', data);
        
        if (data.success && data.checkout_url) {
            // Redirecionar para página de checkout do Stripe
            console.log('Redirecionando para checkout Stripe:', data.checkout_url);
            window.location.href = data.checkout_url;
        } else {
            console.error('Erro:', data);
            alert('Erro ao gerar pagamento: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao gerar pagamento Stripe:', error);
        // Remover loading se ainda existir
        const loading = document.getElementById('loadingPayment');
        if (loading) loading.remove();
        
        alert('⚠️ Erro ao processar pagamento!\n\n' +
              'Verifique se os arquivos estão no servidor.\n\n' +
              'Erro técnico: ' + error.message);
    }
}

// Função para registrar interesse (admin-cadastros)
async function registrarInteresse(dados) {
    console.log('Registrando interesse no servidor...');
    try {
        await fetch('enviar-email-smtp.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        console.log('Interesse registrado com sucesso (cadastros.txt)');
    } catch (error) {
        console.error('Erro ao registrar interesse:', error);
        // Não trava o pagamento se falhar o registro de interesse
    }
}

// Função para gerar pagamento com InfinitePay
async function gerarPagamentoInfinitePay(dados) {
    console.log('Gerando lançamento na InfinitePay...');
    
    try {
        const response = await fetch('gerar-pagamento-infinitepay.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(dados)
        });
        
        console.log('Status da resposta:', response.status);
        
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        
        const data = await response.json();
        console.log('Resposta InfinitePay:', data);
        
        if (data.success && data.checkout_url) {
            // Redirecionar para página de pagamento da InfinitePay
            console.log('Redirecionando para:', data.checkout_url);
            window.location.href = data.checkout_url;
        } else {
            console.error('Erro:', data);
            alert('Erro ao gerar pagamento InfinitePay: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao gerar pagamento InfinitePay:', error);
        alert('⚠️ Erro ao processar pagamento!\n\n' +
              'Verifique se os arquivos estão no servidor.\n\n' +
              'Erro técnico: ' + error.message);
    } finally {
        // Remover loading se existir
        const loading = document.getElementById('loadingPayment');
        if (loading) loading.remove();
    }
}

// Fechar modais - REMOVER DAQUI (já está no DOMContentLoaded)
/*
paymentClose.addEventListener('click', closePaymentModal);
paymentOverlay.addEventListener('click', closePaymentModal);
formClose.addEventListener('click', closeFormModal);
formOverlay.addEventListener('click', closeFormModal);
pixClose.addEventListener('click', closePixModal);
pixOverlay.addEventListener('click', closePixModal);

// Ao clicar em uma opção de pagamento
document.querySelectorAll('.payment-btn, .payment-btn-large').forEach(btn => {
    btn.addEventListener('click', function() {
        selectedPurchase = {
            bot: this.getAttribute('data-bot'),
            plan: this.getAttribute('data-plan'),
            price: this.getAttribute('data-price')
        };
        openFormModal();
    });
});

// Máscaras para os campos
document.getElementById('telefone').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
        value = value.replace(/(\d)(\d{4})$/, '$1-$2');
    }
    e.target.value = value;
});

document.getElementById('cpf').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    e.target.value = value;
    
    // Validar CPF em tempo real
    validarCPF(value.replace(/\D/g, ''));
});
*/

// Função para validar CPF
function validarCPF(cpf) {
    const cpfValidation = document.getElementById('cpfValidation');
    const cpfInput = document.getElementById('cpf');
    
    // Remove caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) {
        cpfValidation.textContent = '';
        cpfValidation.className = 'cpf-validation';
        cpfInput.style.borderColor = 'rgba(0, 255, 65, 0.3)';
        return false;
    }
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) {
        cpfValidation.textContent = 'CPF inválido';
        cpfValidation.className = 'cpf-validation invalid';
        cpfInput.style.borderColor = '#ff4444';
        return false;
    }
    
    // Validação do primeiro dígito verificador
    let soma = 0;
    for (let i = 0; i < 9; i++) {
        soma += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    let digitoVerificador1 = resto >= 10 ? 0 : resto;
    
    if (digitoVerificador1 !== parseInt(cpf.charAt(9))) {
        cpfValidation.textContent = 'CPF inválido';
        cpfValidation.className = 'cpf-validation invalid';
        cpfInput.style.borderColor = '#ff4444';
        return false;
    }
    
    // Validação do segundo dígito verificador
    soma = 0;
    for (let i = 0; i < 10; i++) {
        soma += parseInt(cpf.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    let digitoVerificador2 = resto >= 10 ? 0 : resto;
    
    if (digitoVerificador2 !== parseInt(cpf.charAt(10))) {
        cpfValidation.textContent = 'CPF inválido';
        cpfValidation.className = 'cpf-validation invalid';
        cpfInput.style.borderColor = '#ff4444';
        return false;
    }
    
    // CPF válido
    cpfValidation.textContent = 'CPF válido';
    cpfValidation.className = 'cpf-validation valid';
    cpfInput.style.borderColor = '#00ff41';
    return true;
}

async function gerarPix(valor) {
    console.log('Função gerarPix chamada com valor:', valor);
    
    try {
        console.log('Fazendo requisição para gerar-pix.php...');
        const response = await fetch('gerar-pix.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ valor: valor })
        });
        
        // Remover loading
        const loading = document.getElementById('loadingPayment');
        if (loading) loading.remove();
        
        console.log('Status da resposta:', response.status);
        console.log('Response OK?', response.ok);
        
        if (!response.ok) {
            throw new Error('Erro na resposta do servidor: ' + response.status);
        }
        
        const data = await response.json();
        console.log('Dados do PIX recebidos:', data);
        
        if (data.success) {
            // Preencher modal PIX
            const pixPlanInfo = document.getElementById('pixPlanInfo');
            const pixAmount = document.getElementById('pixAmount');
            const qrcodeImage = document.getElementById('qrcodeImage');
            const pixCode = document.getElementById('pixCode');
            
            if (pixPlanInfo) pixPlanInfo.textContent = `${customerData.bot} - ${customerData.plano}`;
            if (pixAmount) pixAmount.textContent = 'R$ ' + parseFloat(data.valor).toFixed(2);
            if (qrcodeImage) qrcodeImage.src = data.qr_code_url;
            if (pixCode) pixCode.value = data.pix_code;
            
            // Mostrar dados do cliente
            const infoNome = document.getElementById('infoNome');
            const infoEmail = document.getElementById('infoEmail');
            const infoTelefone = document.getElementById('infoTelefone');
            const infoCpf = document.getElementById('infoCpf');
            const customerInfo = document.getElementById('customerInfo');
            
            if (infoNome) infoNome.textContent = customerData.nome;
            if (infoEmail) infoEmail.textContent = customerData.email;
            if (infoTelefone) infoTelefone.textContent = customerData.telefone;
            if (infoCpf) infoCpf.textContent = customerData.cpf;
            if (customerInfo) customerInfo.style.display = 'block';
            
            console.log('Abrindo modal PIX...');
            openPixModal();
            
            const form = document.getElementById('cadastroForm');
            if (form) form.reset();
        } else {
            console.log('Erro no servidor:', data);
            alert('Erro ao gerar PIX: ' + (data.error || 'Erro desconhecido'));
        }
    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        alert('Erro ao conectar com o servidor: ' + error.message);
        // Se não tiver servidor PHP, usar solução alternativa
        mostrarPixAlternativo(valor);
    }
}

function mostrarPixAlternativo(valor) {
    // Solução alternativa sem backend
    document.getElementById('pixPlanInfo').textContent = `${customerData.bot} - ${customerData.plano}`;
    document.getElementById('pixAmount').textContent = `R$ ${valor}`;
    document.getElementById('qrcodeImage').src = 'icon.png'; // Placeholder
    document.getElementById('pixCode').value = 'Configure o arquivo gerar-pix.php com sua chave PIX';
    
    document.getElementById('infoNome').textContent = customerData.nome;
    document.getElementById('infoEmail').textContent = customerData.email;
    document.getElementById('infoTelefone').textContent = customerData.telefone;
    document.getElementById('infoCpf').textContent = customerData.cpf;
    document.getElementById('customerInfo').style.display = 'block';
    
    openPixModal();
    document.getElementById('cadastroForm').reset();
}

// Copiar código PIX
function copiarCodigoPix() {
    const pixCode = document.getElementById('pixCode');
    pixCode.select();
    document.execCommand('copy');
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = '✓ Copiado!';
    btn.style.background = 'var(--neon-green)';
    btn.style.color = '#000';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
        btn.style.color = '';
    }, 2000);
}

// Enviar comprovante pelo WhatsApp
function enviarComprovanteWhatsApp() {
    const message = `Olá! Realizei o pagamento via PIX:\n\n*Dados da Compra:*\nBot: ${customerData.bot}\nPlano: ${customerData.plano}\nValor: R$ ${customerData.valor}\n\n*Meus Dados:*\nNome: ${customerData.nome}\nEmail: ${customerData.email}\nTelefone: ${customerData.telefone}\nCPF: ${customerData.cpf}\n\nVou enviar o comprovante agora!`;
    
    window.open(`https://wa.me/5555999344071?text=${encodeURIComponent(message)}`, '_blank');
}

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (pixModal.classList.contains('active')) {
            closePixModal();
        } else if (formModal.classList.contains('active')) {
            closeFormModal();
        } else if (paymentModal.classList.contains('active')) {
            closePaymentModal();
        } else if (modal.classList.contains('active')) {
            closeModal();
        }
    }
});


// Carrossel automático de bots
function initBotsCarousel() {
    const carousel = document.getElementById('botsCarousel');
    if (!carousel) return;

    const wrapper = carousel.parentElement;
    const gap = 20;
    const speed = 0.4;
    let isManual = false;
    let rafId = null;
    let offset = 0;

    // Limpar clones anteriores
    Array.from(carousel.querySelectorAll('[data-clone]')).forEach(el => el.remove());

    const originals = Array.from(carousel.querySelectorAll('.bot-item'));
    const total = originals.length;

    // Clonar antes E depois para loop perfeito
    originals.forEach(item => {
        const clone = item.cloneNode(true);
        clone.setAttribute('data-clone', 'true');
        carousel.insertBefore(clone, carousel.firstChild);
    });
    originals.forEach(item => {
        const clone = item.cloneNode(true);
        clone.setAttribute('data-clone', 'true');
        carousel.appendChild(clone);
    });

    const allItems = Array.from(carousel.querySelectorAll('.bot-item'));

    function getVisible() {
        return window.innerWidth <= 768 ? 1 : window.innerWidth <= 1024 ? 2 : 4;
    }

    function getItemWidth() {
        const wrapperW = wrapper.offsetWidth - 120;
        const visible = getVisible();
        return (wrapperW - gap * (visible - 1)) / visible;
    }

    function setItemWidths() {
        const w = getItemWidth();
        allItems.forEach(item => {
            item.style.minWidth = w + 'px';
            item.style.maxWidth = w + 'px';
            item.style.flexShrink = '0';
        });
    }

    function getCycleWidth() {
        // Must be called AFTER setItemWidths so getItemWidth() is accurate
        return (getItemWidth() + gap) * total;
    }

    function applyOffset(animate) {
        carousel.style.transition = animate ? 'transform 0.45s ease-in-out' : 'none';
        carousel.style.transform = `translateX(-${offset}px)`;
    }

    function normalizeOffset() {
        const cycle = getCycleWidth();
        // offset should stay in range [cycle, cycle*2)
        if (offset >= cycle * 2) {
            offset -= cycle;
            carousel.style.transition = 'none';
            carousel.style.transform = `translateX(-${offset}px)`;
        } else if (offset < cycle) {
            offset += cycle;
            carousel.style.transition = 'none';
            carousel.style.transform = `translateX(-${offset}px)`;
        }
    }

    function loop() {
        if (!isManual) {
            offset += speed;
            normalizeOffset();
            carousel.style.transition = 'none';
            carousel.style.transform = `translateX(-${offset}px)`;
        }
        rafId = requestAnimationFrame(loop);
    }

    function jumpBy(direction) {
        isManual = true;
        cancelAnimationFrame(rafId);
        offset += direction * (getItemWidth() + gap);
        applyOffset(true);
        setTimeout(() => {
            normalizeOffset();
            isManual = false;
            rafId = requestAnimationFrame(loop);
        }, 500);
    }

    carousel.style.display = 'flex';
    carousel.style.gap = gap + 'px';
    carousel.style.willChange = 'transform';

    // Set widths first, THEN calculate offset so getCycleWidth() is correct
    setItemWidths();
    // Use requestAnimationFrame to ensure layout is flushed before reading widths
    requestAnimationFrame(() => {
        offset = getCycleWidth(); // start at the real originals
        carousel.style.transition = 'none';
        carousel.style.transform = `translateX(-${offset}px)`;
        rafId = requestAnimationFrame(loop);
    });

    const btnPrev = document.getElementById('carouselPrev');
    const btnNext = document.getElementById('carouselNext');
    if (btnPrev) btnPrev.addEventListener('click', () => jumpBy(-1));
    if (btnNext) btnNext.addEventListener('click', () => jumpBy(1));

    carousel.addEventListener('click', function(e) {
        const item = e.target.closest('.bot-item');
        if (!item) return;
        if (e.target.classList.contains('btn-details') || e.target.closest('.btn-details')) {
            const botId = item.getAttribute('data-bot');
            const botData = botsData[botId];
            if (botData) openModal(botData);
        }
    });

    window.addEventListener('resize', () => {
        cancelAnimationFrame(rafId);
        setItemWidths();
        requestAnimationFrame(() => {
            offset = getCycleWidth();
            carousel.style.transition = 'none';
            carousel.style.transform = `translateX(-${offset}px)`;
            isManual = false;
            rafId = requestAnimationFrame(loop);
        });
    });
}

// Inicializar carrossel quando DOM carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initBotsCarousel);
} else {
    initBotsCarousel();
}


// ========================================
// WIDGET WHATSAPP
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    const whatsappFloatBtn = document.getElementById('whatsappFloatBtn');
    const whatsappChat = document.getElementById('whatsappChat');
    const whatsappClose = document.getElementById('whatsappClose');
    const whatsappBadge = document.querySelector('.whatsapp-badge');
    const whatsappForm = document.getElementById('whatsappForm');
    
    if (whatsappFloatBtn && whatsappChat && whatsappClose) {
        // Abrir chat
        whatsappFloatBtn.addEventListener('click', function() {
            whatsappChat.classList.toggle('active');
            
            // Remover badge quando abrir
            if (whatsappChat.classList.contains('active') && whatsappBadge) {
                whatsappBadge.style.display = 'none';
            }
        });
        
        // Fechar chat
        whatsappClose.addEventListener('click', function(e) {
            e.stopPropagation();
            whatsappChat.classList.remove('active');
        });
        
        // Fechar ao clicar fora
        document.addEventListener('click', function(e) {
            if (!whatsappChat.contains(e.target) && !whatsappFloatBtn.contains(e.target)) {
                whatsappChat.classList.remove('active');
            }
        });
    }
    
    // Processar formulário WhatsApp
    if (whatsappForm) {
        // Máscara de telefone
        const whatsTelefone = document.getElementById('whatsTelefone');
        if (whatsTelefone) {
            whatsTelefone.addEventListener('input', function(e) {
                let value = e.target.value.replace(/\D/g, '');
                if (value.length <= 11) {
                    value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
                    value = value.replace(/(\d)(\d{4})$/, '$1-$2');
                }
                e.target.value = value;
            });
        }
        
        whatsappForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const nome = document.getElementById('whatsNome').value;
            const telefone = document.getElementById('whatsTelefone').value;
            const assunto = document.getElementById('whatsAssunto').value;
            
            if (!nome || !telefone || !assunto) {
                alert('Por favor, preencha todos os campos!');
                return;
            }
            
            // Montar mensagem para WhatsApp
            const mensagem = `Olá! Vim do site Rei dos Bots.%0A%0A` +
                           `*Nome:* ${nome}%0A` +
                           `*Telefone:* ${telefone}%0A` +
                           `*Assunto:* ${assunto}%0A%0A` +
                           `Gostaria de mais informações!`;
            
            // Abrir WhatsApp
            const whatsappURL = `https://wa.me/5555999344071?text=${mensagem}`;
            window.open(whatsappURL, '_blank');
            
            // Fechar chat e limpar formulário
            whatsappChat.classList.remove('active');
            whatsappForm.reset();
        });
    }
});


// ===== BOT ONLINE MODAL =====
const BOT_API = 'https://reidosbots.net.br/api';
let botEmailLogado = null;
let botEstrategiasDisponiveis = [];
let botLigado = false;
let botPollingStatusTimer = null;

// Ir para o painel diretamente
document.getElementById('btnBotOnline').addEventListener('click', (e) => {
    e.preventDefault();
    window.location.href = 'bot-system/painel-usuario/';
});

// Fechar modal
document.getElementById('botOnlineClose').addEventListener('click', () => {
    document.getElementById('botOnlineModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

document.getElementById('botOnlineOverlay').addEventListener('click', () => {
    document.getElementById('botOnlineModal').classList.remove('active');
    document.body.style.overflow = 'auto';
});

// ===== LOGIN BOT =====
document.getElementById('btnBotLogin').addEventListener('click', fazerLoginBot);
document.getElementById('botLoginSenha').addEventListener('keydown', e => {
    if (e.key === 'Enter') fazerLoginBot();
});

async function fazerLoginBot() {
    const email = document.getElementById('botLoginEmail').value.trim();
    const senha = document.getElementById('botLoginSenha').value;
    const errEl = document.getElementById('botLoginErr');
    errEl.style.display = 'none';
    
    try {
        const res = await fetch(`${BOT_API}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, senha })
        });
        
        if (!res.ok) {
            const e = await res.json();
            errEl.textContent = e.erro;
            errEl.style.display = 'block';
            return;
        }
        
        localStorage.setItem('bot_email', email);
        window.location.href = 'bot-system/painel-usuario/';
    } catch (e) {
        errEl.textContent = 'Erro ao conectar com o servidor. Certifique-se de que o servidor está rodando.';
        errEl.style.display = 'block';
    }
}

async function abrirPainelBot(email) {
    try {
        botEmailLogado = email;
        document.getElementById('botLoginScreen').style.display = 'none';
        document.getElementById('botConfigScreen').style.display = 'block';
        document.getElementById('botUserEmailDisplay').textContent = email;

        await Promise.allSettled([
            carregarEstrategiasBot(),
            carregarConfigBot()
        ]);

        iniciarPollingStatsBot();
        iniciarPollingStatusBot();
        monitorarServidorBot();
    } catch (e) {
        console.error('Erro ao abrir painel bot:', e);
    }
}

// Sair
document.getElementById('btnBotSair').addEventListener('click', () => {
    localStorage.removeItem('bot_email');
    botEmailLogado = null;
    botLigado = false;
    if (botPollingStatusTimer) {
        clearInterval(botPollingStatusTimer);
        botPollingStatusTimer = null;
    }
    esconderBannersBot();
    document.getElementById('botLoginScreen').style.display = 'block';
    document.getElementById('botConfigScreen').style.display = 'none';
});

// ===== BOTÃO LIGAR / DESLIGAR BOT =====
document.getElementById('btnBotToggleBot').addEventListener('click', async () => {
    const acao = botLigado ? 'desligar' : 'ligar';
    try {
        const res = await fetch(`${BOT_API}/comando`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: botEmailLogado, acao })
        });
        const data = await res.json();
        if (data.ok) {
            botLigado = !botLigado;
            atualizarBotaoToggleBot();
            if (acao === 'ligar') {
                mostrarBannerBot('inicializando');
            } else {
                mostrarBannerBot('desligando');
            }
            if (!data.enviado) {
                mostrarMsgBot('botMsgErro', '⚠️ Extensão não conectada ao servidor.');
            }
        }
    } catch (e) {
        mostrarMsgBot('botMsgErro', 'Erro ao enviar comando. Servidor offline?');
    }
});

function atualizarBotaoToggleBot() {
    const btn = document.getElementById('btnBotToggleBot');
    if (botLigado) {
        btn.textContent = '⏹️ DESLIGAR BOT';
        btn.className = 'bot-btn-toggle bot-desligar';
    } else {
        btn.textContent = '▶️ LIGAR BOT';
        btn.className = 'bot-btn-toggle bot-ligar';
    }
}

// ===== ESTRATÉGIAS =====
async function carregarEstrategiasBot() {
    try {
        const res = await fetch(`${BOT_API}/estrategias`);
        if (!res.ok) throw new Error('Falha ao carregar estratégias');
        botEstrategiasDisponiveis = await res.json();
        if (!Array.isArray(botEstrategiasDisponiveis)) botEstrategiasDisponiveis = [];
        
        const sel = document.getElementById('botSelectEstrategia');
        sel.innerHTML = botEstrategiasDisponiveis.map(e => `<option value="${e.chave}">${e.nome}</option>`).join('');
        sel.addEventListener('change', mostrarDescEstrategiaBot);
        mostrarDescEstrategiaBot();
    } catch (e) {
        console.error('Erro carregarEstrategiasBot:', e);
        mostrarMsgBot('botMsgErro', 'Erro ao carregar estratégias do servidor.');
    }
}

function mostrarDescEstrategiaBot() {
    const chave = document.getElementById('botSelectEstrategia').value;
    const est = botEstrategiasDisponiveis.find(e => e.chave === chave);
    const desc = document.getElementById('botDescEstrategia');
    if (est) desc.textContent = `${est.descricao || ''} — ${(est.numeros || []).length} números`;
}

async function carregarConfigBot() {
    try {
        const res = await fetch(`${BOT_API}/config/${encodeURIComponent(botEmailLogado)}`);
        const config = await res.json();
        
        if (res.ok) {
            if (config.estrategia) {
                document.getElementById('botSelectEstrategia').value = config.estrategia;
                mostrarDescEstrategiaBot();
            }
            if (config.valor_ficha) document.getElementById('botValorFicha').value = config.valor_ficha;
            if (config.stop_win) document.getElementById('botStopWin').value = config.stop_win;
            if (config.stop_loss) document.getElementById('botStopLoss').value = config.stop_loss;
            if (config.gales !== undefined) document.getElementById('botGales').value = config.gales;
            
            botLigado = config.botLigado || false;
        } else {
            botLigado = false;
        }
        atualizarBotaoToggleBot();
    } catch (e) {
        console.error('Erro carregarConfigBot:', e);
    }
}

// Salvar configuração
document.getElementById('btnBotSalvar').addEventListener('click', async () => {
    const estChave = document.getElementById('botSelectEstrategia').value;
    let estCompleta = botEstrategiasDisponiveis.find(e => e.chave === estChave);
    
    const config = {
        estrategia: estChave,
        nome: estCompleta ? estCompleta.nome : estChave,
        gatilhos: estCompleta ? estCompleta.gatilhos : [],
        valor_ficha: parseFloat(document.getElementById('botValorFicha').value) || 1,
        stop_win: parseFloat(document.getElementById('botStopWin').value) || 0,
        stop_loss: parseFloat(document.getElementById('botStopLoss').value) || 0,
        gales: parseInt(document.getElementById('botGales').value) || 0
    };

    try {
        const res = await fetch(`${BOT_API}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: botEmailLogado, ...config })
        });
        
        if (res.ok) {
            mostrarMsgBot('botMsgSalvo', '✅ Configurações salvas e enviadas para a extensão!');
        } else {
            throw new Error('Erro ao salvar no servidor');
        }
    } catch (e) {
        mostrarMsgBot('botMsgErro', '❌ Erro ao salvar configurações.');
    }
});

// ===== BANNERS DE STATUS =====
function mostrarBannerBot(tipo) {
    document.getElementById('botBannerInicializando').style.display = tipo === 'inicializando' ? 'block' : 'none';
    document.getElementById('botBannerDesligando').style.display = tipo === 'desligando' ? 'block' : 'none';
}

function esconderBannersBot() {
    document.getElementById('botBannerInicializando').style.display = 'none';
    document.getElementById('botBannerDesligando').style.display = 'none';
}

function iniciarPollingStatusBot() {
    if (botPollingStatusTimer) clearInterval(botPollingStatusTimer);
    botPollingStatusTimer = setInterval(verificarStatusBotBot, 2000);
}

async function verificarStatusBotBot() {
    if (!botEmailLogado) return;
    try {
        const res = await fetch(`${BOT_API}/status/${encodeURIComponent(botEmailLogado)}`);
        const data = await res.json();
        const status = data.statusBot;
        
        if (status === 'na_mesa' || status === 'deslogado' || !status) {
            esconderBannersBot();
        } else if (status === 'inicializando') {
            mostrarBannerBot('inicializando');
        } else if (status === 'desligando') {
            mostrarBannerBot('desligando');
        } else {
            esconderBannersBot();
        }
    } catch (e) { /* servidor offline */ }
}

// ===== STATS =====
function iniciarPollingStatsBot() {
    atualizarStatsBot();
    setInterval(atualizarStatsBot, 3000);
}

async function atualizarStatsBot() {
    if (!botEmailLogado) return;
    try {
        const res = await fetch(`${BOT_API}/stats/${encodeURIComponent(botEmailLogado)}`);
        const s = await res.json();
        document.getElementById('botStatGreens').textContent = s.greens ?? 0;
        document.getElementById('botStatReds').textContent = s.reds ?? 0;
        const total = (s.greens || 0) + (s.reds || 0);
        document.getElementById('botStatAssert').textContent = total > 0 ? ((s.greens / total * 100).toFixed(0) + '%') : '—';
        const saldo = s.saldo !== null && s.saldo !== undefined ? parseFloat(s.saldo) : null;
        document.getElementById('botStatSaldo').textContent = saldo !== null ? `R$ ${saldo.toFixed(2)}` : '—';
        if (saldo !== null && s.saldoInicial !== null && s.saldoInicial !== undefined) {
            const lucro = saldo - parseFloat(s.saldoInicial);
            const el = document.getElementById('botStatLucro');
            el.textContent = (lucro >= 0 ? '+' : '') + `R$ ${lucro.toFixed(2)}`;
            el.style.color = lucro >= 0 ? '#22c55e' : '#ef4444';
        }
    } catch (e) { /* servidor offline */ }
}

// ===== STATUS SERVIDOR =====
let botWsMonitor = null;
function monitorarServidorBot() {
    verificarServidorBot();
    setInterval(verificarServidorBot, 5000);
}

function verificarServidorBot() {
    const dot = document.getElementById('botWsDot');
    const status = document.getElementById('botWsStatus');
    
    const wsUrl = 'ws://localhost:3000';

    if (botWsMonitor) {
        try { botWsMonitor.close(); } catch(e) {}
    }

    botWsMonitor = new WebSocket(wsUrl);
    botWsMonitor.onopen = () => {
        dot.classList.add('on');
        status.textContent = 'Servidor online';
        setTimeout(() => { if (botWsMonitor) botWsMonitor.close(); }, 1000);
    };
    botWsMonitor.onerror = () => {
        dot.classList.remove('on');
        status.textContent = 'Servidor offline';
    };
}

function mostrarMsgBot(id, texto) {
    const el = document.getElementById(id);
    el.textContent = texto;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}
