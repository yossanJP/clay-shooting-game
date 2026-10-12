@echo off
setlocal
cd /d "%~dp0"
py -3 --version >nul 2>&1
if not errorlevel 1 goto runserver
python --version >nul 2>&1
if not errorlevel 1 (
  start "" http://localhost:8000/
  python -m http.server 8000
  goto end
)
echo Python 3 が見つかりません。
echo Python をインストールしてから、もう一度このファイルを実行してください。
pause
goto end
:runserver
start "" http://localhost:8000/
py -3 -m http.server 8000
:end
