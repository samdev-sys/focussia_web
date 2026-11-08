@echo off
REM Script de backup PostgreSQL para Focussia (Windows)
REM Uso: backup_db.bat

setlocal enabledelayedexpansion

if "%BACKUP_DIR%"=="" set BACKUP_DIR=.\backups
if "%DATABASE_URL%"=="" (
    echo ERROR: DATABASE_URL no configurado
    exit /b 1
)

for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "DATE=%dt:~0,8%_%dt:~8,6%"
set "BACKUP_FILE=%BACKUP_DIR%\focussia_%DATE%.dump"
set "ENCRYPTED_FILE=%BACKUP_FILE%.gpg"

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

echo Iniciando backup de base de datos...
pg_dump --format=custom --no-owner --no-privileges "%DATABASE_URL%" > "%BACKUP_FILE%"

echo Cifrando backup...
gpg --symmetric --cipher-algo AES256 --batch --passphrase "%BACKUP_PASSPHRASE%" -o "%ENCRYPTED_FILE%" "%BACKUP_FILE%"

del "%BACKUP_FILE%"

echo Backup completado: %ENCRYPTED_FILE%
echo Recuerda copiar a almacenamiento off-site
endlocal
