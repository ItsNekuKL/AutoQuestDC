@echo off
title Auto Quest NEKU v2.1
cd /d "%~dp0"

echo ===================================================
echo             AUTO QUEST NEKU v2.1
echo ===================================================
echo.

:: 1. Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js tidak ditemukan!
    echo Silakan download dan install Node.js di https://nodejs.org/
    echo.
    pause
    exit /b
)

:: 2. Check if .env exists
if not exist ".env" (
    echo [WARNING] File .env belum ditemukan!
    if exist ".env.example" (
        echo Membuat file .env dari .env.example...
        copy ".env.example" ".env" >nul
        echo File .env berhasil dibuat.
        echo Membuka file .env di Notepad, silakan masukkan token kamu...
        start notepad .env
    ) else (
        echo Silakan buat file .env dan masukkan TOKEN=token_kamu
    )
    echo.
    echo Setelah selesai mengisi token dan menyimpannya (Ctrl+S),
    pause
)

:: 3. Check if node_modules exists
if not exist "node_modules\" (
    echo [INFO] Dependensi belum terpasang. Menjalankan npm install...
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Gagal menginstall dependensi!
        echo.
        pause
        exit /b
    )
    echo.
)

:: 4. Run Auto Quest NEKU
echo [START] Menjalankan bot...
echo.
call npm start

:: 5. Keep window open if process exits
echo.
echo ===================================================
echo   Proses telah selesai / berhenti.
echo ===================================================
pause
