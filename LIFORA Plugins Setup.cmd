@echo off
setlocal
cd /d "%~dp0"
echo LIFORA official Community Plugin setup (requires internet)
echo Close Obsidian first. No plugins will be downloaded without your confirmation.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Tools\LIFORA-Install-Plugins.ps1"
set RESULT=%ERRORLEVEL%
echo.
if not "%RESULT%"=="0" echo Installation was not fully successful. Read the messages above.
pause
exit /b %RESULT%
