@echo off
echo Corrigindo logica do modo simulacao...

git add extensao/background.js

git commit -m "fix: corrigir calculo de ganho no modo simulacao - Adicionar logs detalhados para debug - Melhorar calculo de ganho baseado no payout correto - Verificar se saldo esta sendo atualizado corretamente"

git push origin main

echo Correcao aplicada!
pause