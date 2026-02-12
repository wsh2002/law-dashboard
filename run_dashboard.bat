@echo off
echo Starting Law Dashboard...
cd /d "%~dp0"
if exist "node_modules\.bin\vite.cmd" (
    call .\node_modules\.bin\vite.cmd --host
) else (
    echo Error: vite.cmd not found. Run npm install first.
)
pause
