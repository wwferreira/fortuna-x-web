@echo off
echo Fazendo deploy das alteracoes...

git add server/server.js
git add extensao/background.js
git add extensao/sidepanel.js

git commit -m "feat: adicionar exibicao de rodadas aguardando no painel - Implementado comunicacao WebSocket para rodadas aguardando - Adicionado tratamento da mensagem rodadas_aguardando no servidor - Corrigido funcao testarConectividadeSupabase na extensao - Extensao agora envia informacoes de rodadas para o servidor"

git push origin main

echo Deploy concluido!
pause