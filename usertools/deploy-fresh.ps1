# 场景四：全新部署。有破坏性：现有 blog/ 目录会移走备份为 blog_backup_<日期>，然后解包重装
# 需要交互确认（手动输入 DEPLOY），防误触。Nginx 配置是一次性的，不需要在这里重做（见 setup-nginx.ps1）
# 【编码】本文件必须保存为 UTF-8 with BOM；$remote 用单引号包住，让 $(date ...) 在远端展开而不是 PowerShell
$ErrorActionPreference = "Stop"
$Key = "C:\Users\<你的用户名>\.ssh\<你的密钥>.pem"
$Server = "root@<你的服务器IP>"
# 自动切到项目根目录（usertools 的上一级），从任意位置调用都可以
Set-Location (Split-Path $PSScriptRoot -Parent)
$PackScript = Join-Path $PSScriptRoot "deploy-full.ps1"
if (-not (Test-Path $PackScript)) { throw "找不到 deploy-full.ps1，请确认 usertools 文件夹完整" }

$answer = Read-Host "即将整体替换 $Server 上的部署（旧目录保留为 blog_backup_<日期>），输入 DEPLOY 继续"
if ($answer -ne "DEPLOY") { throw "已取消" }

Write-Host "==> 打 full 包（deploy-full.ps1）..."
& $PackScript
if ($LASTEXITCODE -ne 0) { throw "打包失败" }

Write-Host "==> 上传 ..."
scp -i $Key "blog-full.tar.gz" "${Server}:/var/www/"
if ($LASTEXITCODE -ne 0) { throw "上传失败" }

Write-Host "==> 服务器全新部署 ..."
# 单引号：$(date) 等必须由远端 shell 展开，PowerShell 不做任何展开
$remote = 'cd /var/www && mv blog blog_backup_$(date +%Y%m%d) 2>/dev/null; tar -xzf blog-full.tar.gz && rm -f blog-full.tar.gz && mkdir -p blog && for item in *; do [ "$item" = "blog" ] || mv "$item" blog/; done && cd blog && npm install && npm run build && pm2 start npm --name blog -- start -- -p 3000 && pm2 save && pm2 startup'
ssh -i $Key $Server $remote
if ($LASTEXITCODE -ne 0) { throw "服务器端执行失败" }
Write-Host "==> 完成。Nginx 配置是一次性的（见 setup-nginx.ps1），这里不需要重做。"
