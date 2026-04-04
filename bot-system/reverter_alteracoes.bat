@echo off
echo Revertendo alteracoes que causaram problema...

git add extensao/background.js

git commit -m "fix: reverter alteracoes que causaram problema na contagem de rodadas - Remover funcoes que interferiam na logica original - Manter apenas a logica original funcionando - Desabilitar temporariamente envio para servidor"

git push origin main

echo Alteracoes revertidas!
pause