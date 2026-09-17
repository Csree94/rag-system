@echo off
REM Run from this project's backend directory with the venv Python
cd /d "%~dp0"

REM Prefer the project venv if it exists, otherwise fall back to system python
set PYTHON=.venv\Scripts\python.exe
if not exist "%PYTHON%" set PYTHON=python

"%PYTHON%" test_server.py
pause
