@echo off
if not exist "%~dp0build.config" (
    echo Error: build.config not found
    echo Please copy build.config.template to build.config and configure
    exit /b 1
)

for /f "tokens=1,* delims==" %%a in ("%~dp0build.config") do (
    if "%%a"=="VAULT_PATH" set VAULT_PATH=%%b
)

echo Building plugin...

cd "%~dp0.."
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b %ERRORLEVEL%
)

echo Copying files to test vault...

copy /Y "main.js" "%VAULT_PATH%\main.js"
copy /Y "styles.css" "%VAULT_PATH%\styles.css"
copy /Y "manifest.json" "%VAULT_PATH%\manifest.json"

echo Build and copy complete!