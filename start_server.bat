@echo off
chcp 65001 >nul
cd /d "%~dp0"
start "" cmd /c "timeout /t 2 >nul & start http://localhost:8090/"
python server.py
pause
