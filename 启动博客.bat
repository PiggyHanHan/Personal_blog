@echo off
title 我的博客 - 一键启动
cd /d E:\Projects\Personal_blog

echo.
echo  ========================================
echo      我的博客  一键启动
echo  ========================================
echo.

echo  [1/3] 检查博客服务（80端口）...
netstat -ano | findstr ":80 " | findstr "LISTENING" >nul
if errorlevel 1 (
  echo        服务未运行，正在启动...
  start "博客服务 - 别关这个窗口" cmd /k "cd /d E:\Projects\Personal_blog && node node_modules\next\dist\bin\next start -p 80"
) else (
  echo        服务已在运行，跳过。
)

echo.
echo  [2/3] 检查公网隧道...
tasklist /fi "imagename eq cloudflared.exe" 2>nul | findstr /i "cloudflared" >nul
if errorlevel 1 (
  echo        隧道未运行，正在启动...
  echo        （等几秒，新窗口里出现 https://xxx.trycloudflare.com 就是给朋友的地址）
  start "公网隧道 - 别关这个窗口" cmd /k ""C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:80 --no-autoupdate"
) else (
  echo        隧道已在运行，跳过。
  echo        当前公网地址：
  for /f "tokens=*" %%a in ('findstr /i "trycloudflare.com" "%TEMP%\cf-tunnel2.log" 2^>nul') do echo         %%a
)

echo.
echo  [3/3] 打开本地页面...
timeout /t 2 /nobreak >nul
start http://localhost

echo.
echo  完成！
echo   - 本地访问：http://localhost
echo   - 公网地址：上面那行，或看"公网隧道"窗口里的 https://...trycloudflare.com
echo   - 注意：两个黑窗口别关；电脑关机后，下次开机再双击本脚本即可
echo.
pause