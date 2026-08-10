@echo off
title Start My Blog
cd /d E:\Projects\Personal_blog

echo [1/3] Checking blog service (port 80)...
netstat -ano | findstr ":80 " | findstr "LISTENING" >nul
if errorlevel 1 goto start_service
echo   Service already running.
goto check_tunnel

:start_service
echo   Service not running, starting...
start "Blog Service - KEEP OPEN" cmd /k "cd /d E:\Projects\Personal_blog && node node_modules\next\dist\bin\next start -p 80"

:check_tunnel
echo.
echo [2/3] Checking public tunnel...
tasklist /fi "imagename eq cloudflared.exe" 2>nul | findstr /i "cloudflared" >nul
if errorlevel 1 goto start_tunnel
echo   Tunnel already running.
for /f "tokens=*" %%a in ('powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0get-url.ps1"') do echo   Public URL: %%a
goto open_browser

:start_tunnel
echo   Tunnel not running, starting...
echo   (Public URL will appear in the tunnel window: https://xxx.trycloudflare.com)
start "Public Tunnel - KEEP OPEN" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80 --no-autoupdate --logfile "%TEMP%\cf-tunnel.log""

:open_browser
echo.
echo [3/3] Opening browser...
timeout /t 2 /nobreak >nul
start http://localhost

echo.
echo Done!
echo   - Local:  http://localhost
echo   - Public: see the tunnel window (https://...trycloudflare.com)
echo   - Keep both black windows open. After reboot, double-click this file again.
echo.
pause