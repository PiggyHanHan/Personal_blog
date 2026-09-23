# 场景一：把本地 content/ 整体镜像到服务器（以本地为准：远端多余文件删掉、本地文件全覆盖），然后重新构建
# 用法：usertools\sync-content.ps1            同步 + 构建 + pm2 重启
#       usertools\sync-content.ps1 -NoBuild   只同步文件，不构建
# 不逐个 scp 文件（文件名带空格/中文时 scp 会按空格切分本地路径，转义是坑），
# 而是打包成固定 ASCII 文件名的压缩包上传，路径处理全部在服务器 Linux 侧完成
# 【编码】本文件必须保存为 UTF-8 with BOM——PowerShell 5.1 把无 BOM 的 UTF-8 当 ANSI 读，中文注释会破坏解析
param([switch]$NoBuild)
$ErrorActionPreference = "Stop"
$Key = "C:\Users\<你的用户名>\.ssh\<你的密钥>.pem"
$Server = "root@<你的服务器IP>"
# 自动切到项目根目录（usertools 的上一级），从任意位置调用都可以
Set-Location (Split-Path $PSScriptRoot -Parent)
if (-not (Test-Path ".\content")) { throw "找不到 content/，请确认 usertools 文件夹在项目根目录下" }

Write-Host "==> 打包本地 content/ ..."
# 用相对文件名：Git Bash 的 GNU tar 会把 "C:\..." 当远程主机名
$Archive = "blog-content-sync.tar.gz"
if (Test-Path $Archive) { Remove-Item $Archive }
tar -czf $Archive content
if ($LASTEXITCODE -ne 0) { throw "本地打包失败" }

Write-Host ("==> 上传 {0} MB ..." -f [math]::Round((Get-Item $Archive).Length / 1MB, 1))
scp -i $Key $Archive "${Server}:/tmp/blog-content-sync.tar.gz"
if ($LASTEXITCODE -ne 0) { throw "上传失败" }

Write-Host "==> 服务器端镜像 content/（解包到 /tmp，再整目录替换）..."
# 先解到临时目录确认压缩包完整，再一次性替换线上目录：远端多出的文件被清掉，本地文件全覆盖
$remote = "rm -rf /tmp/blog-content-sync && mkdir -p /tmp/blog-content-sync && tar -xzf /tmp/blog-content-sync.tar.gz -C /tmp/blog-content-sync && rm -rf /var/www/blog/content && mv /tmp/blog-content-sync/content /var/www/blog/content && rm -f /tmp/blog-content-sync.tar.gz"
if (-not $NoBuild) { $remote += " && cd /var/www/blog && npm run build && pm2 restart blog" }
ssh -i $Key $Server $remote
if ($LASTEXITCODE -ne 0) { throw "服务器端执行失败" }

Remove-Item $Archive
Write-Host "==> 完成。刷新页面即可看到最新内容。"
