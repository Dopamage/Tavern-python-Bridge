@echo off
echo Starting SillyTavern Python Bridge...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed! Please install Python 3.10 or newer.
    pause
    exit /b
)

REM Create and activate virtual environment if it doesn't exist
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate

REM Install requirements if needed
pip install -r requirements.txt

REM Start the bridge
start "Python Bridge" python st_chat.py

REM Clone SillyTavern-extras if not already present
if not exist "..\SillyTavern-extras" (
    echo Cloning SillyTavern-extras...
    git clone https://github.com/Cohee1207/SillyTavern-extras ..\SillyTavern-extras
    cd ..\SillyTavern-extras
    pip install -r requirements.txt
) else (
    cd ..\SillyTavern-extras
)

REM Start SillyTavern-extras
python server.py --enable-modules=caption,summarize,classify

pause 