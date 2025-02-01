@echo off
setlocal

rem Read config file
if not exist "%~dp0build.config" (
    echo Error: build.config not found
    echo Please create build.config with VAULT_PATH=your_vault_path
    exit /b 1
)

rem Set default path to ensure variable exists
set "VAULT_PATH="

rem Read path from config
for /f "usebackq tokens=1,* delims==" %%a in ("%~dp0build.config") do (
    if "%%a"=="VAULT_PATH" set "VAULT_PATH=%%b"
)

rem Verify path was read
echo Using vault path: %VAULT_PATH%
if not defined VAULT_PATH (
    echo Error: VAULT_PATH not found in config
    exit /b 1
)

echo Building plugin...

cd ..
call npm run build

if %ERRORLEVEL% NEQ 0 (
    echo Build failed!
    exit /b %ERRORLEVEL%
)

echo Copying files to test vault...

rem Use exact same copy pattern as working script
copy /Y "main.js" "%VAULT_PATH%\main.js"
copy /Y "styles.css" "%VAULT_PATH%\styles.css"
copy /Y "manifest.json" "%VAULT_PATH%\manifest.json"

echo Build and copy complete!
endlocal