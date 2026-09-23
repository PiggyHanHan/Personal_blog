# 场景零：本地构建 + 80 端口预览。浏览器打开 http://localhost 能看到博客 = 成功
# 用法：usertools\local-run.ps1            本地预览（默认跳过加密，私有文章明文可见）
#       usertools\local-run.ps1 -Encrypt   本地也走加密（用 .env.local 的口令，浏览器里输口令才能读）
# 【加密】默认 SKIP_ENCRYPT=true：私有文章不加密，正文全文可见、无需口令——写作预览专用。
#         带 -Encrypt 时不设该变量，走与生产一致的加密路径（用于验证门扉 / 口令）。
# 【编码】本文件必须保存为 UTF-8 with BOM——PowerShell 5.1 把无 BOM 的 UTF-8 当 ANSI 读，中文注释会破坏解析
# 脚本自动切到项目根目录（usertools 的上一级），从任意位置调用都可以
param([switch]$Encrypt)
$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Test-Path ".\package.json")) { throw "找不到 package.json，请确认 usertools 文件夹在项目根目录下" }

if ($Encrypt) {
  $env:SKIP_ENCRYPT = ""
  Write-Host "==> 加密模式：私有文章按 .env.local 的 PRIVATE_POST_PASSWORD 加密，浏览器里需输入口令"
} else {
  $env:SKIP_ENCRYPT = "true"
  Write-Host "==> 本地预览模式：SKIP_ENCRYPT=true（私有文章不加密，产物切勿对外发布）"
}

npm.cmd run build
if ($LASTEXITCODE -ne 0) { throw "构建失败" }
npm.cmd run start -- -p 80
