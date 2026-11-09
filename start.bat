@echo off
chcp 65001 >nul
cd /d "%~dp0"
python -c "import fastapi, uvicorn, httpx" 2>nul || python -m pip install -r requirements.txt
python run.py
pause
