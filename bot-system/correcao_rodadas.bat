@echo off
echo Aplicando correcao para o problema de rodadas aguardando...

git add extensao/background.js
git add extensao/sidepanel.js

git commit -m "fix: corrigir logica de aguardar rodadas nas estrategias dinamicas - Remover duplicacoes de codigo que causavam conflitos - Corrigir inicializacao do botCountdownState - Garantir que estrategias Quentes/Frios/Ambos aguardem as rodadas configuradas"

git push origin main

echo Correcao aplicada!
pause