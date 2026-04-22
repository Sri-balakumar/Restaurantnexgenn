@echo off
title KOT Print Agent
echo ==========================================
echo   KOT Local Print Agent
echo ==========================================
echo.

REM === CHANGE PRINTER IP HERE ===
set PRINTER_IP=192.168.0.100
set PRINTER_PORT=9100
REM ===============================

pip install flask flask-cors --quiet 2>nul
echo Starting agent...
python print_agent.py
pause
