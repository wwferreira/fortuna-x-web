@echo off
chcp 65001 >nul
color 0A
title Bot Fortuna X - Aplicar Token Automaticamente

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║          BOT FORTUNA X - APLICAR TOKEN                       ║
echo ║          Sistema Automatizado de Configuração                ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Verificar se Node.js está instalado
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ ERRO: Node.js não está instalado!
    echo.
    echo 📥 Baixe e instale Node.js em: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo ✅ Node.js detectado!
echo.

REM Verificar e instalar dependências
if not exist "node_modules\" (
    echo 📦 Instalando dependências necessárias...
    echo.
    call npm install
    echo.
    if %ERRORLEVEL% NEQ 0 (
        echo ❌ ERRO ao instalar dependências!
        echo.
        pause
        exit /b 1
    )
    echo ✅ Dependências instaladas!
    echo.
)

REM Pedir token
set /p TOKEN="🎫 Cole o TOKEN gerado no painel (ex: FRT-xxxxx): "

if "%TOKEN%"=="" (
    echo.
    echo ❌ ERRO: Token não pode estar vazio!
    echo.
    pause
    exit /b 1
)

REM Pedir nome do cliente
set /p NOME="👤 Digite o nome do cliente (ex: Joao_Silva): "

if "%NOME%"=="" (
    echo.
    echo ❌ ERRO: Nome não pode estar vazio!
    echo.
    pause
    exit /b 1
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🚀 Iniciando processo automatizado...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

REM Executar script Node.js
node aplicar_token.js "%TOKEN%" "%NOME%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo ✅ PROCESSO CONCLUÍDO COM SUCESSO!
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo 📦 Arquivo ZIP criado na pasta: Bot_Clientes\
    echo 📧 Envie o arquivo para o cliente
    echo.
) else (
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo ❌ ERRO NO PROCESSO!
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo Verifique os erros acima e tente novamente.
    echo.
)

pause
